import React, { useState, useEffect, useRef } from 'react';
// Ícones importados do 'react-icons/fa' (versão corrigida)
import { FaHeartbeat, FaColumns, FaCalendarCheck, FaUsers, FaUserMd, FaFileInvoice, FaCog, FaBars, FaSearch, FaBell, FaDollarSign, FaChevronRight } from 'react-icons/fa';
// Importa os componentes necessários do Chart.js, incluindo o BarController
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, BarController, Title, Tooltip, Legend } from 'chart.js';

import { Link, Outlet, useLocation, useNavigate} from 'react-router-dom';

// ✅ CORREÇÃO: Registra todos os componentes necessários, incluindo o BarController.
// Isto resolve o erro '"bar" is not a registered controller'.
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  BarController,
  Title,
  Tooltip,
  Legend
);


// Componente principal da aplicação
export default function App() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const chartRef = useRef(null);
  const { pathname } = useLocation();
const navigate = useNavigate();
  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  const toggleUserMenu = (e) => {
    e.preventDefault();
    setIsUserMenuOpen(!isUserMenuOpen);
  };

const handleLogout = (e) => {
  e.preventDefault();

  try {
    localStorage.removeItem('user_token');
    localStorage.removeItem('user_role');
  } catch (_) {}

  navigate('/', { replace: true });
};

  useEffect(() => {
    let chartInstance = null;
    // Garante que o código só é executado no navegador e que a referência ao canvas existe
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
    
    // ✅ CORREÇÃO: Função de "limpeza".
    // Destrói o gráfico anterior antes de o componente ser recriado,
    // evitando o erro "Canvas is already in use".
    return () => {
      if (chartInstance) {
        chartInstance.destroy();
      }
    };
  }, []); // O array vazio [] garante que este efeito roda apenas uma vez

  return (
    <>
      <style>{`
        :root {
          --cor-fundo: #F7F8FC;
          --cor-sidebar: #111827;
          --cor-sidebar-texto: #9CA3AF;
          --cor-sidebar-texto-hover: #FFFFFF;
          --cor-principal: #3B82F6;
          --cor-principal-claro: #EFF6FF;
          --cor-texto-titulo: #1F2937;
          --cor-texto-corpo: #6B7280;
          --cor-borda: #E5E7EB;
          --sombra: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1);
          --raio-borda: 0.75rem;
          --transicao: all 0.3s ease-in-out;
        }
        body {
          font-family: 'Poppins', sans-serif;
          background-color: var(--cor-fundo);
          color: var(--cor-texto-corpo);
          margin: 0;
        }
        .sidebar {
          width: 260px;
          background: var(--cor-sidebar);
          height: 100vh;
          position: fixed;
          top: 0; left: 0;
          display: flex;
          flex-direction: column;
          padding: 1.5rem 0;
          transition: width 0.3s ease;
          overflow-x: hidden;
        }
        .sidebar-header { padding: 0 1.5rem; margin-bottom: 2rem; display: flex; align-items: center; gap: 0.75rem; }
        .sidebar-header .logo-icon { color: var(--cor-principal); font-size: 1.75rem; }
        .sidebar-header .logo-text { color: var(--cor-sidebar-texto-hover); font-size: 1.25rem; font-weight: 600; white-space: nowrap; }
        .nav-links { flex-grow: 1; }
        .nav-links ul { list-style: none; padding: 0; margin: 0; }
        .nav-links li { position: relative; }
        .nav-links a { display: flex; align-items: center; gap: 1rem; padding: 0.9rem 1.5rem; margin: 0.25rem 1rem; border-radius: var(--raio-borda); color: var(--cor-sidebar-texto); text-decoration: none; font-weight: 500; transition: var(--transicao); white-space: nowrap; }
        .nav-links a .icon { width: 20px; font-size: 1.1rem; text-align: center; }
        .nav-links a:hover { background: #374151; color: var(--cor-sidebar-texto-hover); }
        .nav-links a.active { background: var(--cor-principal); color: var(--cor-sidebar-texto-hover); }
        .sidebar.collapsed { width: 88px; }
        .sidebar.collapsed .logo-text, .sidebar.collapsed .nav-links span, .sidebar.collapsed .dropdown-indicator { display: none; }
        .main-content.collapsed { margin-left: 88px; width: calc(100% - 88px); }
        .main-content { margin-left: 260px; width: calc(100% - 260px); padding: 1.5rem; transition: margin-left 0.3s ease, width 0.3s ease; }
        .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; }
        .header-left { display: flex; align-items: center; gap: 1rem; }
        #toggle-sidebar-btn { background: none; border: none; font-size: 1.5rem; cursor: pointer; color: var(--cor-texto-titulo); }
        .search-bar { position: relative; }
        .search-bar .icon { position: absolute; left: 15px; top: 50%; transform: translateY(-50%); color: var(--cor-sidebar-texto); }
        .search-bar input { background: #fff; border: 1px solid var(--cor-borda); border-radius: var(--raio-borda); padding: 0.75rem 1rem 0.75rem 2.5rem; width: 300px; }
        .header-right { display: flex; align-items: center; gap: 1.5rem; }
        .header-right > .icon { font-size: 1.25rem; cursor: pointer; }
        .profile { display: flex; align-items: center; gap: 0.75rem; }
        .profile img { width: 40px; height: 40px; border-radius: 50%; }
        .stats-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1.5rem; margin-bottom: 2rem; }
        .stat-card { background: #fff; padding: 1.5rem; border-radius: var(--raio-borda); box-shadow: var(--sombra); display: flex; align-items: center; gap: 1rem; }
        .stat-card .icon-wrapper { width: 50px; height: 50px; border-radius: 50%; display: grid; place-items: center; font-size: 1.5rem; color: var(--cor-principal); background: var(--cor-principal-claro); }
        .stat-card .info .value { font-size: 1.75rem; font-weight: 700; color: var(--cor-texto-titulo); }
        .stat-card .info .label { font-size: 0.9rem; }
        .dashboard-grid { display: grid; grid-template-columns: 2fr 1fr; gap: 1.5rem; }
        @media (max-width: 1200px) { .dashboard-grid { grid-template-columns: 1fr; } }
        .card { background: #fff; padding: 1.5rem; border-radius: var(--raio-borda); box-shadow: var(--sombra); height: 400px; display: flex; flex-direction: column; }
        .card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
        .card-title { font-size: 1.1rem; font-weight: 600; color: var(--cor-texto-titulo); }
        .chart-container { position: relative; height: 100%; }
        .appointments-table { width: 100%; border-collapse: collapse; }
        .appointments-table th, .appointments-table td { padding: 0.9rem 0.5rem; text-align: left; border-bottom: 1px solid var(--cor-borda); }
        .appointments-table th { font-size: 0.8rem; text-transform: uppercase; color: var(--cor-texto-corpo); }
        .appointments-table tbody tr:last-child td { border-bottom: none; }
        .status-badge { padding: 0.25rem 0.75rem; border-radius: 999px; font-weight: 500; font-size: 0.8rem; }
        .status-confirmed { background: var(--cor-principal-claro); color: var(--cor-principal); }
        .status-pending { background: #FEF3C7; color: #92400E; }
        .status-cancelled { background: #FEE2E2; color: #991B1B; }
        .dropdown-indicator { margin-left: auto; transition: transform 0.3s ease; font-size: 0.8rem; }
        li.open > a .dropdown-indicator { transform: rotate(90deg); }
        .submenu { list-style: none; padding: 0; margin: 0 1rem; background: rgba(0,0,0,0.15); border-radius: var(--raio-borda); max-height: 0; overflow: hidden; transition: max-height 0.4s ease-out; }
        li.open .submenu { max-height: 250px; padding: 0.5rem 0; }
        .submenu a { padding: 0.6rem 1.5rem 0.6rem 2.5rem !important; margin: 0 !important; font-size: 0.9rem !important; }
        .submenu a:hover { background: var(--cor-principal); }
      `}</style>
      <div className="dashboard-container">
<nav className={`sidebar ${isSidebarCollapsed ? 'collapsed' : ''}`}>
  <div className="sidebar-header">
    <FaHeartbeat className="logo-icon" />
    <span className="logo-text">Medconnect</span>
  </div>

  <div className="nav-links">
    <ul>
      <li>
        <Link to="/admin" className={pathname === '/admin' ? 'active' : ''}>
          <FaColumns className="icon" /> <span>Dashboard</span>
        </Link>
      </li>

      <li>
        <Link
          to="/admin/AppointmentsPage"
          className={pathname.startsWith("/admin/AppointmentsPage") ? "active" : ""}
        >
          <FaCalendarCheck className="icon" /> <span>Agendamentos</span>
        </Link>
      </li>

      <li>
        <Link
          to="/admin/UsersList"
          className={pathname.startsWith("/admin/UsersList") ? "active" : ""}
        >
          <FaUsers className="icon" /> <span>Todos os Usuários</span>
        </Link>
      </li>

      <li>
        <a href="#">
          <FaFileInvoice className="icon" /> <span>Laudos</span>
        </a>
      </li>

      <li>
        <a href="#">
          <FaCog className="icon" /> <span>Configurações</span>
        </a>
      </li>

      <li>
        <button
          onClick={handleLogout}
          style={{
            background: 'none',
            border: 'none',
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            padding: '0.9rem 1.5rem',
            margin: '0.25rem 1rem',
            borderRadius: '0.75rem',
            color: 'var(--cor-sidebar-texto)',
            fontWeight: 500,
            textAlign: 'left',
            cursor: 'pointer'
          }}
        >
          <FaChevronRight className="icon" /> <span>Sair</span>
        </button>
      </li>
    </ul>
  </div>
</nav>
        <div className={`main-content ${isSidebarCollapsed ? 'collapsed' : ''}`}>
          <header className="header">
            <div className="header-left">
              <button id="toggle-sidebar-btn" title="Abrir/Fechar Menu" onClick={toggleSidebar}>
                <FaBars />
              </button>
              <div className="search-bar">
                <FaSearch className="icon" />
                <input type="text" placeholder="Buscar..." />
              </div>
            </div>
            <div className="header-right">
              <FaBell className="icon" />
              <div className="profile">
                <img src="https://placehold.co/40x40/3B82F6/FFFFFF?text=A" alt="Admin" />
                <div>
                  <div style={{ fontWeight: 600 }}>Admin</div>
                  <div style={{ fontSize: '0.8rem' }}>gestao@medconnect.com</div>
                </div>
              </div>
            </div>
          </header>
          {pathname === '/' ? (
            <main>
              <div className="stats-cards">
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
            </main>
          ) : (
            <main style={{ padding: 0 }}>
              <Outlet />
            </main>
          )}
        </div>
      </div>
    </>
  );
}

function StatCard({ icon, value, label, color, bgColor }) {
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

function AppointmentsTable() {
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

