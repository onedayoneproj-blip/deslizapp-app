# Orden de construcción

Sugerido, no obligatorio — pero cada paso depende del anterior, así que
conviene no saltarlos. Cada uno tiene su criterio de "listo".

Antes de cada pantalla, ábrela en `referencias/prototipo-interactivo/Main.dc.html`:
es la guía visual. Lo que construye cada paso está en `04-pantallas.md`.

**Estado:** pasos 0–5 hechos (incluidos la hoja de Plan y créditos y la
publicación en Vercel). Sigue el paso 6.

## 0. Preparación

- Leer `01-marca.md`, `02-alcance.md`, `03-modelo-de-datos.md`, `04-pantallas.md`, `05-arquitectura.md` y `referencias/LEEME.md`
- Revisar `node_modules/next/dist/docs/01-app/` para los cambios de esta versión de Next.js
- `npm run dev` y confirmar que el scaffold corre

**Listo cuando:** la app placeholder de Next.js carga en `localhost:3000`.

## 1. Tema de marca

- Cargar Fredoka, Figtree y Caveat (Google Fonts) en `app/layout.tsx`
- Definir los 4 colores de marca como variables de Tailwind/CSS
- Un componente de prueba (ej. la propia página de inicio) debe verse con la tipografía y colores correctos

**Listo cuando:** un titular en Fredoka verde bosque y un botón mandarina se ven correctos en pantalla.

## 2. Tipos y capa de datos

