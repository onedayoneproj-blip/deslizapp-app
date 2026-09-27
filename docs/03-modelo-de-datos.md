# Modelo de datos

Estas tablas están diseñadas ya con la forma que tendrán en Supabase
(Postgres). Hoy se implementan como datos de prueba (ver
`05-arquitectura.md`), pero los nombres de campos, tipos y relaciones son
finales — no deberían cambiar cuando se conecte Supabase.

Todas las tablas que pertenecen a una tienda llevan `tienda_id` — es la clave
de aislamiento multi-tenant. Ninguna consulta debe cruzar tiendas.

## `tiendas`

| Campo | Tipo | Notas |
|---|---|---|
| `id` | uuid | PK |
| `slug` | string, único | para la futura URL del catálogo público (`deslizapp.com/tienda/{slug}`) |
| `nombre` | string | ej. "Esencias Michel" |
| `logo_url` | string \| null | |
| `plan` | `'basico' \| 'pro' \| 'custom'` | define `limite_productos` |
| `limite_productos` | number | ej. 40 — se muestra en el medidor del Catálogo |
| `creditos_retoque` | number | se descuenta al usar el retoque de fotos |
| `creado_en` | datetime | |

## `usuarios`

Preparada para cuando exista login real (Google). Por ahora puede ser una
tabla de prueba con un solo usuario "activo".

| Campo | Tipo | Notas |
|---|---|---|
| `id` | uuid | en Supabase real, = `auth.users.id` |
| `tienda_id` | uuid → `tiendas.id` | |
| `email` | string | |
| `nombre` | string | |
| `rol` | `'dueno' \| 'staff'` | por ahora solo se usa `'dueno'` |

## `productos`

| Campo | Tipo | Notas |
|---|---|---|
| `id` | uuid | PK |
| `tienda_id` | uuid → `tiendas.id` | |
| `nombre` | string | ej. "Kiara Pink" |
| `precio` | number | |
| `fotos` | string[] | URLs; la primera es la foto de portada |
| `foto_retocada` | boolean | true si pasó por el toggle de retoque |
| `categoria` | string \| null | |
| `activo` | boolean | si aparece en el catálogo público |
| `destacado` | boolean | |
| `stock` | number \| null | `null` = stock ilimitado/no controlado |
| `likes` | number | viene del catálogo público (❤ en los mockups) |
| `creado_en` / `actualizado_en` | datetime | |

## `pedidos`

| Campo | Tipo | Notas |
|---|---|---|
| `id` | uuid | PK |
| `tienda_id` | uuid → `tiendas.id` | |
| `cliente_id` | uuid → `clientes.id`, nullable | null si es un pedido manual sin cliente identificado |
| `origen` | `'catalogo' \| 'manual'` | de dónde llegó |
| `estado` | `'nuevo' \| 'por_despachar' \| 'despachado' \| 'cancelado'` | ver mapeo abajo |
| `total` | number | |
| `codigo_promo` | string \| null | ej. "AAAH10" |
| `creado_en` | datetime | |
| `despachado_en` | datetime \| null | |

Mapeo con las pestañas del mock de Pedidos ("Nuevos / Por despachar /
Listos"): `nuevo` y `por_despachar` son dos momentos del mismo pedido antes de
despachar — al abrir el detalle de un pedido `nuevo` y confirmarlo, pasa a
`por_despachar`; al presionar "Despachar pedido" pasa a `despachado` (que es
lo que la pestaña llama "Listos").

## `pedido_items`

Detalle de productos dentro de un pedido (relación muchos-a-muchos entre
`pedidos` y `productos`, con snapshot de precio/nombre por si el producto
cambia después).

| Campo | Tipo | Notas |
|---|---|---|
| `id` | uuid | PK |
| `pedido_id` | uuid → `pedidos.id` | |
| `producto_id` | uuid → `productos.id` | |
| `nombre_producto` | string | snapshot al momento del pedido |
| `cantidad` | number | |
| `precio_unitario` | number | snapshot al momento del pedido |

## `clientes`

| Campo | Tipo | Notas |
|---|---|---|
| `id` | uuid | PK |
| `tienda_id` | uuid → `tiendas.id` | |
| `nombre` | string | |
| `telefono` | string \| null | número de WhatsApp |
| `origen` | `'catalogo' \| 'manual'` | |
| `primer_pedido_en` | datetime | |
| `pedidos_count` | number | derivado — se puede recalcular o cachear |

"Repite" en el mock de Clientes = `pedidos_count >= 2`.

## `promos`

| Campo | Tipo | Notas |
|---|---|---|
| `id` | uuid | PK |
| `tienda_id` | uuid → `tiendas.id` | |
| `tipo` | `'codigo' \| 'coleccion' \| 'producto'` | |
| `nombre` | string | ej. "Semana del aaah" |
| `valor_porcentaje` | number \| null | ej. 15 = 15% |
| `codigo` | string \| null | solo si `tipo = 'codigo'`, ej. "AAAH10" |
| `coleccion` | string \| null | solo si `tipo = 'coleccion'` |
| `producto_id` | uuid \| null | solo si `tipo = 'producto'` |
| `fecha_inicio` | datetime | |
| `fecha_fin` | datetime \| null | |
| `estado` | `'activa' \| 'programada' \| 'terminada'` | calculable desde las fechas, pero se guarda para poder forzarlo manualmente |

## Resumen (no es una tabla — es una consulta agregada)

La pantalla de Resumen no necesita una tabla propia; se calcula a partir de
`pedidos` y `productos` de los últimos 7 días:

- `aaahs_7dias`: suma de `likes` ganados en la semana (o, si no se trackea
  el evento de "like" por separado, se puede aproximar con vistas del
  catálogo — a definir cuando exista analítica real; por ahora puede ser un
  número de prueba)
- `pedidos_7dias`: count de `pedidos` con `creado_en` en los últimos 7 días
- `conversion`: `pedidos_7dias / aaahs_7dias`
- `top_productos`: top 3 `productos` por `likes` o por cantidad vendida en pedido_items

## Relación entre tablas (resumen visual)

```
tiendas 1──∞ usuarios
tiendas 1──∞ productos
tiendas 1──∞ pedidos ──∞ pedido_items ──1 productos
tiendas 1──∞ clientes 1──∞ pedidos
tiendas 1──∞ promos
```
