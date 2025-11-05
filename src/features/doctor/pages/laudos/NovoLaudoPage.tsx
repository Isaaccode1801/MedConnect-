import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useNavigate, useParams, Link } from "react-router-dom"; // Importe Link
import { Report ,listPacientes, getHeaders, listarMedicos, createLaudo, getLaudo, updateLaudo } from "@/lib/pacientesService";

// Tipos
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

// (Manter helpers: horasOptions, combinarDataEHora)
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

// (Manter helpers de IA: GEMINI_API_KEY, GEMINI_API_URL)
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;
const GEMINI_API_URL = GEMINI_API_KEY
  ? `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${GEMINI_API_KEY}`
  : "";


export default function NovoLaudoPage() {
  const nav = useNavigate();
  const { id: laudoId } = useParams<{ id: string }>();
  const editorRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(!!laudoId);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [medicos, setMedicos] = useState<Medico[]>([]);

  // --- Estados do Formulário ---
  const [patientId, setPatientId] = useState("");
  const [solicitante, setSolicitante] = useState("");
  const [exame, setExame] = useState("Hemograma completo");
  const [dataExame, setDataExame] = useState("");
  const [horaExame, setHoraExame] = useState("");
  const [status, setStatus] = useState<"draft" | "published" | "archived">("draft");
  const [assinatura, setAssinatura] = useState(false);
  
  // ================================================================
  // MUDANÇA 1: Estado para o conteúdo do editor (já existia, agora será usado)
  // ================================================================
  const [contentHtml, setContentHtml] = useState("");

  // --- Estados da IA ---
  const [aiOpen, setAiOpen] = useState(false);
  const [gravando, setGravando] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  // ================================================================
  // MUDANÇA 2: useMemo agora depende do *estado* 'contentHtml'
  // ================================================================
  const plainText = useMemo(() => {
    // Converte o HTML do estado para texto puro (necessário para a verificação de contagem)
    if (typeof document !== 'undefined') { // Garante que só executa no navegador
        const div = document.createElement('div');
        div.innerHTML = contentHtml;
        return div.textContent || div.innerText || "";
    }
    return "";
  }, [contentHtml]); // Depende do ESTADO 'contentHtml'

  const podeResumir = plainText.trim().length > 20; // Botão ativa após 20 caracteres

  // ... (useEffect para Carregar Listas - MANTENHA IGUAL)
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [pacs, meds] = await Promise.all([
          listPacientes().catch(() => []),
          listarMedicos().catch(() => []),
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

  // useEffect para Carregar Laudo (edição)
  useEffect(() => {
    if (laudoId) {
      setIsLoadingData(true);
      setError(null);
      getLaudo(laudoId)
        .then(laudoData => {
          if (laudoData) {
            setPatientId(laudoData.patient_id || "");
            setSolicitante(laudoData.requested_by || "");
            setExame(laudoData.exam || "Hemograma completo");
            setStatus(laudoData.status as any || "draft");
            setAssinatura(!laudoData.hide_signature);
            

            const html = laudoData.content_html || "";
            setContentHtml(html); // Define o estado
            if (editorRef.current) {
                editorRef.current.innerHTML = html; // Define o DOM
            }
           

            if (laudoData.due_at) {
              try {
                const dateObj = new Date(laudoData.due_at);
                setDataExame(dateObj.toISOString().split('T')[0]); 
                setHoraExame(dateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
              } catch (e) { /* ... */ }
            } else {
              setDataExame("");
              setHoraExame("");
            }
          } else {
            setError(`Laudo com ID ${laudoId} não encontrado.`);
            alert(`Laudo com ID ${laudoId} não encontrado.`);
          }
        })
        .catch(err => {
          console.error("Falha ao carregar dados do laudo:", err);
          setError(`Erro ao carregar laudo: ${(err as Error).message}`);
          alert(`Erro ao carregar laudo: ${(err as Error).message}`);
        })
        .finally(() => {
          setIsLoadingData(false);
        });
    }
  }, [laudoId]);

 
  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;

    const rec: SpeechRecognition = new SR();
    rec.lang = "pt-BR";
    rec.continuous = true;
    rec.interimResults = true;

    rec.onstart = () => { setGravando(true); setAiOpen(true); };
    rec.onend = () => { setGravando(false); };

    rec.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        }
      }
      if (finalTranscript && editorRef.current) {

        const novoHtml = (editorRef.current.innerHTML + " " + finalTranscript).trim();
        editorRef.current.innerHTML = novoHtml;
        setContentHtml(novoHtml); // <-- ATUALIZA O ESTADO
        // ================================================================
      }
    };

    recognitionRef.current = rec;
    return () => {
      try { rec.stop(); } catch {}
      recognitionRef.current = null;
    };
  }, []); // Dependência vazia está correta aqui

  // ... (função execCmd - MANTENHA IGUAL) ...
  function execCmd(cmd: string) {
    document.execCommand(cmd, false);
    (editorRef.current as any)?.innerText;
  }

  // ================================================================
  // MUDANÇA 5: 'gerarResumoComIA' agora usa o 'plainText' e 'contentHtml'
  // ================================================================
  async function gerarResumoComIA() {
    if (!GEMINI_API_KEY || !GEMINI_API_URL) {
      alert("Chave do Gemini não configurada. Defina VITE_GEMINI_API_KEY.");
      return;
    }

    const plain = plainText.trim(); // Usa o texto puro do useMemo
    if (plain.length < 20) {
      alert("Texto muito curto para resumir. Escreva mais de 20 caracteres.");
      return;
    }

    const systemPrompt = `Você é um assistente médico. Analise a transcrição de uma consulta e estruture-a em formato de prontuário (anamnese) com os seguintes tópicos em negrito: **Queixa Principal (QP)**, **História da Doença Atual (HDA)**, **Histórico Médico Pregresso (HMP)**, **Histórico Familiar (HF)** e **Hábitos de Vida (HV)**.
Após a anamnese, adicione **Plano Sugerido** com possíveis próximos passos. Inicie com o aviso:
*(Sugestão gerada por IA para avaliação do profissional. Não é um diagnóstico final.)*`;

    try {
      setIsSubmitting(true); // Mostra loading
      const res = await fetch(GEMINI_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [{ parts: [{ text: contentHtml }] }], // Envia o HTML atual do estado
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
        editorRef.current.innerHTML = sanitized; // Atualiza o editor
        setContentHtml(sanitized); // ATUALIZA O ESTADO
      }
    } catch (err: any) {
      console.error(err);
      alert(`Erro ao gerar resumo: ${err?.message || "desconhecido"}`);
    } finally {
      setIsSubmitting(false); // Esconde loading
    }
  }

  // ... (função toggleGravacao - MANTENHA IGUAL) ...
  function toggleGravacao() {
    const rec = recognitionRef.current;
    if (!rec) {
      alert("Seu navegador não suporta reconhecimento de voz. Use o Chrome ou Edge.");
      return;
    }
    if (gravando) {
      try { rec.stop(); } catch {}
      setGravando(false);
    } else {
      // Adiciona um espaço para que a próxima fala não cole na anterior
      if (editorRef.current && contentHtml.length > 0 && !contentHtml.endsWith(' ')) {
        editorRef.current.innerHTML = contentHtml + " ";
        setContentHtml(contentHtml + " ");
      }
      rec.start();
    }
  }

  // ================================================================
  // MUDANÇA 6: 'onSubmit' agora pega o HTML do ESTADO 'contentHtml'
  // ================================================================
  const onSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientId || !exame) {
      alert("Paciente e Exame são obrigatórios!");
      return;
    }

    // Pega o HTML atual do ESTADO
    const currentContentHtml = contentHtml;

    const body: Partial<Report> = {
      patient_id: patientId,
      exam: exame,
      requested_by: solicitante || null,
      content_html: currentContentHtml, // Usa o conteúdo do estado
      status: status,
      hide_signature: !assinatura,
      due_at: combinarDataEHora(dataExame, horaExame),
    };

    setIsSubmitting(true);
    setError(null);

    try {
      if (laudoId) {
        // --- Modo Edição ---
        await updateLaudo(laudoId, body);
        alert("Laudo atualizado com sucesso!");
      } else {
        // --- Modo Criação ---
        const bodyForCreate: Partial<Report> = {
            ...body,
            order_number: `REL-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000)}`
        };
        await createLaudo(bodyForCreate);
        alert("Laudo salvo com sucesso!");
      }
      nav("/doctor/laudos");
    } catch (err: any) {
      console.error(err);
      setError(`Erro ao salvar: ${err?.message || "desconhecido"}`);
      alert(`Erro ao salvar: ${err?.message || "desconhecido"}`);
    } finally {
      setIsSubmitting(false);
    }
  }, [
      // Adiciona 'contentHtml' às dependências
      laudoId, patientId, exame, solicitante, status, assinatura, dataExame, horaExame, nav, contentHtml
  ]);

  if (isLoadingData) {
    return <div className="p-10 text-center">Carregando dados do laudo...</div>;
  }
  
  return (
    <>
      <div className="min-h-[calc(100vh-120px)] bg-[#F8F9FA] px-4 py-6 flex items-center justify-center">
        <form
          onSubmit={onSubmit}
          className="
              mx-auto w-full max-w-[1100px] min-h-[80vh]
              bg-white border border-slate-200 rounded-2xl 
              shadow-[0_4px_12px_rgba(0,0,0,0.07)]
              p-8
              flex flex-col
            "
          >
            <h1 className="text-center text-2xl font-semibold text-slate-800 mb-5">
              {laudoId ? "Editar Laudo" : "Laudo com Anamnese"}
            </h1>

            {error && (
                <div className="p-3 mb-4 rounded-md bg-red-50 text-red-700 border border-red-200 text-sm">
                    {error}
                </div>
            )}

            {/* Toolbar */}
            <div className="editor-toolbar mb-3 border-b border-slate-200 pb-3 flex items-center gap-2">
              <ToolbarButton onClick={() => execCmd("bold")} title="Negrito"><Bold className="w-[18px] h-[18px]" /></ToolbarButton>
              <ToolbarButton onClick={() => execCmd("italic")} title="Itálico"><Italic className="w-[18px] h-[18px]" /></ToolbarButton>
              <ToolbarButton onClick={() => execCmd("insertUnorderedList")} title="Lista"><List className="w-[18px] h-[18px]" /></ToolbarButton>
              <ToolbarButton onClick={() => execCmd("justifyLeft")} title="Alinhar à esquerda"><AlignLeft className="w-[18px] h-[18px]" /></ToolbarButton>
              <ToolbarButton onClick={() => execCmd("justifyCenter")} title="Centralizar"><AlignCenter className="w-[18px] h-[18px]" /></ToolbarButton>
              <ToolbarButton onClick={() => execCmd("justifyRight")} title="Alinhar à direita"><AlignRight className="w-[18px] h-[18px]" /></ToolbarButton>
            </div>

            {/* Editor */}
            <div
              ref={editorRef}
              contentEditable
              // ================================================================
              // MUDANÇA 7: Atualiza o estado 'contentHtml' quando o utilizador escreve
              // ================================================================
              onInput={(e) => setContentHtml(e.currentTarget.innerHTML)}
              className="
                min-h-[260px] border border-slate-200 rounded-lg p-4 outline-none
                prose prose-slate max-w-none flex-grow
              "
              suppressContentEditableWarning
                // Define o HTML inicial APENAS na carga, usando o useEffect (MUDANÇA 3)
                // Remover 'dangerouslySetInnerHTML' daqui evita o cursor saltar
            />

            {/* Opções e resto do formulário... */}
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
                disabled={isSubmitting}
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
                disabled={isSubmitting}
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
                disabled={isSubmitting}
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
                disabled={isSubmitting}
              />
            </Labeled>

            <Labeled>
              <span>Hora</span>
              <select
                value={horaExame}
                onChange={(e) => setHoraExame(e.target.value)}
                className="h-10 w-full rounded-md border border-slate-200 px-3 text-[15px]"
                disabled={isSubmitting}
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
                disabled={isSubmitting}
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
                disabled={isSubmitting}
              />
              Assinatura digital
            </label>

            {/* Ações */}
            <div className="sm:col-span-2 flex justify-end gap-3 mt-2">
              <button
                type="button"
                onClick={() => nav("/doctor/laudos")}
                disabled={isSubmitting}
                className="btn-cancelar rounded-lg bg-slate-100 px-4 py-2 font-semibold text-slate-700 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting || isLoadingData}
                className="btn-salvar rounded-lg bg-[#3fbbc0] px-4 py-2 font-semibold text-white disabled:opacity-50 flex items-center gap-2"
              >
                {isSubmitting && <Spinner />}
                {laudoId ? "Atualizar Laudo" : "Salvar Laudo"}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* 3. Move os botões flutuantes para FORA do div de centralização */}
      <div className="fixed right-6 bottom-6 z-[60] flex flex-col items-end gap-2">
        <button
          disabled={!podeResumir} // <-- Agora funciona
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
    </>
  );
}


/** ---------- componentes auxiliares ---------- */
// (MANTENHA ToolbarButton, Labeled, e Spinner aqui no final)
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
function Spinner() {
    return <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>;
}

