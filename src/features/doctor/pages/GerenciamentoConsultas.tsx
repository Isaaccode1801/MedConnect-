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
  const only = String(v).replace(/\\D/g, '').padStart(11, '0').slice(-11);
  return only.replace(/(\\d{3})(\\d{3})(\\d{3})(\\d{2})/, '$1.$2.$3-$4');
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

// tenta "aprender" um rótulo existente (se houver registro já criado)
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

  // ---------------------------
  // Estados para Exceção de Agenda
  // ---------------------------
  const [showExcecaoModal, setShowExcecaoModal] = useState(false);
  const [exDate, setExDate] = useState<string>('');
  const [exStart, setExStart] = useState<string>('');
  const [exEnd, setExEnd] = useState<string>('');
  const [exReason, setExReason] = useState<string>('');
  const [creatingException, setCreatingException] = useState(false);
  const [exceptions, setExceptions] = useState<any[]>([]);
  const [showToolbarMenu, setShowToolbarMenu] = useState(false);

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
  // Exceções: funções de API (mock)
  // -----------------------------
  async function fetchExceptionsForDoctor(dId?: string) {
    if (!dId) return [];
    try {
      const params = new URLSearchParams();
      params.set('doctor_id', dId);
      const res = await fetch('https://mock.apidog.com/m1/1053378-0-default/rest/v1/doctor_exceptions?' + params.toString());
      if (!res.ok) {
        console.warn('Falha ao listar exceções:', res.status);
        return [];
      }
      const data = await res.json();
      if (!data) return [];
      if (Array.isArray(data)) return data;
      return [data];
    } catch (err) {
      console.error('Erro fetchExceptionsForDoctor', err);
      return [];
    }
  }

  const handleCreateException = async () => {
  if (!exDate) {
    alert("Data da exceção é obrigatória.");
    return;
  }
  if (!exReason) {
    alert("Motivo é obrigatório.");
    return;
  }

  setCreatingException(true);

  try {
    const payload = {
      doctor_id: doctorId || "123e4567-e89b-12d3-a456-426614174000",
      date: exDate,
      kind: "bloqueio",
      start_time: exStart ? exStart : null,
      end_time: exEnd ? exEnd : null,
      reason: exReason,
      created_by: "admin-uuid",
    };

    const res = await fetch(
      "https://mock.apidog.com/m1/1053378-0-default/rest/v1/doctor_exceptions",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );

    // ERRO HTTP
    if (!res.ok) {
      const txt = await res.text();
      console.error("Erro ao criar exceção:", res.status, txt);
      alert("Erro ao criar exceção: " + res.status);
      return;
    }

    // A MOCK RETORNA VAZIO → EVITAR JSON.PARSE EM VAZIO
    const responseText = await res.text();
    let created = null;

    if (responseText) {
      try {
        created = JSON.parse(responseText);
      } catch (e) {
        console.warn("Resposta NÃO é JSON válido:", responseText);
      }
    }

    // Se veio algo, adiciona na lista
    if (created) {
      setExceptions((prev) => [created, ...prev]);
    }

    setExDate("");
    setExStart("");
    setExEnd("");
    setExReason("");
    setShowExcecaoModal(false);

    alert("Exceção criada com sucesso.");
  } catch (err) {
    console.error("handleCreateException error", err);
    alert("Erro ao criar exceção.");
  } finally {
    setCreatingException(false);
  }
};

  useEffect(() => {
    (async () => {
      if (doctorId) {
        const list = await fetchExceptionsForDoctor(doctorId);
        setExceptions(list);
      }
    })();
  }, [doctorId]);

  // -----------------------------
  // Render
  // -----------------------------
  return (
    <>
      <AccessibilityMenu />
      <main className="container">
        <section className="card">
          <div className="head">
            <div className="title">
              <h1 style={{ color: 'var(--color-text-primary)' }}>Minhas Consultas</h1>
              <span className="badge">Agenda</span>
            </div>

            <div className="toolbar">
              <div className="search">
                <FaSearch style={{ color: 'var(--color-text-muted)', marginRight: '8px' }} />
                <input
                  id="q_table"
                  placeholder="Buscar por nome ou CPF do paciente..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              {/* Dropdown: Criar disponibilidade / Criar exceção */}
             {/* Dropdown: Criar disponibilidade / Criar exceção */}
<div style={{ position: 'relative', marginLeft: '12px' }}>
  <button
    type="button"
    className="page-btn"
    onClick={() => setShowToolbarMenu(prev => !prev)}
    title="Criar novo horário"
  >
    <FaPlus style={{ marginRight: 6 }} />
    Criar novo horário ▾
  </button>

  {showToolbarMenu && (
    <div
      style={{
        position: 'absolute',
        right: 0,
        marginTop: 8,
        background: 'var(--color-bg-card)',
        border: '1px solid var(--color-border)',
        borderRadius: 8,
        boxShadow: 'var(--shadow-lg)',
        zIndex: 1200,
        minWidth: 220,
        overflow: 'hidden'
      }}
    >
      <button
        style={{
          display: 'flex',
          alignItems: 'center',
          width: '100%',
          padding: '10px 12px',
          border: 'none',
          background: 'transparent',
          cursor: 'pointer',
          fontSize: 14
        }}
        onClick={() => {
          setShowToolbarMenu(false);
          openCreateModal(); // <-- MODAL DE DISPONIBILIDADE
        }}
      >
        <FaPlus style={{ marginRight: 8 }} />
        Nova disponibilidade
      </button>

      <button
        style={{
          display: 'flex',
          alignItems: 'center',
          width: '100%',
          padding: '10px 12px',
          border: 'none',
          background: 'transparent',
          cursor: 'pointer',
          fontSize: 14
        }}
        onClick={() => {
          setShowToolbarMenu(false);
          setShowExcecaoModal(true); // <-- MODAL DE EXCEÇÃO
        }}
      >
        <FaTimes style={{ marginRight: 8 }} />
        Nova exceção
      </button>
    </div>
  )}
</div>
            </div>
          </div>

          {error && (
            <div style={{ 
              padding: '1rem 1.2rem', 
              color: '#b00020', 
              background: 'rgba(239, 68, 68, 0.1)', 
              borderRadius: '8px',
              margin: '0 1.2rem'
            }}>
              Erro: {error}
            </div>
          )}

          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th style={{ color: 'var(--color-text-primary)' }}>Paciente</th>
                  <th style={{ color: 'var(--color-text-primary)' }}>CPF</th>
                  <th style={{ color: 'var(--color-text-primary)' }}>Data</th>
                  <th style={{ color: 'var(--color-text-primary)' }}>Horário</th>
                  <th style={{ color: 'var(--color-text-primary)' }}>Status</th>
                  <th style={{ textAlign: 'right', color: 'var(--color-text-primary)' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)' }}>Carregando consultas...</td>
                  </tr>
                ) : filteredConsultas.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)' }}>
                      Nenhuma consulta encontrada{searchTerm ? ' para "' + searchTerm + '"' : ''}.
                    </td>
                  </tr>
                ) : (
                  filteredConsultas.map((c) => (
                    <tr className="row" key={c.id}>
                      <td style={{ color: 'var(--color-text-primary)' }}>{c.patients?.full_name || 'Paciente não encontrado'}</td>
                      <td style={{ color: 'var(--color-text-secondary)' }}>{formatCPF(c.patients?.cpf)}</td>
                      <td style={{ color: 'var(--color-text-primary)' }}>{formatData(c.scheduled_at)}</td>
                      <td style={{ color: 'var(--color-text-primary)' }}>{formatHora(c.scheduled_at)}</td>
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
            <small className="muted" id="countLabel" style={{ color: 'var(--color-text-muted)' }}>
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
              background: "var(--color-bg-card)",
              color: "var(--color-text-primary)",
              borderRadius: 12,
              boxShadow: "var(--shadow-lg)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "1rem 1.25rem",
                borderBottom: "1px solid var(--color-border)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 8,
              }}
            >
              <div>
                <h2 style={{ margin: 0, fontSize: 18, color: "var(--color-text-primary)" }}>Detalhes da consulta</h2>
                <small style={{ color: "var(--color-text-muted)" }}>
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
                <strong style={{ color: "var(--color-text-primary)" }}>Data:</strong>{" "}
                <span style={{ color: "var(--color-text-secondary)" }}>{formatData(selectedConsulta.scheduled_at)}</span>
              </div>
              <div style={{ marginBottom: 10 }}>
                <strong style={{ color: "var(--color-text-primary)" }}>Horário:</strong>{" "}
                <span style={{ color: "var(--color-text-secondary)" }}>{formatHora(selectedConsulta.scheduled_at)}</span>
              </div>
              <div style={{ marginBottom: 10 }}>
                <strong style={{ color: "var(--color-text-primary)" }}>Status:</strong>{" "}
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
                <strong style={{ color: "var(--color-text-primary)" }}>Paciente:</strong>{" "}
                <span style={{ color: "var(--color-text-secondary)" }}>{selectedConsulta.patients?.full_name || "Paciente não encontrado"}</span>
              </div>
              <div style={{ marginBottom: 10 }}>
                <strong style={{ color: "var(--color-text-primary)" }}>CPF:</strong>{" "}
                <span style={{ color: "var(--color-text-secondary)" }}>{formatCPF(selectedConsulta.patients?.cpf)}</span>
              </div>
              <div style={{ marginBottom: 10 }}>
                <strong style={{ color: "var(--color-text-primary)" }}>Telefone:</strong>{" "}
                <span style={{ color: "var(--color-text-secondary)" }}>{selectedConsulta.patients?.phone_mobile || "—"}</span>
              </div>
            </div>

            <div
              style={{
                padding: "0.85rem 1.25rem",
                borderTop: "1px solid var(--color-border)",
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
              background: 'var(--color-bg-card)',
              color: 'var(--color-text-primary)',
              borderRadius: 12,
              boxShadow: 'var(--shadow-lg)',
              overflow: 'hidden',
            }}
          >
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--color-border)' }}>
              <h2 style={{ margin: 0, fontSize: 18, color: 'var(--color-text-primary)' }}>Criar disponibilidade</h2>
              <small style={{ color: 'var(--color-text-muted)' }}>Médico: {doctorName}</small>
            </div>

            <form onSubmit={handleCreateAvailability}>
              <div style={{ padding: '1rem 1.25rem' }}>
                {createError && (
                  <div style={{ 
                    marginBottom: 12, 
                    padding: '8px 10px', 
                    color: '#b00020', 
                    background: 'rgba(239, 68, 68, 0.1)', 
                    borderRadius: 8 
                  }}>
                    {createError}
                  </div>
                )}

                <div className="form-group" style={{ marginBottom: 12 }}>
                  <label className="text-sm block" style={{ color: 'var(--color-text-secondary)', marginBottom: '4px' }} htmlFor="weekday">
                    Dia da semana
                  </label>
                  <select
                    id="weekday"
                    className="input"
                    value={formWeekday}
                    onChange={(e) => setFormWeekday(parseInt(e.target.value, 10))}
                    style={{ 
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid var(--color-border)',
                      background: 'var(--color-bg-card)',
                      color: 'var(--color-text-primary)'
                    }}
                  >
                    {WEEKDAYS_LABELS.map((label, idx) => (
                      <option value={idx} key={idx} style={{ 
                        background: 'var(--color-bg-card)',
                        color: 'var(--color-text-primary)'
                      }}>
                        {idx} — {label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-row" style={{ display: 'flex', gap: 12 }}>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="text-sm block" style={{ color: 'var(--color-text-secondary)', marginBottom: '4px' }} htmlFor="start_time">Início</label>
                    <input 
                      id="start_time" 
                      type="time" 
                      className="input" 
                      value={formStart} 
                      onChange={(e) => setFormStart(e.target.value)} 
                      required
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        border: '1px solid var(--color-border)',
                        background: 'var(--color-bg-card)',
                        color: 'var(--color-text-primary)'
                      }}
                    />
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="text-sm block" style={{ color: 'var(--color-text-secondary)', marginBottom: '4px' }} htmlFor="end_time">Fim</label>
                    <input 
                      id="end_time" 
                      type="time" 
                      className="input" 
                      value={formEnd} 
                      onChange={(e) => setFormEnd(e.target.value)} 
                      required
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        border: '1px solid var(--color-border)',
                        background: 'var(--color-bg-card)',
                        color: 'var(--color-text-primary)'
                      }}
                    />
                  </div>
                </div>

                <div className="form-row" style={{ display: 'flex', gap: 12 }}>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="text-sm block" style={{ color: 'var(--color-text-secondary)', marginBottom: '4px' }} htmlFor="slot_minutes">Duração do slot (min)</label>
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
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        border: '1px solid var(--color-border)',
                        background: 'var(--color-bg-card)',
                        color: 'var(--color-text-primary)'
                      }}
                    />
                  </div>

                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="text-sm block" style={{ color: 'var(--color-text-secondary)', marginBottom: '4px' }} htmlFor="appointment_type">Tipo</label>
                    <select 
                      id="appointment_type" 
                      className="input" 
                      value={formType} 
                      onChange={(e) => setFormType(e.target.value as AppointmentType)}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        border: '1px solid var(--color-border)',
                        background: 'var(--color-bg-card)',
                        color: 'var(--color-text-primary)'
                      }}
                    >
                      <option 
                        value="presencial" 
                        style={{ background: 'var(--color-bg-card)', color: 'var(--color-text-primary)' }}
                      >
                        presencial
                      </option>
                      <option 
                        value="telemedicina" 
                        style={{ background: 'var(--color-bg-card)', color: 'var(--color-text-primary)' }}
                      >
                        telemedicina
                      </option>
                    </select>
                  </div>
                </div>

                <div className="form-group" style={{ marginTop: 6 }}>
                  <label className="text-sm" htmlFor="active" style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 8,
                    color: 'var(--color-text-secondary)'
                  }}>
                    <input 
                      id="active" 
                      type="checkbox" 
                      checked={formActive} 
                      onChange={(e) => setFormActive(e.target.checked)}
                      style={{
                        accentColor: 'var(--color-primary)'
                      }}
                    />
                    Ativo
                  </label>
                </div>

                <div style={{ marginTop: 6 }}>
                  <small style={{ color: 'var(--color-text-muted)' }}>
                    created_by/updated_by são preenchidos pelo backend. Regras: sem sobreposição; início &lt; fim.
                  </small>
                </div>
              </div>

              <div style={{ 
                padding: '0.85rem 1.25rem', 
                borderTop: '1px solid var(--color-border)', 
                display: 'flex', 
                justifyContent: 'flex-end', 
                gap: 8 
              }}>
                <button type="button" className="page-btn btn-secondary" onClick={closeCreateModal} disabled={creating}>Cancelar</button>
                <button type="submit" className="page-btn btn-primary" disabled={creating}>{creating ? 'Criando...' : 'Criar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Criar Exceção de Agenda */}
      {showExcecaoModal && (
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
            if (e.target === e.currentTarget) setShowExcecaoModal(false);
          }}
        >
          <div
            className="modal-card"
            style={{
              width: '100%',
              maxWidth: 520,
              background: 'var(--color-bg-card)',
              color: 'var(--color-text-primary)',
              borderRadius: 12,
              boxShadow: 'var(--shadow-lg)',
              overflow: 'hidden',
            }}
          >
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--color-border)' }}>
              <h2 style={{ margin: 0, fontSize: 18, color: 'var(--color-text-primary)' }}>Criar Exceção de Agenda</h2>
              <small style={{ color: 'var(--color-text-muted)' }}>Médico: {doctorName}</small>
            </div>

            <div style={{ padding: '1rem 1.25rem' }}>
              <div style={{ marginBottom: 12 }}>
                <label className="text-sm block" style={{ color: 'var(--color-text-secondary)', marginBottom: 4 }}>Data</label>
                <input
                  type="date"
                  value={exDate}
                  onChange={(e) => setExDate(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid var(--color-border)',
                    background: 'var(--color-bg-card)',
                    color: 'var(--color-text-primary)'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                <div style={{ flex: 1 }}>
                  <label className="text-sm block" style={{ color: 'var(--color-text-secondary)', marginBottom: 4 }}>Início (opcional)</label>
                  <input
                    type="time"
                    value={exStart}
                    onChange={(e) => setExStart(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid var(--color-border)',
                      background: 'var(--color-bg-card)',
                      color: 'var(--color-text-primary)'
                    }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label className="text-sm block" style={{ color: 'var(--color-text-secondary)', marginBottom: 4 }}>Fim (opcional)</label>
                  <input
                    type="time"
                    value={exEnd}
                    onChange={(e) => setExEnd(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid var(--color-border)',
                      background: 'var(--color-bg-card)',
                      color: 'var(--color-text-primary)'
                    }}
                  />
                </div>
              </div>

              <div>
                <label className="text-sm block" style={{ color: 'var(--color-text-secondary)', marginBottom: 4 }}>Motivo</label>
                <input
                  type="text"
                  value={exReason}
                  onChange={(e) => setExReason(e.target.value)}
                  placeholder="Ex: Médico ausente, feriado..."
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid var(--color-border)',
                    background: 'var(--color-bg-card)',
                    color: 'var(--color-text-primary)'
                  }}
                />
              </div>

              {exceptions && exceptions.length > 0 && (
                <div style={{ marginTop: 12, padding: 8, borderRadius: 8, background: 'var(--color-bg-muted)', color: 'var(--color-text-secondary)' }}>
                  <strong>Exceções recentes:</strong>
                  <ul style={{ marginTop: 8 }}>
                    {exceptions.slice(0,5).map((ex, idx) => (
                      <li key={idx} style={{ fontSize: 13 }}>
                        {ex.date} — {ex.kind} {ex.start_time ? `(${ex.start_time}–${ex.end_time || ''})` : ''} — {ex.reason || '—'}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div style={{ padding: '0.85rem 1.25rem', borderTop: '1px solid var(--color-border)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button type="button" className="page-btn btn-secondary" onClick={() => setShowExcecaoModal(false)} disabled={creatingException}>Cancelar</button>
              <button type="button" className="page-btn btn-primary" onClick={handleCreateException} disabled={creatingException}>{creatingException ? 'Criando...' : 'Criar Exceção'}</button>
            </div>
          </div>
        </div>
      )}

    </>
  );
}