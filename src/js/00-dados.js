// Dados do jogo: modalidades, medidas reais dos campos, posições,
// formações prontas e estilos de jogo.
//
// SISTEMA DE COORDENADAS (o mesmo em todo o aplicativo):
//   x = 0 na lateral esquerda, x = 100 na lateral direita
//   y = 0 na linha de fundo do NOSSO gol, y = 100 na linha de fundo do gol adversário
//   raio/medida redonda = porcentagem da LARGURA do campo
// O campo e sempre desenhado em pe (retrato), com o nosso gol embaixo,
// igual ao desenho que o treinador fez a mão.

var PJ = {};

// ---------------------------------------------------------------- posições

// `camisa` e `camisa2` são a numeração clássica do futebol brasileiro:
// 1 goleiro, 2 lateral-direito, 3 e 4 zagueiros, 5 volante, 6 lateral-
// esquerdo, 7 ponta-direita, 8 e 10 meias, 9 centroavante, 11 ponta-
// esquerda. O aplicativo usa isso só para sugerir o número ao cadastrar.
PJ.POSICOES = {
  GOL: { nome: 'Goleiro', setor: 'goleiro', camisa: 1, camisa2: 12 },
  ZAG: { nome: 'Zagueiro', setor: 'defesa', camisa: 3, camisa2: 4 },
  LE: { nome: 'Lateral-esquerdo', setor: 'defesa', camisa: 6, camisa2: 16 },
  LD: { nome: 'Lateral-direito', setor: 'defesa', camisa: 2, camisa2: 13 },
  FIXO: { nome: 'Fixo', setor: 'defesa', camisa: 3, camisa2: 4 },
  ALA: { nome: 'Ala', setor: 'meio', camisa: 7, camisa2: 11 },
  VOL: { nome: 'Volante', setor: 'meio', camisa: 5, camisa2: 8 },
  ME: { nome: 'Meia-esquerda', setor: 'meio', camisa: 11, camisa2: 10 },
  MD: { nome: 'Meia-direita', setor: 'meio', camisa: 7, camisa2: 17 },
  MEI: { nome: 'Meia', setor: 'meio', camisa: 10, camisa2: 8 },
  PE: { nome: 'Ponta-esquerda', setor: 'ataque', camisa: 11, camisa2: 20 },
  PD: { nome: 'Ponta-direita', setor: 'ataque', camisa: 7, camisa2: 17 },
  ATA: { nome: 'Atacante', setor: 'ataque', camisa: 9, camisa2: 19 },
  'PIVÔ': { nome: 'Pivô', setor: 'ataque', camisa: 9, camisa2: 19 },
};

// Descobre a sigla da posição pelo lugar onde o jogador esta no campo.
// E o que faz a etiqueta mudar sozinha quando o treinador arrasta a peca.
PJ.siglaPorLugar = function (modalidade, x, y) {
  if (modalidade === 'futsal') {
    if (y < 16) return 'GOL';
    if (y < 38) return 'FIXO';
    if (y >= 64) return 'PIVÔ';
    if (x < 32 || x > 68) return 'ALA';
    return y < 52 ? 'FIXO' : 'PIVÔ';
  }
  if (modalidade === 'society') {
    if (y < 15) return 'GOL';
    if (y < 36) return 'ZAG';
    if (y < 60) {
      if (x < 24 || x > 76) return 'ALA';
      return y < 48 ? 'VOL' : 'MEI';
    }
    if (x < 28) return 'PE';
    if (x > 72) return 'PD';
    return 'ATA';
  }
  // campo 11
  if (y < 14) return 'GOL';
  if (y < 34) {
    if (x < 22) return 'LE';
    if (x > 78) return 'LD';
    return 'ZAG';
  }
  if (y < 58) {
    if (x < 20) return 'ME';
    if (x > 80) return 'MD';
    return y < 45 ? 'VOL' : 'MEI';
  }
  if (x < 26) return 'PE';
  if (x > 74) return 'PD';
  return 'ATA';
};

// ------------------------------------------------- geometria de cada campo
// Monta a lista de tracos do campo a partir das medidas REAIS em metros.
// Devolve figuras simples que servem tanto para desenhar na tela (SVG)
// quanto para gerar a foto do campo (canvas), sem duplicar conta nenhuma.

