# Ver como: que la base bloquee las escrituras (rama `fix/ver-como-bloqueo`)

> **Modelo:** en Claude Code, **Opus 5.5**; en Codex, el modelo top con razonamiento alto. Es seguridad y permisos en la base compartida. **No hagas merge:** deja el PR abierto con su preview y las pruebas, y Planning mergea cuando Lewis lo diga. Una migración a la vez; antes de aplicar cualquiera, pregunta a Lewis si otra sesión está a mitad de un cambio.

## 0. Antes de empezar

Lee `docs/00-contexto-del-proyecto.md` (reglas de migraciones y «Dos Coding en paralelo»), `AGENTS.md`, `HANDOFF.md`, `docs/13-admin.md` §6 y `docs/handoffs/admin-tiendas-codex.md`. Tu puesto es **Coding**. Mira las migraciones `20261006012434_admin_base.sql` (`sesiones_ver_como`, `tiendas_que_miro()`, `admin_viendo()`), `20261006013309_admin_funciones_hoy_y_tiendas.sql` (`admin_ver_como_iniciar/terminar`) y `20261006111233_admin_ver_como_validar.sql`. Trabaja desde `main` actualizado.

## 1. El problema

Ver como es «solo mirar», pero hoy lo frena únicamente la app (`soloMirar`). La base no lo impide: un admin que además es **dueño o miembro** de la tienda que mira (Lewis en Esencias Michel y en la tienda de ensayo) conserva en SQL todos sus permisos de escritura. Basta otra pestaña, otra ruta o una herramienta para cambiar algo mientras «solo mira». Hay que cerrarlo **en la base**.

## 2. La regla

Mientras un admin tenga una sesión de Ver como **vigente** (sin `fin` y sin vencer) sobre una tienda, **ninguna escritura sobre los datos de esa tienda debe pasar con su cuenta**, sea por tabla, por RPC o por archivos. Solo esa tienda: sus otras tiendas y las demás cuentas no cambian. Al terminar o vencer la sesión, todo vuelve a funcionar sin hacer nada más.

Las acciones propias del admin (`admin_*`, incluidos `admin_ver_como_iniciar/terminar` y la anotación en `registro_admin`) **no se bloquean**: no son «escribir como la tienda».

## 3. Cómo (la forma, tú decides los detalles tras auditar)

1. **Una función de apoyo**, p. ej. `public.exigir_no_viendo(p_tienda_id uuid)`: lanza `solo_mirar` (errcode `42501`, mensaje claro) si `p_tienda_id in (select public.tiendas_que_miro())`. Una sola definición, `set search_path = ''`, sin permiso de ejecución para `anon`.
2. **Tablas:** a toda tabla de la tienda con escritura para miembros, suma una política **`as restrictive`** para `insert`, `update` y `delete` que exija `not (tienda_id in (select public.tiendas_que_miro()))` (con el nombre real de la columna de cada tabla; las que cuelgan de otra por `producto_id` o similar, por su relación). Las políticas permisivas existentes no se tocan ni se reducen.
3. **RPC `security definer`** (saltan RLS): las políticas no las frenan. Haz una **auditoría completa**: lista cada función de `public` que escribe y puede llamar un miembro (guardar producto, inventario, pedidos, clientes, pagos de la tienda, retoque `pedir_retoque`, créditos que gasta la tienda, personalización, equipo, colaboradores, `crear_*`, `eliminar_*`, etc.) y añade `perform public.exigir_no_viendo(<tienda>)` al inicio de cada una. Guarda la tabla de la auditoría en `docs/handoffs/ver-como-bloqueo-auditoria.md` (función, tabla que escribe, cómo resuelve la tienda, cuál quedó cubierta y cuál no hace falta, con el porqué). No reescribas cuerpos enteros de funciones por gusto: edita lo mínimo con `create or replace`, respetando firma, permisos y `search_path` actuales.
4. **Archivos (Storage):** las políticas de escritura de los buckets de la tienda (fotos y videos de productos, logo, comprobantes de la tienda si los sube ella, `marca-referencias` si ya está aplicado) también se bloquean para la carpeta de la tienda que se mira.
5. **Lo que no hay que bloquear:** lecturas (`select`), las `admin_*`, y las funciones de uso público del comprador (pedido del catálogo, «Avísame», likes), que no usan la sesión del admin.
6. **Lo que escriba a futuro** (Mi marca, suscripciones, onboarding) debe llamar a la misma función. Déjalo escrito como regla permanente en `docs/13` §6 y en `HANDOFF.md`.

## 4. Migración y datos

- Migración nueva (nunca edites una aplicada), probada primero en `BEGIN; … ROLLBACK;` con `execute_sql` sobre la base real, y luego en el replay (`probar:admin-db`). Se aplica con `apply_migration` y el archivo lleva la versión que asigne Supabase. `npm run revisar:migraciones` en cero diferencias. `get_advisors` sin nada nuevo.
- Si hace falta tocar muchas funciones, parte en varias migraciones pequeñas, una a la vez.
- **Ningún dato real** va en migraciones, y no abras sesiones de Ver como reales sobre tiendas para probar: ensaya dentro de `BEGIN … ROLLBACK`. Después de aplicar, comprueba que el panel y el catálogo de Esencias Michel siguen normales (leer, y una escritura inocua que no deje rastro, solo si Lewis lo autoriza).

## 5. Pruebas (en el replay y con scripts, sin tocar tiendas reales)

Con un usuario que es **admin y dueño** de la tienda A y miembro de la tienda B:
- Sin sesión abierta: escribe en A y B como siempre.
- Con sesión sobre A: **toda** escritura sobre A falla con `solo_mirar` (cada tabla con política restrictiva, cada RPC de la auditoría, subir y borrar archivos); sobre B sigue funcionando; las lecturas de A funcionan; `admin_ver_como_terminar` y el resto de `admin_*` funcionan.
- Sesión terminada y sesión vencida: vuelve a escribir en A.
- Un admin sin ser miembro de A, con sesión sobre A: lee y no escribe (como hoy).
- Un miembro común (no admin): sin cambios y sin costo visible (mira el plan de consultas de las políticas nuevas en las tablas grandes, `pedidos` y `productos`).
- La app: con Ver como activo, intenta guardar un producto desde otra pestaña normal del mismo usuario y comprueba que falla con un mensaje entendible en la voz de `docs/11` («Estás mirando esta tienda; aquí no se cambia nada. Sal de Ver como para editar.»), sin romper la pantalla.

## 6. Cierre

- `docs/13` §6 actualizado (ya no dice que solo lo frena la app), `docs/00` en «Admin parte 2» quita el «Pendiente», y la auditoría en `docs/handoffs/`.
- `tsc`, `npm test`, `npm run lint` (sin advertencias nuevas), `npm run build` y los `scripts/probar-*` que toquen lo cambiado.
- **PR abierto, sin merge.** En el PR: la tabla de la auditoría resumida, qué se probó y qué no (por ejemplo Safari del iPhone o Google real), y qué debe probar Lewis: abrir Ver como en Esencias Michel y, desde otra pestaña del panel normal, intentar guardar algo.
- Resume en español, corto.
