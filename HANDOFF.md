# Deslizapp — reglas permanentes para Coding

Lee primero [docs/00-contexto-del-proyecto.md](docs/00-contexto-del-proyecto.md), [AGENTS.md](AGENTS.md) y el [relevo vigente](docs/handoffs/planning-sesion.md).

**Gestión de tareas:** Lewis autorizó probar Notion. Antes de actualizar el seguimiento, consultar [docs/piloto-notion.md](docs/piloto-notion.md) para comprobar si el piloto ya está activo y qué fuente corresponde. No asumir acceso ni crear un backlog duplicado; la documentación técnica sigue en GitHub.

Este archivo reúne reglas técnicas permanentes, no estados de ramas ni entregas. El estado actual vive solo en el relevo; las decisiones y contratos de cada función, en su documentación.

## Dónde consultar las reglas de cada función

- Datos y contratos: `docs/03-modelo-de-datos.md`, `docs/05-arquitectura.md` y migraciones/código vigentes.
- Comportamiento de pantallas, producto, inventario y pedidos: `docs/04-pantallas.md`.
- Componentes, tokens, formas, filtros y formularios: `docs/09-sistema-de-diseno.md`.
- Marca, ilustraciones y voz: `docs/01-marca.md`, `docs/10-marca-ilustracion-y-fondos.md` y `docs/11-voz-y-frases.md`.
- Movimiento: `docs/08-movimiento.md`.
- Catálogo, admin y onboarding: `docs/12-catalogo-conectado.md`, `docs/13-admin.md` y `docs/17-onboarding.md`.
- Coordinación, dependencias y memoria: [docs/forma-de-trabajo.md](docs/forma-de-trabajo.md).

Las notas anteriores de implementación y comprobaciones se conservaron en el [archivo histórico](docs/archivo/2026-10-10/handoff-anterior.md). No interpretarlas como instrucciones pendientes. Si una regla del producto parece contradecir el código o una decisión posterior, comprobar la evidencia y señalar la discrepancia antes de actuar.

## Regla permanente: novedades

**Cada cambio visible para el usuario suma una línea a `lib/novedades.ts`.**
Si el cambio sale en una versión nueva, se agrega una entrada nueva arriba
(número mayor, fecha y de 2 a 4 líneas cortas en tono de marca). Al abrir la
app después del despliegue, cada persona ve esas novedades una sola vez (la
primera vez que alguien entra no se le muestran). La versión actual se ve en
el menú de la tienda. Cambios internos sin efecto visible no llevan línea.


## Regla permanente: campos de texto y teclado (iPhone)

**Nunca animar ni remontar los ancestros de un campo de texto al enfocarlo o al cambiar el tamaño;
`focus()` siempre dentro del gesto del usuario; no cambiar `key` ni estado de layout por eventos de
`resize`/`visualViewport`.** En concreto:
- Ningún `useEffect` con listeners de `resize`/`visualViewport` cambia estado de React, ni el
  alto/posición de una hoja, ni llama a `focus()`. El teclado solo puede escribir una variable CSS
  (`--teclado`) y desplazar el contenido para dejar a la vista el campo enfocado (ver `components/hoja.tsx`).
- Los efectos que manejan foco (bloquear fondo, devolver el foco al cerrar) son **estables**: sin
  dependencias que cambien. Si se vuelven a ejecutar con un campo enfocado, su limpieza le quita el foco.
- Ninguna transición de vista (`ViewTransition`, `startViewTransition`, `addTransitionType`): en iOS
  le quita el foco al campo. Ya no se usan en ninguna parte.
- Una hoja con campos de texto es `"grande"` (una `"auto"` crece con el `--teclado` y se mueve). Si un toque abre un
  campo (ej. el selector de cliente), el `focus()` va en el mismo toque: `flushSync` + `focus()`.
- Toda hoja o pantalla nueva con campos de texto se prueba con `npm run probar:teclado`
  (`scripts/probar-teclado.mjs`, con la app corriendo): agrégale el campo nuevo.


## Regla permanente: movimiento

**Movimiento solo en hojas, barra de navegación y microinteracciones de un solo
elemento. Prohibido animar la página completa al cambiar de pestaña y prohibido
animar cada elemento de una lista o grilla al entrar. Solo `transform` y
`opacity`, con la excepción aprobada de `stroke-dashoffset` en el SVG de las
donas de Catálogo y Clientes.** Cambiar de pestaña es instantáneo; las listas y grillas aparecen de
una vez; las fotos no se funden al cargar; no hay librería de animación.

Toda pantalla o componente nuevo sigue `docs/08-movimiento.md`: tokens
(`--mov-*`, `--curva-*` en `app/globals.css` y `lib/movimiento.ts`), nada que haga
esperar un toque y respeto por `prefers-reduced-motion`. Los elementos tocables,
números, avisos y cargas usan los componentes base (`tocable`, `Numero`,
`Segmentos`, `Esqueleto`…).

