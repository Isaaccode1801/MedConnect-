import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import './dashboard.css';
import { MdOutlineAccessibilityNew } from "react-icons/md";

import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// (Helpers: calculateAge, initials... sem mudanças)
function calculateAge(birthDateString: string | null): number | string {
  if (!birthDateString) return 'N/A';
  try {
    const birthDate = new Date(birthDateString);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  } catch (e) {
    return 'N/A';
  }
}
function initials(name = "") {
  const parts = String(name).trim().split(/\s+/).slice(0, 2);
  return parts.map((s) => s[0]?.toUpperCase() || "").join("") || "P";
}


export default function PatientDashboard() {
  const navigate = useNavigate();
  const [currentMonth] = useState(new Date());

  // ==========================================================
  // LÓGICA DE ACESSIBILIDADE (sem mudanças)
  // ==========================================================
  const [acessOpen, setAcessOpen] = useState(false);
  const [dark, setDark] = useState(() => JSON.parse(localStorage.getItem("modoEscuro") || "false"));
  const [daltonico, setDaltonico] = useState(() => JSON.parse(localStorage.getItem("modoDaltonico") || "false"));

  useEffect(() => {
    document.body.classList.toggle("modo-escuro", dark);
    localStorage.setItem("modoEscuro", JSON.stringify(dark));
  }, [dark]);
  
  useEffect(() => {
    document.body.classList.toggle("modo-daltonico", daltonico);
    localStorage.setItem("modoDaltonico", JSON.stringify(daltonico));
  }, [daltonico]);
  
  const incFont = () => {
    const html = document.documentElement;
    const cur = parseFloat(getComputedStyle(html).fontSize || '16');
    html.style.fontSize = Math.min(cur + 1, 22) + "px";
  };
  const decFont = () => {
    const html = document.documentElement;
    const cur = parseFloat(getComputedStyle(html).fontSize || '16');
    html.style.fontSize = Math.max(cur - 1, 12) + "px";
  };
  const toggleDaltonico = () => {
    setDaltonico(v => !v);
  };
  const resetA11y = () => {
    document.documentElement.style.fontSize = "";
    setDark(false);
    setDaltonico(false);
  };
  // ==========================================================
  // FIM DA LÓGICA DE ACESSIBILIDADE
  // ==========================================================

  // (Estados dinâmicos... sem mudanças)
  const [perfil, setPerfil] = useState<any>(null);
  const [userInitials, setUserInitials] = useState('P');
  const [patientName, setPatientName] = useState('Paciente');
  const [proximasConsultas, setProximasConsultas] = useState<any[]>([]);
  const [diasComConsultas, setDiasComConsultas] = useState<number[]>([]);
  const [frequenciaPresenca, setFrequenciaPresenca] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // (useEffect principal... sem mudanças)
  useEffect(() => {
    document.body.classList.remove('modo-daltonico');
    
    async function loadDashboardData() {
      setLoading(true);
      setError('');
      try {
        // --- 1. Buscar Usuário e Perfil ---
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) throw new Error("Sessão não encontrada.");

        const { data: patientProfile, error: profileError } = await supabase
          .from('patients')
          .select('*')
          .eq('user_id', user.id)
          .single();
        
        if (profileError || !patientProfile) {
          throw new Error("Não foi possível encontrar seu perfil de paciente.");
        }
        
        setPerfil(patientProfile);
        setPatientName(patientProfile.full_name || 'Paciente');
        setUserInitials(initials(patientProfile.full_name));

        // --- 2. Buscar TODOS os agendamentos ---
        const { data: allAppointments, error: appointmentsError } = await supabase
          .from('appointments')
          .select(`
            id,
            scheduled_at,
            status,
            doctors (
              full_name,
              specialty
            )
          `)
          .eq('patient_id', patientProfile.id)
          .order('scheduled_at', { ascending: true });

        if (appointmentsError) throw appointmentsError;
        if (!allAppointments) return;

        // --- 3. Processar Dados ---
        const hoje = new Date();
        const inicioDoDia = new Date(hoje.setHours(0, 0, 0, 0));

        // A. Próximas Consultas (agora pega 5)
        const futuras = allAppointments
          .filter(app => new Date(app.scheduled_at) >= inicioDoDia)
          .slice(0, 5); // Pega as 5 primeiras
        
        setProximasConsultas(futuras);
        
        // B. Calendário
        const diasNoMes = allAppointments
          .map(app => new Date(app.scheduled_at))
          .filter(date => date.getMonth() === currentMonth.getMonth() && date.getFullYear() === currentMonth.getFullYear())
          .map(date => date.getDate());
          
        setDiasComConsultas(Array.from(new Set(diasNoMes)));

        // C. Indicador de Frequência
        const consultasPassadas = allAppointments.filter(app => new Date(app.scheduled_at) < inicioDoDia);
        const totalPassadas = consultasPassadas.length;
        const concluidas = consultasPassadas.filter(app => app.status === 'completed').length;
        
        const frequenciaCalc = (totalPassadas === 0) ? 100 : (concluidas / totalPassadas) * 100;
        setFrequenciaPresenca(Math.round(frequenciaCalc));

      } catch (err: any) {
        console.error("Erro ao carregar dashboard:", err);
        setError(err.message || "Falha ao carregar dados.");
      } finally {
        setLoading(false);
      }
    }
    
    loadDashboardData();
  }, [currentMonth]);

  
  // (Funções do calendário... sem mudanças)
  const generateCalendar = (): (number | null)[] => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    const days: (number | null)[] = [];
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }
    return days;
  };
  const calendar = generateCalendar();
  const monthName = currentMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  const todayDate = new Date().getDate();
  const getEmojiEspecialidade = (especialidade: string) => {
    const emojis: Record<string, string> = {
      'Odontologia': '🦷',
      'Cardiologia': '💜',
      'Ortopedia': '🦴',
      'Clínica Geral': '🩺'
    };
    return emojis[especialidade] || '📋';
  };

  // ==========================================================
  // JSX (Atualizado com dados dinâmicos)
  // ==========================================================

  if (loading) {
      return <div className="patient-dashboard-loading">Carregando seu dashboard...</div>
  }
  
  if (error) {
    return <div className="patient-dashboard-error">
      <h3>Ops, algo deu errado</h3>
      <p>{error}</p>
      <button className="btn-inicio" onClick={() => window.location.reload()}>Tentar Novamente</button>
    </div>
  }

  return (
    <div className="patient-dashboard">
      
      {/* Header (sem mudanças) */}
      <header className="dashboard-header">
        <div className="header-left">
          <div className="user-greeting">
            <div className="user-avatar">{userInitials}</div>
            <span className="user-name">{patientName}</span>
          </div>
        </div>
        <div className="header-right">
          <button className="btn-inicio" onClick={() => void navigate('/')}>Voltar para a tela inicial</button>
          <button 
            className="btn-inicio"
            onClick={() => void navigate('/patient/consultas')}
          >
            Minhas Consultas
          </button>
          <button className="btn-consulta" onClick={() => void navigate('/patient/agendamento')}>
            Ver lista de médicos
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="dashboard-main">
        <div className="welcome-section">
          <h1 className="welcome-title">Olá, <span className="highlight-name">{patientName}</span> 👋</h1>
        </div>

        <div className="dashboard-grid">
          
          {/* Perfil do Paciente (sem mudanças) */}
          <div className="card perfil-card">
            <div className="card-header">
              <h2>Perfil do Paciente</h2>
            </div>
            <div className="card-body">
              <div className="perfil-avatar-container">
                <div className="perfil-avatar-large">{userInitials}</div>
                <div className="perfil-info">
                  <h3>{perfil.full_name}</h3>
                  <p className="perfil-cpf">{perfil.cpf || 'CPF não informado'}</p>
                </div>
              </div>
              <div className="perfil-detalhes">
                <div className="perfil-item">
                  <span className="label">Idade</span>
                  <span className="value">{calculateAge(perfil.birth_date)} anos</span>
                </div>
                <div className="perfil-item">
                  <span className="label">Tipo Sanguíneo</span>
                  <span className="value">{perfil.blood_type || 'N/A'}</span>
                </div>
                <div className="perfil-item">
                  <span className="label">Altura</span>
                  <span className="value">{perfil.height ? `${perfil.height.toFixed(2)} m` : 'N/A'}</span>
                </div>
                <div className="perfil-item">
                  <span className="label">Peso</span>
                  <span className="value">{perfil.weight ? `${perfil.weight} kg` : 'N/A'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Indicadores (sem mudanças) */}
          <div className="card indicadores-card">
            <div className="card-header">
              <h2>Indicadores</h2>
            </div>
            <div className="card-body indicadores-body" style={{ justifyContent: 'center' }}> 
              <div className="indicador">
                <div className="circular-progress blue">
                  <svg viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="40" />
                    <circle 
                      cx="50" 
                      cy="50" 
                      r="40" 
                      strokeDasharray={`${frequenciaPresenca * 2.51} 251`}
                      transform="rotate(-90 50 50)"
                    />
                  </svg>
                  <div className="percentage">{frequenciaPresenca}%</div>
                </div>
                <p className="indicador-label">Frequência de Presença</p>
              </div>
            </div>
          </div>

          {/* Calendário (sem mudanças) */}
          <div className="card calendario-card">
            <div className="card-header">
              <h2>Consultas</h2>
              <span className="mes-ano">{monthName.charAt(0).toUpperCase() + monthName.slice(1)}</span>
            </div>
            <div className="card-body">
              <div className="calendario">
                <div className="calendario-dias-semana">
                  <div>D</div>
                  <div>S</div>
                  <div>T</div>
                  <div>Q</div>
                  <div>Q</div>
                  <div>S</div>
                  <div>S</div>
                </div>
                <div className="calendario-dias">
                  {calendar.map((day, index) => (
                    <div
                      key={index}
                      className={`dia ${!day ? 'vazio' : ''} ${
                        day === todayDate ? 'hoje' : ''
                      } ${day && diasComConsultas.includes(day) ? 'com-consulta' : ''}`}
                    >
                      {day ?? ''}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ================================================================ */}
          {/* ✅ 6. GRÁFICOS REMOVIDOS */}
          {/* ================================================================ */}
          {/* O 'taxa-card' e 'condicoes-card' foram removidos daqui */}
          
          {/* ================================================================ */}
          {/* ✅ 7. PRÓXIMAS CONSULTAS - NOVO LAYOUT HORIZONTAL */}
          {/* ================================================================ */}
          <div className="card proximas-consultas-card horizontal-consultas">
            <div className="card-header">
              <h2>Próximas Consultas</h2>
            </div>
            
            {/* O 'card-body' agora tem o container de scroll */}
            <div 
              className="card-body"
              style={{
                overflowX: 'auto', // Permite scroll horizontal
                display: 'flex',   // Faz os filhos ficarem em linha
                paddingBottom: '24px' // Mais espaço para a barra de scroll
              }}
            >
              <div 
                className="consultas-lista-horizontal"
                style={{
                  display: 'flex', // Faz os 'consulta-item-horizontal' ficarem em linha
                  flexDirection: 'row',
                  gap: '16px', // Espaço entre os cartões
                }}
              >
                {proximasConsultas.length === 0 ? (
                  <p style={{ textAlign: 'center', color: '#6b7280', padding: '10px' }}>
                    Nenhuma consulta futura agendada.
                  </p>
                ) : (
                  proximasConsultas.map((consulta) => (
                    // Cartão individual (agora horizontal)
                    <div 
                      key={consulta.id} 
                      className="consulta-item-horizontal"
                      style={{
                        flexShrink: 0, // Impede que o cartão encolha
                        width: '240px', // Largura fixa para cada cartão
                        backgroundColor: '#F9FAFB',
                        border: '1px solid #E5E7EB',
                        borderRadius: '12px',
                        padding: '16px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px',
                      }}
                    >
                      <div 
                        className="consulta-horario-horizontal"
                        style={{
                          fontSize: '18px',
                          fontWeight: 700,
                          color: '#111827',
                        }}
                      >
                        {format(new Date(consulta.scheduled_at), "HH:mm")}
                      </div>
                      <div className="consulta-info-horizontal">
                        <h4 style={{ margin: '0 0 4px 0', fontSize: '15px' }}>
                          {consulta.doctors.specialty || 'Consulta'}
                        </h4>
                        <p style={{ margin: 0, fontSize: '14px', color: '#6B7280' }}>
                          {format(new Date(consulta.scheduled_at), "eeee, dd/MM", { locale: ptBR })}
                        </p>
                        <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#6B7280' }}>
                          Dr(a). {consulta.doctors.full_name}
                        </p>
                      </div>
                      <div 
                        className="consulta-icon-horizontal"
                        style={{ fontSize: '24px', textAlign: 'right', marginTop: 'auto' }}
                      >
                        {getEmojiEspecialidade(consulta.doctors.specialty)}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
          
        </div>
      </main>

      {/* BOTÃO E MENU DE ACESSIBILIDADE (sem mudanças) */}
      <button
        className="acessibilidade-btn"
        onClick={() => setAcessOpen(v => !v)}
        aria-label="Abrir menu de acessibilidade"
      >
        <MdOutlineAccessibilityNew size={28} />
      </button>

      <div className={`menu-acessibilidade ${acessOpen ? "active" : ""}`}>
        <h4>Acessibilidade</h4>
        <button className="menu-item" onClick={incFont}>Aumentar fonte</button>
        <button className="menu-item" onClick={decFont}>Diminuir fonte</button>
        <button className="menu-item" onClick={toggleDaltonico}>
          {daltonico ? "Modo normal" : "Modo daltônico"}
        </button>
        <button className="menu-item" onClick={() => setDark(v => !v)}>
          {dark ? "Modo claro" : "Modo escuro"}
        </button>
        <button className="menu-item" onClick={resetA11y}>Resetar</button>
      </div>
      
    </div>
  );
}