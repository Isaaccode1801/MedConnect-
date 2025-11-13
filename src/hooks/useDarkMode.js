import { useState, useEffect } from 'react';

export function useDarkMode() {
  const [isDark, setIsDark] = useState(() => {
    // Verifica localStorage primeiro
    const saved = localStorage.getItem('modoEscuro');
    if (saved !== null) return JSON.parse(saved);
    
    // Depois verifica preferência do sistema
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    const body = document.body;
    
    if (isDark) {
      body.classList.add('modo-escuro');
    } else {
      body.classList.remove('modo-escuro');
    }
    
    // Salva no localStorage
    localStorage.setItem('modoEscuro', JSON.stringify(isDark));
  }, [isDark]);

  const toggle = () => setIsDark(prev => !prev);
  const enable = () => setIsDark(true);
  const disable = () => setIsDark(false);

  return { isDark, toggle, enable, disable };
}