# Admin, parte 1: base y capa de datos (rama `feature/admin-base`)

> **Modelo:** en Codex, el más alto con razonamiento alto. En Claude Code, Opus 5.5. Es la parte con más riesgo: seguridad, RLS y dinero.

## 0. Antes de empezar

Lee:
- `docs/00-contexto-del-proyecto.md`, `AGENTS.md` y `HANDOFF.md`. Tu puesto es **Coding**.
- **`docs/13-admin.md` completo.** Es la especificación que manda.
- `referencias/admin/LEEME.md` y las capturas de `referencias/admin/capturas/`, para entender qué datos necesita cada pantalla.
- `docs/07-fase-2-cuentas-y-cobros.md` (cobros manuales y créditos por movimientos).
- Las migraciones de `supabase/migrations/`, `lib/data/fuente.ts`, `lib/data/supabase.ts`, `lib/data/demo.ts`, `lib/types.ts` y `lib/config.ts`.

Rama `feature/admin-base` desde `main` actualizado. **Esta parte no hace pantallas.**

## 1. Migraciones

Una o varias migraciones nuevas con lo de `docs/13-admin.md` §5:
- **Tablas:** `admins`, `planes`, `precios_extra`, `pagos`, `movimientos_creditos`, `trabajos_retoque`, `registro_admin`, `admin_pospuestos`, `funciones_tienda` y `sesiones_ver_como`.
- **Columnas nuevas en `tiendas`:** `pagado_hasta`, `dias_gracia`, `prueba_hasta`, `catalogo_paso_en` y `ultima_actividad_en`.
- **Columna nueva en `miembros`:** `ultima_entrada_en`.

Reglas:
- **`planes`:**
  - La migración crea `p20`, `p60`, `p100` y `custom` con sus límites actuales (20, 60, 100, null), `creditos_mensuales = 100` y `precio_mensual = null`.
  - `tiendas.plan` pasa a ser una referencia a `planes(id)`: quita el `check` fijo.
  - Es configuración del producto, así que sí va en la migración. Básico y Pro **no**: Lewis los crea desde el admin.
- **`movimientos_creditos`:**
  - Un trigger mantiene `tiendas.creditos_retoque` como la suma de los movimientos.
  - Para el saldo actual de cada tienda, crea un movimiento inicial tipo `ajuste` con motivo «saldo al empezar el registro», para que la suma coincida con lo que tiene hoy.
  - `gastar_creditos` (las dos firmas) sigue funcionando, pero ahora inserta un movimiento en vez de restar directo.
- **`pagos` y `registro_admin`:** solo se insertan. Sin `update` ni `delete` para ningún rol (revoca y comprueba).
- **`trabajos_retoque`:** un pendiente por (producto, foto) a la vez.
- **Bucket privado `comprobantes`:** solo los admin leen y escriben. Bucket `retoques` para las fotos retocadas, o una carpeta dentro de `productos`; elige y explícalo.
- **Datos reales** (el primer admin, el `pagado_hasta` de Esencias Michel): **no** van en migraciones. Escribe `scripts/sql/admin-primer-admin.sql` con el correo como parámetro, y di en el PR que Lewis tiene que correrlo (o córrelo tú si Lewis te da el correo en la conversación).

Aplica cada migración en Supabase (proyecto `euihaeyfdlpvmbtfzvnt`), renombra el archivo a la versión que Supabase le puso (`list_migrations`) y comprueba que `npm run revisar:migraciones` da cero diferencias.

## 2. Seguridad

- `soy_admin()`: `security definer`, `set search_path = ''`, `stable`. Busca `auth.uid()` en `admins`.
- **Todas las funciones `admin_*`** son `security definer`, empiezan con `if not public.soy_admin() then raise exception 'no_admin' using errcode = '42501'`, y se dan solo a `authenticated` (revoca de `public` y `anon`).
- Cada `admin_*` que cambia algo escribe su fila en `registro_admin` en la misma transacción.
- **«Ver como» (docs/13 §6):**
  - `admin_viendo(tienda_id)` es cierto solo con una sesión vigente del admin actual para esa tienda.
  - Suma `or public.admin_viendo(tienda_id)` **solo a las políticas de `select`** de las tablas de la tienda: tiendas, productos, producto_variantes, pedidos, pedido_items, clientes, abonos, promos, eventos_aaah, solicitudes_pedido, avisos_llegada, ajustes_inventario, jugada_envios y miembros.
  - **No toques las de escritura.**
- El admin no se vuelve miembro de ninguna tienda.
- Corre los advisors de seguridad de Supabase después y deja en el PR que no hay nuevos avisos (o explica cada uno).

## 3. Funciones

Todas con contrato claro: argumentos, retorno en `jsonb` o `setof` y errores con nombre.

