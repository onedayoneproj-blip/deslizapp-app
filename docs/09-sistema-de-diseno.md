# Deslizapp

El lenguaje de diseño del panel de Deslizapp: la app donde una persona que vende por WhatsApp e Instagram maneja su catálogo, pedidos, clientes, cobros y promos desde el teléfono. Se construyó a partir del inventario del código del 2 de octubre de 2026 (repo `deslizapp-app`, commit `028e3f6`) y se validó contra las guías de Apple para iOS y las pautas de accesibilidad WCAG 2.2 AA.

**Para quién es:** dueñas y dueños de tienda pequeña en República Dominicana que usan la app con una mano, de pie, entre cliente y cliente. Todo se decide pensando en eso: se lee de un vistazo, se toca sin apuntar y nunca hace dudar entre dos botones.

**La idea en tres palabras:** Desliza (flecha), Encuentra (corazón) y Escribe (burbuja de chat). El logo, los fondos con patrón, las ilustraciones de plastilina y las fotos están en la sección **Marca, ilustración y fondos**. Regla de público: rosa le habla al comprador y verde al vendedor (isotipo Verde Bosque sobre rosa pálido para compradores y sobre verde pálido para vendedores; fondos de piezas rosa o Verde Bosque).

**Cómo se usa este documento:** cada regla nombra el token o componente que la cumple. Si algo no está aquí, se resuelve con lo que ya existe antes de inventar una variante nueva. Si de verdad hace falta una variante, se agrega primero aquí.

---

## 1. Voz y contenido

- Se le habla de tú, en español dominicano neutro, cálido y breve: "Te avisamos en cuanto empecemos a armarlo."
- Los botones empiezan con verbo y dicen exactamente qué pasa: "Guardar abono", "Crear pedido", "Borrar abono". Nunca "Aceptar" ni "OK".
- Mayúscula solo al inicio de la frase y en nombres propios ("Lo que más se vende", no "Lo Que Más Se Vende"). Las etiquetas no van en mayúsculas.
- Para descartar se usa siempre "Cancelar". "Mejor no", "Ahora no" o "Dejar así" no se usan en botones; caben en textos de remate.
- Los errores dicen qué pasó y cómo arreglarlo, sin disculpas largas: "Ese WhatsApp no es un número dominicano válido."
- Los montos siempre en `RD$` con coma de miles y sin decimales: `RD$4,300`. Cifras alineadas con números tabulares.
- Las fechas son relativas cuando son recientes ("Hace 1 h", "Ayer") y absolutas después ("22 sep").

## 2. Color

Los colores se nombran por su **función**, no por su marca. Así el modo oscuro solo cambia valores, y nadie usa el mismo verde para tres cosas distintas.

| Función | Token | Claro | Oscuro |
|---|---|---|---|
| Fondo de pantalla | `fondo` | Papel Cálido #fff9ee | #0e1d17 |
| Tarjetas, listas, campos, hojas | `superficie` | #ffffff | #16281f |
| Rellenos neutros | `superficie-hundida` | Arena #f3ead9 | #1d3329 |
| Texto | `texto` / `texto-secundario` | Verde Bosque / #4f6a5e | #f1ebdf / #a8bcb1 |
| Seguir adelante, elegido en filtros | `accion` + `sobre-accion` | Verde Bosque | #9ed3b8 |
| Elegido en formularios, éxito | `accion-suave` | Menta #dcebe2 | #24443a |
| Llamar la atención | `resalte` + `sobre-resalte` | Mandarina #ff834f | igual |
| Decoración de marca | `marca-rosa` | Rosa Suave #f5c9d6 | #5b3343 |
| Debe, atrasado, cuidado | `atencion-suave` + `atencion-texto` | #ffe3d6 / #a8410f | #4a2618 / #ffa47e |
| Borrar, eliminar | `peligro` + `sobre-peligro` | #b4432a | #ff8a70 |

**Reglas de color**

