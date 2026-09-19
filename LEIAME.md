# Plano de Jogo

Prancheta tática de futebol para escalar o time arrastando os jogadores com o dedo.
Funciona em **Campo 11**, **Society 7** e **Salão 5**, guarda tudo no próprio
aparelho e não precisa de internet, conta nem senha.

## Como abrir

**No celular (o jeito de usar na beira do campo):** abra o link do aplicativo.
Para deixar o ícone na tela do celular, igual ao WhatsApp, abra o menu do
navegador (os três pontinhos) e toque em **Adicionar à tela inicial**.

**No computador:** dê dois cliques no arquivo `index.html`. Ele é um arquivo só
e abre em qualquer navegador, inclusive sem internet.

## O que dá para fazer

No alto da tela ficam três coisas: o **tipo de campo** em uso (só ele aparece;
toque para trocar), **Desfazer** e **Configurar**. Embaixo, os três botões que
você usa com o jogo rolando.

| Botão | O que faz |
|---|---|
| **Campo 11 / Society 7 / Salão 5** (no alto) | Troca o tipo de campo. Cada um guarda a sua própria escalação — quem sobra vai para o banco, ninguém é apagado. |
| **Configurar** (no alto) | Menu com tudo que não se mexe durante o lance: meu time, táticas, mandar a escalação, foto, anotações, tela, cópia de segurança. |
| **Desfazer** (no alto) | Volta a última mudança. Guarda as 30 últimas. |
| **Banco** | Faz a troca em dois toques: toque no jogador do campo, depois no que vai entrar. |
| **Táticas** | Formações prontas (4-4-2, 4-3-3, 1-2-1, goleiro-linha…), estilos de jogo (pressão alta, fechado atrás, contra-ataque…) e as suas táticas salvas. |
| **Desenhar** | Setas e riscos por cima do campo. Enquanto está desenhando, os jogadores ficam travados. |

Em **Configurar > Configurar meu time** você põe nomes, números e posições —
essa tela abre inteira, para caber o teclado. Dá para colar a lista do
WhatsApp de uma vez, e o aplicativo avisa qual posição está preenchendo.

Cada jogador tem a sua tela, aberta pelo botão **Ficha do jogador** na lista,
ou tocando nele no campo e usando o mesmo botão. Lá você muda o nome, o número
da camisa e a posição, põe ou tira a **faixa de capitão**, e coloca ou tira do
campo. O capitão fica com um **C** amarelo na peça, uma etiqueta na lista, um
**(C)** na escalação do WhatsApp e a faixa desenhada na foto do campo. Se a camisa
escolhida já for de outro jogador, o aplicativo oferece trocar os números
entre os dois. A camisa também vem sugerida pela posição: goleiro 1,
lateral-direito 2, zagueiros 3 e 4, volante 5, lateral-esquerdo 6, e assim
por diante.

Em **Configurar > Comissão técnica** ficam os nomes de fora do campo:
técnico, auxiliar técnico e massagista já vêm prontos para preencher, e dá
para acrescentar preparador físico, treinador de goleiros, roupeiro, diretor
ou qualquer outro cargo. Eles saem junto na escalação do WhatsApp e na foto.

Em tela grande (computador ou tablet deitado), o espaço ao lado do campo
mostra o **banco** e a **comissão técnica** o tempo todo — é só tocar num
reserva para abrir a ficha dele, ou num cargo para escrever o nome.

Arraste um jogador com o dedo para mudar de lugar. Um toque nele abre a
barrinha amarela com **Trocar jogador**, **Tirar do campo** e **Soltar**.

**Tática salva guarda só o desenho** — os lugares em campo, não quem estava em
cada lugar. Por isso dá para aplicar uma tática no minuto 70 sem desfazer as
trocas que você já fez no jogo.

## Onde ficam os dados

Tudo é gravado no navegador do próprio aparelho, a cada mexida. Se você limpar
o histórico do navegador ou trocar de celular, os dados se perdem — por isso
existe **Configurar > Salvar cópia do meu time**, que baixa um arquivo, e
**Abrir cópia salva**, que traz tudo de volta.

## Para quem for mexer no código

O aplicativo é HTML, CSS e JavaScript puro: sem framework, sem instalação e sem
servidor. O código fica em `src/` e um comando junta tudo:

```
node build.mjs
```

Isso gera duas saídas a partir do mesmo código:

- `index.html` — arquivo autônomo, abre com dois cliques.
- `dist/prancheta.html` — a mesma coisa no formato usado para publicar na web.

Os arquivos de origem:

```
src/base.html          estrutura da tela
src/css/01-base.css    cores, tipografia e botões
src/css/02-campo.css   o campo e a peça do jogador
src/css/03-interface.css  barras, abas e gavetas
src/js/00-dados.js     medidas reais dos campos, formações e estilos de jogo
src/js/10-estado.js    o que é guardado, o desfazer e as contas de tática
src/js/20-campo.js     desenho do campo (tela e foto, a partir da mesma conta)
src/js/30-jogadores.js as peças e o arrastar com o dedo
src/js/40-desenho.js   as setas
src/js/50-paineis.js   banco, táticas, meu time e companhia
src/js/55-compartilhar.js  WhatsApp, foto, anotações do jogo e ajustes
src/js/60-app.js       liga tudo
```

Duas regras que o código inteiro respeita:

1. **Coordenada é sempre porcentagem de 0 a 100** (x = largura, y = comprimento,
   com y = 0 no nosso gol). Pixel só existe dentro do gesto e morre quando o
   dedo solta. Por isso girar o celular ou trocar de campo não desloca nada.
2. **As linhas do campo saem das medidas oficiais em metros**, em
   `src/js/00-dados.js`. O mesmo conjunto de figuras desenha a tela (SVG) e a
   foto do WhatsApp (canvas), então os dois nunca discordam.
