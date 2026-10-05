# Evidencias de rendimiento (PR #45)

- `resumen.json`: medianas, rangos y las cinco muestras frías por versión, más SW normal/repetida.
- `antes.json.gz` / `despues.json.gz`: resultados completos del script, red CDP y Resource Timing. Descomprimir con `gzip -dk archivo.json.gz`.
- `antes-trace.json.gz` / `despues-trace.json.gz`: trazas completas Chrome representativas (antes fría 2, después fría 3). Descomprimir e importar en DevTools Performance/Perfetto.
- `antes-despues-390.webp`: misma portada, antes a la izquierda; no certifica tiempos por sí sola.
- `360/390/430-mayar.webp`: acceso directo real, DPR 3; sin escrituras.
- `visual.json`: seis verificaciones de inicio/acceso directo y color. `naturalWidth` es corregido por densidad; no expresa el tamaño real solicitado en `srcset`.
- `recorridos.json`, `recibos-tiempos.json`: pruebas demo (WhatsApp interceptado; sin envío) y primeros usos del recibo.
- `comparador.json`, `html-react-390.webp`: 42 pares contra HTML aprobado; HTML izquierda. Porcentaje visual no prueba paridad temporal.

Informe: `../../validacion-catalogo-rendimiento.md`. No son mediciones de Safari físico ni del preview protegido. El histórico de PR #44 permanece intacto.
