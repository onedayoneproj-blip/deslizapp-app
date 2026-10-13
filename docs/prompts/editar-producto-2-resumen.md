# Editar producto · PR 2: la hoja resumen con las pantallas de la historia

Encargo de Planning, 13 oct 2026. Tu puesto es **Coding**.

**Modelo:** Claude Code **Opus** (aprobado por Lewis el 13 oct: es grande y toca stock y presentaciones de tiendas reales) · en Codex, el más alto con razonamiento alto.

**Dependencia:** empieza **solo cuando el PR 1 (`docs/prompts/editar-producto-1-pasos-compartidos.md`) esté fusionado en `main`**. Compruébalo en GitHub y parte de `main` actualizado. Si no está, avisa a Planning y espera.

## Qué y por qué
Hoy editar (`/catalogo/[id]/editar` → `HojaProducto` en `components/catalogo/hoja-producto.tsx`) es el formulario largo de antes, y crear ya es la historia. Lewis aprobó la **opción A**: editar con el mismo lenguaje que crear, pero como **resumen**, porque quien edita casi siempre quiere cambiar una sola cosa. Referencia: `referencias/editar-producto/LEEME.md` y sus `.dc.html` (lienzo [Editar producto · rediseño](https://claude.ai/artifact/5YACSv8xB38s6BAjVUeH9d)). **Referencia visual: no copies su HTML**; construye con `components/ui/`, los tokens y las piezas que sacó el PR 1.

## La hoja de editar
- **Hoja `grande`** con la misma cabecera de la historia (`components/hoja.tsx`, rama `historia`) **sin barras**: ✕ a la izquierda, «Editar producto» (Fredoka 20, no se trunca) y el selector de catálogo a la derecha (como hoy en editar: con un solo catálogo no aparece). Agarradera, esquinas y borde superior como la historia.
- **Arriba:** «así se ve en tu catálogo» (Caveat, como en «Así se ve») y la tarjeta del producto con su portada, nombre, precio («Desde RD$…» con presentaciones), etiqueta «Visible» / «Oculto» y el contador de fotos. Elige con criterio entre `TarjetaAsiSeVera` y el reel reducido (`ReelEnVivo`). Que no se coma la pantalla: en 390×844 se tiene que ver al menos el primer grupo de filas sin desplazar.
- **Filas** (`ListaAgrupada` + `FilaLista`, con el valor actual a la derecha y chevron), en este orden:
  1. **Lo básico:** Fotos (miniaturas), Nombre, Precio.
  2. **Presentaciones y stock:** Presentaciones («Talla y color · 6», o «Agregar» si no tiene), Stock («N en total», o el control de hoy si no tiene presentaciones), Es por encargo (interruptor; encendido muestra «Llega en …»). Un **servicio** no lleva stock ni encargo, como hoy.
  3. **Hazlo brillar · opcional:** Descripción, Colección, Ficha técnica y, si el rubro los tiene, Detalles.
  4. **En tu catálogo:** Visible en el catálogo (interruptor con las reglas de hoy: catálogo lleno, sin foto → solo oculto), Lista de espera (si hay personas), Historial de ajustes.
  
  Al final, «Eliminar producto» (terciario de peligro) con la confirmación de hoy (`ConfirmacionEliminarProducto`). En el pie flotante (`PieFlotante`, `.hoja-borde-abajo`), **«Guardar cambios»** (`accion`), habilitado solo si hay cambios y es válido (`puedePublicar`, `useGuardarProducto().validar`).
- **Tocar una fila** abre **encima** una hoja con la pantalla de ese paso de la historia (piezas del PR 1): ✕ a la izquierda + título corto («Fotos», «Nombre», «Precio», «Stock»…), el contenido del paso con su tarjeta «así se verá» y un solo botón **«Listo»**. Ayuda con el valor anterior cuando sirva («Antes: RD$1,450.»). «Listo» aplica el cambio **al borrador** de la hoja de editar; nada se guarda en la base hasta «Guardar cambios». La ✕ de la hoja apilada descarta solo ese cambio (con el aviso «¿Salir sin guardar?» de #115 si se escribió algo).
- **Máximo dos hojas a la vez** (regla del inventario de cabeceras, `docs/handoffs/inventario-cabeceras-de-hoja.md`): Editar + una encima. Lo que hoy abre una tercera (Presentaciones → valores → foto de cada color; Inventario → detalle de una presentación; Historial; Lista de espera) va como **pantalla interna** de la hoja de encima, con «‹» y `alVolverInterno` (como el historial de hoy). La confirmación de eliminar y la `Alerta` no cuentan como hoja.

## También: la hoja «Ver producto» (añadido el 13 oct, aprobado por Lewis)
`HojaVistaProducto` (en el mismo `hoja-producto.tsx`; se abre al tocar un producto en Catálogo) pasa al mismo lenguaje. Referencia: `referencias/editar-producto/Vista-A.dc.html` y su sección en el `LEEME.md` de esa carpeta.
- Cabecera: ✕ a la izquierda, nombre del producto (elipsis) y **«Editar» como botón píldora** a la derecha (estilo iOS, mismo fondo que la ✕, ≥ 44 px). «Editar» pasa por el mismo `confirmarSalida` que el botón de hoy.
- Vista previa grande con **todas las fotos** (carrusel con las barras tipo historia del catálogo, deslizable) y, sobre un degradado, precio (con promo tachada, `precioConPromo`), «Agotado» y las presentaciones (colores como puntos, tallas como pastillas). Sin foto: el mismo vacío de hoy.
- «N personas lo esperan» solo si hay lista de espera (`espera.resumen`); abre la lista como pantalla interna, como hoy.
- Orden: **Visible en el catálogo** (mismas reglas: catálogo lleno, permisos) → **Stock plegable** (**siempre empieza cerrado**, sin recordar el último estado; abierto: − / + por presentación con hasta 3, uno solo sin presentaciones, y con más de 3 abrirlo lleva al Inventario; bajar pide motivo y guardar sigue `InventarioVistaPrevia` / `ConfirmacionInventario` de hoy) → **Historial de ajustes** en fila aparte.
- **Altura de la hoja ajustada al contenido** (`altura="auto"`, como hoy): sin espacio vacío debajo; al abrir el stock la hoja **crece** hasta lo que necesite y, si no cabe, hace scroll. El cambio de altura no se anima con `height` (regla de movimiento de `HANDOFF.md`): o es instantáneo o se hace con `transform`. Si la nota de «Otro» del motivo abre un campo de texto, ese paso va en una hoja o alerta `grande` aparte, como hoy (regla de teclado).
- Pie flotante: **«A tu historia»** (abre `HojaHistoria` de `components/catalogo/hoja-historia.tsx`, la misma de la tarjeta del Catálogo) y **«Crear pedido»**, mitad y mitad. Con stock sin guardar, «Guardar cambios» sigue siendo el único principal a la vista, como hoy.
- Máximo dos hojas: Ver producto → «Tu historia» o Editar (Editar sustituye a Ver producto, no se apila encima; como hoy navega a `/catalogo/[id]/editar`).
- Pruebas: añade a las de editar: cabecera y «Editar»; carrusel con varias fotos; espera visible solo con personas; stock plegable (cerrado al abrir la hoja siempre, abrir y la hoja crece sin espacio vacío, más de 3 → Inventario, bajar con motivo); «A tu historia» abre la hoja; sin permiso. Captura 390×844 en `docs/capturas/editar-producto/ver-producto/`.

## Lo propio de editar que no se puede perder
Lee `FormularioProducto` entero antes de empezar y conserva todos sus contratos. Como mínimo:
- **Stock con motivo:** subir es «reposición»; bajar pide motivo (Daño, Pérdida, Corrección de inventario, Otro, con nota en «Otro») y no cuenta como venta. En el diseño, el motivo se pide **dentro del Inventario o de la pantalla de stock** («Bajaste 2 en Blanco · M. ¿Qué pasó?»), no en un paso aparte al guardar; «Listo» no deja salir con una bajada sin motivo. Al guardar se usan las mismas llamadas de hoy (`ajustarStock` con motivo y nota, `inventario.pedirGuardar`, `HistorialInventario`). Si el stock cambió en otro dispositivo mientras editabas (`inventario.incierto`), el mismo comportamiento de hoy.
- **Presentaciones de un producto que ya tiene stock o ventas:** quitar o cambiar presentaciones con unidades pide motivo como hoy (`HojaMotivoVariantes`, `variantesParaGuardar`); las ocultas no cuentan unidades; `opciones_validas` y `guardar_variantes` igual.
- **Permisos:** sin permiso de catálogo, todo se ve y nada se cambia; tocar muestra el motivo (`porque`), como hoy.
- **Visible, plan y fotos:** catálogo lleno (`resumenDelPlan`), sin foto solo oculto, avisos de hoy.
- **Salir:** con cambios, el aviso de #115 («Quedarme» / «Descartar y salir»); `protegerAtras`; si se entró desde la vista del producto (`desdeVistaPrevia`), volver ahí; al eliminar, a `/catalogo`.
- **Medios:** retoque, portada, orden y las reglas de video de hoy, como `SeccionMedios`. Ficha técnica, colecciones (crear una nueva) y detalles por rubro, como hoy.
- Teclado e iPhone (`HANDOFF.md`): `focus()` dentro del toque (`flushSync`), hojas con campos `"grande"`, ningún efecto de `resize` que cambie estado. Agrega los campos nuevos a `scripts/probar-teclado.mjs`.

Al terminar, **borra el formulario viejo** (`FormularioProducto` y lo que quede sin uso, incluido el modo «Nuevo producto» de `HojaProducto`) y cualquier componente que ya nadie use. `HojaVistaProducto` (la vista de lectura) no cambia salvo que su fila «Stock» siga llevando a editar.

## Textos
Voz de `docs/01-marca.md` y `docs/11-voz-y-frases.md`. Los del lienzo son propuesta; si cambias alguno, dilo en el PR. Añade a `docs/11` los que queden.

## Documentación
- `docs/04-pantallas.md`: sustituye la sección «Formulario de producto (editar…)» por «Editar producto (resumen)»; marca la anterior como sustituida el 13 oct con referencia a este encargo.
- `docs/09-sistema-de-diseno.md`: la hoja resumen y la hoja de un paso con «Listo».
- `lib/novedades.ts`: entrada nueva de 2–3 líneas cortas.

## Pruebas
- `npm run tipos`, `npm run lint`, `npm test`, `npm run build`.
- Reescribe las pruebas que entran a editar para la hoja nueva, sin perder casos: `probar-hoja-producto`, `probar-producto`, `probar-presentaciones`, `probar-eliminar-producto`, `probar-ficha`, `probar-historial-interno` y las demás que la abran (búscalas con `grep -l editar scripts/`). Casos mínimos, en Demo, a 360/390/430: cambiar solo el precio (dos toques y «Guardar cambios»); subir y bajar stock con y sin presentaciones (motivo obligatorio al bajar; historial); quitar una presentación con unidades (motivo); por encargo; servicio; sin permiso; catálogo lleno; sin foto → solo oculto; ✕ con cambios (aviso) y atrás del teléfono; entrar desde la vista del producto y volver; eliminar con y sin historial; máximo dos hojas abiertas; movimiento reducido.
- `probar-crear-producto` completo sigue en verde (crear no cambia).
- `probar:teclado` con los campos nuevos.
- Capturas 390×844 en `docs/capturas/editar-producto/resumen/`: la hoja arriba y desplazada, precio, stock bajando con motivo, presentaciones, sin permiso.

## Entrega
PR contra `main` **sin fusionar**: cambia cómo se editan datos de tiendas reales, así que queda abierto con su preview y Lewis lo prueba en su iPhone (app instalada) antes del merge. Pide revisión de Codex («@codex review») tras tu último push y resuelve sus hallazgos.

Al terminar (o si quedas bloqueado, o te vas a quedar sin contexto), **avisa a Planning** (`send_message` a `@parent`, o a la sesión de Planning que te creó) con: estado, PR, HEAD, URL de la preview, resultado de «Revisión» y de Codex, pruebas hechas y no hechas (Safari real, PWA real), decisiones fuera del encargo y pendientes.
