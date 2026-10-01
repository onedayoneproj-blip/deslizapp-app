# Reconciliación del historial de migraciones

Preparada el 2026-10-01 a partir de `deslizapp-migration-investigation.md`.
Base revisada: `main` en `2edffe16e973a7a8c1a773481444392bb7f0e92c`.
Al iniciar el trabajo, GitHub seguía en ese mismo SHA; no había cambios posteriores que integrar.
Rama de revisión: `chore/reconcile-production-migrations`. No fusionar sin revisar los límites abajo.

## Alcance y entornos

Solo es accesible producción: proyecto Supabase `euihaeyfdlpvmbtfzvnt` (`deslizapp`).
El conector devuelve un proyecto y ninguna rama de desarrollo. No se encontró otra base
accesible de desarrollo o staging. Las bases locales de otras sesiones de **Claude Code y
Codex permanecen desconocidas**, igual que proyectos fuera del alcance del conector.
La base Docker creada para esta validación es nueva y desechable; no es un entorno previo inventariado.

**Para otras sesiones:** antes de usar estos archivos en una base existente, leer su historial.
Si usa los identificadores antiguos, este cambio produciría un conflicto de seguimiento:
la herramienta podría considerar pendientes cambios que ya están instalados. No aplicar la cadena
renombrada allí ni reparar historiales automáticamente. Inventariar, comparar el esquema y acordar
una reconciliación separada; una base desechable se puede recrear solo con autorización para perder sus datos.
No se confirmó ningún entorno que use los identificadores antiguos. Esta incertidumbre sigue abierta
antes de la fusión, pero no impide preparar y revisar esta rama.

## Identificadores canónicos

Todos los archivos de la tabla viven en `supabase/migrations/`. Los nuevos nombres reproducen
exactamente las 15 versiones y nombres existentes en producción. El antiguo archivo 04 se
sustituye por los dos pasos históricos: primero `NO ACTION`, después `DEFERRABLE INITIALLY DEFERRED`.

| Archivo anterior en el SHA revisado | Archivo reconciliado (en supabase/migrations/) | Clasificación del informe |
|---|---|---|
| `20260929000001_esquema.sql` | `20260929225904_esquema.sql` | Solo historial; SQL equivalente |
| `20260929000002_reglas_de_negocio.sql` | `20260929225916_reglas_de_negocio.sql` | Solo historial; SQL equivalente |
| `20260929000003_seguridad_rls.sql` | `20260929225923_seguridad_rls.sql` | Solo historial; SQL equivalente |
| `20260929000004_borrar_tienda_en_cascada.sql` | `20260929225946_borrar_tienda_en_cascada.sql` | Historial y comportamiento intermedio; resultado final equivalente |
| Antes incluido en el archivo 04 | `20260929225958_borrar_tienda_en_cascada_diferido.sql` | Segundo paso; SQL equivalente al antiguo 04 |
| `20260929000005_storage_fotos_productos.sql` | `20260930002433_storage_fotos_productos.sql` | Solo historial; SQL equivalente |
| `20260929000006_invitaciones.sql` | `20260930005714_invitaciones_y_tienda_esencias_michel.sql` | Historial y datos propios de producción; esquema equivalente |
| `20260929000007_invitacion_solo_google_verificado.sql` | `20260930030854_invitacion_solo_google_verificado.sql` | Solo historial; SQL equivalente |
| `20260930000008_varias_tiendas_y_marca.sql` | `20260930033049_varias_tiendas_y_marca.sql` | Solo historial; SQL equivalente |
| `20260930000009_deshacer_despacho.sql` | `20260930104446_deshacer_despacho.sql` | Solo historial; SQL equivalente |
| `20260930000010_registrar_venta_pasada.sql` | `20260930105027_registrar_venta_pasada.sql` | Solo historial; SQL equivalente |
| `20260930000011_editar_y_eliminar_pedido.sql` | `20260930111743_editar_y_eliminar_pedido.sql` | Solo historial; SQL equivalente |
| `20260930000012_promos_limite_usos_y_pausa.sql` | `20260930112911_promos_limite_usos_y_pausa.sql` | Solo historial; SQL equivalente |
| `20260930000013_estado_del_catalogo.sql` | `20260930135129_estado_del_catalogo.sql` | Solo historial; SQL equivalente |
| `20260930000014_credito_y_abonos.sql` | `20260930150901_credito_y_abonos.sql` | Solo historial; SQL equivalente |

