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

Al completar los 7 (o al cerrarlo), el checklist se va con una celebración corta y no vuelve. Lo ve el dueño, no los colaboradores.

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

**Estado: aprobada por Lewis, pendiente de implementar y validar.** La implementación anterior está en PR #96; no está publicada en main. Consultar la tarea en [el relevo vigente](handoffs/planning-sesion.md) para HEAD, sesión y próxima acción.

- **Qué:** organizar la preparación de la tienda en capítulos con varios pasos, en lugar de una barra de siete tareas independientes.
- **Por qué:** Lewis encontró la guía visualmente cargada. Los segmentos intercalados no transmiten el progreso de una historia y el recuadro «Hecho» repite información.
- **Cómo:** cada segmento representa un capítulo y se rellena proporcionalmente a sus pasos completados. Tocar un segmento permite consultar ese capítulo, incluidos los ya completos. Nombre y avance acompañan la selección; área táctil accesible, foco y estado seleccionado distintos del progreso. Mostrar un capítulo a la vez con filas compactas y acciones existentes.
- **Agrupación propuesta para Coding:** «Tu tienda tiene personalidad» (logo, colores, descripción/Instagram); «Tus productos salen al mundo» (cinco productos y publicación, con vista previa); «Tu tienda, a mano» (instalar y equipo, conservando trabajar sin equipo).
- **Numeración por resolver:** Lewis considera la creación de la tienda el capítulo inicial y esta preparación su continuación. La bienvenida actual ya usa cuatro capítulos para recoger datos. Coding debe unificar el lenguaje y documentar el resultado antes de presentar la entrega, sin rehacer la lógica de creación. No dar una numeración contradictoria por resuelta.
- **Descartado:** recuadro separado «Hecho» y carrusel de tarjetas altas/recortadas. La navegación por capítulos no bloquea publicar ni otras acciones; cinco productos siguen siendo recomendación.
- **Selección y actualización:** empezar por el primero incompleto; no robar selección/foco al actualizar datos o volver de una hoja. Al terminar, ofrecer continuar; no saltar mientras una hoja esté abierta.
- **Posponer:** no llamar «Lo hago después» a un cierre permanente. Si se conserva ese comportamiento, usar «Ocultar guía» y confirmación explícita, sin introducir persistencia nueva.
- **Evidencia:** feedback de Lewis en Planning tras probar la preview del PR #96 y prompt completo de ajuste entregado en el chat. Esta nota conserva la decisión; no afirma que el ajuste se haya ejecutado.
- **Siguiente:** misma tarea/PR, contratos y permisos existentes, sin cambios de Supabase ni datos reales. Dejar el PR abierto y validar visualmente con Lewis en Safari.
