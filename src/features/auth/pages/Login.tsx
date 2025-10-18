import { useCallback, useMemo, useRef, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Spotlight } from "@/components/ui/spotlight";
import { SplineScene } from "@/components/ui/splite";
import { supabase } from "@/lib/supabase";

import {
  LogIn,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";

function resolveRouteByRole(role: string) {
  switch ((role || "").toLowerCase()) {
    case "doctor":
      return "/doctor";
    case "patient":
      return "/patient";
    case "secretary":
      return "/secretary";
    case "admin":
      return "/admin";
    case "finance":
      return "/finance";
    default:
      return "/";
  }
}

export default function Login() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const role = (searchParams.get("role") || "").toLowerCase();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const roleLabel =
    role === "doctor"
      ? "Médico"
      : role === "patient"
      ? "Paciente"
      : role === "secretary"
      ? "Secretaria"
      : role === "admin"
      ? "Administrador"
      : role === "finance"
      ? "Financeiro"
      : "Usuário";

  // === Parallax leve no robô ===
  const robotWrapRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!robotWrapRef.current) return;
    const el = robotWrapRef.current;

    const nx = e.clientX / window.innerWidth - 0.5;
    const ny = e.clientY / window.innerHeight - 0.5;

    const rotX = -(ny * 10);
    const rotY = nx * 14;
    const tx = nx * 20;
    const ty = ny * 20;

    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      el.style.transform = `
        perspective(1200px)
        translate3d(${tx}px, ${ty}px, 0)
        rotateX(${rotX}deg)
        rotateY(${rotY}deg)
      `;
    });
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (!robotWrapRef.current) return;
    robotWrapRef.current.style.transform = `
      perspective(1200px)
      translate3d(0, 0, 0)
      rotateX(0deg)
      rotateY(0deg)
    `;
  }, []);

  // === Cores do chip ===
  const roleChipClasses = useMemo(() => {
    switch (role) {
      case "doctor":
        return "bg-emerald-500/20 text-emerald-300 ring-emerald-400/30";
      case "patient":
        return "bg-sky-500/20 text-sky-300 ring-sky-400/30";
      case "secretary":
        return "bg-violet-500/20 text-violet-300 ring-violet-400/30";
      case "admin":
        return "bg-zinc-500/20 text-zinc-200 ring-zinc-400/30";
      case "finance":
        return "bg-amber-500/20 text-amber-300 ring-amber-400/30";
      default:
        return "bg-cyan-500/20 text-cyan-200 ring-cyan-400/30";
    }
  }, [role]);

  // === Login com Supabase ===
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMsg(null);
    setSubmitting(true);

    // Qual role usar? Primeiro o da URL, senão o que estiver salvo (fallback)
    const chosenRole = (role || localStorage.getItem("mc.pendingRole") || "user").toLowerCase();

    try {
      // Login no Supabase
      // Depois de logar com Supabase:
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        setErrorMsg(error.message || "Falha ao entrar. Verifique suas credenciais.");
        setSubmitting(false);
        return;
      }

      // GUARDA token e role para o pacientesService.ts
      const accessToken = data.session?.access_token || "";
      localStorage.setItem("user_token", accessToken);

      // Se você definiu o fluxo de "role" pela rota (?role=doctor) ou pelo botão clicado:
      localStorage.setItem("user_role", chosenRole);

      // siga o fluxo (navigate etc.)
      // Tentar salvar o role no perfil (user.metadata)
      try {
        await supabase.auth.updateUser({
          data: { role: chosenRole },
        });
      } catch (_) {
        // se falhar, só segue
      }

      // Redireciona baseado no role (centralizado em resolveRouteByRole)
      navigate(resolveRouteByRole(chosenRole));
    } catch (err: any) {
      setErrorMsg(err?.message || "Falha ao entrar. Verifique suas credenciais.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="relative min-h-screen bg-[#050505] overflow-hidden text-white flex items-center justify-center"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* Fundo animado */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-900/10 via-fuchsia-900/5 to-emerald-800/10" />
        <Spotlight className="top-0 left-1/4 opacity-25" fill="white" />
        <div
          ref={robotWrapRef}
          className="absolute inset-0 will-change-transform transition-transform duration-150 ease-out"
          style={{ transform: "perspective(1200px)" }}
        >
          <SplineScene
            scene="https://prod.spline.design/kZDDjO5HuC9GJUM2/scene.splinecode"
            className="absolute inset-0 w-full h-full"
          />
        </div>
      </div>

      {/* Overlay leve */}
      <div className="absolute inset-0 bg-black/10 pointer-events-none" />

      {/* ===== Caixa de Login ===== */}
      <div className="relative z-10 w-full max-w-md px-4 sm:px-6">
        <div className="relative rounded-2xl p-[1px] bg-gradient-to-br from-cyan-400/60 via-fuchsia-400/40 to-emerald-400/40 shadow-[0_0_0_1px_rgba(255,255,255,0.05)]">
          <div className="rounded-2xl bg-white/10 backdrop-blur-xl ring-1 ring-white/15 shadow-2xl">
            {/* Header */}
            <div className="px-6 sm:px-8 pt-6 sm:pt-8">
              <div className="flex items-center justify-center gap-2 mb-3">
                <LogIn className="w-6 h-6 text-white/80" />
                <h1 className="text-xl sm:text-2xl font-semibold">Entrar</h1>
              </div>

              <div className="flex items-center justify-center gap-2">
                <span className="text-xs sm:text-sm text-white/60">Acessando como</span>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs sm:text-sm ring-1 ${roleChipClasses}`}
                >
                  <ShieldCheck className="w-4 h-4" />
                  {roleLabel}
                </span>
              </div>
            </div>

            {/* Mensagem de erro */}
            {errorMsg && (
              <div className="mx-6 sm:mx-8 mt-3 rounded-md border border-red-400/30 bg-red-500/10 text-red-200 text-sm px-3 py-2">
                {errorMsg}
              </div>
            )}

            {/* Form */}
            <form
              className="px-6 sm:px-8 pb-6 sm:pb-8 pt-4 space-y-6"
              onSubmit={handleSubmit}
            >
              {/* Email */}
              <div className="space-y-2">
                <label htmlFor="email" className="block text-xs sm:text-sm text-white/70">
                  E-mail
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/60">
                    <Mail className="w-5 h-5" />
                  </span>
                  <input
                    id="email"
                    type="email"
                    placeholder="exemplo@medconnect.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full h-11 rounded-lg bg-white/10 text-white placeholder-white/40 border border-white/20 pl-12 pr-3 outline-none focus:ring-2 focus:ring-cyan-400/50 focus:border-transparent"
                    disabled={submitting}
                  />
                </div>
              </div>

              {/* Senha */}
              <div className="space-y-2">
                <label htmlFor="password" className="block text-xs sm:text-sm text-white/70">
                  Senha
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/60">
                    <Lock className="w-5 h-5" />
                  </span>
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full h-11 rounded-lg bg-white/10 text-white placeholder-white/40 border border-white/20 pl-12 pr-10 outline-none focus:ring-2 focus:ring-cyan-400/50 focus:border-transparent"
                    disabled={submitting}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 px-2 text-white/70 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Botão principal */}
              <div className="flex justify-center mt-5">
                <button
                  type="submit"
                  disabled={submitting}
                  className="group inline-flex items-center justify-center rounded-md bg-gradient-to-r from-cyan-400 via-fuchsia-400 to-emerald-400 text-black font-semibold text-sm shadow-md px-[60px] py-[16px] min-w-[200px] transition-all hover:brightness-110 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <span className="inline-flex items-center justify-center gap-2">
                    {submitting ? (
                      <>
                        <span className="h-4 w-4 border-2 border-black/40 border-t-black rounded-full animate-spin" />
                        Entrando...
                      </>
                    ) : (
                      <>
                        Entrar
                        <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                      </>
                    )}
                  </span>
                </button>
              </div>

              {/* Divisor */}
              <div className="relative text-center py-1">
                <span className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-px bg-white/10" />
                <span className="relative bg-white/10 px-2 py-0.5 rounded text-[11px] text-white/60 ring-1 ring-white/15">
                  MedConnect © {new Date().getFullYear()}
                </span>
              </div>
            </form>
          </div>
        </div>

        <p className="mt-4 text-center text-xs text-white/50">
          Ao continuar, você concorda com nossos{" "}
          <a className="underline hover:text-white" href="#">
            Termos de Uso
          </a>{" "}
          e{" "}
          <a className="underline hover:text-white" href="#">
            Política de Privacidade
          </a>.
        </p>
      </div>
    </div>
  );
}