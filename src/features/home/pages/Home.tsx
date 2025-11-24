// src/features/home/pages/Home.tsx
import { useState, CSSProperties } from "react";
import { Link, useNavigate } from "react-router-dom"; // ✅ "Link" com L maiúsculo
import "./home.css";
import medLogo from "../../../assets/Medconnect.logo.png";
import { FaHeartbeat, FaUserAlt, FaEnvelope, FaUsersCog, FaCoins } from "react-icons/fa"; // ✅ Nomes corretos
import AccessibilityMenu from "../../../components/ui/AccessibilityMenu"; // ✅ Import correto

// ✅ OBJETO DE ESTILOS
const styles: { [key: string]: CSSProperties } = {
  headerInner: {
    width: '100%',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
};

export default function Home() {
  const nav = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      {/* TOPBAR */}
      <div className="topbar">
        <div className="container"></div>
      </div>

      {/* HEADER */}
      <header className="header">
        {/* ✅ APLICA O ESTILO INLINE AQUI */}
        <div className="header-inner" style={styles.headerInner}>
          <div className="branding">
            <img src={medLogo} alt="Medconnect" className="brand-logo" />
            <div>
              <div className="brand-title">Medconnect</div>
              <div className="brand-sub">Cuidar de você é nossa prioridade</div>
            </div>
          </div>

          <nav className="navmenu">
            <ul>
              <li>
                <Link to="/signup" className="btn-outline">Cadastra-se</Link>
              </li>
            </ul>
          </nav>
        </div>
      </header>

      {/* SEÇÃO DE BOTÕES GRANDES */}
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

        </div>

        <div className="starter-logo-wrap">
          <img src={medLogo} alt="Medconnect" className="starter-logo" />
        </div>
      </section>

      {/* ✅ COMPONENTE DE ACESSIBILIDADE SEPARADO */}
      <AccessibilityMenu />
    </>
  );
}