# Handoff de implementación — Landing interactiva de Deslizapp

Fecha: 14 de octubre de 2026.
Este documento contiene las decisiones confirmadas por Lewis y una propuesta concreta para implementarlas. No depende del historial de esta conversación.

## 1. Objetivo y alcance

Crear una landing que explique el recorrido completo de un pedido en Deslizapp, desde el comprador hasta la tienda, mediante una demostración continua cuyo avance depende del desplazamiento del visitante.

Lewis confirmó esta interacción: el visitante desliza; los productos pasan como en el feed; se representa un me gusta y la incorporación de productos a la bolsa; la bolsa se abre; se envía visualmente el pedido a WhatsApp; se abre su enlace y aparece el seguimiento. Después se cambia al punto de vista de la tienda: recibe notificaciones de Deslizapp y WhatsApp, abre WhatsApp, entra al enlace y utiliza la opción de gestionar el pedido como tienda para acceder a la información necesaria para despacharlo.

La experiencia debe enseñar por qué ambas partes se benefician: comprar sin tanta vuelta y vender con más orden. Todo sucede con el mismo pedido.

Entregable: landing responsive funcional, con assets locales, animaciones vinculadas al scroll, contenido final y verificación en móvil y escritorio. Si existe un repositorio o una landing previa, inspeccionarlos antes de implementar e integrar el trabajo en la estructura existente. No crear una aplicación nueva por defecto cuando ya exista un proyecto.

## 2. Mecánica central, obligatoria

- El scroll de la página es el control de reproducción de la demostración.
- Al detener el scroll, la secuencia conserva exactamente su estado.
- Al desplazarse hacia arriba, la secuencia retrocede de forma coherente, incluidas las selecciones, los contadores, los mensajes y los cambios de pantalla.
- El visitante no necesita pulsar botones dentro de la demo. Las pulsaciones se representan visualmente y también dependen del scroll.
- Mantener un escenario visible mediante sticky durante la demo. Cada tramo de desplazamiento cambia su contenido, con continuidad espacial entre escenas.
- Los productos, botones y textos deben permanecer legibles. Usar parallax leve y animaciones que expliquen las acciones.
- En el recorrido principal no debe haber un video que se reproduzca automáticamente, una presentación que avance con temporizadores ni una sucesión de capturas estáticas.
- La bienvenida, el cambio de comprador a vendedor y el cierre forman parte del relato.
- Las interacciones reales de la página son navegar, saltar o reiniciar la demo y utilizar los CTA finales.

La demo representa un pedido ficticio. Mostrar las acciones de WhatsApp dentro de la página, sin enviar mensajes reales ni abrir aplicaciones externas durante la animación.

## 3. Assets y referencias

### Assets existentes según la conversación

Se generaron por separado una gorra verde, un termo rosado y un tote bag crema con verde, con fondo transparente. Sus archivos no están incluidos en este ZIP: deben adjuntarse a la sesión de coding o recuperarse del entorno autorizado. Verificar su existencia, transparencia y calidad antes de usarlos.

También se necesita reutilizar el logo o wordmark aprobado de Deslizapp y su paleta original. No se proporcionan valores hex exactos aquí: obtenerlos de los assets o del proyecto existente. No sustituir la identidad por una paleta nueva.

Referencia de video identificada: `ScreenRecording_10-13-2026 15-19-23_1(1).mp4`. ID de archivo en ChatGPT: `libfile_358fd2d33a44819188d497f73059cdf1`. Ese ID no es una ruta local. Recuperar el archivo si la sesión tiene acceso o solicitar que se adjunte. En la conversación se describió una referencia de la parte tienda que muestra inicio, catálogo, pedidos y clientes. El contenido del archivo no fue inspeccionado visualmente al escribir este handoff; no asumir que cubre todos los pasos. Revisar también los otros videos que Lewis adjunte.

### Qué construir en código

Feed, corazón, bolsa, contador, botones, textos, resúmenes, notificaciones, conversación de WhatsApp, preview del enlace, seguimiento del pedido y vista de gestión de la tienda. Crear componentes animables, con iconos vectoriales y texto real. Reutilizar los iconos y componentes existentes cuando estén disponibles. Un marco de teléfono, si se usa, puede construirse con CSS; no requiere una imagen nueva.

Derivar las miniaturas de las mismas tres imágenes originales. Para el preview del pedido utilizar una composición de sus miniaturas, hecha en código, consistente con la referencia de la aplicación.

No se ha identificado la necesidad de generar nuevas imágenes para este alcance. Eso presupone que los tres productos y el logo existentes están disponibles. Si falta alguno, comunicarlo con precisión; no afirmar que el paquete contiene esos assets ni reemplazarlos silenciosamente en el resultado final.

## 4. Pedido único para toda la historia

Usar estos datos ficticios como propuesta inicial, permitida por Lewis:

