# Fase 2 — Cuentas, verificación y cobros manuales

> **Actualización (5 oct 2026):** la zona `/admin`, los cobros manuales y los créditos por movimientos se concretan y se construyen según `docs/13-admin.md`, que manda sobre este documento donde no coincidan. Los estados de tienda siguen siendo los de la base (`en_prueba`, `activa`, `pausada`, `eliminada`); el estado de cobro se calcula (docs/13 §8). La verificación de Instagram sigue decidida, pero queda para después.

**No se construye en la primera entrega.** Este documento deja escritas las
decisiones ya tomadas por el dueño de Deslizapp (Lewis) para que, cuando
llegue el momento, se construya sin volver a discutirlas. Todo esto necesita
la base de datos real (Supabase), porque el administrador tiene que ver todas
las tiendas desde su propio celular.

Orden sugerido de la fase 2:
1. Supabase (tablas de `03-modelo-de-datos.md`, con RLS por `tienda_id`) y login con Google.
2. Estados de la tienda y verificación de Instagram.
3. Zona `/admin` para el dueño de Deslizapp.
4. Suscripciones, pagos manuales y créditos.
5. Notificaciones de pedido nuevo (requiere la app instalada).

## Estados de la tienda

`pendiente_verificacion` → `activa` → `vencida` (5 días de gracia)
→ `pausada` (el catálogo público deja de mostrarse hasta que se regularice).
Una tienda solo pasa a `activa` cuando está verificada y tiene la suscripción al día.

## Verificación de Instagram (decidido)

Objetivo: que nadie active la tienda de un negocio haciéndose pasar por él.
Instagram no permite que una app envíe mensajes a cuentas cualquiera, así que
el envío del código es **manual**, desde la cuenta oficial @deslizapp:

1. El comerciante inicia sesión con Google y escribe el usuario de Instagram de
   su tienda. La app le pide que siga primero a @deslizapp (así el mensaje no
   cae en "Solicitudes de mensaje") y crea una verificación pendiente.
2. En `/admin` aparece en la cola "Verificaciones pendientes" con el usuario,
   un botón "Abrir Instagram" y un botón "Copiar mensaje" con el código ya escrito
   (ej. "Tu código de deslizapp es 482913. Vence en 24 horas.").
3. Lewis envía ese mensaje desde @deslizapp y marca la verificación como "Enviada".
4. El comerciante escribe el código en la app. Si coincide, la tienda queda verificada.
5. Si no le llega, la app le avisa que revise "Solicitudes de mensaje" y ofrece
   pedir otro código.

Reglas:
- Código de 6 dígitos, de un solo uso, vence a las 24 horas, máximo 5 intentos.
- Un usuario de Instagram solo puede estar vinculado a una tienda activa.
- Cambiar el usuario de Instagram de una tienda obliga a verificar de nuevo.
- Plan B si Instagram bloquea los mensajes por volumen: flujo inverso (el
  comerciante envía el código que muestra la app a @deslizapp). Más adelante
  puede sustituirse por "Iniciar sesión con Instagram" de Meta.
- WhatsApp: verificación opcional. Si se quiere, el comerciante envía un código
  que muestra la app al WhatsApp de Deslizapp (enlace `wa.me` con el texto ya escrito).

Tabla nueva `verificaciones_instagram`: `id`, `tienda_id`, `usuario_instagram`,
`codigo`, `estado` (`pendiente | enviada | verificada | expirada`), `intentos`,
`creado_en`, `expira_en`.

## Zona /admin (solo el dueño de Deslizapp)

Misma app, misma base de datos, ruta aparte. En `usuarios.rol` se agrega el
valor `admin`. El acceso se protege en el servidor **y** con RLS; el diseño
del comerciante nunca muestra enlaces a `/admin`.

Pantallas:
- **Tiendas:** lista con estado, plan, vencimiento y créditos; búsqueda.
- **Detalle de tienda:** plan, historial de pagos, historial de créditos, verificación.
- **Registrar pago:** fecha, monto (RD$), método, referencia, nota; renueva la suscripción.
- **Ajustar créditos:** suma o resta con motivo obligatorio.
- **Verificaciones pendientes:** la cola descrita arriba.

## Cobros manuales (sin pasarela de pago)