function arcoPontos(cx, cy, raioX, raioY, grau1, grau2, passos) {
  var pontos = [];
  var n = passos || 20;
  for (var i = 0; i <= n; i++) {
    var g = (grau1 + ((grau2 - grau1) * i) / n) * (Math.PI / 180);
    pontos.push([cx + raioX * Math.cos(g), cy + raioY * Math.sin(g)]);
  }
  return pontos;
}

function geometriaCampo(m) {
  var L = m.comprimentoM;
  var W = m.larguraM;
  var px = function (metros) { return (metros / W) * 100; }; // largura -> %
  var py = function (metros) { return (metros / L) * 100; }; // comprimento -> %
  var pr = function (metros) { return (metros / W) * 100; }; // raio -> % da largura

  var f = [];
  var add = function (fig) { f.push(fig); };

  // borda e linha do meio
  add({ tipo: 'retangulo', x: 0, y: 0, largura: 100, altura: 100 });
  add({ tipo: 'linha', x1: 0, y1: 50, x2: 100, y2: 50, papel: 'meio' });
  add({ tipo: 'disco', cx: 50, cy: 50, r: pr(0.22) });

  // circulo central
  if (m.raioCentralM) {
    add({ tipo: 'circulo', cx: 50, cy: 50, r: pr(m.raioCentralM), papel: m.circuloOpcional ? 'fraco' : '' });
  }

  var lado; // -1 = nosso lado (embaixo), +1 = lado do adversário (em cima)
  for (lado = 0; lado < 2; lado++) {
    var base = lado === 0 ? 0 : 100;       // linha de fundo
    var dentro = lado === 0 ? 1 : -1;      // sentido para dentro do campo

    // gol
    var meioGol = px(m.golM) / 2;
    add({ tipo: 'gol', x1: 50 - meioGol, x2: 50 + meioGol, y: base, dentro: dentro });

    if (m.grandeAreaM) {
      var gl = px(m.grandeAreaM.larguraM) / 2;
      var gp = py(m.grandeAreaM.profundidadeM);
      add({
        tipo: 'retangulo',
        x: 50 - gl, largura: gl * 2,
        y: lado === 0 ? 0 : 100 - gp, altura: gp,
      });
    }
    if (m.pequenaAreaM) {
      var pl = px(m.pequenaAreaM.larguraM) / 2;
      var pp = py(m.pequenaAreaM.profundidadeM);
      add({
        tipo: 'retangulo',
        x: 50 - pl, largura: pl * 2,
        y: lado === 0 ? 0 : 100 - pp, altura: pp,
      });
    }

    // área do futsal: dois quartos de circulo ligados por uma reta
    if (m.areaArcoM) {
      var raio = m.areaArcoM.raioM;
      var cxEsq = 50 - px(m.areaArcoM.entrePostesM) / 2;
      var cxDir = 50 + px(m.areaArcoM.entrePostesM) / 2;
      var rx = pr(raio);
      var ry = py(raio);
      var topo = lado === 0 ? ry : 100 - ry;
      var esq = arcoPontos(cxEsq, base, rx, ry * dentro, 180, 90, 16);
      var dir = arcoPontos(cxDir, base, rx, ry * dentro, 90, 0, 16);
      add({ tipo: 'poligonal', pontos: esq });
      add({ tipo: 'linha', x1: cxEsq, y1: topo, x2: cxDir, y2: topo });
      add({ tipo: 'poligonal', pontos: dir });
    }

    // marca do pênalti
    if (m.penaltiM != null) {
      var yp = lado === 0 ? py(m.penaltiM) : 100 - py(m.penaltiM);
      add({ tipo: 'disco', cx: 50, cy: yp, r: pr(0.22) });

      // meia-lua: só a parte que fica fora da grande área
      if (m.meiaLua && m.grandeAreaM) {
        var rArco = pr(m.raioCentralM);
        var rArcoY = py(m.raioCentralM);
        var limite = lado === 0 ? py(m.grandeAreaM.profundidadeM) : 100 - py(m.grandeAreaM.profundidadeM);
        var dy = Math.abs(limite - yp);
        var ang = Math.asin(Math.min(1, dy / rArcoY)) * (180 / Math.PI);
        add({ tipo: 'poligonal', pontos: arcoPontos(50, yp, rArco, rArcoY * dentro, ang, 180 - ang, 18) });
      }
    }

    // segunda marca do futsal (10 metros)
    if (m.segundaMarcaM != null) {
      var y2 = lado === 0 ? py(m.segundaMarcaM) : 100 - py(m.segundaMarcaM);
      add({ tipo: 'disco', cx: 50, cy: y2, r: pr(0.22) });
    }

    // arcos de escanteio
    if (m.escanteioM) {
      var re = pr(m.escanteioM);
      var reY = py(m.escanteioM);
      add({ tipo: 'poligonal', pontos: arcoPontos(0, base, re, reY * dentro, 0, 90, 8) });
      add({ tipo: 'poligonal', pontos: arcoPontos(100, base, re, reY * dentro, 90, 180, 8) });
    }

    // marcas de saída do society
    if (m.marcaSaidaM) {
      var ys = lado === 0 ? 50 - py(m.marcaSaidaM.distanciaM) : 50 + py(m.marcaSaidaM.distanciaM);
      var meia = px(m.marcaSaidaM.comprimentoM) / 2;
      add({ tipo: 'linha', x1: 50 - meia, y1: ys, x2: 50 + meia, y2: ys });
    }
  }
  return f;
}

