const NOMES = {
  CONCENTRADO_HEMACIAS: 'Concentrado de Hemácias (CH)',
  CONCENTRADO_PLAQUETAS: 'Concentrado de Plaquetas (CP)',
  PLASMA_FRESCO_CONGELADO: 'Plasma Fresco Congelado (PFC)'
};

const fmt = (n, d = 1) => Number(n).toLocaleString('pt-BR', {
  minimumFractionDigits: d,
  maximumFractionDigits: d
});

// NAVEGAÇÃO POR ABAS (EXIBE SOMENTE A SEÇÃO SELECIONADA)
function abrirAba(tabId) {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    const ativo = btn.dataset.tab === tabId;
    btn.classList.toggle('active', ativo);
    btn.setAttribute('aria-selected', ativo ? 'true' : 'false');
  });

  document.querySelectorAll('.tab-panel').forEach(panel => {
    panel.classList.toggle('active', panel.id === `panel-${tabId}`);
  });

  if (history.replaceState) {
    history.replaceState(null, '', `#${tabId}`);
  }
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function imprimirRelatorio() {
  window.print();
}

const BASE_U2_REPO = [
  { tipo: 'CONCENTRADO_HEMACIAS', estoqueValido: 0, demandaDiaria: 0.0, lambdaHorizonte: 0.0, probDesabastecimentoPct: 0.0, nivelRisco: 'BAIXO', totalBolsas: 0, bolsasVencidas: 0, taxaDescartePct: 0.0 },
  { tipo: 'CONCENTRADO_PLAQUETAS', estoqueValido: 0, demandaDiaria: 0.0, lambdaHorizonte: 0.0, probDesabastecimentoPct: 0.0, nivelRisco: 'BAIXO', totalBolsas: 0, bolsasVencidas: 0, taxaDescartePct: 0.0 },
  { tipo: 'PLASMA_FRESCO_CONGELADO', estoqueValido: 0, demandaDiaria: 0.0, lambdaHorizonte: 0.0, probDesabastecimentoPct: 0.0, nivelRisco: 'BAIXO', totalBolsas: 0, bolsasVencidas: 0, taxaDescartePct: 0.0 }
];

const BASE_U2_DEMO = [
  { tipo: 'CONCENTRADO_HEMACIAS', estoqueValido: 18, demandaDiaria: 5.5, lambdaHorizonte: 16.5, probDesabastecimentoPct: 29.3, nivelRisco: 'MEDIO', totalBolsas: 210, bolsasVencidas: 9, taxaDescartePct: 4.3 },
  { tipo: 'CONCENTRADO_PLAQUETAS', estoqueValido: 6, demandaDiaria: 3.0, lambdaHorizonte: 9.0, probDesabastecimentoPct: 79.4, nivelRisco: 'ALTO', totalBolsas: 95, bolsasVencidas: 11, taxaDescartePct: 11.6 },
  { tipo: 'PLASMA_FRESCO_CONGELADO', estoqueValido: 28, demandaDiaria: 3.2, lambdaHorizonte: 9.6, probDesabastecimentoPct: 0.1, nivelRisco: 'BAIXO', totalBolsas: 150, bolsasVencidas: 4, taxaDescartePct: 2.7 }
];

const DADOS_U1 = {
  estoque: {
    dados: { 'O-': 150, 'O+': 210, 'A+': 180, 'A-': 45, 'B+': 90, 'B-': 30, 'AB+': 25, 'AB-': 10 },
    estatisticas: { media: 92.50, mediana: 67.50, moda: 150.00, variancia: 6042.86, desvioPadrao: 77.74 }
  },
  demanda: {
    dados: { 'Hospital 01': 120, 'Hospital 02': 85, 'Hospital 03': 140, 'Hospital 04': 40, 'Hospital 05': 95, 'Hospital 06': 110 },
    estatisticas: { media: 98.33, mediana: 102.50, moda: 140.00, variancia: 1186.67, desvioPadrao: 34.45 }
  },
  tempos: {
    dados: { 'Atend. 01': 7.5, 'Atend. 02': 22.5, 'Atend. 03': 13.5, 'Atend. 04': 33.0, 'Atend. 05': 4.5, 'Atend. 06': 27.0 },
    estatisticas: { media: 18.00, mediana: 18.00, moda: 33.00, variancia: 127.80, desvioPadrao: 11.30 }
  }
};