No hay pasarela de pago. Los cobros son por depósito o transferencia y los
registra el administrador. El comerciante solo ve su plan, su saldo y el botón
"Escribirle a Deslizapp" (WhatsApp) para renovar, cambiar de plan o pedir créditos.

Tablas nuevas:
- `suscripciones`: `tienda_id`, `plan`, `estado` (`activa | vencida | pausada`), `renovacion_en`, `dias_gracia` (por defecto 5).
- `pagos`: `id`, `tienda_id`, `monto`, `concepto` (`suscripcion | creditos`), `metodo` (`deposito | transferencia | efectivo`), `referencia`, `nota`, `comprobante_url`, `estado` (`por_revisar | confirmado | rechazado`), `recibido_en`, `registrado_por`.
- `movimientos_creditos`: `id`, `tienda_id`, `bolsa` (`mensual | comprado`), `tipo` (`recarga_mensual | compra | uso_retoque | vencimiento | ajuste`), `cantidad` (positiva o negativa), `motivo`, `pago_id` (opcional), `creado_en`.

El saldo de créditos es la suma de los movimientos de cada bolsa.
`tiendas.creditos_retoque` queda como copia rápida (suma de ambas bolsas) para
el encabezado.

### Dos bolsas de créditos (decidido)

- **Bolsa mensual:** 100 créditos que se recargan en la fecha de renovación. Lo
  que sobra **vence** en la siguiente renovación (se registra un movimiento
  `vencimiento` y se vuelve a 100).
- **Bolsa comprada:** créditos que el dueño de la tienda compra aparte. **No vencen.**
- Al retocar una foto se gastan primero los de la bolsa mensual y luego los comprados.
- El encabezado muestra el total; la pantalla Plan y créditos muestra las dos bolsas por separado.

### Comprobante de pago (decidido)

Se pide foto del comprobante. Flujo:
1. El comerciante toca "Ya pagué" en Plan y créditos, elige concepto (renovar plan
   o comprar créditos), sube la foto del comprobante y escribe la referencia si la tiene.
2. Se crea un pago en estado `por_revisar` y aparece en `/admin`.
3. Lewis compara con el depósito real en su banco y lo marca `confirmado` (renueva
   el plan o suma los créditos comprados) o `rechazado` (con motivo que ve el comerciante).
4. Un pago `por_revisar` **no** renueva nada por sí solo: una foto se puede falsificar.

La foto se guarda en un bucket privado de Supabase Storage: solo la ve el
administrador y la propia tienda. Se comprime antes de subir y se limita su tamaño.
El administrador también puede registrar un pago directamente, sin foto (por ejemplo, efectivo).

**Cambio respecto a la primera entrega:** los 100 créditos mensuales se
recargan en la **fecha de renovación de cada tienda**, no el día 1 de cada mes
(los pagos entran en fechas distintas). La recarga mensual se registra como un
movimiento `recarga_mensual`; los créditos mensuales que sobran no se acumulan.

## Vencimiento y pausa (decidido)

- **Gracia:** 5 días después de la fecha de renovación. Durante la gracia todo
  funciona normal.
- **Avisos al comerciante:** aviso en la app 3 días antes de vencer ("Tu plan
  renueva el 12. Escríbele a Deslizapp"), el día que vence, y cada día de gracia
  con los días que quedan. Todos con el botón "Ya pagué" y "Escribirle a Deslizapp".
- **Tienda pausada:**
  - El **catálogo público** muestra una página amable en tono de marca ("Este
    catálogo está descansando un momentico. Vuelve pronto.") con el enlace al
    Instagram de la tienda. Nunca un error técnico.
  - El **panel del comerciante** sigue abierto en modo de solo lectura: puede
    ver sus pedidos, clientes y productos (hay clientes esperando), pero no crear
    ni editar productos, promos ni pedidos. Arriba, un aviso fijo: "Tu tienda está
    en pausa. Reactívala enviando tu pago" con los botones "Ya pagué" y
    "Escribirle a Deslizapp".
  - **Nunca se borran datos** por una pausa.
- **Reactivación:** en cuanto el administrador confirma el pago, la tienda vuelve
  a `activa` sola y el catálogo público reaparece.
- Un pago confirmado renueva desde la fecha de vencimiento anterior, no desde el día
  del pago, para no regalar ni quitar días.
