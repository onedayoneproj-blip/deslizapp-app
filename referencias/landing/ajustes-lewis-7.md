# Landing · ajustes de Lewis, ronda 7: indicador por toques, video que arranca solo y entrada con pantalla de bloqueo (14 oct 2026)

Se suma a todo lo anterior. Donde choque, **manda esto**.

## 1. Indicador: rayas gruesas por deslizamiento y finas por toque
Hoy hay una raya por capítulo. Lewis quiere que el indicador muestre **el ritmo real** de la demo. Algunos pasos no terminan con el deslizamiento: siguen un rato con varios toques automáticos.
- **Raya gruesa** = cada punto en que la persona tiene que deslizar. Es decir, **una por paso** de `PASOS` (no por capítulo).
- **Rayas finas** entre dos gruesas = los toques o tiempos automáticos del paso, antes de que haga falta el siguiente deslizamiento. Una raya fina por toque del dedo (♥), o una por cada fase con tiempo propio si el paso no tiene toques. Sácalas de la misma tabla de pasos: que no se cuenten a mano.
- **Estado:** la gruesa del paso actual se marca al llegar. Las finas **se van llenando una a una** mientras la animación del paso avanza. Cuando el paso termina, todas sus finas están llenas y toca deslizar.
- Al volver atrás se vacían.
- **Tamaño:**
  - El total tiene que caber a la izquierda, en vertical, en unos 60 a 70 % del alto visible, a 360×640 y a 430×932. Ajusta el espacio entre rayas para que quepa.
  - Las gruesas se pueden tocar y saltan a su paso, con un área de toque de al menos 24 px; las finas no se tocan.
  - Sin texto. Cada gruesa lleva su `aria-label` con el nombre del paso.
- La portada sigue **sin indicador**.

## 2. El video de la portada no arranca solo en Safari
En el iPhone de Lewis, al abrir la landing el video **se queda quieto**. Solo se mueve si avanza un paso y vuelve.
- **Sospecha principal:** React no escribe el atributo `muted` en el HTML del servidor (es un fallo conocido), y iOS solo reproduce solo un video si lleva `muted` como atributo desde el principio. Revísalo en el HTML que sale del servidor.
- Arreglo:
  - pon `muted` y `playsinline` en el HTML de verdad, por ejemplo con un `ref` que fije `el.muted = true` y `el.defaultMuted = true` antes de llamar a `play()`, o renderizando el `<video>` con el atributo literal;
  - llama a `play()` en cuanto haya datos (`loadeddata` o `canplay`), no solo cuando la portada entra en vista;
  - si `play()` falla, reinténtalo en el primer `touchstart`, `pointerdown` o `scroll`;
  - comprueba que el «solo corre mientras se ve la portada» no lo pausa al cargar: en la primera pintura, la portada **sí** está en vista.
- Pruébalo en WebKit con Playwright (`webkit`, si está disponible) y en Chromium con la emulación de iPhone. El video tiene que reproducirse solo, sin tocar nada, menos con movimiento reducido o ahorro de datos.

## 3. Nueva entrada: icono, pantalla de bloqueo y desbloqueo
Sustituye a la portada actual. Orden:
1. **Arranca el video** de fondo, como ahora.
2. Al poco (unos 0.6 a 0.8 s), **sube el icono de la app**: el icono de iOS de Deslizapp, con su forma de icono redondeado (squircle, esquinas continuas), no solo el logo. Usa `public/icons/apple-touch-icon.png` o `icon-512.png`, que es el mismo icono que queda en la pantalla de inicio. Puede llevar el nombre «Deslizapp» debajo, en blanco, como en iOS.
3. Justo después **sube el teléfono** (mockup titanio). Muestra una **pantalla de bloqueo de iPhone**:
   - la hora grande y la fecha arriba;
   - un fondo de marca (rosa o un fotograma del video, difuminado);
   - abajo, la invitación a deslizar al estilo iOS, con la voz de marca. Propuesta de Planning: **«Desliza para verlo»** o **«Desliza y mira»**. Elige una con el tono de `docs/11-voz-y-frases.md` y avisa.
   - La barrita de inicio (home indicator) abajo, con un brillo o un movimiento suave que invite a subir.
   - **El teléfono no se ve entero:** su parte de abajo queda cortada por el borde inferior de la pantalla, como si asomara.
4. **Al primer deslizamiento (un solo paso):**
   - el teléfono **sube a su sitio de la demo** (donde está ahora para el reel);
   - **a la vez se desbloquea, como en iOS:** la pantalla de bloqueo sube y se desvanece, y la app entra con el **zoom hacia dentro** de iOS. El reel aparece algo más pequeño (escala ~0.88), con algo de desenfoque y transparencia, y crece hasta 1 mientras se aclara, como cuando se abre una app desde el icono. Unos 450 a 600 ms, con una curva de resorte.
   - Al terminar, se ve el **feed de reels** que ya existe y la demo sigue como hoy, a partir del paso «hola».
   - El icono puede «entrar» en el teléfono, como si la app se abriera desde él, o desvanecerse. Elige lo que quede más limpio.
5. Al volver atrás desde el primer paso de la demo, se hace al revés: el teléfono baja, se bloquea y vuelve la pantalla de bloqueo.
- **La burbuja de WhatsApp de la portada:** déjala de momento. Si con el «Desliza…» de la pantalla de bloqueo queda repetido o tapado, quítala y avisa (Planning se lo pregunta a Lewis).
- El video sigue de fondo detrás del icono y del teléfono. Que el icono y el teléfono no tapen el texto del final del video («Comprar sin tanta vuelta. Vender con más orden.»). Si no hay forma, baja la opacidad del video cuando entra el teléfono.
- Con movimiento reducido: el icono y el teléfono aparecen ya en su sitio. Al deslizar, se pasa directo al reel, sin zoom.
- Todo con `transform` y `opacity` (y `filter` solo en el reel), y nada atrapa el gesto.

## Pruebas
- `probar-landing`:
  - el video tiene el atributo `muted` en el HTML del servidor y se reproduce solo, sin tocar nada (`currentTime` > 0 al cabo de 1.5 s);
  - en la portada: el icono y el teléfono con la pantalla de bloqueo, el teléfono cortado abajo y sin indicador;
  - un deslizamiento desbloquea y deja el reel en su sitio, y al volver se bloquea;
  - el número de rayas gruesas es igual al de pasos y el de finas al de toques; las finas se llenan durante el paso;
  - todo cabe a 360×640.
- Captura o GIF del desbloqueo a 393×852 en el PR.
