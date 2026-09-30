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

## Pastillas de filtro

Un solo tamaño para todas (`Segmentos` y `Chip` en `components/controles.tsx`): tokens `--pastilla-alto` (36 px),
`--pastilla-px` (14 px), `--pastilla-letra` (13,5 / 14 px) y `--pastilla-contador` (20 px) en `app/globals.css`. Nadie pasa
un alto propio: para cambiarlas se edita un valor. Ancho natural, alineadas a la izquierda, y la fila de `Segmentos` se
desplaza en horizontal si no caben. Área de toque de 44 px o más con un pseudo-elemento invisible. Detalle en
`docs/04-pantallas.md`.

## Ticket de promo (Promos y selector de cupón)

Un solo componente, `components/promos/ticket-promo.tsx`, con dos tamaños: normal (lista de Promos, vía `tarjeta-promo.tsx`) y
compacto (selector de cupón de pedidos, `selector-descuento.tsx`). Colores y forma salen de ahí: no se duplica el ticket.
Fila de descuento de un pedido = `FilaDescuento` ("+ Agregar cupón" o ticket compacto con Cambiar / Quitar).

## Resumen: qué es una venta

Una **venta** es un pedido `despachado` (fecha = `despachado_en`, o `creado_en` si viniera nulo); un **pedido recibido** es cualquier
no cancelado (por `creado_en`); un **pendiente** es `nuevo` o `por_despachar`. Vive en `lib/resumen.ts` (`ventasDe`, `pendientesDe`,
`fechaDeVenta`) con pruebas en `tests/resumen.test.mjs`. Ventas, ticket promedio, top 3 y comparación usan solo ventas; "Pedidos
recibidos" y "De aaah a pedido" usan recibidos; Clientes: "total gastado" y "última compra" son solo despachados. La tarjeta de ventas
de Inicio muestra "Por despachar: N pedidos · RD$X" (toda la tienda). Detalle en docs/03 y docs/04.

## Ventas a crédito y abonos

Un pedido puede ser `contado` o `credito` (columnas `pago_modo` y `pago_fecha_acordada` de `pedidos`, que la app sí escribe) y los abonos
viven en la tabla `abonos` (solo lectura: se crean con la RPC `registrar_abono`, se borran con `eliminar_abono`). Todas las cuentas
(saldo, reparto del más viejo al más nuevo, "Atrasado N días" en hora de Santo Domingo, cuentas por cobrar, recordatorio) están en
`lib/credito.ts` con pruebas en `tests/credito.test.mjs`; la demo las usa en `lib/data/creditos.ts` y `lib/data/pedidos.ts` (la demo
reparte igual que la RPC y trae tres clientes que compraron fiado). Pantallas en `components/credito/` y detalle en docs/03 y docs/04.
Un pedido cancelado no genera deuda; las ventas del Resumen no cambian (cuentan al despachar, esté pagado o no). El recordatorio por
WhatsApp lo abre siempre el dueño. Las RPC de abonos aún no se probaron contra Supabase real. Al cambiar la forma de los datos de la
demo, su clave de almacenamiento pasó a `deslizapp-demo-v3` (los datos de prueba anteriores se reinician una vez).

## Catálogo en línea (enlace)

`tiendas.url_catalogo` (Mi marca) alimenta la tarjeta de la pestaña Catálogo (`components/catalogo/tarjeta-catalogo.tsx`), con 8 estados
que salen de `tiendas.catalogo_estado` (+ `catalogo_paso`, `catalogo_notas_cambios`, fechas) vía `lib/catalogo-estado.ts` (puro, con tests).
El dueño solo cambia el estado con las RPC `solicitar_catalogo`, `pedir_cambios_catalogo` y `publicar_catalogo` (nunca UPDATE directo);
el equipo hace el resto fuera de la app. La demo tiene "Simular avance del catálogo" en el menú de la tienda. Las RPC aún no se probaron
contra Supabase real. Detalle en docs/04-pantallas.md. El enlace se valida con `lib/enlace-catalogo.ts` (solo https) y nunca se pinta como
HTML. El catálogo todavía no se alimenta solo de los productos del panel. El de Esencias Michel vive provisionalmente en `/catalogos/esencias-michel.html` (`public/catalogos/`).

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
  (lista, detalle, despacho con stock y pedido manual), Clientes (derivados de los pedidos), Promos (estado por fechas, compartir), Mi marca (logo, colores y letra de los cupones), Resumen (Inicio, con cálculos en `lib/resumen.ts`) y app instalable con novedades. El avance paso a paso está en `docs/06-orden-de-construccion.md`.
