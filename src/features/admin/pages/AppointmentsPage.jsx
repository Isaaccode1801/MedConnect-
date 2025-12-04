import React, { useEffect, useMemo, useState } from "react";
import { FaTimes } from "react-icons/fa";
import { getAuthHeaders } from "@/lib/pacientesService";

// util pra formatar data bonitinha na tabela
function formatDateTime(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  const dt = d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const tm = d.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${dt} ${tm}`;
}

export default function AppointmentsPage() {
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");
  const [consultas, setConsultas] = useState([]);

  // filtros UI
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // combos
  const [medicos, setMedicos] = useState([]);
  const [pacientes, setPacientes] = useState([]);

  // modal
  const [showModal, setShowModal] = useState(false);
  const [createMsg, setCreateMsg] = useState("");
  const [createErr, setCreateErr] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // form
  const [formConsulta, setFormConsulta] = useState({
    doctor_id: "",
    patient_id: "",
    scheduled_at: "",
    duration_minutes: 30,
  });

  useEffect(() => {
    let alive = true;
    async function carregarConsultas() {
      setLoading(true);
      setErro("");
      try {
        const base = import.meta.env.VITE_SUPABASE_URL;
        const respApp = await fetch(
          `${base}/rest/v1/appointments?select=id,scheduled_at,duration_minutes,status,doctor_id,patient_id`,
          { headers: getAuthHeaders() }
        );
        if (!respApp.ok) {
          const txt = await respApp.text();
          throw new Error(`Falha ao carregar consultas (${respApp.status}): ${txt}`);
        }
        const listaConsultas = await respApp.json();

        const doctorIds = [...new Set((listaConsultas || []).map(c => c.doctor_id).filter(Boolean))];
        const patientIds = [...new Set((listaConsultas || []).map(c => c.patient_id).filter(Boolean))];

        const [mapaDoctors, mapaPatients] = await Promise.all([
          (async () => {
            if (doctorIds.length === 0) return {};
            const inStr = `(${doctorIds.map(id => `"${id}"`).join(",")})`;
            const r = await fetch(`${base}/rest/v1/doctors?id=in.${encodeURIComponent(inStr)}&select=id,full_name`, { headers: getAuthHeaders() });
            if (!r.ok) return {};
            const arr = await r.json();
            return Object.fromEntries(arr.map(d => [d.id, d.full_name || "—"]));
          })(),
          (async () => {
            if (patientIds.length === 0) return {};
            const inStr = `(${patientIds.map(id => `"${id}"`).join(",")})`;
            const r = await fetch(`${base}/rest/v1/patients?id=in.${encodeURIComponent(inStr)}&select=id,full_name`, { headers: getAuthHeaders() });
            if (!r.ok) return {};
            const arr = await r.json();
            return Object.fromEntries(arr.map(p => [p.id, p.full_name || "—"]));
          })(),
        ]);

        const enriquecidas = (listaConsultas || []).map(c => ({
          ...c,
          doctor_name: c.doctor_id ? (mapaDoctors[c.doctor_id] || "—") : "—",
          patient_name: c.patient_id ? (mapaPatients[c.patient_id] || "—") : "—",
        }));
        if (alive) setConsultas(enriquecidas);
      } catch (e) {
        console.error("[AppointmentsPage] erro GET consultas", e);
        if (alive) setErro("Não foi possível carregar os agendamentos. Verifique permissões/RLS.");
      } finally {
        if (alive) setLoading(false);
      }
    }

    async function carregarCombos() {
      try {
        const base = import.meta.env.VITE_SUPABASE_URL;
        const [r1, r2] = await Promise.all([
          fetch(`${base}/rest/v1/doctors?select=id,full_name&order=full_name.asc`, { headers: getAuthHeaders() }),
          fetch(`${base}/rest/v1/patients?select=id,full_name&order=full_name.asc`, { headers: getAuthHeaders() }),
        ]);
        if (r1.ok) setMedicos(await r1.json());
        if (r2.ok) setPacientes(await r2.json());
      } catch (e) {
        console.warn("[AppointmentsPage] combos", e);
      }
    }

    carregarConsultas();
    carregarCombos();
    return () => { alive = false; };
  }, []);

  const linhasFiltradas = useMemo(() => {
    let arr = Array.isArray(consultas) ? [...consultas] : [];
    const term = q.trim().toLowerCase();
    if (term) {
      arr = arr.filter(c => (c.patient_name || "").toLowerCase().includes(term) || (c.doctor_name || "").toLowerCase().includes(term));
    }
    if (statusFilter !== "all") {
      arr = arr.filter(c => (c.status || "").toLowerCase() === statusFilter);
    }
    if (dateFrom) {
      const from = new Date(dateFrom).getTime();
      arr = arr.filter(c => new Date(c.scheduled_at).getTime() >= from);
    }
    if (dateTo) {
      const to = new Date(dateTo).getTime();
      arr = arr.filter(c => new Date(c.scheduled_at).getTime() <= to);
    }
    return arr.sort((a,b) => new Date(b.scheduled_at) - new Date(a.scheduled_at));
  }, [consultas, q, statusFilter, dateFrom, dateTo]);

  function abrirModal() {
    setCreateMsg("");
    setCreateErr("");
    setFormConsulta({ doctor_id: "", patient_id: "", scheduled_at: "", duration_minutes: 30 });
    setShowModal(true);
  }

  function fecharModal() { if (!submitting) setShowModal(false); }

  function limparFiltros() { setQ(""); setStatusFilter("all"); setDateFrom(""); setDateTo(""); }

  async function handleCreateConsulta(e) {
    e.preventDefault();
    setCreateMsg(""); setCreateErr("");
    if (!formConsulta.doctor_id || !formConsulta.patient_id || !formConsulta.scheduled_at) {
      setCreateErr("Preencha médico, paciente e data/hora.");
      return;
    }
    setSubmitting(true);
    try {
      let created_by = "";
      try {
        const bearer = localStorage.getItem("user_token");
        if (bearer && bearer.startsWith("ey")) {
          const payload = JSON.parse(atob(bearer.split(".")[1] || ""));
          created_by = payload?.sub || "";
        }
      } catch(_){}

      const body = {
        doctor_id: formConsulta.doctor_id,
        patient_id: formConsulta.patient_id,
        scheduled_at: new Date(formConsulta.scheduled_at).toISOString(),
        duration_minutes: Number(formConsulta.duration_minutes) || 30,
        created_by: created_by || formConsulta.doctor_id,
      };
      const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/appointments`;
      const resp = await fetch(url, { method: 'POST', headers: { ...getAuthHeaders(), Prefer: 'return=representation' }, body: JSON.stringify(body) });
      if (!resp.ok) {
        const txt = await resp.text();
        throw new Error(`Erro ao criar consulta (${resp.status}): ${txt}`);
      }
      const retorno = await resp.json();
      const criados = Array.isArray(retorno) ? retorno : [retorno];
      const novos = criados.map(c => ({ ...c, doctor_name: c.doctor_id || '—', patient_name: c.patient_id || '—' }));
      setConsultas(prev => [...novos, ...prev]);
      setCreateMsg('Consulta criada com sucesso ✨');
      setShowModal(false);
    } catch (err) {
      setCreateErr(err?.message || 'Não foi possível criar a consulta. Cheque permissões.');
    } finally { setSubmitting(false); }
  }

  return (
    <>
      <style>{`
.appointments-wrapper { background:var(--color-bg-card); border-radius:.75rem; box-shadow:var(--shadow-md); padding:1.5rem; color:var(--color-text-primary); font-family:'Poppins',sans-serif; }
.appointments-header { display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:1rem; margin-bottom:1.25rem; }
.appointments-title h2 { font-size:1.1rem; font-weight:600; margin:0; color:var(--color-text-primary); }
.appointments-title span { font-size:.8rem; color:var(--color-text-muted); }
.appointments-actions { display:flex; flex-direction:column; gap:.75rem; align-items:stretch; }
.filters { display:grid; grid-template-columns:1fr repeat(3, minmax(140px, 1fr)); gap:.5rem; }
@media (max-width:900px){ .filters{ grid-template-columns:1fr 1fr; } }
.filter-input,.filter-select{ border:1px solid var(--color-border); border-radius:.5rem; padding:.55rem .75rem; font-size:.9rem; background:var(--color-bg-card); color:var(--color-text-primary); }
.filter-input::placeholder { color:var(--color-text-muted); }
.filters-row{ display:flex; gap:.5rem; align-items:center; flex-wrap:wrap; }
.btn-new { background:var(--color-primary); color:#fff; border:0; border-radius:.5rem; padding:.6rem 1rem; font-size:.9rem; font-weight:500; cursor:pointer; box-shadow:0 10px 20px rgba(13,148,136,.25); transition:all .15s; }
.btn-new:hover{ filter:brightness(1.07); transform:translateY(-1px); }
.btn-clear{ background:transparent; color:var(--color-primary); border:1px solid rgba(13,148,136,.3); border-radius:.5rem; padding:.55rem .9rem; font-size:.85rem; cursor:pointer; }
.btn-clear:hover{ background:rgba(13,148,136,.1); }
.table-scroll{ overflow-x:auto; border-radius:.75rem; }
.appointments-table{ width:100%; border-collapse:collapse; min-width:760px; }
.appointments-table th{ text-align:left; font-size:.75rem; text-transform:uppercase; color:var(--color-text-muted); font-weight:600; border-bottom:1px solid var(--color-border); padding:.75rem .75rem; position:sticky; top:0; background:var(--color-bg-card); z-index:1; }
.appointments-table td{ font-size:.9rem; color:var(--color-text-primary); border-bottom:1px solid var(--color-border); padding:.75rem .75rem; vertical-align:top; }
.appointments-table tbody tr:nth-child(even){ background:var(--color-bg-tertiary); }
.appointments-table tbody tr:hover{ background:var(--color-bg-tertiary); }
.status-pill{ display:inline-block; font-size:.75rem; padding:.25rem .6rem; border-radius:999px; font-weight:500; }
.status-upcoming{ background:rgba(59,130,246,0.1); color:#3b82f6; }
.status-requested{ background:rgba(14,165,233,0.1); color:#0ea5e9; }
.status-confirmed{ background:rgba(34,197,94,0.1); color:#22c55e; }
.status-pending{ background:rgba(245,158,11,0.1); color:#f59e0b; }
.status-done{ background:rgba(22,163,74,0.1); color:#16a34a; }
.status-cancel,.status-cancelled{ background:rgba(239,68,68,0.1); color:#ef4444; }
.overlay{ position:fixed; inset:0; background:rgba(0,0,0,.5); display:grid; place-items:center; z-index:9999; }
.modal-card{ background:var(--color-bg-card); border-radius:.75rem; box-shadow:var(--shadow-xl); width:100%; max-width:400px; padding:1.25rem 1.25rem 1rem; position:relative; font-family:'Poppins',sans-serif; color:var(--color-text-primary); }
.modal-header{ display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:1rem; }
.modal-header h3{ margin:0; font-size:1rem; font-weight:600; color:var(--color-text-primary); }
.close-btn{ background:none; border:0; color:var(--color-text-muted); cursor:pointer; font-size:.9rem; }
.form-field{ display:flex; flex-direction:column; margin-bottom:.75rem; }
.form-field label{ font-size:.8rem; font-weight:500; color:var(--color-text-secondary); margin-bottom:.4rem; }
.form-field input,.form-field select{ border:1px solid var(--color-border); border-radius:.5rem; padding:.6rem .75rem; font-size:.9rem; line-height:1.2rem; font-family:inherit; background:var(--color-bg-card); color:var(--color-text-primary); }
.submit-btn{ width:100%; background:var(--color-primary); border:0; border-radius:.5rem; color:#fff; font-weight:600; padding:.7rem 1rem; font-size:.9rem; cursor:pointer; box-shadow:0 15px 30px rgba(13,148,136,.3); transition:all .15s; margin-top:.5rem; }
.submit-btn[disabled]{ opacity:.6; cursor:not-allowed; box-shadow:none; }
.msg-ok{ background:rgba(34,197,94,0.1); color:#16a34a; border:1px solid rgba(34,197,94,0.2); border-radius:.5rem; font-size:.8rem; padding:.5rem .75rem; margin-bottom:.75rem; }
.msg-err{ background:rgba(239,68,68,0.1); color:#dc2626; border:1px solid rgba(239,68,68,0.2); border-radius:.5rem; font-size:.8rem; padding:.5rem .75rem; margin-bottom:.75rem; }
      `}</style>

      <div className="appointments-wrapper">
        <div className="appointments-header">
          <div className="appointments-title">
            <h2>Agendamentos</h2>
            <span style={{ color: 'var(--color-text-muted)' }}>Lista completa de consultas marcadas</span>
          </div>
          <div className="appointments-actions" style={{minWidth:'280px', flex:1}}>
            <div className="filters">
              <input className="filter-input" placeholder="Buscar por paciente ou médico..." value={q} onChange={(e)=>setQ(e.target.value)} />
              <select className="filter-select" value={statusFilter} onChange={(e)=>setStatusFilter(e.target.value)}>
                <option value="all">Todos status</option>
                <option value="requested">Requested</option>
                <option value="confirmed">Confirmed</option>
                <option value="pending">Pending</option>
                <option value="done">Done</option>
                <option value="cancelled">Cancelled</option>
              </select>
              <input className="filter-input" type="date" value={dateFrom} onChange={(e)=>setDateFrom(e.target.value)} />
              <input className="filter-input" type="date" value={dateTo} onChange={(e)=>setDateTo(e.target.value)} />
            </div>
            <div className="filters-row">
              <button className="btn-new" onClick={abrirModal}>+ Nova Consulta</button>
              <button className="btn-clear" onClick={limparFiltros}>Limpar filtros</button>
              <div style={{marginLeft:'auto', fontSize:'.8rem', color:'var(--color-text-muted)'}}>Resultados: {linhasFiltradas.length}</div>
            </div>
          </div>
        </div>

        {loading ? (
          <div style={{ fontSize: ".9rem", color: "var(--color-text-muted)" }}>Carregando consultas...</div>
        ) : erro ? (
          <div style={{ fontSize: ".9rem", color: "#dc2626" }}>{erro}</div>
        ) : (
          <div className="table-scroll">
            <table className="appointments-table">
              <thead>
                <tr>
                  <th>Paciente</th>
                  <th>Médico</th>
                  <th>Data</th>
                  <th>Duração</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {linhasFiltradas.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ fontSize: ".9rem", color: "var(--color-text-muted)", paddingTop: "1rem" }}>
                      Nenhuma consulta encontrada.
                    </td>
                  </tr>
                ) : (
                  linhasFiltradas.map((c) => (
                    <tr key={c.id || `${c.patient_id}-${c.scheduled_at}`}>
                      <td style={{ color: 'var(--color-text-primary)' }}>{c.patient_name || "—"}</td>
                      <td style={{ color: 'var(--color-text-primary)' }}>{c.doctor_name || "—"}</td>
                      <td style={{ color: 'var(--color-text-primary)' }}>{formatDateTime(c.scheduled_at)}</td>
                      <td style={{ color: 'var(--color-text-primary)' }}>{c.duration_minutes ? `${c.duration_minutes} min` : "—"}</td>
                      <td>
                        <span className={
                          "status-pill " +
                          (c.status === "cancelled" ? "status-cancel" :
                           c.status === "done" ? "status-done" :
                           c.status === "requested" ? "status-requested" :
                           c.status === "confirmed" ? "status-confirmed" :
                           c.status === "pending" ? "status-pending" :
                           "status-upcoming")
                        }>
                          {c.status || "upcoming"}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="overlay" onClick={fecharModal}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Nova Consulta</h3>
              <button className="close-btn" onClick={fecharModal} disabled={submitting}>
                <FaTimes />
              </button>
            </div>

            {createMsg && <div className="msg-ok">{createMsg}</div>}
            {createErr && <div className="msg-err">{createErr}</div>}

            <form onSubmit={handleCreateConsulta}>
              <div className="form-field">
                <label>Médico</label>
                <select value={formConsulta.doctor_id} onChange={(e)=>setFormConsulta(f=>({...f, doctor_id:e.target.value}))} required>
                  <option value="">Selecione um médico</option>
                  {medicos.map((m) => (
                    <option key={m.id} value={m.id}>{m.full_name}</option>
                  ))}
                </select>
              </div>
              <div className="form-field">
                <label>Paciente</label>
                <select value={formConsulta.patient_id} onChange={(e)=>setFormConsulta(f=>({...f, patient_id:e.target.value}))} required>
                  <option value="">Selecione um paciente</option>
                  {pacientes.map((p) => (
                    <option key={p.id} value={p.id}>{p.full_name}</option>
                  ))}
                </select>
              </div>
              <div className="form-field">
                <label>Data e hora</label>
                <input type="datetime-local" value={formConsulta.scheduled_at} onChange={(e)=>setFormConsulta(f=>({...f, scheduled_at:e.target.value}))} required />
              </div>
              <div className="form-field">
                <label>Duração (minutos)</label>
                <input type="number" min={5} max={180} value={formConsulta.duration_minutes} onChange={(e)=>setFormConsulta(f=>({...f, duration_minutes:e.target.value}))} />
              </div>
              <button className="submit-btn" type="submit" disabled={submitting}>{submitting ? "Salvando..." : "Salvar Consulta"}</button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}