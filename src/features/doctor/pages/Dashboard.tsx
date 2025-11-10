// src/features/doctor/pages/Dashboard.tsx (VERSÃO SIMPLIFICADA)
import React, { useState, useEffect, useCallback } from "react";
// REMOVEMOS: useNavigate, useLocation, Menu, X, Stethoscope, Search, User
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
// O CSS é importado no DoctorLayout.tsx, mas podemos deixar aqui por segurança
import "./Dashboard.css"; 
import medicaImg from "/medica.jpeg";
import AccessibilityMenu from "../../../components/ui/AccessibilityMenu";

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
  // Estados apenas para esta página
  const [doctorName, setDoctorName] = useState("Médico(a)");
  const [loading, setLoading] = useState(true);
  const [kpiCounts, setKpiCounts] = useState<KpiCounts>({ patients: 0, laudos: 0, consultas: 0 });
  const [proximasConsultas, setProximasConsultas] = useState<ProximaConsulta[]>([]);
  const [diasComConsulta, setDiasComConsulta] = useState<Date[]>([]);
  
  // Função de carregamento (sem alterações)
  const carregarDados = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw new Error("Sessão não encontrada.");

      const { data: doctorData, error: doctorError } = await supabase
          .from('doctors')
          .select('id, full_name') 
          .eq('user_id', user.id)
          .single(); 

      if (doctorError || !doctorData) throw new Error("Registro de médico não encontrado.");
      
      setDoctorName(doctorData.full_name || "Médico(a)");
      const doctorId = doctorData.id;
      const today = new Date().toISOString();

      const [
        patientCountRes,
        laudosCountRes,
        completedCountRes,
        upcomingApptsRes
      ] = await Promise.all([
        supabase.from('patients').select('*', { count: 'exact', head: true }),
        supabase.from('reports').select('*', { count: 'exact', head: true })
          .eq('created_by', user.id),
        supabase.from('appointments').select('*', { count: 'exact', head: true })
          .eq('doctor_id', doctorId)
          .eq('status', 'completed'),
        supabase.from('appointments')
          .select('id, scheduled_at, patients(full_name)')
          .eq('doctor_id', doctorId)
          .gte('scheduled_at', today) 
          .order('scheduled_at', { ascending: true })
      ]);

      setKpiCounts({
        patients: patientCountRes.count || 0,
        laudos: laudosCountRes.count || 0,
        consultas: completedCountRes.count || 0,
      });
      
      const rawUpcomingData = upcomingApptsRes.data || [];
      const upcomingData: ProximaConsulta[] = rawUpcomingData.map(consulta => ({
          ...consulta,
          patients: Array.isArray(consulta.patients) 
            ? (consulta.patients[0] || null) 
            : (consulta.patients || null),
      }));

      setProximasConsultas(upcomingData.slice(0, 3));
      setDiasComConsulta(upcomingData.map(a => new Date(a.scheduled_at)));

    } catch (err: any) {
      console.error("Erro ao carregar dados do dashboard:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  // O componente agora retorna APENAS o <main>
  return (
    <main>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12">
        <div className="lg:col-span-9 space-y-8">
          {/* HERO */}
          <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-lg">
            <div className="bg-gradient-to-r from-teal-500 via-cyan-500 to-teal-400">
              <div className="grid grid-cols-1 md:grid-cols-[1.6fr_1fr] items-center">
                <div className="dashboard-card-content">
                  {/* Saudação "Olá Dr(a)" movida para aqui, dentro do conteúdo da página */}
                  <h2 className="text-white text-2xl md:text-3xl font-semibold leading-tight">
                    Olá, Dr(a). <span className="highlight">{loading ? "..." : doctorName}</span> 👋
                  </h2>
                  <CardDescription className="text-white/90 mt-3">
                    Organize sua semana em poucos cliques
                  </CardDescription>
                  <div className="mt-6 flex flex-wrap items-center gap-3">
                    <a
                      href="#"
                      className="inline-flex items-center gap-2 rounded-lg bg-white text-slate-900 text-sm font-medium px-4 py-2 shadow hover:brightness-95 transition"
                    >
                      Olhar a Tabela <ChevronRight className="h-4 w-4" />
                    </a>
                    <a
                      href="#"
                      className="inline-flex items-center gap-2 rounded-lg bg-white/15 text-white ring-1 ring-white/40 text-sm font-medium px-4 py-2 hover:bg-white/20 transition"
                    >
                      Ver laudos
                    </a>
                  </div>
                </div>
                <div className="relative dashboard-card-content flex items-center justify-center">
                  <div className="absolute inset-0 bg-white/10 blur-2xl rounded-full" />
                  <img
                    src={medicaImg}
                    alt="Médica"
                    className="relative h-48 w-48 md:h-56 md:w-56 rounded-2xl object-cover ring-4 ring-white/30 shadow-xl"
                  />
                </div>
              </div>
            </div>
          </div>

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

          {/* Desempenho (gráfico fantasma) */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Desempenho no Trabalho</CardTitle>
                <span className="text-xs rounded-full bg-emerald-50 text-emerald-700 px-2 py-0.5 border border-emerald-200">
                  +3.5%
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <BarGhost />
            </CardContent>
          </Card>
        </div>

        {/* COLUNA DIREITA (Agenda) */}
        <aside className="lg:col-span-3 space-y-8">
          
          {/* CALENDÁRIO */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-slate-500" />
                Agenda
              </CardTitle>
            </CardHeader>
            <CardContent className="flex justify-center">
              <DayPicker
                mode="single"
                locale={ptBR}
                modifiers={{ consulta: diasComConsulta }}
                modifiersClassNames={{
                  consulta: 'rdp-day_consulta'
                }}
                disabled={{ before: new Date() }}
                className="dashboard-calendar"
              />
            </CardContent>
          </Card>
          
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
                <p className="dashboard-soft text-sm">Nenhuma consulta futura encontrada.</p>
              )}
              {!loading && proximasConsultas.map((consulta) => (
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
// KpiCard
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

// UpcomingAppointmentItem
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

// BarGhost
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