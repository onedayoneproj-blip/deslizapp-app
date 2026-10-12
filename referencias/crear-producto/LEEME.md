# Crear producto «como una historia» (aprobado por Lewis, 11 oct 2026)

Lienzo de Claude Design: [Crear producto · rediseño](https://claude.ai/artifact/Y4cKDREEphaQcwd6TLvGE4) (privado). **Referencia visual: nunca copiar el HTML ni sus estilos en línea**; se construye con `components/ui/`, los tokens y `docs/09-sistema-de-diseno.md`.

- `historia.dc.html`: opción B aprobada, un producto con una sola presentación. Seis momentos: foto → nombre → precio → cuántos tienes → «así se ve en tu catálogo» (opcionales y Publicar) → celebración.
- `historia-presentaciones.dc.html`: la misma B cuando el producto tiene varias presentaciones: qué cambia → valores → colores y foto de cada color → cuántos de cada una → detalle de una presentación → así se ve.
- `descartada-dos-pasos.dc.html`: opción A (dos pasos con preguntas). Descartada; se conserva como antecedente.

Encargo: `docs/prompts/crear-producto-historia.md`.

## Fidelidad al prototipo (12 oct 2026, manda sobre la regla 4:5 del 11 oct)
Lewis aprobó el prototipo tal cual y pidió que lo construido **se vea exactamente igual**, salvo una excepción: el catálogo no es un paso, es un selector en la cabecera de la hoja (el «De todo ▾» de siempre), que recuerda el último catálogo usado.

Medidas del lienzo (390×844, márgenes laterales de 20 px, la tarjeta ocupa de margen a margen):
- Pasos de preguntas (foto, nombre, precio, cuántos): tarjeta «así se verá» de **350×372 px**, la misma en todos los pasos y en el mismo lugar, foto en `object-fit: cover`.
- «Así se ve en tu catálogo»: tarjeta de **350×440 px** (≈ 4:5), que es el reel real **reducido en proporción** (escala del reel de 390×488), nunca recortado ni con el contenido desbordado.
- Barra de avance, botones inferiores (‹ redondo + Seguir), tipografías y espacios: los del lienzo.
La proporción 4:5 «para todas las tarjetas» del 11 oct fue un error de Planning: ya no aplica a los pasos de preguntas.

## Capturas renderizadas (12 oct 2026)
`capturas/b1…b6.png` (un producto) y `capturas/v1…v6.png` (varias presentaciones), 390×844, y `prototipo-crear-producto.pdf` con ellas y las medidas. En BV la tarjeta «así se verá» mide 350×212 (en B, 350×372).

## Prototipo v3 (12 oct 2026) — manda sobre todo lo anterior
Está en el lienzo de Claude Design (versión 15) y en `historia.dc.html` (un producto, 12 pantallas) y `historia-presentaciones.dc.html` (hoja «Presentaciones», 3 pantallas). Capturas en `capturas/b1…b12.png` y `v1…v3.png` (390×844).
- **Crear producto es una HOJA**, no una pantalla completa: sobre el panel atenuado, borde superior redondeado (28) en y=78, con su agarradera. Fila 1 (y=98): solo el selector de catálogo («Ropa ▾», recuerda el último usado por tienda, se oculta con un solo catálogo). Fila 2 (y=128): ‹ atrás · barras de historia · ✕. Contenido desde y=180. Sin título «Nuevo producto».
- **«Atrás» solo arriba**, en todos los pasos (apagado en el primero, oculto en la celebración). La barra inferior (bottom 24) lleva un solo botón principal.
- **Foto:** sin fotos, título + «Tomar foto» y «Elegir de la galería» **en una fila** + «Con foto se vende más.» (Caveat) + «Seguir sin foto». Con fotos desaparecen título y botones: foto grande, miniaturas («Portada», «+ Agregar foto»), «Hasta 10…» y «Con foto se vende más.» al final; debajo irá el retoque (hoy hueco punteado, ronda futura).
- **Nada antes de tiempo:** sin nombre/precio no se ven en la tarjeta; el campo del precio vacío dice «Escribe tu precio» pequeño y gris.
- **Títulos de pregunta 26 px** (para que «¿Cuántos tienes ahora?» quepa en una línea). Tarjeta «así se verá» 350×372; reel «así se ve» 350×440 con «Hazlo brillar» en **una sola fila** de pastillas de 34 px.
- **«Es por encargo»** es un interruptor (fila blanca con switch) debajo del contador; al activarlo, «¿Cuándo llega?» con pastillas de 40 px.
- **Celebración animada** (corazones de «Lo quiero» y burbujas de mensaje tipo WhatsApp; transform/opacity; quieta con movimiento reducido).
- **Varias presentaciones = OTRA HOJA ENCIMA de la hoja «Nuevo producto»** (no más pasos de historia dentro de la hoja). Al tocar «Tiene tallas o colores» (paso del precio) sube la hoja «Presentaciones» (top 118, base atenuada detrás) con su propia cabecera ‹ · título · ✕ y «Paso 1 de 2 / 2 de 2»:
  1. **Paso 1 de 2:** «¿En qué cambia?» (hasta 2), «Tallas», «Colores» y «Foto de cada color · opcional», todo en una hoja que scrollea. Pie: «Seguir».
  2. **Paso 2 de 2:** resumen («6 presentaciones · 21 en total» + «Cambiar»), interruptor «Es por encargo», interruptor «Cada una tiene su precio», **fila «Poner a todas» con − N +** (sola en su fila, como en Codex) y los grupos por color con filas por talla (− / + redondos, «N en total»). Pie: «Listo · N en total».
  3. **Detalle de una presentación** (hoja inferior sobre «Presentaciones»): Stock, Precio («El mismo» / «Uno propio»), Foto, «Listo» y «Ocultar esta presentación».
  Al cerrar «Presentaciones», la hoja «Nuevo producto» sigue en «¿Cuántos tienes ahora?» (b11) con el resumen y «Cambiar», y luego «Así se ve» con «Desde RD$…», la píldora «Talla S · M · L», los puntos de color y «Ver presentaciones» (b12).
