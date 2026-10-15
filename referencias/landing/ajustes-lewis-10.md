# Landing · ronda 10: nuevo diseño de la portada y del cierre (15 oct 2026)

Lewis eligió en el lienzo de diseño (https://claude.ai/artifact/F6iDkiTg9CJp3kW8NKLzKJ):
- la **Portada A**, con el botón «Desliza y mira» y el «Saltar» de la Portada C;
- el **Cierre A**.

Las fuentes del diseño están en `referencias/landing/diseno-r10/`: `portada.dc.html` y `cierre.dc.html`, a 390×844.
- **Son referencia visual: no se copian como código.** Constrúyelo con los componentes y tokens de la app (`app/globals.css`, la regla de `docs/09`).
- Las imágenes del diseño apuntan a `/_blob/…` del lienzo: usa las de la app (`public/landing/`, `public/icons/apple-touch-icon.png` y las fotos `feed-*`).

Si choca con rondas anteriores, **manda esto**.

## Portada
- **Video a todo color.** Quita el oscurecido general (el «video al 55 %»). Solo dos degradados de lectura, Bosque `rgba(16,54,42,…)`: uno arriba de 0.55 a 0 hasta el 34 % del alto, y otro abajo de 0 a 0.7 desde el 50 %. El video no se ve gris.
- **Arriba a la derecha, «Saltar»** en píldora translúcida: fondo `rgba(255,249,238,0.14)`, texto crema, 44 px de alto y doble chevrón.
- **Icono de la app** (84 px, radio 19 px, sombra suave) centrado hacia el 16 % del alto. Debajo, el lema en Fredoka 700 al 115 % de ancho, 31/35 px, crema con sombra suave: «Comprar sin tanta **vuelta**. / Vender con **más orden**.», con «vuelta» en `#ff834f` y «más orden» en `#f5c9d6`.
- **El teléfono asoma por abajo** (unos 300 px de ancho, empieza hacia el 54 % del alto y queda cortado por el borde). Su pantalla de bloqueo lleva:
  - de fondo, la foto del termo desenfocada (blur unos 14 px) con un velo Bosque al 18 %;
  - fecha («martes, 14 de octubre») y hora grande («3:41»), en blanco;
  - **un aviso** tipo iOS: tarjeta crema translúcida con la miniatura del termo, «**Brisa** · ahora» y «Llegó el termo rosado. Desliza y míralo.».
  - Ya no lleva el «Desliza y mira» dentro de la pantalla.
- **Botón «Desliza y mira»**, centrado, a 34 px del borde de abajo y por encima del teléfono:
  - una píldora de 52 px con fondo `rgba(16,54,42,0.55)` y desenfoque;
  - dentro, a la izquierda, un círculo mandarina `#ff834f` de 44 px con una flecha hacia arriba en `#10362a`, y a la derecha el texto en Fredoka 600 de 18 px, crema.
  - Al tocarlo hace lo mismo que deslizar (empieza el desbloqueo). Mientras se espera, la flecha da un saltito suave hacia arriba, salvo con movimiento reducido.
- El desbloqueo con el dedo, el icono que viaja a la esquina y el resto de la ronda 8 no cambian.

## Cierre
- **Fondo Verde Bosque** `#174b3a` a pantalla completa, con el theme-color de Safari igual.
- **Arriba:** a la izquierda, el icono pequeño (40 px). A la derecha, «Ver la demo otra vez» en píldora translúcida (`rgba(255,249,238,0.12)`, texto crema, con icono de repetir).
- **Las tres fotos en abanico:**
  - la gorra a la izquierda (girada −9°) y el tote a la derecha (girado +9°), de 128×160;
  - el termo al centro, de 150×188, con borde crema de 3 px y por delante.
  - Sobre la esquina de abajo del termo, el **corazón mandarina** (círculo de 52 px) y debajo una etiqueta crema «✓ Despachado».
  - Es el cierre del hilo del ♥: el corazón del dedo puede aterrizar aquí.
- **El lema** grande en crema, Fredoka 32/36, con «vuelta» en mandarina y «más orden» en rosa.
- **Abajo, una hoja crema** (`#fff9ee`, esquinas de arriba de 28 px, alto de unos 330 px) con:
  1. **«Quiero vender»**: botón mandarina `#ff834f` de 56 px, texto `#10362a` en 800 y el icono de burbuja de chat. Abre WhatsApp como ahora.
  2. Debajo, en 14 px `#4f6a5e`: «Las tiendas entran por invitación. Escríbenos.».
  3. **«Ver un catálogo de ejemplo»**: botón con contorno Bosque de 2 px y 52 px de alto.
  4. Al pie: «¿Ya tienes tienda? **Entrar**» y, debajo, «Privacidad · Términos» en pequeño.
- Se quitan el subtítulo «Un catálogo para comprar. Una app para lo que pasa después.» y el bloque crema actual.

## Nombre de la tienda de la demo: «Brisa»
Lewis no quiere «La Vuelta», que puede sonar callejero y choca con el lema «sin tanta vuelta». La tienda de la demo pasa a llamarse **Brisa** en todo:
- los datos de `db-demo` y `pedido-demo`;
- la cabecera del catálogo, los mensajes de WhatsApp y la imagen del pedido;
- el seguimiento, «¿Eres la tienda?», las burbujas, los textos de `PASOS` y el OG.
Busca «La Vuelta» y «la-vuelta» en todo el código de la landing, sus pruebas y sus capturas, y que no quede ninguno.

## Pruebas
- `probar-landing`:
  - la portada sin oscurecido general;
  - el botón «Desliza y mira» visible y tocable (al tocarlo arranca el desbloqueo);
  - el aviso de «Brisa» en la pantalla de bloqueo;
  - el cierre con las tres fotos y los tres enlaces;
  - ni una mención a «La Vuelta».
- Capturas de la portada y del cierre a 393×852 en el PR, al lado de las del diseño.
