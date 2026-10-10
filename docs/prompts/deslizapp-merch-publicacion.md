# Tienda oficial Deslizapp: merch de presentación

Modelo recomendado: Codex GPT-6.1 Sol, razonamiento alto. Equivalente en Claude Code: Opus 5.5 si está disponible.

Tu puesto es Coding. Lewis autorizó completar y publicar este encargo. Planning ya creó la tienda, pero no cargó sus medios ni publicó productos.

## 0. Contexto y aislamiento

Lee docs/00-contexto-del-proyecto.md, AGENTS.md, HANDOFF.md, docs/handoffs/planning-sesion.md, docs/forma-de-trabajo.md y docs/piloto-notion.md desde main actualizado. Consulta también docs/01-marca.md, docs/09-sistema-de-diseno.md, docs/12-catalogo-conectado.md y referencias/merch-deslizapp/LEEME.md.

Crea feature/deslizapp-merch-publicacion desde origin/main actualizado, en un checkout propio. Revisa sesiones/PR activos y superficies compartidas antes de editar. No retomes el checkout local abandonado feature/deslizapp-merch-escaparate ni asumas que sus cambios son aprobados: no se publicaron. No incorpores PR #45 ni trabajo ajeno. Un único push por ronda, para evitar despliegues innecesarios. Relee main antes del push final.

La tienda autorizada es UUID 95d185a6-61bb-4a97-852c-33ab437be9e4, slug deslizapp. Ya pertenece a Lewis como dueño. Verifica tienda, membresía y datos actuales; no recrearla, no asociarla a otro usuario, no cambiar la tienda que Lewis tiene seleccionada ni sus otras tiendas. No escribas su correo en el repo.

## 1. Alcance y datos

Configura logo, identidad y nueve familias de merch a partir de referencias/merch-deslizapp/manifest.json:
libretas, llaveros, stickers, hoodies, termos, fundas, gorras, tote bags y camisetas.

Las fotos son composiciones con distintos diseños; por ahora crea una ficha por familia usando la foto completa. No las vendas como un paquete ni inventes variantes, tallas, compatibilidades, materiales, capacidades, stock, entrega o funcionamiento de los QR. Descripciones cortas y fieles a la foto, siguiendo la voz de Deslizapp. Evita datos técnicos no confirmados.

No hay precios aprobados. No inventes precios en pesos o créditos. El objetivo de esta fase es que Lewis y el público puedan ver y compartir la colección. No implementes compra de créditos, cobros, canje, descuento de saldo ni pedidos de merch.

## 2. Fotos y logo exclusivamente en Supabase Storage

Fuentes: nueve JPG originales y logo-rosado-verde.png. El logo aprobado es el verde sobre fondo rosado, copia de referencias/iconos/icono-marketplace.png. No uses el logo de fondo crema ni regeneres las fotos.

Primero comprueba acceso real de subida a Storage. La sesión de Planning tiene SQL/MCP, pero no una operación de upload ni credenciales de Storage. Tener execute_sql no prueba que puedas cargar archivos. Revisa herramientas y credenciales configuradas oficialmente sin imprimir valores ni leer secretos para descubrirlos. No pidas que Lewis pegue claves en el chat.

Si no hay acceso, entrega ese bloqueo y el paso mínimo para configurar el acceso autorizado; no inventes una subida, no crees credenciales ni cambies RLS para eludirlo y no publiques medios rotos. Puedes completar y probar el código independiente del upload mientras se resuelve.

Con acceso: usa el bucket y mecanismo actual de la app; revisa políticas, rutas y medio_url_valida. Las rutas pertenecen al UUID de esta tienda. Conserva originales; si necesitas optimizar, usa versiones derivadas sin cambiar diseño, texto, color ni recortar productos. Nombres versionados y subida sin sobrescribir medios ajenos.

Comprueba cada URL pública, tipo de contenido e integridad/dimensiones, además de que cumple las validaciones de la base. Guarda los medios con el contrato actual de productos.medios/fotos. No registres únicamente storage.objects: eso no sube los bytes. No uses public/catalogos, raw GitHub, una Edge Function temporal o URLs externas como sustituto del Storage solicitado.

## 3. Identidad y presentación sin precio

La tienda ya tiene verde #174B3A, mandarina #FF834F, estilo divertida, Fredoka/Figtree, descripción e Instagram deslizapp. Revisa y completa el logo y perfil usando la imagen aprobada; conserva la identidad oficial y los tokens existentes. No atribuyas a la tienda un número de WhatsApp no confirmado.

