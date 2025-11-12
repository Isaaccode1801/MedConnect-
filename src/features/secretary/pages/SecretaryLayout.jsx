import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState, useCallback } from "react";
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
  FaTimes,
} from "react-icons/fa";

/**
 * Util: formata data ISO para dd/mm/aaaa hh:mm
 */
function formatDate(iso) {
  try {
    const d = new Date(iso);
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    const hh = String(d.getHours()).padStart(2, "0");
    const mi = String(d.getMinutes()).padStart(2, "0");
    return `${dd}/${mm}/${yyyy} ${hh}:${mi}`;
  } catch {
    return iso || "";
  }
}

/**
 * Util: gera iniciais a partir do email (antes do @)
 */
function initialsFromEmail(email) {
  if (!email) return "U";
  const [name] = email.split("@");
  if (!name) return "U";
  const parts = name
    .replace(/[._-]+/g, " ")
    .split(" ")
    .filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

/**
 * Util: nome “bonitinho” a partir do email
 */
function displayNameFromEmail(email) {
  if (!email) return "Usuário";
  const base = email.split("@")[0];
  return base
    .replace(/[._-]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((s) => s[0].toUpperCase() + s.slice(1))
    .join(" ");
}

export default function SecretaryLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [me, setMe] = useState(null);
  const [loadingMe, setLoadingMe] = useState(true);
  const [errorMe, setErrorMe] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);

  const navigate = useNavigate();

  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://yuanqfswhberkoevtmfr.supabase.co";
  const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY;

  const userRole = useMemo(() => {
    try {
      return localStorage.getItem("user_role") || "secretaria";
    } catch {
      return "secretaria";
    }
  }, []);

  const handleLogout = useCallback(() => {
    try {
      localStorage.removeItem("user_token");
      localStorage.removeItem("user_role");
    } catch (_) {}
    navigate("/", { replace: true });
  }, [navigate]);

  // Fecha modal com ESC
  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") setProfileOpen(false);
    }
    if (profileOpen) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [profileOpen]);

  // Busca usuário autenticado
  useEffect(() => {
    const token = (() => {
      try {
        return localStorage.getItem("user_token");
      } catch {
        return null;
      }
    })();

    if (!token) {
      setLoadingMe(false);
      navigate("/", { replace: true });
      return;
    }

    async function loadMe() {
      setLoadingMe(true);
      setErrorMe("");
      try {
        const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            apikey: SUPABASE_ANON || "",
          },
        });

        if (!res.ok) {
          const txt = await res.text();
          throw new Error(`Auth /user falhou (${res.status}): ${txt}`);
        }

        const data = await res.json();
        // Esperado: { id, email, created_at }
        setMe(data);
      } catch (err) {
        setErrorMe(err?.message || "Falha ao carregar usuário");
      } finally {
        setLoadingMe(false);
      }
    }

    loadMe();
  }, [SUPABASE_URL, SUPABASE_ANON, navigate]);

  const displayEmail = me?.email || "—";
  const displayName = me?.email ? displayNameFromEmail(me.email) : "Secretaria";
  const displayInitials = me?.email ? initialsFromEmail(me.email) : "S";

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
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            marginBottom: "2rem",
            paddingLeft: collapsed ? 0 : "0.5rem",
          }}
        >
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
                className={({ isActive }) => "sec-link" + (isActive ? " active" : "")}
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
                className={({ isActive }) => "sec-link" + (isActive ? " active" : "")}
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

            {/* Perfil real da secretária */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              {/* Avatar clicável */}
              <button
                onClick={() => setProfileOpen(true)}
                aria-label="Abrir perfil"
                style={{
                  all: "unset",
                  cursor: "pointer",
                  display: "grid",
                  placeItems: "center",
                  width: 40,
                  height: 40,
                  borderRadius: "999px",
                  backgroundColor: "#e0f2f1",
                  color: "#0d9488",
                  fontWeight: 700,
                  fontSize: "0.9rem",
                  userSelect: "none",
                  border: "1px solid #c7ecea",
                }}
                title="Ver meu perfil"
              >
                {loadingMe ? "…" : displayInitials}
              </button>

              <div style={{ fontSize: "0.8rem", lineHeight: 1.2 }}>
                <div style={{ fontWeight: 600, color: "#1F2937" }}>
                  {loadingMe ? "Carregando..." : displayName}
                </div>
                <div style={{ color: "#6B7280" }}>
                  {loadingMe ? "—" : displayEmail}
                </div>
                {!!errorMe && (
                  <div style={{ color: "#dc2626", fontSize: "0.75rem" }}>
                    {errorMe}
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Conteúdo das rotas filhas */}
        <div>
          <Outlet />
        </div>
      </main>

      {/* MODAL de Perfil */}
      {profileOpen && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            if (e.target === e.currentTarget) setProfileOpen(false);
          }}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.35)",
            display: "grid",
            placeItems: "center",
            padding: "1rem",
            zIndex: 50,
          }}
        >
          <div
            style={{
              width: "min(560px, 96vw)",
              background: "#ffffff",
              borderRadius: "0.75rem",
              boxShadow: "0 10px 30px rgba(0,0,0,0.12)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "1rem 1.25rem",
                borderBottom: "1px solid #E5E7EB",
                background: "#F9FAFB",
              }}
            >
              <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "#111827" }}>
                Meu perfil
              </h3>
              <button
                onClick={() => setProfileOpen(false)}
                aria-label="Fechar"
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  padding: 6,
                  borderRadius: 8,
                  color: "#374151",
                }}
              >
                <FaTimes />
              </button>
            </div>

            <div style={{ padding: "1rem 1.25rem" }}>
              {/* Header do modal com avatar e nome */}
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 999,
                    background: "#e0f2f1",
                    color: "#0d9488",
                    display: "grid",
                    placeItems: "center",
                    fontWeight: 700,
                  }}
                >
                  {displayInitials}
                </div>
                <div>
                  <div style={{ fontWeight: 700, color: "#111827" }}>{displayName}</div>
                  <div style={{ color: "#6B7280", fontSize: "0.9rem" }}>{displayEmail}</div>
                </div>
              </div>

              {/* Tabela simples com infos */}
              <div
                style={{
                  border: "1px solid #E5E7EB",
                  borderRadius: 12,
                  overflow: "hidden",
                }}
              >
                <div style={{ display: "grid", gridTemplateColumns: "180px 1fr" }}>
                  <div style={{ background: "#F9FAFB", padding: "0.75rem", color: "#374151", fontWeight: 600 }}>
                    ID
                  </div>
                  <div style={{ padding: "0.75rem", color: "#111827" }}>{me?.id || "—"}</div>

                  <div style={{ background: "#F9FAFB", padding: "0.75rem", color: "#374151", fontWeight: 600 }}>
                    E-mail
                  </div>
                  <div style={{ padding: "0.75rem", color: "#111827" }}>{displayEmail}</div>

                  <div style={{ background: "#F9FAFB", padding: "0.75rem", color: "#374151", fontWeight: 600 }}>
                    Criado em
                  </div>
                  <div style={{ padding: "0.75rem", color: "#111827" }}>
                    {me?.created_at ? formatDate(me.created_at) : "—"}
                  </div>

                  <div style={{ background: "#F9FAFB", padding: "0.75rem", color: "#374151", fontWeight: 600 }}>
                    Papel
                  </div>
                  <div style={{ padding: "0.75rem", color: "#111827", textTransform: "capitalize" }}>
                    {userRole}
                  </div>
                </div>
              </div>

              {/* Ações */}
              <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem", justifyContent: "flex-end" }}>
                <button
                  onClick={() => setProfileOpen(false)}
                  style={{
                    padding: "0.6rem 0.9rem",
                    borderRadius: 8,
                    border: "1px solid #D1D5DB",
                    background: "#fff",
                    color: "#111827",
                    cursor: "pointer",
                  }}
                >
                  Fechar
                </button>
                <button
                  onClick={handleLogout}
                  style={{
                    padding: "0.6rem 0.9rem",
                    borderRadius: 8,
                    border: "none",
                    background: "#0d9488",
                    color: "#fff",
                    cursor: "pointer",
                    fontWeight: 600,
                  }}
                >
                  Sair da conta
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
