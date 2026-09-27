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

## Estructura de carpetas

```
app/
  (dashboard)/
    catalogo/page.tsx
    pedidos/page.tsx
    pedidos/[id]/page.tsx
    clientes/page.tsx
    promos/page.tsx
    layout.tsx          ← navegación inferior + encabezado
  page.tsx               ← Resumen (pantalla de inicio)
  layout.tsx              ← layout raíz (fuentes, tema)
lib/
  data/
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
      clientes.json
      promos.json
    store.ts             ← simula la "base de datos en memoria" (ver abajo)
  types.ts                ← los tipos de 03-modelo-de-datos.md, en TypeScript
components/
  ...
```

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

`lib/data/store.ts` — un "almacén" en memoria que arranca desde el JSON de
prueba y se comporta como si fuera la base de datos durante la sesión (los
cambios persisten mientras el servidor de desarrollo esté corriendo, no entre
reinicios — eso está bien para esta entrega):

```ts
import productosSeed from "./seed/productos.json";
import pedidosSeed from "./seed/pedidos.json";
// ...

export const db = {
  productos: [...productosSeed] as Producto[],
  pedidos: [...pedidosSeed] as Pedido[],
  // ...
};
```

`lib/data/productos.ts` — la interfaz que usan las pantallas:

```ts
import { db } from "./store";
import type { Producto } from "../types";

export async function getProductos(tiendaId: string): Promise<Producto[]> {
  return db.productos.filter((p) => p.tiendaId === tiendaId);
}

export async function crearProducto(
  tiendaId: string,
  datos: Omit<Producto, "id" | "tiendaId" | "creadoEn" | "actualizadoEn">
): Promise<Producto> {
  const nuevo: Producto = {
    ...datos,
    id: crypto.randomUUID(),
    tiendaId,
    creadoEn: new Date().toISOString(),
    actualizadoEn: new Date().toISOString(),
  };
  db.productos.push(nuevo);
  return nuevo;
}

export async function actualizarProducto(
  id: string,
  cambios: Partial<Producto>
): Promise<Producto> {
  const producto = db.productos.find((p) => p.id === id);
  if (!producto) throw new Error("Producto no encontrado");
  Object.assign(producto, cambios, { actualizadoEn: new Date().toISOString() });
  return producto;
}
```

Cada pantalla importa de `lib/data/productos.ts`, nunca de `seed/` ni de
`store.ts` directamente.

## Cómo se ve el día que se conecta Supabase

Solo cambia el interior de `lib/data/productos.ts` (y los demás archivos de
`lib/data/`) — la firma de las funciones se mantiene igual:

```ts
import { createClient } from "@/lib/supabase/server";
import type { Producto } from "../types";

export async function getProductos(tiendaId: string): Promise<Producto[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("productos")
    .select("*")
    .eq("tienda_id", tiendaId);
  if (error) throw error;
  return data.map(mapRowToProducto); // convierte snake_case de Postgres a camelCase de TS
}

export async function crearProducto(tiendaId: string, datos: /* ... */) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("productos")
    .insert({ tienda_id: tiendaId, ...mapProductoToRow(datos) })
    .select()
    .single();
  if (error) throw error;
  return mapRowToProducto(data);
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

1. Crear el proyecto en Supabase y correr las migraciones con las tablas de `03-modelo-de-datos.md`
2. Activar Row Level Security: cada fila solo visible/editable por su `tienda_id`
3. Auth con Google (Supabase Auth) — al loguearse, resolver a qué `tienda_id` pertenece el usuario vía la tabla `usuarios`
4. Reescribir `lib/data/*.ts` para usar Supabase en vez del store en memoria
5. Subida de fotos a Supabase Storage (hoy pueden ser URLs de placeholder o imágenes subidas a `public/`)
6. Integrar o conectar el catálogo público a la misma base de datos, para que un despacho de pedido o un cambio de stock se refleje ahí en tiempo real
