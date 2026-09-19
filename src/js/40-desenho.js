// Modo desenhar: riscar setas em cima do campo, igual caneta na prancheta.
// Os pontos são guardados em porcentagem, entao a seta nunca sai do lugar
// quando o campo muda de tamanho ou o celular vira.

PJ.modoDesenho = false;
PJ.ferramenta = 'seta';     // seta | risco
PJ.corSeta = 'amarelo';

PJ.CORES_SETA = {
  amarelo: '#FFD400',
  branco: '#F5F7F0',
  vermelho: '#D4142A',
};

var traco = null;
var elSetas = null;
var quadroSeta = 0;

PJ.ligarDesenho = function () {
  elSetas = document.getElementById('setas');
};

PJ.desenhoComecar = function (ev) {
  if (!PJ.modoDesenho || traco) return;
  var p = PJ.pontoParaCampo(ev.clientX, ev.clientY);
  traco = {
    tipo: PJ.ferramenta,
    cor: PJ.corSeta,
    pontos: [[p.x, p.y], [p.x, p.y]],
    pid: ev.pointerId,
  };
  try { PJ.elPalco.setPointerCapture(ev.pointerId); } catch (err) { /* segue sem captura */ }
  ev.preventDefault();
};

PJ.desenhoSeguir = function (ev) {
  if (!traco || ev.pointerId !== traco.pid) return;
  ev.preventDefault();
  var amostras = ev.getCoalescedEvents ? ev.getCoalescedEvents() : [ev];
  if (!amostras.length) amostras = [ev];

  if (traco.tipo === 'seta') {
    var f = amostras[amostras.length - 1];
    var pf = PJ.pontoParaCampo(f.clientX, f.clientY);
    traco.pontos[1] = [pf.x, pf.y];
  } else {
    for (var i = 0; i < amostras.length; i++) {
      var p = PJ.pontoParaCampo(amostras[i].clientX, amostras[i].clientY);
      var ultimo = traco.pontos[traco.pontos.length - 1];
      if (Math.abs(ultimo[0] - p.x) + Math.abs(ultimo[1] - p.y) > 0.4) traco.pontos.push([p.x, p.y]);
    }
  }
  if (!quadroSeta) quadroSeta = window.requestAnimationFrame(function () {
    quadroSeta = 0;
    PJ.desenharSetas();
  });
};

PJ.desenhoTerminar = function (ev) {
  if (!traco || ev.pointerId !== traco.pid) return;
  var t = traco;
  traco = null;
  try { PJ.elPalco.releasePointerCapture(ev.pointerId); } catch (err) { /* já soltou */ }

  var a = t.pontos[0];
  var b = t.pontos[t.pontos.length - 1];
  var tamanho = Math.sqrt(Math.pow(b[0] - a[0], 2) + Math.pow(b[1] - a[1], 2));
  if (tamanho < 3 && t.pontos.length < 8) { PJ.desenharSetas(); return; } // toque sem querer

  if (t.tipo === 'risco') t.pontos = simplificar(t.pontos, 0.35);
  t.pontos = t.pontos.map(function (p) {
    return [Math.round(p[0] * 10) / 10, Math.round(p[1] * 10) / 10];
  });
  PJ.antes('desenhar');
  PJ.campo().setas.push({ tipo: t.tipo, cor: t.cor, pontos: t.pontos });
  PJ.atualizar();
};

PJ.desenhoCancelar = function () {
  traco = null;
  PJ.desenharSetas();
};

// Tira os pontos que não mudam o formato do risco (Ramer-Douglas-Peucker).
// Sem isso, um rabisco de 3 segundos guarda centenas de pontos e um dia
// o celular reclama que a memória acabou.
function simplificar(pontos, tolerancia) {
  if (pontos.length < 3) return pontos;
  var primeiro = 0;
  var ultimo = pontos.length - 1;
  var manter = {};
  manter[primeiro] = true;
  manter[ultimo] = true;

  var pilha = [[primeiro, ultimo]];
  while (pilha.length) {
    var par = pilha.pop();
    var ini = par[0], fim = par[1];
    var maior = 0, indice = -1;
    for (var i = ini + 1; i < fim; i++) {
      var d = distanciaDaReta(pontos[i], pontos[ini], pontos[fim]);
      if (d > maior) { maior = d; indice = i; }
    }
    if (maior > tolerancia && indice > 0) {
      manter[indice] = true;
      pilha.push([ini, indice], [indice, fim]);
    }
  }
  return pontos.filter(function (p, i) { return manter[i]; });
}