1. **Verde es seguir adelante.** Guardar, confirmar, crear y avanzar usan siempre `accion`. Nunca Mandarina ni otro color para algo parecido a guardar. La única excepción es el momento que cierra una venta ("Despachar pedido"), que es la llamada emocional de su pantalla (regla 2).
2. **Mandarina se gana su lugar.** `resalte` solo va en el botón flotante (+), en contadores que piden atención (Agotados, Nuevos) y como máximo en UNA llamada emocional por pantalla ("Despachar pedido", "Compartir", "¡A deslizar!"): el momento que da alegría, como el botón de comprar. Si una pantalla ya tiene botón flotante, no lleva otra Mandarina.
3. **Rosa es marca, no estado.** `marca-rosa` decora (tarjeta del plan, avatar de persona, pestaña activa de la barra). No se usa para marcar selección ni avisos.
4. **El rojo es solo para destruir.** `peligro` aparece en botones que borran o terminan algo, y en errores de campo. Nunca se escribe el color a mano.
5. **Nada blanco fijo.** Todo fondo claro usa `superficie` o `fondo`, para que funcione en oscuro.
6. **El estado nunca depende solo del color.** Elegido lleva check, atrasado lleva texto ("Atrasado 6 días"), en línea lleva la palabra.
7. **WhatsApp es verde y relleno.** "Escribir" (abrir el chat del cliente) va siempre como botón compacto relleno `accion` con el icono de WhatsApp: saca a la persona de la app hacia una conversación, que es el verde del concepto de marca.

## 3. Tipografía

Tres familias, cada una con un trabajo:

- **Fredoka** (`display`, negrita al 115 % de ancho): títulos y cifras protagonistas. Nunca para párrafos.
- **Figtree** (`sans`): todo lo demás.
- **Caveat** (`mano`): la voz de la marca escrita a mano.

**Escala cerrada: 10 tamaños en total** (hoy hay 26). Lo que no está aquí no se usa.

| Estilo | Tamaño | Para |
|---|---|---|
| `cifra` | 36 | Una cifra protagonista por tarjeta |
| `titulo-pantalla` | 32 | Título de pestaña (uno por pantalla) |
| `titulo-hoja` | 24 | Título de hoja y de alerta |
| `titulo-seccion` | 20 | Secciones dentro de pantalla u hoja |
| `destacado` | 17, extrabold | Nombres y montos en filas, botón grande |
| `cuerpo` | 16 | Texto normal, campos, botones normales |
| `secundario` | 14 | Subtítulos, metadatos, pastillas |
| `etiqueta` | 12, extrabold | Etiquetas de estado |
| `contador` | 11, extrabold | Solo números en contadores |
| `mano` / `mano-celebracion` | 22 / 32 | Ver abajo |

**Cuándo se usa la letra a mano (Caveat)**

- Es un guiño, no información: un remate corto (máximo 6 palabras) junto a un título o una cifra ("tu top 3", "¡abierto 24/7!"), o el titular de una celebración ("¡Terminó de pagar!", "¡Ya estás en línea!").
- Como máximo **una vez por pantalla**.
- Nunca en botones, montos, fechas, errores, ni en nada que la persona necesite leer para decidir. Si se borra la nota a mano, la pantalla tiene que seguir diciendo todo.
- Color `atencion-texto` sobre fondos claros; `marca-rosa` sobre superficies Verde Bosque.

**Tamaños y Apple:** iOS usa 17 pt para el texto normal y 11 pt como mínimo legible. Aquí el cuerpo sube de 13–14 px a 16 px y nada baja de 11 px. Los tamaños se escriben en `rem` para respetar el tamaño de letra del teléfono.

## 4. Espacio, radios y profundidad

- **Espacio** en múltiplos de 4: `espacio-1` (4) … `espacio-8` (32). Margen lateral de pantalla: `espacio-5` (20). Relleno de tarjeta: `espacio-4` (16). Entre tarjetas sueltas: `espacio-3` (12). Entre secciones: `espacio-6` (24).
- **Radios**, 5 y ninguno más: `radio-s` 10 (miniaturas), `radio-m` 16 (campos, avisos internos, fotos), `radio-l` 22 (tarjetas, listas, toasts), `radio-xl` 28 (hojas), `radio-pildora` (botones, pastillas, etiquetas, avatares de persona).
- **Regla de anidado:** lo que va dentro de una tarjeta usa un radio menor que la tarjeta (una foto `radio-m` dentro de una tarjeta `radio-l`).
- **Sombras**, solo dos: `sombra-flotante` (botón +, toast, aviso flotante) y `sombra-hoja`. Las tarjetas no llevan sombra: se separan con `linea`. En oscuro, la profundidad la da `superficie` sobre `fondo`.

