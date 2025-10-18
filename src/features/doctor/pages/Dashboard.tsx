// src/features/doctor/pages/Dashboard.tsx
import * as React from "react";
import { useNavigate } from "react-router-dom";
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
import "./Dashboard.css";
import medicaImg from "../../../assets/medica.jpeg";

// --- Basic Card primitives scoped to this page ---
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

// Add local shadcn-like helpers so JSX <CardTitle/> works
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

export default function DoctorDashboard() {
  const navigate = useNavigate();
  return (
    <div className="doctor-dashboard min-h-screen bg-[#F5F7FA] text-slate-900">
      <header className="doctor-header">
        <div className="doctor-header__inner">
          {/* Marca + Saudação */}
          <div className="doctor-header__left">
            <div className="brand-logo">
              <div className="logo-circle">
                <div className="inner">
                  <Stethoscope className="brand-icon" />
                </div>
              </div>
              <span className="brand-name">Medconnect</span>
            </div>
            <h1 className="doctor-greeting">
              Olá, Dr(a). <span className="highlight">Camilla Millene</span> <span aria-hidden>👋</span>
            </h1>
          </div>

          {/* Busca centralizada */}
          <div className="doctor-header__search" role="search">
            <div className="search-wrapper">
              <Search className="search-icon" aria-hidden />
              <input
                placeholder="Buscar paciente, exame, laudo…"
                className="search-input"
                aria-label="Buscar"
              />
            </div>
          </div>

          {/* Navegação à direita */}
          <nav className="doctor-header__nav" aria-label="Navegação principal">
            <button
              type="button"
              onClick={() => navigate('/doctor/dashboard')}
              className="nav-link active"
              aria-current="page"
            >
              Início
            </button>
            <button
              type="button"
              onClick={() => navigate('/doctor/laudos')}
              className="nav-link"
            >
              Laudos
            </button>
            <button
              type="button"
              onClick={() => navigate('/doctor/pacientes')}
              className="nav-link hidden-lg"
            >
              Gerenciamento de Pacientes
            </button>
          </nav>
        </div>
      </header>

      <main>
        {/* GRID raiz -> conteúdo + coluna direita */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12">
          {/* COLUNA PRINCIPAL (lg: 9 colunas) */}
          <div className="lg:col-span-9 space-y-8">
            {/* HERO (degradê teal com foto) */}
            <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-lg">
              <div className="bg-gradient-to-r from-teal-500 via-cyan-500 to-teal-400">
                <div className="grid grid-cols-1 md:grid-cols-[1.6fr_1fr] items-center">
                  {/* texto */}
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
                  {/* foto */}
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

            {/* KPIs (3 colunas) */}
            <div className="dashboard-grid">
              <KpiCard title="Pacientes" value="320 pessoas" icon={<Users className="h-5 w-5 text-teal-600" />} />
              <KpiCard title="Laudos Emitidos" value="450" icon={<FileText className="h-5 w-5 text-cyan-600" />} />
              <KpiCard title="Consultas Realizadas" value="920" icon={<Activity className="h-5 w-5 text-emerald-600" />} />
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

          {/* COLUNA DIREITA (lg: 3 colunas) */}
          <aside className="lg:col-span-3 space-y-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-slate-500" />
                  Próximas consultas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <MiniCalendar />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Últimas Consultas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <LastVisit color="from-cyan-400 to-emerald-400" name="Alves Diamante" date="Hoje, 08:20" />
                <LastVisit color="from-fuchsia-400 to-cyan-400" name="Isaac Kauã" date="Ontem, 15:10" />
                <LastVisit color="from-emerald-400 to-teal-400" name="João Silva" date="Ontem, 10:00" />
              </CardContent>
            </Card>
          </aside>
        </div>
      </main>
    </div>
  );
}

/* ---------- componentes locais ---------- */

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

function NextItem({ time, name, desc }: { time: string; name: string; desc: string }) {
  return (
    <div className="next-item flex items-start gap-4">
      <span className="inline-flex items-center justify-center h-9 w-9 rounded-lg bg-slate-100 text-slate-600">
        <Clock4 className="h-4 w-4" />
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate text-slate-900">{name}</p>
        <p className="text-xs text-slate-500 truncate">{desc}</p>
      </div>
      <span className="text-xs text-slate-600 ml-2">{time}</span>
    </div>
  );
}

function LastVisit({
  name,
  date,
  color,
}: {
  name: string;
  date: string;
  color: string; // ex: "from-emerald-400 to-teal-400"
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

function MiniCalendar() {
  const days = ["S", "T", "Q", "Q", "S", "S", "D"];
  const grid = Array.from({ length: 35 }, (_, i) => i + 1);
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-medium text-slate-700">Jan 2022</span>
        <div className="h-2 w-2 rounded-full bg-slate-300" />
      </div>
      <div className="grid grid-cols-7 gap-2 text-center text-[11px] text-slate-500 mb-2">
        {days.map((d, i) => (
          <span key={`${d}-${i}`}>{d}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-2">
        {grid.map((n) => (
          <button
            key={n}
            className={`h-9 rounded-lg border text-xs
              ${[10, 11, 18].includes(n)
                ? "bg-teal-600 text-white border-teal-600"
                : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"}`}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}