// As gavetas do aplicativo: banco, táticas, desenhar, meu time, mandar a
// escalação, anotações do jogo e ajustes.

// ------------------------------------------------------ ajudantes de tela

function cria(tag, classe, texto) {
  var el = document.createElement(tag);
  if (classe) el.className = classe;
  if (texto != null) el.textContent = texto;
  return el;
}

function bt(texto, classe, aoTocar, quantos) {
  var b = cria('button', 'bt ' + (classe || ''));
  b.type = 'button';
  b.appendChild(document.createTextNode(texto));
  if (quantos) b.appendChild(cria('span', 'quantos', quantos));
  if (aoTocar) b.addEventListener('click', aoTocar);
  return b;
}

function secao(titulo) {
  var d = cria('div', 'secao');
  if (titulo) d.appendChild(cria('p', 'rotulo', titulo));
  return d;
}

function texto(t, classe) {
  return cria('p', classe || 'explica', t);
}

PJ.cria = cria;
PJ.bt = bt;

// -------------------------------------------------------------- recados

PJ.aviso = function (msg, rotulo, acao) {
  var caixa = document.getElementById('tarjas');
  var t = cria('div', 'tarja boa');
  t.appendChild(cria('p', null, msg));
  if (rotulo && acao) {
    t.appendChild(bt(rotulo, 'pequena', function () { t.remove(); acao(); }));
  }
  t.appendChild(bt('Ok', 'pequena', function () { t.remove(); }));
  caixa.appendChild(t);
  window.setTimeout(function () { if (t.isConnected) t.remove(); }, 12000);
};

PJ.anunciar = function (msg) {
  var a = document.getElementById('anuncio');
  if (a) a.textContent = msg;
};

PJ.avisarSalvo = function (deuCerto) {
  var r = document.getElementById('rodapeSalvo');
  if (!r) return;
  if (deuCerto) {
    r.textContent = 'Tudo salvo neste aparelho';
    r.removeAttribute('data-falhou');
  } else {
    r.textContent = 'Não consegui salvar aqui. Guarde uma cópia em Configurar.';
    r.setAttribute('data-falhou', '1');
  }
};

// Pergunta com duas saídas, sempre com o verbo da ação escrito no botão.
PJ.perguntar = function (msg, rotuloSim, aoConfirmar, perigoso) {
  var caixa = document.getElementById('tarjas');
  var t = cria('div', 'tarja atencao');
  t.appendChild(cria('p', null, msg));
  t.appendChild(bt(rotuloSim, 'pequena ' + (perigoso ? 'perigo' : 'principal'), function () {
    t.remove();
    aoConfirmar();
  }));
  t.appendChild(bt('Cancelar', 'pequena', function () { t.remove(); }));
  caixa.appendChild(t);
};

// Caixinha para digitar um texto, sem usar a janelinha do navegador.
PJ.pedirTexto = function (rotulo, valor, aoConfirmar) {
  var caixa = document.getElementById('tarjas');
  var t = cria('div', 'tarja');
  t.style.flexWrap = 'wrap';
  t.appendChild(cria('p', null, rotulo));
  var campo = document.createElement('input');
  campo.type = 'text';
  campo.value = valor || '';
  campo.style.flex = '1 1 100%';
  t.appendChild(campo);
  var confirmar = function () {
    var v = campo.value.trim();
    t.remove();
    if (v) aoConfirmar(v);
  };
  campo.addEventListener('keydown', function (ev) {
    if (ev.key === 'Enter') { ev.preventDefault(); confirmar(); }
  });
  t.appendChild(bt('Salvar', 'pequena principal', confirmar));
  t.appendChild(bt('Cancelar', 'pequena', function () { t.remove(); }));
  caixa.appendChild(t);
  campo.focus();
  campo.select();
};

// ------------------------------------------------------ abrir e fechar

PJ.painelAberto = null;
PJ.pilhaPaineis = [];

PJ.telaGrande = function () {
  return window.matchMedia('(min-width: 900px)').matches;
};

// `deDentro` = abriu a partir de outro painel, então ganha o botão Voltar
PJ.abrirPainel = function (id, deDentro) {
  var painel = PJ.PAINEIS[id];
  if (!painel) return;
  if (deDentro && PJ.painelAberto) PJ.pilhaPaineis.push(PJ.painelAberto);
  else PJ.pilhaPaineis = [];
  PJ.painelAberto = id;
  var folha = document.getElementById('folha');
  folha.hidden = false;
  PJ.recarregarPainel();
  window.requestAnimationFrame(function () { folha.classList.add('aberta'); });
  document.getElementById('cortina').hidden = PJ.telaGrande();
  PJ.marcarBarra();
};

PJ.voltarPainel = function () {
  var anterior = PJ.pilhaPaineis.pop();
  if (!anterior) { PJ.fecharPainel(); return; }
  PJ.painelAberto = anterior;
  PJ.recarregarPainel();
  PJ.marcarBarra();
};

PJ.fecharPainel = function () {
  PJ.pilhaPaineis = [];
  if (PJ.telaGrande()) { PJ.abrirPainel('banco'); return; }
  var folha = document.getElementById('folha');
  folha.classList.remove('aberta');
  folha.removeAttribute('data-alto');
  document.getElementById('cortina').hidden = true;
  PJ.painelAberto = null;
  window.setTimeout(function () { if (!PJ.painelAberto) folha.hidden = true; }, 240);
  PJ.marcarBarra();
};

PJ.recarregarPainel = function () {
  if (!PJ.painelAberto) return;
  var painel = PJ.PAINEIS[PJ.painelAberto];
  if (!painel) return;
  var folha = document.getElementById('folha');
  if (painel.alto && !PJ.telaGrande()) folha.setAttribute('data-alto', '1');
  else folha.removeAttribute('data-alto');
  document.getElementById('folhaTitulo').textContent = painel.titulo();
  var sair = document.getElementById('btFecharFolha');
  sair.textContent = PJ.pilhaPaineis.length ? 'Voltar' : 'Fechar';
  var corpo = document.getElementById('folhaCorpo');
  corpo.textContent = '';
  corpo.scrollTop = 0;
  painel.montar(corpo);
};

PJ.marcarBarra = function () {
  var pares = {
    btBanco: 'banco', btTaticas: 'taticas', btDesenhar: 'desenhar',
    btConfigurar: 'configurar',
  };
  Object.keys(pares).forEach(function (idBotao) {
    var b = document.getElementById(idBotao);
    if (b) b.setAttribute('aria-pressed', PJ.painelAberto === pares[idBotao] ? 'true' : 'false');
  });
};

// linha do menu de configuração: título grande e uma frase explicando
function itemMenu(titulo, descricao, aoTocar, classe) {
  var b = cria('button', 'itemMenu ' + (classe || ''));
  b.type = 'button';
  b.appendChild(cria('strong', null, titulo));
  if (descricao) b.appendChild(cria('span', null, descricao));
  b.addEventListener('click', aoTocar);
  return b;
}
PJ.itemMenu = itemMenu;

// ------------------------------------------- barra do jogador escolhido
// Um toque na peça não abre gaveta nenhuma: só marca o jogador e mostra
// uma barrinha com o que dá para fazer com ele. Assim o campo não some
// atrás de um painel por causa de um toque sem querer.

PJ.escolherJogador = function (id) {
  PJ.selecionado = PJ.selecionado === id ? null : id;
  PJ.render();
};

