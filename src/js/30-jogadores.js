// As pecas dos jogadores em cima do campo e o arrastar com o dedo.
// Regra de ouro: o aplicativo só conhece porcentagem (0 a 100).
// Pixel só existe dentro do gesto e morre quando o dedo solta.

PJ.selecionado = null;   // id do jogador escolhido para a troca
PJ.elPalco = null;
PJ.elPecas = null;

var gesto = null;        // arraste em andamento
var retangulo = null;    // medida do campo, guardada uma vez só
var cliqueMorto = false;

PJ.primeiroNome = function (nome) {
  var limpo = String(nome || '').trim().replace(/\s+/g, ' ');
  var curto = limpo.split(' ')[0] || 'Jogador';
  return curto.length > 9 ? curto.slice(0, 9) : curto;
};

PJ.medirPalco = function () {
  retangulo = PJ.elPalco.getBoundingClientRect();
  return retangulo;
};

function rect() {
  if (!retangulo || !retangulo.width) PJ.medirPalco();
  return retangulo;
}

function pontoParaCampo(clientX, clientY) {
  var r = rect();
  return {
    x: ((clientX - r.left) / r.width) * 100,
    y: 100 - ((clientY - r.top) / r.height) * 100,
  };
}
PJ.pontoParaCampo = pontoParaCampo;

var arred = function (v) { return Math.round(v * 10) / 10; };

// ------------------------------------------------------------ desenhar

function criarPeca(dados) {
  var el = document.createElement('button');
  el.type = 'button';
  el.className = 'peca' + (dados.adversario ? ' adversaria' : '');
  el.dataset.id = dados.id;
  if (dados.adversario) el.dataset.adversario = '1';
  el.style.setProperty('--x', arred(dados.x) + '%');
  el.style.setProperty('--y', arred(100 - dados.y) + '%');
  // perto da lateral, a plaquinha do nome entra para dentro do campo


  var disco = document.createElement('span');
  disco.className = 'disco';
  if (!dados.adversario) {
    var sigla = document.createElement('span');
    sigla.className = 'sigla';
    sigla.textContent = dados.sigla;
    disco.appendChild(sigla);
  }
  var num = document.createElement('span');
  num.className = 'num';
  num.textContent = dados.numero == null ? '' : String(dados.numero);
  disco.appendChild(num);
  el.appendChild(disco);

  if (dados.capitao) {
    var faixa = document.createElement('span');
    faixa.className = 'faixa';
    faixa.textContent = 'C';
    faixa.setAttribute('aria-hidden', 'true');
    el.appendChild(faixa);
  }

  if (dados.adversario) {
    el.setAttribute('aria-label', 'Adversário ' + dados.numero + '. Arraste para mudar de lugar.');
  } else {
    var placa = dados.placa && dados.placa.oculta ? null : document.createElement('span');
    if (placa) {
    placa.className = 'placa';
    placa.textContent = PJ.primeiroNome(dados.nome);
    if (dados.placa) {
      placa.style.maxWidth = Math.round(dados.placa.largura) + 'px';
      placa.style.left = Math.round(dados.placa.esquerda) + 'px';
      placa.style.fontSize = dados.placa.letra + 'px';
      if (dados.placa.acima) el.dataset.placa = 'acima';
    }
    el.appendChild(placa);
    }
    el.setAttribute('aria-label', dados.nome + ', ' +
      (PJ.POSICOES[dados.sigla] ? PJ.POSICOES[dados.sigla].nome : dados.sigla) +
      ', camisa ' + dados.numero + (dados.capitao ? ', capitão' : '') +
      '. Arraste para mudar de lugar.');
  }
  return el;
}

