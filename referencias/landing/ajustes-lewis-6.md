# Landing · ajustes de Lewis, ronda 6: portada con video e índice de rayas (14 oct 2026)

Se suma a todo lo anterior. Donde choque, **manda esto**.

## 1. Índice: solo rayas, sin texto
Lewis quiere un indicador lateral de **rayas sin texto** en lugar de la lista con palabras:

```
-
-
-
—      ← el capítulo actual, más largo
-
-
```

- Una raya corta por capítulo (6) y **la actual más larga** y más marcada. Las ya vistas pueden ir algo más marcadas que las que faltan.
- El cambio de raya se anima (crece y encoge) con el paso.
- Sigue en el **lateral izquierdo**, centrado en vertical. **Sin texto** en ningún tamaño, tampoco en escritorio.
- Cada raya se puede tocar y salta a su capítulo. El área de toque es de al menos 44 px de alto, aunque la raya se vea fina, y cada una lleva su `aria-label` con el nombre del capítulo (Elige, Envía…), solo para el lector de pantalla.
- Como ya no lleva palabras, ocupa menos: devuélvele al teléfono el ancho que le quitó la columna de 96 px.

## 2. Portada (la primera pantalla, antes de la demo)
- **No lleva el indicador de rayas.** Aparece desde el primer paso de la demo.
- **La burbuja de WhatsApp de la portada** solo sirve para invitar a deslizar («Hola, bienvenido a Deslizapp. Desliza y mira cómo funciona.» o algo así de corto). Es la única burbuja de la portada.
- **Fondo de la portada: el video de Lewis**, `video-portada-original.mp4`. Fotogramas en `video-portada-fotogramas.jpg`.
  - Dura 10 s, es vertical 9:16 (1440×2560, 24 cps), pesa 11.6 MB y trae audio. Tiene tres escenas: una compradora dando ♥ en el teléfono, la tienda empacando con avisos de WhatsApp, y la bolsa con el producto y el texto «Comprar sin tanta vuelta. Vender con más orden.».
  - Pásalo a `public/landing/`: **sin audio**, en H.264 MP4 a unos 720×1280, y también en WebM/AV1 si pesa menos. Que cada uno pese **menos de 2.5 MB**. Saca también un **póster** (el primer fotograma, en WebP).
  - `<video autoplay muted loop playsinline preload="metadata" poster=…>` a pantalla completa con `object-fit: cover`. En escritorio, centrado y cubriendo el fondo, o en una columna 9:16 centrada con el color de marca a los lados. Elige lo que se vea mejor y muéstralo en el PR.
  - El video **ya trae su propio texto** al final. No pongas encima otro titular que compita. Encima solo van el logo, la burbuja de «desliza» y «Saltar». Si hace falta para que se lean, un degradado suave arriba y abajo.
  - Con movimiento reducido o con ahorro de datos (`prefers-reduced-motion` o `navigator.connection.saveData`), se muestra solo el póster, sin reproducir.
  - Si iOS bloquea la reproducción automática, queda el póster y no sale ningún botón de play.
  - El video original de `referencias/` no se publica: solo las versiones comprimidas de `public/`.

## Pruebas
- `probar-landing`:
  - en la portada no hay indicador y hay una sola burbuja;
  - desde el primer paso de la demo, el indicador tiene 6 rayas y la activa es la del capítulo correcto;
  - tocar una raya salta a su capítulo;
  - el video de la portada existe, va sin sonido, tiene `playsinline` y pesa menos de 2.5 MB;
  - con movimiento reducido no se reproduce.
- Capturas de la portada a 393×852 y 1440×900.
