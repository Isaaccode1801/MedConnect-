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
    <div>
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
          <h1 
            style={{ 
              margin: 0, 
              fontSize: "28px", 
              fontWeight: "700", 
              color: "#1e293b",
              letterSpacing: "-0.5px"
            }}
          >
            Gerenciamento de Pacientes
          </h1>

          <button className="btn" onClick={abrirModalParaAdicionar} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: '18px', lineHeight: 0 }}>+</span> Adicionar Paciente
          </button>
        </header>

        {/* CARDS */}
        <div
          className="top-cards"
          style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 24 }}
        >
          <div className="card">
            <small>Total cadastrados</small>
            <div className="value">{total}</div>
          </div>
          <div className="card">
            <small>Presentes agora</small>
            <div className="value">{present}</div>
          </div>
          <div className="card">
            <small>Ausentes</small>
            <div className="value">{absent}</div>
          </div>
        </div>

        {/* TABELA CONTAINER */}
        <div
          className="panel"
          style={{
            background: "#fff",
            borderRadius: 12,
            boxShadow: "0 4px 12px rgba(0,0,0,0.04)", // Sombra mais suave
            padding: 20,
            border: "1px solid #f1f5f9"
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
            <h2 style={{ marginTop: 0, fontSize: '18px', fontWeight: 600, color: '#334155' }}>Lista Completa</h2>
            <input
              placeholder="🔍 Pesquisar por nome ou CPF..."
              value={pesquisa}
              onChange={(e) => setPesquisa(e.target.value)}
              style={{
                width: "300px",
                padding: "8px 12px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                fontSize: "14px",
                outline: "none",
                transition: "border 0.2s"
              }}
            />
          </div>

          <div
            style={{
              width: "100%",
              overflowX: "auto",
              borderRadius: "8px",
              border: "1px solid #e2e8f0",
            }}
          >
            <table
              style={{
                width: "100%",
                minWidth: "800px",
                borderCollapse: "collapse",
                fontSize: "0.9rem",
              }}
            >
              <thead>
                <tr
                  style={{
                    background: "#f8fafc",
                    color: "#64748b",
                    textTransform: "uppercase",
                    fontSize: "0.75rem",
                    letterSpacing: "0.05em",
                    borderBottom: "1px solid #e2e8f0"
                  }}
                >
                  <th style={thCellStyle}>Nome</th>
                  <th style={thCellStyle}>CPF</th>
                  <th style={thCellStyle}>Telefone</th>
                  <th style={thCellStyle}>Status</th>
                  <th style={{ ...thCellStyle, textAlign: "right", paddingRight: 20 }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {pacientesFiltrados.map((p) => (
                  <tr key={p.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={tdCellStyle}>
                      <span style={{ fontWeight: 500, color: '#0f172a' }}>{p.nome}</span>
                    </td>
                    <td style={tdCellStyle}>{p.cpf}</td>
                    <td style={tdCellStyle}>{p.telefone}</td>
                    <td style={tdCellStyle}>
                      <span 
                        className="badge" 
                        style={p.presente ? badgePresent : badgeAbsent}
                      >
                        {p.presente ? "Presente" : "Ausente"}
                      </span>
                    </td>
                    <td style={{ ...tdCellStyle, textAlign: "right", paddingRight: 10 }}>
                      <button
                        className="ghost-icon"
                        title="Editar"
                        onClick={() => abrirModalParaEditar(p)}
                        style={iconBtn}
                      >
                        ✏️
                      </button>
                      <button
                        className="ghost-icon"
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
                      style={{
                        textAlign: "center",
                        padding: "32px",
                        color: "#94a3b8",
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
          <div className="modal" style={modalContent}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: '20px' }}>
                {editingId ? "Editar Paciente" : "Novo Paciente"}
              </h3>
              <button onClick={fecharModal} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '20px', color: '#64748b' }}>×</button>
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
              <button onClick={fecharModal} style={ghostBtn}>Cancelar</button>
              <button onClick={handleSalvar} style={btnStyle}>Salvar Dados</button>
            </div>
          </div>
        </div>
      )}

      {/* Styles globais */}
      <style>{`
        :root{
          --bg:#ffffff;
          --card:#f9fafb;
          --primary:#06b6d4;
          --primary-hover:#0891b2;
          --muted:#64748b;
          --accent:#16a34a;
          --danger:#ef4444;
        }
        body{ font-family: 'Inter', system-ui, sans-serif; background-color: #f8fafc; }
        
        .card{
          background: #fff;
          padding: 16px 20px;
          border-radius: 10px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.04);
          min-width: 140px;
          flex: 1;
          border: 1px solid #f1f5f9;
        }
        .card small{ display:block; color:var(--muted); margin-bottom:6px; font-size: 0.85rem; font-weight: 500; }
        .value{ font-weight:700; font-size:24px; color: #0f172a; }

        .btn{
          background: var(--primary);
          color: #fff;
          border: none;
          padding: 10px 16px;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 600;
          font-size: 14px;
          transition: background 0.2s;
        }
        .btn:hover { background: var(--primary-hover); }

        .ghost-icon:hover { background: #f1f5f9; border-radius: 4px; }
      `}</style>
      <AccessibilityMenu />
    </div>
  );
}

// ------- Componentes & Estilos -------

function Field({ label, value, onChange, type = "text" }) {
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <label style={{ marginBottom: 6, fontSize: 13, color: "#475569", fontWeight: 600 }}>{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          padding: "10px",
          borderRadius: "6px",
          border: "1px solid #cbd5e1",
          fontSize: "14px",
          outline: "none",
          transition: "border-color 0.2s"
        }}
        onFocus={(e) => e.target.style.borderColor = "#06b6d4"}
        onBlur={(e) => e.target.style.borderColor = "#cbd5e1"}
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
  color: "#334155",
};

const badgePresent = {
  background: "#dcfce7",
  color: "#166534",
  padding: "4px 8px",
  borderRadius: "6px",
  fontSize: "12px",
  fontWeight: 600,
};

const badgeAbsent = {
  background: "#fee2e2",
  color: "#991b1b",
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

const ghostBtn = {
  background: "transparent",
  border: "1px solid #cbd5e1",
  color: "#475569",
  padding: "10px 16px",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: 600,
  fontSize: "14px",
};

const btnStyle = {
  background: "#06b6d4",
  color: "#fff",
  border: "none",
  padding: "10px 20px",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: 600,
  fontSize: "14px",
};

const modalOverlay = {
  position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.5)",
  backdropFilter: "blur(2px)", alignItems: "center", justifyContent: "center", display: "flex", zIndex: 9999
};

const modalContent = {
  background: "#fff", padding: 24, borderRadius: 16, width: "100%", maxWidth: 420,
  boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)"
};