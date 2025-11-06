import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './dashboard.css';
import { MdOutlineAccessibilityNew } from "react-icons/md";

interface Consulta {
  id: string;
  tipo: string;
  data: string;
  horario: string;
  medico: string;
  especialidade: string;
}

interface PerfilPaciente {
  nome: string;
  cpf: string;
  idade: number;
  tipoSanguineo: string;
  altura: number;
  peso: number;
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

  useEffect(() => {
    document.body.classList.remove('modo-daltonico');
  }, []);
  
  // (Dados mockados... sem mudanças)
  const [perfil] = useState<PerfilPaciente>({
    nome: 'Isaac Kauã',
    cpf: '862.346.645-47',
    idade: 18,
    tipoSanguineo: 'O+',
    altura: 1.90,
    peso: 100
  });
  const [proximasConsultas] = useState<Consulta[]>([
    {
      id: '1',
      tipo: 'Dentista',
      data: 'Quarta',
      horario: '09:00',
      medico: 'Dra. Gorex Mathew',
      especialidade: 'Odontologia'
    },
    // ... (mais consultas mockadas)
  ]);
  const saudeGeral = 75;
  const frequenciaPresenca = 83;
  const taxaMelhora = [65, 75, 70, 85, 72, 68, 78];
  const condicoesSaude = [65, 68, 70, 72, 75, 73, 74, 78, 76, 74, 82, 70];

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
  const diasComConsultas = [3, 10, 17, 24];
  const hoje = new Date().getDate();
  const getEmojiEspecialidade = (especialidade: string) => {
    const emojis: Record<string, string> = {
      'Odontologia': '🦷',
      'Cardiologia': '💜',
      'Ortopedia': '🦴',
      'Clínica Geral': '🩺'
    };
    return emojis[especialidade] || '📋';
  };

