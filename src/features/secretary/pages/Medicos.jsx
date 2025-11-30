import React, { useState, useEffect } from "react";
import AccessibilityMenu from "../../../components/ui/AccessibilityMenu";
import { FiEdit, FiTrash2 } from "react-icons/fi";

// Config de API / Supabase
const SUPABASE_BASE = "https://yuanqfswhberkoevtmfr.supabase.co";
const API_BASE = `${SUPABASE_BASE}/rest/v1`;
const API_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl1YW5xZnN3aGJlcmtvZXZ0bWZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ5NTQzNjksImV4cCI6MjA3MDUzMDM2OX0.g8Fm4XAvtX46zifBZnYVH4tVuQkqUH6Ia9CXQj4DztQ";

const LOCAL_KEY = "healthone_medicos";

export default function MedicosPage() {
  const [medicos, setMedicos] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    nome: "",
    cpf: "",
    email: "",
    especialidade: "",
    crm: "",
    crm_uf: "",
  });

  const [pesquisa, setPesquisa] = useState("");
  const [filtroEsp, setFiltroEsp] = useState("");

  // ================= helpers =================
  const escapeHTML = (s) => {
    if (s == null) return "";
    return String(s).replace(/[&<>"]+/g, (e) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[e]));
  };

  const getInitials = (full) => {
    if (!full) return "?";
    const parts = full.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  };

  const getHeaders = (extra = {}) => {
    const token = sessionStorage.getItem("token");
    return {
      "Content-Type": "application/json",
      apikey: API_KEY,
      Authorization: token ? `Bearer ${token}` : "",
      ...extra,
    };
  };

  const login = async () => {
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
      console.warn("Erro no login", err);
      return null;
    }
  };

  // ================= CRUD =================
  const listarMedicos = async ({ forceRemote = false } = {}) => {
    if (!forceRemote) {
      const raw = localStorage.getItem(LOCAL_KEY);
      if (raw) {
        try {
          const localMedicos = JSON.parse(raw);
          setMedicos(localMedicos);
        } catch (e) {
          console.warn("Erro ao ler localStorage", e);
        }
      }
    }

    try {
      await login();
      const res = await fetch(`${API_BASE}/doctors`, {
        method: "GET",
        headers: getHeaders(),
      });
      if (!res.ok) throw new Error(`Status ${res.status}`);
      const data = await res.json();

      const normalizados = data.map((m) => ({
        id: m.id,
        nome: m.full_name || m.nome || "Sem Nome",
        cpf: m.cpf || "",
        email: m.email || "",
        especialidade: m.specialty || m.especialidade || "Geral",
        crm: m.crm || "-",
        crm_uf: m.crm_uf || "XX",
        presente: m.active ?? true,
      }));

      setMedicos(normalizados);
      localStorage.setItem(LOCAL_KEY, JSON.stringify(normalizados));
    } catch (err) {
      console.error("Falha na listagem de médicos:", err);
      const fallback = localStorage.getItem(LOCAL_KEY);
      if (fallback) {
        try {
          setMedicos(JSON.parse(fallback));
        } catch {
          setMedicos([]);
        }
      } else {
        setMedicos([]);
      }
    }
  };

  const adicionarMedicoAPI = async (payload) => {
    try {
      await login();
      const res = await fetch(`${API_BASE}/doctors`, {
        method: "POST",
        headers: getHeaders({ Prefer: "return=representation" }),
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`Falha ao adicionar: ${res.status}`);

      const novo = await res.json();
      const parsed = (Array.isArray(novo) ? novo : [novo]).map((n) => ({
        id: n.id,
        nome: n.full_name || "Sem Nome",
        cpf: n.cpf || "",
        email: n.email || "",
        especialidade: n.specialty || "Geral",
        crm: n.crm || "-",
        crm_uf: n.crm_uf || "XX",
        presente: n.active ?? true,
      }));

      setMedicos((prev) => [...prev, ...parsed]);
      localStorage.setItem(LOCAL_KEY, JSON.stringify([...medicos, ...parsed]));
    } catch (err) {
      alert("Falha ao adicionar médico");
      console.error(err);
    }
  };

  const atualizarMedicoAPI = async (id, payload) => {
    try {
      await login();
      const res = await fetch(`${API_BASE}/doctors?id=eq.${id}`, {
        method: "PATCH",
        headers: getHeaders({ Prefer: "return=representation" }),
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`Falha ao atualizar: ${res.status}`);

      const updatedArr = await res.json();
      const updated = Array.isArray(updatedArr) ? updatedArr[0] : updatedArr;

      setMedicos((prev) =>
        prev.map((m) =>
          m.id === id
            ? {
                ...m,
                nome: updated.full_name ?? m.nome,
                cpf: updated.cpf ?? m.cpf,
                email: updated.email ?? m.email,
                especialidade: updated.specialty ?? m.especialidade,
                crm: updated.crm ?? m.crm,
                crm_uf: updated.crm_uf ?? m.crm_uf,
              }
            : m
        )
      );

      const nextLocal = medicos.map((m) =>
        m.id === id
          ? {
              ...m,
              nome: updated.full_name ?? m.nome,
              cpf: updated.cpf ?? m.cpf,
              email: updated.email ?? m.email,
              especialidade: updated.specialty ?? m.especialidade,
              crm: updated.crm ?? m.crm,
              crm_uf: updated.crm_uf ?? m.crm_uf,
            }
          : m
      );
      localStorage.setItem(LOCAL_KEY, JSON.stringify(nextLocal));
    } catch (err) {
      alert("Falha ao atualizar médico");
      console.error(err);
    }
  };

  const removerMedicoAPI = async (id) => {
    try {
      if (!window.confirm("Tem certeza que deseja remover este médico?")) return;

      await login();
      const res = await fetch(`${API_BASE}/doctors?id=eq.${id}`, {
        method: "DELETE",
        headers: getHeaders(),
      });
      if (!res.ok) throw new Error(`Falha ao remover: ${res.status}`);

      const filtrado = medicos.filter((m) => m.id !== id);
      setMedicos(filtrado);
      localStorage.setItem(LOCAL_KEY, JSON.stringify(filtrado));
    } catch (err) {
      alert("Falha ao remover médico");
      console.error(err);
    }
  };

  // ================= modal / form =================
  const abrirModalParaAdicionar = () => {
    setEditingId(null);
    setFormData({
      nome: "",
      cpf: "",
      email: "",
      especialidade: "",
      crm: "",
      crm_uf: "",
    });
    setModalOpen(true);
  };

  const abrirModalParaEditar = (m) => {
    setEditingId(m.id);
    setFormData({
      nome: m.nome,
      cpf: m.cpf,
      email: m.email,
      especialidade: m.especialidade,
      crm: m.crm,
      crm_uf: m.crm_uf,
    });
    setModalOpen(true);
  };

  const fecharModal = () => setModalOpen(false);

  const handleSalvar = async () => {
    const { nome, especialidade, crm, crm_uf, cpf, email } = formData;
    if (!nome || !especialidade) {
      alert("Preencha nome e especialidade");
      return;
    }

    const payload = {
      full_name: nome,
      specialty: especialidade,
      crm,
      crm_uf: (crm_uf || "").toUpperCase(),
      cpf,
      email,
    };

    if (editingId) {
      await atualizarMedicoAPI(editingId, payload);
    } else {
      await adicionarMedicoAPI(payload);
    }

    fecharModal();
    listarMedicos({ forceRemote: true });
  };

  // ================= filtro =================
  const medicosFiltrados = medicos.filter((m) => {
    if (filtroEsp && m.especialidade !== filtroEsp) return false;
    const hay = `${m.nome} ${m.especialidade} ${m.crm || ""} ${m.telefone || ""}`.toLowerCase();
    return hay.includes(pesquisa.toLowerCase());
  });

  const presentes = medicos.filter((m) => m.presente).length;
  const ausentes = medicos.length - presentes;
  const especialidadesUnicas = Array.from(new Set(medicos.map((m) => m.especialidade))).sort();

  // ================= efeito inicial =================
  useEffect(() => {
    listarMedicos();
  }, []);

  // ================= render =================
  return (
    <div className="secretary-page-wrap theme-page">
      {/* Top header da página dentro da área branca */}
      <div className="appbar theme-header">
        <div className="appbar-inner">
          <div className="brand">
            <div>
              <h1 className="theme-text-primary">MedConnect</h1>
              <small className="theme-text-secondary">Gerenciamento de Médicos</small>
            </div>
          </div>

          <div className="nav-links">
            <h1 className="theme-text-secondary" style={{ fontSize: "1rem", fontWeight: 500, margin: 0 }}>
              Controle de presença e cadastro
            </h1>
          </div>
        </div>
      </div>

      <main className="wrap theme-bg-primary">
        <div className="app">
          <header style={{ marginBottom: "18px", display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: "12px" }}>
            <div className="theme-text-secondary" style={{ fontSize: "13px" }}>
              Gerencie médicos: adicionar, remover e marcar presença
            </div>

            <div className="controls" style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              <button className="btn btn-primary" onClick={abrirModalParaAdicionar}>
                Adicionar Médico
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => {
                  if (window.confirm("Limpar cache local e recarregar do servidor?")) {
                    localStorage.removeItem(LOCAL_KEY);
                    listarMedicos({ forceRemote: true });
                  }
                }}
              >
                Limpar dados (local)
              </button>
            </div>
          </header>

          {/* cards resumo */}
          <div className="top-cards">
            <div className="card theme-card">
              <small className="theme-text-secondary">Total de médicos cadastrados</small>
              <div className="value theme-text-primary">{medicos.length}</div>
            </div>

            <div className="card theme-card">
              <small className="theme-text-secondary">Médicos presentes agora</small>
              <div className="value theme-text-primary">{presentes}</div>
            </div>

            <div className="card theme-card">
              <small className="theme-text-secondary">Médicos ausentes</small>
              <div className="value theme-text-primary">{ausentes}</div>
            </div>
          </div>

          <div className="layout" style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: "24px", marginTop: "24px" }}>
            {/* coluna principal */}
            <div>
              <div className="panel theme-card">
                <h2 style={{ marginTop: 0 }} className="theme-text-primary">Lista de médicos</h2>

                {/* filtros/busca */}
                <div className="search" style={{ display: "flex", gap: "8px", marginBottom: "12px", flexWrap: "wrap" }}>
                  <input
                    placeholder="Pesquisar por nome ou especialidade..."
                    value={pesquisa}
                    onChange={(e) => setPesquisa(e.target.value)}
                    style={{ flex: 1, minWidth: "180px" }}
                    className="theme-input"
                  />
                  <select
                    value={filtroEsp}
                    onChange={(e) => setFiltroEsp(e.target.value)}
                    style={{ minWidth: "180px" }}
                    className="theme-input"
                  >
                    <option value="">Todas as especialidades</option>
                    {especialidadesUnicas.map((esp) => (
                      <option key={esp} value={esp}>
                        {esp}
                      </option>
                    ))}
                  </select>
                </div>

                {/* ==== TABELA CORRIGIDA ==== */}
                <div className="table-wrapper theme-card">
                  <table className="table-medicos">
                    <thead>
                      <tr>
                        <th style={{ width: 56 }}></th>
                        <th className="theme-text-primary">Nome</th>
                        <th className="theme-text-primary">Especialidade</th>
                        <th className="theme-text-primary">Presença</th>
                        <th style={{ textAlign: "center" }} className="theme-text-primary">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {medicosFiltrados.map((m) => (
                        <tr key={m.id} className="theme-table-row">
                          <td>
                            <div className="avatar theme-avatar" title={m.nome}>{getInitials(m.nome)}</div>
                          </td>
                          <td style={{ minWidth: 220 }} className="theme-text-primary">{escapeHTML(m.nome)}</td>
                          <td className="theme-text-secondary">{escapeHTML(m.especialidade)}</td>
                          <td>
                            {m.presente ? (
                              <span className="badge present theme-badge-present">Presente</span>
                            ) : (
                              <span className="badge absent theme-badge-absent">Ausente</span>
                            )}
                          </td>
                          <td className="actions">
                            <button
                              className="action-btn theme-action-btn"
                              title="Editar"
                              onClick={() => abrirModalParaEditar(m)}
                            >
                              <FiEdit />
                            </button>
                            <button
                              className="action-btn theme-action-btn theme-action-btn-danger"
                              title="Remover"
                              onClick={() => removerMedicoAPI(m.id)}
                            >
                              <FiTrash2 />
                            </button>
                          </td>
                        </tr>
                      ))}

                      {medicosFiltrados.length === 0 && (
                        <tr>
                          <td colSpan={5} className="theme-text-muted" style={{ textAlign: "center", padding: "12px", fontStyle: "italic" }}>
                            Nenhum médico encontrado.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="footer-notes theme-text-muted" style={{ fontSize: "12px", marginTop: "8px" }}>
                  Dica: dados em cache no navegador (localStorage). Em produção, isso vem 100% da API.
                </div>
              </div>
            </div>

            {/* coluna lateral */}
            <aside>
              <div className="panel panel-stats" style={{ display: "grid", gap: "16px" }}>
                <div className="card theme-card" style={{ minWidth: 0 }}>
                  <small className="theme-text-secondary">Indicadores rápidos</small>
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: "8px", fontSize: "0.9rem" }}>
                    <div>
                      <div className="theme-text-muted" style={{ fontSize: "12px" }}>Total</div>
                      <div className="theme-text-primary" style={{ fontWeight: 700 }}>{medicos.length}</div>
                    </div>
                    <div>
                      <div className="theme-text-muted" style={{ fontSize: "12px" }}>Presentes</div>
                      <div className="theme-text-primary" style={{ fontWeight: 700 }}>{presentes}</div>
                    </div>
                  </div>
                </div>

                <div className="card theme-card" style={{ minWidth: 0 }}>
                  <h3 className="theme-text-primary" style={{ marginTop: 0, fontSize: "0.95rem" }}>
                    Médicos presentes
                  </h3>
                  <ul className="list-compact" style={{ listStyle: "none", padding: 0, margin: 0, fontSize: "0.85rem" }}>
                    {medicos.filter((m) => m.presente).map((m) => (
                      <li key={m.id} style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--color-border)", padding: "4px 0" }}>
                        <span className="theme-text-primary">{m.nome}</span>
                        <span className="theme-text-secondary">{m.especialidade}</span>
                      </li>
                    ))}
                    {medicos.filter((m) => m.presente).length === 0 && (
                      <li className="theme-text-muted" style={{ fontStyle: "italic" }}>Nenhum presente agora</li>
                    )}
                  </ul>
                </div>

                <div className="card theme-card" style={{ minWidth: 0 }}>
                  <h3 className="theme-text-primary" style={{ marginTop: 0, fontSize: "0.95rem" }}>
                    Médicos ausentes
                  </h3>
                  <ul className="list-compact" style={{ listStyle: "none", padding: 0, margin: 0, fontSize: "0.85rem" }}>
                    {medicos.filter((m) => !m.presente).map((m) => (
                      <li key={m.id} style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--color-border)", padding: "4px 0" }}>
                        <span className="theme-text-primary">{m.nome}</span>
                        <span className="theme-text-secondary">{m.especialidade}</span>
                      </li>
                    ))}
                    {medicos.filter((m) => !m.presente).length === 0 && (
                      <li className="theme-text-muted" style={{ fontStyle: "italic" }}>Nenhum ausente 🎉</li>
                    )}
                  </ul>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </main>

      {/* MODAL */}
      {modalOpen && (
        <div className="modal-backdrop visible">
          <div className="modal theme-card">
            <h3 style={{ marginTop: 0 }} className="theme-text-primary">
              {editingId ? "Editar médico" : "Adicionar médico"}
            </h3>

            {["nome", "cpf", "email", "especialidade", "crm", "crm_uf"].map((field) => (
              <div className="field" key={field}>
                <label className="theme-text-secondary">
                  {field === "nome" ? "Nome completo" : field === "crm_uf" ? "CRM - UF" : field.toUpperCase()}
                </label>
                <input
                  value={formData[field]}
                  onChange={(e) => setFormData({ ...formData, [field]: e.target.value })}
                  className="theme-input"
                />
              </div>
            ))}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "12px" }}>
              <button className="btn btn-secondary" onClick={fecharModal}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleSalvar}>Salvar</button>
            </div>
          </div>
        </div>
      )}

      {/* Estilos atualizados para modo escuro */}
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
        .theme-header { background: var(--color-bg-secondary); }
        .theme-bg-primary { background: var(--color-bg-primary); }
        .theme-text-primary { color: var(--color-text-primary); }
        .theme-text-secondary { color: var(--color-text-secondary); }
        .theme-text-muted { color: var(--color-text-muted); }
        .theme-card { 
          background: var(--color-bg-card); 
          border: 1px solid var(--color-border);
          color: var(--color-text-primary);
        }
        .theme-input {
          background: var(--color-bg-card);
          color: var(--color-text-primary);
          border: 1px solid var(--color-border);
        }
        .theme-input::placeholder {
          color: var(--color-text-muted);
        }
        .theme-avatar {
          background: var(--color-primary);
          color: white;
        }
        .theme-table-row:hover {
          background: var(--color-bg-tertiary);
        }
        .theme-badge-present {
          background: rgba(22, 163, 74, 0.2);
          color: var(--color-accent);
        }
        .theme-badge-absent {
          background: rgba(239, 68, 68, 0.2);
          color: var(--color-danger);
        }
        .theme-action-btn {
          color: var(--color-text-primary);
        }
        .theme-action-btn:hover {
          background: rgba(6, 182, 212, 0.1);
        }
        .theme-action-btn-danger:hover {
          background: rgba(239, 68, 68, 0.1);
        }

        /* Botões usando variáveis CSS */
        .btn {
          background: var(--color-primary);
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 500;
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

        @media (max-width: 768px) {
          .secretary-page-wrap { padding-left: 88px; }
        }

        .appbar { background: transparent; padding: 20px 24px 0; position: relative; z-index: 0 }
        .appbar-inner { display:flex; align-items:center; justify-content:space-between; gap: 12px; }
        .brand h1 { margin:0; font-size:1.05rem; font-weight:600; }
        .brand small { font-size:0.82rem; }

        .wrap { padding: 24px; padding-top: 6px; max-width: 1280px; }
        .app { max-width: 1180px; margin:0 auto; }

        .top-cards{ display:flex; gap:12px; flex-wrap:wrap; margin-bottom:6px }
        .card{ padding:12px 14px; border-radius:10px; min-width:150px; box-shadow: var(--shadow-sm); }
        .card small{ display:block; margin-bottom:6px; font-size:0.82rem }
        .value{ font-weight:700; font-size:18px }

        .controls { display:flex; gap:8px; align-items:center }
        .controls input, .search input, .search select {
          border: 1px solid var(--color-border);
          background: var(--color-bg-card);
          padding: 10px 12px;
          border-radius: 10px;
          outline: none;
          font-size: 0.95rem;
          color: var(--color-text-primary);
        }

        .layout { display:grid; grid-template-columns: 1fr 300px; gap:24px; margin-top:20px }

        .panel { border-radius:12px; padding:16px; box-shadow:none; border:1px solid var(--color-border) }

        .table-wrapper { width:100%; overflow-x:auto; border-radius:10px; background: var(--color-bg-card); border:1px solid var(--color-border); margin-top:12px }
        .table-medicos { width:100%; min-width:720px; border-collapse:separate; border-spacing:0; font-size:0.95rem; }
        .table-medicos thead tr { background:transparent; text-transform:uppercase; font-size:0.72rem; }
        .table-medicos th, .table-medicos td { padding:12px 14px; border-bottom:1px solid var(--color-border); text-align:left }
        .table-medicos thead th { font-weight:600; letter-spacing:0.02em }
        .table-medicos tbody tr { transition: background .15s ease; }

        .badge{ padding:6px 8px; border-radius:999px; font-weight:600; font-size:0.82rem }
        .badge.present{ background: rgba(22,163,74,0.12); }
        .badge.absent{ background: rgba(239,68,68,0.08); }

        .avatar{ width:36px; height:36px; border-radius:999px; display:inline-grid; place-items:center; font-weight:700; font-size:0.85rem }

        .action-btn { background:transparent; border:none; width:36px; height:36px; display:inline-flex; align-items:center; justify-content:center; border-radius:8px; cursor:pointer }
        .action-btn svg { font-size: 16px }

        .table-medicos .actions { text-align:center }

        .list-compact li { padding:8px 0; border-bottom:1px solid var(--color-border) }
        .list-compact li:last-child { border-bottom: none }

        .modal-backdrop { position:fixed; inset:0; background: rgba(2,6,23,0.18); display:flex; align-items:center; justify-content:center; z-index:9999 }
        .modal { padding:20px; border-radius:12px; min-width:320px; max-width:460px; box-shadow: var(--shadow-lg) }
        .field{ margin-bottom:12px; display:flex; flex-direction:column }
        .field label{ margin-bottom:6px; font-size:14px; }
        .field input{ padding:10px 12px; border-radius:8px; font-size:14px }

        @media (max-width: 980px) { .layout { grid-template-columns: 1fr } .panel-stats { order: 2 } }

        
      `}</style>
      <AccessibilityMenu />
    </div>
  );
}