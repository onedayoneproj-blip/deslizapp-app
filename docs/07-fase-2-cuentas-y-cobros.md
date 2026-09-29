# Fase 2 — Cuentas, verificación y cobros manuales

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

`pendiente_verificacion` → `activa` → `vencida` (dentro de los días de gracia)
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
- `suscripciones`: `tienda_id`, `plan`, `estado` (`activa | vencida | pausada`), `renovacion_en`, `dias_gracia`.
- `pagos`: `id`, `tienda_id`, `monto`, `metodo` (`deposito | transferencia | efectivo`), `referencia`, `nota`, `recibido_en`, `registrado_por`.
- `movimientos_creditos`: `id`, `tienda_id`, `tipo` (`recarga_mensual | compra | uso_retoque | ajuste`), `cantidad` (positiva o negativa), `motivo`, `pago_id` (opcional), `creado_en`.

El saldo de créditos es la suma de los movimientos. `tiendas.creditos_retoque`
queda como copia rápida para el encabezado.

**Cambio respecto a la primera entrega:** los 100 créditos mensuales se
recargan en la **fecha de renovación de cada tienda**, no el día 1 de cada mes
(los pagos entran en fechas distintas). La recarga mensual se registra como un
movimiento `recarga_mensual`; los créditos mensuales que sobran no se acumulan.

## Decisiones pendientes (las toma Lewis)

- ¿Los créditos comprados aparte vencen? (El prototipo decía que no; los mensuales sí vencen.)
- ¿Cuántos días de gracia tiene una suscripción vencida antes de pausar el catálogo?
- ¿Qué ve el comerciante cuando su tienda está pausada?
- ¿Se pide comprobante de pago (foto) al comerciante, o solo lo registra el administrador?
