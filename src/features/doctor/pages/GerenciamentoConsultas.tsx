// Ficheiro: @/features/doctor/pages/GerenciamentoConsultas.tsx
// Versão realmente reduzida - modal compacto

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { FaSearch, FaEye, FaCheck, FaTimes, FaUserMd, FaPlus } from 'react-icons/fa';
import AccessibilityMenu from "../../../components/ui/AccessibilityMenu";

interface Consulta {
  id: string;
  scheduled_at: string;
  status: string;
  patients: {
    id: string;
    full_name: string;
    cpf?: string;
    phone_mobile?: string;
  } | null;
}

type AppointmentType = 'presencial' | 'telemedicina';

const WEEKDAYS_LABELS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

function formatCPF(v: string | undefined | null): string {
  if (!v) return '—';
  const only = String(v).replace(/\D/g, '').padStart(11, '0').slice(-11);
  return only.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

function formatData(isoString: string): string {
  try {
    return new Date(isoString).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
  } catch {
    return 'Data inválida';
  }
}

function formatHora(isoString: string): string {
  try {
    return new Date(isoString).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });
  } catch {
    return '--:--';
  }
}

export default function GerenciamentoConsultasPage() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [consultas, setConsultas] = useState<Consulta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [doctorName, setDoctorName] = useState('Médico(a)');
  const [doctorId, setDoctorId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [formWeekday, setFormWeekday] = useState<number>(1);
  const [formStart, setFormStart] = useState<string>('08:00');
  const [formEnd, setFormEnd] = useState<string>('12:00');
  const [formSlot, setFormSlot] = useState<number>(30);
  const [formType, setFormType] = useState<AppointmentType>('presencial');
  const [formActive, setFormActive] = useState<boolean>(true);

  const carregarConsultas = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: userResp, error: authError } = await supabase.auth.getUser();
      if (authError || !userResp?.user) throw new Error('Sessão não encontrada.');

      const { data: doctorData, error: doctorError } = await supabase
        .from('doctors')
        .select('id, full_name')
        .eq('user_id', userResp.user.id)
        .single();
      if (doctorError || !doctorData) throw new Error('Médico não encontrado.');

      setDoctorId(doctorData.id);
      setDoctorName(doctorData.full_name || 'Médico(a)');

      const { data: consultasData, error: consultasError } = await supabase
        .from('appointments')
        .select(`
          id,
          scheduled_at,
          status,
          patients (id, full_name, cpf, phone_mobile)
        `)
        .eq('doctor_id', doctorData.id)
        .order('scheduled_at', { ascending: false });

      if (consultasError) throw consultasError;

      const formatted: Consulta[] = (consultasData || []).map((c: any) => ({
        ...c,
        patients: Array.isArray(c.patients) ? (c.patients[0] || null) : (c.patients || null),
      }));

      setConsultas(formatted);
    } catch (err: any) {
      setError(err.message || 'Falha ao carregar.');
      setConsultas([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    carregarConsultas();
  }, [carregarConsultas]);

  const filteredConsultas = useMemo(() => {
    const lower = searchTerm.toLowerCase();
    return consultas.filter(c => {
      const p = c.patients;
      if (!p) return false;
      return (
        (p.full_name && p.full_name.toLowerCase().includes(lower)) ||
        (p.cpf && formatCPF(p.cpf).includes(lower))
      );
    });
  }, [consultas, searchTerm]);

  const handleCreateAvailability = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);

    if (!doctorId) {
      setCreateError('Sessão inválida.');
      return;
    }

    const [sh, sm] = formStart.split(':').map(Number);
    const [eh, em] = formEnd.split(':').map(Number);
    const startTotal = sh * 60 + sm;
    const endTotal = eh * 60 + em;
    
    if (startTotal >= endTotal) {
      setCreateError('Horário inicial deve ser menor que o final.');
      return;
    }

    setCreating(true);
    try {
      const { error: insertError } = await supabase
        .from('doctor_availability')
        .insert({
          doctor_id: doctorId,
          weekday: WEEKDAYS_LABELS[formWeekday].toLowerCase(),
          start_time: formStart,
          end_time: formEnd,
          slot_minutes: formSlot,
          appointment_type: formType,
          active: formActive,
        });

      if (insertError) throw insertError;

      setShowCreateModal(false);
    } catch (err: any) {
      setCreateError(err?.message || 'Erro ao criar disponibilidade.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="page-container">
      <main className="main-container">
        <section className="card">
          <div className="card-header">
            <div className="title">
              <h1>Minhas Consultas</h1>
              <span className="badge">Agenda</span>
            </div>

            <div className="toolbar">
              <div className="search">
                <FaSearch />
                <input
                  placeholder="Buscar por nome ou CPF..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <button
                type="button"
                className="btn-primary"
                onClick={() => setShowCreateModal(true)}
              >
                <FaPlus />
                Criar disponibilidade
              </button>
            </div>
          </div>

          {error && <div className="error-message">Erro: {error}</div>}

          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Paciente</th>
                  <th>CPF</th>
                  <th>Data</th>
                  <th>Horário</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6}>Carregando consultas...</td>
                  </tr>
                ) : filteredConsultas.length === 0 ? (
                  <tr>
                    <td colSpan={6}>Nenhuma consulta encontrada</td>
                  </tr>
                ) : (
                  filteredConsultas.map((c) => (
                    <tr key={c.id}>
                      <td>{c.patients?.full_name || 'Paciente não encontrado'}</td>
                      <td>{formatCPF(c.patients?.cpf)}</td>
                      <td>{formatData(c.scheduled_at)}</td>
                      <td>{formatHora(c.scheduled_at)}</td>
                      <td>
                        <span className={`status-badge status-${c.status}`}>
                          {c.status === 'requested' ? 'Solicitada' :
                           c.status === 'confirmed' ? 'Confirmada' :
                           c.status === 'completed' ? 'Realizada' :
                           c.status === 'cancelled' ? 'Cancelada' : c.status}
                        </span>
                      </td>
                      <td className="actions">
                        <button title="Ver detalhes">
                          <FaEye />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      {/* MODAL CRIAR DISPONIBILIDADE - COMPACTO */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-compact" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Criar disponibilidade</h3>
              <small>Médico: {doctorName}</small>
            </div>

            <form onSubmit={handleCreateAvailability}>
              <div className="modal-body">
                {createError && <div className="error">{createError}</div>}

                <div className="form-group">
                  <label>Dia da semana</label>
                  <select
                    value={formWeekday}
                    onChange={(e) => setFormWeekday(Number(e.target.value))}
                  >
                    {WEEKDAYS_LABELS.map((label, idx) => (
                      <option value={idx} key={idx}>{idx} — {label}</option>
                    ))}
                  </select>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Início</label>
                    <input 
                      type="time" 
                      value={formStart} 
                      onChange={(e) => setFormStart(e.target.value)} 
                      required 
                    />
                  </div>
                  <div className="form-group">
                    <label>Fim</label>
                    <input 
                      type="time" 
                      value={formEnd} 
                      onChange={(e) => setFormEnd(e.target.value)} 
                      required 
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Duração (min)</label>
                    <input
                      type="number"
                      min={15}
                      max={120}
                      value={formSlot}
                      onChange={(e) => setFormSlot(Number(e.target.value))}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Tipo</label>
                    <select 
                      value={formType} 
                      onChange={(e) => setFormType(e.target.value as AppointmentType)}
                    >
                      <option value="presencial">Presencial</option>
                      <option value="telemedicina">Telemedicina</option>
                    </select>
                  </div>
                </div>

                <div className="form-checkbox">
                  <label>
                    <input 
                      type="checkbox" 
                      checked={formActive} 
                      onChange={(e) => setFormActive(e.target.checked)} 
                    />
                    Ativo
                  </label>
                </div>
              </div>

              <div className="modal-footer">
                <button 
                  type="button" 
                  onClick={() => setShowCreateModal(false)}
                  disabled={creating}
                >
                  Cancelar
                </button>
                <button type="submit" disabled={creating}>
                  {creating ? 'Criando...' : 'Criar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <AccessibilityMenu />

      <style>{`
        .page-container {
          padding: 20px;
          min-height: 100vh;
          background: var(--color-bg-primary);
        }
        
        .main-container {
          max-width: 1200px;
          margin: 0 auto;
        }
        
        .card {
          background: var(--color-bg-card);
          border-radius: 8px;
          box-shadow: var(--shadow-sm);
          border: 1px solid var(--color-border);
        }
        
        .card-header {
          padding: 20px;
          border-bottom: 1px solid var(--color-border);
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 16px;
        }
        
        .title {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        
        .title h1 {
          margin: 0;
          font-size: 1.5rem;
          color: var(--color-text-primary);
        }
        
        .badge {
          background: var(--color-bg-tertiary);
          color: var(--color-text-muted);
          padding: 4px 8px;
          border-radius: 6px;
          font-size: 0.8rem;
        }
        
        .toolbar {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        
        .search {
          display: flex;
          align-items: center;
          background: var(--color-bg-card);
          border: 1px solid var(--color-border);
          border-radius: 6px;
          padding: 8px 12px;
          min-width: 300px;
        }
        
        .search input {
          background: transparent;
          border: none;
          outline: none;
          margin-left: 8px;
          width: 100%;
          color: var(--color-text-primary);
        }
        
        .search input::placeholder {
          color: var(--color-text-muted);
        }
        
        .btn-primary {
          background: var(--color-primary);
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 6px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        
        .btn-primary:hover {
          background: var(--color-primary-dark);
        }
        
        .error-message {
          background: rgba(239, 68, 68, 0.1);
          color: #dc2626;
          padding: 12px 20px;
          border: 1px solid rgba(239, 68, 68, 0.2);
        }
        
        .table-container {
          overflow-x: auto;
        }
        
        .table {
          width: 100%;
          border-collapse: collapse;
        }
        
        .table th {
          background: var(--color-bg-tertiary);
          padding: 12px 16px;
          text-align: left;
          font-weight: 600;
          color: var(--color-text-primary);
          border-bottom: 1px solid var(--color-border);
        }
        
        .table td {
          padding: 12px 16px;
          border-bottom: 1px solid var(--color-border);
          color: var(--color-text-primary);
        }
        
        .status-badge {
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 0.8rem;
          font-weight: 500;
        }
        
        .status-requested { background: #fef3c7; color: #92400e; }
        .status-confirmed { background: #dbeafe; color: #1e40af; }
        .status-completed { background: #dcfce7; color: #166534; }
        .status-cancelled { background: #fee2e2; color: #991b1b; }
        
        .actions {
          display: flex;
          justify-content: flex-end;
          gap: 8px;
        }
        
        .actions button {
          background: var(--color-bg-tertiary);
          color: var(--color-text-primary);
          border: 1px solid var(--color-border);
          padding: 6px;
          border-radius: 4px;
          cursor: pointer;
        }
        
        /* MODAL COMPACTO */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
        }
        
        .modal-compact {
          background: var(--color-bg-card);
          border-radius: 8px;
          width: 100%;
          max-width: 400px;
          max-height: 90vh;
          overflow-y: auto;
          border: 1px solid var(--color-border);
        }
        
        .modal-header {
          padding: 16px 20px;
          border-bottom: 1px solid var(--color-border);
        }
        
        .modal-header h3 {
          margin: 0 0 4px 0;
          color: var(--color-text-primary);
        }
        
        .modal-header small {
          color: var(--color-text-muted);
        }
        
        .modal-body {
          padding: 20px;
        }
        
        .form-group {
          margin-bottom: 16px;
        }
        
        .form-group label {
          display: block;
          margin-bottom: 4px;
          color: var(--color-text-primary);
          font-weight: 500;
        }
        
        .form-group input,
        .form-group select {
          width: 100%;
          padding: 8px 12px;
          border: 1px solid var(--color-border);
          border-radius: 6px;
          font-size: 14px;
          background: var(--color-bg-card);
          color: var(--color-text-primary);
        }
        
        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }
        
        .form-checkbox {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .form-checkbox label {
          display: flex;
          align-items: center;
          gap: 8px;
          margin: 0;
          cursor: pointer;
          color: var(--color-text-primary);
        }
        
        .error {
          background: rgba(239, 68, 68, 0.1);
          color: #dc2626;
          padding: 8px 12px;
          border-radius: 6px;
          margin-bottom: 16px;
          font-size: 0.9rem;
          border: 1px solid rgba(239, 68, 68, 0.2);
        }
        
        .modal-footer {
          padding: 16px 20px;
          border-top: 1px solid var(--color-border);
          display: flex;
          justify-content: flex-end;
          gap: 12px;
        }
        
        .modal-footer button {
          padding: 8px 16px;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 500;
        }
        
        .modal-footer button:first-child {
          background: var(--color-bg-tertiary);
          color: var(--color-text-primary);
          border: 1px solid var(--color-border);
        }
        
        .modal-footer button:last-child {
          background: var(--color-primary);
          color: white;
        }
        
        .modal-footer button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        
        @media (max-width: 768px) {
          .card-header {
            flex-direction: column;
            align-items: flex-start;
          }
          
          .toolbar {
            width: 100%;
          }
          
          .search {
            min-width: auto;
            flex: 1;
          }
          
          .form-row {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}