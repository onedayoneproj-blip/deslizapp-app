# Admin, parte 4: Cobros, Planes, Más, Salud y Registro (rama `feature/admin-cobros`)

> **Modelo:** en Codex, el más alto con razonamiento alto. En Claude Code, Opus 5.5. Toca dinero y hace que la app de las tiendas lea los planes de la base.

## 0. Antes de empezar

Lee:
- `docs/00-contexto-del-proyecto.md`, `AGENTS.md` y `HANDOFF.md`. Tu puesto es **Coding**.
- `docs/13-admin.md` §3.7 a §3.9, §8, §9 y §10.
- `referencias/admin/LEEME.md` y los tableros `Cobros`, `RegistrarPago`, `Planes`, `Mas`, `Salud` y `Registro`. Son diseño aprobado: **no copies su HTML.**
- `docs/09-sistema-de-diseno.md` y `docs/11-voz-y-frases.md`.
- `lib/config.ts`, `lib/funciones.ts`, `components/panel/hoja-plan.tsx` y `components/tienda/planes.tsx`.
- Lo que dejaron las partes 1 a 3.

Rama `feature/admin-cobros` desde `main`, con las partes anteriores fusionadas. Si no lo están, parte de la última rama y dilo en el PR.

## 1. Cobros y Registrar pago

- **Pantalla Cobros** (`/admin/cobros`), con lo de docs/13 §8:
  - La tarjeta del mes: cobrado contra esperado, por cobrar y créditos vendidos.
  - Atrasadas: tarjeta con «Registrar pago» y «Escribirle».
  - Vencen esta semana.
  - Al día y En prueba, plegadas.
- **Hoja «Registrar pago»**, que se abre desde Cobros, desde la ficha y desde «Ya pagó» en Hoy:
  - Concepto y monto, que se llena con el precio del plan o del paquete.
  - Método y referencia.
  - Comprobante: foto al bucket `comprobantes`, reducida con `reducirFoto`.
  - La línea «Queda pagada hasta…», calculada en vivo con la misma regla de la base.
  - El interruptor «Mandarle el recibo».
- **El recibo:** una imagen generada con la técnica de los recibos de pedidos (`lib/imagen-factura.ts` o equivalente), con el logo de Deslizapp, la tienda, el concepto, el monto, la fecha y «pagada hasta». Se comparte con WhatsApp: `navigator.share` con el archivo donde se pueda; si no, descarga más un mensaje con el texto.
- **Historial de pagos** en la ficha, con «Anular» (hoja con motivo, `admin_anular_pago`).
- En la ficha, «Cambiar plan» abre una hoja con los planes que se ofrecen, más «A medida» con su límite.
- Prueba: poner o cambiar `prueba_hasta`.

## 2. Planes

- `/admin/mas/planes`, como el tablero:
  - Tarjeta por plan: precio, productos, créditos al mes, cuántas tiendas lo usan, «Se ofrece» y si es el destacado.
  - «Nuevo plan» y editar, en una hoja.
  - «Lo que cuesta lo demás» edita `precios_extra`.
- **La app de las tiendas lee los planes de la base:**
  - El nombre del plan en el encabezado, el menú de tienda, Inicio, inventario y la hoja «Tu plan»: deja `NOMBRE_PLAN` y lee el plan de la tienda (con su nombre, límite, créditos y precio).
  - `LIMITE_PRODUCTOS_POR_PLAN` y `CREDITOS_RETOQUE_MENSUALES` salen de `lib/config.ts`.
  - La demo usa los mismos planes que la base.
- **La hoja de planes del catálogo React** (`components/tienda/planes.tsx`) y la historia «Cómo funciona» leen los planes que se ofrecen (y `precios_extra`) desde una función pública nueva, `planes_publicos()`, para `anon`, que devuelve solo planes que se ofrecen y sin datos de tiendas. Con un plan sin precio, la tarjeta dice «Pregúntanos».
- **Créditos mensuales:** un botón en Más › Planes, «Recargar créditos del mes», que llama a `admin_recarga_mensual()`. Es idempotente y muestra cuántas tiendas recargó. Sin tarea programada todavía.

## 3. Más, Salud, Registro y Quién entra al admin

- **Más:** la lista del tablero. Invitaciones lleva a una pantalla «Muy pronto» que dice que llega con el onboarding.
- **Funciones nuevas:**
  - Lista de las funciones de `lib/funciones.ts` que están apagadas para todos, y por cada una las tiendas donde está encendida, con «Encender para una tienda» (buscador).
  - `lib/funciones.ts` pasa a decidir por tienda: encendida si lo está globalmente **o** en `funciones_tienda` para la tienda activa.
  - El panel lee las funciones de su tienda al cargar.
- **Salud:** desde `admin_salud()`.
  - Barras contra los límites del plan gratis de Supabase, como constantes en un solo archivo: 1 GB de almacenamiento y 500 MB de base.
  - «Datos servidos»: enlace al uso del proyecto en el panel de Supabase, sin número inventado.
  - Lo que más pesa y la actividad de hoy.
  - El mensaje verde de arriba solo si nada pasa del 70 %; si algo pasa, el aviso en su lugar.
- **Registro:** filtros y páginas de 50, de `admin_registro`. Cada fila con su ícono y una frase («Lewis registró un pago de Luna Bijou»).
- **Quién entra al admin:** lista, «Agregar por correo» y quitar (con confirmación). No se puede quitar al último admin.

## 4. Comprobación

- `npm run lint`, `npm run build`, `npm test` y todos los `probar:*`. Los del panel tienen que seguir pasando con los planes leídos de la base.
- **Script nuevo `scripts/probar-admin-cobros.mjs`** (demo):
  1. Registrar una mensualidad a una tienda atrasada: sale de Atrasadas, «pagada hasta» correcto y el recibo se genera.
  2. Anular ese pago: vuelve a Atrasadas.
  3. Vender 50 créditos: el saldo sube y queda el movimiento con su pago.
  4. Crear el plan «Básico» con precio y límite, y pasar una tienda a él: su encabezado y su límite cambian en el panel. La hoja de planes del catálogo lo muestra.
  5. Dejar de ofrecer un plan: quien lo tiene lo conserva y ya no aparece en el catálogo.
  6. Encender Tu próxima jugada para una sola tienda: solo esa la ve.
  7. Recargar créditos dos veces en el mismo mes: la segunda no suma.
  8. Salud y Registro muestran lo que pasó.
- **Real (Supabase):** prueba con una tienda de prueba; ni pagos ni planes reales para Michel, salvo que Lewis lo pida. Luego borra lo de prueba que se pueda: los pagos no se borran, se anulan. Dilo.
- **Capturas** en `docs/capturas/admin-cobros/`.

## 5. Cierre

PR con:
- lo que cambió;
- los resultados;
- las capturas;
- los pasos para Lewis:
  1. Crear sus planes de verdad.
  2. Asignar el plan a Michel.
  3. Registrar su pago y mandarle el recibo.

**Déjalo abierto, sin merge.** Actualiza «Dónde va el trabajo» en `docs/00-contexto-del-proyecto.md` y `lib/novedades.ts` si la tienda ve algo nuevo (planes, recibo).