PJ.desenharPecas = function () {
  var c = PJ.campo();
  var m = PJ.modalidade();
  var novo = document.createDocumentFragment();
  var placas = medidasDaPlaca(c.emCampo, PJ.elPalco.clientWidth || 340,
    PJ.elPalco.clientHeight || 520, tamanhoDoDisco());

  c.emCampo.forEach(function (p) {
    var j = PJ.jogadorPorId(p.id);
    if (!j) return;
    var el = criarPeca({
      id: p.id, x: p.x, y: p.y, sigla: j.posicao,
      numero: j.numero, nome: j.nome, placa: placas[p.id],
      capitao: PJ.ehCapitao(p.id),
    });
    if (PJ.selecionado === p.id) el.classList.add('escolhida');
    novo.appendChild(el);
  });

  if (PJ.estado.adversario) {
    c.adversarios.forEach(function (a, i) {
      novo.appendChild(criarPeca({ id: 'adv' + i, x: a.x, y: a.y, numero: a.n, adversario: true }));
    });
  }

  PJ.elPecas.textContent = '';
  PJ.elPecas.appendChild(novo);
};

PJ.montarAdversarios = function () {
  var c = PJ.campo();
  var m = PJ.modalidade();
  if (c.adversarios.length === m.emCampo) return;
  var f = m.formacoes[0];
  c.adversarios = f.jogadores.map(function (slot, i) {
    return { n: i + 1, x: 100 - slot[1], y: 100 - slot[2] };
  });
};

function tamanhoDoDisco() {
  var v = parseFloat(getComputedStyle(PJ.elPalco).getPropertyValue('--disco'));
  return Number.isFinite(v) ? v : 52;
}

// Numa fileira de quatro zagueiros as plaquinhas de nome se encavalam, e
// a do lateral ainda cai para fora do campo. Cada plaquinha ganha aqui uma
// faixa própria — do meio do caminho até o vizinho da esquerda ao meio do
// caminho até o da direita, sem passar da linha lateral. Quando o time
// fica muito apertado a letra diminui, mas um nome nunca cobre o outro.
var ALTURA_PLACA = 24;

PJ.medidasDaPlaca = function () {
  return medidasDaPlaca.apply(null, arguments);
};

function medidasDaPlaca(lista, larguraCampo, alturaCampo, disco, alturaPlaca) {
  var altura = alturaPlaca || ALTURA_PLACA;
  var folgaMinima = altura < 40 ? 30 : altura * 0.9;
  // 1) onde cada nome vai ficar: embaixo do disco, ou em cima dele quando
  //    o jogador está colado na linha de fundo
  var pontos = lista.map(function (p) {
    var cy = ((100 - p.y) / 100) * alturaCampo;
    var acima = cy + disco / 2 + 4 + altura > alturaCampo;
    var topo = acima ? cy - disco / 2 - 4 - altura : cy + disco / 2 + 4;
    return {
      id: p.id,
      cx: (p.x / 100) * larguraCampo,
      acima: acima,
      topo: topo,
      base: topo + altura,
    };
  });

  // 2) cada nome só disputa espaço com quem ficou na mesma altura de tela
  var medidas = {};
  pontos.forEach(function (p) {
    var limEsq = 2;
    var limDir = larguraCampo - 2;
    pontos.forEach(function (o) {
      if (o === p) return;
      if (o.base <= p.topo || o.topo >= p.base) return;  // alturas não se cruzam
      // quando dois estão na mesma coluna (goleiro e zagueiro central, por
      // exemplo) o desempate é pelo id, senão nenhum dos dois cede espaço
      var ehEsquerda = o.cx < p.cx || (o.cx === p.cx && o.id < p.id);
      if (ehEsquerda) limEsq = Math.max(limEsq, (o.cx + p.cx) / 2 + 3);
      else limDir = Math.min(limDir, (o.cx + p.cx) / 2 - 3);
    });
    var folga = limDir - limEsq;
    // sem espaço nem para duas letras, o nome sai de cena em vez de cobrir
    // o do companheiro — o disco continua mostrando número e posição, e o
    // nome inteiro aparece ao tocar no jogador
    if (folga < folgaMinima) { medidas[p.id] = { oculta: true, acima: p.acima }; return; }
    var largura = Math.min(folga, altura < 40 ? 104 : altura * 4.4);
    var esquerda = PJ.limitar(p.cx - largura / 2, limEsq, limDir - largura);
    medidas[p.id] = {
      largura: largura,
      esquerda: esquerda - (p.cx - disco / 2),
      esquerdaNoCampo: esquerda,
      topo: p.topo,
      letra: largura < 44 ? 10 : (largura < 58 ? 11 : 12.5),
      acima: p.acima,
    };
  });
  return medidas;
}

