import { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import medLogo from "@/assets/Medconnect.logo.png";
import { Mail, Lock } from "lucide-react";

function resolveRouteByRole(role: string) {
  switch ((role || "").toLowerCase()) {
    case "doctor":
      return "/doctor";
    case "patient":
      return "/patient/agendamento";
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
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-10 m-8 pt-10">
      <div className="bg-white shadow-lg rounded-xl p-16 w-full max-w-lg">
        <div className="flex items-center mb-10">
          <img src={medLogo} alt="MedConnect Logo" className="h-20 w-auto" />
        </div>
        <div className="mb-10">
          <p className="text-gray-500 text-sm mb-20">Por favor, insira seus dados</p>
          <h1 className="text-2xl font-bold text-gray-900">Bem-vindo de volta</h1>
        </div>
        {errorMsg && (
          <div className="mb-30 rounded-md border border-red-400 bg-red-100 text-red-700 text-sm px-3 py-2">
            {errorMsg}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-30">
          <div>
            <label htmlFor="email" className="sr-only">E-mail</label>
            <div className="relative">
              <input
                id="email"
                type="email"
                placeholder="exemplo@medconnect.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-30 py-30 text-gray-700 focus:ring-30 focus:ring-blue-500 outline-none"
                disabled={submitting}
              />
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            </div>
          </div>
          <div>
            <label htmlFor="password" className="sr-only">Senha</label>
            <div className="relative">
              <input
                id="password"
                type="password"
                placeholder="••••••••"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-30 py-30 m-20 text-gray-700 focus:ring-2 focus:ring-blue-500 outline-none"
                disabled={submitting}
              />
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            </div>
          </div>
          <div className="flex items-center justify-between text-sm text-gray-600">
            <label className="flex items-center gap-2">
              <input type="checkbox" className="form-checkbox h-4 w-4 text-blue-600" />
              Lembrar por 30 dias
            </label>
            <a href="#" className="text-blue-600 hover:underline">Esqueci minha senha</a>
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg py-3 transition disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {submitting ? "Entrando..." : "Entrar"}
          </button>
        </form>
        <button
          type="button"
          className="w-full border border-gray-300 flex items-center justify-center gap-2 rounded-lg py-2 mt-4 hover:bg-gray-50"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 533.5 544.3" className="h-5 w-5" aria-hidden="true">
            <path fill="#4285f4" d="M533.5 278.4c0-18.4-1.6-36.2-4.7-53.4H272v101h146.9c-6.3 34-25.4 62.8-54.4 82v68h87.9c51.4-47.4 81.1-117.3 81.1-197.6z"/>
            <path fill="#34a853" d="M272 544.3c73 0 134.3-24.2 179.1-65.7l-87.9-68c-24.4 16.3-55.5 25.9-91.2 25.9-70.1 0-129.5-47.4-150.8-111.3H32.8v69.9c44.8 88.3 137.2 149.2 239.2 149.2z"/>
            <path fill="#fbbc04" d="M121.2 325.2c-8.8-26.4-8.8-54.8 0-81.2v-69.9H32.8c-29.8 58.3-29.8 127.9 0 186.2l88.4-34.9z"/>
            <path fill="#ea4335" d="M272 107.7c37.7-.6 73.9 13.3 101.4 38.3l76-75.9C399.4 24.4 338 0 272 0 170 0 77.6 60.9 32.8 149.2l88.4 69.9c21.3-63.9 80.7-111.4 150.8-111.4z"/>
          </svg>
          Entrar com Google
        </button>
        <p className="text-gray-500 text-sm text-center mt-6">
          Não tem uma conta?{" "}
          <a href="#" className="text-blue-600 hover:underline">Cadastre-se</a>
        </p>
      </div>
    </div>
  );
}