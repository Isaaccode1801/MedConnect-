import React, { useState, useEffect, useRef } from 'react';
import { listPacientes } from '@/services/api/pacientes';
import { listarMedicos } from '@/services/api/medicos';
import AccessibilityMenu from "../../../components/ui/AccessibilityMenu";
// Ícones importados do 'react-icons/fa' (versão corrigida)
import { FaHeartbeat, FaColumns, FaCalendarCheck, FaUsers, FaUserMd, FaFileInvoice, FaCog, FaBars, FaSearch, FaBell, FaDollarSign, FaChevronRight } from 'react-icons/fa';
// Importa os componentes necessários do Chart.js, incluindo o BarController
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, BarController, Title, Tooltip, Legend } from 'chart.js';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'; // Link já estava importado
import './admin-dashboard.css';

// Registrar os componentes necessários do Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  BarController,
  Title,
  Tooltip,
  Legend
);
export default function App() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const location = useLocation();
  const pathname = location.pathname || '/';
  const navigate = useNavigate();
  const chartRef = useRef(null);

  function toggleSidebar() {
    setIsSidebarCollapsed((s) => !s);
  }

  function handleLogout() {
    // apenas navega para a raiz; o comportamento original de logout não foi alterado
    navigate('/');
  }

  useEffect(() => {
    if (!chartRef.current) return;
    try {
      const chart = new ChartJS(chartRef.current, {
        type: 'bar',
        data: {
          labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
          datasets: [
            { label: 'Pacientes', data: [12, 19, 3, 5, 2, 3], backgroundColor: '#60A5FA' }
          ]
        },
        options: { responsive: true, maintainAspectRatio: false }
      });
      return () => chart.destroy();
    } catch (e) {
      // se falhar, silenciar — chart é opcional para a UI
    }
  }, [chartRef]);

  return (
    <>
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
                      
                      {/* ================================================== */}
                      {/* ✅ CORREÇÃO APLICADA AQUI */}
                      {/* ================================================== */}
                      <li>
                        <Link
                          to="/admin/laudos"
                          className={pathname.startsWith("/admin/laudos") ? "active" : ""}
                        >
                          <FaFileInvoice className="icon" /> <span>Laudos</span>
                        </Link>
                      </li>
                      {/* ================================================== */}
                      
                 
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
                  {/* Botão de recolher sidebar igual ao da secretary */}
                  <button
                    onClick={toggleSidebar}
                    style={{
                      marginTop: '0.5rem',
                      background: 'transparent',
                      border: '1px solid rgba(255, 255, 255, 0.3)',
                      borderRadius: '0.5rem',
                      color: '#fff',
                      padding: '0.5rem 0.75rem',
                      cursor: 'pointer',
                      fontSize: '0.8rem',
                      lineHeight: 1.2,
                      width: '90%',
                      alignSelf: 'center',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                    }}
                  >
                    <FaBars /> {!isSidebarCollapsed && 'Recolher menu'}
                  </button>
                </nav>
                <div className={`main-content ${isSidebarCollapsed ? 'collapsed' : ''}`}>
                  <header className="header">
                    <div className="header-left">

                    </div>
                    <div className="header-right">
                      
                      <button
                        type="button"
                        onClick={() => navigate('/admin/profile')}
                        style={{
                          border: 'none',
                          background: 'transparent',
                          padding: 0,
                          marginLeft: '1rem',
                          cursor: 'pointer',
                        }}
                        aria-label="Ir para página de perfil"
                      >
                        <img
                          src="https://placehold.co/40x40/3B82F6/FFFFFF?text=A"
                          alt="Perfil do admin"
                          style={{
                            width: 40,
                            height: 40,
                            borderRadius: '9999px',
                            display: 'block',
                          }}
                        />
                      </button>
                    </div>
                  </header>
                  
                  {/* Esta é a lógica original do seu ficheiro */}
                  {pathname === '/' ? ( 
                    <main>
                      <DashboardStats />
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
              <AccessibilityMenu />
            </>
          );
  }

  //
  // Componentes Helpers (permanecem os mesmos do seu ficheiro)
  //
  function DashboardStats() {
          const [pacientes, setPacientes] = useState([]);
          const [medicos, setMedicos] = useState([]);
          const [consultasHoje, setConsultasHoje] = useState(0);
          const [faturamentoHoje, setFaturamentoHoje] = useState(0);
          useEffect(() => {
            async function fetchData() {
              try {
                const pacs = await listPacientes();
                setPacientes(Array.isArray(pacs) ? pacs : []);
              } catch {}
              try {
                const meds = await listarMedicos();
                setMedicos(Array.isArray(meds) ? meds : []);
              } catch {}
              try {
                // Consultas do dia e faturamento
                const base = import.meta.env.VITE_SUPABASE_URL;
                const hoje = new Date().toISOString().slice(0, 10);
                // NOTA: Esta chamada falhará se 'getAuthHeaders' não for importado e usado
                // Apenas mantendo o seu código original.
                const url = `${base}/rest/v1/appointments?select=*&scheduled_at=gte.${hoje}T00:00:00.000Z&scheduled_at=lte.${hoje}T23:59:59.999Z`;
                const resp = await fetch(url);
                if (resp.ok) {
                  const arr = await resp.json();
                  setConsultasHoje(arr.length);
                  // Se cada consulta tem um campo 'valor', some aqui
                  setFaturamentoHoje(arr.reduce((acc, c) => acc + (c.valor || 0), 0));
                }
              } catch {}
            }
            fetchData();
          }, []);
          return (
            <div className="stats-cards">
              <StatCard icon={<FaUsers />} value={pacientes.length} label="Total de Pacientes" />
              <StatCard icon={<FaUserMd />} value={medicos.length} label="Corpo Clínico" color="#0284C7" bgColor="#E0F2FE" />
              <StatCard icon={<FaCalendarCheck />} value={consultasHoje} label="Consultas Hoje" color="#059669" bgColor="#D1FAE5" />
              <StatCard icon={<FaDollarSign />} value={`R$ ${faturamentoHoje.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} label="Faturamento (Dia)" color="#D97706" bgColor="#FEF3C7" />
            </div>
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
        <tr>
          <th>Paciente</th>
          <th>Médico</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        {appointments.map((a, i) => (
          <tr key={i}>
            <td>{a.name}</td>
            <td>{a.doctor}</td>
            <td>
              <span className={`status-badge ${getStatusClass(a.status)}`}>
                {a.status.charAt(0).toUpperCase() + a.status.slice(1)}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}