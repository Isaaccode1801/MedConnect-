// src/features/doctor/pages/laudos/RevisarLaudoPage.jsx (CORREÇÃO FINAL DO "VOLTAR")

import React, { useState, useEffect } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { getLaudo } from '@/lib/pacientesService'; 
import { FaArrowLeft, FaCheck } from 'react-icons/fa';
// Importa o CSS da lista de admin (para os botões e 'card')
import "@/features/admin/pages/UsersList.css"; 
// Importa o CSS desta página
import "./RevisarLaudoPage.css"; 

export default function RevisarLaudoPage() {
  const { id } = useParams();
  const location = useLocation();
  const [laudo, setLaudo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // ================================================================
  // ✅ 1. LÓGICA DO BOTÃO "VOLTAR" CORRIGIDA
  // ================================================================
  // Agora verifica as 3 rotas: Admin, Secretária e o padrão (Médico)
  let backUrl = '/doctor/laudos'; // Padrão
  if (location.pathname.startsWith('/admin')) {
    backUrl = '/admin/laudos';
  } else if (location.pathname.startsWith('/secretary')) {
    backUrl = '/secretary/relatorios';
  }
  // ================================================================

  // --- 2. Carregar os dados do laudo (sem mudanças) ---
  useEffect(() => {
    if (!id) {
      setError('ID do laudo não fornecido.');
      setLoading(false);
      return;
    }
    
    async function carregarLaudo() {
      setLoading(true);
      setError('');
      try {
        const data = await getLaudo(id);
        if (!data) {
          throw new Error('Laudo não encontrado.');
        }
        setLaudo(data);
      } catch (err) {
        console.error(err);
        setError(err.message || 'Falha ao carregar o laudo.');
      } finally {
        setLoading(false);
      }
    }
    carregarLaudo();
  }, [id]);

  // --- 3. Função para "Aprovar" o laudo (sem mudanças) ---
  async function handleApprove() {
    if (!laudo || laudo.status === 'completed') return;
    
    setIsSaving(true);
    try {
      const { error: updateError } = await supabase
        .from('reports')
        .update({ status: 'completed' })
        .eq('id', id);
      
      if (updateError) throw updateError;
      setLaudo(prev => ({ ...prev, status: 'completed' }));
      
    } catch (err) {
      setError('Falha ao aprovar o laudo: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  }

  // --- 4. Renderização (sem mudanças) ---
  if (loading) {
    return <div className="revisao-laudo-container">Carregando laudo...</div>;
  }
  if (error) {
    return <div className="revisao-laudo-container error-box">{error}</div>;
  }
  if (!laudo) {
    return <div className="revisao-laudo-container">Laudo não encontrado.</div>;
  }

  return (
    <div className="revisao-laudo-container">
      <header className="revisao-header">
        {/* ✅ O "to" agora usa a variável "backUrl" corrigida */}
        <Link to={backUrl} className="revisao-back-btn">
          <FaArrowLeft />
          Voltar para a Lista
        </Link>
        
        <div className="revisao-actions">
          {laudo.status === 'draft' && (
            <button onClick={handleApprove} className="btn primary" disabled={isSaving}>
              {isSaving ? 'Salvando...' : <><FaCheck /> Aprovar Laudo</>}
            </button>
          )}
          {laudo.status === 'completed' && (
            <span className="badge success">Laudo Concluído</span>
          )}
        </div>
      </header>

      <div className="card revisao-content-card">
        <h2>Revisão de Laudo ({laudo.exam || 'Sem Título'})</h2>
        
        <div className="revisao-meta">
          <p><strong>Paciente:</strong> {laudo.patients?.full_name || 'N/A'}</p>
          <p><strong>Nº Pedido:</strong> {laudo.order_number || 'N/A'}</p>
          <p><strong>Status:</strong> <span className={`badge ${laudo.status === 'completed' ? 'success' : 'neutral'}`}>{laudo.status}</span></p>
        </div>
        
        <hr className="revisao-divider" />

        <div 
          className="laudo-html-content"
          dangerouslySetInnerHTML={{ __html: laudo.content_html || '<p><i>Conteúdo do laudo não disponível.</i></p>' }}
        />
      </div>
    </div>
  );
}