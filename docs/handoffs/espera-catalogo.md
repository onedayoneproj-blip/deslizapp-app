# Handoff para Planning — espera visible y likes en foto

Coding, seguimiento del PR #47 abierto en `feature/catalogo-visibilidad-og`. Head previo `4b6457b`, desde main publicado `be3f1fe`. Se conservan todas las mejoras anteriores y se excluye #45. No fusionar ni publicar; Lewis revisa la nueva preview. SHA final y URL exacta constan en la descripción/entrega del PR.

## Implementación y decisiones

- Likes del panel dentro de la foto abajo a la derecha: corazón relleno mandarina en círculo Papel Cálido, número debajo, cero y cifras largas. No es botón; nombre accesible del enlace conserva contador. Stock y visibilidad fuera de la foto; espera tiene acción independiente fuera del enlace.
- Catálogo: personas distintas por producto y filtro En espera con cantidad de productos, búsqueda y orden existentes, también ocultos/repuestos. Cero oculta pastilla salvo elegida; resolver último conserva filtro y vacío amable. Errores muestran reintento, nunca cero inventado.
- Vista previa: fila de espera → misma lista existente dentro de la misma Hoja, ficha/borrador montados y vuelta con scroll/foco. No guarda ni descarta ajustes.
- Inicio: tarjeta rosa independiente de pedidos/ventas con personas normalizadas en la tienda y productos distintos. Hoja de productos → lista, navegación interna/paginación existente, sin limitarse a agotados.
- Una lectura compartida de avisosPendientes por tienda, agrupación pura en lib/avisos.ts; se reutilizan tabla, Esperan, TarjetaYaLlego y operaciones actuales. El detalle relee producto/variante confirmados antes de Avisar. Cambiar tienda cierra lista anterior. Marcar deduplica reintentos; volver de WhatsApp no prueba envío.
- Confirmar Avísame guarda sin WhatsApp. Reponer no resuelve solicitudes. No se modifican ventas/pedidos/stock por contar o abrir listas.
- Novedades 0.35.0 y documentación actualizadas. Sin nuevas migraciones ni cambios en Supabase, datos reales o configuración. Visibilidad, inventario provisional, feed/bolsa y portada OG preservados.

## Validación y pendientes

219 pruebas/33 archivos, TypeScript, lint (0 errores/27 advertencias existentes) y build aprobados. Navegador Chromium a 360/390/430 en ambos temas y reducido: contadores, variantes, filtro/búsqueda/vacío, draft, foco, scroll, Atrás/cierres, imágenes completas. Tres escenarios de fallos simulados, confirmación pública demo sin WhatsApp, cambio de tienda, regresión anterior del panel y reposición por variante. Hojas y teclado generales completos. Detalle y resultados: [validación](../validacion-espera-catalogo.md), [capturas](../capturas/espera-catalogo/README.md).

Pendiente Safari/iPhone físico, VoiceOver, tienda real y WhatsApp nativo. Las pruebas de aislamiento usan demo y adaptador con transporte simulado; no se ejecutó RLS nueva en producción. Foco real conserva el refresco existente de 15 s; no se añadió Realtime. El límite de plan en servidor y la caché/recorte de WhatsApp mantienen los límites anteriores de #47.

## Lewis en Safari

1. Abrir la nueva preview, Demo → Catálogo: corazón/número dentro de foto, stock/visibilidad debajo y espera aparte. Tocar tarjeta abre vista previa; tocar espera abre lista.
2. Crear un aviso de prueba desde un producto agotado del catálogo demo en el mismo Safari. Confirmar no debe abrir WhatsApp. Buscarlo en Inicio, tarjeta y vista previa. Demo no transporta su localStorage a otro dispositivo.
3. Elegir En espera y buscar el producto. Puede ser oculto o estar repuesto. Resolver el último no debe cambiar el filtro.
4. Vista previa: proponer stock sin guardar, abrir lista y volver. Cantidad y posición siguen ahí. En variantes comprobar exactamente la combinación solicitada.
5. Guardar una reposición de prueba: el aviso sigue pendiente. Avisar prepara WhatsApp sin enviar; tú decides si mandas el mensaje. Volver no prueba el envío aunque el flujo lo marque como avisado.
6. Repetir en tienda real únicamente con un producto/aviso de prueba acordado. El preview comparte su base real; no usar avisos existentes de Lewis para probar.
