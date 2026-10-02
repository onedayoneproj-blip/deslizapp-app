# Ajustes de inventario — validación de PR #20

Fecha: 2026-10-02. Rama: `feature/catalogo-vista-previa-stock`.
Base revisada: main `a1ce8b3fdb53ccd5ad186644df19b01576dc25d4` y PR `52067cb7d96352aeb049de98c51866ec50607518`; sin cambios nuevos al volver a comprobar main.

## Resultado y límites

La implementación se publicó en producción después de fusionar PR #20 en main `3daf0ee10cd292205445de70b5d32436effcab47`. La migración `20261002203414_ajustes_inventario.sql` **está aplicada** en Supabase. Se añadieron la tabla/RPC/permisos y una entrada de migración; la aplicación del esquema no modifica las existencias. PR #2 sigue separado y sin fusionar.

Solo producción (`euihaeyfdlpvmbtfzvnt`) es accesible mediante el conector. Otros entornos y las bases locales de Claude Code/Codex siguen desconocidos. La base PostgreSQL de estas pruebas es desechable, no una tienda real.

`supabase db push --dry-run` dirigido a producción no se ejecutó: faltan CLI/credenciales y persiste la divergencia antigua cubierta por PR #2. Con autorización del usuario se comprobó el SQL de esta única migración en una transacción con ROLLBACK, y después se aplicó mediante el conector; no se reaplicó la cadena anterior. Esa comprobación no equivale al dry-run del CLI. Supabase generó la versión `20261002203414`; se renombró el archivo desde `20261002190000` para coincidir. La revisión automática rechazó renumerar la entrada nueva del historial por considerar esa operación adicional no explícitamente autorizada. Se completó la alineación cambiando el archivo del repositorio; ninguna entrada de historial fue alterada.

Además, la migración retira UPDATE directo de `productos.stock`, conservando los permisos anteriores sobre las demás columnas. El editor antiguo incluía stock en la escritura. Por eso primero se publicó la app compatible (Vercel READY) y luego se aplicó la migración. Los usuarios que mantengan una versión antigua abierta deben actualizar la app antes de editar productos.

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
| Producción antes de publicar, solo lectura | Se revisaron historial, columnas y permisos; tabla/RPC todavía ausentes en ese momento. |

La comparación de columnas públicas (nombre, orden, tipo y nulabilidad), excluyendo la nueva tabla, coincide entre replay y producción: firma MD5 `e108b49b86b65a89de1b42fc74127c60`. **No es una comparación completa de todas las funciones, políticas, índices y triggers mediante pg_dump.**

Los primeros intentos del nuevo script de navegador tuvieron errores del propio script (forma del localStorage, URL sombreada y texto repetido en Catálogo); se corrigieron y la ejecución final pasó en los tres tamaños. El bootstrap auxiliar del segundo replay necesitó corregir la importación de constraints/triggers de Auth; el replay final limpio y los casos SQL posteriores pasaron.

## No verificado / pendiente

- Dry run del CLI en producción; la aplicación individual y la comprobación transaccional ya se completaron.
- Ajustes, edición y pedidos mediante una sesión Supabase real en navegador. No se crearon datos de prueba en producción.
- Fallos de red del navegador durante la llamada real, incluidos resultados ambiguos si se corta la conexión después de confirmar la base. No repetir un ajuste a ciegas: actualizar el producto y revisar antes de reintentar. El rollback SQL sí se probó, pero no equivale a esta prueba de red.
- Safari/teclado de iPhone físico y revisión visual manual de fotos.
- Activar o desactivar control de stock en productos ya creados queda pendiente de una operación auditada específica. Los nuevos conservan la elección inicial; no se añadió una pantalla de historial.


## Publicación y comprobaciones de producción — 2026-10-02

- PR #20 fusionado; Vercel confirmó READY para main `3daf0ee10cd292205445de70b5d32436effcab47`, despliegue `dpl_4AjDRMgVTagVzUGP9jpwoHjhLHBk`.
- Antes de aplicar se ejecutó el SQL completo en una transacción revertida: tabla, RPC, RLS, permiso de editar nombre, stock directo bloqueado y acceso solo autenticado pasaron.
- Aplicación individual de la migración mediante Supabase: pasó. Identificador registrado `20261002203414`; historial anterior sin cambios.
- Comprobación posterior: tabla y RPC presentes, RLS habilitado, acceso anónimo a RPC rechazado y escritura directa del registro bloqueada.
- En producción, con rol authenticated y membresía existente, una transacción con ROLLBACK comprobó +1, −1, registro de cantidades/actor, stock negativo rechazado, UPDATE directo rechazado y otra tienda rechazada. No se dejaron cambios de prueba.
- Antes de aplicar: 15 productos, firma id/stock `5f2c1e4029397d3d8a7edb11abe3456b`. La lectura inmediata tras el ROLLBACK confirmó 0 ajustes. Después se observaron dos reposiciones +1 guardadas a las 20:36:30 y 20:36:36 UTC, posteriores a las pruebas; el stock pasó 1→2→3. La lectura posterior dio firma `ceb226b52e3817d96a47053faf962d60`. Estas reposiciones no proceden de la transacción de prueba revertida; no se eliminaron ni se revirtieron acciones posteriores.
- Asesores de seguridad: la RPC genera el aviso de SECURITY DEFINER ejecutable por authenticated; es deliberado para las dos escrituras atómicas y se validaron auth.uid(), membresía, search_path vacío y EXECUTE restringido. Referencia: https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable . Los demás avisos históricos quedan fuera de esta entrega.
- Esta verificación de SQL no acredita un recorrido de navegador con tienda real ni Safari físico.

## Repetir la prueba demo

Con la app corriendo: `URL=http://localhost:3200 CHROMIUM_PATH=/usr/bin/chromium ANCHO=390 npm run probar:inventario`. Cambiar ANCHO a 360/430. El script solo cambia la demo de su propio contexto de navegador; nunca llama a Supabase. La prueba SQL y la concurrencia requieren la base desechable y no deben dirigirse a producción.
