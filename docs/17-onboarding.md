# Onboarding (Planning, 9 oct 2026)

Diseño: `referencias/onboarding/` (lienzo de Lewis, 33 pantallas; opción **B** elegida el 6 oct). Orden de Lewis: **primero el onboarding, después el diseño del link de invitación** (pantallas 01, 02, 32 y la tienda pre-llenada, 16 y 33).

## Recorrido de una tienda nueva
1. Abre su enlace `/unirse/<código>` y entra con Google (**como hoy**; el diseño nuevo del link va después).
2. **Historias de bienvenida** (pantallas 08-11): 4 historias a pantalla completa con barras de progreso, tocar para avanzar, mantener para pausar, «Saltar» (salta a los capítulos, nunca se salta los datos). «Hola, {nombre de Google}». La última termina en **«Contar mi historia»**.
3. **La historia de tu tienda, 4 capítulos** (12-15), uno por pantalla, con la cabecera que se va llenando (iniciales, nombre, rubros, WhatsApp):
   - Cap. 1 · El nombre (cambio de Lewis, 10 oct): el nombre se escribe **directo en la tarjeta de vista previa** (su título es el campo, «Tu tienda» de ejemplo, con lápiz y subrayado; no hay recuadro aparte) y debajo «Así nace tu enlace»: `…/tienda/<slug>` en vivo. El círculo de la tarjeta es tocable: **«+ Pon tu logo»** (opcional; cámara o galería). La foto se recorta en cuadrado al centro y se reduce a 512 px JPEG en el teléfono, se ve al momento y queda en el borrador local (la tienda todavía no existe). Los capítulos 2 a 4 la muestran en su cabecera.
   - Cap. 2 · Lo que vendes: varios; el primero es el principal («Otra cosa» = `general`).
   - Cap. 3 · El chat: el WhatsApp de la tienda (dominicano, se valida igual que en Clientes).
   - Cap. 4 · Tú: «¿Cómo te llaman tus clientes?», pre-llenado con el nombre de Google.
   - «Cerrar el capítulo» crea la tienda **con todo junto** (una sola llamada). Después se sube la foto del capítulo 1 con la misma subida de Mi marca (carpeta de la tienda); si falla, la tienda ya existe, «ya existe» queda con las iniciales y ofrece «Pon tu logo» para reintentar. La foto sale del borrador al terminar.
4. **«{Tienda} ya existe»** (17) → «Ver mi tienda» → Inicio con el checklist.
5. Si cierra a mitad, lo escrito se recupera en ese teléfono (borrador local); la tienda no existe hasta cerrar el capítulo 4.

## Condiciones de los siete pasos en Inicio

La tabla conserva las condiciones del checklist. Su presentación en siete segmentos y un recuadro «Hecho» queda sustituida por la decisión de capítulos al final de este documento; los criterios y acciones siguen vigentes.
| # | Paso | Hecho cuando |
|---|---|---|
| 1 | Sube tu logo | `logo_url` no es null |
| 2 | Elige tus colores | la tienda guardó sus colores (marca en `onboarding`) |
| 3 | Agrega 5 productos | 5 o más productos visibles con foto; muestra «N de 5» (es una guía; **no bloquea nada**) |
| 4 | **Publica tu catálogo** | `catalogo_estado = 'publicado'`; **disponible desde el día uno**, sin requisitos |
| 5 | Cuéntales quién eres | la tienda tiene descripción |
| 6 | Pon Deslizapp en tu pantalla | abierta como app (pantalla completa) o la tienda tocó «Ya lo hice» tras ver cómo |
| 7 | Invita a tu equipo | hay otro miembro o una invitación pendiente; o «Lo hago sola» |

Al completar los 7, el checklist se cierra con la celebración corta y no vuelve, tras guardar el cierre con éxito y sin interrumpir hojas abiertas. Apartarlo manualmente solo lo minimiza a una píldora reversible; no completa ni cierra la guía. Lo ve el dueño, no los colaboradores.

## Fallos del lienzo corregidos aquí
1. **«Pide tu catálogo · el equipo lo arma» ya no aplica.** Desde el PR #74 la tienda **publica sola** (`publicar_mi_catalogo`). El paso 4 es «**Publica tu catálogo**» y el botón publica. **Sin mínimo de productos** (decisión de Lewis, 9 oct): la tienda puede publicar con el catálogo vacío para ver desde el día uno cómo se verá; migración `20261009232947_publicar_catalogo_sin_minimo`. Un catálogo vacío tiene que verse bien para quien lo abra («Pronto, aquí van los productos de {tienda}»), no roto. Punto medio aprobado por Lewis: «Ver cómo queda» siempre disponible, y con menos de 5 productos «Publicar» pide una confirmación suave («Tu catálogo tiene N productos» / «Tu catálogo está vacío», «Publicar igual» y «Agregar más»); con 5 o más publica directo. Hecho en la parte 1 (`PRODUCTOS_SUGERIDOS_PARA_PUBLICAR = 5`).
2. **La tienda no se puede crear con todos los datos.** `crear_mi_tienda` recibe solo nombre y un rubro; hace falta una función nueva que cree la tienda con nombre, varios rubros, WhatsApp y nombre de la vendedora en una sola transacción.
3. **El enlace «en vivo» del capítulo 1 puede mentir:** si el nombre ya existe, la base le pone `-2`. La vista previa tiene que salir de la base (función de solo lectura), no de una copia del algoritmo.
4. **Las tiendas que ya existen no deben ver nada de esto.** Se marca todo como visto para las tiendas actuales, menos la Tienda de ensayo (para que Lewis pruebe) y Soft Era (es nueva).
5. **Dónde se guarda lo visto/hecho:** en la base (columna `tiendas.onboarding`), no en el teléfono, para que no se repita en otro dispositivo.

