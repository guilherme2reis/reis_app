/* SOLLERS CODE: app de lições diárias. Tudo fica salvo neste aparelho (localStorage). */
'use strict';

const VERSAO = '1.0.0';
const CHAVE_DADOS = 'sollers-code-dados';
const CHAVE_PIN = 'sollers-code-pin';
const CHAVE_TRILHA = 'sollers-code-trilha';
const TAM_PIN = 4;
const TRAVA_APOS_MS = 2 * 60 * 1000;      // trava de novo depois de 2 min fora do app
const INTERVALOS = [3, 10, 30];           // dias até cada revisão

/* ================= DADOS ================= */
function dadosVazios() { return { versao: 1, licoes: {}, registros: [] }; }

function carregar() {
  try {
    const d = JSON.parse(localStorage.getItem(CHAVE_DADOS));
    if (d && d.licoes && Array.isArray(d.registros)) return d;
  } catch (e) { /* segue com vazio */ }
  return dadosVazios();
}
let dados = carregar();

function salvar() {
  try { localStorage.setItem(CHAVE_DADOS, JSON.stringify(dados)); }
  catch (e) { aviso('Não consegui salvar neste aparelho'); }
}

/* ================= DATAS ================= */
function hojeISO() { return isoLocal(new Date()); }
function isoLocal(d) {
  const z = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
}
function somaDias(iso, n) { const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() + n); return isoLocal(d); }
function dataBR(iso) { const [a, m, d] = iso.slice(0, 10).split('-'); return `${d}/${m}/${a}`; }
function diasAte(iso) {
  return Math.round((new Date(iso + 'T12:00:00') - new Date(hojeISO() + 'T12:00:00')) / 86400000);
}

/* ================= UTIL ================= */
const $ = (s) => document.querySelector(s);
const esc = (t) => String(t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const areaDe = (id) => AREAS.find((a) => a.id === id);
const licaoDe = (id) => LICOES.find((l) => l.id === id);
const trilhaDaLicao = (l) => areaDe(l.area).trilha;
const licoesDaArea = (areaId) => LICOES.filter((l) => l.area === areaId);
const licoesDaTrilha = (t) => LICOES.filter((l) => trilhaDaLicao(l) === t);
const estado = (id) => dados.licoes[id];
const feita = (id) => !!(estado(id) && estado(id).feita);

function aviso(txt) {
  const el = $('#aviso'); el.textContent = txt; el.classList.remove('oculto');
  clearTimeout(aviso.t); aviso.t = setTimeout(() => el.classList.add('oculto'), 2400);
}

function confirmar(texto, rotuloSim = 'Confirmar') {
  return new Promise((ok) => {
    $('#dialogo-texto').textContent = texto;
    $('#dialogo-sim').textContent = rotuloSim;
    $('#dialogo').classList.remove('oculto');
    const fim = (v) => { $('#dialogo').classList.add('oculto'); $('#dialogo-sim').onclick = $('#dialogo-nao').onclick = null; ok(v); };
    $('#dialogo-sim').onclick = () => fim(true);
    $('#dialogo-nao').onclick = () => fim(false);
  });
}

function trilhaAtual() {
  try { return localStorage.getItem(CHAVE_TRILHA) === 'pes' ? 'pes' : 'pro'; } catch (e) { return 'pro'; }
}
function definirTrilha(t) { try { localStorage.setItem(CHAVE_TRILHA, t); } catch (e) { /* ok */ } }

function revisoesPendentes() {
  const hoje = hojeISO();
  return LICOES.filter((l) => { const e = estado(l.id); return e && e.prox && e.prox <= hoje; });
}

function sequenciaDias() {
  const dias = new Set(dados.registros.map((r) => r.data.slice(0, 10)));
  let n = 0; let d = hojeISO();
  if (!dias.has(d)) d = somaDias(d, -1);       // ainda dá tempo de registrar hoje
  while (dias.has(d)) { n++; d = somaDias(d, -1); }
  return n;
}

/* ================= PIN ================= */
async function hashPin(pin, salt) {
  const txt = salt + ':' + pin;
  if (window.crypto && crypto.subtle) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(txt));
    return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  let h = 0; for (const c of txt) h = (h * 31 + c.charCodeAt(0)) | 0; return 'x' + h; // reserva (sem https)
}
function pinSalvo() { try { return JSON.parse(localStorage.getItem(CHAVE_PIN)); } catch (e) { return null; } }

