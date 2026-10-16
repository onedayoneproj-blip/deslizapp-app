# 14 · Precios y lanzamiento

> **Propuesta vigente para probar (Lewis, 16 oct 2026):** [`referencias/planes/estrategia-y-validacion-oct-2026.pdf`](../referencias/planes/estrategia-y-validacion-oct-2026.pdf) sustituye la tabla de planes del §2, el anual del §3 y la oferta de fundadoras del §4. Son hipótesis por validar, no tarifa definitiva:
>
> | Plan | Al mes | Al año (10 por 12) | Límites tentativos | Ideal para |
> |---|---|---|---|---|
> | Inicial | RD$499 | RD$4,990 | 30 publicaciones activas · 1 tienda · 1 usuario | Quien vende por su cuenta |
> | Negocio | RD$999 | RD$9,990 | 150 publicaciones activas compartidas · hasta 3 tiendas · 5 usuarios | Tienda en crecimiento |
> | Pro | RD$1,499 | RD$14,990 | Límites altos con uso razonable · varias tiendas | Operación con más movimiento |
>
> - Solo cuentan los productos publicados y activos: agotados, ocultos y borradores no consumen cupo. Las tiendas de una cuenta comparten el límite.
> - El plan más bajo conserva lo esencial: catálogo, pedido por WhatsApp, panel de pedidos y clientes. Los planes se diferencian por volumen, tiendas, usuarios y herramientas avanzadas.
> - **Fundadoras (Lewis, 16 oct 2026): 30 % menos durante todo el primer año**, después de los 30 días de prueba. Sin descuentos de por vida. El 30 % no se combina con el anual sin calcular el margen.
> - **Círculo Deslizapp (aprobado por Lewis, 16 oct 2026):** el grupo de las tiendas fundadoras, con el concepto de «Mejores amigos» de Instagram.
>   - **Es una marca encima del plan, no un plan aparte:** la tienda elige Inicial, Negocio o Pro y el Círculo aplica el 30 % menos sobre ese plan durante el primer año. En la base, una marca en la suscripción con su fecha de alta y de fin del descuento. El descuento se aplica al confirmar el cobro en Cobros. Sustituye al plan «Fundadora» del 6 oct.
>   - **Quién entra:** cupo limitado (orientativo, unas 20 tiendas), solo por invitación de Lewis y hasta la apertura al público. Si algún día se muestra «quedan N lugares», con el número real.
>   - **Va con el titular, no con una tienda** (propuesta de Planning, 16 oct 2026; pendiente del OK de Lewis): como la suscripción es del titular y sus tiendas cuelgan de ella, el Círculo se marca en la suscripción. Todas sus tiendas, también las que cree después, llevan el aro, y el 30 % se aplica al precio de esa suscripción (las tiendas extra van incluidas en el plan, así que no hay descuentos por tienda). El cupo cuenta personas, no tiendas.
>   - **El aro:** con los colores de Deslizapp, alrededor del avatar de la tienda **en su panel**. No se muestra a los compradores.
>   - **Incluye:** 30 % menos todo el primer año; créditos de bienvenida (un regalo único; la cantidad se fija cuando se mida el costo del retoque); probar funciones antes; regalos de merch; marca y personalización listas sin costo; canal directo con Lewis; votar la siguiente función; salir como caso de éxito si quieren. No se prometen extras mensuales de límites.
>   - **Al terminar el año:** pierden el descuento y conservan el aro para siempre («Fundadora desde 2026») y el acceso anticipado.
> - Pendiente de decidir: créditos de retoque por plan y precio del servicio de marca. Lo que sigue abajo queda como antecedente del 6 oct.

Decisiones de Lewis del 6 de octubre de 2026, para probarlas con las primeras tiendas. **Los precios viven en la base (`planes`), no en el código**: Lewis los crea y los cambia desde `/admin` (docs/13 §9). Este documento dice qué crear y cómo se cobra; si algo no se confirma con las primeras tiendas, se cambia aquí y en el admin.

## 1. Sin montaje

- **Se elimina el cobro de montaje (instalación) para todos los planes.**
- Para que eso salga a cuenta, **la tienda carga sus propios productos y fotos** con el onboarding. El equipo solo deja lista la personalización (colores, frases, cabecera), que con la pantalla Personalizar del admin son unos 15 a 30 minutos.
- **Marca o logo nuevos siguen siendo un servicio aparte** (RD$5,000, `precios_extra`): ahí hay trabajo de diseño de verdad. **El precio se edita desde el admin y admite descuentos de promoción** (decisión del 6 oct 2026; falta especificarlo). En el admin, el concepto interno `instalacion` se muestra como «Marca y diseño».

## 2. Planes

