# Relevo de Planning (6 oct 2026)

Para la sesión de Planning que retome. Lee primero `docs/00-contexto-del-proyecto.md`, `AGENTS.md` y `HANDOFF.md`. Esto es lo que una sesión nueva no sabría.

## Cómo trabaja Lewis con Planning

- Habla en español dominicano. Respuestas cortas, sin listas numeradas largas ni texto técnico de más.
- Planning **no edita código de la app**: analiza (leyendo el código, no suponiendo), corrige a Lewis si se equivoca y le da un prompt para Coding. Puede editar `docs/`, `referencias/` y `docs/prompts/` y subirlos a `main`.
- Cada prompt: completo y autocontenido en `docs/prompts/<nombre>.md`, más un prompt corto para pegar que apunta al archivo. **Siempre dice el modelo y su equivalente en Codex**: Sonnet 5.5 / Codex modelo principal en medium para casi todo; Opus 5.5 / Codex modelo top en high solo para seguridad, permisos, dinero en la base o bugs difíciles (a Lewis le queda poco límite de Opus).
- Merge: solo cuando Lewis dice «mergea»: `gh api -X PUT repos/onedayoneproj-blip/deslizapp-app/pulls/N/merge -f merge_method=squash`. Planning no puede borrar ramas (403); se le pide a Lewis.
- Diseño: lienzos de Claude Design (artifacts) primero, Lewis aprueba, luego se copian a `referencias/<carpeta>/` con su `LEEME.md`. Textos con la voz de `docs/11`.
- Datos reales (dar créditos, cambiar plan de una tienda) por SQL con el MCP de Supabase solo si Lewis lo pide; nunca en migraciones. Ojo: un cambio por SQL directo no deja rastro en `registro_admin`; mejor que Lewis lo haga desde `/admin` cuando se pueda.

## Prioridad actual (7 oct 2026, Lewis)

**Nada de admin por ahora** (`admin-4-cobros` queda en pausa; con lo que tiene el admin le alcanza). **Todo lo que concierne al uso de la app por la tienda y el comprador**: que la tienda y el catálogo estén listos para que Lewis mande el **enlace de invitación** a contactos de confianza que prueben, y preparar el lanzamiento lo antes posible.

**Hallazgo (7 oct):** el catálogo público de una tienda solo responde si `tiendas.estado = 'activa'` **y** `catalogo_estado = 'publicado'` (`tienda_publica`). Una tienda nueva (en_prueba, catálogo «sin») no tiene catálogo público hasta que Lewis la active y publique desde el admin. Para probadores, hace falta una **publicación automática** («Publicar mi catálogo», sin paso manual) o hacerlo a mano por cada tienda. Pendiente de decidir con Lewis.

**Cambio por SQL en datos reales (7 oct, pedido por Lewis):** la Tienda de ensayo (`tienda-de-ensayo`) pasó a `estado = 'activa'` y `catalogo_estado = 'publicado'` (con `activada_en`, `catalogo_publicado_en` y `url_catalogo` iguales a los de Esencias Michel) para poder ver su catálogo público y probar las presentaciones. Sus 2 productos siguen **ocultos**. No dejó rastro en `registro_admin`. Ojo: el admin **no puede activar una tienda** (`admin_cambiar_estado_tienda` solo pausa, reactiva y cambia la prueba) y `publicar_catalogo` es una acción de la tienda: **una tienda en prueba nunca tiene catálogo público** hasta que se registra su primer pago; es parte de lo que resuelve «Publicar mi catálogo».

**Datos de prueba en la Tienda de ensayo (7 oct, por SQL, pedido por Lewis):** «Aro de ensayo» con presentaciones Tamaño (Chico/Grande) × Color (Plata/Dorado), una agotada (Grande · Plata), una con precio propio (Grande · Dorado RD$450) y foto por color; «Frasco de ensayo» con Tamaño 30/50/100 ml (RD$300 / el base RD$500 / RD$800, la de 100 ml agotada). Las variantes se insertaron directo (sin historial de inventario). Sirven para probar el panel y el catálogo público real.