const trava = { modo: 'entrar', digitado: '', primeiro: '' };

function montarTeclado() {
  const teclas = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'];
  $('#teclado').innerHTML = teclas.map((t) => t === ''
    ? '<button class="tec-vazio" type="button" tabindex="-1"></button>'
    : `<button type="button" data-t="${t}" class="${t === '⌫' ? 'tec-acao' : ''}" aria-label="${t === '⌫' ? 'Apagar' : t}">${t}</button>`).join('');
  $('#teclado').onclick = (ev) => { const b = ev.target.closest('button[data-t]'); if (b) tecla(b.dataset.t); };
}

function desenharPontos() {
  $('#pin-pontos').innerHTML = Array.from({ length: TAM_PIN }, (_, i) => `<i class="${i < trava.digitado.length ? 'on' : ''}"></i>`).join('');
}

function msgTrava(t, erro) { const m = $('#trava-msg'); m.textContent = t; m.classList.toggle('erro', !!erro); }

function abrirTrava(modo) {
  trava.modo = modo || (pinSalvo() ? 'entrar' : 'criar');
  trava.digitado = ''; trava.primeiro = '';
  msgTrava(trava.modo === 'entrar' ? 'Digite seu PIN' : 'Crie um PIN de 4 dígitos');
  $('#btn-esqueci').classList.toggle('oculto', trava.modo === 'criar');
  $('#btn-esqueci').textContent = trava.modo === 'trocar' ? 'Cancelar' : 'Esqueci o PIN';
  desenharPontos();
  $('#trava').classList.remove('oculto');
  $('#app').classList.add('oculto');
}

function fecharTrava() {
  $('#trava').classList.add('oculto');
  $('#app').classList.remove('oculto');
  render();
}

async function tecla(t) {
  if (t === '⌫') { trava.digitado = trava.digitado.slice(0, -1); desenharPontos(); return; }
  if (trava.digitado.length >= TAM_PIN) return;
  trava.digitado += t; desenharPontos();
  if (trava.digitado.length < TAM_PIN) return;

  const pin = trava.digitado;
  trava.digitado = '';                       // libera já o próximo dígito (digitação rápida)
  await new Promise((r) => setTimeout(r, 120));
  desenharPontos();

  if (trava.modo === 'entrar') {
    const s = pinSalvo();
    if (s && (await hashPin(pin, s.salt)) === s.hash) fecharTrava();
    else msgTrava('PIN errado, tente de novo', true);
    return;
  }
  if (!trava.primeiro) { trava.primeiro = pin; msgTrava('Digite o PIN de novo pra confirmar'); return; }
  if (pin !== trava.primeiro) { trava.primeiro = ''; msgTrava('Os PINs não bateram. Crie de novo.', true); return; }
  const salt = Math.random().toString(36).slice(2) + Date.now().toString(36);
  localStorage.setItem(CHAVE_PIN, JSON.stringify({ salt, hash: await hashPin(pin, salt) }));
  aviso(trava.modo === 'trocar' ? 'PIN alterado' : 'PIN criado');
  fecharTrava();
}

document.addEventListener('keydown', (ev) => {
  if ($('#trava').classList.contains('oculto')) return;
  if (/^[0-9]$/.test(ev.key)) tecla(ev.key);
  else if (ev.key === 'Backspace') tecla('⌫');
});

