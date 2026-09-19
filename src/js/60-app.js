// Liga tudo: abre o aplicativo, desenha a tela e cuida das dicas.

PJ.atualizar = function () {
  PJ.salvar();
  PJ.render();
};

PJ.render = function () {
  var m = PJ.modalidade();
  var c = PJ.campo();

  var nomeTime = document.getElementById('btNomeTime');
  nomeTime.textContent = PJ.estado.nomeTime;
  nomeTime.setAttribute('aria-label', 'Time: ' + PJ.estado.nomeTime + '. Toque para trocar o nome.');
  document.getElementById('btDesfazer').disabled = !PJ.temDesfazer();

  // tudo que muda a altura da tela vem ANTES de medir o campo, senão ele
  // é calculado com a medida velha e acaba passando por cima da barra
  PJ.mostrarChipModalidade();
  PJ.mostrarBarraJogador();

  var faltam = m.emCampo - c.emCampo.length;
  var selo = document.getElementById('seloContagem');
  selo.hidden = faltam <= 0;
  selo.textContent = 'Faltam ' + faltam + ' — toque em Banco';
  selo.classList.add('falta');

  var fora = PJ.banco().length;
  document.getElementById('quantosBanco').textContent = fora + ' fora';

  if (PJ.painelAberto) PJ.recarregarPainel();

  PJ.desenharListaLado();
  PJ.ajustarPalco();
  PJ.montarCampoSVG(document.getElementById('linhas'), m);
  PJ.desenharSetas();
  PJ.desenharPecas();
  PJ.marcarBarra();
};

// Só o campo escolhido aparece no alto da tela; tocar nele abre a escolha.
PJ.mostrarChipModalidade = function () {
  var m = PJ.modalidade();
  document.getElementById('nomeModalidade').textContent = m.nome;
  document.getElementById('quantosCampo').textContent = m.emCampo + ' em campo';
  document.getElementById('btModalidade').setAttribute('aria-label',
    'Tipo de campo: ' + m.nome + '. Toque para trocar.');
};

// O campo sempre em pé, do maior tamanho que couber na tela.
PJ.ajustarPalco = function () {
  var area = document.getElementById('areaCampo');
  var m = PJ.modalidade();
  var lado = document.getElementById('listaLado');
  var larguraLado = lado && lado.offsetWidth ? lado.offsetWidth + 18 : 0;
  var disponivelL = area.clientWidth - larguraLado;
  var disponivelA = area.clientHeight;
  if (disponivelL <= 0 || !disponivelA) return;

  var larg = Math.min(disponivelL, disponivelA * m.proporcao);
  var alt = larg / m.proporcao;
  PJ.elPalco.style.width = Math.floor(larg) + 'px';
  PJ.elPalco.style.height = Math.floor(alt) + 'px';
  PJ.elPalco.dataset.superficie = m.superficie;
  PJ.elPalco.dataset.modalidade = m.id;

  // peça grande o bastante para o dedo, pequena o bastante para caber
  var proporcaoDisco = m.id === 'futsal' ? 0.17 : (m.id === 'society' ? 0.145 : 0.125);
  var disco = PJ.limitar(larg * proporcaoDisco, 42, 68);
  PJ.elPalco.style.setProperty('--disco', Math.round(disco) + 'px');
  PJ.medirPalco();
};

PJ.trocarModalidade = function (id) {
  if (id === PJ.estado.modalidade) return;
  PJ.antes('trocar tipo de campo');
  PJ.estado.modalidade = id;
  PJ.selecionado = null;
  var m = PJ.modalidade();
  var c = PJ.campo();
  var antes = c.emCampo.length;
  if (c.emCampo.length < m.emCampo) PJ.completarEscalacao();
  if (PJ.estado.adversario) PJ.montarAdversarios();
  PJ.atualizar();

  var fora = PJ.banco().length;
  var msg = 'No ' + m.nome + ' jogam ' + m.emCampo + '.';
  if (fora > 0) msg += ' Os outros ' + fora + ' estão no banco — ninguém foi apagado.';
  if (c.emCampo.length > antes) msg += ' Coloquei mais gente em campo para completar.';
  if (c.emCampo.length < m.emCampo) msg += ' Ainda faltam ' + (m.emCampo - c.emCampo.length) + '.';
  PJ.aviso(msg, 'Desfazer', PJ.desfazerAcao);
};

PJ.desfazerAcao = function () {
  var rotulo = PJ.desfazer();
  if (!rotulo) return;
  PJ.selecionado = null;
  PJ.aplicarTema();
  PJ.render();
  PJ.anunciar('Desfeito: ' + rotulo);
};

