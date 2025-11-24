// src/features/doctor/pages/GerenciamentoPacientesPage.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { listPacientes, deletePaciente } from '@/lib/pacientesService'; 
import { FaSearch, FaPlus, FaEye, FaPencilAlt, FaTrashAlt, FaPrint, FaTimes, FaUserCircle } from 'react-icons/fa';
import AccessibilityMenu from "../../../components/ui/AccessibilityMenu";
import '@/styles/GerenciamentoPacientesPage.css'; 

// --- Funções Auxiliares ---
function formatCPF(v) {
    if (!v) return "—";
    const only = String(v).replace(/\D/g, '').padStart(11, '0').slice(-11);
    return only.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

function formatDate(dateString) {
    if (!dateString) return "—";
    try {
        const date = new Date(dateString);
        return new Intl.DateTimeFormat('pt-BR').format(date);
    } catch (e) {
        return dateString;
    }
}

export default function GerenciamentoPacientesPage() {
    const navigate = useNavigate();

    // --- Estados ---
    const [pacientes, setPacientes] = useState([]);
    const [loading, setLoading] = useState(true); 
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    
    // Estado para o Modal de Carteirinha
    const [viewPatient, setViewPatient] = useState(null);

    // --- Busca ---
    const carregarPacientes = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            // Se não tiver o service, use: await supabase.from('patients').select('*');
            const data = await listPacientes(); 
            setPacientes(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error("Erro ao carregar:", err);
            setPacientes([]); 
            setError(err.message || 'Falha ao carregar a lista.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        carregarPacientes();
    }, [carregarPacientes]);

    // --- Handlers ---
    const handleEdit = (id) => navigate(`/doctor/pacientes/editar/${id}`);

    const handleDelete = async (id) => {
        if (!id) return;
        const paciente = pacientes.find(p => p.id === id);
        if (!window.confirm(`Excluir "${paciente?.full_name || 'paciente'}"?`)) return;

        try {
            await deletePaciente(id);
            setPacientes(prev => prev.filter(p => p.id !== id));
            alert('Paciente excluído.');
        } catch (err) {
            alert(`Erro ao excluir: ${err.message}`);
        }
    };

    const handleView = (id) => {
        const paciente = pacientes.find(p => p.id === id);
        if (paciente) {
            setViewPatient(paciente);
        }
    };

    const closeView = () => setViewPatient(null);

    // --- Filtros ---
    const filteredPacientes = useMemo(() => {
        if (!searchTerm) return pacientes;
        const lower = searchTerm.toLowerCase();
        return pacientes.filter(p => 
            (p.full_name?.toLowerCase().includes(lower)) ||
            (p.cpf && formatCPF(p.cpf).includes(lower)) ||
            (p.phone_mobile?.includes(lower)) ||
            (p.email?.toLowerCase().includes(lower))
        );
    }, [pacientes, searchTerm]);

    return (
        <div className="container" style={{ padding: '20px' }}>
            <section className="card" style={{ background: '#fff', borderRadius: '12px', padding: '24px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                
                {/* Header da Tabela */}
                <div className="head" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', marginBottom: '24px', gap: '16px' }}>
                    <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 700, color: '#1e293b' }}>Pacientes</h1>
                    
                    <div style={{ display: 'flex', gap: '12px', flex: 1, justifyContent: 'flex-end', minWidth: '300px' }}>
                        <div className="search" style={{ display: 'flex', alignItems: 'center', background: '#f1f5f9', borderRadius: '8px', padding: '8px 16px', flex: 1, maxWidth: '400px', border: '1px solid #e2e8f0' }}>
                            <FaSearch style={{ color: '#64748b', marginRight: '10px' }}/>
                            <input
                                placeholder="Buscar por nome, CPF..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', color: '#334155', fontSize: '0.95rem' }}
                            />
                        </div>

                        <Link to="/doctor/pacientes/novo" className="btn primary" style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#06b6d4', color: '#fff', padding: '10px 20px', borderRadius: '8px', textDecoration: 'none', fontWeight: 600, fontSize: '0.9rem' }}>
                            <FaPlus size={12}/> Novo
                        </Link>
                    </div>
                </div>

                {error && <div style={{ padding: '12px', color: '#b91c1c', background: '#fef2f2', borderRadius: '8px', marginBottom: '16px' }}>{error}</div>}

                {/* Tabela */}
                <div className="table-wrap" style={{ overflowX: 'auto' }}>
                    <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#64748b', textAlign: 'left' }}>
                                <th style={{ padding: '12px' }}>Nome</th>
                                <th style={{ padding: '12px' }}>CPF</th>
                                <th style={{ padding: '12px' }}>Telefone</th>
                                <th style={{ padding: '12px' }}>Cidade</th>
                                <th style={{ padding: '12px', textAlign: 'right' }}>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="5" style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>Carregando...</td></tr>
                            ) : filteredPacientes.length === 0 ? (
                                <tr><td colSpan="5" style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>Nenhum paciente encontrado.</td></tr>
                            ) : (
                                filteredPacientes.map((p) => (
                                    <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                        <td style={{ padding: '12px', fontWeight: 500, color: '#334155' }}>{p.full_name}</td>
                                        <td style={{ padding: '12px', color: '#64748b' }}>{formatCPF(p.cpf)}</td>
                                        <td style={{ padding: '12px', color: '#64748b' }}>{p.phone_mobile || '—'}</td>
                                        <td style={{ padding: '12px', color: '#64748b' }}>{p.city || '—'}</td>
                                        <td style={{ padding: '12px', textAlign: 'right' }}>
                                            <button onClick={() => handleView(p.id)} style={iconBtnStyle} title="Ver Carteirinha"><FaEye /></button>
                                            <button onClick={() => handleEdit(p.id)} style={iconBtnStyle} title="Editar"><FaPencilAlt /></button>
                                            <button onClick={() => handleDelete(p.id)} style={{...iconBtnStyle, color: '#ef4444'}} title="Excluir"><FaTrashAlt /></button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="table-footer" style={{ marginTop: '16px', color: '#94a3b8', fontSize: '0.85rem' }}>
                    Mostrando {filteredPacientes.length} de {pacientes.length} registros
                </div>
            </section>

            {/* --- MODAL DE CARTEIRINHA --- */}
            {viewPatient && (
                <PatientCardModal 
                    patient={viewPatient} 
                    onClose={closeView} 
                />
            )}

            <AccessibilityMenu />
        </div>
    );
}

// --- Componente Modal Interno ---
function PatientCardModal({ patient, onClose }) {
    // Fecha ao clicar fora ou no ESC
    useEffect(() => {
        const handleEsc = (e) => { if(e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose]);

    const handlePrint = () => {
        window.print();
    };

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px'
        }} onClick={onClose}>
            
            <div 
                style={{
                    background: '#fff', width: '100%', maxWidth: '500px',
                    borderRadius: '16px', overflow: 'hidden',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                    animation: 'fadeIn 0.2s ease-out'
                }}
                onClick={e => e.stopPropagation()} // Evita fechar ao clicar dentro
            >
                {/* Header do Modal */}
                <div style={{ 
                    background: 'linear-gradient(135deg, #06b6d4 0%, #2563eb 100%)', 
                    padding: '24px', color: '#fff', position: 'relative' 
                }}>
                    <button 
                        onClick={onClose}
                        style={{ 
                            position: 'absolute', top: '16px', right: '16px', 
                            background: 'rgba(255,255,255,0.2)', border: 'none', 
                            color: '#fff', borderRadius: '50%', width: '32px', height: '32px', 
                            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}
                    >
                        <FaTimes />
                    </button>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{ 
                            width: '64px', height: '64px', background: '#fff', 
                            borderRadius: '50%', display: 'flex', alignItems: 'center', 
                            justifyContent: 'center', color: '#06b6d4', fontSize: '32px'
                        }}>
                            <FaUserCircle />
                        </div>
                        <div>
                            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700 }}>Carteira do Paciente</h2>
                            <p style={{ margin: '4px 0 0 0', opacity: 0.9, fontSize: '0.9rem' }}>MedConnect Health System</p>
                        </div>
                    </div>
                </div>

                {/* Corpo do Modal */}
                <div style={{ padding: '24px' }}>
                    <div style={{ marginBottom: '20px' }}>
                        <label style={labelStyle}>Nome Completo</label>
                        <div style={valueStyle}>{patient.full_name}</div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                        <div>
                            <label style={labelStyle}>CPF</label>
                            <div style={valueStyle}>{formatCPF(patient.cpf)}</div>
                        </div>
                        <div>
                            <label style={labelStyle}>Data de Nascimento</label>
                            <div style={valueStyle}>{formatDate(patient.birth_date)}</div>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                         <div>
                            <label style={labelStyle}>Telefone</label>
                            <div style={valueStyle}>{patient.phone_mobile || '—'}</div>
                        </div>
                        <div>
                            <label style={labelStyle}>E-mail</label>
                            <div style={valueStyle}>{patient.email || '—'}</div>
                        </div>
                    </div>

                     {/* Linha de Localização */}
                     <div>
                        <label style={labelStyle}>Localização</label>
                        <div style={valueStyle}>
                            {patient.city ? `${patient.city} - ${patient.state || ''}` : 'Endereço não informado'}
                        </div>
                    </div>
                </div>

                {/* Footer / Ações */}
                <div style={{ 
                    padding: '16px 24px', background: '#f8fafc', borderTop: '1px solid #e2e8f0',
                    display: 'flex', justifyContent: 'flex-end', gap: '12px'
                }}>
                    <button onClick={onClose} style={{
                        background: 'transparent', border: '1px solid #cbd5e1', color: '#64748b',
                        padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600
                    }}>
                        Fechar
                    </button>
                    <button onClick={handlePrint} style={{
                        background: '#0f172a', border: 'none', color: '#fff',
                        padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600,
                        display: 'flex', alignItems: 'center', gap: '8px'
                    }}>
                        <FaPrint /> Imprimir
                    </button>
                </div>
            </div>
            
            {/* Estilos de animação simples */}
            <style>{`
                @keyframes fadeIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
            `}</style>
        </div>
    );
}

// --- Estilos Inline Reutilizáveis ---
const iconBtnStyle = {
    background: 'transparent', border: 'none', cursor: 'pointer',
    padding: '8px', color: '#64748b', fontSize: '16px',
    marginLeft: '4px', transition: 'color 0.2s'
};

const labelStyle = {
    display: 'block', fontSize: '0.75rem', textTransform: 'uppercase',
    letterSpacing: '0.05em', color: '#94a3b8', marginBottom: '4px', fontWeight: 600
};

const valueStyle = {
    fontSize: '1rem', color: '#1e293b', fontWeight: 500, wordBreak: 'break-word'
};