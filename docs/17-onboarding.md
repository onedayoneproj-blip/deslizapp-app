# Onboarding (Planning, 9 oct 2026)

Diseño: `referencias/onboarding/` (lienzo de Lewis, 33 pantallas; opción **B** elegida el 6 oct). Orden de Lewis: **primero el onboarding, después el diseño del link de invitación** (pantallas 01, 02, 32 y la tienda pre-llenada, 16 y 33).

## Recorrido de una tienda nueva
1. Abre su enlace `/unirse/<código>` y entra con Google (**como hoy**; el diseño nuevo del link va después).
2. **Historias de bienvenida** (pantallas 08-11): 4 historias a pantalla completa con barras de progreso, tocar para avanzar, mantener para pausar, «Saltar» (salta a los pasos de creación, nunca se salta los datos). «Hola, {nombre de Google}». La última termina en **«Contar mi historia»**.
3. **Capítulo 1 · Tu tienda nace, con 4 pasos** (12-15), uno por pantalla, con la cabecera que se va llenando (iniciales, nombre, rubros, WhatsApp):
   - Paso 1 · El nombre (cambio de Lewis, 10 oct): el nombre se escribe **directo en la tarjeta de vista previa** (su título es el campo, «Tu tienda» de ejemplo, con lápiz y subrayado; no hay recuadro aparte) y debajo «Así nace tu enlace»: `…/tienda/<slug>` en vivo. El círculo de la tarjeta es tocable: **«+ Pon tu logo»** (opcional; cámara o galería). La foto se recorta en cuadrado al centro y se reduce a 512 px JPEG en el teléfono, se ve al momento y queda en el borrador local (la tienda todavía no existe). Los pasos 2 a 4 la muestran en su cabecera.
   - Paso 2 · Lo que vendes: varios; el primero es el principal («Otra cosa» = `general`).
   - Paso 3 · El chat: el WhatsApp de la tienda (dominicano, se valida igual que en Clientes).
   - Paso 4 · Tú: «¿Cómo te llaman tus clientes?», pre-llenado con el nombre de Google.
   - «Cerrar el capítulo» crea la tienda **con todo junto** (una sola llamada). Después se sube la foto del paso 1 con la misma subida de Mi marca (carpeta de la tienda); si falla, la tienda ya existe, «ya existe» queda con las iniciales y ofrece «Pon tu logo» para reintentar. La foto sale del borrador al terminar.
4. **«{Tienda} ya existe»** (17) → «Ver mi tienda» → Inicio con el checklist.
5. Si cierra a mitad, lo escrito se recupera en ese teléfono (borrador local); la tienda no existe hasta terminar el paso 4 del capítulo 1.

## Preparación en Inicio · capítulos 2 a 4 (ajuste de Lewis, 10 oct 2026)

La bienvenida tiene cuatro **historias**, sin número de capítulo. Crear la tienda es el **capítulo 1 · Tu tienda nace**: nombre/logo opcional, rubros, WhatsApp y vendedora son pasos 1 a 4. Sus formularios, borrador, validaciones y creación conjunta no cambian. La cabecera dice «Capítulo 1 · Paso N de 4 · [nombre]». «Cerrar el capítulo» conserva su acción de crear.

Después de «Ver mi tienda», Inicio continúa con tres capítulos:

| Capítulo | Nombre | Pasos (contratos originales) |
|---|---|---|
| 2 | Tu tienda tiene personalidad | Logo, colores, descripción/Instagram (1, 2, 5) |
| 3 | Tus productos salen al mundo | Cinco productos con foto, publicar (3, 4); «Ver cómo queda» |
| 4 | Tu tienda, a mano | Pantalla de inicio, equipo (6, 7); «Lo hago sola» |

La barra de Inicio tiene tres rayas tocables, una por capítulo de preparación. El capítulo de creación ya terminó y no añade otra raya. Cada relleno es tareas hechas / tareas del capítulo (3, 2 y 2); vacío=0, parcial=fracción, completo=1, incluso fuera de orden. Solo `accion` indica progreso; el contorno señala selección. Botones de 44 px, nombre/avance accesibles, `aria-pressed`, foco visible, Tab/Enter/Espacio y flechas/Home/End. No hay controles dentro de un progressbar.

«Capítulo N · X de Y pasos» acompaña al nombre visible. Solo se ven las filas del capítulo seleccionado, con Hecho/Pendiente y acciones de revisión, sin carrusel ni recuadro Hecho. Los textos pueden envolver, nunca recortarse. La selección inicial es el primer capítulo incompleto; después permanece ante actualizaciones. La selección manual se conserva en el proveedor del panel por modo y tienda al volver desde producto, sin persistencia nueva de aplazamiento. Al completar se muestra confirmación breve y botón para seguir al próximo pendiente; nunca navegación automática. El cierre de 7/7 espera a que se cierre cualquier hoja y conserva celebración, intento único y reintento de la clave de cierre.

«Ocultar guía» pide la confirmación existente y cierra definitivamente. No se ofrece «Lo hago después» ni se reabren guías cerradas. No bloquea funciones: cinco productos son una recomendación, publicar sigue disponible con cualquier cantidad y la confirmación suave existente. Movimiento: solo `scaleX` del relleno con tokens actuales, desactivado con movimiento reducido; sin entradas de listas.

### Contratos de los siete pasos (conservados)
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

**Estado: implementada y verificada en Demo/fixtures Chromium; pendiente de revisión de Lewis en Safari.** PR [#96](https://github.com/onedayoneproj-blip/deslizapp-app/pull/96), abierto sin merge. Estado/HEAD: [relevo vigente](handoffs/planning-sesion.md); evidencia detallada: [validación](validacion-onboarding-2.md) y [handoff](handoffs/onboarding-2-checklist-codex.md).

- **Qué y por qué:** Lewis encontró cargadas las siete rayas, las tarjetas altas y Hecho. Se organiza la preparación en capítulos con pasos.
- **Cómo:** creación = capítulo 1 con cuatro pasos; preparación en Inicio = capítulos 2 personalidad, 3 productos y 4 a mano, según la estructura documentada arriba. Progreso proporcional, selección distinta, botones accesibles y filas consultables.
- **Descartado:** carrusel y bloque Hecho; numeraciones independientes; bloquear publicación con cinco productos; llamar aplazamiento a un cierre permanente.
- **Evidencia:** encargo de Lewis, capturas y pruebas enlazadas. Demo normal y fixtures son evidencia simulada, no tiendas reales ni Safari físico.
- **Siguiente:** revisión de Lewis según el relevo; conservar contratos/permisos y no tocar Supabase ni datos reales.
