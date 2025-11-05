import { useEffect, useRef } from "react";
import Chart from "chart.js/auto";

export default function Dashboard() {
  const chartRef = useRef(null);

  useEffect(() => {
    if (!chartRef.current) return;
    const ctx = chartRef.current.getContext("2d");
    const chart = new Chart(ctx, {
      type: "bar",
      data: {
        labels: ["08h", "09h", "10h", "11h", "12h"],
        datasets: [
          {
            label: "Consultas agendadas",
            data: [3, 4, 2, 5, 1],
            // verde claro (Tailwind green): fundo suave e borda mais intensa
            backgroundColor: "rgba(134, 239, 172, 0.6)", // green-300 ~ #86efac
            borderColor: "rgba(34, 197, 94, 0.9)",      // green-500 ~ #22c55e
            borderWidth: 1,
            borderRadius: 5,
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
    return () => chart.destroy();
  }, []);

  return (
    <div style={{ display: "grid", gap: "1.5rem", gridTemplateColumns: "2fr 1fr" }}>
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
        <header style={{ marginBottom: "1rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ fontSize: "1rem", fontWeight: 600, color: "#1F2937" }}>
            Consultas por horário (hoje)
          </h2>
          <span style={{ fontSize: "0.8rem", color: "#6B7280" }}>Quinta-feira</span>
        </header>
        <div style={{ flex: 1, position: "relative" }}>
          <canvas ref={chartRef} />
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

        <ul style={{ listStyle: "none", margin: 0, padding: 0, fontSize: "0.9rem", lineHeight: 1.4 }}>
          <li style={{ padding: "0.5rem 0", borderBottom: "1px solid #E5E7EB" }}>
            <strong style={{ color: "#111827" }}>Maria Santos</strong> — Dr. João · 09:00
          </li>
          <li style={{ padding: "0.5rem 0", borderBottom: "1px solid #E5E7EB" }}>
            <strong style={{ color: "#111827" }}>Carlos Lima</strong> — Dra. Ana · 09:30
          </li>
          <li style={{ padding: "0.5rem 0" }}>
            <strong style={{ color: "#111827" }}>Fernanda Souza</strong> — Dr. Pedro · 10:00
          </li>
        </ul>
      </section>
    </div>
  );
}