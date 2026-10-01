# Modelo de datos

Estas tablas existen en Supabase (Postgres). **El contrato es el SQL de
`supabase/migrations/`: si este documento y el SQL difieren, manda el SQL.**
La demo (datos de prueba en el navegador, ver `05-arquitectura.md`) usa la
misma forma.

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
| `likes` | number | viene del catálogo público (❤ en los mockups). **Lo mantiene la base** desde `eventos_aaah` (trigger); la app solo lo lee |
| `creado_en` / `actualizado_en` | datetime | |

## `pedidos`

| Campo | Tipo | Notas |
|---|---|---|
| `id` | uuid | PK |
| `tienda_id` | uuid → `tiendas.id` | |
| `numero` | number | número visible del pedido ("#1042"). **Autoincremental por tienda**: cada tienda lleva su propia cuenta (el siguiente es el mayor de la tienda + 1; si no tiene pedidos, 1001). Único por (`tienda_id`, `numero`). **Lo asigna la base** (trigger `pedidos_numero`): la app nunca lo envía |
| `cliente_id` | uuid → `clientes.id`, nullable | null si es un pedido manual sin cliente identificado |
| `origen` | `'catalogo' \| 'manual'` | de dónde llegó |
| `estado` | `'nuevo' \| 'por_despachar' \| 'despachado' \| 'cancelado'` | ver mapeo abajo |
| `total` | number | subtotal (Σ `cantidad × precio_unitario`) menos el descuento del código de promo, si tiene |
| `codigo_promo` | string \| null | ej. "AAAH10" |
| `creado_en` | datetime | |
| `despachado_en` | datetime \| null | |
| `pago_modo` | `'contado' \| 'credito'` | por defecto `contado` (pagó todo). A `credito` se paga en abonos. **La app escribe este campo** al crear y al editar; un trigger impide pasar a `contado` un pedido que ya tiene abonos (`pedido_con_abonos`) |
| `pago_fecha_acordada` | date \| null | el día en que el cliente quedó en pagar (solo a crédito; la base la limpia al pasar a contado) |

### Ventas a crédito y abonos

- **`abonos`** (solo lectura para la app; se crean y borran con las funciones de abajo): `id`, `tienda_id`, `pedido_id`
  (se borran solos con el pedido), `monto` (entero RD$ > 0), `metodo` (`efectivo` \| `transferencia` \| `otro`), `fecha`
  (cuándo pagó), `nota` (≤ 200), `creado_en`, `creado_por`.
- **Vista `pedidos_saldo`** (lectura): `pagado` y `saldo` de cada pedido. De contado: `pagado = total`, `saldo = 0`. A crédito:
  `pagado` = suma de abonos y `saldo = total − pagado` (0 si el pedido está cancelado: **un pedido cancelado no genera deuda**).
  La app calcula lo mismo con `lib/credito.ts` a partir de los abonos que trae cada pedido (`abonos(*)` embebido), para no
  pedir la vista aparte; las dos cuentas son la misma.
- **RPC `registrar_abono(p_tienda_id, p_cliente_id, p_monto, p_metodo, p_fecha, p_nota, p_pedido_id)`**: con `p_pedido_id` abona a
  ese pedido; sin él, reparte entre los pedidos a crédito del cliente con saldo, **del más viejo al más nuevo**. Devuelve los
  abonos creados. Errores: `tienda_no_encontrada`, `monto_invalido`, `metodo_invalido`, `nota_invalida`, `fecha_invalida`,
  `pedido_no_encontrado`, `cliente_no_encontrado`, `sin_deuda`, `monto_mayor_que_deuda: <deuda>`.
- **RPC `eliminar_abono(p_abono_id)`** (error `abono_no_encontrado`).
- Todos los errores se traducen a español en `lib/data/errores.ts`.

Mapeo con las pestañas de Pedidos ("Nuevos / Por despachar / Despachados"):
`nuevo` y `por_despachar` son dos momentos del mismo pedido antes de
despachar — al abrir el detalle de un pedido `nuevo` y confirmarlo, pasa a
`por_despachar`; al presionar "Despachar pedido" pasa a `despachado`. La línea
de avance del detalle muestra lo mismo: Recibido (`nuevo`) → Confirmado
(`por_despachar`) → Despachado. Un pedido **manual** ("+ Pedido") nace directamente
en `por_despachar` (el dueño ya habló con el cliente). Al despachar baja el
stock; si algún producto no alcanza, no se despacha (nunca hay stock negativo).

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
| `telefono` | string \| null | número de WhatsApp, **guardado ya normalizado** (`+18095550142`). **Único por tienda** (índice `clientes_telefono_unico`) |
| `origen` | `'catalogo' \| 'manual'` | |
| `primer_pedido_en` | datetime | fecha del primer pedido; si todavía no pide, la fecha en que se creó |
| `nota` | string \| null | nota libre del dueño sobre el cliente (talla, gustos, cómo entregarle…). Máx. 200 caracteres. `null` si no tiene |
| `pedidos_count` | number | derivado — cuenta sus pedidos **no cancelados**. Lo mantiene la base (trigger); la app solo lo lee |

