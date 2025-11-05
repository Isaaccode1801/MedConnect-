// src/features/doctor/pages/Dashboard.tsx (INTELIGENTE E CORRIGIDO)
import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import {
  Activity,
  CalendarDays,
  FileText,
  Search,
  Users,
  ChevronRight,
  Stethoscope,
  Clock4,
} from "lucide-react";
// ✅ NOVOS IMPORTS
import { DayPicker } from "react-day-picker";
import { ptBR } from "date-fns/locale";
import { format } from "date-fns";
import "react-day-picker/dist/style.css"; // CSS do Calendário
import "./Dashboard.css";
import medicaImg from "/medica.jpeg";

// --- Tipos de Dados ---
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
    <h3 className={`text-xl font-semibold tracking-tight ${className}`}>{children}</h3>
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
  const navigate = useNavigate();
  const { pathname } = useLocation();

  // =================================================================
  // LÓGICA E ESTADOS DA PÁGINA (ATUALIZADOS)
  // =================================================================
  const [searchTerm, setSearchTerm] = useState("");
  const [doctorName, setDoctorName] = useState("Médico(a)");
  const [loading, setLoading] = useState(true);

  // ✅ NOVOS ESTADOS PARA OS DADOS
  const [kpiCounts, setKpiCounts] = useState<KpiCounts>({ patients: 0, laudos: 0, consultas: 0 });
  const [proximasConsultas, setProximasConsultas] = useState<ProximaConsulta[]>([]);
  const [diasComConsulta, setDiasComConsulta] = useState<Date[]>([]);
  
  // ✅ FUNÇÃO DE CARREGAMENTO ATUALIZADA
