// src/features/patients/pages/PatientAppointments.jsx (COM HEADER)
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom'; // ✅ IMPORTADO
import { supabase } from '@/lib/supabase';
import { FaStethoscope, FaCalendarAlt, FaClock, FaCheckCircle, FaExclamationCircle } from 'react-icons/fa';
import './PatientAppointments.css';
import './dashboard.css'; // ✅ IMPORTADO (para estilos do header)

// Helper para formatar a data (sem mudanças)
function formatarData(dataISO) {
  try {
    const data = new Date(dataISO);
    return data.toLocaleString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (e) {
    return 'Data inválida';
  }
}

// ✅ HELPER DE INICIAIS (adicionado)
function initials(name = "") {
  const parts = String(name).trim().split(/\s+/).slice(0, 2);
  return parts.map((s) => s[0]?.toUpperCase() || "").join("") || "P";
}

export default function PatientAppointments() {
  const navigate = useNavigate(); // ✅ Hook de navegação
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [patientName, setPatientName] = useState('Paciente');

  useEffect(() => {
    async function loadAppointments() {
      setLoading(true);
      setError('');

      try {
        // 1. Obter o usuário logado
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError) throw new Error('Não foi possível identificar o usuário.');
        if (!user) {
          setError('Sessão não encontrada. Por favor, faça login novamente.');
          setLoading(false);
          return;
        }

        // 2. Encontrar o ID do perfil de *paciente*
        const { data: patientProfile, error: profileError } = await supabase
          .from('patients')
          .select('id, full_name')
          .eq('user_id', user.id)
          .single();

        if (profileError || !patientProfile) {
          throw new Error('Registro de paciente não encontrado para este usuário.');
        }
        
        setPatientName(patientProfile.full_name || 'Paciente');

        // 3. Buscar os agendamentos (sem mudanças)
        const { data, error: appointmentsError } = await supabase
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
          .order('scheduled_at', { ascending: false });

        if (appointmentsError) throw appointmentsError;
        setAppointments(data || []);

      } catch (err) {
        console.error("Erro ao buscar agendamentos:", err.message);
        setError(err.message || 'Ocorreu um erro ao buscar suas consultas.');
      } finally {
        setLoading(false);
      }
    }

    loadAppointments();
  }, []);

  // ✅ Pega as iniciais do nome do paciente
  const userInitials = initials(patientName);

  return (
    // ✅ Adicionado Fragment <> para envolver o header e a página
    <>
      {/* ========================================================== */}
      {/* ✅ HEADER DO DASHBOARD ADICIONADO AQUI */}
      {/* ========================================================== */}
      <header className="dashboard-header">
        <div className="header-left">
          <div className="user-greeting">
            <div className="user-avatar">{userInitials}</div>
            <span className="user-name">{patientName}</span>
          </div>
        </div>
        <div className="header-right">
          <button className="btn-inicio" onClick={() => void navigate('/patient/dashboard')}>Início</button>
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
      {/* ========================================================== */}
      {/* FIM DO HEADER */}
      {/* ========================================================== */}
      
      <div className="patient-appointments-page">
        <header className="pa-header">
          <h1>Minhas Consultas</h1>
          <p>Olá, {patientName}! Aqui está seu histórico de agendamentos.</p>
        </header>

        {loading && <div className="pa-loading">A carregar...</div>}
        
        {error && <div className="pa-error">{error}</div>}

        {!loading && !error && appointments.length === 0 && (
          <div className="pa-empty">
            <FaCalendarAlt size={50} />
            <h3>Nenhuma consulta encontrada</h3>
            <p>Você ainda não agendou nenhuma consulta.</p>
          </div>
        )}

        {!loading && !error && appointments.length > 0 && (
          <div className="pa-list">
            {appointments.map((app) => (
              <div key={app.id} className={`pa-card status-${app.status || 'unknown'}`}>
                <div className="pa-card-header">
                  <FaCalendarAlt />
                  <span>{formatarData(app.scheduled_at)}</span>
                </div>
                <div className="pa-card-body">
                  <div className="pa-doctor-info">
                    <FaStethoscope />
                    <div>
                      <strong>Dr(a). {app.doctors?.full_name || 'Médico não informado'}</strong>
                      <span>{app.doctors?.specialty || 'Clínico Geral'}</span>
                    </div>
                  </div>
                </div>
                <div className="pa-card-footer">
                  {app.status === 'completed' && (
                    <span className="pa-badge status-completed">
                      <FaCheckCircle /> Concluída
                    </span>
                  )}
                  {app.status === 'confirmed' && (
                    <span className="pa-badge status-confirmed">
                      <FaClock /> Confirmada
                    </span>
                  )}
                  {app.status === 'cancelled' && (
                    <span className="pa-badge status-cancelled">
                      <FaExclamationCircle /> Cancelada
                    </span>
                  )}
                  {app.status === 'requested' && (
                    <span className="pa-badge status-requested">
                      Pendente
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}