**Orquestación:** Planning puede crear/mandar mensajes/leer sesiones de Coding (herramientas `mcp__claude-code-remote__*`). Reglas acordadas: crear sesiones solo cuando Lewis lo pide («lanza X»), decir el modelo, nunca dos sesiones con migraciones a la vez, mergear solo lo que Lewis marque; siempre contarle qué se le mandó a cada sesión. Coding responde por send_message si se le pide («avísame con una línea»). **Coordinación entre cuentas (7 oct, Lewis):** Lewis usa un Planning en cada cuenta (dos de Claude y Codex); la única fuente de verdad es el repo: este relevo, `docs/00` y `docs/16`. Cada Planning lo actualiza al lanzar, mergear o decidir algo, y lo lee antes de lanzar.

## Cola para Coding (Lewis pega los prompts)

En este orden; los que no dependen entre sí pueden ir en paralelo en otra sesión de Coding.

| Prompt | Modelo | Depende de | Cierre |
|---|---|---|---|
| `retoque-beta-y-tienda-de-ensayo.md` | Sonnet | — | **Hecho**, PR #55 mergeado el 6 oct |
| `mi-marca.md` (rama `feat/mi-marca`) | Sonnet | #55 | **Hecho**, PR #57 mergeado el 7 oct (squash `16bf9a6`) tras la prueba de Lewis en el iPhone. Compuerta conectada al interruptor de #56. Falta borrar la rama `feat/mi-marca` |
| `selector-de-tiendas.md` (rama `feat/selector-tiendas`) | Sonnet | — (paralelo) | merge a main. Incluye §2b: volver del admin al panel |
| `retoque-al-subir.md` (interruptor «Retocar esta foto», apagado por defecto) | Sonnet | — | **Hecho**, PR #56 mergeado el 6 oct; la compuerta de marca la añade `mi-marca.md` |
| `colaboradores-e-invitaciones.md` | **Opus** | — | **Hecho**, PR #61 mergeado el 7 oct (squash `4e15ebf`). Niveles Ayudante/Editor/Administrador, enlaces de un solo uso con aprobación del dueño, enlace de tienda nueva desde el admin. Sin probar con una segunda cuenta de Google real (Lewis lo hará con más testers). Falta borrar la rama `feat/equipo-e-invitaciones` |
| `ver-como-bloqueo-en-la-base.md` | **Opus** | — | **Hecho**, PR #59 mergeado el 7 oct por indicación de Lewis; probado por Lewis en Ver como (funciona) |
| `admin-4-cobros.md` | Sonnet | #57 mergeado (menú, novedades) | PR abierto con preview: la app de las tiendas empieza a leer planes de la base (§0b del prompt) |
| `precio-marca-y-promociones.md` | Sonnet | parte 4 y Mi marca | PR abierto si cambia el cálculo del monto |
| `suscripciones-y-varias-tiendas.md` | **Opus** | parte 4 y selector | PR abierto con preview |
| `presentaciones-panel.md` (rama `feat/presentaciones-panel`) | Sonnet | — (después de equipo; no a la vez que otra migración) | **Hecho**, PR #62 mergeado el 7 oct (squash, migración `20261007125411` aplicada). Falta que Lewis lo pruebe en la demo (Lino & Algodón y Esencias Michel) |
| `presentaciones-catalogo.md` (rama `feat/presentaciones-catalogo`) | Sonnet | `presentaciones-panel.md` | **Hecho**, PR #63 mergeado el 7 oct (squash `2e0f4eb`) con el botón «Elegir otra ›». Lewis lo autorizó; sin probar en iPhone real todavía (lo hará él). Falta borrar la rama `feat/presentaciones-catalogo` |
| `tipo-de-producto.md` (rama `feat/tipo-de-producto`) | Sonnet | `presentaciones-catalogo.md` en main | merge a main si una tienda con un solo rubro no cambia en nada. **Obligatorio para lanzar** (Lewis probará con tiendas de varios rubros). **Siguiente después del arreglo de las hojas** (7 oct, Lewis: nadie lo tiene). Ya cubre lo que Lewis pidió: `<select>` nativo «Tipo de producto» en el formulario y filtro nativo de tipos en la vista del Catálogo, solo con más de un rubro |
| `bloquear-video.md` (rama `fix/bloquear-video`) | Sonnet | — (una migración; no a la vez que otra) | **Hecho**, PR #64 mergeado el 7 oct (migración `20261007161952`). Por ahora no se suben videos; lo que ya existe se sigue viendo |
| `hojas-del-catalogo-gestos.md` (rama `fix/hojas-gestos`) | Sonnet | — | **Hecho**, PR #65 mergeado el 7 oct. Lewis lo probó: falta el scroll con la hoja expandida (siguiente fila) |
| `hojas-scroll-expandida.md` (rama `fix/hojas-scroll-expandida`) | Sonnet | #65 | PR abierto con preview; lo prueba Lewis en el iPhone. **Lanzado por Planning el 7 oct** (ver abajo la sesión) |
| `publicar-catalogo.md` (rama `feat/publicar-catalogo`) | Sonnet | `bloquear-video` y `tipo-de-producto` (una migración a la vez) | PR abierto con preview; Planning revisa el SQL y Lewis prueba con una tienda de prueba. El catálogo de una tienda en prueba es público al publicarlo, sin indexar |

