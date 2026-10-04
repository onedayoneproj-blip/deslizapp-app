# Catálogo conectado, parte 3: pedido del catálogo en el panel (rama `feature/pedido-catalogo-panel`)

> **Modelo recomendado en Codex:** GPT-6.1, razonamiento alto. **Alternativa equivalente para esta tarea en Claude Code:** Claude Opus 4.6. Es una recomendación por complejidad (sesión pública/privada, transacciones y navegación), no una equivalencia exacta entre modelos. Si ese nombre no aparece en tu cuenta, usa el modelo de Coding de mayor capacidad disponible e indica cuál usaste.

> **Orden de ejecución:** esta parte va **después** de `docs/prompts/catalogo-react.md` (parte 4). El orden aprobado es 1 → 2 → 4 → 3. No construyas un segundo catálogo ni una segunda página del comprador para adelantarte a esa parte.

Las partes 1 y 2 (PR #40 y #42) dejaron la base, la capa de datos y el editor de productos. La parte 4 deja `/tienda/{slug}` y `/pedido/{codigo}`, con la historia y el recibo del catálogo. Esta parte suma **el estado para el comprador, el registro para la tienda, la fila de respaldo en Pedidos › Nuevos y la lista de Avísame**, conservando lo anterior.

Antes de empezar lee:
- `docs/00-contexto-del-proyecto.md`, `AGENTS.md` y `HANDOFF.md`. Tu puesto es **Coding**.
- `docs/12-catalogo-conectado.md` completo, sobre todo §6, §8, §9 y §10; es la especificación que manda.
- `docs/prompts/catalogo-react.md` y su PR/handoff final: comprueba qué está implementado, probado y fusionado.
- `referencias/pedido-catalogo/LEEME.md` y **todos** sus tableros: `Comprador`, `Estados`, `EresLaTienda`, `Registrar`, `Buscar`, `Respaldo`, `PorRegistrar` y `WhatsApp`. Ábrelos en el navegador y mira también `capturas/Registrar.png`, `Registrar-b.png` y `Registrar-c.png`. Son diseño aprobado, no código para copiar.
- `docs/09-sistema-de-diseno.md` (Menos texto, opciones, listas, §16), `docs/08-movimiento.md`, `docs/11-voz-y-frases.md` y las secciones de hojas/teclado de `HANDOFF.md`.
- `lib/data/fuente.ts`, `lib/data/catalogo.ts`, `lib/data/supabase.ts`, `lib/types.ts` y las migraciones vigentes de catálogo. Lee las guías de la versión instalada de Next.js antes de escribir rutas.

## 0. Alcance y punto de partida

1. Primero completa la corrección de rendimiento de `docs/prompts/catalogo-rendimiento.md`, solicitada por Lewis tras la medición de 7,1 s en 4G simulada. No mezcles esa corrección con esta etapa.
2. Revisa main y PR #44 actuales. Si #44 sigue abierto, crea `feature/pedido-catalogo-panel` desde su head actualizado y abre un PR dependiente contra `feature/catalogo-react`; documenta SHA y dependencia. Si ya está fusionado, parte de main actualizado y abre contra main. No dupliques las páginas públicas. Cuando #44 se fusione, traslada únicamente los commits de esta etapa a main actualizado y retargetea el PR, verificando regresiones. No fusiones ninguna rama ni publiques sin autorización de Lewis.
3. Las solicitudes son borradores: crear una solicitud **no** crea pedido, cliente, venta ni reserva/descuento de stock. Solo registrar crea un pedido `nuevo` de origen `catalogo`; solo despachar descuenta stock según las reglas existentes.
4. No cambies el HTML publicado, `url_catalogo`, el enlace antiguo de 24 h, el diseño del feed ni el envío de WhatsApp de la parte 4. No implementes pagos, notificaciones automáticas, reservas de stock ni envío automático de mensajes.
5. En las vistas **del panel**, reutiliza `components/ui/` y `Hoja` con tokens, claro/oscuro y las reglas de foco. Busca antes de crear componentes; si falta uno, sigue docs/09 §16, expórtalo, muéstralo en `/diseno` y documéntalo.
6. La historia y el recibo **del comprador** conservan la superficie y componentes públicos de la parte 4. La nueva hoja de estado sigue los tableros Comprador/Estados y §6; no cambies toda la página al estilo del panel. Si hace falta el rosa de Confirmado, defínelo una sola vez en un token semántico de esa superficie, no en estilos repetidos.

## 1. Una ruta, dos vistas y vuelta después de iniciar sesión

Extiende `app/pedido/[codigo]/page.tsx`; no hagas otra URL para el mismo enlace.

- Sin sesión, o con una sesión que **no pertenece a esa tienda**: la vista pública del comprador. Tener Google abierto no convierte a cualquiera en la tienda.
- Con sesión válida y membresía de la tienda verificada en el servidor: la vista de registro. Usa el contrato `verSolicitud(codigo)`, su `esMiTienda` y las lecturas autenticadas necesarias, sin confiar en un parámetro de URL, el modo elegido o metadatos editables de Google.
- La ruta pública funciona fuera del layout y del `DataProvider` que obligan a entrar al panel. Monta el contexto privado solo donde corresponde y no bloquees al comprador mientras se consulta la sesión.
- No caches una respuesta personalizada como pública: sin caché para solicitud/estado y datos de sesión. Nunca entregues cliente, WhatsApp del comprador, notas ni identificadores privados en HTML/metadata de la vista pública.
- Carga, error con Reintentar, código inexistente, vencido y ya registrado tienen vista concreta; ninguna hoja queda blanca.

**«¿Eres la tienda? Entra para registrarlo»** abre la hoja compacta EresLaTienda:
- «Entra con tu cuenta de Deslizapp y registra este pedido desde aquí.»
- Botón «Entrar con Google».
- La ayuda de primera vez del tablero, sin prometer que nunca volverá a pedir sesión.
- Después de OAuth vuelve a **ese mismo código** y comprueba otra vez la membresía. Conserva el destino en el flujo de sesión/callback; admite solo rutas locales previstas, sin redirecciones a dominios externos. No rompas el login normal del panel ni los previews.
- Cancelación o error de login conserva el enlace y ofrece reintentar. Otra tienda no recibe datos privados ni puede registrar/descartar.
- iPhone: explica solo cuando haga falta que el enlace se abrió en Safari y la sesión de la PWA puede no estar allí. Android: revisa `scope`/rutas del manifest sin excluir el panel; abrir la PWA depende del navegador, no lo prometas como garantía ni fuerces instalaciones.

Demo: usa la fuente demo y conserva `?demo` en navegación interna de pruebas cuando corresponda. El PR #44 guarda solicitudes demo en el contexto local y no añade `?demo` al enlace de WhatsApp: ese enlace no garantiza acceso a la solicitud demo desde otro navegador/dispositivo. Documenta la limitación y facilita el recorrido en el mismo contexto; no presentes datos locales como solicitudes reales. Distingue vista comprador/tienda demo sin autorizar operaciones reales.

## 2. Estado en la vista del comprador (Comprador y Estados)

Conserva la historia a pantalla completa, barras de avance de los productos, gestos, fotos/video, «Ver producto», compartir y los mismos generadores de Recibo/Imagen y PDF de la parte 4.

Reemplaza solo la hoja inferior por el diseño aprobado, en este orden:
1. Punto de estado + **estado como título**, total a la derecha.
2. Una línea corta con cantidad y el sustantivo del rubro (perfumes, prendas, productos); cantidades reales, singular/plural correctos.
3. Barra de **tres tramos horizontales**, redondeados; debajo Enviado · Confirmado · Despachado. No círculos de un stepper nuevo. Paso actual en negrita y con nombre; los siguientes secundarios. Estado accesible en texto, no solo por color.
4. Recibo e imagen/PDF como ya estaban.
5. «Seguir explorando {nombre de la tienda}».
6. Acceso discreto «¿Eres la tienda? Entra para registrarlo».

| Estado de `verSolicitud` | Título | Línea corta | Color/avance |
|---|---|---|---|
| `enviado` | «Le llegó a {vendedora}» | «N productos · te responde por WhatsApp» | Primer tramo mandarina/resalte; nombre actual atención |
| `confirmado` | «{vendedora} lo confirmó» | «N productos · ya lo tiene anotado» | Dos tramos llenos; estado actual rosa del tablero (#f59bbb), texto legible |
| `despachado` | «Va en camino» | «N productos · salió {fecha/hora real}» cuando exista el dato | Tres tramos llenos Verde Bosque/acción |
| `cancelado` | «Se canceló» | «Si fue un error, escríbele a {vendedora}.» | Barra gris, punto peligro y sin nombres de pasos |
| `vencido` | «Este pedido venció» | Explicación corta y botón para volver al catálogo | Pantalla corta del tablero, sin acciones de registro |

- `nuevo` y `por_despachar` del pedido registrado equivalen a **Confirmado** para el comprador; `despachado` y `cancelado` reflejan esos estados. Una solicitud sin registrar permanece Enviado hasta vencerse; no inventes Confirmado por abrir WhatsApp.
- Usa `nombreVendedora` cuando esté disponible; si no, una frase natural con el nombre de la tienda. No fijes Michel.
- No inventes «salió hoy a las 3:20» ni fecha. Si la lectura pública no devuelve el nombre de la vendedora o `despachadoEn`, comprueba el contrato actual y amplíalo mínimamente si hace falta; sin fecha, usa una línea veraz.
- No vuelvas a poner «Pedido #… · fecha», «Descargar recibo» ni «vence en 24 h»: el número ya está en la historia. La parte 1 genera códigos de **10 caracteres**; los códigos de seis del tablero son ejemplos y no cambian ese contrato.
- El total, líneas finales y recibo deben ser coherentes después de Quitar/Por encargo y de cambios del pedido registrado. Revisa si la lectura existente sigue devolviendo la foto inicial: corrige el contrato necesario sin exponer datos privados; documenta qué conserva como foto fija y qué refleja del pedido.
- Refresca el estado al volver a la pestaña/recuperar foco y al recargar. Si añades polling, que sea moderado, solo mientras se ve la página y con limpieza; no necesita Realtime ni un spinner permanente.
- Una solicitud registrada no vence por alcanzar los siete días. Descartada sigue el estado público que establece el contrato (hoy `vencido`); no la presentes como un pedido registrado cancelado.

## 3. Registrar pedido (Registrar, -b y -c)

Con la sesión correcta muestra la hoja/vista de tienda sobre el mismo enlace:
1. Cabecera **«Pedido del catálogo»** y debajo «#código · hace…».
2. Lista de lo que pidió: portada pequeña (48 px de referencia, usando el tamaño/token adecuado del sistema), nombre, variante, cantidad y subtotal de línea. Precio y descuentos salen de la solicitud guardada, no del precio actual del catálogo.
3. Disponibilidad actual para resolver lo que cambió.
4. Total, calculado con las decisiones pendientes.
5. **«¿Quién te escribió?»**: selector compartido con + Pedido.
6. **«Registrar pedido»** principal y **«No es un pedido»** terciario peligro con confirmación.

**Producto o variante agotado desde que pidió**:
- Mira esa variante concreta, no solo el stock total del producto; stock insuficiente para la cantidad también requiere atención. Stock null significa sin control.
- «Se agotó después de que lo pidió», o la frase equivalente adecuada si quedan menos unidades.
- «Quitar» elimina esa línea del borrador, recalcula total/descuento con la regla de la RPC y ofrece «Deshacer».
- «Por encargo» marca esa línea, muestra su tiempo cuando exista y conserva su precio. No enciende `productos.por_encargo` ni repone stock: es la decisión de la tienda para este pedido.
- Usa `varianteId` para quitar/encargar una combinación; no envíes el `productoId` si eso quitaría todas sus variantes.
- Producto/variante eliminado, inactivo o incompatible: permite quitarlo y explica brevemente qué no se puede registrar; no inventes un encargo de una referencia inexistente.
- Si no queda ninguna línea, Registrar queda deshabilitado con motivo corto; el servidor también rechaza pedido vacío.
- Resolver cambios, seleccionar cliente y escribir no guarda nada. Al cerrar con cambios usa el aviso existente y conserva foco/scroll en vistas internas.

**Guardar**:
- Usa **`useData().registrarSolicitud(tiendaId, solicitudId, datos)`**, que llama a `registrar_solicitud`. No construyas el pedido con `crearPedidoManual` ni insertes cliente/pedido por separado.
- Un cliente existente conserva su identidad y origen. Un cliente nuevo se crea con `origen = 'catalogo'` en la misma operación. Nunca crees el cliente antes de confirmar solo para poder seleccionarlo.
- En la firma revisada, `clienteNuevo` admite nombre y teléfono; el selector existente también ofrece nota. Si muestras Nota en ese flujo, extiende de forma mínima el contrato y la operación atómica para guardarla (máximo vigente de 60), en demo y real; no aceptes una nota que luego se pierda.
- Resultado: pedido `nuevo`, origen catálogo, pago de contado según contrato vigente, solicitud vinculada y fuera de Por registrar. No se confirma/despacha automáticamente ni descuenta inventario.
- Confirma con la vista **«Registrado.»**, texto corto y **«Ver pedido»**, que abre el detalle existente. No copies «Volver a empezar (solo en el tablero)» ni añadas celebraciones de despacho.
- Deshabilita doble envío. Si otra sesión ya registró, relee y ofrece **Ver pedido existente**, sin crear otro. Si se perdió la respuesta, comprueba el vínculo antes de reintentar; no repitas a ciegas.
- Si se venció/descartó mientras estaba abierta, explica y relee. Error de red conocido conserva el borrador y deja reintentar; nunca marques éxito antes de la confirmación.

**«No es un pedido»**: confirma con `Alerta`, llama a `descartarSolicitud`, quita de pendientes al responder OK y conserva la lista ante error. No borra un pedido que ya fue registrado.

**Ya registrado al abrir el enlace**: muestra su estado y acceso al pedido existente para la tienda; no ofrece Registrar de nuevo. Añade una lectura autenticada por código/id si la lista de pendientes no puede resolverlo; no publiques `pedidoId` privado para lograrlo.

## 4. Selector de cliente compartido y contactos Android (Buscar)

Corrige `components/pedidos/selector-cliente.tsx` **también en + Pedido**, sin mantener dos selectores diferentes:
- «Nuevo cliente» siempre primero, antes de Recientes o Coinciden.
- Al buscar, «Crear «texto»» va primero aunque haya coincidencias de nombre o número parcial.
- Dos personas pueden llamarse Ana: no deduzcas identidad por nombre.
- **Única excepción:** un WhatsApp completo y válido que, normalizado, ya pertenece a un cliente de esa tienda. No ofrece crear; muestra solo ese cliente.
- Reutiliza la búsqueda y normalización dominicana existentes; no confundas un prefijo como «809 555» con un teléfono válido. Permite escribirlo y completar el formulario; no registres hasta validarlo.
- `ClienteDuplicado`: muestra al cliente encontrado, permite elegirlo y conserva el borrador de líneas; no lo une ni sobrescribe silenciosamente.
- El selector ofrece modo de cliente nuevo provisional para la solicitud, conservando el comportamiento actual de + Pedido. Búsqueda y formulario son vistas dentro de la misma Hoja, con Volver y protección de cambios; no apiles otra hoja de selección ni rompas Atrás.

Android, solo si `navigator.contacts.select` está disponible en contexto seguro:
- Botón **«Elegir de mis contactos»** en cliente nuevo.
- Se abre por gesto directo; pide un solo contacto, solo nombre y teléfono.
- Llena esos campos y deja revisarlos. Si hay varios teléfonos, deja elegir; valida/normaliza el elegido.
- Cancelar no limpia lo escrito. Sin soporte (incluido iPhone), omite el botón y deja formulario manual.
- Nunca importes toda la agenda ni guardes datos de contactos no elegidos. No envía mensajes.

## 5. Respaldo en Pedidos › Nuevos (Respaldo y PorRegistrar)

- Arriba de los pedidos nuevos, fila **«N del catálogo por registrar»** con contador, subtítulo corto y chevron existente. Solo con pendientes vigentes > 0.
- Usa `solicitudesPendientes(tiendaId)`: excluye registradas, descartadas y vencidas, siempre de la tienda activa.
- Son solicitudes, no pedidos nuevos: no las sumes a ventas, deuda, stock ni al número de pedidos registrados.
- Si no hay pedidos Nuevos pero sí solicitudes, al tocar el tab Pedidos entra a Nuevos para que se vea el respaldo. Sin ambos conserva la regla actual de caer en Por despachar. No cambies un filtro que la persona ya eligió mientras está mirando.
- Abre **«Por registrar»** con una fila por solicitud: #código, antigüedad/cantidad y total, tocable. Sigue el orden vigente de la fuente; deja el más reciente primero si no existe uno definido. Cifras reales, singular/plural y fecha relativa de Santo Domingo.
- Abrir una fila lleva al mismo flujo de Registrar. Volver restaura lista/scroll/foco; después de registrar/descartar recalcula contador y vacío.
- Esqueleto, aviso con Reintentar y vacío amable. Sin un error convertido en «0 pendientes».
- Relee al volver del enlace/WhatsApp, al recuperar foco y después de operaciones propias. Evita duplicar listeners.
- Reutiliza el vencimiento/limpieza de la parte 1: no implementes borrar desde el navegador ni otra tarea que elimine solicitudes registradas.

## 6. Avísame y «Ya llegó»: completar lo existente

La parte 2 ya implementó `avisosDeProducto`, `marcarAvisado`, «N esperan», reposición y la tarjeta **«Ya llegó»**. Revísalos antes de tocar: esta parte completa huecos e integra, no hace un sistema paralelo.

- Lista de espera accesible desde «N esperan» del producto/inventario; nombre o «Sin nombre», WhatsApp formateado, variante si existe, botón **Avisar** y estado Avisado.
- Solo avisos de la tienda activa, producto y variante pertinentes. Reponer M · Negro no avisa a quien espera S · Blanco.
- «Avisar» abre WhatsApp con el mensaje aprobado de docs/12/parte 2 y el enlace real al producto. Usa el `urlCatalogo` vigente y su slug; no adelantes el cambio del HTML a React. Si no hay catálogo publicado/enlace válido, explica antes de ofrecer un enlace inexistente.
- Reutiliza la marca `avisadoEn` al volver del flujo existente. **Abrir WhatsApp no prueba que el usuario envió el mensaje**: no muestres «Entregado» ni prometas entrega, y deja esa limitación clara en el handoff. No marques nada si falló la apertura.
- Si falla `marcarAvisado`, conserva la fila como pendiente con reintento. No vuelvas a abrir WhatsApp automáticamente.
- Mantén el conteo y evita avisar otra vez a filas ya marcadas; no crees pedidos/clientes/ventas por pedir o enviar un aviso.

## 7. Contratos, datos y migraciones

En main revisado (4 oct 2026) ya existen:
- `solicitudesPendientes`, `registrarSolicitud`, `descartarSolicitud`, `avisosPendientes`, `avisosDeProducto`, `marcarAvisado`.
- `catalogoPublico`, `crearSolicitudPedido` y `verSolicitud`, con demo/real.
- `VistaSolicitud` trae id solo para miembro de la tienda y `esMiTienda`; no incluye aún todos los datos que pueden requerir el título/fecha o el acceso al pedido ya registrado. Comprueba de nuevo después de la parte 4.

Primero inventaría los contratos reales. Amplía solo lo necesario para §1–§6, con demo y real equivalentes y tipos/conversores/pruebas actualizados:
- Lectura privada de solicitud ya registrada y su vínculo al pedido.
- Estado/fecha/datos públicos estrictamente necesarios y coherencia de líneas/totales del comprador.
- Nota opcional del cliente nuevo, si se ofrece.
- Validación de decisiones y disponibilidad bajo concurrencia si el servidor actual no hace cumplir el flujo. Descuento/total finales siempre autoritativos; el cliente no decide precios.

No dupliques tablas ni RPC existentes. Si hace falta SQL, crea **una migración nueva compatible** (o las mínimas necesarias), no edites aplicadas. Proyecto `euihaeyfdlpvmbtfzvnt`; aplica según AGENTS.md, usa la versión que devuelva Supabase/list_migrations y ejecuta `npm run revisar:migraciones` con cero diferencias. Si hay divergencia, investígala y reporta; no hagas db push general ni repares el historial a ciegas. Datos específicos de Michel no van en migraciones.

Autorización y consistencia en el servidor: membresía real, RLS, bloqueo de solicitud y creación atómica, aislamiento entre tiendas, rechazar vacías y conservar el vínculo. No expongas service_role ni datos privados por la RPC pública. La concurrencia no puede producir dos pedidos o dos clientes a partir de una misma solicitud. Añadir datos a la respuesta pública requiere revisar permisos, no solo ocultarlos con CSS.

## 8. Comprobación

- `npm run lint`, `npm run build`, `npm test`, typecheck de la versión instalada, `npm run revisar:migraciones` y todos los `probar:*` aplicables (hojas, teclado, inventario, producto, pedidos y catálogo React).
- Si una suite falla, compara con main y distingue fallo previo de regresión. `probar-proximamente` tiene fallo conocido en main: documenta, no lo presentes como aprobado.
- Pruebas puras/de datos para estados, totales después de quitar, excepción de teléfono completo, vencimiento y conservación de variantes.

**Script nuevo `scripts/probar-pedido-catalogo-panel.mjs`**, demo, 360/390/430 px, claro y oscuro para el panel y reducir movimiento:
1. Solicitud desde catálogo → Enviado, recibo vigente, sin pedido/cliente/stock nuevo.
2. Vista comprador sin sesión; miembro correcto ve Registrar; otra tienda no obtiene operaciones/datos privados.
3. Buscar por nombre, número parcial y número válido existente; Crear primero y excepción exacta. Dos Ana se distinguen; duplicado permite usar existente.
4. Quitar/Deshacer y Por encargo de una variante sin afectar otra; total/descuento coherentes; todas quitadas bloquean.
5. Cliente nuevo provisional: cerrar/cancelar no crea cliente; registrar crea una sola vez, con nota si se ofrece.
6. Registrar → un pedido Nuevo del catálogo y comprador Confirmado; por despachar sigue Confirmado; despachar → Va en camino, cancelación → Se canceló.
7. Stock no cambia al registrar; despacho y deshacer conservan las reglas por variante/encargo.
8. Doble toque, registro simultáneo, respuesta perdida y recarga: un pedido, acceso al existente y sin duplicar cliente.
9. Respaldo sin pedidos nuevos, lista, contador, volver y vacío después de registrar/descartar.
10. Vencida a siete días, descartada, inexistente y registrada con más de siete días.
11. Foco, Volver/Atrás, cinco cierres de Hoja, cambios sin guardar y teclado en búsqueda/nombre/WhatsApp/nota; sin overflow ni capas sobre el blur.
12. Avísame: reposición de variante correcta, enlace de WhatsApp, marcado y error al marcar sin envío automático.
13. Red caída en lectura/escritura y cambio de tienda: borradores conservados, reintento seguro, sin acceso cruzado.

**Real (Supabase)**:
- Escenarios SQL transaccionales con rollback: membresía, otra tienda/anon, doble registro concurrente, cliente duplicado, variantes, total/descuento y coherencia pública/privada. No pruebes concurrencia secuencial diciendo que fue simultánea.
- Flujo completo en preview con tienda de prueba/controlada: comprador sin sesión → solicitud → tienda con sesión → pedido en Nuevos → estado público. Si no puedes acceder al navegador real, dilo: SQL o demo no lo sustituyen.
- No despaches ni elimines ventas históricas de Michel para probar. Usa fixtures de prueba identificables, conserva inventario y limpia lo que creaste; di qué pudo quedar.
- Tras SQL nuevo, lectura de historia de migraciones y advisors de permisos; repo/base alineados.

**Safari/iPhone y Android**:
- iPhone/Safari o WebKit: OAuth vuelve al código, teclado/foco, WhatsApp al volver y recibo PNG/PDF. Chromium con viewport de iPhone no equivale a Safari ni al teléfono físico.
- Android compatible: Contact Picker con permiso, cancelación y selección de teléfono. Sin soporte: formulario manual.
- Si no dispones del navegador/dispositivo, anota pendiente y entrega pasos a Lewis.

Capturas en `docs/capturas/pedido-catalogo-panel/`: comprador en los cinco estados, Registrar antes/después de resolver agotado, selector con búsqueda, Registrado, respaldo/lista y Avísame. Compara con los tableros y explica diferencias esperadas de datos/tokens; nada de números del mockup fijados en código.

## 9. Documentación y cierre

Actualiza `docs/04-pantallas.md`, `docs/05-arquitectura.md` si cambia sesión/lecturas, `docs/12-catalogo-conectado.md` si hay una aclaración técnica necesaria (sin cambiar decisiones de producto sin explicarlo), `HANDOFF.md`, novedades y «Dónde va el trabajo» en `docs/00-contexto-del-proyecto.md`.

PR contra la base que corresponda según §0, con:
- Qué cambió y cómo se enlaza con la parte 4.
- Rama/commit, modelo usado, migraciones/versiones y aplicación real.
- Resultados de cada comprobación, fallos previos frente a regresiones y límites.
- Contratos que faltaban y cómo se resolvieron; decisiones fuera del prompt, si hubo.
- Capturas, preview READY y enlace; datos de prueba/limpieza.
- Handoff copiable para Planning: cambios, validaciones realizadas, pendientes, estado de Supabase y despliegue.

Deja el PR abierto y sin fusionar para que Lewis pruebe el preview. No hagas merge ni publiques producción aunque pasen las pruebas. Si algo requerido está bloqueado/falla o decidiste algo no previsto, explícalo; no llames aprobado a lo no ejecutado. El HTML y `url_catalogo` siguen sin cambiar.

**Al final dile a Lewis cómo validar en su teléfono**, con pasos concretos y resultado esperado:
1. Desde el catálogo React de prueba, arma dos productos (uno con variante si aplica), envía y abre el enlace: Enviado y recibo correctos.
2. Toca «¿Eres la tienda?», entra con Google y comprueba que vuelve al mismo pedido.
3. Busca/crea cliente; prueba Quitar, Deshacer y Por encargo si algo se agotó. Cancelar no guarda.
4. Registra: aparece una sola vez en Nuevos; comprador ve Confirmado y stock no bajó.
5. En un pedido de prueba, pasa por Por despachar y Despachado: comprador refleja el estado y el recibo sigue siendo coherente.
6. Comprueba la fila Por registrar cuando no hay nuevos, descarte con confirmación y lista vacía.
7. Prueba teclado, Atrás y salir sin guardar; Android prueba contactos si está disponible.
8. Prueba Avísame con una variante repuesta y revisa el mensaje antes de enviarlo.

Distingue pruebas seguras en Demo de las que necesitan tienda de prueba real. No le pidas a Lewis probar escrituras reales antes de que la migración y la app compatibles estén desplegadas.
