// src/features/secretary/pages/Pacientes.jsx
import React, { useState, useEffect } from "react";
import AccessibilityMenu from "../../../components/ui/AccessibilityMenu";

// ======== CONFIG API ========
const SUPABASE_BASE = "https://yuanqfswhberkoevtmfr.supabase.co";
const API_BASE = `${SUPABASE_BASE}/rest/v1`;
const API_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl1YW5xZnN3aGJlcmtvZXZ0bWZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ5NTQzNjksImV4cCI6MjA3MDUzMDM2OX0.g8Fm4XAvtX46zifBZnYVH4tVuQkqUH6Ia9CXQj4DztQ";

const LOCAL_KEY = "healthone_pacientes";

export default function PacientesPage() {
  const [pacientes, setPacientes] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  const [form, setForm] = useState({
    nome: "",
    cpf: "",
    email: "",
    telefone: "",
    data_nascimento: "",
  });

  const [pesquisa, setPesquisa] = useState("");

  // -------------------------------------------------
  // Helpers
  // -------------------------------------------------
  function getHeaders(extra = {}) {
    const token = sessionStorage.getItem("token");
    return {
      "Content-Type": "application/json",
      apikey: API_KEY,
      Authorization: token ? `Bearer ${token}` : "",
      ...extra,
    };
  }

  async function ensureLogin() {
    const existing = sessionStorage.getItem("token");
    if (existing) return existing;

    try {
      const res = await fetch(`${SUPABASE_BASE}/auth/v1/token?grant_type=password`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: API_KEY },
        body: JSON.stringify({
          email: "riseup@popcode.com.br",
          password: "riseup",
        }),
      });

      if (!res.ok) return null;
      const data = await res.json();
      sessionStorage.setItem("token", data.access_token);
      return data.access_token;
    } catch (err) {
      console.error("[Pacientes] erro no login:", err);
      return null;
    }
  }

  function normalizePaciente(p) {
    return {
      id: p.id || p.patient_id || p.uuid || "",
      nome: p.full_name || p.nome || p.name || "Sem Nome",
      cpf: p.cpf || p.documento || "",
      email: p.email || "",
      telefone: p.phone || p.telefone || p.phone_mobile || "",
      data_nascimento: p.birth_date || p.data_nascimento || "",
      presente: true,
    };
  }

  // -------------------------------------------------
  // CRUD
  // -------------------------------------------------
  async function listarPacientes({ forceRemote = false } = {}) {
    if (!forceRemote) {
      const raw = localStorage.getItem(LOCAL_KEY);
      if (raw) {
        try {
          setPacientes(JSON.parse(raw));
        } catch {}
      }
    }

    try {
      await ensureLogin();
      const res = await fetch(`${API_BASE}/patients?select=*`, {
        method: "GET",
        headers: getHeaders(),
      });

      if (!res.ok) throw new Error(`GET /patients falhou ${res.status}`);

      const data = await res.json();
      const normalizados = Array.isArray(data) ? data.map(normalizePaciente) : [];

      setPacientes(normalizados);
      localStorage.setItem(LOCAL_KEY, JSON.stringify(normalizados));
    } catch (err) {
      console.error("[Pacientes] erro ao listar:", err);
      if (!pacientes.length) {
        const raw = localStorage.getItem(LOCAL_KEY);
        if (raw) setPacientes(JSON.parse(raw));
      }
    }
  }

  async function criarPacienteAPI(payload) {
    const bodyDB = {
      full_name: payload.full_name,
      cpf: payload.cpf,
      email: payload.email,
      phone_mobile: payload.phone_mobile,
      birth_date: payload.birth_date || null,
      created_by: payload.created_by || null,
    };

    const resp = await fetch(`${API_BASE}/patients`, {
      method: "POST",
      headers: getHeaders({ Prefer: "return=representation" }),
      body: JSON.stringify(bodyDB),
    });

    if (!resp.ok) throw new Error("Erro ao criar paciente");
    const data = await resp.json();
    return normalizePaciente(data[0]);
  }

  async function atualizarPacienteAPI(id, payload) {
    await ensureLogin();
    const bodyDB = {
      full_name: payload.nome,
      cpf: payload.cpf,
      email: payload.email,
      phone_mobile: payload.telefone,
      birth_date: payload.data_nascimento || null,
      created_by: sessionStorage.getItem("user_id") || "123e4567-e89b-12d3-a456-426614174000",
    };

    const res = await fetch(`${API_BASE}/patients?id=eq.${id}`, {
      method: "PATCH",
      headers: getHeaders({ Prefer: "return=representation" }),
      body: JSON.stringify(bodyDB),
    });

    if (!res.ok) throw new Error(`PATCH falhou`);
    const data = await res.json();
    const updated = Array.isArray(data) ? data[0] : data;
    const normalized = normalizePaciente(updated);

    setPacientes((prev) => {
      const novo = prev.map((p) => (p.id === id ? normalized : p));
      localStorage.setItem(LOCAL_KEY, JSON.stringify(novo));
      return novo;
    });
  }

  async function removerPacienteAPI(id) {
    await ensureLogin();
    const res = await fetch(`${API_BASE}/patients?id=eq.${id}`, {
      method: "DELETE",
      headers: getHeaders(),
    });
    if (res.status !== 204 && !res.ok) throw new Error(`Falha ao excluir`);

    setPacientes((antigos) => {
      const novo = antigos.filter((p) => p.id !== id);
      localStorage.setItem(LOCAL_KEY, JSON.stringify(novo));
      return novo;
    });
  }

  // -------------------------------------------------
  // Handlers Modal
  // -------------------------------------------------
  function abrirModalParaAdicionar() {
    setEditingId(null);
    setForm({ nome: "", cpf: "", email: "", telefone: "", data_nascimento: "" });
    setModalOpen(true);
  }

  function abrirModalParaEditar(p) {
    setEditingId(p.id);
    setForm({
      nome: p.nome || "",
      cpf: p.cpf || "",
      email: p.email || "",
      telefone: p.telefone || "",
      data_nascimento: p.data_nascimento || "",
    });
    setModalOpen(true);
  }

  function fecharModal() {
    setModalOpen(false);
  }

  async function handleSalvar() {
    try {
      await ensureLogin();
      const payload = {
        full_name: form.nome,
        cpf: form.cpf,
        email: form.email,
        phone_mobile: form.telefone,
        birth_date: form.data_nascimento || null,
        created_by: sessionStorage.getItem("user_id") || null,
        // campos para update normalizados
        nome: form.nome,
        telefone: form.telefone,
        data_nascimento: form.data_nascimento
      };

      if (editingId) {
        await atualizarPacienteAPI(editingId, payload);
        alert("Paciente atualizado com sucesso!");
      } else {
        await criarPacienteAPI(payload);
        alert("Paciente criado com sucesso!");
        listarPacientes({ forceRemote: true }); // atualiza lista após criar
      }
      fecharModal();
    } catch (err) {
      console.error("[Pacientes] erro ao salvar:", err);
      alert("Erro ao salvar paciente.");
    }
  }

  async function handleRemover(id) {
    if (!window.confirm("Tem certeza que deseja remover este paciente?")) return;
    try {
      await removerPacienteAPI(id);
      alert("Paciente excluído com sucesso!");
    } catch (err) {
      console.error("[Pacientes] erro ao remover:", err);
      alert("Erro ao remover paciente.");
    }
  }

  function atualizarCampo(campo, valor) {
    setForm({ ...form, [campo]: valor });
  }

  // -------------------------------------------------
  // Filtros e Render
  // -------------------------------------------------
  const pacientesFiltrados = pacientes.filter((p) => {
    if (!pesquisa) return true;
    const hay = `${p.nome} ${p.cpf} ${p.email} ${p.telefone}`.toLowerCase();
    return hay.includes(pesquisa.toLowerCase());
  });

  const total = pacientes.length;
  const present = pacientes.filter((p) => p.presente).length;
  const absent = total - present;

  useEffect(() => {
    listarPacientes();
  }, []);

  return (
    <div className="secretary-page-wrap theme-page">
      <div className="app">
        {/* HEADER LIMPO E UNIFICADO */}
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 24,
            marginTop: 10,
          }}
        >
          <h1 className="theme-text-primary" style={{ margin: 0, fontSize: "28px", fontWeight: "700", letterSpacing: "-0.5px" }}>
            Gerenciamento de Pacientes
          </h1>

          <button className="btn btn-primary" onClick={abrirModalParaAdicionar} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: '18px', lineHeight: 0 }}>+</span> Adicionar Paciente
          </button>
        </header>

        {/* CARDS */}
        <div
          className="top-cards"
          style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 24 }}
        >
          <div className="card theme-card">
            <small className="theme-text-secondary">Total cadastrados</small>
            <div className="value theme-text-primary">{total}</div>
          </div>
          <div className="card theme-card">
            <small className="theme-text-secondary">Presentes agora</small>
            <div className="value theme-text-primary">{present}</div>
          </div>
          <div className="card theme-card">
            <small className="theme-text-secondary">Ausentes</small>
            <div className="value theme-text-primary">{absent}</div>
          </div>
        </div>

        {/* TABELA CONTAINER */}
        <div
          className="panel theme-card"
          style={{
            borderRadius: 12,
            padding: 20,
          }}
        >
          <div
            className="search"
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 16,
            }}
          >
            <h2 className="theme-text-primary" style={{ marginTop: 0, fontSize: '18px', fontWeight: 600 }}>Lista Completa</h2>
            <input
              placeholder="🔍 Pesquisar por nome ou CPF..."
              value={pesquisa}
              onChange={(e) => setPesquisa(e.target.value)}
              className="theme-input"
              style={{
                width: "300px",
                padding: "8px 12px",
                borderRadius: "8px",
                fontSize: "14px",
                outline: "none",
                transition: "border 0.2s"
              }}
            />
          </div>

          <div
            className="table-wrapper theme-card"
            style={{
              width: "100%",
              overflowX: "auto",
              borderRadius: "8px",
            }}
          >
            <table
              className="table-pacientes"
              style={{
                width: "100%",
                minWidth: "800px",
                borderCollapse: "collapse",
                fontSize: "0.9rem",
              }}
            >
              <thead>
                <tr style={{
                  background: "var(--color-bg-tertiary)",
                  textTransform: "uppercase",
                  fontSize: "0.75rem",
                  letterSpacing: "0.05em",
                  borderBottom: "1px solid var(--color-border)"
                }}>
                  <th style={thCellStyle} className="theme-text-secondary">Nome</th>
                  <th style={thCellStyle} className="theme-text-secondary">CPF</th>
                  <th style={thCellStyle} className="theme-text-secondary">Telefone</th>
                  <th style={thCellStyle} className="theme-text-secondary">Status</th>
                  <th style={{ ...thCellStyle, textAlign: "right", paddingRight: 20 }} className="theme-text-secondary">Ações</th>
                </tr>
              </thead>
              <tbody>
                {pacientesFiltrados.map((p) => (
                  <tr key={p.id} className="theme-table-row" style={{ borderBottom: "1px solid var(--color-border)" }}>
                    <td style={tdCellStyle}>
                      <span className="theme-text-primary" style={{ fontWeight: 500 }}>{p.nome}</span>
                    </td>
                    <td style={tdCellStyle} className="theme-text-secondary">{p.cpf}</td>
                    <td style={tdCellStyle} className="theme-text-secondary">{p.telefone}</td>
                    <td style={tdCellStyle}>
                      <span 
                        className="badge theme-badge" 
                        style={p.presente ? badgePresent : badgeAbsent}
                      >
                        {p.presente ? "Presente" : "Ausente"}
                      </span>
                    </td>
                    <td style={{ ...tdCellStyle, textAlign: "right", paddingRight: 10 }}>
                      <button
                        className="action-btn theme-action-btn"
                        title="Editar"
                        onClick={() => abrirModalParaEditar(p)}
                        style={iconBtn}
                      >
                        ✏️
                      </button>
                      <button
                        className="action-btn theme-action-btn theme-action-btn-danger"
                        title="Remover"
                        onClick={() => handleRemover(p.id)}
                        style={{...iconBtn, color: '#ef4444'}}
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                ))}
                {pacientesFiltrados.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="theme-text-muted"
                      style={{
                        textAlign: "center",
                        padding: "32px",
                      }}
                    >
                      Nenhum paciente encontrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* MODAL */}
      {modalOpen && (
        <div className="modal-backdrop" style={modalOverlay}>
          <div className="modal theme-card" style={modalContent}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              <h3 className="theme-text-primary" style={{ margin: 0, fontSize: '20px' }}>
                {editingId ? "Editar Paciente" : "Novo Paciente"}
              </h3>
              <button onClick={fecharModal} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '20px', color: 'var(--color-text-muted)' }}>×</button>
            </div>

            <div style={{ display: 'grid', gap: 12 }}>
              <Field label="Nome Completo" value={form.nome} onChange={(v) => atualizarCampo("nome", v)} />
              <Field label="CPF" value={form.cpf} onChange={(v) => atualizarCampo("cpf", v)} />
              <Field label="E-mail" type="email" value={form.email} onChange={(v) => atualizarCampo("email", v)} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Field label="Telefone" value={form.telefone} onChange={(v) => atualizarCampo("telefone", v)} />
                <Field label="Nascimento" type="date" value={form.data_nascimento} onChange={(v) => atualizarCampo("data_nascimento", v)} />
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 24 }}>
              <button className="btn btn-secondary" onClick={fecharModal}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleSalvar}>Salvar Dados</button>
            </div>
          </div>
        </div>
      )}

      {/* Styles atualizados para modo escuro */}
      <style>{`
        .secretary-page-wrap {
          flex: 1;
          min-height: 100vh;
          background: var(--color-bg-primary);
          padding-left: 2px;
          color: var(--color-text-primary);
          -webkit-font-smoothing: antialiased;
        }

        .theme-page { background: var(--color-bg-primary); }
        .theme-text-primary { color: var(--color-text-primary); }
        .theme-text-secondary { color: var(--color-text-secondary); }
        .theme-text-muted { color: var(--color-text-muted); }
        .theme-card { 
          background: var(--color-bg-card); 
          border: 1px solid var(--color-border);
          color: var(--color-text-primary);
          box-shadow: var(--shadow-sm);
        }
        .theme-input {
          background: var(--color-bg-card);
          color: var(--color-text-primary);
          border: 1px solid var(--color-border);
        }
        .theme-input::placeholder {
          color: var(--color-text-muted);
        }
        .theme-table-row:hover {
          background: var(--color-bg-tertiary);
        }
        .theme-badge {
          font-weight: 600;
          font-size: 0.82rem;
        }
        .theme-action-btn {
          color: var(--color-text-primary);
        }
        .theme-action-btn:hover {
          background: var(--color-bg-tertiary);
        }
        .theme-action-btn-danger:hover {
          background: rgba(239, 68, 68, 0.1);
        }

        /* Botões usando variáveis CSS */
        .btn {
          background: var(--color-primary);
          color: white;
          border: none;
          padding: 10px 16px;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 600;
          font-size: 14px;
          transition: all 0.2s ease;
        }
        .btn-primary {
          background: var(--color-primary);
          color: white;
        }
        .btn-secondary {
          background: var(--color-bg-tertiary);
          color: var(--color-text-primary);
          border: 1px solid var(--color-border);
        }
        .btn:hover {
          opacity: 0.9;
          transform: translateY(-1px);
        }

        .card {
          padding: 16px 20px;
          border-radius: 10px;
          min-width: 140px;
          flex: 1;
        }

        .card small { 
          display: block; 
          margin-bottom: 6px; 
          font-size: 0.85rem; 
          font-weight: 500; 
        }

        .value { 
          font-weight: 700; 
          font-size: 24px; 
        }

        .table-wrapper {
          border: 1px solid var(--color-border);
        }

        @media (max-width: 768px) {
          .secretary-page-wrap { padding-left: 88px; }
        }
      `}</style>
      <AccessibilityMenu />
    </div>
  );
}

