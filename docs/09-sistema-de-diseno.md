# Deslizapp

El lenguaje de diseño del panel de Deslizapp: la app donde una persona que vende por WhatsApp e Instagram maneja su catálogo, pedidos, clientes, cobros y promos desde el teléfono. Se construyó a partir del inventario del código del 2 de octubre de 2026 (repo `deslizapp-app`, commit `028e3f6`) y se validó contra las guías de Apple para iOS y las pautas de accesibilidad WCAG 2.2 AA.

**Para quién es:** dueñas y dueños de tienda pequeña en República Dominicana que usan la app con una mano, de pie, entre cliente y cliente. Todo se decide pensando en eso: se lee de un vistazo, se toca sin apuntar y nunca hace dudar entre dos botones.

**La idea en tres palabras:** Desliza (flecha), Encuentra (corazón) y Escribe (burbuja de chat). El logo, los fondos con patrón, las ilustraciones de plastilina y las fotos están en la sección **Marca, ilustración y fondos**. Regla de público: rosa le habla al comprador y verde al vendedor (isotipo Verde Bosque sobre rosa pálido para compradores y sobre verde pálido para vendedores; fondos de piezas rosa o Verde Bosque).

**Cómo se usa este documento:** cada regla nombra el token o componente que la cumple. Si algo no está aquí, se resuelve con lo que ya existe antes de inventar una variante nueva. Si de verdad hace falta una variante, se agrega primero aquí.

**Principio que manda sobre todo: menos texto, nada repetido.** Cada palabra en pantalla es algo más que leer con una mano y de pie. Antes de poner un texto, una etiqueta o una línea de ayuda:
1. **¿Ya lo dice el contexto?** El filtro activo, la pestaña, el título de la hoja o la sección ya informan. Si ya se sabe, no se escribe. En el filtro "Repiten" ninguna fila dice "Repite"; en "Deben" ninguna dice "Debe"; en la pestaña "Despachados" ninguna tarjeta dice "Despachado"; dentro de "Te debe" el monto no repite "Debe".
2. **¿Se puede mostrar en vez de decir?** Primero una señal visual: un ícono, una forma con color, una barra, una miniatura. Texto solo cuando la señal no alcanza o cuando el texto ES el dato (un monto, una fecha, un nombre). Ejemplos: cliente que repite = un corazón pequeño relleno en la esquina de su avatar, no la etiqueta "Repite"; cliente que debe = su monto en `atencion-texto` con la barra de abonos, no una etiqueta "Debe".
3. **Las píldoras de color son lo más ruidoso.** Una etiqueta (píldora) solo cuando aporta algo que no está en otro lado, y como máximo una por fila o tarjeta. Nunca para lo que una forma ya dice: "Repite" es el corazón en el avatar; "Atrasado" es el reloj junto a la fecha. Tampoco se suman frases largas: un monto en su color y su icono ya cuentan la historia.
4. **Una línea.** Subtítulos, leyendas y textos de ayuda caben en una línea; si necesitan dos, sobra la mitad. "Abonó RD$2,425 de RD$4,850", no "Abonó RD$2,425 de RD$4,850 · En 1 pedido. Los abonos se aplican primero al más viejo."
5. **Lo que se quita de la vista no se pierde para el lector de pantalla:** la palabra va en el `aria-label` ("Luisanna, repite, debe RD$2,425, paga el viernes 9").
6. **Menos texto no es menos voz.** Lo que se quita es lo repetido y lo utilitario (etiquetas, ayudas que explican lo obvio, el mismo dato dos veces), nunca la personalidad. La app le habla a la persona como una amiga que vende con ella: con frases y metáforas, no con descripciones de funciones. "Sube la foto del celular / *nosotros le ponemos la luz*" es mejor que "Agregar fotos"; "*al despachar, el stock se actualiza solito*" tranquiliza mejor que una nota técnica. Cada pantalla busca su momento de voz (un remate a mano en Caveat, un título con gracia, un estado vacío con chiste) y lo cuida. Si hay que elegir entre una etiqueta y una frase con voz, se queda la frase.

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
| Fondo de pantalla | `fondo` | Papel Cálido #fff9ee | #0d0f0e |
| Tarjetas, listas, campos, hojas | `superficie` | #ffffff | #1a1d1b |
| Rellenos neutros | `superficie-hundida` | Arena #f3ead9 | #242826 |
| Texto | `texto` / `texto-secundario` | Verde Bosque / #4f6a5e | #f1ebdf / #a8b0ab |
| Seguir adelante, elegido en filtros | `accion` + `sobre-accion` | Verde Bosque | #9ed3b8 |
| Elegido en formularios, éxito | `accion-suave` | Menta #dcebe2 | #233a2e |
| Llamar la atención | `resalte` + `sobre-resalte` | Mandarina #ff834f | igual |
| Decoración de marca | `marca-rosa` | Rosa Suave #f5c9d6 | #5b3343 |
| Debe, atrasado, cuidado | `atencion-suave` + `atencion-texto` | #ffe3d6 / #a8410f | #3d2519 / #ffa47e |
| Borrar, eliminar | `peligro` + `sobre-peligro` | #b4432a | #ff8a70 |

