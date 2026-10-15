# Landing · ajustes de Lewis tras la primera vista previa (14 oct 2026)

Lewis vio la primera versión (commit `43be8af`) en el navegador del iPhone. Lo que pide, más lo que Planning propone donde dejó un hueco. Si algo de aquí choca con el encargo o con `HANDOFF_DESLIZAPP.md`, **manda esto**.

Referencia de animación: `video-referencia-fotogramas.jpg` (fotogramas de un video de Lewis, 11 s, 2 fotogramas por segundo). Se toma de ahí:
- Los titulares grandes en Fredoka, de dos líneas («Te piden allá. / Te llega aquí.»), que entran **palabra por palabra pasando de borroso a nítido**, con un subtítulo corto debajo.
- El fondo de cada capítulo cambia de color a pantalla completa (naranja → verde → rosa), con formas suaves que asoman abajo.
- El contador de capítulo («03 / 06»).
- Las notificaciones que bajan desde arriba dentro del teléfono.
- El movimiento suave entre pantallas.

## Lo que pide Lewis
1. **El teléfono tiene que tener proporción de teléfono.** En el navegador del iPhone el marco no se parece a uno. Usa la proporción real (393×852, unos 19.5:9) y escálalo entero según el alto visible (`dvh`), sin estirarlo ni cortarlo.
2. **Quita la cabecera** («deslizapp» + «Demo»). En su lugar, arriba, un **botón flotante en píldora con ícono de saltar y el texto «Saltar»**. Lleva al cierre.
3. **Los textos que explican cada paso van abajo, en tarjetas**, no arriba. Entran con la animación de borroso a nítido del video.
4. **Del comprador al vendedor:** el teléfono de la compradora **sale de escena** (por un lado, o hacia atrás con desenfoque) y el de la tienda **entra**. Que se note que cambia la persona, no solo la pantalla. El fondo cambia de color como en el video: rosa para el comprador y verde para el vendedor (es la regla de marca de `docs/09`).
5. **El primer producto pasa sin like; el segundo sí.**
6. **El corazón es el hilo de toda la demo.** Representa el pedido, tanto para la compradora como para la tienda, así que siempre va por delante:
   - el ♥ del segundo producto cae en la bolsa;
   - la bolsa se abre y muestra ese mismo ♥ al lado, animado;
   - al enviar, el ♥ viaja al chat de WhatsApp y queda en el mensaje o en la vista previa del enlace;
   - de ahí pasa al seguimiento;
   - en el cambio de persona, el ♥ es lo único que cruza de un teléfono al otro;
   - en la tienda llega con la notificación de WhatsApp, y luego pasa a «¿Eres la tienda?», a la gestión y a «Despachar».
   - Que sea un solo elemento en una capa por encima de los teléfonos, con su posición calculada a partir del progreso del scroll. No es un ícono distinto en cada escena.
7. **Desenfoque progresivo arriba y abajo** de la pantalla, para que la demo se sienta más inmersiva. Usa el mismo patrón que el pie flotante del panel (#117 y #118), si sirve.
8. **Textos y transiciones más pulidos**, con la inspiración del video.

## Lo que propone Planning (Lewis lo puede cambiar)
- **El pedido queda con 2 productos.** La gorra pasa sin like; el termo y el tote sí (el ♥ del termo cae en la bolsa y el del tote se suma al mismo ♥, que crece o late con un «2»). Total **RD$1,500**. Así se ve que la compradora elige. Si el segundo like lo hace más largo, deja solo el termo y avisa.
- **El ♥ cambia de color con la persona:** rosa mientras es de la compradora y verde Bosque cuando llega a la tienda. Al despachar se convierte en un check o en un paquete. Ese es el cierre del recorrido.
- **«Entrar»:** al quitar la cabecera, va en el cierre junto a «Quiero vender» y «Ver un catálogo de ejemplo». «Saltar» lleva ahí. Quien ya tiene cuenta lo encuentra en dos toques.
- El contador de capítulo («01 / 06») puede ir pequeño, junto a «Saltar», si no estorba.
