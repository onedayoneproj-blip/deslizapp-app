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

## Prototipo v4 (12 oct 2026) — manda sobre todo lo anterior
Lienzo de Claude Design (versión 16). Archivos: `historia.dc.html` (hoja principal, pasos 1–15) e `historia-presentaciones.dc.html` (hoja «Inventario», 3 pantallas). Capturas en `capturas/b1…b15.png` y `v1…v3.png` (390×844).
- **Crear producto es una HOJA** (no pantalla completa): sobre el panel atenuado, esquinas superiores redondeadas (28) en y=78, con agarradera.
- **Cabecera:** fila 1 (y=98): «Nuevo producto» a la izquierda y el selector de catálogo a la derecha («Ropa ▾»; recuerda el último usado por tienda; se oculta con un solo catálogo). Fila 2 (y=128): barras de historia + ✕. Contenido desde y=180.
- **«Atrás» (‹) siempre ABAJO, a la izquierda, junto al botón principal** (círculo de 52 px), en todos los pasos y en todas las hojas; apagado en el primero, oculto en la celebración. (Lewis cambió de opinión el 12 oct: antes estaba arriba.)
- **Foto:** sin fotos, título + «Tomar foto» y «Elegir de la galería» en una fila + «Con foto se vende más.» (Caveat) + «Seguir sin foto». Con fotos: foto grande, miniaturas, «Hasta 10…», «Con foto se vende más.» al final; debajo irá el retoque (hoy hueco punteado, ronda futura).
- **Nada antes de tiempo** (sin nombre/precio no se ven; «Escribe tu precio» pequeño y gris). Títulos de pregunta 26 px. Tarjeta «así se verá» 350×372 (un producto) / 350×212 (varias presentaciones); reel 350×440 con «Hazlo brillar» en una fila.
- **«Es por encargo»** es un interruptor; al activarlo, «¿Cuándo llega?».
- **Celebración animada** (corazones de «Lo quiero» y burbujas tipo WhatsApp; transform/opacity).
- **Varias presentaciones — las 3 cosas que se eligen van como historia en la hoja principal** (P1 ¿en qué cambia? → P2 ¿qué tallas? → P3 ¿y qué colores? + foto de cada color; 7 barras en lugar de 5). **Las cantidades van en OTRA hoja encima, «Inventario»** (nombre provisional): cuántas tienes de cada una, interruptor «Es por encargo» (con plazo), interruptor «Cada una tiene su precio», fila «Poner a todas» con − N + y los grupos por color (I1, I2); tocar una fila abre el detalle (I3: stock, precio, foto, ocultar). Al cerrar el Inventario con «Listo», la pantalla de colores (P4) muestra debajo la sección «Inventario · 6 presentaciones · 21 en total · Editar»; luego «Así se ve» con «Desde RD$…» y «Ver presentaciones» (P5).