## 5. Botones

Todos son píldora, letra extrabold, sin subrayado.

| Jerarquía | Aspecto | Para |
|---|---|---|
| **Principal** | Relleno `accion` | La acción que la persona vino a hacer: Guardar, Crear pedido, Registrar abono |
| **Secundario** | Contorno 1.5 px `accion`, fondo transparente | La alternativa: Editar, Ver lo que pedí, Recordarle |
| **Terciario** | Solo texto `accion`, sin borde ni subrayado | Acciones menores dentro de una tarjeta o fila: Cambiar, Ver historial, Reintentar |
| **Peligro** | Contorno y texto `peligro`; relleno `peligro` solo dentro de una alerta | Borrar, eliminar, terminar |
| **Resalte** | Relleno `resalte` | Botón flotante (+) y una llamada emocional por pantalla |

**Tamaños:** grande 52 px (al pie de hojas y formularios), normal 44 px, compacto 36 px (dentro de tarjetas, con área de toque de 44 px). Letra: 17 en grande, 16 en normal, 14 en compacto.

**Reglas**

1. **Una sola acción principal por vista.** Si hay dos botones juntos, uno es principal y el otro secundario. Nunca dos rellenos iguales lado a lado.
2. **Lado a lado:** cuando caben, el secundario va a la izquierda y el principal a la derecha, del mismo ancho. Si no caben, uno debajo del otro y el principal arriba.
3. **Destruir nunca es principal.** "Terminar la anterior" o "Eliminar" van como peligro, aunque sean la acción más probable, y piden confirmación. En una pila de acciones debajo de la principal ("Editar pedido", "Cancelar pedido"), la destructiva va como **terciario en `peligro`** (solo texto rojo), no con contorno, para no competir con la principal.
4. **Deshabilitado:** opacidad 40 %, siempre la misma. Mejor aún: explicar con una línea qué falta en vez de deshabilitar sin decir por qué.
5. **El subrayado no es un botón.** Se subraya solo un **enlace dentro de una frase** que lleva a otra página (Privacidad, Términos, "ya existe Marleny Peña"). Cualquier acción va como terciario.
6. **Las filas no llevan botón de borrar.** Una fila de historial (un abono, un movimiento de inventario) termina en chevron y abre una hoja con su detalle y sus acciones ("Borrar abono", con confirmación). Un botón de borrar en cada fila pesa más que el dato y abarata la pantalla.

## 6. Elegir: pastillas, opciones y controles

Hay tres maneras de elegir y cada una se ve distinta, para no confundirla con un botón:

1. **Pastilla de filtro** (cambia lo que se ve en una lista): elegida = relleno `accion` con texto `sobre-accion`; sin elegir = `superficie` con contorno `borde-pastilla`. Alto 36, letra 14, contador opcional.
2. **Opción de formulario** (un dato que se va a guardar: método de pago, fecha acordada): elegida = relleno `accion-suave`, texto `texto` y un **check en círculo** a la izquierda; sin elegir = `superficie` con contorno `borde-pastilla`. **Sin contorno verde y sin rosa.** Así nunca se confunde con el botón principal verde.
3. **Control segmentado** (cambia la **vista o el modo** dentro de la misma pantalla: "Día / Semana / Mes", "Claro / Oscuro"): una pista `superficie-hundida` con el segmento elegido en `superficie` y texto extrabold, como en iOS. **No es para datos que se guardan:** "¿Cómo te paga? Pagó todo / A crédito" es una opción de formulario aunque sean solo dos.

**El divisor entre pastillas** (una línea vertical) tiene un solo significado: separa los filtros **fijos** (siempre están) de los **condicionales** (solo aparecen cuando tienen algo). Ejemplo en Clientes: `Todos · Repiten · Nuevos | Deben · Dormidos`. Si una pantalla no tiene filtros condicionales, no lleva divisor. Los condicionales se ocultan cuando su contador es 0.

