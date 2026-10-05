# Evidencia de PR #46

Capturas reales de Chromium, demo aislada, build local final. `registrar-{360,390,430}.webp` y `registrar-resuelto-{360,390,430}.webp` se toman después de terminar la apertura de Hoja. Otras vistas a 390 px: selector, cliente provisional, confirmado, despachado, Por registrar y Ya llegó. PNG originales conservados en la ejecución; WebP optimizado sin modificar el contenido de la interfaz.

`resultados.json`: 91 casos consolidados. `matriz-primer-intento.json`: 84/91; los siete fallos esperaban un texto de bloqueo antiguo. `aislamiento-repetido.json`: 7/7 con el mensaje real y las mismas comprobaciones de ausencia de operaciones/registros. `integracion45-*`: primer intento 24/26 y consolidado 26/26 tras las dos repeticiones de aislamiento. `transporte-resultados.json`: 7/7 con Supabase/WhatsApp interceptados, no una tienda real.

`comparacion-recibos.jpg`: PNG, PDF rasterizado, PNG con #45 y PDF con #45. Misma estructura/producto/total; códigos, hora, barcode y puerto varían legítimamente entre fixtures. `recibo-local.pdf` conserva un archivo efectivamente descargado. No demuestra compartir nativo, fidelidad completa de todos los recibos al HTML ni Safari físico.

Informe completo: [handoff](../../handoffs/pedido-catalogo-panel-continuacion.md).

La entrega completa también se combinó con #45 después de resolver manualmente tres conflictos de documentación: `integracion45-entrega-resultados.json` (13/13), `integracion45-entrega-build.txt` y `integracion45-entrega-tests.txt` (206/206). Código y ambas entradas de novedades preservados; ninguna integración temporal se publicó.
