import React, { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  startOfWeek,
  addWeeks,
  subMonths,
  addMonths,
  format as fnsFormat,
  parse,
  getDay,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Locale } from "date-fns";

import {
  Calendar,
  dateFnsLocalizer,
  Views,
  View,
  SlotInfo,
  ToolbarProps,
} from "react-big-calendar";
import "react-big-calendar/lib/css/react-big-calendar.css";
import "./smart-calendar.css";

/* ----------------- Tipos ----------------- */
type RbcEvent = {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource?: any;
};

type Availability = {
  weekday: number;          // 0..6
  start_time: string;       // "08:00"
  end_time: string;         // "12:00"
};

const DEFAULT_DURATION_MIN = 30; // duração padrão da consulta

/* ----------------- Localizer (pt-BR) ----------------- */
const locales: Record<string, Locale> = { "pt-BR": ptBR };
const localizer = dateFnsLocalizer({
  format: (date, formatStr) => fnsFormat(date, formatStr, { locale: ptBR }),
  parse: (dateString, formatString) =>
    parse(dateString, formatString, new Date(), { locale: ptBR }),
  startOfWeek: () => startOfWeek(new Date(), { locale: ptBR, weekStartsOn: 0 }),
  getDay,
  locales,
});

/* ----------------- Helpers ----------------- */
// Remove o timezone (Z ou ±HH:MM) do final, se houver
const stripTZ = (s: string) => s.replace(/([zZ]|[+\-]\d{2}:\d{2})$/, "");

// Cria um Date em horário local a partir de "YYYY-MM-DDTHH:mm:ss" (ou com espaço)
function parseLocalWallTime(s: string) {
  const norm = stripTZ(s).replace(" ", "T");
  const [date, time = "00:00:00"] = norm.split("T");
  const [y, m, d] = date.split("-").map(Number);
  const [hh = 0, mm = 0, ss = 0] = time.split(":").map(Number);
  return new Date(y, (m || 1) - 1, d || 1, hh, mm, ss, 0); // sem conversão de fuso
}

// Parser unificado: SEMPRE interpreta como hora local (mesmo que venha com Z)
function parseScheduledAt(s: string): Date {
  return parseLocalWallTime(s);
}

const parseHHMM = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return { h: h || 0, m: m || 0 };
};

const addHM = (d: Date, hhmm: string) => {
  const { h, m } = parseHHMM(hhmm);
  const nd = new Date(d);
  nd.setHours(h, m, 0, 0);
  return nd;
};

/* ----------------- Toolbar custom (pílulas + label central) ----------------- */
function SegmentedToolbar({ label, onNavigate, onView, view }: ToolbarProps) {
  const is = (v: View) => view === v;
  return (
    <div className="mc-toolbar">
      <div className="mc-toolbar-left">
        <button className="mc-btn ghost" onClick={() => onNavigate?.("TODAY")}>Hoje</button>
        <div className="mc-nav">
          <button aria-label="Anterior" className="mc-icon-btn" onClick={() => onNavigate?.("PREV")}>‹</button>
          <button aria-label="Próximo" className="mc-icon-btn" onClick={() => onNavigate?.("NEXT")}>›</button>
        </div>
      </div>

      <div className="mc-toolbar-center">
        <span className="mc-label">{label}</span>
      </div>

      <div className="mc-toolbar-right">
        <div className="mc-segment">
          <button
            className={`mc-seg ${is(Views.DAY) ? "active" : ""}`}
            onClick={() => onView?.(Views.DAY)}
          >
            Dia
          </button>
          <button
            className={`mc-seg ${is(Views.WEEK) ? "active" : ""}`}
            onClick={() => onView?.(Views.WEEK)}
          >
            Semana
          </button>
          <button
            className={`mc-seg ${is(Views.MONTH) ? "active" : ""}`}
            onClick={() => onView?.(Views.MONTH)}
          >
            Mês
          </button>
          <button
            className={`mc-seg ${is(Views.AGENDA) ? "active" : ""}`}
            onClick={() => onView?.(Views.AGENDA)}
          >
            Agenda
          </button>
        </div>
      </div>
    </div>
  );
}

