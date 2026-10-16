# Círculo Deslizapp · el aro

Aprobado por Lewis el 16 oct 2026 en el lienzo [Círculo Deslizapp · aro](https://claude.ai/artifact/8XhnFSWmkepBc7Dkwpa3f6), que es privado de Lewis. Decisiones de producto: `docs/14-precios-y-lanzamiento.md` («Círculo Deslizapp»).

**Opción elegida: la 6** de `opciones-aro.dc.html`.
- **Aros pegados alrededor del avatar:** por dentro, un aro mandarina (`#FF834F`); en medio, uno rosa (`#F5C9D6`); por fuera, uno verde (`#174B3A`). Cada uno de ~4 px en el avatar grande; en el avatar de 42 px del panel se reducen en proporción, de 1.5 a 2 px cada uno. Entre la foto y el primer aro va un borde crema (`#FFF9EE`).
- **El sello:** un círculo verde (`#174B3A`) con el corazón del «aaah» en rosa (el mismo trazado que el icono `heart` del catálogo). Lleva un borde crema y va montado sobre el trazo de los aros, abajo a la derecha (a unos 45°): queda medio sobre los aros y medio sobre la foto, sin tapar las iniciales. Mide ~34 px en el avatar grande y ~18-20 px en el del panel.
- Se descartaron la estrella y los aros dentro del sello.

`panel-con-aro.dc.html` muestra el panel con el aro y la tarjeta del Círculo en el menú de la tienda. Ahí el ajuste «Aro» trae otras combinaciones de colores, que son anteriores a la decisión. La tarjeta verde del menú sí está aprobada: «eres del Círculo Deslizapp», «Fundadora desde …», el 30 % con su fecha de fin, los beneficios y «El aro es tuyo para siempre».

Son archivos de Claude Design: sirven para leer medidas y colores, **no se copia su HTML**.

## Animaciones del aro (aprobadas por Lewis, 16 oct 2026)
Del lienzo [Círculo Deslizapp · animaciones del aro](https://claude.ai/artifact/Nx3kYyCfoWaAoC9N8GPhs5), también privado. Se eligieron dos:
- **A · Salen desde el centro** (`animacion-a-salen.dc.html`): para donde el movimiento **no** debe seguir. Los aros salen de detrás de la foto uno tras otro, de dentro hacia fuera (mandarina, rosa y verde), con un pequeño rebote; al final salta el sello del corazón. Dura ~1,4 s y se queda quieto.
- **C · Ondas que no paran** (`animacion-c-ondas.dc.html`): para donde el movimiento **sí** es continuo. Hace la entrada de A y después, desde el centro, siguen saliendo ondas (una mandarina, una rosa y una verde, cada 0,8 s) que crecen hasta ~1,45 veces y se desvanecen por fuera, en un ciclo de 2,4 s.
- Se descartaron B (colores que se intercambian), D (latido) y E (se dibujan).

## Tarjeta del Círculo en `/planes` (idea de Lewis, aprobada el 16 oct 2026)
`tarjeta-planes.dc.html` (tablero «NUEVA · Tarjeta del Círculo en /planes» del lienzo de animaciones) sustituye la tarjeta de fundadoras anterior. Es una tarjeta crema dentro de la página verde. De arriba abajo:
1. El aro con la animación C.
2. «PARA LAS PRIMERAS TIENDAS».
3. «Llegaste primero. Te toca más.» (Fredoka).
4. «Como los Close Friends de Instagram, pero con beneficios.» a mano (Caveat, mandarina oscuro `#C24E18`).
5. El bloque rosa «30 % menos / en tu plan durante el primer año / Después de tu prueba.».
6. Cuatro beneficios con su icono en un recuadro rosa claro.
7. El botón «Quiero ser parte» y debajo «Por invitación, mientras haya lugar.».

La nota de abajo cambió respecto a la idea de Lewis («Al crear tu tienda, entras al Círculo.») porque `docs/14` dice que se entra por invitación de Lewis y con cupo.

**Cambio del 16 oct 2026 (Lewis):** esta tarjeta sale de `/planes` y pasa a la pantalla de bienvenida dentro de la app (`docs/prompts/circulo-bienvenida.md`). En `/planes` queda solo una cinta con los colores del Círculo en cada plan cuando se elige «Anual».