const carregarDados = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Descobrir o ID do usuário e do médico
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw new Error("Sessão não encontrada.");

      const { data: doctorData, error: doctorError } = await supabase
          .from('doctors')
          .select('id, full_name') // Pega o ID e o nome
          .eq('user_id', user.id)
          .single(); 

      if (doctorError || !doctorData) throw new Error("Registro de médico não encontrado.");
      
      setDoctorName(doctorData.full_name || "Médico(a)");
      const doctorId = doctorData.id;

      // 2. Definir a data de hoje para filtrar consultas futuras
      const today = new Date().toISOString();

      // 3. Executar todas as buscas de dados em paralelo
      const [
        patientCountRes,
        laudosCountRes,
        completedCountRes,
        upcomingApptsRes // O tipo inferido disto está errado (patients: [])
      ] = await Promise.all([
        // KPI 1: Contagem de Pacientes
        supabase.from('patients').select('*', { count: 'exact', head: true }),
        
        // KPI 2: Contagem de Laudos
        supabase.from('reports').select('*', { count: 'exact', head: true })
          .eq('created_by', user.id),
          
        // KPI 3: Contagem de Consultas Realizadas
        supabase.from('appointments').select('*', { count: 'exact', head: true })
          .eq('doctor_id', doctorId)
          .eq('status', 'completed'),
          
        // Query 4: Próximas Consultas
        supabase.from('appointments')
          .select('id, scheduled_at, patients(full_name)')
          .eq('doctor_id', doctorId)
          .gte('scheduled_at', today) 
          .order('scheduled_at', { ascending: true })
      ]);

      // 4. Atualizar os estados
      setKpiCounts({
        patients: patientCountRes.count || 0,
        laudos: laudosCountRes.count || 0,
        consultas: completedCountRes.count || 0,
      });

      // =================================================================
      // ✅ CORREÇÃO AQUI (Linha 150)
      // =================================================================
      // O Supabase retorna 'patients' como um array []. Nossa interface espera um objeto {}.
      // Vamos "achatar" (flatten) os dados para que correspondam à interface.
      
      // 1. Pegamos os dados brutos (que o TS acha que estão errados)
      const rawUpcomingData = upcomingApptsRes.data || [];
      
      // 2. Mapeamos e corrigimos o tipo
      const upcomingData: ProximaConsulta[] = rawUpcomingData.map(consulta => ({
          ...consulta,
          // Se 'patients' for um array, pega o primeiro item.
          // Se não for (ou estiver vazio), usa 'null'.
          patients: Array.isArray(consulta.patients) 
            ? (consulta.patients[0] || null) 
            : (consulta.patients || null),
      }));
      // =================================================================
      // FIM DA CORREÇÃO
      // =================================================================

      setProximasConsultas(upcomingData.slice(0, 3)); // Pega só as 3 primeiras para a lista

      // Mapeia *todas* as datas futuras para o calendário
      setDiasComConsulta(upcomingData.map(a => new Date(a.scheduled_at)));

    } catch (err: any) {
      console.error("Erro ao carregar dados do dashboard:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Carrega dados na montagem inicial
  useEffect(() => {
    carregarDados();
  }, [carregarDados]);
  // =================================================================
  // FIM DA LÓGICA
  // =================================================================

  return (
  <div className="doctor-dashboard min-h-screen bg-[#F5F7FA] text-slate-900">
      <header className="doctor-header">
        <div className="doctor-header__inner">
          <div className="doctor-header__brand">
            <div className="brand-icon">
              <div className="brand-icon__inner">
                <Stethoscope className="brand-icon__svg" />
              </div>
            </div>
            <span className="brand-name">Medconnect</span>
            <h1 className="doctor-greeting">
              Olá, Dr(a). <span className="highlight">{loading ? "..." : doctorName}</span> 👋
            </h1>
          </div>

          <div className="doctor-header__search">
            <div className="search-wrapper">
              <Search className="search-icon" />
              <input
                name="q"
                autoComplete="off"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar paciente, exame, laudo…"
                className="search-input"
              />
            </div>
          </div>

          <nav className="doctor-header__nav">
            <button
              onClick={() => navigate("/doctor/dashboard")}
              className={pathname === '/doctor/dashboard' ? 'nav-link active' : 'nav-link'}
            >
              Início
            </button>
            <button
              onClick={() => navigate("/doctor/laudos")}
              className={pathname.startsWith('/doctor/laudos') ? 'nav-link active' : 'nav-link'}
            >
              Laudos
            </button>
            <button
              onClick={() => navigate("/doctor/pacientes")} 
              className={pathname.startsWith('/doctor/pacientes') ? 'nav-link active' : 'nav-link'}
            >
              Pacientes
            </button>
            <button
              onClick={() => navigate("/doctor/consultas")} 
              className={pathname.startsWith('/doctor/consultas') ? 'nav-link active' : 'nav-link'}
            >
              Consultas
            </button>
            {/* Botão para voltar à página inicial do site */}
            <button
              onClick={() => navigate("/")}
              className="nav-link"
              title="Voltar ao início"
            >
              Voltar ao Início
            </button>
          </nav>
        </div>
      </header>

      <main>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12">
          <div className="lg:col-span-9 space-y-8">
            {/* HERO (sem alterações) */}
            <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-lg">
              <div className="bg-gradient-to-r from-teal-500 via-cyan-500 to-teal-400">
                <div className="grid grid-cols-1 md:grid-cols-[1.6fr_1fr] items-center">
                  <div className="dashboard-card-content">
                    <h2 className="text-white text-2xl md:text-3xl font-semibold leading-tight">
                      Já olhou sua tabela de pacientes hoje?
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

            {/* ✅ KPIs (3 colunas) - AGORA SÃO DINÂMICOS */}
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

            {/* Desempenho (gráfico fantasma - sem alterações) */}
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

          {/* COLUNA DIREITA (lg: 3 colunas) */}
          <aside className="lg:col-span-3 space-y-8">
            
            {/* ✅ CALENDÁRIO ATUALIZADO */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-slate-500" />
                  Agenda
                </CardTitle>
              </CardHeader>
              <CardContent className="flex justify-center">
                {/* Substituímos o MiniCalendar pelo DayPicker real */}
                <DayPicker
                  mode="single"
                  locale={ptBR}
                  modifiers={{ consulta: diasComConsulta }}
                  modifiersClassNames={{
                    consulta: 'rdp-day_consulta' // Classe CSS para destacar o dia
                  }}
                  disabled={{ before: new Date() }} // Desabilita dias passados
                  className="dashboard-calendar" // Classe para ajustar o tamanho se necessário
                />
              </CardContent>
            </Card>
            
            {/* ✅ LISTA DE PRÓXIMAS CONSULTAS */}
            <Card>
              <CardHeader>
                {/* Título atualizado */}
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
                    // Formata a data e hora
                    date={format(new Date(consulta.scheduled_at), "dd/MM 'às' HH:mm")}
                    color="from-cyan-400 to-emerald-400" // Cor estática por enquanto
                  />
                ))}
              </CardContent>
            </Card>

          </aside>
        </div>
      </main>
    </div>
  );
}

/* ---------- componentes locais ---------- */

// KpiCard (sem alterações)
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

// ✅ Componente 'LastVisit' renomeado para 'UpcomingAppointmentItem' para clareza
// (A lógica interna é a mesma, só mudam os nomes das props)
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

// BarGhost (sem alterações)
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

// ⛔ Componente MiniCalendar (REMOVIDO)
// Não precisamos mais dele, pois foi substituído pelo DayPicker