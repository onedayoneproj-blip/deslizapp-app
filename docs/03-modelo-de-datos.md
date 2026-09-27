# Modelo de datos

Estas tablas están diseñadas ya con la forma que tendrán en Supabase
(Postgres). Hoy se implementan como datos de prueba (ver
`05-arquitectura.md`), pero los nombres de campos, tipos y relaciones son
finales — no deberían cambiar cuando se conecte Supabase.

Todas las tablas que pertenecen a una tienda llevan `tienda_id` — es la clave
de aislamiento multi-tenant. Ninguna consulta debe cruzar tiendas.

**Convenciones:**
- Moneda: pesos dominicanos (RD$). Los montos se guardan como número entero
  de pesos (sin centavos) y se muestran como `RD$2,500`.
- Fechas: ISO 8601 en UTC; se muestran en hora de Santo Domingo (UTC-4).
- En la base de datos los campos van en `snake_case` (`tienda_id`); en
  TypeScript, en `camelCase` (`tiendaId`). La conversión vive solo en `lib/data/`.

## `tiendas`

| Campo | Tipo | Notas |
|---|---|---|
| `id` | uuid | PK |
| `slug` | string, único | para la futura URL del catálogo público (`deslizapp.com/tienda/{slug}`) |
| `nombre` | string | ej. "Esencias Michel" |
| `logo_url` | string \| null | |
| `plan` | `'p20' \| 'p60' \| 'p100' \| 'custom'` | los planes reales del servicio: hasta 20, 60 o 100 productos; más de 100 = a medida |
| `limite_productos` | number | 20 / 60 / 100, o el número pactado si es `custom`; se muestra en el medidor del Catálogo |
| `creditos_retoque` | number | saldo actual; se descuenta al usar el retoque de fotos |
| `creditos_retoque_mensuales` | number | cuántos créditos se recargan cada mes (ver "Decisiones pendientes") |
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

## `eventos_aaah`

Cada vez que un cliente le da ❤ a un producto en el catálogo público. Hace
falta como tabla aparte porque `productos.likes` es un total acumulado y no
permite saber cuántos llegaron *esta semana* ni dibujar el gráfico por día
del Resumen. En esta entrega se llena con datos de prueba repartidos en los
últimos 14 días (para poder calcular la variación contra la semana anterior).

| Campo | Tipo | Notas |
|---|---|---|
| `id` | uuid | PK |
| `tienda_id` | uuid → `tiendas.id` | |
| `producto_id` | uuid → `productos.id` | |
| `creado_en` | datetime | |

`productos.likes` se mantiene como contador rápido para las tarjetas del
Catálogo; debe coincidir con el número de `eventos_aaah` de ese producto.

## Resumen (no es una tabla — es una consulta agregada)

Se calcula a partir de `eventos_aaah`, `pedidos` y `pedido_items`:

- `aaahs_7dias`: count de `eventos_aaah` de los últimos 7 días
- `variacion`: comparado contra los 7 días anteriores (ej. "+18%")
- `aaahs_por_dia`: 7 valores, uno por día, para el gráfico de barras
- `pedidos_7dias`: count de `pedidos` (no cancelados) con `creado_en` en los últimos 7 días
- `conversion` ("De aaah a pedido"): `pedidos_7dias / aaahs_7dias`, en %
- `top_productos`: top 3 productos por `eventos_aaah` de la semana

## Relación entre tablas (resumen visual)

```
tiendas 1──∞ usuarios
tiendas 1──∞ productos
tiendas 1──∞ pedidos ──∞ pedido_items ──1 productos
tiendas 1──∞ clientes 1──∞ pedidos
tiendas 1──∞ promos
tiendas 1──∞ eventos_aaah ──1 productos
```

## Reglas de negocio de stock

- El stock se descuenta **al despachar**, no cuando entra el pedido (así lo
  muestran los mockups). Consecuencia: si quedan 1 unidad y entran dos
  pedidos, ambos se ven como posibles hasta que uno se despache. Al intentar
  despachar el segundo, si algún producto no tiene stock suficiente, el
  botón muestra el aviso y no deja despachar hasta que el dueño lo resuelva
  (editar el pedido o cancelarlo).
- `stock = null` significa "no controlo stock de esto" — nunca se descuenta ni
  se marca agotado.

## Créditos de retoque (decidido)

El cliente puede retocar **20 fotos al mes**; cada retoque cuesta **5
créditos**. Eso da un saldo mensual de **100 créditos** (`creditos_retoque_mensuales
= 100`), igual en todos los planes (20/60/100 productos). Ambos números
(créditos por foto y saldo mensual) son constantes en `lib/config.ts`, no
están repartidos por el código.

Los créditos no usados **no se acumulan**: se recargan a 100 el día 1 de cada
mes. En esta entrega solo se muestra el saldo (la recarga automática mensual
llega con Supabase).
