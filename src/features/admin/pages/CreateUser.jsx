import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getAuthHeaders, readUserToken } from "@/lib/pacientesService";
import { supabase } from "@/lib/supabase" // Precisamos do supabase

// (função getFunctionHeaders - sem alterações)
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
  const [role, setRole] = useState("paciente"); 
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

  // =================================================================
  // 🚀 FUNÇÃO HANDLESUBMIT (LÓGICA DE PROCURA POR CPF)
  // =================================================================
  async function handleSubmit(e) {
    e.preventDefault();
    setErr("");
    setOk("");
    setLoading(true);

    const currentRole = role;
    const isPatient = currentRole === "paciente";

    // ---- 1. Validações (sem alterações) ----
    if (!currentRole) {
      setErr("Selecione o tipo de usuário.");
      setLoading(false);
      return;
    }
    if (!form.email || !form.password || !form.full_name) {
      setErr("Preencha pelo menos e-mail, senha e nome completo.");
      setLoading(false);
      return;
    }
    
    // Limpa o CPF *antes* de o validar ou enviar
    const cpfLimpo = form.cpf.replace(/[^\d]/g, '');

    if (isPatient) {
        if (!cpfLimpo || cpfLimpo.length !== 11) {
            setErr("CPF é obrigatório e deve ter 11 dígitos.");
            setLoading(false);
            return;
        }
         if (!form.phone_mobile) {
            setErr("Celular (WhatsApp) é obrigatório para pacientes.");
            setLoading(false);
            return;
        }
    }
    
    try {
      // =========================================================
      // ETAPA 1: CHAMAR A FUNÇÃO DE BACKEND
      // (Cria o Auth User E o Patient Record, mas não os liga)
      // =========================================================
      const fnUrl = '/proxy/functions/v1/create-user-with-password';

      const bodyPayload = {
        email: form.email,
        password: form.password,
        full_name: form.full_name,
        phone: form.phone || null,
        role: currentRole, 
        create_patient_record: isPatient, 
        cpf: isPatient ? cpfLimpo : undefined,
        phone_mobile: isPatient ? form.phone_mobile : undefined,
      };
      
      Object.keys(bodyPayload).forEach(key => {
        if (bodyPayload[key] === undefined) delete bodyPayload[key];
      });

      const r = await fetch(fnUrl, {
        method: "POST",
        headers: getFunctionHeaders(),
        body: JSON.stringify(bodyPayload),
      });

      const data = await r.json();

      if (!r.ok) {
        throw new Error(data.error || `Função create-user falhou (${r.status})`);
      }
      
      // =========================================================
      // ETAPA 2: LIGAÇÃO MANUAL (COM A NOVA LÓGICA)
      // =========================================================
      if (isPatient) {
        const userId = data?.user?.id;
        
        if (!userId) {
            console.error("API criou o usuário mas não retornou o user.id:", data);
            throw new Error("Falha grave: A API não retornou o ID do usuário.");
        }

        // ✅ CORREÇÃO: Procurar o paciente pelo CPF que acabámos de criar
        const { data: patientData, error: findError } = await supabase
            .from('patients')
            .select('id')
            .eq('cpf', cpfLimpo) // Procura pelo CPF limpo
            .limit(1)
            .single(); // .single() devolve um objeto ou um erro

        if (findError || !patientData) {
            console.error("Erro ao buscar paciente pelo CPF:", findError);
            throw new Error("Usuário criado, mas não foi possível encontrar o registro de paciente pelo CPF para fazer a ligação.");
        }
        
        const patientId = patientData.id; // Encontrámos o ID do paciente!

        // Agora, fazemos o UPDATE para ligar os dois
        const { error: updateError } = await supabase
            .from('patients')
            .update({ user_id: userId }) // Define a coluna 'user_id'
            .eq('id', patientId);        // No 'id' do paciente que encontrámos

        if (updateError) {
            console.error("Falha ao ligar paciente:", updateError);
            throw new Error(`Usuário e paciente criados, mas falha ao ligar os registos: ${updateError.message}`);
        }
        
        console.log("✅ Paciente e Auth ligados com sucesso!");
      }

      // =========================================================
      // 3. FEEDBACK PRO USUÁRIO
      // =========================================================
      setOk(data.message || "Usuário criado com sucesso!");

      setForm({
        email: "",
        password: "",
        full_name: "",
        phone: "",
        cpf: "",
        phone_mobile: "",
      });

      setTimeout(() => {
        navigate("/admin/UsersList");
      }, 1000); 

    } catch (e2) {
      console.error("[CreateUser] erro:", e2);
      setErr(e2?.message || "Erro ao criar usuário");
    } finally {
      setLoading(false);
    }
  }

  // =================================================================
  // O RESTO DO SEU CÓDIGO JSX (LIMPO, SEM ERROS DE SINTAXE)
  // =================================================================
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
          { k: "paciente", label: "Paciente" },
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

        {/* Campos de Paciente Condicionais */}
        {role === 'paciente' && (
          <>
            <label style={{ display: "grid", gap: 6 }}>
              <span>Celular / WhatsApp (Obrigatório)</span>
              <input
                name="phone_mobile"
                value={form.phone_mobile}
                onChange={onChange}
                placeholder="(11) 99999-8888"
                required={role === 'paciente'}
                style={inputStyle}
              />
            </label>

            <label style={{ display: "grid", gap: 6 }}>
              <span>CPF (Obrigatório, só números)</span>
              <input
                name="cpf"
                value={form.cpf}
                onChange={onChange}
                placeholder="12345678901"
                required={role === 'paciente'}
                style={inputStyle}
              />
            </label>
          </>
        )}

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

// Estilos (limpos)
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