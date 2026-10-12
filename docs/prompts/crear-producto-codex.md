# Crear producto «como una historia» — encargo para Codex (prueba comparativa)

Encargo de Planning, 12 oct 2026. Lewis (dueño del producto) quiere comparar cómo lo construye Codex contra la implementación de Claude (PR #112, rama `feat/crear-producto-historia`). **Empieza desde `main`, no uses ni copies esa rama**: la implementación de Claude se desvió del prototipo y es justo lo que se quiere superar. Si Codex lo deja mejor, se queda el de Codex.

## 1. Qué leer (en este orden)

1. `AGENTS.md` y `docs/00-contexto-del-proyecto.md` (el proyecto, el sistema de diseño, cómo se cierran los PR). **Este Next.js tiene cambios incompatibles con lo que conoces: lee la guía correspondiente en `node_modules/next/dist/docs/` antes de escribir código.**
2. `docs/prompts/crear-producto-historia.md`: el encargo completo y detallado (los 6 momentos, el flujo de presentaciones, accesibilidad, movimiento, teclado, pruebas). **Es la especificación funcional.** Donde choque con este documento, manda este.
3. `referencias/crear-producto/LEEME.md` y los dos lienzos de referencia: `historia.dc.html` (un producto, una presentación; seis momentos) y `historia-presentaciones.dc.html` (varias presentaciones; seis momentos). **Son el diseño aprobado.** Son HTML de Claude Design con estilos en línea: léelos como código fuente para sacar **estructura, textos exactos, medidas y colores**; no los copies ni sus estilos en línea: reconstruye con `components/ui/`, los tokens y `docs/09-sistema-de-diseno.md`. **Las capturas ya renderizadas del prototipo están en `referencias/crear-producto/capturas/`** (`b1…b6.png` = un producto; `v1…v6.png` = varias presentaciones; 390×844) y en el PDF `referencias/crear-producto/prototipo-crear-producto.pdf` con las medidas. Son la verdad visual; las medidas exactas, además, están en el código (busca `height:`, `left:`, `top:`, `border-radius`, `font-size`).
4. `HANDOFF.md` (reglas de teclado e iPhone, movimiento, gestos de hojas, **novedades: cada cambio visible exige una entrada nueva en `lib/novedades.ts` de 2 a 4 líneas cortas**), `docs/04-pantallas.md`, `docs/11-voz-y-frases.md`, `docs/08-movimiento.md`.
5. Código de hoy: `app/(dashboard)/catalogo/nuevo/page.tsx` → `components/catalogo/hoja-producto.tsx` (formulario único para crear y editar), `ficha-medios.tsx`, `ficha-presentaciones.tsx`, `flujo-presentaciones.tsx`, `ficha-detalles.tsx`, `ficha-tecnica.tsx`, `stock-producto.tsx`, `selector-catalogo.tsx`, `bienvenida-retoque.tsx`; el reel del comprador en `components/tienda/reel.tsx` y `app/tienda/catalogo.css` (`--W: 390px; --H: 488px`).

## 2. Regla principal: fidelidad exacta al prototipo

Lewis probó la implementación anterior en su iPhone y dijo que se sentía «igual de caótica que antes». **Quiere que se vea exactamente como el prototipo.** Una sola excepción (sección 3).

Medidas del lienzo (390×844, márgenes laterales de 20 px, la tarjeta ocupa de margen a margen):

- **Flujo de una presentación** (`historia.dc.html`), pasos de preguntas (foto, nombre, precio, cuántos / cuándo llega): tarjeta «así se verá» de **350×372 px**, **la misma en todos los pasos y en el mismo lugar**, foto en `object-fit: cover`. El ancho es el ancho útil (mismos márgenes que título y campos); **la tarjeta no se encoge, no cambia de ancho ni de posición con el teclado ni al cambiar de paso**. En pantallas más cortas, el contenido scrollea.
- **Flujo de varias presentaciones** (`historia-presentaciones.dc.html`): la tarjeta «así se verá» es más baja, de **350×212 px** (foto `cover`, `object-position: 50% 30%`), igual en todos sus pasos, para dejar sitio a las listas; muestra «Desde RD$…», la píldora «Talla S · M · L» y los puntos de color a medida que se eligen. Barras de avance: 7 (las tres primeras ya llenas al entrar, porque vienen de foto, nombre y precio).
- **«Así se ve en tu catálogo»** (en los dos flujos): tarjeta de **350×440 px** con el **reel real** (`reel.tsx` con el tema de la tienda) **reducido en proporción**: renderízalo a 390×488 y aplícale `transform: scale(350/390)` dentro del marco (`transform-origin: top left`), sin recortar. Nunca el reel en tamaño real dentro de un marco menor: así quedaban cortados «Avísame» y los botones, y el texto «Aaah… dejaste que se lo llevaran» se montaba sobre el nombre y el precio.
- Barra de avance (una barra por momento), ✕, título (Fredoka), ayuda, controles y abajo, fijo, ‹ redondo + «Seguir» de ancho completo. Tipografías Fredoka / Figtree / Caveat (una vez por pantalla), colores y espacios del lienzo.
- La barra inferior es sólida de lado a lado (fondo de la hoja); el contenido pasa por detrás sin asomar. Si hay aviso («Tu catálogo está lleno…»), va completo encima de «Publicar», dentro de la barra.

## 3. Única excepción: el catálogo NO es un paso

Quita cualquier pregunta «¿En qué catálogo va?» del flujo. El catálogo se elige con el **selector de la cabecera de la hoja** («Nuevo producto» + selector tipo «De todo ▾», como lo hacía la hoja anterior en `hoja-producto.tsx`/`selector-catalogo.tsx`; reutiliza ese componente). Debe:
- **Recordar el último catálogo usado, por tienda**, y abrir con ese ya seleccionado (almacenamiento local con `try/catch`; la página funciona sin él).
- Ocultarse si la tienda tiene un solo catálogo.
- Integrarse con la barra de avance sin cambiar la composición del lienzo.

## 4. Alcance

Todo el flujo de **crear** (`/catalogo/nuevo`): los dos lienzos completos.
- **Una presentación** (`historia.dc.html`): foto → nombre → precio (chip «Tiene tallas o colores») → cuántos tienes / «Es por encargo» → cuándo llega → así se ve en tu catálogo (+ «Hazlo brillar · opcional») → celebración.
- **Varias presentaciones** (`historia-presentaciones.dc.html`, mismo diseño, **una pregunta por pantalla**): ¿en qué cambia? (hasta 2) → una pantalla por cosa (tallas con «XS a XL» / «Única»; colores con «Foto de cada color · opcional») → cuántos de cada una **agrupado por la primera cosa** (color, con filas de talla), «Mismo precio · Poner a todas», «N en total» por grupo, − / + por fila → detalle de una presentación (precio propio, foto, ocultar) como hoja inferior → así se ve («Desde RD$…», chips de tallas y puntos de color en la tarjeta de los pasos; en el reel, «Ver presentaciones»). **No se reutiliza la hoja vieja «Cuántas tienes» / «Paso 2 de 2»**: mezclarla con la historia es lo que se sintió caótico (dos barras de avance, otros botones, cabecera que se solapaba con «Poner a todas», texto cortado detrás de los botones).
- **Editar** (`/catalogo/[id]/editar`) sigue con la hoja actual; no la borres. La lógica compartida (guardar, validar, medios, presentaciones) se extrae a funciones o hooks que usen las dos, sin duplicar el guardado.
- Mismos datos y contratos: capa de datos actual, permisos del grupo `catalogo`, «Ver como» bloquea, límites del plan, retoque Beta, `VIDEO_PERMITIDO = false`. **Sin migraciones ni cambios en Supabase.**

Reglas funcionales que se comprobaron en la prueba anterior y deben cumplirse:
- No se llega a «Así se ve en tu catálogo» con 0 unidades sin haber elegido stock o «Es por encargo»; la vista previa nunca muestra el sello «Agotado» durante la creación.
- «Por encargo» guarda stock 0 y «Llega en …»; las presentaciones también se guardan con stock 0 en ese caso. El «Otro» de «¿Cuándo llega?» se conserva al apagar y volver a encender el encargo.
- Se puede seguir y publicar sin foto («Seguir sin foto»); editar sigue pidiéndola.
- «Compartir» en la celebración solo con catálogo publicado.
- Reglas de presentaciones vigentes: máx. 2 cosas, 12 valores, 144 presentaciones; `opciones_validas`, `guardar_variantes`; «Agotada» solo en publicados.

## 5. Cómo entregar (a prueba de la desviación anterior)

1. Rama `codex/crear-producto-historia` desde `main`, **un PR** contra `main`, sin fusionar. Textos, commits y descripción del PR en español.
2. **Tabla «lienzo vs construido»** en la descripción del PR: top y alto de la tarjeta, título, campo, botones, barra de avance, en cada paso, medidos con Playwright a **390×844 y 393×852** (Chromium ya está instalado; no ejecutes `playwright install`). La tarjeta debe medir 350×372 (pasos de preguntas) y 350×440 (así se ve), idéntica entre pasos.
3. Capturas de **todos** los momentos de los dos flujos en `docs/capturas/crear-producto-codex/`, a 390×844 (y 360×640 de al menos el paso del precio con teclado). Usa fotos reales de prueba (no de un solo color) para que se vea el recorte `cover`.
4. Pruebas: tipos, lint, `npm test`, build; un script nuevo `scripts/probar-crear-producto.mjs` (Demo, 360/390/430 px) con los escenarios de `docs/prompts/crear-producto-historia.md` §5; los campos nuevos en `scripts/probar-teclado.mjs`. Corre también los scripts ya existentes que toque (probar-presentaciones, probar-hoja-producto).
5. Documentación: sección «Crear producto (historia)» en `docs/04-pantallas.md` (la anterior queda vigente solo para editar); entrada en `lib/novedades.ts` (versión siguiente a la más alta de `main`, **2 a 4 líneas cortas**); handoff en `docs/handoffs/crear-producto-codex.md` con decisiones fuera del encargo, pruebas hechas y no hechas.
6. «Revisión» (el check de GitHub Actions) debe quedar en verde. Si un test falla también en `main`, dilo en el PR y no lo toques.
7. Nada de lo que no se pidió: sin nuevas dependencias, sin tocar `app/tienda/catalogo.css` ni `components/tienda/` salvo lo imprescindible para renderizar el reel real en la vista previa (si lo haces, explícalo).

## 6. Qué no hacer

- No copiar el HTML ni los estilos en línea de los lienzos.
- No decidir por tu cuenta cambiar medidas, orden o textos del prototipo: si algo no se puede (por ejemplo una pantalla muy corta), déjalo scrolleando y dilo en el PR.
- No fusionar. Planning revisa y Lewis prueba en su iPhone.
