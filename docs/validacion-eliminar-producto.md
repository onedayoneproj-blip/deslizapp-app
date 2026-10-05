# Catálogo: eliminación protegida — Coding, 2026-10-05

## Alcance y contrato

Base main `709d7dfb9dfb3db10607568546763f08281c77f8`, revisada de nuevo antes de publicar rama. Las tres primeras mejoras ya estaban implementadas por PR #49: se conservaron y se repitieron sus pruebas específicas. No se incorporó PR #45, ni se alteraron las carpetas o pendientes de otras sesiones.

Nueva migración **pendiente**, generada por `npx supabase migration new eliminar_producto_logico`: `20261005215350_eliminar_producto_logico.sql`. NO aplicada a producción. Su versión es provisional CLI: cuando haya autorización posterior para aplicarla, guardar el identificador asignado por Supabase y actualizar referencias, sin tocar migraciones aplicadas. No aplicar toda la carpeta a ciegas.

- Añade `productos.eliminado_en`, sin cambiar filas ni cantidades existentes.
- RPC de revisión y eliminación con identidad `auth.uid()`, membresía `mis_tiendas()`, `search_path=''` y ejecución únicamente authenticated. SECURITY DEFINER permite cambiar solo la marca de retirada y visibilidad sin conceder esa escritura desde el cliente. RLS existente se mantiene; no usa user_metadata.
- La RPC bloquea el producto y comprueba pedidos en curso, solicitudes vigentes y avisos pendientes. Nueva relación de pedido/solicitud/aviso toma el mismo bloqueo. Un ajuste manual tardío también se rechaza y revierte cantidades.
- Revoca DELETE físico de productos a authenticated. Protege ficha retirada contra edición/reactivación; stock permanece operable para despacho/devolución histórica. No cambia ni sobrecarga RPC existentes.
- No crea tablas ni índices: las consultas usan índices actuales de pedido_items, solicitudes por tienda y avisos pendientes.
- Conserva filas, variantes, promos, eventos/likes, ajustes y medios. Slug queda reservado. Ningún archivo cumple la condición de quedar sin referencia, por eso no se ejecuta limpieza de Storage ni se promete borrado permanente.
- Las listas administrativas/selectores excluyen retirados. Pedidos, comprobantes, métricas históricas y promos de lectura permiten `getProductos(tiendaId, true)` para conservar fotos/nombres. Las alertas de stock excluyen retirados. Catálogo público ya exige activo; la retirada fuerza falso.
- Pedido aún en curso: bloquea y ofrece Ocultar. Pedido despachado: puede deshacerse y despacharse de nuevo usando sus mismas referencias. Una edición que reconstruya artículos retirados no permite reinsertarlos: revisar esa selección; si el vendedor necesita seguir usando el producto en nuevas selecciones, debe Ocultar en vez de Eliminar.

## Pruebas realizadas

| Comprobación | Resultado |
|---|---|
| `npx next typegen` + `npx tsc --noEmit` | Pasó. La ejecución inicial de tsc sin tipos generados falló por PageProps/LayoutProps; después de typegen pasó. |
| `npm run lint` | Pasó, 0 errores y 27 warnings existentes. |
| `npm test` | 34/34 archivos pasaron, incluyendo eliminación pura y transporte real simulado. Las fallas iniciales del fixture/imports se corrigieron y repitieron. |
| `npm run build -- --webpack` | Pasó. Turbopack dev rechazó symlink de node_modules fuera de la raíz; se usó build Webpack + servidor de producción local. No se alteró bundler del proyecto. |
| `bash scripts/probar-eliminar-producto-replay.sh` | Pasó replay completo de 33 migraciones en PostgreSQL 17.6 desechable + pruebas SQL nuevas y existentes. |
| SQL eliminación | Pasaron membresía/otra tienda/anon; bloqueo por pedido, solicitud y aviso; eliminación lógica/idempotencia; items múltiples y snapshot; ajustes, pagos y saldo; no reactivar/borrar físicamente; ajuste tardío revierte stock; despacho/devolución por variante; catálogo público excluye retirado. |
| SQL concurrencia | Dos conexiones solapadas: pedido primero bloquea eliminación; eliminación primero bloquea nueva línea. Espera Lock comprobada. Se mantuvieron también las pruebas concurrentes existentes de registrar solicitud y disponibilidad. |
| `probar-agotados-y-likes.mjs` | Pasó 360/390/430 claro/oscuro: cero y 10 dígitos dentro de píldora; selección individual/todos los resultados de búsqueda; cancelar; ocultar uno/varios; doble toque; variantes, null, ocultos; relectura de repuesto/ya oculto; pedidos/avisos/otras tiendas intactos. |
| `probar-historial-ajustes-lista.mjs` | Pasó vacío, orden reciente, primera página/Ver más, notas largas y actor; no agrega ventas. |
| `probar-eliminar-producto.mjs` | Pasó Demo Chromium a 360/390/430 claro/oscuro; cancelar conserva borrador; sin/con historial; referencias intactas; bloqueado ofrece Ocultar y conserva otros campos; enlace retirado; sin overflow/errores de página. Movimiento reducido a 430; Escape, X y Atrás cierran solo la confirmación y conservan el borrador. Doble envío probado con dos clicks síncronos. |
| `probar:hojas` con CHROMIUM_PATH | Pasó hojas apiladas y aviso de cambios sin guardar. |
| `probar:teclado` con CHROMIUM_PATH | Falló: «Nuevo producto», gesto de cerrar después de escribir no mostró el aviso esperado. No se marca como aprobado ni se afirma haber probado Safari. Los checks previos de escritura/foco/posición sí pasaron. |
| `revisar:migraciones` con historial real obtenido por MCP (solo lectura) | 33 repo / 32 producción; una diferencia intencional: migración nueva pendiente. Aviso histórico de nombre invitaciones, misma versión. No reparó ni aplicó historia. |

La base desechable usa mocks mínimos de auth/storage y roles con RLS, no el entorno completo Auth/PostgREST/Storage de Supabase. Solo producción es accesible; bases locales de otras sesiones siguen desconocidas. No se modificó producto, pedido, archivo ni aviso real de Lewis. Los fixtures de navegador están aislados en Demo y bloquean solicitudes de Supabase.

## Límites y revisión pendiente

- Eliminación en una tienda Supabase real **no verificada ni habilitada**: la migración está pendiente por instrucción del dueño. Preview Demo sí permite probar. Lecturas actuales toleran que `eliminado_en` no exista; el error de RPC faltante muestra el límite y ofrece Ocultar.
- Safari físico/iPhone, teclado real, VoiceOver y recibo compartido real pendientes. Chromium móvil no equivale a Safari.
- Fallo de red con resultado incierto se maneja sin reintento automático y obliga a relectura; transporte simulado confirma que el adaptador no anuncia cambios ante error. No se cortó una escritura real de producción.
- Reintento parcial de ocultado mantiene la implementación existente; no se inyectó un fallo real de red durante el lote. Pendiente comprobación de ese caso en browser controlado.
- La prueba general de teclado queda fallida como se detalla arriba. No se ajustaron gestos globales en esta entrega.
- Fotos/videos se conservan deliberadamente; no hay prueba de borrado físico porque esa acción no se ofrece.

## Para Planning

Revisar la política de retirada lógica y sus bloqueos. Mantener PR abierto, sin merge ni despliegue de producción. Coordinar una entrega posterior para aplicar únicamente la migración autorizada, comprobar historia/contrato y probar una tienda de ensayo antes de publicar. No renombrar ni eliminar contratos que usa la sesión de rendimiento.
