import React, { useEffect, useState } from "react";

const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || "https://yuanqfswhberkoevtmfr.supabase.co";
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

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

export default function SecretaryProfilePage() {
  const [me, setMe] = useState(null);
  const [loadingMe, setLoadingMe] = useState(true);
  const [errorMe, setErrorMe] = useState("");

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
      setErrorMe("Usuário não autenticado.");
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
            apikey: SUPABASE_ANON,
          },
        });

        if (!res.ok) {
          const txt = await res.text();
          throw new Error(`Auth /user falhou (${res.status}): ${txt}`);
        }

        const data = await res.json(); // { id, email, created_at }
        setMe(data);
      } catch (err) {
        console.error("[SecretaryProfilePage] erro ao carregar usuário:", err);
        setErrorMe(err?.message || "Falha ao carregar usuário");
      } finally {
        setLoadingMe(false);
      }
    }

    loadMe();
  }, []);

  const displayEmail = me?.email || "—";
  const displayName = me?.email ? displayNameFromEmail(me.email) : "Secretaria";
  const displayInitials = me?.email ? initialsFromEmail(me.email) : "S";

  if (loadingMe) {
    return (
      <main style={{ padding: "1.5rem" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.75rem" }}>
          Meu perfil
        </h1>
        <p>Carregando dados da conta...</p>
      </main>
    );
  }

  if (errorMe && !me) {
    return (
      <main style={{ padding: "1.5rem" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.75rem" }}>
          Meu perfil
        </h1>
        <p style={{ color: "#dc2626", marginBottom: "0.5rem" }}>
          Ocorreu um erro ao carregar seus dados.
        </p>
        <pre
          style={{
            background: "#fef2f2",
            borderRadius: 8,
            padding: "0.75rem 1rem",
            fontSize: "0.8rem",
            whiteSpace: "pre-wrap",
          }}
        >
          {errorMe}
        </pre>
      </main>
    );
  }

  return (
    <main style={{ padding: "1.5rem" }}>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "1.25rem" }}>
        Meu perfil
      </h1>

      <section
        style={{
          maxWidth: 640,
          background: "#ffffff",
          borderRadius: "0.75rem",
          padding: "1.5rem",
          boxShadow: "0 10px 30px rgba(15, 23, 42, 0.08)",
          border: "1px solid rgba(148, 163, 184, 0.4)",
        }}
      >
        {/* Header do perfil */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.9rem", marginBottom: "1.25rem" }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: "999px",
              backgroundColor: "#e0f2f1",
              color: "#0d9488",
              display: "grid",
              placeItems: "center",
              fontWeight: 700,
              fontSize: "1.1rem",
            }}
          >
            {displayInitials}
          </div>
          <div>
            <div style={{ fontWeight: 700, color: "#111827", fontSize: "1rem" }}>
              {displayName}
            </div>
            <div style={{ color: "#6B7280", fontSize: "0.9rem" }}>{displayEmail}</div>
          </div>
        </div>

        {/* Dados em grid */}
        <div
          style={{
            borderRadius: 12,
            overflow: "hidden",
            border: "1px solid #E5E7EB",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "180px 1fr",
            }}
          >
            <div
              style={{
                background: "#F9FAFB",
                padding: "0.75rem",
                color: "#374151",
                fontWeight: 600,
              }}
            >
              ID
            </div>
            <div style={{ padding: "0.75rem", color: "#111827" }}>{me?.id || "—"}</div>

            <div
              style={{
                background: "#F9FAFB",
                padding: "0.75rem",
                color: "#374151",
                fontWeight: 600,
              }}
            >
              E-mail
            </div>
            <div style={{ padding: "0.75rem", color: "#111827" }}>{displayEmail}</div>

            <div
              style={{
                background: "#F9FAFB",
                padding: "0.75rem",
                color: "#374151",
                fontWeight: 600,
              }}
            >
              Criado em
            </div>
            <div style={{ padding: "0.75rem", color: "#111827" }}>
              {me?.created_at ? formatDate(me.created_at) : "—"}
            </div>

            <div
              style={{
                background: "#F9FAFB",
                padding: "0.75rem",
                color: "#374151",
                fontWeight: 600,
              }}
            >
              Papel
            </div>
            <div style={{ padding: "0.75rem", color: "#111827" }}>Secretaria</div>
          </div>
        </div>
      </section>
    </main>
  );
}