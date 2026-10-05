# Handoff — selección de agotados, historial y likes del panel

Estado: PR [#49](https://github.com/onedayoneproj-blip/deslizapp-app/pull/49) abierto desde `fix/catalogo-agotados-visibles`, sobre `main` `b46d5ecd24f4591e5e8f0cfbe85c57033bcb8905` (#48). Vercel preview: [despliegue exacto](https://deslizapp-p0bl3h2dw-onedayone.vercel.app) (READY) y [alias estable de la rama](https://deslizapp-app-git-fix-catalogo-agotados-visibles-onedayone.vercel.app). Vercel exige iniciar sesión en el equipo para abrirlo; el fetch autenticado de `/catalogo` devolvió HTTP 200. PR #45 no se incorporó. No hubo cambios de Supabase ni migraciones.

## Cambios

- La acción «Ocultarlos» del aviso de agotados lleva a una selección interna dentro de la misma Hoja. Empieza vacía. El buscador limita el alcance de «Seleccionar todos los resultados», con la cantidad de resultados indicada. Sin selección el botón «Ocultar del catálogo» está deshabilitado; con selección el nombre incluye el total. Cancelar, volver o cerrar no cambia productos.
- La lista usa `stockParaSalud`: incluye productos visibles sin variantes con stock cero y productos cuyas variantes activas están todas en cero; excluye variantes disponibles, stock sin control y productos ocultos.
- Al confirmar, cada producto se vuelve a leer dentro de la tienda activa. Solo se actualiza `activo: false`. Los que dejaron de ser elegibles se omiten. Los fallos parciales indican cuántos fallaron y sus nombres; quedan seleccionados solo los pendientes para reintentar. Se impide doble envío. Stock, historial, precios, pedidos, variantes y avisos de llegada se conservan.
- El historial usa `ListaAgrupada` y `FilaLista`; muestra primero lo más nuevo, variación, anterior → posterior, motivo, nota, fecha/hora dominicana y nombre del actor o el respaldo del contrato. Conserva carga, error/reintento, vacío y «Ver más».
- El indicador de likes del panel es una cápsula horizontal mandarina de corazón+cifra, dentro de la foto, sin acción separada. La lista pública y el contador de la bolsa no cambian.
- Actualicé `docs/04-pantallas.md`, este handoff y `lib/novedades.ts`. Capturas demo están en `docs/capturas/catalogo-agotados-visibles/`.

## Validaciones ejecutadas

- `npx next typegen && npx tsc --noEmit`: pasó.
- `npm test`: 33/33 archivos de prueba pasaron, incluida la regla de elegibilidad, variantes, ausencia de control, relectura por tienda y manejo/reintento de un fallo individual.
- `npm run lint`: pasó sin errores; quedaron 27 advertencias existentes (principalmente uso de `<img>` y una dependencia de hook en `components/tienda/catalogo.tsx`).
- `npm run build -- --webpack`: pasó en Next.js 16.3.6. El comando Turbopack `npm run build` se intentó y se detuvo porque el entorno bloquea un puerto de proceso interno (`Operation not permitted`); el mismo build con Webpack completó correctamente.
- `scripts/probar-agotados-y-likes.mjs`: pasó en Chromium con datos demo a 360, 390 y 430 px, claro y oscuro. Comprueba corazón/cifra 0 y 10 dígitos dentro de la foto, accesibilidad, ausencia de selección inicial, búsqueda, selección de resultados, cancelación, ocultar uno/varios, doble toque, otra tienda intacta, variantes, producto con una variante disponible, `stock = null`, producto oculto y cambios de stock/visibilidad realizados desde otra sesión antes de confirmar.
- `scripts/probar-historial-ajustes-lista.mjs`: pasó con fixture de 12 registros y uno vacío; comprobó orden reciente, motivo, nota larga, actor, cantidades, «Ver más» y que los pedidos no cambien.
- `npm run probar:inventario` con `CHROMIUM_PATH=/usr/bin/chromium`: pasó el recorrido existente de inventario e historial, edición, nota de motivo, cancelación, pedido preseleccionado, stock cero/null, nombre largo y ausencia de errores de página.
- `npm run probar:hojas`: pasó la prueba común de hojas apiladas, gesto/fondo/Escape/X/Atrás, foco atrapado y cambios sin guardar.
- `npm run probar:teclado`: no pasó completo. Los chequeos de foco/escritura del buscador y campos iniciales pasaron; falló el paso existente de cerrar por gesto «Nuevo producto» tras escribir: no apareció «Salir sin guardar» y el script terminó por timeout. Esa pantalla no se modificó y no se determinó si el fallo existía antes de esta rama.
- Las pruebas de navegador usaron fixtures/datos demo locales; no iniciaron sesión ni llamaron a Supabase. La acción reutiliza las operaciones existentes y no añade migración.

## Pendiente

- Revisión manual en Safari/iPhone físico, incluido el teclado real.
- Preview de Vercel/PR: completar los enlaces y SHA al publicar la rama.
- La UI de error parcial/reintento no se forzó en navegador; la función pura está cubierta por test unitario, incluido que el reintento solo recibe los pendientes.
- Supabase real/RLS no se validó con escrituras; no se modificó ninguna tienda real.
