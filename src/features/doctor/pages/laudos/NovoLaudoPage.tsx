// src/features/doctor/pages/laudos/NovoLaudoPage.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createLaudo } from "../../../../services/api/laudos";
import { listPacientes, getHeaders } from "@/lib/pacientesService";

// Tipos de entidades e shims para Web Speech API
type Paciente = { id: string; full_name: string };
type Medico = { id: string; full_name: string };
type SpeechRecognition = any;
type SpeechRecognitionEvent = any;

import {
  Bold,
  Italic,
  List,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Bot,
  Wand2,
  Mic,
  X,
} from "lucide-react";

// Base da API (Supabase)
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;

// ===== sem fetch direto / supabase.ts aqui =====
// usamos apenas pacientesService (apiGet) como “centro” da API
async function listMedicos(): Promise<Medico[]> {
  type Row = {
    id: string;
    full_name?: string;
    name?: string;
    display_name?: string;
    role?: string;
    user_role?: string;
    perfil?: string;
    type?: string;
    kind?: string;
  };

  // Vamos ser super tolerantes com o schema do Supabase.
  // 1) Tentamos SEM querystring (muitos esquemas com RLS/visões aceitam melhor)
  // 2) Se falhar, tentamos `select=*`
  // 3) Se ainda falhar, devolvemos lista vazia (a tela continua usável)
  const baseUrl = `${SUPABASE_URL}/rest/v1/user_directory`;
  const tries = [
    `${baseUrl}`,
    `${baseUrl}?select=*`,
  ];

  let rows: Row[] = [];
  for (let i = 0; i < tries.length; i++) {
    const u = tries[i];
    try {
      console.debug(`[Medicos] tentativa ${i + 1}:`, u);
      const r = await fetch(u, { headers: getHeaders() });
      if (!r.ok) {
        const txt = await r.text().catch(() => "");
        console.warn(`[Medicos] falhou (${r.status}):`, txt || r.statusText);
        continue;
      }
      const data = (await r.json()) as unknown;
      if (Array.isArray(data)) {
        rows = data as Row[];
        break;
      }
    } catch (e) {
      console.warn("[Medicos] erro na tentativa:", e);
      continue;
    }
  }

  // Se nada deu certo, retorna vazio para não travar a página
  if (!Array.isArray(rows) || rows.length === 0) {
    console.info("[Medicos] nenhuma linha encontrada ou schema indisponível; retornando vazio.");
    return [];
  }

  // Descobre dinamicamente a coluna que representa o papel (role)
  const roleKey = ["role", "user_role", "perfil", "type", "kind"].find(
    (k) => k in (rows[0] || {})
  ) as keyof Row | undefined;

  const filtered = roleKey
    ? rows.filter((r) => {
        const v = String((r as any)[roleKey] ?? "").toLowerCase();
        return v === "doctor" || v === "medico" || v === "médico" || v === "medic";
      })
    : rows;

  // Normaliza e ordena por nome
  return filtered
    .map((r) => ({ id: r.id, full_name: r.full_name ?? r.name ?? r.display_name ?? "Sem nome" }))
    .sort((a, b) => a.full_name.localeCompare(b.full_name, "pt-BR"));
}

// ===== IA (opcional) =====
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;
const GEMINI_API_URL = GEMINI_API_KEY
  ? `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${GEMINI_API_KEY}`
  : "";

function horasOptions() {
  const items: string[] = [];
  for (let h = 8; h <= 22; h++) {
    for (const min of ["00", "30"]) {
      if (h === 22 && min === "30") continue;
      items.push(`${String(h).padStart(2, "0")}:${min}`);
    }
  }
  return items;
}

function combinarDataEHora(date?: string, time?: string) {
  return date && time ? `${date}T${time}:00Z` : null;
}

