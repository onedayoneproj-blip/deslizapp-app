# Precio editable del paquete de marca y promociones (rama `feat/precios-promociones`)

> **Modelo:** en Claude Code, Sonnet 5.5; en Codex, el modelo principal con razonamiento medio. Toca cobros, pero solo los registra Lewis y solo él ve el admin. Cuando todo pase, **fusiona (squash) a `main`**; **deja el PR abierto con la preview** si cambias cómo se calcula un monto que ya existe (precaución de dinero), y dilo.

> **Orden:** va **después** de `docs/prompts/admin-4-cobros.md` (Planes, Más, Registrar pago) y de `docs/prompts/mi-marca.md` (la tarjeta del paquete de marca). Si no están en `main`, no empieces.

## 0. Antes de empezar

Lee `docs/00-contexto-del-proyecto.md` (migraciones, cierre de PR), `AGENTS.md`, `HANDOFF.md`, `docs/13-admin.md` §8 y §9, `docs/14-precios-y-lanzamiento.md` §1 y §2, y `docs/09-sistema-de-diseno.md`. Tu puesto es **Coding**. Mira cómo quedó «Más › Planes › Lo que cuesta lo demás» (edita `precios_extra`) y la hoja «Registrar pago».

## 1. Qué decidió Lewis (6 oct 2026)

- El paquete **«Marca y diseño» (hoy RD$5,000)** tiene un precio que **Lewis puede cambiar** y al que se le pueden **aplicar descuentos de promoción**.
- Lo mismo sirve para cualquier otro precio extra (paquetes de créditos). Los planes mensuales no entran en este PR.

## 2. Datos (migración)

Reglas de migraciones de `docs/00`: `list_migrations` antes, ensayo con `BEGIN; … ROLLBACK;`, pregunta a Lewis antes de aplicar, versión que le ponga Supabase, `revisar:migraciones` en cero. Ningún dato real en la migración.

- **Tabla `promociones`:** `id uuid`, `clave text` (referencia a `precios_extra.clave`), `nombre text` (1 a 60, por ejemplo «Lanzamiento»), `tipo` (`porcentaje` o `monto`), `valor integer` (porcentaje 1–100, o pesos), `desde date`, `hasta date null` (sin fin), `activa boolean`, `creado_en`. Un descuento nunca deja el precio por debajo de 0.
- **Función de lectura `precio_vigente(p_clave text)`:** devuelve `precio`, `precio_final` y la promoción aplicada (`nombre`, `hasta`), tomando la promoción activa y vigente hoy (zona horaria de Santo Domingo, como el resto) de mayor descuento si hay varias. Disponible para `authenticated` (la usa la tarjeta de Mi marca) y para el admin. Nada para `anon`.
- **RPCs de admin** (`security definer`, solo admins, escriben `registro_admin` como las demás): `admin_guardar_promocion`, `admin_apagar_promocion`. Sigue el patrón de `admin_guardar_precio_extra`.
- Corre `get_advisors` y arregla lo que salga de tus objetos.

## 3. En el admin

- **Más › Planes › Lo que cuesta lo demás:** además de editar el precio, cada fila muestra su promoción vigente (nombre, descuento y hasta cuándo) y un botón «Promoción» que abre una hoja: nombre, descuento (porcentaje o monto), desde, hasta (opcional). Se puede apagar con «Terminar promoción». El precio con descuento se muestra junto al normal («RD$3,500 · antes RD$5,000»).
- **Registrar pago:** al elegir «Marca y diseño» o un paquete de créditos, el monto se llena con `precio_final` y debajo se ve el descuento aplicado. **El monto siempre se puede editar a mano** (un trato especial con una tienda no necesita una promoción): si el monto no coincide con el precio vigente, la hoja lo dice en una línea. El pago guarda el monto real cobrado; **el nombre de la promoción o «precio acordado» va en la nota del pago**. No cambies el esquema de `pagos` ni su inmutabilidad.
- Textos cortos y en la voz de `docs/11`. Demo: con datos locales.

## 4. En la tienda

- La tarjeta «¿Todavía no tienes marca?» de **Mi marca** muestra el precio con la promoción vigente: el precio normal tachado, el final, y «hasta el 31 oct» si hay fin. Sin promoción, solo el precio. Lee `precio_vigente`, no lo calcula la app.
- La tienda no ve el nombre interno de las promociones si Lewis no quiere; usa solo el descuento y la fecha final.

## 5. Pruebas y cierre

- Pruebas de `precio_vigente`: sin promoción, porcentaje, monto fijo que superaría el precio, promoción fuera de fecha, dos promociones a la vez, promoción apagada.
- El monto de Registrar pago se llena bien y se puede editar; la nota guarda la promoción; `admin_registrar_pago` y las reglas de cobro **no cambian**.
- `tsc`, tests, lint y build sin errores nuevos; regresiones de Cobros y de Más; `revisar:migraciones` en cero.
- Novedad solo si el panel de la tienda cambió (la tarjeta de Mi marca); si no, no.
- Resume en español, corto: qué cambió y qué debe crear o probar Lewis (por ejemplo, la primera promoción de lanzamiento).