## Diferencia intencional de datos

La versión `20260930005714_invitaciones_y_tienda_esencias_michel.sql` conserva el nombre
histórico, pero solo contiene el esquema reutilizable. El SQL guardado en producción también
creó la tienda Esencias Michel e invitó un correo real. Esos dos registros no se incluyen
ni se insertan otra vez. Su estado actual no se investigó: una invitación puede consumirse.
La base nueva queda sin tiendas ni invitaciones y requiere aprovisionamiento propio.
El bucket compartido `productos` sí es configuración reutilizable y se conserva.

La explicación respaldada por el informe es que se aplicó SQL con versiones de fecha y hora,
y después se copió al repositorio con números ordenados y un arreglo consolidado. El primer
commit `1bed30edcb00ae012c5a0344d2714ebb652f5e56` ya contenía el arreglo diferido.
No se sabe qué persona o herramienta ejecutó cada cambio. El modo demo JSON/localStorage
es intencional y no hay evidencia de que causara esta divergencia.

## Validación realizada

- Historial de producción leído por conector y SQL: los 15 pares versión/nombre coinciden
  exactamente con los archivos reconciliados; ningún archivo tiene una versión pendiente
  frente a esa lectura. Esto es una comparación de historial, **no una ejecución del CLI**.
- Cadena completa reproducida en PostgreSQL 17.6 vacío, Docker `postgres:17.6-alpine`,
  digest `sha256:ef257d85f76e48da1c64832459b59fcaba1a4dac97bf5d7450c77753542eee94`.
  Contenedor sin red (`--network none`), sin credenciales ni conexión a producción.
  Cada migración corrió en su propia transacción con `ON_ERROR_STOP=1`: 15/15 correctas.
- La base mínima reproduce dependencias de Auth/Storage y privilegios predeterminados de
  `public` observados por lectura en producción. El intento de imagen completa de Supabase
  falló por espacio en Docker; se usó PostgreSQL con esta base explícita, sin afirmar una
  validación de toda la plataforma Supabase.
- Comparación de 296 elementos: 116 columnas, 85 restricciones, 32 índices, 16 políticas
  (12 públicas y 4 de fotos), 7 disparadores (incluido Auth), 28 funciones y 12 relaciones
  (11 tablas y una vista). Sin diferencias estructurales. En 12 cuerpos de funciones solo
  difieren espacios/comentarios; se compararon tokens conservando literales SQL.
  Incluye RLS, opciones de la vista, configuración de funciones, parámetros y seguridad del definidor.
- Comparación adicional de 80 filas de permisos efectivos de tablas/vista y funciones para
  `anon` y `authenticated`: coinciden al reproducir los valores predeterminados de Supabase.
- Aserciones locales: 11 tablas con RLS, clave de producto diferida, vista de saldo con
  `security_invoker=true`, bucket correcto y ninguna tienda/invitación de producción creada.
- `npm test`: 10 archivos de pruebas aprobados. `npm run lint`: aprobado.
  No hay cambios ejecutables en la aplicación: solo dos referencias en comentarios.
  Se preservan `useData()`, demo y real; no se cambiaron rutas, layouts, hojas ni teclado.

### Hallazgo de permisos existente

Sin los valores predeterminados de Supabase, el primer replay de PostgreSQL producía dos
diferencias de permisos sobre `public.miembros`. La lectura confirmó que producción concede
permisos amplios a `anon` y `authenticated`, incluido `TRUNCATE`; el esquema tiene RLS y políticas
coincidentes. Los valores predeterminados de `public` explican la diferencia y el segundo replay
con esa base coincide. Este PR no altera esos permisos. `TRUNCATE` no está protegido por RLS;
conviene revisar los privilegios en una tarea aparte. No se probó una explotación ni acceso
entre tiendas, y este hallazgo no demuestra un fallo en el aislamiento de las consultas habituales.

### Bloqueado o no verificado

