// src/features/auth/pages/SignUp.jsx (Atualizado com Logo)
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import "./SignUp.css";
import { AnimatedText } from "@/components/ui/AnimatedText";
import medLogo from "../../../assets/Medconnect.logo.png"; // ✅ 1. IMPORTAR A LOGO

export default function SignUp() {
  const navigate = useNavigate();
  
  // (Estados... sem mudanças)
  const [form, setForm] = useState({
    email: "",
    full_name: "",
    phone_mobile: "",
    cpf: "",
    birth_date: "",
  });
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // (onChange... sem mudanças)
  function onChange(e) {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  }

  // (handleSubmit... sem mudanças)
  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    if (!termsAccepted) {
      setError("Você precisa aceitar os termos de uso.");
      setLoading(false);
      return;
    }
    const cpfLimpo = form.cpf.replace(/[^\d]/g, '');
    const phoneLimpo = form.phone_mobile.replace(/[^\d]/g, '');
    if (cpfLimpo.length !== 11) {
      setError("O CPF deve conter exatamente 11 dígitos.");
      setLoading(false);
      return;
    }
    if (phoneLimpo.length < 10 || phoneLimpo.length > 11) {
      setError("O Celular deve conter 10 ou 11 dígitos (com DDD).");
      setLoading(false);
      return;
    }
    const payload = {
      email: form.email,
      full_name: form.full_name,
      phone_mobile: phoneLimpo,
      cpf: cpfLimpo,
      birth_date: form.birth_date || undefined,
    };
    try {
      const { data, error: invokeError } = await supabase.functions.invoke(
        'register-patient', 
        { body: payload }
      );
      if (invokeError) {
        const apiErrorMsg = invokeError.context?.error?.message || invokeError.message;
        throw new Error(apiErrorMsg);
      }
      setSuccess(data.message || "Cadastro realizado! Verifique seu email.");
      setForm({ email: "", full_name: "", phone_mobile: "", cpf: "", birth_date: "" });
      setTermsAccepted(false);
    } catch (err) {
      console.error("[SignUp Error]", err);
      setError(err.message || "Ocorreu um erro. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  // (Tela de Sucesso... sem mudanças)
  if (success) {
    return (
      <div className="signup-container">
        <div className="signup-panel-left">
          <Link to="/" className="back-link">← Voltar</Link>
          <AnimatedText
            text="Sucesso!"
            className="!items-start"
            textClassName="!text-left !text-5xl !mt-6"
          />
          
          {/* ✅ 2. LOGO ADICIONADA TAMBÉM NA TELA DE SUCESSO */}
          <div style={{
            flex: 1, 
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            
          }}>
            <img 
              src={medLogo} 
              alt="Medconnect Logo" 
              style={{ width: 'auto', height: '550px' }}
            />
          </div>

        </div>
        <div className="signup-panel-right">
          <div className="signup-form-container">
            <div className="success-message">{success}</div>
            <Link to="/login" className="back-to-login-link">
              Ir para o Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Formulário principal
  return (
    <div className="signup-container">
      {/* PAINEL ESQUERDO (Branding) */}
      <div className="signup-panel-left">
        <Link to="/" className="back-link">← Voltar</Link>
        
        <AnimatedText
          text="Comece Agora"
          className="!items-start"
          textClassName="!text-left !text-5xl !mt-6"
        />

        <p className="m-4">Junte-se à Medconnect e facilite sua jornada de saúde.</p>

        {/* ================================================================ */}
        {/* ✅ 3. LOGO ADICIONADA AQUI */}
        {/* ================================================================ */}
        <div style={{
          flex: 1, // Faz este container ocupar o espaço "do meio"
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '20px 0', // Um respiro vertical
        }}>
          <img 
            src={medLogo} 
            alt="Medconnect Logo" 
            style={{ 
              width: '550px', // Define o tamanho da logo
              height: 'auto', 
              opacity: 0.9 
            }}
          />
        </div>
        {/* ================================================================ */}

        <div className="login-prompt">
          <p>Já tem uma conta?</p>
          <Link to="/login" className="login-link-button">
            Fazer Login
          </Link>
        </div>
      </div>

      {/* PAINEL DIREITO (Formulário) */}
      <div className="signup-panel-right">
        {/* (Formulário... sem mudanças) */}
        <div className="signup-form-container">
          <form onSubmit={handleSubmit}>
            <h2>Crie sua conta de Paciente</h2>
            <p className="subtitle">
              Após o cadastro, um link de acesso será enviado para seu email.
            </p>
            <div className="input-group">
              <label htmlFor="email">Email *</label>
              <input
                id="email"
                name="email"
                type="email"
                value={form.email}
                onChange={onChange}
                required
              />
            </div>
            <div className="input-group">
              <label htmlFor="full_name">Nome Completo *</label>
              <input
                id="full_name"
                name="full_name"
                type="text"
                value={form.full_name}
                onChange={onChange}
                required
              />
            </div>
            <div className="input-group">
              <label htmlFor="phone_mobile">Celular (com DDD) *</label>
              <input
                id="phone_mobile"
                name="phone_mobile"
                type="text"
                placeholder="Apenas números (ex: 11987654321)"
                value={form.phone_mobile}
                onChange={onChange}
                maxLength={11}
                required
              />
            </div>
            <div className="input-group">
              <label htmlFor="cpf">CPF *</label>
              <input
                id="cpf"
                name="cpf"
                type="text"
                placeholder="Apenas números (11 dígitos)"
                value={form.cpf}
                onChange={onChange}
                maxLength={11}
                required
              />
            </div>
            <div className="input-group">
              <label htmlFor="birth_date">Data de Nascimento (Opcional)</label>
              <input
                id="birth_date"
                name="birth_date"
                type="date"
                value={form.birth_date}
                onChange={onChange}
              />
            </div>
            <div className="checkbox-group">
              <input
                id="terms"
                type="checkbox"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
              />
              <label htmlFor="terms">Eu li e aceito os termos de uso.</label>
            </div>
            {error && (
              <div className="error-message">
                {error}
              </div>
            )}
            <button type="submit" className="submit-button" disabled={loading}>
              {loading ? "Aguarde..." : "Cadastrar"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}