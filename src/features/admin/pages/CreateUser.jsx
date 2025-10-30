import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getAuthHeaders, readUserToken } from "@/lib/pacientesService";

// monta headers pra chamar Edge Function autenticada
function getFunctionHeaders() {
  const bearer = readUserToken();
  const base = getAuthHeaders();
  return {
    apikey: base.apikey,
    Authorization: bearer ? `Bearer ${bearer}` : base.Authorization,
    "Content-Type": "application/json",
  };
}

export default function CreateUser() {
  const navigate = useNavigate();

  // qual aba/papel está selecionado
  const [role, setRole] = useState("patient"); // 'patient' | 'medico' | 'secretaria' | 'admin'

  // dados do formulário
  const [form, setForm] = useState({
    email: "",
    password: "",
    full_name: "",
    phone: "",
    cpf: "",
    phone_mobile: "",
  });

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

  function onChange(e) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();

    setErr("");
    setOk("");

    const currentRole = role;

    // ---- validações front ----
    if (!currentRole) {
      setErr("Selecione o tipo de usuário (médico, secretária, paciente ou admin) antes de criar.");
      return;
    }
    if (!form.email || !form.password || !form.full_name) {
      setErr("Preencha pelo menos e-mail, senha e nome completo.");
      return;
    }

    // sua Edge Function exige cpf e phone_mobile -> vamos continuar exigindo
    if (!form.cpf) {
      setErr("CPF é obrigatório.");
      return;
    }
    if (!form.phone_mobile) {
      setErr("Celular (WhatsApp) é obrigatório.");
      return;
    }

    setLoading(true);

    try {
      // =========================================================
      // 1. CRIA O USUÁRIO VIA EDGE FUNCTION
      // =========================================================
      const fnUrl = `${SUPABASE_URL}/functions/v1/create-user-with-password`;

      const bodyPayload = {
        email: form.email,
        password: form.password,
        full_name: form.full_name,
        phone: form.phone,
        role: currentRole, // "admin" | "medico" | "secretaria" | "patient"
        create_patient_record: currentRole === "patient",
        cpf: form.cpf,
        phone_mobile: form.phone_mobile,
      };

      const r = await fetch(fnUrl, {
        method: "POST",
        headers: getFunctionHeaders(),
        body: JSON.stringify(bodyPayload),
      });

      if (!r.ok) {
        const txt = await r.text();
        throw new Error(`Função create-user falhou (${r.status}): ${txt}`);
      }

      const data = await r.json();
      const userId =
        data?.user?.id ||
        data?.id ||
        null;

      if (!userId) {
        throw new Error("A Edge Function não retornou o ID do usuário.");
      }

      // =========================================================
      // 2. TENTA SINCRONIZAR PERFIL EM /profiles
      //    MAS SEM ENVIAR COLUNAS QUE NÃO EXISTEM
      // =========================================================

      // Vamos montar dinamicamente um objeto só com colunas que
      // provavelmente existem na tabela `profiles`.
      // NÃO incluir cpf / phone_mobile pq deu erro.
      const profileBody = {
        full_name: form.full_name,
        phone: form.phone,
        role: currentRole,
        email: form.email, // útil pro POST
        created_at: new Date().toISOString(),
      };

      // Headers para o REST da tabela profiles
      const baseHeaders = getAuthHeaders();
      const restHeaders = {
        ...baseHeaders,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      };

      let profileSaved = false;

      // ---- 2a. tenta PATCH pelo id ----
      try {
        const patchUrl = `${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}`;
        const r1 = await fetch(patchUrl, {
          method: "PATCH",
          headers: restHeaders,
          body: JSON.stringify(profileBody),
        });

        if (!r1.ok) {
          // vamos só logar, não quebrar ainda
          console.warn("[CreateUser] PATCH profiles falhou", r1.status);
          throw new Error(`PATCH profiles => ${r1.status}`);
        }

        profileSaved = true;
        console.log("✅ Perfil atualizado com PATCH!");
      } catch (patchErr) {
        // ---- 2b. se o PATCH falha (400/404 etc),
        //          tenta criar via POST.
        try {
          const postUrl = `${SUPABASE_URL}/rest/v1/profiles`;
          const r2 = await fetch(postUrl, {
            method: "POST",
            headers: restHeaders,
            body: JSON.stringify({
              id: userId,
              ...profileBody,
            }),
          });

          if (!r2.ok) {
            const txt = await r2.text();
            console.error(
              "[CreateUser] POST profiles falhou",
              r2.status,
              txt
            );
            // Se nem POST funcionou: vamos seguir SEM profileSaved
          } else {
            profileSaved = true;
            console.log("✅ Perfil criado com POST!");
          }
        } catch (postErr) {
          console.error("[CreateUser] Erro no POST profiles catch:", postErr);
        }
      }

      // =========================================================
      // 3. FEEDBACK PRO USUÁRIO
      // =========================================================
      setOk(
        `${
          currentRole === "medico"
            ? "Médico"
            : currentRole === "secretaria"
            ? "Secretária"
            : currentRole === "admin"
            ? "Admin"
            : "Paciente"
        } criado(a)${
          profileSaved
            ? " e perfil salvo"
            : " (usuário criado, mas não consegui salvar o perfil)"
        } com sucesso!`
      );

      // limpa form
      setForm({
        email: "",
        password: "",
        full_name: "",
        phone: "",
        cpf: "",
        phone_mobile: "",
      });

      // navega pra lista de usuários
      navigate("/admin/UsersList");
    } catch (e2) {
      console.error("[CreateUser] erro:", e2);

      const rawMsg = e2?.message || "Erro ao criar usuário";

      // mensagens mais amigáveis
      if (/signups? not allowed/i.test(rawMsg)) {
        setErr(
          "Cadastros por e-mail estão desabilitados no projeto (Auth → Providers → Email → Enable email signup)."
        );
      } else if (/already registered/i.test(rawMsg)) {
        setErr("Este e-mail já está cadastrado.");
      } else if (/password/i.test(rawMsg) && /weak|short|min/i.test(rawMsg)) {
        setErr("Senha não atende a política. Tente uma senha mais forte/longa.");
      } else {
        setErr(rawMsg);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: 24 }}>
      {/* header da página */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <h1 style={{ margin: 0 }}>Novo Usuário</h1>
        <Link
          to="/admin/UsersList"
          style={{ textDecoration: "none", color: "#2563eb" }}
        >
          ← Voltar para lista
        </Link>
      </div>

      {/* abas de tipo de usuário */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {[
          { k: "patient", label: "Paciente" },
          { k: "medico", label: "Médico" },
          { k: "secretaria", label: "Secretária" },
          { k: "admin", label: "Admin" },
        ].map((tab) => (
          <button
            key={tab.k}
            type="button"
            onClick={() => setRole(tab.k)}
            style={{
              padding: "10px 14px",
              borderRadius: 10,
              border: "1px solid #e5e7eb",
              background: role === tab.k ? "#2563eb" : "#fff",
              color: role === tab.k ? "#fff" : "#111827",
              cursor: "pointer",
              minWidth: 110,
              textAlign: "center",
              fontWeight: 600,
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* formulário */}
      <form
        onSubmit={handleSubmit}
        style={{
          background: "#fff",
          border: "1px solid #e5e7eb",
          borderRadius: 12,
          padding: 16,
          maxWidth: 600,
          display: "grid",
          gap: 12,
        }}
      >
        <label style={{ display: "grid", gap: 6 }}>
          <span>E-mail</span>
          <input
            name="email"
            type="email"
            value={form.email}
            onChange={onChange}
            required
            style={inputStyle}
          />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span>Senha</span>
          <input
            name="password"
            type="password"
            value={form.password}
            onChange={onChange}
            required
            style={inputStyle}
          />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span>Nome completo</span>
          <input
            name="full_name"
            value={form.full_name}
            onChange={onChange}
            required
            style={inputStyle}
          />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span>Telefone fixo / clínica</span>
          <input
            name="phone"
            value={form.phone}
            onChange={onChange}
            placeholder="(11) 3333-4444"
            style={inputStyle}
          />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span>Celular / WhatsApp</span>
          <input
            name="phone_mobile"
            value={form.phone_mobile}
            onChange={onChange}
            placeholder="(11) 99999-8888"
            required
            style={inputStyle}
          />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span>CPF</span>
          <input
            name="cpf"
            value={form.cpf}
            onChange={onChange}
            placeholder="Só números"
            required
            style={inputStyle}
          />
        </label>

        {err && (
          <div
            style={{
              marginTop: 12,
              padding: 10,
              borderRadius: 8,
              background: "#fee2e2",
              color: "#991b1b",
            }}
          >
            {err}
          </div>
        )}

        {ok && (
          <div
            style={{
              marginTop: 12,
              padding: 10,
              borderRadius: 8,
              background: "#ecfdf5",
              color: "#065f46",
            }}
          >
            {ok}
          </div>
        )}

        <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
          <button type="submit" disabled={loading} style={primaryBtnStyle}>
            {loading ? "Salvando..." : "Criar usuário"}
          </button>
          <Link to="/admin/UsersList" style={ghostBtnStyle}>
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  );
}

const inputStyle = {
  padding: "10px 12px",
  borderRadius: 8,
  border: "1px solid #e5e7eb",
};

const primaryBtnStyle = {
  padding: "10px 14px",
  borderRadius: 10,
  border: 0,
  background: "#2563eb",
  color: "#fff",
  cursor: "pointer",
  fontWeight: 600,
};

const ghostBtnStyle = {
  padding: "10px 14px",
  borderRadius: 10,
  border: "1px solid #e5e7eb",
  color: "#111827",
  textDecoration: "none",
  fontWeight: 500,
};