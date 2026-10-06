# Corrección de anulación de mensualidades — PR #51

Coding admin, Codex, 6 de octubre de 2026. Lewis autorizó corregir y aplicar una nueva migración después de validar, y confirmó que la otra sesión no prepara ni aplica cambios sobre pagos, tiendas o funciones de cobro.

## Contrato revisado antes de aplicar

La propuesta inicial era insuficiente para una cobertura modificada fuera del historial. La corrección parte de `pagado_hasta_anterior` del primer registro original de mensualidad de la tienda, aunque ese pago se haya anulado. Esa fecha es la cobertura legítima anterior al libro de pagos. No se sustituye null por hoy al devolverla.

Luego recorre **todas** las mensualidades originales vigentes por `numero`, excluyendo los pagos con un registro que los anula. Cada paso suma los meses originales a `max(fecha calculada, día del registro en America/Santo_Domingo)`, con meses civiles PostgreSQL y recorte de fin de mes. No usa la fecha de anulación ni `cubre_hasta` histórico. Un pago nuevo tras anular sigue usando la regla original de registro.

La función obtiene `FOR UPDATE` sobre la fila de tienda, igual que `admin_registrar_pago`. Tras adquirirlo comprueba duplicados, calcula cobertura y registra la anulación/auditoría en la misma transacción. Pagos, comprobantes, referencias y fechas históricas permanecen intactos. Se rechaza anular dos veces o anular una anulación. No se cambió la rama de créditos ni su comprobación de saldo libre menos reservas. La migración comprueba el hash de la función anterior y toma un bloqueo de tabla limitado por lock_timeout de 5 segundos; ante una versión concurrente o bloqueo persistente aborta, no sobrescribe a ciegas.

## Cobertura fuera del libro: ambigüedad y decisión

Se revisaron migraciones, capa de datos y definiciones actuales de producción: solamente registrar/anular mensualidades modifican `pagado_hasta` mediante RPC. El rol authenticated no tiene UPDATE en esa columna. Cambiar plan, prueba o estado no altera la cobertura pagada.

Un operador privilegiado sí puede asignarla directamente por SQL. Una fecha aislada no revela si corresponde a un pago, regalo, corrección o cobertura adicional. La función calcula también la cobertura de los pagos vigentes **antes** de anular y la compara con la fecha actual. Si difieren, devuelve `cobertura_no_conciliada` y revierte todo: conserva la fecha externa y no crea anulación ni auditoría parcial. Se prueba tanto una asignación directa como otra seguida de un pago nuevo. No se inventa su procedencia ni se repara automáticamente.

Límite: esa tienda necesitaría conciliación explícita antes de anular mensualidades. No hay RPC de ajuste externo en esta parte. Si se crea en el futuro, deberá registrar su procedencia y definir cómo participa en el recálculo. El guard también bloquea datos históricos incoherentes con el libro; nunca los normaliza silenciosamente.

## Ensayo desechable

El replay anterior a la nueva migración reprodujo A→B: sin pagos vigentes quedaba cobertura. Luego ensayó la propuesta revisada con rollback y aplicó la nueva SQL solo dentro del contenedor.

- 392 secuencias compartidas entre demo, RPC reales en PostgreSQL 17.6 desechable y calendario independiente: un pago, A→B/B→A, tres pagos con anulaciones individuales y seis órdenes completos, pago nuevo tras anular, previa null/vencida/futura, 1/2/3/12 meses, fin de mes, febrero, bisiesto, límite de medianoche RD, fechas de registro distintas y anulación años después.
- SQL: cobertura externa preservada mediante rechazo; auditoría una vez; fallo forzado de trigger de auditoría revierte anulación y fecha; comprobante intacto; aislamiento de tiendas; no-admin y admin retirado rechazados.
- Tres solapamientos con dos conexiones PostgreSQL: registrar antes de anular, anular antes de registrar y dos anulaciones del mismo pago. Espera Lock observada, resultados finales comprobados, un único ganador en el duplicado.
- Créditos: compra, reserva que impide anular, devolución de reserva y reversión sin saldo negativo. Regresión existente de gasto legacy, movimientos, entrega y devolución de retoques.
- Demo: mismas secuencias, comprobantes inmutables, rollback, fallo de auditoría inyectado solo en el proceso de prueba, protección de fecha externa y operaciones concurrentes serializadas por su ejecución síncrona. Esto no sustituye los solapamientos PostgreSQL.
- Replay completo y regresiones SQL de catálogo, pedidos, disponibilidad, eliminación lógica y concurrencia compartida pasan.

