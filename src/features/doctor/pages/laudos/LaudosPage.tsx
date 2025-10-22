import { useEffect, useMemo, useState, useCallback } from "react"; // 1. Importe o useCallback
import { useNavigate } from "react-router-dom";
import {
  Search,
  Stethoscope,
  CalendarDays,
  FileText,
  RefreshCw,
  Filter,
  X,
  Pencil,
  Eye,
  Trash2,
} from "lucide-react";

import { listarLaudos, getHeaders, Report, excluirLaudo } from '@/lib/pacientesService';
import "./LaudosPage.css";

// Tipagem do laudo (Mantida como você definiu, embora 'Report' seja importado)
export type Laudo = {
  id: string;
  patient_id?: string | null;
  patient_name?: string | null;
  order_number?: string | null;
  exam?: string | null;
  diagnosis?: string | null;
  conclusion?: string | null;
  cid_code?: string | null;
  content_html?: string | null;
  content_json?: unknown;
  status?: "draft" | "pending" | "signed" | string | null;
  requested_by?: string | null;
  due_at?: string | null;
  hide_date?: boolean | null;
  hide_signature?: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
  created_by?: string | null;
};

/* =========================
   Helpers
========================= */
function formatarData(iso?: string | null) {
  if (!iso) return "-";
  const d = new Date(iso);
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(d);
}

function avaliarStatus(iso?: string | null) {
  if (!iso) return <span className="status-pill status-draft">Rascunho</span>;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const prazo = new Date(iso);
  prazo.setHours(0, 0, 0, 0);
  if (prazo >= hoje) {
    return <span className="status-pill status-ok">Dentro do prazo</span>;
  }
  return <span className="status-pill status-late">Vencido</span>;
}

export default function LaudosPage() {
  const nav = useNavigate();
  const [laudos, setLaudos] = useState<Report[]>([]); // Usando 'Report' importado
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [status, setStatus] = useState<string>("");
  const [patientId, setPatientId] = useState<string>("");
  const [createdBy, setCreatedBy] = useState<string>("");

  /* =========================
     Fetchers (Corrigido com useCallback)
  ========================= */
  const carregar = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Usa os estados 'status' e 'patientId' para filtrar
      const data = await listarLaudos({
        status: status,
        patient_id: patientId,
        created_by: createdBy,
      });

      setLaudos(data);
    } catch (e: any) {
      console.error("[LaudosPage] Falha ao carregar laudos:", e);
      setError(e?.message || "Erro ao carregar laudos");
    } finally {
      setLoading(false);
    }
  }, [status, patientId, createdBy]); // 2. Dependências do useCallback

  // 3. useEffect para carregar na montagem e quando os filtros mudam
    useEffect(() => {
    carregar();
  }, [carregar]);

  /* =========================
     Ações
  ========================= */
  function handleEditar(id: string) {
    nav(`/doctor/laudos/${id}/editar`);
  }

  function handleRevisar(id: string) {
    nav(`/doctor/laudos/${id}/revisar`);
  }

