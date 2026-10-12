# Crear producto: botones flotantes con desenfoque progresivo (sin recuadro)

Encargo de Planning, 12 oct 2026. Tu puesto es **Coding**. Parte de `main` actualizado (incluye #112, #115 y #116 si ya se fusionó).

> Versión anterior de este archivo: «botones al final del contenido». Lewis la cambió por esta. **Si al probarla no lo convence, el plan B es ponerlos al final del contenido** (ver «Plan B» abajo); no lo hagas ahora.

## Decisión de Lewis
En la historia de crear producto, la barra de abajo («‹» + «Seguir» / «Listo» / «Publicar» + «Guardar sin publicar») **sigue siempre a la vista**, pero **sin el recuadro de fondo**: los botones flotan y, detrás de ellos, el contenido se difumina con un **desenfoque progresivo como el de la cabecera de las hojas**, pero al revés (más fuerte abajo, nada arriba).

## Alcance
- `components/catalogo/historia-producto.tsx`: el pie de la historia (`HojaFijoAbajo`, `data-pie-historia`, ~línea 469), incluida la pantalla de elegir la foto de un color (~línea 1013).
- `components/catalogo/inventario-historia.tsx`: el pie del Inventario (`data-pie-inventario`, ~línea 200).
- El detalle de una presentación (`hoja-presentacion.tsx`) **solo** cuando se abre desde la historia, si usa pie fijo.
- **Nada más.** El resto de hojas de la app y editar producto siguen igual.

## Cómo
- **Reutiliza el borde de la cabecera** (`.hoja-borde` en `app/globals.css`, ~línea 257): 4 capas de `backdrop-filter` (1, 2, 4 y 8 px) con máscaras por franjas y un degradado Papel Cálido. Crea la variante invertida (p. ej. `.hoja-borde-abajo`, rampa `to bottom`, el desenfoque mayor y el crema 0.94 **abajo**, 0 arriba) en vez de duplicar. Mismas reglas: la opacidad va en cada capa, no en el contenedor; sin `backdrop-filter`, solo el degradado; con «reducir transparencia», fondo sólido.
- Alto de la zona difuminada: el del pie + ~24 px por encima, para que la transición empiece antes de los botones.
- **Quita** el `bg-fondo` sólido del pie (hoy `bg-fondo px-5 …`). Los botones conservan su propio fondo: el principal relleno y «‹» como círculo de 52 px con fondo de superficie y su borde.
- **Legibilidad de lo que es solo texto** («Guardar sin publicar», «Agrega una foto para publicar · Volver a la foto»): debe leerse sobre cualquier contenido. Comprueba el contraste con contenido oscuro detrás (foto) y, si no llega a AA, sube la densidad del crema en esa franja o dale una píldora suave; dime qué elegiste.
- **Nada tapado:** el contenido de cada paso termina con un espacio igual al alto del pie, para que lo último suba por encima de los botones. El `scroll-padding` del campo enfocado (~línea 275) sigue contando el pie.
- **Teclado del iPhone** (`HANDOFF.md`): con el teclado abierto, el pie queda justo encima del teclado como hoy y el campo enfocado se ve completo.
- **Barra de Safari (iOS 26):** Safari tiñe su barra de abajo según lo que toca el borde inferior. El final del degradado es Papel Cálido (`--fondo`), así que no debería ensuciarla; compruébalo en lo que puedas y déjalo anotado como «a validar en iPhone».
- Movimiento: nada nuevo animado; si el blur aparece/desaparece, solo `opacity`.
- Misma composición de hoy: «‹» a la izquierda del principal, apagado en el primer paso, oculto en la celebración.

## Pruebas
Tipos, lint, `npm test`, build; `probar-crear-producto` (360/390/430, 360×640, movimiento reducido), `probar-presentaciones`, `probar-teclado` (su «Minimizar» ya falla en main). Ajusta las aserciones del pie. Comprueba con el script que el último elemento de cada paso queda por encima del pie al final del scroll. Capturas 390×844 en `docs/capturas/crear-producto/pie-flotante/`: precio (con teclado si el script lo simula), «Así se ve» con foto (contenido oscuro detrás del pie), «Así se ve» sin foto (con la pista), Inventario largo a mitad de scroll y al final. `docs/04-pantallas.md` y `docs/09` (la variante del borde) al día. `lib/novedades.ts`: una línea corta en la versión siguiente.

## Plan B (solo si Lewis lo pide después)
Pie al final del contenido de cada paso, sin fijar ni flotar, 24 px bajo el contenido y respetando `--safe-abajo`.

## Entrega
PR contra `main` sin fusionar; Planning revisa y Lewis prueba en su iPhone. Avisa a Planning (`@parent`) con PR, HEAD, pruebas y lo no probado.
