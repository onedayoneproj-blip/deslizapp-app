# Orden de construcción

Sugerido, no obligatorio — pero cada paso depende del anterior, así que
conviene no saltarlos. Cada uno tiene su criterio de "listo".

## 0. Preparación

- Leer `01-marca.md`, `02-alcance.md`, `03-modelo-de-datos.md`, `04-pantallas.md`, `05-arquitectura.md`
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
- `lib/data/seed/*.json` con datos de prueba realistas (usar los nombres del
  mock: Esencias Michel, Kiara Pink, Mayar, Shé, Carolina Peña, Luis Marte,
  etc. — ya están validados y le sonarán familiares al dueño)
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

- `app/(dashboard)/layout.tsx`: navegación inferior de 5 íconos (Inicio ·
  Catálogo · Pedidos · Clientes · Promos) + encabezado con logo/nombre de
  tienda + créditos
- Selector simple de "tienda activa" (dropdown o similar) que determina el
  `tiendaId` usado por toda la app

**Listo cuando:** se puede navegar entre las 5 secciones y cambiar de tienda
de prueba, viendo que cada una trae sus propios datos.

## 4. Catálogo

- Grilla de productos + medidor de plan
- Formulario de crear/editar producto (sin el toggle de retoque todavía)
- Activar/desactivar producto

**Listo cuando:** se puede crear un producto nuevo, verlo aparecer en la
grilla, editarlo y desactivarlo, sin recargar la página.

## 5. Retoque de fotos (dentro del formulario de producto)

- Toggle "Retocar foto" con el comportamiento descrito en `04-pantallas.md`
- Descuento de créditos de la tienda activa

**Listo cuando:** activar el toggle descuenta créditos visibles en el
encabezado, y si los créditos llegan a 0, el toggle se bloquea con un mensaje
de marca.

## 6. Pedidos + Detalle + Despacho

- Lista de pedidos con pestañas por estado
- Detalle de pedido
- Botón "Despachar pedido" que actualiza `estado`, `despachado_en`, y el
  `stock` de cada producto involucrado

**Listo cuando:** un pedido nuevo se puede confirmar y luego despachar;
despachar un pedido con un producto de `stock = 1` deja ese producto en
`stock = 0` y se refleja como "Agotado" tanto en el detalle del pedido como
en el Catálogo; e intentar despachar otro pedido con ese mismo producto
muestra el aviso de falta de stock en vez de dejar el stock en negativo.

## 7. Clientes

- Lista con los 3 contadores y la etiqueta "Repite"
- Los clientes deben derivarse de los pedidos de prueba ya creados (no una
  lista aparte sin relación)

**Listo cuando:** un cliente con 2+ pedidos de prueba muestra "Repite"
automáticamente, sin que alguien lo marque a mano.

## 8. Promos

- Crear promo por código / colección / producto
- Pestañas Activas / Programadas / Terminadas según fechas

**Listo cuando:** una promo con `fecha_fin` en el pasado aparece en
"Terminadas" sin intervención manual.

## 9. Resumen

- Se construye al final porque depende de que ya existan pedidos, productos
  y likes de prueba con los que calcular algo real
- Tarjeta de aaahs + gráfico de barras + conversión + top 3 productos

**Listo cuando:** los números del Resumen salen de `eventos_aaah` y
`pedidos` (no son un mockup estático): usar "Simular pedido del catálogo"
hace subir el contador de pedidos del Resumen.

## 10. Repaso final

- Recorrer las 6 pantallas como si fueras el dueño de la tienda: crear un
  producto, recibir un pedido de prueba, despacharlo, ver que aparece el
  cliente, crear una promo, revisar el resumen
- Confirmar que cambiar de tienda de prueba (paso 3) no mezcla datos entre
  tiendas en ninguna pantalla
- Confirmar que los estados vacíos tienen el tono de marca, no texto genérico