/* ----------------- Componente ----------------- */
export default function SmartCalendar() {
  const [events, setEvents] = useState<RbcEvent[]>([]);
  const [view, setView] = useState<View>(Views.WEEK);
  const [rangeStart, setRangeStart] = useState<Date>(() =>
    startOfWeek(new Date(), { weekStartsOn: 0 })
  );
  const [loading, setLoading] = useState(false);
  const [availability, setAvailability] = useState<Record<number, Availability[]>>({});
  const [doctorId, setDoctorId] = useState<string | null>(null);

  // range visível (semana/dia)
  const rangeEnd = useMemo(
    () => addWeeks(rangeStart, view === Views.DAY ? 0 : 1),
    [rangeStart, view]
  );

  // buffer amplo para já ter “todas” as consultas ao navegar (±3 meses)
  const fetchStart = useMemo(() => subMonths(rangeStart, 3), [rangeStart]);
  const fetchEnd = useMemo(() => addMonths(rangeEnd, 3), [rangeEnd]);

  /* 1) Descobre o doctor_id uma vez */
  useEffect(() => {
    (async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) return;
      const { data: doctor, error: docErr } = await supabase
        .from("doctors")
        .select("id")
        .eq("user_id", user.id)
        .single();
      if (!docErr && doctor?.id) setDoctorId(doctor.id);
    })();
  }, []);

  /* 2) Busca eventos + disponibilidade sempre que mudar o período */
  const fetchData = useCallback(async () => {
    if (!doctorId) return;
    setLoading(true);
    try {
      // Consultas em um grande intervalo
      const { data: appts, error: apptErr } = await supabase
        .from("appointments")
        .select("id, scheduled_at, patients(full_name)")
        .eq("doctor_id", doctorId)
        .gte("scheduled_at", fetchStart.toISOString())
        .lt("scheduled_at", fetchEnd.toISOString())
        .order("scheduled_at", { ascending: true });

      if (apptErr) throw apptErr;

      const mapped: RbcEvent[] = (appts || []).map((row: any) => {
        const start = parseScheduledAt(row.scheduled_at as string);
        const end = new Date(start.getTime() + DEFAULT_DURATION_MIN * 60_000);

        const patient =
          (Array.isArray(row.patients)
            ? row.patients?.[0]?.full_name
            : row.patients?.full_name) || "Consulta";

        return { id: row.id, title: patient, start, end };
      });

      setEvents(mapped);

      // Disponibilidade
      const { data: avail, error: availErr } = await supabase
        .from("doctor_availability")
        .select("weekday, start_time, end_time")
        .eq("doctor_id", doctorId);

      if (availErr) {
        console.warn("[SmartCalendar] disponibilidade não encontrada (usando fallback).", availErr);
        setAvailability({});
      } else {
        const grouped: Record<number, Availability[]> = {};
        (avail || []).forEach((a: Availability) => {
          grouped[a.weekday] = grouped[a.weekday] || [];
          grouped[a.weekday].push(a);
        });
        setAvailability(grouped);
      }
    } catch (e) {
      console.error("[SmartCalendar] erro:", e);
      setEvents([]);
      setAvailability({});
    } finally {
      setLoading(false);
    }
  }, [doctorId, fetchStart, fetchEnd]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /* Navegação / range */
  const handleNavigate = (date: Date) => {
    setRangeStart(startOfWeek(date, { weekStartsOn: 0 }));
  };
  const handleRangeChange = (range: any) => {
    if (Array.isArray(range) && range.length) {
      setRangeStart(startOfWeek(range[0] as Date, { weekStartsOn: 0 }));
    } else if (range?.start) {
      setRangeStart(startOfWeek(range.start as Date, { weekStartsOn: 0 }));
    }
  };

  /* Regras de disponibilidade */
  const isWithinAvailability = (d: Date) => {
    const wd = d.getDay(); // 0..6
    const dayAv = availability[wd];
    if (!dayAv || dayAv.length === 0) return false;
    return dayAv.some((a) => {
      const start = addHM(d, a.start_time);
      const end = addHM(d, a.end_time);
      return d >= start && d < end;
    });
  };

  const slotPropGetter = (date: Date) => {
    const ok = isWithinAvailability(date);
    return ok
      ? { className: "slot-available" }
      : {
          className: "slot-unavailable",
          style: {
            opacity: 0.6,
            background:
              "repeating-linear-gradient(45deg, #f2f5f6 0, #f2f5f6 8px, #e9f3f1 8px, #e9f3f1 16px)",
          },
        };
  };

  const onSelectSlot = (slot: SlotInfo) => {
    const startOk = isWithinAvailability(slot.start as Date);
    const endMinus = new Date((slot.end as Date).getTime() - 1);
    const endOk = isWithinAvailability(endMinus);
    if (!startOk || !endOk) {
      return;
    }
    // openCreateModal(slot.start, slot.end)
  };

  /* Aparência dos eventos (cards) */
  const eventPropGetter = () => ({
    style: {
      border: "1px solid rgba(13,148,136,0.2)",
      borderRadius: 12,
      background:
        "linear-gradient(180deg, rgba(20,184,166,0.95) 0%, rgba(13,148,136,0.95) 100%)",
      color: "#fff",
      boxShadow: "0 6px 16px rgba(13,148,136,0.25)",
      padding: "6px 8px",
      lineHeight: 1.25,
      fontSize: 13.5,
      fontWeight: 700,
    },
  });

  // Render custom do evento: mostra hora + nome sempre
  const EventCard = ({ event }: { event: RbcEvent }) => {
    return (
      <div className="event-card">
        <div className="event-time">
          {fnsFormat(event.start, "HH:mm")}–{fnsFormat(event.end, "HH:mm")}
        </div>
        <div className="event-title">{event.title}</div>
      </div>
    );
  };

  // 24h e títulos enxutos
  const formats = {
    timeGutterFormat: (date: Date) => fnsFormat(date, "HH:mm"),
    eventTimeRangeFormat: ({ start, end }: { start: Date; end: Date }) =>
      `${fnsFormat(start, "HH:mm")}–${fnsFormat(end, "HH:mm")}`,
    agendaTimeFormat: (date: Date) => fnsFormat(date, "HH:mm"),
    dayHeaderFormat: (date: Date) =>
      fnsFormat(date, "EEEE, dd 'de' MMMM", { locale: ptBR }),
    dayRangeHeaderFormat: ({ start, end }: { start: Date; end: Date }) =>
      `${fnsFormat(start, "dd/MM")} – ${fnsFormat(end, "dd/MM")}`,
  };

  // scroll inicial para 08:30
  const scrollToTime = useMemo(() => {
    const d = new Date();
    d.setHours(8, 30, 0, 0);
    return d;
  }, []);

  // min/max dinâmicos (se houver disponibilidade; senão fallback 7–20h)
  const { minTime, maxTime } = useMemo(() => {
    const hours: number[] = [];
    Object.values(availability).forEach((arr) =>
      arr?.forEach(({ start_time, end_time }) => {
        const { h: hs } = parseHHMM(start_time);
        const { h: he } = parseHHMM(end_time);
        hours.push(hs, he);
      })
    );
    const minH = hours.length ? Math.min(...hours) : 7;
    const maxH = hours.length ? Math.max(...hours) : 20;
    const min = new Date(1970, 1, 1, minH, 0, 0);
    const max = new Date(1970, 1, 1, Math.max(maxH, minH + 1), 0, 0);
    return { minTime: min, maxTime: max };
  }, [availability]);

  return (
    <div className="mc-calendar-wrap mc-light">
      <Calendar
        localizer={localizer}
        culture="pt-BR"
        events={events}
        startAccessor="start"
        endAccessor="end"
        defaultView={Views.WEEK}
        view={view}
        onView={(v) => setView(v)}
        onNavigate={handleNavigate}
        onRangeChange={handleRangeChange}
        selectable
        onSelectSlot={onSelectSlot}
        style={{ height: "76vh" }}
        popup                 // “+x mais” quando lotado
        showMultiDayTimes
        step={30}
        timeslots={1}
        min={minTime}
        max={maxTime}
        slotPropGetter={slotPropGetter}
        eventPropGetter={eventPropGetter}
        scrollToTime={scrollToTime}
        formats={formats}
        components={{
          event: EventCard,
          toolbar: (props) => (
            <SegmentedToolbar
              {...props}
              label={
                view === Views.WEEK
                  ? formats.dayRangeHeaderFormat!({
                      start: props.date as Date,
                      end: addWeeks(props.date as Date, 1),
                    } as any)
                  : props.label
              }
            />
          ),
        }}
        messages={{
          next: "Próximo",
          previous: "Anterior",
          today: "Hoje",
          month: "Mês",
          week: "Semana",
          day: "Dia",
          agenda: "Agenda",
          date: "Data",
          time: "Hora",
          event: "Evento",
          noEventsInRange: loading ? "Carregando..." : "Sem eventos neste período",
        }}
      />
    </div>
  );
}