const charts = {};
let dadosApiU2 = null;

function criarGraficoBarra(id, labels, valores, rotulo, cor = '#9e1b39', maxY = null) {
  if (charts[id]) charts[id].destroy();
  const ctx = document.getElementById(id);
  if (!ctx) return;
  charts[id] = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: rotulo,
        data: valores,
        backgroundColor: cor,
        borderRadius: 6,
        maxBarThickness: 36
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false }, ticks: { color: '#64747d', font: { size: 11 } } },
        y: {
          beginAtZero: true,
          suggestedMax: maxY,
          grid: { color: '#edf2f4' },
          ticks: { color: '#64747d', font: { size: 11 } }
        }
      }
    }
  });
}

function preencherTabelaStats(id, est) {
  const cv = est.media > 0 ? (est.desvioPadrao / est.media) * 100 : 0;
  const linhas = [
    ['Média Aritmética (x̄)', fmt(est.media, 2)],
    ['Mediana (Md)', fmt(est.mediana, 2)],
    ['Moda (Mo)', fmt(est.moda, 2)],
    ['Variância Amostral (s²)', fmt(est.variancia, 2)],
    ['Desvio Padrão (s)', fmt(est.desvioPadrao, 2)],
    ['Coeficiente de Variação (CV)', `${fmt(cv, 1)}%`]
  ];
  document.getElementById(id).innerHTML = linhas
    .map(l => `<tr><td>${l[0]}</td><td>${l[1]}</td></tr>`)
    .join('');
}

function recomendacaoPorRisco(item) {
  const nome = NOMES[item.tipo] || item.tipo;
  if (item.nivelRisco === 'ALTO') {
    return `<strong>${nome} — Risco ALTO (${fmt(item.probDesabastecimentoPct)}%):</strong> Priorizar coleta e reposição imediata; atender primeiramente solicitações de emergência e urgência. (Descarte atual: ${fmt(item.taxaDescartePct)}%)`;
  }
  if (item.nivelRisco === 'MEDIO') {
    return `<strong>${nome} — Risco MÉDIO (${fmt(item.probDesabastecimentoPct)}%):</strong> Programar reposição dentro do horizonte de 3 dias e acompanhar o consumo diariamente. (Descarte atual: ${fmt(item.taxaDescartePct)}%)`;
  }
  return `<strong>${nome} — Risco BAIXO (${fmt(item.probDesabastecimentoPct)}%):</strong> Manter o estoque atual e monitorar a demanda; evitar excesso que possa elevar perdas por vencimento. (Descarte atual: ${fmt(item.taxaDescartePct)}%)`;
}

