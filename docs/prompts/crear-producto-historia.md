# Crear producto «como una historia»

Encargo de Planning, 11 oct 2026. Tu puesto es **Coding**. Lewis aprobó el diseño (opción B del lienzo). Es probablemente la pantalla más importante de la app: de ella depende que una tienda publique su catálogo. La meta es que crear un producto sea **sencillo, rápido y hasta disfrutable**, no una lista larga de campos.

## 0. Contexto

Lee desde `main` actualizado: `docs/00-contexto-del-proyecto.md`, `AGENTS.md`, `HANDOFF.md` (teclado e iPhone, movimiento, gestos de hojas), `docs/handoffs/planning-sesion.md`, `docs/forma-de-trabajo.md`, `docs/04-pantallas.md` (producto, presentaciones, inventario), `docs/09-sistema-de-diseno.md`, `docs/11-voz-y-frases.md`, `docs/08-movimiento.md`, `docs/prompts/presentaciones-por-pasos.md` (reglas de presentaciones que se mantienen) y `referencias/crear-producto/LEEME.md` (abre el lienzo).

Código de hoy: `app/(dashboard)/catalogo/nuevo/page.tsx` → `components/catalogo/hoja-producto.tsx` (formulario único para crear y editar), `ficha-medios.tsx` (fotos y retoque), `ficha-presentaciones.tsx` + `flujo-presentaciones.tsx`, `ficha-detalles.tsx`, `ficha-tecnica.tsx`, `stock-producto.tsx`, `selector-catalogo.tsx`, `bienvenida-retoque.tsx`. Otra sesión de Coding trabaja en el catálogo del comprador (`components/tienda/`, `app/tienda/catalogo.css`): no toques esos archivos salvo para **reutilizar** el `Reel` en la vista previa, sin cambiar su comportamiento.

## 1. Alcance y dos entregas

- **Solo crear.** `/catalogo/nuevo` usa el flujo nuevo. **Editar** (`/catalogo/[id]/editar`) sigue con la hoja actual; no la borres. Lo que se comparte (guardar, validar, medios, presentaciones) se extrae a funciones o hooks que usen las dos, sin duplicar la lógica de guardado.
- **Mismos datos y contratos:** mismas funciones de la capa de datos, permisos del grupo `catalogo`, «Ver como» bloquea, límites del plan (`bloqueaVisible`/catálogo lleno), retoque Beta (`BienvenidaRetoque`, fotos marcadas), `VIDEO_PERMITIDO = false`. Sin migraciones ni Supabase.
- **PR 1 (este primero): el flujo con una presentación**, incluido «por encargo», catálogo, opcionales, publicar y celebración. El chip «Tiene tallas o colores» en el paso de precio abre, **de momento**, el flujo de presentaciones actual (`flujo-presentaciones.tsx`) y al volver continúa la historia.
- **PR 2 (después de fusionado el 1): varias presentaciones dentro de la historia**, sección 4. Misma sesión, rama nueva desde main.

## 2. La historia (PR 1)

Una hoja `grande` a pantalla completa, fondo `fondo`. Arriba, **barras tipo historia** (una por momento: llenas los hechos, `accion`; el resto `borde-pastilla`) y la ✕ (con `protegerAtras` y aviso al salir si hay cambios sin guardar, como hoy). **Una pregunta por pantalla**: título grande (`titulo-hoja`, Fredoka), una línea de ayuda, el control y abajo, fijo, «Atrás» (circular, secundario) + «Seguir» (principal). «Atrás» no pierde nada.

**Tarjeta «así se verá»** arriba en los pasos 2 a 4: la foto de portada a lo ancho, con radio `radio-l`, y encima, con el velo del catálogo, el nombre y el precio que se van llenando **mientras la persona responde** (eso es lo que hace el proceso disfrutable: cada respuesta se ve). La nota «así se verá» en Caveat (es la única Caveat de esa pantalla).

1. **Empieza por la foto.** Sin foto, la tarjeta es un marco punteado con el icono de cámara. Dos botones: «Tomar foto» (principal, abre la cámara) y «Elegir de la galería» (secundario). Usa la lógica de `ficha-medios.tsx` (máximo `MAX_MEDIOS`, la primera es la portada, reordenar, quitar, **marcar para retoque**). Con fotos, se ve la tira de miniaturas y «Seguir». Permitir seguir sin foto: decide y explica (recomendación: se puede, con una línea «Sin foto se vende menos. Puedes agregarla luego.»).
2. **¿Cómo se llama?** Campo grande con el foco puesto en el mismo toque que llega al paso (reglas de teclado de `HANDOFF.md`; hoja `grande`). El nombre aparece en la tarjeta mientras escribe.
   - **Si la tienda tiene varios catálogos**, este paso incluye debajo «¿En qué catálogo va?» con pastillas (preseleccionado el catálogo abierto), o un paso propio si no cabe bien; tú decides y lo dices.
