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

Además, en `referencias/` está el **prototipo interactivo y navegable del panel** (`referencias/prototipo-interactivo/Main.dc.html`, ábrelo en el navegador) y otros HTML de referencia. Es la referencia visual principal; los `docs/` mandan en reglas de datos, stock y créditos (ver `referencias/LEEME.md`).

## Regla permanente: novedades

**Cada cambio visible para el usuario suma una línea a `lib/novedades.ts`.**
Si el cambio sale en una versión nueva, se agrega una entrada nueva arriba
(número mayor, fecha y de 2 a 4 líneas cortas en tono de marca). Al abrir la
app después del despliegue, cada persona ve esas novedades una sola vez (la
primera vez que alguien entra no se le muestran). La versión actual se ve en
el menú de la tienda. Cambios internos sin efecto visible no llevan línea.

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
  layout con navegación, Plan y créditos, Catálogo, retoque de fotos y app
  instalable con novedades. El avance paso a paso está en `docs/06-orden-de-construccion.md`.
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