PJ.mostrarBarraJogador = function () {
  var barra = document.getElementById('barraJogador');
  if (!barra) return;
  var j = PJ.selecionado ? PJ.jogadorPorId(PJ.selecionado) : null;
  if (!j) { barra.hidden = true; barra.textContent = ''; return; }

  barra.textContent = '';
  var pos = PJ.POSICOES[j.posicao] || { nome: j.posicao };
  var quem = cria('span', 'quemEscolhido');
  quem.appendChild(cria('strong', null, j.nome));
  quem.appendChild(cria('span', null, 'camisa ' + j.numero + ' · ' + pos.nome));
  barra.appendChild(quem);

  barra.appendChild(bt('Trocar jogador', 'pequena principal', function () {
    PJ.abrirPainel('banco');
  }));
  barra.appendChild(bt('Tirar do campo', 'pequena', function () {
    PJ.antes('tirar do campo');
    PJ.tirarDoCampo(j.id);
    PJ.atualizar();
    PJ.aviso(PJ.primeiroNome(j.nome) + ' foi para o banco.', 'Desfazer', PJ.desfazerAcao);
  }));
  barra.appendChild(bt('Ficha do jogador', 'pequena', function () {
    PJ.abrirJogador(j.id);
  }));
  barra.appendChild(bt('Soltar', 'pequena', function () {
    PJ.selecionado = null;
    PJ.render();
  }));
  barra.hidden = false;
};

// Quando o jogador é solto num setor diferente do dele, o aplicativo
// PERGUNTA. Nunca muda a posição sozinho — senão a escalação que vai para
// o grupo sai errada, com o goleiro listado no ataque.
PJ.ofereceTrocarPosicao = function (id, x, y) {
  var j = PJ.jogadorPorId(id);
  if (!j) return;
  var sugerida = PJ.siglaPorLugar(PJ.estado.modalidade, x, y);
  var atual = PJ.POSICOES[j.posicao];
  var nova = PJ.POSICOES[sugerida];
  if (!atual || !nova || atual.setor === nova.setor) return;
  PJ.perguntar(
    PJ.primeiroNome(j.nome) + ' está jogando ' + nomeDoSetor(nova.setor) +
      ' agora. Mudar a posição dele para ' + sugerida + '?',
    'Mudar para ' + sugerida,
    function () {
      PJ.antes('trocar posição');
      j.posicao = sugerida;
      PJ.marcarComoMeu(j);
      PJ.atualizar();
    }
  );
};

function nomeDoSetor(setor) {
  return {
    goleiro: 'no gol', defesa: 'na defesa', meio: 'no meio', ataque: 'na frente',
  }[setor] || 'em outro lugar';
}

// ------------------------------------------------------------- BANCO

function fazerTroca(idEntra) {
  var sai = PJ.selecionado;
  if (!sai) return;
  var qSai = PJ.jogadorPorId(sai);
  var qEntra = PJ.jogadorPorId(idEntra);
  PJ.antes('trocar jogador');
  PJ.trocarJogador(sai, idEntra);
  PJ.selecionado = null;
  PJ.registrarNoJogo(PJ.primeiroNome(qSai.nome) + ' saiu, ' + PJ.primeiroNome(qEntra.nome) + ' entrou');
  PJ.atualizar();
  PJ.aviso(PJ.primeiroNome(qSai.nome) + ' saiu. ' + PJ.primeiroNome(qEntra.nome) + ' entrou.',
    'Desfazer', PJ.desfazerAcao);
}

function pecaReserva(j, aoTocar, rotulo) {
  var b = cria('button', 'reserva');
  b.type = 'button';
  b.appendChild(cria('span', 'bolinha', String(j.numero)));
  b.appendChild(cria('span', 'nomeCurto', PJ.primeiroNome(j.nome)));
  b.setAttribute('aria-label', rotulo + ' ' + j.nome);
  b.addEventListener('click', aoTocar);
  return b;
}

PJ.PAINEIS = {};

PJ.PAINEIS.banco = {
  titulo: function () { return 'Banco — quem está fora'; },
  montar: function (corpo) {
    var m = PJ.modalidade();
    var c = PJ.campo();
    var reservas = PJ.banco();
    var faltam = m.emCampo - c.emCampo.length;

    if (PJ.selecionado) {
      var q = PJ.jogadorPorId(PJ.selecionado);
      corpo.appendChild(cria('p', 'rotulo', 'Quem entra no lugar de ' + PJ.primeiroNome(q.nome) + '?'));
    } else {
      corpo.appendChild(texto('Toque no jogador do campo e depois no que vai entrar.'));
    }

    if (reservas.length) {
      var fila = cria('div', 'fileiraBanco');
      reservas.forEach(function (j) {
        fila.appendChild(pecaReserva(j, function () {
          if (PJ.selecionado) { fazerTroca(j.id); return; }
          if (faltam > 0) {
            PJ.antes('colocar em campo');
            PJ.colocarEmCampo(j.id);
            PJ.atualizar();
            PJ.aviso(PJ.primeiroNome(j.nome) + ' entrou em campo.', 'Desfazer', PJ.desfazerAcao);
            return;
          }
          PJ.aviso('O campo já está completo. Toque primeiro no jogador que vai sair.');
        }, PJ.selecionado ? 'Colocar no lugar de' : (faltam > 0 ? 'Colocar em campo:' : 'Reserva')));
      });
      corpo.appendChild(fila);
    } else {
      corpo.appendChild(texto('Todo mundo do seu time está em campo.'));
    }

    if (PJ.selecionado) {
      corpo.appendChild(bt('Cancelar troca', 'larga', function () {
        PJ.selecionado = null;
        PJ.atualizar();
      }));
    }

    corpo.appendChild(cria('p', 'rotulo',
      'Em campo: ' + c.emCampo.length + ' — No banco: ' + reservas.length));

    if (faltam > 0) {
      var falta = cria('div', 'tarja atencao');
      falta.appendChild(cria('p', null, 'Faltam ' + faltam + ' ' +
        (faltam === 1 ? 'jogador' : 'jogadores') + ' para o ' + m.nome + '.'));
      falta.appendChild(bt('Meu time', 'pequena', function () { PJ.abrirPainel('meutime'); }));
      corpo.appendChild(falta);
    }
  },
};

// ------------------------------------------------------------ TÁTICAS

PJ.PAINEIS.taticas = {
  titulo: function () { return 'Táticas e formações'; },
  montar: function (corpo) {
    var m = PJ.modalidade();
    var c = PJ.campo();
    var minhas = PJ.estado.taticas.filter(function (t) { return t.modalidade === m.id; });

    var formacoes = secao('Arrumar o time agora — ' + m.nome);
    formacoes.appendChild(texto('Arruma os jogadores sozinho. Ninguém entra e ninguém sai do campo.'));
    var grade = cria('div', 'grade');
    m.formacoes.forEach(function (f) {
      var b = bt(f.nome, c.formacao === f.id ? 'principal' : '', function () {
        var antes = ondeEstavam();
        PJ.antes('formação');
        PJ.aplicarFormacao(f.id);
        PJ.atualizar();
        PJ.aviso(f.explicacao + quemMudou(antes), 'Desfazer', PJ.desfazerAcao);
      });
      b.title = f.explicacao;
      grade.appendChild(b);
    });
    formacoes.appendChild(grade);

    var salvas = secao('Minhas táticas salvas');
    if (!minhas.length) {
      salvas.appendChild(texto('Arrume o time do seu jeito e toque em "Salvar esta tática" para guardar o desenho e usar de novo no meio do jogo.'));
    } else {
      minhas.slice().reverse().forEach(function (t) { salvas.appendChild(cartaoDeTatica(t)); });
    }
    salvas.appendChild(bt('Salvar esta tática', 'principal larga', abrirSalvarTatica));

    // enquanto não houver tática salva, o que ele precisa ver primeiro,
    // no minuto 60 perdendo de 1 a 0, é a formação pronta
    if (minhas.length) { corpo.appendChild(salvas); corpo.appendChild(formacoes); }
    else { corpo.appendChild(formacoes); corpo.appendChild(salvas); }

    var sEst = secao('Estilo de jogo');
    sEst.appendChild(texto('Muda o time inteiro de lugar de uma vez, conforme o jogo pedir.'));
    PJ.ESTILOS.forEach(function (e) {
      var b = cria('button', 'escolhaEstilo');
      b.type = 'button';
      b.appendChild(document.createTextNode(e.nome));
      b.appendChild(cria('span', null, e.explicacao + ' ' + e.quandoUsar));
      b.setAttribute('aria-pressed', c.estilo === e.id ? 'true' : 'false');
      b.addEventListener('click', function () {
        PJ.antes('estilo de jogo');
        PJ.aplicarEstilo(e.id);
        PJ.registrarNoJogo('Estilo: ' + e.nome);
        PJ.atualizar();
        PJ.aviso('Estilo "' + e.nome + '" aplicado.', 'Desfazer', PJ.desfazerAcao);
      });
      sEst.appendChild(b);
    });
    corpo.appendChild(sEst);
  },
};