**Cantidad (− 1 +):** dos botones **cuadrados** de 36 px con `radio-s` (10), como la miniatura de la foto que tienen al lado, relleno `superficie-hundida` e icono `texto`, con el número en `destacado` entre ellos. Al llegar al límite del stock, el + se deshabilita (40 %). No son círculos.

**Interruptor:** solo para encender o apagar algo que se aplica al instante (Visible en el catálogo). Si hay que pulsar Guardar después, es una opción de formulario.

## 7. Listas

Dos formas, cada una con su trabajo:

**Lista agrupada:** filas dentro de una sola tarjeta `superficie` `radio-l`, separadas por `linea`, cada fila de 56 px o más con chevron si abre algo. Se usa cuando las filas son **del mismo tipo, sencillas y se recorren de corrido**: clientes, productos de un pedido, ajustes, menú de la tienda, historial de abonos, historial de inventario.

**Tarjetas sueltas:** cada elemento en su propia tarjeta, con `espacio-3` entre ellas. Se usa cuando cada elemento **tiene estado propio, varias líneas de información o acciones propias**: pedidos, cuentas por cobrar, promos (ticket), productos del catálogo (cuadrícula).

Regla rápida: si la fila tiene etiqueta de estado o un botón propio, va suelta. Si solo tiene texto y chevron, va agrupada. Una misma lista nunca mezcla las dos formas.

## 8. Avisos y confirmaciones

Cada tipo de mensaje tiene un solo formato:

| Qué pasa | Formato | Ejemplo |
|---|---|---|
| Resultado de algo que la persona hizo | **Toast**: tarjeta flotante abajo, `sombra-flotante`, se va sola en 3 s, opción "Deshacer" | "Abono guardado" |
| Estado de la app que sigue mientras dure | **Aviso flotante persistente** sobre la barra inferior, con una acción | "Sin conexión · Reintentar", "Hay versión nueva · Actualizar" |
| Información o advertencia sobre lo que se ve | **Aviso en línea** dentro de la pantalla, `radio-m`, tono neutro, atención, éxito o peligro | "Queda debiendo RD$3,300" |
| Confirmar algo que no se puede deshacer o que pierde datos | **Alerta**: tarjeta centrada sobre `velo`, título, una línea y dos botones (Cancelar secundario + acción peligro) | "¿Borrar este abono?", "¿Salir sin guardar?" |
| Elegir entre varias acciones sobre algo | **Hoja de acciones** (hoja automática con filas) | "¿Qué hacemos con sus pedidos?" |

**Reglas:** una confirmación nunca se despliega dentro de la tarjeta empujando el contenido. Si algo se puede deshacer con el toast, no se pide confirmación antes (es más rápido y más amable). Solo un toast a la vez.

## 9. Hojas

Las hojas suben desde abajo, con esquinas `radio-xl`, agarradera arriba, título `titulo-hoja` y botón cerrar redondo `superficie-hundida`. Dos alturas y una regla para elegir:

- **Automática** (la normal): mide lo que mide su contenido, hasta el 92 % de la pantalla, y si no cabe hace scroll dentro. Para detalles, selecciones, acciones y formularios cortos.
- **Completa:** ocupa toda la pantalla aunque el contenido sea corto. **Solo** cuando hay teclado (escribir hace saltar la altura) o una lista que crece mientras se usa (buscar cliente, elegir productos).

Nunca una hoja completa con un hueco vacío abajo si no tiene teclado. Una hoja sobre otra es válida (máximo dos), y solo la de arriba responde a gestos. Si hay cambios sin guardar, cerrar pide confirmación con la alerta "¿Salir sin guardar?".

## 10. Tarjetas

- **Tarjeta:** `superficie`, borde `linea`, `radio-l`, relleno `espacio-4`. El contenedor por defecto.
- **Tarjeta destacada:** `accion` (Verde Bosque) con texto `sobre-accion`, para la cifra principal de una pantalla (Ventas, Por cobrar). Máximo una por pantalla.
- **Tarjeta de marca:** `marca-rosa` para el plan y novedades de la marca.
- No se usan Mandarina ni Rosa como fondo de aviso (para eso está el aviso en línea con sus tonos).

