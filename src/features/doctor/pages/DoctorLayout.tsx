// src/features/doctor/pages/DoctorLayout.tsx
import React, { useState } from "react";
import { useNavigate, useLocation, Outlet } from "react-router-dom";
import { supabase } from "@/lib/supabase"; // Verifique se este caminho está correto
import {
  Search,
  Stethoscope,
  User,
  Menu,
  X,
} from "lucide-react";
import "./Dashboard.css"; // Vamos reutilizar o mesmo CSS!

export default function DoctorLayout() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  // Estado para controlar a sidebar móvel
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  // Estado para a busca (se quiser que funcione globalmente)
  const [searchTerm, setSearchTerm] = useState("");
  
  // Estilos da bola de perfil
  const profileButtonStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "40px",
    height: "40px",
    borderRadius: "50%",
    backgroundColor: "#e2e8f0",
    color: "#1e293b",
    border: "none",
    cursor: "pointer",
    marginLeft: "16px",
  };

  const profileIconStyle: React.CSSProperties = {
    width: "20px",
    height: "20px",
  };

  // Links de Navegação
  const navLinks = [
    { label: "Início", path: "/doctor/dashboard", key: "/doctor/dashboard" },
    { label: "Laudos", path: "/doctor/laudos", key: "/doctor/laudos" },
    { label: "Pacientes", path: "/doctor/pacientes", key: "/doctor/pacientes" },
    { label: "Consultas", path: "/doctor/consultas", key: "/doctor/consultas" },
    { 
      label: "Voltar para a tela inicial", 
      path: "/", 
      key: "voltar", 
      title: "Voltar para a tela inicial" 
    }
  ];

  // Função para definir a classe correta do link (ativo/inativo)
  const getLinkClass = (link: { path: string; key: string; }) => {
    if (link.key === "/doctor/dashboard") {
      return pathname === link.path ? "nav-link active" : "nav-link";
    }
    if (link.key === "voltar") {
      return "nav-link";
    }
    return pathname.startsWith(link.key) ? "nav-link active" : "nav-link";
  };

  // Componente interno para renderizar a navegação
  const renderNavContent = () => (
    <>
      <nav className="doctor-header__nav">
        {navLinks.map((link) => (
          <button
            key={link.key}
            onClick={() => {
              navigate(link.path);
              setIsMobileMenuOpen(false); // Fecha o menu ao navegar
            }}
            className={getLinkClass(link)}
            title={link.title || link.label}
          >
            {link.label}
          </button>
        ))}
      </nav>

      {/* Perfil */}
      <div className="doctor-header__profile">
        <button
          onClick={() => {
            navigate("/doctor/perfil");
            setIsMobileMenuOpen(false); // Fecha o menu ao navegar
          }}
          style={profileButtonStyle}
          title="Ver o meu perfil"
          className="profile-button-wrapper"
        >
          <User style={profileIconStyle} />
        </button>
      </div>
    </>
  );

  return (
    <div
      className={`doctor-dashboard ${
        isMobileMenuOpen ? "mobile-menu-is-open" : ""
      }`}
    >
      {/* O HEADER AGORA VIVE AQUI */}
      <header className="doctor-header">
        <div className="doctor-header__inner">
          {/* --- Marca/Logo (sempre visível) --- */}
          <div className="doctor-header__brand">
            <div className="brand-icon">
              <div className="brand-icon__inner">
                <Stethoscope className="brand-icon__svg" />
              </div>
            </div>
            <span className="brand-name">Medconnect</span>
          </div>

          {/* --- Barra de Busca (visível apenas no PC) --- */}
          <div className="doctor-header__search">
            <div className="search-wrapper">
              <Search className="search-icon" />
              <input
                name="q"
                autoComplete="off"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar paciente, exame, laudo…"
                className="search-input"
              />
            </div>
          </div>

          {/* --- Navegação do Desktop (visível apenas no PC) --- */}
          <div className="doctor-header__nav-container-desktop">
            {renderNavContent()}
          </div>

          {/* --- Botão Hamburger (visível apenas no mobile) --- */}
          <button
            className="mobile-menu-toggle"
            onClick={() => setIsMobileMenuOpen(true)}
            title="Abrir menu"
          >
            <Menu className="h-6 w-6" />
          </button>
        </div>
      </header>

      {/* --- Overlay (fundo escuro) da Sidebar Móvel --- */}
      {isMobileMenuOpen && (
        <div
          className="mobile-sidebar-overlay"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* --- A Sidebar Móvel --- */}
      <aside
        className={`mobile-sidebar ${isMobileMenuOpen ? "is-open" : ""}`}
      >
        <div className="mobile-sidebar__header">
          <span className="brand-name">Medconnect</span>
          <button
            className="mobile-sidebar__close"
            onClick={() => setIsMobileMenuOpen(false)}
            title="Fechar menu"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
        <div className="mobile-sidebar__content">{renderNavContent()}</div>
      </aside>

      {/* O <Outlet /> é o espaço onde o React Router
        vai renderizar a página filha (Dashboard, Laudos, etc.)
      */}
      <Outlet />
      
    </div>
  );
}