// ------------------------------------------------------------- modalidades

PJ.MODALIDADES = {
  campo11: {
    id: 'campo11',
    nome: 'Campo 11',
    nomeLongo: 'Futebol de campo',
    emCampo: 11,
    comprimentoM: 105,
    larguraM: 68,
    golM: 7.32,
    raioCentralM: 9.15,
    penaltiM: 11,
    meiaLua: true,
    escanteioM: 1,
    grandeAreaM: { profundidadeM: 16.5, larguraM: 40.32 },
    pequenaAreaM: { profundidadeM: 5.5, larguraM: 18.32 },
    superficie: 'grama',
    formacoes: [
      { id: 'c11-4-4-2', nome: '4-4-2', explicacao: 'Duas fileiras de quatro e dois na frente. Cada um marca quem está na sua frente: é o mais fácil de explicar para o time.', jogadores: [['GOL', 50, 5], ['LE', 10, 20], ['ZAG', 36, 18], ['ZAG', 64, 18], ['LD', 90, 20], ['ME', 10, 46], ['VOL', 38, 42], ['MEI', 62, 42], ['MD', 90, 46], ['ATA', 35, 78], ['ATA', 65, 78]] },
      { id: 'c11-4-3-3', nome: '4-3-3', explicacao: 'Três homens lá na frente e o campo bem aberto. Serve para atacar e apertar o adversário perto da área dele.', jogadores: [['GOL', 50, 5], ['LE', 10, 22], ['ZAG', 36, 18], ['ZAG', 64, 18], ['LD', 90, 22], ['VOL', 50, 38], ['MEI', 32, 50], ['MEI', 68, 50], ['PE', 12, 72], ['ATA', 50, 80], ['PD', 88, 72]] },
      { id: 'c11-4-2-3-1', nome: '4-2-3-1', explicacao: 'Dois segurando na frente da zaga e três criando jogada para um atacante só. Dá segurança atrás sem perder quem toca a bola.', jogadores: [['GOL', 50, 5], ['LE', 10, 22], ['ZAG', 36, 18], ['ZAG', 64, 18], ['LD', 90, 22], ['VOL', 37, 36], ['VOL', 63, 36], ['PE', 12, 58], ['MEI', 50, 56], ['PD', 88, 58], ['ATA', 50, 80]] },
      { id: 'c11-3-5-2', nome: '3-5-2', explicacao: 'Enche o meio com cinco jogadores e põe dois homens nos lados para subir e descer o jogo inteiro. Bom para mandar no meio.', jogadores: [['GOL', 50, 5], ['ZAG', 26, 18], ['ZAG', 50, 16], ['ZAG', 74, 18], ['ALA', 8, 48], ['VOL', 34, 38], ['MEI', 50, 52], ['VOL', 66, 38], ['ALA', 92, 48], ['ATA', 38, 78], ['ATA', 62, 78]] },
      { id: 'c11-4-4-2-losango', nome: '4-4-2 losango', explicacao: 'O mesmo 4-4-2, mas com o meio em losango: um segura atrás, dois pelos lados e um grudado nos atacantes para dar os passes.', jogadores: [['GOL', 50, 5], ['LE', 10, 22], ['ZAG', 36, 18], ['ZAG', 64, 18], ['LD', 90, 22], ['VOL', 50, 34], ['MEI', 24, 48], ['MEI', 76, 48], ['MEI', 50, 62], ['ATA', 35, 80], ['ATA', 65, 80]] },
      { id: 'c11-5-3-2', nome: '5-3-2', explicacao: 'Cinco atrás para fechar tudo. Use quando o adversário é mais forte ou quando você está ganhando e quer segurar.', jogadores: [['GOL', 50, 5], ['LE', 8, 26], ['ZAG', 26, 17], ['ZAG', 50, 15], ['ZAG', 74, 17], ['LD', 92, 26], ['VOL', 50, 40], ['MEI', 28, 50], ['MEI', 72, 50], ['ATA', 38, 74], ['ATA', 62, 74]] },
    ],
  },

  society: {
    id: 'society',
    nome: 'Society 7',
    nomeLongo: 'Futebol society (fut7)',
    emCampo: 7,
    comprimentoM: 50,
    larguraM: 30,
    golM: 4,
    raioCentralM: 5,
    penaltiM: 7,
    meiaLua: false,
    escanteioM: 1,
    grandeAreaM: { profundidadeM: 8, larguraM: 14 },
    pequenaAreaM: null,
    marcaSaidaM: { distanciaM: 5, comprimentoM: 5 },
    superficie: 'sintetico',
    formacoes: [
      { id: 's7-2-3-1', nome: '2-3-1', explicacao: 'A mais usada no society: dois atrás, três no meio e um na frente. Cobre o campo inteiro sem matar ninguém de cansaço.', jogadores: [['GOL', 50, 6], ['ZAG', 32, 20], ['ZAG', 68, 20], ['ALA', 12, 48], ['MEI', 50, 44], ['ALA', 88, 48], ['ATA', 50, 76]] },
      { id: 's7-3-2-1', nome: '3-2-1', explicacao: 'O pinheirinho: três bem atrás, dois no meio e um na frente, para o time que não quer tomar gol de jeito nenhum.', jogadores: [['GOL', 50, 6], ['ZAG', 22, 22], ['ZAG', 50, 16], ['ZAG', 78, 22], ['MEI', 32, 48], ['MEI', 68, 48], ['ATA', 50, 76]] },
      { id: 's7-2-2-2', nome: '2-2-2', explicacao: 'Dois atrás, dois no meio e dois na frente. Time equilibrado e fácil de explicar para quem nunca jogou com esquema.', jogadores: [['GOL', 50, 6], ['ZAG', 30, 20], ['ZAG', 70, 20], ['MEI', 26, 48], ['MEI', 74, 48], ['ATA', 34, 76], ['ATA', 66, 76]] },
      { id: 's7-3-1-2', nome: '3-1-2', explicacao: 'Três atrás, um segurando o meio e dois na frente prontos para sair no contra-ataque assim que roubar a bola.', jogadores: [['GOL', 50, 6], ['ZAG', 20, 24], ['ZAG', 50, 16], ['ZAG', 80, 24], ['VOL', 50, 44], ['ATA', 32, 72], ['ATA', 68, 72]] },
      { id: 's7-2-1-3', nome: '2-1-3', explicacao: 'Três homens na frente para pressionar e buscar o gol. Use quando estiver perdendo e precisar virar o jogo.', jogadores: [['GOL', 50, 6], ['ZAG', 34, 22], ['ZAG', 66, 22], ['VOL', 50, 44], ['PE', 14, 70], ['ATA', 50, 80], ['PD', 86, 70]] },
    ],
  },

  futsal: {
    id: 'futsal',
    nome: 'Salão 5',
    nomeLongo: 'Futsal (futebol de salão)',
    emCampo: 5,
    comprimentoM: 40,
    larguraM: 20,
    golM: 3,
    raioCentralM: 3,
    penaltiM: 6,
    segundaMarcaM: 10,
    meiaLua: false,
    escanteioM: 0.25,
    grandeAreaM: null,
    pequenaAreaM: null,
    areaArcoM: { raioM: 6, entrePostesM: 3.16 },
    superficie: 'quadra',
    formacoes: [
      { id: 'fs-1-2-1', nome: '1-2-1', explicacao: 'O losango: um fixo atrás, dois alas nos lados e o pivô na frente. É o que quase todo time de salão usa.', jogadores: [['GOL', 50, 6], ['FIXO', 50, 24], ['ALA', 16, 50], ['ALA', 84, 50], ['PIVÔ', 50, 76]] },
      { id: 'fs-2-2', nome: '2-2', explicacao: 'O quadrado: dois atrás e dois na frente, cada um com um parceiro do lado para se revezar quando cansar.', jogadores: [['GOL', 50, 6], ['FIXO', 28, 26], ['FIXO', 72, 26], ['ALA', 28, 68], ['ALA', 72, 68]] },
      { id: 'fs-3-1', nome: '3-1', explicacao: 'Três atrás fechando a quadra e só o pivô na frente: segura o jogo e sai rápido no contra-ataque.', jogadores: [['GOL', 50, 6], ['ALA', 18, 30], ['FIXO', 50, 20], ['ALA', 82, 30], ['PIVÔ', 50, 70]] },
      { id: 'fs-4-0', nome: '4-0', explicacao: 'Sem pivô: os quatro ficam na mesma altura e trocam de lugar o tempo todo para bagunçar a marcação do adversário.', jogadores: [['GOL', 50, 6], ['ALA', 12, 54], ['FIXO', 35, 44], ['FIXO', 65, 44], ['ALA', 88, 54]] },
      { id: 'fs-goleiro-linha', nome: 'Goleiro-linha', goleiroNaLinha: true, explicacao: 'O goleiro sai do gol e vira o quinto jogador: 5 contra 4, todo mundo no ataque. Use quando estiver perdendo no fim do jogo — se perder a bola, o gol fica vazio.', jogadores: [['GOL', 50, 52], ['ALA', 16, 70], ['ALA', 84, 70], ['PIVÔ', 34, 84], ['PIVÔ', 66, 84]] },
    ],
  },
};

