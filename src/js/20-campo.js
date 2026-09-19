// Desenha o campo. As mesmas figuras servem para a tela (SVG) e para a
// foto que o treinador manda no WhatsApp (canvas) — a conta e uma só.

PJ.LINHA_FINA = 0.8;   // espessura em % da largura do campo
PJ.LINHA_MEIO = 1.15;  // a linha do meio e mais grossa, igual ao desenho a mão

// Converte a coordenada do campo (y=0 no nosso gol) para a do desenho,
// onde o y cresce para baixo.
PJ.paraDesenho = function (m, x, y) {
  return [x, ((100 - y) * m.alturaVB) / 100];
};

function numero(n) {
  return Math.round(n * 1000) / 1000;
}

PJ.campoEmSVG = function (m) {
  var s = [];
  var conv = function (x, y) { return PJ.paraDesenho(m, x, y); };
  var raioY = function (r) { return (r * m.alturaVB) / 100; };

  m.figuras.forEach(function (fig) {
    if (fig.tipo === 'retangulo') {
      var a = conv(fig.x, fig.y + fig.altura);
      s.push('<rect x="' + numero(a[0]) + '" y="' + numero(a[1]) +
        '" width="' + numero(fig.largura) + '" height="' + numero(raioY(fig.altura)) +
        '" class="cal"/>');
    } else if (fig.tipo === 'linha') {
      var p1 = conv(fig.x1, fig.y1);
      var p2 = conv(fig.x2, fig.y2);
      s.push('<line x1="' + numero(p1[0]) + '" y1="' + numero(p1[1]) +
        '" x2="' + numero(p2[0]) + '" y2="' + numero(p2[1]) +
        '" class="' + (fig.papel === 'meio' ? 'cal meio' : 'cal') + '"/>');
    } else if (fig.tipo === 'circulo') {
      var c = conv(fig.cx, fig.cy);
      s.push('<circle cx="' + numero(c[0]) + '" cy="' + numero(c[1]) +
        '" r="' + numero(fig.r) + '" class="cal' + (fig.papel === 'fraco' ? ' fraca' : '') + '"/>');
    } else if (fig.tipo === 'disco') {
      var d = conv(fig.cx, fig.cy);
      s.push('<circle cx="' + numero(d[0]) + '" cy="' + numero(d[1]) +
        '" r="' + numero(fig.r) + '" class="calCheia"/>');
    } else if (fig.tipo === 'poligonal') {
      var pts = fig.pontos.map(function (p) {
        var q = conv(p[0], p[1]);
        return numero(q[0]) + ',' + numero(q[1]);
      }).join(' ');
      s.push('<polyline points="' + pts + '" class="cal"/>');
    } else if (fig.tipo === 'gol') {
      // a boca do gol é desenhada por DENTRO da linha de fundo: assim ela
      // aparece inteira em qualquer tela, sem ser cortada pela borda
      var fundo = conv(0, fig.y)[1];
      var dentroY = fig.dentro > 0 ? fundo - raioY(2.4) : fundo + raioY(2.4);
      var topo = Math.min(fundo, dentroY);
      var alt = Math.abs(dentroY - fundo);
      s.push('<rect x="' + numero(fig.x1) + '" y="' + numero(topo) +
        '" width="' + numero(fig.x2 - fig.x1) + '" height="' + numero(alt) + '" class="gol"/>');
      for (var i = 1; i < 5; i++) {
        var gx = fig.x1 + ((fig.x2 - fig.x1) * i) / 5;
        s.push('<line x1="' + numero(gx) + '" y1="' + numero(topo) +
          '" x2="' + numero(gx) + '" y2="' + numero(topo + alt) + '" class="rede"/>');
      }
    }
  });
  return s.join('');
};

PJ.montarCampoSVG = function (svg, m) {
  svg.setAttribute('viewBox', '0 0 100 ' + numero(m.alturaVB));
  svg.setAttribute('preserveAspectRatio', 'none');
  svg.innerHTML = PJ.campoEmSVG(m);
};

// ----------------------------------------------------- foto para o WhatsApp

PJ.desenharCampoCanvas = function (ctx, ox, oy, larg, alt, m, cores) {
  var conv = function (x, y) {
    return [ox + (x / 100) * larg, oy + ((100 - y) / 100) * alt];
  };
  var u = larg / 100; // 1 unidade do campo em pixels

  ctx.save();
  ctx.fillStyle = cores.grama;
  ctx.fillRect(ox, oy, larg, alt);
  if (m.superficie === 'grama') {
    ctx.fillStyle = cores.gramaFaixa;
    for (var k = 0; k < 8; k += 2) {
      ctx.fillRect(ox, oy + (alt * k) / 8, larg, alt / 8);
    }
  }

  ctx.lineCap = 'butt';
  ctx.lineJoin = 'round';
  m.figuras.forEach(function (fig) {
    ctx.strokeStyle = fig.papel === 'meio' ? cores.meio : cores.cal;
    ctx.fillStyle = cores.cal;
    ctx.lineWidth = (fig.papel === 'meio' ? PJ.LINHA_MEIO : PJ.LINHA_FINA) * u;
    ctx.globalAlpha = fig.papel === 'fraco' ? 0.45 : 1;
    ctx.beginPath();
    if (fig.tipo === 'retangulo') {
      var a = conv(fig.x, fig.y + fig.altura);
      ctx.rect(a[0], a[1], fig.largura * u, (fig.altura / 100) * alt);
      ctx.stroke();
    } else if (fig.tipo === 'linha') {
      var p1 = conv(fig.x1, fig.y1);
      var p2 = conv(fig.x2, fig.y2);
      ctx.moveTo(p1[0], p1[1]);
      ctx.lineTo(p2[0], p2[1]);
      ctx.stroke();
    } else if (fig.tipo === 'circulo') {
      var c = conv(fig.cx, fig.cy);
      ctx.arc(c[0], c[1], fig.r * u, 0, Math.PI * 2);
      ctx.stroke();
    } else if (fig.tipo === 'disco') {
      var d = conv(fig.cx, fig.cy);
      ctx.arc(d[0], d[1], Math.max(1.5, fig.r * u), 0, Math.PI * 2);
      ctx.fill();
    } else if (fig.tipo === 'poligonal') {
      fig.pontos.forEach(function (p, i) {
        var q = conv(p[0], p[1]);
        if (i === 0) ctx.moveTo(q[0], q[1]); else ctx.lineTo(q[0], q[1]);
      });
      ctx.stroke();
    } else if (fig.tipo === 'gol') {
      var fundo = conv(0, fig.y)[1];
      var espessura = (2.4 / 100) * alt;
      var topo = fig.dentro > 0 ? fundo - espessura : fundo;
      ctx.fillStyle = cores.cal;
      ctx.globalAlpha = 0.9;
      ctx.fillRect(conv(fig.x1, 0)[0], topo, (fig.x2 - fig.x1) * u, espessura);
    }
    ctx.globalAlpha = 1;
  });
  ctx.restore();
};
