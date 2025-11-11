import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  listarMedicos, 
  criarAgendamento, 
  AgendamentoPayload,
  listarDisponibilidadeMedico,
  DoctorAvailability,
  getMyPatientRecordId 
} from '@/lib/pacientesService';

import { supabase } from '@/lib/supabase';

import { DayPicker, type Matcher } from 'react-day-picker';
import { ptBR } from 'date-fns/locale';
import { format } from 'date-fns';
import 'react-day-picker/dist/style.css';

import "./agendamento.css";
import "./dashboard.css";
import "@fortawesome/fontawesome-free/css/all.min.css";
import { FaSearch, FaRegCalendarAlt } from 'react-icons/fa';
import AccessibilityMenu from "@/components/ui/AccessibilityMenu";

// --- Interface de Tipos ---
interface Medico {
  id: string;
  full_name: string;
  especialidade?: string;
  cidade?: string;
  is_available?: boolean;
  [key: string]: any;
}
interface ModalAgendamentoProps {
  medico: Medico | null;
  onClose: () => void;
}

// HELPER DE INICIAIS
function initials(name = "") {
  const parts = String(name).trim().split(/\s+/).slice(0, 2);
  return parts.map((s) => s[0]?.toUpperCase() || "").join("") || "P";
}

// =================================================================
// 🚀 MODAL DE AGENDAMENTO (com disponibilidades do médico)
// =================================================================
function ModalAgendamento({ medico, onClose }: ModalAgendamentoProps) {
  const [dataSelecionada, setDataSelecionada] = useState<Date | undefined>();
  const [horarioSelecionado, setHorarioSelecionado] = useState<string | null>(null);
  const [availabilityRules, setAvailabilityRules] = useState<DoctorAvailability[]>([]);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [isLoadingAvailability, setIsLoadingAvailability] = useState(true);
  const [hasAvailability, setHasAvailability] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const [patientRecordId, setPatientRecordId] = useState<string | null>(null);

  // ---- helpers de normalização ----
  // Converte "wednesday", "quarta", "3", 3 → número 0..6
  function toWeekdayNumber(val: unknown): number | null {
    if (val === null || val === undefined) return null;

    // já é número?
    const asNum = Number(val);
    if (!Number.isNaN(asNum) && asNum >= 0 && asNum <= 6) return asNum;

    // string? mapeia nomes (en/pt, abreviações)
    const s = String(val).toLowerCase().trim();

    const map: Record<string, number> = {
      // EN
      sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6,
      sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6,
      // PT-BR
      domingo: 0, segunda: 1, 'segunda-feira': 1,
      terca: 2, 'terça': 2, 'terça-feira': 2,
      quarta: 3, 'quarta-feira': 3,
      quinta: 4, 'quinta-feira': 4,
      sexta: 5, 'sexta-feira': 5,
      sabado: 6, 'sábado': 6,
      // abreviações PT
      dom: 0, seg: 1, ter: 2, qua: 3, qui: 4, sex: 5, sab: 6,
    };

    if (s in map) return map[s];

    // tentar remover acentos
    const unaccent = s.normalize('NFD').replace(/\p{Diacritic}/gu, '');
    if (unaccent in map) return map[unaccent];

    return null;
  }

  // "08:00:00" | "8:0" → "08:00"
  function toHHMM(s: string): string {
    const parts = String(s).split(':');
    const h = String(parseInt(parts[0] || '0', 10)).padStart(2, '0');
    const m = String(parseInt(parts[1] || '0', 10)).padStart(2, '0');
    return `${h}:${m}`;
  }

  useEffect(() => {
    if (!medico?.id) return;
    setIsLoadingAvailability(true);
    setHasAvailability(false);
    setAvailabilityRules([]);
    setSubmitError(null);
    setAuthUserId(null);
    setPatientRecordId(null);
    setDataSelecionada(undefined);
    setAvailableSlots([]);
    setHorarioSelecionado(null);

    const fetchUserAndAvailability = async () => {
      try {
        // 1) usuário autenticado
        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (userError || !userData.user) {
          throw new Error(userError?.message || "Sessão não encontrada. Faça login novamente.");
        }
        const authId = userData.user.id;
        setAuthUserId(authId);

        // 2) paciente
        const patientId = await getMyPatientRecordId(authId);
        if (!patientId) throw new Error("Erro: Registro de paciente não encontrado para este usuário.");
        setPatientRecordId(patientId);

        // 3) disponibilidade ativa do médico
        const availabilityData = await listarDisponibilidadeMedico(medico.id, {
          activeOnly: true,
          select: 'id,doctor_id,weekday,start_time,end_time,slot_minutes,appointment_type,active'
        });

        // NORMALIZA: weekday → número; horas → "HH:MM"; slot_minutes → 30 se faltando
        const normalized: DoctorAvailability[] = (availabilityData ?? [])
          .map((r: any) => {
            const wd = toWeekdayNumber(r.weekday);
            return {
              ...r,
              weekday: wd as any, // manter compatibilidade do tipo
              start_time: toHHMM(r.start_time),
              end_time: toHHMM(r.end_time),
              slot_minutes: r.slot_minutes && r.slot_minutes > 0 ? r.slot_minutes : 30,
            } as DoctorAvailability;
          })
          .filter((r) => typeof r.weekday === 'number' && (r.weekday as unknown as number) >= 0 && (r.weekday as unknown as number) <= 6);

        console.log("[DEBUG] Disponibilidades recebidas do Supabase:", availabilityData);
        console.log("[DEBUG] Após normalização:", normalized);

        setAvailabilityRules(normalized);
        setHasAvailability(normalized.length > 0);
      } catch (err: any) {
        console.error("Falha ao carregar dados do modal:", err);
        setSubmitError(err.message);
      } finally {
        setIsLoadingAvailability(false);
      }
    };

    fetchUserAndAvailability();
  }, [medico?.id]);

  // ---- utils ----
  const disabledDays = useMemo(() => {
    const daysToDisable: Matcher[] = [{ before: new Date() }];

    if (hasAvailability) {
      // pega apenas regras ativas e converte weekday para número de 0..6
      const availableWeekdays = Array.from(
        new Set(
          availabilityRules
            .filter(r => r.active !== false)
            .map(r => Number(r.weekday))
            .filter(n => Number.isInteger(n) && n >= 0 && n <= 6)
        )
      );

      // se vier vazio, não bloqueie tudo
      if (availableWeekdays.length > 0) {
        const disabledWeekdays = [0,1,2,3,4,5,6].filter(d => !availableWeekdays.includes(d));
        daysToDisable.push({ dayOfWeek: disabledWeekdays });
      }
    }

    return daysToDisable;
  }, [availabilityRules, hasAvailability]);

  function generateSlotsForRule(rule: DoctorAvailability, selectedDate: Date): string[] {
    const slots: string[] = [];
    const slotLen = rule.slot_minutes && rule.slot_minutes > 0 ? rule.slot_minutes : 30;

    // start_time / end_time em "HH:MM"
    const [sh, sm] = rule.start_time.split(':').map(Number);
    const [eh, em] = rule.end_time.split(':').map(Number);

    // cria Date no fuso local (sem usar toISOString)
    const start = new Date(
      selectedDate.getFullYear(),
      selectedDate.getMonth(),
      selectedDate.getDate(),
      sh || 0,
      sm || 0,
      0,
      0
    );
    const end = new Date(
      selectedDate.getFullYear(),
      selectedDate.getMonth(),
      selectedDate.getDate(),
      eh || 0,
      em || 0,
      0,
      0
    );

    if (!(end > start)) return slots; // proteção

    const cur = new Date(start);
    while (cur < end) {
      const hh = String(cur.getHours()).padStart(2, '0');
      const mm = String(cur.getMinutes()).padStart(2, '0');
      slots.push(`${hh}:${mm}`);
      cur.setMinutes(cur.getMinutes() + slotLen);
    }

    // mantém só estritamente antes de end
    return slots.filter(s => {
      const [h, m] = s.split(':').map(Number);
      if (h < eh) return true;
      if (h === eh) return (m ?? 0) < (em ?? 0);
      return false;
    });
  }

  function removePastTimesIfToday(slots: string[], selectedDate: Date): string[] {
    const now = new Date();
    const sameDay =
      selectedDate.getFullYear() === now.getFullYear() &&
      selectedDate.getMonth() === now.getMonth() &&
      selectedDate.getDate() === now.getDate();

    if (!sameDay) return slots;

    const nowHH = now.getHours();
    const nowMM = now.getMinutes();
    return slots.filter(s => {
      const [hh, mm] = s.split(':').map(Number);
      if (hh > nowHH) return true;
      if (hh === nowHH && (mm ?? 0) > nowMM) return true;
      return false;
    });
  }

  const handleDaySelect = (date: Date | undefined) => {
    if (!date) {
      setDataSelecionada(undefined);
      setAvailableSlots([]);
      setHorarioSelecionado(null);
      return;
    }
    setDataSelecionada(date);
    setHorarioSelecionado(null);

    if (!hasAvailability) {
      setAvailableSlots([]);
      return;
    }

    const weekday = date.getDay(); // 0..6
    console.log("[DEBUG] Dia selecionado:", date, "weekday:", weekday);
    console.log("[DEBUG] Regras disponíveis:", availabilityRules);

    const rulesForDay = availabilityRules.filter(
      r => Number(r.weekday) === weekday && r.active !== false
    );

    if (rulesForDay.length === 0) {
      setAvailableSlots([]);
      return;
    }

    // junta múltiplas janelas do dia
    const all = rulesForDay.flatMap(rule => generateSlotsForRule(rule, date));
    const unique = Array.from(new Set(all)).sort(); // "HH:MM"
    const futureOnly = removePastTimesIfToday(unique, date);

    console.log("[DEBUG] Slots gerados (all):", all);
    console.log("[DEBUG] Slots futuros (filtrados):", futureOnly);

    setAvailableSlots(futureOnly);
  };

  const handleSlotClick = (slot: string) => setHorarioSelecionado(slot);

  const handleConfirmar = async () => {
    if (!dataSelecionada || !horarioSelecionado) {
      setSubmitError("Por favor, selecione uma data e um horário.");
      return;
    }
    if (!authUserId || !patientRecordId) {
      setSubmitError("Erro: Dados do paciente não carregados. Tente reabrir o modal.");
      return;
    }
    if (!medico) {
      setSubmitError("Erro: Médico não selecionado.");
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const dateStr = format(dataSelecionada, "yyyy-MM-dd");
      const local = new Date(`${dateStr}T${horarioSelecionado}:00`);
      const isoUTC = local.toISOString();

      const payload: AgendamentoPayload = {
        doctor_id: medico.id,
        patient_id: patientRecordId,
        scheduled_at: isoUTC,
        created_by: authUserId,
      };

      await criarAgendamento(payload);
      alert(`Agendamento realizado com ${medico.full_name} em ${format(dataSelecionada, 'dd/MM/yyyy')} às ${horarioSelecionado}.`);
      onClose();
    } catch (error: any) {
      console.error("Falha ao agendar:", error);
      setSubmitError(error.message || "Ocorreu um erro. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div id="modal-agendamento" className="modal-backdrop" style={{ display: "flex" }}>
      <div className="modal-content card">
        <div className="modal-header card-header">
          <h3 id="modal-medico-nome">Agendar com {medico?.full_name || 'Médico'}</h3>
          <button id="modal-fechar" className="close-btn" onClick={onClose} disabled={isSubmitting}>
            &times;
          </button>
        </div>

        <div className="modal-body card-content">
          {isLoadingAvailability && (
            <div style={{ padding: '20px', textAlign: 'center' }}>
              <p>Carregando dados do agendamento...</p>
            </div>
          )}

          {!isLoadingAvailability && !submitError && (
            <div className="agendamento-container-flex">
              {/* Coluna 1: Calendário */}
              <div className="day-picker-container">
                <DayPicker
                  mode="single"
                  selected={dataSelecionada}
                  onSelect={handleDaySelect}
                  locale={ptBR}
                  disabled={disabledDays}
                  fromDate={new Date()}
                  styles={{
                    caption: { color: 'var(--primary)' },
                    head_cell: { color: 'var(--text-secondary)'},
                  }}
                />
              </div>

              {/* Coluna 2: Horários */}
              <div className="slots-container">
                <h4 style={{ color: '#333', marginTop: 0, marginBottom: '10px' }}>
                  Horários para {dataSelecionada ? format(dataSelecionada, 'dd/MM/yyyy') : '--/--/----'}
                </h4>

                {!hasAvailability && (
                  <p className="slots-placeholder" style={{
                    background: 'var(--warning-light, #fffbe6)',
                    color: 'var(--warning-dark, #92400e)',
                    border: '1px solid var(--warning, #fde68a)',
                    fontSize: '0.85rem'
                  }}>
                    Este médico não cadastrou horários fixos. Selecione manualmente um horário (sujeito a confirmação).
                  </p>
                )}

                {hasAvailability && (
                  <div className="slots-grid">
                    {!dataSelecionada && <p className="slots-placeholder">Selecione um dia no calendário.</p>}
                    {dataSelecionada && availableSlots.length === 0 && (
                      <p className="slots-placeholder">Não há horários disponíveis para este dia.</p>
                    )}
                    {dataSelecionada && availableSlots.map(slot => (
                      <button
                        key={slot}
                        className={`slot-btn ${horarioSelecionado === slot ? 'selected' : ''}`}
                        onClick={() => handleSlotClick(slot)}
                        disabled={isSubmitting}
                      >
                        {slot}
                      </button>
                    ))}
                  </div>
                )}

                {!hasAvailability && (
                  <div className="free-time-container">
                    <label htmlFor="timeInput" style={{ color: '#333', marginRight: '10px', fontWeight: 600 }}>Horário:</label>
                    <input
                      id="timeInput"
                      type="time"
                      step="1800"
                      disabled={!dataSelecionada || isSubmitting}
                      onChange={(e) => setHorarioSelecionado(e.target.value)}
                      className="time-input"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {submitError && (
            <div style={{ color: 'var(--danger)', marginTop: '10px', fontWeight: 'bold', textAlign: 'center' }}>
              {submitError}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button
            id="btn-cancelar-modal"
            className="btn secondary"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancelar
          </button>
          <button
            id="btn-confirmar-agendamento"
            className="btn primary"
            onClick={handleConfirmar}
            disabled={isSubmitting || isLoadingAvailability || !!submitError || !dataSelecionada || !horarioSelecionado}
          >
            {isSubmitting ? 'Agendando...' : 'Confirmar Agendamento'}
          </button>
        </div>
      </div>
    </div>
  );
}

// =================================================================
// --- Componente Principal da Página (AgendamentoPage) ---
// =================================================================
export default function AgendamentoPage() {
  const navigate = useNavigate();
  const [medicos, setMedicos] = useState<Medico[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [especialidade, setEspecialidade] = useState('');
  const [somenteDisponiveis, setSomenteDisponiveis] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [medicoSelecionado, setMedicoSelecionado] = useState<Medico | null>(null);

  // Header
  const [patientName, setPatientName] = useState('Paciente');
  const [userInitials, setUserInitials] = useState('P');

  useEffect(() => {
    async function loadPatientName() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const patientId = await getMyPatientRecordId(user.id);
          if (patientId) {
            const { data: patientProfile } = await supabase
              .from('patients')
              .select('full_name')
              .eq('id', patientId)
              .single();

            if (patientProfile?.full_name) {
              setPatientName(patientProfile.full_name);
              setUserInitials(initials(patientProfile.full_name));
            }
          }
        }
      } catch (e) {
        console.error("Erro ao buscar nome do paciente para o header:", e);
      }
    }
    loadPatientName();
  }, []);

  useEffect(() => {
    setLoading(true);
    setError(null);
    listarMedicos()
      .then(data => {
        const realData = (data || []).map((medico: any): Medico => ({
          ...medico,
          full_name: medico.full_name || 'Nome Indisponível',
          especialidade: medico.specialty || medico.especialidade || 'Clínico Geral',
          cidade: medico.city || medico.cidade || 'N/A',
          contato_telefone: medico.contato_telefone || 'N/A',
          atende_por: medico.atende_por || ['Particular'],
          valor_consulta: medico.valor_consulta || 'N/A',
          proxima_janela: medico.proxima_janela || 'N/A',
          is_available: medico.active ?? false,
        }));
        setMedicos(realData);
      })
      .catch(err => {
        console.error("Falha ao buscar médicos:", err);
        setError((err as Error).message || "Não foi possível carregar os médicos.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const medicosFiltrados: Medico[] = useMemo(() => {
    return medicos.filter(medico => {
      const searchLower = searchTerm.toLowerCase();
      const especialidadeLower = especialidade.toLowerCase();
      if (especialidade && medico.especialidade?.toLowerCase() !== especialidadeLower) {
        return false;
      }
      if (somenteDisponiveis && !medico.is_available) {
        return false;
      }
      if (searchTerm &&
        !medico.full_name?.toLowerCase().includes(searchLower) &&
        !medico.especialidade?.toLowerCase().includes(searchLower) &&
        !medico.cidade?.toLowerCase().includes(searchLower)
      ) {
        return false;
      }
      return true;
    });
  }, [medicos, searchTerm, especialidade, somenteDisponiveis]);

  const handleLimparFiltros = () => {
    setSearchTerm('');
    setEspecialidade('');
    setSomenteDisponiveis(false);
  };

  const handleAbrirModal = (medico: Medico) => {
    setMedicoSelecionado(medico);
    setIsModalOpen(true);
  };

  const handleFecharModal = () => {
    setIsModalOpen(false);
    setMedicoSelecionado(null);
  };

  const especialidadesUnicas = useMemo(() => {
    const set = new Set(medicos.map(m => m.especialidade).filter(Boolean));
    return Array.from(set).sort() as string[];
  }, [medicos]);

  return (
    <>
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

      <div className="agendamento-page-container">
        {/* Appbar */}
        <div className="appbar" style={{ marginTop: '24px' }}>
          <div className="appbar-inner">
            <div>
              <h1>Diretório de Médicos</h1>
              <small>Encontre e marque sua consulta</small>
            </div>
          </div>
        </div>

        {/* Main */}
        <main className="wrap">
          <div className="toolbar">
            <div className="field">
              <span><FaSearch /></span>
              <input
                id="searchInput"
                type="search"
                placeholder="Pesquisar (ex.: Neurologista, Dr. Ana...)"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="field">
              <select
                id="especialidadeFilter"
                value={especialidade}
                onChange={(e) => setEspecialidade(e.target.value)}
              >
                <option value="">Todas as especialidades</option>
                {especialidadesUnicas.map(esp => (
                  <option key={esp} value={esp}>{esp}</option>
                ))}
              </select>
            </div>
            <div className="switch">
              <input
                id="disponiveisToggle"
                type="checkbox"
                checked={somenteDisponiveis}
                onChange={(e) => setSomenteDisponiveis(e.target.checked)}
              />
              <label htmlFor="disponiveisToggle">Somente disponíveis</label>
            </div>
            <button id="limparFiltros" className="btn secondary" onClick={handleLimparFiltros}>
              Limpar filtros
            </button>
          </div>

          <section className="card" aria-label="Lista de médicos">
            <div className="card-header">
              <h2>Médicos ({medicosFiltrados.length})</h2>
            </div>
            <div className="card-content">
              <table className="table">
                <thead className="thead">
                  <tr>
                    <th>Médico</th>
                    <th>Especialidade</th>
                    <th>Cidade</th>
                    <th>Contato</th>
                    <th>Atende por</th>
                    <th>Consulta</th>
                    <th>Próxima janela</th>
                    <th>Status</th>
                    <th style={{ textAlign: "right" }}>Ações</th>
                  </tr>
                </thead>
                <tbody id="tbody">
                  {loading && (
                    <tr className="row"><td colSpan={9} className="empty">Carregando médicos...</td></tr>
                  )}
                  {error && (
                    <tr className="row"><td colSpan={9} className="empty" style={{ color: 'var(--danger)' }}>{error}</td></tr>
                  )}
                  {!loading && !error && medicosFiltrados.length === 0 && (
                    <tr className="row"><td colSpan={9} className="empty">Nenhum médico encontrado.</td></tr>
                  )}
                  {!loading && !error && medicosFiltrados.map(medico => (
                    <tr key={medico.id} className="row">
                      <td>{medico.full_name}</td>
                      <td>{medico.especialidade}</td>
                      <td>{medico.cidade}</td>
                      <td>{medico.contato_telefone}</td>
                      <td>
                        <div className="convenios">
                          {Array.isArray(medico.atende_por) ? (
                            medico.atende_por.map((conv: string) => <span key={conv} className="badge">{conv}</span>)
                          ) : (
                            medico.atende_por && <span className="badge">{medico.atende_por}</span>
                          )}
                        </div>
                      </td>
                      <td>R$ {medico.valor_consulta}</td>
                      <td>{medico.proxima_janela}</td>
                      <td>
                        <span className={`badge ${medico.is_available ? 'ok' : 'warn'}`}>
                          {medico.is_available ? 'Disponível' : 'Indisponível'}
                        </span>
                      </td>
                      <td style={{ textAlign: "right" }} className="actions">
                        <button
                          className="btn primary icon"
                          onClick={() => handleAbrirModal(medico)}
                          disabled={!medico.is_available}
                          title={!medico.is_available ? "Médico indisponível" : "Agendar consulta"}
                        >
                          <FaRegCalendarAlt /> <span style={{ marginLeft: '4px' }}>Agendar</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </main>

        {/* Modal */}
        {isModalOpen && medicoSelecionado && (
          <ModalAgendamento medico={medicoSelecionado} onClose={handleFecharModal} />
        )}

        <AccessibilityMenu />
      </div>
    </>
  );
}