PJ.ORDEM_MODALIDADES = ['campo11', 'society', 'futsal'];

// A comissão técnica nasce com os três cargos que todo time de várzea tem;
// o treinador acrescenta os outros se quiser.
PJ.CARGOS_PADRAO = ['Técnico', 'Auxiliar técnico', 'Massagista'];
PJ.CARGOS_EXTRAS = ['Preparador físico', 'Treinador de goleiros', 'Roupeiro', 'Diretor'];

// Até onde o time pode subir. Sem esse teto, o estilo "Tudo pra frente"
// empurra o atacante para dentro do gol adversário.
PJ.MODALIDADES.campo11.alturaMaxima = 88;
PJ.MODALIDADES.society.alturaMaxima = 88;
PJ.MODALIDADES.futsal.alturaMaxima = 86;

// Quanto a peça precisa ficar longe da linha lateral para o círculo não
// passar dela. Quanto mais estreito o campo, maior a peça em porcentagem.
PJ.MODALIDADES.campo11.margemLateral = 8;
PJ.MODALIDADES.society.margemLateral = 9;
PJ.MODALIDADES.futsal.margemLateral = 10.5;

// O desenho de fábrica das formações nasce esticado demais: 60 pontos entre
// o zagueiro e o atacante são 63 metros de campo, e nenhum time joga assim.
// O bloco de verdade tem 30 a 40 metros. Aperta o bloco uma vez, guardando
// o formato e a simetria — de quebra, afasta o zagueiro do goleiro.
function apertarBloco(m, fator) {
  m.formacoes.forEach(function (f) {
    var naLinha = function (j) { return f.goleiroNaLinha || j[0] !== 'GOL'; };
    var linha = f.jogadores.filter(naLinha);
    if (!linha.length) return;
    var cy = linha.reduce(function (soma, j) { return soma + j[2]; }, 0) / linha.length;
    f.jogadores.forEach(function (j) {
      if (!naLinha(j)) return;
      var y = cy + (j[2] - cy) * fator;
      j[2] = Math.round(Math.max(8, Math.min(m.alturaMaxima, y)) * 10) / 10;
    });
  });
}

