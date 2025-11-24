// Ficheiro: @/features/doctor/pages/GerenciamentoConsultas.tsx
// Página de consultas com botão "Criar disponibilidade" e modal para inserir em doctor_availability.
// Versão revisada: remove variáveis não usadas, corrige tipagens e implementa fallback exaustivo do ENUM de weekday.

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

import '@/styles/GerenciamentoPacientesPage.css';

// Ícones
import { Stethoscope, Search } from 'lucide-react';
import { FaSearch, FaEye, FaCheck, FaTimes, FaUserMd, FaPlus } from 'react-icons/fa';
import AccessibilityMenu from "../../../components/ui/AccessibilityMenu";

// -----------------------------
// Tipos
// -----------------------------
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

// -----------------------------
// Helpers / Constantes
// -----------------------------
const WEEKDAYS_LABELS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

// Candidatos EXAUSTIVOS de rótulos de weekday (índice 0..6)
const CANDIDATE_SETS: string[][] = [
  // pt-BR longos (com/sem acento)
  ['domingo','segunda','terça','quarta','quinta','sexta','sábado'],
  ['domingo','segunda','terca','quarta','quinta','sexta','sabado'],
  // pt abreviados (com/sem acento)
  ['dom','seg','ter','qua','qui','sex','sáb'],
  ['dom','seg','ter','qua','qui','sex','sab'],
  // EN curto e longo
  ['sun','mon','tue','wed','thu','fri','sat'],
  ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'],
  // Title Case
  ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'],
  ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'],
  ['Domingo','Segunda','Terca','Quarta','Quinta','Sexta','Sabado'],
  // CAPS
  ['DOMINGO','SEGUNDA','TERÇA','QUARTA','QUINTA','SEXTA','SÁBADO'],
  ['DOMINGO','SEGUNDA','TERCA','QUARTA','QUINTA','SEXTA','SABADO'],
  ['DOM','SEG','TER','QUA','QUI','SEX','SÁB'],
  ['DOM','SEG','TER','QUA','QUI','SEX','SAB'],
  // números como texto
  ['0','1','2','3','4','5','6'],
];

function formatCPF(v: string | undefined | null): string {
  if (!v) return '—';
  const only = String(v).replace(/\D/g, '').padStart(11, '0').slice(-11);
  return only.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

function formatData(isoString: string): string {
  try {
    const data = new Date(isoString);
    return data.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
  } catch {
    return 'Data inválida';
  }
}

function formatHora(isoString: string): string {
  try {
    const data = new Date(isoString);
    return data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });
  } catch {
    return '--:--';
  }
}

// tenta “aprender” um rótulo existente (se houver registro já criado)
async function detectWeekdaySample(): Promise<string | null> {
  try {
    const { data, error } = await supabase.from('doctor_availability').select('weekday').limit(1);
    if (error || !data || !data[0]?.weekday) return null;
    return String(data[0].weekday);
  } catch {
    return null;
  }
}

