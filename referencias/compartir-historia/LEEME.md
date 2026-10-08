# Compartir en historia (Lewis, 8 oct 2026)

Lienzo: https://claude.ai/artifact/Q3pSXoVnUaVv28gip7ySJS. Dibujos de jerarquía y estilo; no copiar el HTML.

**Fase 1 (ahora): compartir sin stickers.** Pantallas 1, 2 (sin la fila de stickers), 3–5 (sin stickers) y 6.
**Fase 2 (después): stickers** (formas según el texto: estrella «¡Nuevo!», sello «-20%», cinta, etiqueta «Últimas 2», globo «Por encargo», corazón deslizapp; borde blanco y sombra; inclinados), los propios de la tienda y el paquete por créditos (pantalla 7). Precio, cantidad y plazo del paquete: por decidir.

Decisiones:
- Botón redondo con el ícono de historia **arriba a la derecha de cada producto** en la pestaña Catálogo (vidrio oscuro para verse sobre cualquier foto).
- La imagen **no** lleva logo ni nombre de la tienda arriba (WhatsApp e Instagram ya los muestran).
- Tarjeta inferior: nombre, precio (con promo: precio tachado), presentaciones (colores como puntos, tallas como pastillas) y «Pídelo en mi catálogo» con la dirección; a la izquierda la **foto de la tienda en círculo** con la miniatura de deslizapp en la **esquina inferior derecha**, separada por un **recorte** (se ve el fondo), sin borde blanco. Sin código QR.
- Compartir: WhatsApp con el ícono de estado (círculo con cámara y «+») en verde; Instagram con el círculo punteado y «+». En WhatsApp el enlace va en el texto; en Instagram se copia para pegarlo con el sticker «Enlace».

## Stickers, versión corta (PR #81, 8 oct 2026)

Entró una versión corta de la fase 2, **sin** stickers propios ni paquete por créditos:
- Fila «Stickers» en la hoja «Tu historia», dibujados como stickers (borde blanco grueso, sombra, inclinados), con check cuando están puestos.
- **«¡Nuevo!»** (estrella naranja): marcado de entrada si el producto se creó hace 7 días o menos.
- **«Últimas N»** (etiqueta colgante amarilla, con el stock real; «Última unidad» con 1 y «Últimas unidades» sin número): marcado de entrada con stock de 1 a 3; no se ofrece agotado ni por encargo.
- **Corazón de «aaah» de deslizapp** (corazón rosa): nunca marcado de entrada.
- Posiciones por defecto arriba (sin tapar la tarjeta ni el centro). En «Ajustar foto» se arrastran con un dedo y se pellizcan para cambiar el tamaño. La imagen final los dibuja con el mismo mapa de bits que la vista previa.
- La miniatura de la esquina de la foto de la tienda ya no es la «d» con flecha: es el corazón de los «aaah» sobre el rosa de la marca, con el mismo recorte.
- Siguen para la fase 2 completa: «-20%», «Por encargo», stickers propios y paquete por créditos. Código: `lib/stickers-historia.ts` (lógica), `lib/dibujo-stickers-historia.ts` (dibujo).
