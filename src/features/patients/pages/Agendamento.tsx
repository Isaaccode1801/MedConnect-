import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
    listarMedicos, 
    criarAgendamento, 
    AgendamentoPayload,
    listarDisponibilidadeMedico,
    DoctorAvailability,
    // ✅ CORREÇÃO 1: Re-importar a função para buscar o ID do paciente
    getMyPatientRecordId 
} from '@/lib/pacientesService'; 

// IMPORTA O CLIENTE SUPABASE
import { supabase } from '@/lib/supabase'; 

import { DayPicker, type Matcher } from 'react-day-picker';
import { ptBR } from 'date-fns/locale';
import { format } from 'date-fns';
import 'react-day-picker/dist/style.css'; 

import "./agendamento.css"; 
import "@fortawesome/fontawesome-free/css/all.min.css";
import { FaSearch, FaWheelchair, FaRegCalendarAlt, FaClock } from 'react-icons/fa';


// --- Interface de Tipos ---
interface Medico {
  id: string;
  full_name: string;
  especialidade?: string;
  cidade?: string;
  is_available?: boolean;
  [key: string]: any; 
}

// --- Props do Modal ---
interface ModalAgendamentoProps {
  medico: Medico | null;
  onClose: () => void;
}

// =================================================================
// 🚀 COMPONENTE MODAL (VERSÃO CORRIGIDA)
// =================================================================

/**
 * Helper para gerar slots de horário (ex: 09:00, 09:30, 10:00...)
 * a partir de uma regra de disponibilidade.
 */
function generateSlots(rule: DoctorAvailability): string[] {
    const slots: string[] = [];
    const { start_time, end_time, slot_minutes } = rule;
    
    // Usamos uma data "falsa" (hoje) apenas para conseguir fazer cálculos de tempo
    const dummyDate = new Date().toISOString().split('T')[0];
    let currentTime = new Date(`${dummyDate}T${start_time}:00`);
    const endTime = new Date(`${dummyDate}T${end_time}:00`);

    // Loop que adiciona minutos até chegar ao fim do expediente
    while (currentTime < endTime) {
        const hours = currentTime.getHours().toString().padStart(2, '0');
        const minutes = currentTime.getMinutes().toString().padStart(2, '0');
        slots.push(`${hours}:${minutes}`);
        
        // Adiciona a duração do slot (ex: 30 minutos)
        currentTime.setMinutes(currentTime.getMinutes() + (slot_minutes || 30));
    }
    return slots;
}

function ModalAgendamento({ medico, onClose }: ModalAgendamentoProps) {
    const [dataSelecionada, setDataSelecionada] = useState<Date | undefined>();
    const [horarioSelecionado, setHorarioSelecionado] = useState<string | null>(null); 

    const [availabilityRules, setAvailabilityRules] = useState<DoctorAvailability[]>([]);
    const [availableSlots, setAvailableSlots] = useState<string[]>([]);
    const [isLoadingAvailability, setIsLoadingAvailability] = useState(true);
    
    // Estado para controlar se o médico tem horários cadastrados ou usa o "Modo Livre"
    const [hasAvailability, setHasAvailability] = useState(false);
    
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);

    // Estados para guardar os IDs do usuário
    const [authUserId, setAuthUserId] = useState<string | null>(null);
    
    // ✅ CORREÇÃO 2: Adicionar o estado 'patientRecordId' de volta
    const [patientRecordId, setPatientRecordId] = useState<string | null>(null);


    // 🚀 EFEITO MODIFICADO: Reintroduz a busca pelo ID do paciente
    useEffect(() => {
        if (!medico?.id) return;

        setIsLoadingAvailability(true);
        setHasAvailability(false); 
        setAvailabilityRules([]);
        setSubmitError(null); 
        // Reseta os IDs ao trocar de médico
        setAuthUserId(null);
        setPatientRecordId(null);

        const fetchUserAndAvailability = async () => {
            try {
                // 1. Busca o ID de autenticação
                const { data: userData, error: userError } = await supabase.auth.getUser();
                if (userError || !userData.user) {
                    throw new Error(userError?.message || "Sessão não encontrada. Faça login novamente.");
                }
                const authId = userData.user.id;
                setAuthUserId(authId); // Salva o ID de auth (auth.users)

                // ✅ CORREÇÃO 3: Reintroduzir a busca pelo ID do Paciente
                // Temos que "traduzir" o ID de auth para o ID de paciente
                const patientId = await getMyPatientRecordId(authId);
                if (!patientId) {
                    // Esta é uma falha crítica de lógica de dados
                    throw new Error("Erro: Registo de paciente não encontrado para este utilizador.");
                }
                setPatientRecordId(patientId); // Salva o ID da tabela 'patients'

                // 3. Busca disponibilidade do médico
                const availabilityData = await listarDisponibilidadeMedico(medico.id);
                if (availabilityData && availabilityData.length > 0) {
                    setAvailabilityRules(availabilityData);
                    setHasAvailability(true); // Médico tem regras
                } else {
                    setHasAvailability(false); // Médico não tem regras (Modo Livre)
                }
            } catch (err: any) {
                console.error("Falha ao carregar dados do modal:", err);
                setSubmitError(err.message); 
            } finally {
                setIsLoadingAvailability(false);
            }
        };

        fetchUserAndAvailability();
    }, [medico?.id]); // Dependência continua a ser o medico.id


    // Lógica para desabilitar dias no DayPicker (Sem alterações)
