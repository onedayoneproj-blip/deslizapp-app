# Validación de admin base por Codex

6 de octubre de 2026. Sin pantallas, merge ni despliegue. Procedencia y decisiones: [handoff](handoffs/admin-base-codex.md).

Actualización autorizada: anulación encadenada corregida y aplicada como **20261006030939_admin_anular_mensualidades_recalculo**, historial 40/40, sin tocar pagos reales. [Contrato y validación ampliada](validacion-admin-anulacion.md). Los resultados iniciales que siguen se conservan como historia de la primera entrega.

## Pruebas propias

Se ejecutaron en el checkout independiente actualizado con origin/main. Los resultados previos reportados por Claude no se usan como evidencia.

| Comprobación | Resultado y alcance |
| --- | --- |
| Historial Supabase / revisar:migraciones | 39/39 versiones, cero diferencias; seis SQL recuperadas del historial, ninguna reaplicada |
| Replay PostgreSQL 17.6 | Las 39 migraciones en una base desechable; saldo previo conservado y suma de movimientos igual al saldo |
| Seguridad SQL con rollback | anon y usuario normal rechazan todas las RPC administrativas; admin sin membresía solo lee con sesión vigente; escritura denegada; vencimiento y baja lógica revocan acceso |
| Inmutabilidad | pagos y registro_admin rechazan UPDATE/DELETE para authenticated, postgres y service_role |
| Dinero y retoques | Reserva, falta de saldo libre, duplicados, entrega con cargo, devolución sin cargo, dos firmas gastar_creditos, recarga mensual idempotente, mensualidades y reversión |
| Hoy, personalización y transiciones | 12 reglas aparecen y se resuelven; posponer 24 h; merge y validación; saltos de catálogo inválidos rechazados |
| TypeScript contra SQL | 33 estados compartidos × 3 usos de almacenamiento; claves, datos, prioridad, acciones y fechas; constantes y límites exactos; 40 definiciones/ACL/search_path comparadas con producción |
| soloMirar | Todas las escrituras del contrato actual y método futuro bloqueados sin llamar a la fuente; admin sin membresía y admin dueño; aislamiento, privacidad, cierre y vencimiento durante lectura |
| Regresión SQL compartida | Eliminar producto, catálogo React, pedidos, disponibilidad y dos casos de concurrencia pasan en el replay |
| npm test | 239 pruebas pasan, cero fallos |
| npm run lint | Cero errores; 27 advertencias existentes de la app |
| npm run build / TypeScript | Build de producción y comprobación de tipos pasan |
| Navegador | Inicio del build carga, muestra entrada/demo/enlaces legales; comprobación también en main independiente. No hay UI admin en esta parte |

El replay reproducible es `npm run probar:admin-db` (requiere Docker, Node y Python). Crea y elimina su contenedor; no conecta a producción. Las pruebas SQL usan rollback y datos ficticios. El snapshot de funciones de producción contiene metadatos de funciones, no usuarios.

Todos los scripts `probar:*` del package.json se ejecutaron:

| Script | Resultado |
| --- | --- |
| probar:teclado | Pasa, conserva nodo/foco y sin errores de página |
| probar:hojas | Pasa, hojas apiladas y aviso al salir |
| probar:inventario | Pasa, stock/variantes y presentación sin errores |
| probar:pedido-catalogo | 78/78 casos pasan |
| probar:pedido-catalogo-transporte | 17/17 casos pasan, Supabase/OAuth simulados; requiere dev por su ruta temporal |
| probar:admin-db | Pasa el replay y las comprobaciones SQL descritas arriba |
| probar:pedido-catalogo-db | Pasa el replay previo con disponibilidad/concurrencia |
| probar:producto | Matriz completa 41/42: timeout aislado al publicar medios, 360/claro. Ese único caso pasa al repetirlo en el build final y también en main independiente. Los otros 41 pasan |

No se presenta la primera ejecución de producto como íntegramente verde. No se reprodujo el timeout en la repetición; no se modificó UI ni el script compartido para esconderlo. Durante preparación se descartaron ejecuciones con el servidor apuntando a un build reemplazado o sin configuración ficticia de transporte. El build final se generó después de eliminar la ruta temporal, que no se publicó.

## Contrato para la parte 2

Crear `crearFuenteAdminSupabase(cliente)` con el cliente autenticado del usuario; nunca service_role. El adaptador transforma columnas snake_case a camelCase, conservando las claves internas de JSON de personalización, funciones, datos y detalle. Los errores mantienen el nombre SQL en ErrorAdmin.

