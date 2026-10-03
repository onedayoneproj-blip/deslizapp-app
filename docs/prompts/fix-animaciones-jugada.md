# Arreglar las animaciones de Tu próxima jugada (rama `fix/animaciones-jugada`)

Lewis grabó la app en su iPhone (3 oct, después del PR #38) y las transiciones se ven rotas. Abajo va cada fallo con lo que se ve, la causa en el código y el arreglo. Los archivos son `components/clientes/transiciones-jugada.tsx`, `components/clientes/hoja-resumen-clientes.tsx` y el CSS de `app/globals.css` (`.barrido-*`, `.brillo-jugada`).

Antes de empezar, lee docs/09 §13 y §16, punto 5 (componentes), y `referencias/proxima-jugada/LEEME.md`. El tablero `Barrido.dc.html` se actualizó con los tiempos nuevos (abajo); cópialo de nuevo desde el canvas si lo tienes, o sigue los números de este prompt.

## A. Entrada (tocar la tarjeta → galería)

**A1. La pantalla cambia de golpe.**
- **Qué se ve:** en el primer cuadro después del toque desaparecen la dona, la leyenda y los cuadros, y el título cambia a "Tu próxima jugada". La malla queda como un recuadro suelto sobre una hoja vacía.
- **Causa:** la navegación cambia el contenido al instante y la capa de la entrada no cubre la hoja.
- **Arreglo:** mientras dura la entrada, deja la vista anterior montada en una capa de atrás (como `BarridoContenido` hace con la galería) y desvanécela (opacidad 1 → 0 en los primeros 300 ms). El título y la fila "‹ Tus clientes" cambian con un cruce de 200 ms cuando la malla ya los cubre, cerca del 35 % de la animación, no en el primer cuadro.

**A2. La malla crece mal: esquinas rectas, se corta abajo con un borde recto, tapa el título y deja manchas sueltas abajo.**
- **Causa:** se animan `left`, `top`, `width` y `height` de una caja que contiene `MallaViva`. Al cambiar el tamaño, las manchas se reacomodan y se estiran, y la caja termina en el rect del `[role='dialog']`, que no es la superficie visible de la hoja. Además va en un portal por encima de todo, encima de la cabecera.
- **Arreglo:**
  - Monta la malla **del tamaño de la superficie de la hoja** desde el principio (mide la superficie real del panel de `Hoja`; si no tiene una marca, agrégale `data-hoja-panel`).
  - Anima solo su **`clip-path`**: de `inset(<rect de la tarjeta, relativo a la hoja> round 22px)` a `inset(0 round 28px 28px 0 0)`, en 900 ms con `cubic-bezier(.65,0,.25,1)`. Así las manchas no se deforman y no aparecen bordes rectos.
  - Ponla **debajo de la cabecera** (el título y la X siempre se ven) y encima del contenido.
  - Al final no la desvanezcas entera: ponle una máscara que se apague hacia abajo y llévala al mismo aspecto que `BrilloJugada` (opacidad .55, visible arriba y transparente hacia abajo) en los últimos 250 ms. Entonces la quitas y queda el `BrilloJugada` real, sin salto.

**A3. Dos cartas desaparecen en el aire.**
- **Qué se ve:** el reloj y el regalo se encogen y se desvanecen a mitad de camino.
- **Causa:** la galería solo muestra las jugadas con clientes (hoy 2 de 4), y las cartas sin cuadro animan hacia `opacity: 0` durante los 950 ms.
- **Arreglo:** las cartas sin cuadro se quedan en su lugar del mazo y se desvanecen en 180 ms al empezar, antes de que las otras despeguen. No viajan.

**A4. Las cartas aterrizan en el lugar equivocado y luego saltan.**
- **Qué se ve:** llegan un poco más arriba y más bajitas que los cuadros, tapan "Cuatro maneras de acercarte…" y a los 1,2 s se cambian de golpe por los cuadros reales, con la imagen en otra posición.
- **Causa:** el destino se mide antes de que la galería termine de acomodarse (falta la fila "‹ Tus clientes" y el párrafo, y corre el scroll de `irArriba`). Además la carta en vuelo es un elemento distinto al cuadro, con la imagen colocada de otra forma.
- **Arreglo:** **FLIP con los cuadros reales**, sin copias en vuelo.
  - Monta la galería final y espera un cuadro (`requestAnimationFrame` doble), después de `irArriba`.
  - Mide el rect real de cada cuadro y anima **el cuadro mismo** con `transform` desde el rect y el giro de su carta en el mazo hasta su lugar (`translate` + `scale` + `rotate` → identidad). Son 950 ms con `cubic-bezier(.5,0,.15,1.08)`, escalonados 70 ms, con `transform-origin` arriba a la izquierda.
  - Mientras vuela, el cuadro oculta su texto, la cantidad y el chevron (opacidad 0), y su imagen se mantiene centrada como en la carta. Al aterrizar, el texto entra en 200 ms.
  - Así lo que aterriza **es** el cuadro: no hay cambio ni salto.

**A5. El cuadro de abajo de la galería aparece tarde y suelto.** La fila "‹ Tus clientes", el párrafo y las notas de abajo entran con el mismo desvanecimiento (300 ms) cuando la malla llega al 60 %, todos juntos.

## B. Barrido (elegir una jugada → su lista)

**B1. Un tiempo muerto de medio segundo al principio.**
- **Qué se ve:** la galería se desenfoca y se apaga y no pasa nada más; la franja aparece a los 0,6 s.
- **Causa:** la franja empieza en −0,72·H, fuera de la hoja, y recorre casi un 40 % del tiempo sin verse. El desenfoque va con otra duración (900 ms `ease`).
- **Arreglo, tiempos nuevos:**
  - El **centro de la franja** va de **−150 px** (justo encima del borde de arriba de la hoja) a **H + 150 px**.
  - El **borde de la máscara** hace el mismo recorrido (de −150 a H + 150, relativos al borde de arriba de la hoja), con el mismo difuminado (±0,08·H).
  - Duración **1100 ms**, curva `cubic-bezier(.65,0,.35,1)`, la misma para franja, máscara, el contenido que sube 28 px y el desenfoque de atrás.
  - Así la franja entra en el primer cuadro y nunca hay un momento sin nada.
  - Actualiza `DURACION.jugadaBarrido` a 1100.

**B2. El título y "Todas las jugadas" cambian antes del barrido.** El título de la hoja y la fila de arriba cambian cuando la franja pasa por encima de la cabecera (alrededor del 12 % de la animación), con un cruce de 150 ms. No en el primer cuadro.

**B3. Fantasmas de la galería encima de la lista.**
- **Qué se ve:** después del barrido, durante casi medio segundo, se ven "Segundo aaah" y "El primer hola" borrosos entre la tarjeta del 80 % y la lista. En una pasada se quedan visibles más tiempo.
- **Causa:** la capa nueva es transparente entre sus elementos y la galería de atrás (`atras`) sigue montada hasta que termina la franja.
- **Arreglo:** la capa nueva (`.barrido-nuevo`) tiene fondo `fondo` opaco y cubre todo el alto visible de la hoja. La capa `atras` se desmonta en cuanto termina la animación de la máscara, no cuando termina la franja.

## C. Volver de una jugada a la galería: cuadros sin imagen

- **Qué se ve:** al volver, los cuadros salen sin su ilustración durante casi un segundo.
- **Causa:** `next/image` carga las ilustraciones de forma perezosa cada vez que se monta la galería.
- **Arreglo:** las cuatro ilustraciones (galería y detalle) van con `loading="eager"` y `priority` en la galería. Precárgalas cuando se abre la hoja "Tus clientes" (por ejemplo con `<link rel="preload" as="image">` o `new Image()`). Comprueba que al volver ya están.

## D. Comprobación

- `npm run lint`, `npm run build` y las pruebas.
- **Graba en un iPhone (o en Safari con su vista de iPhone) las tres cosas:** tocar la tarjeta, elegir una jugada y volver. Revísalas **cuadro por cuadro** y escribe en el PR que no queda ninguno de estos fallos:
  - El cambio de golpe del contenido.
  - Bordes rectos en la malla.
  - Cartas que desaparecen en el aire.
  - El salto al aterrizar.
  - El tiempo muerto.
  - El título que cambia antes.
  - Fantasmas.
  - Cuadros sin imagen.
- Prueba con dos jugadas y con cuatro. Prueba también con "reducir movimiento": cambio directo, sin capas.
- Abre el PR contra `main` con los videos o los cuadros clave.
  - Si todo pasa, haz el merge tú mismo (squash) y borra la rama.
  - Si algo falla o tuviste que decidir algo que no está aquí, deja el PR abierto y explícalo.