Sin prompt todavía (los escribe Planning cuando toque):
- **Mi marca «mágica»**: idea anotada en `docs/15-mi-marca-magica.md` (cuestionario como historias de Instagram, tarjeta de marca con IA, rondas opcionales, nombre de marketing; Instagram solo conectando la cuenta del dueño). Falta: lienzo de diseño y que Lewis elija el nombre.
- ~~Bloqueo en la base de las escrituras durante Ver como~~: prompt escrito, `docs/prompts/ver-como-bloqueo-en-la-base.md` (Opus, rama `fix/ver-como-bloqueo`, PR abierto). Ponerlo en la cola antes de `suscripciones-y-varias-tiendas`.
- Onboarding, opción B (historias + historias): especificación y prompt; incluye la parte 5 del admin, invitaciones.
- Adaptar `suscripcion-tienda.md` al modelo de suscripciones por titular (después de `suscripciones-y-varias-tiendas`).
- «Importar productos» / entrevista de inventario.
- Actualizar `docs/13` §1 sobre el enlace «Administrar Deslizapp».

## Decisiones tomadas en esta sesión

- **Presentaciones de producto** (7 oct): un producto con sus presentaciones (no un producto por talla); hoja propia por presentación; foto por color; nombre «Presentaciones» en el panel. En el catálogo del cliente, **opción B** («Ver presentaciones» con hoja de todas juntas) y ♥ sin elegir abre la hoja de pastillas de la opción A. Diseño en `referencias/presentaciones/`; prompts `presentaciones-panel.md` y `presentaciones-catalogo.md`.

- **Marianny = Michel** (Marianny Michel, la dueña de Esencias Michel; en la base, Michel Guerrero). Es la titular de la suscripción sin límite de Esencias Michel.

- **Retoque**: no es automático. Modelo de inteligencia de imagen asistido por expertos en branding, con la marca de la tienda como guía. Es Beta. Créditos: se reservan al pedir, se cobran al entregar, «Devolver» los regresa. Es **opcional**: la tienda decide con un interruptor al subir la foto (prompt `retoque-al-subir.md`).
- **Mi marca**: logo, Instagram, 3 palabras, 3 a 6 fotos de referencia y «lo que no quiero» opcional. Marca lista = 3 palabras y al menos 3 referencias; sin eso no se puede retocar. Bienvenida animada (hoja) la primera vez. El paquete «Marca y diseño» cuesta RD$5,000, con precio editable y promociones.
- **Varias tiendas**: la base ya lo soporta (`miembros`, `mis_tiendas()`, `usuarios.tienda_id` = tienda por defecto); falta el selector real. Encabezado opción A (ícono de la tienda, como está); «Mi marca» va dentro de la tarjeta de la tienda activa en el menú; la cuenta (foto, nombre y correo de Google) abajo del menú.
- **Suscripciones** (`docs/14` §2): la suscripción es del titular (usuario), un usuario puede tener varias, las tiendas cuelgan de una suscripción y comparten productos, colaboradores y créditos; límites de tiendas, colaboradores y productos editables por plan y por suscripción a medida; «sin límite» como valor propio.
- **Datos reales**: Esencias Michel (`0753d2a7-469e-43a5-9fc7-51336720db83`) y Tienda de ensayo (`0c2be65b-f525-46a2-9bcb-c1628eb965aa`) están en plan `custom` con `limite_productos = 100000` como parche de «ilimitado» hasta que entre el prompt de suscripciones. Ahí: Esencias Michel → suscripción sin límite, titular Michel Guerrero (Lewis sigue de co-dueño); ensayo → sin límite, titular Lewis.

