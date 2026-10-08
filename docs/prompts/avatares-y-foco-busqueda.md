# Fotos redondas solo para personas y tiendas, y sin recuadro en la barra de búsqueda (rama `fix/avatares-y-foco-busqueda`)

> **Modelo:** en Claude Code, Sonnet 5.5; en Codex, el modelo principal con razonamiento medio. **Sin migraciones.** Toca lo que ven los compradores: **deja el PR abierto con su preview** para que Lewis lo pruebe en el iPhone. No hagas merge.

> **Orden:** el PR #75 (`feat/busqueda-precio-presentaciones`) trae la hoja de búsqueda del comprador y puede no estar en `main`. **Si no está, parte de esa rama** (`git fetch origin feat/busqueda-precio-presentaciones`), crea `fix/avatares-y-foco-busqueda` desde ahí y abre el PR con **base en esa rama**, diciendo que depende del #75. Si ya está en `main`, parte de `main`.

## 0. Antes de empezar

Lee `docs/00-contexto-del-proyecto.md`, `AGENTS.md`, `HANDOFF.md`, `docs/09-sistema-de-diseno.md` (sección Avatar) y `docs/11-voz-y-frases.md`. Tu puesto es **Coding**.

Mira: `components/ui/avatar.tsx` (hoy: persona = círculo, **tienda = cuadrado redondeado**), la hoja de búsqueda del comprador (`#srBg`, `.sritem`, `.sritem img`, `#srIn`, `.srhead`) en `components/tienda/catalogo.tsx` y `app/tienda/catalogo.css`, `components/tienda/*` (cabecera de la tienda, perfil, reel, carrito) y `components/ui/miniatura-producto*` / `Foto`.

## 1. Lo que decidió Lewis (8 oct 2026)

1. **Regla de formas:** el **círculo se reserva exclusivamente para la foto de la tienda y la foto de la persona** (usuario/cliente). La foto o miniatura de **un producto es siempre un cuadrado de bordes redondeados**, nunca un círculo.
2. Hoy se rompe en los dos sentidos: la miniatura del producto en los resultados de la búsqueda del comprador sale **redonda**, y en varios lugares la foto de la **tienda** se dibuja como cuadrado redondeado (el `Avatar` con `tipo="tienda"` es uno) y debe ser **círculo**.
3. Al tocar la barra de búsqueda del comprador (la píldora «Nombre, marca o detalle», junto a «Cancelar») aparece **un recuadro oscuro alrededor del campo**. No debe verse ningún recuadro: el foco se indica con la píldora, no con un contorno del `<input>`.

## 2. Qué se hace

1. **Foco de la búsqueda:** quita el contorno/recuadro del `<input>` al enfocar (`outline`, `box-shadow`, `border`, sombra del navegador/iOS, `-webkit-tap-highlight-color`, `appearance`). Sin perder accesibilidad: si hace falta una señal de foco, que sea sobre la **píldora** (por ejemplo un cambio sutil de borde con `:focus-within`), nunca un rectángulo dentro de ella. Revisa **todos** los campos de texto del catálogo del comprador (búsqueda, hoja de pedido, datos del cliente) por el mismo recuadro y arréglalos igual, sin romper las reglas de teclado/iPhone de `HANDOFF.md` (nada de animar ancestros del campo).
2. **Auditoría completa** de formas (`rounded-full`, `border-radius: 50%`, `radius` grande en `Avatar`, `.sritem img`, miniaturas, tarjetas, filas del carrito, historial, inventario, reels, perfil, panel de admin, Ver como, equipo/invitaciones, vista previa de WhatsApp, etc.). Haz una **tabla** (lugar · qué foto es · forma antes · forma después) y corrige cada violación:
   - **Foto de producto** (miniatura, avatar, fila, resultado, carrito, pedido, promo, historial) → cuadrado de bordes redondeados (usa el radio del sistema de diseño que ya haya para miniaturas).
   - **Foto/logo de la tienda** y **foto de la persona** (dueña, equipo, clientes, el avatar con iniciales) → círculo. Cambia `Avatar tipo="tienda"` a círculo y actualiza `docs/09` y la guía `/diseno`.
   - Lo que **no** es foto (botones circulares, chips, puntos, indicadores, el «+» flotante, la ✕) no se toca.
3. Un solo lugar de verdad: si hay varios componentes que dibujan miniaturas de producto con formas distintas, unifícalos en uno (o una clase) en vez de arreglar cada sitio a mano.
4. Documenta la regla en `docs/09-sistema-de-diseno.md` («círculo = tienda y persona; cuadrado redondeado = producto») y en `HANDOFF.md`.

## 3. Reglas

- No cambies tamaños, colores, orden ni textos: solo la **forma** y el recuadro del campo. Sin movimiento nuevo.
- Tema por tienda del catálogo del comprador se respeta; sin migraciones; no toques `catalogo_publico`.
- Novedad en `lib/novedades.ts` solo si la dueña lo nota (versión siguiente a la de `main`/#75).

## 4. Pruebas y cierre

- Unitarias donde haya lógica (p. ej. el `Avatar` por tipo) y una **prueba de regresión** que falle si una miniatura de producto vuelve a ser circular o un `Avatar` de tienda cuadrado (puede ser un test que recorra las clases/estilos).
- Navegador (demo `?demo`, 390 y 360; Lino & Algodón y Michel; panel y catálogo): capturas antes y después de la hoja de búsqueda (foco en el campo, resultados con miniaturas cuadradas), la cabecera/perfil de la tienda, carrito, pedidos, clientes, equipo, admin. Incluye la tabla de la auditoría en el PR.
- `tsc`, `npm test`, `npm run lint` (sin avisos nuevos), `npm run build`, `probar:teclado` y las regresiones de catálogo del cliente y panel.
- **PR abierto con preview.** Resume en español, corto: qué cambió (con la tabla), qué debe probar Lewis en el iPhone (tocar la barra de búsqueda: ningún recuadro; resultados con foto cuadrada; foto de la tienda y de personas redondas en todas partes) y lo que no pudiste probar (Safari físico).
