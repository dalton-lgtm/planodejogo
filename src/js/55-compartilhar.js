// Mandar a escalação, gerar a foto do campo, anotações do jogo e ajustes.

PJ.hoje = function () {
  var d = new Date();
  var doisDigitos = function (n) { return (n < 10 ? '0' : '') + n; };
  return doisDigitos(d.getDate()) + '/' + doisDigitos(d.getMonth() + 1) + '/' + d.getFullYear();
};

PJ.relogioDoJogo = function () {
  var d = new Date();
  return ((d.getHours() < 10 ? '0' : '') + d.getHours()) + ':' +
    ((d.getMinutes() < 10 ? '0' : '') + d.getMinutes());
};

// ------------------------------------------------- texto da escalação

PJ.textoDaEscalacao = function (recado) {
  var m = PJ.modalidade();
  var c = PJ.campo();
  var grupos = { goleiro: [], defesa: [], meio: [], ataque: [] };
  c.emCampo.slice().sort(function (a, b) { return a.y - b.y || a.x - b.x; }).forEach(function (p) {
    var j = PJ.jogadorPorId(p.id);
    if (!j) return;
    var pos = PJ.POSICOES[j.posicao] || { setor: 'meio' };
    grupos[pos.setor].push(j.numero + ' ' + j.nome + (PJ.ehCapitao(j.id) ? ' (C)' : ''));
  });

  var linhas = [];
  linhas.push('ESCALAÇÃO — ' + PJ.estado.nomeTime.toUpperCase());
  linhas.push(m.nome + ' — ' + PJ.hoje());
  var est = PJ.estiloPorId(c.estilo);
  var nomeFormacao = '';
  m.formacoes.forEach(function (f) { if (f.id === c.formacao) nomeFormacao = f.nome; });
  if (nomeFormacao) linhas.push('Formação: ' + nomeFormacao + (est.id !== 'padrao' ? ' — ' + est.nome : ''));
  linhas.push('');
  if (grupos.goleiro.length) linhas.push('Goleiro: ' + grupos.goleiro.join(', '));
  if (grupos.defesa.length) linhas.push('Defesa: ' + grupos.defesa.join(', '));
  if (grupos.meio.length) linhas.push('Meio: ' + grupos.meio.join(', '));
  if (grupos.ataque.length) linhas.push('Frente: ' + grupos.ataque.join(', '));
  var banco = PJ.banco();
  if (banco.length) {
    linhas.push('');
    linhas.push('Banco: ' + banco.map(function (j) { return j.numero + ' ' + j.nome; }).join(', '));
  }
  var comissao = PJ.estado.comissao.filter(function (c) { return c.nome; });
  if (comissao.length) {
    linhas.push('');
    comissao.forEach(function (c) { linhas.push(c.cargo + ': ' + c.nome); });
  }
  if (recado) { linhas.push(''); linhas.push(recado); }
  return linhas.join('\n');
};

PJ.PAINEIS.mandar = {
  alto: true,
  titulo: function () { return 'Mandar a escalação'; },
  montar: function (corpo) {
    corpo.appendChild(cria('p', 'rotulo', 'Escreva um recado (se quiser)'));
    var recado = document.createElement('input');
    recado.type = 'text';
    recado.placeholder = 'Jogo domingo, 9h, campo do bairro';
    recado.value = PJ.estado.recado || '';
    corpo.appendChild(recado);

    corpo.appendChild(cria('p', 'rotulo', 'Vai sair assim:'));
    var previa = document.createElement('textarea');
    previa.className = 'caixaTexto';
    previa.readOnly = true;
    previa.value = PJ.textoDaEscalacao(recado.value.trim());
    corpo.appendChild(previa);

    recado.addEventListener('input', function () {
      PJ.estado.recado = recado.value;
      previa.value = PJ.textoDaEscalacao(recado.value.trim());
      PJ.salvar();
    });

    // o botão de copiar funciona sempre, inclusive sem internet e com o
    // arquivo aberto do computador. O do WhatsApp, não — então ele só
    // aparece quando tem como dar certo.
    corpo.appendChild(bt('Copiar a lista', 'principal larga', function () {
      PJ.copiar(previa.value, previa);
    }));

    if (location.protocol === 'https:' || location.protocol === 'http:') {
      corpo.appendChild(bt('Abrir o WhatsApp com a lista', 'larga', function () {
        var url = 'https://wa.me/?text=' + encodeURIComponent(previa.value);
        var janela = window.open(url, '_blank', 'noopener');
        if (!janela) PJ.aviso('Não consegui abrir o WhatsApp. Use o botão "Copiar a lista" e cole no grupo.');
      }));
    }

    corpo.appendChild(bt('Foto do campo', 'larga', function () { PJ.abrirPainel('foto'); }));
  },
};

