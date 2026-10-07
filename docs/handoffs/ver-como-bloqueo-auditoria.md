# Ver como: auditoría de escrituras (la base bloquea, no solo la app)

Regla: mientras un admin tiene una sesión de Ver como **vigente** sobre una tienda (`tiendas_que_miro()`), ninguna escritura sobre los datos de **esa** tienda pasa, aunque ese admin también sea dueño o miembro. Las demás tiendas de la misma cuenta siguen igual. Sin sesión vigente, nada cambia.

Mecanismo: `public.exigir_no_viendo(tienda_id)` (lanza `42501 solo_mirar`) al inicio de cada función que escribe; tres políticas **restrictivas** (`ver_como_no_escribe_<tabla>_insert|update|delete`) por tabla; tres políticas de Storage. Migraciones: `20261007012749`, `20261007013121`, `20261007013437`, `20261007013546`.

## 1. Tablas que un miembro puede escribir directo (políticas restrictivas)

| Tabla | Cómo resuelve la tienda | Estado |
|---|---|---|
| `clientes`, `pedidos`, `productos`, `producto_variantes`, `promos`, `marca_tienda`, `marca_referencias` | columna `tienda_id` | Cubierta |
| `tiendas` | `id` | Cubierta |
| `pedido_items` | por `pedidos.tienda_id` del pedido | Cubierta |
| `usuarios` (`tienda_id`) | es del perfil, no de una tienda; elegir tienda activa no cambia datos de la tienda | No hace falta |
| `sesiones_ver_como`, `registro_admin`, `miembros` | sin escritura directa para la API (solo funciones `admin_*` o `invitar/quitar/transferir`, estas cubiertas abajo) | No hace falta |
| `jugada_envios`, `miembros` con grant a `anon` | grants antiguos, frenados por RLS (sin política de escritura para anon) | No hace falta |

## 2. Funciones que escriben (SECURITY DEFINER, saltan RLS: llevan el chequeo adentro)

| Grupo | Funciones | Cómo resuelven la tienda | Estado |
|---|---|---|---|
| Producto e inventario | `ajustar_stock`, `crear_producto`, `eliminar_producto`, `guardar_producto_inventario`, `guardar_variantes`, `reponer_stock`, `gastar_creditos(uuid,int)` | `p_tienda_id` | Cubiertas |
| Retoque | `pedir_retoque` | tienda del producto | Cubierta (gasta créditos) |
| Pedidos y clientes | `borrar_cliente`, `crear_codigo_cliente`, `deshacer_despacho`, `despachar_pedido`, `editar_abono`, `editar_pedido`, `eliminar_abono`, `eliminar_pedido`, `registrar_abono`, `registrar_envio_jugada`, `registrar_solicitud`, `descartar_solicitud`, `registrar_venta_pasada`, `marcar_avisado` | `p_tienda_id` o la tienda de la fila que tocan | Cubiertas |
| Tienda y equipo | `cambiar_estado_tienda`, `pedir_cambios_catalogo`, `publicar_catalogo`, `solicitar_catalogo`, `invitar_a_tienda`, `quitar_de_tienda`, `transferir_tienda` | `p_tienda_id` | Cubiertas |
| Actividad | `marcar_actividad` | `p_tienda_id` | Cubierta: **devuelve `false` sin escribir** (no es error, para no romper la pantalla; mirar no cuenta como actividad de la tienda) |

## 3. Storage (`storage.objects`)

| Bucket | Cómo resuelve la tienda | Estado |
|---|---|---|
| `productos`, `marca-referencias` | primera carpeta de la ruta = id de tienda | Cubiertos (insert, update, delete) |
| Otros buckets | no son de una tienda | No hace falta |

## 4. Deliberadamente sin bloquear

| Qué | Por qué |
|---|---|
| `admin_*` (incluido `admin_ver_como_iniciar/terminar`) | Es el panel del admin, no escribe datos de tienda como la tienda; ya valida `soy_admin()` y deja registro. Terminar la sesión tiene que seguir posible. |
| Funciones públicas del comprador (pedidos y solicitudes desde el catálogo, likes, jugada) | No pasan por la cuenta del admin; no son «tienda» sino visitante. |
| `crear_tienda` | Crea una tienda nueva; no hay tienda mirada que proteger. |
| `usuarios_elegir_tienda` | Cambia la preferencia de perfil, no datos de tienda. |
| `gastar_creditos(int)` | Delega en `gastar_creditos(uuid,int)`, que sí exige. |

## 5. Cómo se probó

`scripts/probar-ver-como-bloqueo-db.sql` (replay en `probar-admin-replay.sh`): con sesión vigente cada tabla da 0 filas o `42501`, cada función `solo_mirar`, las lecturas siguen, la otra tienda del mismo admin escribe, y al terminar o vencer la sesión todo vuelve. En producción solo se ensayó dentro de `BEGIN … ROLLBACK`; no se abrió ninguna sesión real de Ver como.