**Reglas de color**

1. **Verde es seguir adelante.** Guardar, confirmar, crear y avanzar usan siempre `accion`. Nunca Mandarina ni otro color para algo parecido a guardar. La única excepción es el momento que cierra una venta ("Despachar pedido"), que es la llamada emocional de su pantalla (regla 2).
2. **Mandarina se gana su lugar.** `resalte` solo va en el botón flotante (+), en contadores que piden atención (Agotados, Nuevos) y como máximo en UNA llamada emocional por pantalla ("Despachar pedido", "Compartir", "¡A deslizar!"): el momento que da alegría, como el botón de comprar. Si una pantalla ya tiene botón flotante, no lleva otra Mandarina.
3. **Rosa es marca, no estado.** `marca-rosa` decora (tarjeta del plan, avatar de persona, pestaña activa de la barra). No se usa para marcar selección ni avisos.
4. **El rojo es solo para destruir.** `peligro` aparece en botones que borran o terminan algo, y en errores de campo. Nunca se escribe el color a mano.
5. **El foco es verde, no naranja.** Un campo con el cursor dentro cambia su contorno a 2 px `accion`, sin anillo extra. Los botones muestran un anillo `foco` (el mismo verde) solo al navegar con teclado. Un campo con error lleva contorno 2 px `peligro` y su mensaje debajo, sin anillo encima.
6. **Nada blanco fijo.** Todo fondo claro usa `superficie` o `fondo`, para que funcione en oscuro.
7. **El estado nunca depende solo del color.** Además del color lleva una forma: un check, un ícono, una barra o, si nada de eso alcanza, unas palabras sin píldora ("Atrasado 6 días" junto a un reloj). Una forma basta; no hace falta escribirlo (ver el principio "menos texto").
8. **WhatsApp es verde y relleno.** "Escribir" (abrir el chat del cliente) va siempre como botón compacto relleno `accion` con el icono de WhatsApp: saca a la persona de la app hacia una conversación, que es el verde del concepto de marca.

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
- **Una vez por pantalla, y cada pantalla debería tener la suya** cuando haya un momento que lo merezca: subir una foto, despachar, un pedido cancelado, una lista vacía, una celebración.
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
| **Principal** | Relleno `accion` | La acción que la persona vino a hacer: Guardar, Crear pedido, Recordarle por WhatsApp |
| **Secundario** | Contorno 1.5 px `accion` con relleno `superficie` (nunca transparente sobre el fondo crema) | La alternativa: Editar, Agregar más productos, Registrar abono (en el detalle del cliente, junto a "Recordarle"). En compacto (36 px), las acciones dentro de tarjetas y filas: Cambiar, Ver historial |
| **Terciario** | Solo texto, sin borde ni subrayado | Casi nunca: la acción destructiva al final de una pila ("Cancelar pedido", en `peligro`) y "Reintentar" dentro de un aviso. Una acción dentro de una tarjeta va como secundario compacto, para que se vea que es un botón |
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