function renderizarU2(dados) {
  document.getElementById('cardsRisco').innerHTML = dados.map(d => {
    const cls = d.nivelRisco === 'ALTO' ? 'bar-alto' : (d.nivelRisco === 'MEDIO' ? 'bar-medio' : 'bar-baixo');
    const lambdaVal = d.lambdaHorizonte ?? d.lambda ?? (d.demandaDiaria * 3);
    return `
      <article class="metric-card">
        <div class="metric-top">
          <span>${NOMES[d.tipo] || d.tipo}</span>
          <span class="tag ${d.nivelRisco}">RISCO ${d.nivelRisco}</span>
        </div>
        <strong class="kpi-big">${fmt(d.probDesabastecimentoPct)}%</strong>
        <div class="metric-details">
          Estoque válido (S): <strong>${d.estoqueValido} bolsas</strong><br>
          Demanda média diária: <strong>${fmt(d.demandaDiaria)} bolsas/dia</strong><br>
          Demanda esperada (λ em 3d): <strong>${fmt(lambdaVal)} bolsas</strong><br>
          Descarte: ${d.bolsasVencidas} de ${d.totalBolsas} bolsas (${fmt(d.taxaDescartePct)}%)
        </div>
        <div class="bar-accent ${cls}"></div>
      </article>
    `;
  }).join('');

  document.getElementById('tbodyU2').innerHTML = dados.map(d => {
    const lambdaVal = d.lambdaHorizonte ?? d.lambda ?? (d.demandaDiaria * 3);
    return `
      <tr>
        <td><strong>${NOMES[d.tipo] || d.tipo}</strong></td>
        <td>${d.estoqueValido} bolsas</td>
        <td>${fmt(d.demandaDiaria)} / dia</td>
        <td>${fmt(lambdaVal)}</td>
        <td><strong>${fmt(d.probDesabastecimentoPct)}%</strong></td>
        <td><span class="tag ${d.nivelRisco}">${d.nivelRisco}</span></td>
        <td>${d.bolsasVencidas} / ${d.totalBolsas}</td>
        <td>${fmt(d.taxaDescartePct)}%</td>
      </tr>
    `;
  }).join('');

  document.getElementById('listaAcoes').innerHTML = dados
    .map(d => `<div class="advice-item">${recomendacaoPorRisco(d)}</div>`)
    .join('');

  const nomes = dados.map(d => d.tipo === 'CONCENTRADO_HEMACIAS' ? 'CH' : (d.tipo === 'CONCENTRADO_PLAQUETAS' ? 'CP' : 'PFC'));
  const probs = dados.map(d => d.probDesabastecimentoPct);
  const descartes = dados.map(d => d.taxaDescartePct);

  criarGraficoBarra('chProb', nomes, probs, 'Probabilidade de desabastecimento (%)', '#9e1b39', Math.max(...probs) === 0 ? 10 : 100);
  criarGraficoBarra('chDescarte', nomes, descartes, 'Taxa de descarte (%)', '#142f39', Math.max(...descartes) === 0 ? 10 : null);
}

function alternarBaseU2(modo) {
  document.getElementById('btn-base-repo').classList.toggle('active', modo === 'repo');
  document.getElementById('btn-base-demo').classList.toggle('active', modo === 'demo');

  if (modo === 'demo') {
    document.getElementById('context-desc').textContent = 'Amostra operacional sintética ilustrando cenários de risco ALTO, MÉDIO e BAIXO.';
    renderizarU2(BASE_U2_DEMO);
  } else {
    document.getElementById('context-desc').textContent = 'Base oficial retornada pelo endpoint do repositório Hemobit (altere ao lado para simular operação ativa).';
    renderizarU2(dadosApiU2 || BASE_U2_REPO);
  }
}

async function inicializar() {
  try {
    const resp = await fetch('/api/analise/probabilistica');
    if (!resp.ok) throw new Error();
    dadosApiU2 = await resp.json();
    document.getElementById('status-fonte').textContent = 'API Spring Boot Conectada';
  } catch {
    dadosApiU2 = BASE_U2_REPO;
    document.getElementById('status-fonte').textContent = 'Repositório Hemobit (Estático)';
  }
  renderizarU2(dadosApiU2);

  try {
    const [rEst, rDem, rTmp] = await Promise.all([
      fetch('/api/indicadores/estoque-tipo').then(r => r.ok ? r.json() : Promise.reject()),
      fetch('/api/indicadores/demanda-hospital').then(r => r.ok ? r.json() : Promise.reject()),
      fetch('/api/indicadores/tempos-atendimento').then(r => r.ok ? r.json() : Promise.reject())
    ]);
    criarGraficoBarra('chEstoque', Object.keys(rEst.dados), Object.values(rEst.dados), 'Bolsas em estoque', '#9e1b39');
    preencherTabelaStats('tbEstoque', rEst.estatisticas);

    criarGraficoBarra('chDemanda', Object.keys(rDem.dados), Object.values(rDem.dados), 'Solicitações', '#d93c56');
    preencherTabelaStats('tbDemanda', rDem.estatisticas);

    criarGraficoBarra('chTempos', Object.keys(DADOS_U1.tempos.dados), Object.values(DADOS_U1.tempos.dados), 'Minutos', '#142f39');
    preencherTabelaStats('tbTempos', rTmp);
  } catch {
    criarGraficoBarra('chEstoque', Object.keys(DADOS_U1.estoque.dados), Object.values(DADOS_U1.estoque.dados), 'Bolsas em estoque', '#9e1b39');
    preencherTabelaStats('tbEstoque', DADOS_U1.estoque.estatisticas);

    criarGraficoBarra('chDemanda', Object.keys(DADOS_U1.demanda.dados), Object.values(DADOS_U1.demanda.dados), 'Solicitações', '#d93c56');
    preencherTabelaStats('tbDemanda', DADOS_U1.demanda.estatisticas);

    criarGraficoBarra('chTempos', Object.keys(DADOS_U1.tempos.dados), Object.values(DADOS_U1.tempos.dados), 'Minutos', '#142f39');
    preencherTabelaStats('tbTempos', DADOS_U1.tempos.estatisticas);
  }
}

