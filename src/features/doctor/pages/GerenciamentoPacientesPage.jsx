// src/features/doctor/pages/GerenciamentoPacientesPage.jsx (LIMPO)
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { listPacientes, deletePaciente } from '@/lib/pacientesService';
import '@/styles/GerenciamentoPacientesPage.css'; 
import { FaSearch, FaPlus, FaEye, FaPencilAlt, FaTrashAlt } from 'react-icons/fa';
import { Stethoscope, Search } from 'lucide-react';
import AccessibilityMenu from "../../../components/ui/AccessibilityMenu";

// --- Funções Auxiliares ---
function formatCPF(v) {
    if (!v) return "—";
    const only = String(v).replace(/\D/g, '').padStart(11, '0').slice(-11);
    return only.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

// --- Componente Principal ---
export default function GerenciamentoPacientesPage() {
    const navigate = useNavigate();
    const { pathname } = useLocation();

    // --- Estados ---
    const [pacientes, setPacientes] = useState([]);
    const [loading, setLoading] = useState(true); 
    const [headerLoading, setHeaderLoading] = useState(true);
    const [error, setError] = useState(null);
    const [doctorName, setDoctorName] = useState("Médico(a)");
    const [searchTerm, setSearchTerm] = useState('');

    // --- Lógica de Dados ---

    // Busca o nome do médico (apenas 1 vez)
    useEffect(() => {
        async function fetchDoctorName() {
            setHeaderLoading(true);
            try {
                const { data: { user }, error: authError } = await supabase.auth.getUser();
                if (authError || !user) throw new Error("Sessão não encontrada.");

                const { data: doctorData, error: doctorError } = await supabase
                    .from('doctors')
                    .select('full_name')
                    .eq('user_id', user.id)
                    .single();

                if (doctorError) throw new Error("Registro de médico não encontrado.");
                if (doctorData?.full_name) {
                    setDoctorName(doctorData.full_name);
                }
            } catch (err) {
                console.warn("Não foi possível carregar o nome do médico:", err.message);
            } finally {
                setHeaderLoading(false);
            }
        }
        fetchDoctorName();
    }, []);

    // Busca a lista de pacientes
    const carregarPacientes = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await listPacientes();
            setPacientes(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error("Erro ao carregar pacientes:", err);
            setError(err.message || 'Falha ao carregar a lista.');
            setPacientes([]);
        } finally {
            setLoading(false);
        }
    }, []);

    // Carrega pacientes na montagem inicial
    useEffect(() => {
        carregarPacientes();
    }, [carregarPacientes]);

    // --- Handlers de Ação ---
    const handleEdit = (id) => {
        if (!id) return;
        try { sessionStorage.setItem('edit_patient_id', id); } catch {}
        navigate(`/doctor/pacientes/editar/${id}`);
    };

    const handleDelete = async (id) => {
        if (!id) return;
        const pacienteParaDeletar = pacientes.find(p => p.id === id);
        if (!pacienteParaDeletar) return;

        const ok = window.confirm(`Tem certeza que deseja excluir o paciente "${pacienteParaDeletar.full_name || id}"?`);
        if (!ok) return;

        try {
            await deletePaciente(id);
            setPacientes(prevPacientes => prevPacientes.filter(p => p.id !== id));
            alert('Paciente excluído com sucesso.');
        } catch (err) {
            console.error('Falha ao excluir paciente:', err);
            setError(`Falha ao excluir: ${err.message || 'erro desconhecido'}`);
            alert(`Falha ao excluir: ${err.message || 'erro desconhecido'}`);
        }
    };

    const handleView = (id) => {
        console.log("Visualizar paciente com ID:", id);
        alert("Funcionalidade de visualizar carteirinha a implementar.");
    };

    // --- Filtragem ---
    const filteredPacientes = useMemo(() => {
        return pacientes.filter(p => {
            const lowerSearch = searchTerm.toLowerCase();
            return (
                (p.full_name && p.full_name.toLowerCase().includes(lowerSearch)) ||
                (p.cpf && formatCPF(p.cpf).includes(lowerSearch)) ||
                (p.phone_mobile && p.phone_mobile.toLowerCase().includes(lowerSearch)) ||
                (p.email && p.email.toLowerCase().includes(lowerSearch))
            );
        });
    }, [pacientes, searchTerm]);

    return (
        <>
            <header className="doctor-header">
                <div
                    className="doctor-header__inner"
                    style={{ justifyContent: 'flex-start', gap: '2rem', display: 'flex', alignItems: 'center' }}
                >
                    <div className="doctor-header__brand">
                        <div className="brand-icon">
                            <div className="brand-icon__inner">
                                <Stethoscope className="brand-icon__svg" />
                            </div>
                        </div>
                        <span className="brand-name">Medconnect</span>
                        <h1 className="doctor-greeting">
                            {/* Idealmente, o nome viria de dados do usuário logado */}
                            Olá, Dr(a). <span className="highlight">Camilla Millene</span> 👋
                        </h1>
                    </div>

                    <div className="doctor-header__search">
                        <div className="search-wrapper">
                            <Search className="search-icon" />
                            <input
                                name="q"
                                autoComplete="off"
                                value={q} // Usa o estado 'q'
                                onChange={(e) => setQ(e.target.value)} // Usa o setter 'setQ'
                                placeholder="Buscar paciente, exame, laudo…"
                                className="search-input"
                            />
                        </div>
                    </div>

                    {/* 6. Links de navegação ajustados */}
                    <nav
                        className="doctor-header__nav"
                        style={{ marginLeft: 'auto', display: 'flex', gap: '1rem', alignItems: 'center' }}
                    >
                        <button
                            onClick={() => navigate("/doctor/dashboard")}
                            // Define classe 'active' se o pathname corresponder
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
                        {/* Botão para a página atual */}
                        <button
                            onClick={() => navigate("/doctor/pacientes")} // Navega para a própria página (ou pode desabilitar)
                            className={pathname.startsWith('/doctor/pacientes') ? 'nav-link active' : 'nav-link'}
                        >
                            Gerenciamento de Pacientes
                        </button>
                    </nav>
                </div>
            </header>
            <main className="container">
                <section className="card">
                    <div className="head" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                        <h1
                            style={{
                                margin: 0,
                                flex: '1 1 auto',
                                minWidth: '150px',
                                fontSize: '2rem',
                                fontWeight: 700,
                                letterSpacing: '0.04em',
                                background: 'linear-gradient(90deg, #c7d2fe 0%, #26bdbd 100%)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                backgroundClip: 'text',
                                textShadow: '0 2px 12px rgba(24, 98, 180, 0.18), 0 1px 0 #fff3',
                                lineHeight: 1.15,
                                textAlign: 'left'
                            }}
                        >
                            Pacientes
                        </h1>
                        <div className="search" style={{ flex: '2 1 400px', display: 'flex', alignItems: 'center', background: '#ffffffff', border: '1px solid #374151', borderRadius: '12px', boxShadow: '0 2px 6px rgba(0,0,0,0.4)', padding: '0.75rem 1rem', transition: 'background-color 0.3s ease, box-shadow 0.3s ease', margin: '0 1rem' }}>
                            <FaSearch style={{ color: '#9ca3af', marginRight: '12px', fontSize: '1.25rem' }}/> {/* Ícone React maior e cor clara */}
                            <input
                                id="q"
                                placeholder="Buscar por nome, CPF, telefone..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    outline: 'none',
                                    color: '#f0f0f0',
                                    fontSize: '1rem',
                                    width: '100%',
                                    padding: '0.5rem 0',
                                    borderRadius: '12px',
                                    fontWeight: '500',
                                    '::placeholder': { color: '#d1d5db' }
                                }}
                                type="search"
                                onFocus={e => {
                                    e.currentTarget.parentElement.style.backgroundColor = '#cccdcfff';
                                    e.currentTarget.parentElement.style.boxShadow = '0 0 8px 2px rgba(147,197,253,0.7)';
                                }}
                                onBlur={e => {
                                    e.currentTarget.parentElement.style.backgroundColor = '#b0b1b1ff';
                                    e.currentTarget.parentElement.style.boxShadow = '0 2px 6px rgba(223, 223, 223, 0.4)';
                                }}
                            />
                        </div>
                        <Link className="btn primary" to="/doctor/pacientes/novo" style={{ whiteSpace: 'nowrap', flexShrink: 0 }}>
                            <FaPlus style={{ marginRight: '8px' }}/> {/* Ícone React */}
                            Novo paciente
                        </Link>
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
                                    <th>#</th>
                                    <th>Nome</th>
                                    <th>CPF</th>
                                    <th>E-mail</th>
                                    <th>Telefone</th>
                                    <th>Cidade/UF</th>
                                    <th style={{ textAlign: 'right' }}>Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan="7" style={{ textAlign: 'center', padding: '2rem' }}>Carregando pacientes...</td></tr>
                                ) : filteredPacientes.length === 0 ? (
                                    <tr><td colSpan="7" style={{ textAlign: 'center', padding: '2rem' }}>Nenhum paciente encontrado{searchTerm ? ' para "' + searchTerm + '"' : ''}.</td></tr>
                                ) : (
                                    filteredPacientes.map((p, i) => (
                                        <tr className="row" key={p.id}>
                                            <td>{i + 1}</td>
                                            <td>{p.full_name || '—'}</td>
                                            <td>{p.cpf ? formatCPF(p.cpf) : '—'}</td>
                                            <td>{p.email || '—'}</td>
                                            <td>{p.phone_mobile || '—'}</td>
                                            <td>{p.city ? `${p.city}/${p.state || ''}` : '—'}</td>
                                            <td className="col-actions">
                                                <button className="page-btn btn-view" onClick={() => handleView(p.id)} title="Ver carteirinha"><FaEye /></button>
                                                <button className="page-btn btn-edit" onClick={() => handleEdit(p.id)} title="Editar"><FaPencilAlt /></button>
                                                <button className="page-btn btn-del" onClick={() => handleDelete(p.id)} title="Excluir"><FaTrashAlt /></button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="table-footer">
                        <small className="muted" id="countLabel">
                            Mostrando {filteredPacientes.length} de {pacientes.length} paciente(s)
                            {searchTerm && ` (filtrado de ${pacientes.length})`}
                        </small>
                    </div>
                </section>
            </main>
            <AccessibilityMenu />
        </>
    );
}