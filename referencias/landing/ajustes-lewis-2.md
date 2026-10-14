# Landing · ajustes de Lewis, ronda 2 (14 oct 2026)

Lewis vio la versión del commit `eca5762`. Si algo de aquí choca con `ajustes-lewis-1.md`, con el encargo o con el handoff, **manda esto**.

## 1. Componentes reales de la app, no redibujados
El encargo decía «las vuelves a dibujar… no incrustes la app real». **Eso era un error de Planning y queda anulado.** El like y la bolsa de la demo no se parecen a los de la app, y Lewis quiere que sean los mismos.

- Usa los **componentes reales** con datos de ejemplo, sin red, sin pedidos y sin escribir nada:
  - el **`Reel`** (`components/tienda/reel.tsx`), con su like real: el corazón «Lo quiero» y el doble toque, más `aaah` y `lanzarBurst`. Es la misma animación que ve la compradora;
  - la **bolsa tal como se ve en el catálogo**: el botón con su contador (`catalogo.tsx`) y la hoja del pedido (`HojaPedido` en `hojas-compra.tsx`);
  - el seguimiento (`pedido-comprador.tsx`), «¿Eres la tienda?» (`components/pedido-catalogo/tienda-en-pedido.tsx`) y la gestión del panel de Pedidos.
- El precedente es **`components/tienda/vista-previa-reel.tsx`** con `app/vista-previa-reel/page.tsx` y `reel-solo.css`: pinta el Reel real (con `catalogo.css`, el tema y la cabecera) a partir de datos de ejemplo, en su propia página para no pisar estilos ni el scroll. Sigue ese patrón: dentro del marco del teléfono, un iframe o un contenedor aislado.
- Si un componente necesita un cambio pequeño para funcionar en modo demo (por ejemplo, una prop `demo` o que no escriba en `localStorage`), hazlo **sin cambiar lo que ve una persona en la app**, y explícalo en el PR.
- El ♥ que viaja entre escenas (punto 6 de `ajustes-lewis-1.md`) sigue siendo una capa por encima. Arranca donde termina el burst real y cae en el botón real de la bolsa.
- WhatsApp no es de la app: ese chat sí se dibuja. Su vista previa usa la imagen real de `/pedido/<código>`.

## 2. Burbujas de chat de WhatsApp en lugar de tarjetas
- Los textos que explican cada paso dejan de ser tarjetas abajo. Ahora son **burbujas de chat al estilo de WhatsApp**: esquina con cola, hora pequeña y doble check.
- Aparecen **en el centro de la pantalla**, delante o al lado del teléfono, y **se deslizan hacia arriba** como en un chat. La anterior sube y se desvanece al llegar la siguiente.
- El texto de cada burbuja entra **con el mismo efecto del video**: palabra por palabra, de borroso a nítido.
- Planning decide: las burbujas son de Deslizapp, que le cuenta la demo a quien la ve. Quedan a la izquierda y en blanco, como un mensaje recibido. Si una burbuja es de la compradora o de la tienda, va a la derecha y en verde WhatsApp.
- El desenfoque progresivo de arriba y de abajo se mantiene.

## 3. Scroll por pasos, tipo snap
- Ya no es un scrub continuo, cuadro por cuadro. **Cada deslizamiento lleva a un paso concreto** de la demo, y la animación de ese paso **se completa sola**: el like entero, el ♥ que cae en la bolsa y la burbuja escrita del todo. **Nunca queda un texto a medio generar.**
- Al subir, se vuelve al paso anterior, con su animación al revés.
- Técnica sugerida:
  - un paso por sección de la página, con `scroll-snap-type: y mandatory` y `scroll-snap-stop: always`, para que un deslizamiento fuerte no se salte pasos;
  - el paso activo se detecta con `IntersectionObserver`;
  - cada paso dispara su animación con tiempo propio, no ligado al scroll.
  - Elige lo que funcione mejor en el iPhone, sin atrapar el gesto y con `100dvh`.
- La tabla de `lib/landing/escenas.ts` pasa a ser **una lista de pasos**: cada uno con su burbuja, el estado del teléfono y la duración de su animación. Así Lewis puede pedir cambios de ritmo.
- Con movimiento reducido, cada paso muestra su estado final sin animación.
- «Saltar» y el contador («03 / 06») se mantienen.

## 4. «Entrar»
Va en el cierre, junto a «Quiero vender» y «Ver un catálogo de ejemplo». «Saltar» lleva ahí. Es la propuesta de la ronda 1; Lewis puede pedir moverlo.

## Pruebas
- Actualiza `probar-landing`:
  - avanzar paso a paso y comprobar que en cada paso la burbuja está completa y nítida, y que el estado del teléfono es el correcto (contador de la bolsa, total, número de pedido);
  - retroceder un paso;
  - un deslizamiento fuerte no se salta pasos;
  - movimiento reducido.
- Vuelve a hacer las capturas de `docs/capturas/landing/`.
- Comprueba que el catálogo real, `/vista-previa-reel` y el pedido del comprador se ven igual que antes.
