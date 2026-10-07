# Presentaciones del producto, parte 2: el catálogo del cliente (rama `feat/presentaciones-catalogo`)

> **Modelo:** en Claude Code, Sonnet 5.5; en Codex, el modelo principal con razonamiento medio. Sin migraciones (usa lo que dejó la parte 1). **Deja el PR abierto con su preview:** lo ven los compradores de tiendas reales y cambia cómo piden (caso de precaución de `docs/00`). No hagas merge.

> **Orden:** va **después** de `docs/prompts/presentaciones-panel.md` (parte 1). Si no está en `main`, no empieces: necesitas la foto por color y el precio por presentación.

## 0. Antes de empezar

Lee `docs/00-contexto-del-proyecto.md`, `AGENTS.md`, `HANDOFF.md` (reglas de teclado e iPhone y de movimiento) y `docs/08-movimiento.md` (la excepción de la superficie pública). Tu puesto es **Coding**.

Diseño aprobado: `referencias/presentaciones/` (**abre los `.dc.html` en un navegador**; lee `LEEME.md`). Los tableros del cliente son `OpcionB1`, `OpcionB2`, `OpcionB3`, `OpcionA2` y `Publico2`–`Publico5`. **No copies su HTML**: están dibujados a ojo (las fotos son bloques de color y el panel «más» no es el real). Manda el catálogo que ya existe: `components/tienda/reel.tsx`, `hojas-compra.tsx`, `catalogo.tsx`, `app/tienda/catalogo.css` (superficie propia; no usa `components/ui`).

Mira antes: cómo `reel.tsx` arma las pastillas (`opciones()`, `valores`, la variante elegida, `disp`, `agotado`, `avisar`, `elegir`, `aaah`), cómo `Medios` pasa de foto a foto, el panel «más», la vista de cuadrícula (`view-grid`), `lib/data/publica.ts` (la forma de `variantes`) y cómo `hojas-compra.tsx` pinta cada línea del pedido (`varianteTexto`).

## 1. Qué decidió Lewis (7 oct 2026)

Elegida la **opción B**: el reel sale **limpio** y las presentaciones se ven en una hoja aparte. Con un ajuste: **si el cliente toca ♥ sin haber elegido, se abre la hoja de la opción A** (pastillas «Elige la tuya» + «Agregar a mi pedido»), no la cuadrícula.

## 2. Qué se construye

Solo para productos **con presentaciones**. Un producto sin ellas se ve y se comporta **exactamente como hoy**.

1. **El reel limpio** (`OpcionB1`): se quitan las dos filas de pastillas del pie del reel. Debajo del precio, una línea corta («4 tallas · 3 colores», con el texto según los ejes) y **un solo botón «Ver presentaciones ›»** con los colores en puntitos cuando haya un eje Color (`lib/colores.ts`: si el nombre no se conoce, no se dibuja un color inventado). Sin descripción larga encima de la foto si ya hay botón (la descripción vive en «más»; revisa que el pie no se vea cargado en 360 px).
2. **La hoja «Ver presentaciones»** (`OpcionB2`):
   - **Dos ejes (talla × color):** cuadrícula con los valores del eje Color en filas (con la **foto de ese color** al lado del nombre) y los del otro eje en columnas. **Tachada = agotada**, un número pequeño = «quedan pocas» (usa la misma regla de «quedan» del catálogo), y el precio propio solo si difiere del base. La celda elegida se marca (no solo con color). Una línea con la elección («M · Negro · Quedan 2») y **«Agregar a mi pedido»**.
   - **Un solo eje** (perfumes: «Tamaño»): una lista simple con el valor, su precio y su estado; no una cuadrícula.
   - Más de 12 filas/columnas: que se pueda desplazar; no se corta.
   - Tocar una celda tachada ofrece **«Avísame cuando vuelva»** para esa presentación (el mismo flujo `avisar` de hoy).
