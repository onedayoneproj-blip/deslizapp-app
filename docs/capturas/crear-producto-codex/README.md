# Capturas — Crear producto, PR #114

Última revisión de Planning/Lewis, comparada con HEAD `3bcd309`. Capturas de navegador Demo a 390×844 CSS px (PNG a 2×); teclado 360×640. Las fotos son archivos reales de prueba. Las comparativas incluyen etiquetas de origen.

## Comparativas

| Caso | Comparativa | Construido |
|---|---|---|
| B5, solo Reel del producto | [Lienzo / 3bcd309 / corrección](comparativa-B5.png) | [B5](b5-pastillas-390.png) |
| Pregunta y composición | [Lienzo / 3bcd309 / corrección](comparativa-preguntas.png) | [Nombre](b2-nombre-390.png) |
| Atributos | [Lienzo / 3bcd309 / corrección](comparativa-atributos.png) | [V1](v1-atributos-390.png) |
| Fotos múltiples | [3bcd309 / corrección](comparativa-fotos.png) | [1/3](b1-fotos-multiples-390.png), [3/3](b1-fotos-multiples-activa-390.png) |
| Cantidades, nueva referencia | [3bcd309 / corrección](comparativa-cantidades.png) | [Dorado/Plateado × Pequeño/Mediano](v4-cantidades-referencia-390.png), [grupo plegado](v4-cantidades-plegadas-390.png) |

La nueva captura original de Lewis está adjunta a la conversación; el panel construido de cantidades reproduce su contenido, manteniendo el pie de historia que pidió Planning. No se incluyen los botones excluidos de su captura.

## Todos los momentos

- Simple: [B1 foto](b1-foto-390.png), [B2 nombre](b2-nombre-390.png), [B3 precio](b3-precio-390.png), [B4 stock](b4-stock-390.png), [B5 revisión](b5-vista-catalogo-390.png), [B6 celebración](b6-celebracion-390.png).
- Presentaciones: [V1 atributos](v1-atributos-390.png), [V2 tallas](v2-valores-talla-390.png), [V3 colores](v3-valores-color-390.png), [V4 cantidades](v4-stock-390.png), [V5 detalle](v5-detalle-presentacion-390.png), [V6 revisión](v6-vista-catalogo-390.png).
- Casos adicionales: [plazo por encargo](b5a-plazo-por-encargo-390.png), [reel por encargo](b5b-reel-por-encargo-390.png), [precio con teclado](precio-teclado-360.png), [sin foto guardado oculto](sin-foto-oculto-390.png), [catálogo lleno](b5-catalogo-lleno-390.png).

## Medición y reproducción

La tarjeta de preguntas empieza a 100 px; barra de avance a 74 px. B5: rótulo a 100 px y Reel a 132 px, marco 350×440; carrusel real 390×490.281, escalado uniformemente a 350×439.996 (redondeo inferior a 0.01 px), sin cabecera y con nombre/precio/controles dentro. Tabla completa en [handoff](../../handoffs/crear-producto-codex.md).

Con el build servido a 3100: `CHROMIUM_PATH=/usr/bin/chromium URL=http://localhost:3100 node scripts/probar-crear-producto.mjs`, después `CHROMIUM_PATH=/usr/bin/chromium URL=http://localhost:3100 node scripts/capturar-comparativas-crear-producto.mjs`. Se usa Chromium instalado, sin `playwright install`.
