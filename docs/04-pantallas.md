# Pantallas

Spec sacada de los mockups ya validados (el reel animado de Deslizapp
Tienda). Cada pantalla real de este panel debe poder mostrar exactamente estos
casos con datos de prueba.

Navegación inferior de 5 íconos (mobile-first, como Instagram), igual que en
los mockups: **Inicio (Resumen) · Catálogo · Pedidos · Clientes · Promos**. El
ícono activo se expande en píldora verde con su nombre. El encabezado de cada
pantalla muestra: logo de la tienda + nombre + créditos de retoque
disponibles.

**Diseño:** pensado primero para celular (ancho 360–430 px). En computadora,
la app se muestra centrada con un ancho máximo de ~480 px; no hace falta un
diseño de escritorio aparte en esta entrega.

**Pedidos "del catálogo" en esta entrega:** el catálogo público todavía no
está conectado (ver `02-alcance.md`), así que los pedidos con origen
`catalogo` vienen del seed. Para poder demostrar la notificación de pedido
nuevo, agrega un botón discreto **"Simular pedido del catálogo"** (en el menú
de la tienda, junto a "Reiniciar datos de prueba") que crea un pedido de
prueba con productos al azar de la tienda activa.

---

## 1. Catálogo

**Qué muestra:**
- Medidor: "X de Y productos" según `limite_productos` del plan (ej. "10 de 20 productos")
- Barra de progreso del medidor
- Grilla de 2 columnas con tarjetas de producto: foto, contador de ❤ (likes)
- Botón flotante "+ Producto"

**Acciones:**
- Tocar "+ Producto" → abre formulario de producto (crear)
- Tocar una tarjeta → abre formulario de producto (editar)
- Activar/desactivar un producto (no aparece en el catálogo público si está inactivo)

**Formulario de producto (crear/editar):**
- Foto(s) — subir imagen
- Toggle **"Retocar foto"** con subtítulo "Luz, fondo y color" — ver pantalla 6
- Nombre
- Precio
- Categoría (opcional)
- Botón "Publicar" / "Guardar"
- Texto informativo: créditos de retoque disponibles

**Casos vacíos/límite:** si `productos.length >= limite_productos`, el botón
"+ Producto" debe indicar que se llegó al límite del plan (no bloquear la
demo, pero sí mostrar el estado).

---

## 2. Pedidos

**Qué muestra:**
- Pestañas: **Nuevos / Por despachar / Listos** (mapeadas a `estado` — ver `03-modelo-de-datos.md`)
- Lista de pedidos: número de pedido, "hace cuánto", etiqueta de origen ("Del catálogo" / manual), miniaturas de los productos, nombre del cliente, cantidad de productos
- Estado vacío: "Todo al día. Disfruta el silencio. Dura poco." (tono de marca)
- Notificación tipo banner cuando entra un pedido nuevo (mientras se está viendo la pantalla)
- Badge con el número de pedidos nuevos sobre el ícono de "Pedidos" en la navegación

**Acciones:**
- Tocar un pedido → abre el Detalle de pedido
- Botón **"+ Pedido"** para crear un pedido manual (ventas que no llegaron
  por el catálogo): elegir cliente existente o escribir nombre + WhatsApp de
  uno nuevo, elegir productos y cantidades, aplicar código de promo opcional.
  Entra directo en estado `por_despachar`.

---

## 3. Detalle de pedido

**Qué muestra:**
- Número de pedido + estado actual (chip: "Por despachar" / "Despachado")
- Cliente: nombre + "Llegó por el catálogo" (o "Pedido manual")
- Lista de productos del pedido: foto, nombre, cantidad, y estado de stock por ítem (ej. "Queda 1" / "Agotado")
- Código de promo aplicado, si tiene
- Botón **"Despachar pedido"**
- Nota de marca: "el stock se actualiza solito"

**Acciones:**
- Si el pedido está en `nuevo`: el botón principal es **"Confirmar pedido"**
  (ya hablaste con el cliente y va) → pasa a `por_despachar`. También hay una
  opción secundaria "Cancelar pedido" → `cancelado`.