## Preguntas abiertas para Lewis

- ¿El límite de colaboradores se cuenta por suscripción? (Así está en el prompt.)
- Niveles de permiso de colaboradores: **confirmados por Lewis (7 oct)** y escritos en `docs/prompts/colaboradores-e-invitaciones.md` (junto con las invitaciones por enlace). El prompt de suscripciones solo suma el límite de colaboradores en el gancho `puede_sumar_colaborador`.
- Tiempo de entrega del retoque (`TIEMPO_RETOQUE_TEXTO` vacío hasta que lo mida).
- ~~Número de WhatsApp de Deslizapp~~: **resuelto (7 oct)**. No habrá número: el contacto con Deslizapp es el enlace directo al Instagram `instagram.com/deslizapp` (`INSTAGRAM_DESLIZAPP` en `lib/config.ts`). `WHATSAPP_DESLIZAPP` se retira (hoy solo lo usa `components/panel/hoja-plan.tsx`; lo cambia `admin-4-cobros`).
- Si existe la fila «Marca y diseño» en `precios_extra`.
- Una segunda cuenta no admin para probar Ver como y el 404 del admin.
- Datos de pago (banco, precios de paquetes de créditos, créditos de Pro): lo dejó para después.

## Pendientes de Lewis

- ~~Créditos de la Tienda de ensayo~~: **hecho (7 oct)**, Lewis le dio 100 créditos desde el admin.
- Borrar en GitHub las ramas `feature/admin-tiendas` y `feature/admin-trabajo` (y las viejas que lista `docs/00`).
- PRs abiertos viejos: #45 (rendimiento, excluido a propósito), #43, #23, #2.

## Onboarding (lienzo «Onboarding de Deslizapp», 7 oct 2026)

Lienzo: https://claude.ai/artifact/GRm2BmLszQfAhckVr8WMWQ (31 pantallas). Recorrido: enlace por WhatsApp → introducción en historias (4) → datos básicos en historias (nombre, lo que vende, chat, «Tú») → «su tienda ya existe» → Inicio con checklist de 7 pasos.
- **Aprobado por Lewis:** opción B (introducción y datos en historias); **el checklist de 7 pasos** y **las tiendas de varios tipos de producto** (aprobados el 7 oct).
- **Decisión (actualizada el 7 oct):** al crear un enlace de tienda nueva, el admin **puede pre-llenar el nombre y lo que vende (uno o varios tipos), y es opcional**. La persona lo ve ya puesto, solo confirma, y **puede modificarlo** o llenarlo desde cero si el admin no lo puso. Esto exige ampliar `enlaces_invitacion` (nombre y tipos sugeridos), `admin_crear_enlace_tienda_nueva`, `crear_mi_tienda` y la pantalla Más › Invitaciones: va en el prompt de onboarding, no en #61.
- Falta: copiar el lienzo a `referencias/onboarding/`, y escribir los prompts: (1) onboarding (historias, tienda creada con sus datos, alinear `/unirse` y «Tu equipo» con el diseño, estado «esperando aprobación» en el enlace de equipo); (2) checklist de Inicio y desbloqueo de «Pide tu catálogo»; (3) tipos de producto (cambia el modelo de datos), aparte.
- Va después de `admin-4-cobros`.

## Ideas en evaluación (7 oct 2026, Lewis)