$('#btn-esqueci').onclick = async () => {
  if (trava.modo === 'trocar') { fecharTrava(); return; }
  const ok = await confirmar('Pra criar um PIN novo, todo o progresso e os registros deste aparelho serão apagados. Se você tem um backup, dá pra importar depois. Continuar?', 'Apagar e criar PIN');
  if (!ok) return;
  localStorage.removeItem(CHAVE_PIN); localStorage.removeItem(CHAVE_DADOS);
  dados = dadosVazios(); abrirTrava('criar');
};

let saiuEm = 0;
document.addEventListener('visibilitychange', () => {
  if (document.hidden) saiuEm = Date.now();
  else if (saiuEm && Date.now() - saiuEm > TRAVA_APOS_MS && pinSalvo()) abrirTrava('entrar');
});

/* ================= NAVEGAÇÃO ================= */
function ir(rota) { if (location.hash === '#' + rota) render(); else location.hash = rota; }
window.addEventListener('hashchange', () => { if ($('#trava').classList.contains('oculto')) render(); });

$('#nav').onclick = (ev) => { const b = ev.target.closest('.nav-btn'); if (b) ir(b.dataset.view); };

function rotaAtual() { return location.hash.slice(1) || 'inicio'; }

function render() {
  const rota = rotaAtual();
  const base = rota.startsWith('area-') || rota.startsWith('licao-') ? 'inicio' : rota;
  document.querySelectorAll('.nav-btn').forEach((b) => b.classList.toggle('ativo', b.dataset.view === base));
  const n = revisoesPendentes().length;
  $('#badge-rev').textContent = n; $('#badge-rev').classList.toggle('oculto', !n);

  const c = $('#conteudo');
  if (rota.startsWith('area-')) c.innerHTML = telaArea(rota.slice(5));
  else if (rota.startsWith('licao-')) c.innerHTML = telaLicao(rota.slice(6));
  else if (rota === 'revisar') c.innerHTML = telaRevisar();
  else if (rota === 'diario') c.innerHTML = telaDiario();
  else if (rota === 'consulta') c.innerHTML = telaConsulta();
  else if (rota === 'dados') c.innerHTML = telaDados();
  else c.innerHTML = telaInicio();
  ligarEventos(rota);
  window.scrollTo(0, 0);
}

/* ================= TELAS ================= */
function telaInicio() {
  const t = trilhaAtual();
  const doTrilha = licoesDaTrilha(t);
  const prox = doTrilha.find((l) => !feita(l.id));
  const feitas = doTrilha.filter((l) => feita(l.id)).length;
  const rev = revisoesPendentes();
  const seq = sequenciaDias();

  let h = `<h1>Olá, Guilherme</h1>
    <p class="sub">${seq ? `Sequência: ${seq} ${seq === 1 ? 'dia' : 'dias seguidos'} com registro.` : 'Uma lição por dia. Pratique e registre.'}</p>
    <div class="abas">
      <button class="aba pro ${t === 'pro' ? 'ativa' : ''}" data-trilha="pro" type="button">◆ Profissional</button>
      <button class="aba pes ${t === 'pes' ? 'ativa' : ''}" data-trilha="pes" type="button">● Pessoal</button>
    </div>`;

  if (rev.length) {
    h += `<button class="card btn-largo destaque" data-ir="revisar" type="button" style="text-align:left;border-left-color:var(--alerta)">
      <span class="rotulo">Revisão</span><h3>${rev.length} ${rev.length === 1 ? 'lição pra revisar hoje' : 'lições pra revisar hoje'}</h3>
      <span class="fonte">Revisar fixa o que você praticou.</span></button>`;
  }

  if (prox) {
    const a = areaDe(prox.area);
    h += `<button class="card btn-largo destaque ${t}" data-ir="licao-${prox.id}" type="button" style="text-align:left">
      <span class="rotulo">Próxima lição · ${esc(a.nome)}</span><h3>${esc(prox.titulo)}</h3>
      <span class="fonte">${esc(prox.pratica)}</span></button>`;
  } else {
    h += `<div class="card"><b>Você concluiu todas as lições da trilha ${TRILHAS[t].nome}.</b><p class="fonte">Continue nas revisões e registros.</p></div>`;
  }

  h += `<h2>${TRILHAS[t].icone} ${TRILHAS[t].nome} · ${feitas} de ${doTrilha.length}</h2><div class="grade-areas ${t}">`;
  AREAS.filter((a) => a.trilha === t).forEach((a) => {
    const ls = licoesDaArea(a.id); const f = ls.filter((l) => feita(l.id)).length;
    h += `<button class="area" data-ir="area-${a.id}" type="button"><b>${esc(a.nome)}</b><small>${esc(a.desc)}</small>
      <div class="barra"><i style="width:${Math.round(100 * f / ls.length)}%"></i></div>
      <div class="prog-txt">${f} de ${ls.length} feitas</div></button>`;
  });
  return h + '</div>';
}

