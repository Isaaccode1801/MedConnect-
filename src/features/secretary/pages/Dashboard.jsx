import { useEffect, useRef, useState } from "react";
import Chart from "chart.js/auto";
import AccessibilityMenu from "../../../components/ui/AccessibilityMenu";
import { listarConsultasComNomes, listarMedicos, listPacientes } from "../../../lib/pacientesService";

export default function Dashboard() {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  const [appointments, setAppointments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);

  // formata hora local para "HH:MM"
  function fmtTime(iso) {
    try {
      const d = new Date(iso);
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "--:--";
    }
  }

  // carrega dados das APIs (consultas, medicos, pacientes)
  useEffect(() => {
    let mounted = true;
    setLoading(true);

    async function loadAll() {
      try {
        const [appts, docs, pacs] = await Promise.all([
          listarConsultasComNomes().catch(() => []),
          listarMedicos().catch(() => []),
          listPacientes().catch(() => []),
        ]);
        if (!mounted) return;
        setAppointments(Array.isArray(appts) ? appts : []);
        setDoctors(Array.isArray(docs) ? docs : []);
        setPatients(Array.isArray(pacs) ? pacs : []);
      } catch (e) {
        console.error("Falha ao carregar dados do dashboard", e);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadAll();
    return () => {
      mounted = false;
    };
  }, []);

  // monta/atualiza chart quando appointments mudam
  useEffect(() => {
    if (!chartRef.current) return;
    // destruir instância anterior
    try {
      if (chartInstance.current) {
        chartInstance.current.destroy();
        chartInstance.current = null;
      }
    } catch (e) {
      /* ignore */
    }

    // Cria labels dinâmicos (8h-17h) e agrega consultas do dia
    const hours = Array.from({ length: 10 }, (_, i) => 8 + i); // 8..17
    const labels = hours.map((h) => `${String(h).padStart(2, "0")}h`);

    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    const counts = hours.map((h) => {
      const start = new Date(`${todayStr}T${String(h).padStart(2, "0")}:00:00`);
      const end = new Date(start.getTime() + 60 * 60 * 1000);
      return appointments.filter((a) => {
        if (!a || !a.scheduled_at) return false;
        const d = new Date(a.scheduled_at);
        return d >= start && d < end && d.toISOString().slice(0, 10) === todayStr;
      }).length;
    });

    const ctx = chartRef.current.getContext("2d");
    chartInstance.current = new Chart(ctx, {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: "Consultas agendadas",
            data: counts,
            backgroundColor: "rgba(134, 239, 172, 0.6)",
            borderColor: "rgba(34, 197, 94, 0.9)",
            borderWidth: 1,
            borderRadius: 6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true } },
      },
    });

    return () => {
      try {
        if (chartInstance.current) chartInstance.current.destroy();
      } catch {}
    };
  }, [appointments]);

  // derived values
  const now = new Date();
  const upcoming = appointments
    .filter((a) => a?.scheduled_at && new Date(a.scheduled_at) >= now)
    .slice()
    .sort((x, y) => new Date(x.scheduled_at) - new Date(y.scheduled_at));

  const nextPatients = upcoming.slice(0, 5);
  const todayStr = now.toISOString().slice(0, 10);
  const todayCount = appointments.filter((a) => a?.scheduled_at && new Date(a.scheduled_at).toISOString().slice(0, 10) === todayStr).length;

  return (
    <div style={{ display: "grid", gap: "1.25rem", gridTemplateColumns: "2fr 1fr" }}>
      {/* Coluna estatísticas */}
      <section
        style={{
          backgroundColor: "#fff",
          borderRadius: "0.75rem",
          boxShadow: "0 4px 10px rgba(0,0,0,0.05)",
          padding: "1rem 1.25rem",
          minHeight: 320,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <header style={{ marginBottom: "1rem", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          <div>
            <h2 style={{ fontSize: "1rem", fontWeight: 700, color: "#0f172a", margin: 0 }}>Consultas por horário (hoje)</h2>
            <div style={{ fontSize: "0.85rem", color: "#6B7280", marginTop: 4 }}>{loading ? "Carregando..." : `${todayCount} consultas hoje`}</div>
          </div>
          <div style={{ fontSize: "0.85rem", color: "#6B7280" }}>{now.toLocaleDateString(undefined, { weekday: "long" })}</div>
        </header>

        {/* small stat cards */}
        <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
          <div style={{ background: "#fbfffd", padding: 12, borderRadius: 10, minWidth: 140, boxShadow: "0 6px 14px rgba(2,6,23,0.04)" }}>
            <div style={{ fontSize: "0.75rem", color: "#6B7280" }}>Próximas</div>
            <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#0f172a" }}>{upcoming.length}</div>
          </div>
          <div style={{ background: "#fbfffd", padding: 12, borderRadius: 10, minWidth: 140, boxShadow: "0 6px 14px rgba(2,6,23,0.04)" }}>
            <div style={{ fontSize: "0.75rem", color: "#6B7280" }}>Médicos</div>
            <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#0f172a" }}>{doctors.length}</div>
          </div>
          <div style={{ background: "#fbfffd", padding: 12, borderRadius: 10, minWidth: 140, boxShadow: "0 6px 14px rgba(2,6,23,0.04)" }}>
            <div style={{ fontSize: "0.75rem", color: "#6B7280" }}>Pacientes</div>
            <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#0f172a" }}>{patients.length}</div>
          </div>
        </div>

        <div style={{ flex: 1, position: "relative" }}>
          <canvas ref={chartRef} style={{ width: "100%", height: 260 }} />
        </div>
      </section>

      {/* Coluna próximos pacientes */}
      <section
        style={{
          backgroundColor: "#fff",
          borderRadius: "0.75rem",
          boxShadow: "0 4px 10px rgba(0,0,0,0.05)",
          padding: "1rem 1.25rem",
          minHeight: 320,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <header style={{ marginBottom: "1rem" }}>
          <h2 style={{ fontSize: "1rem", fontWeight: 600, color: "#1F2937", margin: 0 }}>
            Próximos Pacientes
          </h2>
          <p style={{ fontSize: "0.8rem", color: "#6B7280", margin: 0 }}>Chegada na recepção</p>
        </header>

        <ul style={{ listStyle: "none", margin: 0, padding: 0, fontSize: "0.95rem", lineHeight: 1.6 }}>
          {loading && <li style={{ color: "#6B7280" }}>Carregando próximos pacientes...</li>}
          {!loading && nextPatients.length === 0 && <li style={{ color: "#6B7280" }}>Nenhuma consulta próxima</li>}
          {!loading && nextPatients.map((a) => (
            <li key={a.id} style={{ padding: "0.6rem 0", borderBottom: "1px solid #E5E7EB", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontWeight: 700, color: "#111827" }}>{a.paciente_nome || "—"}</div>
                <div style={{ color: "#6B7280", fontSize: "0.9rem" }}>{a.medico_nome || "—"}</div>
              </div>
              <div style={{ color: "#111827", fontWeight: 600 }}>{fmtTime(a.scheduled_at)}</div>
            </li>
          ))}
        </ul>
      </section>
      <AccessibilityMenu />
    </div>
  );
}