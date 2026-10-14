# Landing · ajustes de Lewis, ronda 4: la burbuja como en WhatsApp (14 oct 2026)

Lewis grabó WhatsApp en su iPhone para mostrar cómo se ven y cómo se mueven las burbujas. Dice que en la landing no se ven así. Esto se suma a la ronda 3 y, para las burbujas, **manda sobre todo lo anterior** (incluso sobre «Deslizapp a la izquierda y en blanco» de la ronda 2).

Fotogramas:
- `burbuja-whatsapp-envio.jpg`: el momento del envío, a 20 cuadros por segundo, de izquierda a derecha y de arriba abajo.
- `burbuja-whatsapp-secuencia.jpg`: la grabación completa, a 6 cuadros por segundo, con dos mensajes enviados.

## La forma (copiarla de WhatsApp en iOS)
- **Burbuja de mensaje enviado:** va a la **derecha**, **verde WhatsApp** y con **la cola abajo a la derecha**. Tiene esquinas muy redondeadas (unos 18 px) y el ancho del texto, con un máximo de unos ¾ de la columna.
- **La hora y el doble check azul** van **dentro de la burbuja**, abajo a la derecha y en línea con la última línea del texto, como en el video («08:48 ✓✓»).
- Letra del sistema (SF / `-apple-system`), en tamaño de mensaje y sin negritas de titular. No va en Fredoka ni con la segunda línea en otro color. Si la burbuja trae `remate`, va en la misma burbuja, como segunda frase, o en una segunda burbuja seguida. La segunda burbuja seguida no lleva cola, como en WhatsApp.
- Colores del modo oscuro de WhatsApp, como en el video: verde oscuro y texto blanco. El fondo de la landing sigue siendo el de cada capítulo. Si sobre rosa o verde no se lee bien, propón el verde claro del modo claro y muéstralo en el PR.
- Quedan con el tamaño más grande que pidió la ronda 3.

## La animación (la del video)
1. La burbuja nueva **nace pequeña abajo a la derecha**, donde estaría el botón de enviar (más o menos al 30 % de su tamaño).
2. **Crece hasta su tamaño y sube a su sitio** en un solo movimiento rápido y suave, de unos 250 a 350 ms y con algo de rebote.
3. **Las burbujas anteriores suben** lo que ocupa la nueva, como un chat que se desplaza. La más vieja se desvanece al salir por arriba.
4. El texto **no** se desenfoca ni aparece palabra por palabra: entra ya escrito dentro de la burbuja que crece.
- Al subir un paso, se hace lo mismo al revés: la última burbuja se encoge hacia abajo a la derecha y las demás bajan.
- Con movimiento reducido, la burbuja aparece en su sitio, sin animación.
- Opcional, si queda bien: antes de la burbuja, tres puntos de «escribiendo…» durante unos 400 ms en los pasos largos. Si alarga demasiado el paso, no lo pongas.

## Pruebas
- Captura a 393×852 de un paso con dos o tres burbujas, al lado de `burbuja-whatsapp-envio.jpg`, en el PR.
- `probar-landing`:
  - la burbuja del paso termina con escala 1, en su sitio y completa;
  - al retroceder, se quita.
