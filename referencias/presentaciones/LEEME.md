# Presentaciones del producto: referencias de diseño (7 oct 2026)

Lienzo original (Claude Design): https://claude.ai/artifact/2er5hRGyNspVtXuvW6fLeG

**Elegido por Lewis:** un producto con sus presentaciones (talla, color, tamaño…), no un producto por cada una. En el catálogo del cliente, **la opción B** («Ver presentaciones»), con un ajuste: si el cliente toca ♥ sin haber elegido, se abre la hoja de la opción A (pastillas y «Agregar a mi pedido»).

## Panel (la tienda)

| Tablero | Qué muestra |
|---|---|
| `Main` | Producto nuevo (ropa) sin presentaciones: tarjeta «¿Viene en varias tallas, colores o tamaños?» con «Agregar presentaciones» y «No, solo viene de una forma». |
| `Elegir` | «¿Qué cambia de una a otra?» (Talla, Color, Tamaño, Otra), valores con atajos («XS a XL», «36 a 42», «Única») y «Crear las 12». |
| `Lista` | Las presentaciones creadas: una fila por combinación con su stock (− / +), filtro por color, «Agregar presentación» suelta y «Cambiar qué varía». |
| `Hoja` | La hoja de UNA presentación: stock, precio (el mismo o uno propio), foto del color, «Ocultar esta presentación» y «Quitar». |
| `Foto` | La foto va por **color**, no por combinación: se elige entre las fotos del producto. |
| `Panel` | La tarjeta del producto en el catálogo del panel: «Desde RD$ …», número de presentaciones, «2 agotadas», «31 en total». |
| `Perfume` | Un perfume con «Tamaño» (30 / 50 / 100 ml) y precio propio por tamaño. |
| `Casos` | Quitar una talla que ya vendió (se oculta, no se borra), cambiar de «Talla» a «Talla y color», todo agotado, Ayudante solo mira, pedido a mano y promos, retoque. |

## Catálogo del cliente (opción B)

| Tablero | Qué muestra |
|---|---|
| `OpcionB1` | Reel limpio: nombre, precio, «4 tallas · 3 colores» y un solo botón «Ver presentaciones ›» con los colores en puntitos. |
| `OpcionB2` | La hoja con TODAS juntas: colores en filas (con la foto de cada color), tallas en columnas; tachado = agotado, número = quedan pocas; «Agregar a mi pedido». |
| `OpcionB3` | Ya elegida: el botón dice «M · Negro · Cambiar ›» y el reel muestra «En tu pedido». |
| `OpcionA1`, `OpcionA2` | La opción A. Solo **A2** se usa: es la hoja que se abre al tocar ♥ si todavía no eligió. |
| `Publico2`–`Publico5` | Lo que es común: al tocar otro color cambia la foto; talla agotada con «Avísame»; el detalle «más»; el pedido por WhatsApp con la presentación en cada línea. |
| `Publico` | Cómo se vería hoy con todo a la vista (cargado). **Descartado.** |

Las pantallas `Publico`, `Publico2`–`Publico5` llevan una nota encima que solo explica; no es parte del diseño. Las fotos son bloques de color. El panel «más» (`Publico4`) está dibujado a ojo: manda el panel real que ya existe en `components/tienda/reel.tsx`.

**No es código para copiar.** El panel se construye con `components/ui/` y los tokens (docs/09); el catálogo del cliente, con su propia superficie (`app/tienda/catalogo.css`, `components/tienda/`), que no usa `components/ui`.
