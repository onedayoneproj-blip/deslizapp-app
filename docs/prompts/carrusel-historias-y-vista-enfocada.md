# Catálogo: barras tipo historia en el carrusel y vista enfocada de fotos

Encargo de Planning, 11 oct 2026. Tu puesto es **Coding**. Lewis autorizó este trabajo.

## 0. Contexto

Lee desde `main` actualizado: `docs/00-contexto-del-proyecto.md`, `AGENTS.md`, `HANDOFF.md` (sobre todo las reglas permanentes de movimiento, teclado y gestos de hojas del catálogo), `docs/handoffs/planning-sesion.md`, `docs/08-movimiento.md`, `docs/09-sistema-de-diseno.md`, y en `docs/04-pantallas.md` la sección del catálogo público.

Crea la rama `feat/carrusel-historias-vista-enfocada` desde `origin/main`. No hay migraciones, ni Supabase, ni datos reales: todo es del catálogo público (`components/tienda/`, `app/tienda/catalogo.css`).

### Qué pasó antes (importante)

El PR #101 (ya en `main`, commit `ecbd1be`) hizo dos cosas:

1. **Quitó el contador global «01 / 12» de los reels** (`topmeta` en `components/tienda/reel.tsx`, prop `n` eliminada en `catalogo.tsx` y `vista-previa-reel.tsx`). **Eso se queda así:** Lewis confirma que ese contador no aporta y no debe volver. Comprueba que no quede rastro en ningún sitio (reel, vista previa, scripts de prueba).
2. **Movió los puntos del carrusel a un «pie reservado» bajo la foto** (`.media[data-carrusel-multiple]`, `--pie-medios`, `.paginas-medios` en `catalogo.css`, y el `useEffect` de `paginas` en `medios.tsx`). Eso dejaba una franja de color (un rectángulo rosa con el fondo de la tienda) debajo de la imagen. **Lewis lo rechazó** y revirtió producción en Vercel a la versión anterior a #101. **Quita por completo ese pie reservado**: la foto vuelve a ocupar todo el reel, como antes de #101. Los puntos se sustituyen por las barras del punto 1.

## 1. Barras de progreso tipo historia (Instagram / WhatsApp)

Sustituyen a los puntos de `components/tienda/medios.tsx`.

- **Solo con más de un medio.** Con una sola foto no hay barras ni espacio reservado.
- **Forma:** una fila de segmentos finos (unos 2–3 px de alto, con esquinas redondeadas) separados por un hueco pequeño, uno por medio, repartidos a lo ancho, **arriba** de la foto, por debajo de la cabecera del catálogo y respetando el área segura. Los ya vistos van llenos, el activo se va llenando, los siguientes vacíos (pista translúcida). Color claro sobre la foto con una sombra o velo suave para que se lean en fotos claras y oscuras; usa los tokens existentes, nada de colores nuevos fijos. Reubica `topmeta` (etiqueta «Para ella», «En tu pedido») si choca con las barras.
- **Avance automático:** con el reel activo y visible, cada foto dura **5 s** y pasa sola a la siguiente con el mismo desplazamiento del carrusel. Al llegar a la **última foto se detiene** (barras llenas); **nunca cambia de producto ni hace scroll vertical por su cuenta**.
- **Video** (solo hay videos antiguos; no se pueden subir nuevos): su segmento sigue el tiempo del video y no avanza solo mientras se reproduce en bucle. Mantén simple: si el medio activo es video, la barra refleja su progreso y no avanza automáticamente.
- **Se pausa** mientras el dedo está apoyado sobre la foto (como mantener pulsada una historia), mientras haya una hoja abierta encima del reel, con la vista enfocada abierta, con la pestaña oculta (`visibilitychange`) y cuando el reel deja de ser el activo. Al volver a ser el activo, sigue donde estaba o empieza en la primera; elige lo más natural y dilo en el PR.
- **El usuario manda:** deslizar a mano o elegir una foto por color (`irA`) reinicia el temporizador en la foto elegida y las barras se ajustan al momento.
- **Movimiento:** el llenado se anima solo con `transform: scaleX()` (regla de `HANDOFF.md`). Con `prefers-reduced-motion` **no hay avance automático**: las barras solo marcan cuál está activa, sin animación.
- **Accesibilidad:** las barras son indicador, no controles; anuncia «Foto 2 de 4» con texto accesible. No dejes botones de 44 px invisibles encima de la foto.

## 2. Vista enfocada (tocar el centro de la foto)

