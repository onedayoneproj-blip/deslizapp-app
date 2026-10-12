# Handoff — Crear producto (historia)

Rama `codex/crear-producto-historia`, PR #114 contra `main`, en borrador y sin fusionar. El encargo partió de `main`; no se tomó contenido de `feat/crear-producto-historia`.

## Hecho

- `/catalogo/nuevo` conserva la historia de producto simple y añade el segundo lienzo dentro de la misma hoja. «Tiene tallas o colores» abre preguntas integradas: atributos (máximo dos), valores por atributo, fotos opcionales de color, stock agrupado y revisión en el reel.
- El stock agrupa por Color cuando es uno de los atributos y pone tallas como filas. Se conservan los orígenes al cambiar de un stock simple, los avisos de reparto, «Ponerlas todas», los subtotales por grupo y el detalle existente para precio propio, foto y ocultar.
- Se reutilizan `cambiarEjes`, `opciones_validas`, `guardar_variantes` y la única ruta de guardado de `hoja-producto.tsx`. La edición continúa por `/catalogo/[id]/editar` y conserva `SeccionPresentaciones` / `FlujoPresentaciones`.
- La tarjeta de la historia muestra «Desde RD$…», tallas y puntos de color. El reel real conserva «Ver presentaciones»; una regla acotada a `data-vista-previa-reel` evita que el escalado a 350 px trunque el rótulo. Por encargo guarda stock cero y plazo; al crear no se muestra «Agotada».
- Capturas `b1–b6` y `v1–v6` en `docs/capturas/crear-producto-codex/`. Las seis capturas `v` son 390×844 y se generaron con una foto real de prueba. `scripts/probar-crear-producto.mjs` incluye 360, 390, 393 y 430 px y verifica dos atributos, fotos, reparto, detalle, guardado por encargo y producto sin foto.
- `docs/04-pantallas.md`, `lib/novedades.ts` (0.66.0) y este handoff están actualizados. Sin migraciones ni cambios a Supabase.

## Precisiones de Lewis: fotos y B5

- En fotos múltiples se conserva la imagen redondeada, contador activo/total arriba a la derecha, miniaturas con «Portada» y «Agregar foto». En el alta, tocar una miniatura cambia la imagen sin abrir la hoja; tocar la imagen grande conserva quitar y reordenar. El contador de fotos permanece independiente de la barra de avance y no reaparece «n/n productos».
- B5 muestra «así se ve en tu catálogo», reel real 350×440, pastillas «+ Descripción», «+ Colección», «+ Ficha técnica» y Detalles cuando corresponde. Cada pastilla abre su hoja sobre el borrador. Publicar naranja ocupa todo el ancho entre márgenes; Guardar sin publicar va debajo. Sin filas plegables ni botón redundante de reel en el alta.
- Los pies de ambas historias mantienen «Seguir» dentro de los márgenes, junto a «Atrás». La cabecera de B5 reúne atrás y catálogo junto al cierre, y mantiene la barra de avance. Así caben el reel y las pastillas a 390×844; en pantallas más cortas se desplaza el contenido. Las preguntas anteriores y la edición conservan su distribución.
- Capturas adicionales: `b1-fotos-multiples-390.png`, `b1-fotos-multiples-activa-390.png` y `b5-pastillas-390.png`.

## Lienzo vs construido

Playwright midió ambas historias con Chromium a 390×844 y 393×852. En la historia simple, la tarjeta de foto fija y las preguntas mantienen la misma geometría. En presentaciones, los cuatro pasos mantienen la misma geometría; los valores opcionales se muestran dentro del área de contenido.

| Historia simple | Lienzo | Construido 390×844 | Construido 393×852 |
|---|---|---|---|
| Tarjeta de foto/pregunta | 350×372; título debajo | top 160/alto 372; título top 548/alto 25 | top 160/alto 372; título top 548/alto 25 |
| Campo de nombre | Debajo de la pregunta | top 627/alto 56 | top 627/alto 56 |
| Campo de precio | Campo alto de historia | top 639/alto 64 | top 639/alto 64 |
| Control de stock | Contador centrado | top 621/alto 56 | top 621/alto 56 |
| Reel de revisión | Reel escalado dentro de la hoja | tarjeta top 104/alto 472; reel top 136/alto 440; botón top 732/alto 52 | tarjeta top 104/alto 472; reel top 136/alto 440; botón top 740/alto 52 |