| Campo | Valor |
| --- | --- |
| Tienda | La Vuelta |
| Compradora | Ana |
| Pedido | DL-1042 |
| Gorra verde | 1 × RD$650 |
| Termo rosado | 1 × RD$950 |
| Tote bag crema y verde | 1 × RD$550 |
| Total de productos | RD$2,150 |
| Entrega | Por coordinar con la tienda |
| Estado inicial | Recibido |

Los nombres y precios son ficticios, no datos actuales de una tienda. No inventar costos de envío, pagos confirmados, números de teléfono reales ni una dirección personal. Mantener este objeto de datos como fuente única de precios, cantidades, miniaturas, mensajes y vistas. El enlace mostrado es ilustrativo y no debe apuntar a un pedido real.

## 5. Guion de escenas y transiciones

Los porcentajes son una propuesta de distribución del progreso de la demo, no medidas rígidas ni segundos. Ajustarlos tras comprobar legibilidad en teléfono.

| Progreso | Escena | Acción vinculada al scroll | Resultado visible |
| --- | --- | --- | --- |
| 0–7% | Bienvenida | Aparecen el saludo y el feed | “Hola, esto es Deslizapp.” / “Desliza y mira cómo funciona.” |
| 7–22% | Explorar | Pasan los tres productos verticalmente; aparece el gesto de me gusta | Sensación del feed real, nombres y precios claros |
| 22–31% | Bolsa | Se representan las selecciones y el movimiento de miniaturas hacia la bolsa; contador llega a 3 | Los tres productos pertenecen al mismo pedido |
| 31–43% | Revisar | La bolsa se expande y se muestran productos, cantidades y total; se representa la pulsación de enviar a la tienda | Pedido listo para compartir |
| 43–55% | WhatsApp del comprador | La interfaz cambia a una conversación con La Vuelta; aparece el mensaje y el enlace con preview de los productos | El pedido llega con la información organizada |
| 55–65% | Seguimiento del comprador | Se representa la apertura del enlace; aparece el pedido DL-1042 y su estado | La compradora puede volver al enlace para consultar el estado |
| 65–71% | Cambio de perspectiva | Transición de texto y de escenario | “Ahora te toca a ti, como tienda.” |
| 71–79% | Notificaciones de la tienda | Aparecen notificaciones de Deslizapp y WhatsApp para el mismo pedido; se abre visualmente la de WhatsApp | La tienda recibe la solicitud por ambas vías según el flujo confirmado |
| 79–86% | WhatsApp de la tienda | Se muestra el mensaje de Ana y se abre su enlace | Mismo número, productos y total |
| 86–91% | Seguimiento y acceso de tienda | Aparece la opción real equivalente a “¿Eres la tienda? Gestiona este pedido”; se representa su pulsación | Se accede a la vista correspondiente de la tienda |
| 91–97% | Gestión | Se muestran productos, cantidades, total y acciones para preparar o actualizar el pedido | La tienda tiene la información necesaria para despachar |
| 97–100% | Cierre | La demo da paso al mensaje final y CTA | “Comprar sin tanta vuelta. Vender con más orden.” |

### Fidelidad funcional

Lewis pidió una animación en la que el me gusta se relaciona visualmente con la bolsa. Antes de implementarla, verificar en el proyecto o en las referencias si el corazón guarda favoritos o agrega productos al pedido. Si son acciones distintas, mostrar el me gusta y luego la acción real de agregar a la bolsa dentro de la misma secuencia, conservando el movimiento hacia la bolsa. No enseñar una función inexistente.

El mensaje de WhatsApp debe utilizar la estructura real de Deslizapp cuando pueda obtenerse. Si no hay referencia suficiente, usar una composición provisional claramente identificada en las notas de entrega, con nombre de tienda, número de pedido, productos, cantidades, total y enlace. Mostrar un preview con miniaturas del pedido, porque Lewis destacó ese detalle como parte del valor del flujo.

La vista pública de seguimiento y la vista de gestión son distintas. Conservar la opción que permite a la tienda pasar a gestión. Respetar el acceso o autenticación real que aparezca en las referencias; no sugerir que cualquier visitante puede administrar pedidos.

## 6. Contenido y dirección visual

- Español dominicano natural, cercano y claro; evitar frases demasiado cursis y exceso de explicaciones.
- Marca Deslizapp con su paleta original y wordmark aprobado.
- Un producto protagonista a la vez dentro del feed. Datos y controles suficientemente grandes para teléfono.
- Mantener la identidad de La Vuelta dentro del catálogo ficticio y distinguirla de Deslizapp.
- Marcar con claridad el cambio de comprador a tienda; la etiqueta de tienda/vendedor puede usar el verde de marca.
- Evitar que el marco de un teléfono reduzca demasiado el tamaño del contenido en móvil. Priorizar la UI legible; en escritorio usar espacio lateral para frases breves.
- Las frases deben acompañar la acción. No convertir la demostración en un bloque de instrucciones ni una explicación técnica.

