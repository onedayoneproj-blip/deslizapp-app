# Relevo vigente de Planning

Actualizado: 11 de octubre de 2026, comprobado contra GitHub. `main` está en `ecbd1bef4908ccf18cd9ad8fbf2499af0a2438ee` (squash de #101). Los PR #96, #100 y #101 están **fusionados** (10 oct); no hay PR de trabajo abierto. Esta sesión (Planning) no tiene herramientas de Notion: los estados de las tareas no se releyeron y se dan por desconocidos hasta comprobarlos. Comprobar base, checks y HEAD de nuevo antes de revisar una entrega o integrar.

## Acuerdo vigente

Esta sesión con acceso real a Notion es Planning principal por instrucción de Lewis. Planning analiza, organiza tareas, prepara prompts, revisa entregas y escribe documentación; no edita código de la app. Lewis pasa manualmente los encargos a Coding. Avisarle cuando haga falta una nueva sesión. No suponer herramientas de sesiones remotas ni lanzar agentes o Coding por registrar tareas.

Consultar [las reglas de memoria y coordinación](../forma-de-trabajo.md) antes de repartir tareas. Una sesión por PR hasta el merge; si se cambia de herramienta o se agota la sesión, relevo explícito sobre el HEAD remoto comprobado.

## Piloto de gestión en Notion

Operativo desde el 10 de octubre de 2026. [Estado y evidencia](../piloto-notion.md), [guía de uso](../gestion-del-proyecto.md) y [encargo completado](../prompts/piloto-notion-gestion.md). Se reutilizó la base accesible con tabla, tablero y roadmap; las tres tareas y sus relaciones se leyeron y editaron. Lewis aclaró que cambió solo el estado de prueba; esta sesión verificó Done. No aparece «Probado por Lewis» y no se afirma esa edición de texto.

[Backlog Notion](https://app.notion.com/p/02d8b53220c147b7b2ca22b79e5d6e7d). Usar Estado de tarea, no el Estado original conservado como evidencia. Prioridades, responsables y fechas sin asignar. No se publicaron páginas, cambiaron permisos ni activaron automatizaciones. Las notas de traslado están en GitHub; las Issues se conservan abiertas como antecedentes tras fallos/interrupciones de cierre, sin seguimiento duplicado. Project #2 se conserva.

## Tareas y bugs

El seguimiento de tareas está en Notion. No mantener una segunda tabla de estados aquí ni actualizar el backlog antiguo de Issues.

- **Integradas en `main` el 10 oct 2026, pendientes de validar en Safari/iPhone por Lewis** (squash, rama borrada o por borrar; las pruebas simuladas en Demo/Chromium no equivalen a Safari físico):
  - [PR #96](https://github.com/onedayoneproj-blip/deslizapp-app/pull/96), onboarding por capítulos y guía minimizable (`614297f`). Decisión y evidencia en [docs/17-onboarding.md](../17-onboarding.md#decisión-vigente-preparación-por-capítulos-10-oct-2026), [handoff](onboarding-2-checklist-codex.md) y [validación](../validacion-onboarding-2.md). Tarea: [Preparación por capítulos · origen #97](https://app.notion.com/p/3f5ed62010cb81758eded930bc0dcde1).
  - [PR #100](https://github.com/onedayoneproj-blip/deslizapp-app/pull/100), selector de Catálogo: cierre al desplazarse, «De todo» y vista agregada «General» abierta por defecto sin preferencia guardada (`a27da20`). [Handoff](selector-general-agregado-codex.md).
  - [PR #101](https://github.com/onedayoneproj-blip/deslizapp-app/pull/101), puntos del carrusel bajo la imagen y sin progreso global «n/n productos» (`ecbd1be`). [Handoff](indicador-carrusel-imagenes-codex.md), [validación](../validacion-carrusel-imagenes.md) y [tarea](https://app.notion.com/p/3f5ed62010cb81fbb5a3eaa6d9ac94a5).
- Siguen en la cola, sin encargo en curso: [Validación completa en iPhone · origen #98](https://app.notion.com/p/3f5ed62010cb81b69b01c48a155876b5) y [Diseño de invitación y tienda prellenada · origen #99](https://app.notion.com/p/3f5ed62010cb819fb74ce140333f148d) (ambas dependen de #97).
- **Encargo preparado, sin confirmar que se haya lanzado:** [tienda oficial de merch de Deslizapp](../prompts/deslizapp-merch-publicacion.md) (tienda `deslizapp` ya creada por Planning; faltan medios en Storage y publicación). Sin precios aprobados ni compra; comprobar rama/PR antes de asumir estado.

Al actualizar las tareas de Notion (cuando haya una sesión con acceso): marcar las tres entregas como Por validar, no Terminado, hasta que Lewis pruebe en Safari. Las notas de «PR abierto, sin merge» en documentos de función (por ejemplo docs/17) son históricas y conviene corregirlas en una pasada de documentación.

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