1. **Pastilla de filtro** (cambia lo que se ve en una lista): elegida = relleno `accion` con texto `sobre-accion`, que llega con una **cápsula que se desliza** de la pastilla anterior a la nueva y cambia de ancho; sin elegir = `superficie` con contorno `borde-pastilla`. Alto 36, letra 14, contador opcional.
2. **Opción de formulario** (un dato que se va a guardar: método de pago, fecha acordada): elegida = relleno `accion-suave`, texto `texto` y un **check en círculo** a la izquierda; sin elegir = `superficie` con contorno `borde-pastilla`. **Sin contorno verde y sin rosa.** Así nunca se confunde con el botón principal verde.
3. **Control segmentado** (cambia la **vista o el modo** dentro de la misma pantalla: "Día / Semana / Mes", "Claro / Oscuro"): una pista `superficie-hundida` con el segmento elegido en `superficie` y texto extrabold, como en iOS. **No es para datos que se guardan:** "¿Cómo te paga? Pagó todo / A crédito" es una opción de formulario aunque sean solo dos.

**Orden de los filtros (pastillas):** primero "Todos", después el que pide acción (en Clientes, "Deben", con su contador `resalte`), después los demás. Sin divisor. Los filtros que no tienen nada (contador en 0) se ocultan, salvo "Todos" y el que esté activo. Nunca aparecen pastillas nuevas por tocar algo en otra pantalla: si otra hoja lleva a un filtro, es a uno que ya existe. Clientes: `Todos · Deben · Repiten · Nuevos · Dormidos`.

**Cantidad (− 1 +):** dos botones **cuadrados** de 36 px con `radio-s` (10), como la miniatura de la foto que tienen al lado, con el número en `destacado` entre ellos. **−** en `superficie-hundida` con icono `texto`; **+** en relleno `accion` con icono `sobre-accion`, porque agregar es seguir adelante. Al llegar al mínimo o al límite del stock, ese botón se deshabilita (40 %). No son círculos.

**Fila "Agregar …"** (Agregar cupón, Agregar producto): fila tocable con un **círculo relleno `accion` de 24 px con un + en `sobre-accion`** y el texto en `destacado`. El círculo relleno es lo que la distingue de un texto suelto.

**Cupón aplicado:** dentro de un pedido el cupón es una fila más de la lista, no el ticket. Sin cupón: la fila "Agregar cupón" (círculo + ). Con cupón: fila con icono de etiqueta de precio en `accion-suave`, título "Cupón", subtítulo "AHHH · 15 %" y chevron; toda la fila abre el selector, donde el cupón aplicado aparece marcado: tocarlo otra vez lo **quita** y tocar otro lo **cambia**. Sin botones "Cambiar" ni "Quitar". El monto descontado va en los totales ("Descuento · AHHH −RD$270"). El ticket grande es para la pantalla de Promos, no para el pedido.

**Interruptor:** solo para encender o apagar algo que se aplica al instante (Visible en el catálogo). Si hay que pulsar Guardar después, es una opción de formulario.

## 7. Listas

Dos formas, cada una con su trabajo:

**Lista agrupada:** filas dentro de una sola tarjeta `superficie` `radio-l`, separadas por `linea`, cada fila de 56 px o más con chevron si abre algo. Se usa cuando las filas son **del mismo tipo, sencillas y se recorren de corrido**: clientes, productos de un pedido, ajustes, menú de la tienda, historial de abonos, historial de inventario.

**Tarjetas sueltas:** cada elemento en su propia tarjeta, con `espacio-3` entre ellas. Se usa cuando cada elemento **tiene estado propio, varias líneas de información o acciones propias**: pedidos, cuentas por cobrar, promos (ticket), productos del catálogo (cuadrícula).

