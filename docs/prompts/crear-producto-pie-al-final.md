# Crear producto: los botones van al final del contenido, no fijos

Encargo de Planning, 12 oct 2026. Tu puesto es **Coding**. Parte de `main` actualizado (incluye #112 y #115).

## Decisión de Lewis
En la historia de crear producto, la barra fija de abajo («‹» + «Seguir» / «Listo» / «Publicar» + «Guardar sin publicar») **deja de estar fija**: va **al final del contenido de cada paso** y se desplaza con él.

## Alcance
- `components/catalogo/historia-producto.tsx`: el pie de la historia (hoy `HojaFijoAbajo`, ~línea 469, `data-pie-historia`) pasa a ser el último bloque del contenido de cada paso, incluida la pantalla de elegir la foto de un color (~línea 1013).
- `components/catalogo/inventario-historia.tsx`: el pie del Inventario (~línea 200, `data-pie-inventario`), igual.
- El detalle de una presentación (`hoja-presentacion.tsx`), solo si dentro de la historia usa pie fijo; en editar producto no cambia.
- **Nada más.** El resto de hojas de la app y editar producto siguen igual.

## Reglas
- Misma composición que hoy: «‹» (círculo de 52 px) a la izquierda del botón principal, apagado en el primer paso y oculto en la celebración. «Guardar sin publicar» y la pista «Agrega una foto para publicar · Volver a la foto» siguen debajo de «Publicar».
- Separación del contenido: 24 px arriba del pie, y el margen inferior respeta `--safe-abajo` (mínimo 24 px). Sin fondo ni sombra propios: es parte de la página.
- **Pasos cortos** (nombre, precio, cantidad…): el pie queda justo debajo del campo, no empujado al fondo de la hoja.
- **Teclado del iPhone** (`HANDOFF.md`): con el teclado abierto, el campo y su botón «Seguir» deben quedar a la vista; ajusta o quita el `scroll-padding` que hoy reserva la barra fija (~línea 275). Enter sigue avanzando donde ya lo hacía.
- Al cambiar de paso, el scroll vuelve arriba (como hoy) y el foco va al campo o al título del paso, no al pie.
- Pasos largos (Inventario con muchas filas, «Así se ve»): el pie aparece al terminar la lista; no añadas botones flotantes ni repetidos.

## Pruebas
Tipos, lint, `npm test`, build; `probar-crear-producto` (360/390/430, 360×640, movimiento reducido), `probar-presentaciones`, `probar-teclado`; ajusta las aserciones que suponían pie fijo. Capturas 390×844 de: nombre (con teclado si el script lo simula), precio, Inventario largo (arriba y al final), «Así se ve» con y sin foto, en `docs/capturas/crear-producto/pie-al-final/`. `docs/04-pantallas.md` al día. `lib/novedades.ts`: una línea corta en la versión siguiente.

## Entrega
PR contra `main` sin fusionar; Planning revisa y Lewis prueba en su iPhone. Avisa a Planning (`@parent`) con PR, HEAD, pruebas y lo no probado.
