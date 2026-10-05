# Validación de espera y likes dentro de foto — seguimiento PR #47

Coding continúa en `feature/catalogo-visibilidad-og`, PR #47 abierto, head de partida `4b6457ba7b3780e8c77a02b8d5b72fa41662867f`. Main sigue en `be3f1fef6b6d8f6ba4454ec146cedd4986351b29`; no incluye #45. Checkout aislado. Se preservan visibilidad, inventario provisional, píldoras, feed y OG del PR. Sin migraciones, escrituras reales, configuración Supabase o publicación de producción.

## Ejecutado

- TypeScript, lint y build. Lint sin errores, 27 advertencias de imágenes existentes. La ruta temporal del fixture no se entrega ni aparece en el build.
- `npm test`: 33 archivos aprobados. `node --test --test-isolation=none tests/*.test.mjs`: **219/219**. Agrupación por teléfono normalizado/tienda, cero/singular/plural, una persona en dos productos/variantes, marcado parcial/último y conservación de filas. Pedir aviso persiste sin mensajes; reponer no marca; marcar no genera pedidos ni cambia stock. Adaptador real con transporte simulado verifica filtro tienda, avisado_en null, lectura compartida/caché e invalidación tras marcar; no demuestra RLS ejecutada en producción.
- `scripts/probar-espera-catalogo.mjs`: 360/390/430 en claro y oscuro; oscuro con movimiento reducido. Likes 0/1/12/1234567890 dentro de foto y centrados; acciones de espera fuera del enlace y ≥44 px. Oculto+agotado, espera de dos variantes, búsqueda con filtro elegido, último resuelto conservando En espera. Vista previa → lista → volver/Atrás mantiene propuesta, foco y scroll; X/Escape mantiene aviso de cambios pendientes. Inicio cuenta personas distintas y productos. Variante disponible ofrece Avisar, otra agotada no. Abrir mensaje no marca antes del retorno simulado. Sin overflow/errores de página. Capturas de tarjetas completas incluidas.
- `scripts/probar-espera-fallos.mjs`: **3/3 anchos**, DEMO con fallos/demora simulados. Error de lectura no muestra nadie ni cero; reintento recupera. Error al marcar conserva pendiente; reintento de dos clicks sincronizados hace una escritura y no vuelve a abrir WhatsApp. Ruta temporal eliminada al terminar.
- `scripts/probar-aviso-publico.mjs`: **390 px demo**, confirmar Avísame guarda, conserva foco del teléfono y aparece en Inicio sin abrir WhatsApp. No se envía ningún mensaje.
- `scripts/probar-espera-tienda.mjs`: **390 px demo**, cambiar tienda con lista abierta la retira; nueva lista usa solo productos de la tienda activa, no reaparece al volver y no marca filas. Verificación específica repetida sobre build final.
- Regresión `scripts/probar-catalogo-pulido.mjs`: **6/6** en build, visibilidad/error de plan cubierto por las pruebas iniciales de #47, inventario provisional al ocultar/mostrar, cancelar editor, colores/contraste de píldoras y foco. El selector de prueba se ajustó a la ubicación del stock, que sigue fuera de la foto.
- `npm run probar:hojas` y `npm run probar:teclado`: completos, «Todo bien», usando Chromium local. Teclado/visualViewport simulado; no iPhone físico.
- Script de pedido catálogo, escenario **12**: **1/1**, 390 claro demo, reposición real mediante la operación demo de variante, marcado al retorno simulado y otra variante pendiente intacta. No crea una venta.

## Intentos que no se presentan como aprobados

Los primeros runners usaban role button para Segmentos (es tab), consultaban la selección antes de terminar startTransition y un texto «L» coincidía con una fila oculta. Se corrigieron selectores y esperas. La prueba de error al marcar esperaba el nombre accesible del botón, que también está presente mientras dice Marcando: se cambió a esperar explícitamente Reintentar, después del fallo. También se quitó el DOM de la lista general innecesaria al abrir directamente un producto. Los imports estáticos Node no resolvían el helper de teléfono antes del loader: pasan con import dinámico. Las corridas finales se registran por separado; no son pruebas de red/OAuth/WhatsApp reales.

## Límites

- Safari/iPhone físico, VoiceOver, WhatsApp nativo y escrituras de una tienda Supabase real pendientes. Fixtures demo locales y transporte simulado; ninguna solicitud real de Lewis se modificó.
- Se mantiene el refresco real por foco/visibilidad con el freno existente de 15 s y la invalidación de escrituras. No se añadió Realtime ni entrega de mensajes. El retorno físico desde WhatsApp sigue pendiente de comprobar.
- Avisado es el estado del flujo existente al volver de WhatsApp; no confirma envío ni respuesta. Las variantes siguen siendo solicitudes separadas, aunque el contador sea de personas.
- La protección de preview de Vercel puede bloquear lecturas anónimas. READY se verifica por SHA; no equivale a Safari, login real o prueba pública de OG.
- El límite del plan y los límites/caché de OG documentados en la validación anterior de #47 siguen vigentes. No se incorpora rendimiento #45.

Capturas y resultados: [evidencia](capturas/espera-catalogo/README.md). PR/commit final y URL inmutable de preview se registran en la entrega del PR; refrescar un despliegue anterior no incorpora este seguimiento.
