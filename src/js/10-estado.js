// Guarda tudo no próprio aparelho, sem conta e sem internet.
// Também cuida do "Desfazer": antes de cada mudanca, guarda uma cópia.

PJ.CHAVE = 'planodejogo.v2';
PJ.CHAVE_COPIA = 'planodejogo.copia';        // segunda via, gravada junto
PJ.CHAVES_ANTIGAS = ['planodejogo.v1'];      // versões anteriores do aplicativo
PJ.estado = null;

var pilhaDesfazer = [];
var LIMITE_DESFAZER = 30;
var agendaSalvar = null;

PJ.uid = function () {
  PJ.estado.proximoId = (PJ.estado.proximoId || 1) + 1;
  return 'j' + PJ.estado.proximoId;
};

function copia(v) {
  return JSON.parse(JSON.stringify(v));
}

// Monta a escalação inicial de uma modalidade a partir de uma formação.
function escalarDaFormacao(modalidade, formacao, elenco) {
  var emCampo = [];
  for (var i = 0; i < formacao.jogadores.length && i < elenco.length; i++) {
    var slot = formacao.jogadores[i];
    emCampo.push({ id: elenco[i].id, x: slot[1], y: slot[2] });
    if (!elenco[i].posicao) elenco[i].posicao = slot[0];
  }
  return emCampo;
}

function campoVazio(idModalidade, elenco) {
  var m = PJ.MODALIDADES[idModalidade];
  var f = m.formacoes[0];
  return {
    emCampo: escalarDaFormacao(idModalidade, f, elenco),
    formacao: f.id,
    estilo: 'padrao',
    setas: [],
    adversarios: [],
  };
}

PJ.estadoNovo = function () {
  var base = PJ.MODALIDADES.campo11.formacoes[0].jogadores;
  var banco = ['GOL', 'ZAG', 'LD', 'MEI', 'ATA'];   // posições dos reservas
  var elenco = PJ.ELENCO_EXEMPLO.map(function (j, i) {
    return {
      id: 'j' + (i + 1), numero: j.numero, nome: j.nome,
      posicao: base[i] ? base[i][0] : (banco[i - base.length] || 'MEI'),
      exemplo: true,
    };
  });
  var e = {
    versao: 1,
    proximoId: elenco.length,
    exemplo: true,
    nomeTime: 'Meu Time',
    modalidade: 'campo11',
    tela: 'auto',
    adversario: false,
    dicas: 0,
    elenco: elenco,
    capitao: null,
    comissao: PJ.CARGOS_PADRAO.map(function (cargo) {
      return { cargo: cargo, nome: '' };
    }),
    campos: {},
    taticas: [],
    jogo: { ligado: false, nos: 0, eles: 0, registro: [] },
  };
  PJ.ORDEM_MODALIDADES.forEach(function (id) {
    e.campos[id] = campoVazio(id, elenco);
  });
  return e;
};

// Em aba privada, em arquivo local ou com o armazenamento bloqueado, até
// o simples acesso a localStorage estoura. Entao tudo passa por aqui.
PJ.semMemoria = false;

function ler(chave) {
  try { return window.localStorage.getItem(chave); } catch (err) { PJ.semMemoria = true; return null; }
}
function escrever(chave, valor) {
  try {
    window.localStorage.setItem(chave, valor);
    return true;
  } catch (err) {
    var cota = err && (err.name === 'QuotaExceededError' ||
      err.name === 'NS_ERROR_DOM_QUOTA_REACHED' || err.code === 22 || err.code === 1014);
    if (cota) return 'cheio';
    PJ.semMemoria = true;
    return false;
  }
}

function interpretar(bruto, chave) {
  if (!bruto) return null;
  try {
    var lido = JSON.parse(bruto);
    if (lido && Array.isArray(lido.elenco) && lido.elenco.length && lido.campos) return lido;
  } catch (err) {
    // guarda o que não deu para ler, em vez de jogar fora sem avisar
    if (chave) escrever(chave + '.ilegivel', bruto);
  }
  return null;
}

PJ.deOndeVeio = '';