- **Lista de productos prohibidos aprobada por Lewis:** armas y municiones, drogas ilegales, sexo explícito, productos falsificados, documentos falsos, medicamentos con receta, animales vivos (los Términos tienen que decirlo).
- **Revisión de productos nuevos** con IA (Claude desde el servidor, foto + texto): estados «En revisión» / aprobado / dudoso (cola en el admin) / rechazado; después de aprobado, los cambios salen al instante pero se revisan **después** (se ocultan solos si no pasan); tiendas con buen historial saltan la revisión previa; los productos existentes se dan por aprobados. Requiere un servicio de IA de Deslizapp (clave de API en Vercel, control de costo y registro de uso) que también usarán Mi marca «mágica» y crear producto desde foto.
- **Tipo de producto (decidido por Lewis, 7 oct):** SÍ va el rubro por producto: la tienda tiene uno o varios («Lo que vendes») y cada producto un «Tipo de producto» (selector nativo, solo con más de un rubro; filtro en el Catálogo; búsqueda del cliente por tipo). Prompt: `docs/prompts/tipo-de-producto.md` (Sonnet; no cambia los Detalles).
- **«Detalles» se reemplaza** (propuesta de Lewis): fuera los campos por rubro; en su lugar una **descripción corta (caption)** y una **ficha técnica como imagen** que la tienda sube, con un botón circular con ícono de ficha junto a «Ver presentaciones» que abre la imagen. Si no tiene ficha, Deslizapp se la genera **gastando créditos**. **Ojo:** la búsqueda del catálogo (`lib/tienda/busqueda.ts`) se apoya en los Detalles (sinónimos de notas, «para ella», ocasiones): quitarlos estropea la búsqueda de perfumes. Propuesta: dejar de pedirlos a la tienda y generarlos solos como «etiquetas de búsqueda» ocultas (con IA); los de Michel se conservan. Sin decidir; no hay prompt.

## IA de Deslizapp: más adelante (decisión de Lewis, 7 oct 2026)

La IA (servicio de Claude desde el servidor, revisión automática de productos, etiquetas de búsqueda automáticas, ficha técnica generada) **se introduce más adelante**. Por ahora todo es **manual**: la ficha técnica la sube la tienda o la hace el equipo de Deslizapp (con créditos, como el retoque); la revisión de productos se diseña pero se difiere. Todo se construye con los mismos estados y colas para que la IA se enchufe después sin rehacer nada.

## Ficha técnica y revisión: decisiones del 7 oct

- **Revisión de productos nuevos: diferida** hasta abrir el registro al público o hasta que llegue la IA (acuerdo Lewis/Planning). Mientras tanto, las tiendas nuevas solo entran con enlace de Lewis.
- **Detalles:** dejan de pedirse a las tiendas nuevas; los de Michel se conservan y se siguen mostrando. Se reemplazan por descripción corta + ficha técnica en imagen.
- **Pendiente de verificar:** hoy el admin **no puede ocultar un producto** de una tienda (no hay función `admin_*` para eso; solo pausar la tienda entera con `admin_cambiar_estado_tienda`, o SQL). Hace falta una acción mínima «Ocultar producto» en la ficha de tienda del admin, y que los Términos incluyan la lista de prohibidos.
- **Lienzo de la ficha técnica** (tarjeta en el panel, botón circular en el reel, cola en el admin): Lewis dijo «más tarde». Sin prompt hasta entonces.
- Falta aclarar con Lewis quién hace las fichas pedidas a Deslizapp («el equipo» = él y quien le ayude, desde Admin › Trabajo, como el retoque).

## Para recordarle a Lewis más adelante (él lo pidió, 7 oct)

- **Abrir la cuenta de desarrollador de Meta** (gratis; con su Facebook). Con el acceso estándar se puede probar «conectar Instagram» con la cuenta de Michel; el acceso avanzado (otras tiendas) pide App Review y Business Verification, y probablemente una empresa registrada (RNC) y dominio propio. Detalle en `docs/15-mi-marca-magica.md`.
- **Elegir el nombre de marketing** de Mi marca «mágica» (propuesta: **Vibra**; rondas Vibra 1, 2 y 3).
- Cuando toque Mi marca «mágica»: lienzo de diseño del cuestionario de historias → Lewis aprueba → prompt.

## Lienzos de diseño (artifacts de claude.ai)

Las copias aprobadas están en `referencias/`. Los lienzos originales, por si hay que revisarlos:
- Bienvenida animada del retoque: https://claude.ai/artifact/PWD9r28iVB5hVixYnTrGxs
- Selector de tiendas y cuenta: https://claude.ai/artifact/BJQoV8n8F14HJW7ScKigxU
- Suscripción: https://claude.ai/artifact/CJkG9GHZhxFVtuwEmAgrHA
- Onboarding: https://claude.ai/artifact/GRm2BmLszQfAhckVr8WMWQ
- Admin: https://claude.ai/artifact/SLfwtzESN4gY62kqj2g35S
- Sistema de diseño: https://claude.ai/artifact/RCoUxuMyAQ49oEFywmDK3t
