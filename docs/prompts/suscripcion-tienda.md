# Suscripción de la tienda: elegir plan, pagar y quedar al día (rama `feature/suscripcion-tienda`)

> **Modelo:** en Codex, el más alto con razonamiento alto. En Claude Code, Opus 5.5. Toca dinero, políticas de seguridad (RLS), almacenamiento y la app de las tiendas.

## 0. Antes de empezar

Lee:
- `docs/00-contexto-del-proyecto.md` (en especial las reglas de migraciones), `AGENTS.md` y `HANDOFF.md`. Tu puesto es **Coding**.
- `docs/14-precios-y-lanzamiento.md` entero: los planes, el pago anual, las pruebas y las fases.
- `docs/13-admin.md` §6 (Ver como bloquea escrituras), §8 y §9, y `docs/07-fase-2-cuentas-y-cobros.md` (pausa y avisos).
- `referencias/suscripcion/LEEME.md` y los 13 tableros (capturas y `.dc.html`). Son diseño aprobado: **no copies su HTML.**
- `docs/09-sistema-de-diseno.md`, `docs/08-movimiento.md` y `docs/11-voz-y-frases.md`.
- Lo que dejó la parte 4 del admin (`docs/prompts/admin-4-cobros.md`): los planes en la base, `planes_publicos()`, Registrar pago, `MESES_PAGADOS_ANUAL`, el recibo y la regla de Hoy del pago anual.
- `components/panel/hoja-plan.tsx`, `lib/plan-catalogo.ts`, `lib/config.ts`, `lib/imagen.ts` (`reducirFoto`) y la capa de datos.

Rama `feature/suscripcion-tienda` desde `main`, con la parte 4 del admin ya fusionada. Si no lo está, parte de su rama, dilo en el PR y no abras este PR antes del suyo.

Las dos sesiones de Coding comparten la base de producción: sigue las reglas de migraciones de `docs/00` (preguntar a Lewis antes de aplicar, ensayo con `BEGIN; … ROLLBACK;`, comprobar que `main` sigue funcionando, `list_migrations`, versión de Supabase en el archivo, `revisar:migraciones` en cero).

## 1. Qué se construye

No hay pasarela de pago: la tienda **transfiere** y avisa; Lewis **confirma** en el admin. La tienda ve cada paso en su app. Nada se activa solo: una foto del comprobante se puede falsificar.

Pantallas, en `referencias/suscripcion/`:

| # | Tablero | Dónde vive en la app | Notas |
|---|---|---|---|
| 1 | `ElegirPlan` | Hoja alta o pantalla (decide según docs/09 y explícalo en el PR) | Planes que se ofrecen, desde la base. |
| 2 | `Fundadora` | Al final de la prueba, si la tienda tiene el plan «Fundadora» | Textos fijos por docs/14 §4 en un solo archivo. |
| 3 | `ComoPagar` | Siguiente paso de 1, 8 y 10 | Datos del banco en `lib/config.ts` (§5). |
| 4 | `YaPague` | Siguiente paso de 3 | Foto con `reducirFoto`. |
| 5 | `EnRevision` | Tras enviar; también desde el aviso fijo | Lee el aviso más reciente. |
| 6 | `AlDia` | Una sola vez, cuando Lewis confirma | Con el recibo (§3.6). |
| 7 | `TuPlan` | Sustituye a `hoja-plan.tsx` | Pagado hasta, periodo, productos, créditos, historial. |
| 8 | `Limite` | Cuando se llena el catálogo | Subir pagando la diferencia. |
| 9 | `Video` | Al tocar «Video» en una tienda cuyo plan no lo permite | §3.4. |
| 10 | `Creditos` | Desde Tu plan y desde «Te faltan créditos para esta.» | Paquetes de `precios_extra`. |
| 11 | `AvisoPrueba` | Tarjeta en Inicio | Cifras reales de la tienda. |
| 12 | `Pausa` | Tienda `pausada`: aviso fijo y panel en solo mirar | §3.5. |
| 13 | `CatalogoPausa` | `/tienda/{slug}` si la tienda está `pausada` | Página amable con su Instagram. |

Los datos de ejemplo de los tableros (Mora Shoes, las cifras) **no se copian**: todo sale de la tienda real o de la demo.

## 2. Datos y funciones nuevos (una migración por tema, aplicadas de una en una)

