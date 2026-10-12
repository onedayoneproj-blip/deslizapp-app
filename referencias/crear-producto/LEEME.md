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
