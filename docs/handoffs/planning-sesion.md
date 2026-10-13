# Relevo vigente de Planning

Actualizado: 13 de octubre de 2026, comprobado contra GitHub. `main` está en `aa5dc92` (squash de #120). Ver «Estado al 13 oct» y «Estado al 12 oct» abajo; las líneas «En curso (11 oct)» de más abajo son históricas salvo crear producto.

## Acuerdo vigente

Esta sesión con acceso real a Notion es Planning principal por instrucción de Lewis. Planning analiza, organiza tareas, prepara prompts, revisa entregas y escribe documentación; no edita código de la app. Lewis pasa manualmente los encargos a Coding. Avisarle cuando haga falta una nueva sesión. No suponer herramientas de sesiones remotas ni lanzar agentes o Coding por registrar tareas.

Consultar [las reglas de memoria y coordinación](../forma-de-trabajo.md) antes de repartir tareas. Una sesión por PR hasta el merge; si se cambia de herramienta o se agota la sesión, relevo explícito sobre el HEAD remoto comprobado.

## Piloto de gestión en Notion

Operativo desde el 10 de octubre de 2026. [Estado y evidencia](../piloto-notion.md), [guía de uso](../gestion-del-proyecto.md) y [encargo completado](../prompts/piloto-notion-gestion.md). Se reutilizó la base accesible con tabla, tablero y roadmap; las tres tareas y sus relaciones se leyeron y editaron. Lewis aclaró que cambió solo el estado de prueba; esta sesión verificó Done. No aparece «Probado por Lewis» y no se afirma esa edición de texto.

[Backlog Notion](https://app.notion.com/p/02d8b53220c147b7b2ca22b79e5d6e7d). Usar Estado de tarea, no el Estado original conservado como evidencia. Prioridades, responsables y fechas sin asignar. No se publicaron páginas, cambiaron permisos ni activaron automatizaciones. Las notas de traslado están en GitHub; las Issues se conservan abiertas como antecedentes tras fallos/interrupciones de cierre, sin seguimiento duplicado. Project #2 se conserva.

## Tareas y bugs

El seguimiento de tareas está en Notion. No mantener una segunda tabla de estados aquí ni actualizar el backlog antiguo de Issues.

- **Integradas en `main` el 10 oct 2026** (squash). Lewis validó la preview de cada una en su teléfono (navegador sin indicar) y autorizó el merge; Safari/iPhone físico y cuentas reales siguen sin verificar:
  - [PR #96](https://github.com/onedayoneproj-blip/deslizapp-app/pull/96), onboarding por capítulos y guía minimizable (`614297f`). Decisión y evidencia en [docs/17-onboarding.md](../17-onboarding.md#decisión-vigente-preparación-por-capítulos-10-oct-2026), [handoff](onboarding-2-checklist-codex.md) y [validación](../validacion-onboarding-2.md). Tarea en **Por validar**: [Preparación por capítulos · origen #97](https://app.notion.com/p/3f5ed62010cb81758eded930bc0dcde1).
  - [PR #100](https://github.com/onedayoneproj-blip/deslizapp-app/pull/100), selector de Catálogo: cierre al desplazarse, «De todo» y vista agregada «General» abierta por defecto sin preferencia guardada (`a27da20`). [Handoff](selector-general-agregado-codex.md). Sus tareas en Notion están Terminadas.
  - [PR #101](https://github.com/onedayoneproj-blip/deslizapp-app/pull/101) (`ecbd1be`): se conserva la eliminación del contador «n/n productos» (tarea [Eliminar contador de productos](https://app.notion.com/p/3f5ed62010cb8120987cf436c4e96d06), Terminada). **Su pie reservado con puntos fue rechazado por Lewis en producción** y se sustituye por el encargo de abajo; la tarea [Reubicar indicador](https://app.notion.com/p/3f5ed62010cb81fbb5a3eaa6d9ac94a5) se cerró por sustitución. [Handoff](indicador-carrusel-imagenes-codex.md) y [validación](../validacion-carrusel-imagenes.md) quedan como antecedente.
- Siguen en la cola, sin encargo en curso: [Validación completa en iPhone · origen #98](https://app.notion.com/p/3f5ed62010cb81b69b01c48a155876b5) y [Diseño de invitación y tienda prellenada · origen #99](https://app.notion.com/p/3f5ed62010cb819fb74ce140333f148d) (ambas dependen de #97).
- **En curso (11 oct):** [barras tipo historia en el carrusel y vista enfocada de fotos](../prompts/carrusel-historias-y-vista-enfocada.md). Sustituye el pie reservado de #101, que Lewis rechazó: **producción está revertida en Vercel a la versión anterior a #101** (instant rollback), así que lo que se fusione en `main` no sale a producción hasta que Lewis deshaga ese rollback o promueva un despliegue nuevo. Tarea: [Carrusel: barras tipo historia y vista enfocada](https://app.notion.com/p/3f6ed62010cb81158e65ec63f40c557c). Sesión de Coding lanzada por Planning en Claude Code (`session_01VD3DSW9ZEaTNeKsUXGCXkm`, Opus); rama `feat/carrusel-historias-vista-enfocada`, PR abierto sin merge para que Lewis pruebe la preview.
- **En curso (11 oct), en paralelo y sin compartir archivos con el carrusel:** rediseño visual de la guía «Deja tu tienda lista» (tarjeta, rayas de historia, punta, píldora). [Encargo](../prompts/onboarding-guia-rediseno-visual.md), [referencia](../../referencias/onboarding-guia/LEEME.md) y [decisión](../17-onboarding.md#decisión-rediseño-visual-de-la-guía-11-oct-2026). Rama `feat/onboarding-guia-rediseno`, PR abierto sin merge. Único archivo compartido con la otra sesión: `lib/novedades.ts`.
- **Fusionados el 11 oct 2026 por autorización de Lewis:** [PR #103](https://github.com/onedayoneproj-blip/deslizapp-app/pull/103), rediseño visual de la guía (`997a762`; Lewis la probó en el teléfono y la validó) y [PR #102](https://github.com/onedayoneproj-blip/deslizapp-app/pull/102), barras tipo historia y vista enfocada del carrusel (`00f4c46`; Lewis no pudo ver la preview del catálogo y pidió corregir lo que haga falta en otra sesión). Novedades: 0.60.0 (guía) y 0.61.0 (carrusel); se eliminó la 0.59.0. La publicación automática de `main` a producción funciona de nuevo (el alias `deslizapp-app.vercel.app` apunta al último despliegue de producción). Producción incluyó brevemente el pie de puntos de #101 entre ambos merges.
- **Fusionado el 11 oct 2026 por autorización de Lewis:** [PR #104](https://github.com/onedayoneproj-blip/deslizapp-app/pull/104), instalar la app: animación del flujo de Safari en iPhone (una línea de tiempo CSS de 13,2 s), botón «Instalar Deslizapp» en Android con `beforeinstallprompt` y fila fija «Instalar app» en el menú de la tienda (`ee215b9`, novedad 0.62.0). [Encargo](../prompts/instalar-ios-animacion-y-android.md), [referencia](../../referencias/instalar-ios/LEEME.md), [handoff](instalar-ios-android.md). Por validar: Lewis debe ver la animación en su iPhone y probar el botón en Android con Chrome; el diálogo real de Chrome y Safari de iPhone no se probaron.
- **En curso (11 oct):** crear producto «como una historia» (opción B aprobada por Lewis). [Encargo](../prompts/crear-producto-historia.md) y [referencia](../../referencias/crear-producto/LEEME.md). Dos PR de la misma sesión: 1) flujo con una presentación, 2) varias presentaciones dentro de la historia. Solo crear; editar sigue con la hoja actual.
- **Encargo preparado, sin confirmar que se haya lanzado:** [tienda oficial de merch de Deslizapp](../prompts/deslizapp-merch-publicacion.md) (tienda `deslizapp` ya creada por Planning; faltan medios en Storage y publicación). Sin precios aprobados ni compra; comprobar rama/PR antes de asumir estado.

Notion se actualizó el 11 oct 2026 desde esta sesión (la tarea nueva, #96, #101 y «Eliminar contador de productos»). Las notas de «PR abierto, sin merge» dentro de las tareas y de `docs/17-onboarding.md` son históricas; conviene corregir ese documento en una pasada de documentación.

## Estado al 12 oct 2026 (relevo)

- **Fusionados el 11–12 oct con autorización de Lewis** (squash, «Revisión» verde y Codex sin hallazgos): #105 y #106 (instalar app y carrusel, ver arriba), #107, #108 (cabecera del catálogo y «Catálogos», `66a4faf`), #109 (barra de estado: `.hdr-borde` ya no toca y=0, `c7741df`), #113 (test de búsqueda por fecha fija, `41f0e61`), #111 (quitar el abanico de colección de cada reel, `6b5132a`) y #110 (perfil: nombre arriba que se va con el scroll, usuario de la tienda bajo el avatar, «atrás» e Instagram flotantes claros, `899e7bf`; Lewis lo probó en el iPhone: «se ve bien»).
- **Crear producto «como una historia»:** el prototipo manda **exacto** (Lewis, 12 oct). Medidas en [referencias/crear-producto/LEEME.md](../../referencias/crear-producto/LEEME.md) y capturas del lienzo en `referencias/crear-producto/capturas/` (+ PDF). Única excepción: el catálogo se elige con el selector de la cabecera de la hoja (recuerda el último usado por tienda; se oculta con un solo catálogo). La regla «todas las tarjetas 4:5» del 11 oct fue un error y quedó anulada (tarjeta 350×372 en un producto, 350×212 en varias presentaciones, reel 350×440 escalado).
  - **PR #112** (Claude Coding, Opus, sesión `session_014xgZYQxefxWFu1kMdUeuZN`, rama `feat/crear-producto-historia`): PR 1 de una presentación; **no fusionar solo** (el chip «Tiene tallas o colores» manda a la hoja vieja, es lo que Lewis sintió caótico). Pendiente: correcciones de fidelidad y PR 2 de varias presentaciones.
  - **PR #114** (Codex, borrador, rama `codex/crear-producto-historia`): ambos flujos según [docs/prompts/crear-producto-codex.md](../prompts/crear-producto-codex.md). Lewis quiere comparar y quedarse con el mejor; el otro se cierra. Falta actualizar pruebas antiguas (`probar:producto`, `probar:presentaciones` sin filtro) y probar servicio, catálogo lleno e iPhone real.
- **Pendiente de decisión de Lewis:** que el perfil de la tienda tenga su propia entrada de historial y dirección (`#perfil`): hoy no la tiene (no se comparte, «atrás» saca del catálogo). Lewis dijo «todavía no». El carrito y crear producto sí crean entrada de historial; el carrito no cambia la URL.
- **Pendiente de validar por Lewis (iPhone/Android):** guía, carrusel/enfocada, instalar app, encabezado/«Catálogos», y #111 sin abanico en producción.
- **Reglas recientes:** no fusionar sin tu confirmación cuando el cambio es visual y Lewis pidió probarlo; Codex revisa cada commit nuevo («@codex review»); cada cambio visible exige entrada en `lib/novedades.ts` de 2–4 líneas cortas y la spec en `docs/04-pantallas.md`.

## Estado al 13 oct 2026 (relevo, comprobado contra GitHub)

- `main` en `aa5dc92` (#120). Fusionados desde el 12 oct: #112 (crear producto como una historia, `5e14fc0`), #115 y #116 (aviso al salir: «Quedarme» / «Descartar y salir»), #117 y #118 (pie flotante con desenfoque progresivo), #119 (la foto se elige tocando el recuadro; la hoja cabe sin scroll), #120 («¿Viene en varias opciones?» en el paso del precio) y #121 (solo documento: [inventario de cabeceras de hoja](inventario-cabeceras-de-hoja.md), **pendiente**: no se ejecuta ningún lote hasta que Lewis lo pida; D4 y D7 sin confirmar).
- **Abierto:** [PR #122](https://github.com/onedayoneproj-blip/deslizapp-app/pull/122), crear producto: ✕ a la izquierda y «Publicar ⌄» ([encargo](../prompts/crear-producto-cerrar-y-publicar.md)). Comprobar estado, revisión y si Lewis lo probó antes de fusionar.
- Siguen abiertos como antecedentes: #45 (excluido), #43, #23 y #2 (ver «Fuera de la cola activa»). #114 (Codex) ya no está abierto.
- Ya en `main` desde antes (no relanzar): bloquear video (#64), gestos y scroll de las hojas del catálogo (#65, #66), tipo de producto (#67), selector de catálogos (#68, #71, #72), catálogo por catálogo (#69), presentaciones «qué cambia» (#70, #73), publicar mi catálogo (#74).
- Fallos de regresión conocidos que ya fallaban en `main` en las sesiones de Coding (sin causa investigada): `probar-retoque-al-subir` (TimeoutError), `probar-catalogo-react`, `-pulido`, `-errores`, `espera-catalogo` y `visibilidad-catalogo` (entorno: video sin códec, layout, panel).

## Projects

Lewis creó **Deslizapp roadmap**, Project #2, y compartió el enlace. Está registrado en [docs/gestion-del-proyecto.md](../gestion-del-proyecto.md), junto con los accesos y pasos de configuración.

Planning sigue sin acceso de Projects: consultar #2 devuelve `Resource not accessible by integration (user.projectV2)`. Las Issues #97–#99 recibieron notas de traslado; ya no se mantiene su seguimiento. Project conserva antecedentes y no se modifica durante el piloto.

## Fuera de la cola activa

- PR #45 de rendimiento sigue excluido por decisión de Lewis. No incorporarlo como dependencia.
- En la comprobación de GitHub del 11 oct siguen abiertos #43, #23 y #2 (más #45, excluido arriba). Son antecedentes; no se autoriza ejecutarlos, fusionarlos ni cerrarlos por estar en esa lista. Verificar su utilidad y estado antes de proponer trabajo.
- El plan de lanzamiento y las funciones futuras se consultan en [docs/16-ruta-al-lanzamiento.md](../16-ruta-al-lanzamiento.md); no lanzar automáticamente su contenido.

## Cómo retomar

Leer contexto, AGENTS, HANDOFF y este relevo; después la tarea de Notion, el documento de la función y el handoff de su PR. Comprobar rama, HEAD, base y estado remoto. Si hay otra sesión sobre el mismo PR, coordinar el relevo antes de escribir.

Al terminar una tarea, actualizar su documento y marcarla Terminado en Notion cuando se cumpla el resultado acordado, dejando referencia al PR/validación. No añadir entregas históricas al estado actual.

## Antecedentes

La cola anterior y las notas operativas hasta esta reorganización se conservan en [archivo de Planning](../archivo/2026-10-10/planning-anterior.md). Pueden contener enlaces, identificadores de sesiones y estados sustituidos. No constituyen encargos vigentes.
