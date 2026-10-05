# Evidencia real — espera y likes dentro de foto

Capturas de Chromium local sobre el build, fixtures DEMO separados. 360/390/430, claro/oscuro (oscuro con movimiento reducido). Se comprimieron a WebP, sin retoques. Ningún aviso real fue creado o marcado; WhatsApp se sustituyó por una ventana simulada, nunca se envió.

- `catalogo-ANCHO-TEMA`: tarjetas completas de la tienda, likes en foto y espera/stock/visibilidad independientes.
- `tarjeta-0..3-ANCHO-TEMA`: tarjeta completa individual; 0/1/cifra larga/oculto+agotado. El número largo puede ocupar dos líneas dentro de la foto, sin reducir excesivamente letra ni invadir otra etiqueta.
- `vista-espera-ANCHO-TEMA`: lista interna con cantidad provisional conservada detrás.
- `inicio-390-TEMA`: aviso separado de pedidos, personas/productos distintos.
- `variantes-390-TEMA`: dos variantes, únicamente la disponible permite Avisar.
- JSONs: seis contextos móviles y tres escenarios de errores simulados. Resultados completos y límites: [validación](../../validacion-espera-catalogo.md).

Estas imágenes no prueban Safari físico, Supabase real ni envío por WhatsApp. La URL exacta del nuevo despliegue figura en el PR #47; la preview anterior no contiene este seguimiento.