- Si está en `por_despachar`: el botón principal es **"Despachar pedido"**.
- Al presionar "Despachar pedido":
  - `estado` del pedido pasa a `despachado`, se registra `despachado_en`
  - el `stock` de cada producto del pedido se descuenta según `cantidad`
  - si el stock de un producto llega a 0, se refleja como "Agotado" ahí mismo
  - se muestra una confirmación tipo toast: "Despachado. {producto} se agotó." (solo si algo se agotó; si no, un mensaje neutro de éxito)

---

## 4. Clientes

**Qué muestra:**
- 3 contadores: total de clientes, cuántos "repiten" (`pedidos_count >= 2`), cuántos son nuevos/del catálogo
- Lista de clientes: iniciales/avatar, nombre, cantidad de pedidos, etiqueta "Repite" si aplica
- Caso "todavía no ha pedido": se muestra igual en la lista con nota tipo "Todavía no pide"

**Acciones:**
- Tocar un cliente → ver su historial de pedidos (puede ser una vista simple, lista de sus `pedidos`)

**De dónde salen los clientes:** se crean automáticamente cuando llega un
pedido del catálogo con datos de contacto, o manualmente desde el panel.

---

## 5. Promos

**Qué muestra:**
- Pestañas: **Activas / Programadas / Terminadas** (derivadas de `estado`)
- Tarjetas de promo según `tipo`:
  - **Por colección**: nombre de la promo, colección afectada, rango de fechas, % de descuento
  - **Código**: nombre, "En todo el pedido", % de descuento, el código en formato destacado (ej. recuadro punteado con "AAAH10")
  - **Por producto**: la promo se refleja directo en la tarjeta del producto (foto + nombre + precio tachado + "−15%")

**Acciones:**
- Crear promo nueva: elegir tipo (código / colección / producto), valor, fechas de inicio y fin
- Al llegar `fecha_fin`, la promo pasa a `terminada` (puede ser automático por fecha, o manual)

---

## 6. Retoque de fotos con IA

No es una pantalla propia — vive dentro del formulario de producto (pantalla 1).

**Comportamiento:**
- Toggle "Retocar foto" (apagado por defecto)
- Al activarlo: simular el retoque (en esta entrega, sin IA real — puede ser
  un efecto visual de "antes/después" con la misma imagen, o un placeholder
  que marque `foto_retocada = true`)
- Costo por retoque: constante en `lib/config.ts` (por defecto 1 crédito por
  foto — ver "Decisiones pendientes" en `03-modelo-de-datos.md`). No es
  editable por el dueño en esta entrega.
- Descuenta de `tiendas.creditos_retoque`; si no hay créditos suficientes, el
  toggle se bloquea con un mensaje breve (tono de marca, no un error técnico)
- Al publicar el producto con el toggle activo, la tarjeta del producto en el
  Catálogo puede mostrar un pequeño indicador "Retocada ✦"

---

## 7. Resumen (pantalla de inicio)

**Qué muestra:**
- Saludo: "Buenos días, {nombre de la tienda o dueño}."
- Subtítulo: "Así va tu tienda estos 7 días"
- Tarjeta principal: "Aaahs · 7 días" con el número grande + variación (ej. "+18%") + mini gráfico de barras de los últimos 7 días
- Dos datos secundarios: "Pedidos" (count) y "De aaah a pedido" (conversión, %)
- "Lo que más suspiran" — top 3 productos con foto

**Esta pantalla es de solo lectura** — no tiene acciones, solo consulta datos
agregados (ver la sección "Resumen" en `03-modelo-de-datos.md`).

---

## Estados vacíos y de error — regla general

Todos los estados vacíos deben llevar el tono de marca (ver `01-marca.md`),
nunca un mensaje técnico genérico tipo "No hay datos". Ejemplo ya validado:
Pedidos vacío → "Todo al día. Disfruta el silencio. Dura poco."

Si hace falta un estado vacío que no está en los mockups (ej. Clientes vacío,
Promos vacío), se escribe en el mismo tono — no se deja el texto por defecto
de un framework de UI.
