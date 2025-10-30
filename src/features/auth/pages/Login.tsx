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
  const role = (searchParams.get("role") || "").toLowerCase();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMsg(null);
    setSubmitting(true);

    const chosenRole = (
      role || localStorage.getItem("mc.pendingRole") || "user"
    ).toLowerCase();

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        setErrorMsg(
          error.message || "Falha ao entrar. Verifique suas credenciais."
        );
        setSubmitting(false);
        return;
      }

      const accessToken = data.session?.access_token || "";
      localStorage.setItem("user_token", accessToken);
      localStorage.setItem("user_role", chosenRole);

      try {
        await supabase.auth.updateUser({
          data: { role: chosenRole },
        });
      } catch {
        /* silencioso */
      }

      navigate(resolveRouteByRole(chosenRole));
    } catch (err: any) {
      setErrorMsg(
        err?.message || "Falha ao entrar. Verifique suas credenciais."
      );
    } finally {
        setSubmitting(false);
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-6 py-12"
      style={{
        backgroundColor: "#f9fafb", // cinza bem clarinho
      }}
    >
      {/* Card */}
      <div
        className="w-full max-w-xl rounded-2xl shadow-xl bg-white"
        style={{
          padding: "3rem 3rem 2.5rem",
          boxShadow:
            "0 30px 80px rgba(0,0,0,0.08), 0 6px 20px rgba(0,0,0,0.04)",
        }}
      >
        {/* Header (logo + texto) */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-6">
            <img
              src={medLogo}
              alt="MedConnect Logo"
              className="h-16 w-auto object-contain"
            />
            <div className="flex flex-col">
              <span
                className="text-gray-900 font-semibold"
                style={{ fontSize: "1.1rem", lineHeight: "1.3" }}
              >
                MedConnect
              </span>
              <span
                className="text-gray-500 font-normal"
                style={{ fontSize: ".9rem", lineHeight: "1.3" }}
              >
                Cuidar de você é nossa prioridade
              </span>
            </div>
          </div>

          <div>
            <h1
              className="text-gray-900 font-semibold"
              style={{ fontSize: "1.5rem", lineHeight: "1.25" }}
            >
              Bem-vindo de volta
            </h1>
            <p
              className="text-gray-500"
              style={{
                fontSize: ".95rem",
                marginTop: "0.5rem",
                lineHeight: "1.4",
              }}
            >
              Faça login para acessar o painel
            </p>
          </div>
        </div>

        {/* Erro */}
        {errorMsg && (
          <div
            className="rounded-lg border text-sm px-4 py-3 mb-8"
            style={{
              backgroundColor: "#FEF2F2",
              borderColor: "#FCA5A5",
              color: "#B91C1C",
              lineHeight: "1.4",
            }}
          >
            {errorMsg}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Email */}
          <div className="flex flex-col gap-2">
            <label
              htmlFor="email"
              className="text-gray-700 font-medium"
              style={{ fontSize: ".9rem" }}
            >
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
                className="w-full rounded-xl border border-gray-300 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                style={{
                  paddingLeft: "2.5rem",
                  paddingRight: "1rem",
                  height: "3.25rem",
                  fontSize: "1rem",
                  lineHeight: "1.4",
                  fontWeight: 500,
                  backgroundColor: "#fff",
                }}
              />
              <Mail
                className="absolute text-gray-400"
                size={20}
                style={{
                  left: "0.75rem",
                  top: "50%",
                  transform: "translateY(-50%)",
                }}
              />
            </div>
          </div>

          {/* Senha */}
          <div className="flex flex-col gap-2">
            <label
              htmlFor="password"
              className="text-gray-700 font-medium"
              style={{ fontSize: ".9rem" }}
            >
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
                className="w-full rounded-xl border border-gray-300 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                style={{
                  paddingLeft: "2.5rem",
                  paddingRight: "1rem",
                  height: "3.25rem",
                  fontSize: "1rem",
                  lineHeight: "1.4",
                  fontWeight: 500,
                  backgroundColor: "#fff",
                }}
              />
              <Lock
                className="absolute text-gray-400"
                size={20}
                style={{
                  left: "0.75rem",
                  top: "50%",
                  transform: "translateY(-50%)",
                }}
              />
            </div>
          </div>

          {/* remember / forgot */}
          <div className="flex items-start justify-between text-gray-600 text-sm">
            <label
              className="flex items-center gap-2 cursor-pointer select-none"
              style={{ lineHeight: "1.3" }}
            >
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span>Lembrar por 30 dias</span>
            </label>

            <button
              type="button"
              className="text-blue-600 hover:underline"
              style={{ lineHeight: "1.3" }}
            >
              Esqueci minha senha
            </button>
          </div>

          {/* Botão Entrar */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full font-semibold text-white rounded-xl transition disabled:opacity-60 disabled:cursor-not-allowed"
            style={{
              backgroundColor: "#2563eb",
              height: "3.25rem",
              fontSize: "1rem",
              lineHeight: "1.2",
              boxShadow:
                "0 16px 32px rgba(37,99,235,0.25), 0 2px 6px rgba(0,0,0,0.12)",
            }}
          >
            {submitting ? "Entrando..." : "Entrar"}
          </button>

          {/* Divider visual opcional */}
          <div
            className="flex items-center justify-center"
            style={{ marginTop: "0.5rem", marginBottom: "-0.5rem" }}
          >
            <div
              style={{
                flexGrow: 1,
                height: "1px",
                backgroundColor: "#E5E7EB",
              }}
            />
            <span
              className="mx-3 text-gray-400"
              style={{ fontSize: ".8rem", lineHeight: "1" }}
            >
              ou
            </span>
            <div
              style={{
                flexGrow: 1,
                height: "1px",
                backgroundColor: "#E5E7EB",
              }}
            />
          </div>

          {/* Botão Google */}
          <button
            type="button"
            className="w-full border bg-white flex items-center justify-center gap-3 rounded-xl hover:bg-gray-50 transition"
            style={{
              borderColor: "#D1D5DB",
              height: "3.25rem",
              fontSize: "0.95rem",
              fontWeight: 500,
              color: "#374151",
              lineHeight: "1.2",
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 533.5 544.3"
              className="h-5 w-5"
              aria-hidden="true"
            >
              <path
                fill="#4285f4"
                d="M533.5 278.4c0-18.4-1.6-36.2-4.7-53.4H272v101h146.9c-6.3 34-25.4 62.8-54.4 82v68h87.9c51.4-47.4 81.1-117.3 81.1-197.6z"
              />
              <path
                fill="#34a853"
                d="M272 544.3c73 0 134.3-24.2 179.1-65.7l-87.9-68c-24.4 16.3-55.5 25.9-91.2 25.9-70.1 0-129.5-47.4-150.8-111.3H32.8v69.9c44.8 88.3 137.2 149.2 239.2 149.2z"
              />
              <path
                fill="#fbbc04"
                d="M121.2 325.2c-8.8-26.4-8.8-54.8 0-81.2v-69.9H32.8c-29.8 58.3-29.8 127.9 0 186.2l88.4-34.9z"
              />
              <path
                fill="#ea4335"
                d="M272 107.7c37.7-.6 73.9 13.3 101.4 38.3l76-75.9C399.4 24.4 338 0 272 0 170 0 77.6 60.9 32.8 149.2l88.4 69.9c21.3-63.9 80.7-111.4 150.8-111.4z"
              />
            </svg>
            Entrar com Google
          </button>
        </form>

        {/* CTA cadastro */}
        <p
          className="text-gray-500 text-center"
          style={{
            fontSize: ".9rem",
            lineHeight: "1.4",
            marginTop: "2rem",
          }}
        >
          Não tem uma conta?{" "}
          <button
            type="button"
            className="text-blue-600 hover:underline font-medium"
          >
            Cadastre-se
          </button>
        </p>
      </div>
    </div>
  );
}