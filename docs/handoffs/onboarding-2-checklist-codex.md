# Onboarding 2 · minimizar y capítulos discretos · entrega vigente

Continuación de Coding autorizada manualmente por Lewis el 10 oct 2026, siguiendo [el prompt nuevo](../prompts/onboarding-2-minimizar-y-capitulos.md). PR #96 comprobado abierto en HEAD `0779aff110dcbd8f4cb357d605192a45976a9248`. Se conserva `feat/onboarding-checklist-codex`; main `f7e05fa` integrado, conflictos de docs/17 y relevo resueltos conservando la decisión nueva y el piloto Notion. Antes de push se integra también el avance documental `ece4c7946dd860fad00788a8c61a2e15e6d957f0`. Un push de esta ronda, sin force, merge a main ni producción.

Minimizar cambia la guía por una sola píldora entre márgenes. Es reversible, conserva capítulo, navega y recarga sin destello expandido. Preferencia local aislada por identificador opaco de usuario / modo / tienda; valor solo minimizada y capítulo. Si localStorage falla, conserva estado en memoria durante esta página/navegación (no promete persistir tras recargar sin almacenamiento). Sin nuevas marcas del servidor. Guías cerradas permanecen cerradas.

Los capítulos 2/3/4 conservan agrupación y acciones, con tres estados derivados: sin iniciar, en curso, completo. Tokens neutro/atención/éxito; Lewis pidió retirar los símbolos junto al nombre de cada capítulo, manteniendo estado/contador en su nombre accesible; selección por subrayado independiente; Lewis descartó expresamente el recuadro. Lewis añadió la referencia visual de Pedido #1008 antes del push: raya completa redondeada arriba, Capítulo X debajo; borde-pastilla/atencion-texto/accion (tokens de Pedidos). Selector breve, una cabecera de nombre y filas consultables. Creación sigue siendo capítulo 1 con cuatro pasos. Se ajusta la novedad 0.57.0 aún no publicada, sin duplicar versiones. Publicar vacío, vista previa, trabajar sola, permisos y exclusión de Ver como conservados.

Cierre 7/7 también minimizada: espera hojas, persiste solo tras éxito, celebra y permite reintentar checklist_cerrado_en al fallar. Los campos de perfil son hermanos del bloque que se pliega: no se desmontan ni animan sus ancestros. Foco de plegar/restaurar dentro del gesto, preventScroll y sin entradas de historial.

**Verificaciones:** tipos, build y lint aprobados; 77/77 archivos de tests, 125 comprobaciones visuales, 15 de fallos y script completo de teclado; 21 verificaciones/capturas finales tras retirar recuadro y símbolos. Lint general mantiene 32 avisos previos; archivos afectados sin avisos.

