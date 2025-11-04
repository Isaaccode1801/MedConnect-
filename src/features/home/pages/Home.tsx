// src/features/home/pages/Home.tsx
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./home.css";
import medLogo from "../../../assets/Medconnect.logo.png";
import { FaHeartbeat, FaUserAlt, FaEnvelope, FaUsersCog, FaCoins } from "react-icons/fa";
import { MdPhoneIphone, MdAccessTime, MdOutlineAccessibilityNew } from "react-icons/md";

export default function Home() {
  const nav = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [acessOpen, setAcessOpen] = useState(false);
  const [dark, setDark] = useState(false);

  // Foco em fidlidade visual: fonte base + dark-mode só quando o usuário clicar
  useEffect(() => {
    document.body.classList.toggle("modo-escuro", dark);
  }, [dark]);

  // Ações do menu de acessibilidade
  const incFont = () => {
    const html = document.documentElement;
    const cur = parseFloat(getComputedStyle(html).fontSize);
    html.style.fontSize = Math.min(cur + 1, 22) + "px";
  };
  const decFont = () => {
    const html = document.documentElement;
    const cur = parseFloat(getComputedStyle(html).fontSize);
    html.style.fontSize = Math.max(cur - 1, 12) + "px";
  };
  const toggleContrast = () => document.body.classList.toggle("alto-contraste");
  const resetA11y = () => {
    document.documentElement.style.fontSize = "";
    document.body.classList.remove("alto-contraste");
    setDark(false);
  };

  return (
    <>
      {/* TOPBAR */}
      <div className="topbar">
        <div className="container">
          <div className="topbar-item" style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <MdAccessTime size={18} />
            <span>Segunda – Sábado, 8h às 22h</span>
          </div>
          <div className="topbar-item" style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <MdPhoneIphone size={18} />
            <span>Número da empresa</span>
          </div>
        </div>
      </div>

      {/* HEADER */}
      <header className="header">
        <div className="header-inner">
          <div className="branding">
            <img src={medLogo} alt="Medconnect" className="brand-logo" />
            <div>
              <div className="brand-title">Medconnect</div>
              <div className="brand-sub">Cuidar de você é nossa prioridade</div>
            </div>
          </div>

          <nav className="navmenu">
            <ul>
              {/* Removido: CADASTRA-SE */}
              {/* <li>
                <Link to="/signup" className="btn-outline">Cadastra-se</Link>
              </li> */}
            </ul>
          </nav>
        </div>
      </header>

      {/* SEÇÃO DE BOTÕES GRANDES (Fidelidade 1:1) */}
      <section className="starter-section">
        <div className="role-strip">
          <button className="btn-card btn-med" onClick={() => nav("/login?role=doctor")}>
            <FaHeartbeat size={22} />
            <span>
              Sou<br />Médico
            </span>
          </button>

          <button className="btn-card btn-paciente" onClick={() => nav("/login?role=patient")}>
            <FaUserAlt size={20} />
            <span>
              Sou<br />Paciente
            </span>
          </button>

          <button
            className="btn-card btn-secretaria"
            onClick={() => nav("/login?role=secretary")}
          >
            <FaEnvelope size={20} />
            <span>
              Sou<br />Secretaria
            </span>
          </button>
          <button className="btn-card btn-admin" onClick={() => nav("/login?role=admin")}>
            <FaUsersCog size={22} />
            <span>
              Sou<br />Admin
            </span>
          </button>

          <button className="btn-card btn-finance" onClick={() => nav("/finance")}>
            <FaCoins size={22} />
            <span>Financeiro</span>
          </button>
        </div>

        {/* (opcional) Logo central como no exemplo */}
        <div className="starter-logo-wrap">
          <img src={medLogo} alt="Medconnect" className="starter-logo" />
        </div>
      </section>

      {/* BOTÃO DE ACESSIBILIDADE (canto inferior direito) */}
      <button
        className="acessibilidade-btn"
        onClick={() => setAcessOpen(v => !v)}
        aria-label="Abrir menu de acessibilidade"
      >
        <MdOutlineAccessibilityNew size={28} />
      </button>

      <div className={`menu-acessibilidade ${acessOpen ? "active" : ""}`}>
        <h4>Acessibilidade</h4>
        <button className="menu-item" onClick={incFont}>Aumentar fonte</button>
        <button className="menu-item" onClick={decFont}>Diminuir fonte</button>
        <button className="menu-item" onClick={toggleContrast}>Alto contraste</button>
        <button className="menu-item" onClick={() => setDark(v => !v)}>
          {dark ? "Modo claro" : "Modo escuro"}
        </button>
        <button className="menu-item" onClick={resetA11y}>Reset</button>
      </div>
    </>
  );
}