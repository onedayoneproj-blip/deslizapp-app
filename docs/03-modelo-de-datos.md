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
| `logo_url` | string \| null | cuadrado, hasta 512 px (WebP con transparencia) |
| `marca_color_principal` | string (hex `#RRGGBB`) | fondo del cupón de la tienda; se guarda ya ajustado para que el texto se lea (≥ 4.5:1). Nunca el verde Deslizapp: sin marca, paleta neutra `#2E2A27` |
| `marca_color_acento` | string (hex) | color del % sobre el principal (≥ 3:1); por defecto `#E2B77A` |
| `marca_estilo` | `'elegante' \| 'moderna' \| 'divertida' \| 'clasica'` | par de tipografías del cupón (`lib/marca.ts`); por defecto `'elegante'` |
| `url_catalogo` | string \| null | "Enlace de tu catálogo" (Instagram, web…), opcional; se guarda con `https://` |
| `plan` | `'p20' \| 'p60' \| 'p100' \| 'custom'` | los planes reales del servicio: hasta 20, 60 o 100 productos; más de 100 = a medida. Se muestran como "Plan 20", "Plan 60", "Plan 100", "Plan a medida". Los planes "Básico 40 / Pro 100" del prototipo eran datos de muestra y no existen |
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
| `categoria` | string \| null | en pantalla se llama **"Colección"** (ej. "Dulces", "Frescos"); las promos por colección apuntan a este valor |
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
| `numero` | number | número visible del pedido ("#1042"). **Autoincremental por tienda**: cada tienda lleva su propia cuenta (el siguiente es el mayor de la tienda + 1; si no tiene pedidos, 1001). Único por (`tienda_id`, `numero`). En Supabase: secuencia o trigger por tienda |
| `cliente_id` | uuid → `clientes.id`, nullable | null si es un pedido manual sin cliente identificado |
| `origen` | `'catalogo' \| 'manual'` | de dónde llegó |
| `estado` | `'nuevo' \| 'por_despachar' \| 'despachado' \| 'cancelado'` | ver mapeo abajo |
| `total` | number | subtotal (Σ `cantidad × precio_unitario`) menos el descuento del código de promo, si tiene |
| `codigo_promo` | string \| null | ej. "AAAH10" |
| `creado_en` | datetime | |
| `despachado_en` | datetime \| null | |

Mapeo con las pestañas de Pedidos ("Nuevos / Por despachar / Despachados"):
`nuevo` y `por_despachar` son dos momentos del mismo pedido antes de
despachar — al abrir el detalle de un pedido `nuevo` y confirmarlo, pasa a
`por_despachar`; al presionar "Despachar pedido" pasa a `despachado`. La línea
de avance del detalle muestra lo mismo: Recibido (`nuevo`) → Confirmado
(`por_despachar`) → Despachado.

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
| `precio_unitario` | number | snapshot al momento del pedido, **ya con la promo de colección o de producto vigente** (el código de promo se descuenta del total, no de aquí) |

## `clientes`

| Campo | Tipo | Notas |
|---|---|---|
| `id` | uuid | PK |
| `tienda_id` | uuid → `tiendas.id` | |
| `nombre` | string | |
| `telefono` | string \| null | número de WhatsApp |
| `origen` | `'catalogo' \| 'manual'` | |
| `primer_pedido_en` | datetime | fecha del primer pedido; si todavía no pide, la fecha en que se creó |
| `nota` | string \| null | nota libre del dueño sobre el cliente (talla, gustos, cómo entregarle…). Máx. 200 caracteres. `null` si no tiene |
| `pedidos_count` | number | derivado — cuenta sus pedidos **no cancelados**; se puede recalcular o cachear |

"Repite" en Clientes = `pedidos_count >= 2`. "Total gastado" = suma de
`total` de sus pedidos no cancelados (se calcula, no se guarda).

## `promos`

| Campo | Tipo | Notas |
|---|---|---|
| `id` | uuid | PK |
| `tienda_id` | uuid → `tiendas.id` | |
| `tipo` | `'codigo' \| 'coleccion' \| 'producto'` | |
| `nombre` | string | ej. "Semana del aaah" |
| `valor_porcentaje` | number \| null | ej. 15 = 15%. **Todas las promos son en porcentaje** (entre 1 y 90); no hay descuento en RD$ en esta entrega |
| `codigo` | string \| null | solo si `tipo = 'codigo'`, ej. "AAAH10" |
| `coleccion` | string \| null | solo si `tipo = 'coleccion'` |
| `producto_id` | uuid \| null | solo si `tipo = 'producto'` |
| `fecha_inicio` | datetime | |
| `fecha_fin` | datetime \| null | |
| `estado` | `'activa' \| 'programada' \| 'terminada'` | calculable desde las fechas, pero se guarda para poder forzarlo manualmente |

