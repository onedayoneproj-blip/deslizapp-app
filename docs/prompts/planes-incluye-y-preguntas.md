# /planes: «Todos los planes traen» con vista previa y preguntas frecuentes en chat

Encargo de Planning, 16 oct 2026. Lewis aprobó la idea de las dos piezas el 16 oct 2026; dos respuestas esperan su confirmación (ver abajo). **Va después de que se fusione el PR #139**, porque cambia la misma página. Tu puesto es **Coding** (Sonnet, salvo que Lewis diga otra cosa).

**Diseño:** lienzo [Planes de Deslizapp · página](https://claude.ai/artifact/HLYkbe8yyF8Z8qfA2Sn75o), tableros D y E2. Hay copias en `referencias/planes/`: `incluye-con-vista-previa.dc.html` y `preguntas-frecuentes-chat.dc.html`. Son prototipos: **no copies su HTML ni sus dibujos.** Cada vista previa se hace con los componentes reales de la app (lo pidió Lewis).

## 1. «Todos los planes traen» con vista previa
- **Carrusel horizontal** con `scroll-snap`: una tarjeta crema a la vez (unos 300 px de ancho), la siguiente asomando, y los puntos debajo.
  - Cada tarjeta tiene arriba la vista previa (unos 250 px) y abajo el icono, el título y una línea.
  - Las vistas previas son decorativas (`aria-hidden`): el texto de abajo dice lo mismo.
  - Sin iframes ni video. La página no puede ponerse lenta.
- **Las cuatro tarjetas:**

  | # | Título | Línea | Vista previa, con piezas reales |
  |---|---|---|---|
  | 1 | Tu catálogo en el link de tu bio | Tus clientes lo abren desde tu perfil, sin descargar nada. | El perfil de la tienda con el enlace `deslizapp.com/tutienda` en la bio. Es la pantalla `perfil` de `docs/prompts/conoce-portada-narrativa.md` (`referencias/landing/conoce-narrativa/Perfil.dc.html`): si ya existe, reúsala; si no, créala como componente compartido para que «Cómo funciona» la use después. |
  | 2 | Pedidos por WhatsApp | Te llega completo: qué quiere, cuánto y a quién se lo mandas. | El mensaje del pedido tal como lo genera el catálogo (la misma función que arma el texto de WhatsApp), con las burbujas de «Cómo funciona» (§3). |
  | 3 | Panel de pedidos y existencias | Cada pedido con su estado, y sabes cuánto te queda. | Filas reales de la lista de pedidos y de existencias, con datos de ejemplo y sin acciones. |
  | 4 | Clientes, abonos y lo pendiente | Quién te debe y cuánto, sin libreta. | La ficha o fila real de un cliente con su abono y lo pendiente, con datos de ejemplo. |

- Si un componente real necesita datos de la base o del contexto del panel, pásale datos de ejemplo por propiedades. No hagas una copia dibujada. Si hace falta tocar un componente del panel, que sea con propiedades opcionales y sin cambiar cómo se ve allí.

## 2. Preguntas frecuentes en chat (opción E2)
- **Dónde:** después de la tarjeta del Círculo y antes de los botones de abajo. Lleva «¿dudas?» a mano y el título «Pregúntanos».
- **Un chat:** arriba, una barra con el icono de la app, «Deslizapp» y «Preguntas frecuentes». Empieza con un mensaje recibido: «¡Hola! 👋 ¿Qué quieres saber? Toca una pregunta.».
- **Las preguntas, como respuestas rápidas abajo:**
  - Al tocar una, sale como mensaje enviado.
  - Aparece «escribiendo…» (tres puntos, unos 650 ms) y llega la respuesta como mensaje recibido.
  - Esa pregunta desaparece de las rápidas. Cuando no quedan, se ve solo el aviso del final.
- **Las burbujas son las de «Cómo funciona»** (Lewis lo pidió expresamente). Es la forma de `Burbuja` en `components/landing/landing.tsx` y `landing.css` (`.lt-burbuja`, `.lt-burbuja-cola`, la hora con el doble check):
  - Sácala a un componente compartido.
  - Los mensajes enviados son verdes (`#D9FDD3`), en Fredoka, con la cola de una pieza abajo a la derecha. Los recibidos son la misma forma reflejada: blancos y con la cola abajo a la izquierda.
  - Como en WhatsApp, solo el último mensaje de cada grupo lleva cola.
  - La landing tiene que verse **exactamente igual**: corre `probar-landing` y compara sus capturas.
- **Accesibilidad y buscadores:**
  - Las respuestas que llegan se anuncian (`aria-live="polite"`).
  - Las preguntas rápidas son botones de al menos 44 px de alto.
  - Todas las preguntas con sus respuestas están también en el HTML: datos estructurados `FAQPage` y una lista oculta a la vista pero legible por lectores de pantalla. Así Google y quien no toque nada las tienen.
- **Movimiento reducido:** sin «escribiendo…» ni rebote; la respuesta aparece directamente.
- **Al final:** «¿Otra pregunta? Escríbenos por Instagram.» con el botón al `ENLACE_QUIERO_VENDER`. Es Instagram y no WhatsApp: el número de Lewis es personal.
- **Textos:** los del tablero E2, con estas dos excepciones:
  - **«¿Qué pasa cuando terminan los 30 días?» y «¿Cobran comisión por cada venta?» no se publican hasta que Lewis confirme sus respuestas.** Planning te avisará. Mientras tanto, déjalas fuera de la lista.
  - Las preguntas viven en un archivo de datos (`lib/planes/preguntas.ts`), no repartidas por el componente.

## Pruebas
- Tipos, lint, `npm test` y build.
- `probar-landing`: las burbujas de «Cómo funciona» no cambian.
- Tests:
  - tocar una pregunta la envía y muestra la respuesta;
  - con movimiento reducido no hay «escribiendo…»;
  - el `FAQPage` tiene las mismas preguntas que el chat.
- Capturas a 393 y 360: el carrusel en cada tarjeta, y el chat al empezar, con dos preguntas hechas y con todas.

## Entrega
PR contra `main`, sin fusionar: Planning revisa y Lewis prueba en su iPhone. Añade «Qué probar en tu iPhone». Avisa a Planning al abrir el PR y al terminar.
