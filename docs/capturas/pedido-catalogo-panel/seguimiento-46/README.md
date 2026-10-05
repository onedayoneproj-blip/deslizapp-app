# Seguimiento PR #46: likes, pendientes y Google

Capturas reales de Chromium local, build estable, fixtures demo separados. No son Safari ni producción; los números no se fijan en la app. `likes-1-390.webp`, `likes-1234-390.webp` y `pendientes-390.webp` muestran la frase y el desglose. Los otros anchos se comprobaron con la misma suite a 360/390/430, sin overflow.

- `contadores-resultados.json`: tres anchos; 1/2/1234/0, seleccionado, aaah, bolsa y agotado; registro mantiene total, confirmar/descartar lo reduce. La corrida incluye vencimiento con reloj de navegador en 360.
- `panel-resultados.json`: 24/24 en build estable, tres anchos + 390 reducido. Teclado simulado, foco, Atrás, cierres, registro y aislamiento. Primera matriz de desarrollo interrumpida después de dos timeouts de hoja; no se marca aprobada.
- `transporte-inicial.json`: 16/17 en la segunda corrida amplia. El aviso de error OAuth falló en la primera (15/16): corregido Strict Mode. En esta segunda falló el nuevo fixture del contador, que omitía `registrada_en` y filtraba todas las solicitudes. `transporte-reintento.json`: 1/1 tras corregir el fixture; también comprueba reintento común y retención del total conocido. Son transportes Auth/RLS interceptados, nunca un Google o tienda real.
- `catalogo-resultados.json`: 9/9 repetición. Primera corrida 8/9: timeout del botón de sonido a 360, nodo separado durante scroll. No se atribuye una causa definitiva ni se modifica el reproductor.
- Scripts generales de hojas y teclado pasaron completos. Hojas falló inicialmente al no encontrar el binario Playwright predeterminado; pasó con su opción existente `CHROMIUM_PATH=/usr/bin/chromium`.

TypeScript, lint (0 errores/27 advertencias existentes), 204 tests y build pasaron. WebKit/Safari físico y VoiceOver pendientes. Sin escrituras en Supabase; RLS de producción revisada solo como metadatos. Lista Auth de callbacks no accesible: dirección exacta de nueva preview en PR #46.