| Plan | Al mes | Productos | Créditos de retoque al mes | Lo que incluye |
|---|---|---|---|---|
| **Básico** | RD$790 | 50 | 20 | Catálogo con su marca, pedidos y clientes |
| **Tienda** (destacado) | RD$1,690 | 200 | 100 | Personalización completa, promos y video |
| **Pro** | RD$2,890 | Sin límite | Por decidir (100 o más) | Varias tiendas, equipo y dominio propio |

- Los planes anteriores (`p20`, `p60`, `p100`) dejan de ofrecerse (`se_ofrece = false`); quien los tiene los conserva.
- **Varias tiendas y suscripciones (decisión del 6 oct 2026):** la **suscripción es del titular** (la persona que paga), no de la tienda; una persona puede tener varias, y las tiendas cuelgan de una suscripción. Tiendas, colaboradores y productos son **tres límites editables por plan y por suscripción a medida**; «sin límite» es un valor vacío, no un número. Las tiendas extra **van incluidas en el plan**, no se cobran aparte, y **comparten productos, colaboradores y créditos** de la suscripción. Prompt: `docs/prompts/suscripciones-y-varias-tiendas.md` (después de la parte 4 de cobros y del selector). Hoy Esencias Michel y la Tienda de ensayo están en «Plan a medida» con límite de productos 100,000 puesto a mano, y se pasan a «sin límite» con ese prompt: Esencias Michel con Michel Guerrero como titular y la ensayo con Lewis.
- **Video solo desde Tienda:** el video pesa mucho (cerca de 10 MB por 30 s) y el plan gratis de Supabase tiene 1 GB. **Esa restricción por plan todavía no existe en el código**; se decide cuando se construya. Mientras tanto, desde el 7 oct 2026 **no se puede subir video para nadie** (`VIDEO_PERMITIDO = false` en `lib/config.ts` y el bucket `productos` solo acepta imágenes).
- **Créditos comprados:** se siguen vendiendo en paquetes y no vencen. **El precio del paquete se fija cuando se mida lo que cuesta cada foto retocada con IA** (todavía no medido). Los créditos mensuales no se acumulan.
- **Retoque con IA:** hoy el admin trabaja con una cola de entrega manual (docs/13 §7). Queda por decidir si la IA retoca dentro de la app (automático, con costo por foto) o si Lewis la usa por fuera y sube el resultado. La cola sirve de puente. **El retoque se hace con la foto original y con «Mi marca» de la tienda** (logo, Instagram y al menos 3 fotos de referencia, que se exigen antes del primer retoque; si no tiene marca, se le ofrece el paquete «Marca y diseño»). **Mientras tanto el retoque es una función Beta y lo hace un modelo de inteligencia de imagen asistido por expertos en branding** (no un botón automático); así se dice en la app, con una etiqueta «Beta» y una hoja de bienvenida la primera vez (`docs/prompts/retoque-beta-y-tienda-de-ensayo.md`).

## 3. Pago anual

**10 meses por 12.**

| Plan | Anual |
|---|---|
| Básico | RD$7,900 |
| Tienda | RD$16,900 |
| Pro | RD$28,900 |

- Se ofrece cuando la tienda ya vio valor: al terminar la prueba o después de su primera venta. No al registrarse.
- **Créditos:** se recargan cada mes (no los 12 de golpe). Los comprados no vencen.
- **Reembolso:** completo en los primeros 14 días. Después no se devuelve, pero la tienda sigue activa hasta el último día pagado. Los términos los revisa un abogado antes de publicarse.
- **Cambio de plan:** si sube a uno más caro, paga la diferencia por los meses que quedan. Si baja, aplica al renovar.
- **Precio fijo durante el año.** Al renovar aplica el precio vigente, avisando con 30 días.
- **Aviso de renovación a 30 días** (en vez de los 3 de la mensualidad).
- Es dinero por adelantado, no ingreso libre: si se cierra el servicio, se debe.
- Cómo se registra: es una mensualidad con `meses = 12` y monto 10 veces el precio mensual (docs/13 §8). No cambia el esquema.

## 4. Pruebas y fases

| Fase | Cuándo | Quiénes | Condiciones |
|---|---|---|---|
| 1. Fundadoras | Meses 1 y 2 | 5 a 10 tiendas que elige Lewis | 30 días gratis **contados desde que se publica el catálogo**. Después, **RD$590 al mes durante 12 meses**. A cambio dan opinión y dejan mostrar su catálogo |
| 2. Invitación | Meses 3 y 4 | Quien llegue por invitación | 14 días gratis, o un mes gratis si la invita otra tienda. RD$790 |
| 3. Abierto | Del mes 5 | Cualquiera | 14 días gratis, precios completos y anual disponible |