function ondeEstavam() {
  var mapa = {};
  PJ.campo().emCampo.forEach(function (p) {
    var j = PJ.jogadorPorId(p.id);
    if (j) mapa[p.id] = { nome: j.nome, y: p.y };
  });
  return mapa;
}

function quemMudou(antes) {
  var mudou = [];
  PJ.campo().emCampo.forEach(function (p) {
    var a = antes[p.id];
    if (!a) return;
    if (Math.abs(a.y - p.y) > 14) {
      mudou.push(PJ.primeiroNome(a.nome) + (p.y > a.y ? ' subiu' : ' recuou'));
    }
  });
  if (!mudou.length) return ' Os jogadores só se ajeitaram, ninguém mudou de setor.';
  return ' ' + mudou.slice(0, 3).join(', ') + '.';
}

function cartaoDeTatica(t) {
  var linha = cria('div', 'secao');
  var cartao = cria('button', 'cartaoTatica');
  cartao.type = 'button';
  var mini = cria('span', 'miniatura');
  t.vagas.forEach(function (v) {
    var ponto = cria('i');
    ponto.style.left = v.x + '%';
    ponto.style.top = (100 - v.y) + '%';
    mini.appendChild(ponto);
  });
  cartao.appendChild(mini);
  var info = cria('span', 'info');
  info.appendChild(cria('strong', null, t.nome));
  info.appendChild(cria('span', null, t.vagas.length + ' lugares · salva em ' + t.criadaEm));
  cartao.appendChild(info);
  cartao.addEventListener('click', function () {
    PJ.antes('trocar de tática');
    var c = PJ.campo();
    PJ.encaixarNasVagas(t.vagas);
    c.estilo = t.estilo || 'padrao';
    PJ.registrarNoJogo('Tática: ' + t.nome);
    PJ.atualizar();
    var extra = t.vagas.length > c.emCampo.length
      ? ' A tática tem ' + t.vagas.length + ' lugares e você tem ' + c.emCampo.length + ' em campo.'
      : '';
    PJ.aviso('Desenho da tática "' + t.nome + '" aplicado. Os mesmos jogadores continuam em campo.' + extra,
      'Desfazer', PJ.desfazerAcao);
  });
  linha.appendChild(cartao);

  var acoes = cria('div', 'linhaBotoes');
  acoes.appendChild(bt('Trocar nome', 'pequena', function () {
    PJ.pedirTexto('Novo nome da tática', t.nome, function (v) {
      PJ.antes('nome da tática');
      t.nome = v;
      PJ.atualizar();
    });
  }));
  acoes.appendChild(bt('Apagar tática', 'pequena perigo', function () {
    PJ.perguntar('Apagar a tática "' + t.nome + '"?', 'Apagar tática', function () {
      PJ.antes('apagar tática');
      PJ.estado.taticas = PJ.estado.taticas.filter(function (x) { return x !== t; });
      PJ.atualizar();
      PJ.aviso('Tática apagada.', 'Desfazer', PJ.desfazerAcao);
    }, true);
  }));
  linha.appendChild(acoes);
  return linha;
}

function abrirSalvarTatica() {
  var m = PJ.modalidade();
  var c = PJ.campo();
  var corpo = document.getElementById('folhaCorpo');
  var caixa = cria('div', 'secao');
  caixa.appendChild(cria('p', 'rotulo', 'Nome da tática'));
  var campo = document.createElement('input');
  campo.type = 'text';
  campo.placeholder = 'Ex: Segurar o resultado';
  caixa.appendChild(campo);

  var sugestoes = cria('div', 'linhaBotoes');
  [PJ.formacaoPorId(c.formacao).nome, 'Começo de jogo', 'Segurar o resultado',
    'Partir pro ataque', 'Com um a menos'].forEach(function (s) {
    sugestoes.appendChild(bt(s, 'pequena', function () { campo.value = s; campo.focus(); }));
  });
  caixa.appendChild(sugestoes);
  caixa.appendChild(texto('A tática guarda só o desenho: os lugares em campo. Não guarda quem estava em cada lugar, então aplicar de novo no meio do jogo não desfaz as suas trocas.'));

  var acoes = cria('div', 'linhaBotoes');
  acoes.appendChild(bt('Salvar', 'principal', function () {
    var nome = campo.value.trim() || ('Tática ' + (PJ.estado.taticas.length + 1));
    PJ.antes('salvar tática');
    PJ.estado.taticas.push({
      nome: nome,
      modalidade: m.id,
      criadaEm: PJ.hoje(),
      estilo: c.estilo,
      vagas: c.emCampo.map(function (p) {
        var j = PJ.jogadorPorId(p.id);
        return { sigla: j ? j.posicao : 'MEI', x: p.x, y: p.y };
      }),
    });
    PJ.atualizar();
    PJ.aviso('Tática "' + nome + '" salva.');
  }));
  acoes.appendChild(bt('Cancelar', '', function () { PJ.recarregarPainel(); }));
  caixa.appendChild(acoes);

  corpo.textContent = '';
  corpo.appendChild(caixa);
  campo.focus();
}

// ----------------------------------------------------------- DESENHAR

PJ.PAINEIS.desenhar = {
  titulo: function () { return 'Desenhar no campo'; },
  montar: function (corpo) {
    corpo.appendChild(texto('Arraste o dedo no campo para fazer a seta. Enquanto você desenha, os jogadores ficam travados.'));

    var ferramentas = cria('div', 'linhaBotoes');
    [['seta', 'Seta'], ['risco', 'Risco livre']].forEach(function (par) {
      ferramentas.appendChild(bt(par[1], PJ.ferramenta === par[0] ? 'principal' : '', function () {
        PJ.ferramenta = par[0];
        PJ.recarregarPainel();
      }));
    });
    corpo.appendChild(ferramentas);

    var cores = cria('div', 'linhaBotoes');
    [['amarelo', 'Amarelo'], ['branco', 'Branco'], ['vermelho', 'Vermelho']].forEach(function (par) {
      var b = bt(par[1], PJ.corSeta === par[0] ? 'principal' : '', function () {
        PJ.corSeta = par[0];
        PJ.recarregarPainel();
      });
      b.style.borderColor = PJ.CORES_SETA[par[0]];
      b.style.borderWidth = '4px';
      cores.appendChild(b);
    });
    corpo.appendChild(cores);

    var quantas = PJ.campo().setas.length;
    corpo.appendChild(cria('p', 'rotulo', quantas + (quantas === 1 ? ' seta no campo' : ' setas no campo')));

    corpo.appendChild(bt('Apagar a última', 'larga', function () {
      if (!PJ.apagarUltimaSeta()) PJ.aviso('Não há nenhuma seta para apagar.');
    }));

    var limpar = bt('Apagar todas as setas', 'larga perigo', function () {
      var n = PJ.campo().setas.length;
      if (!n) { PJ.aviso('Não há nenhuma seta para apagar.'); return; }
      PJ.perguntar('Apagar as ' + n + ' setas? Os jogadores não mudam de lugar.',
        'Apagar setas', function () { PJ.limparSetas(); }, true);
    });
    limpar.style.marginTop = '12px';
    corpo.appendChild(limpar);

    corpo.appendChild(bt('Parar de desenhar', 'principal larga', function () {
      PJ.trocarModoDesenho(false);
      PJ.fecharPainel();
      PJ.aviso('Pronto. Agora você já pode arrastar os jogadores de novo.');
    }));
  },
};

