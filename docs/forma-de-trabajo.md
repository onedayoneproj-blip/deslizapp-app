# Memoria compartida y coordinación

Acordado con Lewis el 10 de octubre de 2026. Aplica a Planning y Coding, en Claude y Codex. No cambia permisos de publicación, alcance autorizado, contratos del producto ni reglas de migraciones.

## Una fuente para cada información

**Piloto Notion activo:** [docs/piloto-notion.md](piloto-notion.md) registra la verificación y los enlaces. Notion es el backlog vigente desde el 10 de octubre de 2026; no duplicarlo con Issues. Las reglas de coordinación y documentación técnica permanecen vigentes.

| Información | Fuente |
|---|---|
| Qué es el proyecto, puestos e índice | `docs/00-contexto-del-proyecto.md` |
| Tareas, bugs, dependencias y siguiente acción | Notion, base Deslizapp · Piloto; Issues y Project anteriores como antecedentes |
| Coordinación de sesiones y accesos | `docs/handoffs/planning-sesion.md` y `docs/gestion-del-proyecto.md` |
| Decisiones vigentes y comportamiento de una función | Documento de esa función en `docs/` |
| Encargo completo | `docs/prompts/<tarea>.md` |
| Ejecución y evidencia de una entrega | Handoff y validación de esa tarea |
| Código, estado de integración y revisión | GitHub: commit, PR, checks y despliegue |
| Estados anteriores | `docs/archivo/`, historia de Git y resultados históricos fechados |

Enlazar la evidencia en vez de copiarla entre archivos. No volcar transcripciones completas, cada comando, comprobaciones repetidas ni credenciales. Imágenes y videos solo cuando aporten evidencia visual; no duplicarlos en registros de decisiones.

## Registrar las decisiones por función

Dentro del documento de la función, usar un bloque breve para cada decisión importante:

- **Fecha y estado:** propuesta, aprobada, implementada o verificada; indicar el alcance de la verificación.
- **Qué:** resultado que necesita el usuario.
- **Por qué:** problema y razón de la elección.
- **Cómo:** comportamiento y reglas acordados.
- **Descartado:** alternativas relevantes y por qué no se eligieron.
- **Evidencia:** enlace al encargo, PR, commit, referencia o validación.
- **Siguiente:** enlazar la tarea vigente si falta trabajo; no duplicar su cola.

Una propuesta no equivale a implementación y una implementación no equivale a validación real. Atribuir por separado el reporte de Lewis, las pruebas simuladas y las pruebas con una tienda real. No registrar toda operación: solo decisiones, descubrimientos, cambios y límites que afectan cómo continuar.

Si una decisión cambia, dejar la regla vigente clara y marcar la anterior como sustituida con fecha y referencia. No acumular reglas contradictorias. Mantener resultados anteriores como evidencia histórica, no como pendientes actuales.

## Antes de lanzar una sesión

Planning lee el relevo, la tarea de Notion y comprueba GitHub; el relevo es un índice de coordinación, no un backlog paralelo ni un sustituto de esa comprobación.

Cada tarea activa de Notion registra: función, responsable/sesión si se conoce, dependencia, archivos o contratos compartidos, estado, rama/PR si existen, HEAD comprobado y siguiente acción. No inventar una sesión ni presentar un prompt entregado a Lewis como sesión ya iniciada.

Lewis crea manualmente las nuevas sesiones de Coding mientras ese sea su acuerdo vigente. Planning entrega un prompt completo y recibe el handoff que Lewis pega. Si más adelante autoriza agentes o sesiones remotas, comprobar primero qué herramientas existen y contarle qué se encargó. No reutilizar identificadores de sesiones antiguas ni asumir herramientas de otra plataforma.

## Dependencias y trabajo en paralelo

1. **Independientes:** pueden avanzar desde main actualizado cuando Lewis autorice sesiones paralelas y no compitan por las mismas piezas.
2. **B necesita A:** esperar por defecto a que A esté fusionada en main. Comprobar el merge antes de crear la rama de B.
3. **Archivos o contratos compartidos:** preferir tareas consecutivas o una misma sesión. Planning asigna la responsabilidad antes de lanzar; no encargar a dos sesiones reorganizar la misma superficie.
4. **PR dependiente:** excepción explícita en el encargo. Registrar SHA de partida, PR base, responsable y orden de integración. No fusionar B como independiente mientras su base no esté publicada. Después del squash de A, revisar y ajustar el diff de B sobre main para no arrastrar commits o cambios ya integrados.
5. Antes de abrir o actualizar un PR contra main, actualizarse desde origin/main y resolver conflictos en la misma sesión. Para un PR dependiente, seguir la base declarada, no cambiarla a ciegas.
6. Antes del merge, comprobar el diff contra la base final, dependencias, comentarios de revisión y checks afectados por la integración. Resolver los conflictos en la sesión responsable cuando siga disponible; si no, hacer un relevo explícito.
7. Nunca dos sesiones aplicando migraciones a la vez. Respetar `AGENTS.md` y comprobar el historial antes de cada aplicación. Un PR sin fusionar puede haber cambiado ya la base compartida.

El rebase reduce divergencias; no garantiza compatibilidad funcional. Separar ramas no basta para declarar tareas independientes. No lanzar trabajo dependiente anticipadamente solo para ganar paralelismo.

## Relevo, límites y cierre

Actualizar la tarea de Notion al lanzar una tarea, quedar bloqueado o terminar/mergear. Actualizar el relevo cuando cambie la coordinación de sesiones y el documento de la función cuando cambie una decisión. Guardar un checkpoint antes de alcanzar el límite de sesión, aunque el trabajo esté incompleto.

El checkpoint contiene qué está realmente guardado y dónde (remoto o solo local), HEAD/base, implementación y pruebas realizadas, cambios de base aplicados o pendientes, bloqueos, siguiente acción concreta y límites de autorización. No decir que un trabajo está a salvo en GitHub sin comprobar el push.

Al terminar el resultado acordado, marcar la tarea de Notion como Terminado y dejar enlace a su entrega/PR. Las Issues de origen conservan su historial; su cierre por traslado no significa trabajo terminado. No actualizar una tabla duplicada de tareas terminadas indefinidamente. La función conserva sus decisiones vigentes; Git y el archivo conservan la historia.

Para contradicciones entre documentos, comprobar fecha, decisión explícita de Lewis y evidencia real. No confiar en la posición de un párrafo ni en un «PR abierto» histórico. Si no se puede verificar, marcarlo como desconocido en vez de adivinar.
