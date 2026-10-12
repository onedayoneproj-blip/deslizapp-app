# Handoff — Crear producto (historia)

Rama `codex/crear-producto-historia`, base `main` al iniciar. Encargo ejecutado desde main; no se tomó contenido de `feat/crear-producto-historia`.

## Hecho

- `/catalogo/nuevo` usa la nueva hoja por momentos; la ruta de edición sigue usando la hoja anterior y comparte la misma lógica de guardado.
- El selector de catálogo va en la cabecera y persiste con `leerCatalogoActivo` / `guardarCatalogoActivo`, por tienda.
- Foto, nombre, precio, stock/encargo, vista previa del reel real, guardado oculto, publicación, celebración y «Agregar otro» están conectados.
- Publicar permite no tener foto; «Guardar sin publicar» crea el producto oculto. El stock sin elegir bloquea el avance; por encargo guarda stock cero y conserva el plazo.
- Novedad 0.66.0 y documentación actualizadas. Sin cambios a Supabase ni migraciones.

## Decisiones y límites que deben revisar

- El editor de presentaciones existente (`SeccionPresentaciones` / `FlujoPresentaciones`) se conserva y se abre desde «Tiene tallas o colores». **No quedó reconstruido dentro de la historia según `historia-presentaciones.dc.html`**: conserva la hoja y los dos pasos existentes. Por eso faltan las pantallas de valores por eje, stock agrupado, detalle de variante y sus capturas `v1–v6` en el nuevo lienzo.
- El contrato actual de creación asigna `tipo: "producto"`; el flujo no añade una selección nueva de servicio.
- «Compartir mi catálogo» aparece solo si el catálogo de la tienda ya está publicado y tiene enlace. En otro caso no se muestra.

Estos límites son conocidos y no se presentan como trabajo terminado; deben resolverse antes de considerar completa la especificación de los dos lienzos.

## Pruebas

- `npm run tipos`: pasa.
- `npm run lint`: pasa sin errores.
- `npm test`: la ejecución reportó los primeros 46 archivos exitosos; se interrumpió al límite de tiempo de la sesión, así que falta una corrida completa con resumen final.
- `npm run build`: no terminó dentro del límite de la sesión; el proceso de Next quedó activo y bloqueó reintentos por `.next/lock`.
- Las pruebas Playwright (`probar-crear-producto.mjs`, `npm run probar:hoja-producto`, `npm run probar:producto` y `npm run probar:presentaciones`) no se pudieron completar en la última verificación porque el navegador instalado no pudo iniciar en este contenedor (Chromium cerró con `SIGTRAP`; las pruebas del repositorio tampoco hallaron su ejecutable Playwright).
- Capturas actuales: `docs/capturas/crear-producto-codex/` (`b1–b6`, foto con medio real; precio con teclado simulado a 360 px; guardar oculto sin foto). Son capturas tomadas en una ejecución anterior, no prueba de la corrida actual.
- No probado: Safari/iPhone físico, publicación/compartir con catálogo de tienda real.