**Excepción concreta de movimiento para «Tu próxima jugada»:** el resplandor granulado fijo al pie de su Hoja, visible desde que se abre la galería o un detalle, puede moverse continuamente con `transform` y `opacity`. Es decorativo, queda detrás del contenido, no bloquea toques y queda estático con movimiento reducido. La tarjeta inicial comparte ese brillo; al abrir galería o detalle hay una capa breve de morph o barrido y un pulso, y al abrir o elegir un borrador y al tocar «Ver más clientes» otro pulso. `LuzJugada` mantiene quietos el recorte y el grano; tres manchas independientes completan ciclos suaves de 8 s. Pulsos de 520 ms sustituibles y transiciones difusas de 480 ms; nunca se escala o desplaza un fondo rectangular. Todo usa solo transform y opacidad; con movimiento reducido no hay transición. Cabecera y desenfoque de `Hoja` siempre quedan encima del contenido desplazable y de las capas decorativas. Las reglas generales siguen vigentes: nada de transiciones de página ni entradas escalonadas de listas. Ver `docs/08-movimiento.md`.

**Excepción concreta de movimiento para el carrusel del catálogo (11 oct 2026):** las barras tipo historia llenan su segmento activo con una animación de `transform: scaleX()` (5 s, lineal; pausada con `animation-play-state`) y la vista enfocada de fotos entra y sale con `opacity` y `transform` (`--mov-normal`/`--mov-rapida`, `--curva-*`); el zoom y los gestos de esa vista siguen al dedo con `transform`. Con movimiento reducido no hay avance automático ni animación de entrada o salida. Ver `docs/04-pantallas.md` (catálogo público).

**Excepción concreta de movimiento para la landing de deslizapp.com (14 oct 2026, `docs/prompts/landing-demo-scroll.md`, `referencias/landing/ajustes-lewis-2.md` a `-12.md`):** en `/conoce`, la demo de un pedido va por pasos: cada deslizamiento es un paso (`scroll-snap` con `scroll-snap-stop: always`) y la animación de ese paso siempre termina; al subir, lo mismo hacia atrás. Primero, una portada con el video de Lewis (`public/landing/portada-v2.*`, sin sonido): la primera vuelta se ve entera y limpia, solo con «Saltar»; al terminarla (o al primer gesto, o a los 10 s) sigue en bucle sin parar, salvo con la pestaña oculta, y entran el icono de la app arriba a la izquierda, el lema que sube y el teléfono bloqueado que asoma por abajo con un aviso de Tu Tienda (con movimiento reducido, ahorro de datos o sin autoplay, solo el póster y todo desde el principio); debajo, «Desliza y mira» (un círculo mandarina con una flecha hacia arriba) da un saltito suave hacia arriba en bucle mientras se espera, la única animación continua de la página, que se quita con movimiento reducido y al primer deslizamiento; tocarlo hace lo mismo que deslizar. El desbloqueo es la única transición que sigue al dedo: el teléfono sube, la pantalla de bloqueo se va y el catálogo crece de 0.88 a 1 aclarándose (el único `filter` que se anima, solo ahí) en proporción al scroll entre la portada y el primer paso, y el scroll-snap hace de resorte; el icono se achica de 52 a 40 px en su esquina y, al pasar de la compradora a la tienda (el paso «cambio»), su versión rosada se funde en 300 ms con la verde, y al revés al retroceder; después los teléfonos son mockups de iPhone con la app real dentro (iframes de `app/demo-landing`, en memoria y sin tocar el historial de la página). Se mueven con `transform` y `opacity`: los teléfonos al cambiar de persona (el de la compradora sale desenfocándose), las burbujas, que son mensajes enviados de WhatsApp (verde claro, Fredoka; la nueva nace pequeña abajo a la derecha y crece a su sitio en unos 320 ms con un poco de rebote; las anteriores suben; sin desenfoque), y el ♥ mandarina del like, que es el dedo de la demo: aparece antes de cada toque, va al sitio, hace un pulso (un círculo que se abre) y se va; en el cruce de un teléfono al otro viaja y se desvanece; en los demás pasos no se ve (`lib/landing/pasos.ts`, campo `dedo`). El indicador (a la izquierda, sin texto) tiene una raya gruesa por paso que crece al llegar y finas por cada toque o fase, que se llenan mientras el paso avanza. Arriba queda el desenfoque progresivo fijo (`.hoja-borde`); abajo ya no. Fuera de ese saltito y del video de la portada, nada se mueve solo: sin scroll, la escena queda quieta. Con movimiento reducido, cada paso en su estado final sin transición y sin ♥; sin JavaScript, la misma historia en pasos estáticos. Prueba: `node scripts/probar-landing.mjs`.

