# Guía «Deja tu tienda lista»: rediseño visual (tarjeta, rayas de historia y píldora)

Encargo de Planning, 11 oct 2026. Tu puesto es **Coding**. Lewis aprobó el diseño; este encargo solo cambia **la presentación**: no cambia pasos, condiciones, permisos, datos ni textos de las hojas que abren los pasos.

## 0. Contexto

Lee desde `main` actualizado: `docs/00-contexto-del-proyecto.md`, `AGENTS.md`, `HANDOFF.md` (reglas de movimiento y teclado), `docs/handoffs/planning-sesion.md`, `docs/17-onboarding.md` (decisión del 10 oct, sustituida en lo visual por este encargo), `docs/09-sistema-de-diseno.md` (§2 color, §10 tarjetas, §11 etiquetas), `docs/08-movimiento.md` y `referencias/onboarding-guia/LEEME.md`.

Rama `feat/onboarding-guia-rediseno` desde `origin/main`. Archivo principal: `components/inicio/checklist-tienda.tsx` (más `avanceCapitulos` y lo que use). **Otra sesión de Coding trabaja a la vez en el catálogo del comprador** (`components/tienda/`, `app/tienda/catalogo.css`): no toques esos archivos. Lo único compartido es `lib/novedades.ts` (cada una añade una versión): antes del push, integra `origin/main` y deja tu entrada con el número siguiente al último que haya.

## 1. Qué había y por qué se rechaza

Lewis lo hizo con Codex. Problemas: (1) el estado «en curso» de una raya usa `--atencion-texto` (`#a8410f`), el color de **texto** de los avisos, pintado como barra gruesa: se lee como rojo de error y no es de Deslizapp; (2) «completo» y «capítulo elegido» comparten el mismo verde; (3) las tres rayas son del mismo largo siempre (no muestran avance dentro del capítulo); (4) el estado depende solo del color; (5) la guía flota suelta en Inicio, con un «Minimizar» como texto aislado.

## 2. Diseño aprobado (opción B1)

Referencia visual: `referencias/onboarding-guia/guia-b.dc.html` (abrir el lienzo vinculado en el LEEME). Resumen de lo que debe quedar:

**Contenedor.** Una tarjeta estándar (`superficie`, borde `linea`, `radio-l`, sin sombra, `overflow: hidden`) con las filas dentro, sin recuadro dentro de recuadro. Va donde está hoy (entre el saludo y los filtros de fecha), con 20 px de separación arriba y sin solaparse con lo que sigue (cuidado: en el lienzo hubo un solape; compruébalo a 360, 390 y 430 px).

**Cabecera.** Solo «Capítulo X · nombre» (`titulo-seccion`, Fredoka), a la izquierda, y a la derecha un botón de **colapsar** de 44×44 con una flecha hacia arriba (`aria-label="Minimizar la guía"`, `aria-expanded`). Sin la línea «5 de 7 pasos…», sin el contador «5 de 7» suelto y sin el texto «Minimizar».

**Rayas tipo historia** (una por capítulo; son botones de 44 px de alto de toque con la raya visible de 6 px, extremos de píldora, 6 px entre ellas):
- Pista: `superficie-hundida`. Relleno: ancho proporcional a pasos hechos del capítulo (2 de 3 = 67 %). **Sin iniciar:** solo la pista.
- **En curso:** relleno `resalte` (mandarina). **Completo:** relleno `accion` (verde bosque). Nunca `atencion-*` ni `peligro`.
- **No hay etiquetas «Capítulo 2/3/4» bajo las rayas ni subrayados.** El capítulo elegido se indica con una **punta** (cuadrado de 14 px girado 45°, fondo `superficie`, borde `linea` solo arriba e izquierda, esquina redondeada de 3 px) centrada bajo su raya y pegada a la lista de pasos, como el piquito de una burbuja: une visualmente esa raya con su lista. Solo hay una punta a la vez.
- El estado no depende solo del color: lo dan el largo del relleno y, para lectores de pantalla, el `aria-label` de cada raya: «Capítulo 3 · Tus productos salen al mundo, completo, 2 de 2 pasos» (completo / en curso / sin empezar). `aria-pressed` en la elegida.
- Estados y selección inicial siguen las reglas de `docs/17` (empezar por el primer capítulo incompleto, no robar selección ni foco al actualizar, abrir un capítulo no cuenta como progreso).

**Filas de pasos** (dentro de la tarjeta, separadas por `linea`, sin línea bajo la última): círculo de 26 px a la izquierda (hecho = relleno `accion` con check `sobre-accion`; pendiente = contorno `borde-campo`), nombre del paso en `destacado`, chevron a la derecha, área de toque ≥ 56 px. **Sin las palabras «Hecho» / «Pendiente»** ni subtítulos de estado: el check y el círculo vacío ya lo dicen. Conserva ese texto como texto accesible oculto (`sr-only`) para lectores de pantalla, y los detalles útiles que hoy da un paso solo si no son redundantes (por ejemplo «5 de 5 con foto» se puede quitar de la fila; no se pierde información que no esté en otra parte: si el conteo de productos con foto importa, déjalo en la hoja del paso).

