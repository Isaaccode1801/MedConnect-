// src/features/secretary/pages/Pacientes.jsx
import React, { useState, useEffect } from "react";

// ======== CONFIG API (mesma base usada nas outras telas) ========
const SUPABASE_BASE = "https://yuanqfswhberkoevtmfr.supabase.co";
const API_BASE = `${SUPABASE_BASE}/rest/v1`;
const API_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl1YW5xZnN3aGJlcmtvZXZ0bWZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ5NTQzNjksImV4cCI6MjA3MDUzMDM2OX0.g8Fm4XAvtX46zifBZnYVH4tVuQkqUH6Ia9CXQj4DztQ";

// usamos localStorage como cache offline / fallback visual
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
  // helpers de auth/headers
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
    // evita pedir token toda hora
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

      if (!res.ok) {
        console.warn("[Pacientes] login falhou", res.status);
        return null;
      }

      const data = await res.json();
      sessionStorage.setItem("token", data.access_token);
      return data.access_token;
    } catch (err) {
      console.error("[Pacientes] erro no login:", err);
      return null;
    }
  }

  // -------------------------------------------------
  // normalizador
  // pega o objeto cru do banco e devolve o shape que a tela usa
  // -------------------------------------------------
 function normalizePaciente(p) {
  return {
    id:
      p.id ||
      p.patient_id ||
      p.uuid ||
      "",

    nome:
      p.full_name ||
      p.nome ||
      p.name ||
      p.complete_name ||
      "Sem Nome",

    cpf:
      p.cpf ||
      p.documento ||
      p.cpf_number ||
      "",

    email:
      p.email ||
      p.email_address ||
      "",

    telefone:
      p.phone ||
      p.telefone ||
      p.phone_mobile ||
      p.celular ||
      "",

    data_nascimento:
      p.birth_date ||
      p.birthdate ||
      p.date_of_birth ||
      p.data_nascimento ||
      p.nascimento ||
      "",

    // ainda não temos presença real, é só visual
    presente: true,
  };
}

  // -------------------------------------------------
  // LISTAR PACIENTES (GET /patients)
  // -------------------------------------------------
