import React, { useEffect } from "react";
import "./agendamento.css";
import "@fortawesome/fontawesome-free/css/all.min.css";

const Agendamento = () => {
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "./agendamento.js"; // script local na mesma pasta
    script.type = "module";
    document.body.appendChild(script);

    return () => {
      if (script && script.parentNode) document.body.removeChild(script);
    };
  }, []);
    return (
    <div>
      <div className="appbar">
        <div className="appbar-inner">
          <div className="brand">
            <a href="../../index.html" className="logo-link">
              <img
                src="../../assets/img/Medconnect.logo.png"
                alt="Logo HealthOne - Página Principal"
                className="logo"
              />
            </a>
          </div>
          <div>
            <h1>Diretório de Médicos</h1>
            <small>Marque sua consulta</small>
          </div>
          <nav className="tabs">
            <a href="dash-pacientes.html">Início</a>
            <a href="agendamento.html" className="ativo">
              Marcar Consulta
            </a>
          </nav>
        </div>
      </div>

      <main className="wrap">
        <div className="toolbar">
          <div
            className="field"
            title="Pesquise por nome, CRM, cidade, especialidade"
          >
            <span role="img" aria-label="pesquisar">
              🔎
            </span>
            <input
              id="searchInput"
              type="search"
              placeholder="Pesquisar (ex.: Neurologista, Dr. Ana...)"
            />
          </div>
          <div className="field">
            <select id="especialidadeFilter">
              <option value="">Todas as especialidades</option>
              <option>Cardiologista</option>
              <option>Clínico Geral</option>
              <option>Dermatologista</option>
              <option>Ginecologista</option>
              <option>Neurologista</option>
              <option>Pediatra</option>
            </select>
          </div>
          <div className="switch">
            <input id="disponiveisToggle" type="checkbox" />
            <label htmlFor="disponiveisToggle">Somente disponíveis</label>
          </div>
          <button id="limparFiltros" className="btn secondary">
            Limpar filtros
          </button>
        </div>

        <section className="card" aria-label="Lista de médicos">
          <div className="card-header">
            <h2>Médicos</h2>
          </div>
          <div className="card-content">
            <table className="table" aria-describedby="Lista de médicos">
              <thead className="thead">
                <tr>
                  <th>Médico</th>
                  <th>Especialidade</th>
                  <th>Cidade</th>
                  <th>Contato</th>
                  <th>Atende por</th>
                  <th>Consulta</th>
                  <th>Próxima janela</th>
                  <th>Status</th>
                  <th style={{ textAlign: "right" }}>Ações</th>
                </tr>
              </thead>
              <tbody id="tbody"></tbody>
            </table>
          </div>
        </section>
      </main>

      <div
        id="modal-agendamento"
        className="modal-backdrop"
        style={{ display: "none" }}
      >
        <div className="modal-content card">
          <div className="modal-header card-header">
            <h3 id="modal-medico-nome">Agendar com [Nome do Médico]</h3>
            <button id="modal-fechar" className="close-btn">
              &times;
            </button>
          </div>
          <div className="modal-body card-content">
            <p>Selecione uma data e um horário para a sua consulta.</p>
            <div className="agendamento-container">
              <div className="calendario">
                <div className="calendario-header">
                  <button id="mes-anterior">◀</button>
                  <h4 id="mes-ano">Outubro 2025</h4>
                  <button id="mes-seguinte">▶</button>
                </div>
                <div className="calendario-dias-semana">
                  <div>Dom</div>
                  <div>Seg</div>
                  <div>Ter</div>
                  <div>Qua</div>
                  <div>Qui</div>
                  <div>Sex</div>
                  <div>Sáb</div>
                </div>
                <div id="calendario-grid" className="calendario-grid"></div>
              </div>
              <div className="horarios-container">
                <h4>
                  Horários para{" "}
                  <span id="data-selecionada-titulo">--/--/----</span>
                </h4>
                <div id="horarios-grid" className="horarios-grid">
                  <p>Selecione um dia no calendário.</p>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button id="btn-cancelar-modal" className="btn secondary">
              Cancelar
            </button>
            <button id="btn-confirmar-agendamento" className="btn primary">
              Confirmar Agendamento
            </button>
          </div>
        </div>
      </div>

      <button
        id="btnAcessibilidade"
        className="acessibilidade-btn"
        aria-label="Menu de acessibilidade"
      >
        <i className="fa-solid fa-wheelchair"></i>
      </button>

      <div id="menuAcessibilidade" className="menu-acessibilidade">
        <h4>Opções de Acessibilidade</h4>
        <button className="menu-item" id="modoEscuro">
          🌓 Fundo Preto
        </button>
        <div className="menu-item" id="aumentarFonteContainer">
          🔠 Aumentar Fonte
          <div id="controlesFonte" className="controles-fonte">
            <button id="diminuirFonte" className="controle-fonte">
              ➖
            </button>
            <span id="tamanhoFonteValor">100%</span>
            <button id="aumentarFonte" className="controle-fonte">
              ➕
            </button>
          </div>
        </div>
        <button className="menu-item" id="leitorTexto">
          🔊 Leitor de Texto
        </button>
        <button className="menu-item" id="modoDaltonico">
          🎨 Modo Daltônico
        </button>
      </div>
    </div>
  );
};

export default Agendamento;