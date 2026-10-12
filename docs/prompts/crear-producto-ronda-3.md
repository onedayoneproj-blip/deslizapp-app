# Crear producto «como una historia» — ronda 3 (sobre el PR #112)

Encargo de Planning, 12 oct 2026. Lewis probó #112 (Claude) y #114 (Codex) y **se queda con #112**. Esta ronda aplica sus decisiones sobre la rama `feat/crear-producto-historia` (HEAD `71c9dc7` + lo que lleve `main`: haz merge de `main` primero). El PR de Codex (#114) se cerrará cuando este se fusione; no lo uses como referencia.

**La referencia visual es el prototipo v4:** lienzo de Claude Design «Crear producto · rediseño» (versión 17) y, en el repo, `referencias/crear-producto/LEEME.md` (sección «Prototipo v4»), `capturas/b1…b16.png` y `v1…v3.png` (390×844), `historia.dc.html` y `historia-presentaciones.dc.html` (se leen como código fuente para medidas y textos; no se copian ni sus estilos en línea). **Manda sobre cualquier mensaje anterior de Planning.** Si algo choca con las capturas, mandan las capturas y lo dices en el PR.

## Orden de trabajo (un bloque por entrega; no sigas al siguiente sin avisar con capturas)

### Bloque 1 — la hoja y el flujo de un producto
1. **Es una HOJA, no pantalla completa** (revierte la «hoja a pantalla completa»): sobre el panel atenuado, esquinas superiores redondeadas (28), agarradera, borde superior en y≈78 (en 393×852 mide lo mismo).
2. **Cabecera:** fila 1 «Nuevo producto» a la izquierda y el selector de catálogo a la derecha (recuerda el último usado por tienda, `localStorage` con try/catch; se oculta con un solo catálogo y entonces la fila solo lleva el título). Fila 2: barras de historia + ✕. **Sin ‹ en la cabecera.** Contenido desde y=180.
3. **«Atrás» (‹) siempre ABAJO, a la izquierda del botón principal** (círculo de 52 px), en todos los pasos y en todas las hojas apiladas; apagado en el primer paso, oculto en la celebración. Lewis cambió de opinión sobre esto: antes lo quería arriba.
4. **Paso de la foto** (b1, b2): sin fotos, título + «Tomar foto» y «Elegir de la galería» **en una fila** + «Con foto se vende más.» (Caveat) + «Seguir sin foto». Con fotos: desaparecen título y botones; foto grande con píldora 1/N, miniaturas («Portada», «+ Agregar foto»), «Hasta 10. Mantén presionado para ordenar.», y **«Con foto se vende más.» al final de la pantalla**. Deja sitio debajo para la futura sección de retoque (no la construyas).
5. **Títulos de pregunta a 26 px**; «Escribe tu precio» pequeño y gris con el campo vacío; sin nombre/precio no se ven en la tarjeta (ya lo tienes; verifica contra b3–b6).
6. **«Es por encargo, no llevo stock» es un INTERRUPTOR** (fila blanca con switch), no un chip; al activarlo, «¿Cuándo llega?» con pastillas de 40 px (b7, b8).
7. **Celebración animada** (b10): corazones de «Lo quiero» y burbujas de mensaje tipo WhatsApp que aparecen y flotan alrededor de la foto (solo `transform` y `opacity`, tokens de `docs/08-movimiento.md`; quieta con movimiento reducido). Un solo título «¡Ya está en tu catálogo!»; sin aviso encima.
8. **Sin foto (regla de Lewis):** se puede seguir sin foto, pero **«Publicar» queda apagado** en «Así se ve» con la frase «Agrega una foto para publicar · Volver a la foto» (b16; «Volver a la foto» regresa al primer paso). «Guardar sin publicar» sigue activo: el borrador queda **oculto**. **Los ocultos no cuentan para el límite del plan** (hoy `resumenDelPlan` ya cuenta solo `activo`; no lo cambies, añade una prueba). En el panel (vista del catálogo/inventario), los productos ocultos **sin foto** muestran un aviso «Sin foto». Editar: guardar sin foto solo si queda oculto; para dejarlo visible exige foto.

