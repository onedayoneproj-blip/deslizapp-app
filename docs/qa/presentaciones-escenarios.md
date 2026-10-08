# QA — «Cosas que cambian» / presentaciones en la hoja de producto

Encargo directo de Lewis (vía Planning). **No se cambió código de la app.** Rama probada: `feat/hoja-producto-rediseno` (PR #78), commit `ce817f4`.

- **Cómo se probó:** modo demo (`deslizapp-modo-v1 = demo`), `next dev`, Playwright + Chromium, 390 px de ancho (móvil táctil, ×2). Tienda Lino & Algodón (ropa) y Esencias Michel (perfumes). Nunca se tocó Supabase.
- **Producto nuevo** = hoja «Nuevo producto» sin guardar. **Producto existente** = guardado con «Publicar», cerrado y reabierto desde `/catalogo/{id}/editar` (se comprobó también el contenido de la base demo en `localStorage`).
- **Capturas:** `docs/capturas/qa-presentaciones/` (se citan por nombre).
- **Lo que no se pudo probar:** Safari/iPhone real (teclado, el toque que se pierde del problema 9), la base real de Supabase (la demo usa la misma lógica `lib/presentaciones.ts`, pero el guardado real pasa por `guardar_variantes`) y el catálogo público del comprador (solo «Cómo se ve»).

Gravedad: **Bloquea** = la dueña no puede hacer lo que quiere o pierde datos; **Confunde** = puede, pero no lo encuentra o lo entiende mal; **Detalle** = pulido.

## 1. Escenarios

| # | Escenario | Nuevo | Existente | Resultado | ¿Se puede? | Gravedad |
|---|---|---|---|---|---|---|
| 1 | Sin presentaciones → poner stock | «En stock» arranca en **1** (con «No llevo la cuenta de este»). | «Inventario» con «Stock actual: N» y «Ver historial». Subir de 1 a 8 y guardar: se conserva al reabrir. | Funciona. En nuevo, el 1 por defecto sorprende (la dueña no lo puso). | Sí | Detalle |
| 1b | Stock simple (8) → crear presentaciones | — | Se crean Negro/Blanco/Rojo todas en **0** y al guardar el producto queda en **stock 0**. El 8 desaparece **sin aviso** (y no se vio un ajuste de retiro en el historial). Capturas `01c`, `01d`. | Pierde stock en silencio. | Sí, pero pierde datos | **Bloquea** |
| 2 | Crear con 1 cosa (Color, 3 valores) | En un producto de ropa la hoja abre con **Talla ya elegida y vacía**: «Crear las 0» queda apagado sin decir por qué hasta que se toca «Quitar» en Talla. | Igual. | Con «Quitar» a Talla: «Crear las 3», 3 filas, todas **«Agotada» naranja con 0** (`02c`). | Sí, con tropiezo | Confunde |
| 3 | Crear con 2 cosas (Color × Tamaño) | «Crear las 4» (2×2). Aparecen las 4 filas (`03b`). Pastillas «Color · 2», «Tamaño · 2» en la fila. | Se guarda y reabre igual (incluye stock puesto en 2 de las 4). | Funciona. | Sí | — |
| 4 | Con 1 ya creada, agregar una 2.ª cosa | Solo por «Cambiar qué varía (talla, color…)», un botón de texto al final de la lista **y solo visible con la fila desplegada** (`04d`). Al elegir Tamaño (Pequeño, Grande) y «Guardar», las filas existentes pasan a **«Negro · Sin tamaño»** (stock conservado: 5/1/0) y sale un aviso. **No se crean** las combinaciones nuevas (Negro × Pequeño, etc.): quedan 3 presentaciones, no 9. | Igual. Para llegar a 3×2 hay que completar cada «Sin tamaño» una por una (`04e`) y luego «Agregar presentación» para cada combinación que falte (`04f`). | El stock sí se conserva. Pero «Pequeño» y «Grande» solo existen como valores del eje, sin filas; «Sin tamaño» queda como valor para siempre (también lo ve «Cómo se ve», `16b`). | Se puede, a mano y con muchos pasos | **Confunde** (muy alto) |
| 5 | Agregar un valor nuevo a una cosa existente (un color más) | Por «Cambiar qué varía» (marcar Rojo) o escribiendo el valor en «Agregar presentación». Marcar Rojo en «Qué varía» **no crea ninguna fila** ni avisa: aparece la pastilla «Rojo» en el filtro y al tocarla la lista queda vacía (`05e`, `05f`). Con 2 cosas faltarían las N combinaciones del color nuevo. | Se guarda igual (Rojo queda en el eje sin presentaciones). | «Agregar presentación» sí lo hace, pero de a una combinación. | Parcial | Confunde |
| 6 | Quitar un valor | En «Qué varía» se desmarca; «Guardar» pide **«¿Quitar 2 presentaciones?»** (`06a`) y avisa «2 se van». | Igual, se guarda y reabre sin esas filas. | Bien. Con pedidos solo queda oculta (ver 13). | Sí | — |
| 7a | Quitar una cosa entera, de 2 a 1 | Quitar Tamaño: las presentaciones que quedan iguales se **juntan sumando stock** («Dos se juntaron en una: sumamos su stock.», `07b`). | Igual. | Correcto, pero sin confirmación previa (solo la hay cuando se pierden presentaciones). | Sí | Detalle |
| 7b | Quitar la última cosa, de 1 a 0 | En «Qué varía», «Quitar» a la única cosa deja **«Guardar» apagado sin mensaje** (`07c`). | Hay que ir presentación por presentación («Abrir» → «Quitar» → «Quitar»). Al quitar la última, vuelve al «Inventario» con el stock total anterior (3) (`07d`). | Funciona, pero por un camino que nadie adivina. | Sí, escondido | Confunde |
| 8 | Cosa propia («Aroma») | «+ Otra cosa» → escribir → «Listo». La tarjeta nace **vacía y al final de la lista** (hay que bajar y tocar «+ Agregar» para escribir cada valor, `08b`). | Igual. | Funciona; «Foto de cada aroma» sale sola (el eje de foto es el primero si no hay Color). | Sí | Detalle |
| 9 | Intentar una 3.ª | Las tarjetas sin elegir se apagan y aparece «Ya elegiste 2: es el máximo.» (`09a`). | Igual. | Claro, **pero no dice por qué** ni que se puede cambiar de cosa (hay que quitar una primero). | No, con aviso | Detalle |
| 10 | «Agregar presentación» suelta, 1 y 2 cosas | Con 2 cosas: un grupo de píldoras y un campo «¿Otro valor de …?» por cosa; un valor nuevo se suma al eje; duplicado: «Esa presentación ya existe.»; «Coco · Mediano» se agrega bien (`10c`). Con **1 cosa solo hay UN campo** y es de ese eje. | Igual. **Bug de Lewis reproducido** (ver problema 1): escribir «Tamaño» en «¿Otro valor de color?» guarda «Tamaño» como un color (`05c`, `05d`). | Sin forma de sumar una 2.ª cosa desde ahí. | Con 2 cosas sí; con 1 engaña | **Confunde** (alto) |
| 11 | Precio propio de una presentación | Tocar una fila → hoja con Stock, Precio («El mismo» / «Uno propio»), Foto (`11a`). «Uno propio» + 1200: la fila dice «RD$1,200 · precio propio». | Se guarda y reabre. | Bien. «Cómo se ve» muestra «Desde RD$1,000» (el más bajo). | Sí | — |
| 12 | Foto de cada color | «Foto de cada color» → «Elegir» por valor entre las fotos del producto (`12a`). La fila dice «2 de 3 con foto». Solo se puede elegir entre fotos ya subidas (o subir una ahí). | Se guarda y reabre («Foto 1 · 1 presentación»). | Bien. | Sí | — |
| 13 | Ocultar/quitar una con pedidos | Se inyectó un pedido a la demo. «Quitar» → «Quitar Negro: Ya tiene pedidos: la ocultamos…» → «Ocultar Negro» (`13a`); queda «Oculta», no suma al total, sobrevive a guardar/reabrir. | Quitar el **valor** Blanco (con pedidos): la alerta dice «Se van con su stock», pero la fila queda **oculta en la base con su stock (1) sin verse en ningún lado**. | La lógica protege el historial, pero el texto de la alerta no dice la verdad en ese caso. | Sí | Detalle |
| 14 | Límites (12 valores, 144) | 12 colores × 12 tamaños = «Crear las 144» (se crean, se guardan en ≈1,9 s y se ven las 144 filas en una sola lista). Con 12 valores desaparece «+ Otro color». «Agregar presentación» con 144: «El máximo es 144 presentaciones.» (`14c`). Con 12 colores ya creados, agregar un Tamaño de 12 valores: «Deja un lugar libre en Tamaño: ahí va «Sin tamaño»…» (`14d`). | — | Los límites se respetan. Mensajes correctos pero técnicos. En el 12.º valor, el **primer toque en la tarjeta de abajo se pierde** (el campo se cierra y la hoja se mueve). | Sí | Detalle |
| 15 | Guardar, cerrar, reabrir | Un producto nuevo con 4 presentaciones se publica y reabre igual (stock, precio propio, fotos de cada color, ocultas). Cerrar la hoja «Qué cambia…» sin crear: «¿Salir sin guardar?» (`15b`). | Igual. | Se conserva todo lo probado. | Sí | — |
| 16 | «Cómo se ve» con presentaciones | Muestra foto, nombre, «Desde RD$…», «Agotado» si todas están en 0 y las pastillas de cada cosa (`16a`, `16b`). **No muestra stock ni precio propio por presentación**; muestra valores sin filas (Rojo, «Sin tamaño») como si existieran. | Igual. | Útil, pero engañoso con valores huérfanos. | Sí | Confunde |
| 17 | Perfume de Michel (Tamaño ml) | La hoja abre con **Tamaño** preelegido y 30/50/100 ml como píldoras (hay que tocar las 3; el atajo «30 · 50 · 100 ml» está oculto a propósito). «Crear las 3» → filas 30/50/100 ml (`17c`). | El Oud demo (precios propios 1.200 / 1.900) se ve bien (`17e`). | Funciona. | Sí | — |

## 2. Problemas, de más a menos graves

### Bloquea

**P1. Pasar de stock simple a presentaciones borra el stock sin avisar** *(esc. 1b)*
Producto con stock 8 → «Cosas que cambian» → Color × 3 → «Crear las 3» (todas 0) → «Guardar cambios»: queda en 0. No hay aviso, y en el historial no apareció un ajuste de retiro. Una dueña con 8 unidades en el inventario las pierde. Esperaría que las 8 pasen a una presentación, o al menos un aviso («Tenías 8, repártelas»).

### Confunde (alto)

**P2. Agregar una 2.ª cosa después de crear la primera es casi imposible de encontrar** *(esc. 4, 10; el caso de Lewis)*
No hay en «Agregar presentación» ni en ninguna fila un camino para eso. Solo existe «Cambiar qué varía (talla, color…)», un botón de texto al final de la lista, escondido si la fila está plegada, con nombre que no dice «agregar otra». Una dueña esperaría «+ Agregar otra cosa (talla, tamaño…)» junto a las pastillas de «Cosas que cambian».

**P3. En «Agregar presentación» con 1 cosa, el campo «¿Otro valor de color?» engaña** *(esc. 10; bug de Lewis, `05b`–`05d`)*
Escribir «Tamaño» ahí guarda «Tamaño» como un color más (Color · 3 con Tamaño como valor). No avisa. Es lo que ocurre cuando la dueña, sin encontrar P2, intenta sumar la 2.ª cosa por el único campo que ve. Esperaría que ese campo hablara de valores del color y, si quiere otra cosa, que la hoja se lo ofrezca.

**P4. Al agregar una 2.ª cosa (o un valor nuevo) no se crean las combinaciones** *(esc. 4, 5)*
Con Color (Negro/Blanco/Rojo) existente, agregar Tamaño (Pequeño, Grande) deja 3 filas «Negro · Sin tamaño»…; no hay 6 ni 9. Para llegar ahí hay que completar cada «Sin tamaño» (una hoja por fila) y después «Agregar presentación» una por una (6 hojas más). El valor «Sin tamaño» queda en el eje para siempre y lo ve «Cómo se ve». Con un color nuevo (Rojo) la pastilla aparece con la lista vacía, sin aviso. Esperaría una pregunta «¿Creo las 6 combinaciones?» con el stock actual repartido o puesto en 0.

### Confunde (medio)

**P5. «Crear las 0» apagado sin decir por qué** *(esc. 2)*
En ropa la hoja abre con **Talla** elegida y vacía. Si la dueña elige Color, Talla sigue ahí, sin valores, y «Crear las 0» no se enciende; no hay mensaje (solo «Quitar»). Lo mismo al quitar la única cosa en «Qué varía»: «Guardar» apagado sin texto.

**P6. Todo «Agotada» en naranja en un producto nuevo; el stock se repite** *(reporte de Lewis; `02c`, `04d`)*
Cada fila recién creada dice «Agotada» con 0 aunque la dueña todavía no puso stock. Y debajo, la tarjeta «En stock» repite «3 presentaciones · 0 en total», el total que ya se ve en las filas. Esperaría filas neutras al crear («Sin stock aún» o nada) y que «Agotada» solo salga cuando hubo stock y se acabó.

**P7. «Cómo se ve» y el catálogo muestran valores sin presentaciones** *(esc. 5, 16)*
«Rojo», «Sin tamaño», «Grande» (sin la combinación) aparecen como opciones aunque no haya filas para ellas.

**P8. Quitar la última cosa / volver al stock simple solo se hace de a una presentación** *(esc. 7b)*
No hay un «Quitar todas las presentaciones». Vuelve el stock total al «Inventario», lo cual está bien.

### Detalle

**P9. El primer toque tras el 12.º valor se pierde** *(esc. 14)*: el campo «Otro valor» se cierra, la hoja se desplaza y la tarjeta que se tocaba ya no está debajo del dedo. Reproducido en Chromium; falta confirmar en Safari.

**P10. «0» fantasma tras el título** *(reporte de Lewis; `18-cabecera-scroll-262`, `18-cabecera-scroll-400`)*: el desenfoque de la cabecera deja ver, al pasar por debajo, los textos del contenido («Agrega la primera foto», «Nombre», y el «0» del precio o del stock). No es un dato, es el contenido borroso; pero se lee como un «0» detrás de «Nuevo producto».

**P11. El nombre de la fila de stock se pisa con el contador** *(`04d`)*: «Negro · Sin tamaño» / «Blanco · Sin tamaño» chocan con los botones − / + a 390 px.

**P12. Alerta de «Quitar un valor» con pedidos** *(esc. 13)* dice «Se van con su stock» aunque quede oculta con su stock en la base.

**P13. Textos:** «+ Otro talla» (debería ser «Otra talla»); la tarjeta de una cosa propia (Aroma) nace al final de una lista de 8 tarjetas, hay que bajar para verla; «Ya elegiste 2: es el máximo.» no dice que se puede quitar una; el 1 por defecto de «En stock» en un producto nuevo.

## 3. Recomendación

1. P1, P2, P3 y P4 se arreglan juntos: un solo botón visible «+ Agregar otra cosa» en «Cosas que cambian» que, al terminar, crea todas las combinaciones (con el stock actual en la primera o en 0 y avisándolo), y que «Agregar presentación» deje de aceptar texto libre que no sea un valor de esas cosas.
2. P5 y P6 son de texto/estado y salen baratos.
3. Probar P9 en Safari de iPhone (Lewis).
