# Inventario provisional e historial — validación

Fecha: 2026-10-02. Rama: `feature/inventario-provisional-historial`.
Base: main `93e87f8a38157c69ff83989c602ad94d661b45ef`, comprobado nuevamente sin cambios.
PR #20 ya está fusionado; esta rama continúa desde main. PR #2 no se mezcla.
El informe `validacion-inventario-pr20.md` es histórico: sus controles inmediatos
no describen la interacción de esta rama.

## Resultado

Vista previa compacta (112 px, recorte conservado, nombre hasta tres líneas),
borrador compartido con edición, motivo al guardar y un único ajuste final.
Descartar/restaurar/cancelar no registra nada. Guardar ficha y ajuste usa una
sola operación. Historial de solo lectura, diez registros inicialmente, Ver más,
estados de carga/error/reintento, actor accesible o «Cuenta de la tienda» y
fecha/hora de Santo Domingo. No cambia el recorrido de pedidos ni ventas.

Se corrigió también un contador de Atrás en Hoja: cerrar una hoja de ruta sin otra
hoja debajo ya no deja un evento a ignorar para el siguiente Atrás del usuario.
Las dos hojas de producto optan por la protección de cambios pendientes;
al confirmar una disminución desde edición, se retira primero la confirmación
y luego el editor, evitando competir por el historial. Los efectos de foco permanecen estables y el teclado no los remonta.

## SQL y estado de producción

- Aplicada previamente: `20261002203414_ajustes_inventario.sql`.
- **Aplicada en producción tras autorización del usuario**: `20261002223718_guardar_producto_inventario.sql`.
- Nueva RPC `guardar_producto_inventario`, sin sobrecargas: conserva intacta la
  firma/comportamiento de `ajustar_stock`, `despachar_pedido`, `deshacer_despacho`.
  El índice añadido corresponde a la consulta por tienda/producto/fecha/ID.
- `FOR UPDATE` y comparación de base protegen frente a despachos u otros ajustes.
  Membresía con `mis_tiendas()`, actor `auth.uid()`, SQL con `search_path` vacío,
  ejecución solo autenticada, RLS anterior intacta. No usa metadata para autorizar.
- Ficha, stock, registro y créditos de retoque participan en la misma transacción.
  Un ID ya confirmado con los mismos datos no vuelve a aplicar el ajuste.
  Las fotos se suben antes: Storage no forma parte de la transacción SQL. Ante
  error conocido se limpian archivos nuevos; ante respuesta incierta se conservan
  para no borrar una foto posiblemente guardada (pueden quedar archivos sin usar).
- Durante la implementación, producción se consultó **solo en lectura**: historial de 17 migraciones,
  RLS del historial y firmas actuales de RPC. La nueva función todavía no existía en esa revisión previa.
  No se aplicó SQL, no se cambiaron cantidades ni historial en producción.
- Solo producción es accesible. Staging/desarrollo y bases locales de otras
  sesiones de Claude Code/Codex siguen desconocidos; deben revisar la nueva
  migración y sus versiones antes de aplicar en sus entornos.
- El CLI está disponible (2.119.0); no se hizo dry-run dirigido a producción
  por falta de credenciales CLI y la divergencia antigua pendiente en PR #2.
  Nunca sustituirlo por un push general ni reaplicar migraciones anteriores.
- Compatibilidad: aplicar esta migración no modifica filas actuales y permite
  seguir usando la app publicada. **La nueva app necesita la nueva RPC para
  guardar desde la vista previa/editor en modo real.** El usuario autorizó aplicar la
  migración y fusionar PR #21; la migración se aplicó antes de publicar la app.


## Aplicación autorizada en producción — 2026-10-02

- SQL completo comprobado en una transacción revertida antes de aplicar: función e índice presentes, RPC anterior conservada, EXECUTE permitido a authenticated y bloqueado a anon.
- Aplicada exclusivamente esta migración mediante el conector Supabase. Versión generada `20261002223718`; archivo renombrado desde `20261002205119` para coincidir, sin alterar entradas del historial interno ni mezclar PR #2.
- Verificación autenticada en producción con ROLLBACK: guardado conjunto de ficha+stock, registro de actor/cantidades, ID repetido sin duplicado, conflicto de stock sin ficha parcial y rechazo de otra tienda pasaron.
- Después de revertir: 15 productos, 2 ajustes originales y firma de stock `338ecaf4cc10f82a36acf78d275e6596`, igual que antes. Sin datos de prueba persistidos.
- Dependencia real `gastar_creditos(uuid,integer)` confirmada; no se ejercitó un retoque de Storage real.
- El `db push --dry-run` del CLI sigue sin ejecutarse. La comprobación transaccional y la aplicación individual no equivalen a ese comando. No se reaplicaron migraciones anteriores.

## Comprobaciones ejecutadas