PJ.trocarModoDesenho = function (ligar) {
  PJ.modoDesenho = ligar;
  document.getElementById('palco').dataset.modo = ligar ? 'desenhar' : 'mover';
  if (ligar) {
    PJ.selecionado = null;
    PJ.mostrarBarraJogador();
    PJ.abrirPainel('desenhar');
  }
  PJ.desenharPecas();
  PJ.marcarBarra();
  var b = document.getElementById('btDesenhar');
  if (b) b.setAttribute('aria-pressed', ligar ? 'true' : 'false');
};

// ----------------------------------------------------------- CONFIGURAR
// Um menu só, no alto da tela, com tudo que não se mexe durante o lance.

PJ.PAINEIS.modalidade = {
  titulo: function () { return 'Tipo de campo'; },
  montar: function (corpo) {
    corpo.appendChild(texto('Cada tipo de campo guarda a própria escalação. Trocar não apaga jogador nenhum.'));
    PJ.ORDEM_MODALIDADES.forEach(function (id) {
      var m = PJ.MODALIDADES[id];
      var escolhido = PJ.estado.modalidade === id;
      corpo.appendChild(itemMenu(
        (escolhido ? '✓ ' : '') + m.nome,
        m.nomeLongo + ' — ' + m.emCampo + ' em campo, campo de ' +
          m.comprimentoM + ' por ' + m.larguraM + ' metros',
        function () {
          PJ.trocarModalidade(id);
          PJ.fecharPainel();
        },
        escolhido ? 'principal' : ''
      ));
    });
  },
};

// ------------------------------- banco e comissão ao lado do campo

PJ.desenharListaLado = function () {
  var caixa = document.getElementById('listaLado');
  if (!caixa) return;
  caixa.textContent = '';

  var reservas = PJ.banco();
  var gBanco = cria('div', 'grupoLado banco');
  gBanco.appendChild(cria('h3', null, 'No banco (' + reservas.length + ')'));
  if (!reservas.length) {
    gBanco.appendChild(cria('p', 'vazio', 'Todo mundo está em campo.'));
  }
  reservas.forEach(function (j) {
    var b = cria('button', 'linhaLado');
    b.type = 'button';
    b.appendChild(cria('span', 'bolinha', String(j.numero)));
    var quem = cria('span', 'quem');
    quem.appendChild(cria('strong', null, j.nome));
    quem.appendChild(cria('span', null, ((PJ.POSICOES[j.posicao] || {}).nome || j.posicao) +
      (PJ.ehCapitao(j.id) ? ' · capitão' : '')));
    b.appendChild(quem);
    b.setAttribute('aria-label', 'Reserva ' + j.nome + '. Abrir o jogador.');
    b.addEventListener('click', function () { PJ.abrirJogador(j.id); });
    gBanco.appendChild(b);
  });
  caixa.appendChild(gBanco);

  var gComissao = cria('div', 'grupoLado comissao');
  gComissao.appendChild(cria('h3', null, 'Comissão técnica'));
  PJ.estado.comissao.forEach(function (c, i) {
    var b = cria('button', 'linhaLado' + (c.nome ? '' : ' aPreencher'));
    b.type = 'button';
    b.appendChild(cria('span', 'cargo', PJ.cargoCurto(c.cargo)));
    var quem = cria('span', 'quem');
    quem.appendChild(cria('strong', null, c.nome || 'A preencher'));
    quem.appendChild(cria('span', null, c.cargo));
    b.appendChild(quem);
    b.setAttribute('aria-label', c.cargo + ': ' + (c.nome || 'a preencher') + '. Toque para escrever o nome.');
    b.addEventListener('click', function () { PJ.pedirNomeDaComissao(i); });
    gComissao.appendChild(b);
  });
  caixa.appendChild(gComissao);
};

PJ.cargoCurto = function (cargo) {
  var mapa = {
    'Técnico': 'TEC', 'Auxiliar técnico': 'AUX', 'Massagista': 'MAS',
    'Preparador físico': 'PF', 'Treinador de goleiros': 'TG',
    'Roupeiro': 'ROU', 'Diretor': 'DIR',
  };
  return mapa[cargo] || cargo.slice(0, 3).toUpperCase();
};

PJ.pedirNomeDaComissao = function (i) {
  var c = PJ.estado.comissao[i];
  if (!c) return;
  PJ.pedirTexto('Nome do ' + c.cargo.toLowerCase(), c.nome, function (v) {
    PJ.antes('comissão técnica');
    c.nome = v;
    PJ.atualizar();
  });
};

// ------------------------------------------------- COMISSÃO TÉCNICA

PJ.PAINEIS.comissao = {
  alto: true,
  titulo: function () { return 'Comissão técnica'; },
  montar: function (corpo) {
    corpo.appendChild(texto('Quem está do lado de fora do campo. Deixe em branco o que não tiver.'));

    PJ.estado.comissao.forEach(function (c, i) {
      var bloco = secao(c.cargo);
      var linha = cria('div', 'linhaBotoes');
      var campo = document.createElement('input');
      campo.type = 'text';
      campo.value = c.nome;
      campo.placeholder = 'Nome do ' + c.cargo.toLowerCase();
      campo.setAttribute('aria-label', 'Nome do ' + c.cargo.toLowerCase());
      campo.style.flex = '3 1 180px';
      var salvar = function () {
        var v = campo.value.trim();
        if (v === c.nome) return;
        PJ.antes('comissão técnica');
        c.nome = v;
        PJ.salvar();
        PJ.desenharListaLado();
      };
      campo.addEventListener('change', salvar);
      campo.addEventListener('keydown', function (ev) {
        if (ev.key === 'Enter') { ev.preventDefault(); campo.blur(); }
      });
      linha.appendChild(campo);
      bloco.appendChild(linha);

      if (PJ.CARGOS_PADRAO.indexOf(c.cargo) < 0) {
        bloco.appendChild(bt('Tirar ' + c.cargo.toLowerCase() + ' da lista', 'pequena perigo', function () {
          PJ.antes('comissão técnica');
          PJ.estado.comissao.splice(i, 1);
          PJ.atualizar();
          PJ.recarregarPainel();
        }));
      }
      corpo.appendChild(bloco);
    });

    var jaTem = {};
    PJ.estado.comissao.forEach(function (c) { jaTem[c.cargo] = true; });
    var faltam = PJ.CARGOS_EXTRAS.filter(function (cargo) { return !jaTem[cargo]; });
    if (faltam.length) {
      var s = secao('Acrescentar cargo');
      var grade = cria('div', 'linhaBotoes');
      faltam.forEach(function (cargo) {
        grade.appendChild(bt(cargo, 'pequena', function () {
          PJ.antes('comissão técnica');
          PJ.estado.comissao.push({ cargo: cargo, nome: '' });
          PJ.atualizar();
          PJ.recarregarPainel();
        }));
      });
      s.appendChild(grade);
      s.appendChild(bt('Outro cargo', 'larga', function () {
        PJ.pedirTexto('Nome do cargo', '', function (v) {
          PJ.antes('comissão técnica');
          PJ.estado.comissao.push({ cargo: v, nome: '' });
          PJ.atualizar();
          PJ.recarregarPainel();
        });
      }));
      corpo.appendChild(s);
    }

    corpo.appendChild(bt('Pronto', 'principal larga', function () {
      if (PJ.pilhaPaineis.length) PJ.voltarPainel(); else PJ.fecharPainel();
    }));
  },
};

