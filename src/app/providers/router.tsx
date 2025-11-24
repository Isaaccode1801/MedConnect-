// src/app/providers/router.tsx (AJUSTADO COM DOCTOR LAYOUT)
import { createBrowserRouter, Navigate, Outlet } from "react-router-dom";

// Páginas principais (públicas)
import Home from "@/features/home/pages/Home";
import Login from "@/features/auth/pages/Login";
import SignUp from "@/features/auth/pages/SignUp";

// Médico
// ✅ 1. IMPORTAR O LAYOUT PAI
import DoctorLayout from '@/features/doctor/pages/DoctorLayout';
import DoctorDashboard from "@/features/doctor/pages/Dashboard";
import DoctorProfile from "@/features/doctor/pages/DoctorProfile"; 
import LaudosPage from "@/features/doctor/pages/laudos/LaudosPage";
import NovoLaudoPage from "@/features/doctor/pages/laudos/NovoLaudoPage";
import RevisarLaudoPage from "@/features/doctor/pages/laudos/RevisarLaudoPage";
import GerenciamentoPacientesPage from "@/features/doctor/pages/GerenciamentoPacientesPage";
import PaginaCadastroPaciente from "@/features/doctor/pages/PaginaCadastroPaciente";
import GerenciamentoConsultasPage from "@/features/doctor/pages/GerenciamentoConsultas";

// Admin
import AdminPage from "@/features/admin/pages/App";
import { AdminDashboardContent } from "@/features/admin/components/DashboardWidgets";
import UsersList from "@/features/admin/pages/UsersList.jsx";
import CreateUser from "@/features/admin/pages/CreateUser";
import AppointmentsPage from "@/features/admin/pages/AppointmentsPage";
import AdminReportsList from "@/features/admin/pages/AdminReportsList";
import UserProfilePage from "@/features/admin/pages/UserProfilePage";

// Paciente
import AgendamentoPacientePage from "@/features/patients/pages/Agendamento";
import PatientDashboard from "@/features/patients/pages/Dashboard";
import PatientAppointments from "@/features/patients/pages/PatientAppointments";

// Secretaria
import SecretaryLayout from "@/features/secretary/pages/SecretaryLayout";
import Dashboard from "@/features/secretary/pages/Dashboard";
import Medicos from "@/features/secretary/pages/Medicos";
import Pacientes from "@/features/secretary/pages/Pacientes";
import Consultas from "@/features/secretary/pages/Consultas";
import Relatorios from "@/features/secretary/pages/Relatorios";
import Configuracoes from "@/features/secretary/pages/Configuracoes";
// exemplo: src/app/providers/router.tsx (ou semelhante)
import SecretaryProfilePage from "@/features/secretary/pages/SecretaryProfilePage";

// Layout raiz
const Root = () => <Outlet />;

// Página de erro (erro de rota carregando componente)
const ErrorPage = () => (
  <div style={{ padding: 24 }}>
    <h1 style={{ fontSize: 20, marginBottom: 8 }}>Ops — algo deu errado</h1>
    <p style={{ marginBottom: 16 }}>
      Houve um erro ao carregar esta rota. Tente novamente ou volte para os laudos.
    </p>
    <a
      href="/doctor/laudos"
      style={{
        display: "inline-block",
        padding: "10px 14px",
        background: "#0d9488",
        color: "#fff",
        borderRadius: 8,
        textDecoration: "none",
      }}
    >
      Ir para Laudos
    </a>
  </div>
);

// Página 404 (rota não encontrada)
const NotFound = () => (
  <div style={{ padding: 24 }}>
    <h1 style={{ fontSize: 18, marginBottom: 8 }}>404 — Página não encontrada</h1>
    <p>A página solicitada não existe. Verifique o endereço e tente novamente.</p>
    <a
      href="/doctor/laudos"
      style={{
        display: "inline-block",
        padding: "10px 14px",
        background: "#0d9488",
        color: "#fff",
        borderRadius: 8,
        textDecoration: "none",
      }}
    >
      Voltar para Laudos
    </a>
  </div>
);

export const router = createBrowserRouter([
  {
    element: <Root />,
    errorElement: <ErrorPage />,
    children: [
      // ROTAS PÚBLICAS / GERAIS
      { path: "/", element: <Home /> },
      { path: "/login", element: <Login /> },
      { path: "/signup", element: <SignUp /> },

      // REDIRECTS ÚTEIS
      // (Removemos o redirect /doctor, pois agora é uma rota pai)
      { path: "/dashboard", element: <Navigate to="/doctor/dashboard" replace /> },
      { path: "/laudos", element: <Navigate to="/doctor/laudos" replace /> },

      // ===============================================
      // ✅ 2. ÁREA DO MÉDICO (REESTRUTURADA)
      // ===============================================
      {
        path: "/doctor",
        element: <DoctorLayout />, // O Layout Pai
        children: [
          // A rota "index" redireciona /doctor para /doctor/dashboard
          { index: true, element: <Navigate to="dashboard" replace /> },
          
          // As rotas filhas agora usam caminhos relativos (sem "/doctor")
          { path: "dashboard", element: <DoctorDashboard /> },
          { path: "perfil", element: <DoctorProfile /> },
          // laudos
          { path: "laudos", element: <LaudosPage /> },
          { path: "laudos/novo", element: <NovoLaudoPage /> },
          { path: "laudos/:id/revisar", element: <RevisarLaudoPage /> },
          { path: "laudos/:id/editar", element: <NovoLaudoPage /> },
          // pacientes
          { path: "pacientes", element: <GerenciamentoPacientesPage /> },
          { path: "pacientes/novo", element: <PaginaCadastroPaciente /> },
          { path: "pacientes/editar/:id", element: <PaginaCadastroPaciente /> },
          // Consultas
          { path: "consultas", element: <GerenciamentoConsultasPage /> },
        ],
      },
      // ===============================================
      // FIM DA ÁREA DO MÉDICO
      // ===============================================

      // ÁREA DO ADMIN
      {
        path: "/admin",
        element: <AdminPage />, 
        children: [
          { index: true, element: <AdminDashboardContent /> },
          { path: "UsersList", element: <UsersList /> },
          { path: "CreateUser", element: <CreateUser /> },
          { path: "AppointmentsPage", element: <AppointmentsPage /> },
          { path: "laudos", element: <AdminReportsList /> },
          { path: "laudos/:id/revisar", element: <RevisarLaudoPage /> },
          { path: "profile", element: <UserProfilePage /> },
        ],
      },

      // ÁREA DO PACIENTE
      { path: "/patient/dashboard", element: <PatientDashboard /> },
      { path: "/patient/agendamento", element: <AgendamentoPacientePage /> },
      { path: "/patient/consultas", element: <PatientAppointments /> },
      { path: "/patient", element: <Navigate to="/patient/dashboard" replace /> },

      // ÁREA DA SECRETARIA
      {
        path: "/secretary",
        element: <SecretaryLayout />,
        children: [
          { index: true, element: <Dashboard /> }, 
          { path: "medicos", element: <Medicos /> }, 
          { path: "pacientes", element: <Pacientes /> }, 
          { path: "consultas", element: <Consultas /> }, 
          { path: "relatorios", element: <Relatorios /> }, 
          { path: "configuracoes", element: <Configuracoes /> },
          { path: "relatorios/:id/revisar", element: <RevisarLaudoPage /> },
          { path: "profile", element: <SecretaryProfilePage /> },
        ],
      },
    ],
  },
  // catch-all 404
  { path: "*", element: <NotFound /> },
]);