export default function NovoLaudoPage() {
  const nav = useNavigate();
  const editorRef = useRef<HTMLDivElement>(null);

  // dados (carregados via useEffect)
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [medicos, setMedicos] = useState<Medico[]>([]);

  // campos do form
  const [patientId, setPatientId] = useState("");
  const [solicitante, setSolicitante] = useState("");
  const [exame, setExame] = useState("Hemograma completo");
  const [dataExame, setDataExame] = useState("");
  const [horaExame, setHoraExame] = useState("");
  const [status, setStatus] = useState<"draft" | "published" | "archived">("draft");
  const [assinatura, setAssinatura] = useState(false);

  // IA: visuais e reconhecimento de voz
  const [aiOpen, setAiOpen] = useState(false);
  const [gravando, setGravando] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const podeResumir = useMemo(() => {
    const text = editorRef.current?.innerText?.trim() || "";
    return text.length > 0;
  }, [editorRef.current?.innerText]);

  // Carregar listas
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [pacs, meds] = await Promise.all([
          listPacientes().catch(() => []),
          listMedicos().catch(() => []),
        ]);
        if (!alive) return;
        setPacientes(Array.isArray(pacs) ? pacs : []);
        setMedicos(Array.isArray(meds) ? meds : []);
      } catch (e) {
        console.error(e);
        alert("Falha ao carregar listas de pacientes/médicos.");
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // Configurar reconhecimento de voz (Web Speech API)
  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;

    const rec: SpeechRecognition = new SR();
    rec.lang = "pt-BR";
    rec.continuous = true;
    rec.interimResults = true;

    rec.onstart = () => {
      setGravando(true);
      setAiOpen(true);
    };

    rec.onend = () => {
      setGravando(false);
    };

    rec.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        }
      }
      if (finalTranscript && editorRef.current) {
        editorRef.current.innerHTML = (editorRef.current.innerHTML + " " + finalTranscript).trim();
      }
    };

    recognitionRef.current = rec;
    return () => {
      try {
        rec.stop();
      } catch {}
      recognitionRef.current = null;
    };
  }, []);

  function execCmd(cmd: string) {
    document.execCommand(cmd, false);
    // re-render leve:
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    editorRef.current?.innerText;
  }

  async function gerarResumoComIA() {
    if (!GEMINI_API_KEY || !GEMINI_API_URL) {
      alert("Chave do Gemini não configurada. Defina VITE_GEMINI_API_KEY.");
      return;
    }
    const html = editorRef.current?.innerHTML || "";
    const plain = editorRef.current?.innerText?.trim() || "";
    if (plain.length < 20) {
      alert("Texto muito curto para resumir.");
      return;
    }

    const systemPrompt = `Você é um assistente médico. Analise a transcrição de uma consulta e estruture-a em formato de prontuário (anamnese) com os seguintes tópicos em negrito: **Queixa Principal (QP)**, **História da Doença Atual (HDA)**, **Histórico Médico Pregresso (HMP)**, **Histórico Familiar (HF)** e **Hábitos de Vida (HV)**.
Após a anamnese, adicione **Plano Sugerido** com possíveis próximos passos. Inicie com o aviso:
*(Sugestão gerada por IA para avaliação do profissional. Não é um diagnóstico final.)*`;

    try {
      const res = await fetch(GEMINI_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [{ parts: [{ text: html }] }],
        }),
      });

      if (!res.ok) throw new Error(`Gemini falhou: ${res.status}`);
      const data = await res.json();
      const textoResumido: string | undefined =
        data?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!textoResumido) throw new Error("Resposta inválida da IA.");

      const sanitized = textoResumido
        .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
        .replace(/\n/g, "<br>");

      if (editorRef.current) {
        editorRef.current.innerHTML = sanitized;
      }
    } catch (err: any) {
      console.error(err);
      alert(`Erro ao gerar resumo: ${err?.message || "desconhecido"}`);
    }
  }

  function toggleGravacao() {
    const rec = recognitionRef.current;
    if (!rec) {
      alert("Seu navegador não suporta reconhecimento de voz.");
      return;
    }
    if (gravando) {
      try {
        rec.stop();
      } catch {}
      setGravando(false);
    } else {
      editorRef.current && (editorRef.current.innerHTML = editorRef.current.innerHTML + " ");
      rec.start();
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!patientId || !exame) {
      alert("Paciente e Exame são obrigatórios!");
      return;
    }
    const content_html = editorRef.current?.innerHTML || "";
    const body = {
      patient_id: patientId,
      exam: exame,
      requested_by: solicitante || null,
      content_html,
      status,
      hide_signature: !assinatura,
      due_at: combinarDataEHora(dataExame, horaExame),
      order_number: `REL-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000)}`,
    };
    try {
      await createLaudo(body);
      alert("Laudo salvo com sucesso!");
      nav("/doctor/laudos");
    } catch (e: any) {
      console.error(e);
      alert(`Erro ao salvar laudo: ${e?.message || "desconhecido"}`);
    }
  }

  return (
    <div className="min-h-[calc(100vh-120px)] bg-[#F8F9FA] px-4 py-6 grid place-items-center">
      <form
        onSubmit={onSubmit}
        className="
          mx-auto w-full max-w-[1100px] min-h-[80vh]
          bg-white border border-slate-200 rounded-2xl 
          shadow-[0_4px_12px_rgba(0,0,0,0.07)]
          p-8
        "
      >
        <h1 className="text-center text-2xl font-semibold text-slate-800 mb-5">
          Laudo com anamnese
        </h1>

        {/* Toolbar */}
        <div className="editor-toolbar mb-3 border-b border-slate-200 pb-3 flex items-center gap-2">
          <ToolbarButton onClick={() => execCmd("bold")} title="Negrito">
            <Bold className="w-[18px] h-[18px]" />
          </ToolbarButton>
          <ToolbarButton onClick={() => execCmd("italic")} title="Itálico">
            <Italic className="w-[18px] h-[18px]" />
          </ToolbarButton>
          <ToolbarButton onClick={() => execCmd("insertUnorderedList")} title="Lista">
            <List className="w-[18px] h-[18px]" />
          </ToolbarButton>
          <ToolbarButton onClick={() => execCmd("justifyLeft")} title="Alinhar à esquerda">
            <AlignLeft className="w-[18px] h-[18px]" />
          </ToolbarButton>
          <ToolbarButton onClick={() => execCmd("justifyCenter")} title="Centralizar">
            <AlignCenter className="w-[18px] h-[18px]" />
          </ToolbarButton>
          <ToolbarButton onClick={() => execCmd("justifyRight")} title="Alinhar à direita">
            <AlignRight className="w-[18px] h-[18px]" />
          </ToolbarButton>
        </div>

        {/* Editor */}
        <div
          ref={editorRef}
          contentEditable
          className="
            min-h-[260px] border border-slate-200 rounded-lg p-4 outline-none
            prose prose-slate max-w-none
          "
          suppressContentEditableWarning
        />

        {/* Opções */}
        <div
          className="
            mt-5 grid gap-4
            grid-cols-1
            sm:grid-cols-2
          "
        >
          <Labeled>
            <span>Paciente</span>
            <select
              required
              value={patientId}
              onChange={(e) => setPatientId(e.target.value)}
              className="h-10 w-full rounded-md border border-slate-200 px-3 text-[15px]"
            >
              <option value="">Selecione…</option>
              {pacientes.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.full_name}
                </option>
              ))}
            </select>
          </Labeled>

          <Labeled>
            <span>Solicitante</span>
            <select
              required
              value={solicitante}
              onChange={(e) => setSolicitante(e.target.value)}
              className="h-10 w-full rounded-md border border-slate-200 px-3 text-[15px]"
            >
              <option value="">Selecione…</option>
              {medicos.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.full_name}
                </option>
              ))}
            </select>
          </Labeled>

          <Labeled className="sm:col-span-2">
            <span>Exame</span>
            <select
              value={exame}
              onChange={(e) => setExame(e.target.value)}
              className="h-10 w-full rounded-md border border-slate-200 px-3 text-[15px]"
            >
              <optgroup label="Sangue">
                <option>Hemograma completo</option>
                <option>Glicemia de jejum</option>
                <option>Colesterol e triglicerídeos</option>
                <option>Ureia e creatinina</option>
                <option>TGO/AST</option>
                <option>TGP/ALT</option>
                <option>TSH</option>
                <option>T4 livre</option>
                <option>Dosagem hormonal</option>
              </optgroup>
              <optgroup label="Urina">
                <option>Exame de urina tipo 1</option>
                <option>Urocultura</option>
                <option>Exame de urina de 24 horas</option>
              </optgroup>
            </select>
          </Labeled>

          <Labeled>
            <span>Data do exame</span>
            <input
              type="date"
              value={dataExame}
              onChange={(e) => setDataExame(e.target.value)}
              className="h-10 w-full rounded-md border border-slate-200 px-3 text-[15px]"
            />
          </Labeled>

          <Labeled>
            <span>Hora</span>
            <select
              value={horaExame}
              onChange={(e) => setHoraExame(e.target.value)}
              className="h-10 w-full rounded-md border border-slate-200 px-3 text-[15px]"
            >
              <option value="">Selecione…</option>
              {horasOptions().map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>
          </Labeled>

          <Labeled>
            <span>Status</span>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              className="h-10 w-full rounded-md border border-slate-200 px-3 text-[15px]"
            >
              <option value="draft">Rascunho</option>
              <option value="published">Publicado</option>
              <option value="archived">Arquivado</option>
            </select>
          </Labeled>

          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={assinatura}
              onChange={(e) => setAssinatura(e.target.checked)}
              className="size-4"
            />
            Assinatura digital
          </label>

          {/* Ações */}
          <div className="sm:col-span-2 flex justify-end gap-3 mt-2">
            <button
              type="button"
              onClick={() => nav("/doctor/laudos")}
              className="btn-cancelar rounded-lg bg-slate-100 px-4 py-2 font-semibold text-slate-700"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn-salvar rounded-lg bg-[#3fbbc0] px-4 py-2 font-semibold text-white"
            >
              Salvar Laudo
            </button>
          </div>
        </div>
      </form>

      {/* ===== Botões flutuantes de IA ===== */}
      <div className="fixed right-6 bottom-6 z-[60] flex flex-col items-end gap-2">
        <button
          disabled={!podeResumir}
          className={[
            "ai-action inline-flex items-center gap-2 rounded-full px-4 py-2 font-semibold text-white shadow",
            "transition-all duration-300",
            aiOpen ? "opacity-100 translate-y-0 visible" : "opacity-0 translate-y-2 invisible",
            podeResumir ? "bg-violet-600 hover:brightness-110" : "bg-slate-300 cursor-not-allowed",
          ].join(" ")}
          title="Gerar Resumo a partir do texto"
          type="button"
          onClick={gerarResumoComIA}
        >
          <Wand2 className="w-5 h-5" />
          <span>Gerar Resumo</span>
        </button>

        <button
          className={[
            "ai-action inline-flex items-center gap-2 rounded-full px-4 py-2 font-semibold text-white shadow",
            "transition-all duration-300",
            gravando ? "bg-red-500 animate-pulse" : "bg-blue-600 hover:brightness-110",
            aiOpen ? "opacity-100 translate-y-0 visible" : "opacity-0 translate-y-2 invisible",
          ].join(" ")}
          title={gravando ? "Parar Gravação" : "Iniciar Gravação"}
          type="button"
          onClick={toggleGravacao}
        >
          <Mic className="w-5 h-5" />
          <span>{gravando ? "Parar" : "Iniciar Gravação"}</span>
        </button>

        <button
          type="button"
          onClick={() => setAiOpen((v) => !v)}
          title="Assistente de IA"
          className="grid place-items-center size-[60px] rounded-full bg-[#3fbbc0] text-white shadow-lg hover:scale-110 transition-transform"
        >
          {aiOpen ? <X className="w-5 h-5" /> : <Bot className="w-6 h-6" />}
        </button>
      </div>
    </div>
  );
}

/** ---------- componentes auxiliares ---------- */

function ToolbarButton({
  onClick,
  title,
  children,
}: {
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className="h-9 rounded-md border border-slate-200 bg-slate-100 px-2 text-sm hover:bg-slate-200"
    >
      {children}
    </button>
  );
}

function Labeled({
  children,
  className = "",
}: React.PropsWithChildren<{ className?: string }>) {
  return (
    <label className={`flex flex-col gap-1 text-sm text-slate-700 ${className}`}>
      {children}
    </label>
  );
}