// ------------------------------------------------------------- arrastar

var LIMIAR = 7; // px antes de virar arraste, para mão tremida ou com luva

function acharEmCampo(id) {
  var lista = PJ.campo().emCampo;
  for (var i = 0; i < lista.length; i++) if (lista[i].id === id) return lista[i];
  return null;
}

function margens(el) {
  var r = rect();
  var t = el.getBoundingClientRect();
  return {
    x: ((t.width / 2) / r.width) * 100,
    y: ((t.height / 2) / r.height) * 100,
  };
}

function comecarArraste(ev) {
  var el = ev.target.closest('.peca');
  if (!el) return;

  var adversario = el.dataset.adversario === '1';
  var alvo = adversario
    ? PJ.campo().adversarios[parseInt(el.dataset.id.slice(3), 10)]
    : acharEmCampo(el.dataset.id);
  if (!alvo) return;

  PJ.medirPalco();
  var m = margens(el);
  gesto = {
    tipo: 'peca',
    pid: ev.pointerId,
    el: el,
    id: el.dataset.id,
    adversario: adversario,
    alvo: alvo,
    x0: alvo.x,
    y0: alvo.y,
    px0: ev.clientX,
    py0: ev.clientY,
    margemX: m.x,
    margemY: m.y,
    moveu: false,
    atual: { x: alvo.x, y: alvo.y },
    quadro: 0,
    ultimo: null,
  };
  try { el.setPointerCapture(ev.pointerId); } catch (err) { /* segue sem captura */ }
  el.style.willChange = 'transform';
  ev.preventDefault();
}

function pintar() {
  if (!gesto || gesto.tipo !== 'peca') return;
  gesto.quadro = 0;
  var ev = gesto.ultimo;
  if (!ev) return;
  var r = rect();

  var dxPx = ev.clientX - gesto.px0;
  var dyPx = ev.clientY - gesto.py0;
  if (!gesto.moveu && Math.sqrt(dxPx * dxPx + dyPx * dyPx) > LIMIAR) {
    gesto.moveu = true;
    gesto.el.classList.add('carregando');
    PJ.marcarOrigem(gesto.x0, gesto.y0);
    PJ.vibrar(15);
  }
  if (!gesto.moveu) return;

  var px = PJ.limitar(gesto.x0 + (dxPx / r.width) * 100, gesto.margemX, 100 - gesto.margemX);
  var py = PJ.limitar(gesto.y0 - (dyPx / r.height) * 100, gesto.margemY, 100 - gesto.margemY);
  gesto.atual = { x: px, y: py };

  var mostraX = ((px - gesto.x0) / 100) * r.width;
  var mostraY = (-(py - gesto.y0) / 100) * r.height;
  gesto.el.style.transform =
    'translate(-50%,-50%) translate3d(' + mostraX + 'px,' + mostraY + 'px,0) scale(1.1)';
}

function seguirArraste(ev) {
  if (!gesto || gesto.tipo !== 'peca' || ev.pointerId !== gesto.pid) return;
  ev.preventDefault();
  gesto.ultimo = ev;
  if (!gesto.quadro) gesto.quadro = window.requestAnimationFrame(pintar);
}

function soltarArraste(ev) {
  if (!gesto || gesto.tipo !== 'peca' || ev.pointerId !== gesto.pid) return;
  var g = gesto;
  var noBanco = !g.adversario && g.moveu && PJ.soltouNoBanco(ev.clientX, ev.clientY);
  encerrarGesto();

  if (!g.moveu) {                       // foi só um toque: escolhe o jogador
    if (!g.adversario) PJ.escolherJogador(g.id);
    else PJ.desenharPecas();
    return;
  }

  cliqueMorto = true;
  window.setTimeout(function () { cliqueMorto = false; }, 400);

  if (noBanco) {
    PJ.antes('tirar do campo');
    var j = PJ.jogadorPorId(g.id);
    PJ.tirarDoCampo(g.id);
    PJ.atualizar();
    PJ.aviso(PJ.primeiroNome(j ? j.nome : '') + ' foi para o banco.', 'Desfazer', PJ.desfazerAcao);
    return;
  }

  PJ.antes('mover jogador');
  g.alvo.x = arred(g.atual.x);
  g.alvo.y = arred(g.atual.y);
  if (!g.adversario) {
    PJ.fixarComoBase();
    PJ.campo().estilo = 'padrao';
  }
  PJ.vibrar(10);
  PJ.atualizar();
  PJ.contarGesto('mover');
  if (!g.adversario) PJ.ofereceTrocarPosicao(g.id, g.alvo.x, g.alvo.y);
}

