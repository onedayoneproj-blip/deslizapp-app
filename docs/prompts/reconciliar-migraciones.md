# Reconciliar los números de las migraciones (rama `chore/reconciliar-migraciones`)

**Hazlo solo cuando el PR de `feature/catalogo-base` (catálogo conectado, parte 1) ya esté mergeado**, para no renombrar archivos mientras otra rama agrega migraciones.

## El problema

Supabase reconoce cada migración por su número (`version`). Muchos archivos de `supabase/migrations/` tienen un número distinto al que Supabase guardó cuando se aplicaron. El SQL es el mismo (Codex lo comparó el 1 oct: las funciones y restricciones de producción coinciden con el repo), pero cualquier herramienta que compare (`supabase migration list`, `supabase db push`, ramas de Supabase, una base nueva) creería que faltan y trataría de correrlas otra vez contra producción. **Esta tarea solo cambia nombres de archivos del repo. No toca la base de datos, ni su historial, ni datos.**

Estado al 3 oct (archivo del repo → versión en Supabase):

| Archivo hoy | Versión en Supabase (nombre) | Qué hacer |
|---|---|---|
| `20260929000001_esquema.sql` | `20260929225904` (esquema) | Renombrar |
| `20260929000002_reglas_de_negocio.sql` | `20260929225916` (reglas_de_negocio) | Renombrar |
| `20260929000003_seguridad_rls.sql` | `20260929225923` (seguridad_rls) | Renombrar |
| `20260929000004_borrar_tienda_en_cascada.sql` | `20260929225946` (borrar_tienda_en_cascada) y `20260929225958` (borrar_tienda_en_cascada_diferido) | Dividir en dos (abajo) |
| `20260929000005_storage_fotos_productos.sql` | `20260930002433` (storage_fotos_productos) | Renombrar |
| `20260929000006_invitaciones.sql` | `20260930005714` (invitaciones_y_tienda_esencias_michel) | Renombrar a `20260930005714_invitaciones.sql`; agregar un comentario arriba: en producción esa migración también creó la tienda `esencias-michel` y una invitación, que a propósito no viven en el repo |
| `20260929000007_invitacion_solo_google_verificado.sql` | `20260930030854` | Renombrar |
| `20260930000008_varias_tiendas_y_marca.sql` | `20260930033049` | Renombrar |
| `20260930000009_deshacer_despacho.sql` | `20260930104446` | Renombrar |
| `20260930000010_registrar_venta_pasada.sql` | `20260930105027` | Renombrar |
| `20260930000011_editar_y_eliminar_pedido.sql` | `20260930111743` | Renombrar |
| `20260930000012_promos_limite_usos_y_pausa.sql` | `20260930112911` | Renombrar |
| `20260930000013_estado_del_catalogo.sql` | `20260930135129` | Renombrar |
| `20260930000014_credito_y_abonos.sql` | `20260930150901` | Renombrar |
| `20261002161112_borrar_cliente.sql` | `20261002161112` | Ya coincide |
| `20261002203414_ajustes_inventario.sql` | `20261002203414` | Ya coincide |
| `20261002223718_guardar_producto_inventario.sql` | `20261002223718` | Ya coincide |
| `20261003030000_editar_abono.sql` | `20261003030938` | Renombrar |
| `20261003150000_clientes_nota_60.sql` | `20261003143009` | Renombrar |
| `20261003170000_reponer_stock.sql` | `20261003164245` | Renombrar |
| `20261003200000_jugadas_codigos_y_envios.sql` | `20261003200000` | Ya coincide |

Las del catálogo conectado (parte 1) ya deberían haber entrado con su número de Supabase; compruébalo.

**Antes de renombrar, vuelve a sacar la lista con `list_migrations`** (proyecto `euihaeyfdlpvmbtfzvnt`) y usa esa, no esta tabla, si algo cambió.

## El archivo 04, en dos

Producción aplicó la regla de borrado en dos pasos y el repo los juntó en uno. Sácalos del historial de Supabase (`select version, name, statements from supabase_migrations.schema_migrations where version in ('20260929225946','20260929225958')`) y deja dos archivos con ese SQL exacto:
- `20260929225946_borrar_tienda_en_cascada.sql`
- `20260929225958_borrar_tienda_en_cascada_diferido.sql`

El resultado final (la restricción `DEFERRABLE INITIALLY DEFERRED`) es el mismo de hoy.

## Reglas para adelante

Agrega a `AGENTS.md`, en una sección propia que no toque el bloque de Next.js:
- Toda migración nueva se aplica en Supabase y el archivo del repo lleva **la versión que Supabase le puso** (verla con `list_migrations`). Nunca un número inventado.
- No se edita una migración ya aplicada: se crea otra.
- Los datos reales de tiendas (crear una tienda, invitar a alguien) no van en migraciones del repo.

## Comprobación

- Un script (`scripts/revisar-migraciones.mjs`) que compara los nombres de `supabase/migrations/` con la lista de Supabase (por la API o con un JSON que pegues de `list_migrations`) y falla si una versión del repo no está en Supabase o al revés. Córrelo y pon el resultado en el PR: tiene que dar cero diferencias.
- Si el entorno tiene Docker y la CLI de Supabase: `supabase db reset` en local con la cadena renombrada, para confirmar que corre de punta a punta. Si no se puede, dilo en el PR.
- No corras `supabase db push`, ni `migration repair`, ni nada que escriba en producción.
- `npm run lint`, `npm run build`, `npm test`.

## Cierre

PR contra `main` con la tabla viejo → nuevo y el resultado del script. Si todo pasa, merge (squash) y borra la rama. Si algo no cuadra con la lista de Supabase, deja el PR abierto y explícalo.