Copy propuesto para acompañar escenas: “Desliza. Encuentra. Pide.”; “Tu pedido, con todo en su sitio.”; “Abre el enlace y mira cómo va.”; “Te llega organizado. Tú te encargas de prepararlo.”

Cierre con dos rutas propuestas: “Quiero comprar” y “Quiero vender”. Conectarlas a destinos verificados del proyecto. Si todavía no existen, entregar una ruta funcional de información o registro acorde al proyecto y documentar el pendiente; no colocar enlaces vacíos.

## 7. Implementación recomendada

1. Inspeccionar repositorio, instrucciones del proyecto, stack, estilos, componentes, identidad y assets. Crear un inventario breve de referencias disponibles y faltantes.
2. Definir el objeto único del pedido y componentes para catálogo, bolsa, WhatsApp, seguimiento, notificaciones y gestión.
3. Implementar primero todo el recorrido con contenido legible, luego vincular las transiciones al progreso del scroll.
4. Calcular un progreso normalizado de la demo a partir del desplazamiento del contenedor. Cada escena y subacción debe ser una función de ese progreso; usar interpolaciones y ventanas de entrada/salida.
5. Emplear la solución de animación ya instalada. Si no existe, elegir una apropiada al stack; no agregar varias librerías para resolver el mismo problema.
6. Priorizar transform y opacity. Evitar re-renderizar toda la página con cada pixel de scroll. Precargar las tres imágenes y evitar cambios de tamaño cuando carguen.
7. Construir el resto de la landing alrededor de la demo: encabezado simple, bienvenida, cierre y CTA. Mantener el alcance centrado en este recorrido.

Separar datos, componentes y definiciones de escenas para poder ajustar la duración de cada tramo sin rehacer la UI. Evitar una implementación monolítica con decenas de condiciones dispersas.

## 8. Responsive, accesibilidad y movimiento

- Probar al menos móvil estrecho, móvil grande y escritorio.
- Usar la altura visible dinámica cuando corresponda; considerar la barra del navegador y las áreas seguras. No cortar el total, los mensajes ni los CTA.
- El scroll debe pertenecer a la página. Evitar que un panel interno o el teléfono simulado atrapen el gesto.
- Mantener desplazamiento natural sin forzar cada gesto a una escena ni impedir volver atrás.
- Proporcionar “Saltar demo” y una forma de volver a verla.
- Con prefers-reduced-motion, presentar una versión secuencial legible que conserve la historia y elimine el parallax y los movimientos grandes.
- Preservar controles de navegación por teclado, contraste adecuado y texto accesible. Los controles simulados no deben confundirse con acciones reales que el visitante necesite pulsar.
- Si JavaScript falla, debe seguir siendo posible entender la propuesta y acceder a los CTA.

## 9. Criterios de aceptación

- [ ] La animación avanza, se pausa y retrocede según el scroll; no continúa sola al detenerse.
- [ ] El recorrido incluye todos los pasos del comprador y de la tienda definidos en la tabla.
- [ ] Se ve el me gusta y la incorporación a la bolsa con la semántica real de la app.
- [ ] Los tres productos, el número DL-1042 y RD$2,150 permanecen iguales en todas las escenas.
- [ ] El enlace del pedido muestra un preview con los productos y conduce visualmente al seguimiento.
- [ ] La tienda recibe ambas notificaciones, abre la de WhatsApp y accede al pedido desde su enlace.
- [ ] La vista de gestión muestra información suficiente para preparar el pedido y respeta el acceso real de tienda.
- [ ] No se envían mensajes ni se crean pedidos reales durante la demo.
- [ ] En móvil los textos se leen sin zoom y los elementos principales permanecen dentro de la pantalla.
- [ ] Los assets cargan correctamente, sin placeholders permanentes ni logo inventado.
- [ ] Funcionan el salto de demo, el regreso al inicio y los CTA finales.
- [ ] Se verifican el recorrido hacia delante y hacia atrás, cambios de viewport y reducción de movimiento.
- [ ] La entrega identifica cualquier pantalla provisional por falta de referencia, sin presentarla como copia exacta de la app.

## 10. Entrega de la sesión de coding

Completar implementación y comprobación visual según las herramientas disponibles. Entregar la versión que pueda abrirse o previsualizarse, resumir qué se implementó y señalar solo pendientes concretos. Para publicar, seguir las instrucciones y autorizaciones del entorno seleccionado. Este handoff no solicita cambios al backend, envíos de WhatsApp ni pedidos reales.

No detener el trabajo para preguntar por detalles que ya tienen una propuesta en este documento. Avanzar con los datos ficticios establecidos y pedir ayuda únicamente cuando falte un asset o una referencia que impida completar un requisito con fidelidad.
