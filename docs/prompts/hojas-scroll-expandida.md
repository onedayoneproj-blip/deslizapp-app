# Hojas del catálogo del cliente: el contenido no hace scroll con la hoja expandida (rama `fix/hojas-scroll-expandida`)

> **Modelo:** en Claude Code, Sonnet 5.5; en Codex, el modelo principal con razonamiento medio. Sin migraciones. Es el catálogo que ven los compradores: **deja el PR abierto con su preview** para que Lewis lo pruebe en el iPhone. No hagas merge.

## 0. Antes de empezar

Lee `docs/00-contexto-del-proyecto.md`, `AGENTS.md`, `HANDOFF.md` (sobre todo «Regla permanente: gestos de las hojas del catálogo del cliente», teclado y movimiento), `docs/08-movimiento.md` y el prompt anterior `docs/prompts/hojas-del-catalogo-gestos.md` (PR #65, ya en `main`). Tu puesto es **Coding**.

Mira: `components/tienda/dialogo.tsx` (`PanelCatalogo`, el `useEffect` con touch events no pasivos y `contenedorScroll`), `lib/gesto-hoja.ts`, `tests/gesto-hoja.test.mjs`, `scripts/probar-hojas-gestos.mjs`, y en `app/tienda/catalogo.css` las reglas de `.sheet`, `.sheet.full`, `.sheet:not(.full) .sbody`, `.sbody`, `.wabody`, `.wa.full .wabody`, `.pres-sheet`, `.pres-body`, `.aviso-llegada` y el bloque del final añadido en #65. Hojas que usan `PanelCatalogo`: pedido (`#cmBg`), `#ptOv`, `#plBg`, aviso (`#avisoBg`), presentaciones (`#presBg`), la de WhatsApp (`.wa`) y `components/tienda/planes.tsx`.

## 1. El bug (Lewis, 7 oct 2026, iPhone, después de #65)

**Después de expandir una hoja deslizando hacia arriba, ya expandida, el contenido no hace scroll.** Pasa en «algunas» de las hojas del catálogo del cliente. Lo esperado (y lo que dice la regla de `HANDOFF.md`): expandida, deslizar sobre el cuerpo desplaza el contenido; deslizar hacia abajo con el cuerpo en `scrollTop = 0` arrastra la hoja.

Primero **reproduce y encuentra la causa en cada hoja**, no supongas. Pistas de Planning (sin comprobar):

- **Presentaciones** (`.pres-sheet`): la hoja es una columna flex; con `.full` pasa a `height: 100%`, pero `.pres-body` no tiene `flex: 1` ni `min-height: 0`. Un hijo flex con `min-height: auto` no se encoge por debajo de su contenido, así que puede que nunca desborde (`scrollHeight == clientHeight`) mientras `.sheet { overflow: hidden }` recorta lo de abajo. `contenedorScroll` entonces devuelve `null`. Revisa lo mismo en `.sbody` de aviso (`.aviso-llegada`, alto fijo de 420 px) y en las demás.
- **Scroll que no se reconoce en iOS:** el cuerpo pasa de `overflow: hidden` (media altura) a `overflow-y: auto` (expandida) y la altura cambia con una transición de 0,38 s. Safari a veces no trata el elemento como desplazable hasta que cambia su caja. Comprueba si el primer gesto después de expandir funciona y si el segundo sí.
- **El gesto de la hoja que se come el scroll:** con la hoja `full`, un gesto hacia abajo decide `arrastrar` cuando `g.scroll` es `null` (scrollTop vale 0) y cancela el scroll nativo. Si el contenedor no se detectó bien (por lo de arriba, o porque el contenedor real es otro: `.wabody`, `.pres-body`, `.srbody`), cualquier gesto hacia abajo arrastra en vez de desplazar. Revisa también que `touch-action` de los ancestros entre el dedo y el contenedor deje `pan-y`.
- Revisa la hoja de WhatsApp (`.wa`): su cuerpo es `.wabody` con `overflow: hidden` salvo en `.wa.full`.

## 2. Qué se espera

- En **todas** las hojas del catálogo del cliente: a media altura, deslizar arriba expande; **expandida, el contenido hace scroll de inmediato** (desde el primer gesto, sin tocar otra cosa), hacia arriba y hacia abajo; con el contenido arriba, deslizar abajo reduce y luego cierra. Lo que ya funciona de #65 (asa, X, tocar el fondo, carruseles horizontales, campos con foco) sigue igual.
- El scroll no encadena con la página de atrás.
- No cambies el contenido ni el diseño de las hojas. Movimiento solo con `transform` y `opacity`; `prefers-reduced-motion` respetado.

## 3. Pruebas y cierre

- Arregla la causa en un solo lugar si se puede (p. ej. una regla común para el cuerpo de las hojas expandidas y/o detectar el contenedor de scroll al decidir el gesto, no solo al tocar). Explica en el PR la causa de cada hoja.
- Unitarias en `tests/gesto-hoja.test.mjs` si cambia la decisión del gesto.
- **Amplía `scripts/probar-hojas-gestos.mjs`** para que mida esto, que hoy no mide: en cada hoja, con contenido largo (carrito con muchos productos, presentaciones con muchas combinaciones), expandir deslizando arriba y **en el mismo recorrido** deslizar sobre el cuerpo y comprobar que `scrollTop` cambia; luego volver arriba y reducir. 390 y 360, emulación táctil. Si WebKit de Playwright no está disponible (el entorno no llega a `cdn.playwright.dev`), dilo; Chromium no reproduce todo lo de Safari.
- `tsc`, `npm test`, `npm run lint` (sin avisos nuevos), `npm run build` y las regresiones del catálogo del cliente (`probar-catalogo-*`, pedido, Avísame, presentaciones, `probar:teclado`).
- Si cambia la regla de gestos, actualiza la sección de `HANDOFF.md`.
- **PR abierto con su preview.** En el PR: la causa por hoja, y qué debe probar Lewis en el iPhone (carrito con varios productos, presentaciones de un producto con muchas, Avísame, WhatsApp: expandir y hacer scroll enseguida, bajar, reducir y cerrar). Di claro lo que no pudiste probar (Safari físico).
- Resume en español, corto.
