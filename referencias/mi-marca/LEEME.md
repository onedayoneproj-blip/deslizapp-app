# Mi marca y bienvenida del retoque: referencias de diseño (6 oct 2026, pendiente de aprobación)

| Tablero | Qué muestra |
|---|---|
| `MiMarca` | Pantalla «Mi marca» completa: logo, Instagram, «Tu marca en 3 palabras», 3 a 6 fotos de referencia y «Lo que no quiero» (opcional). Estado «Tu marca está lista para el taller.» |
| `MiMarcaVacia` | Misma pantalla vacía, con el aviso de que faltan 3 fotos y la tarjeta «¿Todavía no tienes marca?» (paquete «Marca y diseño», RD$5,000 editable con descuentos desde el admin). |
| `Bienvenida` | **Aprobada (6 oct 2026), animada.** Abre en la ficha del producto con la hoja subiendo. Dentro: etiqueta Beta y «5 créditos», una escena de 212 px de alto (la foto original apagada → llegan 3 miniaturas «Tu marca» que se funden → un barrido de luz la cambia por la versión retocada, mismo producto → chispa mandarina y nota a mano «a tu estilo»), «Tu foto, con tu marca.» con una línea de apoyo, la franja verde de honestidad, la nota Beta en rojo, y los botones «Cancelar» y «Retocar foto». Corre una vez, ~2,5 s, solo transform/opacity; con movimiento reducido se ve el resultado directo. Abre el `.dc.html` en un navegador para verla moverse (no hay captura fija). En la real, la escena usa la foto del producto y las referencias de la tienda; la versión «después» es una ilustración (mismo producto con más luz y un fondo suave), no un retoque real. |
| `AdminFoto` | En el admin, el pedido de retoque con la marca de la tienda al lado (referencias, 3 palabras, lo que no quiere, Instagram) y el botón «Copiar instrucciones». |

En la bienvenida real, el dibujo usa **la foto del producto que se va a retocar** y **las referencias de la tienda**. Aquí son colores de ejemplo. **No son código para copiar**: se construye con `components/ui/` y los tokens del panel (docs/09). Las letras salen con fuente de reemplazo; las de verdad son Fredoka, Figtree y Caveat.
