import React, { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import {
  Activity,
  CalendarDays,
  FileText,
  Users,
  ChevronRight,
} from "lucide-react";
import { DayPicker } from "react-day-picker";
import { ptBR } from "date-fns/locale";
import { format } from "date-fns";
import "react-day-picker/dist/style.css";
import "./Dashboard.css";
import AccessibilityMenu from "../../../components/ui/AccessibilityMenu";
import SmartCalendar from "../components/SmartCalendar";

// --- Tipos de Dados (sem alterações) ---
interface ProximaConsulta {
  id: string;
  scheduled_at: string;
  patients: {
    full_name: string;
  } | null;
}

interface KpiCounts {
  patients: number;
  laudos: number;
  consultas: number;
}

type UserInfoResponse = {
  user: { id: string; email: string };
  profile?: { avatar_url?: string | null; full_name?: string | null };
};

// --- Componentes Primitivos (sem alterações) ---
function Card({
  className = "",
  children,
}: React.PropsWithChildren<{ className?: string }>) {
  return <div className={`dashboard-card ${className}`}>{children}</div>;
}
function CardHeader({
  className = "",
  children,
}: React.PropsWithChildren<{ className?: string }>) {
  return <div className={`dashboard-card-content ${className}`}>{children}</div>;
}
function CardContent({
  className = "",
  children,
}: React.PropsWithChildren<{ className?: string }>) {
  return <div className={`dashboard-card-content ${className}`}>{children}</div>;
}
function CardTitle({
  className = "",
  children,
}: React.PropsWithChildren<{ className?: string }>) {
  return (
    <h3 className={`text-xl font-semibold tracking-tight ${className}`}>
      {children}
    </h3>
  );
}
function CardDescription({
  className = "",
  children,
}: React.PropsWithChildren<{ className?: string }>) {
  return <p className={`dashboard-soft text-sm ${className}`}>{children}</p>;
}

// --- Componente Principal ---
export default function DoctorDashboard() {
  // Estados
  const [doctorName, setDoctorName] = useState("Médico(a)");
  const [loading, setLoading] = useState(true);
  const [kpiCounts, setKpiCounts] = useState<KpiCounts>({
    patients: 0,
    laudos: 0,
    consultas: 0,
  });
  const [proximasConsultas, setProximasConsultas] = useState<ProximaConsulta[]>(
    []
  );
  const [diasComConsulta, setDiasComConsulta] = useState<Date[]>([]);

  // --- Avatar states ---
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null); // ObjectURL do blob
  const objectUrlRef = useRef<string | null>(null);
  const [avatarError, setAvatarError] = useState<string>("");

  const SUPABASE_URL =
    import.meta.env.VITE_SUPABASE_URL || "https://yuanqfswhberkoevtmfr.supabase.co";
  const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

  // Helpers avatar
  async function getAccessToken(): Promise<string | null> {
    const { data } = await supabase.auth.getSession();
    return (
      data?.session?.access_token ||
      (() => {
        try {
          return localStorage.getItem("user_token");
        } catch {
          return null;
        }
      })()
    );
  }

  function setAvatarFromBlob(blob: Blob) {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    const url = URL.createObjectURL(blob);
    objectUrlRef.current = url;
    setAvatarUrl(url);
  }

  async function downloadAvatarREST(path: string): Promise<boolean> {
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Sessão expirada. Faça login novamente.");

      const resp = await fetch(
        `${SUPABASE_URL}/storage/v1/object/avatars/${encodeURIComponent(path)}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            apikey: SUPABASE_ANON || "",
          },
        }
      );
      if (!resp.ok) throw new Error(`Download falhou (${resp.status})`);
      const blob = await resp.blob();
      setAvatarFromBlob(blob);
      return true;
    } catch (e: any) {
      console.warn("downloadAvatarREST erro:", e?.message || e);
      return false;
    }
  }

  async function tryGuessAvatarPath(uid: string): Promise<string | null> {
    const guesses = [`${uid}/avatar.jpg`, `${uid}/avatar.jpeg`, `${uid}/avatar.png`];
    for (const g of guesses) {
      const ok = await downloadAvatarREST(g);
      if (ok) return g;
    }
    return null;
  }

  // Função de carregamento (sem alterações funcionais, só mantida)
  const carregarDados = useCallback(async () => {
    setLoading(true);
    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError || !user) throw new Error("Sessão não encontrada.");

      // Nome do médico
      const { data: doctorData, error: doctorError } = await supabase
        .from("doctors")
        .select("id, full_name")
        .eq("user_id", user.id)
        .single();

      if (doctorError || !doctorData)
        throw new Error("Registro de médico não encontrado.");

      setDoctorName(doctorData.full_name || "Médico(a)");
      const doctorId = doctorData.id;
      const today = new Date().toISOString();

      const [patientCountRes, laudosCountRes, completedCountRes, upcomingApptsRes] =
        await Promise.all([
          supabase.from("patients").select("*", { count: "exact", head: true }),
          supabase
            .from("reports")
            .select("*", { count: "exact", head: true })
            .eq("created_by", user.id),
          supabase
            .from("appointments")
            .select("*", { count: "exact", head: true })
            .eq("doctor_id", doctorId)
            .eq("status", "completed"),
          supabase
            .from("appointments")
            .select("id, scheduled_at, patients(full_name)")
            .eq("doctor_id", doctorId)
            .gte("scheduled_at", today)
            .order("scheduled_at", { ascending: true }),
        ]);

      setKpiCounts({
        patients: patientCountRes.count || 0,
        laudos: laudosCountRes.count || 0,
        consultas: completedCountRes.count || 0,
      });

      const rawUpcomingData = upcomingApptsRes.data || [];
      const upcomingData: ProximaConsulta[] = rawUpcomingData.map(
        (consulta: any) => ({
          ...consulta,
          patients: Array.isArray(consulta.patients)
            ? consulta.patients[0] || null
            : consulta.patients || null,
        })
      );

      setProximasConsultas(upcomingData.slice(0, 3));
      setDiasComConsulta(upcomingData.map((a) => new Date(a.scheduled_at)));
    } catch (err: any) {
      console.error("Erro ao carregar dados do dashboard:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Carrega dados gerais do dashboard
  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  // Carrega avatar (independente dos demais dados)
  useEffect(() => {
    let mounted = true;
    (async () => {
      setAvatarError("");
      try {
        // Preferimos a edge function (pois já usa no projeto)
        const { data, error } = await supabase.functions.invoke<UserInfoResponse>(
          "user-info"
        );
        if (error) throw error;
        if (!data?.user?.id) throw new Error("Não foi possível identificar o usuário.");

        let path =
          data.profile?.avatar_url && typeof data.profile.avatar_url === "string"
            ? data.profile.avatar_url
            : null;

        // depois localStorage
        if (!path) {
          try {
            path = localStorage.getItem("avatar_path") || null;
          } catch {
            /* no-op */
          }
        }

        // se ainda não houver, tenta adivinhar (jpg/jpeg/png)
        if (!path) {
          path = await tryGuessAvatarPath(data.user.id);
        } else {
          const ok = await downloadAvatarREST(path);
          if (!ok) {
            path = await tryGuessAvatarPath(data.user.id);
          }
        }

        if (mounted && path) {
          try {
            localStorage.setItem("avatar_path", path);
          } catch {
            /* no-op */
          }
        }
      } catch (e: any) {
        if (mounted) setAvatarError(e?.message || "Falha ao carregar avatar.");
      }
    })();

    return () => {
      mounted = false;
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Retorno
  return (
    <main>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12">
        <div className="lg:col-span-9 space-y-8">
          {/* HERO */}
          <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-lg">
            <div className="bg-gradient-to-r from-teal-500 via-cyan-500 to-teal-400">
              <div className="grid grid-cols-1 md:grid-cols-[1.6fr_1fr] items-center">
                <div className="dashboard-card-content">
                  <div className="hero-text-panel">
                    <h2 className="hero-title">
                      <span className="hero-greet">Olá, Dr(a).</span>
                      <span className="hero-name highlight">{loading ? "..." : doctorName} <span role="img" aria-label="aceno">👋</span></span>
                    </h2>
                    <CardDescription className="hero-subtitle mt-3">
                      Organize sua semana com facilidade — visualize consultas e gerencie sua disponibilidade em poucos cliques.
                    </CardDescription>
                  </div>
                  {/* Botões removidos conforme solicitado (mantivemos somente texto e saudação) */}
                </div>

                {/* >>> AQUI: avatar real (fallback: medica.jpeg) <<< */}
                <div className="relative dashboard-card-content flex items-center justify-center">
                  <div className="absolute inset-0 bg-white/10 blur-2xl rounded-full" />
                  <img
                    src={avatarUrl  }
                    alt="Foto do médico"
                    className="relative h-48 w-48 md:h-56 md:w-56 rounded-2xl object-cover ring-4 ring-white/30 shadow-xl"
                  />
                </div>
              </div>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-slate-500" />
                Agenda Semanal
              </CardTitle>
              <CardDescription>
                Arraste, navegue e veja suas consultas.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SmartCalendar />
            </CardContent>
          </Card>

          {/* KPIs */}
          <div className="dashboard-grid">
            <KpiCard
              title="Pacientes (Total)"
              value={loading ? "..." : `${kpiCounts.patients} pessoas`}
              icon={<Users className="h-5 w-5 text-teal-600" />}
            />
            <KpiCard
              title="Laudos Emitidos"
              value={loading ? "..." : kpiCounts.laudos.toString()}
              icon={<FileText className="h-5 w-5 text-cyan-600" />}
            />
            <KpiCard
              title="Consultas Realizadas"
              value={loading ? "..." : kpiCounts.consultas.toString()}
              icon={<Activity className="h-5 w-5 text-emerald-600" />}
            />
          </div>
        </div>

        {/* COLUNA DIREITA (Agenda) */}
        <aside className="lg:col-span-3 space-y-8">
          {/* PRÓXIMAS CONSULTAS */}
          <Card>
            <CardHeader>
              <CardTitle>Próximas Consultas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {loading && (
                <p className="dashboard-soft text-sm">Buscando agenda...</p>
              )}
              {!loading && proximasConsultas.length === 0 && (
                <p className="dashboard-soft text-sm">
                  Nenhuma consulta futura encontrada.
                </p>
              )}
              {!loading &&
                proximasConsultas.map((consulta) => (
                  <UpcomingAppointmentItem
                    key={consulta.id}
                    name={consulta.patients?.full_name || "Paciente"}
                    date={format(new Date(consulta.scheduled_at), "dd/MM 'às' HH:mm")}
                    color="from-cyan-400 to-emerald-400"
                  />
                ))}
            </CardContent>
          </Card>
        </aside>
        <AccessibilityMenu />
      </div>
    </main>
  );
}

/* ---------- componentes locais (sem alterações) ---------- */
function KpiCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <Card className="kpi-card">
      <CardHeader>
        <div className="flex items-center gap-3 text-sm text-slate-500">
          <span className="inline-grid place-items-center h-9 w-9 rounded-lg bg-slate-100">
            {icon}
          </span>
          <span>{title}</span>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-semibold tracking-tight text-slate-900">
          {value}
        </p>
      </CardContent>
    </Card>
  );
}

function UpcomingAppointmentItem({
  name,
  date,
  color,
}: {
  name: string;
  date: string;
  color: string;
}) {
  return (
    <div className="last-visit flex items-center gap-4">
      <div className={`h-9 w-9 rounded-lg bg-gradient-to-br ${color}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate text-slate-900">{name}</p>
        <p className="text-xs text-slate-500 truncate">{date}</p>
      </div>
      <ChevronRight className="h-4 w-4 text-slate-400" />
    </div>
  );
}

function BarGhost() {
  const bars = [60, 90, 50, 80, 45, 70, 55];
  return (
    <div className="mt-2 h-44 md:h-56 flex items-end gap-3">
      {bars.map((h, i) => (
        <div
          key={i}
          className="flex-1 rounded-md bg-gradient-to-t from-teal-100 to-teal-300"
          style={{ height: `${h}%` }}
        />
      ))}
    </div>
  );
}