Reproducción: `npm run probar:admin-db`. Antes de aplicar se excluyó temporalmente únicamente la función corregida de la comparación con el snapshot viejo de producción; las otras 39 definiciones/ACL coincidieron. Esa excepción fue retirada después de aplicar. El snapshot actualizado proviene de la lectura real de producción: solamente cambió admin_anular_pago. La comparación final usa las 40 funciones, sin excepciones.

Fallos/reintentos del ensayo: el primer fixture TypeScript conservaba una referencia de tienda que la demo reemplaza al confirmar; se corrigió el fixture para cambiar el estado vigente. El primer fixture SQL de reservas heredaba créditos iniciales; se fijó saldo cero. Al incorporar LOCK TABLE, el runner necesitó ejecutar cada migración dentro de una transacción; se cambió a psql --single-transaction. Las comprobaciones pasaron al repetir. La CLI reciente necesitó crear su directorio de configuración, permitido por la revisión automática; no se cambió HOME. No se editaron las seis migraciones originales.

## Producción y entrega

Aplicada únicamente `20261006030939_admin_anular_mensualidades_recalculo` en `euihaeyfdlpvmbtfzvnt`. Archivo creado por CLI como 20261006030030 y renombrado a la versión asignada por Supabase. Statements recuperados del historial iguales al SQL enviado. `revisar:migraciones`: **40/40, cero diferencias de versión**; aviso histórico de nombre 20260930005714 conservado. Ninguna de las seis migraciones originales fue editada ni reaplicada.

Verificaciones reales de lectura posteriores: admin_anular_pago hash `7e169f2c7a150f6de61976d1e6875fff`, SECURITY DEFINER y search_path vacío; anon sin EXECUTE, authenticated con EXECUTE. admin_registrar_pago y las otras 39 definiciones/ACL del snapshot permanecen iguales. Cero pagos, cero anulaciones y cero coberturas antes y después: **no se modificaron pagos reales**. No se llamó la función de anulación ni se recalcularon tiendas reales como prueba.

Advisors posteriores mantienen los mismos grupos, cantidades y entidades que antes: seguridad INFO 3, WARN 5/74/1; rendimiento INFO 3/18, WARN 6. Explicaciones y enlaces en [validacion-admin-base.md](validacion-admin-base.md). Sin nuevas tablas, políticas ni índices. Catálogo de producción consultado de lectura: objeto válido, 15 productos activos; página pública HTTP 200. Esto no es una prueba autenticada del panel de Lewis.

Lectura previa real: cero pagos, cero mensualidades/anulaciones y cero tiendas con `pagado_hasta`. No hay datos afectados por este defecto en ese momento. No se guardó correo ni se usaron cuentas, pagos o productos de Lewis como fixtures. Las pruebas funcionales y de concurrencia se hicieron exclusivamente en la base desechable.

Sin pantallas de partes 2–4, merge ni despliegue. `soloMirar` bloquea escrituras desde la app; la cuenta admin/dueño conserva permisos de dueño en la base. No se cambió esa política.

Cuando exista Cobros, Lewis podrá registrar dos mensualidades demo, anularlas en ambos órdenes, comprobar que vuelve a la cobertura previa, revisar los comprobantes originales y las filas de anulación/auditoría, y comprobar febrero/fin de mes. Hoy no existe esa pantalla y no se le pide validarla.