// -----------------------------
// Componente
// -----------------------------
export default function GerenciamentoConsultasPage() {
  const navigate = useNavigate();

  // estado consultas
  const [searchTerm, setSearchTerm] = useState('');
  const [consultas, setConsultas] = useState<Consulta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // estado médico
  const [doctorName, setDoctorName] = useState('Médico(a)');
  const [doctorId, setDoctorId] = useState<string | null>(null);

  // modal disponibilidade
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // form disponibilidade
  const [formWeekday, setFormWeekday] = useState<number>(1); // segunda
  const [formStart, setFormStart] = useState<string>('08:00');
  const [formEnd, setFormEnd] = useState<string>('12:00');
  const [formSlot, setFormSlot] = useState<number>(30);
  const [formType, setFormType] = useState<AppointmentType>('presencial');
  const [formActive, setFormActive] = useState<boolean>(true);

  // modal de detalhes da consulta
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedConsulta, setSelectedConsulta] = useState<Consulta | null>(null);

  // carregar consultas + médico
  const carregarConsultas = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: userResp, error: authError } = await supabase.auth.getUser();
      if (authError || !userResp?.user) throw new Error('Sessão não encontrada. Faça login novamente.');

      const { data: doctorData, error: doctorError } = await supabase
        .from('doctors')
        .select('id, full_name')
        .eq('user_id', userResp.user.id)
        .single();
      if (doctorError || !doctorData) throw new Error('Registro de médico não encontrado para este usuário.');

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
      console.error('Erro ao carregar consultas:', err);
      setError(err.message || 'Falha ao carregar a lista.');
      setConsultas([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    carregarConsultas();
  }, [carregarConsultas]);

  const handleUpdateStatus = async (id: string, newStatus: Consulta['status']) => {
    const ok = window.confirm(`Tem certeza que deseja alterar o status desta consulta para "${newStatus}"?`);
    if (!ok) return;

    const prev = [...consultas];
    setConsultas(prevList => prevList.map(c => (c.id === id ? { ...c, status: newStatus } : c)));

    try {
      const { error: upErr } = await supabase.from('appointments').update({ status: newStatus }).eq('id', id);
      if (upErr) throw upErr;
    } catch (err: any) {
      console.error('Falha ao atualizar status:', err);
      alert(`Falha ao atualizar status: ${err.message}`);
      setConsultas(prev);
    }
  };

  const handleViewPatient = (patientId?: string) => {
    if (!patientId) {
      alert('Erro: Paciente não associado.');
      return;
    }
    navigate(`/doctor/pacientes/${patientId}`);
  };

  const handleOpenConsultaDetails = (consulta: Consulta) => {
    setSelectedConsulta(consulta);
    setShowDetailsModal(true);
  };

  const handleCloseConsultaDetails = () => {
    setShowDetailsModal(false);
    setSelectedConsulta(null);
  };

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

  // modal handlers
  const resetCreateForm = () => {
    setFormWeekday(1);
    setFormStart('08:00');
    setFormEnd('12:00');
    setFormSlot(30);
    setFormType('presencial');
    setFormActive(true);
    setCreateError(null);
  };

  const openCreateModal = async () => {
    resetCreateForm();
    // não precisamos detectar antecipadamente; faremos fallback na inserção
    setShowCreateModal(true);
  };

  const closeCreateModal = () => setShowCreateModal(false);

  // tentativa única com um rótulo
  async function tryInsertAvailabilityWithLabel(label: string) {
    if (!doctorId) throw new Error('Sessão inválida. Entre novamente.');
    return supabase
      .from('doctor_availability')
      .insert({
        doctor_id: doctorId,
        weekday: label, // ENUM label
        start_time: formStart,
        end_time: formEnd,
        slot_minutes: formSlot,
        appointment_type: formType,
        active: formActive,
      })
      .select('id')
      .single();
  }

  const handleCreateAvailability = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);

    // validações básicas
    const [sh, sm] = (formStart || '').split(':').map(Number);
    const [eh, em] = (formEnd || '').split(':').map(Number);
    if ([sh, sm, eh, em].some(Number.isNaN)) {
      setCreateError('Horários inválidos.');
      return;
    }
    const startTotal = sh * 60 + sm;
    const endTotal = eh * 60 + em;
    if (startTotal >= endTotal) {
      setCreateError('O horário inicial deve ser menor que o final.');
      return;
    }
    if (formSlot < 15 || formSlot > 120) {
      setCreateError('A duração do slot deve estar entre 15 e 120 minutos.');
      return;
    }
    if (formWeekday < 0 || formWeekday > 6) {
      setCreateError('Dia da semana inválido (0=Dom, ..., 6=Sáb).');
      return;
    }
    if (!doctorId) {
      setCreateError('Sessão inválida. Entre novamente.');
      return;
    }

    setCreating(true);
    try {
      // prioriza um sample existente, se houver
      const sample = await detectWeekdaySample();
      const orderedSets = [...CANDIDATE_SETS];
      if (sample) {
        const idx = orderedSets.findIndex(set => set.includes(sample));
        if (idx > 0) {
          const picked = orderedSets.splice(idx, 1)[0];
          orderedSets.unshift(picked);
        }
      }

      let lastErr: any = null;
      let success = false;

      for (const set of orderedSets) {
        const label = set[formWeekday]; // 0..6
        const resp = await tryInsertAvailabilityWithLabel(label);
        if (!resp.error) {
          success = true;
          break;
        }
        lastErr = resp.error;
        // se erro não for ENUM (22P02), interrompe (ex.: RLS/sobreposição)
        if (resp.error?.code && resp.error.code !== '22P02') break;
      }

      if (!success) throw lastErr || new Error('Falha ao criar disponibilidade.');

      setShowCreateModal(false);
      setCreateError(null);
    } catch (err: any) {
      console.error('Falha ao criar disponibilidade:', err);
      setCreateError(
        err?.message ||
        'Não foi possível criar a disponibilidade. Verifique regras de sobreposição/permissões.'
      );
    } finally {
      setCreating(false);
    }
  };

  // -----------------------------
  // Render
  // -----------------------------
  return (
    <>
      <main className="container">
        <section className="card">
          <div className="head">
            <div className="title">
              <h1>Minhas Consultas</h1>
              <span className="badge">Agenda</span>
            </div>

            <div className="toolbar">
              <div className="search">
                <FaSearch style={{ color: '#6b7a88', marginRight: '8px' }} />
                <input
                  id="q_table"
                  placeholder="Buscar por nome ou CPF do paciente..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <button
                type="button"
                className="page-btn "
                style={{ marginLeft: '12px' }}
                onClick={openCreateModal}
                title="Criar disponibilidade"
              >
                <FaPlus style={{ marginRight: 6 }} />
                Criar disponibilidade
              </button>
            </div>
          </div>

          {error && (
            <div style={{ padding: '1rem 1.2rem', color: 'red', background: '#ffebee' }}>
              Erro: {error}
            </div>
          )}

          <div className="table-wrap">
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
                    <td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}>Carregando consultas...</td>
                  </tr>
                ) : filteredConsultas.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}>
                      Nenhuma consulta encontrada{searchTerm ? ' para "' + searchTerm + '"' : ''}.
                    </td>
                  </tr>
                ) : (
                  filteredConsultas.map((c) => (
                    <tr className="row" key={c.id}>
                      <td>{c.patients?.full_name || 'Paciente não encontrado'}</td>
                      <td>{formatCPF(c.patients?.cpf)}</td>
                      <td>{formatData(c.scheduled_at)}</td>
                      <td>{formatHora(c.scheduled_at)}</td>
                      <td>
                        <span className={`badge status-${c.status || 'default'}`}>
                          {c.status === 'requested'
                            ? 'Solicitada'
                            : c.status === 'confirmed'
                            ? 'Confirmada'
                            : c.status === 'completed'
                            ? 'Realizada'
                            : c.status === 'cancelled'
                            ? 'Cancelada'
                            : c.status.charAt(0).toUpperCase() + c.status.slice(1)}
                        </span>
                      </td>
                      <td className="col-actions">
                        {c.status === 'requested' && (
                          <button className="page-btn btn-confirm" onClick={() => handleUpdateStatus(c.id, 'confirmed')} title="Confirmar Consulta">
                            <FaCheck />
                          </button>
                        )}
                        {c.status === 'confirmed' && (
                          <button className="page-btn btn-complete" onClick={() => handleUpdateStatus(c.id, 'completed')} title="Marcar como Realizada">
                            <FaUserMd />
                          </button>
                        )}
                        {(c.status === 'requested' || c.status === 'confirmed') && (
                          <button className="page-btn btn-del" onClick={() => handleUpdateStatus(c.id, 'cancelled')} title="Cancelar Consulta">
                            <FaTimes />
                          </button>
                        )}
                        <button
                          className="page-btn btn-view"
                          onClick={() => handleOpenConsultaDetails(c)}
                          title="Ver detalhes da consulta"
                        >
                          <FaEye />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="table-footer">
            <small className="muted" id="countLabel">
              Mostrando {filteredConsultas.length} de {consultas.length} consulta(s)
              {searchTerm && ` (filtrado de ${consultas.length})`}
            </small>
          </div>
        </section>
      </main>

      {/* MODAL: Detalhes da consulta */}
      {showDetailsModal && selectedConsulta && (
        <div
          role="dialog"
          aria-modal="true"
          className="modal-overlay"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
            zIndex: 1000,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) handleCloseConsultaDetails();
          }}
        >
          <div
            className="modal-card"
            style={{
              width: "100%",
              maxWidth: 520,
              background: "#fff",
              borderRadius: 12,
              boxShadow: "0 10px 30px rgba(0,0,0,0.15)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "1rem 1.25rem",
                borderBottom: "1px solid #eef2f7",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 8,
              }}
            >
              <div>
                <h2 style={{ margin: 0, fontSize: 18 }}>Detalhes da consulta</h2>
                <small className="muted">
                  Paciente:{" "}
                  {selectedConsulta.patients?.full_name || "Paciente não encontrado"}
                </small>
              </div>
              <button
                type="button"
                className="page-btn btn-secondary"
                onClick={handleCloseConsultaDetails}
              >
                Fechar
              </button>
            </div>

            <div style={{ padding: "1rem 1.25rem", fontSize: "0.95rem" }}>
              <div style={{ marginBottom: 10 }}>
                <strong>Data:</strong>{" "}
                {formatData(selectedConsulta.scheduled_at)}
              </div>
              <div style={{ marginBottom: 10 }}>
                <strong>Horário:</strong>{" "}
                {formatHora(selectedConsulta.scheduled_at)}
              </div>
              <div style={{ marginBottom: 10 }}>
                <strong>Status:</strong>{" "}
                <span className={`badge status-${selectedConsulta.status || "default"}`}>
                  {selectedConsulta.status === "requested"
                    ? "Solicitada"
                    : selectedConsulta.status === "confirmed"
                    ? "Confirmada"
                    : selectedConsulta.status === "completed"
                    ? "Realizada"
                    : selectedConsulta.status === "cancelled"
                    ? "Cancelada"
                    : selectedConsulta.status
                    ? selectedConsulta.status.charAt(0).toUpperCase() +
                      selectedConsulta.status.slice(1)
                    : "—"}
                </span>
              </div>
              <div style={{ marginBottom: 10 }}>
                <strong>Paciente:</strong>{" "}
                {selectedConsulta.patients?.full_name || "Paciente não encontrado"}
              </div>
              <div style={{ marginBottom: 10 }}>
                <strong>CPF:</strong>{" "}
                {formatCPF(selectedConsulta.patients?.cpf)}
              </div>
              <div style={{ marginBottom: 10 }}>
                <strong>Telefone:</strong>{" "}
                {selectedConsulta.patients?.phone_mobile || "—"}
              </div>
            </div>

            <div
              style={{
                padding: "0.85rem 1.25rem",
                borderTop: "1px solid #eef2f7",
                display: "flex",
                justifyContent: "flex-end",
                gap: 8,
              }}
            >
              <button
                type="button"
                className="page-btn btn-secondary"
                onClick={handleCloseConsultaDetails}
              >
                Fechar
              </button>
              <button
                type="button"
                className="page-btn btn-primary"
                onClick={() => {
                  handleCloseConsultaDetails();
                  handleViewPatient(selectedConsulta.patients?.id);
                }}
              >
                Ver prontuário
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Criar disponibilidade */}
      {showCreateModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="modal-overlay"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
            zIndex: 1000,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) closeCreateModal();
          }}
        >
          <div
            className="modal-card"
            style={{
              width: '100%',
              maxWidth: 520,
              background: '#fff',
              borderRadius: 12,
              boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
              overflow: 'hidden',
            }}
          >
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #eef2f7' }}>
              <h2 style={{ margin: 0, fontSize: 18 }}>Criar disponibilidade</h2>
              <small className="muted">Médico: {doctorName}</small>
            </div>

            <form onSubmit={handleCreateAvailability}>
              <div style={{ padding: '1rem 1.25rem' }}>
                {createError && (
                  <div style={{ marginBottom: 12, padding: '8px 10px', color: '#b00020', background: '#ffebee', borderRadius: 8 }}>
                    {createError}
                  </div>
                )}

                <div className="form-group" style={{ marginBottom: 12 }}>
                  <label className="text-sm text-gray-700 block" htmlFor="weekday">
                    Dia da semana
                  </label>
                  <select
                    id="weekday"
                    className="input"
                    value={formWeekday}
                    onChange={(e) => setFormWeekday(parseInt(e.target.value, 10))}
                    style={{ width: '100%' }}
                  >
                    {WEEKDAYS_LABELS.map((label, idx) => (
                      <option value={idx} key={idx}>
                        {idx} — {label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-row" style={{ display: 'flex', gap: 12 }}>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="text-sm text-gray-700 block" htmlFor="start_time">Início</label>
                    <input id="start_time" type="time" className="input" value={formStart} onChange={(e) => setFormStart(e.target.value)} required />
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="text-sm text-gray-700 block" htmlFor="end_time">Fim</label>
                    <input id="end_time" type="time" className="input" value={formEnd} onChange={(e) => setFormEnd(e.target.value)} required />
                  </div>
                </div>

                <div className="form-row" style={{ display: 'flex', gap: 12 }}>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="text-sm text-gray-700 block" htmlFor="slot_minutes">Duração do slot (min)</label>
                    <input
                      id="slot_minutes"
                      type="number"
                      min={15}
                      max={120}
                      step={5}
                      className="input"
                      value={formSlot}
                      onChange={(e) => setFormSlot(parseInt(e.target.value || '0', 10))}
                      required
                    />
                  </div>

                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="text-sm text-gray-700 block" htmlFor="appointment_type">Tipo</label>
                    <select id="appointment_type" className="input" value={formType} onChange={(e) => setFormType(e.target.value as AppointmentType)}>
                      <option value="presencial">presencial</option>
                      <option value="telemedicina">telemedicina</option>
                    </select>
                  </div>
                </div>

                <div className="form-group" style={{ marginTop: 6 }}>
                  <label className="text-sm text-gray-700" htmlFor="active" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input id="active" type="checkbox" checked={formActive} onChange={(e) => setFormActive(e.target.checked)} />
                    Ativo
                  </label>
                </div>

                <div style={{ marginTop: 6 }}>
                  <small className="muted">
                    created_by/updated_by são preenchidos pelo backend. Regras: sem sobreposição; início &lt; fim.
                  </small>
                </div>
              </div>

              <div style={{ padding: '0.85rem 1.25rem', borderTop: '1px solid #eef2f7', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button type="button" className="page-btn btn-secondary" onClick={closeCreateModal} disabled={creating}>Cancelar</button>
                <button type="submit" className="page-btn btn-primary" disabled={creating}>{creating ? 'Criando...' : 'Criar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
