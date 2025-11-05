import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useState } from "react";
import {
  FaCalendarCheck,
  FaUsers,
  FaUserMd,
  FaFileAlt,
  FaCog,
  FaSignOutAlt,
  FaBell,
  FaSearch,
  FaBars,
  FaHome,
} from "react-icons/fa";

export default function SecretaryLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();

  function handleLogout() {
    try {
      localStorage.removeItem("user_token");
      localStorage.removeItem("user_role");
    } catch (_) {}
    navigate("/", { replace: true }); // leva pra landing page
  }

  return (
    <div className="secretary-shell" style={{ display: "flex", minHeight: "100vh", backgroundColor: "#F7F8FC" }}>
      {/* SIDEBAR */}
      <aside
        className="secretary-sidebar"
        style={{
          width: collapsed ? "80px" : "240px",
          backgroundColor: "#0d9488",
          color: "#9CA3AF",
          transition: "width 0.25s ease",
          display: "flex",
          flexDirection: "column",
          padding: "1.5rem 1rem",
        }}
      >
        {/* topo / branding */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "2rem", paddingLeft: collapsed ? 0 : "0.5rem" }}>
          <FaCalendarCheck style={{ color: "#fff", fontSize: "1.5rem" }} />
          {!collapsed && (
            <div style={{ color: "#fff", fontWeight: 600, fontSize: "1rem", lineHeight: 1.2 }}>
              Secretaria <div style={{ fontSize: "0.8rem", fontWeight: 400, color: "#e0f7fa" }}>MedConnect</div>
            </div>
          )}
        </div>

        {/* links */}
        <nav style={{ flex: 0, marginBottom: "1.5rem" }}>
          <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
            <li>
              <NavLink
                to="/secretary"
                end
                className={({ isActive }) =>
                  "sec-link" + (isActive ? " active" : "")
                }
                style={({ isActive }) => ({
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  textDecoration: "none",
                  color: isActive ? "#0d9488" : "#fff",
                  backgroundColor: isActive ? "#fff" : "transparent",
                  borderRadius: "0.5rem",
                  padding: "0.75rem 1rem",
                  fontWeight: 500,
                  marginBottom: "0.25rem",
                })}
              >
                <FaHome style={{ minWidth: 20 }} />
                {!collapsed && <span>Dashboard</span>}
              </NavLink>
            </li>

            <li>
              <NavLink
                to="/secretary/consultas"
                className={({ isActive }) =>
                  "sec-link" + (isActive ? " active" : "")
                }
                style={({ isActive }) => ({
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  textDecoration: "none",
                  color: isActive ? "#0d9488" : "#fff",
                  backgroundColor: isActive ? "#fff" : "transparent",
                  borderRadius: "0.5rem",
                  padding: "0.75rem 1rem",
                  fontWeight: 500,
                  marginBottom: "0.25rem",
                })}
              >
                <FaCalendarCheck style={{ minWidth: 20 }} />
                {!collapsed && <span>Consultas</span>}
              </NavLink>
            </li>

            <li>
              <NavLink
                to="/secretary/medicos"
                style={({ isActive }) => ({
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  textDecoration: "none",
                  color: isActive ? "#0d9488" : "#fff",
                  backgroundColor: isActive ? "#fff" : "transparent",
                  borderRadius: "0.5rem",
                  padding: "0.75rem 1rem",
                  fontWeight: 500,
                  marginBottom: "0.25rem",
                })}
              >
                <FaUserMd style={{ minWidth: 20 }} />
                {!collapsed && <span>Médicos</span>}
              </NavLink>
            </li>

            <li>
              <NavLink
                to="/secretary/pacientes"
                style={({ isActive }) => ({
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  textDecoration: "none",
                  color: isActive ? "#0d9488" : "#fff",
                  backgroundColor: isActive ? "#fff" : "transparent",
                  borderRadius: "0.5rem",
                  padding: "0.75rem 1rem",
                  fontWeight: 500,
                  marginBottom: "0.25rem",
                })}
              >
                <FaUsers style={{ minWidth: 20 }} />
                {!collapsed && <span>Pacientes</span>}
              </NavLink>
            </li>

            <li>
              <NavLink
                to="/secretary/relatorios"
                style={({ isActive }) => ({
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  textDecoration: "none",
                  color: isActive ? "#0d9488" : "#fff",
                  backgroundColor: isActive ? "#fff" : "transparent",
                  borderRadius: "0.5rem",
                  padding: "0.75rem 1rem",
                  fontWeight: 500,
                  marginBottom: "0.25rem",
                })}
              >
                <FaFileAlt style={{ minWidth: 20 }} />
                {!collapsed && <span>Relatórios</span>}
              </NavLink>
            </li>

            <li>
              <NavLink
                to="/secretary/configuracoes"
                style={({ isActive }) => ({
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  textDecoration: "none",
                  color: isActive ? "#0d9488" : "#fff",
                  backgroundColor: isActive ? "#fff" : "transparent",
                  borderRadius: "0.5rem",
                  padding: "0.75rem 1rem",
                  fontWeight: 500,
                  marginBottom: "0.25rem",
                })}
              >
                <FaCog style={{ minWidth: 20 }} />
                {!collapsed && <span>Configurações</span>}
              </NavLink>
            </li>
          </ul>
        </nav>

        {/* botão sair */}
        <button
          onClick={handleLogout}
          style={{
            marginTop: "1rem",
            background: "none",
            border: "none",
            color: "#fff",
            cursor: "pointer",
            textAlign: "left",
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            padding: "0.75rem 1rem",
            borderRadius: "0.5rem",
          }}
        >
          <FaSignOutAlt style={{ minWidth: 20 }} />
          {!collapsed && <span>Sair</span>}
        </button>

        {/* botão colapsar */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          style={{
            marginTop: "0.5rem",
            background: "transparent",
            border: "1px solid rgba(255, 255, 255, 0.3)",
            borderRadius: "0.5rem",
            color: "#fff",
            padding: "0.5rem 0.75rem",
            cursor: "pointer",
            fontSize: "0.8rem",
            lineHeight: 1.2,
          }}
        >
          <FaBars /> {!collapsed && "Recolher menu"}
        </button>
      </aside>

      {/* MAIN AREA */}
      <main style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        {/* header/topbar da secretária */}
        <header
          style={{
            backgroundColor: "#fff",
            boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
            padding: "1rem 1.5rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <div style={{ position: "relative" }}>
              <FaSearch
                style={{
                  position: "absolute",
                  left: "12px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  fontSize: "0.9rem",
                  color: "#6B7280",
                }}
              />
              <input
                type="text"
                placeholder="Buscar paciente, médico..."
                style={{
                  padding: "0.6rem 0.75rem 0.6rem 2rem",
                  borderRadius: "0.5rem",
                  border: "1px solid #D1D5DB",
                  fontSize: "0.9rem",
                  minWidth: "220px",
                }}
              />
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <FaBell style={{ fontSize: "1.1rem", color: "#4B5563" }} />
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <img
                src="https://placehold.co/40x40/3B82F6/FFFFFF?text=S"
                alt="Secretária"
                style={{ width: 40, height: 40, borderRadius: "999px" }}
              />
              <div style={{ fontSize: "0.8rem", lineHeight: 1.2 }}>
                <div style={{ fontWeight: 600, color: "#1F2937" }}>Secretaria</div>
                <div style={{ color: "#6B7280" }}>recepcao@medconnect.com</div>
              </div>
            </div>
          </div>
        </header>

        {/* onde entra o conteúdo de cada aba da secretária */}
        <div >
          <Outlet />
        </div>
      </main>
    </div>
  );
}