## 11. Etiquetas, contadores y avatares

- **Etiqueta de estado:** un solo tamaño, alto 24, letra `etiqueta` (12 extrabold), píldora, sin mayúsculas. Cuatro tonos: neutro (`superficie-hundida`), éxito (`accion-suave` + `exito-texto`), atención (`atencion-suave` + `atencion-texto`) y fuerte (`accion` + `sobre-accion`, solo para "Agotado"). Con punto opcional delante para estados vivos ("En línea"). Atención se usa para lo que pide cuidado: "Quedan 3" (stock que queda tras el pedido), "A crédito", "Debe", "Atrasado".
- **Contador:** círculo de 20 px con número `contador`; `resalte` cuando pide atención, `accion-suave` cuando solo informa.
- **Avatar:** redondo para personas (`marca-rosa` con iniciales en Fredoka), cuadrado `radio-m` para la tienda (`accion` con iniciales o su logo). Siempre 44 px en filas y 64 px en la cabecera de un detalle.

## 12. Iconos

Trazo de 2.2 px, puntas y uniones redondeadas, sin relleno, para que combinen con Fredoka. Tamaños: 20 px normal, 24 px en la barra inferior, 16 px dentro de etiquetas. El icono solo nunca es la única explicación de un botón importante; los botones de solo icono llevan `aria-label`.

## 13. Movimiento

Las curvas y duraciones con nombre de `docs/08-movimiento.md` se mantienen. Las hojas suben, los toasts entran desde abajo, la selección hace un pequeño "pop". Todo se apaga con "reducir movimiento" del teléfono. Nunca se anima para decorar algo que la persona está leyendo.

## 14. Modo oscuro

- Tres opciones en el menú de la tienda: Automático (como el teléfono), Claro y Oscuro.
- Solo cambian los valores de los tokens de color y sombra; ningún componente lleva colores propios.
- Mandarina se mantiene igual en ambos modos: es el color que más identifica a la marca y funciona sobre el fondo oscuro.
- Verde Bosque como botón pasa a un verde claro (#9ed3b8) con texto oscuro, porque un verde oscuro sobre fondo oscuro desaparece.
- Las fotos de producto no se oscurecen. Las ilustraciones que tengan fondo crema llevan su versión oscura o un marco `superficie`.

## 15. Revisión contra Apple y accesibilidad

| Principio | Cómo se cumple |
|---|---|
| Área de toque mínima de 44 × 44 pt | `alto-control`; los controles de 36 px agrandan su área a 44 |
| Contraste 4.5:1 en texto y 3:1 en controles | Validado en claro y oscuro para cada par de la tabla de color |
| Texto ajustable | Tamaños en `rem`; nada por debajo de 11 px |
| Modo oscuro con colores semánticos | Tokens por función con valor claro y oscuro |
| Claridad y jerarquía | Una acción principal por vista; un título por pantalla |
| Deferencia al contenido | Tarjetas sin sombra, color fuerte solo donde hay que actuar |
| Reducir movimiento | Todas las animaciones respetan `prefers-reduced-motion` |
| No depender solo del color | Check en lo elegido, texto en los estados |
| Confirmar lo destructivo | Alerta con botón de peligro; deshacer cuando se puede |

## 16. Cómo se lleva a la app

1. Los tokens de este sistema reemplazan los colores de `app/globals.css`, con los nombres de función. Los nombres viejos (`bosque`, `rosa`…) quedan como alias mientras dura la migración.
2. Los componentes se construyen en React en `components/ui/` con los mismos nombres de este sistema (Boton, Pastilla, Opcion, Segmentos, Lista, Tarjeta, Aviso, Alerta, Hoja, Etiqueta, Campo, Avatar, Toast).
3. Una página interna `/diseno` muestra todos los componentes reales con sus variantes: es la guía viva.
4. Las pantallas se migran una por una.

Las vistas de los componentes en este sistema son representaciones estáticas de cómo deben verse; la fuente de verdad del código serán los componentes de `components/ui/`.
