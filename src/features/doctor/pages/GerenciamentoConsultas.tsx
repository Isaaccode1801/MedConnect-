// Ficheiro: @/features/doctor/pages/GerenciamentoConsultas.tsx (CORRIGIDO)

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/lib/supabase'; // Importamos o cliente supabase

// CSS: Vamos re-usar o mesmo CSS da página de pacientes como base
import '@/styles/GerenciamentoPacientesPage.css'; 

// Ícones
import { Stethoscope, Search } from 'lucide-react';
import { FaSearch, FaEye, FaCheck, FaTimes, FaUserMd } from 'react-icons/fa';

// --- Tipos de Dados ---
interface Consulta {
  id: string;
  scheduled_at: string;
  status: string; // Correto, Supabase infere 'string'
  patients: {
    id: string;
    full_name: string;
    cpf?: string;
    phone_mobile?: string;
  } | null;
}

// =================================================================
// Funções Auxiliares (Limpas)
// =================================================================

/**
 * Formata um CPF (ex: 12345678901 -> 123.456.789-01)
 */
function formatCPF(v: string | undefined | null): string {
  if (!v) return "—";
  const only = String(v).replace(/\D/g, '').padStart(11, '0').slice(-11);
  return only.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

/**
 * Formata uma data ISO (ex: 2025-10-25T10:00:00Z -> 25/10/2025)
 */
function formatData(isoString: string): string {
    try {
        const data = new Date(isoString);
        return data.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
    } catch {
        return 'Data inválida';
    }
}

/**
 * Formata uma hora ISO (ex: 2025-10-25T10:00:00Z -> 10:00)
 */
function formatHora(isoString: string): string {
    try {
        const data = new Date(isoString);
        return data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });
    } catch {
        return '--:--';
    }
}

