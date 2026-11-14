# 3d

Maquete 3D interativa do **Life Residence** (L Marquezzo · Feira de Santana/BA), feita com HTML, CSS e JavaScript puro + [three.js](https://threejs.org/) via CDN.

- Filtros por tipologia, andar, etapa, bloco, valor e disponibilidade
- Clique numa janela para ver a unidade e a planta; aba **Lista** com todas as unidades
- Aba **Localização** com Google Maps e link "Como chegar"
- Passe o mouse na fachada: a faixa do andar acende e um card mostra bloco, andar, disponíveis e "a partir de"; clique para cortar o bloco naquele andar
- Botão **★ Lazer**: a câmera voa até a área de lazer, pinos numerados e chips abrem a foto do ambiente em tela cheia (← → Esc)
- Galeria do apartamento decorado no painel da unidade

> Preços e status das unidades são fictícios.

## Estrutura

```
index.html      página
css/style.css   estilos
js/app.js       maquete 3D, filtros, painel e mapa
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