// ------- Componentes & Estilos -------

function Field({ label, value, onChange, type = "text" }) {
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <label className="theme-text-secondary" style={{ marginBottom: 6, fontSize: 13, fontWeight: 600 }}>{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="theme-input"
        style={{
          padding: "10px",
          borderRadius: "6px",
          fontSize: "14px",
          outline: "none",
          transition: "border-color 0.2s"
        }}
        onFocus={(e) => e.target.style.borderColor = "var(--color-primary)"}
        onBlur={(e) => e.target.style.borderColor = "var(--color-border)"}
      />
    </div>
  );
}

const thCellStyle = {
  padding: "12px 16px",
  textAlign: "left",
  fontWeight: 600
};

const tdCellStyle = {
  padding: "14px 16px",
};

const badgePresent = {
  background: "#374151",
  color: "#f3f4f6",
  padding: "4px 8px",
  borderRadius: "6px",
  fontSize: "12px",
  fontWeight: 600,
};

const badgeAbsent = {
  background: "#6b7280",
  color: "#f9fafb",
  padding: "4px 8px",
  borderRadius: "6px",
  fontSize: "12px",
  fontWeight: 600,
};

const iconBtn = {
  background: "transparent",
  border: "none",
  padding: "6px",
  cursor: "pointer",
  fontSize: "16px",
  marginLeft: "4px"
};

const modalOverlay = {
  position: "fixed", 
  inset: 0, 
  background: "rgba(15, 23, 42, 0.5)",
  backdropFilter: "blur(2px)", 
  alignItems: "center", 
  justifyContent: "center", 
  display: "flex", 
  zIndex: 9999
};

const modalContent = {
  padding: 24, 
  borderRadius: 16, 
  width: "100%", 
  maxWidth: 420,
  boxShadow: "var(--shadow-lg)"
};