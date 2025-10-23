// src/features/home/pages/Home.tsx
import './home.css'
import { SplashCursor } from '../../../components/ui/splash-cursor'
import medLogo from '../../../assets/Medconnect.logo.png';
import heartPng from '../../../assets/heart.png';
import { Link } from "react-router-dom";


export default function Home() {
  return (
    <div className="hero">
        <SplashCursor />
      <nav className="nav">
        <div className="brand"><img src={medLogo} alt="MedConnect logo" className="logo" /></div>

        <ul className="menu">
          <li><a href="#">Services</a></li>
          <li><a href="#">About us</a></li>
          <li><a href="#">Doctors</a></li>
          <li><a href="#">How it works</a></li>
          <li><a href="#">Download App</a></li>
        </ul>

        <div className="actions">
          <button className="icon-btn" aria-label="Profile">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M4 20c1.8-3.5 5-5.5 8-5.5s6.2 2 8 5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
          <button className="icon-btn" aria-label="Menu">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M4 7h16M4 12h16M4 17h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
      </nav>
      
      <div className="hero-content">
        <h1 className="title">
          Seu coração esta em <br/>boas <img
    src={heartPng}
    alt="MedConnect Heart"
    className="heart-img pulse"
  />
mãos
        </h1>

        <p className="subtitle">
          A MedConnect é uma plataforma inovadora que conecta pacientes a médicos de forma rápida e eficiente. Nossa missão é facilitar o acesso a cuidados de saúde de qualidade, proporcionando uma experiência simples e confiável para todos os usuários.
        </p>

        <div className="cta-row" style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'center', marginTop: '2rem' }}>
  <Link
    to="/login?role=doctor"
    className="cta transition-transform transform hover:scale-105"
    style={{
      background: 'linear-gradient(135deg, #16a34a, #22c55e)',
      color: '#fff',
      padding: '0.8rem 1.8rem',
      borderRadius: '10px',
      border: 'none',
      fontSize: '1rem',
      fontWeight: 600,
      boxShadow: '0 4px 15px rgba(34,197,94,0.4)',
      cursor: 'pointer',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
      textDecoration: 'none'
    }}
  >
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 24 24">
      <path d="M19 3h-2v6a5 5 0 01-10 0V3H5v6a7 7 0 0014 0V3zm-7 13a3 3 0 00-3 3v2h2v-2a1 1 0 012 0v2h2v-2a3 3 0 00-3-3z"/>
    </svg>
    Sou Médico
  </Link>

          <button
            onClick={() => window.location.href = '/patient'}
            className="cta transition-transform transform hover:scale-105"
            style={{
              background: 'linear-gradient(135deg, #2563eb, #3b82f6)',
              color: '#fff',
              padding: '0.8rem 1.8rem',
              borderRadius: '10px',
              border: 'none',
              fontSize: '1rem',
              fontWeight: 600,
              boxShadow: '0 4px 15px rgba(37,99,235,0.4)',
              cursor: 'pointer'
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 24 24" style={{ marginRight: '8px' }}>
              <path d="M12 12c2.7 0 5-2.3 5-5s-2.3-5-5-5-5 2.3-5 5 2.3 5 5 5zM4 21v-1c0-2.8 3.6-5 8-5s8 2.2 8 5v1H4z"/>
            </svg>
            Sou Paciente
          </button>

          <button
            onClick={() => window.location.href = '/secretary'}
            className="cta transition-transform transform hover:scale-105"
            style={{
              background: 'linear-gradient(135deg, #8b5cf6, #a855f7)',
              color: '#fff',
              padding: '0.8rem 1.8rem',
              borderRadius: '10px',
              border: 'none',
              fontSize: '1rem',
              fontWeight: 600,
              boxShadow: '0 4px 15px rgba(139,92,246,0.4)',
              cursor: 'pointer'
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 24 24" style={{ marginRight: '8px' }}>
              <path d="M6 2a2 2 0 00-2 2v16a2 2 0 002 2h9a2 2 0 002-2v-4h3V6l-5-4H6zm0 2h8v4h4v10h-2v-5H6V4zm0 7h7v2H6v-2z"/>
            </svg>
            Sou Secretaria
          </button>

          <button
            onClick={() => window.location.href = '/login?role=admin'}
            className="cta transition-transform transform hover:scale-105"
            style={{
              background: 'linear-gradient(135deg, #6b7280, #9ca3af)',
              color: '#fff',
              padding: '0.8rem 1.8rem',
              borderRadius: '10px',
              border: 'none',
              fontSize: '1rem',
              fontWeight: 600,
              boxShadow: '0 4px 15px rgba(107,114,128,0.4)',
              cursor: 'pointer'
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 24 24" style={{ marginRight: '8px' }}>
              <path d="M19.14 12.94a7.952 7.952 0 000-1.88l2.03-1.58a.5.5 0 00.12-.64l-1.92-3.32a.5.5 0 00-.61-.22l-2.39.96a8.12 8.12 0 00-1.62-.94l-.36-2.54A.5.5 0 0014 2h-4a.5.5 0 00-.5.42l-.36 2.54c-.58.24-1.12.55-1.62.94l-2.39-.96a.5.5 0 00-.61.22L2.6 8.84a.5.5 0 00.12.64l2.03 1.58c-.06.31-.1.63-.1.94s.04.63.1.94l-2.03 1.58a.5.5 0 00-.12.64l1.92 3.32a.5.5 0 00.61.22l2.39-.96c.5.39 1.04.7 1.62.94l.36 2.54A.5.5 0 0010 22h4a.5.5 0 00.5-.42l.36-2.54c.58-.24 1.12-.55 1.62-.94l2.39.96a.5.5 0 00.61-.22l1.92-3.32a.5.5 0 00-.12-.64l-2.03-1.58zM12 15.5a3.5 3.5 0 110-7 3.5 3.5 0 010 7z"/>
            </svg>
            Sou Admin
          </button>

          <button
            onClick={() => window.location.href = '/finance'}
            className="cta transition-transform transform hover:scale-105"
            style={{
              background: 'linear-gradient(135deg, #f59e0b, #fbbf24)',
              color: '#fff',
              padding: '0.8rem 1.8rem',
              borderRadius: '10px',
              border: 'none',
              fontSize: '1rem',
              fontWeight: 600,
              boxShadow: '0 4px 15px rgba(245,158,11,0.4)',
              cursor: 'pointer'
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 24 24" style={{ marginRight: '8px' }}>
              <path d="M12 2a10 10 0 1010 10A10.011 10.011 0 0012 2zm.5 15.93V18a1 1 0 01-2 0v-.07a4.002 4.002 0 01-3.5-3.93 1 1 0 012 0 2 2 0 002 2h1a2 2 0 000-4h-1a4 4 0 110-8 4.002 4.002 0 013.5 3.93 1 1 0 01-2 0A2 2 0 0012 6h-1a2 2 0 000 4h1a4 4 0 010 8z"/>
            </svg>
            Financeiro
          </button>
        </div>


      </div>

      <div className="vignette" />
    </div>
  )
}