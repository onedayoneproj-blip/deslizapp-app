# Planes

- `estrategia-y-validacion-oct-2026.pdf`: el documento de Lewis con los planes Inicial, Negocio y Pro. Resumen vigente en `docs/14`.
- `pagina-planes.dc.html`: la página de planes aprobada (opción A, 16 oct 2026), del lienzo [Planes de Deslizapp · página](https://claude.ai/artifact/HLYkbe8yyF8Z8qfA2Sn75o). Los precios de este archivo son de ejemplo: en la app salen de la tabla `planes`. **No se copia su HTML.**

## Sello «-30%» del Círculo (16 oct 2026) — DESCARTADO, ver «Nota a mano»
`sello-circulo.dc.html` (tablero F del lienzo). Es una estrella de puntas redondeadas, como un sello de «SALE», con los bordes del aro: crema por dentro con mandarina, rosa y verde alrededor, y un filo crema por fuera para que el verde no se pierda sobre el fondo de la página. Dentro lleva «primeras tiendas» a mano, «-30%» en Fredoka y «EL 1.er AÑO».
- **Dónde:** uno solo, junto al selector Mensual/Anual. Lo eligió Planning; Lewis lo dejó a su criterio.
- **Cuándo:** solo en «Anual». Entra con un rebote y, con movimiento reducido, aparece sin animación.
- La línea de cada plan con su precio del primer año («Primeras tiendas · 30 % menos · RD$… el primer año · por invitación») se mantiene.

## Nota a mano del -30% (elegida por Lewis el 16 oct 2026)
Sustituye al sello de estrella. Es la opción E del lienzo: `descuento-nota-a-mano.dc.html`.
- **Junto al selector**, solo en «Anual»: «primeras tiendas: -30%» escrito a mano, en Caveat 700, unos 22 px, rosa `#F5C9D6`, con «-30%» en mandarina. Va girado unos -6°, arriba a la derecha del selector, con una flechita a mano que apunta al botón «Anual».
- **En cada tarjeta, al pie** (después del botón, separado por una línea fina) y solo en «Anual»: el sello del corazón del Círculo (círculo verde con el corazón rosa y borde crema) y «Primeras tiendas: **RD$4,192** el primer año · por invitación», con el precio de cada plan. Sin caja.

## «Todos los planes traen» con vista previa y preguntas en chat (16 oct 2026)
Aprobados por Lewis en el lienzo (tableros D y E2). Encargo: `docs/prompts/planes-incluye-y-preguntas.md`. Los archivos son prototipos de diseño: **no se copia su HTML**.
- `incluye-con-vista-previa.dc.html`: el carrusel de cuatro tarjetas. En la app, cada vista previa se arma con piezas reales (`components/planes/vistas-previas.tsx`) y datos de ejemplo (`lib/planes/ejemplos-incluye.ts`): el perfil (`components/landing/perfil-tienda.tsx`, la pantalla `perfil` de «Cómo funciona»), el mensaje del catálogo en las burbujas, `TarjetaPedido` y la fila de existencias, y `FilaCliente`. Los textos: `lib/planes/incluye.ts`.
- `preguntas-frecuentes-chat.dc.html`: el chat con respuestas rápidas. Los textos viven en `lib/planes/preguntas.ts` (con los cambios de Lewis: la comisión dice «hoy», el cupo dice solo lo que cuenta el código, el Círculo dice «pagando el año»; y el cierre es por Instagram, no por WhatsApp). La burbuja es la de «Cómo funciona», ahora compartida: `components/chat/burbuja-chat.tsx` (enviada verde con la cola a la derecha; recibida blanca, reflejada).
- Pruebas: `node scripts/probar-planes-incluye-y-preguntas.mjs` (con `CAPTURAS=1` guarda las de `docs/capturas/planes-incluye-y-preguntas/`) y `tests/planes.test.mjs`.
- **Primera tarjeta animada (17 oct 2026):** del perfil al catálogo, el zoom out, dos deslizamientos y el «aaah» en bucle de 12,5 s (`components/landing/perfil-a-catalogo.tsx`), a partir de la grabación de Lewis (`instagram-perfil-a-catalogo/`). Piezas compartidas: `perfil-tienda.tsx` (perfil en modo oscuro) y `navegador-instagram.tsx` (hoja del navegador), listas para los pasos `perfil` y `navegador` de «Cómo funciona». Todo en `cqw` y `aspect-ratio`, sin estirar. La vista previa de las cuatro tarjetas mide 280 px (antes 250); el teléfono del mockup de «Cómo funciona» (240×506) asoma desde arriba y se corta a ~55 %.
  - El «aaah» es `components/landing/burst-aaah.tsx` (las medidas y tiempos del `.burst` de `app/tienda/catalogo.css`, en cqw: ese CSS solo carga en el catálogo). El cuadro del tercer producto sin like sale de `scripts/generar-catalogo-bio.mjs`. La tarjeta de WhatsApp usa `Globo` (con la vista previa del enlace) de `components/landing/whatsapp.tsx`.
- **Las otras tres tarjetas también se animan (17 oct 2026):** bucles de ~7 s con piezas reales, que corren solo con la tarjeta a la vista (`useEnPantalla`) y, con movimiento reducido, quedan en su estado final.
  - WhatsApp: «escribiendo…», llega el pedido con la vista previa del enlace (`VistaPreviaEnlace` y `TextoMensaje` de `whatsapp.tsx`, en la burbuja compartida) y responde la tienda; los checks pasan de grises a azules (`checks="grises-a-azules"`).
  - Panel: entra un pedido «Nuevo» (`TarjetaPedido` con `etiqueta`), un toque lo pasa a «Despachado» (`ChipEstado`) y el termo baja de 3 a 2 en stock (`DetalleStock`).
  - Clientes: `AbonoAnimado` (JS, con `Numero`): «Anotar abono», se escribe RD$500 en `CampoMonto`, y `BloqueDeuda animado` baja de RD$1,250 a RD$750.
  - Con CPU x4 (DevTools): 60 fps y ninguna tarea larga en las cuatro. Las vistas previas llevan `inert`.