**Evidencia actual:** [validación](../validacion-onboarding-2.md), [capturas](../capturas/onboarding-2/README.md), [PR](https://github.com/onedayoneproj-blip/deslizapp-app/pull/96). HEAD exacto, Revisión y preview READY del código nuevo se devuelven en el PR y handoff de este chat; la preview anterior de b66ebb4 no valida este ajuste. No se repiten suites de app tras integración únicamente documental.

**Límites:** Demo/fixtures Chromium y teclado simulado; Safari/VoiceOver/iPhone físico, instalación nativa y OAuth/Storage reales pendientes. Aislamiento de usuario/demo-real comprobado por unitarias de preferencia y código de provider; sin alternar cuentas reales. No Supabase ni datos reales, ninguna guía de Michel/María reabierta. Notion disponible en esta continuación: se actualiza la tarea existente con evidencia, sin crear un backlog ni avisar sesiones remotas. Lewis revisa desde Safari privado → preview/alias → Ver demo → Inicio; selecciona capítulos, minimiza, cambia pestaña, vuelve/recarga y despliega. Una Demo que ya cerró la guía conserva el cierre.

---

## Antecedente · entrega de capítulos proporcionales

### Entrega anterior por capítulos proporcionales

Coding Codex, continuación del 10 oct 2026. Se comprobó PR #96 abierto y HEAD remoto `11532b43a456af35f8caf79e65edb70ecf4290fe` antes de clonar y continuar en `feat/onboarding-checklist-codex`. Un push de implementación y una ronda correctiva posterior (un push) para integrar el main documental que avanzó durante la entrega. Sin force, merge a main ni producción. No cambios Supabase ni datos reales.

La sincronización conserva la nueva estructura documental de main `ca0b614` y resuelve los conflictos que impedían Revisión. El código validado y las capturas son los de `b66ebb4`; HEAD/preview exacta finales se consultan en el PR y en la entrega de esta conversación.

## Qué cambia

Creación = capítulo 1 / cuatro pasos, conservando formularios, lógica y borrador. Inicio continúa con capítulos 2 personalidad (logo, colores, perfil), 3 productos (cinco sugeridos + publicar) y 4 a mano (instalación + equipo). Tres controles de 44 px, verde proporcional para progreso y contorno para selección; nombre/contador, foco y teclado. Solo filas del capítulo seleccionado, con pendientes/hechos consultables, sin carrusel ni Hecho separado.

Primer capítulo incompleto al entrar; selección manual estable ante datos y al regresar desde producto, aislada por modo/tienda en el proveedor. Confirmación de capítulo listo y continuar por toque. Publicar sin mínimo y Ver cómo queda conservados. Ocultar guía explicita el cierre definitivo existente. 7/7 espera a cerrar hojas y conserva celebración/reintento. Atendido el comentario de review sobre la clave fallida de cierre.

## Validación y límites

Typecheck, build final y bienvenida aprobados; 76/76 archivos de tests, 94 comprobaciones Chromium de capítulos y 11 de fallos. Lint final de archivos afectados sin errores/avisos; 32 avisos históricos en el resto. Smoke del build final para entrada Demo y foco aprobado. Resultados de esta ronda y antecedentes: docs/validacion-onboarding-2.md. Capturas actuales: docs/capturas/onboarding-2/capitulos/. No Safari físico, instalación nativa ni Storage/OAuth reales. Los errores usan fixture temporal demo que se elimina al acabar; Ver como se cubre mediante contratos simulados. No se reabrió ni modificó ninguna guía real.

## Lewis · Safari

1. Abre el alias de la rama en navegación privada → Ver demo → Inicio. La guía aparece en Esencias Michel **demo**, sin inyectar estados. Si ya cerraste esa guía en tu Demo habitual, seguirá cerrada; no se reabre.
2. Toca las tres rayas: consulta pendientes y hechos. En personalidad, revisa logo/colores y el perfil; escribe y cancela el cierre con Seguir aquí para comprobar el borrador.
3. En productos, abre Agrega 5 productos, cierra a Catálogo y vuelve con Inicio. La selección debe conservarse. Ver cómo queda funciona; publicar con menos de cinco ofrece la confirmación suave.
4. En a mano, revisa las instrucciones y la opción Lo hago sola. Al completar, pulsa Continuar; no debe moverte por una actualización.
5. Ocultar guía → Cancelar conserva la guía; confirmar la cierra definitivamente. No usar tiendas reales para probar.

Este handoff se devuelve en la conversación actual para que Lewis lo pegue en Planning. No se usan sesiones antiguas ni se prometen mensajes automáticos.

---

# Antecedente · entrega inicial de siete tarjetas (conservada)

Coding Codex, 10 oct 2026. Rama `feat/onboarding-checklist-codex`, desde main `cd804c8a617725d3f0c50a200402d254f61a674c` (#95 incluido). Planning no editó código de app. No existía trabajo remoto de checklist al comenzar; una copia local sin push de Claude es desconocida. No sobrescribir esta rama con una copia antigua.

## Alcance

Checklist de siete pasos para dueñas, con tarjetas pendientes en carrusel y Hecho plegado. Visibles **con foto** para el paso 3 (docs/17), nunca un mínimo para publicar. Publicar y Ver cómo queda usan las hojas existentes, también vacío. Mi marca abre logo/colores; guardar colores marca el paso. Perfil corto con descripción ≤160 e Instagram válido; instalación con instrucciones y Ya lo hice; Tu equipo y Lo hago sola.

`Tienda.onboarding` pasa por el adaptador existente. `marcarOnboarding` llama la RPC publicada `marcar_onboarding`; demo persistente e idempotente, protegida por dueña. `guardarPerfilCatalogo` guarda solo descripción/Instagram y deja intactos marca, inventario y pedidos. Ambos métodos bloqueados en soloMirar.

El cierre automático se intenta una vez por montaje. Solo el éxito confirmado persiste el cierre y muestra celebración breve (toast); error deja guía y Reintentar. Cerrar manualmente requiere confirmar. No se muestra a colaboradoras, Ver como, pausadas/eliminadas, ni tiendas ya marcadas. Datos por tienda, una consulta agregada de productos/equipo; actualización al volver/foco mediante provider existente. Error de lectura deja disponible Inicio. Perfil conserva borrador y usa protección de salida dentro del contexto Hoja.

## Coordinación

Un único push de la ronda. PR abierto sin merge ni publicación. No se incorporó #45 ni se hicieron migraciones/escrituras reales. Esencias Michel, Soft Era y Tienda de ensayo intactas. Las herramientas remotas Claude `send_message`/`create_trigger` no están disponibles: el aviso se entrega al Planning de esta sesión, sin afirmar que se envió a la sesión Claude.

## Validación

Ver `docs/validacion-onboarding-2.md` y `docs/capturas/onboarding-2/README.md`. Los primeros errores ambientales/test actualizado se conservan como antecedentes. Los resultados de Chromium son con fixtures demo; no sustituyen Safari físico ni una cuenta dueña real.

## Lewis · pruebas en Safari

1. Abre la preview exacta del PR. En Demo, usa una tienda con guía disponible; no pruebes escrituras en Michel o Soft Era.
2. Revisa la barra y desliza las tarjetas. Logo/colores abren Mi marca en la sección correcta. Guardar colores debe completar el paso.
3. Abre Agregar producto y vuelve a Inicio: solo los visibles con foto cuentan. Publicar funciona incluso vacío, con confirmación suave; Ver cómo queda abre la vista previa existente.
4. Cuéntales quién eres: descripción e Instagram. Escribe, intenta cerrar, elige Seguir aquí y comprueba el borrador. Guarda.
5. Cómo se hace → Ya lo hice; equipo → Lo hago sola. Recarga y confirma persistencia.
6. Si decides ocultar la guía, cancela primero; confirmar debe ocultarla definitivamente en esa tienda. Siete de siete debe cerrarse una sola vez.
7. Verifica que como colaboradora o en Ver como no aparece. Las acciones reales de una tienda nueva requieren cuenta de prueba acordada, no las tiendas de otras personas.