Llamar `iniciarVerComo(tiendaId)`, crear una FuenteDatos fresca y pasarla a `soloMirar(fuente, sesion)`. Al salir llamar `cerrar()`, desechar la fuente y `terminarVerComo(sesion.id)`. La envoltura no finaliza automáticamente la sesión SQL. Los permisos de dueño en la base permanecen, por diseño de las migraciones recuperadas; las llamadas del panel deben atravesar siempre la envoltura.

La demo tiene estado independiente basado en las tiendas demo existentes y casos adicionales para cada regla de Hoy. No altera localStorage ni el seed del panel. El reloj es inyectable. Los importes comerciales no se inventan y los precios iniciales siguen null. Salud/almacenamiento demo es sintético; no simula proveedores externos ni uploads reales.

La decisión de almacenamiento ya aplicada por Claude se conserva: comprobantes privado (ruta tienda/archivo, admins) y retoques como bucket público de imágenes que el catálogo puede mostrar, con subida/cambio solo admin. Esta parte consume las rutas/URLs mediante RPC; la interfaz de upload corresponde a las siguientes partes.

## Límites y decisiones

- El defecto original de anulación encadenada quedó corregido con la séptima migración admin autorizada. La cobertura externa no conciliada se protege rechazando la anulación; ver validación ampliada. Las pantallas de Cobros siguen pendientes.
- Se mantienen las reglas aplicadas aunque haya diferencias con textos anteriores: prueba sin fecha continúa en_prueba; meses usan calendario con ajuste de fin de mes; salud quieta es fallback; uso de fotos agregado y claves de plataforma estables. La comparación prueba estas decisiones.
- Reducir el límite de un plan no oculta productos; los identificadores configurables están en los tipos admin. El panel existente todavía tiene su configuración de planes hasta su integración posterior.
- No se probó Google real, la cuenta real de Lewis ni Safari; la protección del perfil admin/dueño se verifica con fixtures y llamadas interceptadas antes del cliente.
- No se ejecutó alta inicial ni se cambió pagado_hasta de una tienda real.

## Advisors actuales

Consulta de producción de solo lectura después de recuperar las seis migraciones. No existe un snapshot anterior a Claude: no se afirma ausencia de avisos nuevos respecto a su trabajo. Codex no añadió DDL en producción. Detalles completos, cada entidad y enlaces de remediación: [admin-advisors-2026-10-06.json](admin-advisors-2026-10-06.json).

| Regla | Avisos | Explicación / decisión |
| --- | --- | --- |
| [rls_enabled_no_policy](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy) | INFO × 3 | admin_pospuestos y sesiones_ver_como son tablas de acceso por RPC; sin acceso directo. invitaciones es anterior. No abrir políticas para silenciar el aviso |
| [anon_security_definer_function_executable](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable) | WARN × 5 | catalogo_publico, crear_solicitud_pedido, pedir_aviso, registrar_aaah y ver_solicitud son RPC públicas intencionales del catálogo, anteriores al admin |
| [authenticated_security_definer_function_executable](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable) | WARN × 74 | Incluye RPC de negocio/admin y helpers existentes. Las administrativas de negocio comprueban soy_admin y rechazan usuario normal; admin_viendo es helper de RLS con sesión vigente. ACL/search_path y denegaciones se prueban. El resto corresponde a contratos previos; no se revocó acceso del panel |
| [auth_leaked_password_protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection) | WARN × 1 | Configuración Auth existente; requiere decisión de configuración separada, no una migración admin |
| [unindexed_foreign_keys](https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys) | INFO × 3 | invitaciones_tienda_id_fkey y jugada_envios_cliente_id_fkey / promo_id_fkey son previas; evaluar índices con carga real y coordinación |
| [unused_index](https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index) | INFO × 18 | Incluye índices nuevos de auditoría/admin aún sin tráfico e índices previos. No eliminarlos por una observación temprana; lista exacta en el snapshot |
| [multiple_permissive_policies](https://supabase.com/docs/guides/database/database-linter?lint=0006_multiple_permissive_policies) | WARN × 6 | clientes, pedido_items, pedidos, producto_variantes, productos, promos: política SELECT adicional de Ver como junto a la política previa FOR ALL. Intencional para conservar escritura del dueño sin concederla al admin observador |