### Bloque 2 — varias presentaciones (el cambio de fondo)
Hoy «Tiene tallas o colores» manda a la hoja vieja de presentaciones. Nuevo diseño (P1–P5 e I1–I3 del prototipo):
1. **Lo que se ELIGE va como historia en la hoja principal:** ¿en qué cambia? (hasta 2) → ¿qué tallas hay? (con «XS a XL» / «Única») → ¿y qué colores? con «Foto de cada color · opcional». Para otras cosas (Tamaño, Material, +Otra) el paso se llama «¿Qué <cosas> hay?». **7 barras en lugar de 5** desde que se toca el chip (cambio instantáneo, sin animar). Tarjeta «así se verá» de 350×212 con «Desde RD$…», píldora de tallas y puntos de color a medida que se eligen.
2. **Las CANTIDADES van en otra hoja encima, «Inventario»** (nombre aprobado por Lewis): título «Inventario» + ✕, interruptor «Es por encargo, no llevo stock» (con plazo: «3 a 5 días», «1 a 2 semanas», «1 mes», «Otro» y sin cantidades), interruptor «Cada una tiene su precio», **fila «Poner a todas» sola con − N +**, y grupos por la primera cosa (color) con filas por talla, «N en total» por grupo, − / + redondos. Pie: ‹ + «Listo · N en total». Tocar una fila abre el **detalle** como hoja inferior (stock, precio «El mismo»/«Uno propio», foto, «Listo», «Ocultar esta presentación»).
3. **Cuándo se abre:** al tocar «Seguir» en la **última pantalla de valores** (colores si hay colores; si el producto solo cambia por talla, la de tallas). Al cerrar con «Listo», esa misma pantalla muestra debajo la sección **«Inventario · 6 presentaciones · 21 en total · [Editar]»** (P4) y «Seguir» continúa a «Así se ve» (P5: «Desde RD$…», «Ver presentaciones»). «Editar» reabre el Inventario.
4. **Reglas para no romper el flujo (Planning las evaluó):**
   - Si se cierra el Inventario sin «Listo», los valores se conservan y «Seguir» lo vuelve a abrir; no se llega a «Así se ve» con 0 en total (salvo «por encargo»), para no mostrar «Agotado».
   - Si después se cambian tallas/colores, se conservan las cantidades de las combinaciones que siguen existiendo, las nuevas empiezan en 0 y lo quitado se pierde con aviso (la reasignación advertida al cambiar el primer eje ya existe).
   - «Foto de cada color» sin fotos subidas: desactivado con una pista.
   - El gesto/botón «atrás» del sistema cierra primero la hoja de encima; respeta `protegerAtras`, teclado de iPhone y gestos de hojas de `HANDOFF.md`.
   - **Editar un producto existente no cambia** (sigue con la hoja actual). Reutiliza de ella solo la lógica de cantidades; no dupliques el guardado.
   - Se mantienen `opciones_validas`, `guardar_variantes`, máx. 2 ejes, 12 valores, 144 combinaciones, «por encargo» con stock 0 y plazo.
5. **Antes de terminar este bloque**, manda a Planning capturas de P1–P5 e I1–I3 (390×844 y 393×852) y una tabla «lienzo vs construido».

## Qué NO hacer
- La sección de retoque de foto (ronda futura) ni llevar este diseño de tablas al pedido (PR aparte, después).
- Fusionar. Planning revisa y Lewis prueba en su iPhone.

## Entrega
Pruebas (tipos, lint, tests, build, `probar-crear-producto` ampliado, teclado, presentaciones, hoja-producto, producto), `lib/novedades.ts` (2–4 líneas cortas), `docs/04-pantallas.md` al día, capturas en `docs/capturas/crear-producto/`. «Revisión» en verde. Avisa a Planning (`@parent`) con PR, HEAD y lo no probado (iPhone físico).