3. **El corazón** (la regla de Lewis): si **no** hay presentación elegida, tocar ♥ abre la hoja de la **opción A** (`OpcionA2`: talla y color en pastillas con muestra de color, «Quedan N de la M · Negro», «Agregar a mi pedido»). Si **ya** eligió una, ♥ la agrega directo, como hoy. «Agregar a mi pedido» de cualquiera de las dos hojas agrega esa presentación con el mismo `elegir` y el mismo «aaah».
4. **Ya elegida** (`OpcionB3`): el botón del reel pasa a «M · Negro · Cambiar ›» (con la muestra del color) y el reel muestra «En tu pedido» como hoy. Cambiarla reabre la hoja.
5. **La foto cambia con el color** (`Publico2`): al elegir un color con foto asignada, el reel va a esa foto; sin foto asignada, no se mueve. Ojo con el carrusel de `Medios`: la foto debe cambiar **sin animar la página** ni quitarle el foco a nada (`HANDOFF.md`). Con movimiento reducido, sin transición.
6. **Presentación agotada** (`Publico3`): cuando la combinación elegida está agotada (o no existe), el reel se sella como un producto agotado de hoy **solo para esa combinación**, y el corazón pasa a «Avísame» (ya existe: `avisar(varianteId)`). Si **todas** están agotadas, es «Agotado» como hoy.
7. **«Desde»:** si las presentaciones tienen precios distintos, el precio del reel y de la cuadrícula del catálogo dice «Desde RD$ X» y se ajusta al elegir una. Si todas valen lo mismo, no cambia nada. Con promo, el tachado sigue como hoy.
8. **El detalle «más»** (`Publico4`): en vez de las pastillas, el mismo botón de presentaciones (y su elección), para no tener tres formas de elegir. Si prefieres dejar las pastillas con precio donde ya están, dilo en el PR y por qué.
9. **El pedido** (`Publico5`, `hojas-compra.tsx`): cada línea ya lleva la presentación (`varianteTexto`); que la foto de la línea sea la del color elegido. La misma camisa en dos presentaciones son dos líneas; si una se agota antes de enviar, esa línea sale «Agotado» y el envío se frena (ya existe: no lo rompas).
10. **Textos:** en la voz de la marca y mínimos. El título de la hoja dice «Elige tu talla», «Elige tu tamaño» o «Elige la tuya» según los ejes. Cada tienda puede tener su propia redacción en `personalizacion.mensajes`: respeta las claves que ya existen y no inventes nuevas sin necesidad.
11. **Cuadrícula del catálogo** (`view-grid`): revisa cómo se ve un producto con presentaciones (precio «Desde», etiqueta de agotado si todas lo están, sin pastillas) y ajusta lo mínimo.

## 3. Reglas

- Superficie propia del catálogo: no uses `components/ui`; respeta `app/tienda/catalogo.css`, su tipografía (Cormorant Garamond / Manrope) y los colores de cada tienda (`personalizacion`).
- **Nada de animar lo que tiene un campo enfocado**, ni `ViewTransition`; movimiento solo con `transform` y `opacity`, y reducido con `prefers-reduced-motion` (`docs/08`). Las hojas siguen el patrón que ya usa el catálogo (aviso «Avísame», pedido).
- Áreas de toque de 44 px (las celdas de la cuadrícula también), contraste AA sobre la hoja clara, estados (elegida, agotada, quedan pocas) que no dependan solo del color. Etiquetas accesibles completas («Talla M, color Negro, quedan 2»; «Talla L, color Negro, agotada»).
- Sin presentaciones, y en la demo `?demo`, todo igual que hoy.
- No cambies cómo se registra un pedido, el stock ni el «aaah»; solo qué presentación se elige y cómo se ve.

## 4. Pruebas y cierre

- Unitarias: «Desde», qué celda está agotada o queda poca, la elección por defecto, ♥ sin elegir / ♥ con elección, la foto del color.
- Navegador (demo `?demo`, 390 y 360, **tema claro** del catálogo): el recorrido de `OpcionB1` → `OpcionB2` → `OpcionB3`, ♥ sin elegir (`OpcionA2`), cambio de color con foto, talla agotada → «Avísame», un perfume con tamaños, pedido con dos presentaciones, un producto **sin** presentaciones sin cambios. `scripts/probar-catalogo-presentaciones.mjs`.
- `tsc`, `npm test`, `npm run lint` (sin avisos nuevos), `npm run build` y las regresiones del catálogo (`probar-catalogo-*`, pedido del comprador, Avísame, likes).
- Novedad en `lib/novedades.ts` solo si el panel muestra algo nuevo (esto es del comprador: normalmente no lleva).
- Actualiza `docs/04-pantallas.md` (el catálogo del cliente) y la sección de `docs/12-catalogo-conectado.md` que hable de opciones.
- **PR abierto con su preview** y, en el PR, qué debe probar Lewis en el iPhone: abrir el catálogo de Lino & Algodón (demo) y de Esencias Michel si ya tiene presentaciones, elegir talla y color, ver cómo cambia la foto, tocar ♥ sin elegir, una talla agotada, y hacer un pedido. Di claro lo que no pudiste probar (Safari físico, WhatsApp nativo).
- Resume en español, corto.
