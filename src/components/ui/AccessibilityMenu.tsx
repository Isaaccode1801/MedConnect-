// src/components/AccessibilityMenu.tsx
import { useState, useEffect } from "react";
import { MdOutlineAccessibilityNew } from "react-icons/md";
import "./AccessibilityMenu.css";

export default function AccessibilityMenu() {
  const [acessOpen, setAcessOpen] = useState(false);
  const [dark, setDark] = useState(() => 
    JSON.parse(localStorage.getItem("modoEscuro") || "false")
  );
  const [daltonico, setDaltonico] = useState(() => 
    JSON.parse(localStorage.getItem("modoDaltonico") || "false")
  );

  // Efeito para modo escuro
  useEffect(() => {
    document.body.classList.toggle("modo-escuro", dark);
    localStorage.setItem("modoEscuro", JSON.stringify(dark));
  }, [dark]);

  // Efeito para modo daltônico
  useEffect(() => {
    document.body.classList.toggle("modo-daltonico", daltonico);
    localStorage.setItem("modoDaltonico", JSON.stringify(daltonico));
  }, [daltonico]);

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
    setDaltonico(v => !v);
  };

  const resetA11y = () => {
    document.documentElement.style.fontSize = "";
    setDaltonico(false);
    setDark(false);
  };

  

  return (
    <>
      {/* BOTÃO DE ACESSIBILIDADE */}
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