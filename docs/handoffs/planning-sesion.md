# Relevo de Planning (6 oct 2026)

Para la sesión de Planning que retome. Lee primero `docs/00-contexto-del-proyecto.md`, `AGENTS.md` y `HANDOFF.md`. Esto es lo que una sesión nueva no sabría.

## Cómo trabaja Lewis con Planning

- Habla en español dominicano. Respuestas cortas, sin listas numeradas largas ni texto técnico de más.
- Planning **no edita código de la app**: analiza (leyendo el código, no suponiendo), corrige a Lewis si se equivoca y le da un prompt para Coding. Puede editar `docs/`, `referencias/` y `docs/prompts/` y subirlos a `main`.
- Cada prompt: completo y autocontenido en `docs/prompts/<nombre>.md`, más un prompt corto para pegar que apunta al archivo. **Siempre dice el modelo y su equivalente en Codex**: Sonnet 5.5 / Codex modelo principal en medium para casi todo; Opus 5.5 / Codex modelo top en high solo para seguridad, permisos, dinero en la base o bugs difíciles (a Lewis le queda poco límite de Opus).
- Merge: solo cuando Lewis dice «mergea»: `gh api -X PUT repos/onedayoneproj-blip/deslizapp-app/pulls/N/merge -f merge_method=squash`. Planning no puede borrar ramas (403); se le pide a Lewis.
- Diseño: lienzos de Claude Design (artifacts) primero, Lewis aprueba, luego se copian a `referencias/<carpeta>/` con su `LEEME.md`. Textos con la voz de `docs/11`.
- Datos reales (dar créditos, cambiar plan de una tienda) por SQL con el MCP de Supabase solo si Lewis lo pide; nunca en migraciones. Ojo: un cambio por SQL directo no deja rastro en `registro_admin`; mejor que Lewis lo haga desde `/admin` cuando se pueda.

## Cola para Coding (Lewis pega los prompts)

En este orden; los que no dependen entre sí pueden ir en paralelo en otra sesión de Coding.

| Prompt | Modelo | Depende de | Cierre |
|---|---|---|---|
| `retoque-beta-y-tienda-de-ensayo.md` | Sonnet | — | **Hecho**, PR #55 mergeado el 6 oct |
| `mi-marca.md` (rama `feat/mi-marca`) | Sonnet | #55 | **En curso.** Migración revisada por Planning y autorizada; PR abierto con preview (cambia quién puede retocar). Debe conectar la compuerta al interruptor de #56 |
| `selector-de-tiendas.md` (rama `feat/selector-tiendas`) | Sonnet | — (paralelo) | merge a main. Incluye §2b: volver del admin al panel |
| `retoque-al-subir.md` (interruptor «Retocar esta foto», apagado por defecto) | Sonnet | — | **Hecho**, PR #56 mergeado el 6 oct; la compuerta de marca la añade `mi-marca.md` |
| `colaboradores-e-invitaciones.md` (rama `feat/equipo-e-invitaciones`) | **Opus** | #57 mergeado; no a la vez que `ver-como-bloqueo-en-la-base.md` | PR abierto con preview. Niveles Ayudante/Editor/Administrador, enlaces de un solo uso con aprobación del dueño, enlace de tienda nueva desde el admin |
| `ver-como-bloqueo-en-la-base.md` (rama `fix/ver-como-bloqueo`) | **Opus** | — (no a la vez que el anterior; Lewis decide el orden) | PR abierto, Planning mergea |
| `admin-4-cobros.md` | Sonnet | #57 mergeado (menú, novedades) | PR abierto con preview: la app de las tiendas empieza a leer planes de la base (§0b del prompt) |
| `precio-marca-y-promociones.md` | Sonnet | parte 4 y Mi marca | PR abierto si cambia el cálculo del monto |
| `suscripciones-y-varias-tiendas.md` | **Opus** | parte 4 y selector | PR abierto con preview |

Sin prompt todavía (los escribe Planning cuando toque):
- **Mi marca «mágica»**: idea anotada en `docs/15-mi-marca-magica.md` (cuestionario como historias de Instagram, tarjeta de marca con IA, rondas opcionales, nombre de marketing; Instagram solo conectando la cuenta del dueño). Falta: lienzo de diseño y que Lewis elija el nombre.
- ~~Bloqueo en la base de las escrituras durante Ver como~~: prompt escrito, `docs/prompts/ver-como-bloqueo-en-la-base.md` (Opus, rama `fix/ver-como-bloqueo`, PR abierto). Ponerlo en la cola antes de `suscripciones-y-varias-tiendas`.
- Onboarding, opción B (historias + historias): especificación y prompt; incluye la parte 5 del admin, invitaciones.
- Adaptar `suscripcion-tienda.md` al modelo de suscripciones por titular (después de `suscripciones-y-varias-tiendas`).
- «Importar productos» / entrevista de inventario.
- Actualizar `docs/13` §1 sobre el enlace «Administrar Deslizapp».

## Decisiones tomadas en esta sesión

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
- Número de WhatsApp de Deslizapp (`WHATSAPP_DESLIZAPP` en `lib/config.ts` está vacío).
- Si existe la fila «Marca y diseño» en `precios_extra`.
- Una segunda cuenta no admin para probar Ver como y el 404 del admin.
- Datos de pago (banco, precios de paquetes de créditos, créditos de Pro): lo dejó para después.

## Pendientes de Lewis

- Dar +20 créditos a la Tienda de ensayo desde Admin › Tiendas › Tienda de ensayo › Ajustar créditos (tiene 0).
- Borrar en GitHub las ramas `feature/admin-tiendas` y `feature/admin-trabajo` (y las viejas que lista `docs/00`).
- PRs abiertos viejos: #45 (rendimiento, excluido a propósito), #43, #23, #2.

## Lienzos de diseño (artifacts de claude.ai)

Las copias aprobadas están en `referencias/`. Los lienzos originales, por si hay que revisarlos:
- Bienvenida animada del retoque: https://claude.ai/artifact/PWD9r28iVB5hVixYnTrGxs
- Selector de tiendas y cuenta: https://claude.ai/artifact/BJQoV8n8F14HJW7ScKigxU
- Suscripción: https://claude.ai/artifact/CJkG9GHZhxFVtuwEmAgrHA
- Onboarding: https://claude.ai/artifact/GRm2BmLszQfAhckVr8WMWQ
- Admin: https://claude.ai/artifact/SLfwtzESN4gY62kqj2g35S
- Sistema de diseño: https://claude.ai/artifact/RCoUxuMyAQ49oEFywmDK3t
