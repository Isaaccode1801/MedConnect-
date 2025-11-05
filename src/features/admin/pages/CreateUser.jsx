// src/features/admin/pages/CreateUser.jsx (LÓGICA DE API ÚNICA)
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase"; 

export default function CreateUser() {
  const navigate = useNavigate();
  const [role, setRole] = useState("paciente"); 
  
  const [form, setForm] = useState({
    email: "",
    password: "",
    full_name: "",
    phone: "", // Fixo (Admin/Secretaria)
    cpf: "", // Paciente E Médico
    phone_mobile: "", // Paciente E Médico
    crm: "", // Médico
    crm_uf: "", // Médico
    specialty: "", // Médico
  });

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  function onChange(e) {
    let { name, value } = e.target;
    if (name === 'crm_uf') {
        value = value.toUpperCase().slice(0, 2);
    }
    setForm((f) => ({ ...f, [name]: value }));
  }

  // =================================================================
  // FUNÇÃO HANDLESUBMIT (Refatorada para API Única)
  // =================================================================
  async function handleSubmit(e) {
    e.preventDefault();
    setErr("");
    setOk("");
    setLoading(true);

    const currentRole = role;
    const isPatient = currentRole === "paciente";
    const isDoctor = currentRole === "medico";
    const isAdminOrSecretary = currentRole === "admin" || currentRole === "secretaria";

    // --- 1. Validações ---
    if (!currentRole) {
      setErr("Selecione o tipo de usuário.");
      setLoading(false);
      return;
    }
    if (!form.email || !form.password || !form.full_name) {
      setErr("Preencha e-mail, senha e nome completo.");
      setLoading(false);
      return;
    }
    
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
    if (isDoctor) {
        if (!cpfLimpo || cpfLimpo.length !== 11) {
            setErr("CPF (do médico) é obrigatório e deve ter 11 dígitos.");
            setLoading(false);
            return;
        }
        if (!form.crm) {
            setErr("CRM é obrigatório para médicos.");
            setLoading(false);
            return;
        }
        if (!form.crm_uf || form.crm_uf.length !== 2) {
            setErr("UF do CRM é obrigatória (ex: SP, RJ).");
            setLoading(false);
            return;
        }
    }
    
    try {
      // =========================================================
      // ETAPA ÚNICA: MONTAR O PAYLOAD COMPLETO
      // =========================================================

      // 1.1. Telefone principal (auth)
      let phonePayload = null;
      if (isPatient || isDoctor) {
        phonePayload = form.phone_mobile || null; 
      } else if (isAdminOrSecretary) {
        phonePayload = form.phone || null;
      }

      // 1.2. Payload base (comum a todos)
      const bodyPayload = {
        email: form.email,
        password: form.password,
        full_name: form.full_name,
        phone: phonePayload,
        role: currentRole,
      };

      // 1.3. Adicionar campos de Paciente (se for paciente)
      if (isPatient) {
        bodyPayload.create_patient_record = true; // Flag da API
        bodyPayload.cpf = cpfLimpo;
        bodyPayload.phone_mobile = form.phone_mobile;
      }

      // 1.4. Adicionar campos de Médico (se for médico)
      // (Esta é a mudança: enviamos tudo para a API)
      if (isDoctor) {
        bodyPayload.cpf = cpfLimpo;
        bodyPayload.phone_mobile = form.phone_mobile || null;
        bodyPayload.crm = form.crm;
        bodyPayload.crm_uf = form.crm_uf;
        bodyPayload.specialty = form.specialty || null;
      }
      
      // =========================================================
      // CHAMADA ÚNICA À API
      // =========================================================
      
      // Limpar campos indefinidos (opcional, mas boa prática)
      Object.keys(bodyPayload).forEach(key => {
        if (bodyPayload[key] === undefined) delete bodyPayload[key];
      });

      const { data, error } = await supabase.functions.invoke(
        'create-user-with-password', 
        { body: bodyPayload }
      );
      
      // Se a API retornar um erro, lança-o
      if (error) throw error;
      
      // Se a API não retornar dados ou ID, lança um erro
      if (!data?.user?.id) {
        throw new Error("Falha: A API não retornou o usuário criado.");
      }
      
      // =========================================================
      // SUCESSO E FEEDBACK
      // =========================================================
      
      setOk(data.message || "Usuário criado com sucesso!");
      setForm({
        email: "",
        password: "",
        full_name: "",
        phone: "",
        cpf: "",
        phone_mobile: "",
        crm: "",
        crm_uf: "",
        specialty: "",
      });

      setTimeout(() => {
        navigate("/admin/UsersList");
      }, 1000); 

    } catch (e2) { 
      console.error("[CreateUser] erro:", e2);
      // Tenta extrair a mensagem de erro de dentro do objeto de erro da Supabase Function
      const errorMessage = e2.context?.error?.message || e2.message || "Erro ao criar usuário";
      setErr(errorMessage); 
    } finally {
      setLoading(false);
    }
  }


  // =================================================================
  // JSX (Formulário) - (Nenhuma alteração aqui)
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
        {/* --- CAMPOS COMUNS (Email, Nome, Senha) --- */}
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

        {/* CAMPO TELEFONE FIXO (Apenas para Admin e Secretaria) */}
        {(role === 'admin' || role === 'secretaria') && (
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
        )}

        {/* CAMPO CELULAR (Apenas para Paciente e Médico) */}
        {(role === 'paciente' || role === 'medico') && (
            <label style={{ display: "grid", gap: 6 }}>
            <span>Celular / WhatsApp {role === 'paciente' ? '(Obrigatório)' : '(Opcional para Médico)'}</span>
            <input
                name="phone_mobile"
                value={form.phone_mobile}
                onChange={onChange}
                placeholder="(11) 99999-8888"
                required={role === 'paciente'}
                style={inputStyle}
            />
            </label>
        )}

        {/* CAMPO CPF (Apenas para Paciente e Médico) */}
        {(role === 'paciente' || role === 'medico') && (
            <label style={{ display: "grid", gap: 6 }}>
            <span>CPF (Obrigatório, só números)</span>
            <input
                name="cpf"
                value={form.cpf}
                onChange={onChange}
                placeholder="12345678901"
                required={true}
                style={inputStyle}
            />
            </label>
        )}
        
        {/* NOVOS CAMPOS DE MÉDICO (Apenas para Médico) */}
        {role === 'medico' && (
          <>
            <label style={{ display: "grid", gap: 6 }}>
              <span>CRM (Obrigatório)</span>
              <input
                name="crm"
                value={form.crm}
                onChange={onChange}
                placeholder="123456"
                required
                style={inputStyle}
              />
            </label>
            <label style={{ display: "grid", gap: 6 }}>
              <span>UF do CRM (Obrigatório)</span>
              <input
                name="crm_uf"
                value={form.crm_uf}
                onChange={onChange}
                placeholder="SP"
                maxLength={2}
                required
                style={inputStyle}
              />
            </label>
            <label style={{ display: "grid", gap: 6 }}>
              <span>Especialidade (Opcional)</span>
              <input
                name="specialty"
                value={form.specialty}
                onChange={onChange}
                placeholder="Cardiologia"
                style={inputStyle}
              />
            </label>
          </>
        )}

        {/* Feedback de Erro/Sucesso */}
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

        {/* Botões */}
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

// Estilos
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