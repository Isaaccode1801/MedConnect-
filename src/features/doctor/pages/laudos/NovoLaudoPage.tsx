// NovoLaudoPage.tsx
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import {
  Report,
  listPacientes,
  getHeaders,
  listarMedicos,
  createLaudo,
  getLaudo,
  updateLaudo,
} from "@/lib/pacientesService";

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

// IMPORTE O COMBODOX


import "./NovoLaudoPage.css";

// Tipos
type Paciente = { id: string; full_name: string };
type Medico = { id: string; full_name: string };
type SpeechRecognition = any;
type SpeechRecognitionEvent = any;

// Helpers
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

// IA (Gemini)
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;
const GEMINI_API_URL = GEMINI_API_KEY
  ? `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`
  : "";

// Componente Combobox adaptado para pacientes
function PacienteCombobox({ 
  pacientes, 
  value, 
  onChange,
  disabled = false
}: { 
  pacientes: Paciente[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  // Debug: verifique se os pacientes estão chegando
  console.log('Pacientes no Combobox:', pacientes);

  // OTIMIZAÇÃO: useMemo para evitar re-mapeamento desnecessário
  const pacienteOptions = useMemo(() => {
    return pacientes.map(paciente => ({
      value: paciente.id,
      label: paciente.full_name
    }));
  }, [pacientes]); // Recalcula apenas se a lista de pacientes mudar

  const selectedValue = value || "";

  return (
    <select
      className="paciente-combobox"
      value={selectedValue}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
    >
      <option value="">Selecione…</option>
      {pacienteOptions.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

export default function NovoLaudoPage() {
  const nav = useNavigate();
  const { id: laudoId } = useParams<{ id: string }>();
  const editorRef = useRef<HTMLDivElement>(null);

  const [error, setError] = useState<string | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(!!laudoId);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [medicos, setMedicos] = useState<Medico[]>([]);

  // Form
  const [patientId, setPatientId] = useState("");
  const [solicitante, setSolicitante] = useState("");
  const [exame, setExame] = useState("Hemograma completo");
  const [dataExame, setDataExame] = useState("");
  const [horaExame, setHoraExame] = useState("");
  const [status, setStatus] = useState<"draft" | "published" | "archived">("draft");
  const [assinatura, setAssinatura] = useState(false);

  // Editor state
  const [contentHtml, setContentHtml] = useState("");

  // IA
  const [aiOpen, setAiOpen] = useState(false);
  const [gravando, setGravando] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  // Plain text do editor
  const plainText = useMemo(() => {
    if (typeof document !== "undefined") {
      const div = document.createElement("div");
      div.innerHTML = contentHtml;
      return div.textContent || div.innerText || "";
    }
    return "";
  }, [contentHtml]);
  const podeResumir = plainText.trim().length > 20;

  // Carregar listas
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

  // Carregar laudo (edição)
  useEffect(() => {
    if (laudoId) {
      setIsLoadingData(true);
      setError(null);
      getLaudo(laudoId)
        .then((laudoData) => {
          if (laudoData) {
            setPatientId(laudoData.patient_id || "");
            setSolicitante(laudoData.requested_by || "");
            setExame(laudoData.exam || "Hemograma completo");
            setStatus((laudoData.status as any) || "draft");
            setAssinatura(!laudoData.hide_signature);

            const html = laudoData.content_html || "";
            setContentHtml(html);
            if (editorRef.current) {
              editorRef.current.innerHTML = html;
            }

            if (laudoData.due_at) {
              try {
                const dateObj = new Date(laudoData.due_at);
                setDataExame(dateObj.toISOString().split("T")[0]);
                setHoraExame(
                  dateObj.toLocaleTimeString("pt-BR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                );
              } catch {}
            } else {
              setDataExame("");
              setHoraExame("");
            }
          } else {
            setError(`Laudo com ID ${laudoId} não encontrado.`);
            alert(`Laudo com ID ${laudoId} não encontrado.`);
          }
        })
        .catch((err) => {
          console.error("Falha ao carregar dados do laudo:", err);
          setError(`Erro ao carregar laudo: ${(err as Error).message}`);
          alert(`Erro ao carregar laudo: ${(err as Error).message}`);
        })
        .finally(() => {
          setIsLoadingData(false);
        });
    }
  }, [laudoId]);

  // SpeechRecognition
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
        const novoHtml = (editorRef.current.innerHTML + " " + finalTranscript).trim();
        editorRef.current.innerHTML = novoHtml;
        setContentHtml(novoHtml);
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

  // Comandos do editor
  function execCmd(cmd: string) {
    document.execCommand(cmd, false);
    (editorRef.current as any)?.innerText;
  }

  // IA — gerar resumo
  async function gerarResumoComIA() {
    if (!GEMINI_API_KEY || !GEMINI_API_URL) {
      alert("Chave do Gemini não configurada. Defina VITE_GEMINI_API_KEY.");
      return;
    }
    const plain = plainText.trim();
    if (plain.length < 20) {
      alert("Texto muito curto para resumir. Escreva mais de 20 caracteres.");
      return;
    }

    const systemPrompt = `Você é um assistente médico. Analise a transcrição de uma consulta e estruture-a em formato de prontuário (anamnese) com os seguintes tópicos em negrito: **Queixa Principal (QP)**, **História da Doença Atual (HDA)**, **Histórico Médico Pregresso (HMP)**, **Histórico Familiar (HF)** e **Hábitos de Vida (HV)**.
Após a anamnese, adicione **Plano Sugerido** com possíveis próximos passos. Inicie com o aviso:
*(Sugestão gerada por IA para avaliação do profissional. Não é um diagnóstico final.)*`;

    try {
      setIsSubmitting(true);
    const res = await fetch(GEMINI_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `${systemPrompt}\n\n=== TRANSCRIÇÃO DA CONSULTA ===\n${plain}`,
              },
            ],
          },
        ],
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
        setContentHtml(sanitized);
      }
    } catch (err: any) {
      console.error(err);
      alert(`Erro ao gerar resumo: ${err?.message || "desconhecido"}`);
    } finally {
      setIsSubmitting(false);
    }
  }

  // Gravação
  function toggleGravacao() {
    const rec = recognitionRef.current;
    if (!rec) {
      alert("Seu navegador não suporta reconhecimento de voz. Use o Chrome ou Edge.");
      return;
    }
    if (gravando) {
      try {
        rec.stop();
      } catch {}
      setGravando(false);
    } else {
      if (editorRef.current && contentHtml.length > 0 && !contentHtml.endsWith(" ")) {
        editorRef.current.innerHTML = contentHtml + " ";
        setContentHtml(contentHtml + " ");
      }
      rec.start();
    }
  }

  // Submit
  const onSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!patientId || !exame) {
        alert("Paciente e Exame são obrigatórios!");
        return;
      }

      const currentContentHtml = contentHtml;

      const body: Partial<Report> = {
        patient_id: patientId,
        exam: exame,
        requested_by: solicitante || null,
        content_html: currentContentHtml,
        status: status,
        hide_signature: !assinatura,
        due_at: combinarDataEHora(dataExame, horaExame),
      };

      setIsSubmitting(true);
      setError(null);

      try {
        if (laudoId) {
          await updateLaudo(laudoId, body);
          alert("Laudo atualizado com sucesso!");
        } else {
          const bodyForCreate: Partial<Report> = {
            ...body,
            order_number: `REL-${new Date().getFullYear()}-${Math.floor(
              Math.random() * 10000
            )}`,
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
    },
    [
      laudoId,
      patientId,
      exame,
      solicitante,
      status,
      assinatura,
      dataExame,
      horaExame,
      nav,
      contentHtml,
    ]
  );

  if (isLoadingData) {
    return <div className="loading-center">Carregando dados do laudo...</div>;
  }

  return (
    <>
      <div className="novo-laudo-page">
        <form onSubmit={onSubmit} className="novo-form-card">
          <h1 className="form-title">{laudoId ? "Editar Laudo" : "Laudo com Anamnese"}</h1>

          {error && <div className="alert-error">{error}</div>}

          {/* Toolbar */}
          <div className="editor-toolbar">
            <ToolbarButton onClick={() => execCmd("bold")} title="Negrito">
              <Bold className="icon-18" />
            </ToolbarButton>
            <ToolbarButton onClick={() => execCmd("italic")} title="Itálico">
              <Italic className="icon-18" />
            </ToolbarButton>
            <ToolbarButton onClick={() => execCmd("insertUnorderedList")} title="Lista">
              <List className="icon-18" />
            </ToolbarButton>
            <ToolbarButton onClick={() => execCmd("justifyLeft")} title="Alinhar à esquerda">
              <AlignLeft className="icon-18" />
            </ToolbarButton>
            <ToolbarButton onClick={() => execCmd("justifyCenter")} title="Centralizar">
              <AlignCenter className="icon-18" />
            </ToolbarButton>
            <ToolbarButton onClick={() => execCmd("justifyRight")} title="Alinhar à direita">
              <AlignRight className="icon-18" />
            </ToolbarButton>
          </div>

          {/* Editor */}
          <div
            ref={editorRef}
            contentEditable
            onInput={(e) => setContentHtml(e.currentTarget.innerHTML)}
            className="rich-editor prose"
            suppressContentEditableWarning
          />

          {/* Campos */}
          <div className="form-grid">
            <Labeled>
              <span>Paciente</span>
              <PacienteCombobox 
                // CORREÇÃO: Adicionando uma key para forçar a remontagem do componente
                // quando os dados carregarem (pacientes.length > 0)
                key={pacientes.length > 0 ? 'loaded' : 'loading'} 
                pacientes={pacientes}
                value={patientId}
                onChange={setPatientId}
                disabled={isSubmitting}
              />
            </Labeled>

            <Labeled>
              <span>Solicitante</span>
              <select
                required
                value={solicitante}
                onChange={(e) => setSolicitante(e.target.value)}
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

            <Labeled className="full-row">
              <span>Exame</span>
              <select
                value={exame}
                onChange={(e) => setExame(e.target.value)}
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
                disabled={isSubmitting}
              />
            </Labeled>

            <Labeled>
              <span>Hora</span>
              <select
                value={horaExame}
                onChange={(e) => setHoraExame(e.target.value)}
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
                disabled={isSubmitting}
              >
                <option value="draft">Rascunho</option>
                <option value="published">Publicado</option>
                <option value="archived">Arquivado</option>
              </select>
            </Labeled>

            <label className="checkbox-inline">
              <input
                type="checkbox"
                checked={assinatura}
                onChange={(e) => setAssinatura(e.target.checked)}
                disabled={isSubmitting}
              />
              Assinatura digital
            </label>

            {/* Ações */}
            <div className="actions-row">
              <button
                type="button"
                onClick={() => nav("/doctor/laudos")}
                disabled={isSubmitting}
                className="btn-cancelar"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting || isLoadingData}
                className="btn-salvar"
              >
                {isSubmitting && <Spinner />}
                {laudoId ? "Atualizar Laudo" : "Salvar Laudo"}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Botões flutuantes (IA) */}
      <div className="ia-fab-wrap">
        <button
          disabled={!podeResumir}
          className={`ai-action ${aiOpen ? "ai-open" : "ai-closed"} ${
            podeResumir ? "ai-enabled" : "ai-disabled"
          }`}
          title="Gerar Resumo a partir do texto"
          type="button"
          onClick={gerarResumoComIA}
        >
          <Wand2 className="icon-20" />
          <span>Gerar Resumo</span>
        </button>

        <button
          className={`ai-action ${aiOpen ? "ai-open" : "ai-closed"} ${
            gravando ? "ai-recording" : "ai-ready"
          }`}
          title={gravando ? "Parar Gravação" : "Iniciar Gravação"}
          type="button"
          onClick={toggleGravacao}
        >
          <Mic className="icon-20" />
          <span>{gravando ? "Parar" : "Iniciar Gravação"}</span>
        </button>

        <button
          type="button"
          onClick={() => setAiOpen((v) => !v)}
          title="Assistente de IA"
          className="ia-toggle"
        >
          {aiOpen ? <X className="icon-20" /> : <Bot className="icon-24" />}
        </button>
      </div>
    </>
  );
}

/** ---------- auxiliares ---------- */
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
    <button type="button" onClick={onClick} title={title} className="toolbar-btn">
      {children}
    </button>
  );
}

function Labeled({
  children,
  className = "",
}: React.PropsWithChildren<{ className?: string }>) {
  return <label className={`labeled ${className}`}>{children}</label>;
}

function Spinner() {
  return <div className="spinner-compact" />;
}