**Tabla `avisos_pago`** (lo que la tienda manda; **no** es el pago, el pago lo crea Lewis al confirmar):
`id`, `tienda_id`, `concepto` (`mensualidad` | `cambio_plan` | `creditos`), `plan_id` (null en créditos), `periodo` (`mensual` | `anual`, null en créditos), `creditos` (solo créditos), `monto` (lo calcula la base, nunca el cliente), `comprobante_url`, `referencia`, `estado` (`por_revisar` | `confirmado` | `rechazado`), `motivo_rechazo`, `pago_id` (el pago que se creó al confirmar), `visto_en`, `creado_por`, `creado_en`, `resuelto_por`, `resuelto_en`. Índice único parcial: **un solo aviso `por_revisar` por tienda y concepto** (mandar otro lo reemplaza).
- RLS: los miembros de la tienda leen los suyos; nadie escribe directo. Los admins leen todos.

**Funciones de la tienda** (`security definer`, `set search_path = ''`, solo `authenticated`, comprueban membresía y que **no haya una sesión de Ver como activa** con la misma comprobación de la parte 1):
- `avisar_pago(p_tienda_id, p_concepto, p_plan_id, p_periodo, p_creditos, p_comprobante_url, p_referencia)`: la base calcula el monto (§3.1 y §3.3). Valida que el comprobante esté bajo `<tienda_id>/`. Un plan sin precio devuelve `plan_sin_precio`.
- `marcar_aviso_visto(p_aviso_id)`: pone `visto_en` (para que `AlDia` salga una sola vez).

**Funciones del admin** (comprueban `soy_admin()` y anotan en `registro_admin`):
- `admin_confirmar_aviso(p_aviso_id, p_metodo default 'transferencia')`, en una sola transacción:
  - `mensualidad`: si el plan del aviso es otro, `admin_cambiar_plan`; luego `admin_registrar_pago` (concepto `mensualidad`, `p_meses` 1 o 12). Una tienda en prueba pasa a `activa` (ya lo hace `admin_registrar_pago`).
  - `cambio_plan`: `admin_cambiar_plan` y `admin_registrar_pago` con concepto `otro` y la nota «Cambio de plan a {plan}»; `pagado_hasta` no cambia.
  - `creditos`: `admin_registrar_pago` (concepto `creditos`, `p_creditos`).
  - Deja el aviso `confirmado` con su `pago_id`. No edites `admin_registrar_pago`: llámalo.
- `admin_rechazar_aviso(p_aviso_id, p_motivo)`: motivo obligatorio y corto; la tienda lo ve.

**Almacenamiento:** el bucket `comprobantes` (parte 1) solo deja subir a admins. Agrega una política para que un **miembro** pueda **insertar** (nunca leer, cambiar ni borrar) bajo `<su tienda_id>/`. Si hace falta que la tienda vea su captura después, que sea con una URL firmada pedida por una función; si no hace falta, no.

**Planes:** columnas nuevas en `planes`:
- `incluye text[] not null default '{}'`: las líneas de «lo que incluye» (marca, promos, video, varias tiendas…). La tarjeta del plan muestra primero las líneas calculadas (productos y créditos) y después estas. Edítalas en la hoja de plan del admin (un campo, una línea por cosa) y devuélvelas en `planes_publicos()`.
- `permite_video boolean not null default true`: un interruptor en la hoja de plan del admin. **Los planes y tiendas que existen hoy quedan con `true`.**

**Lecturas:** comprueba que un miembro puede leer sus propios pagos (docs/13 §5 lo dice); si falta la política, agrégala de solo lectura. El número del recibo es `pagos.numero`.

## 3. Reglas de cada pieza

### 3.1 Elegir plan y los montos
- Muestra los planes con `se_ofrece = true`, más el plan propio de la tienda si no se ofrece (la Fundadora). «Recomendado» es `destacado`. Plan sin precio: la tarjeta dice «Pregúntanos» y el botón abre WhatsApp.
- **Mensual / Anual:** el anual es `MESES_PAGADOS_ANUAL` (10) veces el precio mensual, que paga 12 meses. La línea bajo el precio dice a cuánto sale al mes y cuánto se ahorra.
- **«Cubre hasta…»** (`ComoPagar`, `Pausa`): `max(pagado_hasta, hoy)` más 1 o 12 meses, con la misma regla que la base.
- **Fundadora:** si la tienda tiene el plan «Fundadora», al terminar la prueba ve `Fundadora` antes de `ElegirPlan`. Su botón lleva a `ComoPagar` con su precio; «Ver los otros planes» a `ElegirPlan`.

