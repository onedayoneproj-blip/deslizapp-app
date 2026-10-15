# Demo pública de Deslizapp y pruebas internas separadas

Encargo de Planning, 15 oct 2026, a petición de Lewis. Puesto: Coding. Modelo: Sonnet por defecto; no usar Opus sin autorización nueva.

## Resultado y límites

«Probar la app con datos de prueba» debe abrir una demo visual basada en una copia aislada del perfil, los catálogos y los productos públicos de Deslizapp, con sus fotos de merchandising. Completarla con clientes, compras/ventas, pedidos, abonos, inventario y actividad ficticios coherentes.

La tienda de slug deslizapp es una tienda REAL de Lewis para vender merchandising. No es un sandbox. No modificarla, recrearla, cambiar permisos ni cargarle datos de ejemplo. No tocar sus productos, precios, stock, pedidos, clientes, créditos, perfil, publicación o Storage. La copia demo tendrá IDs y estado propios; nunca usar los identificadores reales como destino de operaciones.

Planning no ha modificado implementación ni datos reales para este encargo. Parte de main actualizado y lee AGENTS.md, HANDOFF.md, docs/00-contexto-del-proyecto.md, docs/handoffs/planning-sesion.md y docs/forma-de-trabajo.md. No incorpores los PR históricos #23, #43, #45 o #2.

## 1. Copia visual y actividad ficticia

Reutiliza el contrato y componentes existentes. Prepara un snapshot local/versionado únicamente del perfil y catálogo PÚBLICOS de Deslizapp, o las referencias versionadas aprobadas que coincidan con ellos. No exportes su cuenta, correos, miembros, compradores, pedidos, pagos, contactos u otros datos privados.

Las imágenes públicas existentes pueden leerse sin modificarlas; preserva originales y documenta su procedencia. No sobrescribas archivos reales ni dupliques objetos mediante SQL de Storage. No sincronices la demo en vivo con el negocio ni consultes la tienda real para cada acción demo.

La demo pública presenta solo Deslizapp de ejemplo; las otras tiendas sintéticas quedan disponibles en la experiencia interna de Lewis. Usa precios/stock y nombres de clientes ficticios propios de la demo, sin atribuirlos a la tienda comercial. Identifica la experiencia con una indicación breve de datos de prueba. Incluye pedidos nuevos, pendientes y despachados, ventas de contado y crédito/abonos que cuadren y fechas relativas para que Resumen tenga actividad.

Debe permitir probar las operaciones habituales del dueño: productos, catálogo, pedidos, clientes y resumen. Mantén útiles los recorridos de variantes y varios catálogos cuando los datos lo permitan. No conviertas la demo en solo un escaparate de imágenes.

## 2. Aislamiento de extremo a extremo

La demo actual usa lib/data/demo.ts y localStorage; reutiliza lo que sirva. Separa los namespaces de la demo pública, los fixtures internos y la demo de /conoce (solo memoria). Una selección antigua o datos guardados de Esencias Michel/Lino no deben reaparecer al entrar en la nueva demo pública. Conserva el sandbox interno por separado, sin convertir datos reales ni borrar la sesión de Google.

Comprueba fuente de datos, carrito, IDs, solicitudes, likes, avisos de llegada, personalización, reinicio y enlaces compartidos. Desde la demo, «ver catálogo/perfil» y los enlaces a productos/pedidos deben seguir en su copia aislada al abrir, recargar o volver atrás. Nunca terminar por accidente en /tienda/deslizapp real ni crear un pedido comercial.

Las acciones simuladas no envían WhatsApp/correos, invitaciones ni pagos reales y no escriben en Supabase o Storage. Las descargas de imágenes públicas son lecturas permitidas. No inventes una cuenta Auth de prueba ni asocies fixtures a la tienda real.

No cambies el feed decorativo de la página principal: hoy lee fotos públicas en el servidor con caché. Este encargo cambia la experiencia de prueba, no el diseño aprobado de / o /conoce ni el catálogo comercial.

## 3. Demo pública sin herramientas internas

