// src/features/medico/pages/DoctorProfile.jsx
import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import {
  UserCircle2,
  User,
  Mail,
  Smartphone,
  Stethoscope,
  BadgeInfo,
  ArrowLeft,
  Upload,
  Loader2,
} from "lucide-react";

/*
CSS sugerido (global):
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
.avatar-container:hover .avatar-overlay { opacity: 1 !important; }
.loading-icon-animation { animation: spin 1s linear infinite; }
*/

function UserIcon() {
  return (
    <UserCircle2 style={{ width: 100, height: 100, color: "#9ca3af" }} strokeWidth={1} />
  );
}

export default function DoctorProfile() {
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [avatarUrl, setAvatarUrl] = useState(null); // URL.createObjectURL
  const [isUploading, setIsUploading] = useState(false);

  const objectUrlRef = useRef(null); // para revogar URLs antigas

  const SUPABASE_URL =
    import.meta.env.VITE_SUPABASE_URL || "https://yuanqfswhberkoevtmfr.supabase.co";
  const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY;

  // --- util: pega token atual (SDK ou localStorage) ---
  async function getAccessToken() {
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

  // --- cria URL local a partir de blob e faz cleanup do anterior ---
  function setAvatarFromBlob(blob) {
    try {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
      }
      const url = URL.createObjectURL(blob);
      objectUrlRef.current = url;
      setAvatarUrl(url);
    } catch (e) {
      console.error("Erro ao criar URL do avatar:", e);
    }
  }

  // --- baixa binário via REST GET /storage/v1/object/avatars/{path} ---
  async function downloadAvatarREST(path) {
    if (!path) return;
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

      if (!resp.ok) {
        throw new Error(`Download falhou (${resp.status})`);
      }
      const blob = await resp.blob();
      setAvatarFromBlob(blob);
      return true;
    } catch (e) {
      console.warn("downloadAvatarREST erro:", e.message);
      return false;
    }
  }

  // --- tenta descobrir um caminho válido (jpg -> png) se não houver no BD/local ---
  async function tryGuessAvatarPath(userId) {
    const guesses = [`${userId}/avatar.jpg`, `${userId}/avatar.jpeg`, `${userId}/avatar.png`];
    for (const g of guesses) {
      const ok = await downloadAvatarREST(g);
      if (ok) return g;
    }
    return null;
  }

  // --- Carregamento Inicial de Dados + avatar ---
  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setError("");
      try {
        // Tua function que retorna { user, profile, ... }
        const { data, error } = await supabase.functions.invoke("user-info");
        if (error) throw error;
        if (!data?.user) throw new Error("Não foi possível carregar os dados do perfil.");

        if (!mounted) return;
        setProfileData(data);

        const userId = data.user.id;

        // 1) Preferir BD
        let path =
          data.profile?.avatar_url && typeof data.profile.avatar_url === "string"
            ? data.profile.avatar_url
            : null;

        // 2) Depois localStorage (salvo após upload)
        if (!path) {
          try {
            path = localStorage.getItem("avatar_path") || null;
          } catch {
            /* no-op */
          }
        }

        // 3) Se ainda não, tentar descobrir por convenção (jpg/png)
        if (!path) {
          path = await tryGuessAvatarPath(userId);
        } else {
          const ok = await downloadAvatarREST(path);
          if (!ok) {
            // se o path salvo não existir mais, tenta adivinhar:
            path = await tryGuessAvatarPath(userId);
          }
        }

        // Se encontramos um path válido, garanta que fica salvo
        if (path) {
          try {
            localStorage.setItem("avatar_path", path);
          } catch {
            /* no-op */
          }
        }
      } catch (e) {
        console.error("Erro ao carregar perfil:", e);
        if (mounted) setError(e.message || "Erro ao carregar dados.");
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };
  }, []);

  // --- Upload Avatar (via REST POST) e já atualiza preview usando o GET REST ---
  async function handleUploadAvatar(event) {
    if (!event.target.files || event.target.files.length === 0) return;
    if (!profileData?.user?.id) {
      setError("ID do usuário não encontrado. Não é possível fazer upload.");
      return;
    }

    const file = event.target.files[0];
    if (!/^image\/(png|jpeg)$/.test(file.type)) {
      setError("Envie uma imagem PNG ou JPG.");
      return;
    }
    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      setError("A imagem deve ter no máximo 5MB.");
      return;
    }

    const userId = profileData.user.id;
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    const filePath = `${userId}/avatar.${ext}`;

    try {
      setIsUploading(true);
      setError("");

      const token = await getAccessToken();
      if (!token) throw new Error("Sessão expirada. Faça login novamente.");

      const form = new FormData();
      form.append("file", file, file.name);

      const resp = await fetch(
        `${SUPABASE_URL}/storage/v1/object/avatars/${encodeURIComponent(filePath)}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            apikey: SUPABASE_ANON || "",
            "x-upsert": "true",
          },
          body: form,
        }
      );

      if (!resp.ok) {
        const txt = await resp.text();
        throw new Error(`Falha no upload (${resp.status}): ${txt || "erro desconhecido"}`);
      }

      // Baixa imediatamente via REST GET e mostra
      await downloadAvatarREST(filePath);

      // Persiste caminho para próximos loads (até você salvar no BD)
      try {
        localStorage.setItem("avatar_path", filePath);
      } catch {
        /* no-op */
      }

      // (opcional) atualizar sua tabela de perfil, quando a coluna existir:
      // await supabase.from("doctors").update({ avatar_url: filePath }).eq("user_id", userId);
    } catch (err) {
      console.error("Erro no upload:", err);
      setError(err.message || "Falha ao enviar avatar.");
    } finally {
      setIsUploading(false);
      event.target.value = ""; // permitir reupload do mesmo arquivo
    }
  }

  // --- UI ---
  if (loading && !profileData) {
    return (
      <div style={styles.pageContainer}>
        <span style={styles.loadingText}>A carregar perfil...</span>
      </div>
    );
  }
  if (error && !profileData) {
    return <div style={styles.pageContainer}>Erro: {error}</div>;
  }
  if (!profileData?.user || !profileData?.profile) {
    return <div style={styles.pageContainer}>Perfil não encontrado.</div>;
  }

  const { user, profile } = profileData;

  return (
    <div style={styles.pageContainer}>
      <div style={styles.pageHeader}>
        <h1 style={styles.pageTitle}>O Meu Perfil</h1>
        <Link to="/doctor/dashboard" style={styles.backButton}>
          <ArrowLeft size={16} />
          Voltar ao Dashboard
        </Link>
      </div>

      {error && <p style={styles.errorText}>{error}</p>}

      <div style={styles.layoutContainer}>
        {/* ESQUERDA: Avatar */}
        <div style={styles.leftColumn}>
          <div style={styles.card}>
            <label
              htmlFor="avatarUpload"
              style={styles.avatarContainer}
              className="avatar-container"
              title="Clique para trocar a foto"
            >
              {avatarUrl ? (
                <img key={avatarUrl} src={avatarUrl} alt="Avatar" style={styles.avatarImage} />
              ) : (
                <UserIcon />
              )}
              <div
                style={isUploading ? styles.avatarOverlayActive : styles.avatarOverlay}
                className="avatar-overlay"
              >
                {isUploading ? (
                  <Loader2 size={32} className="loading-icon-animation" />
                ) : (
                  <Upload size={32} />
                )}
              </div>
            </label>

            <input
              type="file"
              id="avatarUpload"
              accept="image/png, image/jpeg"
              style={{ display: "none" }}
              onChange={handleUploadAvatar}
              disabled={isUploading}
            />

            <h2 style={styles.profileName}>{profile.full_name}</h2>
            <p style={styles.profileSpecialty}>{profile.specialty || "Médico(a)"}</p>
          </div>
        </div>

        {/* DIREITA: Infos */}
        <div style={styles.rightColumn}>
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <h3 style={{ margin: 0 }}>Informações do Perfil</h3>
              <Link to="/doctor/perfil/editar" style={styles.editButton}>
                Editar
              </Link>
            </div>

            <div style={styles.infoList}>
              <div style={styles.infoItem}>
                <div style={styles.infoLabelContainer}>
                  <User size={16} style={styles.infoIcon} />
                  <span style={styles.infoLabel}>Nome Completo</span>
                </div>
                <span style={styles.infoValue}>{profile.full_name}</span>
              </div>
              <div style={styles.infoItem}>
                <div style={styles.infoLabelContainer}>
                  <Mail size={16} style={styles.infoIcon} />
                  <span style={styles.infoLabel}>Email</span>
                </div>
                <span style={styles.infoValue}>{user.email}</span>
              </div>
              <div style={styles.infoItem}>
                <div style={styles.infoLabelContainer}>
                  <Smartphone size={16} style={styles.infoIcon} />
                  <span style={styles.infoLabel}>Celular / WhatsApp</span>
                </div>
                <span style={styles.infoValue}>{profile.phone_mobile || "N/A"}</span>
              </div>
              <div style={styles.infoItem}>
                <div style={styles.infoLabelContainer}>
                  <Stethoscope size={16} style={styles.infoIcon} />
                  <span style={styles.infoLabel}>CRM</span>
                </div>
                <span style={styles.infoValue}>
                  {profile.crm ? `${profile.crm} - ${profile.crm_uf}` : "N/A"}
                </span>
              </div>
              <div style={styles.infoItem}>
                <div style={styles.infoLabelContainer}>
                  <BadgeInfo size={16} style={styles.infoIcon} />
                  <span style={styles.infoLabel}>CPF</span>
                </div>
                <span style={styles.infoValue}>
                  {profile.cpf
                    ? profile.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$4")
                    : "N/A"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// estilos
const styles = {
  pageContainer: {
    padding: "24px",
    backgroundColor: "#f9fafb",
    minHeight: "100vh",
    fontFamily: "Arial, sans-serif",
  },
  loadingText: { fontSize: "18px", color: "#6b7280" },
  pageHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "24px",
  },
  pageTitle: { margin: 0, fontSize: "32px", fontWeight: 700, color: "#111827" },
  backButton: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    textDecoration: "none",
    color: "#2563eb",
    fontWeight: 500,
    fontSize: "15px",
  },
  errorText: {
    padding: "12px 16px",
    backgroundColor: "#fee2e2",
    color: "#991b1b",
    borderRadius: "8px",
    marginBottom: "16px",
    border: "1px solid #fecaca",
  },
  layoutContainer: { display: "flex", flexDirection: "row", flexWrap: "wrap", gap: "24px" },
  leftColumn: { flex: "1", minWidth: "280px", maxWidth: "320px" },
  rightColumn: { flex: "2", minWidth: "300px" },
  card: {
    backgroundColor: "#ffffff",
    border: "1px solid #e5e7eb",
    borderRadius: "12px",
    padding: "24px",
    boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03)",
  },
  avatarContainer: {
    position: "relative",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    width: 120,
    height: 120,
    borderRadius: "50%",
    backgroundColor: "#f3f4f6",
    margin: "0 auto 16px auto",
    overflow: "hidden",
    cursor: "pointer",
    border: "2px dashed #d1d5db",
  },
  avatarImage: { width: "100%", height: "100%", objectFit: "cover" },
  avatarOverlay: {
    position: "absolute",
    inset: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
    color: "#ffffff",
    opacity: 0,
    transition: "opacity 0.2s ease-in-out",
  },
  avatarOverlayActive: {
    position: "absolute",
    inset: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.7)",
    color: "#ffffff",
    opacity: 1,
    transition: "opacity 0.2s ease-in-out",
  },
  profileName: {
    margin: "10px 0 5px 0",
    textAlign: "center",
    fontSize: 22,
    fontWeight: 600,
    color: "#111827",
  },
  profileSpecialty: { margin: 0, color: "#4b5563", textAlign: "center", fontSize: 16 },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottom: "1px solid #e5e7eb",
    paddingBottom: "16px",
    marginBottom: "24px",
  },
  editButton: {
    padding: "8px 16px",
    backgroundColor: "#2563eb",
    color: "#ffffff",
    textDecoration: "none",
    borderRadius: "8px",
    fontWeight: 600,
    fontSize: "14px",
  },
  infoList: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: "24px",
  },
  infoItem: { display: "flex", flexDirection: "column", gap: "8px" },
  infoLabelContainer: { display: "flex", alignItems: "center", gap: "8px" },
  infoIcon: { color: "#6b7280", flexShrink: 0 },
  infoLabel: { fontSize: 14, color: "#6b7280", fontWeight: 600 },
  infoValue: { fontSize: 16, color: "#111827", fontWeight: 500 },
};
