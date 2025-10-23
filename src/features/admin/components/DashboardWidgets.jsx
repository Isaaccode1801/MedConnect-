// src/features/admin/components/DashboardWidgets.jsx
import React, { useEffect, useRef } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, BarController, Title, Tooltip, Legend } from 'chart.js';
import { FaUsers, FaUserMd, FaCalendarCheck, FaDollarSign } from 'react-icons/fa';

// --- Componente StatCard ---
export function StatCard({ icon, value, label, color, bgColor }) {
  const iconStyle = { color: color || 'var(--cor-principal)', backgroundColor: bgColor || 'var(--cor-principal-claro)' };
  return (
    <div className="stat-card">
      <div className="icon-wrapper" style={iconStyle}>{icon}</div>
      <div className="info">
        <div className="value">{value}</div>
        <div className="label">{label}</div>
      </div>
    </div>
  );
}

// --- Componente AppointmentsTable ---
export function AppointmentsTable() {
  const appointments = [
    { name: 'Isaac Kauã', doctor: 'Dr(a). Camilla', status: 'confirmed' },
    { name: 'Maria Souza', doctor: 'Dr. João', status: 'pending' },
    { name: 'Pedro Lima', doctor: 'Dra. Ana', status: 'confirmed' },
    { name: 'Fernandinho', doctor: 'Dr(a). Camilla', status: 'cancelled' },
  ];
  const getStatusClass = (status) => {
    if (status === 'confirmed') return 'status-confirmed';
    if (status === 'pending') return 'status-pending';
    return 'status-cancelled';
  };
  return (
    <table className="appointments-table">
      <thead>
        <tr><th>Paciente</th><th>Médico</th><th>Status</th></tr>
      </thead>
      <tbody>
        {appointments.map((appt, index) => (
          <tr key={index}>
            <td>{appt.name}</td>
            <td>{appt.doctor}</td>
            <td><span className={`status-badge ${getStatusClass(appt.status)}`}>{appt.status.charAt(0).toUpperCase() + appt.status.slice(1)}</span></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// --- Componente AdminDashboardContent ---
export function AdminDashboardContent() {
  const chartRef = useRef(null);

  useEffect(() => {
    let chartInstance = null;
    if (chartRef.current) {
      const chartCtx = chartRef.current.getContext('2d');
      chartInstance = new ChartJS(chartCtx, {
        type: 'bar',
        data: {
          labels: ['Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set'],
          datasets: [{
            label: 'Novos Pacientes',
            data: [65, 59, 80, 81, 56, 55],
            backgroundColor: 'rgba(59, 130, 246, 0.5)',
            borderColor: 'rgba(59, 130, 246, 1)',
            borderWidth: 1,
            borderRadius: 5
          }]
        },
        options: {
             responsive: true,
             maintainAspectRatio: false,
             scales: { y: { beginAtZero: true } },
             plugins: { legend: { display: false } },
        }
      });
    }
    return () => {
      if (chartInstance) {
        chartInstance.destroy();
      }
    };
  }, []);

  return (
    <>
      <div className="stats-cards">
        {/* Note que StatCard e AppointmentsTable agora são chamados diretamente */}
        <StatCard icon={<FaUsers />} value="1,254" label="Total de Pacientes" />
        <StatCard icon={<FaUserMd />} value="75" label="Corpo Clínico" color="#0284C7" bgColor="#E0F2FE" />
        <StatCard icon={<FaCalendarCheck />} value="42" label="Consultas Hoje" color="#059669" bgColor="#D1FAE5" />
        <StatCard icon={<FaDollarSign />} value="R$ 12.5k" label="Faturamento (Dia)" color="#D97706" bgColor="#FEF3C7" />
      </div>
      <div className="dashboard-grid">
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Estatísticas de Pacientes (Últimos 6 meses)</h3>
          </div>
          <div className="chart-container">
            <canvas ref={chartRef}></canvas>
          </div>
        </div>
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Próximos Agendamentos</h3>
          </div>
          <AppointmentsTable />
        </div>
      </div>
    </>
  );
}