PJ.carregar = function () {
  var lido = interpretar(ler(PJ.CHAVE), PJ.CHAVE);
  if (lido) PJ.deOndeVeio = 'principal';

  // o arquivo principal falhou: tenta a segunda via gravada junto com ele
  if (!lido) {
    lido = interpretar(ler(PJ.CHAVE_COPIA), PJ.CHAVE_COPIA);
    if (lido) PJ.deOndeVeio = 'copia';
  }

  // ainda nada: procura o time guardado por uma versão anterior
  if (!lido) {
    for (var i = 0; i < PJ.CHAVES_ANTIGAS.length && !lido; i++) {
      lido = interpretar(ler(PJ.CHAVES_ANTIGAS[i]), null);
      if (lido) PJ.deOndeVeio = 'antiga';
    }
  }

  if (lido) {
    PJ.estado = PJ.sanear(PJ.completar(lido));
    return false; // não é a primeira vez
  }
  PJ.deOndeVeio = 'novo';
  PJ.estado = PJ.estadoNovo();
  return true; // primeira vez
};

// Vasculha o aparelho atrás de qualquer time guardado por este aplicativo,
// inclusive de versões antigas e de gravações que deram errado.
PJ.procurarTimes = function () {
  var achados = [];
  try {
    for (var i = 0; i < window.localStorage.length; i++) {
      var chave = window.localStorage.key(i);
      if (!chave || chave.indexOf('planodejogo') !== 0) continue;
      var lido = interpretar(window.localStorage.getItem(chave), null);
      if (!lido) continue;
      achados.push({
        chave: chave,
        nome: String(lido.nomeTime || 'Time sem nome'),
        quantos: lido.elenco.length,
        proprios: lido.elenco.filter(function (j) { return !j.exemplo; }).length,
        quando: lido.atualizadoEm || '',
        emUso: chave === PJ.CHAVE,
        dados: lido,
      });
    }
  } catch (err) { /* armazenamento bloqueado */ }
  return achados;
};

// Não deixa número estragado entrar: x ou y virando NaN faz o jogador
// sumir da tela sem nenhum aviso.
PJ.sanear = function (e) {
  var num = function (v, padrao) {
    var n = Number(v);
    return Number.isFinite(n) ? PJ.limitar(n, 0, 100) : padrao;
  };
  PJ.ORDEM_MODALIDADES.forEach(function (id) {
    var c = e.campos[id];
    c.emCampo.forEach(function (p) {
      p.x = num(p.x, 50);
      p.y = num(p.y, 50);
      delete p.sigla;
    });
    c.adversarios = c.adversarios.filter(function (a) {
      a.x = num(a.x, 50); a.y = num(a.y, 50);
      return true;
    });
    c.setas = c.setas.filter(function (s) {
      if (!s || !Array.isArray(s.pontos) || s.pontos.length < 2) return false;
      s.pontos = s.pontos.map(function (p) { return [num(p[0], 50), num(p[1], 50)]; });
      return true;
    });
    if (c.base) {
      c.base.forEach(function (p) { p.x = num(p.x, 50); p.y = num(p.y, 50); });
    }
  });
  e.elenco.forEach(function (j) {
    if (!PJ.POSICOES[j.posicao]) j.posicao = 'MEI';
    j.nome = String(j.nome == null ? 'Jogador' : j.nome).slice(0, 40) || 'Jogador';
    var n = parseInt(j.numero, 10);
    j.numero = Number.isFinite(n) ? PJ.limitar(n, 0, 99) : 0;
  });
  return e;
};