"Repite" en Clientes = `pedidos_count >= 2`. "Total gastado" = suma de
`total` de sus pedidos no cancelados (se calcula, no se guarda).

## `promos`

| Campo | Tipo | Notas |
|---|---|---|
| `id` | uuid | PK |
| `tienda_id` | uuid → `tiendas.id` | |
| `tipo` | `'codigo' \| 'coleccion' \| 'producto'` | |
| `nombre` | string | ej. "Semana del aaah" |
| `valor_porcentaje` | number | **NOT NULL**, entre 1 y 90 (ej. 15 = 15%). Todas las promos son en porcentaje; no hay descuento en RD$ |
| `codigo` | string \| null | solo si `tipo = 'codigo'`, ej. "AAAH10". **Siempre en MAYÚSCULAS** y único entre las promos **no terminadas** de la tienda (índice `promos_codigo_vigente`) |
| `coleccion` | string \| null | solo si `tipo = 'coleccion'` |
| `producto_id` | uuid \| null | solo si `tipo = 'producto'` |
| `fecha_inicio` | datetime | |
| `fecha_fin` | datetime \| null | |
| `limite_usos` | number \| null | solo códigos: máximo de pedidos (no cancelados) que pueden usarlo; mínimo 1; `null` = sin límite. Lo controla la app (la base no lo impone) |
| `pausada` | boolean | pausa manual (por defecto `false`): la promo no se aplica a ningún pedido ni precio, sin perder su historial |
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
`productos`, para la **vista elegida** (Hoy · 7 días · Mes · Año; en Mes y Año
se navega con ‹ › por meses y años anteriores), en hora de Santo Domingo:

| Vista | Rango | Se compara contra | Barras del gráfico |
|---|---|---|---|
| Hoy | desde las 00:00 de hoy hasta ahora | el mismo día de la semana pasada, hasta la misma hora ("vs. lun 21 sept, a esta hora") | 12 franjas de 2 horas |
| 7 días | los últimos 7 días (hoy incluido) | los 7 días anteriores ("vs. 15–21 sept") | una por día |
| Mes en curso | del día 1 hasta ahora | los mismos días del mes anterior (1 a hoy; si tiene menos días, hasta su último día) ("vs. 1–5 ago") | **una por día** (28–31) |
| Mes pasado | el mes completo | el mes anterior completo ("vs. agosto") | una por día |
| Año en curso | del 1 de enero hasta ahora | el mismo tramo del año anterior ("vs. ene–sept 2025") | 12, una por mes |
| Año pasado | el año completo | el año anterior completo ("vs. 2024") | 12, una por mes |

**Qué cuenta como qué** (`lib/resumen.ts`: `ventasDe`, `pendientesDe`, `validos`):
- **Venta** = pedido `despachado`. Su fecha es `despachado_en` (si viniera nulo, `creado_en`); una venta pasada ya trae
  `despachado_en` igual a la fecha elegida. Las ventas (suma, barras, gráfica), el ticket promedio (total despachado ÷
  cantidad de despachados), "Lo que más se vende" y la comparación con el periodo anterior usan solo ventas.
- **Pedido recibido** = cualquier pedido no cancelado, contado por `creado_en` (tarjeta "Pedidos recibidos" y "De aaah a pedido").
- **Pedido pendiente** = `nuevo` o `por_despachar`: todavía no es venta. Los cancelados no cuentan en nada.

**Barra elegida** (tocar una barra filtra toda la pantalla a ella):

| Barra | Se compara contra |
|---|---|
| Franja de 2 h (Hoy) | la misma franja del mismo día de la semana pasada |
| Día (7 días o Mes) | el mismo día de la semana anterior ("vs. jue 5 sept") |
| Mes (Año) | el mes anterior completo ("vs. julio"); si es el mes en curso, los mismos días del mes anterior |

La barra de "ahora" se compara hasta la misma hora. Barras futuras o anteriores
al inicio de la tienda (su primer pedido o aaah; si no hay, cuando se creó) no
tienen valor ni se pueden elegir; ‹ no pasa de ese primer mes/año y › no pasa
del actual.

**Sin comparación:** si el tramo de comparación no tiene ventas (o el actual
tampoco), no hay porcentaje: la pantalla dice "Sin comparación todavía" (nunca
Infinity, NaN, "+∞%" ni un "−100%" engañoso).

