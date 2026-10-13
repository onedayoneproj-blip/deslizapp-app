# Editar producto · PR 1: los pasos de la historia como piezas compartidas (sin cambio visible)

Encargo de Planning, 13 oct 2026. Tu puesto es **Coding**. Parte de `main` actualizado.

**Modelo:** Claude Code **Sonnet** · en Codex, el más alto con razonamiento medio.

## Por qué
Lewis aprobó que editar producto pase al lenguaje de la historia de crear (opción A, `referencias/editar-producto/LEEME.md`): una hoja resumen cuyas filas abren **la misma pantalla de cada paso** de la historia. Hoy esos pasos no se pueden reutilizar: viven dentro del componente `Historia` de `components/catalogo/historia-producto.tsx` (≈1260 líneas), cada uno como un bloque `{paso === "…" && (…)}` que lee el estado del componente.

Este PR **solo reorganiza el código** para que el PR 2 (`docs/prompts/editar-producto-2-resumen.md`) pueda usar esas pantallas. **Crear producto tiene que verse y comportarse exactamente igual**: Lewis lo validó en su iPhone el 13 oct.

## Qué hacer
1. Saca a componentes con props (sin estado global nuevo) el **contenido** de cada paso, sin el pie ni la navegación de la historia:
   - **Foto:** `MarcoFoto` + `SeccionMedios` (modo `historia`) + el remate «Con foto se vende más.» y el hueco del retoque.
   - **Nombre:** encabezado del paso + `Campo` grande.
   - **Precio:** encabezado + campo de precio, o «Varía por presentación · desde …». La pregunta «¿Viene en varias opciones?» queda como pieza aparte (en editar no se usará igual).
   - **Stock:** `Cantidad grande` + «Es por encargo, no llevo stock» + `CuandoLlega`.
   - **Presentaciones:** `QueCambia`, `ValoresDeEje`, `FotoDeCadaColor` / `HojaFotoDeColor`, tal como están, pero exportadas y sin depender de `Historia`. El Inventario (`HojaInventarioHistoria` y `CuandoLlega`) ya vive aparte en `components/catalogo/inventario-historia.tsx`: compruébalo y déjalo usable desde fuera de la historia (no confundir con `hoja-inventario.tsx`, que es el inventario general del panel).
   - **Tarjetas:** `TarjetaAsiSeVera`, `TarjetaPresentaciones`, `ReelEnVivo`, `PastillaOpcional`, `HojaOpcional`.
   
   Ponlos en un módulo nuevo (por ejemplo `components/catalogo/pasos-producto.tsx`, o una carpeta si queda muy largo). Que el encabezado de cada paso (título Fredoka 26 + ayuda) reciba sus textos por props, para que editar pueda poner los suyos.
2. `Historia` pasa a componer esas piezas. Misma lógica de navegación, foco (`flushSync` + `focus()` dentro del toque), teclado y guardado (`useGuardarProducto`). **No cambies textos, medidas, clases ni `data-*`** que usan las pruebas.
3. Nada de lógica de datos nueva. No toques `hoja-producto.tsx` (editar) ni el catálogo del comprador (`components/tienda/`).

## Reglas que aplican
`HANDOFF.md`: teclado e iPhone (ningún efecto con `resize`/`visualViewport` que cambie estado; efectos de foco estables; sin transiciones de vista), movimiento y gestos de hojas. Sin línea en `lib/novedades.ts` (no hay cambio visible).

## Pruebas
- `npm run tipos`, `npm run lint`, `npm test`, `npm run build`.
- `probar-crear-producto` **completo** (360/390/430, 360×640, movimiento reducido, sin scroll a 390×844 y 393×852 con safe 59/34): tiene que pasar sin tocar sus aserciones. Si tienes que cambiar una aserción, explícalo en el PR: no debería hacer falta.
- `probar-presentaciones`, `probar-hojas`, `probar:teclado` (su fallo en «Minimizar» del checklist de inicio es ajeno: compruébalo contra `main` y dilo).
- Capturas antes/después de cada paso a 390×844 (un producto y con presentaciones) en `docs/capturas/editar-producto/pasos-compartidos/`. Tienen que ser iguales; si alguna difiere en un píxel visible, corrígelo.

## Entrega
PR contra `main`. Como no hay cambio visible ni de datos, **fusiona tú (squash) cuando «Revisión» esté en verde y la revisión de Codex del último commit no tenga hallazgos** (si haces pushes después de su revisión, comenta «@codex review» y espera). Borra la rama al fusionar. Si algo falla o decides algo fuera de este encargo, deja el PR abierto y explícalo.

Al terminar (o si quedas bloqueado), **avisa a Planning** (`send_message` a `@parent`, o a la sesión de Planning que te creó) con: estado, PR, HEAD, resultado de «Revisión» y de Codex, pruebas hechas y no hechas, decisiones fuera del encargo y pendientes. El PR 2 no empieza hasta que este esté en `main`.