async function handleDeletar(id: string) {
  const ok = window.confirm("Tem certeza que deseja deletar este laudo?");
  if (!ok) return;

  try {
    setLoading(true); // Opcional: Mostrar loading durante a exclusão
    setError(null);

    await excluirLaudo(id); // <--- Usa a função do service

    alert('Laudo excluído com sucesso!'); // Feedback para o utilizador

    // Atualiza a lista chamando a função 'carregar' memorizada
    await carregar(); // <--- Recarrega a lista de laudos

  } catch (e: any) {
    console.error("[LaudosPage] Falha ao deletar laudo:", e);
    setError(`Erro ao deletar: ${e?.message || "desconhecido"}`); // Mostra o erro na UI
    alert(`Erro ao deletar: ${e?.message || "desconhecido"}`); // Mantém o alert se preferir
  } finally {
    setLoading(false); // Garante que o loading para, mesmo se houver erro
  }
}

  /* =========================
     Filtro local
  ========================= */
  const filtrados = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return laudos;
    return laudos.filter((l) => {
      const paciente = (l as any).patient_name || l.patient_id || "";
      const exame = l.exam || "";
      const ordem = l.order_number || "";
      const st = l.status || "";
      return `${paciente} ${exame} ${ordem} ${st}`.toLowerCase().includes(s);
    });
  }, [q, laudos]);

  /* =========================
     UI
  ========================= */
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
              Olá, Dr(a). <span className="highlight">Camilla Millene</span> 👋
            </h1>
          </div>

          <div className="doctor-header__search">
            <div className="search-wrapper">
              <Search className="search-icon" />
              <input
                name="q"
                autoComplete="off"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar paciente, exame, laudo…"
                className="search-input"
              />
            </div>
          </div>

          <nav className="doctor-header__nav">
            <button onClick={() => nav("/doctor/dashboard")} className="nav-link">
              Início
            </button>
            <button onClick={() => nav("/doctor/laudos")} className="nav-link active">
              Laudos
            </button>
            <a href="#" className="nav-link">
              Gerenciamento de Pacientes
            </a>
          </nav>
        </div>
      </header>

      <div className="laudos-page">
        <div className="laudos-toolbar">
          <button
            onClick={() => nav("/doctor/laudos/novo")}
            className="btn btn-primary"
            title="Novo Laudo"
          >
            <FileText className="h-4 w-4" />
            <span> Novo Laudo</span>
          </button>

          <div className="toolbar-filters">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setShowFilters((v) => !v)}
            >
              <Filter className="h-4 w-4" />
              <span>Filtros</span>
            </button>

            {showFilters && (
              <div className="filters-popover">
                <div className="filters-row">
                  <label className="filters-label">Status</label>
                  <select
                    className="filters-input"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                  >
                    <option value="">Todos</option>
                    <option value="draft">Rascunho</option>
                    <option value="pending">Pendente</option>
                    <option value="signed">Assinado</option>
                  </select>
                </div>

            <div className="filters-row">
              <label className="filters-label">Criado Por (ID)</label>
              <input
                className="filters-input"
                placeholder="UUID do usuário"
                value={createdBy}
                onChange={(e) => setCreatedBy(e.target.value)}
              />
            </div>

                {/* O filtro "Criado Por" foi removido do JSX pois não era usado */}

                <div className="filters-actions">
                  <button className="btn btn-secondary" onClick={carregar} disabled={loading}>
                    <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                    <span>Aplicar</span>
                  </button>
                  <button
                    className="btn btn-ghost"
                    onClick={() => {
                      setStatus("");
                      setPatientId("");
                      setShowFilters(false);
                      setCreatedBy("");
                    }}
                  >
                    <X className="h-4 w-4" />
                    <span>Limpar</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="toolbar-actions">
            <button className="btn btn-secondary" onClick={carregar} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              <span> Atualizar</span>
            </button>
          </div>

          {!loading && (
            <div className="text-xs text-slate-400 ml-auto">{`Total: ${laudos.length}`}</div>
          )}
        </div>

        {error && (
          <div className="p-4 mb-4 rounded-md bg-red-50 text-red-700 border border-red-200 text-sm">
            Erro ao carregar laudos: {error}
          </div>
        )}

        <div className="laudos-table-wrapper">
          <table className="laudos-table">
            <thead>
              <tr>
                <th>Paciente</th>
                <th>Exame</th>
                <th>Nº Pedido</th>
                <th>Prazo</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
          <tbody>
              {loading && (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-slate-500">
                    Carregando laudos…
                  </td>
                </tr>
              )}

              {!loading && filtrados.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-10 text-center text-slate-500 space-y-4">
                    <div className="text-base">Nenhum laudo encontrado.</div>
                    <div className="text-xs text-slate-400 max-w-xl mx-auto">
                      Possíveis causas: (1) Tabela <code>reports</code> vazia; (2) Políticas RLS
                      bloqueando o usuário; (3) URL/Chave incorretas.
                   </div>
                    <div className="flex items-center justify-center gap-3 mt-2">
                      <button className="btn btn-secondary" onClick={carregar}>
                        <RefreshCw className="h-4 w-4" />
                        <span> Tentar novamente</span>
                      </button>
                    </div>
                  </td>
                </tr>
              )}

              {!loading &&
                filtrados.map((laudo) => (
                  <tr key={laudo.id}>
                    <td>{(laudo as any).patient_name || laudo.patient_id || "-"}</td>
                    <td>{laudo.exam || "-"}</td>
                    <td>{laudo.order_number || "-"}</td>
                    <td>{formatarData(laudo.due_at)}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <CalendarDays className="h-4 w-4 text-slate-400" />
                        {avaliarStatus(laudo.due_at)}
                      </div>
                    </td>
                    <td>
                     <div className="flex items-center gap-2 justify-end">
                        <button
                          type="button"
                          className="btn btn-ghost"
                          title="Editar laudo"
                          onClick={() => handleEditar(laudo.id)}
                        >
                          <Pencil className="h-4 w-4" /><span className="sr-only">Editar</span>
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          title="Revisar laudo"
                          onClick={() => handleRevisar(laudo.id)}
                        >
                          <Eye className="h-4 w-4" /><span className="sr-only">Revisar</span>
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost text-red-600 hover:text-red-700"
                          title="Deletar laudo"
                          onClick={() => handleDeletar(laudo.id)}
                        >
                          <Trash2 className="h-4 w-4" /><span className="sr-only">Deletar</span>
                   </button>
                      </div>
                    </td>
                </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}