// =========================================================================
//         ARQUIVO: agendamento.js (VERSÃO COMPLETA E CORRIGIDA)
// =========================================================================

// Importa a função do service para buscar a lista de médicos
import { listarMedicos } from './pacientesService.js'; // ❗️ Verifique se o caminho do service está correto

// Envolve todo o código no DOMContentLoaded para garantir que o HTML seja carregado primeiro
document.addEventListener('DOMContentLoaded', () => {

  // --- Seletores e Estado ---
  const tbody = document.getElementById('tbody');
  const modal = document.getElementById('modal-agendamento');
  let medicos = [];
  let medicoSelecionado = null;
  let dataSelecionada = null;
  let horarioSelecionado = null;
  let dataAtual = new Date();

  // --- Funções Auxiliares de formatação (se necessário) ---
  // Exemplo: const formatarDinheiro = (valor) => { ... };

  // --- Lógica da Página Principal (Tabela de Médicos) ---

  async function carregarMedicos() {
    tbody.innerHTML = `<tr><td colspan="9">Carregando médicos...</td></tr>`;
    try {
      const dados = await listarMedicos(); 
      medicos = dados;
      render();
    } catch (error) {
      console.error("Erro ao carregar lista de médicos:", error);
      tbody.innerHTML = `<tr><td colspan="9" style="color:red;">Falha ao carregar médicos.</td></tr>`;
    }
  }
  
  function render() {
     if (!medicos || medicos.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9">Nenhum médico encontrado.</td></tr>`;
        return;
     }
     
     tbody.innerHTML = medicos.map(m => {
        const statusClass = m.active ? 'ok' : 'warn';
        const statusText = m.active ? 'Disponível' : 'Indisponível';

        return `
          <tr class="row">
            <td>
                <div style="font-weight:600">${m.full_name || '-'}</div>
                <div style="color:var(--muted); font-size:12px">${m.crm || '-'}</div>
            </td>
            <td><span class="badge">${m.specialty || 'Não informado'}</span></td>
            <td>${m.city || '-'}</td>
            <td>${m.phone_mobile || '-'}</td>
            <td>${m.insurance_plans || 'Particular'}</td>
            <td>R$ ${m.price ? m.price.toFixed(2).replace('.', ',') : '0,00'}</td>
            <td>-</td>
            <td><span class="badge ${statusClass}">${statusText}</span></td>
            <td style="text-align:right">
              <div class="actions">
                <button class="btn icon outline" title="Marcar Consulta" data-act="marcar" data-id="${m.id}">Marcar</button>
              </div>
            </td>
          </tr>
        `;
     }).join('');
    
    document.querySelectorAll('#tbody [data-act]').forEach(btn => {
      btn.onclick = () => onAction(btn.dataset.act, btn.dataset.id);
    });
  }

  function onAction(act, medicoId) {
    if (act !== 'marcar') return;
    medicoSelecionado = medicos.find(m => m.id === medicoId);
    if (medicoSelecionado) {
      abrirModalAgendamento();
    }
  }

  // --- Lógica do Modal e Calendário ---

  function abrirModalAgendamento() {
    document.getElementById('modal-medico-nome').textContent = `Agendar com ${medicoSelecionado.full_name}`;
    renderizarCalendario(dataAtual.getFullYear(), dataAtual.getMonth());
    modal.style.display = 'flex';
  }

  function fecharModalAgendamento() {
    modal.style.display = 'none';
    medicoSelecionado = null;
    dataSelecionada = null;
    horarioSelecionado = null;
    document.getElementById('horarios-grid').innerHTML = '<p>Selecione um dia no calendário.</p>';
    document.getElementById('data-selecionada-titulo').textContent = '--/--/----';
  }

  function renderizarCalendario(ano, mes) {
    const grid = document.getElementById('calendario-grid');
    grid.innerHTML = '';
    document.getElementById('mes-ano').textContent = new Date(ano, mes).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    const primeiroDia = new Date(ano, mes, 1).getDay();
    const diasNoMes = new Date(ano, mes + 1, 0).getDate();
    for (let i = 0; i < primeiroDia; i++) { grid.innerHTML += `<div class="dia outro-mes"></div>`; }
    for (let i = 1; i <= diasNoMes; i++) {
      const diaEl = document.createElement('div');
      diaEl.className = 'dia';
      diaEl.textContent = i;
      grid.appendChild(diaEl);
      diaEl.addEventListener('click', () => {
        grid.querySelector('.selecionado')?.classList.remove('selecionado');
        diaEl.classList.add('selecionado');
        dataSelecionada = new Date(ano, mes, i);
        renderizarHorarios(dataSelecionada);
      });
    }
  }

  function renderizarHorarios(data) {
    document.getElementById('data-selecionada-titulo').textContent = data.toLocaleDateString('pt-BR');
    const grid = document.getElementById('horarios-grid');
    grid.innerHTML = '';
    for (let h = 8; h < 18; h++) {
      for (let m of ['00', '30']) {
        const horario = `${String(h).padStart(2, '0')}:${m}`;
        const horarioEl = document.createElement('div');
        horarioEl.className = 'horario';
        horarioEl.textContent = horario;
        grid.appendChild(horarioEl);
        horarioEl.addEventListener('click', () => {
          grid.querySelector('.selecionado')?.classList.remove('selecionado');
          horarioEl.classList.add('selecionado');
          horarioSelecionado = horario;
        });
      }
    }
  }
  
  function confirmarAgendamento() {
    if (!dataSelecionada || !horarioSelecionado) {
      alert('Por favor, selecione uma data e um horário.');
      return;
    }
    const dataHoraFinal = `${dataSelecionada.toLocaleDateString('pt-BR')} às ${horarioSelecionado}`;
    const consultas = JSON.parse(localStorage.getItem('healthone_consultas') || '[]');
    const novaConsulta = {
      id: crypto.randomUUID(),
      medicoNome: medicoSelecionado.full_name,
      medicoId: medicoSelecionado.id,
      dataHora: dataHoraFinal,
    };
    consultas.push(novaConsulta);
    localStorage.setItem('healthone_consultas', JSON.stringify(consultas));
    alert('Consulta marcada com sucesso!');
    fecharModalAgendamento();
  }

  // --- Event Listeners ---
  // Garante que os botões do modal e do calendário sejam "ligados"
  document.getElementById('mes-anterior').addEventListener('click', () => { dataAtual.setMonth(dataAtual.getMonth() - 1); renderizarCalendario(dataAtual.getFullYear(), dataAtual.getMonth()); });
  document.getElementById('mes-seguinte').addEventListener('click', () => { dataAtual.setMonth(dataAtual.getMonth() + 1); renderizarCalendario(dataAtual.getFullYear(), dataAtual.getMonth()); });
  document.getElementById('modal-fechar').addEventListener('click', fecharModalAgendamento);
  document.getElementById('btn-cancelar-modal').addEventListener('click', fecharModalAgendamento);
  document.getElementById('btn-confirmar-agendamento').addEventListener('click', confirmarAgendamento);
  
const btn = document.getElementById("btnAcessibilidade");
  const menu = document.getElementById("menuAcessibilidade");

  // Alternar visibilidade do menu
  btn.addEventListener("click", () => {
    menu.style.display = menu.style.display === "flex" ? "none" : "flex";
  });

  // Fechar se clicar fora
  document.addEventListener("click", (e) => {
    if (!menu.contains(e.target) && !btn.contains(e.target)) {
      menu.style.display = "none";
    }
  });

  // Funções de acessibilidade
  const corpo = document.body;

// Função para salvar estado no localStorage
function salvarPreferencia(chave, valor) {
  localStorage.setItem(chave, JSON.stringify(valor));
}

// Função para carregar estado salvo
function carregarPreferencia(chave) {
  const valor = localStorage.getItem(chave);
  return valor ? JSON.parse(valor) : false;
}

// ======== MODO ESCURO ========
const modoEscuroBtn = document.getElementById("modoEscuro");
let modoEscuroAtivo = carregarPreferencia("modoEscuro");

if (modoEscuroAtivo) document.body.classList.add("modo-escuro");

modoEscuroBtn.addEventListener("click", () => {
  modoEscuroAtivo = !modoEscuroAtivo;
  document.body.classList.toggle("modo-escuro", modoEscuroAtivo);
  salvarPreferencia("modoEscuro", modoEscuroAtivo);
});

// ======== MODO DALTÔNICO ========
const modoDaltonicoBtn = document.getElementById("modoDaltonico");
let modoDaltonicoAtivo = carregarPreferencia("modoDaltonico");

if (modoDaltonicoAtivo) document.body.classList.add("modo-daltonico");

modoDaltonicoBtn.addEventListener("click", () => {
  modoDaltonicoAtivo = !modoDaltonicoAtivo;
  document.body.classList.toggle("modo-daltonico", modoDaltonicoAtivo);
  salvarPreferencia("modoDaltonico", modoDaltonicoAtivo);
});

// ======== CONTROLE DE FONTE (ZOOM) ========

// Elementos
const aumentarFonteContainer = document.getElementById("aumentarFonteContainer");
const controlesFonte = document.getElementById("controlesFonte");
const btnMais = document.getElementById("aumentarFonte");
const btnMenos = document.getElementById("diminuirFonte");
const valorFonte = document.getElementById("tamanhoFonteValor");

// Estado inicial (carrega o último valor salvo)
let zoomPagina = carregarPreferencia("zoomPagina") || 100;

// Aplica o zoom salvo ao carregar
document.body.style.zoom = zoomPagina + "%";
if (valorFonte) valorFonte.textContent = `${zoomPagina}%`;

// Mostra/oculta os controles ao clicar no container
if (aumentarFonteContainer && controlesFonte) {
  aumentarFonteContainer.addEventListener("click", (e) => {
    e.stopPropagation();
    controlesFonte.classList.toggle("visivel");
  });
}

// Função para aplicar o zoom e salvar
function aplicarZoom() {
  document.body.style.zoom = zoomPagina + "%";
  if (valorFonte) valorFonte.textContent = `${zoomPagina}%`;
  salvarPreferencia("zoomPagina", zoomPagina);
}

// Botão ➕
if (btnMais) {
  btnMais.addEventListener("click", (e) => {
    e.stopPropagation();
    if (zoomPagina < 180) {
      zoomPagina += 10;
      aplicarZoom();
    }
  });
}

// Botão ➖
if (btnMenos) {
  btnMenos.addEventListener("click", (e) => {
    e.stopPropagation();
    if (zoomPagina > 80) {
      zoomPagina -= 10;
      aplicarZoom();
    }
  });
}

// ======== LEITOR DE TEXTO ========
let leitorAtivo = carregarPreferencia("leitorTexto");

document.getElementById("leitorTexto").addEventListener("click", () => {
  leitorAtivo = !leitorAtivo;
  salvarPreferencia("leitorTexto", leitorAtivo);
  alert(leitorAtivo ? "Leitor de texto ativado." : "Leitor de texto desativado.");
});

document.addEventListener("mouseover", (e) => {
  if (leitorAtivo && e.target.textContent.trim().length > 0) {
    const texto = e.target.textContent.trim();
    const fala = new SpeechSynthesisUtterance(texto);
    fala.lang = "pt-BR";
    speechSynthesis.cancel();
    speechSynthesis.speak(fala);
  }
});


  // --- Inicialização ---
  // Inicia o processo de carregar os médicos da API
  carregarMedicos();

}); // Fim do DOMContentLoaded