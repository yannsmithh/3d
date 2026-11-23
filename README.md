# 3d

Maquete 3D interativa do **Life Residence** (L Marquezzo · Feira de Santana/BA), feita com HTML, CSS e JavaScript puro + [three.js](https://threejs.org/) via CDN.

- Maquete em tela cheia com painéis flutuantes (visual inspirado em sites de disponibilidade 3D)
- **Filtrar**: chips por valor, tipologia, andar e etapa (com contagem), só disponíveis, finais adaptáveis e bloco
- Barra de **andares** na lateral: corta todos os blocos no andar escolhido
- Clique num bloco para ver as unidades por andar; clique numa janela para ver a ficha e a planta
- **Lista** ordenável (menor valor, maior valor, andar mais alto)
- Clique em qualquer parede de um bloco para abrir o apartamento: o bloco é cortado no andar e as plantas das 4 unidades aparecem vistas de cima
- **Posição solar** de cada apartamento (nascente, poente, norte, sul) e filtro por ela, com o **norte real** do terreno
- **Áreas comuns** clicáveis: fotos do book, planta básica com as medidas da implantação e o recorte da implantação
- **Vizinhos**: ruas e edificações reais em volta; **Vizinhança**: escolas, saúde, mercados etc. com distância e tempo a pé
- Link direto: `#31-302` abre o apto 302 do bloco 31; `#bloco-31` abre o bloco; `#area-piscina` abre uma área comum

> Preços e status das unidades são fictícios.

## Estrutura

```
index.html      página
css/style.css   estilos
js/app.js       maquete 3D, filtros, painel e mapa
img/            plantas das unidades
```

## Como abrir

O JavaScript usa módulos ES, então abra por um servidor local (não direto pelo arquivo):

```bash
npx serve .
# ou
python -m http.server 8000
```

Depois acesse `http://localhost:3000` (ou `:8000`). No VS Code, a extensão Live Server também funciona.

## Norte e entorno

Posição conferida no Google Maps, no OpenStreetMap e na foto aérea do book (p.2): o lado curto do terreno
(portaria e piscina) dá para a Av. Rubens Francisco Dias (direção ~73°) e o condomínio se estende para SSE,
paralelo à Av. Fraga Maia, ao lado do terreno do UNIQ. O topo da implantação aponta para ENE; a rosa dos
ventos do book (p.37) está girada ~25° em relação ao norte real.

`data/entorno.json` foi gerado a partir de:
- Ruas: © colaboradores do OpenStreetMap (ODbL)
- Edificações e pontos de interesse: Overture Maps (Google Open Buildings, Microsoft ML Buildings, OpenStreetMap)

Alturas dos vizinhos são estimadas pela área (casas de 1–2 pavimentos). `img/areas/` são recortes do book.
