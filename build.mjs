// Monta os arquivos finais a partir de src/
//   dist/prancheta.html -> formato de publicacao (sem doctype/html/head/body)
//   index.html          -> arquivo autonomo, abre com dois cliques no computador
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = dirname(fileURLToPath(import.meta.url));
const ler = (p) => readFileSync(join(raiz, p), 'utf8');
const juntar = (pasta, ext) =>
  readdirSync(join(raiz, pasta))
    .filter((f) => f.endsWith(ext))
    .sort()
    .map((f) => `/* ===== ${f} ===== */\n${ler(join(pasta, f))}`)
    .join('\n');

const base = ler('src/base.html');
const css = juntar('src/css', '.css');
const js = juntar('src/js', '.js');

const [cabeca, resto] = base.split('<!--ESTILO-->');
const [marcacao, rodape = ''] = resto.split('<!--SCRIPT-->');

const bloco = {
  titulo: cabeca.trim(),
  estilo: `<style>\n${css}\n</style>`,
  marcacao: marcacao.trim(),
  script: `<script>\n${js}\n</script>`,
  rodape: rodape.trim(),
};

writeFileSync(
  join(raiz, 'dist/prancheta.html'),
  [bloco.titulo, bloco.estilo, bloco.marcacao, bloco.script, bloco.rodape].filter(Boolean).join('\n') + '\n'
);

const reset = `:root{color-scheme:light;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}
body{margin:0;font:14px system-ui,-apple-system,sans-serif;background:#fafaf9}
img{max-width:100%}[hidden]{display:none!important}`;

writeFileSync(
  join(raiz, 'index.html'),
  `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<style>${reset}</style>
${bloco.titulo}
${bloco.estilo}
</head>
<body>
${bloco.marcacao}
${bloco.script}
${bloco.rodape}
</body>
</html>
`
);

console.log('pronto — dist/prancheta.html e index.html gerados');