// Guarda a geometria pronta de cada campo (calculada uma vez só).
PJ.ORDEM_MODALIDADES.forEach(function (id) {
  var m = PJ.MODALIDADES[id];
  apertarBloco(m, 0.78);
  m.figuras = geometriaCampo(m);
  m.proporcao = m.larguraM / m.comprimentoM;      // largura / altura
  m.alturaVB = (m.comprimentoM / m.larguraM) * 100; // altura do viewBox do SVG
});

// ---------------------------------------------------------- estilos de jogo
// Cada estilo empurra o time para frente/trás, junta ou estica as linhas
// e abre ou fecha o time na largura. O goleiro quase não se mexe.

PJ.ESTILOS = [
  { id: 'padrao', nome: 'Normal', explicacao: 'Deixa o time no desenho da formação escolhida: não sobe, não desce, não abre e não fecha.', quandoUsar: 'No começo do jogo, antes de mudar alguma coisa.', desloca: 0, compacta: 1, abre: 1 },
  { id: 'pressao-alta', nome: 'Pressão alta', explicacao: 'O time inteiro sobe e fica mais juntinho, para marcar o adversário perto da área dele.', quandoUsar: 'Quando o outro time tem dificuldade de sair jogando.', desloca: 10, compacta: 0.85, abre: 1 },
  { id: 'fechado-atras', nome: 'Fechado atrás', explicacao: 'Todo mundo recua, as linhas se juntam e sobra pouco espaço na frente do seu gol.', quandoUsar: 'Quando o adversário é mais forte, ou para segurar o resultado.', desloca: -10, compacta: 0.75, abre: 0.85 },
  { id: 'contra-ataque', nome: 'Contra-ataque', explicacao: 'O time recua e fica curto, mas deixa o homem da frente esticado para sair correndo quando roubar a bola.', quandoUsar: 'Quando o adversário ataca muito e deixa espaço nas costas.', desloca: -6, compacta: 0.85, abre: 0.95, esticaFrente: 14 },
  { id: 'toque-de-bola', nome: 'Toque de bola', explicacao: 'Aproxima os jogadores uns dos outros: quem está com a bola sempre tem alguém perto para receber.', quandoUsar: 'Para segurar a bola, acalmar o jogo e cansar o adversário.', desloca: 4, compacta: 0.8, abre: 1.1 },
  { id: 'abre-nas-pontas', nome: 'Abre nas pontas', explicacao: 'Joga os jogadores dos lados colados na linha lateral, esticando a marcação para abrir buraco no meio.', quandoUsar: 'Quando o adversário fecha o meio e sobra espaço pelos lados.', desloca: 2, compacta: 1, abre: 1.2 },
  { id: 'afunila', nome: 'Joga por dentro', explicacao: 'Fecha o time pelo meio, todo mundo mais perto do centro e ninguém colado na lateral.', quandoUsar: 'Quando seus melhores jogadores jogam por dentro.', desloca: 3, compacta: 0.95, abre: 0.7 },
  { id: 'tudo-pra-frente', nome: 'Tudo pra frente', explicacao: 'Empurra o time inteiro para o campo do adversário, deixando pouca gente atrás para arriscar o gol.', quandoUsar: 'Nos últimos minutos, quando precisa do gol de qualquer jeito.', desloca: 16, compacta: 0.9, abre: 1.15 },
];

