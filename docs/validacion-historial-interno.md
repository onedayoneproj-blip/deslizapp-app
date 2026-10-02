# Inventario compacto e historial interno — 2026-10-02

Base revisada: main `8f82222d058531dcc7463fa647a86a35f8b70853` (PR #21).
Rama: `feature/inventario-historial-interno`.

## Alcance

Guardar cambios y Descartar pasan al contenedor compartido de inventario; aparecen
solo si cambia la cantidad. Descartar conserva el resto de la ficha. El editor usa
el guardado conjunto existente y no duplica el botón general con ajuste pendiente.
El texto distingue stock actual, unidades propuestas y delta, con singular/plural.

Ver historial usa BotonVerMas y abre una vista interna de la misma Hoja. El
formulario sigue montado, oculto; volver restaura scroll y foco. Atrás vuelve a la
ficha sin descartar ni preguntar; X/Escape mantienen el aviso de salida real.
No se modificaron useData, fuentes demo/real, operaciones SQL ni migraciones.
No se accedió a Supabase ni se escribieron datos de producción en esta tarea.

## Comprobaciones ejecutadas

| Comprobación | Resultado real |
| --- | --- |
| TypeScript: next typegen y tsc --noEmit; repetido tras el build | Pasó. |
| npm run lint | Pasó. |
| npm test | 122 pruebas individuales pasaron; ninguna omitida. |
| npm run build (Turbopack) | Falló por permiso del entorno: PostCSS intentó abrir un puerto interno, `Operation not permitted`. |
| next build --webpack | Pasó, incluyendo TypeScript y generación de rutas. Repetido con identificador de compilación local fijo. |
| scripts/probar-historial-interno.mjs | Pasó a 360/390/430 px y 390 px con movimiento reducido: botones internos de al menos 44 px, singular/plural, ninguna acción pendiente sin cambio, propuesta sin persistir, historial vacío sin propuesta, una sola hoja, scroll/foco restaurados, Atrás sin aviso, campos y mismo nodo del formulario conservados, un único Guardar en edición, descartar cantidad conserva nombre, Escape protege cambios, sin overflow ni errores de página. |
| probar:inventario | Pasó a 390 y 360 px; repetido a 430 px sobre build estable. Aumentos/disminuciones finales, motivos y Otro con nota, cancelación, un registro por guardado, ficha sin ajuste y guardado conjunto, historial actualizado al guardar desde ambos recorridos, avisos de navegación, Crear pedido sin venta, cero/null, nombre largo y sin foto. |
| scripts/probar-inventario-fallos.mjs | Pasó sobre build estable: dobles de useData exclusivamente demo para resultado incierto antes/después de confirmar, sin reintento, doble toque, conflicto/relectura, validación sin ficha parcial, motivo/nota conservados, cancelación, historial 10→12, error/reintento y filtro por tienda. |
| probar:hojas | Pasó sobre build estable con identificador fijo: Pedidos/abonos/clientes, gestos, fondo, Escape, X, Atrás, cambios sin guardar, foco y Tab. |
| probar:teclado | Pasó completo en Chromium: foco/nodo estables, simulación de teclado, formularios/selectores existentes y nota de ajuste. |
| Revisión visual | Capturas reales de Chromium inspeccionadas a 360/390/430 px, contenedor con acciones pendientes y vista interna de historial. |

Los intentos iniciales sobre desarrollo se detuvieron en navegación o cierre.
Una compilación local sin identificador fijo también mostró un aviso artificial de
versión nueva que interceptó la X. Se repitieron sobre build con identificador fijo;
las comprobaciones finales anteriores pasaron. La prueba de errores ahora espera
el desmontaje real de la confirmación y la relectura de stock, en lugar de asumir
que un tiempo fijo garantiza ambos. No se forzaron clics a través del aviso.

## Límites

Chromium emula tamaños móviles y cambios de viewport; no sustituye Safari ni el
teclado físico del iPhone. No se verificó esta interfaz con sesión Supabase real
ni se crearon ajustes de prueba en producción. El aislamiento comprobado aquí es
el de las pruebas unitarias/demo; no se repitieron pruebas SQL/RLS de PR #21.
El build y estado de preview/producción se deben informar con su SHA en el PR y
handoff de entrega; este documento no anticipa un despliegue.

## Comprobación manual

Primero en Demo: Catálogo → producto con stock → +/− sin guardar → Ver historial
→ Atrás. La cantidad pendiente debe seguir ahí y no aparecer en el historial.
Descartar la recupera. Guardar crea un ajuste final; disminuir pide motivo y Otro
requiere nota. Luego Editar: cambia nombre y cantidad, visita el historial y vuelve.
Descartar cantidad debe conservar el nombre; Guardar con ajuste confirma ambos.
Prueba también cero, sin control, salir sin guardar y el teclado del iPhone.
En una tienda real, revisa primero lectura/navegación; confirma un ajuste únicamente
si es un movimiento de inventario que necesitas registrar de verdad.
