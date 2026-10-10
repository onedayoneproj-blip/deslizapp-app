# PR #96 · minimizar la guía y simplificar los capítulos

Tu puesto es Coding. Continúa la misma tarea de preparación por capítulos; no abras otro PR ni otra rama. Lewis pasa este encargo manualmente. Planning no ha editado código.

## Base y fuentes

Lee main actualizado: docs/00-contexto-del-proyecto.md, AGENTS.md, HANDOFF.md, docs/forma-de-trabajo.md, docs/handoffs/planning-sesion.md y docs/17-onboarding.md. Lee docs/08-movimiento.md, docs/09-sistema-de-diseno.md y docs/11-voz-y-frases.md antes de tocar presentación. Revisa el handoff y la validación existentes de esta tarea.

Tarea vigente: https://app.notion.com/p/3f5ed62010cb81758eded930bc0dcde1
PR: https://github.com/onedayoneproj-blip/deslizapp-app/pull/96
Rama: feat/onboarding-checklist-codex
HEAD comprobado por Planning: 0779aff110dcbd8f4cb357d605192a45976a9248.
Código anterior reportado: b66ebb4f2baa742e03bf3d89a26c0833ff567196.
Preview anterior: https://deslizapp-kpj9cedvs-onedayone.vercel.app
Alias: https://deslizapp-app-git-feat-onboarding-checklist-codex-onedayone.vercel.app

Planning comprobó Revisión success, ejecución 38051728061, y el hilo de reintento resuelto. La consulta de PR devuelve mergeable false; el handoff decía sin conflictos. No asumas que sigue integrable: comprueba origin/main y HEAD actuales y resuelve los conflictos en esta misma sesión, conservando la nueva memoria documental y Notion. No fuerces el push. No fusionar.

Este encargo y la decisión vigente sustituyen las instrucciones antiguas de barras proporcionales y Ocultar guía definitivo. No reutilices identificadores de sesiones ni envíes avisos automáticos del prompt original.

## Resultado que pide Lewis

La guía debe poder apartarse sin perderla. Los capítulos deben expresar tres estados discretos, con menos texto. Conserva los pasos y acciones ya construidos; cambia presentación y la acción manual de ocultar.

### 1. Minimizar y volver a desplegar

- Cambia Ocultar guía por Minimizar. Por toque, sustituye la guía desplegada por una única píldora horizontal baja, que ocupe el ancho disponible entre los márgenes actuales de Inicio. No dos píldoras, no botón flotante, no borde a borde del viewport.
- Ejemplo de contenido: «Prepara tu tienda» a la izquierda y «3 de 7» más un chevrón a la derecha. Toda la píldora es un botón de al menos 44 px de alto; no añadir texto largo ni barra proporcional.
- Tocar la píldora despliega la guía en el mismo lugar y recupera el capítulo seleccionado. Minimizar es inmediato y reversible: no necesita confirmación ni hoja de cierre permanente.
- Minimizar NO llama marcarOnboarding con checklist_cerrado_en, no completa pasos, no cambia datos del negocio ni reinicia la guía.
- Conserva el estado de interfaz al cambiar de pestaña y regresar. Guarda la preferencia de minimización localmente en este navegador, aislada por usuario, modo demo/real y tienda; distingue esta preferencia visual de las marcas de onboarding compartidas en servidor. Sin almacenamiento disponible funciona en memoria. Evita mostrar primero la guía expandida y luego colapsarla al cargar.
- No añadir sincronización entre dispositivos ni persistencia en Supabase. No registrar datos personales en el valor local.
- Mantén el cierre automático ya acordado al completar los siete pasos, cuando no haya hojas abiertas: persistencia solo tras éxito, celebración corta y reintento correcto. Aunque esté minimizada, completar 7/7 no debe impedir ese cierre.
- No reabrir guías con checklist_cerrado_en previo ni borrar esas marcas, ni en tiendas reales ni en Demo habitual. Para comprobar el nuevo comportamiento usa navegación privada/Demo o fixtures temporales controlados.
- Gestiona foco al minimizar y restaurar para no dejarlo en un elemento desmontado, sin forzar scroll de Inicio ni remontar formularios. Botón con nombre accesible y estado expandido/plegado. No convertir la píldora en diálogo ni crear entradas de historial adicionales.

### 2. Capítulos con estados discretos

En Inicio se mantienen capítulos 2, 3 y 4; la creación es capítulo 1 con sus cuatro pasos.

- Sin iniciar: cero pasos cumplidos.
- En curso: al menos uno y menos del total.
- Completo: todos los pasos del capítulo cumplidos.