  return (
    <div className="patient-dashboard">
      
      {/* Header */}
      <header className="dashboard-header">
        <div className="header-left">
          <div className="user-greeting">
            <div className="user-avatar">IK</div>
            <span className="user-name">{perfil.nome}</span>
          </div>
        </div>
        
        {/* ================================================== */}
        {/* ✅ BLOCO DE CONFLITO CORRIGIDO */}
        {/* ================================================== */}
        <div className="header-right">
          {/* 1. O botão que você queria do 'pull' (Voltar) */}
          <button className="btn-inicio" onClick={() => void navigate('/')}>Voltar para a tela inicial</button>
          
          {/* 2. O botão que você queria das 'suas mudanças' (Minhas Consultas) */}
          <button 
            className="btn-inicio" // Reutilizando a classe 'btn-inicio'
            onClick={() => void navigate('/patient/consultas')}
          >
            Minhas Consultas
          </button>
          
          {/* 3. O botão que não estava em conflito */}
          <button className="btn-consulta" onClick={() => void navigate('/patient/agendamento')}>
            Ver lista de médicos
          </button>
        </div>
      </header>

      {/* Main Content (sem mudanças) */}
      <main className="dashboard-main">
        <div className="welcome-section">
          <h1 className="welcome-title">Olá, <span className="highlight-name">{perfil.nome}</span> 👋</h1>
        </div>

        <div className="dashboard-grid">
          {/* Perfil do Paciente */}
          <div className="card perfil-card">
            <div className="card-header">
              <h2>Perfil do Paciente</h2>
            </div>
            <div className="card-body">
              <div className="perfil-avatar-container">
                <div className="perfil-avatar-large">IK</div>
                <div className="perfil-info">
                  <h3>{perfil.nome}</h3>
                  <p className="perfil-cpf">{perfil.cpf}</p>
                </div>
              </div>
              <div className="perfil-detalhes">
                <div className="perfil-item">
                  <span className="label">Idade</span>
                  <span className="value">{perfil.idade} anos</span>
                </div>
                <div className="perfil-item">
                  <span className="label">Tipo Sanguíneo</span>
                  <span className="value">{perfil.tipoSanguineo}</span>
                </div>
                <div className="perfil-item">
                  <span className="label">Altura</span>
                  <span className="value">{perfil.altura.toFixed(2)} m</span>
                </div>
                <div className="perfil-item">
                  <span className="label">Peso</span>
                  <span className="value">{perfil.peso} kg</span>
                </div>
              </div>
            </div>
          </div>

          {/* Indicadores */}
          <div className="card indicadores-card">
            <div className="card-header">
              <h2>Indicadores</h2>
            </div>
            <div className="card-body indicadores-body">
              <div className="indicador">
                <div className="circular-progress pink">
                  <svg viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="40" />
                    <circle 
                      cx="50" 
                      cy="50" 
                      r="40" 
                      strokeDasharray={`${saudeGeral * 2.51} 251`}
                      transform="rotate(-90 50 50)"
                    />
                  </svg>
                  <div className="percentage">{saudeGeral}%</div>
                </div>
                <p className="indicador-label">Saúde Geral</p>
              </div>
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

          {/* Calendário */}
          <div className="card calendario-card">
            <div className="card-header">
              <h2>Consultas</h2>
              <span className="mes-ano">{monthName.charAt(0).toUpperCase() + monthName.slice(1)}</span>
            </div>
            <div className="card-body">
              <div className="calendario">
                <div className="calendario-dias-semana">
                  <div>S</div>
                  <div>T</div>
                  <div>Q</div>
                  <div>Q</div>
                  <div>S</div>
                  <div>S</div>
                  <div>D</div>
                </div>
                <div className="calendario-dias">
                  {calendar.map((day, index) => (
                    <div
                      key={index}
                      className={`dia ${!day ? 'vazio' : ''} ${
                        day === hoje ? 'hoje' : ''
                      } ${day && diasComConsultas.includes(day) ? 'com-consulta' : ''}`}
                    >
                      {day ?? ''}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Taxa de Melhora */}
          <div className="card taxa-card">
            <div className="card-header">
              <h2>Taxa de Melhora</h2>
            </div>
            <div className="card-body">
              <div className="grafico-barras">
                {taxaMelhora.map((valor, index) => (
                  <div key={index} className="barra-container">
                    <div 
                      className="barra" 
                      style={{ height: `${valor}%` }}
                      title={`${valor}%`}
                    />
                  </div>
                ))}
              </div>
              <p className="grafico-label">Durante Tratamento</p>
            </div>
          </div>

          {/* Condições de Saúde */}
          <div className="card condicoes-card">
            <div className="card-header">
              <h2>Condições de Saúde</h2>
            </div>
            <div className="card-body">
              <div className="grafico-linha-container">
                <svg className="grafico-linha" viewBox="0 0 400 150" preserveAspectRatio="none">
                  <polyline
                    points={condicoesSaude.map((val, i) => 
                      `${(i / (condicoesSaude.length - 1)) * 400},${150 - (val * 1.5)}`
                    ).join(' ')}
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth="2"
                  />
                </svg>
                <div className="meses-labels">
                  <span>Jan</span>
                  <span>Dez</span>
                </div>
              </div>
            </div>
          </div>

          {/* Próximas Consultas */}
          <div className="card proximas-consultas-card">
            <div className="card-header">
              <h2>Próximas Consultas</h2>
            </div>
            <div className="card-body">
              <div className="consultas-lista">
                {proximasConsultas.map((consulta) => (
                  <div key={consulta.id} className="consulta-item">
                    <div className="consulta-icon">
                      {getEmojiEspecialidade(consulta.especialidade)}
                    </div>
                    <div className="consulta-info">
                      <h4>{consulta.tipo}</h4>
                      <p>{consulta.data} - {consulta.medico}</p>
                    </div>
                    <div className="consulta-horario">
                      {consulta.horario}
                    </div>
                  </div>
                ))}
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