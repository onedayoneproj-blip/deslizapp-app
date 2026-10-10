# Relevo vigente de Planning

Actualizado: 10 de octubre de 2026. Última comprobación de GitHub: main `ca0b614d9bc8aa4d5b8ffe4e800339ba0e27bf21`, PR #96 abierto en `0779aff110dcbd8f4cb357d605192a45976a9248`, base main. Esta comprobación es anterior al commit documental que contiene este relevo. Verificar de nuevo antes de lanzar o fusionar.

## Acuerdo vigente

Planning analiza, revisa y escribe documentación; no edita código de la app. Lewis pega manualmente los prompts en Coding. Avisarle cuando haga falta una nueva sesión. No suponer que existen herramientas de sesiones remotas de Claude en Codex.

Consultar [las reglas de memoria y coordinación](../forma-de-trabajo.md) antes de repartir tareas. Una sesión por PR hasta el merge; si se cambia de herramienta o se agota la sesión, relevo explícito sobre el HEAD remoto comprobado.

## Tareas y bugs

El seguimiento de tareas está en [Issues](https://github.com/onedayoneproj-blip/deslizapp-app/issues). No mantener una segunda tabla de estados aquí.

- [#97 · Preparación por capítulos, PR #96](https://github.com/onedayoneproj-blip/deslizapp-app/issues/97).
- [#98 · Validación completa en iPhone](https://github.com/onedayoneproj-blip/deslizapp-app/issues/98).
- [#99 · Diseño de invitación y tienda prellenada](https://github.com/onedayoneproj-blip/deslizapp-app/issues/99).

La decisión del onboarding vive en [docs/17-onboarding.md](../17-onboarding.md#decisión-vigente-preparación-por-capítulos-10-oct-2026). La siguiente sesión y el estado del PR se comprueban antes de trabajar; registrar entregas y enlaces en #97. Al preparar estas Issues, GitHub mostró HEAD `0779aff110dcbd8f4cb357d605192a45976a9248`; la validación antigua de `11532b4` no demuestra el resultado del nuevo HEAD.

## Projects

Pendiente de creación manual: el CLI devolvió `Resource not accessible by integration` al consultar Projects. La conexión sí permite gestionar Issues. No hay tablero creado ni enlace confirmado.

Guía y enlaces para Lewis: [docs/gestion-del-proyecto.md](../gestion-del-proyecto.md). Cuando Lewis cree el tablero y comparta el enlace, añadirlo allí; no duplicar esta guía.

## Fuera de la cola activa

- PR #45 de rendimiento sigue excluido por decisión de Lewis. No incorporarlo como dependencia.
- En la comprobación de GitHub siguen abiertos #43, #23 y #2. Son antecedentes; no se autoriza ejecutarlos, fusionarlos ni cerrarlos por estar en esa lista. Verificar su utilidad y estado antes de proponer trabajo.
- El plan de lanzamiento y las funciones futuras se consultan en [docs/16-ruta-al-lanzamiento.md](../16-ruta-al-lanzamiento.md); no lanzar automáticamente su contenido.

## Cómo retomar

Leer contexto, AGENTS, HANDOFF y este relevo; después el documento de la función y el handoff de su PR. Comprobar rama, HEAD, base y estado remoto. Si hay otra sesión sobre el mismo PR, coordinar el relevo antes de escribir.

Al terminar una tarea, actualizar su documento y cerrar su Issue si se cumplió el resultado acordado, dejando referencia al PR/validación. No añadir entregas históricas al estado actual.

## Antecedentes

La cola anterior y las notas operativas hasta esta reorganización se conservan en [archivo de Planning](../archivo/2026-10-10/planning-anterior.md). Pueden contener enlaces, identificadores de sesiones y estados sustituidos. No constituyen encargos vigentes.