// Preenche o que faltar em um estado antigo, para uma versão nova do
// aplicativo nunca quebrar o time de ninguém.
PJ.completar = function (e) {
  var base = PJ.estadoNovo();
  if (typeof e.nomeTime !== 'string') e.nomeTime = base.nomeTime;
  if (!PJ.MODALIDADES[e.modalidade]) e.modalidade = 'campo11';
  if (!Array.isArray(e.elenco) || !e.elenco.length) e.elenco = base.elenco;
  if (!e.campos) e.campos = {};
  if (typeof e.proximoId !== 'number') e.proximoId = e.elenco.length + 1;
  if (!Array.isArray(e.taticas)) e.taticas = [];
  // o capitão tem que ser alguém que ainda está no time
  if (e.capitao && !e.elenco.some(function (j) { return j.id === e.capitao; })) e.capitao = null;
  if (!Array.isArray(e.comissao)) {
    e.comissao = PJ.CARGOS_PADRAO.map(function (cargo) { return { cargo: cargo, nome: '' }; });
  }
  e.comissao = e.comissao.filter(function (c) { return c && typeof c.cargo === 'string'; })
    .map(function (c) {
      return { cargo: String(c.cargo).slice(0, 30), nome: String(c.nome || '').slice(0, 40) };
    }).slice(0, 12);
  if (!e.jogo) e.jogo = base.jogo;
  if (!Array.isArray(e.jogo.registro)) e.jogo.registro = [];
  if (typeof e.dicas !== 'number') e.dicas = 99;
  if (typeof e.tela !== 'string') e.tela = 'auto';
  e.elenco.forEach(function (j) {
    if (!PJ.POSICOES[j.posicao]) j.posicao = 'MEI';
  });
  // Marca jogador por jogador quem ainda é do time de exemplo. Quem o
  // treinador renomeou, renumerou ou mudou de posição JAMAIS é marcado —
  // é time dele e não pode sumir por causa de uma limpeza automática.
  var temMarca = e.elenco.some(function (j) { return typeof j.exemplo === 'boolean'; });
  if (!temMarca) {
    e.elenco.forEach(function (j, i) {
      var molde = PJ.ELENCO_EXEMPLO[i];
      j.exemplo = !!(e.exemplo && molde && j.nome === molde.nome);
      // quem ainda é de exemplo recebe a numeração corrigida
      if (j.exemplo) j.numero = molde.numero;
    });
  }
  e.exemplo = e.elenco.some(function (j) { return j.exemplo; });
  PJ.ORDEM_MODALIDADES.forEach(function (id) {
    var c = e.campos[id];
    if (!c || !Array.isArray(c.emCampo)) {
      e.campos[id] = campoVazio(id, e.elenco);
      return;
    }
    if (!Array.isArray(c.setas)) c.setas = [];
    if (!Array.isArray(c.adversarios)) c.adversarios = [];
    if (typeof c.estilo !== 'string') c.estilo = 'padrao';
    // tira jogador que não existe mais no elenco
    c.emCampo = c.emCampo.filter(function (p) {
      return e.elenco.some(function (j) { return j.id === p.id; });
    });
  });
  return e;
};

function gravarAgora() {
  if (agendaSalvar) { window.clearTimeout(agendaSalvar); agendaSalvar = null; }
  PJ.estado.atualizadoEm = new Date().toISOString();
  var texto = JSON.stringify(PJ.estado);
  var r = escrever(PJ.CHAVE, texto);
  if (r === 'cheio') {
    // faz espaço tirando o que é descartável, nunca o elenco
    PJ.estado.jogo.registro = PJ.estado.jogo.registro.slice(-20);
    PJ.estado.taticas = PJ.estado.taticas.slice(-20);
    texto = JSON.stringify(PJ.estado);
    r = escrever(PJ.CHAVE, texto);
  }
  // segunda via: se a gravação principal se perder, o time continua aqui
  if (r === true) escrever(PJ.CHAVE_COPIA, texto);
  PJ.avisarSalvo(r === true);
}

PJ.salvar = function () {
  if (agendaSalvar) window.clearTimeout(agendaSalvar);
  agendaSalvar = window.setTimeout(gravarAgora, 300);
};

// O celular pode ir para segundo plano a qualquer momento: grava na hora.
PJ.ligarGravacaoSegura = function () {
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') gravarAgora();
  });
  window.addEventListener('pagehide', gravarAgora);
};

// ------------------------------------------------------------- desfazer

PJ.antes = function (rotulo) {
  pilhaDesfazer.push({ rotulo: rotulo, estado: copia(PJ.estado) });
  if (pilhaDesfazer.length > LIMITE_DESFAZER) pilhaDesfazer.shift();
  PJ.atualizarDesfazer();
};

PJ.temDesfazer = function () {
  return pilhaDesfazer.length > 0;
};

PJ.ultimoRotulo = function () {
  return pilhaDesfazer.length ? pilhaDesfazer[pilhaDesfazer.length - 1].rotulo : '';
};

