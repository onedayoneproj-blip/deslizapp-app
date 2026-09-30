# Arquitectura: demo y Supabase detrás de la misma interfaz

## La idea en una frase

Ninguna pantalla toca datos directamente — todas pasan por `useData()`, que
da una **interfaz única** (`lib/data/fuente.ts`). Esa interfaz tiene **dos
implementaciones** y la app elige cuál usar según el modo activo:

| Modo | Implementación | Datos | Entrada |
|---|---|---|---|
| **demo** | `lib/data/demo.ts` | seed + `localStorage` del navegador | "Ver demo". Sin login; selector de tienda en el menú |
| **real** | `lib/data/supabase.ts` | Supabase (Postgres + RLS) | "Entrar con Google". Una cuenta de Google = una tienda (tabla `usuarios`) |

Esto se llama patrón *repository*: la UI depende de una interfaz estable
("dame los productos de esta tienda"), no de dónde vienen los datos. Al
conectar Supabase (paso 11) las pantallas no cambiaron: solo la pantalla de
entrada, el menú de la tienda (cerrar sesión; el selector solo en demo) y los
mensajes de error.

## Modos, sesión y pantalla de entrada

- `lib/data/modo.ts` — `elegirModo()`: el modo elegido se recuerda en
  `localStorage` (`deslizapp-modo-v1`). Sin elección → pantalla de entrada
  (`components/panel/pantalla-entrada.tsx`).
- `lib/data/sesion.ts` — almacén de la sesión: `entrada | demo | cargando |
  sin-tienda | lista | error`. `entrarConGoogle()` revisa primero que Google
  esté activado en Supabase (si no, avisa y no sale de la app) y luego llama a
  `signInWithOAuth({ provider: "google", redirectTo: <origen>/auth/callback })`.
- `app/auth/callback/route.ts` — cambia el `code` por la sesión (PKCE, cookies)
  y vuelve a `/`; si falla, a `/?error_login=1` (la entrada muestra el aviso).
- `proxy.ts` + `lib/supabase/proxy.ts` — renuevan la sesión en cada petición
  (guía oficial de `@supabase/ssr` para Next.js 16).
- Sesión lista → `usuarios` (fila de quien entró) da la `tienda_id`. Sin fila:
  "Tu cuenta aún no está activada. Escríbenos y la activamos", con "Cerrar
  sesión".
- `lib/data/provider.tsx` — `DataProvider` monta la fuente del modo activo. En
  modo real, cada escritura sube `version` (las pantallas vuelven a leer) y al
  volver a la app se leen los datos de nuevo. Si una lectura falla,
  `useConsulta` lo avisa y `components/panel/aviso-red.tsx` muestra el mensaje
  con "Reintentar".

Variables (`.env.local`, y las mismas en Vercel; ver `.env.example`):
`NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. **Solo la
llave publicable**: nunca una llave secreta ni `service_role` en la app (el RLS
protege los datos). Sin variables, la app funciona en demo y "Entrar con
Google" avisa que no está activado.

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
  (dashboard)/           ← pantallas del panel (Resumen en "/")
    layout.tsx           ← DataProvider (+ entrada, carga y aviso de red) + encabezado + navegación
  auth/callback/route.ts ← vuelta de Google
  layout.tsx             ← layout raíz (fuentes, tema)
proxy.ts                 ← renueva la sesión de Supabase
lib/
  data/
    fuente.ts            ← LA interfaz de datos (FuenteDatos)
    demo.ts              ← implementación demo (almacén del navegador)
    supabase.ts          ← implementación real (Supabase)
    filas.ts             ← conversión fila (snake_case) ↔ app (camelCase): SOLO aquí
    errores.ts           ← errores con mensaje claro + traducción de errores de Supabase
    modo.ts, sesion.ts   ← modo elegido y sesión de Google
    provider.tsx         ← DataProvider / useData()
    consulta.ts          ← useConsulta / useTiendaActiva
    tiendas.ts, productos.ts, pedidos.ts, clientes.ts, promos.ts, resumen.ts, db.ts
                         ← lógica de la demo sobre su almacén (y reglas compartidas)
    seed/                ← los datos de prueba
  supabase/              ← clientes de Supabase (navegador, servidor, proxy) y variables
  types.ts               ← los tipos de 03-modelo-de-datos.md, en TypeScript
supabase/migrations/     ← el esquema real (el contrato)
components/
public/
  seed/                  ← fotos de los productos de prueba
```

