// src/features/secretary/pages/Relatorios.jsx
// (Baseado na AdminReportsList.jsx)

import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FaSearch,
  FaSync,
  FaFilter,
  FaChevronLeft,
  FaChevronRight,
  FaEye,
} from "react-icons/fa";

// 1. Usa a MESMA função do service. A secretária pode ver todos os laudos.
import { listarLaudosAdmin } from "@/lib/pacientesService"; 

// 2. Usa o MESMO CSS da sua lista de usuários (para manter o estilo)
import "@/features/admin/pages/UsersList.css"; 
import AccessibilityMenu from "../../../components/ui/AccessibilityMenu";

export default function Relatorios() {
  const navigate = useNavigate();

  const [reports, setReports] = useState([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(15);
  const [sortBy, setSortBy] = useState("created_at");
  const [sortDir, setSortDir] = useState("desc");
  const [refreshKey, setRefreshKey] = useState(0);

  // 4. useEffect (idêntico ao do Admin)
  useEffect(() => {
    let alive = true;
    const loadReports = async () => {
      setLoading(true);
      setErr('');
      try {
        const data = await listarLaudosAdmin(); 
        if (!alive) return;
        setReports(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('[SecretaryReportsList] erro ao buscar laudos:', err);
        if (!alive) return;
        const status = err?.response?.status;
        setErr(status ? `Erro ${status}: não foi possível carregar os laudos.` : 'Erro ao carregar laudos.');
      } finally {
        if (alive) setLoading(false);
      }
    };
    loadReports();
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

  // 5. Lógica de filtro/ordenação (idêntica)
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const base = reports.slice();

    base.sort((a, b) => {
      const va =
        sortBy === "patient_name"
          ? (a.patient_name || "").toLowerCase()
          : new Date(a[sortBy] || 0).getTime();
      const vb =
        sortBy === "patient_name"
          ? (b.patient_name || "").toLowerCase()
          : new Date(b[sortBy] || 0).getTime();
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

    if (!needle) return base;
    return base.filter((l) =>
      [l.patient_name, l.doctor_name, l.exam, l.order_number]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(needle))
    );
  }, [reports, q, sortBy, sortDir]);

  // Paginação (idêntica)
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;
  const pageItems = filtered.slice(start, start + pageSize);
  
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [totalPages, page]);


  return (
    // NOTA: Esta div "users-page" recebe o padding. 
    // O seu layout (Sidebar) não precisa de adicionar padding.
    <div className="users-page">
      {/* ✅ 6. Cabeçalho atualizado para "Relatórios" */}
      <header className="users-header">
        <div>
          <h1>Relatórios</h1>
          <p>Revise todos os laudos e relatórios do sistema.</p>
        </div>
        <div className="header-actions">
          <button className="btn ghost" onClick={onRefresh} title="Atualizar">
            <FaSync />
            <span>Atualizar</span>
          </button>
        </div>
      </header>

      {/* Estados (idêntico) */}
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
          <h3>Nenhum relatório encontrado</h3>
          <p>Ajuste sua busca ou aguarde novos laudos serem criados.</p>
        </div>
      )}

      {/* Tabela Principal (idêntica, exceto o Link) */}
      {!loading && !err && total > 0 && (
      <div className="users-card card">
        {/* Toolbar */}
        <div className="toolbar">
          <div className="search">
            <FaSearch className="icon" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por paciente, médico, exame ou nº do pedido"
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
                className={`chip ${sortBy === 'patient_name' ? 'active' : ''}`}
                onClick={() => toggleSort('patient_name')}
              >
                Paciente {sortBy === 'patient_name' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
              </button>
              <button
                className={`chip ${sortBy === 'created_at' ? 'active' : ''}`}
                onClick={() => toggleSort('created_at')}
              >
                Criação {sortBy === 'created_at' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
              </button>
            </div>
          </div>
        </div>

        {/* Tabela */}
        <div className="table-wrap">
          <table className="users-table">
            <thead>
              <tr>
                <th>Paciente</th>
                <th>Exame / N° Pedido</th>
                <th>Médico Responsável</th>
                <th>Status</th>
                <th>Criado em</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map((l) => (
                <tr key={l.id}>
                  {/* Paciente */}
                  <td>
                    <div className="user-cell">
                      <Avatar name={l.patient_name} />
                      <div>
                        <div className="name">
                          {l.patient_name || "Paciente não vinculado"}
                        </div>
                        <div className="muted small">ID: {l.patient_id}</div>
                      </div>
                    </div>
                  </td>
                  
                  {/* Exame / Pedido */}
                  <td>
                    <div>
                      <div className="name">{l.exam || "Exame"}</div>
                      <div className="muted small">{l.order_number || "Sem pedido"}</div>
                    </div>
                  </td>
                  
                  {/* Médico Responsável */}
                  <td>
                    {l.doctor_name || "Médico não vinculado"}
                  </td>
                  
                  {/* Status */}
                  <td>
                    <span
                      className={`badge ${
                        l.status === "completed" ? "success" : "neutral"
                      }`}
                    >
                      {l.status === 'completed' ? 'Concluído' : 'Rascunho'}
                    </span>
                  </td>
                  
                  {/* Criado em */}
                  <td>{formatDateTime(l.created_at)}</td>
                  
                  {/* ✅ 7. AÇÕES (Link corrigido para a rota da Secretária) */}
                  <td>
                    <Link 
                      to={`/secretary/relatorios/${l.id}/revisar`} 
                      className="btn ghost" 
                      title="Revisar Laudo"
                    >
                      <FaEye /> <span>Revisar</span>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Rodapé (idêntico) */}
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
    <AccessibilityMenu />
  </div>
  );
}

/* ---------- Helpers (idênticos) ---------- */
function initials(name = "") {
  const parts = String(name).trim().split(/\s+/).slice(0, 2);
  return parts.map((s) => s[0]?.toUpperCase() || "").join("") || "L";
}

function Avatar({ name }) {
  return <div className="avatar">{initials(name)}</div>;
}

function formatDateTime(dt) {
  if (!dt) return "—";
  try {
    const d = new Date(dt);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleString("pt-BR", { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return "—";
  }
}

// Skeleton (idêntico)
function SkeletonTable() {
  return (
    <div className="users-card card">
      <div className="table-wrap">
        <table className="users-table">
          <thead>
            <tr>
              <th>Paciente</th>
              <th>Exame / N° Pedido</th>
              <th>Médico Responsável</th>
              <th>Status</th>
              <th>Criado em</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 8 }).map((_, i) => (
              <tr key={i} className="skeleton">
                <td>
                  <div className="user-cell">
                    <div className="avatar sk" />
                    <div className="sk-line w-80" />
                  </div>
                </td>
                <td><div className="sk-line w-120" /></td>
                <td><div className="sk-line w-100" /></td>
                <td><div className="sk-badge" /></td>
                <td><div className="sk-line w-100" /></td>
              </tr> 
            ))}
          </tbody>
        </table>
      </div>
      <footer className="table-footer">
        <div className="muted">Carregando...</div>
      </footer>
    </div>
  );
}