// Entregar um arquivo ao treinador funciona de dois jeitos: na página
// publicada quem salva é o próprio aplicativo do Claude; no arquivo aberto
// do computador é o link de download comum do navegador.
PJ.entregarArquivo = function (nomeArquivo, dados, recado) {
  var pelaAncora = function () {
    try {
      var ehBlob = typeof Blob !== 'undefined' && dados instanceof Blob;
      var url = ehBlob
        ? URL.createObjectURL(dados)
        : 'data:text/plain;charset=utf-8,' + encodeURIComponent(dados);
      var a = document.createElement('a');
      a.href = url;
      a.download = nomeArquivo;
      document.body.appendChild(a);
      a.click();
      a.remove();
      if (ehBlob) window.setTimeout(function () { URL.revokeObjectURL(url); }, 5000);
      PJ.aviso('Arquivo salvo no aparelho.');
    } catch (err) {
      PJ.aviso(recado);
    }
  };

  if (window.claude && typeof window.claude.use === 'function') {
    window.claude.use('downloads').then(function (downloads) {
      if (!downloads) { PJ.aviso(recado); return; }
      downloads.save({ filename: nomeArquivo, data: dados }).then(function () {
        PJ.aviso('Arquivo salvo no aparelho.');
      }, function (erro) {
        if (erro && erro.code === 'declined') return;   // ele mesmo cancelou
        PJ.aviso(recado);
      });
    }, function () { PJ.aviso(recado); });
    return;
  }
  pelaAncora();
};

PJ.copiar = function (txt, campo, recado) {
  var msg = recado || 'Lista copiada. Agora é só colar no WhatsApp.';
  var deuCerto = function () { PJ.aviso(msg); };
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(txt).then(deuCerto, function () { selecionar(campo, msg); });
      return;
    }
  } catch (err) { /* cai para a seleção na mão */ }
  selecionar(campo, msg);
};

function selecionar(campo, msg) {
  if (!campo) return;
  campo.readOnly = false;
  campo.focus();
  campo.setSelectionRange(0, campo.value.length);
  try {
    document.execCommand('copy');
    PJ.aviso(msg || 'Lista copiada. Agora é só colar no WhatsApp.');
  } catch (err) {
    PJ.aviso('Segure o dedo no texto marcado e escolha Copiar.');
  }
  campo.readOnly = true;
}

// --------------------------------------------------------- foto do campo

PJ.corDoTema = function (nome) {
  return getComputedStyle(document.documentElement).getPropertyValue(nome).trim() || '#2e7d32';
};

// Corta o texto com reticências para caber na largura pedida.
function cortarTexto(ctx, texto, largura) {
  if (ctx.measureText(texto).width <= largura) return texto;
  var corte = texto;
  while (corte.length > 1 && ctx.measureText(corte + '…').width > largura) {
    corte = corte.slice(0, -1);
  }
  return corte + '…';
}