const disabledDays = useMemo(() => {
        // 2. APLICA O TIPO 'Matcher[]' AQUI
        const daysToDisable: Matcher[] = [{ before: new Date() }]; // <-- CORRIGIDO

        if (hasAvailability) {
            const availableWeekdays = availabilityRules.map(r => r.weekday);
            const disabledWeekdays = [0, 1, 2, 3, 4, 5, 6].filter(
                day => !availableWeekdays.includes(day)
            );
            daysToDisable.push({ dayOfWeek: disabledWeekdays }); // <-- Agora isto é válido
        }
        
        return daysToDisable;
    }, [availabilityRules, hasAvailability]);

    // Handler: Roda quando o usuário CLICA EM UM DIA no calendário (Sem alterações)
    const handleDaySelect = (date: Date | undefined) => {
        if (!date) {
            setDataSelecionada(undefined);
            setAvailableSlots([]);
            setHorarioSelecionado(null);
            return;
        }

        setDataSelecionada(date);
        setHorarioSelecionado(null); // Reseta o horário
        
        if (hasAvailability) {
            const weekday = date.getDay(); // 0-6 (Dom-Sab)
            const ruleForDay = availabilityRules.find(r => r.weekday === weekday);

            if (ruleForDay) {
                const slots = generateSlots(ruleForDay);
                setAvailableSlots(slots);
            } else {
                setAvailableSlots([]); // Médico não atende neste dia
            }
        }
    };

    // Handler: Roda quando o usuário CLICA EM UM BOTÃO de horário (Sem alterações)
    const handleSlotClick = (slot: string) => {
        setHorarioSelecionado(slot);
    };

    // Handler: Lógica de submit (MODIFICADA)
    const handleConfirmar = async () => {
        if (!dataSelecionada || !horarioSelecionado) {
            setSubmitError("Por favor, selecione uma data e um horário.");
            return;
        }
        
        // ✅ CORREÇÃO 4: Validação atualizada
        // Validamos se temos AMBOS os IDs necessários
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
            const dataHoraLocal = new Date(`${dateStr}T${horarioSelecionado}:00`);
            const dataHoraISO_UTC = dataHoraLocal.toISOString();
            
            // ✅ CORREÇÃO 5: Payload atualizado
            // Usamos 'patientRecordId' para 'patient_id'
            // Usamos 'authUserId' para 'created_by'
            const payload: AgendamentoPayload = {
                doctor_id: medico.id,
                patient_id: patientRecordId, // <-- ID da tabela 'patients'
                scheduled_at: dataHoraISO_UTC,
                created_by: authUserId,     // <-- ID da tabela 'auth.users'
            };

            await criarAgendamento(payload);
            alert(`Agendamento realizado com sucesso com ${medico.full_name} para ${format(dataSelecionada, 'dd/MM/yyyy')} às ${horarioSelecionado}.`);
            onClose(); 
        } catch (error: any) {
            console.error("Falha ao agendar:", error);
            // Se o erro 400 persistir, ele aparecerá aqui com uma mensagem específica
            setSubmitError(error.message || "Ocorreu um erro. Tente novamente.");
        } finally {
            setIsSubmitting(false);
        }
    };

    // --- Renderização do Modal (Sem alterações no JSX) ---
    // (O teu JSX está perfeito, copiei-o exatamente)
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
                    {/* --- 1. Estado de Loading --- */}
                    {isLoadingAvailability && (
                        <div style={{ padding: '20px', textAlign: 'center' }}>
                            <p>Carregando dados do agendamento...</p>
                        </div>
                    )}

                    {/* --- 2. Conteúdo Principal (Carregamento concluído) --- */}
                    {!isLoadingAvailability && !submitError && (
                        <div className="agendamento-container-flex">
                            {/* Coluna 1: O Calendário */}
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

                            {/* Coluna 2: Os Horários */}
                            <div className="slots-container">
                                <h4 style={{ color: '#333', marginTop: 0, marginBottom: '10px' }}>
                                    Horários para {dataSelecionada ? format(dataSelecionada, 'dd/MM/yyyy') : '--/--/----'}
                                </h4>
                                
                                {/* MENSAGEM DE AVISO (Modo Livre) */}
                                {!hasAvailability && (
                                    <p className="slots-placeholder" style={{ 
                                        background: 'var(--warning-light, #fffbe6)', 
                                        color: 'var(--warning-dark, #92400e)', 
                                        border: '1px solid var(--warning, #fde68a)',
                                        fontSize: '0.85rem'
                                    }}>
                                        Este médico não cadastrou horários fixos. Por favor, selecione um dia e um horário de sua preferência (sujeito a confirmação).
                                    </p>
                                )}

                                {/* MODO 1: Mostrar botões de slot (se hasAvailability) */}
                                {hasAvailability && (
                                    <div className="slots-grid">
                                        {!dataSelecionada && (
                                            <p className="slots-placeholder">Selecione um dia no calendário.</p>
                                        )}
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

                                {/* MODO 2: Mostrar input de hora (se !hasAvailability) */}
                                {!hasAvailability && (
                                    <div className="free-time-container">
                                        <label htmlFor="timeInput" style={{ color: '#333', marginRight: '10px', fontWeight: 600 }}>Horário:</label>
                                        <input
                                            id="timeInput"
                                            type="time"
                                            step="1800" // Pulos de 30 min
                                            disabled={!dataSelecionada || isSubmitting}
                                            onChange={(e) => setHorarioSelecionado(e.target.value)}
                                            className="time-input"
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* --- Erro de Load ou Submissão (se houver) --- */}
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
                        // Desabilita se estiver carregando, se deu erro, ou se não selecionou data/hora
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
// --- Componente Principal da Página (Sem alterações) ---
// =================================================================
export default function AgendamentoPage() {
    // (Todo o teu código do componente principal 'AgendamentoPage'
    //  continua aqui, sem NENHUMA alteração necessária)
    const navigate = useNavigate();
    const [medicos, setMedicos] = useState<Medico[]>([]); 
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [especialidade, setEspecialidade] = useState('');
    const [somenteDisponiveis, setSomenteDisponiveis] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [medicoSelecionado, setMedicoSelecionado] = useState<Medico | null>(null); 

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

    const [menuAcessibilidade, setMenuAcessibilidade] = useState(false);
    const [modoEscuro, setModoEscuro] = useState(false);
    const [modoDaltonico, setModoDaltonico] = useState(false);

    useEffect(() => {
        document.body.classList.toggle('modo-escuro', modoEscuro);
        document.body.classList.toggle('modo-daltonico', modoDaltonico);
        return () => {
            document.body.classList.remove('modo-escuro');
            document.body.classList.remove('modo-daltonico');
        }
    }, [modoEscuro, modoDaltonico]);

    return (
        <div>
            {/* --- Appbar --- */}
            <div className="appbar">
                <div className="appbar-inner">
                    <div className="brand">
                        <Link to="/" className="logo-link">
                            <img src="/Medconnect.logo.png" alt="Logo MedConnect" className="logo" />
                        </Link>
                    </div>
                    <div>
                        <h1>Diretório de Médicos</h1>
                        <small>Marque sua consulta</small>
                    </div>
                    <nav className="tabs">
                        <Link to="/patient/dashboard">Início</Link>
                    </nav>
                </div>
            </div>

            {/* --- Main --- */}
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

            {/* --- Modal --- */}
            {isModalOpen && medicoSelecionado && (
                <ModalAgendamento medico={medicoSelecionado} onClose={handleFecharModal} />
            )}

            {/* --- Acessibilidade --- */}
            <button
                id="btnAcessibilidade"
                className="acessibilidade-btn"
                aria-label="Menu de acessibilidade"
                onClick={() => setMenuAcessibilidade(prev => !prev)}
            >
                <i className="fa-solid fa-wheelchair"></i>
            </button>
            <div id="menuAcessibilidade" className="menu-acessibilidade" style={{ display: menuAcessibilidade ? 'flex' : 'none' }}>
                <h4>Opções de Acessibilidade</h4>
                <button className="menu-item" id="modoEscuro" onClick={() => setModoEscuro(prev => !prev)}>
                    🌓 Fundo Preto {modoEscuro ? '(Ativado)' : '(Desativado)'}
                </button>
                <div className="menu-item" id="aumentarFonteContainer">
                    🔠 Aumentar Fonte
                    <div id="controlesFonte" className="controles-fonte">
                         <button id="diminuirFonte" className="controle-fonte">➖</button>
                         <span id="tamanhoFonteValor">100%</span>
                         <button id="aumentarFonte" className="controle-fonte">➕</button>
                    </div>
                </div>
                <button className="menu-item" id="leitorTexto">
                    🔊 Leitor de Texto
                </button>
                <button className="menu-item" id="modoDaltonico" onClick={() => setModoDaltonico(prev => !prev)}>
                    🎨 Modo Daltônico {modoDaltonico ? '(Ativado)' : '(Desativado)'}
                </button>
            </div>
        </div>
    );
}