PJ.atualizarDesfazer = function () {
  var b = document.getElementById('btDesfazer');
  if (b) b.disabled = !PJ.temDesfazer();
};

// --------------------------------------------------------------- tela
// Um dono só para o visual: 'auto' segue o celular até ele escolher,
// depois quem manda é a escolha dele.

PJ.OPCOES_TELA = [
  { id: 'normal', nome: 'Normal', explica: 'O jeito comum, para usar em qualquer lugar.' },
  { id: 'sol', nome: 'Para o sol', explica: 'Fundo branco, letra preta e botão maior, para ler no sol forte.' },
  { id: 'noite', nome: 'Para a noite', explica: 'Fundo escuro, para jogo à noite e para não cansar a vista.' },
];

PJ.nomeDaTela = function () {
  var atual = PJ.estado.tela;
  if (atual === 'auto') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'Para a noite' : 'Normal';
  }
  for (var i = 0; i < PJ.OPCOES_TELA.length; i++) {
    if (PJ.OPCOES_TELA[i].id === atual) return PJ.OPCOES_TELA[i].nome;
  }
  return 'Normal';
};

PJ.aplicarTema = function () {
  var raiz = document.documentElement;
  var t = PJ.estado.tela;
  raiz.setAttribute('data-sol', t === 'sol' ? '1' : '0');
  if (t === 'noite') raiz.setAttribute('data-theme', 'dark');
  else if (t === 'normal' || t === 'sol') raiz.setAttribute('data-theme', 'light');
  else raiz.removeAttribute('data-theme');
};

PJ.PAINEIS.tela = {
  titulo: function () { return 'Tela'; },
  montar: function (corpo) {
    corpo.appendChild(PJ.cria('p', 'explica', 'Escolha como a tela fica melhor de ler agora.'));
    PJ.OPCOES_TELA.forEach(function (o) {
      var b = PJ.cria('button', 'escolhaEstilo');
      b.type = 'button';
      b.appendChild(document.createTextNode((PJ.nomeDaTela() === o.nome ? '✓ ' : '') + o.nome));
      b.appendChild(PJ.cria('span', null, o.explica));
      b.setAttribute('aria-pressed', PJ.nomeDaTela() === o.nome ? 'true' : 'false');
      b.addEventListener('click', function () {
        PJ.estado.tela = o.id;
        PJ.aplicarTema();
        PJ.salvar();
        PJ.recarregarPainel();
      });
      corpo.appendChild(b);
    });
    corpo.appendChild(PJ.bt('Pronto', 'principal larga', function () {
      if (PJ.pilhaPaineis.length) PJ.voltarPainel(); else PJ.fecharPainel();
    }));
  },
};

// -------------------------------------------------------------- dicas

var TEXTOS_DICA = [
  {
    texto: 'Arraste os jogadores com o dedo para montar o time.',
    botoes: [['Entendi', function () { PJ.passarDica(1); }]],
  },
  {
    texto: 'Isso mesmo! Agora ponha os nomes do seu time.',
    botoes: [
      ['Colocar meus nomes', function () { PJ.passarDica(2); PJ.abrirPainel('meutime'); }],
      ['Depois', function () { PJ.passarDica(2); }],
    ],
  },
  {
    texto: 'Errou? Toque em Desfazer, aqui em cima. Nada se perde.',
    botoes: [['Começar', function () { PJ.passarDica(99); }]],
  },
];

PJ.mostrarDica = function () {
  var caixa = document.getElementById('dica');
  var passo = PJ.estado.dicas;
  if (passo == null || passo > 2) { caixa.hidden = true; return; }
  var d = TEXTOS_DICA[passo];
  caixa.textContent = '';
  caixa.appendChild(PJ.cria('p', null, d.texto));
  var linha = PJ.cria('div', 'linhaBotoes');
  d.botoes.forEach(function (par) { linha.appendChild(PJ.bt(par[0], 'principal', par[1])); });
  caixa.appendChild(linha);
  caixa.hidden = false;
};

PJ.passarDica = function (n) {
  PJ.estado.dicas = n;
  PJ.salvar();
  PJ.mostrarDica();
};

// Quando o treinador arrasta pela primeira vez, a dica avança sozinha.
PJ.contarGesto = function (tipo) {
  if (tipo === 'mover' && PJ.estado.dicas === 0) PJ.passarDica(1);
};

// --------------------------------------------------------------- boot

