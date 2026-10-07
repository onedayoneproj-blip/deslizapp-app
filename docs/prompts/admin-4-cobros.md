# Admin, parte 4: Cobros, Planes, Más, Salud y Registro (rama `feature/admin-cobros`)

> **Modelo:** en Claude Code, Sonnet 5.5; en Codex, el modelo principal con razonamiento medio. Toca cobros, pero solo los registra Lewis y solo él ve el admin; las migraciones siguen las reglas de `docs/00`.

## 0. Antes de empezar

Lee:
- `docs/00-contexto-del-proyecto.md`, `AGENTS.md` y `HANDOFF.md`. Tu puesto es **Coding**.
- `docs/13-admin.md` §3.7 a §3.9, §8, §9 y §10, y `docs/14-precios-y-lanzamiento.md` (los planes, el pago anual y las pruebas que Lewis decidió el 6 oct 2026).
- `referencias/admin/LEEME.md` y los tableros `Cobros`, `RegistrarPago`, `Planes`, `Mas`, `Salud` y `Registro`. Son diseño aprobado: **no copies su HTML.**
- `docs/09-sistema-de-diseno.md` y `docs/11-voz-y-frases.md`.
- `lib/config.ts`, `lib/funciones.ts`, `components/panel/hoja-plan.tsx` y `components/tienda/planes.tsx`.
- Lo que dejaron las partes 1 a 3.

Rama `feature/admin-cobros` desde `main`, con las partes anteriores fusionadas. Si no lo están, parte de la última rama y dilo en el PR.

## 0b. Ajustes de Planning (7 oct 2026): léelos antes de empezar

- **Parte desde `main` al día.** Entraron #55, #56, #58 y entra #57 (Mi marca): si #57 aún no está en `main`, haz `git fetch origin` seguido y rebasa antes de abrir el PR; el menú de la tienda, `lib/novedades.ts` (usa el número siguiente al de `main` al momento del merge) y `lib/cuenta.ts` cambiaron.
- **Migraciones:** antes de aplicar una, `list_migrations` (Lewis trabaja con una sola sesión a la vez; no hace falta preguntarle); ensayo en `BEGIN … ROLLBACK`; el archivo lleva la versión que Supabase asigne. `npm run revisar:migraciones` en cero.
- **Esencias Michel y la Tienda de ensayo están en «Plan a medida» (`custom`) con `limite_productos = 100000` puesto a mano** (parche de «ilimitado»). Al pasar la app a leer los planes de la base, **las dos tiendas tienen que verse y comportarse igual que hoy** (nombre «Plan a medida», sin límite práctico, 95 créditos en Michel). Añade una prueba de eso y no cambies su plan en la base.
- Para la prueba real usa la **Tienda de ensayo** (slug `tienda-de-ensayo`), nunca Michel. No ajustes sus créditos por SQL: hazlo con las funciones del admin o déjalo como paso para Lewis.
- **Fuera de alcance:** suscripciones por titular, varias tiendas por suscripción y niveles de permiso de colaboradores. Llegan con `docs/prompts/suscripciones-y-varias-tiendas.md` (Opus), después de esta parte. No diseñes esto aquí; solo no lo estorbes (por ejemplo, no pongas el plan como dato fijo de la tienda en el cliente).
- **Cierre distinto al del final de este prompt:** como la app de las tiendas empieza a leer sus planes de la base (lo que ve cada dueño en su encabezado, su límite y su hoja «Tu plan»), **deja el PR abierto con su preview** y avisa a Lewis qué probar en el panel de Michel. No hagas merge.

## 1. Cobros y Registrar pago

- **Pantalla Cobros** (`/admin/cobros`), con lo de docs/13 §8:
  - La tarjeta del mes: cobrado contra esperado, por cobrar y créditos vendidos.
  - Atrasadas: tarjeta con «Registrar pago» y «Escribirle».
  - Vencen esta semana.
  - Al día y En prueba, plegadas.
- **Hoja «Registrar pago»**, que se abre desde Cobros, desde la ficha y desde «Ya pagó» en Hoy:
  - Concepto (Mensualidad, Créditos, «Marca y diseño», que es el concepto interno `instalacion`; ya no hay cobro de montaje) y monto, que se llena con el precio del plan o del paquete.
  - Con Mensualidad, un selector **Mensual o Anual**. Anual manda `p_meses = 12` a `admin_registrar_pago` (ya lo acepta) y llena el monto con **10 veces el precio mensual** del plan; la constante `MESES_PAGADOS_ANUAL = 10` va en un solo archivo.
  - Método y referencia.
  - Comprobante: foto al bucket `comprobantes`, reducida con `reducirFoto`.
  - La línea «Queda pagada hasta…», calculada en vivo con la misma regla de la base.
  - El interruptor «Mandarle el recibo».
- **El recibo:** una imagen generada con la técnica de los recibos de pedidos (`lib/imagen-factura.ts` o equivalente), con el logo de Deslizapp, la tienda, el concepto, el monto, la fecha y «pagada hasta». Se comparte con WhatsApp: `navigator.share` con el archivo donde se pueda; si no, descarga más un mensaje con el texto.
- **Historial de pagos** en la ficha, con «Anular» (hoja con motivo, `admin_anular_pago`).
- En la ficha, «Cambiar plan» abre una hoja con los planes que se ofrecen, más «A medida» con su límite.
- Prueba: poner o cambiar `prueba_hasta`.
- **Aviso de renovación anual:** una regla nueva de Hoy, «Pago anual que vence en ≤ 30 días» (prioridad 2, Plata, acción «Recordarle», con un mensaje nuevo en `lib/admin/mensajes.ts`). Una tienda es anual si su última mensualidad vigente (no anulada) fue de 12 meses. Es un asunto aparte: **el estado de cobro y su ventana de 3 días no cambian.** Eso exige reemplazar `admin_hoy()` en una migración nueva y reflejar la regla en `lib/admin/reglas.ts`. Sigue el patrón de guardas que usó la parte 1 para reemplazar funciones (comprobar que la versión que reemplazas es la esperada) y las reglas de migraciones de `docs/00`.
- **Créditos con pago anual:** `admin_recarga_mensual` ya recarga por mes calendario sin mirar cómo paga la tienda; compruébalo con una tienda anual y no lo cambies.

## 2. Planes

- **Planes que Lewis va a crear al terminar** (no los crees tú en la base real; déjalos como datos de la demo y como pasos del PR): Básico RD$790, 50 productos, 20 créditos; Tienda RD$1,690, 200 productos, 100 créditos, destacado; Pro RD$2,890, sin límite. Los planes `p20`, `p60` y `p100` dejan de ofrecerse. Más un plan «Fundadora» (como Básico, RD$590, `se_ofrece = false`). Precios y razones en `docs/14` §2 y §4.
- El video solo desde Tienda **no se construye ahora**: queda como una nota en el PR.
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
   - Registrar un pago anual: «pagada hasta» sube 12 meses, el monto sugerido es 10 veces el mensual, y a 30 días del vencimiento aparece el asunto «Pago anual» en Hoy (con reloj simulado), pero no a 31.
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

**No hagas merge (ver §0b):** deja el PR abierto con su preview. Actualiza «Dónde va el trabajo» en `docs/00-contexto-del-proyecto.md` y `lib/novedades.ts` si la tienda ve algo nuevo (planes, recibo).