function telaArea(id) {
  const a = areaDe(id); if (!a) return telaInicio();
  let h = `<button class="voltar" data-ir="inicio" type="button">‹ Início</button>
    <span class="tag ${a.trilha}">${TRILHAS[a.trilha].icone} ${TRILHAS[a.trilha].nome}</span>
    <h1>${esc(a.nome)}</h1><p class="sub">${esc(a.desc)}</p><ul class="lista-licoes ${a.trilha}">`;
  licoesDaArea(id).forEach((l, i) => {
    const e = estado(l.id);
    const meta = e && e.feita ? `Feita em ${dataBR(e.feita)}${e.prox ? ` · revisão ${quando(e.prox)}` : ' · revisões completas'}` : 'Nova';
    h += `<li><button data-ir="licao-${l.id}" type="button"><span class="st ${e && e.feita ? 'feita' : ''}">${e && e.feita ? '✓' : i + 1}</span>
      <span><b>${esc(l.titulo)}</b><br><span class="meta">${meta}</span></span></button></li>`;
  });
  return h + '</ul>';
}

function quando(iso) {
  const d = diasAte(iso);
  if (d <= 0) return 'hoje';
  if (d === 1) return 'amanhã';
  return `em ${d} dias`;
}

function telaLicao(id) {
  const l = licaoDe(id); if (!l) return telaInicio();
  const a = areaDe(l.area); const t = a.trilha; const e = estado(id);
  const lista = licoesDaArea(l.area); const idx = lista.indexOf(l);
  const emRevisao = e && e.prox && e.prox <= hojeISO();
  const regs = dados.registros.filter((r) => r.licao === id).sort((x, y) => y.data.localeCompare(x.data));

  let status = '';
  if (e && e.feita) status = `<p class="fonte">Feita em ${dataBR(e.feita)}. ${e.prox ? (emRevisao ? '<b>Revisão de hoje.</b>' : `Próxima revisão ${quando(e.prox)}.`) : 'Revisões completas.'}</p>`;

  let botoes;
  if (!e || !e.feita) botoes = `<button class="btn" id="btn-concluir" type="button">✓ Concluir lição</button>`;
  else if (emRevisao) botoes = `<button class="btn" id="btn-revisei" type="button">↻ Revisei</button>`;
  else botoes = `<button class="btn btn-sec" id="btn-registrar" type="button">✎ Salvar registro</button>`;

  return `<div class="${t}">
    <button class="voltar" data-ir="area-${a.id}" type="button">‹ ${esc(a.nome)}</button>
    <span class="tag ${t}">${TRILHAS[t].icone} ${TRILHAS[t].nome} · ${idx + 1} de ${lista.length}</span>
    <h1>${esc(l.titulo)}</h1>
    <p class="fonte">Base: ${esc(l.fonte)}</p>
    ${status}
    <div class="bloco"><div class="rotulo">A ideia</div><p>${esc(l.ideia)}</p></div>
    <div class="bloco pratica"><div class="rotulo">Prática de hoje</div><p>${esc(l.pratica)}</p></div>
    <div class="bloco"><div class="rotulo">Pergunta pro registro</div><p><b>${esc(l.pergunta)}</b></p></div>
    <textarea id="registro" placeholder="Escreva aqui o que você observou ou pensou. Pode ser uma linha."></textarea>
    ${t === 'pro' ? '<p class="lembrete">Não escreva nome, matrícula nem nada que identifique interno.</p>' : ''}
    <div class="acoes">${botoes}</div>
    <div class="acoes">
      ${idx > 0 ? `<button class="btn btn-sec" data-ir="licao-${lista[idx - 1].id}" type="button">‹ Anterior</button>` : ''}
      ${idx < lista.length - 1 ? `<button class="btn btn-sec" data-ir="licao-${lista[idx + 1].id}" type="button">Próxima ›</button>` : ''}
    </div>
    ${regs.length ? `<div class="historico"><b>Seus registros desta lição</b>${regs.map((r) =>
      `<p><time>${dataBR(r.data)} · ${r.tipo === 'revisao' ? 'revisão' : 'registro'}</time>${esc(r.texto)}</p>`).join('')}</div>` : ''}
  </div>`;
}