Regla rápida: si la fila tiene etiqueta de estado o un botón propio, va suelta. Si solo tiene texto y chevron, va agrupada. Una misma lista nunca mezcla las dos formas.

**Ver más:** cuando una lista se muestra por partes, lo que falta se pide desde **la última fila de la misma lista**, no con un botón suelto debajo. En una lista agrupada es su última fila; en tarjetas sueltas es una tarjeta más, del mismo ancho, de 52 px de alto. Lleva a la izquierda "Ver N más" en `destacado` color `accion` con un chevron hacia abajo, y a la derecha "5 de 69" en `secundario` `texto-secundario`. Al tocarla aparecen los siguientes y la fila baja. Cuando ya no quedan, desaparece. No lleva contorno de botón.

**Bloque de deuda:** todo lo que se debe se muestra igual en Pedidos y en Clientes. Va al final de su tarjeta, separado por una `linea`, con tres partes:
1. Una fila con el monto a la izquierda, "Debe RD$2,425" en Pedidos y solo "RD$2,425" en Clientes (`destacado`, `atencion-texto`), y la fecha a la derecha (14 extrabold, `atencion-texto`): icono de calendario de 16 px + "Vie 9 oct", "Hoy", "Mañana" o "Sin fecha". Si ya pasó la fecha: icono de reloj en `resalte` + "Atrasado 6 días", como texto, sin píldora.
2. Una barra de 8 px, pista `linea` y relleno `accion`, con lo que ya abonó sobre el total. Verde porque lo abonado es avance.
3. La leyenda "Abonó RD$2,425 de RD$4,850" o "Sin abonos todavía" (`secundario`, `texto-secundario`).
En el detalle del cliente ("Te debe") el monto va grande en Fredoka; en filas de una lista agrupada (historial de pedidos, la lista "Todos" de Clientes) va la versión mini: el monto a la derecha de la fila (16 extrabold, `atencion-texto`), con el reloj `resalte` delante si está atrasado, y la barra de 6 px debajo del texto de la fila. Sin fecha ni frases: eso está en "Deben" y en el detalle. Si no debe nada, no hay bloque.

**Hoja de resumen con dona** ("Tus clientes", "Tu inventario" y las que vengan): una sola forma para todas.
1. Arriba, la dona grande (112 px) a la izquierda y, a su derecha, la lectura del momento: un título dinámico en Fredoka 24 ("Nadie repite todavía", "9 se están acabando") y una línea secundaria debajo. Nada más junto a la dona: la leyenda va abajo.
2. Debajo, la leyenda como **lista agrupada**: punto de color · nombre · subtítulo con el porcentaje · número a la derecha · chevron. Todas las filas que tienen algo (número > 0) se tocan y llevan chevron; las que están en 0 no se tocan ni llevan chevron.
3. Los demás grupos (Nuevos, Dormidos, Del catálogo, A mano…) van en otra lista agrupada igual, nunca en cuadros sueltos de 2 × 2.
4. Tocar una fila abre, dentro de la misma hoja (con Volver), la lista de esos clientes o productos. No agrega pastillas a la pantalla de atrás.
5. Después vienen las acciones de la hoja ("Tu próxima jugada" en Clientes, "Necesita tu atención" en Catálogo).

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

