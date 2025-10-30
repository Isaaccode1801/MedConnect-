import React, { useEffect, useState } from "react";
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

  // Novos estados para médicos e pacientes
  const [medicos, setMedicos] = useState([]);
  const [pacientes, setPacientes] = useState([]);

  // modal state
  const [showModal, setShowModal] = useState(false);

  // form state da nova consulta
  const [formConsulta, setFormConsulta] = useState({
    doctor_id: "",
    patient_id: "",
    scheduled_at: "",
    duration_minutes: 30,
  });

  // sucesso/erro após criar
  const [createMsg, setCreateMsg] = useState("");
  const [createErr, setCreateErr] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // ===========================
  // 1. Buscar agendamentos + hidratar nomes
  // ===========================
  useEffect(() => {
    async function carregarConsultas() {
      setLoading(true);
      setErro("");

      try {
        // 1) Buscar todas as consultas cruas (sem join)
        const base = import.meta.env.VITE_SUPABASE_URL;
        const urlAppointments =
          `${base}/rest/v1/appointments` +
          `?select=id,scheduled_at,duration_minutes,status,doctor_id,patient_id`;
        const respApp = await fetch(urlAppointments, {
          headers: getAuthHeaders(),
        });

        if (!respApp.ok) {
          const txt = await respApp.text();
          throw new Error(
            `Falha ao carregar consultas (${respApp.status}): ${txt}`
          );
        }

        const dataApp = await respApp.json();
        const listaConsultas = Array.isArray(dataApp) ? dataApp : [];

        // 2) Extrair IDs únicos de médicos e pacientes
        const doctorIds = [
          ...new Set(listaConsultas.map(c => c.doctor_id).filter(Boolean)),
        ];
        const patientIds = [
          ...new Set(listaConsultas.map(c => c.patient_id).filter(Boolean)),
        ];

        // 3) Buscar nomes dos médicos
        let mapaDoctors = {};
        if (doctorIds.length > 0) {
          // formata in.(id1,id2,id3)
          const inDoctors = `(${doctorIds.map(id => `"${id}"`).join(",")})`;
          const urlDocs =
            `${base}/rest/v1/doctors` +
            `?id=in.${encodeURIComponent(inDoctors)}` +
            `&select=id,full_name`;
          const respDocs = await fetch(urlDocs, {
            headers: getAuthHeaders(),
          });
          if (respDocs.ok) {
            const arrDocs = await respDocs.json();
            mapaDoctors = Object.fromEntries(
              (arrDocs || []).map(d => [d.id, d.full_name || "—"])
            );
          } else {
            console.warn("[AppointmentsPage] não consegui nomes de doctors");
          }
        }

        // 4) Buscar nomes dos pacientes
        let mapaPatients = {};
        if (patientIds.length > 0) {
          const inPatients = `(${patientIds.map(id => `"${id}"`).join(",")})`;
          const urlPacs =
            `${base}/rest/v1/patients` +
            `?id=in.${encodeURIComponent(inPatients)}` +
            `&select=id,full_name`;
          const respPacs = await fetch(urlPacs, {
            headers: getAuthHeaders(),
          });
          if (respPacs.ok) {
            const arrPacs = await respPacs.json();
            mapaPatients = Object.fromEntries(
              (arrPacs || []).map(p => [p.id, p.full_name || "—"])
            );
          } else {
            console.warn("[AppointmentsPage] não consegui nomes de patients");
          }
        }

        // 5) Anexar names a cada consulta
        const enriquecidas = listaConsultas.map(c => ({
          ...c,
          doctor_name: c.doctor_id ? mapaDoctors[c.doctor_id] || "—" : "—",
          patient_name: c.patient_id ? mapaPatients[c.patient_id] || "—" : "—",
        }));

        setConsultas(enriquecidas);
      } catch (e) {
        console.error("[AppointmentsPage] erro GET consultas", e);
        setErro(
          "Não foi possível carregar os agendamentos. Verifique permissões/RLS."
        );
      } finally {
        setLoading(false);
      }
    }

    async function carregarMedicos() {
      try {
        const base = import.meta.env.VITE_SUPABASE_URL;
        const url = `${base}/rest/v1/doctors?select=id,full_name&order=full_name.asc`;
        const resp = await fetch(url, { headers: getAuthHeaders() });
        if (resp.ok) {
          const data = await resp.json();
          setMedicos(data);
        }
      } catch (e) {
        console.error("[AppointmentsPage] Erro ao carregar médicos:", e);
      }
    }

    async function carregarPacientes() {
      try {
        const base = import.meta.env.VITE_SUPABASE_URL;
        const url = `${base}/rest/v1/patients?select=id,full_name&order=full_name.asc`;
        const resp = await fetch(url, { headers: getAuthHeaders() });
        if (resp.ok) {
          const data = await resp.json();
          setPacientes(data);
        }
      } catch (e) {
        console.error("[AppointmentsPage] Erro ao carregar pacientes:", e);
      }
    }

    carregarConsultas();
    carregarMedicos();
    carregarPacientes();
  }, []);

  // ===========================
  // 2. Abrir/fechar modal
  // ===========================
  function abrirModal() {
    setCreateMsg("");
    setCreateErr("");
    setFormConsulta({
      doctor_id: "",
      patient_id: "",
      scheduled_at: "",
      duration_minutes: 30,
    });
    setShowModal(true);
  }

  function fecharModal() {
    if (submitting) return;
    setShowModal(false);
  }

  // ===========================
  // 3. Submit Nova Consulta
  // ===========================
  async function handleCreateConsulta(e) {
    e.preventDefault();
    setCreateMsg("");
    setCreateErr("");

    if (
      !formConsulta.doctor_id ||
      !formConsulta.patient_id ||
      !formConsulta.scheduled_at
    ) {
      setCreateErr("Preencha médico, paciente e data/hora.");
      return;
    }

    setSubmitting(true);

    try {
      // pegar quem está criando via JWT salvo
      let created_by = "";
      try {
        const bearer = localStorage.getItem("user_token");
        if (bearer && bearer.startsWith("ey")) {
          const payload = JSON.parse(atob(bearer.split(".")[1] || ""));
          created_by = payload?.sub || "";
        }
      } catch (_) {}

      const body = {
        doctor_id: formConsulta.doctor_id,
        patient_id: formConsulta.patient_id,
        scheduled_at: new Date(formConsulta.scheduled_at).toISOString(),
        duration_minutes: Number(formConsulta.duration_minutes) || 30,
        created_by: created_by || formConsulta.doctor_id,
      };

      const postUrl = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/appointments`;
      const resp = await fetch(postUrl, {
        method: "POST",
        headers: {
          ...getAuthHeaders(),
          Prefer: "return=representation",
        },
        body: JSON.stringify(body),
      });

      if (!resp.ok) {
        const txt = await resp.text();
        throw new Error(
          `Erro ao criar consulta (${resp.status}): ${txt}`
        );
      }

      const retorno = await resp.json();
      const criados = Array.isArray(retorno) ? retorno : [retorno];

      // precisamos re-hidratar nome pros criados também
      const novosEnriquecidos = criados.map(c => ({
        ...c,
        doctor_name: c.doctor_id || "—",
        patient_name: c.patient_id || "—",
      }));

      // concatena no topo
      setConsultas(prev => [...novosEnriquecidos, ...prev]);

      setCreateMsg("Consulta criada com sucesso ✨");
      setShowModal(false);
    } catch (err) {
      console.error("[AppointmentsPage] erro POST consulta", err);
      setCreateErr(
        err.message || "Não foi possível criar a consulta. Cheque permissões."
      );
    } finally {
      setSubmitting(false);
    }
  }

  // ===========================
  // 4. Render
  // ===========================
  return (
    <>
      <style>{`
        .appointments-wrapper {
          background: #fff;
          border-radius: 0.75rem;
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1),
                      0 2px 4px -2px rgba(0,0,0,0.1);
          padding: 1.5rem;
          color: #1F2937;
          font-family: 'Poppins', sans-serif;
        }
        .appointments-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          flex-wrap: wrap;
          gap: 1rem;
          margin-bottom: 1.5rem;
        }
        .appointments-title {
          display: flex;
          flex-direction: column;
        }
        .appointments-title h2 {
          font-size: 1.1rem;
          font-weight: 600;
          margin: 0;
          color: #1F2937;
        }
        .appointments-title span {
          font-size: 0.8rem;
          color: #6B7280;
        }
        .appointments-actions {
          display: flex;
          gap: 0.75rem;
          flex-wrap: wrap;
        }
        .btn-new {
          background: #3B82F6;
          color: #fff;
          border: 0;
          border-radius: 0.5rem;
          padding: 0.6rem 1rem;
          font-size: 0.9rem;
          font-weight: 500;
          cursor: pointer;
          box-shadow: 0 10px 20px rgba(59,130,246,0.25);
          transition: all .15s;
        }
        .btn-new:hover {
          filter: brightness(1.07);
          transform: translateY(-1px);
        }
        .appointments-table {
          width: 100%;
          border-collapse: collapse;
        }
        .appointments-table th {
          text-align: left;
          font-size: 0.75rem;
          text-transform: uppercase;
          color: #6B7280;
          font-weight: 600;
          border-bottom: 1px solid #E5E7EB;
          padding: 0.75rem 0.5rem;
        }
        .appointments-table td {
          font-size: 0.9rem;
          color: #1F2937;
          border-bottom: 1px solid #E5E7EB;
          padding: 0.75rem 0.5rem;
          vertical-align: top;
        }
        .status-pill {
          display: inline-block;
          font-size: 0.75rem;
          padding: 0.25rem 0.6rem;
          border-radius: 999px;
          font-weight: 500;
        }
        .status-upcoming {
          background: #EFF6FF;
          color: #1D4ED8;
        }
        .status-done {
          background: #D1FAE5;
          color: #065F46;
        }
        .status-cancel {
          background: #FEE2E2;
          color: #991B1B;
        }
        /* ===== Modal styles ===== */
        .overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.5);
          display: grid;
          place-items: center;
          z-index: 9999;
        }
        .modal-card {
          background: #fff;
          border-radius: 0.75rem;
          box-shadow: 0 25px 60px rgba(0,0,0,0.3);
          width: 100%;
          max-width: 400px;
          padding: 1.25rem 1.25rem 1rem;
          position: relative;
          font-family: 'Poppins', sans-serif;
        }
        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 1rem;
        }
        .modal-header h3 {
          margin: 0;
          font-size: 1rem;
          font-weight: 600;
          color: #111827;
        }
        .close-btn {
          background: none;
          border: 0;
          color: #6B7280;
          cursor: pointer;
          font-size: 0.9rem;
        }
        .form-field {
          display: flex;
          flex-direction: column;
          margin-bottom: 0.75rem;
        }
        .form-field label {
          font-size: 0.8rem;
          font-weight: 500;
          color: #374151;
          margin-bottom: 0.4rem;
        }
        .form-field input,
        .form-field select {
          border: 1px solid #D1D5DB;
          border-radius: 0.5rem;
          padding: 0.6rem 0.75rem;
          font-size: 0.9rem;
          line-height: 1.2rem;
          font-family: inherit;
        }
        .submit-btn {
          width: 100%;
          background: #3B82F6;
          border: 0;
          border-radius: 0.5rem;
          color: #fff;
          font-weight: 600;
          padding: 0.7rem 1rem;
          font-size: 0.9rem;
          cursor: pointer;
          box-shadow: 0 15px 30px rgba(59,130,246,0.3);
          transition: all .15s;
          margin-top: 0.5rem;
        }
        .submit-btn[disabled] {
          opacity: .6;
          cursor: not-allowed;
          box-shadow: none;
        }
        .msg-ok {
          background: #ECFDF5;
          color: #065F46;
          border: 1px solid #A7F3D0;
          border-radius: 0.5rem;
          font-size: 0.8rem;
          padding: 0.5rem 0.75rem;
          margin-bottom: 0.75rem;
        }
        .msg-err {
          background: #FEF2F2;
          color: #991B1B;
          border: 1px solid #FECACA;
          border-radius: 0.5rem;
          font-size: 0.8rem;
          padding: 0.5rem 0.75rem;
          margin-bottom: 0.75rem;
        }
      `}</style>

      <div className="appointments-wrapper">
        <div className="appointments-header">
          <div className="appointments-title">
            <h2>Agendamentos</h2>
            <span>Lista completa de consultas marcadas</span>
          </div>

          <div className="appointments-actions">
            <button className="btn-new" onClick={abrirModal}>
              + Nova Consulta
            </button>
          </div>
        </div>

        {loading ? (
          <div style={{ fontSize: ".9rem", color: "#6B7280" }}>
            Carregando consultas...
          </div>
        ) : erro ? (
          <div style={{ fontSize: ".9rem", color: "#B91C1C" }}>{erro}</div>
        ) : (
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
              {consultas.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    style={{
                      fontSize: ".9rem",
                      color: "#6B7280",
                      paddingTop: "1rem",
                    }}
                  >
                    Nenhuma consulta encontrado.
                  </td>
                </tr>
              ) : (
                consultas.map((c) => (
                  <tr key={c.id || `${c.patient_id}-${c.scheduled_at}`}>
                    <td>{c.patient_name || "—"}</td>
                    <td>{c.doctor_name || "—"}</td>
                    <td>{formatDateTime(c.scheduled_at)}</td>
                    <td>
                      {c.duration_minutes
                        ? `${c.duration_minutes} min`
                        : "—"}
                    </td>
                    <td>
                      <span
                        className={
                          "status-pill " +
                          (c.status === "cancelled"
                            ? "status-cancel"
                            : c.status === "done"
                            ? "status-done"
                            : "status-upcoming")
                        }
                      >
                        {c.status || "upcoming"}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="overlay" onClick={fecharModal}>
          <div
            className="modal-card"
            onClick={(e) => e.stopPropagation()} // não fecha se clicar dentro
          >
            <div className="modal-header">
              <h3>Nova Consulta</h3>
              <button
                className="close-btn"
                onClick={fecharModal}
                disabled={submitting}
              >
                <FaTimes />
              </button>
            </div>

            {createMsg && <div className="msg-ok">{createMsg}</div>}
            {createErr && <div className="msg-err">{createErr}</div>}

            <form onSubmit={handleCreateConsulta}>
              <div className="form-field">
                <label>Médico</label>
                <select
                  value={formConsulta.doctor_id}
                  onChange={(e) =>
                    setFormConsulta((f) => ({ ...f, doctor_id: e.target.value }))
                  }
                  required
                >
                  <option value="">Selecione um médico</option>
                  {medicos.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.full_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-field">
                <label>Paciente</label>
                <select
                  value={formConsulta.patient_id}
                  onChange={(e) =>
                    setFormConsulta((f) => ({ ...f, patient_id: e.target.value }))
                  }
                  required
                >
                  <option value="">Selecione um paciente</option>
                  {pacientes.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.full_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-field">
                <label>Data e hora</label>
                <input
                  type="datetime-local"
                  value={formConsulta.scheduled_at}
                  onChange={(e) =>
                    setFormConsulta((f) => ({
                      ...f,
                      scheduled_at: e.target.value,
                    }))
                  }
                  required
                />
              </div>

              <div className="form-field">
                <label>Duração (minutos)</label>
                <input
                  type="number"
                  min={5}
                  max={180}
                  value={formConsulta.duration_minutes}
                  onChange={(e) =>
                    setFormConsulta((f) => ({
                      ...f,
                      duration_minutes: e.target.value,
                    }))
                  }
                />
              </div>

              <button
                className="submit-btn"
                type="submit"
                disabled={submitting}
              >
                {submitting ? "Salvando..." : "Salvar Consulta"}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}