# Landing de deslizapp.com: la demo de un pedido controlada por el scroll

Encargo de Planning, 14 oct 2026. Tu puesto es **Coding**. Parte de `main` actualizado.

**Modelo:** Claude Code **Opus** (aprobado por Lewis el 14 oct) · en Codex, el más alto con razonamiento alto.

## Especificación
La especificación principal es **`referencias/landing/HANDOFF_DESLIZAPP.md`**: léela completa. La escribió Lewis con otra herramienta.

Este encargo **la corrige en lo que no coincide con la app** (Planning lo comprobó contra el código) y fija lo que el handoff deja abierto. Si algo choca, manda este encargo.

Las tres imágenes de producto están en `referencias/landing/`: `gorra-verde.png`, `termo-rosado.png` y `tote-crema-verde.png`. Son PNG 1254×1254 con fondo transparente. Cópialas a `public/` en el tamaño y el formato que necesite la página (WebP o AVIF), sin perder la transparencia.

El video de referencia no está disponible y no hace falta: las pantallas de comprador y de tienda se basan en **las pantallas reales de la app** (catálogo `components/tienda/`, pedido del comprador `components/tienda/pedido-comprador.tsx`, «¿Eres la tienda?» `components/pedido-catalogo/tienda-en-pedido.tsx`, panel de Pedidos). ~~Las vuelves a dibujar como componentes animables. No incrustes la app real.~~ **Corregido (ronda 2):** se usan los componentes reales con datos de ejemplo; ver `referencias/landing/ajustes-lewis-2.md`.

## Decisiones de Lewis y Planning (14 oct)
1. **Dónde vive:** en **`deslizapp.com/`** para quien **no** tiene sesión.
   - Hoy esa persona ve la pantalla de entrada («Entrar con Google» / «Ver demo»). La landing la sustituye y lleva **«Entrar»** arriba, que lleva al inicio de sesión de siempre.
   - Quien **tiene** sesión sigue yendo directo a su panel, igual que hoy. No rompas la vuelta del inicio de sesión (`app/auth/callback`, cookie `dz_volver`), «Ver demo», `/unirse/<código>` ni ninguna otra ruta.
   - Busca cómo decide hoy la app entre entrada y panel (`lib/data/sesion.ts`, `app/(dashboard)/layout.tsx`, `proxy.ts`) y elige el cambio más pequeño y seguro. Explícalo en el PR.
2. **El corazón es real:** «Lo quiero» (♥ y doble toque) agrega el producto a la bolsa y cuenta los likes con el mismo toque (`components/tienda/reel.tsx`, `aaah` + `lanzarBurst`). La animación ♥ → miniatura → bolsa enseña justo eso: no hace falta un paso aparte.
3. **No hay notificación de Deslizapp en el teléfono** (no existen avisos push, `docs/16`). En la escena «Notificaciones de la tienda»:
   - la tienda recibe **solo la notificación de WhatsApp**;
   - tras atender el pedido por el enlace, se ve el panel de Deslizapp con el pedido en **Pedidos** («1 nuevo» o el contador que muestre la app).
   - Ajusta los criterios del handoff que hablan de «ambas notificaciones».
4. **El mensaje de WhatsApp y su vista previa** usan la estructura real:
   - el texto que arma el catálogo al enviar el pedido (búscalo en `components/tienda/` y `lib/`);
   - la vista previa del enlace `/pedido/<código>`, que es una imagen generada con las miniaturas (`lib/imagen-*`, `tests/imagen-pedido*`).
   - El número de pedido usa el formato real (busca cómo se genera el código), no «DL-1042» si no coincide. Mismo pedido en todas las escenas.
5. **Gestión de la tienda:**
   - «¿Eres la tienda?» pide entrar con la cuenta de la tienda. Muéstralo así, como un paso de acceso, y luego la vista de gestión real: productos, cantidades, total y el cambio de estado.
   - No sugieras que cualquiera puede gestionar un pedido.
6. **CTA finales:**
   - **«Quiero vender»** abre WhatsApp a Lewis con un texto corto (usa el mismo número y patrón que el contacto del catálogo de Deslizapp en `components/tienda/catalogo.tsx`). Hoy las tiendas solo entran por invitación.
   - **«Ver un catálogo de ejemplo»** en lugar de «Quiero comprar». Abre el catálogo de la Tienda de ensayo (`/tienda/tienda-de-ensayo`; comprueba el slug en la base, en solo lectura).
7. **Datos de la demo:** tienda «La Vuelta», compradora Ana, los tres productos y sus precios del handoff (total RD$2,150), todos ficticios. Una sola fuente de datos.
8. **Marca:** el logo, la paleta y las tipografías del proyecto (`docs/09`, sección «Marca, ilustración y fondos»; tokens de `app/globals.css`). Textos en el tono de `docs/11-voz-y-frases.md`.
9. **Sin precios de planes** en la landing (Lewis, 14 oct): no muestres planes ni mensualidades.

## Técnica
- Lo del handoff: el scroll controla todo, la demo se detiene y retrocede, la escena va en sticky, hay «Saltar demo» y versión con movimiento reducido, y todo se entiende sin JavaScript.
- Revisa qué librería de animación hay en `package.json` antes de agregar una. Si no hay, CSS scroll-driven o un solo `requestAnimationFrame` con `transform` y `opacity`. No agregues varias librerías.
- iPhone primero (Lewis prueba en un iPhone 15 Pro con iOS 27): `100dvh` y áreas seguras, el scroll es de la página y nada atrapa el gesto. Revisa las reglas de iPhone en `HANDOFF.md`.
- Separa los datos, los componentes de cada escena y la tabla de tiempos de las escenas, para que Lewis pueda pedir ajustes de ritmo sin rehacer la UI.
- Metadatos para compartir: título, descripción e imagen Open Graph de la landing, con `deslizapp.com` (si #129 aún no está en `main`, usa `https://deslizapp.com` directo).

## Pruebas
- `npm run tipos`, `npm run lint`, `npm test`, `npm run build`.
- Un script `scripts/probar-landing.mjs` con Playwright a 360×640, 390×844, 430×932 y 1440×900:
  - avanzar y retroceder el scroll y comprobar el estado de cada escena (contador de la bolsa, total, número de pedido, escena visible);
  - «Saltar demo», los dos CTA y «Entrar»;
  - movimiento reducido;
  - que con sesión `/` sigue abriendo el panel.
- Corre también los `probar-*` de entrada, sesión y unirse que existan.
- Capturas de cada escena a 390×844 y 1440×900 en `docs/capturas/landing/`.

## Entrega
- PR contra `main`, con «Qué probar en tu iPhone» (4 a 6 pasos) y la lista de pantallas que sean provisionales.
- **Déjalo abierto sin fusionar:** cambia lo primero que ve cualquiera en deslizapp.com. Planning lo fusiona cuando Lewis lo pruebe en la vista previa y diga «mergea».
- Pide «@codex review» y atiende sus hallazgos.
- Avisa a Planning (`send_message` a `@parent`) al abrir el PR, cuando tengas una primera versión visible en la vista previa (antes de pulir, para que Lewis vea el ritmo pronto), si quedas bloqueado y al terminar.
