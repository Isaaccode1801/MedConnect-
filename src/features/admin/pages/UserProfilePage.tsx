// src/features/patients/pages/UserProfilePage.tsx
import React, { useEffect, useState } from "react";
import { fetchCurrentUser, type CurrentUserResponse } from "@/services/api/auth";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function UserProfilePage() {
  const [user, setUser] = useState<CurrentUserResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadUser() {
      try {
        setIsLoading(true);
        setError(null);
        const data = await fetchCurrentUser();
        if (isMounted) {
          setUser(data);
        }
      } catch (err: any) {
        console.error("[UserProfilePage] Erro ao carregar usuário:", err);
        if (isMounted) {
          setError(err?.message ?? "Erro ao buscar dados do usuário.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadUser();

    return () => {
      isMounted = false;
    };
  }, []);

  if (isLoading) {
    return (
      <main style={{ padding: "2rem" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 600 }}>Minhas informações</h1>
        <p>Carregando dados do usuário...</p>
      </main>
    );
  }

  if (error || !user) {
    return (
      <main style={{ padding: "2rem" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 600 }}>Minhas informações</h1>
        <p style={{ color: "#dc2626" }}>
          Ocorreu um erro ao carregar os dados do usuário.
        </p>
        {error && (
          <pre
            style={{
              marginTop: "0.75rem",
              padding: "0.75rem 1rem",
              background: "#fef2f2",
              borderRadius: "0.5rem",
              fontSize: "0.8rem",
              whiteSpace: "pre-wrap",
            }}
          >
            {error}
          </pre>
        )}
      </main>
    );
  }

  const createdAtFormatted = user.created_at
    ? format(new Date(user.created_at), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", {
        locale: ptBR,
      })
    : "-";

  return (
    <main style={{ padding: "2rem" }}>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 600, marginBottom: "1.5rem" }}>
        Minhas informações
      </h1>

      <section
        style={{
          maxWidth: "480px",
          background: "#ffffff",
          borderRadius: "0.75rem",
          padding: "1.5rem",
          boxShadow: "0 10px 30px rgba(15, 23, 42, 0.08)",
          border: "1px solid rgba(148, 163, 184, 0.4)",
        }}
      >
        <div style={{ marginBottom: "1rem" }}>
          <span
            style={{
              display: "inline-block",
              fontSize: "0.75rem",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: "#64748b",
              marginBottom: "0.25rem",
            }}
          >
            ID do Usuário
          </span>
          <div
            style={{
              fontFamily: "monospace",
              fontSize: "0.85rem",
              wordBreak: "break-all",
            }}
          >
            {user.id}
          </div>
        </div>

        <div style={{ marginBottom: "1rem" }}>
          <span
            style={{
              display: "inline-block",
              fontSize: "0.75rem",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: "#64748b",
              marginBottom: "0.25rem",
            }}
          >
            E-mail
          </span>
          <div style={{ fontSize: "0.95rem" }}>{user.email}</div>
        </div>

        <div>
          <span
            style={{
              display: "inline-block",
              fontSize: "0.75rem",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: "#64748b",
              marginBottom: "0.25rem",
            }}
          >
            Conta criada em
          </span>
          <div style={{ fontSize: "0.95rem" }}>{createdAtFormatted}</div>
        </div>
      </section>
    </main>
  );
}