PJ.desfazer = function () {
  if (!pilhaDesfazer.length) return null;
  var passo = pilhaDesfazer.pop();
  PJ.estado = passo.estado;
  PJ.salvar();
  PJ.atualizarDesfazer();
  return passo.rotulo;
};

// -------------------------------------------------------------- atalhos

PJ.campo = function () {
  return PJ.estado.campos[PJ.estado.modalidade];
};

PJ.modalidade = function () {
  return PJ.MODALIDADES[PJ.estado.modalidade];
};

PJ.jogadorPorId = function (id) {
  for (var i = 0; i < PJ.estado.elenco.length; i++) {
    if (PJ.estado.elenco[i].id === id) return PJ.estado.elenco[i];
  }
  return null;
};

PJ.estaEmCampo = function (id) {
  return PJ.campo().emCampo.some(function (p) { return p.id === id; });
};

PJ.banco = function () {
  return PJ.estado.elenco.filter(function (j) { return !PJ.estaEmCampo(j.id); });
};

// Sugere a camisa que combina com a posição: o lateral-esquerdo nasce 6,
// o direito 2, o volante 5. Se o número já estiver com alguém, cai para a
// segunda opção e depois para o primeiro livre.
PJ.numeroParaPosicao = function (sigla) {
  var pos = PJ.POSICOES[sigla];
  if (!pos) return PJ.proximoNumero();
  var usados = {};
  PJ.estado.elenco.forEach(function (j) { usados[j.numero] = true; });
  if (pos.camisa && !usados[pos.camisa]) return pos.camisa;
  if (pos.camisa2 && !usados[pos.camisa2]) return pos.camisa2;
  return PJ.proximoNumero();
};

// Quantos nomes de exemplo ainda estão na lista, sem ninguém ter mexido.
PJ.ehCapitao = function (id) {
  return !!id && PJ.estado.capitao === id;
};

// Um capitão só: escolher outro passa a faixa.
PJ.definirCapitao = function (id) {
  PJ.antes('capitão do time');
  PJ.estado.capitao = PJ.estado.capitao === id ? null : id;
  PJ.marcarComoMeu(PJ.jogadorPorId(id));
};

PJ.quantosDeExemplo = function () {
  return PJ.estado.elenco.filter(function (j) { return j.exemplo; }).length;
};

// Qualquer mexida num jogador faz dele um jogador do treinador.
PJ.marcarComoMeu = function (j) {
  if (j) j.exemplo = false;
};

PJ.proximoNumero = function () {
  var usados = {};
  PJ.estado.elenco.forEach(function (j) { usados[j.numero] = true; });
  for (var n = 1; n < 100; n++) if (!usados[n]) return n;
  return 0;
};

// ----------------------------------------- formações, vagas e estilos

PJ.limitar = function (v, min, max) {
  return Math.max(min, Math.min(max, v));
};

PJ.ehGoleiro = function (idJogador) {
  var j = PJ.jogadorPorId(idJogador);
  return !!(j && j.posicao === 'GOL');
};

// Encaixa quem ESTÁ em campo agora nas vagas de um desenho. Ninguém entra,
// ninguém sai: cada jogador vai para a vaga mais perto de onde já estava,
// com preferência para a vaga da posição dele.
PJ.encaixarNasVagas = function (vagas) {
  var c = PJ.campo();
  var sobrando = c.emCampo.slice();
  var pares = [];
  vagas.forEach(function (v, iv) {
    sobrando.forEach(function (p, ip) {
      var j = PJ.jogadorPorId(p.id) || {};
      var mesma = j.posicao === v.sigla ? 0 : 1;
      var d = Math.sqrt(Math.pow(p.x - v.x, 2) + Math.pow(p.y - v.y, 2));
      pares.push({ iv: iv, ip: ip, custo: mesma * 22 + d });
    });
  });
  pares.sort(function (a, b) { return a.custo - b.custo; });

  var vagaOcupada = {};
  var jaColocado = {};
  var novo = [];
  pares.forEach(function (par) {
    if (vagaOcupada[par.iv] || jaColocado[par.ip]) return;
    vagaOcupada[par.iv] = true;
    jaColocado[par.ip] = true;
    var v = vagas[par.iv];
    var p = sobrando[par.ip];
    novo.push({ id: p.id, x: v.x, y: v.y });
    var j = PJ.jogadorPorId(p.id);
    if (j && !PJ.POSICOES[j.posicao]) j.posicao = v.sigla;
  });
  // se houver mais gente em campo que vagas, quem sobrou fica onde estava
  sobrando.forEach(function (p, ip) { if (!jaColocado[ip]) novo.push(p); });

  c.emCampo = novo;
  c.base = null;
  return vagas.length - novo.filter(function (p, i) { return i < vagas.length; }).length;
};

