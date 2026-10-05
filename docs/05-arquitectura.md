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
- Fotos y logo: en modo real se comprimen en el navegador (lado mayor 1600 px, WebP ~0.82; JPEG si el navegador
  no crea WebP) y se suben al bucket `productos` (`<tienda_id>/<uuid>.webp`; logo en `<tienda_id>/logo/`). La fila
  guarda la URL pública. Las que ya son URL no se vuelven a subir; las que se quitan se borran del bucket sin
  bloquear si falla. Reglas puras en `lib/data/almacen.ts`. La demo sigue con data URL.

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

1. Recarga mensual automática de créditos (en la base).
2. Resumen con consultas agregadas en la base cuando haya mucho historial (hoy
   se leen los pedidos y aaahs de la tienda y se calcula en el navegador).
3. Catálogo público conectado a la misma base (fase 5).

## Rutas públicas del catálogo

El panel conserva `useData()` y sus dos implementaciones. `/tienda/{slug}` y `/pedido/{codigo}` están fuera del dashboard: usan `FuentePublica` (Pick de las cinco operaciones ya existentes de `FuenteDatos`) mediante `lib/data/publica.ts`, sin montar sesión ni DataProvider. SSR real usa un cliente Supabase **anon**, sin cookies ni persistencia de sesión y `cache: no-store`; `?demo` lee el almacén del navegador y se suscribe a cambios entre pestañas. La UI pública no consulta tablas directamente. La revisión y el contrato aditivo están en `validacion-catalogo-react.md`.


## Registro privado de solicitudes — continuación de la parte 3

La superficie privada de `/pedido/{codigo}` se carga bajo demanda al pedirla o detectar una sesión. Autorización mediante `getClaims`, `usuarios` y lectura autenticada de `solicitudes_pedido` protegida por RLS: la tienda objetivo es la de esa solicitud, no metadata editable ni la tienda por defecto del perfil. Después monta `ProveedorReal` o `ProveedorDemo` y utiliza `useData()`. No duplica despacho ni reserva stock.

`20261004223008_pedido_catalogo_panel.sql` estaba aplicada antes de la continuación y no se edita. `20261005013157_registrar_solicitud_disponibilidad.sql` está aplicada: sustituye únicamente el cuerpo de `registrar_solicitud`, sin cambiar firma ni retorno. Bloquea productos y después variantes en orden estable, verifica propiedad/actividad y stock agregado; rechaza el cambio antes de crear cliente/pedido. Encargo no descuenta ni reserva. La RPC conserva comprobaciones de identidad/pertenencia, `search_path` vacío y ejecución restringida; RLS continúa aislando tiendas. Es compatible con #44 y #45. No escribe datos de tiendas en migraciones.

Replay y pruebas reproducibles: `npm run probar:pedido-catalogo-db` (Docker propio, PostgreSQL 17.6, 32 migraciones, fixtures aislados y rollback; el bootstrap de Auth/Storage no es un Supabase hospedado completo). Prueba de transporte: `npm run probar:pedido-catalogo-transporte` requiere servidor **dev** y crea/elimina una ruta temporal; no usar mientras se construye el build. Browser demo: `URL=... npm run probar:pedido-catalogo`.


### Pendientes de pedidos y retorno a solicitud (PR #46)

`lib/pendientes-pedidos.ts` calcula trabajo pendiente por tienda; `lib/data/pendientes-pedidos.ts` lee pedidos y solicitudes con `useData()`/`useConsulta()`, publica la pareja por versión y controla vencimientos. No altera `pendientesDe` ni agregados de ventas/deuda. Nunca sustituir una lectura fallida por cero. El registro invalida la caché de ambas fuentes y publica el nuevo par; la app conserva el par anterior mientras relee.

`callbackGoogle` conserva `window.location.origin` y solo acepta `/pedido/CODIGO`; el código va en `volver` del callback y, como respaldo, la cookie `dz_volver`. `destinoGoogle` añade `registrar=1`; el comprador monta la comprobación de tienda aun sin detectar una cookie de sesión legible. El marcador nunca autoriza: sesión verificada por Auth y acceso a la solicitud sujeto a `solicitudes_pedido_de_mis_tiendas`/`mis_tiendas()`. OAuth normal conserva retorno a `/`. No hay nuevos contratos SQL ni cambios de configuración Auth.


### Imagen pública compuesta del pedido

`/pedido/[codigo]/imagen` es un Route Handler Node de lectura anónima mediante `fuentePublicaReal().verSolicitud`, sin sesión, service role ni consultas de tablas privadas. Valida el código antes de llamar a la fuente; solo utiliza nombre de tienda, líneas/fotos/variante y total públicos. No recibe URLs de descarga por parámetros. `fotoPublicaPermitida` admite únicamente HTTPS del mismo proyecto y rutas de fotos públicas de `productos`; el servidor rechaza redirects y limita a cuatro descargas paralelas, 4 s/foto, 5 MiB/foto y 16 millones de píxeles. Sharp orienta y reduce copias; `ImageResponse` compone PNG 1200×630. Los originales no cambian. Imagen exitosa: max-age/s-maxage 300; fallo de lectura: 503/no-store; inexistente: 404/no-store. Metadatos usan VERCEL_URL en preview y el dominio estable de producción en producción, para que el crawler no dependa de un despliegue de producción protegido. No hay preview pública desde localStorage de demo.
### Espera compartida del panel (seguimiento PR #47)

PanelUIProvider ejecuta una sola useConsulta de avisosPendientes(tiendaId), con errorConDatos; Catálogo, Inicio, inventario y listas comparten el resultado. lib/avisos.ts agrupa filas pendientes por producto y personas por teléfono normalizado, siempre filtrando tienda/avisadoEn null. Los teléfonos no se muestran en contadores ni en superficies públicas. No hay consulta por tarjeta ni nuevo contrato de Supabase. El detalle existente relee getProducto antes de habilitar la variante de Avisar.

La invalidación del proveedor conserva escrituras, reponer y marcarAvisado; en modo real foco/visibilitychange comparte el freno existente de 15 s. Cambiar de tienda descarta la hoja global de espera y no conserva sus filas. Errores conservan el dato anterior internamente pero se presentan como error/reintento, no como cero. La vista previa mantiene su borrador montado al navegar internamente. «Avisado» sigue siendo seguimiento del flujo, nunca prueba de envío por WhatsApp.