async function listarPacientes({ forceRemote = false } = {}) {
  // 1. tentar cache local pra não piscar vazio
  if (!forceRemote) {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        setPacientes(parsed);
      } catch {
        /* ignore parse error */
      }
    }
  }

  // 2. buscar remoto
  try {
    await ensureLogin();

    // 👇 MUDAMOS AQUI: select=* para não quebrar por nome de coluna
    const res = await fetch(
      `${API_BASE}/patients?select=*`,
      {
        method: "GET",
        headers: getHeaders(),
      }
    );

    if (!res.ok) {
      // pega corpo bruto pra debug
      const txt = await res.text();
      console.error(`[Pacientes] GET /patients falhou ${res.status}: ${txt}`);
      throw new Error(`GET /patients falhou ${res.status}`);
    }

    const data = await res.json();

    // 👇 log bruto pra você olhar no console DevTools
    console.log("[Pacientes] payload bruto da API:", data);

    const normalizados = Array.isArray(data)
      ? data.map(normalizePaciente)
      : [];

    setPacientes(normalizados);
    localStorage.setItem(LOCAL_KEY, JSON.stringify(normalizados));
  } catch (err) {
    console.error("[Pacientes] erro ao listar:", err);

    // fallback cache
    const raw = localStorage.getItem(LOCAL_KEY);
    if (raw) {
      try {
        setPacientes(JSON.parse(raw));
      } catch {
        setPacientes([]);
      }
    } else {
      setPacientes([]);
    }
  }
}

  // -------------------------------------------------
  // CRIAR PACIENTE (POST /patients)
  // -------------------------------------------------
  async function criarPacienteAPI(payload) {
    await ensureLogin();

    // Ajuste de nomes para colunas reais do banco:
    const bodyDB = {
      full_name: payload.nome,
      cpf: payload.cpf,
      email: payload.email,
      phone: payload.telefone,
      birth_date: payload.data_nascimento || null,
    };

    const res = await fetch(`${API_BASE}/patients`, {
      method: "POST",
      headers: getHeaders({ Prefer: "return=representation" }),
      body: JSON.stringify(bodyDB),
    });

    if (!res.ok) {
      throw new Error(`POST /patients falhou ${res.status}`);
    }

    const data = await res.json(); // Supabase retorna array de rows inseridos
    // pode vir []. vamos normalizar todos e pegar o primeiro
    const createdArray = Array.isArray(data) ? data : [data];
    const createdPacientes = createdArray.map(normalizePaciente);

    // atualiza estado:
    setPacientes((old) => {
      const novo = [...old, ...createdPacientes];
      localStorage.setItem(LOCAL_KEY, JSON.stringify(novo));
      return novo;
    });

    return createdPacientes[0] || null;
  }

  // -------------------------------------------------
  // ATUALIZAR PACIENTE (PATCH /patients?id=eq.{id})
  // -------------------------------------------------
  async function atualizarPacienteAPI(id, payload) {
    await ensureLogin();

    const bodyDB = {
      full_name: payload.nome,
      cpf: payload.cpf,
      email: payload.email,
      phone: payload.telefone,
      birth_date: payload.data_nascimento || null,
    };

    const res = await fetch(`${API_BASE}/patients?id=eq.${id}`, {
      method: "PATCH",
      headers: getHeaders({ Prefer: "return=representation" }),
      body: JSON.stringify(bodyDB),
    });

    if (!res.ok) {
      throw new Error(`PATCH /patients falhou ${res.status}`);
    }

    const data = await res.json();
    const updated = Array.isArray(data) ? data[0] : data;
    const normalized = normalizePaciente(updated);

    // atualiza no estado/localStorage
    setPacientes((prev) => {
      const novo = prev.map((p) => (p.id === id ? normalized : p));
      localStorage.setItem(LOCAL_KEY, JSON.stringify(novo));
      return novo;
    });
  }

  // -------------------------------------------------
  // REMOVER PACIENTE (DELETE /patients?id=eq.{id})
  // -------------------------------------------------
  async function removerPacienteAPI(id) {
    await ensureLogin();

    const res = await fetch(`${API_BASE}/patients?id=eq.${id}`, {
      method: "DELETE",
      headers: getHeaders(),
    });

    if (!res.ok) {
      throw new Error(`DELETE /patients falhou ${res.status}`);
    }

    setPacientes((prev) => {
      const novo = prev.filter((p) => p.id !== id);
      localStorage.setItem(LOCAL_KEY, JSON.stringify(novo));
      return novo;
    });
  }

  // -------------------------------------------------
  // modal / form handlers
  // -------------------------------------------------
  function abrirModalParaAdicionar() {
    setEditingId(null);
    setForm({
      nome: "",
      cpf: "",
      email: "",
      telefone: "",
      data_nascimento: "",
    });
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
    if (!form.nome || !form.cpf) {
      alert("Preencha pelo menos Nome e CPF");
      return;
    }

    try {
      if (editingId) {
        await atualizarPacienteAPI(editingId, form);
      } else {
        await criarPacienteAPI(form);
      }
      fecharModal();
    } catch (err) {
      console.error("[Pacientes] erro ao salvar:", err);
      alert("Não foi possível salvar o paciente (permite RLS? colunas batem?)");
    }
  }

  async function handleRemover(id) {
    if (!window.confirm("Tem certeza que deseja remover este paciente?")) return;
    try {
      await removerPacienteAPI(id);
    } catch (err) {
      console.error("[Pacientes] erro ao remover:", err);
      alert("Não foi possível remover (verifique permissões RLS / políticas)");
    }
  }

  function atualizarCampo(campo, valor) {
    setForm({ ...form, [campo]: valor });
  }

  // -------------------------------------------------
  // derived data para cards e busca
  // -------------------------------------------------
  const pacientesFiltrados = pacientes.filter((p) => {
    if (!pesquisa) return true;
    const hay = `${p.nome} ${p.cpf} ${p.email} ${p.telefone}`.toLowerCase();
    return hay.includes(pesquisa.toLowerCase());
  });

  const total = pacientes.length;
  const present = pacientes.filter((p) => p.presente).length;
  const absent = total - present;

  // -------------------------------------------------
  // efeito inicial
  // -------------------------------------------------
  useEffect(() => {
    listarPacientes();
  }, []);

  // -------------------------------------------------
  // render
  // -------------------------------------------------
  return (
    // Removido 'main-content' para evitar margem lateral duplicada do layout
    <div>
      <h1>Gerenciamento de Pacientes</h1>

      <div className="app">
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 18,
            flexWrap: "wrap",
            gap: 13,
          }}
        >
          <div>
            <div style={{ color: "#64748b", fontSize: 13 }}>
              Gerencie pacientes: adicionar, remover e marcar presença
            </div>
          </div>

          <div className="controls" style={{ display: "flex", gap: 8 }}>
            <button className="btn" onClick={abrirModalParaAdicionar}>
              Adicionar Paciente
            </button>
            <button
              className="ghost"
              onClick={() => {
                if (
                  window.confirm(
                    "Limpar cache local e forçar refresh do servidor?"
                  )
                ) {
                  localStorage.removeItem(LOCAL_KEY);
                  listarPacientes({ forceRemote: true });
                }
              }}
            >
              Recarregar da API
            </button>
          </div>
        </header>

        {/* cards resumo */}
        <div
          className="top-cards"
          style={{ display: "flex", gap: 12, flexWrap: "wrap" }}
        >
          <div className="card">
            <small>Total de pacientes cadastrados</small>
            <div className="value">{total}</div>
          </div>
          <div className="card">
            <small>Pacientes presentes agora</small>
            <div className="value">{present}</div>
          </div>
          <div className="card">
            <small>Pacientes ausentes</small>
            <div className="value">{absent}</div>
          </div>
        </div>

        {/* tabela */}
        <div
          className="panel"
          style={{
            marginTop: 18,
            background: "#fff",
            borderRadius: 12,
            boxShadow: "0 6px 18px rgba(0,0,0,0.06)",
            padding: 16,
          }}
        >
          <h2 style={{ marginTop: 0 }}>Lista de Pacientes</h2>

          <div
            className="search"
            style={{
              display: "flex",
              gap: 8,
              marginBottom: 16,
              flexWrap: "wrap",
            }}
          >
            <input
              placeholder="Pesquisar por nome, CPF ou telefone..."
              value={pesquisa}
              onChange={(e) => setPesquisa(e.target.value)}
              style={{
                flex: 1,
                minWidth: 220,
                padding: "8px 12px",
                borderRadius: "6px",
                border: "1px solid #cbd5e1",
                fontSize: "14px",
              }}
            />
          </div>

          <div
            style={{
              width: "100%",
              overflowX: "auto",
              border: "1px solid #e5e7eb",
              borderRadius: "10px",
            }}
          >
            <table
              style={{
                width: "100%",
                minWidth: "800px",
                borderCollapse: "collapse",
                fontSize: "0.9rem",
                color: "#1e293b",
              }}
            >
              <thead>
                <tr
                  style={{
                    background: "#eef2ff",
                    color: "#1e293b",
                    textTransform: "uppercase",
                    fontSize: "0.7rem",
                    letterSpacing: "0.03em",
                  }}
                >
                  <th style={thCellStyle}>Nome</th>
                  <th style={thCellStyle}>CPF</th>
                  <th style={thCellStyle}>Telefone</th>
                  <th style={thCellStyle}>Presença</th>
                  <th style={{ ...thCellStyle, textAlign: "center" }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {pacientesFiltrados.map((p) => (
                  <tr
                    key={p.id}
                    style={{
                      borderBottom: "1px solid #e5e7eb",
                    }}
                  >
                    <td style={tdCellStyle}>{p.nome}</td>
                    <td style={tdCellStyle}>{p.cpf}</td>
                    <td style={tdCellStyle}>{p.telefone}</td>
                    <td style={tdCellStyle}>
                      {p.presente ? (
                        <span className="badge present" style={badgePresent}>
                          Presente
                        </span>
                      ) : (
                        <span className="badge absent" style={badgeAbsent}>
                          Ausente
                        </span>
                      )}
                    </td>
                    <td
                      style={{
                        ...tdCellStyle,
                        textAlign: "center",
                        whiteSpace: "nowrap",
                      }}
                      className="actions"
                    >
                      <button
                        className="ghost"
                        title="Editar"
                        onClick={() => abrirModalParaEditar(p)}
                        style={ghostBtn}
                      >
                        ✏️
                      </button>
                      <button
                        className="ghost"
                        title="Remover"
                        onClick={() => handleRemover(p.id)}
                        style={ghostBtn}
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
                        padding: "12px",
                        fontStyle: "italic",
                        color: "#64748b",
                      }}
                    >
                      Nenhum paciente encontrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div
            className="footer-notes"
            style={{
              marginTop: 18,
              color: "#64748b",
              fontSize: 13,
            }}
          >
            Dados carregados da API Supabase (com cache local).
          </div>
        </div>
      </div>

      {/* MODAL */}
      {modalOpen && (
        <div
          className="modal-backdrop"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.4)",
            alignItems: "center",
            justifyContent: "center",
            display: "flex",
            zIndex: 9999,
          }}
        >
          <div
            className="modal"
            style={{
              background: "#fff",
              padding: 24,
              borderRadius: 12,
              minWidth: 320,
              maxWidth: 400,
              boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
            }}
          >
            <h3 style={{ marginTop: 0 }}>
              {editingId ? "Editar paciente" : "Adicionar paciente"}
            </h3>

            <Field
              label="Nome completo"
              value={form.nome}
              onChange={(v) => atualizarCampo("nome", v)}
            />
            <Field
              label="CPF"
              value={form.cpf}
              onChange={(v) => atualizarCampo("cpf", v)}
            />
            <Field
              label="E-mail"
              type="email"
              value={form.email}
              onChange={(v) => atualizarCampo("email", v)}
            />
            <Field
              label="Telefone"
              value={form.telefone}
              onChange={(v) => atualizarCampo("telefone", v)}
            />
            <Field
              label="Data de Nascimento"
              type="date"
              value={form.data_nascimento}
              onChange={(v) => atualizarCampo("data_nascimento", v)}
            />

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 8,
                marginTop: 12,
              }}
            >
              <button className="ghost" onClick={fecharModal} style={ghostBtn}>
                Cancelar
              </button>
              <button className="btn" onClick={handleSalvar} style={btnStyle}>
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* estilos extras que estavam inline antes */}
      <style>{`
        :root{
          --bg:#ffffff;
          --card:#f9fafb;
          --primary:#06b6d4;
          --muted:#64748b;
          --accent:#16a34a;
          --danger:#ef4444;
        }

        body{
          font-family: Inter, system-ui, sans-serif;
        }

        .card{
          background:var(--card);
          padding:14px;
          border-radius:12px;
          box-shadow:0 6px 18px rgba(0,0,0,0.08);
          min-width:160px;
        }

        .card small{
          display:block;
          color:var(--muted);
          margin-bottom:4px;
        }

        .value{
          font-weight:700;
          font-size:20px;
        }

        .btn{
          background:var(--primary);
          color:#fff;
          border:none;
          padding:8px 12px;
          border-radius:6px;
          cursor:pointer;
          font-weight:600;
          font-size:14px;
        }

        .ghost{
          background:transparent;
          border:1px solid var(--muted);
          color:var(--muted);
          padding:8px 12px;
          border-radius:6px;
          cursor:pointer;
          font-size:14px;
        }
      `}</style>
    </div>
  );
}