### 3.2 Cambiar de plan
- **Subir de plan** (más caro): es un aviso `cambio_plan`. El monto lo calcula la base: `ceil((mensual_efectivo_nuevo − mensual_efectivo_actual) × días_que_quedan / 30)`, redondeado hacia arriba a RD$10, donde el «mensual efectivo» de un plan anual es su precio × 10 / 12. Si la tienda está en prueba o vencida, no hay diferencia: es una `mensualidad` del plan elegido.
- **Bajar de plan** no se hace desde la app: «Cambiar de plan» ofrece solo los más caros, y para bajar abre WhatsApp con el texto ya escrito (aplica al renovar).
- Sube a Tienda desde `Limite` con el mismo flujo.

### 3.3 Créditos
- Los paquetes salen de `precios_extra` con claves `creditos_25`, `creditos_50` y `creditos_100`. Un paquete sin precio no se muestra. Comprar crea un aviso `creditos`.
- «Te faltan créditos para esta.» (retoque) gana un botón «Comprar».

### 3.4 Video por plan
- Si `permite_video` es falso, el botón de agregar video en la ficha de medios abre `Video`. Los videos que ya existen se siguen viendo.
- **Solo en la interfaz por ahora.** Poner la comprobación en la función que guarda el producto exige reemplazar una función ya aplicada: déjalo anotado como pendiente en el PR.

### 3.5 Aviso de prueba, renovación y pausa
- **Inicio** muestra la tarjeta `AvisoPrueba` en los últimos 3 días de la prueba, con cifras reales de la tienda durante la prueba (pedidos, vendido, likes). Misma tarjeta, con otro texto, para la renovación: 3 días antes, el día y cada día de gracia (y 30 días antes en los planes anuales). Sale con «Elegir mi plan», «Ya pagué» o «Cómo pagar» según el caso.
- **Pausa:** una tienda `pausada` ve el aviso fijo de `Pausa` y el panel en solo mirar. Reutiliza el mecanismo central que la parte 2 hizo para Ver como (el contexto `soloMirar` que leen `Boton` y las hojas), con un motivo distinto y su propio texto: «Tu tienda está en pausa. Reactívala enviando tu pago.». **Nunca se borran datos.** Si hay una función de escritura que la base no bloquea para una tienda pausada, déjalo dicho en el PR; no lo resuelvas aquí sin que Lewis lo decida.
- **Catálogo público:** `/tienda/{slug}` de una tienda `pausada` muestra `CatalogoPausa` con el Instagram de la tienda, nunca un error técnico. Comprueba cómo lo maneja hoy la ruta y la función pública del catálogo.
- **Reactivación:** en cuanto Lewis confirma un pago, la tienda sale sola de la pausa (si `admin_registrar_pago` no lo hace ya, hazlo allí con una migración de reemplazo guardada como las de la parte 1).

### 3.6 Estado del pago y el recibo
- Al abrir la app, al volver al primer plano y tras enviar, la tienda lee su aviso más reciente. `por_revisar` → `EnRevision`. `rechazado` → el motivo y «Subir otra captura». `confirmado` sin `visto_en` → `AlDia` una vez.
- **El recibo** de `AlDia` usa la misma técnica de imagen que el recibo del admin (parte 4): descargar y compartir. Número `pagos.numero`; tienda, concepto, fecha, «pagado hasta» y total.
- En modo demo, el admin demo puede confirmar desde `/admin` para recorrer todo el ciclo en un mismo navegador.

## 4. Admin: lo que cambia (partes 2 y 4)

- **Cobros:** una sección nueva arriba, **«Por revisar»**, con conteo. Cada tarjeta: tienda, qué paga (plan, periodo o paquete), monto, hace cuánto, «Ver captura» (URL firmada) y «Confirmar» o «Rechazar» (hoja con motivo). Confirmar muestra primero un resumen («Queda pagada hasta…» o «Suma 50 créditos») y llama a `admin_confirmar_aviso`.
- **Hoy:** una regla nueva, «Pago por revisar» (prioridad 1, Plata, acción «Revisar», que lleva a Cobros). Desaparece cuando se resuelve. Reemplaza `admin_hoy()` en una migración nueva con las guardas de la parte 1 y refleja la regla en `lib/admin/reglas.ts`.
- **Mensajes** (`lib/admin/mensajes.ts`): el WhatsApp del recibo ya existe; agrega el de «no pude confirmar tu pago» (con el motivo).
- **Planes** (admin): la hoja de plan gana «Lo que incluye» y «Permite video».
- **Ver como:** un usuario que está en una sesión de Ver como no puede llamar a `avisar_pago` (lo rechaza la base).

