# 3d

Maquete 3D interativa do **Life Residence** (L Marquezzo · Feira de Santana/BA), feita com HTML, CSS e JavaScript puro + [three.js](https://threejs.org/) via CDN.

- Filtros por tipologia, andar, etapa, bloco, valor e disponibilidade
- Clique numa janela para ver a unidade e a planta; aba **Lista** com todas as unidades
- Aba **Localização** com Google Maps e link "Como chegar"
- Passe o mouse na fachada: a faixa do andar acende e um card mostra bloco, andar, disponíveis e "a partir de"; clique para cortar o bloco naquele andar
- Botão **★ Lazer**: a câmera voa até a área de lazer, pinos numerados e chips abrem a foto do ambiente em tela cheia (← → Esc)
- Galeria do apartamento decorado no painel da unidade

> Preços e status das unidades são fictícios.

- **Ambientes em 3D** (`jogo.html`): o render do Lazer vira o menu; clicar num ponto entra no ambiente recriado em 3D a partir da foto do book, com um boneco andando lá dentro (WASD, Shift corre, arraste olha, V alterna 1ª/3ª pessoa, T liga o tour automático, Esc volta). 20 ambientes: salões, varanda, academia, coworking, mini market, lavanderia, brinquedoteca, portaria, piscina, quadras, parques, pista, bicicletário etc.
- **Vídeo de apresentação**: `node tools/gravar-video.js` (site servido em localhost:4173, Chrome, Node 22+ e ffmpeg) grava `video/apresentacao.mp4`.

## Estrutura

```
index.html      página
css/style.css   estilos
js/app.js       maquete 3D, filtros, painel e mapa
js/game.js      motor dos ambientes em 3D (jogo.html)
js/kit.js       texturas, peças e móveis dos ambientes
js/rooms-in.js  ambientes internos · js/rooms-out.js  ambientes externos
tools/          gravação do vídeo de apresentação
img/            plantas das unidades
img/lazer/      fotos dos ambientes de lazer (recortadas do book)
img/apto/       fotos do apartamento decorado (recortadas do book)
```

## Como abrir

O JavaScript usa módulos ES, então abra por um servidor local (não direto pelo arquivo):

```bash
npx serve .
# ou
python -m http.server 8000
```

Depois acesse `http://localhost:3000` (ou `:8000`). No VS Code, a extensão Live Server também funciona.