PJ.quando = function (iso) {
  if (!iso) return 'sem data';
  var d = new Date(iso);
  if (isNaN(d.getTime())) return 'sem data';
  var dd = function (n) { return (n < 10 ? '0' : '') + n; };
  return dd(d.getDate()) + '/' + dd(d.getMonth() + 1) + '/' + d.getFullYear() +
    ' às ' + dd(d.getHours()) + ':' + dd(d.getMinutes());
};

PJ.PAINEIS.recuperar = {
  alto: true,
  titulo: function () { return 'Procurar time guardado'; },
  montar: function (corpo) {
    corpo.appendChild(texto('O aplicativo guarda o seu time neste aparelho e mantém uma segunda via. Aqui aparece tudo que ele encontrou guardado.'));

    var achados = PJ.procurarTimes();
    if (!achados.length) {
      corpo.appendChild(texto('Não achei nada guardado neste navegador. Se você montou o time em outro celular, em outro navegador, ou numa janela anônima, o time está lá — não vem junto sozinho.'));
    }

    achados.forEach(function (a) {
      var grupo = cria('div', 'secao');
      var detalhe = a.quantos + ' jogadores' +
        (a.proprios !== a.quantos ? ' (' + a.proprios + ' seus, ' + (a.quantos - a.proprios) + ' de exemplo)' : '') +
        ' · guardado em ' + PJ.quando(a.quando);
      grupo.appendChild(itemMenu(
        (a.emUso ? '✓ ' : '') + a.nome + (a.emUso ? ' — em uso agora' : ''),
        detalhe,
        function () {
          if (a.emUso) { PJ.aviso('Esse já é o time que está aberto.'); return; }
          PJ.perguntar('Trazer de volta o time "' + a.nome + '" com ' + a.quantos +
            ' jogadores? O time de agora sai da tela, mas continua guardado.',
            'Trazer este time', function () {
              PJ.antes('recuperar time');
              PJ.estado = PJ.sanear(PJ.completar(JSON.parse(JSON.stringify(a.dados))));
              PJ.aplicarTema();
              PJ.atualizar();
              PJ.aviso('Time "' + PJ.estado.nomeTime + '" recuperado.', 'Desfazer', PJ.desfazerAcao);
            });
        },
        a.emUso ? 'principal' : ''
      ));
      corpo.appendChild(grupo);
    });

    var ajuda = secao('Se o seu time não estiver aqui');
    ajuda.appendChild(texto('1. Se a aba antiga ainda estiver aberta em algum lugar, toque em Desfazer lá em cima: ele guarda as 30 últimas ações.'));
    ajuda.appendChild(texto('2. Se você salvou uma cópia em arquivo, use "Abrir cópia salva" em Configurar.'));
    ajuda.appendChild(texto('3. Guarde uma cópia sempre que terminar de cadastrar o time. É o único jeito de levar para outro aparelho.'));
    corpo.appendChild(ajuda);
  },
};

PJ.PAINEIS.configurar = {
  alto: true,
  titulo: function () { return 'Configurar'; },
  montar: function (corpo) {
    var ir = function (id) { return function () { PJ.abrirPainel(id, true); }; };

    var time = secao('O seu time');
    var gTime = cria('div', 'grupoMenu');
    gTime.appendChild(itemMenu('Configurar meu time',
      'Nomes, números e posições. ' + PJ.estado.elenco.length + ' jogadores.', ir('meutime'), 'principal'));
    var comissao = PJ.estado.comissao.filter(function (c) { return c.nome; });
    gTime.appendChild(itemMenu('Comissão técnica',
      comissao.length
        ? comissao.map(function (c) { return c.cargo + ': ' + PJ.primeiroNome(c.nome); }).join(' · ')
        : 'Técnico, auxiliar técnico, massagista — a preencher.',
      ir('comissao')));
    gTime.appendChild(itemMenu('Nome do time', PJ.estado.nomeTime, function () {
      PJ.pedirTexto('Nome do time', PJ.estado.nomeTime, function (v) {
        PJ.antes('nome do time');
        PJ.estado.nomeTime = v;
        PJ.atualizar();
      });
    }));
    time.appendChild(gTime);
    corpo.appendChild(time);

    var jogo = secao('Jogo');
    var gJogo = cria('div', 'grupoMenu');
    gJogo.appendChild(itemMenu('Configurar táticas',
      'Formações prontas, estilos de jogo e as suas táticas salvas.', ir('taticas')));
    gJogo.appendChild(itemMenu('Mandar a escalação',
      'Copiar a lista pronta para o grupo do WhatsApp.', ir('mandar')));
    gJogo.appendChild(itemMenu('Foto do campo',
      'Imagem do campo com os nomes, para mandar no grupo.', ir('foto')));
    gJogo.appendChild(itemMenu('Anotações do jogo',
      'Placar e o que aconteceu durante a partida.', ir('jogo')));
    jogo.appendChild(gJogo);
    corpo.appendChild(jogo);

    var campo = secao('Campo e tela');
    var gCampo = cria('div', 'grupoMenu');
    var outros = PJ.ORDEM_MODALIDADES
      .filter(function (id) { return id !== PJ.estado.modalidade; })
      .map(function (id) { return PJ.MODALIDADES[id].nome; });
    gCampo.appendChild(itemMenu('Tipo de campo',
      'Agora: ' + PJ.modalidade().nome + '. Toque para trocar para ' + outros.join(' ou ') + '.',
      ir('modalidade')));
    gCampo.appendChild(itemMenu('Mostrar adversário',
      PJ.estado.adversario ? 'LIGADO — bolinhas azuis para desenhar a marcação.'
        : 'DESLIGADO — toque para pôr o adversário no campo.', function () {
        PJ.antes('mostrar adversário');
        PJ.estado.adversario = !PJ.estado.adversario;
        if (PJ.estado.adversario) PJ.montarAdversarios();
        PJ.atualizar();
      }));
    gCampo.appendChild(itemMenu('Tela', PJ.nomeDaTela() +
      ' — normal, para o sol ou para a noite.', ir('tela')));
    campo.appendChild(gCampo);
    corpo.appendChild(campo);

    var guardar = secao('Guardar e recomeçar');
    var gGuardar = cria('div', 'grupoMenu');
    gGuardar.appendChild(texto('Tudo fica neste aparelho. Não precisa de internet e não precisa criar conta. Guarde uma cópia para o caso de trocar de celular.'));
    gGuardar.appendChild(itemMenu('Salvar cópia do meu time',
      'Baixa um arquivo com o elenco e as táticas.', function () {
        PJ.entregarArquivo('meu-time-plano-de-jogo.json', JSON.stringify(PJ.estado),
          'Não deu para salvar a cópia por aqui. Abra o aplicativo no computador para guardar o arquivo.');
      }));

    var entrada = document.createElement('input');
    entrada.type = 'file';
    entrada.accept = '.json,.txt,application/json,text/plain';
    entrada.style.display = 'none';
    entrada.addEventListener('change', function () {
      var arquivo = entrada.files && entrada.files[0];
      if (!arquivo) return;
      var leitor = new FileReader();
      leitor.onload = function () {
        try {
          var lido = JSON.parse(String(leitor.result));
          if (!lido || !lido.elenco || !lido.campos) throw new Error('formato');
          PJ.perguntar('Isso troca o time de agora pelo time da cópia.', 'Abrir cópia', function () {
            PJ.antes('abrir cópia');
            PJ.estado = PJ.sanear(PJ.completar(lido));
            PJ.aplicarTema();
            PJ.atualizar();
            PJ.aviso('Cópia aberta.', 'Desfazer', PJ.desfazerAcao);
          });
        } catch (err) {
          PJ.aviso('Esse arquivo não é uma cópia do Plano de Jogo.');
        }
      };
      leitor.readAsText(arquivo);
      entrada.value = '';
    });
    gGuardar.appendChild(entrada);
    gGuardar.appendChild(itemMenu('Abrir cópia salva',
      'Traz de volta o time de um arquivo guardado.', function () { entrada.click(); }));
    gGuardar.appendChild(itemMenu('Levar o time para outro aparelho',
      'Um código para copiar aqui e colar no outro celular, ou no outro link.',
      ir('levar')));
    gGuardar.appendChild(itemMenu('Procurar time guardado',
      'Mostra tudo que está guardado neste aparelho e traz de volta.', ir('recuperar')));
    gGuardar.appendChild(itemMenu('Ver as dicas de novo',
      'Mostra outra vez as três dicas do começo.', function () {
        PJ.estado.dicas = 0;
        PJ.salvar();
        PJ.fecharPainel();
        PJ.mostrarDica();
      }));
    guardar.appendChild(gGuardar);
    corpo.appendChild(guardar);

    var fim = cria('div', 'grupoMenu');
    fim.style.marginTop = '20px';
    fim.appendChild(itemMenu('Apagar tudo e começar do zero',
      'Apaga os jogadores e as táticas deste aparelho.', function () {
        PJ.perguntar('Isso apaga seus jogadores e suas táticas.', 'Apagar tudo', function () {
          PJ.perguntar('Última confirmação. Apagar mesmo?', 'Sim, apagar tudo', function () {
            PJ.antes('apagar tudo');
            PJ.estado = PJ.estadoNovo();
            PJ.aplicarTema();
            PJ.atualizar();
            PJ.aviso('Tudo apagado. O time de exemplo voltou.', 'Desfazer', PJ.desfazerAcao);
          }, true);
        }, true);
      }, 'perigo'));
    corpo.appendChild(fim);

    corpo.appendChild(cria('p', 'rotulo', 'Plano de Jogo — funciona sem internet'));
  },
};

