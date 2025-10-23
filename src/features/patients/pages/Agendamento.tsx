import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { listarMedicos } from '@/lib/pacientesService'; // Importa a função
import "./agendamento.css"; // Importa o CSS
import "@fortawesome/fontawesome-free/css/all.min.css";
// Importa os ícones do React
import { FaSearch, FaWheelchair, FaRegCalendarAlt, FaClock } from 'react-icons/fa';

// --- Interface de Tipos ---
// (Define a estrutura dos dados do médico)
interface Medico {
  id: string;
  full_name: string;
  especialidade?: string;
  cidade?: string;
  contato_telefone?: string;
  atende_por?: string[] | string;
  valor_consulta?: string;
  proxima_janela?: string;
  is_available?: boolean;
  [key: string]: any; // Permite outras propriedades que não listamos
}

// --- Props do Modal ---
interface ModalAgendamentoProps {
  medico: Medico | null;
  onClose: () => void; // Função que não retorna nada
}

// --- Componente Modal (com tipos) ---
function ModalAgendamento({ medico, onClose }: ModalAgendamentoProps) {
    const [dataSelecionada, setDataSelecionada] = useState<string | null>(null);
    const [horarioSelecionado, setHorarioSelecionado] = useState<string | null>(""); // Inicia como ""

    const handleConfirmar = () => {
        if (!dataSelecionada || !horarioSelecionado) {
            alert("Por favor, selecione uma data e um horário.");
            return;
        }
        alert(`Agendamento simulado com ${medico?.full_name} para ${dataSelecionada} às ${horarioSelecionado}.`);
        onClose();
    };

    return (
        <div id="modal-agendamento" className="modal-backdrop" style={{ display: "flex" }}>
            <div className="modal-content card">
                <div className="modal-header card-header">
                    <h3 id="modal-medico-nome">Agendar com {medico?.full_name || 'Médico'}</h3>
                    <button id="modal-fechar" className="close-btn" onClick={onClose}>
                        &times;
                    </button>
                </div>
                <div className="modal-body card-content">
                    <p>Selecione uma data e um horário para a sua consulta.</p>
                    {/* Simulação da lógica do calendário */}
                    <div className="agendamento-container" style={{ minHeight: '200px', background: '#f9f9f9', padding: '10px', border: '1px solid #eee' }}>
                        <h4 style={{ color: '#333' }}>
                            Horários para <span id="data-selecionada-titulo">{dataSelecionada || '--/--/----'}</span>
                        </h4>
                        <p style={{ color: '#666' }}><i>(Lógica do calendário a ser implementada em React)</i></p>
                        <div>
                            <label style={{ color: '#333', marginRight: '10px' }}>Data:</label>
                            <input type="date" onChange={(e) => setDataSelecionada(e.target.value)} />
                        </div>
                        <div style={{ marginTop: '10px' }}>
                            <label style={{ color: '#333', marginRight: '10px' }}>Horário:</label>
                            <select onChange={(e) => setHorarioSelecionado(e.target.value)} value={horarioSelecionado || ''}>
                                <option value="" disabled>Selecione...</option>
                                <option value="09:00">09:00</option>
                                <option value="10:00">10:00</option>
                                <option value="11:00">11:00</option>
                            </select>
                        </div>
                    </div>
                </div>
                <div className="modal-footer">
                    <button id="btn-cancelar-modal" className="btn secondary" onClick={onClose}>
                        Cancelar
                    </button>
                    <button id="btn-confirmar-agendamento" className="btn primary" onClick={handleConfirmar}>
                        Confirmar Agendamento
                    </button>
                </div>
            </div>
        </div>
    );
}

// --- Componente Principal da Página ---
export default function AgendamentoPage() {
    const navigate = useNavigate();

    const [medicos, setMedicos] = useState<Medico[]>([]); // Usa o tipo Medico
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Estados para filtros
    const [searchTerm, setSearchTerm] = useState('');
    const [especialidade, setEspecialidade] = useState('');
    const [somenteDisponiveis, setSomenteDisponiveis] = useState(false);

    // Estado do Modal
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [medicoSelecionado, setMedicoSelecionado] = useState<Medico | null>(null); // Usa o tipo Medico

    // Busca dados da API
    useEffect(() => {
        setLoading(true);
        setError(null);
        listarMedicos() // Função do seu service
            .then(data => {
                // --- DADOS MOCKADOS REMOVIDOS ---
                // Agora usamos os dados reais da API, apenas garantindo fallbacks
                const realData = (data || []).map((medico: any): Medico => ({ // Adiciona tipo de retorno :Medico
                    ...medico,
                    full_name: medico.full_name || 'Nome Indisponível',
                    // Adiciona fallbacks para os campos que o JSX espera
                    especialidade: medico.especialidade || 'Clínico Geral',
                    cidade: medico.cidade || 'N/A',
                    contato_telefone: medico.contato_telefone || 'N/A',
                    atende_por: medico.atende_por || ['Particular'],
                    valor_consulta: medico.valor_consulta || 'N/A',
                    proxima_janela: medico.proxima_janela || 'N/A',
                    is_available: medico.is_available ?? false, // Garante que é booleano
                }));
                setMedicos(realData); // Usa os dados reais/limpos
            })
            .catch(err => {
                console.error("Falha ao buscar médicos:", err);
                setError((err as Error).message || "Não foi possível carregar os médicos.");
            })
            .finally(() => {
                setLoading(false);
            });
    }, []); // Roda apenas uma vez

    // Lógica de filtragem
    const medicosFiltrados: Medico[] = useMemo(() => {
        return medicos.filter(medico => {
            const searchLower = searchTerm.toLowerCase();
            
            if (especialidade && medico.especialidade?.toLowerCase() !== especialidade.toLowerCase()) {
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

    // Handlers
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

    // Pega especialidades únicas para o dropdown
    const especialidadesUnicas = useMemo(() => {
        const set = new Set(medicos.map(m => m.especialidade).filter(Boolean)); 
        return Array.from(set).sort();
    }, [medicos]);

    // Lógica do menu de acessibilidade
    const [menuAcessibilidade, setMenuAcessibilidade] = useState(false);
    const [modoEscuro, setModoEscuro] = useState(false);
    const [modoDaltonico, setModoDaltonico] = useState(false);
    // (A lógica de Zoom e Leitor de Texto precisa ser portada do JS original para o React)

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
            <div className="appbar">
                <div className="appbar-inner">
                    <div className="brand">
                        <Link to="/" className="logo-link">
                            <img
                                src="/Medconnect.logo.png" // Caminho absoluto para pasta /public
                                alt="Logo MedConnect"
                                className="logo"
                            />
                        </Link>
                    </div>
                    <div>
                        <h1>Diretório de Médicos</h1>
                        <small>Marque sua consulta</small>
                    </div>
                    <nav className="tabs">
                        <Link to="/paciente/dashboard">Início</Link>
                        <Link to="/paciente/agendamento" className="ativo">
                            Marcar Consulta
                        </Link>
                    </nav>
                </div>
            </div>

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

            {isModalOpen && medicoSelecionado && (
                <ModalAgendamento medico={medicoSelecionado} onClose={handleFecharModal} />
            )}

            {/* Menu de Acessibilidade */}
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