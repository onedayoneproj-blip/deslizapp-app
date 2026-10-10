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

**Regresión de historial detectada al validar las animaciones:** al cerrar los borradores,
el guard de Strict Mode impedía retirar su entrada también en producción. Ese guard
solo corresponde a desarrollo. La salida vuelve a consumir la entrada de la hoja
apilada; el siguiente «atrás» regresa a la galería sin necesitar un segundo toque.
La mezcla de color del velo se aplica en la capa decorativa de `Hoja`, bajo el blur
y la cabecera, para conservar el contraste del texto.


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
- Los minutos de GitHub Actions son limitados: no lances corridas de más (el flujo cancela las viejas de la misma rama).