## Partes
- **Parte 1** (`docs/prompts/onboarding-1-historias-y-datos.md`, Opus): base de datos + historias + capítulos.
- **Parte 2** (`docs/prompts/onboarding-2-checklist.md`): checklist en Inicio. Empieza cuando la migración de la parte 1 esté aplicada.
- **Después:** diseño del link de invitación (01, 02, 32) y tienda pre-llenada (16, 33, admin «Dejar la tienda lista»).


## Decisión vigente: preparación por capítulos (10 oct 2026)

**Estado: ajuste solicitado por Lewis; implementación y validación pendientes.** PR #96 contiene la entrega por capítulos del HEAD `0779aff110dcbd8f4cb357d605192a45976a9248`, aún sin merge ni publicación. Lewis pidió sustituir el ocultamiento definitivo, los rellenos proporcionales y el texto repetido. La revisión de los componentes relevantes confirma esos comportamientos anteriores; no equivale a validar todo el PR ni Safari. Consultar la tarea en [el relevo vigente](handoffs/planning-sesion.md) para próxima acción.

- **Qué:** organizar la preparación de la tienda en capítulos con varios pasos, en lugar de una barra de siete tareas independientes.
- **Por qué:** Lewis encontró la guía visualmente cargada. Los segmentos intercalados no transmiten el progreso de una historia y el recuadro «Hecho» repite información.
- **Cómo:** tres controles consultables para capítulos 2–4, sin relleno proporcional. Estado discreto derivado de pasos: cero = sin iniciar; parcial = en curso; todos = completo. Cada indicador lleva un color uniforme del sistema y una señal no cromática/nombre accesible; selección independiente mediante contorno o subrayado. Abrir un capítulo no cuenta como progreso. Área táctil de 44 px, foco y teclado; capítulos completos siguen consultables. Un capítulo a la vez con filas compactas y acciones existentes.
- **Texto:** los controles no seleccionados dicen solo «Capítulo X». El seleccionado se identifica con «Capítulo X · nombre» en una única cabecera de contenido; el selector mantiene «Capítulo X» para no desplazar controles. No repetir el nombre en varios lugares ni recortarlo. Conservar un contador general discreto y los detalles útiles de pasos.
- **Agrupación propuesta para Coding:** «Tu tienda tiene personalidad» (logo, colores, descripción/Instagram); «Tus productos salen al mundo» (cinco productos y publicación, con vista previa); «Tu tienda, a mano» (instalar y equipo, conservando trabajar sin equipo).
- **Numeración:** la entrega reporta y el código revisado confirma creación = capítulo 1 con cuatro pasos; Inicio = capítulos 2 personalidad, 3 productos y 4 tienda a mano. Mantener esa presentación sin rehacer la lógica ni los datos de creación; corregir textos históricos que sigan tratando los cuatro pasos iniciales como cuatro capítulos de la preparación.
- **Descartado:** recuadro separado «Hecho» y carrusel de tarjetas altas/recortadas. La navegación por capítulos no bloquea publicar ni otras acciones; cinco productos siguen siendo recomendación.
- **Selección y actualización:** empezar por el primero incompleto; no robar selección/foco al actualizar datos o volver de una hoja. Al terminar, ofrecer continuar; no saltar mientras una hoja esté abierta.
- **Minimizar:** sustituir «Ocultar guía» por «Minimizar». Una sola píldora horizontal baja ocupa el ancho entre los márgenes actuales de Inicio; toda ella es tocable para recuperar la guía y la selección. Sin confirmación, sin llamada de cierre ni pasos completados. Preferencia visual local por usuario/modo/tienda, conservada al navegar y recargar este navegador, con fallback en memoria; no sincronizada entre dispositivos. No reabrir guías antiguas cerradas ni modificar sus marcas. El cierre automático 7/7 conserva sus reglas.
- **Criterio de UX:** control reversible y poco ruido visual; distinguir selección, avance y foco. Los colores llevan una señal adicional para que el estado sea reconocible sin percibir color.
- **Reglas sustituidas:** la propuesta inicial del 10 de octubre pedía relleno proporcional y permitía ocultar definitivamente con confirmación. El feedback posterior de Lewis sustituye ambas; se conservan como antecedente en el historial, no como instrucciones activas.
- **Evidencia:** handoff recibido de Lewis, consulta del PR/HEAD y lectura de los componentes de checklist y cálculo de capítulos. Revisión success y hilo de reintento resuelto comprobados; API devuelve mergeable false, en discrepancia con «sin conflictos» del handoff. [Encargo completo del ajuste](prompts/onboarding-2-minimizar-y-capitulos.md). Esta nota no afirma que el ajuste esté implementado.
- **Siguiente:** Lewis pasa el encargo a la misma sesión de Coding del PR #96. [Tarea vigente en Notion](https://app.notion.com/p/3f5ed62010cb81758eded930bc0dcde1). Contratos y permisos existentes, sin cambios de Supabase ni datos reales. Coding comprueba main/conflictos antes de entregar; PR abierto sin merge, pendiente de validar visualmente con Lewis en Safari.