PJ.gerarFoto = function () {
  var m = PJ.modalidade();
  var c = PJ.campo();

  // A foto usa as MESMAS proporções da tela: disco, sigla e nome no mesmo
  // tamanho relativo ao campo. Antes o jogador saía bem menor do que na
  // prancheta e o nome ficava impossível de ler no WhatsApp.
  var larg = 1200;
  var margem = Math.round(larg * 0.04);
  var campoLarg = larg - margem * 2;
  var campoAlt = campoLarg / m.proporcao;
  var topo = Math.round(larg * 0.15);
  var rodape = Math.round(larg * 0.13);
  var alt = Math.round(topo + campoAlt + rodape);

  var cv = document.createElement('canvas');
  cv.width = larg;
  cv.height = alt;
  var ctx = cv.getContext('2d');
  var fonte = "system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif";

  var cores = {
    grama: PJ.corDoTema('--grama') || '#2e7d32',
    gramaFaixa: PJ.corDoTema('--gramaFaixa') || '#276e2b',
    cal: '#f5f7f0',
    meio: PJ.corDoTema('--meio') || '#d4142a',
  };
  if (m.superficie === 'sintetico') { cores.grama = '#245f35'; cores.gramaFaixa = '#245f35'; }
  if (m.superficie === 'quadra') { cores.grama = '#2f5358'; cores.gramaFaixa = '#2f5358'; }

  // fundo sempre opaco: PNG transparente aparece preto no WhatsApp
  ctx.fillStyle = '#11160f';
  ctx.fillRect(0, 0, larg, alt);

  ctx.textAlign = 'left';
  ctx.fillStyle = '#f5f7f0';
  ctx.font = '800 ' + Math.round(larg * 0.05) + 'px ' + fonte;
  ctx.fillText(PJ.estado.nomeTime.slice(0, 24), margem, Math.round(larg * 0.062));

  var nomeFormacao = '';
  m.formacoes.forEach(function (f) { if (f.id === c.formacao) nomeFormacao = f.nome; });
  var est = PJ.estiloPorId(c.estilo);
  ctx.fillStyle = '#b3bdb0';
  ctx.font = '700 ' + Math.round(larg * 0.029) + 'px ' + fonte;
  ctx.fillText(m.nome + '  ·  ' + (nomeFormacao || 'Escalação') +
    (est.id !== 'padrao' ? '  ·  ' + est.nome : '') + '  ·  ' + PJ.hoje(),
    margem, Math.round(larg * 0.107));

  PJ.desenharCampoCanvas(ctx, margem, topo, campoLarg, campoAlt, m, cores);
  PJ.desenharSetasCanvas(ctx, margem, topo, campoLarg, campoAlt, c.setas);

  // ------------------------------------------------------------ jogadores
  var proporcaoDisco = m.id === 'futsal' ? 0.17 : (m.id === 'society' ? 0.145 : 0.125);
  var disco = campoLarg * proporcaoDisco;
  var raio = disco / 2;
  var fonteNome = Math.round(disco * 0.26);
  var alturaPlaca = Math.round(fonteNome * 1.7);
  var medidas = PJ.medidasDaPlaca(c.emCampo, campoLarg, campoAlt, disco, alturaPlaca);
  var corCasa = PJ.corDoTema('--casa') || '#f25c05';

  c.emCampo.forEach(function (p) {
    var j = PJ.jogadorPorId(p.id);
    if (!j) return;
    var px = margem + (p.x / 100) * campoLarg;
    var py = topo + ((100 - p.y) / 100) * campoAlt;
    var md = medidas[p.id] || {};

    ctx.textAlign = 'center';
    ctx.beginPath();
    ctx.arc(px, py + raio * 0.12, raio, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(6,18,8,0.45)';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(px, py, raio, 0, Math.PI * 2);
    ctx.fillStyle = corCasa;
    ctx.fill();
    ctx.lineWidth = Math.max(2, raio * 0.13);
    ctx.strokeStyle = '#11160f';
    ctx.stroke();

    ctx.fillStyle = 'rgba(245,247,240,0.95)';
    ctx.font = '700 ' + Math.round(disco * 0.185) + 'px ' + fonte;
    ctx.fillText(j.posicao, px, py - disco * 0.08);

    ctx.fillStyle = '#f5f7f0';
    ctx.font = '800 ' + Math.round(disco * 0.42) + 'px ' + fonte;
    ctx.fillText(String(j.numero), px, py + disco * 0.25);

    if (PJ.ehCapitao(j.id)) {
      var rc = raio * 0.4;
      var fx = px - raio * 0.72;
      var fy = py + raio * 0.72;
      ctx.beginPath();
      ctx.arc(fx, fy, rc, 0, Math.PI * 2);
      ctx.fillStyle = '#ffd400';
      ctx.fill();
      ctx.lineWidth = Math.max(2, rc * 0.22);
      ctx.strokeStyle = '#11160f';
      ctx.stroke();
      ctx.fillStyle = '#11160f';
      ctx.font = '800 ' + Math.round(rc * 1.25) + 'px ' + fonte;
      ctx.fillText('C', fx, fy + rc * 0.45);
    }

    if (md.oculta || md.largura == null) return;
    ctx.font = '700 ' + fonteNome + 'px ' + fonte;
    var nome = cortarTexto(ctx, PJ.primeiroNome(j.nome), md.largura - fonteNome * 0.8);
    var caixaL = Math.min(ctx.measureText(nome).width + fonteNome * 0.8, md.largura);
    var esquerdaLim = margem + md.esquerdaNoCampo;
    var caixaX = PJ.limitar(px - caixaL / 2, esquerdaLim, esquerdaLim + md.largura - caixaL);
    var caixaY = topo + md.topo;

    ctx.fillStyle = '#f5f7f0';
    ctx.strokeStyle = '#11160f';
    ctx.lineWidth = Math.max(2, fonteNome * 0.14);
    ctx.beginPath();
    ctx.rect(caixaX, caixaY, caixaL, alturaPlaca);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#11160f';
    ctx.textAlign = 'center';
    ctx.fillText(nome, caixaX + caixaL / 2, caixaY + alturaPlaca * 0.71);
  });

  if (PJ.estado.adversario) {
    ctx.textAlign = 'center';
    c.adversarios.forEach(function (a) {
      var px = margem + (a.x / 100) * campoLarg;
      var py = topo + ((100 - a.y) / 100) * campoAlt;
      ctx.beginPath();
      ctx.arc(px, py, raio * 0.82, 0, Math.PI * 2);
      ctx.fillStyle = PJ.corDoTema('--visitante') || '#1257c9';
      ctx.fill();
      ctx.lineWidth = Math.max(2, raio * 0.12);
      ctx.strokeStyle = '#11160f';
      ctx.stroke();
      ctx.fillStyle = '#fff';
      ctx.font = '800 ' + Math.round(disco * 0.4) + 'px ' + fonte;
      ctx.fillText(String(a.n), px, py + disco * 0.14);
    });
  }

  // --------------------------------------------------------------- rodapé
  var banco = PJ.banco();
  ctx.textAlign = 'left';
  ctx.fillStyle = '#b3bdb0';
  ctx.font = '700 ' + Math.round(larg * 0.026) + 'px ' + fonte;
  var textoBanco = banco.length
    ? 'Banco: ' + banco.map(function (jj) {
      return jj.numero + ' ' + jj.nome + (PJ.ehCapitao(jj.id) ? ' (C)' : '');
    }).join(', ')
    : 'Todo o time está em campo.';
  ctx.fillText(cortarTexto(ctx, textoBanco, campoLarg), margem, topo + campoAlt + Math.round(larg * 0.042));

  var comissaoFoto = PJ.estado.comissao.filter(function (x) { return x.nome; })
    .map(function (x) { return x.cargo + ': ' + x.nome; }).join('   ·   ');
  if (comissaoFoto) {
    ctx.fillStyle = '#8f9a8d';
    ctx.font = '700 ' + Math.round(larg * 0.024) + 'px ' + fonte;
    ctx.fillText(cortarTexto(ctx, comissaoFoto, campoLarg), margem, topo + campoAlt + Math.round(larg * 0.075));
  }
  ctx.fillStyle = '#6f7a6d';
  ctx.font = '700 ' + Math.round(larg * 0.021) + 'px ' + fonte;
  ctx.fillText('Plano de Jogo', margem, topo + campoAlt + Math.round(larg * 0.107));

  return cv;
};

PJ.PAINEIS.foto = {
  alto: true,
  titulo: function () { return 'Foto do campo'; },
  montar: function (corpo) {
    var cv;
    try {
      cv = PJ.gerarFoto();
    } catch (err) {
      corpo.appendChild(texto('Não consegui montar a foto neste aparelho. Use o print da tela.'));
      return;
    }
    var img = document.createElement('img');
    img.className = 'previaFoto';
    img.alt = 'Campo com a escalação do ' + PJ.estado.nomeTime;
    try {
      img.src = cv.toDataURL('image/png');
    } catch (err) {
      corpo.appendChild(texto('Não consegui montar a foto neste aparelho. Use o print da tela.'));
      return;
    }
    corpo.appendChild(img);
    corpo.appendChild(texto('Segure o dedo em cima da foto para salvar ou mandar no WhatsApp.'));

    if (navigator.share && navigator.canShare) {
      corpo.appendChild(bt('Mandar a foto', 'principal larga', function () {
        cv.toBlob(function (blob) {
          if (!blob) { PJ.aviso('Não consegui preparar a foto. Segure o dedo na imagem para salvar.'); return; }
          var arquivo = new File([blob], 'escalacao.png', { type: 'image/png' });
          if (!navigator.canShare({ files: [arquivo] })) {
            PJ.aviso('Este aparelho não deixa mandar a foto direto. Segure o dedo na imagem para salvar.');
            return;
          }
          navigator.share({ files: [arquivo], title: PJ.estado.nomeTime }).catch(function () { /* cancelou */ });
        }, 'image/png');
      }));
    }

    corpo.appendChild(bt('Salvar a foto', 'larga', function () {
      cv.toBlob(function (blob) {
        if (!blob) {
          PJ.aviso('Não consegui preparar a foto. Segure o dedo na imagem para salvar.');
          return;
        }
        PJ.entregarArquivo('escalacao.png', blob,
          'Não deu para salvar por aqui. Segure o dedo em cima da foto e escolha salvar.');
      }, 'image/png');
    }));
  },
};

// ------------------------------------------------------ anotações do jogo

PJ.registrarNoJogo = function (txt) {
  if (!PJ.estado.jogo.ligado) return;
  PJ.estado.jogo.registro.push({ hora: PJ.relogioDoJogo(), texto: txt });
  if (PJ.estado.jogo.registro.length > 80) PJ.estado.jogo.registro.shift();
};

PJ.PAINEIS.jogo = {
  alto: true,
  titulo: function () { return 'Anotações do jogo'; },
  montar: function (corpo) {
    var j = PJ.estado.jogo;
    if (!j.ligado) {
      corpo.appendChild(texto('Ligue as anotações para o aplicativo guardar o placar e tudo que você mudar durante a partida.'));
      corpo.appendChild(bt('Começar o jogo', 'principal larga', function () {
        PJ.antes('começar o jogo');
        PJ.estado.jogo = { ligado: true, nos: 0, eles: 0, registro: [] };
        PJ.estado.jogo.registro.push({ hora: PJ.relogioDoJogo(), texto: 'Começo do jogo' });
        PJ.salvar();
        PJ.recarregarPainel();
      }));
      if (j.registro.length) {
        corpo.appendChild(cria('p', 'rotulo', 'Último jogo'));
        corpo.appendChild(listaDoJogo(j));
      }
      return;
    }

    var placar = cria('p', 'rotulo',
      PJ.estado.nomeTime + '  ' + j.nos + '  x  ' + j.eles + '  Adversário');
    placar.style.fontSize = '20px';
    corpo.appendChild(placar);

    var gols = cria('div', 'linhaBotoes');
    gols.appendChild(bt('Gol nosso', 'principal', function () {
      PJ.antes('gol'); j.nos++; PJ.registrarNoJogo('Gol nosso (' + j.nos + ' x ' + j.eles + ')');
      PJ.salvar(); PJ.recarregarPainel();
    }));
    gols.appendChild(bt('Gol deles', '', function () {
      PJ.antes('gol'); j.eles++; PJ.registrarNoJogo('Gol deles (' + j.nos + ' x ' + j.eles + ')');
      PJ.salvar(); PJ.recarregarPainel();
    }));
    corpo.appendChild(gols);

    var marcos = cria('div', 'linhaBotoes');
    marcos.appendChild(bt('Intervalo', '', function () {
      PJ.registrarNoJogo('Intervalo'); PJ.salvar(); PJ.recarregarPainel();
    }));
    marcos.appendChild(bt('Fim de jogo', '', function () {
      PJ.antes('fim de jogo');
      PJ.registrarNoJogo('Fim de jogo (' + j.nos + ' x ' + j.eles + ')');
      j.ligado = false;
      PJ.salvar();
      PJ.recarregarPainel();
    }));
    corpo.appendChild(marcos);

    corpo.appendChild(cria('p', 'rotulo', 'O que aconteceu'));
    corpo.appendChild(listaDoJogo(j));
  },
};

function listaDoJogo(j) {
  var lista = cria('div', 'lista');
  if (!j.registro.length) {
    lista.appendChild(texto('Ainda não aconteceu nada.'));
    return lista;
  }
  j.registro.slice().reverse().forEach(function (r) {
    var item = cria('div', 'itemLista');
    var quem = cria('span', 'quem');
    quem.appendChild(cria('strong', null, r.texto));
    quem.appendChild(cria('span', 'etiqueta', r.hora));
    item.appendChild(quem);
    lista.appendChild(item);
  });
  return lista;
}


// --------------------------------- levar o time para outro link ou aparelho
// O time é guardado no aparelho E no endereço em que o aplicativo foi aberto.
// Trocou de celular ou de link, ele começa do zero — não some nada do lugar
// antigo, mas também não vai junto sozinho. Este código leva tudo de uma vez,
// e é o MESMO conteúdo do arquivo de cópia: um serve no lugar do outro.

PJ.PAINEIS.levar = {
  alto: true,
  titulo: function () { return 'Levar o time'; },
  montar: function (corpo) {
    corpo.appendChild(texto('O seu time fica guardado no aparelho e no endereço em que você abriu o aplicativo. Em outro celular, ou num link diferente, ele começa do zero com o time de exemplo. Este código leva tudo: nomes, camisas, posições, capitão, comissão e táticas.'));

    var levar = secao('1. Copiar o time que está aqui');
    var codigo = document.createElement('textarea');
    codigo.className = 'caixaTexto';
    codigo.readOnly = true;
    codigo.value = JSON.stringify(PJ.estado);
    codigo.setAttribute('aria-label', 'Código do seu time');
    levar.appendChild(codigo);
    levar.appendChild(bt('Copiar o código do time', 'principal larga', function () {
      PJ.copiar(codigo.value, codigo,
        'Código copiado. Cole numa conversa do WhatsApp com você mesmo para não perder.');
    }));
    levar.appendChild(texto('São ' + PJ.estado.elenco.length + ' jogadores neste código. Cole numa conversa do WhatsApp com você mesmo; no outro aparelho, copie de lá e traga no passo 2.'));
    corpo.appendChild(levar);

    var trazer = secao('2. Trazer para cá um time de outro lugar');
    var colado = document.createElement('textarea');
    colado.className = 'caixaTexto';
    colado.placeholder = 'Cole aqui o código que você copiou do outro aparelho';
    colado.setAttribute('aria-label', 'Código do time que vem de outro aparelho');
    trazer.appendChild(colado);
    trazer.appendChild(bt('Trazer o time deste código', 'larga', function () {
      var lido = null;
      try {
        lido = JSON.parse(colado.value.trim());
      } catch (err) {
        lido = null;
      }
      if (!lido || !Array.isArray(lido.elenco) || !lido.elenco.length || !lido.campos) {
        PJ.aviso('Esse código não é um time do Plano de Jogo. Copie o código inteiro, do primeiro ao último caractere, sem faltar nada.');
        return;
      }
      PJ.perguntar('Trazer o time "' + String(lido.nomeTime || 'sem nome') + '", com ' +
        lido.elenco.length + ' jogadores? O time de agora sai da tela — se errar, é só tocar em Desfazer.',
        'Trazer este time', function () {
          PJ.antes('trazer time de outro aparelho');
          PJ.estado = PJ.sanear(PJ.completar(lido));
          PJ.aplicarTema();
          PJ.atualizar();
          PJ.aviso('Time "' + PJ.estado.nomeTime + '" trazido, com ' + PJ.estado.elenco.length +
            ' jogadores.', 'Desfazer', PJ.desfazerAcao);
        });
    }));
    trazer.appendChild(texto('Serve também para o arquivo da cópia: abra o arquivo, copie tudo o que está escrito dentro dele e cole aqui.'));
    corpo.appendChild(trazer);

    corpo.appendChild(bt('Pronto', 'principal larga', function () {
      if (PJ.pilhaPaineis.length) PJ.voltarPainel(); else PJ.fecharPainel();
    }));
  },
};
