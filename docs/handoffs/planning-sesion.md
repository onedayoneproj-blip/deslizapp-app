# Relevo vigente de Planning

Actualizado: 10 de octubre de 2026. Última comprobación de GitHub: main `cd804c8a617725d3f0c50a200402d254f61a674c`, PR #96 abierto en `11532b43a456af35f8caf79e65edb70ecf4290fe`, base main. Esta comprobación es anterior al commit documental que contiene este relevo. Verificar de nuevo antes de lanzar o fusionar.

## Acuerdo vigente

Planning analiza, revisa y escribe documentación; no edita código de la app. Lewis pega manualmente los prompts en Coding. Avisarle cuando haga falta una nueva sesión. No suponer que existen herramientas de sesiones remotas de Claude en Codex.

Consultar [las reglas de memoria y coordinación](../forma-de-trabajo.md) antes de repartir tareas. Una sesión por PR hasta el merge; si se cambia de herramienta o se agota la sesión, relevo explícito sobre el HEAD remoto comprobado.

## Trabajo activo

| Tarea | Responsable y estado | Dependencia/superficie | Próxima acción |
|---|---|---|---|
| Onboarding en Inicio, PR [#96](https://github.com/onedayoneproj-blip/deslizapp-app/pull/96), rama `feat/onboarding-checklist-codex` | Coding: nueva sesión manual solicitada a Lewis; no se ha confirmado su inicio. Implementación de siete pasos entregada; Lewis probó la preview y pidió rediseño por capítulos. | Parte 1 ya en main (#95). Superficie: guía en Inicio, cálculo de pasos y pruebas. Reutilizar contratos existentes; no migraciones ni datos reales. | Continuar desde el HEAD remoto más reciente del mismo PR. Aplicar la [decisión aprobada](../17-onboarding.md#decisión-vigente-preparación-por-capítulos-10-oct-2026), unificar el lenguaje con la bienvenida y devolver preview con evidencia. No mergear. |

Preview entregada para la implementación anterior: https://deslizapp-k8v7h5ybi-onedayone.vercel.app
Alias de la rama: https://deslizapp-app-git-feat-onboarding-checklist-codex-onedayone.vercel.app

Estas URLs no prueban que el rediseño esté implementado. Consultar el despliegue del próximo HEAD. La guía no aparece en Ver como por diseño. Lewis confirmó que la vio al abrir la preview.

Evidencia de la entrega anterior: [handoff de Coding en la rama del PR](https://github.com/onedayoneproj-blip/deslizapp-app/blob/feat/onboarding-checklist-codex/docs/handoffs/onboarding-2-checklist-codex.md). Sus pruebas automatizadas no sustituyen la revisión de Lewis; conservar sus resultados como antecedentes.

## Fuera de la cola activa

- PR #45 de rendimiento sigue excluido por decisión de Lewis. No incorporarlo como dependencia.
- En la comprobación de GitHub siguen abiertos #43, #23 y #2. Son antecedentes; no se autoriza ejecutarlos, fusionarlos ni cerrarlos por estar en esa lista. Verificar su utilidad y estado antes de proponer trabajo.
- El plan de lanzamiento y las funciones futuras se consultan en [docs/16-ruta-al-lanzamiento.md](../16-ruta-al-lanzamiento.md); no lanzar automáticamente su contenido.

## Cómo retomar

Leer contexto, AGENTS, HANDOFF y este relevo; después el documento de la función y el handoff de su PR. Comprobar rama, HEAD, base y estado remoto. Si hay otra sesión sobre el mismo PR, coordinar el relevo antes de escribir.

Al terminar una tarea, actualizar su documento y quitarla de la cola activa, dejando referencia al PR/validación. No añadir entregas históricas al estado actual.

## Antecedentes

La cola anterior y las notas operativas hasta esta reorganización se conservan en [archivo de Planning](../archivo/2026-10-10/planning-anterior.md). Pueden contener enlaces, identificadores de sesiones y estados sustituidos. No constituyen encargos vigentes.