// ---------------------------------------------------------- MEU TIME

PJ.vagasPuladas = {};

// Qual lugar do campo ainda está vazio — para o aplicativo dizer, enquanto
// ele digita, qual posição está sendo preenchida. Sem isso o artilheiro
// que ele digita primeiro acaba escalado no gol.
PJ.proximaVaga = function () {
  var c = PJ.campo();
  var m = PJ.modalidade();
  if (c.emCampo.length >= m.emCampo) return null;
  var vagas = PJ.vagasDaFormacao(PJ.formacaoPorId(c.formacao));
  for (var i = 0; i < vagas.length; i++) {
    var v = vagas[i];
    if (PJ.vagasPuladas[v.sigla + v.x + v.y]) continue;
    var ocupada = c.emCampo.some(function (p) {
      return Math.abs(p.x - v.x) < 7 && Math.abs(p.y - v.y) < 7;
    });
    if (!ocupada) return v;
  }
  return null;
};

PJ.PAINEIS.meutime = {
  alto: true,
  titulo: function () { return 'Meu time'; },
  montar: function (corpo) {
    var vaga = PJ.proximaVaga();
    var faltam = PJ.modalidade().emCampo - PJ.campo().emCampo.length;

    var caixa = cria('div', 'secao');
    caixa.appendChild(cria('p', 'rotulo', vaga
      ? 'Agora o ' + PJ.POSICOES[vaga.sigla].nome.toUpperCase() +
        (faltam > 1 ? ' — faltam ' + faltam : '')
      : 'Adicionar jogador para o banco'));
    var linha = cria('div', 'linhaBotoes');
    var nome = document.createElement('input');
    nome.type = 'text';
    nome.placeholder = 'Nome do jogador';
    nome.id = 'novoNome';
    nome.style.flex = '3 1 180px';
    var numero = document.createElement('input');
    numero.type = 'number';
    numero.inputMode = 'numeric';
    numero.min = '0';
    numero.max = '99';
    numero.placeholder = 'Número';
    numero.id = 'novoNumero';
    numero.value = String(vaga ? PJ.numeroParaPosicao(vaga.sigla) : PJ.proximoNumero());
    numero.style.flex = '1 1 90px';
    linha.appendChild(nome);
    linha.appendChild(numero);
    caixa.appendChild(linha);

    var adicionar = function () {
      var v = nome.value.trim();
      if (!v) { nome.focus(); return; }
      var repetido = PJ.estado.elenco.some(function (j) {
        return j.nome.toLowerCase() === v.toLowerCase();
      });
      var gravar = function (nomeFinal) {
        PJ.antes('adicionar jogador');
        var n = parseInt(numero.value, 10);
        var novo = {
          id: PJ.uid(),
          nome: nomeFinal,
          numero: Number.isFinite(n) ? PJ.limitar(n, 0, 99)
            : (vaga ? PJ.numeroParaPosicao(vaga.sigla) : PJ.proximoNumero()),
          posicao: vaga ? vaga.sigla : 'MEI',
        };
        PJ.estado.elenco.push(novo);
        if (vaga) PJ.colocarEmCampo(novo.id);
        PJ.atualizar();
        var campoNome = document.getElementById('novoNome');
        if (campoNome) campoNome.focus();
        if (vaga) {
          PJ.anunciar(nomeFinal + ' entrou ' + nomeDoSetor(PJ.POSICOES[vaga.sigla].setor));
        }
      };
      if (repetido) {
        PJ.perguntar('Já existe um ' + v + ' no time. Adicionar assim mesmo?', 'Adicionar', function () {
          gravar(v + ' 2');
        });
        return;
      }
      gravar(v);
    };
    nome.addEventListener('keydown', function (ev) {
      if (ev.key === 'Enter') { ev.preventDefault(); adicionar(); }
    });

    var acoes = cria('div', 'linhaBotoes');
    acoes.appendChild(bt('Adicionar', 'principal', adicionar));
    if (vaga) {
      acoes.appendChild(bt('Pular esta posição', '', function () {
        PJ.vagasPuladas[vaga.sigla + vaga.x + vaga.y] = true;
        PJ.recarregarPainel();
      }));
    }
    caixa.appendChild(acoes);
    caixa.appendChild(texto('Dica: dá para falar o nome no microfone do teclado do celular. Depois é só arrastar quem estiver fora do lugar.'));
    corpo.appendChild(caixa);

    corpo.appendChild(bt('Colar lista de nomes do WhatsApp', 'larga', colarLista));
    corpo.appendChild(bt('Comissão técnica', 'larga', function () { PJ.abrirPainel('comissao', true); }));

    var deExemplo = PJ.quantosDeExemplo();
    if (deExemplo) {
      var tarja = cria('div', 'tarja atencao');
      tarja.appendChild(cria('p', null, 'Ainda há ' + deExemplo +
        (deExemplo === 1 ? ' nome de exemplo na lista.' : ' nomes de exemplo na lista.') +
        ' Troque o nome de cada um pelo do seu jogador, ou apague todos de uma vez. Quem você já mudou fica no time.'));
      tarja.appendChild(bt('Apagar os ' + deExemplo + ' de exemplo', 'pequena perigo', function () {
        PJ.perguntar('Apagar os ' + deExemplo + ' nomes de exemplo? Os jogadores que você já mudou continuam no time.',
          'Apagar os de exemplo', function () {
            var n = PJ.apagarNomesDeExemplo();
            PJ.aviso(n + ' nomes de exemplo saíram da lista.', 'Desfazer', PJ.desfazerAcao);
          }, true);
      }));
      corpo.appendChild(tarja);
    }

    var lista = cria('div', 'lista');
    PJ.estado.elenco.forEach(function (j) { lista.appendChild(itemDoElenco(j)); });
    corpo.appendChild(lista);
    corpo.appendChild(cria('p', 'rotulo', 'Seu time tem ' + PJ.estado.elenco.length + ' jogadores.'));
    corpo.appendChild(bt('Pronto', 'principal larga', function () { PJ.fecharPainel(); }));
  },
};

