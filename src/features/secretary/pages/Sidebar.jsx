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
          <i className="fa-solid fa-building"></i>
          <span>Medconnect</span>
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
            <i className="fa-solid fa-gauge" /> Dashboard
          </NavLink>

          {/* Médicos */}
          <NavLink
            to="/secretary/medicos"
            className={({ isActive }) => (isActive ? "active" : undefined)}
          >
            Gerenciar Médicos
          </NavLink>

          {/* Pacientes */}
          <NavLink
            to="/secretary/pacientes"
            className={({ isActive }) => (isActive ? "active" : undefined)}
          >
            Gerenciar Pacientes
          </NavLink>

          {/* Consultas */}
          <NavLink
            to="/secretary/consultas"
            className={({ isActive }) => (isActive ? "active" : undefined)}
          >
            Gerenciar Consultas
          </NavLink>

          {/* Relatórios */}
          <NavLink
            to="/secretary/relatorios"
            className={({ isActive }) => (isActive ? "active" : undefined)}
          >
            Gerenciar Relatórios
          </NavLink>

          {/* Configurações */}
          <NavLink
            to="/secretary/configuracoes"
            className={({ isActive }) => (isActive ? "active" : undefined)}
          >
            <i className="fa-solid fa-gear" /> Configurações
          </NavLink>
        </div>

        <div className="sidebar-footer">
          <a href="#" onClick={handleLogout}>
            <i className="fa-solid fa-right-from-bracket"></i> Sair
          </a>
        </div>
      </nav>

      {/* Botão hamburguer */}
      <button
        id="toggle-sidebar-btn"
        onClick={() => setSidebarOpen(!sidebarOpen)}
        title="Abrir/Fechar Menu"
        style={{ position: 'fixed', top: '1rem', left: sidebarOpen ? '260px' : '88px', zIndex: 1100 }}
      >
        <i className={`fa-solid ${sidebarOpen ? "fa-bars" : "fa-xmark"}`} />
      </button>
    </div>
  );
}

export function useSecretaryContentStyle(sidebarOpen) {
  return {
    marginLeft: sidebarOpen ? SIDEBAR_WIDTH_OPEN : SIDEBAR_WIDTH_CLOSED,
    transition: 'margin-left .3s ease',
  };
}