function telaRevisar() {
  const rev = revisoesPendentes();
  const futuras = LICOES.filter((l) => { const e = estado(l.id); return e && e.prox && e.prox > hojeISO(); })
    .sort((x, y) => estado(x.id).prox.localeCompare(estado(y.id).prox)).slice(0, 8);
  let h = `<h1>Revisar</h1><p class="sub">Cada lição volta em 3, 10 e 30 dias depois de feita. É o que faz a ideia virar hábito.</p>`;
  if (!rev.length) h += `<div class="vazio">Nada pra revisar hoje.</div>`;
  else h += '<ul class="lista-licoes">' + rev.map((l) => itemLista(l, 'Revisar hoje')).join('') + '</ul>';
  if (futuras.length) {
    h += '<h2>Próximas revisões</h2><ul class="lista-licoes">' +
      futuras.map((l) => itemLista(l, `Revisão ${quando(estado(l.id).prox)} · ${dataBR(estado(l.id).prox)}`)).join('') + '</ul>';
  }
  return h;
}

function itemLista(l, meta) {
  const t = trilhaDaLicao(l);
  return `<li class="${t}"><button data-ir="licao-${l.id}" type="button"><span class="st feita">${TRILHAS[t].icone}</span>
    <span><b>${esc(l.titulo)}</b><br><span class="meta">${esc(TRILHAS[t].nome)} · ${esc(meta)}</span></span></button></li>`;
}

let filtroDiario = 'todos';
function telaDiario() {
  const regs = dados.registros
    .filter((r) => { const l = licaoDe(r.licao); return l && (filtroDiario === 'todos' || trilhaDaLicao(l) === filtroDiario); })
    .sort((x, y) => y.data.localeCompare(x.data));
  let h = `<h1>Diário</h1><p class="sub">Tudo que você registrou, do mais novo pro mais antigo.</p>
    <div class="filtros">
      <button class="filtro ${filtroDiario === 'todos' ? 'ativo' : ''}" data-filtro="todos" type="button">Todos</button>
      <button class="filtro ${filtroDiario === 'pro' ? 'ativo' : ''}" data-filtro="pro" type="button">◆ Profissional</button>
      <button class="filtro ${filtroDiario === 'pes' ? 'ativo' : ''}" data-filtro="pes" type="button">● Pessoal</button>
    </div>`;
  if (!regs.length) return h + '<div class="vazio">Nenhum registro ainda. Conclua uma lição e escreva o que observou.</div>';
  return h + regs.map((r) => {
    const l = licaoDe(r.licao); const t = trilhaDaLicao(l);
    return `<div class="entrada"><div class="topo"><span class="tag ${t}">${TRILHAS[t].icone} ${TRILHAS[t].nome}</span>
      <span>${dataBR(r.data)}${r.tipo === 'revisao' ? ' · revisão' : ''}</span></div>
      <b>${esc(l.titulo)}</b><p>${esc(r.texto)}</p></div>`;
  }).join('');
}