function itemDoElenco(j) {
  var item = cria('div', 'itemLista');
  item.appendChild(cria('span', 'numero', String(j.numero)));
  var quem = cria('span', 'quem');
  quem.appendChild(cria('strong', null, j.nome));
  var dentro = PJ.estaEmCampo(j.id);
  var marcas = cria('span');
  marcas.appendChild(cria('span', 'etiqueta', j.posicao));
  marcas.appendChild(document.createTextNode(' '));
  marcas.appendChild(cria('span', 'etiqueta' + (dentro ? ' dentro' : ''), dentro ? 'Em campo' : 'No banco'));
  if (PJ.ehCapitao(j.id)) {
    marcas.appendChild(document.createTextNode(' '));
    marcas.appendChild(cria('span', 'etiqueta capitao', 'Capitão'));
  }
  quem.appendChild(marcas);
  item.appendChild(quem);

  var acoes = cria('div', 'acoes');
  var editar = bt('Ficha do jogador', 'pequena principal', function () {
    PJ.abrirJogador(j.id);
  });
  editar.setAttribute('aria-label', 'Abrir a ficha de ' + j.nome + ': nome, camisa, posição e capitão');
  acoes.appendChild(editar);
  var apagar = bt('Apagar', 'pequena perigo', function () {
    PJ.perguntar('Apagar ' + j.nome + ' do time? Ele sai da lista e do campo.',
      'Apagar jogador', function () { PJ.apagarJogador(j.id); }, true);
  });
  apagar.setAttribute('aria-label', 'Apagar ' + j.nome + ' do time');
  acoes.appendChild(apagar);
  item.appendChild(acoes);
  return item;
}

// ------------------------------------------------- tela de um jogador
// Nome, número da camisa e posição, tudo num lugar só.

PJ.jogadorEmEdicao = null;

PJ.abrirJogador = function (id) {
  PJ.jogadorEmEdicao = id;
  PJ.abrirPainel('jogador', true);
};

// Dois jogadores não podem ter a mesma camisa: o aplicativo oferece a
// troca, que é o que o treinador quer fazer nove entre dez vezes.
PJ.definirNumero = function (j, novoNumero) {
  if (!Number.isFinite(novoNumero)) return;
  novoNumero = PJ.limitar(novoNumero, 0, 99);
  if (novoNumero === j.numero) return;
  var dono = null;
  PJ.estado.elenco.forEach(function (outro) {
    if (outro !== j && outro.numero === novoNumero) dono = outro;
  });
  if (!dono) {
    PJ.antes('número da camisa');
    j.numero = novoNumero;
    PJ.marcarComoMeu(j);
    PJ.atualizar();
    return;
  }
  PJ.perguntar('A camisa ' + novoNumero + ' já é do ' + PJ.primeiroNome(dono.nome) +
    '. Trocar os números entre os dois?', 'Trocar os dois', function () {
    PJ.antes('número da camisa');
    dono.numero = j.numero;
    j.numero = novoNumero;
    PJ.marcarComoMeu(j);
    PJ.marcarComoMeu(dono);
    PJ.atualizar();
    PJ.aviso(PJ.primeiroNome(j.nome) + ' ficou com a ' + j.numero + ' e ' +
      PJ.primeiroNome(dono.nome) + ' com a ' + dono.numero + '.', 'Desfazer', PJ.desfazerAcao);
  });
};

PJ.verTodasPosicoes = false;

PJ.PAINEIS.jogador = {
  alto: true,
  titulo: function () {
    var j = PJ.jogadorPorId(PJ.jogadorEmEdicao);
    return j ? j.nome : 'Jogador';
  },
  montar: function (corpo) {
    var j = PJ.jogadorPorId(PJ.jogadorEmEdicao);
    if (!j) {
      corpo.appendChild(texto('Esse jogador não está mais no time.'));
      corpo.appendChild(bt('Voltar', 'principal larga', PJ.voltarPainel));
      return;
    }

    var sNome = secao('Nome');
    var campoNome = document.createElement('input');
    campoNome.type = 'text';
    campoNome.value = j.nome;
    campoNome.setAttribute('aria-label', 'Nome do jogador');
    var salvarNome = function () {
      var v = campoNome.value.trim();
      if (!v || v === j.nome) { campoNome.value = j.nome; return; }
      PJ.antes('trocar nome');
      j.nome = v;
      PJ.marcarComoMeu(j);
      PJ.atualizar();
    };
    campoNome.addEventListener('change', salvarNome);
    campoNome.addEventListener('keydown', function (ev) {
      if (ev.key === 'Enter') { ev.preventDefault(); campoNome.blur(); }
    });
    sNome.appendChild(campoNome);
    corpo.appendChild(sNome);

    var sNumero = secao('Número da camisa');
    var campoNumero = document.createElement('input');
    campoNumero.type = 'number';
    campoNumero.inputMode = 'numeric';
    campoNumero.min = '0';
    campoNumero.max = '99';
    campoNumero.value = String(j.numero);
    campoNumero.setAttribute('aria-label', 'Número da camisa de ' + j.nome);
    campoNumero.style.fontSize = '26px';
    campoNumero.style.fontWeight = '900';
    campoNumero.style.textAlign = 'center';
    var salvarNumero = function () {
      var n = parseInt(campoNumero.value, 10);
      if (!Number.isFinite(n)) { campoNumero.value = String(j.numero); return; }
      PJ.definirNumero(j, n);
    };
    campoNumero.addEventListener('change', salvarNumero);
    campoNumero.addEventListener('keydown', function (ev) {
      if (ev.key === 'Enter') { ev.preventDefault(); campoNumero.blur(); }
    });
    sNumero.appendChild(campoNumero);

    var daPosicao = PJ.POSICOES[j.posicao] && PJ.POSICOES[j.posicao].camisa;
    if (daPosicao && daPosicao !== j.numero) {
      sNumero.appendChild(bt('Usar a camisa ' + daPosicao + ', do ' +
        PJ.POSICOES[j.posicao].nome.toLowerCase(), 'larga', function () {
        PJ.definirNumero(j, daPosicao);
      }));
    }
    sNumero.appendChild(texto('Se a camisa já for de outro jogador, o aplicativo pergunta se você quer trocar os números entre os dois.'));
    corpo.appendChild(sNumero);

    var m = PJ.modalidade();
    var doCampo = {};
    m.formacoes.forEach(function (f) {
      f.jogadores.forEach(function (slot) { doCampo[slot[0]] = true; });
    });
    var lista = Object.keys(PJ.POSICOES).filter(function (sigla) {
      return PJ.verTodasPosicoes || doCampo[sigla] || j.posicao === sigla;
    });

    var sPos = secao('Posição');
    sPos.appendChild(texto(PJ.verTodasPosicoes
      ? 'Todas as posições dos três tipos de campo.'
      : 'Posições do ' + m.nome + '.'));
    var grade = cria('div', 'grade');
    lista.forEach(function (sigla) {
      var pos = PJ.POSICOES[sigla];
      var escolhida = j.posicao === sigla;
      var b = itemMenu((escolhida ? '✓ ' : '') + sigla, pos.nome, function () {
        if (escolhida) return;
        PJ.antes('trocar posição');
        j.posicao = sigla;
        PJ.marcarComoMeu(j);
        PJ.atualizar();
      }, 'compacto' + (escolhida ? ' principal' : ''));
      b.setAttribute('aria-pressed', escolhida ? 'true' : 'false');
      grade.appendChild(b);
    });
    sPos.appendChild(grade);
    sPos.appendChild(bt(PJ.verTodasPosicoes ? 'Mostrar só as do ' + m.nome : 'Ver todas as posições',
      'larga', function () {
        PJ.verTodasPosicoes = !PJ.verTodasPosicoes;
        PJ.recarregarPainel();
      }));
    corpo.appendChild(sPos);

    var sCapitao = secao('Capitão');
    var ehCapitao = PJ.ehCapitao(j.id);
    var outro = PJ.estado.capitao && !ehCapitao ? PJ.jogadorPorId(PJ.estado.capitao) : null;
    sCapitao.appendChild(texto(ehCapitao
      ? PJ.primeiroNome(j.nome) + ' é o capitão do time. A faixa aparece na peça dele, na escalação e na foto.'
      : (outro ? 'Hoje quem usa a faixa é ' + outro.nome + '.' : 'Ninguém está com a faixa ainda.')));
    sCapitao.appendChild(bt(ehCapitao
      ? 'Tirar a faixa de ' + PJ.primeiroNome(j.nome)
      : 'Pôr a faixa em ' + PJ.primeiroNome(j.nome),
      ehCapitao ? 'larga' : 'principal larga', function () {
        PJ.definirCapitao(j.id);
        PJ.atualizar();
        PJ.aviso(PJ.ehCapitao(j.id)
          ? PJ.primeiroNome(j.nome) + ' é o novo capitão.'
          : 'O time ficou sem capitão.', 'Desfazer', PJ.desfazerAcao);
      }));
    corpo.appendChild(sCapitao);

    var sOnde = secao('No time');
    var dentro = PJ.estaEmCampo(j.id);
    sOnde.appendChild(texto(PJ.primeiroNome(j.nome) +
      (dentro ? ' está em campo no ' : ' está no banco do ') + m.nome + '.'));
    sOnde.appendChild(bt(dentro ? 'Tirar do campo' : 'Colocar em campo', 'larga', function () {
      if (dentro) {
        PJ.antes('tirar do campo');
        PJ.tirarDoCampo(j.id);
      } else {
        if (PJ.campo().emCampo.length >= m.emCampo) {
          PJ.aviso('O campo já está completo. Tire alguém antes de colocar ' +
            PJ.primeiroNome(j.nome) + '.');
          return;
        }
        PJ.antes('colocar em campo');
        PJ.colocarEmCampo(j.id);
      }
      PJ.atualizar();
    }));
    corpo.appendChild(sOnde);

    corpo.appendChild(bt('Pronto', 'principal larga', function () {
      salvarNome();
      salvarNumero();
      PJ.voltarPainel();
    }));

    var apagar = bt('Apagar ' + PJ.primeiroNome(j.nome) + ' do time', 'larga perigo', function () {
      PJ.perguntar('Apagar ' + j.nome + ' do time? Ele sai da lista e do campo.',
        'Apagar jogador', function () {
          PJ.apagarJogador(j.id);
          PJ.voltarPainel();
        }, true);
    });
    apagar.style.marginTop = '20px';
    corpo.appendChild(apagar);
  },
};