// --- Componente Principal ---
export default function GerenciamentoConsultasPage() {
    const navigate = useNavigate(); // ✅ A variável chama-se 'navigate'
    const { pathname } = useLocation();
    
    const [searchTerm, setSearchTerm] = useState('');
    const [consultas, setConsultas] = useState<Consulta[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [doctorName, setDoctorName] = useState("Médico(a)");

    // Função para carregar os dados
    const carregarConsultas = useCallback(async () => {
        setLoading(true);
        setError(null);
        
        try {
            // 1. Descobrir o ID do usuário de autenticação
            const { data: { user }, error: authError } = await supabase.auth.getUser();
            if (authError || !user) throw new Error("Sessão não encontrada. Faça login novamente.");

            // 2. Descobrir o ID do Médico
            const { data: doctorData, error: doctorError } = await supabase
                .from('doctors')
                .select('id, full_name')
                .eq('user_id', user.id)
                .single(); 

            if (doctorError || !doctorData) {
                throw new Error("Registro de médico não encontrado para este usuário.");
            }

            if (doctorData.full_name) {
                setDoctorName(doctorData.full_name);
            }

            // 3. Buscar as consultas deste médico
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

            // Mapeia os dados para corrigir o 'patients' (array -> objeto)
            const formattedData = (consultasData || []).map(consulta => ({
                ...consulta,
                patients: Array.isArray(consulta.patients) ? (consulta.patients[0] || null) : (consulta.patients || null),
            }));

            setConsultas(formattedData);

        } catch (err: any) {
            console.error("Erro ao carregar consultas:", err);
            setError(err.message || 'Falha ao carregar a lista.');
            setConsultas([]); 
        } finally {
            setLoading(false);
        }
    }, []);

    // Carrega dados na montagem inicial
    useEffect(() => {
        carregarConsultas();
    }, [carregarConsultas]);

    // --- Handlers de Ação ---
    const handleUpdateStatus = async (id: string, newStatus: Consulta['status']) => {
        const ok = window.confirm(`Tem certeza que deseja alterar o status desta consulta para "${newStatus}"?`);
        if (!ok) return;

        const consultasAnteriores = [...consultas];
        setConsultas(prev => prev.map(c => 
            c.id === id ? { ...c, status: newStatus } : c
        ));

        try {
            const { error } = await supabase
                .from('appointments')
                .update({ status: newStatus })
                .eq('id', id);

            if (error) throw error;
            
        } catch (err: any) {
            console.error('Falha ao atualizar status:', err);
            alert(`Falha ao atualizar status: ${err.message}`);
            setConsultas(consultasAnteriores);
        }
    };
    
    const handleViewPatient = (patientId: string | undefined) => {
        if (!patientId) {
            alert("Erro: Paciente não associado.");
            return;
        }
        navigate(`/doctor/pacientes/${patientId}`);
    }


    // --- Filtragem (Client-Side) ---
    const filteredConsultas = useMemo(() => {
        return consultas.filter(c => {
            const lowerSearch = searchTerm.toLowerCase();
            const patient = c.patients;
            if (!patient) return false; 

            return (
                (patient.full_name && patient.full_name.toLowerCase().includes(lowerSearch)) ||
                (patient.cpf && formatCPF(patient.cpf).includes(lowerSearch))
            );
        });
    }, [consultas, searchTerm]);


    return (
        <>
            <header className="doctor-header">
                <div className="doctor-header__inner">
                    <div className="doctor-header__brand">
                        <div className="brand-icon">
                            <div className="brand-icon__inner">
                                <Stethoscope className="brand-icon__svg" />
                            </div>
                        </div>
                        <span className="brand-name">Medconnect</span>
                        <h1 className="doctor-greeting">
                            Olá, Dr(a). <span className="highlight">{doctorName}</span> 👋
                        </h1>
                    </div>

                    <div className="doctor-header__search">
                        <div className="search-wrapper">
                            <Search className="search-icon" />
                            <input
                                name="q"
                                autoComplete="off"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Buscar paciente, exame, laudo…"
                                className="search-input"
                            />
                        </div>
                    </div>

                    {/* ✅ CORREÇÃO: 'nav' foi substituído por 'navigate' */}
                    <nav className="doctor-header__nav">
                        <button
                            onClick={() => navigate("/doctor/dashboard")}
                            className={pathname === '/doctor/dashboard' ? 'nav-link active' : 'nav-link'}
                        >
                            Início
                        </button>
                        <button
                            onClick={() => navigate("/doctor/laudos")}
                            className={pathname.startsWith('/doctor/laudos') ? 'nav-link active' : 'nav-link'}
                        >
                            Laudos
                        </button>
                        <button
                            onClick={() => navigate("/doctor/pacientes")} 
                            className={pathname.startsWith('/doctor/pacientes') ? 'nav-link active' : 'nav-link'}
                        >
                            Pacientes
                        </button>
                        <button
                            onClick={() => navigate("/doctor/consultas")} 
                            className={pathname.startsWith('/doctor/consultas') ? 'nav-link active' : 'nav-link'}
                        >
                            Consultas
                        </button>
                    </nav>
                </div>
            </header>
            
            {/* 2. Conteúdo Principal */}
            <main className="container">
                <section className="card">
                    <div className="head">
                        <div className="title">
                            <h1>Minhas Consultas</h1>
                            <span className="badge">Agenda</span>
                        </div>
                        <div className="toolbar">
                            <div className="search">
                                <FaSearch style={{ color: '#6b7a88', marginRight: '8px' }}/>
                                <input
                                    id="q_table"
                                    placeholder="Buscar por nome ou CPF do paciente..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Exibição de Erro */}
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
                                    <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}>Carregando consultas...</td></tr>
                                ) : filteredConsultas.length === 0 ? (
                                    <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}>Nenhuma consulta encontrada{searchTerm ? ' para "' + searchTerm + '"' : ''}.</td></tr>
                                ) : (
                                    filteredConsultas.map((c) => (
                                        <tr className="row" key={c.id}>
                                            <td>{c.patients?.full_name || 'Paciente não encontrado'}</td>
                                            <td>{formatCPF(c.patients?.cpf)}</td>
                                            <td>{formatData(c.scheduled_at)}</td>
                                            <td>{formatHora(c.scheduled_at)}</td>
                                            <td>
                                                <span className={`badge status-${c.status || 'default'}`}>
                                                    {c.status === 'requested' ? 'Solicitada' :
                                                     c.status === 'confirmed' ? 'Confirmada' :
                                                     c.status === 'completed' ? 'Realizada' :
                                                     c.status === 'cancelled' ? 'Cancelada' :
                                                     c.status.charAt(0).toUpperCase() + c.status.slice(1)} 
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
                                                <button className="page-btn btn-view" onClick={() => handleViewPatient(c.patients?.id)} title="Ver Prontuário do Paciente">
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
        </>
    );
}