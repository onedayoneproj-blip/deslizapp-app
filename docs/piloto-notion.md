# Piloto de gestión en Notion

Aprobado por Lewis el 10 de octubre de 2026.

## Estado del piloto

**Piloto operativo desde el 10 de octubre de 2026; Notion es la fuente del seguimiento.** Esta sesión pasó a ser Planning principal por instrucción de Lewis. Tiene herramientas de Notion y GitHub; analiza, organiza tareas, prepara prompts y revisa entregas sin editar código. Lewis pasa manualmente los encargos a Coding.

[Base Deslizapp · Piloto](https://app.notion.com/p/02d8b53220c147b7b2ca22b79e5d6e7d) · [Tablero](https://app.notion.com/p/02d8b53220c147b7b2ca22b79e5d6e7d?v=3f5ed62010cb815caa6f000cc00c0364) · [Tabla](https://app.notion.com/p/02d8b53220c147b7b2ca22b79e5d6e7d?v=8154b003a9f945fd8a4c17023fd7adf2) · [Roadmap](https://app.notion.com/p/02d8b53220c147b7b2ca22b79e5d6e7d?v=3f5ed62010cb813f8199000c8790da28).

- [Preparación por capítulos · origen #97](https://app.notion.com/p/3f5ed62010cb81758eded930bc0dcde1).
- [Validación completa en iPhone · origen #98](https://app.notion.com/p/3f5ed62010cb81b69b01c48a155876b5).
- [Diseño de invitación y tienda prellenada · origen #99](https://app.notion.com/p/3f5ed62010cb819fb74ce140333f148d).

Se reutilizó la única base accesible. Las tres tareas se crearon, leyeron y editaron; se verificaron después contenido, propiedades, origen, enlaces y relaciones de dependencia. #98 y #99 dependen de #97. No se trasladó el roadmap histórico ni PR #45. Prioridades, responsables y fechas quedaron sin asignar.

El seguimiento usa exclusivamente **Estado de tarea**, propiedad real Select con Por aclarar, Listo, En curso, Bloqueado, Por validar y Terminado. MCP rechazó la sintaxis para personalizar STATUS. La revisión automática rechazó convertir el Estado existente por riesgo de eliminar sus opciones; se resolvió con una ampliación aditiva que conserva los datos. Estado nativo queda como evidencia de prueba y oculto en las vistas de trabajo; no mantenerlo en paralelo.

La [tarea de prueba](https://app.notion.com/p/3f5ed62010cb8168a9b7fe26a1c7a812) conserva V2 y Done. Lewis aclaró que solo cambió el estado; Planning releyó Done. No existe la frase «Probado por Lewis» en contenido ni comentarios. Se verificó otra edición y reversión inocua; la prueba queda excluida de las vistas activas mediante Prueba. No se publicaron páginas ni se cambiaron permisos globales. La base era privada; Lewis ya pudo editar allí. El acceso de otros usuarios no se da por comprobado.

Se añadieron notas de traslado a las Issues [#97](https://github.com/onedayoneproj-blip/deslizapp-app/issues/97#issuecomment-6097936565), [#98](https://github.com/onedayoneproj-blip/deslizapp-app/issues/98#issuecomment-6097936944) y [#99](https://github.com/onedayoneproj-blip/deslizapp-app/issues/99#issuecomment-6097937292). Se conservan abiertas como antecedentes: los intentos de cierre fallaron o se interrumpieron, sin éxito confirmado. No significan trabajo terminado y ya no se actualiza su seguimiento. Project #2 se conserva como antecedente sin modificar ni borrar.

El objeto gestionado 954ed62010cb8324aef681028a31db6f sigue excluido por su 403 restricted_resource. No se intenta eludirlo. La operatividad de Notion se comprueba por sesión; no está garantizada para Coding u otras sesiones.

**Siguiente:** revisar la entrega vigente del PR #96 desde su tarea, sin merge automático. Roadmap está configurado pero sin barras hasta acordar fechas. Lewis puede abrir el tablero desde el teléfono y crear un bug de prueba sin datos de clientes. Duración sugerida: dos semanas desde activación, pendiente de confirmar; no hay fecha final acordada.

## Qué acordamos y por qué

Lewis quiere que Planning y él puedan crear, editar y seguir tareas conjuntamente, con roadmap, bugs, prioridades, dependencias y referencias al encargo técnico. Projects no es operable desde la conexión actual de Planning. Se prueba Notion como gestor de proyectos; no se cambia la documentación técnica ni el flujo de ramas de GitHub.

La integración Notion–GitHub y el acceso del asistente a Notion son conexiones distintas. Verificar la segunda con acciones reales antes de migrar. La sincronización de PRs es opcional; no es requisito para la prueba ni una autorización para configurar planes de pago o automatizaciones.

## Prueba de acceso

En un espacio autorizado para Deslizapp:

1. Buscar primero si existe una página/base de Deslizapp para no duplicarla.
2. Crear una página o tarea claramente identificada como prueba, sin datos reales de tiendas o clientes.
3. Leerla desde la conexión y comprobar el contenido guardado.
4. Editar el contenido y el estado de una tarea de prueba.
5. Leer de nuevo y verificar que el cambio persiste.
6. Entregar el enlace exacto a Lewis para que también pueda abrirla y editarla.
7. Si falla una operación, registrar el bloqueo; no presentar el piloto como activo.

Para activar el piloto, debe comprobarse la edición real de tareas y propiedades de estado, no solo la búsqueda de páginas o lectura de un enlace.

## Organización al activar

Una base de tareas con vistas de tabla, tablero y roadmap; comenzar con lo mínimo.

Campos: título, tipo (tarea/bug), estado, prioridad, responsable, dependencias y enlaces a especificación, prompt y PR. Fechas solo si se han acordado.

Estados propuestos: Por aclarar, Listo, En curso, Bloqueado, Por validar y Terminado. Estar en backlog no autoriza lanzar Coding. Un PR fusionado puede seguir en Por validar: el estado técnico del PR no sustituye la validación de Lewis.

## Fuente de cada información durante el piloto

| Información | Lugar |
|---|---|
| Backlog, bugs, prioridades, responsables, dependencias y seguimiento | Notion, una vez activado |
| Discusiones y propuestas de producto | Tarea de Notion |
| Especificación y decisiones aprobadas necesarias para construir | Documento de la función en GitHub |
| Prompt completo, código, contratos y migraciones | GitHub |
| Pruebas, límites y evidencia de la entrega | PR, handoff y validación en GitHub |
| Relevo de sesiones y enlaces para retomar | GitHub, apuntando a la tarea de Notion |

No copiar todo el backlog al repo. Al aprobar un cambio de comportamiento, guardar su resumen vigente en la especificación técnica con un enlace a la tarea. Así Coding puede continuar aunque su sesión no tenga Notion.

## Transición desde GitHub

Solo después de pasar la prueba:

- Trasladar el seguimiento de #97, #98 y #99 a Notion conservando sus vínculos, dependencias y alcance.
- Comprobar que cada tarea creada se puede leer y editar.
- Añadir en cada Issue de GitHub una nota con el enlace a su tarea de Notion y que el seguimiento pasó allí durante el piloto.
- Si se cierra una Issue por traslado, explicar que no significa trabajo terminado; no marcar su implementación como completada. Conservar la evidencia y el historial.
- Actualizar el relevo y la guía de gestión para que indiquen Notion como único backlog vigente. Mantener Issues y Projects anteriores como antecedentes sin duplicar actualizaciones.
- No borrar documentos técnicos, PRs ni el Project de GitHub.

No aplicar esas operaciones mientras el acceso esté pendiente. Ningún agente debe crear dos registros de seguimiento para la misma tarea ni copiar automáticamente todo el roadmap histórico como trabajo activo.

## Instrucciones para los agentes

Leer este documento, el relevo y la documentación de su función antes de trabajar. No asumir acceso a Notion por pertenecer a Claude o Codex.

Con acceso: consultar la tarea y devolver los resultados/enlaces en ella, manteniendo los documentos técnicos correspondientes.

Sin acceso: usar el prompt y relevo técnico recibidos; decir que no se pudo actualizar Notion y entregar un resumen para Planning. No crear otro backlog en GitHub ni inventar un aviso automático a otra sesión.

Las reglas de dependencias, una sesión por PR, coordinación de migraciones, revisión y autorización de merge permanecen vigentes.

## Evaluación

Duración sugerida: dos semanas desde la activación efectiva, por confirmar con Lewis; no cuenta desde la solicitud de conexión.

Evaluar después de varios ciclos de tarea: si ambos pueden editar, si Lewis encuentra los pendientes desde el teléfono, si cada tarea tiene enlaces claros a decisiones/prompt/PR y si se evita mantener estados duplicados.

Si funciona, registrar su adopción y archivar el seguimiento anterior. Si falla, conservar lo trabajado y hacer un relevo de vuelta con enlaces; no perder decisiones ni pruebas.