Los cálculos viven en `lib/resumen.ts` (funciones puras: `rangoPeriodo`,
`rangoComparacion`, `barras`, `rangoBarra`, `rangoComparacionBarra`,
`ventasPorDia`, `ventasPorMes`, `primerMesConDatos`, `cifras`,
`calcularResumen`; pruebas en `tests/resumen.test.mjs`, `npm test`); Santo
Domingo es UTC−4 fijo. Los tramos son semiabiertos: un pedido a las 11:30
p. m. del último día del mes cuenta en ese mes.

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

Los datos de prueba tienen ~14 meses de historia en Esencias Michel (desde
julio 2025) y ~6 en Luna Bisutería (desde abril 2026, para probar el límite de
"sin datos"), con temporadas de República Dominicana: diciembre, la semana del
Día de las Madres (último domingo de mayo) y las quincenas (15 y 30). Ver
"Datos de prueba".

## Relación entre tablas (resumen visual)

```
tiendas 1──∞ usuarios
tiendas 1──∞ productos
tiendas 1──∞ pedidos ──∞ pedido_items ──1 productos
tiendas 1──∞ clientes 1──∞ pedidos
tiendas 1──∞ promos
tiendas 1──∞ eventos_aaah ──1 productos
```

## Reglas que pone la base (la app no las duplica)

Están en `supabase/migrations/20260929225916_reglas_de_negocio.sql` y
`supabase/migrations/20260929225923_seguridad_rls.sql`. La app las respeta así (`lib/data/supabase.ts`):

| Regla | Cómo |
|---|---|
| Cada cuenta solo ve y edita **su** tienda | RLS con `mi_tienda_id()` (la tienda de la fila de `usuarios` de quien entró). Sin sesión no se ve nada |
| Número del pedido | trigger al insertar; la app no envía `numero` |
| `pedidos_count`, `likes` | triggers; la app no los escribe |
| Despachar | **solo** con la RPC `despachar_pedido(p_pedido_id)`: todo o nada (revisa y descuenta el stock y marca `despachado` + `despachado_en`) |
| Créditos de retoque | **solo** con la RPC `gastar_creditos(p_cantidad)` (devuelve el saldo nuevo). La app no puede editar `creditos_retoque` |
| Qué edita la tienda de sí misma | solo `nombre`, `logo_url`, `marca_color_principal`, `marca_color_acento`, `marca_estilo`, `url_catalogo` (permiso por columna). Plan, límite y créditos los cambia Deslizapp |
| `url_catalogo` | debe empezar con `https://` |
| Código de promo | MAYÚSCULAS y único entre promos no terminadas. Antes de guardar una promo de código, la app marca como `terminada` las que ya vencieron por fecha, para que el índice coincida con lo que ve el dueño |
| Teléfono del cliente | normalizado y único por tienda |
| `usuarios` | la crea Deslizapp a mano (una cuenta de Google = una tienda); la app solo la lee |

Errores de las RPC y de las reglas → mensaje claro (`lib/data/errores.ts`):

| Error de la base | Lo que ve el dueño |
|---|---|
| `stock_insuficiente: <producto>` | "No hay stock suficiente de <producto>." |
| `pedido_no_encontrado` | "Ese pedido ya no existe en tu tienda." |
| `pedido_no_despachable` | "Ese pedido ya no está por despachar. Actualiza la lista." |
| `creditos_insuficientes` | "Te faltan créditos para retocar. Se recargan el día 1." |
| `cantidad_invalida` | "La cantidad de créditos no es válida." |
| único `promos_codigo_vigente` | "Ya tienes ese código en una promo activa o programada." |
| único `clientes_telefono_unico` | "<Nombre> ya está en tus clientes con ese WhatsApp." (la app busca a ese cliente) |
| check de `url_catalogo` | "El enlace del catálogo debe empezar con https://." |
| sin permiso / sesión vencida / sin conexión | mensajes propios, con "Reintentar" en las lecturas |

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
mes. El panel solo muestra el saldo y gasta con la RPC `gastar_creditos`; la
recarga mensual automática todavía no está programada en la base.

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
siempre sea "de esta semana" (por eso, si se carga lejos de la fecha de
referencia del seed, los picos de temporada se corren unos días o semanas). La
historia (~14 meses de pedidos y aaahs, anteriores a las últimas dos semanas)
la genera `historia()` en el script; los pedidos #1033–#1042 de Michel y
#1001–#1004 de Luna son fijos (los usan otras pruebas), y `productos.likes`
se recalcula igual al número de `eventos_aaah` de cada producto. "Reiniciar
datos de prueba" (menú de la tienda) vuelve a cargar el seed con la historia.
Si cambia la forma de los datos, subir la versión de la clave de
`localStorage` en `lib/data/demo.ts`.
