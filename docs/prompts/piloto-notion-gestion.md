# Configurar el piloto de gestión de Deslizapp en Notion

Tu puesto es Planning. Este encargo es de gestión y documentación; no edites código de la app ni hagas cambios en Supabase.

## Contexto y comprobación

Lee docs/00-contexto-del-proyecto.md, AGENTS.md, HANDOFF.md, docs/forma-de-trabajo.md, docs/piloto-notion.md y docs/handoffs/planning-sesion.md en main actualizado.

Continúa en la sesión que ya creó, leyó y editó la tarea de prueba:
https://app.notion.com/p/3f5ed62010cb8168a9b7fe26a1c7a812?pvs=204

Lewis confirmó que añadió «Probado por Lewis». Relee la tarea y comprueba esa edición. No repitas la instalación del plugin. Si esta sesión no tiene herramientas de Notion, entrega el bloqueo y no afirmes que configuraste nada.

La base de prueba accesible es:
https://app.notion.com/p/02d8b53220c147b7b2ca22b79e5d6e7d

El objeto gestionado 954ed62010cb8324aef681028a31db6f devolvió 403 restricted_resource. No intentes eludirlo ni cambiar permisos globales.

## Espacio y tareas

Busca primero un destino normal editable de Deslizapp. Reutiliza el espacio accesible o crea allí una página «Deslizapp · Piloto» y una única base de tareas. No dupliques bases existentes ni compartas públicamente datos privados.

Campos mínimos: título, tipo (tarea/bug), estado, prioridad, responsable, dependencias y enlaces a especificación, prompt y PR. Usa propiedades reales para el estado. Estados: Por aclarar, Listo, En curso, Bloqueado, Por validar y Terminado. No inventes responsables, fechas o prioridades no acordadas; déjalas sin asignar cuando corresponda.

Configura tabla, tablero y roadmap si las herramientas lo permiten. Si no permiten configurar vistas, informa exactamente qué falta y ofrece el enlace a la base funcional. No presentes una vista inexistente como configurada. No contrates planes ni actives automatizaciones.

Lee el contenido vigente, comentarios y PR relacionado de estas Issues antes de trasladarlas:
- #97: https://github.com/onedayoneproj-blip/deslizapp-app/issues/97
- #98: https://github.com/onedayoneproj-blip/deslizapp-app/issues/98
- #99: https://github.com/onedayoneproj-blip/deslizapp-app/issues/99

Traslada únicamente esas tres, con su alcance, condiciones de aceptación y dependencias. Vincula sus documentos y prompts originales; no copies toda la documentación técnica. Conserva el origen GitHub y verifica el estado actual del PR #96: no deduzcas que está terminado por un reporte viejo.

Registra qué se busca, por qué, decisión vigente, evidencia y siguiente acción en cada tarea, con texto breve y enlaces. Distingue decisiones aprobadas de propuestas. #99 es diseño pendiente, no un encargo de implementación. No importes automáticamente docs/16-ruta-al-lanzamiento.md: contiene antecedentes que requieren revisión. Excluye PR #45 de rendimiento.

Comprueba con lectura posterior el contenido y propiedades de las tres tareas, sus enlaces y dependencias. Prueba una edición y reversión inocua en la tarea de prueba, no alterando el estado real de un trabajo para demostrar acceso.

## Transición y memoria

Notion llevará backlog, bugs, prioridades, dependencias y seguimiento. GitHub conservará código, especificaciones aprobadas, decisiones técnicas, prompts, migraciones, pruebas, PR y handoffs. No mantengas dos estados editables para la misma tarea.

Solo tras verificar los destinos:
- Añade en cada Issue una nota con el enlace exacto de Notion y que su seguimiento se traslada durante el piloto.
- Archiva el seguimiento anterior sin afirmar que el trabajo está completado. Si cierras las Issues por traslado, deja explícito el motivo y conserva su historial.
- Actualiza docs/piloto-notion.md, docs/gestion-del-proyecto.md, docs/00-contexto-del-proyecto.md y docs/handoffs/planning-sesion.md para enlazar la base y las tareas y señalar la fuente vigente. HANDOFF ya apunta al documento del piloto; cambia solo lo necesario.
- Conserva Project #2 e Issues como antecedentes. No borres nada ni intentes modificar Projects sin acceso.
- Contrasta main antes de escribir y evita sobrescribir cambios de otras sesiones.

Si no tienes escritura GitHub, entrega un relevo exacto con los tres enlaces, notas propuestas y archivos por actualizar para que Planning complete esa parte. Hasta entonces indica «Notion preparado; transición de GitHub pendiente», no «piloto plenamente activo».

No inicies Coding, crees ramas dependientes ni hagas merges por este encargo. Las reglas de sesiones y dependencias siguen vigentes.

## Entrega

Devuelve:
1. Enlace directo al espacio/base para Lewis, usable desde su teléfono.
2. Enlaces directos a las tres tareas, identificando su Issue de origen.
3. Qué leíste y verificaste realmente, qué no pudiste hacer y si viste «Probado por Lewis».
4. Transición realizada en GitHub y commit documental, o relevo para completarla.
5. Un paso sencillo para que Lewis revise el tablero y reporte un bug de prueba sin datos de clientes.

La duración sugerida es dos semanas desde la activación efectiva, pendiente de confirmar con Lewis. No inventes una fecha final. No afirmes que otra sesión podrá usar Notion sin comprobar sus herramientas.
