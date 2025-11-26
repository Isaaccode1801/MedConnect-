"use client";

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

type AvailabilityRecord = {
  id: string;
  doctor_id: string;
  weekday: number; // 0..6
  start_time: string; // "08:00"
  end_time: string; // "18:00"
  slot_minutes?: number | null;
  appointment_type?: string;
  active?: boolean;
  created_at?: string;
  updated_at?: string;
};

type AppointmentRow = {
  id: string;
  scheduled_at: string;
  patients?: any;
  doctor_id?: string;
};

const DEFAULT_DURATION_MIN = 30; // fallback

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

/* ----------------- Helpers de data/hora ----------------- */
const stripTZ = (s: string) => s.replace(/([zZ]|[+\-]\d{2}:\d{2})$/, "");

function parseLocalWallTime(s: string) {
  const norm = stripTZ(s).replace(" ", "T");
  const [date, time = "00:00:00"] = norm.split("T");
  const [y, m, d] = date.split("-").map(Number);
  const [hh = 0, mm = 0, ss = 0] = (time || "00:00:00").split(":").map(Number);
  return new Date(y, (m || 1) - 1, d || 1, hh, mm, ss, 0);
}

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

/* ----------------- Toolbar custom ----------------- */
function SegmentedToolbar({ label, onNavigate, onView, view }: ToolbarProps) {
  const is = (v: View) => view === v;
  return (
    <div className="mc-toolbar">
      <div className="mc-toolbar-left">
        <button className="mc-btn ghost" onClick={() => onNavigate?.("TODAY")}>
          Hoje
        </button>
        <div className="mc-nav">
          <button
            aria-label="Anterior"
            className="mc-icon-btn"
            onClick={() => onNavigate?.("PREV")}
          >
            ‹
          </button>
          <button
            aria-label="Próximo"
            className="mc-icon-btn"
            onClick={() => onNavigate?.("NEXT")}
          >
            ›
          </button>
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

/* ----------------- Availability Manager (embedded) ----------------- */
function AvailabilityManager({
  doctorId,
  onSaved,
}: {
  doctorId: string | null;
  onSaved: () => void;
}) {
  const [weekday, setWeekday] = useState<number>(1);
  const [startTime, setStartTime] = useState<string>("08:00");
  const [endTime, setEndTime] = useState<string>("18:00");
  const [slotMinutes, setSlotMinutes] = useState<number>(30);
  const [appointmentType, setAppointmentType] = useState<string>("presencial");
  const [active, setActive] = useState<boolean>(true);
  const [loading, setLoading] = useState(false);
  const [list, setList] = useState<AvailabilityRecord[]>([]);
  const [editing, setEditing] = useState<AvailabilityRecord | null>(null);
  const [slotsModalOpen, setSlotsModalOpen] = useState(false);
  const [calculatedSlots, setCalculatedSlots] = useState<string[]>([]);
  const [slotDate, setSlotDate] = useState<string>("");

  const weekdays = [
    { value: 0, label: "Domingo" },
    { value: 1, label: "Segunda" },
    { value: 2, label: "Terça" },
    { value: 3, label: "Quarta" },
    { value: 4, label: "Quinta" },
    { value: 5, label: "Sexta" },
    { value: 6, label: "Sábado" },
  ];

  const fetchList = useCallback(async () => {
    if (!doctorId) return;
    const { data, error } = await supabase
     .from("doctor_availability")
      .select("*")
      .eq("doctor_id", doctorId)
      .order("weekday", { ascending: true })
      .order("start_time", { ascending: true });

    if (error) {
      console.error("Erro listando disponibilidades:", error);
      setList([]);
    } else {
      setList(data || []);
    }
  }, [doctorId]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const resetForm = () => {
    setWeekday(1);
    setStartTime("08:00");
    setEndTime("18:00");
    setSlotMinutes(30);
    setAppointmentType("presencial");
    setActive(true);
    setEditing(null);
  };

  const handleSave = async () => {
    if (!doctorId) return alert("Médico não identificado");
    if (!startTime || !endTime) return alert("Preencha horários");

    setLoading(true);

    const payload: Partial<AvailabilityRecord> = {
      doctor_id: doctorId,
      weekday,
      start_time: startTime,
      end_time: endTime,
      slot_minutes: slotMinutes,
      appointment_type: appointmentType,
      active,
    };

    try {
      if (editing) {
        // UPDATE
        const { error } = await supabase
          .from("doctor_availability")
          .update(payload)
          .eq("id", editing.id);

        if (error) throw error;
      } else {
        // INSERT
        const { error } = await supabase.from("doctor_availability").insert(payload);
        if (error) throw error;
      }

      await fetchList();
      resetForm();
      onSaved();
    } catch (e) {
      console.error("Erro salvando disponibilidade:", e);
      alert("Erro ao salvar disponibilidade");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (rec: AvailabilityRecord) => {
    setEditing(rec);
    setWeekday(rec.weekday);
    setStartTime(rec.start_time);
    setEndTime(rec.end_time);
    setSlotMinutes(rec.slot_minutes || 30);
    setAppointmentType(rec.appointment_type || "presencial");
    setActive(Boolean(rec.active));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id?: string) => {
    if (!id) return;
    if (!confirm("Confirma exclusão desta disponibilidade?")) return;
    const { error } = await supabase
      .from("doctor_availability")
      .delete()
      .eq("id", id);
    if (error) {
      console.error("Erro deletando:", error);
      alert("Erro ao excluir");
    } else {
      await fetchList();
      onSaved();
    }
  };

  const handleCalcSlots = async () => {
    if (!slotDate || !doctorId) return alert("Escolha uma data válida");
    try {
      setCalculatedSlots([]);
      setSlotsModalOpen(true);

      const body = { doctor_id: doctorId, date: slotDate };
      console.log("Chamando função de slots com:", body);

      const res = await fetch(
        "https://mock.apidog.com/m1/1053378-0-default/functions/v1/get-available-slots",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`Erro ${res.status}: ${txt}`);
      }

      // tentar parsear JSON; alguns mocks respondem texto
      const text = await res.text();
      let data: any;
      try {
        data = JSON.parse(text);
      } catch {
        // se já for array plain no texto
        data = text;
      }

      // normalize: se a API retornar { slots: [...] } ou ["09:00", ...]
      const slots =
        Array.isArray(data) ? data : Array.isArray(data?.slots) ? data.slots : [];

      setCalculatedSlots(slots);
    } catch (e: any) {
      console.error("Erro calculando slots:", e);
      alert("Erro ao calcular slots: " + (e?.message || e));
      setSlotsModalOpen(false);
    }
  };

  return (
    <div className="bg-white rounded-md shadow p-4 mb-6">
      <h3 className="text-lg font-semibold mb-3">Gerenciar Disponibilidade</h3>

      {/* Form */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium">Dia da semana</label>
          <select
            value={weekday}
            onChange={(e) => setWeekday(Number(e.target.value))}
            className="w-full p-2 border rounded"
          >
            {weekdays.map((w) => (
              <option key={w.value} value={w.value}>
                {w.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium">Tipo</label>
          <select
            value={appointmentType}
            onChange={(e) => setAppointmentType(e.target.value)}
            className="w-full p-2 border rounded"
          >
            <option value="presencial">Presencial</option>
            <option value="telemedicina">Telemedicina</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium">Horário inicial</label>
          <input
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="w-full p-2 border rounded"
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Horário final</label>
          <input
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            className="w-full p-2 border rounded"
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Duração do slot (min)</label>
          <input
            type="number"
            min={5}
            value={slotMinutes}
            onChange={(e) => setSlotMinutes(Number(e.target.value))}
            className="w-full p-2 border rounded"
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            id="activeChk"
            type="checkbox"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
            className="h-5 w-5"
          />
          <label htmlFor="activeChk" className="text-sm">
            Ativo
          </label>
        </div>
      </div>

      <div className="flex gap-2 mt-3">
        <button
          onClick={handleSave}
          disabled={loading}
          className="bg-teal-600 text-white px-4 py-2 rounded"
        >
          {editing ? "Atualizar" : "Adicionar"}
        </button>
        <button
          onClick={resetForm}
          disabled={loading}
          className="border px-4 py-2 rounded"
        >
          Limpar
        </button>
      </div>

      {/* Lista */}
      <div className="mt-4">
        <h4 className="font-semibold">Disponibilidades cadastradas</h4>
        <div className="space-y-2 mt-2">
          {list.length === 0 && <div className="text-sm text-gray-500">Nenhuma</div>}
          {list.map((r) => (
            <div
              key={r.id}
              className="flex items-center justify-between p-2 border rounded"
            >
              <div>
                <div className="font-medium">
                  {weekdays[r.weekday]?.label} — {r.start_time} → {r.end_time}
                </div>
                <div className="text-xs text-gray-500">slot: {r.slot_minutes ?? 30} min • {r.appointment_type}</div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleEdit(r)}
                  className="px-3 py-1 bg-blue-600 text-white rounded text-sm"
                >
                  Editar
                </button>
                <button
                  onClick={() => handleDelete(r.id)}
                  className="px-3 py-1 bg-red-600 text-white rounded text-sm"
                >
                  Excluir
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Calcular slots */}
      <div className="mt-4 border-t pt-4">
        <h4 className="font-semibold">Calcular slots disponíveis (por data)</h4>
        <div className="flex gap-2 items-center mt-2">
          <input
            type="date"
            value={slotDate}
            onChange={(e) => setSlotDate(e.target.value)}
            className="p-2 border rounded"
          />
          <button onClick={handleCalcSlots} className="bg-indigo-600 text-white px-3 py-1 rounded">
            Calcular
          </button>
        </div>
      </div>

      {/* Modal simples para mostrar slots */}
      {slotsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded p-4 w-full max-w-xl">
            <h3 className="font-semibold mb-2">Slots disponíveis — {slotDate}</h3>
            <div className="grid grid-cols-3 gap-2 max-h-64 overflow-auto">
              {calculatedSlots.length === 0 && <div className="text-sm text-gray-500">Nenhum slot</div>}
              {calculatedSlots.map((s, i) => (
                <div key={i} className="p-2 border rounded text-center">
                  {s}
                </div>
              ))}
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setSlotsModalOpen(false)} className="px-3 py-1 rounded border">
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ----------------- Componente principal ----------------- */
export default function SmartCalendar() {
  const [events, setEvents] = useState<RbcEvent[]>([]);
  const [view, setView] = useState<View>(Views.WEEK);
  const [rangeStart, setRangeStart] = useState<Date>(() =>
    startOfWeek(new Date(), { weekStartsOn: 0 })
  );
  const [loading, setLoading] = useState(false);
  const [availability, setAvailability] = useState<Record<number, AvailabilityRecord[]>>({});
  const [doctorId, setDoctorId] = useState<string | null>(null);

  const rangeEnd = useMemo(
    () => addWeeks(rangeStart, view === Views.DAY ? 0 : 1),
    [rangeStart, view]
  );

  const fetchStart = useMemo(() => subMonths(rangeStart, 3), [rangeStart]);
  const fetchEnd = useMemo(() => addMonths(rangeEnd, 3), [rangeEnd]);

  /* 1) recupera doctor_id do user logado */
  useEffect(() => {
    (async () => {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();
      if (error || !user) {
        console.warn("[SmartCalendar] usuário não autenticado:", error);
        return;
      }
      const { data: doctor, error: docErr } = await supabase
        .from("doctors")
        .select("id")
        .eq("user_id", user.id)
        .single();
      if (!docErr && doctor?.id) setDoctorId(doctor.id);
      else console.warn("[SmartCalendar] doctor não encontrado para user:", docErr);
    })();
  }, []);

  /* 2) Buscar consultas e disponibilidade quando mudar doctorId / período */
  const fetchData = useCallback(async () => {
    if (!doctorId) return;
    setLoading(true);
    try {
      // 2.a - Consultas dentro do buffer
      const { data: appts, error: apptErr } = await supabase
        .from("appointments")
        // tenta trazer paciente pelo relacionamento (se existir FK e RLS configurado)
        .select("id, scheduled_at, patients(full_name)")
        .eq("doctor_id", doctorId)
        .gte("scheduled_at", fetchStart.toISOString())
        .lt("scheduled_at", fetchEnd.toISOString())
        .order("scheduled_at", { ascending: true });

      if (apptErr) throw apptErr;

      // 2.b - Disponibilidade semanal
      const { data: avail, error: availErr } = await supabase
        .from("doctor_availability")
        .select("id, doctor_id, weekday, start_time, end_time, slot_minutes, appointment_type, active")
        .eq("doctor_id", doctorId)
        .eq("active", true);

      if (availErr) {
        console.warn("[SmartCalendar] erro ao buscar disponibilidade:", availErr);
        setAvailability({});
      } else {
        const grouped: Record<number, AvailabilityRecord[]> = {};
        (avail || []).forEach((a: AvailabilityRecord) => {
          grouped[a.weekday] = grouped[a.weekday] || [];
          grouped[a.weekday].push(a);
        });
        setAvailability(grouped);
      }

      // Mapear consultas para eventos (usa slot_minutes da disponibilidade quando possível)
      const mapped: RbcEvent[] = (appts || []).map((row: AppointmentRow) => {
        const start = parseScheduledAt(row.scheduled_at as string);

        // tenta deduzir duração via disponibilidade daquele dia
        const wd = start.getDay();
        const dayAvail = (availability && availability[wd]) || (avail || []).filter((x: any) => x.weekday === wd);
        const slotM =
          (Array.isArray(dayAvail) && dayAvail[0] && (dayAvail[0].slot_minutes || DEFAULT_DURATION_MIN)) ||
          DEFAULT_DURATION_MIN;

        const end = new Date(start.getTime() + Number(slotM) * 60_000);

        const patient =
          (Array.isArray(row.patients) ? row.patients?.[0]?.full_name : row.patients?.full_name) ||
          "Consulta";

        return { id: row.id, title: patient, start, end };
      });

      setEvents(mapped);
    } catch (e) {
      console.error("[SmartCalendar] fetchData erro:", e);
      setEvents([]);
      setAvailability({});
    } finally {
      setLoading(false);
    }
  }, [doctorId, fetchStart, fetchEnd, availability]);

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  /* Disponibilidade: verifica se um Date (slot) está dentro da disponibilidade semanal */
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
      // não permite criar fora da disponibilidade
      return;
    }
    // aqui você pode abrir modal de criação passando slot.start/slot.end
    // openCreateModal(slot.start, slot.end)
  };

  /* Eventos: estilo */
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

  const scrollToTime = useMemo(() => {
    const d = new Date();
    d.setHours(8, 30, 0, 0);
    return d;
  }, []);

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
      <div className="p-4">
        <AvailabilityManager doctorId={doctorId} onSaved={() => fetchData()} />
      </div>

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
        popup
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