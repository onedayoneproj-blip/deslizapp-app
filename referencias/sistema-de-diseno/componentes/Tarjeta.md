# Tarjeta

El contenedor por defecto: `superficie`, borde `linea`, `radio-l` (22), relleno `espacio-4` (16), sin sombra.

- **Normal:** casi todo.
- **Destacada** (`accion` con texto `sobre-accion`): la cifra principal de una pantalla (Ventas, Por cobrar). Máximo una por pantalla.
- **De marca** (`marca-rosa`): el plan y las novedades de Deslizapp.

No se usan Mandarina ni Rosa como fondo de avisos: para eso está **Aviso**. Lo que va dentro de una tarjeta usa un radio menor (fotos y avisos `radio-m`).

**Tarjeta de documento** (factura, recibo): miniatura de papel de 52 × 66 px a la izquierda (fondo `fondo`, borde `borde-pastilla`, `radio` 6, líneas que sugieren el texto), título en `destacado` ("Factura #1039") con su etiqueta de estado debajo, y abajo dos botones con texto del mismo ancho: "Descargar" secundario y "Compartir" principal, de 44 px. Nunca botones de solo icono para estas acciones.

**Props previstas:** `tono`: `"normal" | "destacada" | "marca"`; `as` (`div`, `button`, `a`) para tarjetas tocables, que reciben el mismo foco visible que los botones.
