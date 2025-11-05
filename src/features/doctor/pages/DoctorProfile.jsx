// src/features/medico/pages/DoctorProfile.jsx (CORRIGIDO)
import React, { useState, useEffect } from "react";
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
  Loader2
} from "lucide-react";

// NOTA DE CSS: Adicione isto ao teu ficheiro CSS global (ex: Dashboard.css)
/*
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.avatar-container:hover .avatar-overlay {
  opacity: 1 !important;
}

.loading-icon-animation {
  animation: spin 1s linear infinite;
}
*/


// Componente de Ícone
function UserIcon() {
  return (
    <UserCircle2 
      style={{ width: '100px', height: '100px', color: '#9ca3af' }}
      strokeWidth={1}
    />
  );
}

export default function DoctorProfile() {
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  // --- Carregamento Inicial de Dados ---
  useEffect(() => {
    async function fetchProfile() {
      setLoading(true);
      setError("");
      
      try {
        const { data, error } = await supabase.functions.invoke('user-info');
        if (error) throw error;
        
        if (data) {
          setProfileData(data);
          if (data.profile?.avatar_url) {
            await downloadAvatar(data.profile.avatar_url);
          }
        } else {
          throw new Error("Não foi possível carregar os dados do perfil.");
        }
      } catch (e) {
        console.error("Erro ao buscar perfil:", e.message);
        setError(e.message || "Erro ao carregar dados.");
      } finally {
        setLoading(false);
      }
    }
    fetchProfile();
  }, []);

  // --- Download Avatar ---
  async function downloadAvatar(path) {
    try {
      const { data, error } = await supabase.storage
        .from('avatars')
        .getPublicUrl(path);
        
      if (error) throw error;
      setAvatarUrl(data.publicUrl + `?t=${new Date().getTime()}`);
    } catch (error) {
      console.error("Erro ao obter URL pública do avatar:", error.message);
    }
  }

  // --- Upload Avatar ---
async function handleUploadAvatar(event) {
    if (!event.target.files || event.target.files.length === 0) {
      return; // Nenhum ficheiro selecionado
    }
    if (!profileData?.user?.id) {
      setError("ID do usuário não encontrado. Não é possível fazer upload.");
      return;
    }

    const file = event.target.files[0];
    const userId = profileData.user.id;
    const fileExt = file.name.split('.').pop();
    const filePath = `${userId}/avatar.${fileExt}`;

    try {
      setIsUploading(true);
      setError(""); // Limpa erros antigos

      // --- PASSO 1: Upload (API de Upload de avatar) ---
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });
        
      if (uploadError) throw uploadError;

      // --- PASSO 2: Atualizar perfil na base de dados (IGNORADO) ---
      
      /*
      // Esta secção está desativada porque a coluna 'avatar_url' não foi encontrada.
      // Para a funcionalidade ser permanente, a coluna precisa existir na tabela 'doctors'.
      const { error: updateError } = await supabase
        .from('doctors') 
        .update({ avatar_url: filePath }) // <-- O ERRO ACONTECE AQUI
        .eq('user_id', userId);
        
      if (updateError) throw updateError;
      */
      
      // --- PASSO 3: Atualizar a imagem exibida (Temporariamente) ---
      // (Vamos usar a função de download para exibir a foto que acabámos de enviar)
      await downloadAvatar(filePath);
      
      // Aviso de que não foi salvo permanentemente
      setError("Upload bem-sucedido, mas a foto não será guardada permanentemente. A coluna 'avatar_url' precisa de ser criada na base de dados.");


    } catch (error) {
      console.error("Erro no upload:", error.message);
      // Se o erro for do PASSO 1 (Upload), mostra-o
      if (error.message.includes('Storage')) {
         setError("Falha ao enviar avatar: " + error.message);
      }
    } finally {
      setIsUploading(false);
    }
  }


  // --- Estados de UI ---
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
  if (!profileData || !profileData.profile || !profileData.user) {
    return <div style={styles.pageContainer}>Perfil não encontrado.</div>;
  }

  const { user, profile } = profileData;

  // --- Renderização Principal ---
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

        {/* --- COLUNA ESQUERDA (Avatar e Nome) --- */}
        <div style={styles.leftColumn}>
          <div style={styles.card}>

            {/* ✅ Input de Upload (com classes CSS) */}
            <label 
              htmlFor="avatarUpload" 
              style={styles.avatarContainer} 
              className="avatar-container" // Adiciona a classe para o :hover
              title="Clique para trocar a foto"
            >
              
              {avatarUrl ? (
                <img key={avatarUrl} src={avatarUrl} alt="Avatar" style={styles.avatarImage} />
              ) : (
                <UserIcon />
              )}
              
              {/* Overlay (usa estilo condicional) */}
              <div 
                style={isUploading ? styles.avatarOverlayActive : styles.avatarOverlay}
                className="avatar-overlay" // Adiciona a classe para o :hover
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
              style={{ display: 'none' }}
              onChange={handleUploadAvatar}
              disabled={isUploading}
            />

            <h2 style={styles.profileName}>
              {profile.full_name}
            </h2>
            <p style={styles.profileSpecialty}>
              {profile.specialty || "Médico(a)"}
            </p>
          </div>
        </div>

        {/* --- COLUNA DIREITA (Detalhes) --- */}
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
                <span style={styles.infoValue}>{profile.phone_mobile || 'N/A'}</span>
              </div>
              <div style={styles.infoItem}>
                <div style={styles.infoLabelContainer}>
                  <Stethoscope size={16} style={styles.infoIcon} />
                  <span style={styles.infoLabel}>CRM</span>
                </div>
                <span style={styles.infoValue}>
                  {profile.crm ? `${profile.crm} - ${profile.crm_uf}` : 'N/A'}
                </span>
              </div>
              <div style={styles.infoItem}>
                <div style={styles.infoLabelContainer}>
                  <BadgeInfo size={16} style={styles.infoIcon} />
                  <span style={styles.infoLabel}>CPF</span>
                </div>
                <span style={styles.infoValue}>{profile.cpf ? profile.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') : 'N/A'}</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

// =================================================================
// ESTILOS CORRIGIDOS E REORGANIZADOS
// =================================================================

const styles = {
  pageContainer: {
    padding: '24px',
    backgroundColor: '#f9fafb',
    minHeight: '100vh',
    fontFamily: 'Arial, sans-serif',
  },
  loadingText: {
    fontSize: '18px',
    color: '#6b7280',
  },
  pageHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
  },
  pageTitle: {
    margin: 0,
    fontSize: '32px',
    fontWeight: 700,
    color: '#111827',
  },
  backButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    textDecoration: 'none',
    color: '#2563eb',
    fontWeight: 500,
    fontSize: '15px',
  },
  errorText: {
    padding: '12px 16px',
    backgroundColor: '#fee2e2',
    color: '#991b1b',
    borderRadius: '8px',
    marginBottom: '16px',
    border: '1px solid #fecaca',
  },
  layoutContainer: {
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: '24px',
  },
  leftColumn: {
    flex: '1',
    minWidth: '280px',
    maxWidth: '320px',
  },
  rightColumn: {
    flex: '2',
    minWidth: '300px',
  },
  card: {
    backgroundColor: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
  },
  avatarContainer: {
    position: 'relative',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    width: '120px',
    height: '120px',
    borderRadius: '50%',
    backgroundColor: '#f3f4f6',
    margin: '0 auto 16px auto',
    overflow: 'hidden',
    cursor: 'pointer',
    border: '2px dashed #d1d5db',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  // Estilo base do overlay (escondido)
  avatarOverlay: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    color: '#ffffff',
    opacity: 0,
    transition: 'opacity 0.2s ease-in-out',
  },
  // Estilo do overlay quando o upload está ATIVO
  avatarOverlayActive: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    color: '#ffffff',
    opacity: 1,
    transition: 'opacity 0.2s ease-in-out',
  },
  profileName: {
    margin: '10px 0 5px 0', 
    textAlign: 'center',
    fontSize: '22px',
    fontWeight: 600,
    color: '#111827',
  },
  profileSpecialty: {
    margin: 0, 
    color: '#4b5563', 
    textAlign: 'center',
    fontSize: '16px',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid #e5e7eb',
    paddingBottom: '16px',
    marginBottom: '24px',
  },
  editButton: {
    padding: '8px 16px',
    backgroundColor: '#2563eb',
    color: '#ffffff',
    textDecoration: 'none',
    borderRadius: '8px',
    fontWeight: 600,
    fontSize: '14px',
  },
  infoList: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '24px',
  },
  infoItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  infoLabelContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  infoIcon: {
    color: '#6b7280',
    flexShrink: 0,
  },
  infoLabel: {
    fontSize: '14px',
    color: '#6b7280',
    fontWeight: 600,
  },
  infoValue: {
    fontSize: '16px',
    color: '#111827',
    fontWeight: 500,
  },
};