PJ.estiloPorId = function (id) {
  for (var i = 0; i < PJ.ESTILOS.length; i++) if (PJ.ESTILOS[i].id === id) return PJ.ESTILOS[i];
  return PJ.ESTILOS[0];
};

// ------------------------------------------------------------ time exemplo
// O aplicativo nunca abre vazio: já vem com um time escalado para mexer.

// A ordem desta lista é a ordem das vagas da formação: goleiro, lateral-
// esquerdo, os dois zagueiros, lateral-direito, e assim por diante.
PJ.ELENCO_EXEMPLO = [
  { numero: 1, nome: 'Nivaldo' },
  { numero: 6, nome: 'Tião' },
  { numero: 3, nome: 'Cleiton' },
  { numero: 4, nome: 'Baiano' },
  { numero: 2, nome: 'Juninho' },
  { numero: 11, nome: 'Val' },
  { numero: 5, nome: 'Cacá' },
  { numero: 8, nome: 'Serginho' },
  { numero: 7, nome: 'Paulinho' },
  { numero: 9, nome: 'Zé' },
  { numero: 10, nome: 'Bigode' },
  { numero: 12, nome: 'Nando' },
  { numero: 13, nome: 'Marquinhos' },
  { numero: 14, nome: 'Dê' },
  { numero: 15, nome: 'Rafa' },
  { numero: 16, nome: 'Léo' },
];