function distanciaDaReta(p, a, b) {
  var dx = b[0] - a[0];
  var dy = b[1] - a[1];
  var tam2 = dx * dx + dy * dy;
  if (!tam2) return Math.sqrt(Math.pow(p[0] - a[0], 2) + Math.pow(p[1] - a[1], 2));
  var t = PJ.limitar(((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / tam2, 0, 1);
  var px = a[0] + t * dx;
  var py = a[1] + t * dy;
  return Math.sqrt(Math.pow(p[0] - px, 2) + Math.pow(p[1] - py, 2));
}

// ---------------------------------------------------------- desenhar na tela

function caminhoDe(m, pontos) {
  return pontos.map(function (p, i) {
    var q = PJ.paraDesenho(m, p[0], p[1]);
    return (i === 0 ? 'M' : 'L') + (Math.round(q[0] * 100) / 100) + ' ' + (Math.round(q[1] * 100) / 100);
  }).join(' ');
}

function pontaDaSeta(m, pontos) {
  var n = pontos.length;
  var fim = PJ.paraDesenho(m, pontos[n - 1][0], pontos[n - 1][1]);
  var antes = PJ.paraDesenho(m, pontos[n - 2][0], pontos[n - 2][1]);
  var dx = fim[0] - antes[0];
  var dy = fim[1] - antes[1];
  var tam = Math.sqrt(dx * dx + dy * dy);
  if (tam < 0.001) return '';
  dx /= tam; dy /= tam;
  var C = 4.5, A = 2.6;          // comprimento e meia largura da ponta
  var px = -dy, py = dx;
  return [
    fim[0] + ',' + fim[1],
    (fim[0] - dx * C + px * A) + ',' + (fim[1] - dy * C + py * A),
    (fim[0] - dx * C - px * A) + ',' + (fim[1] - dy * C - py * A),
  ].join(' ');
}

PJ.desenharSetas = function () {
  var m = PJ.modalidade();
  var lista = PJ.campo().setas.slice();
  if (traco) lista.push(traco);
  elSetas.setAttribute('viewBox', '0 0 100 ' + (Math.round(m.alturaVB * 1000) / 1000));
  elSetas.setAttribute('preserveAspectRatio', 'none');

  elSetas.innerHTML = lista.map(function (t) {
    var cor = PJ.CORES_SETA[t.cor] || PJ.CORES_SETA.amarelo;
    var partes = ['<path d="' + caminhoDe(m, t.pontos) + '" fill="none" stroke="' + cor +
      '" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>'];
    if (t.tipo === 'seta' && t.pontos.length > 1) {
      var ponta = pontaDaSeta(m, t.pontos);
      if (ponta) partes.push('<polygon points="' + ponta + '" fill="' + cor + '"/>');
    }
    return partes.join('');
  }).join('');
};

PJ.apagarUltimaSeta = function () {
  var c = PJ.campo();
  if (!c.setas.length) return false;
  PJ.antes('apagar seta');
  c.setas.pop();
  PJ.atualizar();
  return true;
};

PJ.limparSetas = function () {
  var c = PJ.campo();
  if (!c.setas.length) return false;
  PJ.antes('apagar setas');
  c.setas = [];
  PJ.atualizar();
  return true;
};

// ------------------------------------------- redesenhar as setas na foto

PJ.desenharSetasCanvas = function (ctx, ox, oy, larg, alt, setas) {
  var u = larg / 100;
  setas.forEach(function (t) {
    var cor = PJ.CORES_SETA[t.cor] || PJ.CORES_SETA.amarelo;
    var pts = t.pontos.map(function (p) {
      return [ox + (p[0] / 100) * larg, oy + ((100 - p[1]) / 100) * alt];
    });
    if (pts.length < 2) return;
    ctx.save();
    ctx.strokeStyle = cor;
    ctx.fillStyle = cor;
    ctx.lineWidth = 1.6 * u;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    pts.forEach(function (p, i) { if (i === 0) ctx.moveTo(p[0], p[1]); else ctx.lineTo(p[0], p[1]); });
    ctx.stroke();
    if (t.tipo === 'seta') {
      var fim = pts[pts.length - 1];
      var antes = pts[pts.length - 2];
      var dx = fim[0] - antes[0];
      var dy = fim[1] - antes[1];
      var tam = Math.sqrt(dx * dx + dy * dy);
      if (tam > 0.5) {
        dx /= tam; dy /= tam;
        var C = 4.5 * u, A = 2.6 * u, px = -dy, py = dx;
        ctx.beginPath();
        ctx.moveTo(fim[0], fim[1]);
        ctx.lineTo(fim[0] - dx * C + px * A, fim[1] - dy * C + py * A);
        ctx.lineTo(fim[0] - dx * C - px * A, fim[1] - dy * C - py * A);
        ctx.closePath();
        ctx.fill();
      }
    }
    ctx.restore();
  });
};
