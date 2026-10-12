# Handoff — Crear producto (historia)

PR [#114](https://github.com/onedayoneproj-blip/deslizapp-app/pull/114), rama `codex/crear-producto-historia`, contra `main`, **en borrador y sin fusionar**. Se partió de main; no se copió la rama de PR #112. Rige `docs/prompts/crear-producto-codex.md`, con las precisiones posteriores de Lewis y Planning.

## Alcance construido

- Los dos lienzos funcionan dentro de `/catalogo/nuevo`: foto → nombre → precio → stock/encargo → revisión → celebración; «Tiene tallas o colores» integra atributos (máximo dos), valores, fotos opcionales de color, cantidades y revisión. Una sola barra de avance y pie fijo dentro de los márgenes.
- Las preguntas arrancan a **100 px**, como pidió Planning: tarjeta simple 350×372; tarjeta de atributos/valores 350×212. Textos y campos ajustados al lienzo; sin etiquetas visibles redundantes. El catálogo se elige en la cabecera y recuerda el último usado por tienda.
- Fotos múltiples conservan editor de producción: foto redondeada, contador activo/total, miniaturas con Portada, Agregar foto, selección de miniatura, quitar y reordenar. El contador de fotos se mantiene; no vuelve el progreso global de productos.
- Cantidades sigue la última captura de Lewis: sin tarjeta de foto; resumen con chips, número de presentaciones y total, Cambiar qué cambia; interruptor Cada una tiene su precio y explicación; Poner a todas siempre visible con −/cantidad/+; grupos plegables con punto de color, nombre y subtotal y filas amplias. Los botones inferiores siguen siendo los de la historia, dentro de los márgenes. Se evita un segundo scroll dentro de la lista.
- Precio por fila reutiliza `PrecioFila` del editor existente; apagar precios propios confirma y unifica solo al aceptar. El detalle conserva la hoja existente para precio propio, foto y ocultar. Cambiar ejes conserva la lógica de reparto y confirma pérdidas; el atributo personalizado permanece al volver a las preguntas.
- Reutiliza `cambiarEjes`, `opciones_validas`, `guardar_variantes` y el guardado único de `hoja-producto.tsx`. Máximo 12 valores por atributo y 144 variantes, agrupación por el primer atributo (Color primero cuando corresponde), suma por grupo y Poner a todas. `/catalogo/[id]/editar` mantiene su hoja y recorrido actuales.
- Encargo guarda stock cero, incluidas variantes, y plazo de entrega; Otro vacío no permite avanzar ni guarda el marcador interno. Se conserva el plazo propio al alternar encargo. El alta no muestra Agotada; stock cero sin encargo bloquea la revisión. Se permite guardar/publicar sin foto, respetando la visibilidad y límites existentes. Compartir en celebración requiere catálogo publicado.
- Sin nuevas dependencias, migraciones ni cambios a Supabase. Se incorporó main (cc9e1d9) a esta rama para resolver el conflicto de novedades que impedía ejecutar Revisión, conservando los cambios publicados de catálogo/perfil. Novedades 0.68.0 actualizadas en cuatro líneas.

## B5: producto real y tamaño efectivo

B5 usa el componente comprador `Reel`, con tema de tienda, foto, nombre, precio y controles superpuestos. Solo esta tarjeta envía `encuadre: producto`; la vista general del catálogo y la edición conservan su encuadre. Los cambios en `components/tienda/vista-previa-reel.tsx` y `app/tienda/catalogo.css` son los necesarios para retirar cabecera, márgenes y escalado interno de la página en esta modalidad, con CSS limitado a `data-encuadre-producto`.

El prototipo pedía renderizar a 390×488 y escalar a 350×440, dos relaciones ligeramente diferentes (488×350/390 = 437.95). La precisión posterior pide llenar el marco con el producto. Se usa **390×490.286 y una escala uniforme 350/390**, conservando proporciones y obteniendo **350×440**. Medición real del carrusel: 390×490.281 CSS px; resultado efectivo 350×439.996 dentro del marco 350×440 (redondeo del navegador). Posición interior x=0/y=0; sin cabecera. Se comprueban nombre, precio y controles dentro del producto, además del iframe. A 360 px, el ancho útil es 320 y el alto proporcional 402.28; a 390 y 393 se limita a 350×440.

Se conservan «así se ve en tu catálogo», Hazlo brillar · opcional, pastillas de Descripción/Colección/Ficha técnica y Detalles cuando corresponde, con sus hojas. Publicar naranja ocupa el ancho útil; Guardar sin publicar queda debajo. No hay filas plegables sustitutivas ni botón redundante para abrir el reel.

## Lienzo vs construido

Medidas CSS tomadas con Playwright después de la entrada de la hoja; top/alto en px. El top 100 de la última revisión sustituye el 104 del HTML original. En 393 px las tarjetas se limitan a 350 de ancho; márgenes útiles mínimos 20. Las pantallas cortas desplazan contenido y conservan el pie sólido.

| Paso / elemento | Lienzo o precisión vigente | 390×844 | 393×852 |
|---|---|---|---|
| B1 foto | Tarjeta fija 350×372, top 100 | 100/372; título 488/29 | 100/372; título 488/29 |
| B2 nombre | Misma tarjeta; pregunta y campo debajo | tarjeta 100/372; título 488/29; campo 554/56 | Igual |
| B3 precio | Misma tarjeta; campo alto | tarjeta 100/372; título 488/29; campo 552/64 | Igual |
| B4 stock | Misma tarjeta; contador | tarjeta 100/372; título 488/29; contador 560/56 | Igual |
| B5 / V6 revisión | Reel real 350×440 llenando marco | rótulo+marco 100/472; reel 132/440 | Igual |
| Publicar | Naranja de margen a margen | 732/52, ancho 350 | 740/52, ancho 353 |
| V1 atributos | Tarjeta 350×212; hasta dos | tarjeta 100/212; título 328/29 | Igual |
| V2 tallas | Misma tarjeta y pregunta; opciones | tarjeta 100/212; título 328/29; campo solo con Otro | Igual |
| V3 colores | Misma tarjeta; fotos opcionales | tarjeta 100/212; título 328/29; fotos por color | Igual |
| V4 cantidades | Nueva referencia sin foto | título 100/29; resumen, switch, Poner a todas y grupos | Igual |
| V5 detalle | Hoja inferior existente | Precio propio/foto/ocultar; datos conservados | Igual |
| Barra de avance | Una sola barra, 3 px | 74/3 | 74/3 |
| Pie de preguntas / variantes | Atrás + Seguir/Listo | 776/56 | 784/56 |

Capturas de todos los momentos B1–B6 y V1–V6, fotos múltiples, precio con teclado 360×640 y catálogo lleno en [índice de capturas](../capturas/crear-producto-codex/README.md). Comparativas: lienzo/HEAD revisado 3bcd309/construcción para B5 y preguntas; HEAD/construcción para fotos y cantidades. La captura de cantidades adjunta en la conversación se reproduce con Dorado/Plateado × Pequeño/Mediano; no se presenta una imagen reconstruida como el original de Lewis.

## Verificación completada

Los recorridos de navegador usan Demo local y el build de producción servido a 3100, sin escribir datos reales ni simular el guardado. Chromium ya instalado; sin instalar navegadores. Ejemplo: `CHROMIUM_PATH=/usr/bin/chromium URL=http://localhost:3100 npm run probar:presentaciones`.

| Comprobación | Resultado |
|---|---|
| `npm test` | 77/77; cero fallos, omitidos o cancelados |
| `npm run tipos` | Pasa; el build también completa TypeScript |
| `npm run lint` | 0 errores; 35 avisos existentes tras incorporar main (33 antes de actualizar la base) |
| `npx next build --webpack` | Completo, exit 0 |
| `scripts/probar-crear-producto.mjs` | Completo: 360/390/393/430; geometría, tamaño real B5, fotos y contador, pastillas/hojas, reparto/sumas, precios propios con confirmar/cancelar, detalle, stock cero/plazo, Otro vacío bloqueado, sin foto, aviso de salida y guardado |
| `npm run probar:producto` | **Completa sin filtros**: 42 combinaciones (7 escenarios × 3 anchos × 2 temas); ropa, medios, perfume, encargo y pedidos; verificaciones del guardado conservadas |
| `npm run probar:presentaciones` | **Completa sin filtros**, 390 y 360; creación y edición; conservación/reparto, ejes propios, precios, fotos, ocultar, pedidos, 12 valores/144 variantes, vista previa |
| `npm run probar:hoja-producto` | Completa en 390 y 360: alta integrada y regresiones del editor |
| `npm run probar:teclado` | Completa: historia, ejes/valores propios, precio de variante y hojas opcionales, foco y teclado simulado |
| Catálogo lleno | Completo en 360/390/393/430: Publicar bloqueado, aviso íntegro encima del botón dentro del pie, guardar oculto conserva stock y no supera el plan |

Tras incorporar main se repitieron build Webpack, tipos (incluidos en build), lint, npm test y la historia completa; se regeneraron las capturas con el Reel actual. Se adaptaron las suites completas al recorrido real mediante `scripts/recorrido-historia-producto.mjs`; se conservaron sus verificaciones de datos y regresiones de edición. Se cancela `/api/version` en los tests para evitar una notificación de versión ajena al caso. Los antiguos fallos por buscar el formulario de alta anterior están resueltos. `scripts/capturar-comparativas-crear-producto.mjs` regenera las comparativas contra 3bcd309.

## Chromium y límites reales

- `/usr/bin/chromium`, 154.0.8037.57. Su arranque en sandbox falla por recursos de Crashpad/bind (`setsockopt: Operation not permitted`, SIGTRAP). Con ejecución ampliada y `--no-sandbox` abre y completa las suites. No se ejecutó `playwright install`.
- `npm run build` (Turbopack) se volvió a intentar: exit 1, no completado. Falla al crear el proceso auxiliar de CSS/PostCSS y abrir su puerto: `Operation not permitted`. No se declara aprobado; `npx next build --webpack` sí completa.
- Safari/iPhone físico y login Google de Vercel preview no se verificaron en esta corrida; teclado comprobado por simulación en Chromium. Estas capturas son Demo local, no una prueba del OAuth de preview.
- No se completó un caso de creación de servicio; la historia mantiene el tipo actual y no incorpora un selector nuevo. Planning y Lewis deben revisar las capturas y el alcance antes de cualquier fusión.

## Revisión de GitHub

El resultado y enlace de «Revisión» del commit entregado se registran en la descripción del PR #114. PR permanece en borrador contra main y sin fusionar.

## Corrección B5 — barra separada de Atrás y cerrar

La barra única de B5 conserva top 74/alto 3 y ahora ocupa el espacio entre los botones, con 8 px libres a cada lado. Se ajustan solo sus márgenes horizontales en la revisión (producto simple y presentaciones); el contenido conserva top 100 y el Reel top 131.5 CSS px (132 redondeado en la tabla anterior), con el mismo tamaño. No cambia la posición de Publicar.

`CHROMIUM_PATH=/usr/bin/chromium URL=http://localhost:3100 node scripts/probar-b5-barra.mjs` completó los cuatro anchos; verifica barra única, separación mínima, posición y tamaño del contenido/Reel y posición/ancho de Publicar. Build Webpack completo con tipos y lint de los archivos afectados sin errores ni avisos. Esta corrección no repite las suites funcionales completas de la entrega anterior.

| Viewport | Barra x/ancho | Separación Atrás/cerrar | Contenido top | Reel top/tamaño | Publicar top |
|---|---|---|---|---|---|
| 360×640 | 72/216 | 8/8 | 100 | 131.5; 320×402.281 | 528 |
| 390×844 | 72/246 | 8/8 | 100 | 131.5; 350×440 | 732 |
| 393×852 | 72/249 | 8/8 | 100 | 131.5; 350×440 | 740 |
| 430×844 | 72/286 | 8/8 | 100 | 131.5; 350×440 | 732 |

Captura corregida: [B5 a 390 px](../capturas/crear-producto-codex/b5-barra-separada-390.png). También se entregan 360/393/430 en el índice de capturas. El PR #114 continúa en borrador y sin fusionar.
