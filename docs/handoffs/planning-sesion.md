# Relevo vigente de Planning

Actualizado por Coding: 10 de octubre de 2026. Comprobación remota: main `ca0b614d9bc8aa4d5b8ffe4e800339ba0e27bf21`; PR #96 abierto, código de capítulos en `b66ebb4f2baa742e03bf3d89a26c0833ff567196`. Se integra el commit documental de main para resolver conflictos; consultar el HEAD/checks actuales del PR antes de integrar. No merge ni producción autorizados.

## Acuerdo vigente

Planning analiza, revisa y escribe documentación; no edita código de la app. Lewis pega manualmente los prompts en Coding. Avisarle cuando haga falta una nueva sesión. No suponer que existen herramientas de sesiones remotas de Claude en Codex.

Consultar [las reglas de memoria y coordinación](../forma-de-trabajo.md) antes de repartir tareas. Una sesión por PR hasta el merge; si se cambia de herramienta o se agota la sesión, relevo explícito sobre el HEAD remoto comprobado.

## Pendiente de revisión de Lewis

Onboarding en Inicio, PR [#96](https://github.com/onedayoneproj-blip/deslizapp-app/pull/96), rama `feat/onboarding-checklist-codex`: sesión Coding abierta manualmente por Lewis, implementación por capítulos terminada y validada en Demo/Chromium. Creación = capítulo 1 con cuatro pasos; Inicio = capítulos 2–4 con filas y progreso proporcional. Contratos/permisos existentes conservados; sin migraciones ni datos reales.

**Siguiente:** Lewis revisa en Safari la preview del HEAD vigente; Planning comprueba Revisión y el diff antes de una eventual integración. PR abierto por encargo. El handoff se devuelve aquí para que Lewis lo pegue en Planning, sin mensajes remotos ni sesiones antiguas.

**Evidencia y límites:** [handoff](onboarding-2-checklist-codex.md), [validación](../validacion-onboarding-2.md), [capturas](../capturas/onboarding-2/README.md) y [decisión](../17-onboarding.md#decisión-vigente-preparación-por-capítulos-10-oct-2026). Los resultados iniciales de siete tarjetas se conservan como antecedentes. Safari físico, instalación nativa y Storage/OAuth reales siguen pendientes.

**Preview:** consultar la URL exacta READY y el commit en el PR; alias estable https://deslizapp-app-git-feat-onboarding-checklist-codex-onedayone.vercel.app. La preview anterior `deslizapp-k8v7h5ybi` pertenece a siete tarjetas; no representa este diseño. La guía no aparece en Ver como por contrato. Desde un navegador limpio: Ver demo → Inicio → guía de Esencias Michel demo; no reabrir guías ya cerradas ni probar en tiendas reales.

## Fuera de la cola activa

- PR #45 de rendimiento sigue excluido por decisión de Lewis. No incorporarlo como dependencia.
- En la comprobación de GitHub siguen abiertos #43, #23 y #2. Son antecedentes; no se autoriza ejecutarlos, fusionarlos ni cerrarlos por estar en esa lista. Verificar su utilidad y estado antes de proponer trabajo.
- El plan de lanzamiento y las funciones futuras se consultan en [docs/16-ruta-al-lanzamiento.md](../16-ruta-al-lanzamiento.md); no lanzar automáticamente su contenido.

## Cómo retomar

Leer contexto, AGENTS, HANDOFF y este relevo; después el documento de la función y el handoff de su PR. Comprobar rama, HEAD, base y estado remoto. Si hay otra sesión sobre el mismo PR, coordinar el relevo antes de escribir.

Al terminar una tarea, actualizar su documento y quitarla de la cola activa, dejando referencia al PR/validación. No añadir entregas históricas al estado actual.

## Antecedentes

La cola anterior y las notas operativas hasta esta reorganización se conservan en [archivo de Planning](../archivo/2026-10-10/planning-anterior.md). Pueden contener enlaces, identificadores de sesiones y estados sustituidos. No constituyen encargos vigentes.