**Excepción concreta de movimiento para la página principal de deslizapp.com (15 oct 2026, `docs/prompts/pagina-principal-y-conoce.md`):** en `/` sin sesión (`components/inicio-publico`; la landing con la demo pasó a `/conoce`), el fondo es el feed de la tienda Deslizapp en tres columnas (seis en escritorio) giradas −7° que suben sin parar, cada una a su velocidad (45 a 75 s por vuelta, con la lista duplicada para no tener costura), y cada 3.5 s, alternando, un corazón mandarina con «aaah» hace su pulso sobre una foto (dentro de ella, sube con ella) o una burbuja de WhatsApp como las de la landing crece desde abajo, se queda unos 3 s y se va. Todo con `transform` y `opacity`; se pausa con la pestaña oculta. Con movimiento reducido, nada se mueve: las columnas quietas, sin corazones y una sola burbuja fija. Prueba: `node scripts/probar-inicio.mjs`.

**Regresión de historial detectada al validar las animaciones:** al cerrar los borradores,
el guard de Strict Mode impedía retirar su entrada también en producción. Ese guard
solo corresponde a desarrollo. La salida vuelve a consumir la entrada de la hoja
apilada; el siguiente «atrás» regresa a la galería sin necesitar un segundo toque.
La mezcla de color del velo se aplica en la capa decorativa de `Hoja`, bajo el blur
y la cabecera, para conservar el contraste del texto.


**Actualización de la portada de `/conoce` (15 oct 2026, [encargo](docs/prompts/video-v2-y-entrar.md), [spec](docs/04-pantallas.md#página-principal-y-demo-pública-15-oct-2026)):** sustituye el video anterior por `public/landing/portada-v2.*`. La primera vuelta se ve limpia, solo con «Saltar»; después sigue en bucle y entra el contenido. Un gesto lo revela al momento; tope de 10 s. Con movimiento reducido o ahorro de datos solo se sirve el póster, sin solicitar video. `/` y `/entrar` comparten la página principal y sus avisos, también tras un cierre de sesión en el navegador.

## Importante sobre esta versión de Next.js

Este proyecto usa **Next.js 16** (App Router), que tiene cambios respecto a
versiones anteriores que puede que tu conocimiento no refleje (por ejemplo,
`params` y `searchParams` llegan como `Promise` en las páginas, y existen los
helpers globales `PageProps<'/ruta'>` / `LayoutProps<'/ruta'>`). Antes de
escribir rutas o layouts, revisa `node_modules/next/dist/docs/01-app/` —
ahí está la documentación exacta de esta versión instalada.


## Regla permanente: gestos de las hojas del catálogo del cliente
- Toda hoja del catálogo del comprador va dentro de `PanelCatalogo` (`components/tienda/dialogo.tsx`). El cuerpo se gestiona con **touch events no pasivos** y la lógica pura de `lib/gesto-hoja.ts`: a media altura, deslizar arriba **expande**; expandida, el contenido hace scroll; deslizar abajo con el cuerpo en `scrollTop = 0` arrastra (más de 90 px cierra, o reduce si estaba expandida); con el cuerpo scrolleado hace scroll. Los gestos más horizontales que verticales se ignoran (carruseles).
- El asa y la cabecera (`.grab`, `.shead`, `.wahead`, `.wagrab`) siguen con pointer events y `touch-action: none`; el resto de la hoja es `touch-action: pan-y`.
- El touchmove que decide "scroll" o "ignorar" **nunca se cancela** (`debeCancelar` en `lib/gesto-hoja.ts`): cancelarlo en iOS puede bloquear el scroll nativo de todo el gesto.
- Expandida, el contenido hace scroll **desde el mismo gesto que expandió** (el JS lo guía con el dedo en cuanto el cuerpo puede desplazarse) y el contenedor de scroll se busca al decidir el gesto, no solo al tocar. Si Safari no inicia el scroll nativo (el dedo se movió más de 24 px y `scrollTop` no cambió), el gesto lo guía el JS. El cuerpo de una hoja `.full` es `flex: 1 1 0; min-height: 0; overflow-y: auto`.
- Con un campo enfocado dentro de la hoja, el gesto del cuerpo no actúa (no se anima ni se pierde el teclado). Prueba: `npm run probar:hojas-gestos` (`scripts/probar-hojas-gestos.mjs`) y `tests/gesto-hoja.test.mjs`.


## Revisión automática en GitHub

Cada PR y cada push a `main` corre el check **«Revisión»** (`.github/workflows/revision.yml`): `npm ci`, `npm run tipos` (`next typegen && tsc --noEmit`), `npm test` y `npm run lint`. Sin `build` (lo hace Vercel) y sin Playwright. No usa secretos ni variables de entorno.

- Un PR con «Revisión» en rojo **no se fusiona**.
- Los tipos `PageProps`/`LayoutProps` los genera `next typegen`; correr `tsc` solo, sin generarlos, da errores falsos. Usa `npm run tipos`.
- Las pruebas de navegador (`scripts/probar-*.mjs`) no corren en «Revisión»: cómo correrlas, qué necesita cada una del entorno y por qué algunas se saltan, en [docs/pruebas-del-navegador.md](docs/pruebas-del-navegador.md).
- Los minutos de GitHub Actions son limitados: no lances corridas de más (el flujo cancela las viejas de la misma rama).

