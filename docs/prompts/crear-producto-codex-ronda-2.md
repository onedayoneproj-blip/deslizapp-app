# Crear producto «como una historia» — ronda 2 para Codex (PR #114)

Encargo de Planning, 12 oct 2026. Lewis probó en su iPhone las dos versiones y **se queda con la de Codex (PR #114, rama `codex/crear-producto-historia`)**. Esta ronda son ajustes sobre ese mismo PR: **sigue en la misma rama, no abras otro PR**. Sigue mandando `docs/prompts/crear-producto-codex.md` y el prototipo (`referencias/crear-producto/capturas/` y el PDF); lo de abajo lo corrige o lo concreta.

Antes de empezar: haz merge de `main` en la rama (hay cambios del catálogo, de novedades y de pruebas desde que abriste el PR).

**El prototipo se actualizó con todos estos cambios (v3, lienzo de Claude Design versión 15): `referencias/crear-producto/capturas/b1…b12.png` y `v1…v3.png` y el LEEME de esa carpeta mandan. Si algo de abajo choca con las capturas v2, mandan las capturas v2 y avísalo en el PR.**

## 1. Cabecera de la hoja (se ve apiñada)

- **Fila 1:** solo el selector de catálogo (p. ej. «De todo ▾» / «Ropa ▾»), con aire. Sigue recordando el último catálogo usado por tienda y se oculta si la tienda tiene un solo catálogo (en ese caso la fila 1 no existe).
- **Fila 2:** botón «atrás» (‹) a la izquierda, las **barras tipo historia** en el centro y la ✕ a la derecha.
- **«Atrás» tiene un solo lugar fijo: arriba, en la fila 2 de la cabecera, en TODOS los pasos** (los dos flujos, «Así se ve en tu catálogo» incluido). Hoy en unos pasos está abajo junto a «Seguir» y en otros arriba: quita el ‹ de la barra inferior, que queda solo con el botón principal a todo el ancho («Seguir», «Listo · N en total», «Publicar» + «Guardar sin publicar»). En el primer paso, sin paso anterior, el ‹ se ve desactivado en el mismo sitio (no desaparece, para que nada salte).
- Quita el título «Nuevo producto» de la cabecera si no cabe sin apretar (la pregunta de cada paso ya dice dónde estás). Nada se monta ni se recorta a 360, 390 y 430 px.

## 2. Paso de la foto

- **Con fotos ya puestas**, desaparecen el título «Empieza por la foto», su ayuda y los botones «Tomar foto» / «Elegir de la galería». Quedan la foto grande, la tira de miniaturas (con «Portada» y la ficha «+ Agregar foto»), «Hasta 10. Mantén presionado para ordenar.» y «Seguir».
- **«Con foto se vende más.»** en Caveat (`mano`), **al final de esa pantalla** (debajo de todo lo demás del paso). Quita «Sin foto se vende menos. Puedes agregarla luego.». Debajo de esa línea irá, en una ronda futura, la sección para pedir a Deslizapp retocar la foto: deja el espacio pensado, no la construyas.

## 3. La tarjeta «así se verá» no muestra lo que aún no se escribió

- **Sin precio no se ve precio:** nada de «RD$ —» ni marcadores; el precio aparece en la tarjeta solo cuando la persona lo escribe (como en el prototipo y en la versión de Claude).
- **Sin nombre no se ve nombre:** ni la tarjeta ni el campo muestran «Nombre del producto» como texto puesto. El campo empieza vacío con el cursor (la etiqueta puede quedar oculta visualmente o arriba en pequeño, como el lienzo) y el nombre aparece en la tarjeta mientras se escribe.
- **Paso del precio: el texto «Escribe tu precio» es demasiado grande.** El texto de ayuda dentro del campo vacío va pequeño y en color secundario (Figtree ~18 px, como «RD$»), no al tamaño de la cifra. Cuando se escribe, la cifra usa el tamaño del lienzo: «RD$» 18 px y el número en Fredoka 32 px, campo de 64 px de alto.

## 4. ¿Cuántos tienes?

- **Botones − y + redondos** (círculos de 56 px, como el lienzo), no cuadrados redondeados. Lo mismo en las filas de cantidades de las presentaciones (círculos de 34 px).
- **Bug:** el contador muestra 1 al llegar, pero al tocar «Seguir» sale «Elige cuántas tienes o marca por encargo.» hasta que se sube y se vuelve a bajar. Lo que se ve debe ser el valor real: si se muestra 1, «Seguir» avanza con 1. Agrega una prueba que lo cubra.
- **«Es por encargo, no llevo stock» pasa a ser un interruptor** (el mismo estilo de fila con toggle que «Cada una tiene su precio»), en el paso de una presentación y en el de varias. En el de varias presentaciones va **encima de la fila «Poner a todas»**. Al activarlo, el paso muestra «¿Cuándo llega?» como ya lo hace.

## 5. Celebración

- Hoy no tiene animación. Cambia los círculos de colores por **corazones de «Lo quiero» que salen y burbujas de mensaje tipo WhatsApp** alrededor de la foto, con una animación corta de entrada (solo `transform` y `opacity`, tokens de `docs/08-movimiento.md`; con movimiento reducido, todo quieto).
- Revisa que no se duplique el título: en tus capturas «¡Ya está en tu catálogo!» aparece arriba y otra vez abajo, y además sale el aviso «Publicado. Ya se está deslizando.». Debe quedar una sola vez, en Caveat, debajo de la foto, sin aviso encima.

## 6. Deuda antes de fusionar

- Actualiza `npm run probar:producto` y `npm run probar:presentaciones` (sin filtro) para el alta nueva: hoy fallan porque buscan los campos de la hoja vieja. Deben quedar en verde, no saltados.
- Prueba los escenarios que dejaste pendientes: producto de tipo servicio y catálogo lleno.
- `lib/novedades.ts`: una entrada (versión siguiente a la más alta de `main`), 2–4 líneas cortas. `docs/04-pantallas.md` al día con lo de esta ronda.
- Sal del borrador cuando todo esté listo (Ready for review).

## Entrega

Capturas a 390×844 de cada pantalla tocada en `docs/capturas/crear-producto-codex/` (reemplaza las viejas), con fotos reales de prueba. Tabla «antes / después» en la descripción del PR. «Revisión» en verde. No fusionar: Planning revisa y Lewis prueba en su iPhone.

## 7. Cambio de estructura (Lewis, 12 oct): crear producto es una hoja, y las presentaciones van en OTRA hoja encima

- **La hoja «Nuevo producto» es una hoja**, no pantalla completa: sobre el panel atenuado, esquinas superiores redondeadas (28), agarradera, borde superior en y≈78 (como el prototipo v3). Lo demás de la cabecera, como en la sección 1.
- **Quita el recorrido de varias presentaciones como pasos de historia dentro de la misma hoja** (los pasos v1–v6 de tu PR). Al tocar «Tiene tallas o colores» **sube otra hoja encima**, «Presentaciones» (prototipo `v1…v3`): cabecera ‹ · título · ✕ y «Paso 1 de 2 / Paso 2 de 2». Paso 1: «¿En qué cambia?», «Tallas», «Colores» y «Foto de cada color · opcional» en una sola hoja que scrollea («Seguir»). Paso 2: resumen con «Cambiar», interruptor «Es por encargo», interruptor «Cada una tiene su precio», **«Poner a todas» como fila propia con − N +** (como ya la tienes), grupos por color con filas por talla, «Listo · N en total». El detalle de una presentación (hoja inferior que ya tienes: Stock, Precio, Foto, Listo, Ocultar) queda como tercer nivel sobre «Presentaciones».
- Al cerrar «Presentaciones» se vuelve a «Nuevo producto» en «¿Cuántos tienes ahora?» con el resumen «6 presentaciones · 21 en total» + «Cambiar» y el interruptor «Es por encargo»; luego «Así se ve» (con «Desde RD$…», píldora de tallas, puntos de color y «Ver presentaciones»).
- Mantén `opciones_validas`, `guardar_variantes`, límites (2 ejes, 12 valores, 144 combinaciones), reasignación advertida al cambiar el primer eje, stock cero con plazo en productos por encargo. «Atrás» sigue siendo solo el ‹ de arriba de cada hoja; el gesto/botón del sistema cierra la hoja de encima primero.
- Las hojas apiladas respetan las reglas de `HANDOFF.md` (gestos de hojas, teclado en iPhone, `protegerAtras`).

## Fuera de esta ronda (no lo hagas aquí)

- La sección para pedir a Deslizapp retocar la foto (ronda futura, con diseño propio).
- Llevar el diseño de las tablas de presentaciones (grupos por color con filas por talla y − / + redondos) a la hoja del **pedido**: Lewis lo quiere, pero va en un PR aparte después de fusionar este.
