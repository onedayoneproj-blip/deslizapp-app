# Aviso al salir de una hoja con cambios sin guardar — textos nuevos

Encargo de Planning, 12 oct 2026. Tu puesto es **Coding**. Lewis eligió los textos (opción B). **Lánzalo después de que se fusione el PR #112** (crear producto como historia), porque ambos tocan `components/hoja.tsx`; parte de `main` ya actualizado.

## Problema
El diálogo que sale al cerrar una hoja con cambios sin guardar dice «¿Salir sin guardar?» / «Lo que escribiste se va a perder.» con los botones **«Seguir aquí»** (principal) y **«Salir»** (secundario). Es confuso: «Seguir aquí» no dice qué conserva y «Salir» no avisa que se pierde lo escrito.

## Decisión de Lewis (opción B, «más cercana a mi tono»)
- Botón principal (la opción segura): **«Quedarme»**.
- Botón secundario, en tono de advertencia: **«Descartar y salir»**.
- Se mantiene: el foco entra al diálogo en «Quedarme»; Escape = «Quedarme»; solo «Descartar y salir» cierra; Tab no sale del diálogo; el diálogo sigue siendo `role="alertdialog"`.

## Qué hacer
1. **`components/hoja.tsx`:** añade props `avisoQuedarme` (por defecto «Quedarme») y `avisoDescartar` (por defecto «Descartar y salir») junto a `avisoTitulo` y `avisoTexto`. Cambia el valor por defecto de los botones **para todas las hojas de la app** (cliente nuevo/editar, abono, pedido nuevo, promo, Mi marca, checklist, personalizar, etc.). El botón «Descartar y salir» con el tono de advertencia del sistema (revisa `Boton` y `docs/09`: `tono="peligro"` si existe, sin llamar demasiado la atención).
2. **Textos por escenario** (título / texto; los botones son siempre los de arriba salvo que se diga):
   - **Crear producto (historia)** — por defecto: «¿Salir sin guardar?» / «Lo que escribiste se va a perder.» Variantes del texto según lo que haya: con fotos subidas, añade «Las N fotos que subiste se van a descartar.»; con presentaciones armadas, «Se van a perder las N presentaciones y sus cantidades.»; con ambas, las dos frases. Cuenta solo lo que se pierde de verdad.
   - **Editar un producto:** «¿Descartar los cambios?» / «Lo que cambiaste no se va a guardar.»
   - **Registrar una solicitud o un pedido** (hoy `avisoTitulo="¿Salir sin registrar?"`): conserva ese título; texto «Lo que anotaste se va a perder.»; y `registrar-solicitud.tsx` (`textoCancelar="Seguir aquí"`, ~línea 561) pasa a «Quedarme».
   - **Hoja «Inventario» (la de cantidades encima de crear producto):** cerrarla con ✕/atrás NO pierde nada (conserva lo puesto), así que **no debe avisar**; solo avisa al cerrar la hoja principal. Comprueba que hoy es así.
   - **Resto de hojas:** el aviso por defecto con los botones nuevos.
3. **Actualiza todo lo que nombra los botones viejos** (búsqueda de «Seguir aquí» y del botón «Salir» del alertdialog): `scripts/probar-hojas.mjs`, `probar-catalogo-pulido`, `probar-espera-catalogo`, `probar-historial-interno`, `probar-inventario`, `probar-onboarding-checklist`, `probar-onboarding-fallos`, `probar-pedido-catalogo-panel`, `probar-reemplazo-promos`, y los de crear producto (`probar-crear-producto`, `probar-presentaciones`) si lo usan; `docs/04-pantallas.md` (~líneas 151, 838), `docs/09-sistema-de-diseno.md` si lo describe, `docs/11-voz-y-frases.md` (añade la pareja «Quedarme» / «Descartar y salir» como la regla de estos avisos: el botón principal nombra lo que conserva y el otro lo que pierde). Los `.txt` de capturas históricas y los handoffs viejos NO se tocan.
4. `lib/novedades.ts`: una entrada de 2 a 4 líneas cortas («Al salir de un formulario con cambios, los botones ahora dicen Quedarme y Descartar y salir.», etc.).
5. Pruebas: tipos, lint, `npm test`, los scripts que cubren hojas y los que cambiaste; captura 390×844 del diálogo en crear producto (con fotos y presentaciones), en editar y en registrar un pedido.

## Entrega
PR contra `main` sin fusionar. **Planning revisa y fusiona; Lewis prueba en su iPhone.** Sin cambios fuera de esto. Avisa a Planning (`@parent`) al abrir el PR.
