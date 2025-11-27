import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useLocation, Outlet } from "react-router-dom";
import { supabase } from "@/lib/supabase"; // Verifique se este caminho está correto
import { Search, Stethoscope, User, Menu, X } from "lucide-react";
import "./Dashboard.css";

// Tipos leves para ajudar o TS (ajuste conforme sua edge function retornar)
type UserInfoResponse = {
  user: { id: string; email: string };
  profile?: { avatar_url?: string | null; full_name?: string | null };
};

export default function DoctorLayout() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // --- Avatar state ---
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null); // ObjectURL do blob
  const [avatarError, setAvatarError] = useState<string>("");
  const objectUrlRef = useRef<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const SUPABASE_URL =
    import.meta.env.VITE_SUPABASE_URL || "https://yuanqfswhberkoevtmfr.supabase.co";
  const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

  // --- helpers ---
  const profileButtonStyle: React.CSSProperties = useMemo(
    () => ({
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      width: "40px",
      height: "40px",
      borderRadius: "50%",
      backgroundColor: "#e2e8f0",
      color: "#1e293b",
      border: "none",
      cursor: "pointer",
      marginLeft: "16px",
      overflow: "hidden",
      // se tiver avatar, vamos aplicar backgroundImage inline
      backgroundSize: "cover",
      backgroundPosition: "center",
      backgroundRepeat: "no-repeat",
    }),
    []
  );

  const profileIconStyle: React.CSSProperties = useMemo(
    () => ({ width: "20px", height: "20px" }),
    []
  );

  // Links de Navegação
  const navLinks = [
    { label: "Início", path: "/doctor/dashboard", key: "/doctor/dashboard" },
    { label: "Laudos", path: "/doctor/laudos", key: "/doctor/laudos" },
    { label: "Pacientes", path: "/doctor/pacientes", key: "/doctor/pacientes" },
    { label: "Consultas", path: "/doctor/consultas", key: "/doctor/consultas" },
    {
      label: "Voltar para a tela inicial",
      path: "/",
      key: "voltar",
      title: "Voltar para a tela inicial",
    },
  ];

  const getLinkClass = (link: { path: string; key: string }) => {
    if (link.key === "/doctor/dashboard") {
      return pathname === link.path ? "nav-link active" : "nav-link";
    }
    if (link.key === "voltar") return "nav-link";
    return pathname.startsWith(link.key) ? "nav-link active" : "nav-link";
  };

  // ---------------- Avatar: lógica de carregamento ----------------
  async function getAccessToken(): Promise<string | null> {
    const { data } = await supabase.auth.getSession();
    return (
      data?.session?.access_token ||
      (() => {
        try {
          return localStorage.getItem("user_token");
        } catch {
          return null;
        }
      })()
    );
  }

  function setAvatarFromBlob(blob: Blob) {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    const url = URL.createObjectURL(blob);
    objectUrlRef.current = url;
    setAvatarUrl(url);
  }

  async function downloadAvatarREST(path: string): Promise<boolean> {
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Sessão expirada. Faça login novamente.");

      const resp = await fetch(
        `${SUPABASE_URL}/storage/v1/object/avatars/${encodeURIComponent(path)}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            apikey: SUPABASE_ANON || "",
          },
        }
      );

      if (!resp.ok) throw new Error(`Download falhou (${resp.status})`);
      const blob = await resp.blob();
      setAvatarFromBlob(blob);
      return true;
    } catch (e: any) {
      console.warn("downloadAvatarREST erro:", e?.message || e);
      return false;
    }
  }

  async function tryGuessAvatarPath(uid: string): Promise<string | null> {
    const guesses = [`${uid}/avatar.jpg`, `${uid}/avatar.jpeg`, `${uid}/avatar.png`];
    for (const g of guesses) {
      const ok = await downloadAvatarREST(g);
      if (ok) return g;
    }
    return null;
  }

  // Carrega user + decide caminho do avatar e baixa via REST
  useEffect(() => {
    let mounted = true;

    (async () => {
      setAvatarError("");
      try {
        // sua edge function que retorna { user, profile, ... }
        const { data, error } = await supabase.functions.invoke<UserInfoResponse>("user-info");
        if (error) throw error;
        if (!data?.user?.id) throw new Error("Não foi possível identificar o usuário.");

        if (!mounted) return;
        setUserId(data.user.id);

        // 1) preferir BD
        let path = data.profile?.avatar_url || null;

        // 2) depois localStorage
        if (!path) {
          try {
            path = localStorage.getItem("avatar_path");
          } catch {
            /* no-op */
          }
        }

        // 3) se ainda não houver, tentar adivinhar
        if (!path) {
          path = await tryGuessAvatarPath(data.user.id);
        } else {
          // valida o path salvo; se falhar, tenta adivinhar
          const ok = await downloadAvatarREST(path);
          if (!ok) {
            path = await tryGuessAvatarPath(data.user.id);
          }
        }

        // se encontramos, salva p/ próximos loads
        if (path) {
          try {
            localStorage.setItem("avatar_path", path);
          } catch {
            /* no-op */
          }
        }
      } catch (e: any) {
        if (!mounted) return;
        setAvatarError(e?.message || "Falha ao carregar avatar.");
      }
    })();

    return () => {
      mounted = false;
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleLogout() {
    const token = await getAccessToken();

    try {
      const myHeaders = new Headers();
      if (token) {
        myHeaders.append("Authorization", `Bearer ${token}`);
      }
      myHeaders.append("apikey", SUPABASE_ANON || "");

      const requestOptions = {
        method: "POST",
        headers: myHeaders,
        redirect: "follow",
      };

      await fetch(`${SUPABASE_URL}/auth/v1/logout`, requestOptions);
    } catch (_) {}

    try {
      localStorage.removeItem("user_token");
      localStorage.removeItem("user_role");
      localStorage.removeItem("avatar_path");
    } catch {}

    navigate("/", { replace: true });
  }

  // ---------------- Render ----------------

  const renderNavContent = () => (
    <>
      <nav className="doctor-header__nav">
        {navLinks.map((link) => (
          <button
            key={link.key}
            onClick={() => {
              if (link.key === "voltar") {
                setIsMobileMenuOpen(false);
                handleLogout();
              } else {
                navigate(link.path);
                setIsMobileMenuOpen(false);
              }
            }}
            className={getLinkClass(link)}
            title={link.title || link.label}
          >
            {link.label}
          </button>
        ))}
      </nav>

      {/* Perfil */}
      <div className="doctor-header__profile">
        <button
          onClick={() => {
            navigate("/doctor/perfil");
            setIsMobileMenuOpen(false);
          }}
          title="Ver o meu perfil"
          className="profile-button-wrapper"
          aria-label="Ver o meu perfil"
          // se avatarUrl existir, pintamos como backgroundImage
          style={
            avatarUrl
              ? { ...profileButtonStyle, backgroundImage: `url(${avatarUrl})` }
              : profileButtonStyle
          }
        >
          {!avatarUrl && <User style={profileIconStyle} />}
        </button>
      </div>
    </>
  );

  return (
    <div className={`doctor-dashboard ${isMobileMenuOpen ? "mobile-menu-is-open" : ""}`}>
      <header className="doctor-header">
        <div className="doctor-header__inner">
          {/* Marca */}
          <div className="doctor-header__brand">
            <div className="brand-icon">
              <div className="brand-icon__inner">
                <Stethoscope className="brand-icon__svg" />
              </div>
            </div>
            <span className="brand-name">Medconnect</span>
          </div>

          {/* Busca (desktop) */}


          {/* Nav desktop */}
          <div className="doctor-header__nav-container-desktop">{renderNavContent()}</div>

          {/* Botão hamburger (mobile) */}
          <button
            className="mobile-menu-toggle"
            onClick={() => setIsMobileMenuOpen(true)}
            title="Abrir menu"
          >
            <Menu className="h-6 w-6" />
          </button>
        </div>
      </header>

      {/* Overlay mobile */}
      {isMobileMenuOpen && (
        <div className="mobile-sidebar-overlay" onClick={() => setIsMobileMenuOpen(false)} />
      )}

      {/* Sidebar mobile */}
      <aside className={`mobile-sidebar ${isMobileMenuOpen ? "is-open" : ""}`}>
        <div className="mobile-sidebar__header">
          <span className="brand-name">Medconnect</span>
          <button
            className="mobile-sidebar__close"
            onClick={() => setIsMobileMenuOpen(false)}
            title="Fechar menu"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
        <div className="mobile-sidebar__content">{renderNavContent()}</div>
      </aside>

      {/* Conteúdo das rotas filhas */}
      <Outlet />
    </div>
  );
}
