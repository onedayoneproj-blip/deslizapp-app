# Seguimiento de Deslizapp en GitHub

## Accesos directos para Lewis

- [Tareas y bugs](https://github.com/onedayoneproj-blip/deslizapp-app/issues).
- [Reportar un bug](https://github.com/onedayoneproj-blip/deslizapp-app/issues/new?title=Bug%3A%20&body=Qu%C3%A9%20hice%3A%0A%0AQu%C3%A9%20ocurri%C3%B3%3A%0A%0AQu%C3%A9%20esperaba%3A%0A%0ADispositivo%20y%20enlace%3A%0A%0ACaptura%20o%20video%3A%0A).
- [Índice de documentación](00-contexto-del-proyecto.md).
- [Relevo de Planning](handoffs/planning-sesion.md).
- [Reglas de coordinación y memoria](forma-de-trabajo.md).
- [Projects del repositorio](https://github.com/onedayoneproj-blip/deslizapp-app/projects).

## Tablero: pendiente de creación

La conexión usada por Planning permite gestionar Issues, pero no Projects v2. La consulta de Projects por CLI devolvió `Resource not accessible by integration`. No se ha creado ningún Project ni se han configurado columnas o automatizaciones. No inventar un enlace de tablero ni prometer que la conexión actual puede actualizar sus campos.

Lewis puede crear el tablero desde [sus Projects](https://github.com/users/onedayoneproj-blip/projects): **New project → Board**, título **Deslizapp · Lanzamiento**. Mantener el proyecto privado salvo que Lewis decida compartirlo. Después, compartir el enlace con Planning para registrar el acceso.

Configuración propuesta, aún no aplicada:
- Status: Por aclarar, Listo, En curso, Bloqueado, Por validar, Terminado.
- Priority: Alta, Media, Baja; Lewis decide las prioridades.
- Vista principal: tablero agrupado por Status.
- Segunda vista: tabla para ordenar y buscar.
- Roadmap con fechas solo cuando haya fechas acordadas; no inventar plazos para llenar una vista.

Añadir tareas existentes con **Add item** y buscar el repositorio y sus números:
- [#97 · Preparación por capítulos](https://github.com/onedayoneproj-blip/deslizapp-app/issues/97), vinculada al PR #96.
- [#98 · Validación completa en iPhone](https://github.com/onedayoneproj-blip/deslizapp-app/issues/98).
- [#99 · Enlace de invitación y tienda prellenada](https://github.com/onedayoneproj-blip/deslizapp-app/issues/99).

Estas tareas están abiertas; sus columnas y prioridades no están configuradas. No lanzar Coding por añadir una tarjeta. Las dependencias y condiciones de cierre se consultan en cada Issue.

Si no hay acceso de Projects para Planning, Lewis mueve las tarjetas desde la web y Planning mantiene el contenido de las tareas por la conexión disponible. No abrir tareas duplicadas para simular cambios de columnas.

## Usarlo desde el teléfono

La app de GitHub permite consultar y comentar Issues; adjuntar capturas según sus opciones. Para crear/configurar Projects y trabajar con el tablero, usar Safari si la app no ofrece la vista necesaria. Los enlaces a archivos de documentación también se pueden abrir en Safari.

No hace falta leer toda la documentación para reportar un problema: abrir «Reportar un bug», escribir qué pasó y adjuntar una captura. Evitar contraseñas, códigos de invitación o datos personales de clientes en reportes públicos.

## Dónde vive cada información

- **Issue:** tarea o bug, resultado esperado, dependencia, siguiente acción y enlaces a prompt, decisión y PR. Una Issue por tarea; los bugs se enlazan a la tarea de validación.
- **Project:** vista del seguimiento de esas mismas Issues; no duplicar sus textos en tarjetas nuevas.
- **Documento de función:** reglas y decisiones aprobadas.
- **Prompt:** encargo completo para Coding.
- **PR/handoff/validación:** implementación y evidencia.
- **Relevo de Planning:** índice y contexto necesarios para coordinar sesiones; enlaza Issues, no mantiene un backlog paralelo.

Antes de fusionar, completar las verificaciones de la Issue y obtener la autorización requerida por el encargo. Después cerrar la Issue cuando se cumpla el resultado acordado, no solo porque se abrió un PR.
