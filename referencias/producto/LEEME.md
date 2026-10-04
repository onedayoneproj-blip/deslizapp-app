# Producto: detalles, opciones y medios — referencias de diseño

Tableros del canvas "Producto: detalles, opciones y medios" (Claude Design), aprobados por Lewis el 3–4 oct 2026. Muestran **qué va y dónde, con qué tamaños y textos**. **No son código para copiar**: la app se construye con `components/ui/` (docs/09 §16, punto 5).

| Archivo | Qué muestra |
|---|---|
| `Perfume.dc.html` | Editar producto (perfumes): tira de fotos y video, nombre, precio, stock, **Detalles** del rubro como filas, Colección, Visible y **Por encargo** con su texto. |
| `Notas.dc.html` | Editor de "Notas": salida, corazón y fondo como etiquetas, con sugerencias al escribir. |
| `Ropa.dc.html` | Editar producto (ropa): **Opciones** (Talla, Color, "Agregar opción") y **Stock** por combinación con − y +. |
| `AgregarOpcion.dc.html` | Agregar opción: qué elige el cliente, valores como etiquetas, atajos, y cuántas combinaciones salen. |
| `Video.dc.html` | Subir video: progreso sobre la miniatura; si dura más de 30 s, se elige el tramo. |
| `Inventario.dc.html` | Inventario: agotados por opción, "N esperan", y al reponer "Ya llegó" con un botón de WhatsApp por persona. |
| `img/real-*.jpg` | El catálogo **real** (HTML de Esencias Michel) con solo lo nuevo agregado: carrusel, opciones, video, opción agotada, Avísame, Por encargo y «más». Son para la parte 4 (catálogo en React). |

Para verlos, abre los `.dc.html` en un navegador (los estilos están dentro).
