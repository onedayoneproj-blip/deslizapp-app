# El botón de crear, siempre el flotante de abajo a la derecha (rama `fix/boton-crear-flotante`)

> **Modelo:** en Claude Code, Sonnet 5.5; en Codex, el modelo principal con razonamiento medio. **Sin migraciones.** Solo el panel. **Deja el PR abierto con su preview** para que Lewis lo vea en el iPhone. No hagas merge.

> **Orden:** el PR #71 (`fix/selector-catalogos-ajustes`) todavía puede estar sin mergear y toca la misma línea del botón en `vista-catalogo.tsx`. **Si no está en `main`, parte de esa rama** (`git fetch origin fix/selector-catalogos-ajustes`), crea `fix/boton-crear-flotante` desde ahí y abre el PR con **base en `fix/selector-catalogos-ajustes`**, diciendo en la descripción que depende del #71. Si ya está en `main`, parte de `main`.

## 0. Antes de empezar

Lee `docs/00-contexto-del-proyecto.md`, `AGENTS.md`, `HANDOFF.md`, `docs/09-sistema-de-diseno.md` y `docs/11-voz-y-frases.md`. Tu puesto es **Coding**.

Mira: `components/panel/boton-flotante.tsx` (**no lo toques**), `components/catalogo/vista-catalogo.tsx`, `components/clientes/vista-clientes.tsx`, `components/promos/vista-promos.tsx`, `components/pedidos/vista-pedidos.tsx` y `EstadoVacio`.

## 1. Lo que pasa y lo que quiere Lewis (8 oct 2026)

En cada pestaña (Pedidos, Catálogo, Clientes, Promos) el botón de crear es **el botón flotante naranja de abajo a la derecha** («+ Pedido», «+ Producto», «+ Cliente», «+ Promo»; es el mismo componente `BotonFlotante` en las cuatro). **Ese es el botón correcto y no se cambia.**

El problema: en algunas pestañas, **cuando no hay nada**, el botón flotante se esconde y el estado vacío pone **una píldora naranja grande al centro de la pantalla** («Agregar cliente», «Crear promo», «Publicar mi primer producto»). Lewis no quiere eso: **el botón de crear es siempre el flotante, en su sitio, también con la pestaña vacía.**

Dónde pasa hoy (confirmado en el código):
- **Clientes:** `{!(clientes && total === 0) && <BotonFlotante …/>}` y el estado vacío con `accion={{ texto: "Agregar cliente", … }}`.
- **Promos:** `{!sinPromos && <BotonFlotante …/>}` y el estado vacío con `accion={{ texto: "Crear promo", … }}`.
- **Catálogo:** con la tienda entera sin productos se esconde el flotante y el estado vacío trae «Publicar mi primer producto» (con un catálogo vacío dentro de una tienda con productos ya está bien desde #71).
- **Pedidos:** ya es siempre el flotante; revisa que ningún estado (vacío, error, filtros) ponga otro botón de crear.

## 2. Qué se hace

1. En esas tres pestañas, el **flotante se ve siempre** (cargando, vacío, con datos), con su «+» y su palabra, abajo a la derecha, como en Pedidos.
2. **Se quitan los botones de crear de los estados vacíos** (la píldora al centro). El estado vacío se queda con su ilustración, título y remate, y el remate manda al flotante con la voz de la marca (por ejemplo, «Toca + Cliente y agrega el primero.»; no repitas el nombre del botón de forma torpe; mira cómo quedó el catálogo vacío en #71).
3. Lo que **no** es un botón de crear sigue como está (por ejemplo «Reintentar», «Quitar filtros», un botón de «Pedirlo» del catálogo en línea).
4. Respeta los casos de hoy: permisos (`bloqueado`, tostada de «Esto lo hace quien administra la tienda.»), «plan lleno» en Catálogo y el espacio que reserva `BotonFlotante` para no tapar el último elemento.
5. Revisa **todas** las pantallas que usan `EstadoVacio` con `accion` de crear dentro de estas cuatro pestañas (también las sub-pestañas de Pedidos y Promos, p. ej. promos terminadas) y déjalas igual de consistentes.

## 3. Reglas

- No cambies el aspecto, el tamaño ni la posición de `BotonFlotante`.
- Textos mínimos y con la voz de `docs/11`; sin exclamaciones.
- Sin movimiento nuevo. No toques el catálogo del comprador.
- Novedad en `lib/novedades.ts` solo si la dueña lo nota (versión siguiente a la de `main`).

## 4. Pruebas y cierre

- **Verificación completa pedida por Lewis («por si acaso»):** antes de abrir el PR, recorre **las cuatro pestañas en todos sus estados** (cargando, vacía, con datos, filtro sin resultados, error, sin permiso) en demo y en la tienda de ensayo, y comprueba por código y con capturas que **en ninguna** sale un botón de crear que no sea el flotante, y que el flotante siempre se ve abajo a la derecha. Adjunta una tabla pestaña × estado en el PR.

- Navegador (demo `?demo`, 390 y 360; Lino & Algodón no tiene clientes ni promos): capturas de las cuatro pestañas **vacías y con datos** antes y después; el flotante en su sitio en todas; ningún botón de crear al centro; la tienda de ensayo con la tienda entera sin productos.
- `tsc`, `npm test`, `npm run lint` (sin avisos nuevos), `npm run build` y las regresiones de pedidos, clientes, promos y catálogo.
- Actualiza `docs/04-pantallas.md` (estados vacíos).
- **PR abierto con preview.** Resume en español, corto: qué cambió y qué debe probar Lewis en el iPhone (abrir Clientes y Promos en una tienda sin clientes ni promos y ver el botón de abajo a la derecha, sin la píldora del centro).
