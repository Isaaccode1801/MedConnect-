// src/features/doctor/pages/GerenciamentoPacientesPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
// Importe as funções do SEU service
import { listPacientes, deletePaciente, getPaciente } from '@/lib/pacientesService';
// Importe os estilos CSS (ajuste o caminho se necessário)
import '@/styles/GerenciamentoPacientesPage.css'; // Ou importe no seu CSS global principal
// Importe os ícones se quiser usá-los em React (opcional, pode manter os do CSS)
import { FaSearch, FaPlus, FaEye, FaPencilAlt, FaTrashAlt } from 'react-icons/fa';
import { Stethoscope, Search } from 'lucide-react';
// --- Funções Auxiliares (movidas de crudPatiMed.js) ---
function formatCPF(v) {
    if (!v) return "—";
    const only = String(v).replace(/\D/g, '').padStart(11, '0').slice(-11);
    return only.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}
// (Pode adicionar outras helpers como formatData, calcIdade, iniciais se precisar para o modal)

// --- Componente Principal ---
export default function GerenciamentoPacientesPage() {
    const navigate = useNavigate();
    const { pathname } = useLocation();
    const [pacientes, setPacientes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [q, setQ] = useState("");
    // Estados para o Modal (se decidir implementá-lo em React depois)
    // const [isModalOpen, setIsModalOpen] = useState(false);
    // const [selectedPacienteModal, setSelectedPacienteModal] = useState(null);

    // Função para carregar os dados
    const carregarPacientes = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await listPacientes();
            setPacientes(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error("Erro ao carregar pacientes:", err);
            setError(err.message || 'Falha ao carregar a lista.');
            setPacientes([]); // Limpa a lista em caso de erro
        } finally {
            setLoading(false);
        }
    }, []); // Sem dependências, carrega uma vez ou quando chamado manualmente

    // Carrega dados na montagem inicial
    useEffect(() => {
        carregarPacientes();
    }, [carregarPacientes]); // Executa quando carregarPacientes muda (só na montagem devido ao useCallback)

    // --- Handlers de Ação ---
    const handleEdit = (id) => {
        if (!id) return;
        // Navega para a página de edição/cadastro (ajuste a rota conforme seu router)
        // Pode usar sessionStorage como no original se a página de cadastro não usar useParams
        try { sessionStorage.setItem('edit_patient_id', id); } catch {}
        navigate(`/doctor/pacientes/editar/${id}`); // Ou a rota definida no seu router
        // Alternativa: Se a página de cadastro usa a URL:
        // navigate(`/doctor/pacientes/cadastro?id=${id}`);
    };

    const handleDelete = async (id) => {
        if (!id) return;
        const pacienteParaDeletar = pacientes.find(p => p.id === id);
        if (!pacienteParaDeletar) return;

        const ok = window.confirm(`Tem certeza que deseja excluir o paciente "${pacienteParaDeletar.full_name || id}"?`);
        if (!ok) return;

        // Idealmente, desabilitar o botão aqui (requer mais state)
        try {
            await deletePaciente(id);
            // Atualiza a lista local removendo o paciente deletado
            setPacientes(prevPacientes => prevPacientes.filter(p => p.id !== id));
            alert('Paciente excluído com sucesso.'); // Ou use um toast
        } catch (err) {
            console.error('Falha ao excluir paciente:', err);
            setError(`Falha ao excluir: ${err.message || 'erro desconhecido'}`);
            alert(`Falha ao excluir: ${err.message || 'erro desconhecido'}`);
        } finally {
            // Reabilitar o botão aqui
        }
    };

    const handleView = (id) => {
        // Implementar a lógica do modal aqui, se desejar
        // 1. Buscar dados completos do paciente com getPaciente(id)
        // 2. Armazenar em selectedPacienteModal
        // 3. Abrir o modal (setIsModalOpen(true))
        console.log("Visualizar paciente com ID:", id);
        alert("Funcionalidade de visualizar carteirinha a implementar.");
    };

    // --- Filtragem (Client-Side Simples) ---
    const filteredPacientes = pacientes.filter(p => {
        const lowerSearch = searchTerm.toLowerCase();
        return (
            (p.full_name && p.full_name.toLowerCase().includes(lowerSearch)) ||
            (p.cpf && formatCPF(p.cpf).includes(lowerSearch)) ||
            (p.phone_mobile && p.phone_mobile.toLowerCase().includes(lowerSearch)) ||
            (p.email && p.email.toLowerCase().includes(lowerSearch))
        );
    });

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
                    <nav className="doctor-header__nav">
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
                    <div className="head">
                        <div className="title">
                            <h1>Pacientes</h1>
                            <span className="badge">CRUD</span>
                        </div>
                        <div className="toolbar">
                            <div className="search">
                                <FaSearch style={{ color: '#6b7a88', marginRight: '8px' }}/> {/* Ícone React */}
                                <input
                                    id="q"
                                    placeholder="Buscar por nome, CPF, telefone..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            {/* Link para a página de cadastro/novo paciente */}
                            <Link className="btn primary" to="/doctor/pacientes/novo"> {/* Ajuste a rota */}
                                <FaPlus style={{ marginRight: '8px' }}/> {/* Ícone React */}
                                Novo paciente
                            </Link>
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
                                                {/* Botões usando ícones React */}
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
                        {/* A Paginação precisa ser implementada separadamente */}
                        <nav className="pagination" id="pager"></nav>
                    </div>
                </section>
            </main>

            {/* Modal da Carteirinha (a implementar como componente React) */}
            {/* {isModalOpen && <CarteirinhaModal paciente={selectedPacienteModal} onClose={() => setIsModalOpen(false)} />} */}

            {/* Menu de Acessibilidade (a implementar como componente React) */}
            {/* <AcessibilidadeMenu /> */}
        </>
    );
}

// TODO: Criar o componente CarteirinhaModal.jsx
// TODO: Criar o componente AcessibilidadeMenu.jsx (se desejar manter a mesma funcionalidade)
// TODO: Implementar a paginação (client-side ou server-side)