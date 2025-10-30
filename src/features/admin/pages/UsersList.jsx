import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  FaSearch,
  FaSync,
  FaPlus,
  FaFilter,
  FaChevronLeft,
  FaChevronRight,
} from "react-icons/fa";
import { listProfiles, getAuthHeaders } from "@/lib/pacientesService";
import "./UsersList.css";
import { FaEye } from "react-icons/fa";
import UserDetailsModal from "./UserDetailsModal";


export default function UsersList() {
  const [profiles, setProfiles] = useState([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(8);
  const [sortBy, setSortBy] = useState("created_at"); // "full_name" | "created_at"
  const [sortDir, setSortDir] = useState("desc"); // "asc" | "desc"
  const [refreshKey, setRefreshKey] = useState(0);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState("");
  const [detailsData, setDetailsData] = useState(null);

  useEffect(() => {
    let alive = true;
    const loadUsers = async () => {
      setLoading(true);
      setErr('');
      try {
        const data = await listProfiles();
        if (!alive) return;
        setProfiles(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('[UsersList] erro ao buscar usuários:', err);
        if (!alive) return;
        const status = err?.response?.status;
        setErr(status ? `Erro ${status}: não foi possível carregar os usuários.` : 'Erro ao carregar usuários.');
      } finally {
        if (alive) setLoading(false);
      }
    };
    loadUsers();
    return () => { alive = false; };
  }, [refreshKey]);

  function onRefresh() {
    setRefreshKey((k) => k + 1);
  }

  function toggleSort(field) {
    if (sortBy === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortDir("asc");
    }
  }

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const base = profiles.slice();

    // sort
    base.sort((a, b) => {
      const va =
        sortBy === "full_name"
          ? (a.full_name || "").toLowerCase()
          : new Date(a[sortBy] || 0).getTime();
      const vb =
        sortBy === "full_name"
          ? (b.full_name || "").toLowerCase()
          : new Date(b[sortBy] || 0).getTime();
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

    if (!needle) return base;
    return base.filter((p) =>
      [p.full_name, p.email, p.phone]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(needle))
    );
  }, [profiles, q, sortBy, sortDir]);

  // paginação
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;
  const pageItems = filtered.slice(start, start + pageSize);
  

  useEffect(() => {
    // se o filtro reduzir a lista, mantém página válida
    if (page > totalPages) setPage(totalPages);
  }, [totalPages, page]);

  // Abre modal e busca detalhes do usuário
  async function openDetails(user) {
    const id = user?.id || null;
    const email = user?.email || null;

    setDetailsError('');
    setDetailsData(null);
    setDetailsLoading(true);
    setDetailsOpen(true);

    try {
      // 1) Monta um objeto base de perfil com o que já temos na linha
      const profile = {
        id,
        full_name: user?.full_name ?? user?.user_metadata?.full_name ?? null,
        email: user?.email ?? null,
        phone: user?.phone ?? user?.user_metadata?.phone ?? null,
        avatar_url: user?.avatar_url ?? null,
        disabled: !!user?.disabled,
        created_at: user?.created_at ?? null,
        updated_at: user?.updated_at ?? null,
      };

      // 2) Tenta buscar roles via REST (pode falhar por RLS; manter silencioso)
      let roles = [];
      try {
        const API_BASE = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1`;
        const res = await fetch(`${API_BASE}/user_roles?user_id=eq.${id}&select=role`, {
          headers: getAuthHeaders(),
        });
        const rolesData = res.ok ? await res.json() : [];
        roles = Array.isArray(rolesData) ? rolesData.map(r => r.role).filter(Boolean) : [];
      } catch {
        roles = [];
      }

      // 3) Tenta enriquecer com a function `user-info` (pode devolver só o dono do token)
      let acct = null;
      try {
        const { data: acctData } = await fetchUserFullInfo({ id, email });
        if (acctData?.user?.id === id) {
          acct = {
            id: acctData.user.id,
            email: acctData.user.email,
            email_confirmed_at: acctData.user.email_confirmed_at || null,
            created_at: acctData.user.created_at || null,
            last_sign_in_at: acctData.user.last_sign_in_at || null,
          };
        }
      } catch {
        // ignora enriquecimento quando não autorizado
      }

      const payload = {
        user: acct ?? {
          id,
          email,
          email_confirmed_at: null,
          created_at: null,
          last_sign_in_at: null,
        },
        profile,
        roles,
        permissions: {
          isAdmin: roles.includes('admin'),
          isManager: roles.includes('manager') || roles.includes('gestor'),
          isDoctor: roles.includes('medico'),
          isSecretary: roles.includes('secretaria'),
          isAdminOrManager: roles.includes('admin') || roles.includes('manager') || roles.includes('gestor'),
        },
      };

      setDetailsData(payload);
    } catch (e) {
      console.error('[UserDetails] erro', e);
      const msg = e?.response?.data?.message || e?.message || 'Falha ao buscar detalhes.';
      setDetailsError(msg);
    } finally {
      setDetailsLoading(false);
    }
  }

  return (
    <div className="users-page">
      <header className="users-header">
        <div>
          <h1>Usuários</h1>
          <p>Gerencie os perfis cadastrados no sistema.</p>
        </div>
        <div className="header-actions">
          <button className="btn ghost" onClick={onRefresh} title="Atualizar">
            <FaSync />
            <span>Atualizar</span>
          </button>
          <Link to="/admin/CreateUser" className="btn primary">
            <FaPlus />
            <span>Novo usuário</span>
          </Link>
        </div>
      </header>



      {/* Estados */}
      {loading && <SkeletonTable />}
      {!loading && err && (
        <div className="error card">
          {err}{" "}
          <button className="link" onClick={onRefresh}>
            Tentar novamente
          </button>
        </div>
      )}
      {!loading && !err && total === 0 && (
        <div className="empty card">
          <img
            alt="Empty"
            src="https://svgshare.com/i/14xm.svg"
            height="120"
            loading="lazy"
          />
          <h3>Nenhum usuário encontrado</h3>
          <p>Ajuste sua busca ou crie um novo usuário.</p>
            <Link to="/admin/CreateUser" className="btn primary">
            <FaPlus /><span>Novo usuário</span>
            </Link>
        </div>
      )}

{!loading && !err && total > 0 && (
  <div className="users-card card">
    {/* toolbar dentro do card */}
    <div className="toolbar">
      <div className="search">
        <FaSearch className="icon" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por nome, e-mail ou telefone"
        />
      </div>

      <div className="toolbar-right">
        <button className="btn ghost">
          <FaFilter />
          <span>Filtros</span>
        </button>
        <div className="divider" />
        <div className="sort">
          <span className="muted">Ordenar por:</span>
          <button
            className={`chip ${sortBy === 'full_name' ? 'active' : ''}`}
            onClick={() => toggleSort('full_name')}
          >
            Nome {sortBy === 'full_name' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
          </button>
          <button
            className={`chip ${sortBy === 'created_at' ? 'active' : ''}`}
            onClick={() => toggleSort('created_at')}
          >
            Criado {sortBy === 'created_at' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
          </button>
        </div>
      </div>
    </div>

          <div className="table-wrap">
            <table className="users-table">
              <thead>
                <tr>
                  <th>Usuário</th>
                  <th>E-mail</th>
                  <th>Telefone</th>
                  <th>Função</th>
                  <th>Status</th>
                  <th>Criado em</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((p) => (
                    
                  <tr key={p.id}>
                    <td>
                      <div className="user-cell">
                        <Avatar name={p.full_name || p.email} />
                        <div>
                          <div className="name">
                        {p.full_name || p.user_metadata?.full_name || "—"}
                        </div>
                          <div className="muted small">id: {p.id}</div>
                        </div>
                      </div>
                    </td>
                    <td>{p.email || "-"}</td>
                    <td>{p.phone || p.user_metadata?.phone || "—"}</td>
                    <td>
                    <span className="badge neutral">
                        {p.role || (p.user_metadata?.role) || "—"}
                    </span>
                    </td>
                    <td>
                      <span
                        className={`badge ${
                          p.disabled ? "danger" : "success"
                        }`}
                      >
                        {p.disabled ? "Desativado" : "Ativo"}
                      </span>
                    </td>
                    <td>{formatDateTime(p.created_at)}</td>
                    <td>
                <button className="btn ghost" onClick={() => openDetails(p)} title="Ver detalhes">
                    <FaEye /> <span>Detalhes</span>
                </button>
                </td>
                  </tr>
                    
                ))}

              </tbody>
            </table>
          </div>

          <footer className="table-footer">
            <div className="muted">
              Mostrando <b>{pageItems.length}</b> de <b>{total}</b>
            </div>
            <div className="pager">
              <button
                className="btn ghost"
                disabled={safePage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <FaChevronLeft />
                <span>Anterior</span>
              </button>
              <span className="muted">
                Página <b>{safePage}</b> de <b>{totalPages}</b>
              </span>
              <button
                className="btn ghost"
                disabled={safePage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                <span>Próxima</span>
                <FaChevronRight />
              </button>
            </div>
          </footer>
        </div>
      )}
      <UserDetailsModal
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        loading={detailsLoading}
        error={detailsError}
        data={detailsData}
      />
    </div>
  );
}

/* ---------- Helpers ---------- */

function initials(name = "") {
  const parts = String(name).trim().split(/\s+/).slice(0, 2);
  return parts.map((s) => s[0]?.toUpperCase() || "").join("") || "U";
}

function Avatar({ name }) {
  return <div className="avatar">{initials(name)}</div>;
}

function formatDateTime(dt) {
  if (!dt) return "—";
  try {
    const d = new Date(dt);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleString();
  } catch {
    return "—";
  }
}

function SkeletonTable() {
  return (
    <div className="users-card card">
      <div className="table-wrap">
        <table className="users-table">
          <thead>
            <tr>
              <th>Usuário</th>
              <th>E-mail</th>
              <th>Telefone</th>
              <th>Status</th>
              <th>Criado em</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 6 }).map((_, i) => (
              <tr key={i} className="skeleton">
                <td>
                  <div className="user-cell">
                    <div className="avatar sk" />
                    <div className="sk-line w-80" />
                  </div>
                </td>
                <td><div className="sk-line w-120" /></td>
                <td><div className="sk-line w-80" /></td>
                <td><div className="sk-badge" /></td>
                <td><div className="sk-line w-100" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <footer className="table-footer">
        <div className="muted">Carregando…</div>
      </footer>
    </div>
  );
}