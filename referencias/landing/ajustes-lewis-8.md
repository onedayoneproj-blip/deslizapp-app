# Landing · ajustes de Lewis, ronda 8 (14 oct 2026)

Lewis probó 42992fd en su iPhone. Capturas:
- `r8-cola-burbuja-actual.jpg`: la cola de hoy;
- `r8-cola-burbuja-referencia.webp`: la cola bien trazada;
- `r8-lugar-del-icono.jpg`: en amarillo, dónde va el icono durante el reel;
- `r8-pantalla-no-cubre.png`: la pantalla que no cubre el mockup.

Donde choque con rondas anteriores, **manda esto** (incluido lo de «sin Fredoka» de la ronda 4).

## 1. Indicador más fino
Las rayas son demasiado gruesas. Tienen que parecerse a **las marcas del reloj de iOS**: trazos muy finos, de 1 a 1.5 px, con las puntas redondeadas.
- Las «gruesas» se distinguen por ser **más largas** y algo más opacas, no por ser más anchas: unos 2 px como mucho.
- La actual va más larga y en color sólido.
- Mantén el área de toque de 24 px en las gruesas, aunque se vean finas.

## 2. Burbujas: más claras, Fredoka y color en lo importante
- **Color más claro** para que se lean mejor sobre los fondos: el verde claro de WhatsApp (modo claro, en torno a `#D9FDD3`) con texto oscuro de la marca, o blanco si es de Deslizapp. Comprueba el contraste (AA) sobre rosa y sobre verde.
- **Tipografía Fredoka**, y **color de marca en las palabras clave** para llamar la atención. Por ejemplo «Lo que te gusta: dale **aaah**.», con «aaah» en mandarina; o «Te llega **organizado**.», en verde Bosque.
  - Añade a cada burbuja de `PASOS` un campo para marcar qué palabras se resaltan, para que Lewis pueda cambiarlas.
  - Usa los colores de `docs/09` y la regla de marca: rosa para el comprador y verde para el vendedor.
- **La cola está mal trazada.** Mira `r8-cola-burbuja-referencia.webp`: la cola sale de la esquina de abajo con una **curva continua**, como una gota que se afina hacia fuera. No es un triángulo pegado. Hazla con un SVG o un `path` de la misma pieza que la burbuja, sin costura, y del mismo color.
- **Más grandes y algo más arriba.** El **teléfono va en una capa por encima de la burbuja** (z-index), así que la burbuja puede montarse un poco bajo el borde del teléfono sin «chocar». Quita el espacio extra que reservaste para que no se tocaran. El texto tiene que seguir leyéndose entero: lo que se monta es el borde de la burbuja, no las letras.

## 3. El video no para nunca
El video de fondo **se reproduce siempre en bucle, sin pausa**, también cuando la portada ya no está en pantalla, mientras se vea detrás. Quita el «solo corre mientras se ve la portada» o, como mucho, páusalo solo cuando la pestaña está oculta (`visibilitychange`). La única excepción sigue siendo movimiento reducido o ahorro de datos, que dejan el póster.

## 4. El lema debajo del icono
Debajo del icono de Deslizapp va el lema de la campaña, en dos líneas:
**«Comprar sin tanta vuelta. / Vender con más orden.»**
- Fredoka, con «vuelta» y «más orden» resaltados como en el video (mandarina y rosa, o los colores de `docs/09`).
- Sustituye al nombre «Deslizapp» debajo del icono, o va debajo de él: elige lo que quede más limpio.

## 5. El desbloqueo sigue al dedo
La primera transición (del teléfono bloqueado al reel) **la controla el dedo**, como el desbloqueo de iOS.
- Mientras la persona desliza, el teléfono sube, la pantalla de bloqueo se va y el reel crece **en proporción a lo que lleva deslizado**.
- Si suelta antes de la mitad, vuelve atrás con un resorte. Si pasa de la mitad (o desliza rápido), se completa solo.
- Es la única transición que va con el dedo. El resto de pasos siguen como ahora, por pasos.
- Que funcione con el scroll real de la página, sin atrapar el gesto, y con la rueda o el trackpad en escritorio.

## 6. La pantalla del teléfono tiene que cubrir el mockup entero
En `r8-pantalla-no-cubre.png` (paso «registrar», hoja «Pedido del catálogo»), arriba, junto a la isla, se ve el fondo verde de la página entre el contenido y el marco. Pasa lo mismo arriba a la izquierda y a la derecha.
- El iframe tiene que llenar **toda** la pantalla del mockup, incluida la zona de la barra de estado, con el mismo radio de esquina que el cristal del mockup.
- Revisa todos los pasos de los dos teléfonos. Añade a `probar-landing` una comprobación de que el contenido del iframe cubre la pantalla del mockup en cada paso, por ejemplo con el color de las esquinas de la captura.

## 7. El icono va arriba a la izquierda durante el reel
El icono de la app que sube en la portada **viaja a la esquina de arriba a la izquierda** (`r8-lugar-del-icono.jpg`), a la altura de «Saltar», y se queda ahí en pequeño, unos 36 a 44 px, durante toda la demo.
- La animación del viaje va con el desbloqueo.
- Al tocarlo se vuelve a la portada.

## 8. La barra de estado no es transparente
En Safari del iPhone, la franja de la hora (arriba) es color crema, mientras que la página es rosa o verde. Lo mismo la zona de la barra de direcciones abajo.
- `viewport-fit=cover` y fondo que llegue a las áreas seguras.
- `<meta name="theme-color">` que **cambia con el fondo del capítulo**: rosa en compras y verde en tienda, actualizado con JS al cambiar de paso.
- El `background` de `html` y `body` también sigue al capítulo, para que el rebote del scroll y la barra de abajo no muestren crema.
- Comprueba que no pisa el theme-color del resto de la app (solo en la landing).

## Pruebas
- `probar-landing`:
  - rayas de 2 px o menos;
  - burbujas con Fredoka y palabras resaltadas;
  - el teléfono por encima de la burbuja;
  - el video sigue reproduciéndose fuera de la portada;
  - el lema bajo el icono;
  - el desbloqueo a mitad de gesto queda a mitad, y al soltar vuelve o se completa;
  - el iframe cubre el mockup en todos los pasos;
  - el icono arriba a la izquierda durante la demo;
  - el theme-color cambia con el capítulo.
- Capturas a 393×852 de la portada, de un paso de compras y de un paso de tienda.
