# Crear producto: ✕ a la izquierda y «Publicar ⌄»

Encargo de Planning, 13 oct 2026. Tu puesto es **Coding**. **Lánzalo después de fusionar #120** (pregunta «¿Viene en varias opciones?»): parte de `main` ya actualizado. Lewis probó la app instalada (PWA) en su iPhone y aprobó los dos cambios.

## 1. Cabecera: la ✕ a la izquierda (regla de Apple para hojas que confirman algo)
Hoy (`components/hoja.tsx` ~línea 864, modo `historia`): fila 1 = título + selector de catálogo a la derecha; fila 2 = barras + ✕. La ✕ queda justo debajo del selector y casi chocan.

Nuevo:
- **Fila 1:** ✕ (botón circular, mismo tamaño y estilo de hoy, área táctil ≥ 44 px) a la **izquierda**, luego «Nuevo producto», y el selector de catálogo (`alLadoDelTitulo`) a la **derecha**. Si la tienda tiene un solo catálogo, la fila lleva ✕ + título.
- **Fila 2:** las barras de la historia a **todo el ancho**.
- Mismo alto total de cabecera o menos (no se puede perder lo ganado en #119: los pasos siguen sin scroll a 390×844 con safe 59/34). Contenido debajo como hoy.
- El título no se trunca a 360 px con «De todo ▾» ni con un nombre de catálogo largo (prueba «Accesorios y bisutería»): si no cabe, el selector se acorta con elipsis, no el título.
- Accesibilidad: la ✕ sigue siendo «Cerrar», primera en el orden de foco de la cabecera; el aviso al salir (#115) igual.
- **Solo la historia de crear producto.** El Inventario y el resto de hojas no cambian.

## 2. «Publicar ⌄» y fuera la línea «Guardar sin publicar»
Hoy en «Así se ve» (`historia-producto.tsx` ~línea 652): fila «‹ + Publicar» y debajo «Guardar sin publicar» (botón terciario). En la PWA eso empuja el contenido debajo del pie: la parte baja de la tarjeta (precio, «Solo tengo…», etiqueta «Por encargo») y «Hazlo brillar» quedan bajo el desenfoque. **La tarjeta no se achica** (decisión de Lewis).

Nuevo:
- **Botón dividido:** `[ ‹ ] [ Publicar │ ⌄ ]`. «Publicar» publica como hoy. El chevron (área táctil ≥ 44 px, `aria-haspopup="menu"`, etiqueta «Más opciones para guardar») abre un **menú pequeño** anclado al botón con una sola opción: **«Guardar sin publicar»** y debajo, en secundario, «Queda oculto en tu catálogo». Se cierra con Escape, tocando fuera o con atrás; foco gestionado (entra a la opción, vuelve al chevron). Movimiento: solo transform/opacity, tokens de `docs/08`.
- **Cuando no se puede publicar** (sin foto, catálogo lleno, sin presentaciones a la vista…): no se muestra un «Publicar» apagado con chevron. El botón principal pasa a ser **«Guardar sin publicar»** (habilitado) y encima queda la pista de siempre («Agrega una foto para publicar · Volver a la foto», «Tu catálogo está lleno…»).
- Se quita la línea «Guardar sin publicar» de debajo. El pie queda de una sola fila (más la pista cuando aplica).
- **Objetivo medible:** en «Así se ve», con y sin foto, por encargo y con presentaciones, **nada del contenido (tarjeta completa, «Hazlo brillar» y sus pastillas) queda debajo de la zona difuminada del pie**, con ≥ 16 px de aire entre la tarjeta y «Hazlo brillar» y entre las pastillas y el inicio del desenfoque. Mídelo a 390×844 y 393×852 con safe 59/34 **en modo standalone** (PWA: `display-mode: standalone`, sin barras de Safari) y en Safari. Si no cabe sin achicar la tarjeta, dime cuánto falta y no la achiques.
- `docs/11-voz-y-frases.md`: añade «Publicar ⌄ → Guardar sin publicar» si hace falta.

## Pruebas
Tipos, lint, `npm test`, build; `probar-crear-producto` (360/390/430, 360×640, movimiento reducido): cabecera (✕ a la izquierda, selector a la derecha, barras a todo el ancho, sin choque: distancia ≥ 8 px entre cajas; título sin truncar a 360); chevron abre el menú, «Guardar sin publicar» guarda oculto, Escape/fuera cierra y devuelve el foco; sin foto y con catálogo lleno el principal es «Guardar sin publicar»; aserción de aire ≥ 16 px y «nada bajo el desenfoque» en «Así se ve» (standalone y Safari). `probar-presentaciones`, `probar-hojas`. Capturas 390×844 standalone en `docs/capturas/crear-producto/cerrar-y-publicar/`: cabecera con y sin selector, «Así se ve» con foto y por encargo, menú abierto, sin foto. `docs/04-pantallas.md` y `docs/09` al día. `lib/novedades.ts`: 1–2 líneas cortas.

## Entrega
PR contra `main` sin fusionar; Planning revisa y Lewis prueba en su iPhone (app instalada). Avisa a Planning (`@parent`) con PR, HEAD, medidas, pruebas y lo no probado.