- **Un toque simple en la foto** (zona central; deja fuera los bordes donde hay botones y la descripción) abre una vista enfocada a pantalla completa. **Ojo:** el doble toque sobre la foto ya hace el «aaah» (`dobleToque` en `medios.tsx`, ventana de 320 ms). El toque simple solo abre la vista cuando se confirma que no vino un segundo toque; el doble toque sigue funcionando igual que hoy. Un deslizamiento no abre nada.
- **Qué muestra:** fondo negro, la foto entera (`object-fit: contain`, sin recortar) y nada de la UI del reel: ni corazón, opiniones, compartir, descripción, precio ni barras. Solo un botón de cerrar (×) arriba y, si hay varias fotos, un indicador discreto «2 / 4».
- **Gestos:**
  - Pellizcar para acercar y alejar (pinch), con límites razonables (1× a 4×).
  - Doble toque dentro de la vista enfocada: alterna entre 1× y unos 2,5× centrado donde se tocó.
  - Con zoom, arrastrar mueve la foto sin salirse de sus bordes.
  - Sin zoom: deslizar horizontal cambia de foto; deslizar hacia abajo cierra.
- **Cerrar:** la ×, deslizar hacia abajo sin zoom, la tecla Escape y el «atrás» del navegador/sistema. Abre una entrada de historial al entrar y la consume al cerrar, siguiendo el patrón que ya usan las hojas del catálogo (revisa `docs/validacion-historial-interno.md` y cómo lo hace `PanelCatalogo`); el siguiente «atrás» no debe saltarse nada ni requerir dos toques.
- Al cerrar, el carrusel del reel queda en la última foto vista dentro de la vista enfocada.
- **Movimiento:** entrada y salida cortas con `opacity` y `transform` usando los tokens `--mov-*` y `--curva-*`; con movimiento reducido, sin animación. El zoom sigue al dedo (`transform`), sin librerías de animación ni de zoom.
- **iPhone:** bloquea el scroll del fondo mientras está abierta. Evita que Safari haga su propio zoom de página o el gesto de retroceso al pellizcar (`touch-action: none` en la vista y manejo de gestos propio). Los gestos del catálogo (`lib/gesto-hoja.ts`) no se tocan.
- **Accesibilidad:** es un diálogo modal con nombre («Fotos de <producto>»), foco en la × al abrir y devuelto a la foto al cerrar; con teclado, las flechas cambian de foto.

## 3. Lo que no cambia

Likes y «aaah», opiniones, compartir, bolsa, presentaciones y elección de foto por color, video con sonido opcional, perfil, búsqueda y hojas. La vista previa del panel (`vista-previa-reel.tsx`) reutiliza el mismo `Reel`: comprueba que también funciona allí.

## 4. Documentación y novedades

- `docs/04-pantallas.md`: sustituye el párrafo «Indicadores del catálogo (10 oct 2026…)» por la regla nueva (barras tipo historia, avance de 5 s, pausas, vista enfocada) y márcalo como **sustituido el 11 oct 2026 por decisión de Lewis**. Ajusta igual la sección «Indicadores de medios y productos» de `docs/12-catalogo-conectado.md`.
- `HANDOFF.md`, regla de movimiento: añade como excepción concreta el llenado de las barras con `scaleX` y la entrada/salida de la vista enfocada.
- `lib/novedades.ts`: una versión nueva arriba (después de `0.59.0`), en tono de marca, de 2 a 3 líneas: fotos que avanzan solas como una historia y tocar la foto para verla en grande y acercarla.
- Handoff en `docs/handoffs/carrusel-historias-vista-enfocada.md` y capturas en `docs/capturas/carrusel-historias/`.

## 5. Pruebas

- `npm run lint`, `npm run build`, `npm test`, `npm run tipos`.
- Sustituye `scripts/probar-carrusel-imagenes.mjs` por pruebas de: barras con 1/3/10 medios a 360/390/430 px; que no exista el pie reservado ni el contador global; avance automático (temporizador acelerado en la prueba), parada en la última, pausa al mantener pulsado y con hoja abierta, reinicio al deslizar y al elegir color; movimiento reducido sin avance; doble toque sigue dando «aaah» y no abre la vista; toque simple abre la vista; Escape, × y «atrás» cierran consumiendo una sola entrada de historial; zoom con doble toque. Ajusta `probar-catalogo-react.mjs` y `probar-catalogo-presentaciones.mjs` si dependen de los puntos.
- Prueba en Demo: `/tienda/lino-y-algodon?demo#p/pantalon-de-algodon` (4 fotos) y `/tienda/esencias-michel?demo#p/mayar` (1 foto).
- El pellizco real y Safari de iPhone no se pueden probar aquí: dilo claramente en el PR y deja a Lewis una lista corta de qué probar en el teléfono.

## 6. Entrega

- **Deja el PR abierto, sin merge**: es visible para todos los compradores y la versión anterior de este indicador se rechazó en producción. Lewis lo prueba en la preview de la rama y decide.
- En el PR: preview estable `https://deslizapp-app-git-feat-carrusel-historias-vista-enfocada-onedayone.vercel.app` (comprueba que responde), HEAD, check «Revisión» en verde y la lista de pruebas para Lewis.
- Un solo push por ronda (los minutos de Actions son limitados).
- Esta sesión no tiene Notion: deja el resumen en el handoff para que Planning actualice la tarea.
