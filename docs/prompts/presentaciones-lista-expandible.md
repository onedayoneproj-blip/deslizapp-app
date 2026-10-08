# Presentaciones: la lista de «cosas que cambian» que se expande (rama `feat/presentaciones-lista-expandible`)

> **Modelo:** en Claude Code, Sonnet 5.5; en Codex, el modelo principal con razonamiento medio. **Sin migraciones.** Solo el formulario del panel. Cuando todo pase y se vea como `referencias/presentaciones-que-cambia/` (pantallas 5 y 6), **fusiona (squash) a `main`**. Déjalo abierto solo si algo falla o decides algo que no estaba aquí.

## 0. Antes de empezar

Lee `docs/00-contexto-del-proyecto.md`, `AGENTS.md`, `HANDOFF.md` (teclado, permisos, movimiento), `docs/09-sistema-de-diseno.md` (incluida la sección «Cosa elegible»), `docs/11-voz-y-frases.md`, `docs/prompts/presentaciones-que-cambia.md` (#70: de ahí sale todo esto) y **`referencias/presentaciones-que-cambia/LEEME.md`** con los dibujos `5-lista-una-abierta` y `6-lista-dos-elegidas` (el `7-…` es una variante con scroll de lado que **se descartó**). Tu puesto es **Coding**. No copies el HTML de las referencias.

Mira: `HojaElegir` y `EjeBorrador` en `components/catalogo/ficha-presentaciones.tsx`, `components/ui/cosa-elegible.tsx`, `lib/presentaciones.ts` (`MAX_EJES = 2`, valores sugeridos, `errorDeEjes`) y `components/ui/editor-etiquetas.tsx`.

## 1. Qué cambia respecto a #70 (Lewis, 8 oct 2026)

Hoy (#70) arriba hay una cuadrícula de rectángulos para elegir las cosas que cambian y, **más abajo**, una tarjeta por cada una con sus valores. Lewis quiere **una sola lista**: cada cosa que cambia es una tarjeta, y **al tocarla se expande ahí mismo** con sus valores. Lo demás de #70 no cambia (las palabras en pantalla, el máximo de 2, las listas de valores sugeridos, el botón «Crear las N», el modo «Qué varía», los límites de la base).

## 2. El diseño

Una lista vertical (`gap` de 8) de **tarjetas blancas de bordes redondeados** (la misma `Tarjeta` de la app: borde suave, radio grande), una por cada cosa del catálogo de #70 («Lo típico en {tipo}» y «Otras», con esos dos rótulos si los conservas) y al final «+ Otra cosa». **No hay recuadro verde en el nombre**: el nombre es texto en negrita (18 px).

- **Sin elegir:** la tarjeta con el nombre a la izquierda y, a la derecha, un **botón circular arena con «+»**. Tocar cualquier parte de la tarjeta la elige y la expande.
- **Elegida y expandida:** el nombre con un **chevron hacia arriba** pegado al nombre (todo el nombre + chevron es el botón de colapsar; `aria-expanded`, 44 px de toque); a la **derecha arriba, el texto «Quitar»** (texto en tinta oscura, sin recuadro; `aria-label="Quitar Color"`); debajo, los **valores como pastillas redondas en filas** que se acomodan solas (el estilo de `Opcion`: borde suave y, elegida, menta con check) y al final «+ Otro color / tamaño…» punteado. **Sin scroll de lado.**
- **Elegida y colapsada:** el nombre con **chevron hacia abajo** y, debajo del nombre, un resumen en gris con los valores elegidos («Dorado, Plateado»; si no hay ninguno, «Elige cuáles tienes»); el «Quitar» sigue arriba a la derecha.
- **Máximo de 2:** las tarjetas sin elegir se **apagan** (40 %, no se pueden tocar) y «+ Otra cosa» se convierte, en el mismo lugar y con el mismo borde punteado, en el texto **«Ya elegiste 2: es el máximo.»** Sin contador, sin aviso, sin tostada.
- **«+ Otra cosa»:** al tocarla se vuelve una tarjeta con el campo **«¿Qué otra cosa cambia?»** («Ej: Material, Aroma, Estampado.») y «Listo»; ya con nombre, se comporta como cualquier otra (valores, chevron, «Quitar»). Hasta 2 propias dentro del máximo de 2.
- **Quitar:** quita la cosa y todos sus valores al instante, sin confirmar (se puede volver a elegir). En el modo «Qué varía» la alerta de «¿Quitar N presentaciones?» al guardar sigue igual.
- Al elegir una, **las demás tarjetas expandidas no se colapsan solas**; la persona decide. Pero al elegir la 2.ª se puede colapsar la 1.ª si hace falta espacio (decide y explícalo en el PR).
- El botón de abajo sigue siendo «Crear las N»; mientras falte una cosa o algún valor, deshabilitado. La cuenta de cuántas salen vive solo ahí.

## 3. Reglas

- Quita la cuadrícula de rectángulos de arriba y, con ella, `CosaElegible` si queda sin uso (o reaprovéchala como la fila de «sin elegir»; documenta en `docs/09` lo que quede).
- Componentes de `components/ui/`; textos mínimos y con la voz de `docs/11`; sin exclamaciones. Movimiento: expandir y colapsar **instantáneo** (nada de animar la altura; regla de `docs/08`).
- Teclado e iPhone (`HANDOFF.md`): el campo «¿Qué otra cosa cambia?» y los valores propios en una hoja `grande`; foco dentro del gesto; expandir una tarjeta no debe mover ni quitar el foco de un campo. Agrégalo a `scripts/probar-teclado.mjs`.
- Permisos (grupo `catalogo`) y el resto de la ficha, igual que hoy. No toques `guardar_variantes`, `opciones_validas` ni el catálogo del comprador.
- Novedad en `lib/novedades.ts` solo si cambia algo que la dueña note (versión siguiente a la de `main`).

## 4. Pruebas y cierre

- Unitarias de lo que sea lógica (qué tarjetas se apagan, el resumen de cada tarjeta, quitar, las propias).
- Navegador (demo y la Tienda de ensayo en el preview, 390 y 360): crear un producto con Color y Tamaño; una cosa propia («Aroma»); intentar una tercera (apagada, con el mensaje en su lugar); colapsar y expandir; «Quitar» y volver a elegir; editar un producto que ya tiene presentaciones desde «Qué varía»; un perfume (Tamaño con sus 30/50/100 ml). Capturas.
- Compara contra las pantallas 5 y 6 de `referencias/presentaciones-que-cambia/` y di en el PR en qué se diferencia.
- `tsc`, `npm test`, `npm run lint` (sin avisos nuevos), `npm run build`, `probar:presentaciones`, `probar:teclado` y las regresiones de producto y catálogo del cliente. Actualiza `docs/04-pantallas.md` y `docs/09`.
- Resume en español, corto: qué cambió, qué debe probar Lewis en el iPhone y las decisiones que tomaste. Di claro que Safari/iPhone no se pudo probar.