- **Etiqueta de estado:** un solo tamaño, alto 24, letra `etiqueta` (12 extrabold), píldora, sin mayúsculas, **siempre con relleno visible** (sobre el fondo crema y sobre tarjetas blancas). Cuatro tonos: **éxito** (`accion-suave` + `exito-texto`) para lo que ya está bien: "Entregado", "Pagado", "Al contado", "Despachado"; **atención** (`atencion-suave` + `atencion-texto`) para lo que pide cuidado: "Quedan 3", "A crédito"; **neutro** (relleno `borde-pastilla` + `texto`) para lo que está en curso: "Por despachar", "Confirmado"; y **fuerte** (`accion` + `sobre-accion`) solo para "Agotado". Sin un quinto tono: lo atrasado no lleva píldora (ver Bloque de deuda). Con punto opcional delante para estados vivos ("En línea").
- **No repetir el filtro:** una etiqueta nunca dice lo que ya dice el filtro o la pestaña en la que estás. En la lista de Pedidos (cada pestaña es un estado) la tarjeta no lleva el estado; lleva la forma de pago: "Al contado" (éxito) o "A crédito" (atención). Dentro del detalle de un pedido, los productos no llevan "Entregado": eso ya lo dice la barra de pasos.
- **Barras y anillos (gráficos):** cada tramo lleva los extremos redondeados (píldora) y entre tramo y tramo hay una separación de 3 px; en la dona, el mismo criterio: trazo con puntas redondeadas y la misma separación entre segmentos. Nunca cortes rectos. Así combinan con Fredoka y con los botones píldora. Un tramo muy pequeño conserva al menos su alto como ancho para que se vea redondo.
- **Dona:** dentro del anillo va solo la cifra (Fredoka). Lo que significa la cifra ("clientes", "productos") va debajo, fuera del anillo, junto al dato secundario ("110 clientes · 59 repiten"). Nada de texto pequeño en mayúsculas apretado dentro del anillo.
- **Contador:** círculo de 20 px con número `contador`; `resalte` cuando pide atención, `accion-suave` cuando solo informa.
- **Avatar:** redondo para personas (`marca-rosa` con iniciales en Fredoka), cuadrado `radio-m` para la tienda (`accion` con iniciales o su logo). Siempre 44 px en filas y 64 px en la cabecera de un detalle. Señales en el borde del avatar, en vez de etiquetas: cliente que repite = círculo `accion` de 20 px con un corazón relleno `sobre-accion` y borde `superficie` de 2 px, en la esquina inferior derecha.

## 12. Iconos

Trazo de 2.2 px, puntas y uniones redondeadas, sin relleno, para que combinen con Fredoka. **Los iconos van sueltos:** nunca dentro de un círculo o cuadro de relleno pálido (menta, arena, rosa, naranja suave) solo para adornar; ese "icono en ficha tonal" se siente Android. Un icono lleva fondo solo cuando ES un botón (relleno `accion` sólido, como el + o la bolsa del catálogo) o un control de selección (el check de una opción elegida). **Ninguna esquina en punta:** las formas (casa, etiqueta, bolsa, camión, cámara, tarjetas) llevan esquinas redondeadas de radio 1.5 a 2 sobre 24 px, como Fredoka. La única excepción es la chispa (créditos, retoque), que es un destello y conserva sus puntas. Pedido se dibuja siempre con la bolsa del catálogo (base redondeada y asa que entra en la bolsa). Tamaños: 20 px normal, 24 px en la barra inferior, 16 px dentro de etiquetas. El icono solo nunca es la única explicación de un botón importante; los botones de solo icono llevan `aria-label`.

## 13. Movimiento

Las curvas y duraciones con nombre de `docs/08-movimiento.md` se mantienen. Las hojas suben, los toasts entran desde abajo, la selección hace un pequeño "pop". Todo se apaga con "reducir movimiento" del teléfono. Nunca se anima para decorar algo que la persona está leyendo.

## 14. Modo oscuro

- Tres opciones en el menú de la tienda: Automático (como el teléfono), Claro y Oscuro.
- Solo cambian los valores de los tokens de color y sombra; ningún componente lleva colores propios.
- **Neutro, no verde.** Fondo y superficies son negros y grises casi neutros (con un toque cálido), cada capa un poco más clara que la de abajo, como en iOS. Teñir todo de verde se parecía al estilo tonal de Android. El verde de marca queda solo en los acentos: botones, paso activo, check y enlaces (`accion` #9ed3b8), que sobre neutro se ven más intensos. Contrastes validados: texto 14:1, texto secundario 7.7:1, `accion` 10:1, campo 4.3:1.
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
