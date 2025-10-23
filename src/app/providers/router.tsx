// src/app/providers/router.tsx
import { createBrowserRouter, Navigate, Outlet } from "react-router-dom";

// Páginas principais
import Home from "@/features/home/pages/Home";
import Login from "@/features/auth/pages/Login";

// Laudos (organizados dentro de Doctor)
import LaudosPage from "@/features/doctor/pages/laudos/LaudosPage";
import NovoLaudoPage from "@/features/doctor/pages/laudos/NovoLaudoPage";
import RevisarLaudoPage from "@/features/doctor/pages/laudos/RevisarLaudoPage";
import DoctorDashboard from "@/features/doctor/pages/Dashboard";
import AdminPage from '@/features/admin/pages/App'; 
import UsersList from '@/features/admin/pages/UsersList.jsx'
import { AdminDashboardContent } from '@/features/admin/components/DashboardWidgets';
import GerenciamentoPacientesPage from '@/features/doctor/pages/GerenciamentoPacientesPage';
import PaginaCadastroPaciente from '@/features/doctor/pages/PaginaCadastroPaciente';
import AgendamentoPacientePage from '@/features/patients/pages/agendamento.jsx';
const Root = () => <Outlet />;

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
      { path: "/", element: <Home /> },
      { path: "/login", element: <Login /> },

      // Redirects úteis
      { path: "/doctor", element: <Navigate to="/doctor/dashboard" replace /> },
      { path: "/dashboard", element: <Navigate to="/doctor/dashboard" replace /> },
      { path: "/laudos", element: <Navigate to="/doctor/laudos" replace /> },
      { path: "/doctor/dashboard", element: <DoctorDashboard /> },

      // Rotas do médico — Laudos
      { path: "/doctor/laudos", element: <LaudosPage /> },
      { path: "/doctor/laudos/novo", element: <NovoLaudoPage /> },
      { path: "/doctor/pacientes", element: <GerenciamentoPacientesPage /> },
      { path: "/doctor/pacientes/novo", element: <PaginaCadastroPaciente /> },
      { path: "/doctor/pacientes/editar/:id", element: <PaginaCadastroPaciente /> },
      { path: "/doctor/laudos/:id/revisar", element: <RevisarLaudoPage /> },
      { path: "/doctor/laudos/:id/editar", element: <NovoLaudoPage /> },
      // 404 explícito
      { path: "*", element: <NotFound /> },

      // --- Rotas do Admin (Estrutura Aninhada) ---
      {
        path: "/admin", // 👈 Caminho base para o layout admin
        element: <AdminPage />,
        children: [
          {
            index: true,
            element: <AdminDashboardContent />,
          },
          { path: "users", element: <UsersList /> },
          
        ]   // 👈 Renderiza o layout AdminPage (o componente App antigo)
      },
      // --- Rotas do Paciente ---
      // 👇 Adicione a nova rota aqui 👇
      { path: "/patient/agendamento", element: <AgendamentoPacientePage /> },
      // (Opcional) Adicione um redirect para a rota principal do paciente, se houver
      // { path: "/paciente", element: <Navigate to="/paciente/agendamento" replace /> },
      { path: "*", element: <NotFound /> },
    ],
  },
]);