function telaConsulta() {
  const fases = [[0, 'Fase 1 · Técnicas'], [3, 'Fase 2 · Ferramentas'], [11, 'Fase 3 · A virada']];
  let passos = '';
  PASSOS_SETUP.forEach(([n, d], i) => {
    const f = fases.find((x) => x[0] === i); if (f) passos += `</ol><p class="fase">${f[1]}</p><ol class="passos" start="${i + 1}" style="counter-reset:p ${i}">`;
    passos += `<li><div><b>${esc(n)}</b><span>${esc(d)}</span></div></li>`;
  });
  return `<h1>Consulta rápida</h1><p class="sub">Pra checar em que ponto uma situação está. Base: Games Criminals Play.</p>
    <div class="card"><h2 style="margin-top:0">Os 14 passos do set-up</h2><ol class="passos">${passos}</ol></div>
    <div class="card"><h2 style="margin-top:0">Os 12 protetores</h2><ol class="passos">${PROTETORES.map((p) => `<li><div><b>${esc(p)}</b></div></li>`).join('')}</ol></div>
    <div class="card"><h2 style="margin-top:0">Três perguntas antes de atender um pedido</h2>
      <ol class="passos"><li><div><b>Isso está dentro da minha função?</b></div></li>
      <li><div><b>Beneficia o serviço ou só quem pede?</b></div></li>
      <li><div><b>Eu faria isso com a chefia olhando?</b></div></li></ol></div>`;
}

function telaDados() {
  const fp = licoesDaTrilha('pro').filter((l) => feita(l.id)).length;
  const fs = licoesDaTrilha('pes').filter((l) => feita(l.id)).length;
  return `<h1>Dados</h1><p class="sub">Tudo fica salvo só neste aparelho. Faça backup de vez em quando.</p>
    <div class="card">
      <div class="linha-dado"><span>◆ Profissional</span><b>${fp} de ${licoesDaTrilha('pro').length}</b></div>
      <div class="linha-dado"><span>● Pessoal</span><b>${fs} de ${licoesDaTrilha('pes').length}</b></div>
      <div class="linha-dado"><span>Registros escritos</span><b>${dados.registros.length}</b></div>
      <div class="linha-dado"><span>Sequência atual</span><b>${sequenciaDias()} dias</b></div>
    </div>
    <div class="card">
      <b>Backup</b>
      <p class="fonte">Exporte pra guardar ou pra levar seu progresso do celular pro computador (e vice-versa). Importar substitui os dados deste aparelho.</p>
      <div class="acoes"><button class="btn" id="btn-exportar" type="button">Exportar backup</button>
      <button class="btn btn-sec" id="btn-importar" type="button">Importar backup</button></div>
      <input type="file" id="arquivo" accept=".json,application/json">
    </div>
    <div class="card">
      <b>Segurança</b>
      <div class="acoes"><button class="btn btn-sec" id="btn-trocar-pin" type="button">Trocar PIN</button>
      <button class="btn btn-sec" id="btn-travar" type="button">Travar agora</button></div>
    </div>
    <div class="card">
      <b>Apagar tudo</b>
      <p class="fonte">Remove progresso e registros deste aparelho. O PIN continua.</p>
      <div class="acoes"><button class="btn btn-alerta" id="btn-apagar" type="button">Apagar dados</button></div>
    </div>
    <p class="fonte" style="text-align:center">SOLLERS CODE v${VERSAO}</p>`;
}

