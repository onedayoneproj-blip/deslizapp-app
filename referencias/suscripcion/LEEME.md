# Suscripción y paywall: referencias de diseño

Tableros del lienzo «Planes y suscripción de Deslizapp» (Claude Design, 6 oct 2026, aprobado por Lewis). Precios, reglas y fases: `docs/14-precios-y-lanzamiento.md`. Prompt para construirlo: `docs/prompts/suscripcion-tienda.md`.

Muestran **qué va y dónde, con qué textos y tamaños**. **No son código para copiar**: se construye con `components/ui/` y los tokens del panel (docs/09). En `capturas/` está cada tablero como imagen (las letras salen con una fuente de reemplazo; las de verdad son Fredoka, Figtree y Caveat). Los `.dc.html` traen las medidas exactas: ábrelos en un navegador. `ElegirPlan` es interactivo (Mensual o Anual, y elegir plan).

**Datos de ejemplo:** Mora Shoes, los montos del recibo, las cifras de la prueba (14 pedidos, RD$23.4k…) y la lista de pagos son inventados. Los precios de los planes sí son los propuestos (docs/14 §2). Lo que sale entre corchetes (`[BANCO]`, `[NÚMERO DE CUENTA]`, `[PRECIO]`, `[CRÉDITOS]`) son datos que Lewis todavía no da.

| Tablero | Qué muestra |
|---|---|
| `ElegirPlan` | Elegir plan: interruptor Mensual o Anual (2 meses gratis), los tres planes con precio, lo que incluyen y «Recomendado». |
| `Fundadora` | La oferta de tienda fundadora: RD$590 durante 12 meses y 30 días gratis, a cambio de opinión y de poder enseñar su catálogo. |
| `ComoPagar` | Monto a transferir, a dónde, y qué poner en la descripción, con botones de copiar. |
| `YaPague` | Subir la captura de la transferencia y la referencia (opcional). |
| `EnRevision` | «Recibido. Lo estamos revisando.» La tienda sigue andando. |
| `AlDia` | «Al día.» con el recibo (descargar y compartir). |
| `TuPlan` | La hoja «Tu plan» rediseñada: plan y periodo, productos usados, créditos con «Comprar», «Pásate al anual», historial de pagos. |
| `Limite` | Catálogo lleno: subir de plan pagando la diferencia, u ocultar un producto. |
| `Video` | El video es del plan Tienda. |
| `Creditos` | Paquetes de créditos para retocar; los comprados no vencen. |
| `AvisoPrueba` | Inicio con la tarjeta «Tu prueba termina el jueves» y lo que pasó en la prueba. |
| `Pausa` | El panel de una tienda en pausa: aviso fijo con «Ya pagué» y «Cómo pagar», y todo en solo mirar. |
| `CatalogoPausa` | Lo que ve un comprador del catálogo de una tienda en pausa. |

**Estados que no están dibujados** y que Coding resuelve con el sistema de diseño y la voz de la marca (y los muestra en el PR): pago rechazado (con su motivo y «Subir otra captura»), error al subir, plan sin precio («Pregúntanos» con WhatsApp), sin conexión, y el aviso de renovación cuando el plan vence (3 días, el día, y los días de gracia).