La rama de presentaciones se midió con la tabla siguiente:

| Paso | Lienzo | Construido 390×844 | Construido 393×852 |
|---|---|---|---|
| ¿En qué cambia? | Tarjeta 350×212; título y pastillas debajo | tarjeta top 160/alto 212; título top 388/alto 25 | tarjeta top 160/alto 212; título top 388/alto 25 |
| Valores de Talla | Misma tarjeta; tallas y «+ Otro» | tarjeta top 160/212; título 388/25; sin campo hasta «+ Otro» | tarjeta top 160/212; título 388/25; sin campo hasta «+ Otro» |
| Valores de Color | Misma tarjeta; valores y fotos opcionales | tarjeta top 160/212; título 388/25; fotos en botones por color | tarjeta top 160/212; título 388/25; fotos en botones por color |
| Stock agrupado | Misma tarjeta; grupo por color, filas de talla, «Poner a todas» | tarjeta top 160/212; título 388/25; controles −/+ por fila | tarjeta top 160/212; título 388/25; controles −/+ por fila |
| Barra de avance | Fija en cabecera, trazo de 3 px | top 151/alto 3 en los cuatro pasos | top 151/alto 3 en los cuatro pasos |
| Pie fijo | Atrás + Seguir/Listo, controles ≥44 px | top 776/alto 56 | top 784/alto 56 |
| Reel de revisión | 390×488 escalado a 350×440 px | iframe 350×440; sin recorte | iframe 350×440; sin recorte |

## Verificación

- `npm run tipos`: pasa.
- `npm run lint`: pasa sin errores; quedan 33 avisos de lint en otros archivos del repositorio.
- `npm test`: 77/77 pruebas pasan.
- `npx next build --webpack`: pasa.
- `npm run build` con Turbopack no pudo completarse en este contenedor: tras permitir la descarga de fuentes, Turbopack falla al abrir el puerto de su proceso auxiliar (`Operation not permitted`). El build Webpack terminó correctamente.
- `scripts/probar-crear-producto.mjs`: termina correctamente en Chromium instalado, 360/390/393/430 px; incluye geometría, selección de miniaturas/contador, agregar/quitar/reordenar fotos, hojas desde las pastillas y conservación del borrador, botones dentro de márgenes, «Poner a todas», suma de grupo, «Ver presentaciones», stock cero por encargo y «Agotada» ausente.
- `npm run probar:hoja-producto`: pasa en 390 y 360 px; prueba la historia integrada y la ruta de edición.
- `npm run probar:producto`: no pasa completo (12 fallos en «ropa» y «medios», 360/390/430 px y ambos temas); esos escenarios intentan crear con los antiguos campos `Nombre` / `Precio`. Perfume, encargo y pedidos pasan en la misma corrida.
- `npm run probar:teclado`: pasa completo con Chromium; incluye escritura en eje/valor propio, precio por presentación, nombre, precio, plazo, descripción en su hoja grande (visible sobre el teclado simulado, sin mover la hoja ni perder foco), colección y regresiones de teclado en otras hojas.
- `npm run probar:presentaciones` completo todavía usa el alta anterior (`Nombre` / `Precio`) y falla al encontrar esos campos que ya no existen en la historia. Su regresión de edición filtrada (`SOLO=1b,5,6,7a,7b,11,12,13`) sí pasa en 390 y 360 px: conserva stock, cambios de ejes, precio propio, fotos y ocultar.
- El test de servicio, catálogo lleno y Safari/iPhone físico no se completó en esta verificación. El flujo de creación mantiene el tipo de producto actual; no añade selector de servicio.

## Chromium

Se usó `/usr/bin/chromium` (Chromium 154.0.8037.57), ya instalado. En el sandbox, su arranque normal falla al crear/bindear recursos de Crashpad (`setsockopt: Operation not permitted`, termina con `SIGTRAP`). Al lanzarlo con permisos de ejecución ampliados y `--no-sandbox`, Chromium/Playwright abre y pasa los recorridos. No se ejecutó `playwright install`.

## Revisión pendiente

Planning debe revisar el alcance completo y el check «Revisión» de GitHub. El PR sigue en borrador; no fusionar.
