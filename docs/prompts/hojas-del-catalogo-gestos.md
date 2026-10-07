# Hojas del catálogo del cliente: scroll y deslizar para cerrar (rama `fix/hojas-gestos`)

> **Modelo:** en Claude Code, Sonnet 5.5; en Codex, el modelo principal con razonamiento medio. Sin migraciones. Es el catálogo que ven los compradores: **deja el PR abierto con su preview** para que Lewis lo pruebe en el iPhone. No hagas merge.

## 0. Antes de empezar

Lee `docs/00-contexto-del-proyecto.md`, `AGENTS.md`, `HANDOFF.md` (teclado, movimiento) y `docs/08-movimiento.md`. Tu puesto es **Coding**.

Mira: `components/tienda/dialogo.tsx` (`DialogoCatalogo`, `PanelCatalogo`), en `app/tienda/catalogo.css` el bloque «Hojas» (`.sheet`, `.sheet.full`, `.sbody`, `.grab`, `.shead`, `touch-action`, `overscroll-behavior`) y las hojas que lo usan: pedido (`#cmBg`), `#ptOv`, `#plBg`, aviso (`#avisoBg`), presentaciones (`.pres-sheet`), hojas de `hojas-compra.tsx`.

## 1. El bug (reportado por Lewis, 7 oct 2026, iPhone)

1. **Con la hoja del carrito/pedido a media altura, hacer scroll no mueve el contenido.** Hoy `.sheet:not(.full) .sbody` tiene `overflow: hidden` y `.sheet` tiene `touch-action: none`: el contenido solo se desplaza cuando la hoja ya está `full`, y la hoja solo se expande arrastrando el asa o la cabecera.
2. **No se pueden cerrar las hojas deslizando hacia abajo desde el contenido.** `PanelCatalogo` solo empieza el arrastre si el toque cae en `.grab`, `.wahead`, `.shead` o `.wagrab`. Deslizar sobre el cuerpo no hace nada.

## 2. Comportamiento esperado (el de una hoja nativa de iOS)

- Hoja a media altura: **deslizar hacia arriba sobre el cuerpo** primero **expande** la hoja (`full`) y, ya expandida, el contenido hace scroll. Si el contenido cabe, igual se puede expandir.
- Hoja expandida o a media altura: **deslizar hacia abajo** cierra o reduce: si el cuerpo está en `scrollTop = 0` (o no tiene scroll), el gesto arrastra la hoja (misma lógica que hoy: más de 90 px cierra o reduce de `full` a media). Si el cuerpo tiene scroll por arriba, el gesto hace scroll normal y **no** arrastra la hoja.
- Esto vale para **todas** las hojas del catálogo del cliente (pedido, aviso, presentaciones, opiniones, `#ptOv`, `#plBg`), no solo la del carrito. El «Ampliar/Reducir hoja», la X y tocar el fondo siguen funcionando.
- El scroll del cuerpo no encadena con la página de atrás (`overscroll-behavior: contain`; la página ya queda bloqueada con `html.style.overflow`).

## 3. Reglas

- Mantén el patrón de `PanelCatalogo` (pointer events + `transform`); no agregues librerías. Ojo con que `touch-action: none` en `.sheet` es lo que impide el scroll nativo: decide si lo cambias a `pan-y` en el cuerpo y maneja el arrastre solo cuando corresponde (ve si funciona mejor `touchstart/touchmove` con la comprobación de `scrollTop`). Explica en el PR por qué elegiste lo que elegiste.
- **Nada de animar lo que tiene un campo enfocado**; movimiento solo con `transform` y `opacity`, y `prefers-reduced-motion` respetado (`docs/08`).
- Un campo con foco (notas, nombre del comprador) no debe perder el foco ni el teclado debe romperse al deslizar; revisa `scripts/probar-teclado.mjs`.
- Los carruseles y la galería dentro de una hoja (scroll horizontal, p. ej. fotos o cuadrícula de presentaciones) no deben quedar atrapados por el gesto vertical.
- No cambies el contenido ni el diseño de las hojas.

## 4. Pruebas y cierre

- Unitarias de la lógica del gesto (decidir entre scroll del cuerpo y arrastre de la hoja según `scrollTop`, dirección y estado `full`).
- Navegador (demo `?demo`, 390 y 360, emulación táctil): para cada hoja, deslizar arriba (expande), con scroll dentro, deslizar abajo con el cuerpo arriba (reduce y luego cierra) y con el cuerpo scrolleado (hace scroll); campo con foco; cuadrícula de presentaciones con scroll horizontal. Añade el recorrido a un script (`scripts/probar-hojas-gestos.mjs`).
- `tsc`, `npm test`, `npm run lint` (sin avisos nuevos), `npm run build` y las regresiones del catálogo del cliente (`probar-catalogo-*`, pedido, Avísame, presentaciones).
- `HANDOFF.md` si cambia una regla de gestos.
- **PR abierto con su preview.** En el PR, qué debe probar Lewis en el iPhone: abrir un catálogo, agregar productos, abrir el carrito y hacer scroll, expandir deslizando arriba, cerrar deslizando abajo desde el contenido; repetir con Avísame, presentaciones y opiniones. Di claro lo que no pudiste probar (Safari físico).
- Resume en español, corto.