3. **¿Cuánto cuesta?** Campo de precio grande (`RD$` dentro, como hoy). Debajo, el chip «Tiene tallas o colores» (ver sección 1).
4. **¿Cuántos tienes ahora?** Contador grande − N + (botones de 56 px) y la línea «Al despachar, baja solito.». Debajo, el chip **«Es por encargo, no llevo stock»**: si se elige, el paso cambia a **«¿Cuándo llega?»** con opciones rápidas («3 a 5 días», «1 a 2 semanas», «1 mes», «Otro» abre el campo actual de hasta 40 letras) y no pide stock. (En productos de tipo servicio, sin stock ni encargo: omite el paso como hoy.)
5. **Así se ve en tu catálogo.** El **reel real del comprador** (`components/tienda/reel.tsx` con su CSS y el tema de la tienda, como ya hace «Cómo se ve»), alimentado con el borrador, de unos 440 px de alto. Debajo, «Hazlo brillar · opcional» con pastillas: **Descripción**, **Colección**, **Ficha técnica** y, si el rubro tiene **Detalles** (perfumes, etc.), «Detalles». Cada una abre su hoja de hoy y, al cerrarla, la pastilla muestra que está hecha. Abajo: **«Publicar»** (botón `resalte`: es la llamada emocional de esta pantalla, regla 2 del sistema de diseño) y «Guardar sin publicar» (terciario; guarda oculto). Con el catálogo lleno, «Publicar» se apaga con la línea de hoy («Tu catálogo está lleno…») y se guarda oculto.
6. **Celebración.** «¡Ya está en tu catálogo!» en Caveat grande (`mano-celebracion`), la foto con una ligera inclinación y unas pocas formas de color de marca quietas; una línea como «Hoodie ya se puede deslizar.» y, si la tienda tiene menos de 5 productos, «Van N de 5 para arrancar.» (conecta con la guía de Inicio). Botones: «Agregar otro» (principal, reinicia la historia) y «Compartir mi catálogo» (secundario; si el catálogo aún no está publicado, abre la hoja de publicar actual). Sin animación de confeti; si animas la entrada, solo `transform`/`opacity` y nada con movimiento reducido.

El texto, en la voz de `docs/11` (sin exclamaciones salvo la celebración en Caveat). Accesibilidad: cada pantalla con su título como encabezado, foco al título o al campo al cambiar de paso, `aria-valuenow` en las barras, botones ≥ 44 px.

## 3. Movimiento y teclado

Cambio de paso **instantáneo** o solo `transform`/`opacity` con los tokens; nada de animar alturas; nada con movimiento reducido. Pasos con campo (nombre, precio, cuándo llega, catálogo nuevo) cumplen las reglas de teclado de iPhone: añade los campos a `scripts/probar-teclado.mjs`.

## 4. Varias presentaciones dentro de la historia (PR 2)

Sigue la referencia `historia-presentaciones.dc.html`, con las reglas vigentes de presentaciones (máx. 2 cosas, 12 valores, 144 presentaciones; `opciones_validas`, `guardar_variantes`; reparto de stock; «Agotada» solo en publicados):
1. **¿En qué cambia?** Pastillas grandes: lo típico del rubro (`OPCIONES_TIPICAS`) y Color, Tamaño, Talla, Material…, «+ Otra». Hasta 2, con el mensaje de máximo de hoy.
2. **Una pantalla por cosa elegida** («¿Qué tallas hay?», «¿Y qué colores?»…) con sus valores sugeridos, atajos («XS a XL», «Única», «36 a 42») y «+ Otro…». En Color, debajo, «Foto de cada color · opcional» (lo de hoy).
3. **¿Cuántos tienes de cada una?** Lista agrupada por la primera cosa (plegable con muchas filas), − / + por fila, «Poner a todas», arriba «Mismo precio · RD$…». Tocar una fila abre su detalle actual (precio propio, foto, ocultar). Botón «Listo · M en total». Con «por encargo», sin stock (cuándo llega).
4. La tarjeta «así se verá» muestra «Desde RD$…», las tallas y los puntos de color a medida que se eligen; en el paso 5 el reel muestra «Ver presentaciones».

## 5. Documentación, novedades y pruebas

- `docs/04-pantallas.md`: sección nueva «Crear producto (historia)» que sustituye, solo para crear, la descripción del formulario; marca la anterior como vigente solo para editar.
- `lib/novedades.ts`: una entrada por PR (versión siguiente a la más alta de main).
- Pruebas: tipos, lint, `npm test`, build; un script nuevo `scripts/probar-crear-producto.mjs` (Demo, 360/390/430 px): crear con foto y sin foto, con varios catálogos, por encargo, servicio, catálogo lleno, «Guardar sin publicar», celebración y «Agregar otro», salir con cambios (aviso), «Atrás» sin perder datos; y en el PR 2 los escenarios de presentaciones de `docs/qa/presentaciones-escenarios.md` que apliquen. Más `probar:teclado`, `probar:presentaciones`, `probar:hoja-producto` (editar sigue igual) y `probar-producto`.
- Capturas de cada momento en `docs/capturas/crear-producto/`. Handoff en `docs/handoffs/crear-producto-historia.md`.

## 6. Entrega

PR contra `main`, sin fusionar tú. **Planning revisa el código y fusiona** cuando «Revisión» esté en verde; Lewis prueba en producción. Un push por ronda. **Avisa a Planning (`send_message` a `@parent`) siempre que termines, quedes bloqueado o tu sesión vaya a agotarse**, con PR, HEAD, «Revisión», pruebas hechas y no hechas, decisiones fuera del encargo y pendientes (regla permanente).

## 7. Pendiente para una ronda siguiente (Lewis, 11 oct 2026): retoque desde el paso de fotos

Después de los dos PR, en el paso 1 (fotos): al cargar fotos aparece **debajo una tarjeta** «¿Quieres que Deslizapp retoque estas fotos?» (con la etiqueta Beta existente), con dos respuestas claras («Sí, retocarlas» / «Así están bien»), el costo en créditos y los créditos disponibles, y el aviso de Mi marca si falta (el retoque exige logo, Instagram y al menos 3 fotos de referencia; si no hay marca, se ofrece el paquete «Marca y diseño», ver `docs/14-precios-y-lanzamiento.md`). «Sí» marca todas las fotos para retoque con la lógica actual (`lib/retoque-al-subir.ts`, `BienvenidaRetoque`). Falta diseñarla en el lienzo antes del encargo. Mientras tanto, la marca por foto sigue funcionando como hoy.
