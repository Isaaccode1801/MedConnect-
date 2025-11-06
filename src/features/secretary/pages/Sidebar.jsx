import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import "./Dashboard.css";

export const SIDEBAR_WIDTH_OPEN = 260;
export const SIDEBAR_WIDTH_CLOSED = 88;

export default function Sidebar() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const navigate = useNavigate();

  function handleLogout(e) {
    e.preventDefault();

    try {
      localStorage.removeItem("user_token");
      localStorage.removeItem("user_role");
    } catch (_) {}

    // volta pra landing page "/"
    navigate("/", { replace: true });
  }

  return (
    <div className="secretary-layout-shell">
      {/* Sidebar */}
      <nav
        className={`sidebar ${sidebarOpen ? "" : "sidebar-fechada"}`}
        style={{ position: 'fixed', top: 0, left: 0, height: '100vh', zIndex: 1000 }}
      >
        <div className="sidebar-header">
          <i className="fa-solid fa-calendar-check"></i>
          <span>Secretaria</span>
          <small style={{ display: sidebarOpen ? 'block' : 'none', opacity: 0.85, fontSize: 12 }}>MedConnect</small>
        </div>

        <div className="nav-links">
          {/* Dashboard */}
          <NavLink
            to="/secretary"
            end
            className={({ isActive }) =>
              isActive ? "active" : undefined
            }
          >
            <i className="fa-solid fa-house" /> <span style={{ display: sidebarOpen ? 'inline' : 'none' }}>Dashboard</span>
          </NavLink>

          {/* Médicos */}
          <NavLink
            to="/secretary/medicos"
            className={({ isActive }) => (isActive ? "active" : undefined)}
          >
            <i className="fa-solid fa-user-doctor" /> <span style={{ display: sidebarOpen ? 'inline' : 'none' }}>Médicos</span>
          </NavLink>

          {/* Pacientes */}
          <NavLink
            to="/secretary/pacientes"
            className={({ isActive }) => (isActive ? "active" : undefined)}
          >
            <i className="fa-solid fa-users" /> <span style={{ display: sidebarOpen ? 'inline' : 'none' }}>Pacientes</span>
          </NavLink>

          {/* Consultas */}
          <NavLink
            to="/secretary/consultas"
            className={({ isActive }) => (isActive ? "active" : undefined)}
          >
            <i className="fa-regular fa-clipboard" /> <span style={{ display: sidebarOpen ? 'inline' : 'none' }}>Consultas</span>
          </NavLink>

          {/* Relatórios */}
          <NavLink
            to="/secretary/relatorios"
            className={({ isActive }) => (isActive ? "active" : undefined)}
          >
            <i className="fa-regular fa-file-lines" /> <span style={{ display: sidebarOpen ? 'inline' : 'none' }}>Relatórios</span>
          </NavLink>

          {/* Configurações */}
          <NavLink
            to="/secretary/configuracoes"
            className={({ isActive }) => (isActive ? "active" : undefined)}
          >
            <i className="fa-solid fa-gear" /> <span style={{ display: sidebarOpen ? 'inline' : 'none' }}>Configurações</span>
          </NavLink>
        </div>

        <div className="sidebar-footer">
          <a href="#" onClick={handleLogout}>
            <i className="fa-solid fa-right-from-bracket"></i> <span style={{ display: sidebarOpen ? 'inline' : 'none' }}>Sair</span>
          </a>
          {/* Botão de recolher no rodapé (estilo semelhante ao do Admin) */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="collapse-btn"
            title="Recolher menu"
          >
            <i className="fa-solid fa-bars" /> <span style={{ display: sidebarOpen ? 'inline' : 'none' }}>Recolher menu</span>
          </button>
        </div>
      </nav>

      {/* Botão hamburguer removido em favor do botão no rodapé */}
    </div>
  );
}

export function useSecretaryContentStyle(sidebarOpen) {
  return {
    marginLeft: sidebarOpen ? SIDEBAR_WIDTH_OPEN : SIDEBAR_WIDTH_CLOSED,
    transition: 'margin-left .3s ease',
  };
}