- **El precio de fundadora** se maneja con un plan aparte, **«Fundadora»**: igual al Básico, a RD$590, con `se_ofrece = false` y asignado a mano. A los 12 meses se pasa la tienda a Básico; se anota la fecha en la nota de la tienda.
- **La prueba** usa `prueba_hasta` y los 5 días de gracia que ya existen. Aviso 3 días antes del fin, con «Ya pagó» y el WhatsApp. Pocos créditos durante la prueba (20).
- **No bajar de RD$590**: por debajo se atraen tiendas que no crecen.
- **Qué medir:** cuánto tardan en publicar, cuánto en recibir su primer pedido, cuántas pagan al terminar la prueba y cuánto tiempo de Lewis gasta cada una. Si paga menos de la mitad, el problema es el valor o el proceso, no el precio. Si el tiempo por tienda es muy alto, pulir el onboarding antes de abrir la fase 2.
- Los primeros meses son para aprender y ganar casos de éxito, no para cubrir gastos.

## 5. Primera carga del inventario

La tienda carga sus productos y fotos. Para que sea fácil, en tres etapas:

1. **Ahora, entrevista asistida por IA que usa Lewis, no el cliente.** El cliente manda por WhatsApp fotos y notas de voz; Lewis las pasa a la IA con un prompt de entrevista, que devuelve una hoja ordenada con nombre, tipo, detalles, variantes y stock. Por qué no el chat del cliente: necesita cuenta, los planes gratis limitan las fotos, el chat no guarda fotos en el almacenamiento y la conversación se hace larguísima. *Pendiente: escribir el prompt (`docs/prompts/`), con el formato de los campos del producto.*
2. **Siguiente: «Importar productos»** en el admin: se sube la hoja y las fotos (nombradas por código) y se crean los productos en borrador. *Pendiente: especificación y prompt para Coding.*
3. **Después: IA dentro de la app.** El cliente sube sus fotos y la IA propone nombre, tipo y descripción; el cliente confirma. Cuesta por uso; cuando ya haya tiendas pagando.

En el onboarding, «subir tus productos» es un paso de la lista que desbloquea el catálogo.

## 6. Pantallas de suscripción (diseño aprobado el 6 oct 2026)

Lo que ve la tienda para elegir plan, pagar y quedar al día: elegir plan (mensual o anual), la oferta de fundadora, cómo pagar, «Ya pagué» con la captura, «lo estamos revisando», «al día» con el recibo, Tu plan rediseñado, catálogo lleno, video por plan, comprar créditos, avisos de prueba y renovación, y la tienda en pausa (panel y catálogo). Diseño: `referencias/suscripcion/`. Prompt: `docs/prompts/suscripcion-tienda.md`.

- No hay pasarela: la tienda transfiere y avisa; Lewis **confirma** en Cobros. Un aviso de pago no activa nada por sí solo.
- Subir de plan paga la diferencia por los días que quedan; bajar de plan se pide por WhatsApp y aplica al renovar.
- El video queda solo desde el plan Tienda (`permite_video` en el plan).
- Faltan datos de Lewis: banco y cuenta para transferir, precio de los paquetes de créditos y créditos del plan Pro.

## 7. Referencias de mercado (6 oct 2026)

Para la conversación de venta y para revisar los precios:
- La competencia real es Instagram y WhatsApp Business, que son gratis (y Wabi, gratis para colmados en RD).
- Shopify Starter US$5 y Basic US$25; Tiendanube desde unos US$6 (México y Colombia); Take App Business US$50. Todas son «hazlo tú mismo».
- Netflix en RD: US$4.99, 7.99 y 10.99. No se iguala su precio: cobra poco porque no hace nada a mano por cada cliente.
- Frases de venta, solo en conversación y en la hoja de planes (en los anuncios no se habla de dinero): «se paga con una venta al mes» y «menos de RD$60 al día».


## Permisos de colaboradores (propuesta de Lewis, 7 oct 2026)

**Hoy:** `miembros.rol` solo tiene `dueno` y `staff`, y las funciones de la base (por ejemplo `pedir_retoque`) solo comprueban que la persona sea miembro de la tienda. Un colaborador puede gastar créditos y editar Mi marca. No hay colaboradores reales todavía (Lewis y Michel son dueños), así que no es un riesgo actual.

**Decisión:** el dueño decide qué puede hacer cada colaborador, y lo exige la base (no solo la pantalla). Niveles listos para elegir al invitar y cambiables después; por defecto el más bajo:
- **Ayudante:** pedidos, clientes y promos.
- **Editor:** lo anterior más productos y catálogo.
- **Administrador:** lo anterior más créditos, retoque, compras y Mi marca.

**Ya construido** (7 oct 2026, `docs/prompts/colaboradores-e-invitaciones.md`, PR abierto; lo mergea Planning): los tres niveles los exige la base, «Tu equipo» en el menú, enlaces de un solo uso con aprobación de la dueña, invitar por correo con nivel y el enlace de tienda nueva desde el admin. Auditoría: `docs/handoffs/permisos-auditoria.md`. **Queda para suscripciones:** el límite de colaboradores por plan va en `public.puede_sumar_colaborador` (hoy siempre sí; ya lo llaman aprobar, invitar por correo y crear enlace).