## 5. Datos que da Lewis (no los inventes)

- Banco, tipo y número de cuenta y a nombre de quién, para `ComoPagar`. Ponlos como constantes en `lib/config.ts` **con valores claramente falsos** (`"[BANCO]"`) y **deja el PR abierto diciendo que falta**: no se publica con corchetes.
- Precio de los paquetes de créditos y créditos del plan Pro: los pone Lewis en el admin.
- La demo usa los planes y montos de `docs/14` §2.

## 6. Qué no se hace aquí

Pasarela de pago, pausa automática por falta de pago, notificaciones al teléfono, el aviso por WhatsApp automático, bajar de plan desde la app, la comprobación de video en la base, la IA que retoca.

## 7. Comprobación

- `npm run lint`, `npm run build`, `npm test` y todos los `probar:*`, incluidos los del admin. Con 360, 390 y 430 de ancho. Respeta las reglas de hojas, teclado y movimiento de `HANDOFF.md`.
- **Script nuevo `scripts/probar-suscripcion.mjs`** (demo):
  1. Elegir plan: los montos mensual y anual correctos; la Fundadora ve su precio; un plan sin precio dice «Pregúntanos».
  2. Pagar: avisar un pago con captura → `EnRevision`; el admin lo ve en «Por revisar» y en Hoy; confirmar → la tienda ve `AlDia` una sola vez, «pagada hasta» correcto y el recibo se genera.
  3. Rechazar con motivo → la tienda lo ve y sube otra captura.
  4. Anual: «pagada hasta» sube 12 meses, el monto sugerido es 10 veces el mensual, y a 30 días del vencimiento aparece el aviso (no a 31).
  5. Subir de plan: la diferencia prorrateada es la esperada (caso mensual y caso anual); al confirmar cambian el plan, el encabezado y el límite; bajar abre WhatsApp.
  6. Límite: con el catálogo lleno aparece `Limite`; sin plan que permita video, `Video`.
  7. Créditos: comprar 50 suma el movimiento con su pago; sin precio el paquete no sale.
  8. Prueba que termina: tarjeta con cifras reales. Renovación: los avisos de 3 días, el día y la gracia.
  9. Pausa: aviso fijo, botones apagados con su mensaje, el catálogo público muestra `CatalogoPausa`; al confirmar un pago vuelve todo.
- **Real (Supabase):**
  - Ensayo de cada migración con `BEGIN; … ROLLBACK;` y comprobación de que `main` sigue funcionando.
  - Con una tienda de prueba (no Esencias Michel) y una cuenta de prueba, comprueba: un miembro lee solo sus avisos; no puede escribir directo; no puede subir comprobantes a la carpeta de otra tienda ni leer ninguno; **un admin en Ver como no puede avisar un pago** (un admin dueño tampoco); el monto lo calcula la base aunque el cliente mande otro; `admin_confirmar_aviso` confirmado dos veces no suma dos veces.
  - Nada de pagos, planes ni créditos reales de Michel.
  - Los pagos no se borran, se anulan: si dejas pruebas, dilo.
- **Capturas** en `docs/capturas/suscripcion/`, comparadas con `referencias/suscripcion/capturas/`.

## 8. Cierre

PR con:
- lo que cambió, y qué piezas de §1 resolviste de otra forma y por qué;
- los estados no dibujados (`LEEME` de la referencia) y cómo los resolviste;
- los resultados y las capturas;
- los pasos para Lewis:
  1. Poner los datos del banco en `lib/config.ts`.
  2. Crear sus planes en `/admin` (Básico, Tienda, Pro y Fundadora) con «Lo que incluye» y «Permite video».
  3. Poner el precio de los paquetes de créditos.
  4. Con una tienda de prueba, elegir un plan, mandar un «Ya pagué» con una captura y confirmarlo desde Cobros.

**Déjalo abierto, sin merge.** Actualiza «Dónde va el trabajo» en `docs/00-contexto-del-proyecto.md` y `lib/novedades.ts` (la tienda ve algo nuevo: pagar y el recibo).
