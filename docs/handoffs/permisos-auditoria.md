# Permisos de colaboradores: auditoría (lo exige la base)

Regla: **dueño** (`miembros.rol = 'dueno'`) puede todo, como antes. **Colaborador** (`rol = 'staff'`) puede lo que permita su `miembros.nivel`. Lo exige la base con políticas **restrictivas** en las tablas y `exigir_permiso` en las funciones; la pantalla solo explica. Convive con Ver como (`ver_como_no_escribe_*` y `exigir_no_viendo`, de #59) sin quitar nada.

Migraciones: `20261007024238_permisos_niveles`, `20261007030128_permisos_rpc`, `20261007030828_enlaces_invitacion`, `20261007031102_tienda_nueva_por_enlace`.

## Mapa nivel → grupo (un solo lugar: `public.nivel_tiene_grupo`)

| Grupo | Qué cubre | Ayudante | Editor | Administrador | Dueño |
|---|---|---|---|---|---|
| `ventas` | pedidos, despacho, abonos, clientes, promos, solicitudes y avisos del catálogo | sí | sí | sí | sí |
| `catalogo` | productos, variantes, medios, inventario y reposición, datos y aspecto de la tienda (nombre, logo, colores, personalización), publicación del catálogo | no | sí | sí | sí |
| `creditos` | `pedir_retoque`, `gastar_creditos` (todo lo que gasta o reserva créditos) | no | no | sí | sí |
| `marca` | Mi marca (`marca_tienda`, `marca_referencias`, bucket `marca-referencias`) | no | no | sí | sí |
| `compras` | reservado: pagar plan o créditos desde la tienda (hoy no hay funciones) | no | no | sí | sí |
| `equipo` | invitar, aprobar, cambiar nivel, quitar a otros, cancelar enlaces, pausar/eliminar la tienda, transferir | no | no | no | sí |

Apoyo: `tengo_permiso(tienda, grupo)`, `mis_tiendas_con_permiso(grupo)` (lo usan las políticas: Postgres la calcula una vez por consulta), `exigir_permiso(tienda, grupo)` (lanza `sin_permiso`, 42501, si quien llama **es miembro** sin el grupo; si no es miembro, decide la comprobación de pertenencia propia de cada función), `puede_sumar_colaborador(tienda)` (gancho del límite; hoy siempre sí).

Corrección a la tabla del prompt: el **aspecto de la tienda** (`tiendas`: nombre, WhatsApp, logo, colores, personalización) quedó en `catalogo`, porque es lo que se ve en el catálogo. Pausar, eliminar y transferir la tienda quedaron en `equipo` (ya eran solo del dueño).

## 1. Tablas con escritura para miembros (3 políticas restrictivas cada una: insert, update, delete)

| Tabla | Grupo | Cómo resuelve la tienda |
|---|---|---|
| `clientes`, `pedidos`, `promos` | ventas | `tienda_id` |
| `pedido_items` | ventas | `tienda_id` de su pedido |
| `productos`, `producto_variantes` | catalogo | `tienda_id` |
| `tiendas` | catalogo | `id` |
| `marca_tienda`, `marca_referencias` | marca | `tienda_id` |
| `miembros`, `invitaciones` | — | **sin escritura directa** para la API (se quitó el permiso): todo por funciones. Nadie se sube el nivel. |
| `enlaces_invitacion` (nueva) | — | sin escritura directa; lectura: dueño los de su tienda, admin los de tienda nueva; nadie lee `codigo_hash` |

Lecturas (`select`): sin cambios; todo miembro lee su tienda (un Ayudante ve productos para armar un pedido).

## 2. Funciones que escriben (security definer: llevan `exigir_permiso` después de `exigir_no_viendo`)

| Grupo | Funciones | Cómo resuelven la tienda |
|---|---|---|
| ventas | `borrar_cliente`, `crear_codigo_cliente`, `deshacer_despacho`, `despachar_pedido`, `editar_abono`, `editar_pedido`, `eliminar_abono`, `eliminar_pedido`, `registrar_abono`, `registrar_envio_jugada`, `registrar_solicitud`, `descartar_solicitud`, `registrar_venta_pasada`, `marcar_avisado` | `p_tienda_id` o la tienda de la fila (cliente, pedido, abono, solicitud, aviso) |
| catalogo | `ajustar_stock`, `crear_producto`, `eliminar_producto`, `guardar_producto_inventario`, `guardar_variantes`, `reponer_stock`, `publicar_catalogo`, `solicitar_catalogo`, `pedir_cambios_catalogo` | `p_tienda_id` |
| creditos | `gastar_creditos(uuid,int)`, `pedir_retoque` | `p_tienda_id` / tienda del producto |
| equipo | `cambiar_estado_tienda`, `transferir_tienda`, `invitar_a_tienda`, `invitar_por_correo`, `quitar_de_tienda` (a otro), `crear_enlace_colaborador`, `aprobar_miembro`, `rechazar_miembro`, `cancelar_enlace`, `cambiar_nivel` | `p_tienda_id` / tienda del enlace |

Caminos que mezclan grupos, a propósito: `despachar_pedido`, `deshacer_despacho`, `editar_pedido` y `registrar_venta_pasada` mueven stock pero son **ventas** (un Ayudante despacha); el stock es efecto legítimo.

## 3. Archivos (Storage)

| Bucket | Grupo |
|---|---|
| `productos` (fotos, videos y logo de la tienda) | catalogo |
| `marca-referencias` | marca |
| `comprobantes`, `retoques` | sin cambios (solo admin) |

## 4. Sin permiso de grupo, con el porqué

| Qué | Por qué |
|---|---|
| `marcar_actividad` | No cambia datos de la tienda: anota la última entrada. Cualquier miembro. |
| `revisar_eliminacion_producto` | Solo lee (cuenta pedidos y avisos antes de eliminar). |
| `quitar_de_tienda` a uno mismo («Salir de esta tienda») | Cualquier miembro puede irse; la última dueña no. |
| `gastar_creditos(int)` | Delega en `gastar_creditos(uuid,int)`, que sí exige `creditos`. |
| `usuarios_elegir_tienda` (política) | Elige la tienda activa del perfil; no cambia la tienda. |
| `reclamar_enlace`, `mis_solicitudes`, `crear_mi_tienda` | Las usa quien todavía no es miembro; validan el enlace (hash, estado, vencimiento, dueño del reclamo). |
| `admin_*` (incluidas las de enlaces de tienda nueva) | Validan `soy_admin()` y dejan registro. |
| Funciones públicas del comprador (`crear_solicitud_pedido`, `pedir_aviso`, `registrar_aaah`, `catalogo_publico`, `ver_solicitud`) | Son del visitante, no de un miembro. |
| `crear_tienda` | Ya no es ejecutable por `authenticated` (decisión de Planning): una tienda nueva solo nace de un enlace de Deslizapp (`crear_mi_tienda`). |

## 5. Cómo se probó

`scripts/probar-permisos-db.sql` y `scripts/probar-enlaces-concurrencia.py` (en `npm run probar:admin-db`): cada nivel por tabla, por RPC y por archivos; el extraño no ve nada; nadie cambia `nivel` directo; enlaces (un solo uso, segundo intento, vencido con reloj simulado, cancelado, aprobado con nivel, rechazado, abridor sin aprobar no lee nada); dos aperturas a la vez (bloqueo real); tienda nueva (sin enlace no se crea, tope de 3 en prueba); Ver como y permisos juntos. Planes de consulta en `pedidos` y `productos`: cada política es un «hashed SubPlan» que corre una vez por consulta. En producción solo ensayos dentro de transacciones revertidas; no se creó ningún enlace, miembro ni tienda real.
