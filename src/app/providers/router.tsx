// src/app/providers/router.tsx
import { createBrowserRouter, Navigate, Outlet } from "react-router-dom";

// Páginas principais (públicas)
import Home from "@/features/home/pages/Home";
import Login from "@/features/auth/pages/Login";

// Médico
import DoctorDashboard from "@/features/doctor/pages/Dashboard";
import LaudosPage from "@/features/doctor/pages/laudos/LaudosPage";
import NovoLaudoPage from "@/features/doctor/pages/laudos/NovoLaudoPage";
import RevisarLaudoPage from "@/features/doctor/pages/laudos/RevisarLaudoPage";
import GerenciamentoPacientesPage from "@/features/doctor/pages/GerenciamentoPacientesPage";
import PaginaCadastroPaciente from "@/features/doctor/pages/PaginaCadastroPaciente";

// Admin
import AdminPage from "@/features/admin/pages/App";
import { AdminDashboardContent } from "@/features/admin/components/DashboardWidgets";
import UsersList from "@/features/admin/pages/UsersList.jsx";
import CreateUser from "@/features/admin/pages/CreateUser";
import AppointmentsPage from "@/features/admin/pages/AppointmentsPage";

// Paciente
import AgendamentoPacientePage from "@/features/patients/pages/Agendamento";
import PatientDashboard from "@/features/patients/pages/Dashboard";

// Secretaria
import SecretaryLayout from "@/features/secretary/pages/SecretaryLayout";
import Dashboard from "@/features/secretary/pages/Dashboard";
import Medicos from "@/features/secretary/pages/Medicos";
import Pacientes from "@/features/secretary/pages/Pacientes";
import Consultas from "@/features/secretary/pages/Consultas";
import Relatorios from "@/features/secretary/pages/Relatorios";
import Configuracoes from "@/features/secretary/pages/Configuracoes";

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
      //
      // ROTAS PÚBLICAS / GERAIS
      //
      { path: "/", element: <Home /> },
      { path: "/login", element: <Login /> },

      //
      // REDIRECTS ÚTEIS
      //
      { path: "/doctor", element: <Navigate to="/doctor/dashboard" replace /> },
      { path: "/dashboard", element: <Navigate to="/doctor/dashboard" replace /> },
      { path: "/laudos", element: <Navigate to="/doctor/laudos" replace /> },

      //
      // ÁREA DO MÉDICO
      //
      { path: "/doctor/dashboard", element: <DoctorDashboard /> },

      // laudos
      { path: "/doctor/laudos", element: <LaudosPage /> },
      { path: "/doctor/laudos/novo", element: <NovoLaudoPage /> },
      { path: "/doctor/laudos/:id/revisar", element: <RevisarLaudoPage /> },
      { path: "/doctor/laudos/:id/editar", element: <NovoLaudoPage /> },

      // pacientes
      { path: "/doctor/pacientes", element: <GerenciamentoPacientesPage /> },
      { path: "/doctor/pacientes/novo", element: <PaginaCadastroPaciente /> },
      { path: "/doctor/pacientes/editar/:id", element: <PaginaCadastroPaciente /> },

      //
      // ÁREA DO ADMIN
      //
      {
        path: "/admin",
        element: <AdminPage />, // esse componente PRECISA ter <Outlet />
        children: [
          // /admin
          { index: true, element: <AdminDashboardContent /> },

          // /admin/UsersList
          { path: "UsersList", element: <UsersList /> },

          // /admin/CreateUser
          { path: "CreateUser", element: <CreateUser /> },

          // /admin/AppointmentsPage
          { path: "AppointmentsPage", element: <AppointmentsPage /> },
        ],
      },

      //
  // ÁREA DO PACIENTE
  //
  { path: "/patient/dashboard", element: <PatientDashboard /> },
  { path: "/patient/agendamento", element: <AgendamentoPacientePage /> },
  { path: "/patient", element: <Navigate to="/patient/dashboard" replace /> },

      //
      // ÁREA DA SECRETARIA
      //
{
  path: "/secretary",
  element: <SecretaryLayout />, // já vamos criar esse layout
  children: [
    { index: true, element: <Dashboard /> },           // /secretary
    { path: "medicos", element: <Medicos /> },         // /secretary/medicos
    { path: "pacientes", element: <Pacientes /> },     // /secretary/pacientes
    { path: "consultas", element: <Consultas /> },     // /secretary/consultas
    { path: "relatorios", element: <Relatorios /> },   // /secretary/relatorios
    { path: "configuracoes", element: <Configuracoes /> }, // /secretary/configuracoes
  ],
},
    ],
  },
        // catch-all 404
        { path: "*", element: <NotFound /> },
]);