- `lib/types.ts` con todos los tipos de `03-modelo-de-datos.md`
- `lib/data/seed/*.json` con datos de prueba realistas, generados con
  `scripts/generar-seed.mjs`: Esencias Michel con los productos, clientes,
  pedidos (#1038–#1042) y promos del prototipo, más una segunda tienda
  (Luna Bisutería)
- `lib/data/provider.tsx` (almacén en el navegador con `localStorage`) y las
  operaciones por entidad en `lib/data/*.ts`, expuestas con `useData()` (ver
  `05-arquitectura.md`)
- `lib/config.ts` con las constantes de negocio (costo de retoque, créditos
  mensuales, límites por plan)
- Acciones de demo: "Reiniciar datos de prueba" y "Simular pedido del catálogo"

**Listo cuando:** una página de prueba muestra los productos de la tienda
activa y NO los de otra tienda de prueba; un producto creado sigue ahí
después de recargar el navegador; y "Reiniciar datos de prueba" lo borra.

## 3. Layout y navegación

- `app/(dashboard)/layout.tsx`: barra inferior flotante de 5 íconos (Inicio ·
  Catálogo · Pedidos · Clientes · Promos) + encabezado con logo/nombre de
  tienda + botón de créditos
- Selector de "tienda activa" (en el menú de la tienda) que determina el
  `tiendaId` usado por toda la app
- Avisos (toast) arriba y hoja inferior reutilizable
- Hoja **Plan y créditos** (pantalla 8 de `04-pantallas.md`): plan actual,
  saldo de créditos y botón "Escribirle a Deslizapp" (WhatsApp). Sin compras.

**Listo cuando:** se puede navegar entre las 5 secciones y cambiar de tienda
de prueba, viendo que cada una trae sus propios datos; y el botón de créditos
abre Plan y créditos con el plan y el saldo de la tienda activa.

## 3b. Publicar en Vercel — ✅ hecho

- Repositorio conectado a Vercel: https://deslizapp-app.vercel.app
- Cada push a `main` publica solo (no hay pasos manuales)
- Nada lee `localStorage`, `window` ni `document` durante el render del
  servidor: el `DataProvider` pinta la pantalla de carga en el servidor y en
  el primer render del cliente, y los datos aparecen después (sin errores de
  hidratación)
- Las variables de Supabase se agregarán en Vercel (Settings → Environment
  Variables) cuando se conecte la base de datos

**Listo cuando:** la app publicada abre en el celular, carga los datos de
prueba y no muestra errores de hidratación en la consola.

## 4. Catálogo

- Grilla de productos (con precio de promo y etiquetas Agotado/Oculto/−%) +
  medidor de plan (abre Plan y créditos)
- Buscador y filtros Todos / Visibles / Agotados / Ocultos
- Formulario de crear/editar producto: foto (reducida a 800 px), nombre,
  precio, stock, colección, "Visible en el catálogo" (sin el retoque todavía)

**Listo cuando:** se puede crear un producto nuevo con foto, verlo aparecer
en la grilla, editarlo y desactivarlo (pasa a "Ocultos"), sin recargar la
página; y el buscador y los filtros encuentran lo esperado.

## 5. Retoque de fotos (dentro del formulario de producto)

- Tarjeta "Retocar foto" con Antes/Después y el comportamiento descrito en `04-pantallas.md`
- Descuento de créditos de la tienda activa al publicar/guardar

**Listo cuando:** publicar con el retoque activo descuenta 5 créditos visibles
en el encabezado, y si no alcanzan, el interruptor se bloquea con un mensaje
de marca y un botón "Ver plan" (no hay compra de créditos).

## 6. Pedidos + Detalle + Despacho

- Lista de pedidos con pestañas Nuevos / Por despachar / Despachados, "#numero · hace cuánto"
- Detalle de pedido con línea de avance, "Escribir" (WhatsApp) y totales
- Botón "Despachar pedido" que actualiza `estado`, `despachado_en`, y el
  `stock` de cada producto involucrado
- Pedido manual ("+ Pedido"), que toma el siguiente `numero` de la tienda

**Listo cuando:** un pedido nuevo se puede confirmar y luego despachar;
despachar un pedido con un producto de `stock = 1` deja ese producto en
`stock = 0` y se refleja como "Agotado" tanto en el detalle del pedido como
en el Catálogo; e intentar despachar otro pedido con ese mismo producto
muestra el aviso de falta de stock en vez de dejar el stock en negativo (en
el seed: Choker Perla de Luna Bisutería está en #1003 y #1004 con stock 1).

## 7. Clientes

- Buscador, los 3 contadores, la etiqueta "Repite" y el total gastado
- Hoja del cliente con "Escribir" e historial; "+ Cliente"
- Los clientes deben derivarse de los pedidos de prueba ya creados (no una
  lista aparte sin relación)

**Listo cuando:** un cliente con 2+ pedidos de prueba muestra "Repite"
automáticamente, sin que alguien lo marque a mano.

## 8. Promos

- Crear promo por código / colección / producto (solo en %), con vista previa
- Pestañas Activas / Programadas / Terminadas según fechas; "Usada en N pedidos" en los códigos

**Listo cuando:** una promo con `fecha_fin` en el pasado aparece en
"Terminadas" sin intervención manual.

## 9. Resumen

- Se construye al final porque depende de que ya existan pedidos, productos
  y likes de prueba con los que calcular algo real
- Saludo, tarjeta de pedidos nuevos, selector Hoy / 7 días / Este mes,
  tarjeta de ventas con variación y barras, Pedidos, Ticket promedio, Aaahs,
  De aaah a pedido, top 3, "Ojo con el stock" y tarjeta del plan

**Listo cuando:** los números del Resumen salen de `eventos_aaah` y
`pedidos` (no son un mockup estático): usar "Simular pedido del catálogo"
hace subir los pedidos y las ventas del periodo, y cambiar de periodo cambia
todas las cifras.

## 10. Repaso final

- Recorrer las pantallas como si fueras el dueño de la tienda: crear un
  producto, recibir un pedido de prueba, despacharlo, ver que aparece el
  cliente, crear una promo, revisar el resumen
- Confirmar que cambiar de tienda de prueba (paso 3) no mezcla datos entre
  tiendas en ninguna pantalla
- Confirmar que los estados vacíos tienen el tono de marca, no texto genérico