- **`supabase db push --dry-run` dirigido a producción: bloqueado y no ejecutado.**
  El entorno no tiene credenciales CLI de producción (token/contraseña/conexión autorizada).
  El acceso del conector no proporciona esas credenciales. No se sustituyó por un push real
  ni una reparación del historial. La igualdad de versiones sugiere que no habría migraciones
  existentes por aplicar; falta confirmar el resultado real del CLI antes de fusionar.
- Otras bases locales y entornos no accesibles: pendientes de inventario por Claude Code/Codex.
- No se ejercitaron RPC con datos, login Google, subida de fotos, API, ni plataforma completa.
  La comparación no incluye propietarios, ACL de todos los roles, extensiones, objetos internos
  administrados por Supabase o configuración de servicios. No equivale a una auditoría completa.
- No se ejecutó build ni pruebas de navegador/teclado/hojas: no hay cambios de comportamiento o UI.

## Repetir la validación local

Solo para una base Docker nueva y desechable. El archivo `base-desechable.sql` no es una
migración de la aplicación y **no debe ejecutarse contra un proyecto remoto**.

```bash
docker run --name deslizapp-migration-replay --network none \
  -e POSTGRES_PASSWORD=disposable-replay-only -d postgres:17.6-alpine
# Esperar a que docker exec deslizapp-migration-replay pg_isready -U postgres indique listo.
docker exec -i deslizapp-migration-replay psql -U postgres -v ON_ERROR_STOP=1 \
  < scripts/migraciones/base-desechable.sql
for migration in supabase/migrations/*.sql; do
  docker exec -i deslizapp-migration-replay psql -U postgres \
    -v ON_ERROR_STOP=1 --single-transaction < "$migration" || exit 1
done
docker exec -i deslizapp-migration-replay psql -U postgres -v ON_ERROR_STOP=1 \
  < scripts/migraciones/verificar-replay.sql
docker exec -i deslizapp-migration-replay psql -U postgres -tA -v ON_ERROR_STOP=1 \
  < scripts/migraciones/comparar-esquema.sql > /tmp/esquema-local.json
docker exec -i deslizapp-migration-replay psql -U postgres -tA -v ON_ERROR_STOP=1 \
  < scripts/migraciones/comparar-permisos.sql > /tmp/permisos-local.json
```

Ejecutar `comparar-esquema.sql` en producción únicamente por lectura y guardar el valor JSON
`esquema` como `/tmp/esquema-produccion.json`; no guardar la envoltura del conector.

```bash
node scripts/migraciones/comparar-esquema.mjs /tmp/esquema-local.json /tmp/esquema-produccion.json
```

Hacer lo mismo con el JSON `permisos` de `comparar-permisos.sql` y comparar los dos arrays.
Las consultas no leen filas de clientes, pedidos, tiendas ni correos. Los snapshots de esta
sesión se usaron temporalmente fuera del repositorio; no se copió información de aprovisionamiento.

Para el historial, usar esta consulta de lectura y comparar con los nombres de archivos:

```sql
select version, name from supabase_migrations.schema_migrations order by version;
```

**Pendiente, no realizado:** con credenciales CLI autorizadas, ejecutar exclusivamente
`supabase db push --dry-run --db-url "$DESLIZAPP_PRODUCTION_DB_URL"` y confirmar que no lista
migraciones para aplicar. No quitar `--dry-run`, no usar `migration repair` y no resetear producción.
Evitar exponer la URL/contraseña en reportes o logs.

## Publicación y siguiente paso

No se aplicaron migraciones ni cambios de datos/esquema/historial en producción. Solo se escribió
SQL en las dos bases desechables creadas durante la validación. Este trabajo no tiene cambio visible
para el dueño de tienda y no requiere entrada en `lib/novedades.ts`.

`vercel.json` desactiva despliegues Git únicamente para `chore/reconcile-production-migrations`,
para poder subir la rama y abrir el PR sin desplegar. No cambia la regla de publicación de `main`.
Mantener el PR sin fusionar. Revisar el mapa, confirmar el historial de otras sesiones y completar
el dry run pendiente; después decidir la fusión mediante un prompt explícito.
