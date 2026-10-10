# Relevo vigente de Planning

Actualizado: 10 de octubre de 2026. Transición documental del piloto guardada en main; último commit documental confirmado antes de este relevo: `24159021c345745319a20a5470f9a25f07090aaa`. PR #96 consultado en esta sesión: abierto, sin merge, HEAD `0779aff110dcbd8f4cb357d605192a45976a9248`; devuelve mergeable false. Comprobar base, conflictos, checks y HEAD de nuevo antes de revisar una entrega o integrar.

## Acuerdo vigente

Esta sesión con acceso real a Notion es Planning principal por instrucción de Lewis. Planning analiza, organiza tareas, prepara prompts, revisa entregas y escribe documentación; no edita código de la app. Lewis pasa manualmente los encargos a Coding. Avisarle cuando haga falta una nueva sesión. No suponer herramientas de sesiones remotas ni lanzar agentes o Coding por registrar tareas.

Consultar [las reglas de memoria y coordinación](../forma-de-trabajo.md) antes de repartir tareas. Una sesión por PR hasta el merge; si se cambia de herramienta o se agota la sesión, relevo explícito sobre el HEAD remoto comprobado.

## Piloto de gestión en Notion

Operativo desde el 10 de octubre de 2026. [Estado y evidencia](../piloto-notion.md), [guía de uso](../gestion-del-proyecto.md) y [encargo completado](../prompts/piloto-notion-gestion.md). Se reutilizó la base accesible con tabla, tablero y roadmap; las tres tareas y sus relaciones se leyeron y editaron. Lewis aclaró que cambió solo el estado de prueba; esta sesión verificó Done. No aparece «Probado por Lewis» y no se afirma esa edición de texto.

[Backlog Notion](https://app.notion.com/p/02d8b53220c147b7b2ca22b79e5d6e7d). Usar Estado de tarea, no el Estado original conservado como evidencia. Prioridades, responsables y fechas sin asignar. No se publicaron páginas, cambiaron permisos ni activaron automatizaciones. Las notas de traslado están en GitHub; las Issues se conservan abiertas como antecedentes tras fallos/interrupciones de cierre, sin seguimiento duplicado. Project #2 se conserva.

## Tareas y bugs

El seguimiento de tareas está en Notion. No mantener una segunda tabla de estados aquí ni actualizar el backlog antiguo de Issues.

- [Preparación por capítulos · origen #97](https://app.notion.com/p/3f5ed62010cb81758eded930bc0dcde1), enlaza el PR #96.
- [Validación completa en iPhone · origen #98](https://app.notion.com/p/3f5ed62010cb81b69b01c48a155876b5).
- [Diseño de invitación y tienda prellenada · origen #99](https://app.notion.com/p/3f5ed62010cb819fb74ce140333f148d).
- [Selector de Catálogo: cierre al desplazarse, «De todo» y vista agregada «General»](selector-general-agregado-codex.md). Entrega de Coding en [PR #100](https://github.com/onedayoneproj-blip/deslizapp-app/pull/100), abierto y sin fusionar al relevo. GitHub reporta `mergeable: true`; validar en móvil antes de integrar. Planning recibió validación manual de Lewis y encargó abrir General sin preferencia guardada; misma rama/PR, conservando memoria por tienda. Entrega actual y pruebas en el handoff del selector; comprobar nuevo HEAD/preview en PR #100.

La decisión del onboarding vive en [docs/17-onboarding.md](../17-onboarding.md#decisión-vigente-preparación-por-capítulos-10-oct-2026). Lewis recibió el handoff y solicitó minimizar la guía, estados de capítulo sin relleno proporcional y menos texto. [Prompt completo del ajuste](../prompts/onboarding-2-minimizar-y-capitulos.md), preparado para la misma sesión de Coding del PR #96; Lewis lo pasa manualmente. La misma sesión Coding inició el ajuste por instrucción manual de Lewis; integra main y conserva el seguimiento Notion. Entrega y evidencia actuales en [handoff](onboarding-2-checklist-codex.md) y [validación](../validacion-onboarding-2.md); HEAD/checks/preview se comprueban en PR #96. Safari de Lewis pendiente, PR abierto sin merge. Planning comprobó Revisión success y el hilo resuelto, y leyó los componentes afectados; no validó todo el PR ni Safari. La API devuelve mergeable false frente al reporte «sin conflictos»; Coding debe comprobar e integrar main sin perder la documentación nueva. Mantener PR abierto sin merge. La siguiente sesión y el estado del PR se comprueban antes de trabajar; registrar entregas y enlaces en su tarea de Notion. Al preparar estas Issues, GitHub mostró HEAD `0779aff110dcbd8f4cb357d605192a45976a9248`; la validación antigua de `11532b4` no demuestra el resultado del nuevo HEAD.

## Projects

Lewis creó **Deslizapp roadmap**, Project #2, y compartió el enlace. Está registrado en [docs/gestion-del-proyecto.md](../gestion-del-proyecto.md), junto con los accesos y pasos de configuración.

Planning sigue sin acceso de Projects: consultar #2 devuelve `Resource not accessible by integration (user.projectV2)`. Las Issues #97–#99 recibieron notas de traslado; ya no se mantiene su seguimiento. Project conserva antecedentes y no se modifica durante el piloto.

## Fuera de la cola activa

- PR #45 de rendimiento sigue excluido por decisión de Lewis. No incorporarlo como dependencia.
- En la comprobación de GitHub siguen abiertos #43, #23 y #2. Son antecedentes; no se autoriza ejecutarlos, fusionarlos ni cerrarlos por estar en esa lista. Verificar su utilidad y estado antes de proponer trabajo.
- El plan de lanzamiento y las funciones futuras se consultan en [docs/16-ruta-al-lanzamiento.md](../16-ruta-al-lanzamiento.md); no lanzar automáticamente su contenido.

## Entrega del indicador de imágenes

[Handoff de Coding](indicador-carrusel-imagenes-codex.md), [validación](../validacion-carrusel-imagenes.md) y [tarea vigente](https://app.notion.com/p/3f5ed62010cb81fbb5a3eaa6d9ac94a5). Trabajo nuevo desde main que integra PR #100. Consultar en el PR enlazado desde Notion el HEAD, Revisión y preview exactos. Se entrega abierto para revisión, sin merge ni producción. Los estados anteriores de este relevo se conservan como antecedentes.

## Cómo retomar

Leer contexto, AGENTS, HANDOFF y este relevo; después la tarea de Notion, el documento de la función y el handoff de su PR. Comprobar rama, HEAD, base y estado remoto. Si hay otra sesión sobre el mismo PR, coordinar el relevo antes de escribir.

Al terminar una tarea, actualizar su documento y marcarla Terminado en Notion cuando se cumpla el resultado acordado, dejando referencia al PR/validación. No añadir entregas históricas al estado actual.

## Antecedentes

La cola anterior y las notas operativas hasta esta reorganización se conservan en [archivo de Planning](../archivo/2026-10-10/planning-anterior.md). Pueden contener enlaces, identificadores de sesiones y estados sustituidos. No constituyen encargos vigentes.
