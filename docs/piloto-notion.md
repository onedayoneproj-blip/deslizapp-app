# Piloto de gestión en Notion

Aprobado por Lewis el 10 de octubre de 2026.

## Estado del piloto

**Prueba técnica aprobada y edición de Lewis confirmada; configuración del piloto pendiente.** El 10/10/2026 Lewis pegó el siguiente informe de la sesión de prueba. Planning registra ese reporte, sin presentarlo como una comprobación independiente desde este chat.

- La sesión creó y leyó una tarea con contenido `V1` y estado `Not started`.
- Editó el contenido a `V2` y la propiedad real de estado a `In progress`.
- Volvió a leer y confirmó que persistían ambos cambios.
- [Tarea de prueba](https://app.notion.com/p/3f5ed62010cb8168a9b7fe26a1c7a812?pvs=204).
- [Base privada de prueba](https://app.notion.com/p/02d8b53220c147b7b2ca22b79e5d6e7d).
- El [objeto Deslizapp encontrado](https://app.notion.com/p/954ed62010cb8324aef681028a31db6f?pvs=204) devolvió `403 restricted_resource` a esa sesión. Según su informe, es un objeto gestionado por Notion, no un destino editable mediante MCP. No usarlo ni intentar eludir esa restricción.

Lewis confirmó en este chat que realizó la edición solicitada («Probado por Lewis»). Se registra su confirmación; Planning no pudo releer Notion desde esta sesión. La sesión con acceso debe verificar esa edición y configurar un destino normal accesible para gestionar Deslizapp. La base anterior sigue siendo de prueba, no un tablero de producción confirmado.

El plugin figura instalado. En este chat de Planning todavía no se exponen herramientas de Notion, aun después de recargar; la sesión de prueba sí las tuvo. La operatividad debe comprobarse por sesión, no asumirse globalmente. No pedir otra instalación ni afirmar que Planning puede actualizar el tablero desde aquí.

**Siguiente:** retomar en la misma sesión con acceso real usando [el prompt de configuración](prompts/piloto-notion-gestion.md), verificar la edición de Lewis, configurar el espacio compartido y trasladar las tres tareas según las reglas siguientes. No dar el piloto por activo por el solo éxito técnico.

Las Issues #97–#99 siguen vigentes. No se migró el backlog ni se modificaron esas Issues para trasladarlas. El [Project de GitHub](https://github.com/users/onedayoneproj-blip/projects/2/views/1?layout_template=roadmap) se conserva.

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
