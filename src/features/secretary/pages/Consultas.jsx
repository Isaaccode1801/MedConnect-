import React, { useState, useEffect } from "react";
import "./Consultas.css";
import { listarConsultasComNomes } from "@/lib/pacientesService";

// ======== CONFIG SUPABASE ========
const SUPABASE_BASE = "https://yuanqfswhberkoevtmfr.supabase.co";
const API_BASE = `${SUPABASE_BASE}/rest/v1`;
const API_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl1YW5xZnN3aGJlcmtvZXZ0bWZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ5NTQzNjksImV4cCI6MjA3MDUzMDM2OX0.g8Fm4XAvtX46zifBZnYVH4tVuQkqUH6Ia9CXQj4DztQ";

// =======================================================
// 🔹 LOGIN E TOKEN (corrigido com renovação automática)
// =======================================================
async function ensureLogin() {
  const existing = sessionStorage.getItem("token");

  if (existing) {
    try {
      const res = await fetch(`${SUPABASE_BASE}/auth/v1/user`, {
        headers: { apikey: API_KEY, Authorization: `Bearer ${existing}` },
      });
      if (res.ok) return existing;
      console.warn("[Consultas] Token expirado, renovando...");
      sessionStorage.removeItem("token");
    } catch {
      sessionStorage.removeItem("token");
    }
  }

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
      console.warn("[Consultas] login falhou", res.status);
      return null;
    }

    const data = await res.json();
    sessionStorage.setItem("token", data.access_token);
    console.log("[Consultas] Novo token salvo com sucesso");
    return data.access_token;
  } catch (err) {
    console.error("[Consultas] erro no login:", err);
    return null;
  }
}

async function getHeaders(extra = {}) {
  const token = await ensureLogin();
  return {
    "Content-Type": "application/json",
    apikey: API_KEY,
    Authorization: token ? `Bearer ${token}` : "",
    Prefer: "return=representation",
    ...extra,
  };
}