PJ.formacaoPorId = function (id) {
  var m = PJ.modalidade();
  for (var i = 0; i < m.formacoes.length; i++) if (m.formacoes[i].id === id) return m.formacoes[i];
  return m.formacoes[0];
};

PJ.vagasDaFormacao = function (f) {
  return f.jogadores.map(function (slot) {
    return { sigla: slot[0], x: slot[1], y: slot[2] };
  });
};

PJ.aplicarFormacao = function (idFormacao) {
  var c = PJ.campo();
  var f = PJ.formacaoPorId(idFormacao);
  PJ.encaixarNasVagas(PJ.vagasDaFormacao(f));
  c.formacao = f.id;
  c.estilo = 'padrao';
};

// Afasta quem ficou colado depois de mexer no time todo de uma vez.
// A conta leva em conta que o campo é mais alto do que largo.
function afastarColados(lista, m) {
  var minimo = 17;
  var borda = m.margemLateral;
  for (var passo = 0; passo < 2; passo++) {
    for (var a = 0; a < lista.length; a++) {
      for (var b = a + 1; b < lista.length; b++) {
        var pa = lista[a];
        var pb = lista[b];
        var dx = pa.x - pb.x;
        var dy = (pa.y - pb.y) / m.proporcao;
        var d = Math.sqrt(dx * dx + dy * dy);
        if (d >= minimo) continue;
        var falta = (minimo - d) / 2;
        var sinal = dx === 0 ? (a % 2 === 0 ? 1 : -1) : (dx > 0 ? 1 : -1);
        pa.x = PJ.limitar(pa.x + sinal * falta, borda, 100 - borda);
        pb.x = PJ.limitar(pb.x - sinal * falta, borda, 100 - borda);
      }
    }
  }
}

// O estilo de jogo mexe o time inteiro de uma vez, sempre a partir do
// desenho guardado, para o efeito nunca acumular.
PJ.aplicarEstilo = function (idEstilo) {
  var c = PJ.campo();
  var m = PJ.modalidade();
  var est = PJ.estiloPorId(idEstilo);
  if (!c.base) c.base = copia(c.emCampo);

  var linha = c.base.filter(function (p) { return !PJ.ehGoleiro(p.id); });
  if (!linha.length) { c.estilo = idEstilo; return; }
  var centro = linha.reduce(function (soma, p) { return soma + p.y; }, 0) / linha.length;

  // quem é o homem da frente, para o contra-ataque esticar só ele
  var naFrente = {};
  if (est.esticaFrente) {
    var quantos = m.emCampo >= 7 ? 2 : 1;
    linha.slice().sort(function (a, b) { return b.y - a.y; }).slice(0, quantos)
      .forEach(function (p) { naFrente[p.id] = true; });
  }

  c.emCampo = c.base.map(function (p) {
    var novo = { id: p.id, x: p.x, y: p.y };
    if (PJ.ehGoleiro(p.id)) {
      novo.y = PJ.limitar(p.y + est.desloca * 0.3, 6, 45);
      return novo;
    }
    novo.x = PJ.limitar(50 + (p.x - 50) * est.abre, m.margemLateral, 100 - m.margemLateral);
    var y = centro + (p.y - centro) * est.compacta + est.desloca;
    if (naFrente[p.id]) y += est.esticaFrente;
    novo.y = PJ.limitar(y, 8, m.alturaMaxima);
    return novo;
  });

  afastarColados(c.emCampo, m);
  c.estilo = idEstilo;
};

// Quando o treinador arrasta alguém na mão, o desenho guardado passa a ser
// o que está na tela: o próximo estilo parte dali.
PJ.fixarComoBase = function () {
  PJ.campo().base = copia(PJ.campo().emCampo);
};
