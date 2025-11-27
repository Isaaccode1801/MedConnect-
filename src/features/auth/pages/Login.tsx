import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import medLogo from "@/assets/Medconnect.logo.png";
import { Mail, Lock, X } from "lucide-react";
import AccessibilityMenu from "@/components/ui/AccessibilityMenu";
import { useDarkMode } from "@/hooks/useDarkMode"; // Import do seu hook
import "./Login.css";

function resolveRouteByRole(role: string) {
  switch ((role || "").toLowerCase()) {
    case "doctor":
      return "/doctor";
    case "patient":
      return "/patient/dashboard";
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
  const roleFromURL = (searchParams.get("role") || "").toLowerCase();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // ====== USANDO SEU HOOK EXISTENTE ======
  const { isDark } = useDarkMode();

  // ====== ESTADO DO MODAL DE RESET ======
  const [showReset, setShowReset] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMsg, setResetMsg] = useState<string | null>(null);
  const [resetErr, setResetErr] = useState<string | null>(null);

  // anti-429: cooldown e throttle por e-mail
  const [cooldown, setCooldown] = useState<number>(0);
  const COOLDOWN_SECONDS_DEFAULT = 300; // 5 minutos
  const LS_KEY = (em: string) => `mc.resetCooldown:${(em || "").toLowerCase()}`;

  function getChosenRole() {
    return (roleFromURL || localStorage.getItem("mc.pendingRole") || "user").toLowerCase();
  }

  async function persistSessionAndRedirect(sessionAccessToken: string | undefined, chosenRole: string) {
    if (sessionAccessToken) localStorage.setItem("user_token", sessionAccessToken);
    localStorage.setItem("user_role", chosenRole);
    try { await supabase.auth.updateUser({ data: { role: chosenRole } }); } catch {}
    navigate(resolveRouteByRole(chosenRole));
  }

  // ======================
  // LOGIN COM EMAIL/SENHA
  // ======================
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMsg(null);
    setSubmitting(true);
    const chosenRole = getChosenRole();
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) { setErrorMsg(error.message || "Falha ao entrar. Verifique suas credenciais."); setSubmitting(false); return; }
      const accessToken = data.session?.access_token || "";
      await persistSessionAndRedirect(accessToken, chosenRole);
    } catch (err: any) {
      setErrorMsg(err?.message || "Falha ao entrar. Verifique suas credenciais.");
      setSubmitting(false);
    } finally { setSubmitting(false); }
  }

  // ===========================
  // LOGIN COM GOOGLE (OAUTH)
  // ===========================
  async function handleGoogleLogin() {
    setErrorMsg(null); setSubmitting(true);
    const chosenRole = getChosenRole();
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: window.location.origin + "/login?oauth=google" },
      });
      if (error) { setErrorMsg(error.message || "Não foi possível iniciar o login com Google."); setSubmitting(false); return; }
    } catch (err: any) {
      setErrorMsg(err?.message || "Falha ao iniciar login com Google.");
      setSubmitting(false);
    }
  }

  // ===========================
  // FINALIZAR OAUTH (callback)
  // ===========================
  useEffect(() => {
    (async () => {
      try {
        if (!window.location.search.includes("oauth=google")) return;
        const { data: sessionData } = await supabase.auth.getSession();
        const accessToken = sessionData.session?.access_token;
        if (!accessToken) return;
        const chosenRole = getChosenRole();
        await persistSessionAndRedirect(accessToken, chosenRole);
      } catch (err) {
        console.warn("[Google OAuth callback] erro ao finalizar sessão:", err);
      } finally { setSubmitting(false); }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ===========================
  // RESETAR SENHA (SDK) + anti-429
  // ===========================
  function openReset() {
    setResetEmail(email || "");
    setResetMsg(null);
    setResetErr(null);

    // reatacha cooldown salvo
    const ts = localStorage.getItem(LS_KEY(email || ""));
    if (ts) {
      const expiresAt = Number(ts), now = Date.now();
      if (expiresAt > now) setCooldown(Math.ceil((expiresAt - now) / 1000));
      else localStorage.removeItem(LS_KEY(email || ""));
    } else { setCooldown(0); }

    setShowReset(true);
  }

  function startCooldown(seconds = COOLDOWN_SECONDS_DEFAULT, emailForKey?: string) {
    const until = Date.now() + seconds * 1000;
    const key = LS_KEY(emailForKey || resetEmail);
    try { localStorage.setItem(key, String(until)); } catch {}
    setCooldown(seconds);
    const id = setInterval(() => {
      setCooldown((s) => {
        if (s <= 1) { clearInterval(id); try { localStorage.removeItem(key); } catch {}; return 0; }
        return s - 1;
      });
    }, 1000);
  }

  function throttleRemaining(emailToCheck: string) {
    const raw = localStorage.getItem(LS_KEY(emailToCheck));
    if (!raw) return 0;
    const remainingMs = Number(raw) - Date.now();
    return remainingMs > 0 ? Math.ceil(remainingMs / 1000) : 0;
  }

  async function handleRequestPasswordReset(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setResetMsg(null); setResetErr(null);

    const trimmed = (resetEmail || "").trim().toLowerCase();
    if (!trimmed || !/^\S+@\S+\.\S+$/.test(trimmed)) { setResetErr("Informe um e-mail válido."); return; }

    // throttle local por e-mail
    const remaining = throttleRemaining(trimmed);
    if (remaining > 0) {
      setResetErr("voce ja solicitou a mudança de senha, aguarde..");
      setCooldown(remaining);
      return;
    }

    setResetLoading(true);
    try {
      const redirect = import.meta.env.VITE_PASSWORD_RESET_REDIRECT || `${window.location.origin}/reset-password`;
      const { error } = await supabase.auth.resetPasswordForEmail(trimmed, { redirectTo: redirect });

      if (error) {
        const status = (error as any)?.status;
        if (status === 429) {
          // Mensagem solicitada para rate-limit
          setResetErr("voce ja solicitou a mudança de senha, aguarde..");
          startCooldown(COOLDOWN_SECONDS_DEFAULT, trimmed);
        } else {
          setResetErr(error.message || "Falha ao solicitar reset de senha.");
        }
        return;
      }

      // sucesso normal
      setResetMsg("Se este e-mail estiver cadastrado, você receberá um link para trocar a senha.");
      startCooldown(COOLDOWN_SECONDS_DEFAULT, trimmed);
    } catch (err: any) {
      const msg = String(err?.message || "");
      if (msg.toLowerCase().includes("too many") || msg.includes("429")) {
        setResetErr("voce ja solicitou a mudança de senha, aguarde..");
        startCooldown(COOLDOWN_SECONDS_DEFAULT, trimmed);
      } else {
        setResetErr(msg || "Falha ao solicitar reset de senha.");
      }
    } finally { setResetLoading(false); }
  }

  return (
    <div className={`login-container ${isDark ? 'dark' : ''}`}>
      {/* Card */}
      <div className="login-card">
        {/* Header (logo only, centered) */}
        <div className="flex justify-center mb-6"> {/* mb-6 em vez de mb-8 ou mb-10 */}
          <img src={medLogo} alt="MedConnect Logo" className="h-44 w-auto" /> {/* h-32 em vez de h-44 */}
        </div>

        <div>
          <h1 className="login-title">
            Bem-vindo de volta
          </h1>
          <p className="login-subtitle">
            Faça login para acessar o painel
          </p>
        </div>

        {/* Erro */}
        {errorMsg && (
          <div className="login-error mb-8">
            {errorMsg}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-10">
          {/* Email */}
          <div className="flex flex-col gap-3">
            <label htmlFor="email" className="login-label">
              E-mail
            </label>
            <div className="relative">
              <input
                id="email"
                type="email"
                placeholder="exemplo@medconnect.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={submitting}
                className="login-input"
              />
              <Mail className="login-icon" size={20} />
            </div>
          </div>

          {/* Senha */}
          <div className="flex flex-col gap-3">
            <label htmlFor="password" className="login-label">
              Senha
            </label>
            <div className="relative">
              <input
                id="password"
                type="password"
                placeholder="••••••••"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={submitting}
                className="login-input"
              />
              <Lock className="login-icon" size={20} />
            </div>
          </div>

          {/* remember / forgot */}
          <div className="mt-4 mb-6 flex items-start justify-between text-sm" style={{ color: 'var(--text-secondary)' }}>
            <label className="flex items-center gap-2 cursor-pointer select-none" style={{ lineHeight: "1.3" }}>
              <input type="checkbox" className="login-checkbox" />
              <span>Lembrar por 30 dias</span>
            </label>

            <button
              type="button" onClick={openReset}
              className="text-button"
              style={{ color: 'var(--button-primary-bg)', lineHeight: "1.3" }}
              aria-haspopup="dialog" aria-expanded={showReset}
            >
              Esqueci minha senha
            </button>
          </div>

          {/* Botão Entrar */}
          <button
            type="submit" disabled={submitting}
            className="login-button-primary"
            style={{ marginTop: "1.5rem" }}
          >
            {submitting ? "Entrando..." : "Entrar"}
          </button>

          {/* Divider visual */}
          <div className="flex items-center justify-center" style={{ marginTop: "0.5rem", marginBottom: "-0.5rem" }}>
            <div className="login-divider" />
            <span className="login-divider-text mx-3">ou</span>
            <div className="login-divider" />
          </div>

          {/* Botão Google */}
          <button
            type="button" onClick={handleGoogleLogin} disabled={submitting}
            className="login-button-google flex items-center justify-center gap-3"
            style={{ marginTop: "1rem" }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 533.5 544.3" className="h-5 w-5" aria-hidden="true">
              <path fill="#4285f4" d="M533.5 278.4c0-18.4-1.6-36.2-4.7-53.4H272v101h146.9c-6.3 34-25.4 62.8-54.4 82v68h87.9c51.4-47.4 81.1-117.3 81.1-197.6z" />
              <path fill="#34a853" d="M272 544.3c73 0 134.3-24.2 179.1-65.7l-87.9-68c-24.4 16.3-55.5 25.9-91.2 25.9-70.1 0-129.5-47.4-150.8-111.3H32.8v69.9c44.8 88.3 137.2 149.2 239.2 149.2z" />
              <path fill="#fbbc04" d="M121.2 325.2c-8.8-26.4-8.8-54.8 0-81.2v-69.9H32.8c-29.8 58.3-29.8 127.9 0 186.2l88.4-34.9z" />
              <path fill="#ea4335" d="M272 107.7c37.7-.6 73.9 13.3 101.4 38.3l76-75.9C399.4 24.4 338 0 272 0 170 0 77.6 60.9 32.8 149.2l88.4 69.9c21.3-63.9 80.7-111.4 150.8-111.4z" />
            </svg>
            Entrar com Google
          </button>
        </form>

        {/* CTA cadastro */}
        <p className="text-center" style={{ fontSize: ".9rem", lineHeight: "1.4", marginTop: "3rem", color: 'var(--text-secondary)' }}>
          Não tem uma conta?{" "}
          <button type="button" style={{ color: 'var(--button-primary-bg)' }} className="text-button">Cadastre-se</button>
        </p>

        <AccessibilityMenu />
      </div>

      {/* ===== MODAL RESET SENHA ===== */}
      {showReset && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="reset-title"
          className="login-modal-backdrop"
          onClick={() => setShowReset(false)}
        >
          <div
            className="login-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            {/* header */}
            <div className="flex items-start justify-between mb-6">
              <h2 id="reset-title" className="login-modal-title">
                Resetar senha
              </h2>
              <button
                aria-label="Fechar"
                className="p-3 -mr-1 rounded-xl hover:bg-gray-100 transition-colors"
                style={{ color: 'var(--text-secondary)' }}
                onClick={() => setShowReset(false)}
              >
                <X size={22} />
              </button>
            </div>

            <p className="login-modal-text mb-5">
              Enviaremos um link de redefinição para o e-mail informado.
            </p>

            {/* form */}
            <form onSubmit={handleRequestPasswordReset} className="space-y-5">
              <div className="space-y-2.5">
                <label htmlFor="reset-email" className="login-label">
                  E-mail cadastrado
                </label>
                <input
                  id="reset-email"
                  type="email"
                  required
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  className="login-input"
                  style={{ height: "3.25rem", padding: "0 1rem", fontSize: "0.95rem" }}
                  placeholder="usuario@exemplo.com"
                  autoFocus
                />
              </div>

              {/* mensagens */}
              {resetErr && <div className="login-error">{resetErr}</div>}
              {resetMsg && <div className="login-success">{resetMsg}</div>}

              {/* actions */}
              <div className="flex items-center justify-end gap-3 pt-1">
                <button
                  type="button"
                  className="login-modal-button login-modal-button-cancel"
                  onClick={() => setShowReset(false)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={resetLoading || cooldown > 0}
                  className="login-modal-button login-modal-button-submit"
                >
                  {resetLoading
                    ? "Enviando..."
                    : cooldown > 0
                    ? `Aguarde ${cooldown}s`
                    : "Enviar link"}
                </button>
              </div>
            </form>

            <p className="mt-5 text-xs" style={{ color: 'var(--text-muted)' }}>
              * Se o e-mail estiver cadastrado, você receberá um link para redefinir sua senha.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}