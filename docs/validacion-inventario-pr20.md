# Ajustes de inventario — validación de PR #20

Fecha: 2026-10-02. Rama: `feature/catalogo-vista-previa-stock`.
Base revisada: main `a1ce8b3fdb53ccd5ad186644df19b01576dc25d4` y PR `52067cb7d96352aeb049de98c51866ec50607518`; sin cambios nuevos al volver a comprobar main.

## Resultado y límites

La implementación está disponible para revisar en demo. La migración `20261002190000_ajustes_inventario.sql` **no está aplicada** en producción. No se cambiaron existencias, esquema ni historial de producción. PR #2 sigue separado y sin fusionar.

Solo producción (`euihaeyfdlpvmbtfzvnt`) es accesible mediante el conector. Otros entornos y las bases locales de Claude Code/Codex siguen desconocidos. La base PostgreSQL de estas pruebas es desechable, no una tienda real.

`supabase db push --dry-run` dirigido a producción quedó bloqueado: faltan CLI/credenciales de conexión CLI, y persiste la divergencia de identificadores cubierta por PR #2. No se sustituyó por un push real ni se reparó el historial. Antes de aplicar, es necesario comprobar que se propone únicamente esta migración, sin reaplicar las anteriores.

Además, la migración retira UPDATE directo de `productos.stock`, conservando los permisos anteriores sobre las demás columnas. **No aplicarla anticipadamente a la app antigua**: su editor incluía stock en la escritura y puede dejar de guardar. Hay que coordinar una versión compatible de la app y la migración cuando se autorice publicar. Los controles reales necesitan la RPC; sin ella, muestran error, sin inventar éxito.

## Comprobaciones ejecutadas

| Comprobación | Resultado real |
| --- | --- |
| `npx next typegen && npx tsc --noEmit` | Pasó. |
| `npm run lint` | Pasó, sin advertencias. |
| `npm test` | 14/14 archivos de pruebas pasaron. Incluye motivos, registro, stock cero/null, aislamiento y pedidos intactos. |
| `npm run build` (Turbopack) | No completó: intento inicial sin acceso a Google Fonts; al ampliar permisos, error del entorno al abrir un puerto para PostCSS. |
| `npx next build --webpack` | Pasó: compilación, TypeScript, generación y trazas. No se cambió el bundler configurado del proyecto. |
| `npm run probar:inventario`, Chromium, 360/390/430 px | Pasó: aumentar, confirmar/cancelar disminución, registro persistido demo, pedidos intactos después de la primera escritura, producto preseleccionado, cero/null y ausencia de overflow horizontal/errores de página. |
| `npm run probar:teclado`, Chromium | Pasó: suite completa, incluido el motivo «Otro» en la hoja de ajuste. Simula visualViewport de iPhone; no sustituye Safari en un iPhone físico. |
| `npm run probar:hojas`, Chromium | Primera ejecución: fallo al cerrar cliente nuevo vacío. Repetición completa: pasó sin cambiar ese flujo. No se determinó la causa de la primera observación. |
| Replay completo | Pasó: los 16 archivos actuales, incluida la nueva migración, en PostgreSQL 17.6 vacío con fixtures mínimos de Auth/Storage. No es una instancia completa de Supabase. |
| RPC/RLS/permisos en replay final | Pasó: incrementos/decrementos, rechazo de negativos/null/otra tienda, lectura aislada, historial no escribible desde cliente, RPC inaccesible a anon y stock directo rechazado. `scripts/probar-inventario-db.sql` conserva los casos; exige la base desechable `replay_final`. |
| Fallo al insertar registro | Pasó: un trigger de prueba forzó un fallo y la transacción dejó stock e historial intactos. El trigger solo existió en la base desechable y se eliminó después. |
| Dos conexiones concurrentes | Pasó: +1 y +2 desde stock 1 terminaron en 4, con ambos registros y cantidades anterior/posterior encadenadas. |
| Pedidos + ajustes | Pasó en replay: despachar descuenta una vez, segundo despacho rechazado, deshacer devuelve unidades; ninguna operación creó un ajuste manual. |
| Producción, solo lectura | Se revisaron historial, columnas y permisos. La tabla/RPC de ajustes siguen ausentes. |

La comparación de columnas públicas (nombre, orden, tipo y nulabilidad), excluyendo la nueva tabla, coincide entre replay y producción: firma MD5 `e108b49b86b65a89de1b42fc74127c60`. **No es una comparación completa de todas las funciones, políticas, índices y triggers mediante pg_dump.**

Los primeros intentos del nuevo script de navegador tuvieron errores del propio script (forma del localStorage, URL sombreada y texto repetido en Catálogo); se corrigieron y la ejecución final pasó en los tres tamaños. El bootstrap auxiliar del segundo replay necesitó corregir la importación de constraints/triggers de Auth; el replay final limpio y los casos SQL posteriores pasaron.

## No verificado / pendiente

- Dry run de producción y aplicación de migración; comprobación posterior de historial/tabla/RPC.
- Ajustes, edición y pedidos mediante una sesión Supabase real en navegador. No se crearon datos de prueba en producción.
- Fallos de red del navegador durante la llamada real, incluidos resultados ambiguos si se corta la conexión después de confirmar la base. No repetir un ajuste a ciegas: actualizar el producto y revisar antes de reintentar. El rollback SQL sí se probó, pero no equivale a esta prueba de red.
- Safari/teclado de iPhone físico y revisión visual manual de fotos.
- Activar o desactivar control de stock en productos ya creados queda pendiente de una operación auditada específica. Los nuevos conservan la elección inicial; no se añadió una pantalla de historial.

## Repetir la prueba demo

Con la app corriendo: `URL=http://localhost:3200 CHROMIUM_PATH=/usr/bin/chromium ANCHO=390 npm run probar:inventario`. Cambiar ANCHO a 360/430. El script solo cambia la demo de su propio contexto de navegador; nunca llama a Supabase. La prueba SQL y la concurrencia requieren la base desechable y no deben dirigirse a producción.