/* ================= AÇÕES ================= */
function ligarEventos(rota) {
  const c = $('#conteudo');
  c.onclick = (ev) => {
    const alvo = ev.target.closest('[data-ir]'); if (alvo) { ir(alvo.dataset.ir); return; }
    const tr = ev.target.closest('[data-trilha]'); if (tr) { definirTrilha(tr.dataset.trilha); render(); return; }
    const fi = ev.target.closest('[data-filtro]'); if (fi) { filtroDiario = fi.dataset.filtro; render(); }
  };

  if (rota.startsWith('licao-')) {
    const id = rota.slice(6);
    const txt = () => ($('#registro').value || '').trim();
    const b1 = $('#btn-concluir'), b2 = $('#btn-revisei'), b3 = $('#btn-registrar');
    if (b1) b1.onclick = () => {
      const hoje = hojeISO();
      dados.licoes[id] = { feita: hoje, nivel: 0, prox: somaDias(hoje, INTERVALOS[0]) };
      registrar(id, 'licao', txt()); salvar(); aviso(`Lição concluída. Revisão em ${INTERVALOS[0]} dias.`); proximaDepois(id);
    };
    if (b2) b2.onclick = () => {
      const e = dados.licoes[id]; e.nivel = (e.nivel || 0) + 1;
      e.prox = e.nivel < INTERVALOS.length ? somaDias(hojeISO(), INTERVALOS[e.nivel]) : null;
      registrar(id, 'revisao', txt()); salvar();
      aviso(e.prox ? `Revisado. Volta em ${INTERVALOS[e.nivel]} dias.` : 'Revisões completas.');
      const resto = revisoesPendentes(); ir(resto.length ? 'licao-' + resto[0].id : 'revisar');
    };
    if (b3) b3.onclick = () => {
      if (!txt()) { aviso('Escreva algo antes de salvar'); return; }
      registrar(id, 'licao', txt()); salvar(); aviso('Registro salvo'); render();
    };
  }

  if (rota === 'dados') {
    $('#btn-exportar').onclick = exportar;
    $('#btn-importar').onclick = () => $('#arquivo').click();
    $('#arquivo').onchange = importar;
    $('#btn-trocar-pin').onclick = () => abrirTrava('trocar');
    $('#btn-travar').onclick = () => abrirTrava('entrar');
    $('#btn-apagar').onclick = async () => {
      if (!(await confirmar('Apagar todo o progresso e os registros deste aparelho? Isso não tem volta.', 'Apagar'))) return;
      dados = dadosVazios(); salvar(); aviso('Dados apagados'); render();
    };
  }
}

function registrar(id, tipo, texto) {
  if (!texto) return;
  dados.registros.push({ licao: id, tipo, data: new Date().toISOString(), texto });
}

function proximaDepois(id) {
  const t = trilhaDaLicao(licaoDe(id));
  const prox = licoesDaTrilha(t).find((l) => !feita(l.id));
  ir(prox ? 'area-' + licaoDe(id).area : 'inicio');
}

function exportar() {
  const blob = new Blob([JSON.stringify({ app: 'sollers-code', exportado: new Date().toISOString(), ...dados }, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `sollers-code-backup-${hojeISO()}.json`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  aviso('Backup exportado');
}

function importar(ev) {
  const f = ev.target.files[0]; ev.target.value = '';
  if (!f) return;
  const r = new FileReader();
  r.onload = async () => {
    try {
      const d = JSON.parse(r.result);
      if (d.app !== 'sollers-code' || !d.licoes || !Array.isArray(d.registros)) throw new Error('formato');
      const n = Object.keys(d.licoes).length;
      if (!(await confirmar(`Importar backup com ${n} lições feitas e ${d.registros.length} registros? Os dados atuais deste aparelho serão substituídos.`, 'Importar'))) return;
      dados = { versao: 1, licoes: d.licoes, registros: d.registros }; salvar(); aviso('Backup importado'); render();
    } catch (e) { aviso('Esse arquivo não é um backup do SOLLERS CODE'); }
  };
  r.readAsText(f);
}

/* ================= INÍCIO ================= */
montarTeclado();
abrirTrava();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