| Función | Qué hace |
|---|---|
| `marcar_actividad(p_tienda_id)` | (miembro) Actualiza `ultima_actividad_en` y `ultima_entrada_en`. Si ya se marcó hace menos de 10 minutos, no hace nada. |
| `admin_resumen_mes()` | Los 4 números de Hoy y lo de la tarjeta de Cobros. |
| `admin_hoy()` | Los asuntos de docs/13 §4.1, sin los pospuestos vigentes. Umbrales en una función o tabla de constantes, no repetidos. |
| `admin_posponer(p_clave, p_horas default 24)` | «Mañana». |
| `admin_tiendas(p_filtro, p_busqueda)` | Una fila por tienda con estado, plan, estado de cobro, salud (§4.3) y motivo principal. Ya ordenadas. |
| `admin_tienda(p_tienda_id)` | Todo lo de la ficha: cuenta, 30 días, catálogo, equipo con última entrada, últimos eventos y MB en almacenamiento. |
| `admin_ver_como_iniciar(p_tienda_id)` / `admin_ver_como_terminar(p_sesion_id)` | §6. |
| `admin_catalogo_avanzar(p_tienda_id, p_accion)` | `empezar` (solicitado → generando paso 1), `siguiente` (paso + 1) y `a_revisar` (paso 3 o cambios → revisar). Rechaza transiciones inválidas. Guarda `catalogo_paso_en`. |
| `admin_guardar_personalizacion(p_tienda_id, p_cambios jsonb)` | Merge en `personalizacion` (tema, mensajes, secciones), `productos.orden` y `productos.opiniones`. Valida igual que la base (`opiniones_validas`, largos, colores hex). |
| `pedir_retoque(p_producto_id, p_medio_url)` | (miembro) Crea el trabajo pendiente si el saldo libre alcanza. Saldo libre = saldo menos los pendientes. |
| `admin_retoque_entregar(p_trabajo_id, p_url_retocada)` / `admin_retoque_devolver(p_trabajo_id, p_motivo)` | docs/13 §7. |
| `admin_registrar_pago(...)` | docs/13 §8. Calcula `cubre_hasta` y actualiza `pagado_hasta`. Créditos → movimiento `compra`. |
| `admin_anular_pago(p_pago_id, p_motivo)` | Inserta el pago de anulación y recalcula `pagado_hasta`. |
| `admin_ajustar_creditos(p_tienda_id, p_cantidad, p_motivo)` | El motivo es obligatorio. El saldo nunca baja de 0. |
| `admin_recarga_mensual(p_tienda_id null)` | Suma los créditos mensuales del plan una vez por mes y por tienda (idempotente por mes). |
| `admin_guardar_plan(...)` / `admin_cambiar_plan(p_tienda_id, p_plan_id, p_limite null)` | docs/13 §9. |
| `admin_cambiar_estado_tienda(p_tienda_id, p_accion)` | Pausar, reactivar, poner o cambiar la prueba (`prueba_hasta`). |
| `admin_transferir_tienda(p_tienda_id, p_email_nuevo_dueno)` | Reusa la lógica de `transferir_tienda`. |
| `admin_funcion_tienda(p_tienda_id, p_funcion, p_encendida)` | Funciones nuevas por tienda. |
| `admin_salud()` | Tamaño de `storage.objects` total y por tienda, el archivo más grande, `pg_database_size` y la actividad de hoy. |
| `admin_registro(p_filtro, p_antes_de)` | Página de 50 filas. |
| `admin_admins()` / `admin_agregar_admin(p_email)` / `admin_quitar_admin(p_usuario_id)` | No se puede quitar al último admin. |

## 4. Capa de datos

- **Archivos:** `lib/data/admin/` con `fuente-admin.ts` (el contrato), `supabase.ts` y `demo.ts`. Los tipos van en `lib/types.ts` o en `lib/admin/tipos.ts`.
- **Demo:** en modo demo, quien entra es admin. Las tiendas demo existentes sirven de datos. Suma al seed los pagos, trabajos y movimientos que hagan falta para que cada asunto de Hoy aparezca al menos una vez. Las reglas son las mismas que en la base: repítelas en TypeScript y pruébalas con los mismos casos.
- **Modo `soloMirar` de la fuente del panel** (para la parte 2):
  - Una fuente envuelve la real.
  - `getTiendas()` devuelve solo la tienda vista.
  - Cada escritura lanza `SoloMirar` sin llamar a la base.
  - La lectura usa las mismas consultas, que la base ya autoriza por `admin_viendo`.
- **Constantes:** los umbrales de Hoy en `lib/admin/reglas.ts`, iguales a los de la base. Una prueba compara las dos listas, como `tests/rubros.test.mjs`.

## 5. Comprobación

- `npm run lint`, `npm run build`, `npm test` y todos los `probar:*`.
- **Pruebas SQL con rollback** (`scripts/probar-admin-db.sql`, y súmalo al replay de migraciones si ya existe uno):
  1. Un usuario normal y `anon` no pueden llamar ninguna `admin_*`.
  2. Un admin sin sesión de «Ver como» no lee los productos de una tienda. Con sesión sí los lee, y no puede escribir nada. Al vencer la sesión ya no lee.
  3. `pagos` y `registro_admin` rechazan `update` y `delete`.
  4. El saldo de créditos es la suma de los movimientos. El saldo inicial coincide con el de antes de migrar. `gastar_creditos` sigue funcionando.
  5. Retoque: reservar, entregar (cobra) y devolver (no cobra). Sin saldo libre, no se puede pedir.
  6. Pago: la mensualidad mueve `pagado_hasta` un mes desde el máximo de hoy y la fecha anterior. Anular lo devuelve.
  7. Cada regla de `admin_hoy` aparece con su caso y desaparece cuando la condición se va. Posponer la esconde 24 h.
  8. `admin_catalogo_avanzar` rechaza saltos inválidos.
- **Pruebas en `tests/`:** las reglas en TypeScript (demo) dan lo mismo que la base para los mismos casos.
- **Advisors de seguridad y rendimiento de Supabase:** sin avisos nuevos, o cada uno explicado.

## 6. Cierre

PR contra `main` con:
- lo que se creó;
- las versiones de las migraciones;
- el SQL del primer admin y si ya se corrió;
- el resultado de cada prueba;
- el resultado de los advisors;
- las decisiones que tomaste fuera de este prompt (con el porqué).

**Déjalo abierto, sin merge,** para que Planning lo revise. Actualiza «Dónde va el trabajo» en `docs/00-contexto-del-proyecto.md`.