| Comprobación | Resultado real |
| --- | --- |
| `npx next typegen && npx tsc --noEmit` | Pasó. |
| `npm run lint` | Pasó sin advertencias. |
| `npm test` fuera de la restricción de procesos | 122 casos individuales pasaron; incluye seis casos de inventario. La ejecución restringida reportaba archivos, por eso se repitió con casos individuales. |
| `npm run build` (Turbopack) | Falló por `Operation not permitted` al abrir el puerto interno de PostCSS. No es un resultado aprobado. |
| `npx next build --webpack` | Pasó; compilación, TypeScript, generación y trazas. No se cambió el bundler del proyecto. |
| `bash scripts/probar-inventario-replay.sh` | Pasó en PostgreSQL 17.6 nuevo y desechable: cadena completa, SQL/RLS/permisos, stock cero/null, motivos/nota, ficha+ajuste, rollback de fallo del historial, IDs repetidos, dos conexiones concurrentes, despacho/devolución. |
| `probar:inventario` a 360/390/430 px | Pasó en demo: toques sin persistir, cantidad original sin ajuste, varios toques/un ajuste, cancelar motivo, Otro/nota, nombre solo sin ajuste, ficha+cantidad, historial actualizado, disminución confirmada en edición, Atrás, descartar y editar, pedido preseleccionado sin venta, cero/null, nombres largos, miniatura sin foto y sin overflow. |
| `probar:inventario` con movimiento reducido | Pasó en demo a 390 px. Sin animaciones nuevas en este cambio. |
| `scripts/probar-inventario-fallos.mjs` | Pasó con dobles de useData en navegador demo local: respuesta perdida antes/después de confirmar, sin reintento automático, doble toque/una escritura, conflicto y recuperación de stock nuevo, error de validación sin ficha parcial, motivo/nota conservados, cancelar sin registros, historial 10→12/error/reintento y filtro por tienda. |
| `probar:hojas` | Pasó, repetido después del arreglo de Atrás; regresión en pedidos/abonos/clientes: gestos, fondo, Escape, X, Atrás, confirmación, foco y Tab. |
| `probar:teclado` | Pasó, incluido motivo Otro de ajuste apilado; simulación de visualViewport iOS, mismo nodo/foco, escritura y ninguna transición de vista. |

El replay usa fixtures mínimos de Auth/Storage en PostgreSQL limpio; comprueba
el contrato SQL de la app y roles, **no** reproduce toda la plataforma Supabase.
Los fallos del navegador son dobles de prueba, no cortes de red contra producción.
La concurrencia SQL sí se ejecutó con dos conexiones independientes: una confirmó,
la otra rechazó `stock_base_cambio`; quedaron un solo ajuste y el stock esperado.

## Capturas y límites

Capturas reales de Chromium local, demo con nombre largo y stock cero:
[360 px](capturas/inventario-provisional/producto-360.png),
[390 px](capturas/inventario-provisional/producto-390.png),
[430 px](capturas/inventario-provisional/producto-430.png). También sin foto:
[360](capturas/inventario-provisional/sin-foto-360.png),
[390](capturas/inventario-provisional/sin-foto-390.png),
[430](capturas/inventario-provisional/sin-foto-430.png).

Pendientes: iPhone/Safari físico, VoiceOver, recorrido de navegador autenticado de
esta rama en una tienda real, red real incierta, subida/retoque/borrado de fotos
contra Storage real y reconciliación antigua de migraciones. No se anuncian como
aprobadas. El modo real requiere primero la migración nueva; no hay fallback a
escrituras directas de stock ni al ajuste inmediato anterior.

## Validación manual antes de publicar

1. Abrir la preview en **Demo**, entrar a Catálogo y tocar un producto con stock.
2. Revisar miniatura/nombre/precio/estado. Tocar + varias veces: cambia Propuestas,
   pero Guardado e historial no cambian. Descartar recupera la cantidad guardada.
3. Guardar un aumento: un solo registro de reposición con el total añadido.
4. Proponer una disminución, guardar, probar Cancelar; guardar otra vez con Otro:
   exige nota. Confirmar: un solo ajuste, sin pedido/venta nuevos.
5. Editar: cambiar solo nombre/precio y guardar, sin registro de ajuste; después
   cambiar nombre y cantidad, guardar y revisar ambos cambios e historial.
6. Probar X/Atrás/Escape con cambios y Seguir aquí/Salir; ir a Editar o Crear pedido
   con borrador también pregunta. No cambia stock hasta confirmar el guardado.
7. Revisar stock cero (− deshabilitado), sin control (sin controles), teclado de
   nota y nombres largos; repetir con Reducir movimiento activado en iPhone.
8. Tienda real: la migración ya está aplicada. Tras publicar PR #21, repetir en un producto destinado a validación con la dueña presente;
   no crear ajustes ni pedidos de prueba automáticamente en producción.
