// src/features/home/pages/Home.tsx
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./home.css";
import medLogo from "../../../assets/Medconnect.logo.png";
import { FaHeartbeat, FaUserAlt, FaEnvelope, FaUsersCog, FaCoins } from "react-icons/fa";
import { MdOutlineAccessibilityNew } from "react-icons/md";

export default function Home() {
  const nav = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [acessOpen, setAcessOpen] = useState(false);
  const [dark, setDark] = useState(() => JSON.parse(localStorage.getItem("modoEscuro") || "false"));
  const [daltonico, setDaltonico] = useState(() => JSON.parse(localStorage.getItem("modoDaltonico") || "false"));


  // Foco em fidlidade visual: fonte base + dark-mode só quando o usuário clicar
  useEffect(() => {
    document.body.classList.toggle("modo-escuro", dark);
    localStorage.setItem("modoEscuro", JSON.stringify(dark));
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
  const toggleDaltonico = () => {
  document.body.classList.toggle("modo-daltonico");
  };
  const resetA11y = () => {
    document.documentElement.style.fontSize = "";
    document.body.classList.remove("modo-daltonico");
    setDark(false);
  };

  return (
    <>
      {/* TOPBAR - apenas cor de fundo, sem texto */}
      <div className="topbar">
        <div className="container"></div>
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
        <button className="menu-item" onClick={toggleDaltonico}>
          Modo daltônico
        </button>
        <button className="menu-item" onClick={() => setDark(v => !v)}>
          {dark ? "Modo claro" : "Modo escuro"}
        </button>
        <button className="menu-item" onClick={resetA11y}>Reset</button>
      </div>
    </>
  );
}