El esquema actual exige productos.precio no nulo y el catálogo pinta RD$. Analiza la solución mínima y explícita para una tienda de presentación. Si necesita código, utiliza la configuración por tienda y componentes existentes. No introduzcas una moneda ficticia que luego el carrito interprete como pesos.

Mostrar «Próximamente · Créditos», con el icono de corazón existente donde corresponda, sin cifra de precio. No mostrar RD$0, «Gratis», precios en metadatos/compartidos, disponibilidad inventada ni promesas de compra. Si hay un valor técnico requerido internamente por el esquema, documenta cómo se distingue de un precio comercial y cómo se impide usarlo para pedidos. No representes la ausencia de precio solo mediante CSS.

En esta fase el comportamiento de presentación se activa únicamente en la tienda oficial. No permitir al comprador agregar al carrito, preparar pedidos, enviar compras a WhatsApp ni generar recibos de estos productos. Cubre feed, perfil, búsqueda, detalle, presentaciones, doble toque, hashes/deep links y carrito anterior persistido. No presentes los likes como selección para compra; si conservarlos exige separar mecanismos, usa la solución mínima o retira temporalmente esa acción para este escaparate, sin alterar otras tiendas.

El bloqueo debe existir también en el servidor: una llamada directa a crear_solicitud_pedido no debe crear una compra gratuita o en pesos para esta tienda. No falsifiques stock cero como sustituto de un modo de presentación ni dependas de que el usuario nunca cambie el inventario. Mantén las reglas comerciales de las otras tiendas.

Si hace falta una migración, revisa list_migrations antes de cada aplicación y coordina tablas/políticas compartidas. Valídala primero en base desechable, aplícala en Supabase, usa la versión asignada y comprueba revisar:migraciones con cero diferencias. Datos reales de tienda y productos son carga de datos, nunca una migración con IDs/correos hardcodeados. No hagas una reestructuración general de monedas o billeteras por este encargo.

La compra real con créditos queda para otra etapa. El saldo actual es por tienda; no asumir que es una billetera personal ni consumir créditos de retoque por merch.

## 4. Carga y publicación

Haz la carga idempotente, identificando por tienda y slug. Si otra sesión ya cargó un producto, comprueba sus medios/datos y evita duplicarlo o sobrescribir cambios de Lewis. Registra un resumen de la carga sin datos privados. No modifiques inventario, pedidos, pagos, solicitudes o créditos de otras tiendas.

Publica solo después de verificar que el despliegue compatible está READY, los medios responden y el servidor bloquea compras. Actualiza el enlace de esta tienda al catálogo React /tienda/deslizapp mediante el flujo compatible existente. Comprueba que aparece en el selector de Lewis y que la carga se mantiene al refrescar.

## 5. Verificación y entrega

Prueba 360/390/430 px, logo correcto, nueve fichas, fotos completas, descripción, feed/perfil/búsqueda/detalle, compartir y ausencia de precios o controles de compra. Comprueba carga real desde Storage. Prueba hashes y un carrito guardado antiguo con fixtures, sin modificar pedidos reales.

Verifica en SQL que un intento directo de pedido para el escaparate se rechaza sin dejar solicitud/pedido ni descontar créditos. Usa transacciones con rollback o fixtures aislados; evita registrar solicitudes de prueba permanentes. Comprueba que una tienda de venta normal conserva su flujo y sus precios usando fixtures, no haciendo pedidos reales de Michel.

Corre tipos, lint, tests, build y scripts afectados. Sigue las reglas de teclado/hojas si las tocas. Añade pruebas significativas del aislamiento y bloqueo; no una batería que solo replique el código. Actualiza novedades para el cambio visible y documenta contrato, evidencia y limitaciones.

Abre PR con el código, referencias y pruebas. Lewis autorizó publicar: con «Revisión» verde, validaciones pertinentes aprobadas y sin cambios de alcance no acordados, merge squash y comprueba el despliegue de producción antes de activar el catálogo real. Si falla un requisito, deja PR abierto y explica el bloqueo; no publiques parcialmente de forma que parezcan productos gratis o comprables.

Entrega enlace de PR/commit, versión de migración si hubo, evidencia de Storage, URL exacta de producción /tienda/deslizapp y pasos breves para Lewis. Distingue comprobaciones hechas de Safari/iPhone físico pendientes. Actualiza el handoff técnico y, si tienes acceso, la tarea correspondiente en Notion sin duplicar el backlog en Issues. No prometas avisos automáticos a otras sesiones.