function ligarBotoes() {
  document.getElementById('btDesfazer').addEventListener('click', PJ.desfazerAcao);

  document.getElementById('btNomeTime').addEventListener('click', function () {
    PJ.pedirTexto('Nome do time', PJ.estado.nomeTime, function (v) {
      PJ.antes('nome do time');
      PJ.estado.nomeTime = v;
      PJ.atualizar();
    });
  });

  var abrirOuFechar = function (id) {
    return function () {
      if (PJ.painelAberto === id && !PJ.telaGrande()) { PJ.fecharPainel(); return; }
      PJ.abrirPainel(id);
    };
  };
  document.getElementById('btModalidade').addEventListener('click', abrirOuFechar('modalidade'));
  document.getElementById('btConfigurar').addEventListener('click', abrirOuFechar('configurar'));
  document.getElementById('btBanco').addEventListener('click', abrirOuFechar('banco'));
  document.getElementById('btTaticas').addEventListener('click', abrirOuFechar('taticas'));
  document.getElementById('btDesenhar').addEventListener('click', function () {
    PJ.trocarModoDesenho(!PJ.modoDesenho);
    if (!PJ.modoDesenho) PJ.fecharPainel();
  });

  var fechar = function () {
    if (PJ.pilhaPaineis.length) { PJ.voltarPainel(); return; }
    if (PJ.modoDesenho) PJ.trocarModoDesenho(false);
    PJ.fecharPainel();
  };
  document.getElementById('btFecharFolha').addEventListener('click', fechar);
  document.getElementById('cortina').addEventListener('click', fechar);
  document.addEventListener('keydown', function (ev) { if (ev.key === 'Escape') fechar(); });

  var aoRedimensionar = function () {
    PJ.ajustarPalco();
    PJ.desenharSetas();
    PJ.desenharPecas();
    if (PJ.telaGrande() && !PJ.painelAberto) PJ.abrirPainel('banco');
  };
  window.addEventListener('resize', aoRedimensionar);
  window.addEventListener('orientationchange', aoRedimensionar);

  // qualquer coisa que mexa na altura da área do campo (barra do jogador,
  // teclado, faixa de aviso) manda o campo se reajustar
  if (window.ResizeObserver) {
    var ultimo = '';
    new window.ResizeObserver(function () {
      var area = document.getElementById('areaCampo');
      var agora = area.clientWidth + 'x' + area.clientHeight;
      if (agora === ultimo) return;
      ultimo = agora;
      PJ.ajustarPalco();
      PJ.desenharSetas();
      PJ.desenharPecas();
    }).observe(document.getElementById('areaCampo'));
  }
}

function comecar() {
  PJ.elPalco = document.getElementById('palco');
  PJ.elPecas = document.getElementById('pecas');

  var primeiraVez = PJ.carregar();
  if (PJ.estado.adversario) PJ.montarAdversarios();

  PJ.aplicarTema();
  PJ.ligarDesenho();
  PJ.ligarGestos();
  PJ.ligarGravacaoSegura();
  ligarBotoes();

  PJ.render();

  if (PJ.semMemoria) {
    PJ.aviso('Este navegador não deixa guardar nada. Enquanto a aba estiver aberta funciona, mas guarde uma cópia em Mais > Ajustes.');
  }
  if (primeiraVez) PJ.estado.dicas = 0;
  PJ.mostrarDica();
  if (!primeiraVez) {
    if (PJ.deOndeVeio === 'copia') {
      PJ.aviso('A gravação principal falhou, mas o seu time estava na segunda via e foi recuperado.');
    } else if (PJ.deOndeVeio === 'antiga') {
      PJ.aviso('Encontrei o seu time guardado por uma versão anterior e trouxe de volta.');
    } else {
      PJ.aviso('Tudo como você deixou.');
    }
    // depois que o elenco já é dele, lembra uma vez de guardar a cópia
    if (!PJ.estado.lembreiCopia && PJ.estado.elenco.length &&
        PJ.quantosDeExemplo() === 0) {
      PJ.estado.lembreiCopia = true;
      PJ.salvar();
      window.setTimeout(function () {
        PJ.aviso('Guarde uma cópia do seu time em Configurar. É o que salva você se trocar de celular ou limpar o navegador.',
          'Guardar agora', function () { PJ.abrirPainel('configurar'); });
      }, 2500);
    }
  }

  if (PJ.telaGrande()) PJ.abrirPainel('banco');

  // ajusta de novo depois que a fonte carregar, senão o campo fica torto
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () { PJ.ajustarPalco(); });
  }
  window.setTimeout(PJ.ajustarPalco, 120);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', comecar);
} else {
  comecar();
}
