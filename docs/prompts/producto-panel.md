# Catálogo conectado, parte 2: el producto en el panel (rama `feature/producto-panel`)

La parte 1 (PR #40) dejó la base y la capa de datos: `slug`, `medios`, `detalles` por rubro, `opciones` + `producto_variantes` con stock propio, `por_encargo`, avisos de llegada, y en `lib/data` las funciones `guardarVariantes`, `avisosDeProducto`, `marcarAvisado` (y las demás). Esta parte hace **las pantallas del panel** que usan eso. El catálogo público y el pedido del catálogo son las partes 3 y 4: no los toques.

Antes de empezar lee:
- `docs/12-catalogo-conectado.md` §1–§4, §8 y §9 (la especificación).
- `referencias/producto/LEEME.md` y abre los tableros `.dc.html` de esa carpeta: dicen qué va, dónde, con qué textos y tamaños. **No copies su HTML.**
- `docs/09-sistema-de-diseno.md` (en especial "Menos texto", §6 pastillas y opciones, §16.5 componentes) y `docs/11-voz-y-frases.md` para cualquier texto.
- `lib/rubros.ts` (los campos de cada rubro y las opciones típicas): el formulario sale de ahí, nada escrito a mano por rubro.

Usa los componentes de `components/ui/`. Si falta uno, créalo siguiendo la guía, expórtalo en `index.ts`, agrégalo a `/diseno` y descríbelo en docs/09. En esta parte seguramente hacen falta: **`Interruptor`** (hoy vive en `components/controles.tsx`: pásalo a `components/ui/` con la regla de docs/09 y deja el viejo como reexport), **`EditorEtiquetas`** (etiquetas con × y "+ Agregar", con sugerencias), **`TiraMedios`** y **`FilaVariante`**.

## 1. Almacén de fotos: abrirlo a video (una migración pequeña)

El bucket `productos` acepta hoy solo `image/jpeg`, `image/png`, `image/webp` hasta 5 MB. Migración `…_bucket_productos_video.sql`: agrega `video/mp4`, `video/webm` y `video/quicktime`, y sube `file_size_limit` a 15 MB. Aplícala y **renombra el archivo a la versión que Supabase le ponga** (`list_migrations`), como pide la regla nueva de AGENTS.md (si todavía no está, la de `docs/prompts/reconciliar-migraciones.md`). Las fotos siguen pasando por `reducirFoto` / `comprimirParaSubir`, así que no crecen.

## 2. Editar y crear producto (`components/catalogo/hoja-producto.tsx`)

Orden de arriba a abajo (tablero `Perfume`, y `Ropa` cuando hay opciones):

1. **Fotos y video** (`TiraMedios`): miniaturas cuadradas de 76 px, `radio-m`, en una fila que se desliza. La primera lleva la etiqueta "Portada"; un video lleva ▶ y su duración ("0:18"). Al final, la casilla punteada "Foto o video". Debajo, una línea: "Hasta 10. Mantén presionado para ordenar."
   - Tocar una miniatura abre una hoja chica: "Hacer portada", "Quitar" (peligro) y, en fotos, el retoque que existe hoy (con sus créditos, igual que ahora).
   - Mantener presionado y arrastrar ordena. Si en algún navegador el arrastre no funciona bien, la hoja chica suma "Mover a la izquierda / derecha".
   - Máximo 10 elementos y 2 videos (las reglas de la base). Al llegar al límite, la casilla "Foto o video" se apaga con su motivo en una línea.
2. **Video** (tablero `Video`):
   - Se acepta un video del teléfono. Si dura más de 30 s, una hoja deja elegir el tramo de 30 s (franja sobre miniaturas del video, como el tablero) antes de subir.
   - Se aligera **en el teléfono** antes de subir: 720p como máximo, apuntando a unos 8 MB, nunca más de 15 MB. Usa lo que el navegador permita (WebCodecs o `MediaRecorder` con `captureStream`). Si el navegador no puede recomprimir, se sube el original solo si ya cumple (≤ 30 s y ≤ 15 MB); si no, un aviso corto con la voz de la marca. Escribe en el PR qué camino tomaste y en qué navegadores lo probaste.
   - La portada del video es el primer cuadro del tramo, en JPG, subida junto al video (`medios[].portada`).
   - Mientras sube: la miniatura oscurecida con un anillo de progreso y el porcentaje. Debajo, "Lo dejamos liviano para que cargue rápido."
3. **Nombre** y **Precio (RD$)**, como hoy.
4. **Opciones** (todas las tiendas; tablero `Ropa`):
   - Sin opciones: solo la fila "Agregar opción" (`FilaAgregar`).
   - Con opciones: `ListaAgrupada` con una fila por eje ("Talla" → "S · M · L · XL", con chevron) y al final "Agregar opción" (máximo 2 ejes; con 2, esa fila no aparece).
   - **Hoja "Agregar opción"** (tablero `AgregarOpcion`): "¿Qué elige el cliente?" con las opciones típicas del rubro (`OPCIONES_TIPICAS`) más "Otra" (que pide el nombre); "Valores" con `EditorEtiquetas` (1 a 12, sin repetir); atajos cuando apliquen ("XS a XL", "36 a 42", "Única" para talla; ninguno si no aplica); y una nota en `superficie-hundida`: "Con Color (2) quedan 8 combinaciones, cada una con su stock." El botón dice "Agregar". Al editar un eje existente, la misma hoja con "Guardar" y, abajo, "Quitar opción" (terciario peligro, con confirmación).
5. **Stock**:
   - Sin opciones: el control de hoy (`ControlInventario`), sin cambios.
   - Con opciones: título "Stock" con "N en total" a la derecha, y una `ListaAgrupada` con una `FilaVariante` por combinación: (si un eje es Color, un círculo con el color cuando el nombre sea uno conocido; si no, nada) + "S · Arena" + debajo "Queda 1" o "Agotado" en `atencion-texto` cuando aplique + `Cantidad` (− número +; el − se apaga en 0). Se ven las primeras 5 y "Ver las 8".
   - Los cambios de stock por variante se guardan como hoy los del producto: con motivo, por `guardarVariantes` y quedan en el historial de ajustes.
6. **Detalles** (todas las tiendas; tablero `Perfume`): título "Detalles" con "Opcionales" a la derecha, y una `ListaAgrupada` con una fila por campo de `CAMPOS_POR_RUBRO[rubro]`, más "Descripción" primero. Cada fila: nombre a la izquierda, el valor resumido a la derecha (una línea, con "…"), chevron. Sin valor: "Agregar" en `atencion-texto`.
   - En perfumes, `tamano_ml` + `concentracion` van en una sola fila "Tamaño" ("100 ml · EDP"), y `notas_salida` + `notas_corazon` + `notas_fondo` en una sola fila "Notas" que abre el editor del tablero `Notas`.
   - Cada fila abre una hoja según el tipo: texto → `Campo` (o `CampoMultilinea` para Descripción, hasta 600, con contador); número → `Campo` numérico; elegir → `GrupoOpciones`; lista → `EditorEtiquetas` (en "Ideal para", las `OCASIONES_PERFUME` como opciones para tocar, no texto libre).
   - **Notas** (tablero `Notas`): tres grupos (Salida, Corazón, Fondo) con `EditorEtiquetas`; ayuda de una línea "Escribe y toca Enter. Las que más se sienten, primero."; sugerencias con las notas que la tienda ya usó en otros productos. Botón "Listo".
   - La validación es la de `detallesValidos` (y la base la repite): el mensaje de error va en el campo.
7. **Colección y visibilidad** (`ListaAgrupada`, como hoy) + una fila **"Por encargo"**: título y subtítulo "Se puede pedir aunque no haya.", `Interruptor` a la derecha. Encendido, debajo un `Campo` con el texto del tiempo ("Llega en 7 a 10 días", hasta 40). Solo para `tipo = 'producto'`.
8. **Guardar**, como hoy.

Producto nuevo (`/catalogo/nuevo`): el mismo formulario. El `slug` lo pone la base; no se muestra.

## 3. Inventario y Por reponer (tablero `Inventario`)

- En la lista de inventario y en "Por reponer", un producto con variantes muestra en la segunda línea la situación de sus variantes, corta: "**50 ml agotado** · queda 1 de 100 ml", "**L · Arena agotada** · 11 en total" (lo agotado en `atencion-texto` y negrita). Más de dos agotadas: "**3 agotadas** · 8 en total".
- La dona de inventario cuenta un producto con variantes como **Agotado** si todas están en 0 y como **Queda 1 o 2** si alguna tiene 1 o 2 (docs/12 §2).
- Si un producto tiene avisos pendientes (`avisosDeProducto`), lleva una `Etiqueta` rosa "N esperan".
- **Reponer**: reponer un producto con variantes pide la variante (las que tienen 0 primero). Cuando lo repuesto tiene avisos pendientes, al terminar aparece la tarjeta **"Ya llegó"** (Caveat) con "Repusiste Mayar 50 ml. 2 personas lo esperan." y una fila por persona (avatar con iniciales, o un ícono de persona si no dio nombre; nombre o "Sin nombre"; teléfono formateado) con el botón secundario compacto "Avisar" (ícono de WhatsApp).
  - "Avisar" abre WhatsApp con el mensaje (voz de docs/11): "¡Hola {nombre}! Ya llegó {producto}{ · variante}. Aquí lo tienes antes de que se vaya: {url_catalogo}#p/{slug}". Sin nombre, empieza en "¡Hola!".
  - Al volver, esa fila pasa a "Avisado" (etiqueta en `accion-suave` con check) y se llama `marcarAvisado`.
  - La tarjeta también se puede abrir desde la etiqueta "N esperan" del producto.

## 4. Pedidos: elegir la variante

La base ya no acepta un producto con variantes sin la variante. Así que:
- En **+ Pedido** (`components/pedidos/selector-producto.tsx`), al elegir un producto con variantes aparece la elección de cada eje (`GrupoOpciones` o pastillas de opción de formulario, docs/09 §6), con las agotadas apagadas y "Agotado" en su lugar. El precio es el de la variante.
- Las líneas del pedido (tarjeta, detalle, editar, recibo PNG/PDF y mensajes) muestran `variante_texto` debajo del nombre ("Talla M · Negro"), y "Por encargo" como `Etiqueta` cuando aplica.
- Despachar sin stock de una variante muestra el error de la base con el nombre de la variante, con el tono de la marca.
- **Venta pasada** y **Editar pedido**: lo mismo.

## 5. Modo demo

Todo funciona igual en la demo (la tienda Lino & Algodón con la camisa de lino sirve para probar variantes; los perfumes de Esencias Michel para Detalles y Notas). El video en la demo se guarda como URL local del navegador (no sube a ningún lado).

## 6. Comprobación

- `npm run lint`, `npm run build`, `npm test` y todos los `probar:*`.
- Script nuevo `scripts/probar-producto.mjs` (en la demo, a 360, 390 y 430, claro y oscuro):
  1. Editar un perfume: llenar Marca, Tamaño, Ideal para y Notas; guardar; volver a abrir y que estén.
  2. Ropa: agregar Talla (XS a XL con el atajo) y Color (2); salen 10 combinaciones; poner stock a tres; el total suma; quitar un color y que queden 5.
  3. Medios: subir 2 fotos y 1 video corto (genera uno de prueba en el script), cambiar la portada, ordenar, quitar; el tercer video no se deja.
  4. Por encargo: encender, escribir el tiempo, guardar.
  5. + Pedido con la camisa: obliga a elegir talla y color; el agotado está apagado; el pedido muestra "Talla M · Negro"; despachar baja esa variante.
  6. Reponer una variante con avisos: aparece "Ya llegó", "Avisar" arma el enlace de WhatsApp con el mensaje y el link `#p/{slug}`, y la fila pasa a "Avisado".
- Prueba en un teléfono real o en la vista de iPhone de Safari el arrastre de la tira y la subida de video, y dilo en el PR.
- Abre la app real (Supabase) con un producto de prueba (créalo oculto y bórralo al final, o usa uno de una tienda de prueba) y guarda detalles y una opción, para confirmar que la base acepta lo que manda la pantalla.
- Capturas en `docs/capturas/producto-panel/` (formulario perfume, formulario ropa, agregar opción, notas, video subiendo, inventario con "Ya llegó", + Pedido con variante).

## 7. Cierre

PR contra `main` con lo que cambió, el resultado del script, cómo quedó el video (camino y navegadores), la versión de la migración del bucket y las capturas. Si todo pasa, haz el merge tú mismo (squash) y borra la rama. Si algo falla, o decidiste algo que no está aquí, deja el PR abierto y explícalo.
