# Crear producto: la foto se elige tocando el recuadro, y la hoja sin scroll

Encargo de Planning, 12 oct 2026. Tu puesto es **Coding**. Parte de `main` actualizado (incluye #112, #115–#117).

## 1. El recuadro de la foto abre el menú nativo (Lewis)
Hoy, en el paso de la foto, sin fotos hay dos botones: «Tomar foto» (input con `capture="environment"`, abre la cámara directo) y «Elegir de la galería» (`components/catalogo/ficha-medios.tsx`, ~líneas 213–250, `data-sin-fotos-historia`).

- **Tocar el recuadro de la foto** (`MarcoFoto`, el hueco punteado «Tu foto va aquí», `historia-producto.tsx` ~línea 803) abre el **input sin `capture`** (`entrada`, el que ya existe con `accept={tiposDeMedioElegibles()}` y `multiple`). En iOS eso muestra el menú nativo: Fototeca / Tomar foto / Elegir archivo; en Android, su selector equivalente.
- **Quita** los botones «Tomar foto» y «Elegir de la galería» y el input con `capture` de la historia. El recuadro pasa a ser un `button` accesible («Agregar fotos»), con estado de foco y `tocable`; el texto del recuadro invita a tocar (p. ej. «Toca para agregar fotos»), sin cambiar el resto del diseño.
- Con fotos, «+ Agregar foto» de la tira abre el mismo input (ya lo hace; compruébalo). Tocar la portada grande **no** abre el selector.
- Lo demás del paso igual: «Con foto se vende más.» al final, «Seguir sin foto», el sitio del retoque.
- Editar producto (hoja vieja) no cambia.

## 2. La hoja sin scroll en los pasos de un producto (Lewis: «un poco más alta»)
- Hoy la historia es una hoja con hueco: `altoConHueco(78)` = `100dvh - max(78px, safe-arriba + 20px)` (`components/hoja.tsx` ~línea 73). En iPhone con isla (safe-arriba ≈ 59) el borde ya queda en ≈79 px.
- **Mide primero** en 390×844 y 393×852 con safe-arriba 59 y safe-abajo 34 (simúlalos como en los scripts de teclado/hojas): qué pasos de un producto sin presentaciones (foto sin fotos, foto con 3 fotos, nombre, precio, cantidad, por encargo con plazo, «Así se ve» con y sin foto) necesitan scroll y cuántos px les faltan. Ponlo en una tabla en el PR.
- **Objetivo:** ninguno de esos pasos hace scroll a 390×844 (el Inventario largo y listas largas sí pueden). Para lograrlo, en este orden:
  1. Sube la hoja: hueco = `max(safe-arriba + 10px, 24px)` (como las hojas grandes de iOS; en el iPhone queda ≈69 px). No la pegues a la barra de estado ni la tapes.
  2. Aprovecha el espacio que liberan los dos botones quitados en el paso de la foto.
  3. Si aún falta, ajusta márgenes verticales del contenido (no los tamaños de letra ni el alto de los botones) y dime cuánto quitaste y dónde.
  Si un paso no cabe sin romper el diseño, no lo fuerces: dímelo con el dato.
- Respeta el resto: agarradera, esquinas 28, cabecera, pie flotante (#117), y que la barra de estado de Safari no cambie de color (nada fijo toca y=0).

## 3. Sin «‹» en el primer paso (Lewis, añadido después)
En el paso de la foto (el primero), el «‹» del pie no se muestra apagado: se **quita**, y «Seguir sin foto» / «Seguir» queda **centrado**. Desde el segundo paso, «‹» vuelve a la izquierda como hoy. Al pasar del paso 1 al 2, cambio instantáneo (o solo transform/opacity). Nada del paso 1 queda debajo del pie.

## Pruebas
Tipos, lint, `npm test`, build; `probar-crear-producto` (360/390/430, 360×640, movimiento reducido): tocar el recuadro dispara el input sin `capture` (comprueba `click` en `[data-entrada-medios]` y que no existe `[data-entrada-camara]` en la historia); aserción «sin scroll» en los pasos de arriba a 390×844 con safe-areas simulados. `probar-presentaciones`. Capturas 390×844 de cada paso medido en `docs/capturas/crear-producto/foto-y-altura/`. `docs/04-pantallas.md` al día. `lib/novedades.ts`: 1–2 líneas cortas en la versión siguiente.

## Entrega
PR contra `main` sin fusionar; Planning revisa y Lewis prueba en su iPhone (el menú nativo solo se ve en el teléfono). Avisa a Planning (`@parent`) con PR, HEAD, la tabla de medidas, pruebas y lo no probado.