// Se o sistema tomar o gesto (ligacao, notificacao, gesto de navegacao),
// grava onde o jogador estava — nunca devolve para trás sem avisar.
function abortarArraste(ev) {
  if (!gesto || gesto.tipo !== 'peca') return;
  if (ev && ev.pointerId !== gesto.pid) return;
  var g = gesto;
  encerrarGesto();
  if (!g.moveu) { PJ.desenharPecas(); return; }
  PJ.antes('mover jogador');
  g.alvo.x = arred(g.atual.x);
  g.alvo.y = arred(g.atual.y);
  if (!g.adversario) PJ.fixarComoBase();
  PJ.atualizar();
}

function encerrarGesto() {
  if (!gesto) return;
  var g = gesto;
  gesto = null;                       // zera antes de mexer no elemento, senao o
  if (g.quadro) window.cancelAnimationFrame(g.quadro); // lostpointercapture reentra
  if (g.el) {
    g.el.classList.remove('carregando');
    g.el.style.transform = '';
    g.el.style.willChange = '';
    try { g.el.releasePointerCapture(g.pid); } catch (err) { /* já soltou */ }
  }
  PJ.limparOrigem();
}

PJ.soltouNoBanco = function (x, y) {
  var el = document.elementFromPoint(x, y);
  return !!(el && el.closest('#zonaBanco'));
};

// ---------------------------------------------------- roteador do palco

PJ.ligarGestos = function () {
  PJ.elPalco.addEventListener('pointerdown', function (ev) {
    if (!ev.isPrimary) return;                                   // ignora segundo dedo
    if (ev.pointerType === 'mouse' && ev.button !== 0) return;
    if (gesto) return;
    if (PJ.modoDesenho) { PJ.desenhoComecar(ev); return; }
    comecarArraste(ev);
  }, { passive: false });

  PJ.elPalco.addEventListener('pointermove', function (ev) {
    if (!gesto) { PJ.desenhoSeguir(ev); return; }
    seguirArraste(ev);
  }, { passive: false });

  PJ.elPalco.addEventListener('pointerup', function (ev) {
    if (!gesto) { PJ.desenhoTerminar(ev); return; }
    soltarArraste(ev);
  });

  PJ.elPalco.addEventListener('pointercancel', function (ev) {
    if (!gesto) { PJ.desenhoCancelar(ev); return; }
    abortarArraste(ev);
  });
  PJ.elPalco.addEventListener('lostpointercapture', function (ev) { abortarArraste(ev); });
  PJ.elPalco.addEventListener('contextmenu', function (ev) { ev.preventDefault(); });
  PJ.elPalco.addEventListener('dragstart', function (ev) { ev.preventDefault(); });

  // mata o clique fantasma que o navegador manda depois de um arraste
  PJ.elPalco.addEventListener('click', function (ev) {
    if (cliqueMorto) { ev.stopPropagation(); ev.preventDefault(); cliqueMorto = false; }
  }, true);

  // teclado: mover o jogador com as setas
  PJ.elPecas.addEventListener('keydown', function (ev) {
    var el = ev.target.closest('.peca');
    if (!el) return;
    var passo = ev.shiftKey ? 6 : 2;
    var d = { ArrowLeft: [-passo, 0], ArrowRight: [passo, 0], ArrowUp: [0, passo], ArrowDown: [0, -passo] }[ev.key];
    if (!d) return;
    ev.preventDefault();
    var adversario = el.dataset.adversario === '1';
    var alvo = adversario
      ? PJ.campo().adversarios[parseInt(el.dataset.id.slice(3), 10)]
      : acharEmCampo(el.dataset.id);
    if (!alvo) return;
    PJ.antes('mover jogador');
    alvo.x = arred(PJ.limitar(alvo.x + d[0], 3, 97));
    alvo.y = arred(PJ.limitar(alvo.y + d[1], 3, 97));
    if (!adversario) {
      PJ.fixarComoBase();
      var j = PJ.jogadorPorId(alvo.id);
      PJ.anunciar((j ? j.nome : 'Jogador') + ' movido');
    }
    PJ.atualizar();
    var volta = PJ.elPecas.querySelector('.peca[data-id="' + el.dataset.id + '"]');
    if (volta) volta.focus();
  });

  // a medida do campo muda quando gira a tela, abre o teclado ou some a
  // barra do navegador: remede nesses momentos, nunca a cada movimento
  var remedir = function () { if (PJ.elPalco.isConnected) PJ.medirPalco(); };
  window.addEventListener('resize', remedir);
  window.addEventListener('orientationchange', remedir);
  window.addEventListener('scroll', remedir, true);
  if (window.ResizeObserver) new window.ResizeObserver(remedir).observe(PJ.elPalco);
  if (window.visualViewport) window.visualViewport.addEventListener('resize', remedir);
};

