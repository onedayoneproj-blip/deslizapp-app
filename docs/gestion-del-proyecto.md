# Seguimiento de Deslizapp

**Notion es el backlog del piloto desde el 10 de octubre de 2026.** [Estado y evidencia](piloto-notion.md). Esta sesión es Planning principal; Lewis pasa manualmente los encargos a Coding. Registrar tareas no inicia Coding ni autoriza merges.

## Accesos directos para Lewis

- [Tablero de Deslizapp](https://app.notion.com/p/02d8b53220c147b7b2ca22b79e5d6e7d?v=3f5ed62010cb815caa6f000cc00c0364).
- [Tabla de tareas](https://app.notion.com/p/02d8b53220c147b7b2ca22b79e5d6e7d?v=8154b003a9f945fd8a4c17023fd7adf2).
- [Roadmap](https://app.notion.com/p/02d8b53220c147b7b2ca22b79e5d6e7d?v=3f5ed62010cb813f8199000c8790da28).
- [Índice de documentación](00-contexto-del-proyecto.md).
- [Relevo de Planning](handoffs/planning-sesion.md).
- [Reglas de coordinación y memoria](forma-de-trabajo.md).

- [Preparación por capítulos · origen #97](https://app.notion.com/p/3f5ed62010cb81758eded930bc0dcde1).
- [Validación completa en iPhone · origen #98](https://app.notion.com/p/3f5ed62010cb81b69b01c48a155876b5).
- [Diseño de invitación y tienda prellenada · origen #99](https://app.notion.com/p/3f5ed62010cb819fb74ce140333f148d).

## Usarlo desde el teléfono

Abre el tablero en Notion o Safari y toca una tarea. Para reportar un bug, pulsa Nueva, escribe el título, selecciona Tipo = bug y Estado de tarea = Por aclarar. En el contenido escribe qué hiciste, qué ocurrió, qué esperabas, dispositivo y enlace/HEAD probado; añade una captura si ayuda. Para probar el flujo usa «PRUEBA · bug del tablero» y marca Prueba para excluirlo del trabajo activo. Evita datos de clientes, contraseñas y códigos de invitación.

Usar únicamente Estado de tarea para seguimiento. Sus seis opciones son Por aclarar, Listo, En curso, Bloqueado, Por validar y Terminado. Es una propiedad real Select; el Estado nativo anterior se conserva por seguridad, oculto en vistas, como evidencia de prueba. No mantener ambos estados. Prioridad (Alta/Media/Baja), responsable y fechas se asignan solo cuando estén acordados. Roadmap está configurado sobre Fechas acordadas, actualmente vacías; no inventar fechas para dibujar barras.

La base accesible se reutilizó sin duplicarla y permanece privada. Lewis ya editó allí la tarea de prueba; no se cambiaron permisos ni se publicó contenido. Otras sesiones deben comprobar sus herramientas. El objeto gestionado Deslizapp con 403 no es el destino del piloto.

## Dónde vive cada información

- **Notion:** tareas, bugs, decisiones de producto en discusión, prioridades, responsables, dependencias, siguiente acción y enlaces a la evidencia.
- **Documento de función en GitHub:** comportamiento y decisiones aprobadas necesarias para construir.
- **Prompt en GitHub:** encargo completo para Coding; Lewis lo pasa manualmente.
- **PR/handoff/validación:** implementación, pruebas y límites; comprobar HEAD actual.
- **Relevo:** coordinación y enlaces, sin una segunda tabla de estados.

Un PR fusionado puede permanecer Por validar. No marcar Terminado hasta cumplir el resultado acordado y registrar la evidencia correspondiente.

## Antecedentes de GitHub

Se conservan [Issues #97–#99](https://github.com/onedayoneproj-blip/deslizapp-app/issues) con notas y enlaces al destino. Su seguimiento ya no se actualiza allí. Siguen abiertas porque los intentos de cierre no confirmaron éxito; un cierre por traslado tampoco significaría trabajo terminado.

Lewis creó [Deslizapp roadmap, Project #2](https://github.com/users/onedayoneproj-blip/projects/2/views/1?layout_template=roadmap). Planning recibió Resource not accessible by integration (user.projectV2); no ha verificado sus elementos, vistas, privacidad ni automatizaciones. Se conserva como antecedente, sin modificar ni borrar. Las propuestas anteriores de configuración no son trabajo activo; están en el historial del documento.

No mantener un segundo backlog en GitHub ni importar automáticamente el roadmap histórico. PR #45 de rendimiento sigue excluido por Lewis.
