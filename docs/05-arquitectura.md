# Arquitectura: datos de prueba hoy, Supabase después

## La idea en una frase

Ninguna pantalla toca datos directamente — todas pasan por una capa de
funciones (`lib/data/`). Hoy esas funciones leen/escriben datos de prueba.
Cuando se conecte Supabase, se reescribe el *interior* de esas funciones para
que hablen con la base real. Las pantallas no cambian ni una línea.

Esto se llama patrón *repository*: la UI depende de una interfaz estable
("dame los productos de esta tienda"), no de dónde vienen los datos.

## Por qué no usar Supabase desde ya

No es una limitación técnica — Supabase se puede conectar en minutos. La
razón es de secuencia de trabajo: construir las 6 pantallas contra datos
falsos permite validar todo el flujo visual e interacción sin esperar a tener
el esquema de base de datos 100% definido, y sin que un cambio de idea en una
pantalla implique una migración de base de datos. El modelo de datos de
`03-modelo-de-datos.md` ya está pensado como si fuera Supabase — cuando se
conecte, el cambio es mecánico, no de diseño.

## Dónde viven los datos de prueba: en el navegador, no en el servidor

**Decisión importante.** El almacén de datos de prueba vive **en el navegador**
(estado de React + `localStorage`), no en una variable del servidor.

Por qué: una variable en memoria del servidor de Next.js *parece* funcionar en
`npm run dev`, pero falla en cuanto se publica la demo (por ejemplo en
Vercel). Ahí el servidor corre en funciones que se apagan y encienden solas,
cada una con su propia memoria, y además Next.js 16 pre-renderiza al compilar
las páginas que solo leen módulos importados. Resultado: el dueño crea un
producto, recarga, y el producto desapareció — o nunca apareció. Guardarlo
en el navegador evita todo eso: la demo funciona igual en local y publicada,
y los cambios sobreviven a recargar la página.

Consecuencias para la implementación:
- Las pantallas del panel son Client Components (`'use client'`) que leen de
  `lib/data/` a través de un proveedor de React (`DataProvider`) montado en
  `app/(dashboard)/layout.tsx`.
- Al cargar por primera vez, el almacén se llena con `lib/data/seed/*.json`;
  después, cada cambio se guarda en `localStorage`.
- Debe existir un botón discreto de **"Reiniciar datos de prueba"** (por
  ejemplo en el menú de la tienda) que borre `localStorage` y vuelva al seed.
  Sirve para repetir la demo con un cliente desde cero.
- Fotos subidas en esta etapa: se guardan como data URL reducida (máx. ~800 px
  de lado, JPEG) para no reventar el límite de `localStorage` (~5 MB). Las
  fotos del seed viven en `public/seed/`.

## Estructura de carpetas

```
app/
  (dashboard)/
    page.tsx             ← Resumen (pantalla de inicio, "/")
    catalogo/page.tsx
    catalogo/nuevo/page.tsx
    catalogo/[id]/page.tsx
    pedidos/page.tsx
    pedidos/[id]/page.tsx
    clientes/page.tsx
    clientes/[id]/page.tsx
    promos/page.tsx
    promos/nueva/page.tsx
    layout.tsx           ← DataProvider + encabezado + navegación inferior
  layout.tsx             ← layout raíz (fuentes, tema)
lib/
  data/
    provider.tsx         ← DataProvider: estado + persistencia en localStorage
    tiendas.ts
    productos.ts
    pedidos.ts
    clientes.ts
    promos.ts
    resumen.ts
    seed/                ← los datos de prueba en sí
      tiendas.json
      productos.json
      pedidos.json
      pedido_items.json
      clientes.json
      promos.json
      eventos_aaah.json
  types.ts               ← los tipos de 03-modelo-de-datos.md, en TypeScript
components/
  ...
public/
  seed/                  ← fotos de los productos de prueba
```

El Resumen va **dentro** de `(dashboard)` para que comparta la navegación
inferior con el resto de pantallas (si quedara en `app/page.tsx` se vería sin
navegación).

## Cómo se ve `lib/data/` por dentro (hoy)

`lib/types.ts` — los tipos salen directo de `03-modelo-de-datos.md`:

```ts
export type Producto = {
  id: string;
  tiendaId: string;
  nombre: string;
  precio: number;
  fotos: string[];
  fotoRetocada: boolean;
  categoria: string | null;
  activo: boolean;
  destacado: boolean;
  stock: number | null;
  likes: number;
  creadoEn: string;
  actualizadoEn: string;
};
// ... Tienda, Pedido, PedidoItem, Cliente, Promo igual que en 03-modelo-de-datos.md
```

`lib/data/provider.tsx` — el "almacén" de prueba. Arranca desde el seed, se
guarda en `localStorage` en cada cambio y expone un objeto `db` a las
funciones de `lib/data/` (el detalle de implementación queda a criterio de
quien construya; lo que importa es que las pantallas nunca lo toquen
directamente):

```tsx
'use client';
const KEY = "deslizapp-demo-v1";

function cargarInicial(): DB {
  const guardado = localStorage.getItem(KEY);
  return guardado ? JSON.parse(guardado) : construirDesdeSeed();
}
// DataProvider guarda `db` en estado de React y hace
// localStorage.setItem(KEY, JSON.stringify(db)) después de cada cambio.
// reiniciarDemo() hace localStorage.removeItem(KEY) y vuelve al seed.
```

`lib/data/productos.ts` — las operaciones sobre productos. Las pantallas no
las importan sueltas: las reciben ya conectadas al almacén a través del hook
`useData()`, con una firma que **no menciona de dónde vienen los datos**:

```ts
// Lo que ve una pantalla (hoy y el día de Supabase, idéntico):
const { getProductos, crearProducto, actualizarProducto } = useData();
const productos = await getProductos(tiendaId);
await crearProducto(tiendaId, { nombre: "Kiara Pink", precio: 2500, /* ... */ });
```

Por dentro, hoy (almacén del navegador):

```ts
// dentro de DataProvider
async function crearProducto(tiendaId: string, datos: NuevoProducto): Promise<Producto> {
  const ahora = new Date().toISOString();
  const nuevo: Producto = { ...datos, id: crypto.randomUUID(), tiendaId, creadoEn: ahora, actualizadoEn: ahora };
  setDb((db) => ({ ...db, productos: [...db.productos, nuevo] })); // el provider lo guarda en localStorage
  return nuevo;
}
```

Regla: ninguna pantalla importa de `seed/` ni lee `localStorage` por su
cuenta. Todo pasa por `useData()`.

## Cómo se ve el día que se conecta Supabase

Solo cambia el interior de esas funciones — la firma que ven las pantallas
se mantiene igual:

```ts
import { createClient } from "@/lib/supabase/client";

async function crearProducto(tiendaId: string, datos: NuevoProducto): Promise<Producto> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("productos")
    .insert({ tienda_id: tiendaId, ...aFila(datos) }) // camelCase de TS → snake_case de Postgres
    .select()
    .single();
  if (error) throw error;
  return aProducto(data);
}
```

Ninguna pantalla, ningún componente, ningún formulario se toca en esta
migración. Ese es el criterio para saber si la capa de datos está bien
armada: si conectar Supabase implica tocar algo fuera de `lib/data/`, algo se
diseñó mal.

## Multi-tenant en la práctica (con datos de prueba)

Aunque hoy no hay login real, cada función de `lib/data/` recibe explícitamente
un `tiendaId` — nunca asume "la única tienda". Para esta entrega:

- `lib/data/seed/tiendas.json` puede tener 2 o 3 tiendas de prueba (para
  poder demostrar que el aislamiento funciona)
- Un mecanismo simple (contexto de React, o incluso una constante que se
  pueda cambiar) simula "la tienda con sesión activa" — no hace falta login
  real, pero sí que el resto del código ya filtre por ese id.

## Próximo proyecto (fuera de esta entrega, pero para que quede documentado)

1. Crear el proyecto en Supabase y correr las migraciones con las tablas de `03-modelo-de-datos.md` (incluida `eventos_aaah`)
2. Activar Row Level Security: cada fila solo visible/editable por su `tienda_id`
3. Auth con Google (Supabase Auth) — al loguearse, resolver a qué `tienda_id` pertenece el usuario vía la tabla `usuarios`
4. Reescribir `lib/data/*.ts` para usar Supabase en vez del store en memoria
5. Subida de fotos a Supabase Storage (hoy pueden ser URLs de placeholder o imágenes subidas a `public/`)
6. Integrar o conectar el catálogo público a la misma base de datos, para que un despacho de pedido o un cambio de stock se refleje ahí en tiempo real
