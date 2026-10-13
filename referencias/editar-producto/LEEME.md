# Editar producto como resumen (opción A, aprobada por Lewis el 13 oct 2026)

Lienzo de Claude Design: [Editar producto · rediseño](https://claude.ai/artifact/5YACSv8xB38s6BAjVUeH9d) (privado). **Es una referencia visual: nunca se copian su HTML ni sus estilos en línea.** Se construye con `components/ui/`, los tokens y `docs/09-sistema-de-diseno.md`, y con las mismas piezas que la historia de crear producto.

- `Main.dc.html`: **A · la hoja entera** (390×1320, desplazada). Arriba, la cabecera de la historia sin barras: ✕ a la izquierda, «Editar producto» y el selector de catálogo. Debajo, «así se ve en tu catálogo» (la tarjeta del producto con «Visible» y «1 / 3») y luego cuatro grupos de filas tocables:
  - Lo básico: Fotos, Nombre, Precio.
  - Presentaciones y stock: Presentaciones, Stock, Es por encargo.
  - Hazlo brillar · opcional: Descripción, Colección, Ficha técnica (y Detalles cuando el rubro los tenga).
  - En tu catálogo: Visible en el catálogo, Lista de espera, Historial de ajustes.
  
  Al final, «Eliminar producto». «Guardar cambios» va en el pie flotante con el desenfoque de la historia.
- `A-precio.dc.html`: tocar una fila abre **encima** la misma pantalla de ese paso de la historia (tarjeta «así se verá», la pregunta en Fredoka 26, el control) con ✕ a la izquierda, un título corto («Precio») y un solo botón, «Listo». La ayuda dice el valor anterior («Antes: RD$1,450.»).
- `A-stock.dc.html`: «Stock» con presentaciones abre el **Inventario** de la historia. Si una cantidad baja, la fila se marca («antes 3») y debajo aparece «Bajaste 2 en Blanco · M. ¿Qué pasó?» con los motivos de hoy (Daño, Pérdida, Corrección de inventario, Otro) y «No cuenta como venta. Queda en el historial.». Si sube no se pregunta: es reposición.
- `B-historia.dc.html`: opción B (la historia llena, barras para saltar, «⋯» para lo propio de editar). **Descartada** el 13 oct: obliga a meter editar dentro del componente de crear y arriesga crear, que Lewis ya validó.

## Ver producto (13 oct 2026, Lewis eligió la Vista A y la ajustó)
`Vista-A.dc.html` (390×1000) manda; `Vista-B.dc.html` (compacta) queda descartada. Es la hoja que se abre al tocar un producto en Catálogo (`HojaVistaProducto`).
- Cabecera: ✕ a la izquierda, el nombre del producto (elipsis) y **«Editar» como botón píldora** (estilo iOS, mismo fondo que la ✕) a la derecha.
- Vista previa grande: carrusel de las fotos con las barras tipo historia arriba, como el catálogo; abajo, sobre un degradado, precio (con promo, tachado), «Agotado» si aplica y las presentaciones (colores como puntos, tallas como pastillas).
- «N personas lo esperan» (franja de atención) solo si hay lista de espera; abre la lista.
- Orden: **Visible en el catálogo** → **Stock, plegable** («Stock · 3 presentaciones · 0 en total»; abierto, − / + por presentación; sin presentaciones, un solo − / +; con más de 3, abrirlo lleva al Inventario) → **Historial de ajustes**, fila aparte debajo del stock.
- Stock empieza cerrado y se recuerda abierto/cerrado (decisión de Planning; Lewis puede cambiarla).
- Pie: **«A tu historia»** (abre la hoja «Tu historia» de siempre) y **«Crear pedido»**, mitad y mitad.

Datos de muestra: «Camisa de lino», 6 presentaciones; las fotos son manchas de color. Los textos nuevos («Antes: …», «¿Qué pasó?», «Cuéntalos como están hoy en tu casa o tu tienda.») son propuesta: se revisan con `docs/11-voz-y-frases.md`.

Encargos: `docs/prompts/editar-producto-1-pasos-compartidos.md` (PR 1) y `docs/prompts/editar-producto-2-resumen.md` (PR 2).
