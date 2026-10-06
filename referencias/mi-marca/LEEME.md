# Mi marca y bienvenida del retoque: referencias de diseño (6 oct 2026, pendiente de aprobación)

| Tablero | Qué muestra |
|---|---|
| `MiMarca` | Pantalla «Mi marca» completa: logo, Instagram, «Tu marca en 3 palabras», 3 a 6 fotos de referencia y «Lo que no quiero» (opcional). Estado «Tu marca está lista para el taller.» |
| `MiMarcaVacia` | Misma pantalla vacía, con el aviso de que faltan 3 fotos y la tarjeta «¿Todavía no tienes marca?» (paquete «Marca y diseño», RD$5,000 editable con descuentos desde el admin). |
| `Bienvenida` | Bienvenida animada tipo historias, 5 escenas (~12 s en bucle): Tu foto → La IA propone → Una persona decide (con las referencias de la marca) → Tu producto, igual → cierre con «Retocar mi foto» y la nota Beta. Capturas `Bienvenida_f1..f5`. Con «reducir movimiento» queda solo la última escena. |
| `AdminFoto` | En el admin, el pedido de retoque con la marca de la tienda al lado (referencias, 3 palabras, lo que no quiere, Instagram) y el botón «Copiar instrucciones». |

En la bienvenida real, la escena 1 usa **la foto del producto que se va a retocar**, y la 2 y la 3 usan **las referencias de la tienda**. Aquí son colores de ejemplo. **No son código para copiar**: se construye con `components/ui/` y los tokens del panel (docs/09). Las letras salen con fuente de reemplazo; las de verdad son Fredoka, Figtree y Caveat.