Estado que se muestra: si `estado = 'terminada'` guardado, terminada (la
terminó el dueño); si no, por fechas: `fecha_fin` pasada → terminada,
`fecha_inicio` futura → programada, si no → activa (`lib/promos.ts`).

Precio con promo de un producto: la mejor promo **activa** por colección (su
`categoria`) o por producto; los códigos no cambian el precio del producto,
se aplican al total del pedido.

"Usada en N pedidos" (solo promos de código) = pedidos no cancelados con ese
`codigo_promo`.

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

Se calcula a partir de `eventos_aaah`, `pedidos`, `pedido_items` y
`productos`, para el **periodo elegido** (en hora de Santo Domingo):

| Periodo | Rango | Se compara contra | Barras del gráfico |
|---|---|---|---|
| Hoy | desde las 00:00 de hoy hasta ahora | el mismo día de la semana pasada, hasta la misma hora | 12 franjas de 2 horas |
| 7 días | los últimos 7 días (hoy incluido) hasta ahora | los 7 días anteriores, hasta la misma hora | una por día |
| Este mes | desde el día 1 del mes hasta ahora | el mes anterior, del día 1 hasta la misma altura (sin pasar de su último día) | una por semana del mes (1–7, 8–14, 15–21, 22–28, 29–fin) |

Decisión (paso 9): cada periodo se compara contra **el mismo tramo de tiempo**
hacia atrás, no contra un día o un mes completo; si no, un lunes a las 9 a. m.
o un día 3 de mes siempre saldría en rojo. Sin ventas en el tramo anterior no
hay variación: la pantalla lo dice con palabras (nunca "-%", NaN ni Infinity).
Los cálculos viven en `lib/resumen.ts` (funciones puras, pruebas en
`tests/resumen.test.mjs`, `npm test`); Santo Domingo es UTC−4 fijo.

- `ventas`: suma de `total` de los `pedidos` no cancelados del periodo
- `variacion`: `ventas` contra el periodo de comparación, en % entero (ej. "+18%"); sin ventas antes, no hay
- `ventas_por_barra`: los valores del gráfico
- `pedidos`: count de `pedidos` no cancelados del periodo
- `ticket_promedio`: `ventas / pedidos` (RD$, redondeado; "—" sin pedidos)
- `aaahs`: count de `eventos_aaah` del periodo
- `conversion` ("De aaah a pedido"): `pedidos / aaahs`, en % con un decimal ("—" sin aaahs)
- `top_productos`: top 3 productos por **unidades vendidas** (`pedido_items.cantidad`) en pedidos no cancelados del periodo (decisión del paso 9)
- `pedidos_nuevos`: count de `pedidos` con `estado = 'nuevo'` (sin periodo)
- `stock_bajo` ("Ojo con el stock"): productos con `stock` no null y `<= STOCK_BAJO` (`lib/config.ts`, hoy 2); agotados primero

Los datos de prueba cubren ~14 días de pedidos y aaahs (Esencias Michel tiene
pedidos #1033–#1036 la semana anterior, uno cancelado, para que "7 días" y
"Hoy" tengan con qué comparar), así que "Este mes" sale sin comparación contra
el mes anterior: es esperado.

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

**No se venden paquetes de créditos ni se cobra nada desde el panel** (los
paquetes del prototipo eran de muestra). Si una tienda necesita más créditos
o más productos, le escribe a Deslizapp por WhatsApp desde Plan y créditos
(`WHATSAPP_DESLIZAPP` en `lib/config.ts`) y el cambio se hace a mano.

## Fuera del modelo (decidido)

- Descuentos en RD$ fijos: no. Solo porcentaje.
- "Marca o línea" del producto: no. El nombre del producto basta.

## Datos de prueba

`lib/data/seed/*.json` se genera con `node scripts/generar-seed.mjs`
(determinista). Esencias Michel usa los mismos productos, clientes, pedidos
y promos del prototipo; Luna Bisutería es la segunda tienda para probar el
aislamiento. Las fechas del seed se desplazan al cargar para que la demo
siempre sea "de esta semana". Si cambia la forma de los datos, subir la
versión de la clave de `localStorage` en `lib/data/provider.tsx`.
