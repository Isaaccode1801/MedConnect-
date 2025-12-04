// admin-dashboard/src/pages/UserDetailsModal.jsx
import { FaTimes, FaTrash } from 'react-icons/fa';

// 1. Recebemos 'onDelete' aqui nas props
export default function UserDetailsModal({ open, onClose, loading, error, data, onDelete }) {
  if (!open) return null;

  const user = data?.user || {};
  const profile = data?.profile || {};
  const roles = Array.isArray(data?.roles) ? data.roles : [];
  const perms = data?.permissions || {};

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="user-details-title"
      >
        <div className="modal-header">
          <h3 id="user-details-title">Detalhes do usuário</h3>
          <button 
            className="btn icon" 
            onClick={onClose} 
            aria-label="Fechar" 
            disabled={loading} // Desabilitado durante o loading
          >
            <FaTimes />
          </button>
        </div>

        <div className="modal-body">
          {loading && (
            <div className="muted">Carregando...</div>
          )}
          {!loading && error && (
            // Este 'error' agora também mostrará erros da exclusão
            <div className="alert error">{error}</div>
          )}

          {!loading && !error && (
            <>
              <section className="grid-2">
                <div className="box">
                  <h4>Conta (Auth)</h4>
                  <div className="kv"><span>ID</span><span className="mono">{user.id || '—'}</span></div>
                  <div className="kv"><span>E-mail</span><span>{user.email || '—'}</span></div>
                  <div className="kv"><span>E-mail confirmado</span><span>{user.email_confirmed_at || '—'}</span></div>
                  <div className="kv"><span>Criado em</span><span>{user.created_at || '—'}</span></div>
                  <div className="kv"><span>Último login</span><span>{user.last_sign_in_at || '—'}</span></div>
                </div>

                <div className="box">
                  <h4>Perfil (profiles)</h4>
                  <div className="kv"><span>ID</span><span className="mono">{profile.id || '—'}</span></div>
                  <div className="kv"><span>Nome</span><span>{profile.full_name || '—'}</span></div>
                  <div className="kv"><span>E-mail</span><span>{profile.email || '—'}</span></div>
                  <div className="kv"><span>Telefone</span><span>{profile.phone || '—'}</span></div>
                  <div className="kv"><span>Avatar</span><span>{profile.avatar_url || '—'}</span></div>
                  <div className="kv"><span>Ativo</span><span>{profile.disabled ? 'Não' : 'Sim'}</span></div>
                  <div className="kv"><span>Criado em</span><span>{profile.created_at || '—'}</span></div>
                  <div className="kv"><span>Atualizado em</span><span>{profile.updated_at || '—'}</span></div>
                </div>
              </section>

              <section className="box">
                <h4>Funções</h4>
                <div className="chips">
                  {roles.length > 0
                    ? roles.map((r) => (
                        <span 
                          key={r} 
                          className="chip"
                          style={{
                            padding: '0.25rem 0.75rem',
                            borderRadius: '999px',
                            background: 'var(--color-primary)',
                            color: 'white',
                            fontSize: '0.75rem',
                            fontWeight: 500,
                          }}
                        >
                          {r}
                        </span>
                      ))
                    : <span className="muted">—</span>
                  }
                </div>
              </section>

              <section className="box">
                <h4>Permissões</h4>
                <div className="perms">
                  {Object.keys(perms).length > 0 ? (
                    Object.entries(perms).map(([k, v]) => (
                      <div key={k} className={`perm ${v ? 'ok' : 'no'}`}>
                        <span className="key">{k}</span>
                        <span className="val">{v ? 'true' : 'false'}</span>
                      </div>
                    ))
                  ) : (
                    <span className="muted">—</span>
                  )}
                </div>
              </section>
            </>
          )}
        </div>

        {/* 2. Adicionado o modal-footer para os botões de ação */}
        <div className="modal-footer">
          <button
            className="btn danger" // 'danger' para o botão vermelho
            onClick={onDelete}     // 3. O onClick chama a prop onDelete
            disabled={loading || !data} // Desabilitado se estiver carregando ou se não houver dados
          >
            <FaTrash />
            <span>Excluir Usuário</span> 
          </button>
          
          <button 
            className="btn secondary" 
            onClick={onClose}
            disabled={loading}
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  );
}