Deriva esos estados de las condiciones de pasos existentes. No cuentes solo haber visitado o seleccionado un capítulo como progreso. Los datos ya existentes pueden darlo por En curso desde la primera visita.

Elimina los rellenos proporcionales de las rayas. Cada indicador usa un color uniforme según su estado. Usa tokens del sistema: neutro para sin iniciar, un tono distinto y con contraste para en curso y el tono de éxito para completo. No hardcodear colores ni usar rojo como estado normal.

El color no será la única señal: añade marca discreta de completo, símbolo distinto para en curso y nombre accesible con estado y cantidad de pasos. La selección se reconoce mediante contorno/subrayado y aria-pressed, independientemente del color; un capítulo completo seleccionado sigue completo.

Conserva controles de 44 px, foco visible, teclado y consulta de capítulos completos. Nada de animar cada fila, la página entera o la altura del bloque; usa las reglas vigentes de movimiento y reducido.

### 3. Texto breve y selección clara

- Los controles de capítulos no seleccionados muestran solo «Capítulo 2», «Capítulo 3» o «Capítulo 4»; no repetir sus títulos y contadores debajo.
- El capítulo seleccionado muestra «Capítulo X · nombre del capítulo», con el nombre una sola vez en su cabecera de contenido. En el selector se mantiene «Capítulo X»; selector y cabecera forman la identificación del capítulo activo. Así no es necesario ensanchar un botón por su nombre largo ni desplazar los demás.
- Conserva los nombres vigentes: Tu tienda tiene personalidad, Tus productos salen al mundo, Tu tienda, a mano. No modificar agrupación ni numeración, ni crear un carrusel o páginas separadas.
- Evita repetir simultáneamente el nombre, el número y la misma explicación en varios encabezados. Conserva un avance general discreto «N de 7» y la información útil en las filas, incluido N de 5 productos con foto.
- A 360 px los tres controles deben caber sin corte ni desplazamiento horizontal. El nombre activo puede envolver en su cabecera; no recortarlo con puntos suspensivos. Revisa texto ampliado.

## Contratos conservados

Dueña solamente; nunca colaboradora o Ver como. Aislamiento por tienda y modo; borrador y teclado estables. Mi marca, perfil, instalación y equipo usan sus acciones existentes. Publicar y Ver cómo queda disponibles sin mínimo; cinco productos visibles con foto siguen siendo recomendación. No cambios de Supabase, migraciones, OAuth, Storage ni datos reales. PR #45 excluido.

Actualizar la novedad visible correspondiente en lib/novedades.ts siguiendo HANDOFF; no añadir versiones ficticias ni duplicar anuncios de una entrega aún no publicada.

## Verificación y entrega

Adapta los tests que verificaban relleno proporcional o cierre manual permanente; no conservar aserciones que contradigan la nueva decisión. Cubre casos reales de regresión:
- Minimizar/desplegar, misma selección, navegación y recarga; aislamiento por usuario/tienda y demo/real; fallback sin almacenamiento.
- No escritura de checklist_cerrado_en por minimizar; marcas antiguas cerradas no reabiertas.
- Estados cero/parcial/completo derivados correctamente, independientemente de selección.
- 7/7 con hoja abierta espera; cierre fallido reintenta la clave correcta; minimización no impide el cierre final.
- Controles, foco, VoiceOver/nombres accesibles, texto ampliado y vista sin overflow a 360/390/430.
- Publicar sin mínimo y volver desde productos conserva selección; perfil/borrador/teclado no regresan.

Ejecuta las comprobaciones requeridas por el repo (tipos, lint, build, tests y scripts afectados; teclado si toca campos o sus ancestros). No repetir suites después de integraciones puramente documentales salvo que haya fallos o cambios nuevos. Capturas nuevas expandida/minimizada, y estados de capítulos, en las anchuras afectadas. Identifica las pruebas simuladas y lo pendiente en Safari físico.

Antes de push integra main actualizado en esta rama y comprueba que el diff final no reintroduce documentación antigua ni pierde el seguimiento Notion. Un push por ronda cuando sea posible; si necesita corrección, explícala. Actualiza especificación/handoff/validación y descripción del PR alrededor del resultado final. Mantén el PR abierto, sin merge ni producción hasta revisión visual de Lewis.

Devuelve HEAD exacto, base, checks y preview que realmente sirva el nuevo código; no atribuir el nuevo ajuste a la preview antigua. Si un build documental se omite, demuestra qué código sirve el alias. Entrega límites y pasos breves para Lewis. Si tienes Notion, registra allí evidencia; si no, di que no pudiste actualizarlo y entrega el handoff en este chat para que Lewis lo pegue en Planning.
