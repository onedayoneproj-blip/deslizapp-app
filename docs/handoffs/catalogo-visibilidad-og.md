# Handoff para Planning — catálogo, visibilidad e imagen de pedidos

Coding, 2026-10-05. Rama `feature/catalogo-visibilidad-og`, desde main `be3f1fef6b6d8f6ba4454ec146cedd4986351b29`. Conserva #44 y #46; no incorpora #45. Checkout separado. PR y SHA final, junto con la URL inmutable de preview, se registran en la entrega y descripción del PR. No fusionar ni publicar sin revisión de Lewis.

## Cambios

- Vista previa: Interruptor «Visible en el catálogo» con guardado inmediato de visibilidad solamente, bloqueo durante envío, error sin cambiar el estado confirmado y aviso existente de plan lleno. No guarda ni descarta la propuesta de inventario. Editor refleja actualizaciones externas y no envía una visibilidad antigua cuando solo se cambia la ficha.
- Panel: corazón mandarina relleno en círculo claro, número debajo incluido cero, solo lectura y dentro del nombre accesible. Píldoras de stock completo, STOCK_BAJO, agotado y sin control; visibilidad independiente. Variantes y filtros conservados.
- Feed: número positivo separado de «Lo quiere»/«Lo quieren», debajo del corazón. Cero conserva «Lo quiero». Bolsa, selección, aaah y cálculos sin cambios.
- Pedido público: PNG servidor 1200×630 con hasta cuatro portadas por línea (no por cantidad), variantes y «+N productos». Fuente pública existente, fallback de marca, descargas restringidas al bucket propio; sin cliente, teléfono ni notas. Metadatos conservan título, total y descripción. Dominio estable en producción, URL exacta del despliegue en preview.
- Novedades 0.34.0, documentación de pantallas/arquitectura y evidencia actualizadas. Sin SQL, migraciones ni cambios de Supabase/configuración/filas reales.

## Validación ejecutada

TypeScript y build pasaron. Lint: cero errores y 27 advertencias existentes. Suite: 31 archivos, 214 pruebas individuales aprobadas. Tras ajustar exclusivamente el origen de metadatos, se repitieron sus dos pruebas, TypeScript y build.

Chromium: seis contextos panel (360/390/430, claro/oscuro), tres anchos feed (1/2/12/1234567890/0), nueve escenarios de visibilidad con fallos y demora simulados. Pruebas generales de hojas y teclado completas. Foco/teclado mediante simulación de visualViewport, no iPhone físico. Datos demo y adaptador real con transporte simulado prueban filtro por tienda y actualización exclusiva de activo; no son una prueba nueva de RLS en producción.

PNGs reales del generador inspeccionados: 1–5 líneas, recorte ancho/cuadrado, fotos del repositorio, variantes, cantidad repetida y fallback. Pruebas de descarga/route/metadatos utilizan fixtures y transporte sustituido; no pedidos reales. Resultados, intentos iniciales corregidos y capturas: [validación](../validacion-catalogo-visibilidad-og.md) y [evidencia](../capturas/catalogo-visibilidad-og/README.md).

## Pendientes y límites

- Safari/iPhone, VoiceOver, teclado físico, WhatsApp nativo y una tienda real pendientes. No se hicieron escrituras de producción para probar.
- El límite del plan conserva la comprobación de interfaz existente. Las migraciones no contienen una comprobación atómica de ese límite en servidor; no se afirma ni añade aquí. Dos sesiones concurrentes podrían superar ese límite conforme al contrato previo.
- PNG en caché cinco minutos; WhatsApp controla recorte y puede conservar previews anteriores. La protección de Vercel puede bloquear su crawler en preview. Demo local no proporciona pedidos públicos desde localStorage. READY no equivale a validación de WhatsApp.

## Pasos para Lewis en Safari

1. Abrir la nueva preview, Demo → Catálogo → producto. Proponer stock sin guardar; ocultar/mostrar y comprobar que la propuesta permanece. Recargar el catálogo público para comprobar visibilidad en una tienda real usando un producto de prueba acordado: el preview comparte sus datos reales.
2. Mirar corazón/cifra y píldoras con stock bajo, suficiente, cero y sin control. Oculto y agotado deben distinguirse.
3. En feed revisar que 1 y varios likes tienen número en su propia línea; tocar selección sin cambiar la bolsa ni el aaah.
4. Pegar el enlace de un pedido público de prueba con varias líneas en un borrador de WhatsApp y esperar la tarjeta, sin enviar. Comprobar composición y recorte. Este último paso requiere pedido público real y acceso del crawler, no un pedido guardado solo en Demo.