**Acciones del capítulo** (botones secundarios compactos, dentro de la tarjeta, 16 px de aire): las que existen hoy (`Ver cómo queda`, `Continuar al capítulo N`, `Lo hago sola`) con la misma lógica. **Se eliminan** la frase «Capítulo listo. Tu tienda sigue tomando forma.» y «Cinco productos para empezar. Publica cuando quieras.». **Cambio de texto (decidido por Lewis el 11 oct 2026):** el botón «Lo hago sola» pasa a **«Por ahora sin equipo»** (neutro: el femenino asumía quién es el dueño). Mismo comportamiento y misma clave (`equipo_omitido_en`). Actualiza el nombre en `scripts/probar-onboarding-fallos.mjs` y `scripts/probar-onboarding-checklist.mjs` (los dos lo buscan por nombre), y en `docs/17-onboarding.md` (tabla de pasos, fila 7) y en los textos de documentación vigentes que lo mencionen; los handoffs y prompts históricos no se reescriben.

**Minimizada.** El botón de la cabecera la convierte en una **píldora** horizontal de 56 px de alto a todo el ancho entre los márgenes de Inicio (superficie, borde `linea`, `radio-pildora`): a la izquierda «Deja tu tienda lista» (`destacado`), luego las tres mini rayas (18×4 px, mismo relleno por capítulo), «5 de 7» en `secundario` y una flecha abajo. Toda la píldora es el botón de desplegar (`aria-expanded="false"`, `aria-label="Desplegar Deja tu tienda lista, 5 de 7 pasos"`). Se conserva el comportamiento actual de minimizar: preferencia local por usuario/modo/tienda, foco que pasa al botón correspondiente, sin confirmación y sin marcar pasos.

**Capítulo completo, 7/7 y celebración:** mismas reglas de hoy (cierre automático al llegar a 7/7, reintento ante error). Solo cambia cómo se ve.

**Modo oscuro:** solo tokens (`superficie`, `accion`, `resalte`, `linea`…); nada de colores a mano. Comprueba contraste de la raya en curso y de la punta.

## 3. Movimiento

Sin animación nueva en página ni entrada escalonada (regla permanente de `HANDOFF.md`). El relleno de las rayas puede cambiar sin transición. Si animas algo (por ejemplo la punta al cambiar de capítulo), solo `transform`/`opacity`, con los tokens `--mov-*`, y nada con movimiento reducido. Lo mínimo aceptable es que no haya ninguna animación.

## 4. Accesibilidad e iPhone

Todo botón ≥ 44 px de área de toque, foco visible con el verde de la app, navegación con teclado (Tab y Enter/Espacio en las rayas). Esta pantalla no tiene campos de texto, pero las hojas que abren los pasos sí: no cambies su comportamiento; corre `npm run probar:teclado` si tocas algo que las monte.

## 5. Documentación, novedades y pruebas

- `docs/17-onboarding.md`: añade un bloque de decisión fechado (11 oct 2026) que **sustituye la parte visual** de «Decisión vigente: preparación por capítulos» (rayas de estado con colores, etiquetas «Capítulo X», «Minimizar» como texto, textos «Hecho/Pendiente»): conserva la lógica y márcalo como sustituido con fecha y referencia. `docs/09-sistema-de-diseno.md`: una línea en §11 (Barras) para las rayas de historia (completo = `accion`, en curso = `resalte`, vacío = pista; nunca colores de aviso) y que esta es una excepción local a la regla 2 de color (mandarina) aprobada por Lewis.
- `lib/novedades.ts`: una línea en tono de marca, versión siguiente a la última (con la otra sesión en paralelo, resuelve el conflicto sin pisar la suya).
- Pruebas: `npm run lint`, `npm run build`, `npm test`, `npm run tipos`, y los `scripts/probar-*.mjs` de la guía/checklist (actualízalos a la nueva estructura: ya no existen las etiquetas «Capítulo X» bajo las rayas ni los textos «Hecho/Pendiente» visibles). Comprueba a 360/390/430 px, claro y oscuro, texto ampliado al 200 %, capítulos sin iniciar / en curso / completo, minimizar y desplegar con recarga, y que la tarjeta no se solape con los filtros de fecha. Capturas en `docs/capturas/onboarding-guia/`.
- Safari/iPhone físico no se puede probar aquí: dilo en el PR.

## 6. Entrega

PR abierto contra `main`, **sin merge**: Lewis prueba la preview y decide. Un solo push por ronda. Preview estable: `https://deslizapp-app-git-feat-onboarding-guia-rediseno-onedayone.vercel.app` (comprueba que responde). Handoff en `docs/handoffs/onboarding-guia-rediseno-visual.md` con HEAD, checks y pruebas. Sin Supabase ni datos reales. Esta sesión no tiene Notion: Planning actualiza la tarea con tu handoff.