- **Primera entrega cerrada** (pasos 0–10 de `docs/06-orden-de-construccion.md`). El repaso final, con lo que
  se probó, lo que se corrigió y lo pendiente, está en `docs/08-repaso-final.md`.
- **Supabase conectado (paso 11)**: dos modos detrás de la misma interfaz de datos — **demo** (seed +
  `localStorage`, sin login) y **real** (Supabase con Google; una cuenta = una tienda vía `usuarios`). El esquema
  vive en `supabase/migrations/` (manda sobre los docs). Cómo está armado: `docs/05-arquitectura.md`; reglas que
  pone la base y errores: `docs/03-modelo-de-datos.md`. Variables: `.env.example` (solo la llave publicable;
  nunca una secreta ni `service_role`). **Fotos y logos**: en modo real se comprimen en el navegador y se suben al
  bucket `productos` de Storage (`<tienda_id>/<uuid>.webp`, logo en `<tienda_id>/logo/`; JPEG en iPhone porque
  Safari no crea WebP); la base guarda solo la URL pública. Reglas en `lib/data/almacen.ts`. La demo sigue con data URLs.

### Lo que sigue (en este orden)

1. **Terminar Supabase**: recarga mensual de créditos en la base, y el Resumen con consultas agregadas cuando el
   historial crezca (sus pruebas, `npm test`, son el contrato). El seed (~900 KB) sigue dentro del código de la
   app por la demo: se puede cargar bajo demanda. Borrar un producto entero (hoy no existe en la app) deberá
   borrar también sus fotos del bucket (`rutasParaBorrar` en `lib/data/almacen.ts`).
2. **Cuentas** (verificación de Instagram, zona de administración para crear tiendas y filas de `usuarios`,
   cobros manuales): `docs/07-fase-2-cuentas-y-cobros.md`. Hoy las filas de `usuarios` se crean a mano en Supabase.
3. **Retoque de fotos con IA de verdad** (hoy es un efecto de demostración) con su descuento de créditos en el servidor.
4. **Catálogo público integrado**: el HTML independiente pasa a leer la marca (`marca_*`, `url_catalogo`) y las
   promos de cada tienda; los enlaces de compartir promo dejan de depender del enlace que escribe el dueño.
5. **Notificaciones** de pedidos nuevos (hoy solo el contador) y **sincronización entre dispositivos**.
6. Pendientes del repaso: `docs/08-repaso-final.md` ("Pendiente").

### Interruptores de negocio (`lib/config.ts`)

- `RETOQUE_REAL` (hoy `false`): mientras sea `false`, el retoque de fotos se presenta como demostración (etiqueta "Demo").
  Al conectar el retoque de verdad, pasar a `true`.
- `MOSTRAR_MARCA_DESLIZAPP_EN_CUPON` (hoy `true`): el "Hecho con Deslizapp" al pie de la imagen del cupón; pensado
  para quitarse por plan.
- `STOCK_BAJO`, `CREDITOS_POR_RETOQUE`, límites y nombres de plan: ver el mismo archivo.

## Qué se espera de esta primera entrega

Construir las pantallas descritas en `docs/04-pantallas.md`, funcionando por
completo contra datos de prueba (ver `docs/05-arquitectura.md`), con
navegación real entre ellas, multi-tienda desde el modelo de datos (aunque el
selector de tienda pueda ser simple al inicio), y fiel a la identidad visual
de `docs/01-marca.md`. Al terminar, el dueño de una tienda debería poder abrir
la app, ver su catálogo, recibir y despachar un pedido, crear una promo y ver
su resumen semanal — todo con datos falsos pero con la sensación de producto
terminado.

El catálogo público integrado queda fuera de esta entrega (Supabase y el
acceso con Google llegaron en el paso 11) (están detallados como próximos pasos en
`docs/05-arquitectura.md` y `docs/06-orden-de-construccion.md`, para que quien
retome sepa exactamente qué sigue).