PJ.apagarJogador = function (id) {
  var j = PJ.jogadorPorId(id);
  if (!j) return;
  PJ.antes('apagar jogador');
  PJ.estado.elenco = PJ.estado.elenco.filter(function (x) { return x.id !== id; });
  if (PJ.estado.capitao === id) PJ.estado.capitao = null;
  PJ.ORDEM_MODALIDADES.forEach(function (mid) {
    var c = PJ.estado.campos[mid];
    c.emCampo = c.emCampo.filter(function (p) { return p.id !== id; });
    if (c.base) c.base = c.base.filter(function (p) { return p.id !== id; });
  });
  if (PJ.selecionado === id) PJ.selecionado = null;
  PJ.atualizar();
  PJ.aviso(j.nome + ' foi apagado.', 'Desfazer', PJ.desfazerAcao);
};

// Tira da lista SÓ os nomes de exemplo em que ninguém encostou. Quem o
// treinador renomeou, renumerou ou mudou de posição fica. E isso nunca
// acontece sozinho: só quando ele toca no botão.
PJ.apagarNomesDeExemplo = function () {
  var sobra = PJ.estado.elenco.filter(function (j) { return !j.exemplo; });
  var quantos = PJ.estado.elenco.length - sobra.length;
  if (!quantos) return 0;
  var fica = {};
  sobra.forEach(function (j) { fica[j.id] = true; });
  PJ.antes('apagar nomes de exemplo');
  PJ.estado.elenco = sobra;
  PJ.estado.exemplo = false;
  PJ.ORDEM_MODALIDADES.forEach(function (id) {
    var c = PJ.estado.campos[id];
    c.emCampo = c.emCampo.filter(function (p) { return fica[p.id]; });
    c.base = null;
  });
  PJ.completarEscalacao();
  PJ.atualizar();
  return quantos;
};

function colarLista() {
  var corpo = document.getElementById('folhaCorpo');
  var caixa = cria('div', 'secao');
  caixa.appendChild(cria('p', 'rotulo', 'Cole aqui a lista de nomes, um por linha'));
  var area = document.createElement('textarea');
  area.className = 'caixaTexto';
  area.placeholder = '1 - Zé\n2 - Nando\n3 - Tião';
  caixa.appendChild(area);
  caixa.appendChild(texto('A ordem da lista vira a ordem do campo: o primeiro nome vai para o gol. Depois é só arrastar quem estiver fora do lugar.'));
  var acoes = cria('div', 'linhaBotoes');
  acoes.appendChild(bt('Adicionar todos', 'principal', function () {
    var linhas = area.value.split('\n').map(function (l) {
      return l.replace(/^[\s\-•*.\d)]+/, '').replace(/\(.*?\)/g, '').trim();
    }).filter(function (l) { return l.length > 0 && l.length < 40; });
    if (!linhas.length) { PJ.aviso('Não achei nenhum nome nessa lista.'); return; }
    PJ.antes('colar lista');
    linhas.forEach(function (nome) {
      PJ.estado.elenco.push({ id: PJ.uid(), nome: nome, numero: PJ.proximoNumero(), posicao: '' });
    });
    PJ.completarEscalacao();
    PJ.atualizar();
    PJ.aviso(linhas.length + ' jogadores adicionados.', 'Desfazer', PJ.desfazerAcao);
  }));
  acoes.appendChild(bt('Cancelar', '', function () { PJ.recarregarPainel(); }));
  caixa.appendChild(acoes);
  corpo.textContent = '';
  corpo.appendChild(caixa);
  area.focus();
}

// Coloca em campo quem estiver sobrando, até completar a modalidade.
PJ.completarEscalacao = function () {
  var m = PJ.modalidade();
  var c = PJ.campo();
  var vagas = PJ.vagasDaFormacao(PJ.formacaoPorId(c.formacao));
  var fora = PJ.banco();
  var k = 0;
  while (c.emCampo.length < m.emCampo && k < fora.length) {
    var v = vagas[c.emCampo.length];
    if (!v) break;
    c.emCampo.push({ id: fora[k].id, x: v.x, y: v.y });
    var j = PJ.jogadorPorId(fora[k].id);
    if (j && !PJ.POSICOES[j.posicao]) j.posicao = v.sigla;
    k++;
  }
  c.base = null;
};