// ------- componentes pequenos reusáveis -------
function Field({ label, value, onChange, type = "text" }) {
  return (
    <div
      className="field"
      style={{ marginBottom: 8, display: "flex", flexDirection: "column" }}
    >
      <label
        style={{
          marginBottom: 4,
          fontSize: 14,
          color: "#64748b",
          fontWeight: 500,
        }}
      >
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          padding: "8px 10px",
          borderRadius: "6px",
          border: "1px solid #cbd5e1",
          fontSize: "14px",
        }}
      />
    </div>
  );
}

// ------- estilos inline compartilhados p/ células/badges/botões -------
const thCellStyle = {
  padding: "10px 14px",
  borderBottom: "1px solid #e5e7eb",
  whiteSpace: "nowrap",
  textAlign: "left",
};

const tdCellStyle = {
  padding: "10px 14px",
  borderBottom: "1px solid #e5e7eb",
  whiteSpace: "nowrap",
  fontSize: "0.9rem",
  color: "#1e293b",
};

const badgePresent = {
  background: "var(--accent)",
  color: "#fff",
  padding: "2px 6px",
  borderRadius: "6px",
  fontSize: "12px",
  fontWeight: 500,
};

const badgeAbsent = {
  background: "var(--danger)",
  color: "#fff",
  padding: "2px 6px",
  borderRadius: "6px",
  fontSize: "12px",
  fontWeight: 500,
};

const ghostBtn = {
  background: "transparent",
  border: "1px solid #64748b",
  color: "#64748b",
  padding: "6px 10px",
  borderRadius: "6px",
  fontSize: "14px",
  cursor: "pointer",
  marginRight: "4px",
};

const btnStyle = {
  background: "#06b6d4",
  color: "#fff",
  border: "none",
  padding: "8px 12px",
  borderRadius: "6px",
  cursor: "pointer",
  fontWeight: 600,
  fontSize: "14px",
};