Hoy components/panel/acceso-admin.tsx devuelve acceso a /admin-demo para cualquier modo demo. components/panel/menu-tienda.tsx ofrece laboratorio, varias tiendas y simulaciones técnicas. app/admin-demo/layout.tsx no exige una identidad real.

En la demo destinada a potenciales usuarios no mostrar ni permitir el admin de tiendas, laboratorio de datos, selector de otras tiendas de fixtures ni controles internos de depuración. Mantener «Salir de la demo» y un reinicio sencillo de los datos públicos; las operaciones normales de un dueño se mantienen.

El entorno interno con esos datos y herramientas se conserva SOLO para la cuenta Google de Lewis aprobada en este encargo. Planning tiene el correo exacto en la tarea privada de Notion; no lo copies a documentación pública ni al bundle. Valida en servidor la identidad autenticada de esa cuenta, con configuración del servidor o vínculo al ID Auth obtenido de una fuente confiable. Si falta esa identificación, documenta el requisito; no amplíes el acceso a todos los admins.

Ocultar enlaces no basta: protege las rutas internas y sus subrutas, APIs/cargas y cualquier punto de acceso equivalente encontrado. Un visitante, otro usuario autenticado, una cookie demo o flags manipulados no deben abrirlas. No uses user_metadata, localStorage, un query param o una cuenta sintética como autorización. No amplíes ni revoques por este encargo los permisos vigentes del admin REAL /admin.

La comprobación de identidad de la entrada interna puede usar Auth; el sandbox interno sigue operando sobre datos ficticios separados. No mezcles su fuente con tiendas reales.

## 4. Punto pendiente: ubicación de un acceso público

Planning preguntó a Lewis si al decir «esa opción no debe aparecer en el perfil público» se refiere solo al admin/herramientas internas o también al acceso a la demo.

Hasta recibir la aclaración: conserva el acceso existente a probar la app en / y /entrar; retira los accesos internos de la demo pública como ya pidió expresamente. No agregues ni retires otro CTA del perfil comercial por interpretación. No elimines «Cómo funciona», el perfil o la compra real de merchandising. Consulta la respuesta más reciente en la tarea de Notion antes de cerrar este punto.

## 5. Comprobaciones y entrega

- Tipos, lint, tests, build y suites de navegador afectadas de inicio, sesión, selector de tiendas, equipo, catálogo, pedidos y landing. Adapta las expectativas antiguas de fixtures públicos, conservando la cobertura interna.
- En 360/393/430 px: entrar sin Google, ver fotos de Deslizapp, perfil/catálogos, crear/editar producto local, preparar y registrar un pedido simulado, despachar, revisar resumen y reiniciar.
- Verifica con interceptación/registro de solicitudes que esas operaciones no escriben en servicios reales ni envían mensajes. Comprueba IDs propios y que la fuente pública real no participa en operaciones demo.
- Prueba datos guardados de la versión anterior, refresh, enlaces directos, volver atrás y alternar cuenta real/demo/interno: sin contaminación ni cambios en selección o datos reales.
- Acceso directo a /admin-demo, /prueba y sus equivalentes: denegado sin sesión, para otra cuenta y con flags locales falsificados; permitido para Lewis con identidad verificada y únicamente datos sintéticos. Prueba Auth con fixtures, sin crear cuentas o pedidos reales.
- Prueba la tienda comercial con fixtures y lecturas públicas; no hagas pedidos o escrituras reales para verificarla. Distingue la evidencia automatizada de Safari/PWA físico.

No requiere migración de base de datos ni escritura en datos de tiendas. Si descubres que necesitas alguna, deja la propuesta concreta a Planning antes de ejecutarla.

Añade Novedades con versión superior a main para el cambio visible y documenta la separación de fuentes y accesos. Abre PR contra main con capturas, HEAD, preview exacta y alias estable verificados, pruebas y límites. Mantén el PR abierto sin fusionar: cambia la demo pública y requiere validación de Lewis.

Pide @codex review sobre el último HEAD y atiende hallazgos. Avisa a Planning al terminar o bloquearte si tienes herramientas; si no, entrega un relevo para que Lewis lo copie. No declares lanzada una sesión ni aprobada una prueba que no se haya ejecutado.
