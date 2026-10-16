# Círculo Deslizapp: pantalla de bienvenida en la app, y las animaciones que faltan

Encargo de Planning, 16 oct 2026. Aprobado por Lewis el 16 oct 2026. **Va después de que se fusione el PR #139**, que crea el aro, `LogoTienda` con `animacion` y la tarjeta del menú. Tu puesto es **Coding** (Sonnet, salvo que Lewis diga otra cosa). **Sustituye a `docs/prompts/animacion-aro-circulo.md`**, que ya no se lanza.

**Diseño:** `referencias/circulo/tarjeta-planes.dc.html`. Era la tarjeta de `/planes`: Lewis decidió que esa información va dentro de la app, no en la página de precios. También `referencias/circulo/LEEME.md` (aro, animaciones A y C). **No copies su HTML.**

## 1. La bienvenida
- **Cuándo se ve:**
  - La primera vez que **la titular** de una suscripción del Círculo abre el panel después de entrar. Las colaboradoras no la ven: el 30 % y «Habla directo con Lewis» son de quien paga.
  - Se ve una vez por titular y dispositivo. Guárdalo en `localStorage` con try/catch; si falla, mejor no mostrarla que mostrarla cada vez.
  - Si la titular tiene varias tiendas, se ve una sola vez, no una por tienda.
- **Qué es:** una pantalla completa crema por encima del panel. Puede ser una hoja a pantalla completa, con la misma entrada que las hojas de la app. De arriba abajo:
  1. El aro grande (unos 120 px), con la animación **A** de entrada y luego las **ondas C** en bucle.
  2. «ERES DEL CÍRCULO», en Figtree 700, 12 px, `.22em`, mayúsculas.
  3. «Llegaste primero.<br>Te toca más.», en Fredoka 700, unos 34 px.
  4. «Como los Close Friends de Instagram, pero con beneficios.», a mano (Caveat 700, unos 27 px, `#C24E18`).
  5. El cupón `TicketPromo` de la app, como lo dejó #139: «30 %» / «DE DESCUENTO» / «Círculo Deslizapp» / título «En tu plan anual» / «Tu primer año» / «Al pagar el año».
  6. Los cuatro beneficios con su recuadro rosa claro, como en #139: chispa, bolsa, WhatsApp y corazón.
  7. El botón «Entrar», en bosque y a todo el ancho, que cierra la pantalla.
- **Al cerrar:** el avatar del encabezado del panel hace una vez la animación **A** («salen desde el centro»), como si el aro llegara a su sitio. Después queda quieto.
- **Movimiento reducido:** todo quieto; se ven el aro y el sello terminados.

## 2. Tarjeta verde del menú de la tienda
- Ya existe por #139. El aro de la tarjeta lleva las **ondas C** en bucle mientras el menú está abierto, con pausa cuando no está a la vista.
- El texto del descuento dice «30 % menos en tu primer año anual».

## 3. Reglas
- Solo CSS con `transform` y `opacity`, usando la propiedad `animacion` de `LogoTienda`.
- Las ondas no se recortan.
- El precio anual del Círculo, si aparece, sale de la base: `round(12 × precio mensual × 0,7)`. Nunca se escribe en el código.

## Pruebas
- Tipos, lint, `npm test` y build.
- Tests:
  - la bienvenida se ve una sola vez para la titular y nunca para una colaboradora;
  - con movimiento reducido no hay animación;
  - al cerrar, la animación A del encabezado no se repite al recargar.
- Video corto a 393 de la bienvenida y del cierre con la A, y capturas a 393 y 360.

## Entrega
PR contra `main`, sin fusionar: Planning revisa y Lewis prueba en su iPhone. Añade «Qué probar en tu iPhone». Avisa a Planning al abrir el PR y al terminar.
