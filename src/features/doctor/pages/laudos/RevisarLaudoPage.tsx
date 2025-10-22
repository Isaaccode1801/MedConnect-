import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getLaudo } from "@/lib/pacientesService";

type LaudoDetalhe = {
  id: string;
  content_html?: string;
  exam?: string;
  requested_by?: string;
  due_at?: string | null;
  status?: "draft" | "published" | string;
  patients?: { full_name?: string };
};

function formatarData(iso?: string | null) {
  if (!iso) return "-";
  const d = new Date(iso);
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(d);
}

export default function RevisarLaudoPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const [loading, setLoading] = useState(true);
  const [laudo, setLaudo] = useState<LaudoDetalhe | null>(null);
  const [error, setError] = useState<string | null>(null); // Add error state
  useEffect(() => {
    async function run() {
      if (!id) {
        setError("ID do laudo não encontrado na URL.");
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        setError(null); 
        const data = await getLaudo(id);
        if (data) {
           setLaudo(data);
        } else {
           setError(`Laudo com ID ${id} não encontrado.`);
        }
      } catch (e: any) { // Type the error
        console.error(e);
        setError(`Falha ao carregar o laudo: ${e.message}`);
        alert(`Falha ao carregar o laudo: ${e.message}`);
      } finally {
        setLoading(false);
      }
    }
    run();
  }, [id]);

  return (
    <div className="min-h-screen grid place-items-center p-6 bg-gray-100">
      {loading && <p className="text-center text-slate-500 py-10">Carregando dados do laudo…</p>}
      {!loading && laudo && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between p-5 border-b border-slate-200">
            <h1 className="text-lg font-semibold">Revisão de Laudo</h1>
            <span
              className={
                "px-3 py-1 rounded-full text-sm " +
                (laudo.status === "published"
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-amber-100 text-amber-700")
              }
            >
              {laudo.status || "desconhecido"}
            </span>
          </div>

          <div className="grid gap-4 md:grid-cols-2 p-5 border-b border-slate-200 text-sm">
            <div>
              <div className="text-slate-500">Paciente</div>
              <div className="font-medium">{laudo.patients?.full_name || "Não informado"}</div>
            </div>
            <div>
              <div className="text-slate-500">Exame</div>
              <div className="font-medium">{laudo.exam || "Não informado"}</div>
            </div>
            <div>
              <div className="text-slate-500">Médico Solicitante</div>
              <div className="font-medium">{laudo.requested_by || "Não informado"}</div>
            </div>
            <div>
              <div className="text-slate-500">Data do Exame</div>
              <div className="font-medium">{formatarData(laudo.due_at)}</div>
            </div>
          </div>

          <div className="p-5 leading-7 prose max-w-none">
            {/* conteúdo vindo em HTML da API */}
            <div dangerouslySetInnerHTML={{ __html: laudo.content_html || "<p><i>Nenhum conteúdo.</i></p>" }} />
          </div>

          <div className="flex items-center justify-end gap-2 p-5 border-t border-slate-200">
            <button className="px-4 h-10 rounded-md bg-slate-100" onClick={() => nav("/doctor/laudos")}>
              Voltar
            </button>
            <button className="px-4 h-10 rounded-md bg-slate-100" onClick={() => window.print()}>
              Imprimir
            </button>
            <button className="px-4 h-10 rounded-md bg-teal-600 text-white" onClick={() => nav(`/doctor/laudos/editar/${laudo.id}`)}>
              Editar Laudo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}