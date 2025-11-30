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
          width: collapsed ? "76px" : "220px",
          backgroundColor: "#0d9488",
          color: "#e6f7f5",
          transition: "width 220ms ease",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "1.25rem 0.75rem",
          boxShadow: "inset -1px 0 0 rgba(255,255,255,0.03)",
          position: "sticky",
          top: 0,
          height: "100vh",
          zIndex: 30,
          overflow: "hidden",
        }}
      >
        {/* topo / branding */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            marginBottom: "1.75rem",
            paddingLeft: collapsed ? 6 : 12,
          }}
        >
          <FaCalendarCheck style={{ color: "#fff", fontSize: "1.45rem" }} />
          {!collapsed && (
            <div style={{ color: "#fff", fontWeight: 700, fontSize: "1rem", lineHeight: 1.1 }}>
              Secretaria
              <div style={{ fontSize: "0.78rem", fontWeight: 400, color: "#dffaf7" }}>MedConnect</div>
            </div>
          )}
        </div>

        {/* links (área rolável) */}
        <nav style={{ flex: 1, overflowY: "auto", paddingRight: 6 }}>
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
            {[
              { to: "/secretary", icon: FaHome, label: "Dashboard" },
              { to: "/secretary/consultas", icon: FaCalendarCheck, label: "Consultas" },
              { to: "/secretary/medicos", icon: FaUserMd, label: "Médicos" },
              { to: "/secretary/pacientes", icon: FaUsers, label: "Pacientes" },
              { to: "/secretary/relatorios", icon: FaFileAlt, label: "Relatórios" },
             
            ].map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.to === "/secretary"}
                  style={({ isActive }) => ({
                    display: "flex",
                    alignItems: "center",
                    gap: collapsed ? 0 : 12,
                    textDecoration: "none",
                    color: isActive ? "#0d9488" : "#fff",
                    backgroundColor: isActive ? "#fff" : "transparent",
                    borderRadius: 12,
                    padding: collapsed ? "10px 6px" : "10px 12px",
                    fontWeight: 600,
                    margin: 0,
                    transition: "background 160ms ease, color 160ms ease",
                    alignSelf: "stretch",
                  })}
                >
                  <item.icon style={{ minWidth: 20, fontSize: 16 }} />
                  {!collapsed && <span style={{ fontSize: "0.95rem" }}>{item.label}</span>}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

  {/* rodapé do sidebar: ações (sempre visível) */}
  <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8, flexShrink: 0 }}>
          <button
            onClick={handleLogout}
            style={{
              background: "#0d9488",
              border: "none",
              color: "#fff",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: collapsed ? 0 : 10,
              padding: collapsed ? "8px 6px" : "10px 12px",
              borderRadius: 10,
              textAlign: "left",
            }}
            title="Sair"
          >
            <FaSignOutAlt style={{ minWidth: 20 }} />
            {!collapsed && <span style={{ fontSize: "0.95rem", fontWeight: 600 }}>Sair</span>}
          </button>

          <button
            onClick={() => setCollapsed(!collapsed)}
            style={{
              marginTop: 4,
              background: "transparent",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 10,
              color: "#fff",
              padding: "8px 10px",
              cursor: "pointer",
              alignSelf: collapsed ? "center" : "stretch",
            }}
            aria-pressed={collapsed}
          >
            <FaBars /> {!collapsed && <span style={{ marginLeft: 8 }}>Recolher</span>}
          </button>
        </div>
      </aside>

      {/* MAIN AREA */}
      <main style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        {/* header/topbar */}
        <header
          style={{
            backgroundColor: "#fff",
            boxShadow: "0 1px 6px rgba(15,23,42,0.06)",
            padding: "0.9rem 1.25rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: 12,
            zIndex: 10,
          }}
        >
          {/* Perfil */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button
              onClick={() => navigate("/secretary/profile")}
              aria-label="Ver meu perfil"
              style={{
                all: "unset",
                cursor: "pointer",
                display: "grid",
                placeItems: "center",
                width: 44,
                height: 44,
                borderRadius: "999px",
                backgroundColor: "#e0f2f1",
                color: "#0d9488",
                fontWeight: 700,
                fontSize: "0.95rem",
                userSelect: "none",
                boxShadow: "0 2px 6px rgba(13,148,136,0.06)",
              }}
              title="Ver meu perfil"
            >
              {loadingMe ? "…" : displayInitials}
            </button>

            <div style={{ fontSize: "0.9rem", lineHeight: 1.1, textAlign: "right" }}>
              <div style={{ fontWeight: 700, color: "var(--color-text-primary)" }}>
                {loadingMe ? "Carregando..." : displayName}
              </div>
              <div style={{ color: "#6B7280", fontSize: "0.82rem" }}>
                {loadingMe ? "—" : displayEmail}
              </div>
              {!!errorMe && (
                <div style={{ color: "#dc2626", fontSize: "0.75rem" }}>{errorMe}</div>
              )}
            </div>
          </div>
        </header>

        {/* Conteúdo: centro com padding e cards leves */}
        <div style={{ padding: "1.25rem", position: "relative", zIndex: 0 }}>
          <div style={{ maxWidth: 1200, margin: "0 auto", minHeight: 520 }}>
            <div style={{ background: "transparent", padding: 12, borderRadius: 12 }}>
              <Outlet />
            </div>
          </div>
        </div>
      </main>

      {/* MODAL de Perfil (sem mudanças funcionais, apenas visual) */}
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
            background: "rgba(6,8,23,0.45)",
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
              boxShadow: "0 14px 40px rgba(2,6,23,0.12)",
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
              <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "#111827" }}>Meu perfil</h3>
              <button
                onClick={() => setProfileOpen(false)}
                aria-label="Fechar"
                style={{ background: "transparent", border: "none", cursor: "pointer", padding: 6, borderRadius: 8, color: "#374151" }}
              >
                <FaTimes />
              </button>
            </div>

            <div style={{ padding: "1rem 1.25rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
                <div style={{ width: 56, height: 56, borderRadius: 999, background: "#e0f2f1", color: "#0d9488", display: "grid", placeItems: "center", fontWeight: 700, fontSize: "1rem" }}>{displayInitials}</div>
                <div>
                  <div style={{ fontWeight: 700, color: "#111827", fontSize: "0.98rem" }}>{displayName}</div>
                  <div style={{ color: "#6B7280", fontSize: "0.9rem" }}>{displayEmail}</div>
                </div>
              </div>

              <div style={{ border: "1px solid #E5E7EB", borderRadius: 12, overflow: "hidden" }}>
                <div style={{ display: "grid", gridTemplateColumns: "180px 1fr" }}>
                  <div style={{ background: "#F9FAFB", padding: "0.75rem", color: "#374151", fontWeight: 600 }}>ID</div>
                  <div style={{ padding: "0.75rem", color: "#111827" }}>{me?.id || "—"}</div>

                  <div style={{ background: "#F9FAFB", padding: "0.75rem", color: "#374151", fontWeight: 600 }}>E-mail</div>
                  <div style={{ padding: "0.75rem", color: "#111827" }}>{displayEmail}</div>

                  <div style={{ background: "#F9FAFB", padding: "0.75rem", color: "#374151", fontWeight: 600 }}>Criado em</div>
                  <div style={{ padding: "0.75rem", color: "#111827" }}>{me?.created_at ? formatDate(me.created_at) : "—"}</div>

                  <div style={{ background: "#F9FAFB", padding: "0.75rem", color: "#374151", fontWeight: 600 }}>Papel</div>
                  <div style={{ padding: "0.75rem", color: "#111827", textTransform: "capitalize" }}>{userRole}</div>
                </div>
              </div>

              <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem", justifyContent: "flex-end" }}>
                <button onClick={() => setProfileOpen(false)} style={{ padding: "0.6rem 0.9rem", borderRadius: 8, border: "1px solid #D1D5DB", background: "#fff", color: "#111827", cursor: "pointer" }}>Fechar</button>
                <button onClick={handleLogout} style={{ padding: "0.6rem 0.9rem", borderRadius: 8, border: "none", background: "#0d9488", color: "#fff", cursor: "pointer", fontWeight: 600 }}>Sair da conta</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