function poissonPmf(k, lambda) {
  if (lambda === 0) return k === 0 ? 1 : 0;
  let logP = -lambda + k * Math.log(lambda);
  for (let i = 2; i <= k; i++) logP -= Math.log(i);
  return Math.exp(logP);
}

function aplicarCenario(s, dem30, hor) {
  document.getElementById('inp-s').value = s;
  document.getElementById('inp-dem').value = dem30;
  document.getElementById('inp-hor').value = hor;
  atualizarSimulador();
}

function atualizarSimulador() {
  const S = Number(document.getElementById('inp-s').value);
  const dem30 = Number(document.getElementById('inp-dem').value);
  const hor = Number(document.getElementById('inp-hor').value);

  document.getElementById('lbl-s').textContent = `${S} bolsas`;
  document.getElementById('lbl-dem').textContent = `${dem30} bolsas`;
  document.getElementById('lbl-hor').textContent = `${hor} ${hor === 1 ? 'dia' : 'dias'}`;

  const diaria = dem30 / 30;
  const lambda = diaria * hor;
  let cdf = 0;
  for (let k = 0; k <= S; k++) cdf += poissonPmf(k, lambda);
  const probDesab = Math.max(0, Math.min(1, 1 - cdf));
  const probAtend = 1 - probDesab;

  const risco = probDesab >= 0.5 ? 'ALTO' : (probDesab >= 0.2 ? 'MEDIO' : 'BAIXO');
  const badge = document.getElementById('sim-badge');
  badge.className = `tag ${risco}`;
  badge.textContent = `RISCO ${risco}`;

  document.getElementById('out-diaria').textContent = `${fmt(diaria, 2)} bolsas/dia`;
  document.getElementById('out-lambda').textContent = `${fmt(lambda, 2)} bolsas`;
  document.getElementById('out-sigma').textContent = `${fmt(Math.sqrt(lambda), 2)} bolsas`;
  document.getElementById('out-atend').textContent = `${fmt(probAtend * 100, 2)}%`;
  document.getElementById('out-ruptura').textContent = `${fmt(probDesab * 100, 2)}%`;

  const maxK = Math.max(18, Math.ceil(lambda + 4 * Math.sqrt(lambda || 1)), S + 4);
  const labels = [];
  const valores = [];
  const cores = [];
  for (let k = 0; k <= maxK; k++) {
    labels.push(k);
    valores.push(+(poissonPmf(k, lambda) * 100).toFixed(2));
    cores.push(k > S ? '#c0152f' : '#2e8b57');
  }

  if (charts['chPoisson']) charts['chPoisson'].destroy();
  charts['chPoisson'] = new Chart(document.getElementById('chPoisson'), {
    type: 'bar',
    data: {
      labels,
      datasets: [{ label: 'P(D = k) %', data: valores, backgroundColor: cores, borderRadius: 4 }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            title: items => `Demanda D = ${items[0].label} bolsas`,
            label: item => `P(D = ${item.label}) = ${item.raw}% (${Number(item.label) > S ? 'Ruptura de estoque' : 'Atendido pelo estoque'})`
          }
        }
      },
      scales: {
        x: { grid: { display: false }, ticks: { color: '#64747d', font: { size: 10 } } },
        y: { beginAtZero: true, grid: { color: '#edf2f4' }, ticks: { color: '#64747d', font: { size: 10 } } }
      }
    }
  });
}

const hashInicial = location.hash.replace('#', '');
if (['visao', 'u1', 'u2', 'simulador', 'fundamentos'].includes(hashInicial)) {
  abrirAba(hashInicial);
}

inicializar();
atualizarSimulador();
