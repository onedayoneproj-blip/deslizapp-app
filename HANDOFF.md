# Deslizapp — Panel de tienda (handoff para Claude Code)

Este repo es el punto de partida del **panel de administración** de Deslizapp: la
app web donde el dueño de una tienda (ej. Esencias Michel) gestiona su catálogo,
ve sus pedidos, los despacha, arma promos y revisa cómo le va.

**No confundir con:** el catálogo público que ven los clientes finales (el que
se desliza tipo Instagram Reels y pide por WhatsApp). Ese ya existe como un HTML
independiente y **por ahora se mantiene separado** de este proyecto. Este repo
es solo el lado del dueño de la tienda.

Este documento es el punto de entrada. Antes de escribir código, lee en este
orden:

1. `docs/01-marca.md` — voz, colores, tipografía. Todo lo que se muestre debe sentirse como esto.
2. `docs/02-alcance.md` — qué entra en esta primera versión y qué no.
3. `docs/03-modelo-de-datos.md` — las tablas, ya con la forma que tendrán en Supabase.
4. `docs/04-pantallas.md` — spec de cada pantalla, campo por campo, sacada de los mockups ya validados.
5. `docs/05-arquitectura.md` — cómo se construye esto con datos falsos hoy sin tener que rehacerlo cuando se conecte Supabase.
6. `docs/06-orden-de-construccion.md` — en qué orden construir, y el criterio de "listo" de cada paso.
7. `docs/07-fase-2-cuentas-y-cobros.md` — **solo lectura por ahora:** decisiones ya tomadas para la fase 2 (verificación de Instagram, zona de administración, cobros manuales). No se construye en la primera entrega.
8. `docs/08-movimiento.md` — el sistema de movimiento: cómo se anima todo (reglas obligatorias para lo nuevo).

Además, en `referencias/` está el **prototipo interactivo y navegable del panel** (`referencias/prototipo-interactivo/Main.dc.html`, ábrelo en el navegador) y otros HTML de referencia. Es la referencia visual principal; los `docs/` mandan en reglas de datos, stock y créditos (ver `referencias/LEEME.md`).

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
`opacity`.** Cambiar de pestaña es instantáneo; las listas y grillas aparecen de
una vez; las fotos no se funden al cargar; no hay librería de animación.

Toda pantalla o componente nuevo sigue `docs/08-movimiento.md`: tokens
(`--mov-*`, `--curva-*` en `app/globals.css` y `lib/movimiento.ts`), nada que haga
esperar un toque y respeto por `prefers-reduced-motion`. Los elementos tocables,
números, avisos y cargas usan los componentes base (`tocable`, `Numero`,
`Segmentos`, `Esqueleto`…).

## Hojas inferiores

Para elegir algo de una lista larga dentro de una hoja (cliente, producto, y en el paso 8 producto o colección) se usa
`components/selector-busqueda.tsx` (`SelectorBusqueda`, `FilaAccion`, `ListaSeleccion`) y los helpers de `lib/texto.ts`
y `lib/telefono.ts`: una vista más DENTRO de la misma hoja, nunca una segunda hoja encima. Lo fijo arriba va
con `<HojaFijoArriba>` (dentro de la cabecera y de su desenfoque: nunca `sticky` suelto) y lo fijo abajo con
`<HojaFijoAbajo>` / `PildoraSeleccion` (se oculta con el teclado).

Toda hoja nueva (detalle de pedido, nuevo pedido, nueva promo…) usa el
componente `Hoja` de `components/hoja.tsx` y elige su altura con la propiedad
`altura`: `"auto"` (contenido corto), `"expandible"` (contenido largo: abre a
media altura) o `"grande"` (formularios largos). La forma (pegada a los bordes,
esquinas de arriba de 30 px, tope bajo la barra de estado), la cabecera fija con
borde de desplazamiento, cerrar deslizando, el teclado y la accesibilidad ya
vienen resueltos ahí (detalle en `docs/04-pantallas.md`).

## App instalable (PWA)

- `app/manifest.ts` + íconos en `public/icons/` y `app/icon.png` (se regeneran con
  `node scripts/generar-iconos.mjs` a partir de `referencias/iconos/icono-vendedores.png`,
  la "d" verde sobre crema). El ícono rosado es de la futura app marketplace: no se usa aquí
  (ver "Íconos de las apps" en `docs/01-marca.md`).
- `public/sw.js` (solo en producción): red primero para páginas y código,
  caché para imágenes, fuentes e íconos. Nunca guarda HTML por adelantado.
- Aviso "Hay una versión nueva": compara el despliegue compilado
  (`NEXT_PUBLIC_ID_DESPLIEGUE`, ver `next.config.ts`) con `/api/version`.

## Importante sobre esta versión de Next.js

Este proyecto usa **Next.js 16** (App Router), que tiene cambios respecto a
versiones anteriores que puede que tu conocimiento no refleje (por ejemplo,
`params` y `searchParams` llegan como `Promise` en las páginas, y existen los
helpers globales `PageProps<'/ruta'>` / `LayoutProps<'/ruta'>`). Antes de
escribir rutas o layouts, revisa `node_modules/next/dist/docs/01-app/` —
ahí está la documentación exacta de esta versión instalada.

## Estado actual del repo

- Next.js 16 + TypeScript + Tailwind v4 + App Router, publicado en Vercel
  (https://deslizapp-app.vercel.app; cada push a `main` publica solo).
- Hechos: tema de marca, capa de datos de prueba (`useData()` + `localStorage`),
  layout con navegación, Plan y créditos, Catálogo, retoque de fotos, Pedidos
  (lista, detalle, despacho con stock y pedido manual), Clientes (derivados de los pedidos), Promos (estado por fechas) y app instalable con novedades. El avance paso a paso está en `docs/06-orden-de-construccion.md`.
- No hay Supabase conectado todavía (ver `docs/05-arquitectura.md` para el porqué
  y el cuándo, y `docs/07-fase-2-cuentas-y-cobros.md` para lo que viene después).

## Qué se espera de esta primera entrega

Construir las pantallas descritas en `docs/04-pantallas.md`, funcionando por
completo contra datos de prueba (ver `docs/05-arquitectura.md`), con
navegación real entre ellas, multi-tienda desde el modelo de datos (aunque el
selector de tienda pueda ser simple al inicio), y fiel a la identidad visual
de `docs/01-marca.md`. Al terminar, el dueño de una tienda debería poder abrir
la app, ver su catálogo, recibir y despachar un pedido, crear una promo y ver
su resumen semanal — todo con datos falsos pero con la sensación de producto
terminado.

Supabase, autenticación real con Google, y el catálogo público integrado
quedan fuera de esta entrega (están detallados como próximos pasos en
`docs/05-arquitectura.md` y `docs/06-orden-de-construccion.md`, para que quien
retome sepa exactamente qué sigue).
