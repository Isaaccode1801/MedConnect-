import React, { useState, useEffect, useRef, useMemo } from "react";
import "./Consultas.css";
import AccessibilityMenu from "../../../components/ui/AccessibilityMenu";

// ======== CONFIG SUPABASE ========
const SUPABASE_BASE = "https://yuanqfswhberkoevtmfr.supabase.co";
const API_BASE = `${SUPABASE_BASE}/rest/v1`;
const EDGE_BASE = `${SUPABASE_BASE}/functions/v1`;
const API_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl1YW5xZnN3aGJlcmtvZXZ0bWZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ5NTQzNjksImV4cCI6MjA3MDUzMDM2OX0.g8Fm4XAvtX46zifBZnYVH4tVuQkqUH6Ia9CXQj4DztQ";

// Se quiser forçar E.164, troque para true (por padrão envia como está)
const FORCE_E164 = false;

// Paginação
const PAGE_SIZE = 20;

// =======================================================
// 🔹 LOGIN E TOKEN
// =======================================================
async function ensureLogin() {
  const existing = sessionStorage.getItem("token");

  if (existing) {
    try {
      const res = await fetch(`${SUPABASE_BASE}/auth/v1/user`, {
        headers: { apikey: API_KEY, Authorization: `Bearer ${existing}` },
      });
      if (res.ok) return existing;
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

    if (!res.ok) return null;

    const data = await res.json();
    sessionStorage.setItem("token", data.access_token);
    return data.access_token;
  } catch {
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
// 🔹 HELPERS: TELEFONE & SMS
// =======================================================
function pickFirstMatch(obj, keys) {
  if (!obj) return null;
  for (const k of keys) {
    if (obj[k]) return obj[k];
  }
  return null;
}

// Busca telefone do paciente em múltiplas fontes (prioriza patients.phone_mobile)
async function buscarTelefonePacienteMultiFonte(patientId, consultasState) {
  const headers = await getHeaders();

  // 1) patients: usa phone_mobile diretamente
  try {
    const res = await fetch(
      `${API_BASE}/patients?select=phone_mobile,full_name&id=eq.${encodeURIComponent(patientId)}&limit=1`,
      { headers }
    );
    if (res.ok) {
      const arr = await res.json();
      const row = Array.isArray(arr) && arr.length ? arr[0] : null;
      if (row?.phone_mobile) return row.phone_mobile;
    }
  } catch {}

  // 2) patient_contacts (campos comuns)
  try {
    const res = await fetch(
      `${API_BASE}/patient_contacts?select=phone,whatsapp,contact_phone,telefone&patient_id=eq.${encodeURIComponent(patientId)}&limit=1`,
      { headers }
    );
    if (res.ok) {
      const arr = await res.json();
      const row = Array.isArray(arr) && arr.length ? arr[0] : null;
      const tel = pickFirstMatch(row, ["phone", "whatsapp", "contact_phone", "telefone"]);
      if (tel) return tel;
    }
  } catch {}

  // 3) profiles (às vezes perfis guardam contato)
  try {
    const res = await fetch(
      `${API_BASE}/profiles?select=phone,whatsapp,phone_number&id=eq.${encodeURIComponent(patientId)}&limit=1`,
      { headers }
    );
    if (res.ok) {
      const arr = await res.json();
      const row = Array.isArray(arr) && arr.length ? arr[0] : null;
      const tel = pickFirstMatch(row, ["phone", "whatsapp", "phone_number"]);
      if (tel) return tel;
    }
  } catch {}

  // 4) Fallback: usa telefone que sua lista de consultas já mostra
  if (Array.isArray(consultasState) && consultasState.length) {
    const hit = consultasState.find(
      (c) => c.patient_id === patientId || c.paciente_id === patientId
    );
    if (hit && hit.paciente_telefone) return hit.paciente_telefone;
  }

  return null;
}

// normalização opcional (se desativada, retorna original)
function maybeToE164(brPhone) {
  if (!brPhone) return null;
  const raw = String(brPhone).trim();
  if (!FORCE_E164) return raw; // igual ao do seu amigo: envia como vier
  if (raw.startsWith("+")) return raw;
  const digits = raw.replace(/\D/g, "");
  if (digits.length >= 10 && digits.length <= 11) return `+55${digits}`;
  return raw;
}

async function enviarSMS({ phone_number, message, patient_id }) {
  const token = await ensureLogin();
  const res = await fetch(`${EDGE_BASE}/send-sms`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: API_KEY,
      Authorization: token ? `Bearer ${token}` : "",
    },
    body: JSON.stringify({ phone_number, message, patient_id }),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok || json?.success !== true) {
    throw new Error(json?.details || json?.error || "Falha ao enviar SMS");
  }
  return json;
}

function montarMensagemLembrete(pacienteNome, medicoNome, scheduledAtISO) {
  const dt = new Date(scheduledAtISO);
  const dataBR = dt.toLocaleDateString("pt-BR");
  const horaBR = dt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const nomePaciente = pacienteNome || "Paciente";
  const nomeMedico = medicoNome || "seu médico(a)";
  return `Olá, ${nomePaciente}! Sua consulta com ${nomeMedico} foi agendada para ${dataBR} às ${horaBR}. ` +
         `Qualquer imprevisto, responda este SMS.`;
}

async function getMedicoNome(doctor_id) {
  const headers = await getHeaders();
  try {
    const res = await fetch(
      `${API_BASE}/doctors?select=full_name&id=eq.${encodeURIComponent(doctor_id)}&limit=1`,
      { headers }
    );
    if (!res.ok) return null;
    const arr = await res.json();
    return (Array.isArray(arr) && arr[0]?.full_name) || null;
  } catch {
    return null;
  }
}

async function getPacienteNome(patient_id) {
  const headers = await getHeaders();
  try {
    const res = await fetch(
      `${API_BASE}/patients?select=full_name&id=eq.${encodeURIComponent(patient_id)}&limit=1`,
      { headers }
    );
    if (!res.ok) return null;
    const arr = await res.json();
    return (Array.isArray(arr) && arr[0]?.full_name) || "Paciente";
  } catch {
    return "Paciente";
  }
}

async function dispararSmsParaPaciente({ patient_id, doctor_id, scheduled_at }, consultasState) {
  if (!patient_id || !scheduled_at) return;

  // 1) tenta achar telefone (prioriza patients.phone_mobile)
  let phone = await buscarTelefonePacienteMultiFonte(patient_id, consultasState);

  // 2) se ainda assim não houver, pergunta e envia mesmo assim (sem salvar)
  if (!phone) {
    const informado = window.prompt(
      `Esse paciente não tem telefone nas fontes conhecidas.\n` +
      `Informe um número para envio (DDD+número). Ex.: 79999998888`
    );
    if (!informado || !informado.trim()) throw new Error("Telefone não informado.");
    phone = informado.trim();
  }

  // 3) normaliza (opcional) — se desativada, segue como veio
  const toSend = maybeToE164(phone);
  if (!toSend) throw new Error("Telefone inválido.");

  // 4) nomes p/ mensagem
  const [medicoNome, pacienteNome] = await Promise.all([
    getMedicoNome(doctor_id),
    getPacienteNome(patient_id),
  ]);

  const scheduledISO = new Date(scheduled_at).toISOString();
  const message = montarMensagemLembrete(pacienteNome, medicoNome, scheduledISO);

  // 5) dispara
  await enviarSMS({ phone_number: toSend, message, patient_id });
}

// =======================================================
// 🔹 API: LISTAGEM PAGINADA (com nomes)
// =======================================================
async function fetchConsultasPage({ page = 0, pageSize = PAGE_SIZE }) {
  // Usa select com FKs: patients e doctors
  const headers = await getHeaders();
  const offset = page * pageSize;

  const url =
    `${API_BASE}/appointments` +
    `?select=id,patient_id,doctor_id,scheduled_at,duration_minutes,` +
    `patients:patient_id(full_name,phone_mobile,cpf),` +
    `doctors:doctor_id(full_name)` +
    `&order=scheduled_at.desc` +
    `&limit=${pageSize}&offset=${offset}`;

  const res = await fetch(encodeURI(url), { headers });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Falha ao buscar consultas: ${res.status} — ${txt}`);
  }
  const rows = await res.json();

  // normaliza para o mesmo shape que a tabela usa
  const mapped = rows.map((r) => ({
    id: r.id,
    patient_id: r.patient_id,
    doctor_id: r.doctor_id,
    scheduled_at: r.scheduled_at,
    duration_minutes: r.duration_minutes,
    paciente_nome: r?.patients?.full_name || "—",
    paciente_telefone: r?.patients?.phone_mobile || "—",
    cpf: r?.patients?.cpf || "—",
    medico_nome: r?.doctors?.full_name || "—",
  }));

  return mapped;
}

// =======================================================
// 🔹 COMPONENTE PRINCIPAL
// =======================================================
export default function Consultas() {
  const [consultas, setConsultas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [erro, setErro] = useState("");

  const [pacientes, setPacientes] = useState([]);
  const [medicos, setMedicos] = useState([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    doctor_id: "",
    patient_id: "",
    scheduled_at: "",
    duration_minutes: 30,
  });

  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const [searchTerm, setSearchTerm] = useState("");

  // sentinel para infinite scroll
  const sentinelRef = useRef(null);
  const tableScrollRef = useRef(null);

  // ===================== Carrega pacientes/médicos para selects =====================
  async function carregarPacientesEMedicos() {
    try {
      const headers = await getHeaders();
      const [resPac, resMed] = await Promise.all([
        fetch(`${API_BASE}/patients?select=id,full_name&order=full_name.asc`, { headers }),
        fetch(`${API_BASE}/doctors?select=id,full_name&order=full_name.asc`, { headers }),
      ]);
      const pacientesData = await resPac.json();
      const medicosData = await resMed.json();
      setPacientes(Array.isArray(pacientesData) ? pacientesData : []);
      setMedicos(Array.isArray(medicosData) ? medicosData : []);
    } catch {}
  }

  // ===================== Primeira página =====================
  useEffect(() => {
    (async () => {
      setCarregando(true);
      setErro("");
      try {
        const primeira = await fetchConsultasPage({ page: 0 });
        setConsultas(primeira);
        setPage(0);
        setHasMore(primeira.length === PAGE_SIZE);
      } catch (e) {
        console.error(e);
        setErro("Não foi possível carregar as consultas.");
      } finally {
        setCarregando(false);
      }
    })();

    carregarPacientesEMedicos();
  }, []);

  // ===================== Carregar mais (infinite) =====================
  const loadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const chunk = await fetchConsultasPage({ page: nextPage });
      setConsultas((prev) => [...prev, ...chunk]);
      setPage(nextPage);
      setHasMore(chunk.length === PAGE_SIZE);
    } catch (e) {
      console.warn("Falha ao carregar mais:", e);
    } finally {
      setLoadingMore(false);
    }
  };

  // IntersectionObserver no sentinel dentro do container rolável
  useEffect(() => {
    const container = tableScrollRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const hit = entries[0];
        if (hit.isIntersecting) {
          // perto do fim → carrega mais
          loadMore();
        }
      },
      {
        root: container,      // root é o container rolável
        rootMargin: "0px",
        threshold: 1.0,
      }
    );

    const sentinel = sentinelRef.current;
    if (sentinel) observer.observe(sentinel);
    return () => {
      if (sentinel) observer.unobserve(sentinel);
      observer.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sentinelRef.current, tableScrollRef.current, page, hasMore, loadingMore]);

  // ===================== CRUD =====================
  async function criarConsulta(body) {
    try {
      const headers = await getHeaders();
      const res = await fetch(`${API_BASE}/appointments`, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });

      const txt = await res.text();
      if (!res.ok) throw new Error("Falha ao criar consulta");

      // SMS após criar
      try {
        await dispararSmsParaPaciente(
          {
            patient_id: body.patient_id,
            doctor_id: body.doctor_id,
            scheduled_at: body.scheduled_at,
          },
          consultas
        );
      } catch (smsErr) {
        console.warn("[Consultas] SMS falhou (não bloqueia):", smsErr);
      }

      // Recarrega do zero para incluir a nova (ou você pode fazer um fetch só da 1ª página e prepend)
      setCarregando(true);
      const primeira = await fetchConsultasPage({ page: 0 });
      setConsultas(primeira);
      setPage(0);
      setHasMore(primeira.length === PAGE_SIZE);
      setCarregando(false);

      fecharModal();
      alert("Consulta criada e SMS (se possível) enviado.");
    } catch (err) {
      alert("Erro ao criar consulta (veja o console).");
    }
  }

  async function atualizarConsulta(id, body) {
    try {
      const headers = await getHeaders();
      const res = await fetch(`${API_BASE}/appointments?id=eq.${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify(body),
      });

      const txt = await res.text();
      if (!res.ok) throw new Error("Falha ao atualizar consulta");

      // SMS após atualizar (remarcação)
      try {
        await dispararSmsParaPaciente(
          {
            patient_id: body.patient_id,
            doctor_id: body.doctor_id,
            scheduled_at: body.scheduled_at,
          },
          consultas
        );
      } catch (smsErr) {
        console.warn("[Consultas] SMS falhou (não bloqueia):", smsErr);
      }

      // Atualiza a lista atual (reload 1ª página)
      setCarregando(true);
      const primeira = await fetchConsultasPage({ page: 0 });
      setConsultas(primeira);
      setPage(0);
      setHasMore(primeira.length === PAGE_SIZE);
      setCarregando(false);

      fecharModal();
      alert("Consulta atualizada e SMS (se possível) enviado.");
    } catch (err) {
      alert("Erro ao atualizar consulta (veja o console).");
    }
  }

  async function excluirConsulta(id) {
    if (!window.confirm("Deseja realmente excluir esta consulta?")) return;
    try {
      const headers = await getHeaders({ Prefer: "return=minimal" });
      const res = await fetch(`${API_BASE}/appointments?id=eq.${encodeURIComponent(id)}`, {
        method: "DELETE",
        headers,
      });
      const txt = await res.text();
      if (!res.ok) throw new Error("Falha ao excluir consulta");

      // Remove localmente
      setConsultas((prev) => prev.filter((c) => c.id !== id));
      alert("Consulta excluída com sucesso!");
    } catch (err) {
      alert("Erro ao excluir consulta (veja o console).");
    }
  }

  // ===================== MODAL =====================
  function abrirModalParaNova() {
    setEditingId(null);
    setForm({
      doctor_id: "",
      patient_id: "",
      scheduled_at: new Date().toISOString().slice(0, 16),
      duration_minutes: 30,
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

    const isoScheduled = new Date(form.scheduled_at).toISOString();

    const body = {
      doctor_id: form.doctor_id,
      patient_id: form.patient_id,
      scheduled_at: isoScheduled,
      duration_minutes: form.duration_minutes ? Number(form.duration_minutes) : 30,
      created_by: form.doctor_id,
    };

    if (editingId) {
      await atualizarConsulta(editingId, body);
    } else {
      await criarConsulta(body);
    }
  }

  // ===================== SEARCH (client-side) =====================
  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return consultas;
    return consultas.filter((c) => {
      const campos = [
        c.paciente_nome || "",
        c.medico_nome || "",
        c.cpf || "",
        c.paciente_telefone || "",
        c.id || "",
      ];
      return campos.some((v) => String(v).toLowerCase().includes(q));
    });
  }, [consultas, searchTerm]);

  // Heurística: se está filtrado e tem poucos itens, tenta carregar mais páginas automaticamente
  useEffect(() => {
    if (searchTerm && filtered.length < PAGE_SIZE && hasMore && !loadingMore) {
      loadMore();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, filtered.length]);

  // ===================== RENDER =====================
  return (
    <div className="secretary-page-wrap">
      <div className="appbar">
        <div className="appbar-inner">
          <div className="brand">
            <div>
              <h1>MedConnnect</h1>
              <small>Histórico de Consultas</small>
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" }}>
            {/* 🔎 Barra de pesquisa */}
            <input
              type="search"
              placeholder="Pesquisar (paciente, médico, CPF, telefone)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                padding: "8px 12px",
                border: "1px solid #ddd",
                borderRadius: 8,
                minWidth: 0,
                maxWidth: 420,
              }}
            />
            <button className="btn" onClick={abrirModalParaNova}>
              <i className="fa-solid fa-plus"></i> Nova Consulta
            </button>
          </div>
        </div>
      </div>

      <main className="wrap">
        <section className="card">
          <div className="card-header">
            <h2>
              Consultas{" "}
              {!carregando && (
                <small style={{ fontWeight: 400, color: "#666" }}>
                  ({filtered.length}{searchTerm ? ` / ${consultas.length}` : ""})
                </small>
              )}
            </h2>
          </div>

          <div className="card-content">
            {carregando ? (
              <div className="empty note">Carregando consultas...</div>
            ) : erro ? (
              <div className="empty note error">{erro}</div>
            ) : (
              <>
                {/* Container rolável próprio da tabela */}
                <div
                  ref={tableScrollRef}
                  className="table-scroll"
                  style={{
                    maxHeight: "60vh",
                    overflow: "auto",
                    border: "1px solid #eee",
                    borderRadius: 8,
                  }}
                >
                  <table className="table">
                    <thead className="thead" style={{ position: "sticky", top: 0, background: "#fff", zIndex: 1 }}>
                      <tr>
                        <th>CPF</th>
                        <th>Paciente</th>
                        <th>Telefone</th>
                        <th>Médico</th>
                        <th>Data</th>
                        <th>Duração</th>
                        <th style={{ textAlign: "right" }}>Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.length === 0 ? (
                        <tr className="row">
                          <td colSpan={7} className="empty">Nenhuma consulta encontrada.</td>
                        </tr>
                      ) : (
                        filtered.map((c) => (
                          <tr key={c.id} className="row">
                            <td>{c.cpf || "—"}</td>
                            <td>{c.paciente_nome || "—"}</td>
                            <td>{c.paciente_telefone || "—"}</td>
                            <td>{c.medico_nome || "—"}</td>
                            <td>
                              {c.scheduled_at
                                ? new Date(c.scheduled_at).toLocaleString("pt-BR")
                                : "—"}
                            </td>
                            <td>{c.duration_minutes ? `${c.duration_minutes} min` : "—"}</td>
                            <td style={{ textAlign: "right" }} className="actions">
                              <button className="ghost" onClick={() => abrirModalParaEditar(c)}>
                                ✏️ Editar
                              </button>
                              <button className="ghost" onClick={() => excluirConsulta(c.id)}>
                                🗑️ Excluir
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                      {/* Sentinel para infinite scroll dentro do container */}
                      <tr>
                        <td colSpan={7}>
                          <div ref={sentinelRef} style={{ height: 1 }} />
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div style={{ marginTop: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <small style={{ color: "#666" }}>
                    {loadingMore ? "Carregando mais..." : hasMore ? "Role até o fim para carregar mais" : "Fim da lista"}
                  </small>
                  {!hasMore && consultas.length > 0 && (
                    <small style={{ color: "#666" }}>Total carregado: {consultas.length}</small>
                  )}
                </div>
              </>
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
                onChange={(e) => atualizarCampo("scheduled_at", e.target.value)}
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
                disabled={!form.doctor_id || !form.patient_id || !form.scheduled_at}
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
      <AccessibilityMenu />
    </div>
  );
}