El Resumen va **dentro** de `(dashboard)` para que comparta la navegación
inferior con el resto de pantallas (si quedara en `app/page.tsx` se vería sin
navegación).

**Ojo:** hay que **borrar el `app/page.tsx` que trae el scaffold**. Si
existen `app/page.tsx` y `app/(dashboard)/page.tsx` a la vez, los dos apuntan
a `/` y Next.js da error de compilación.

## Cómo se ve `lib/data/` por dentro

Lo que ve una pantalla (en demo y en real, idéntico):

```ts
const { getProductos, crearProducto } = useData();
const productos = await getProductos(tiendaId);
await crearProducto(tiendaId, { nombre: "Kiara Pink", precio: 2500, /* ... */ });
```

En la demo (`lib/data/demo.ts`) eso cambia el almacén del navegador y lo
guarda en `localStorage`. En modo real (`lib/data/supabase.ts`):

```ts
async crearProducto(tiendaId, datos) {
  const fotos = await subirFotos(tiendaId, datos.fotos); // AQUÍ se conecta Supabase Storage
  const f = await requerido(supabase.from("productos").insert(filaProductoNuevo(tiendaId, { ...datos, fotos })).select("*").single(), …);
  return cambio(aProducto(f)); // fila → app (lib/data/filas.ts) y avisa que hubo un cambio
}
```

Reglas:
- Ninguna pantalla importa de `seed/`, lee `localStorage` ni habla con
  Supabase por su cuenta. Todo pasa por `useData()`.
- Las filas nunca salen de `lib/data/`: la conversión vive en `filas.ts`.
- Lo que decide la base no se repite en la app (número de pedido, contadores,
  despacho, créditos): ver "Reglas que pone la base" en `03-modelo-de-datos.md`.
- Los errores se lanzan como clases de `errores.ts` con el mensaje para el
  dueño; las hojas lo muestran con `mensajeDeError()`.
- Lecturas: PostgREST devuelve máx. 1000 filas por consulta, así que se piden
  por tramos (`todas()`); las lecturas iguales que llegan a la vez comparten
  la petición.
- Fotos y logo: por ahora se guardan como data URL (igual que la demo).
  `subirFotos` / `subirLogo` en `supabase.ts` marcan dónde se conecta Storage.

## Resumen: la interfaz solo pide rangos y cifras

La pantalla Inicio no calcula nada: llama a las funciones puras de
`lib/resumen.ts` (`rangoPeriodo`, `rangoComparacion`, `barras`,
`rangoBarra`, `rangoComparacionBarra`, `cifras`, `calcularResumen`,
`primerMesConDatos`). Hoy reciben los pedidos, aaahs y productos de la tienda
ya leídos del navegador. Con Supabase, los rangos se quedan igual y
`cifras`/`calcularResumen` se cambian por consultas agregadas (sumas por día o
por mes, top por unidades) que devuelvan la misma forma, sin tocar
`components/inicio/`. Las pruebas de `tests/resumen.test.mjs` sirven de
contrato para esas consultas.

## Multi-tenant en la práctica

Cada función de `lib/data/` recibe explícitamente un `tiendaId` — nunca asume
"la única tienda". En la demo hay 2 tiendas de prueba y el selector del menú
elige la activa. En modo real la tienda es la de la fila de `usuarios` de la
cuenta que entró, y el RLS de Supabase impide ver o editar otra (aunque la app
se equivocara de `tiendaId`).

## Pendiente

1. Subida de fotos y logos a Supabase Storage (hoy: data URL en la fila).
2. Recarga mensual automática de créditos (en la base).
3. Resumen con consultas agregadas en la base cuando haya mucho historial (hoy
   se leen los pedidos y aaahs de la tienda y se calcula en el navegador).
4. Catálogo público conectado a la misma base (fase 5).