PJ.marcarOrigem = function (x, y) {
  var marca = document.getElementById('origem');
  marca.style.setProperty('--x', arred(x) + '%');
  marca.style.setProperty('--y', arred(100 - y) + '%');
  marca.hidden = false;
};
PJ.limparOrigem = function () {
  var marca = document.getElementById('origem');
  if (marca) marca.hidden = true;
};

PJ.vibrar = function (ms) {
  try { if (navigator.vibrate) navigator.vibrate(ms); } catch (err) { /* sem vibracao */ }
};

// ------------------------------------------------- entrar, sair e trocar

PJ.tirarDoCampo = function (id) {
  var c = PJ.campo();
  c.emCampo = c.emCampo.filter(function (p) { return p.id !== id; });
  c.base = null;
  if (PJ.selecionado === id) PJ.selecionado = null;
};

PJ.colocarEmCampo = function (id) {
  var c = PJ.campo();
  if (PJ.estaEmCampo(id)) return;
  var vagas = PJ.vagasDaFormacao(PJ.formacaoPorId(c.formacao));
  var jogador = PJ.jogadorPorId(id);
  var livre = null;
  // primeiro procura a vaga da posição dele; senão, a primeira vaga vazia
  [true, false].forEach(function (exigirPosicao) {
    if (livre) return;
    for (var k = 0; k < vagas.length; k++) {
      var v = vagas[k];
      if (exigirPosicao && (!jogador || jogador.posicao !== v.sigla)) continue;
      var ocupada = c.emCampo.some(function (p) {
        return Math.abs(p.x - v.x) < 7 && Math.abs(p.y - v.y) < 7;
      });
      if (!ocupada) { livre = v; return; }
    }
  });
  if (!livre) livre = { sigla: 'MEI', x: 50, y: 50 };
  c.emCampo.push({ id: id, x: livre.x, y: livre.y });
  if (jogador && !PJ.POSICOES[jogador.posicao]) jogador.posicao = livre.sigla;
  c.base = null;
};

PJ.trocarJogador = function (idSai, idEntra) {
  var c = PJ.campo();
  var lugar = null;
  for (var i = 0; i < c.emCampo.length; i++) if (c.emCampo[i].id === idSai) lugar = c.emCampo[i];
  if (!lugar) return false;
  lugar.id = idEntra;
  if (c.base) c.base.forEach(function (p) { if (p.id === idSai) p.id = idEntra; });
  // quem entra herda a posição de quem saiu, se ainda não tiver uma
  var quemEntra = PJ.jogadorPorId(idEntra);
  var quemSai = PJ.jogadorPorId(idSai);
  if (quemEntra && quemSai && !PJ.POSICOES[quemEntra.posicao]) quemEntra.posicao = quemSai.posicao;
  return true;
};