// =======================================================
// 🔹 COMPONENTE PRINCIPAL
// =======================================================
export default function Consultas() {
  const [consultas, setConsultas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  const [pacientes, setPacientes] = useState([]);
  const [medicos, setMedicos] = useState([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    doctor_id: "",
    patient_id: "",
    scheduled_at: "",
    duration_minutes: 30, // ✅ valor padrão automático
  });

  // =========================================
  // 🔹 CARREGAR CONSULTAS + PACIENTES + MÉDICOS
  // =========================================
  async function carregarConsultas() {
    setCarregando(true);
    try {
      const dados = await listarConsultasComNomes();
      setConsultas(dados || []);
      setErro("");
    } catch (e) {
      console.error("[Consultas] erro ao carregar", e);
      setErro("Não foi possível carregar as consultas.");
    } finally {
      setCarregando(false);
    }
  }

  async function carregarPacientesEMedicos() {
    try {
      const headers = await getHeaders();

      const [resPac, resMed] = await Promise.all([
        fetch(`${API_BASE}/patients?select=id,full_name`, { headers }),
        fetch(`${API_BASE}/doctors?select=id,full_name`, { headers }),
      ]);

      const pacientesData = await resPac.json();
      const medicosData = await resMed.json();

      setPacientes(Array.isArray(pacientesData) ? pacientesData : []);
      setMedicos(Array.isArray(medicosData) ? medicosData : []);
    } catch (err) {
      console.error("[Consultas] erro ao carregar pacientes/médicos:", err);
    }
  }

  useEffect(() => {
    carregarConsultas();
    carregarPacientesEMedicos();
  }, []);

  // =========================================
  // 🔹 CRUD DIRETO NO SUPABASE
  // =========================================
  async function criarConsulta(body) {
    try {
      const headers = await getHeaders();
      console.log("[Consultas] Tentando POST em:", `${API_BASE}/appointments`);

      const res = await fetch(`${API_BASE}/appointments`, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });

      const txt = await res.text();
      console.log("[Consultas] Resposta:", res.status, txt);

      if (!res.ok) throw new Error("Falha ao criar consulta");

      await carregarConsultas();
      fecharModal();
    } catch (err) {
      console.error("[Consultas] Erro ao criar:", err);
      alert("Erro ao criar consulta (ver console).");
    }
  }

  async function atualizarConsulta(id, body) {
    try {
      const headers = await getHeaders();
      const res = await fetch(`${API_BASE}/appointments?id=eq.${id}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify(body),
      });

      const txt = await res.text();
      console.log("[Consultas] Atualização:", res.status, txt);

      if (!res.ok) throw new Error("Falha ao atualizar consulta");

      await carregarConsultas();
      fecharModal();
    } catch (err) {
      console.error("[Consultas] Erro ao atualizar:", err);
      alert("Erro ao atualizar consulta (ver console).");
    }
  }

  async function excluirConsulta(id) {
  if (!window.confirm("Deseja realmente excluir esta consulta?")) return;

  try {
    const headers = await getHeaders({
      Prefer: "return=minimal", // 🔹 Supabase exige isso em DELETE
    });

    console.log("[Consultas] Tentando excluir:", id);

    const res = await fetch(`${API_BASE}/appointments?id=eq.${id}`, {
      method: "DELETE",
      headers,
    });

    const txt = await res.text();
    console.log("[Consultas] Exclusão:", res.status, txt);

    if (!res.ok) throw new Error("Falha ao excluir consulta");

    await carregarConsultas();
    alert("Consulta excluída com sucesso!");
  } catch (err) {
    console.error("[Consultas] Erro ao excluir:", err);
    alert("Erro ao excluir consulta (ver console).");
  }
}

  // =========================================
  // 🔹 MODAL HANDLERS
  // =========================================
  function abrirModalParaNova() {
    setEditingId(null);
    setForm({
      doctor_id: "",
      patient_id: "",
      scheduled_at: new Date().toISOString().slice(0, 16),
      duration_minutes: 30, // ✅ valor padrão automático
    });
    setModalOpen(true);
  }

  function abrirModalParaEditar(c) {
    setEditingId(c.id);
    setForm({
      doctor_id: c.doctor_id || "",
      patient_id: c.patient_id || "",
      scheduled_at: c.scheduled_at ? c.scheduled_at.slice(0, 16) : "",
      duration_minutes: c.duration_minutes || 30,
    });
    setModalOpen(true);
  }

  function fecharModal() {
    setModalOpen(false);
  }

  function atualizarCampo(campo, valor) {
    setForm({ ...form, [campo]: valor });
  }

  async function handleSalvar() {
    if (!form.doctor_id || !form.patient_id || !form.scheduled_at) {
      alert("Preencha Médico, Paciente e Data/Hora antes de salvar.");
      return;
    }

    const body = {
      ...form,
      duration_minutes: form.duration_minutes
        ? Number(form.duration_minutes)
        : 30, // ✅ garante número válido
      created_by: form.doctor_id,
    };

    console.log("[Consultas] Corpo enviado:", body);

    if (editingId) {
      await atualizarConsulta(editingId, body);
    } else {
      await criarConsulta(body);
    }
  }

  // =========================================
  // 🔹 RENDER
  // =========================================
  return (
    <div className="secretary-page-wrap">
      <div className="appbar">
        <div className="appbar-inner">
          <div className="brand">
            <div>
              <h1>HealthOne</h1>
              <small>Histórico de Consultas</small>
            </div>
          </div>

          <button className="btn" onClick={abrirModalParaNova}>
            <i className="fa-solid fa-plus"></i> Nova Consulta
          </button>
        </div>
      </div>

      <main className="wrap">
        <section className="card">
          <div className="card-header">
            <h2>Consultas</h2>
          </div>

          <div className="card-content">
            {carregando ? (
              <div className="empty note">Carregando consultas...</div>
            ) : erro ? (
              <div className="empty note error">{erro}</div>
            ) : consultas.length === 0 ? (
              <div className="empty note">Nenhuma consulta encontrada.</div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>CPF</th>
                      <th>Paciente</th>
                      <th>Telefone</th>
                      <th>Médico</th>
                      <th>Data</th>
                      <th>Duração</th>
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {consultas.map((c, i) => (
                      <tr key={i}>
                        <td>{c.cpf || "—"}</td>
                        <td>{c.paciente_nome || "—"}</td>
                        <td>{c.paciente_telefone || "—"}</td>
                        <td>{c.medico_nome || "—"}</td>
                        <td>
                          {c.scheduled_at
                            ? new Date(c.scheduled_at).toLocaleString("pt-BR")
                            : "—"}
                        </td>
                        <td>
                          {c.duration_minutes
                            ? `${c.duration_minutes} min`
                            : "—"}
                        </td>
                        <td className="actions">
                          <button
                            className="ghost"
                            onClick={() => abrirModalParaEditar(c)}
                          >
                            ✏️ Editar
                          </button>
                          <button
                            className="ghost"
                            onClick={() => excluirConsulta(c.id)}
                          >
                            🗑️ Excluir
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      </main>

      {/* ===== MODAL ===== */}
      {modalOpen && (
        <div className="modal-backdrop">
          <div className="modal">
            <h3>{editingId ? "Editar Consulta" : "Nova Consulta"}</h3>

            <div className="field">
              <label>Médico</label>
              <select
                value={form.doctor_id}
                onChange={(e) => atualizarCampo("doctor_id", e.target.value)}
              >
                <option value="">Selecione um médico</option>
                {medicos.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.full_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label>Paciente</label>
              <select
                value={form.patient_id}
                onChange={(e) => atualizarCampo("patient_id", e.target.value)}
              >
                <option value="">Selecione um paciente</option>
                {pacientes.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.full_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label>Data e Hora</label>
              <input
                type="datetime-local"
                value={form.scheduled_at}
                onChange={(e) =>
                  atualizarCampo("scheduled_at", e.target.value)
                }
              />
            </div>

            <div className="field">
              <label>Duração (minutos)</label>
              <input
                type="number"
                min="1"
                value={form.duration_minutes}
                onChange={(e) => {
                  const value = Number(e.target.value);
                  atualizarCampo("duration_minutes", value < 1 ? 1 : value);
                }}
              />
              {form.duration_minutes < 1 && (
                <small style={{ color: "red" }}>
                  A duração deve ser pelo menos 1 minuto.
                </small>
              )}
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 8,
                marginTop: "1rem",
              }}
            >
              <button className="ghost" onClick={fecharModal}>
                Cancelar
              </button>
              <button
                className="btn"
                onClick={handleSalvar}
                disabled={
                  !form.doctor_id || !form.patient_id || !form.scheduled_at
                }
                style={{
                  opacity:
                    !form.doctor_id || !form.patient_id || !form.scheduled_at
                      ? 0.6
                      : 1,
                  cursor:
                    !form.doctor_id || !form.patient_id || !form.scheduled_at
                      ? "not-allowed"
                      : "pointer",
                }}
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}