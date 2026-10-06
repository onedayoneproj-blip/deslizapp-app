# Admin base: relevo de Claude por Codex

Fecha: 6 de octubre de 2026. Puesto: Coding, exclusivamente admin.
Rama: `feature/admin-base`, desde `origin/main` (`dc76745`).
PR abierto contra main: [#51](https://github.com/onedayoneproj-blip/deslizapp-app/pull/51), sin merge ni despliegue.
Checkout independiente: `/workspace/deslizapp-admin`. No se incorporó PR #45 ni se modificó el workspace de otra sesión.

## Recuperación y procedencia

No había checkout de Claude accesible en /workspace ni /tmp. La búsqueda de ramas en GitHub y el fetch de las ramas remotas tampoco encontraron `feature/admin-base`. No se recuperaron archivos ni scripts locales de Claude. Se creó la rama libre.

Sí se recuperaron los statements del historial actual de Supabase, proyecto `euihaeyfdlpvmbtfzvnt`. Los seis archivos conservan las versiones y el contenido aplicado:

- `20261006012434_admin_base`
- `20261006012533_admin_creditos_pagos_retoque`
- `20261006013009_admin_funciones`
- `20261006013309_admin_funciones_hoy_y_tiendas`
- `20261006013513_admin_funciones_trabajo_y_cobros`
- `20261006013625_admin_funciones_planes_y_admins`

Se publicaron primero, commit `c9a2563`, antes de continuar la implementación. Codex no los reaplicó, editó ni borró versiones. La consulta del historial devolvió 39 migraciones; `revisar:migraciones` dio cero diferencias de versiones. Conserva el aviso histórico de nombre de `20260930005714` (archivo invitaciones; historial invitaciones_y_tienda_esencias_michel).

Lewis ya estaba activo como admin y dueño de Esencias Michel, comprobado mediante consultas agregadas sin guardar su correo. No se repitió su alta. `scripts/sql/admin-primer-admin.sql` es una plantilla parametrizada para una base sin admins activos; **no ejecutarla ahora**.

## Lo que reconstruyó Codex

Tipos y contrato en `lib/admin/` y `lib/data/admin/`; adaptador RPC con cliente de sesión normal; demo aislada, operaciones atómicas, auditoría, pagos, créditos, retoques, planes, personalización y baja lógica. Los tipos de plan admiten identificadores configurables. No se añadieron pantallas, rutas /admin, cambios de seed compartido, novedades ni conexiones a producción desde UI.

`lib/data/solo-mirar.ts` envuelve FuenteDatos: limita tienda, rechaza toda escritura antes de acceder a la fuente real, filtra lecturas y controla cierre/vencimiento. Las pruebas cubren admin sin membresía y el perfil de Lewis admin + dueño, además de un adaptador Supabase real con cliente simulado. No fue una prueba con su sesión Google real.

La SQL aplicada conserva los permisos normales del dueño durante Ver como: Codex lo confirmó en el replay. La envoltura los bloquea en el panel, pero no revoca esos permisos en la base. La afirmación más fuerte de docs/13 §6 no describe esta SQL. Esta entrega sigue la instrucción del relevo de conservar las seis migraciones y bloquear mediante la envoltura. No confundirla con una protección contra llamadas directas de una cuenta dueña.

`quitado_en` se conserva: al retirar al admin pierde las RPC administrativas y la lectura por Ver como; permanece la fila histórica. Se probó el guard del último admin.

## Hallazgo corregido con autorización de Lewis

La función original `admin_anular_pago` fallaba al anular sucesivamente A y B: conservaba cobertura de un pago anulado. Codex lo reprodujo y Lewis autorizó corregirlo y aplicar una migración adicional, confirmando que la otra sesión no preparaba cambios incompatibles.

Aplicada **20261006030939_admin_anular_mensualidades_recalculo**; historial 40/40 sin diferencias de versiones. Conserva la cobertura previa al primer pago y reproduce todos los vigentes por numero, usando fechas RD y meses civiles originales. Demo actualizada con el mismo contrato. El saldo de créditos y sus protecciones no cambiaron. 392 secuencias SQL/demo/calendario y tres solapamientos PostgreSQL pasan. [Validación completa](../validacion-admin-anulacion.md).

Una cobertura externa posterior que no coincida con el libro rechaza la anulación con `cobertura_no_conciliada`, sin borrar cobertura ni crear registros parciales: requiere conciliación explícita. No existe otra RPC que cambie pagado_hasta. No se modificó ningún pago real; producción tenía y conserva cero pagos/coberturas. La migración cambia función y ACL, sin reparar datos. La propuesta con guard sigue siendo ensayo desechable, nunca ejecutar ese script en producción.

Antes de futuras migraciones: list_migrations y revisión remota, coordinación explícita con Lewis (la lista no es un bloqueo), ensayo desechable. Nunca editar los seis originales ni la nueva migración aplicada ni borrar historial.

## Validación y siguientes pasos

### Seguimiento posterior: runner de inventario

El replay dejó de estar pendiente: su comprobación de permisos apuntaba a la firma antigua de cinco argumentos. En main `a07acfc`, la migración de variantes define seis argumentos; `p_variante_id uuid DEFAULT NULL` es el sexto y selecciona la variante. El replay completo reprodujo el error exacto y pasó al cambiar solo la firma consultada por `has_function_privilege`. Las invocaciones de cuatro argumentos siguen siendo compatibles por defaults. Véase el addendum de [validación de anulación](../validacion-admin-anulacion.md). Sin cambios a funciones/migraciones o datos de producción.

Resultados propios, límites y advisors: [validacion-admin-base.md](../validacion-admin-base.md). Claude había reportado replay, pruebas SQL y comparación TypeScript/Postgres; sus scripts no estaban accesibles y esos reportes no se cuentan como validaciones de Codex.

Planning debe revisar este PR abierto contra main, especialmente el contrato corregido de cobertura, su límite de conciliación externa y el alcance real de Ver como. Las partes 2–4 siguen pendientes. La parte 2 deberá crear una FuenteDatos fresca para la tienda vista, envolverla y terminar la sesión SQL al salir; no reutilizar una caché de otra tienda ni presentar acciones que escriban. Cuando exista Cobros, Lewis podrá comprobar anulaciones en demo y su historial; no hay pantalla que deba validar ahora.

**Para Claude al volver:** Codex tomó el relevo y aplicó también la corrección 20261006030939. Leer este handoff, la validación de anulación, el PR y el estado remoto antes de continuar. Hacer fetch y trabajar desde el nuevo HEAD de `origin/feature/admin-base` en un checkout independiente. No empujar la copia antigua encima de Codex, no hacer force push, no reaplicar las siete migraciones admin ni repetir el alta de Lewis. Si aparecen archivos antiguos, comparar y rescatar solo cambios ausentes mediante commits nuevos.
