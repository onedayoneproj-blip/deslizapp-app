# Pantallas

Spec de cada pantalla. La **referencia visual principal** es el prototipo
interactivo `referencias/prototipo-interactivo/Main.dc.html` (medidas,
colores, tarjetas y textos). Este documento dice *qué* muestra y hace cada
pantalla y con qué datos; donde el prototipo trae cosas que no entran en esta
entrega (compra de créditos, planes "Básico 40 / Pro 100", descuentos en RD$,
campo "Marca o línea"), manda lo que dice aquí.

## Reglas generales

**Diseño:** pensado primero para celular (ancho 360–430 px). En computadora,
la app se muestra centrada con un ancho máximo de ~480 px; no hace falta un
diseño de escritorio aparte en esta entrega.

**Encabezado** (todas las pantallas, se desplaza con el contenido):
- Izquierda: logo de la tienda en un cuadro redondeado (Rosa Suave si no hay
  logo) + nombre de la tienda + debajo "Plan 20 · deslizapp". Tocarlo abre el
  **menú de la tienda** (selector de tienda activa + acciones de demo).
- Derecha: botón blanco con borde verde "✦ 35 créditos" (créditos de retoque
  disponibles). Tocarlo abre **Plan y créditos** (pantalla 8).

**Navegación inferior** (`components/panel/nav-inferior.tsx`) — **decisión del
dueño que manda sobre el prototipo**: barra de pestañas tradicional, inspirada
en la de iOS 26 pero **sólida** (fondo blanco, borde de 1 px y sombra suave; sin
vidrio transparente ni desenfoque). La barra es una **cápsula completa** que
flota cerca del borde inferior (~10 px; ~18 px en iPhone). Cinco pestañas del
mismo ancho, **Inicio (Resumen) · Catálogo · Pedidos · Clientes · Promos**, con
el ícono arriba y el **nombre siempre visible debajo** en todas (≥ 11 px). La
activa va en Verde Bosque sobre un **selector Rosa Suave en cápsula de ancho
variable**: mide el contenido de la pestaña (ícono o nombre, lo más ancho) +
~14 px por lado. Las inactivas van en verde grisáceo tenue.
- **Toque:** navega al instante; el selector se desliza y cambia de ancho con
  un resorte corto.
- **Arrastre con imán:** al arrastrar el dedo por la barra, el selector se
  estira hacia el dedo con resistencia (máx. ~28 % de una pestaña) sin dejar su
  pestaña; cuando el dedo entra más de la mitad en la vecina, **salta** a ella
  con el resorte (y vibra leve si el equipo lo admite). La pestaña cubierta se
  resalta en vivo; la pantalla solo cambia al soltar. Nunca se sale de la
  cápsula (6 px del borde, siguiendo su curva).
- Con "reducir movimiento": sin resorte ni estiramiento, cambio directo.
Cada pestaña es un enlace real (`aria-current="page"` en la activa). Sobre
"Pedidos", un contador Mandarina con el número de pedidos `nuevo`.
El prototipo (ícono activo expandido en píldora verde con su nombre al lado)
**ya no aplica**: no volver a ese diseño ni a un selector de ancho fijo.

**Botón flotante** (Mandarina, abajo a la derecha, encima de la barra): "+
Producto" en Catálogo, "+ Pedido" en Pedidos, "+ Cliente" en Clientes, "+
Promo" en Promos.

**Hojas inferiores** (`components/hoja.tsx`, todas usan ese componente) —
**su comportamiento manda sobre el prototipo**: los formularios y detalles
(producto, detalle de pedido, pedido manual, cliente, nueva promo, Plan y
créditos) suben desde abajo con fondo verde translúcido, título en Fredoka y
botón de cerrar redondo. Además:
- **Flotan o se pegan, como en iOS 26:** las hojas cortas (`"auto"`) y las de
  media altura **flotan**: quedan separadas ~8 px de los lados y de abajo
  (abajo: `max(8px, safe area − 24px)`) y tienen las **cuatro esquinas
  redondeadas** (arriba ~30 px; abajo 32 px, que acompañan la curva de la
  pantalla del iPhone: ~40 px menos el margen). Al pasar a la altura grande
  (por scroll o arrastre) **se pegan a los bordes**: margen 0, esquinas de
  abajo 0 y las de arriba bajan un poco. La transición va ligada al dedo
  (margen y radios se interpolan), no de golpe. Las hojas `"grande"`
  (Nuevo/Editar producto) van pegadas desde el inicio. En pantallas anchas la
  hoja flotante queda centrada con su ancho máximo.
- **Cabecera fija** (tirador + título + X): solo se desplaza el contenido; una
  línea sutil aparece bajo la cabecera cuando el contenido está desplazado.
- **Se cierran deslizando hacia abajo** (más de ~30 % o con velocidad), además
  de con la X, Escape o tocando el fondo. El arrastre solo mueve la hoja si el
  contenido está arriba del todo o si el gesto empieza en la cabecera.
- **Altura** (propiedad `altura`): `"auto"` se ajusta al contenido (Tus
  tiendas, Tu plan); `"expandible"` abre a ~60 % y pasa a ~93 % (para
  contenido largo, ej. detalle de pedido); `"grande"` abre a ~93 % (formularios
  largos: producto, nueva promo, pedido manual).
- Al enfocar un campo, la hoja pasa a grande y el campo queda visible sobre el
  teclado.
En código pueden ser rutas propias (`/catalogo/nuevo`, `/pedidos/[id]`…) con
ese aspecto: así tienen URL.

**Avisos (toast):** bajan desde arriba, píldora Verde Bosque con un check en
círculo Mandarina. Textos cortos en tono de marca ("Publicado. Ya se está
deslizando.", "Despachado. El stock ya se enteró.").

**Pedidos "del catálogo" en esta entrega:** el catálogo público todavía no
está conectado (ver `02-alcance.md`), así que los pedidos con origen
`catalogo` vienen del seed. Para demostrar la llegada de un pedido nuevo, en
el menú de la tienda hay un botón discreto **"Simular pedido del catálogo"**
(junto a "Reiniciar datos de prueba") que crea un pedido `nuevo` con
productos al azar de la tienda activa (al precio con promo vigente).

**Números en pantalla:** montos como `RD$2,500`; fechas en hora de Santo
Domingo con formato corto ("Hace 8 min", "Ayer, 6:12 p. m.", "Jue, 4:05 p.
m."). Las cifras grandes de las tarjetas de estadísticas van en Fredoka (como
en el prototipo); precios de producto, cantidades y nombres, en Figtree.

---

## 1. Catálogo

**Qué muestra:**
- Titular "Tu catálogo" + "Lo que tus clientes deslizan. Tú solo lo mantienes bonito."
- **Medidor del plan** (tarjeta Rosa Suave, abre Plan y créditos): "10 de 20
  productos" + "Ver plan", barra de progreso y "Plan 20 · te quedan 10
  espacios". Si `productos.length >= limite_productos`, la tarjeta pasa a
  Mandarina: "Catálogo lleno: 20 de 20" · "Subir de plan" · "Lleno… de éxito.
  Para agregar más, sube de plan."
- **Buscador** "Busca un producto" (filtra por nombre).
- **Filtros** en chips con contador: Todos · Visibles (activos con stock) ·
  Agotados (`stock = 0`) · Ocultos (`activo = false`).
- **Grilla de 2 columnas**. Cada tarjeta: foto 4:5 con esquinas redondeadas;
  arriba a la izquierda una etiqueta ("Agotado" verde, "Oculto" papel, o el
  descuento "−15%" en Mandarina si tiene promo activa); abajo a la derecha
  "♥ 57" (likes). Debajo: nombre, precio (con el de lista tachado si hay
  promo), y "3 en stock" / "Sin stock" / "Sin control de stock". Los ocultos
  se ven atenuados y los agotados en escala de grises.
- Estado vacío (búsqueda o filtro sin resultados): "Nada por aquí." / "Ni un
  suspiro. Prueba con otro filtro."
- Botón flotante "+ Producto".

**Acciones:**
- Tocar "+ Producto" → formulario de producto (crear).
- Tocar una tarjeta → formulario de producto (editar).
- Activar/desactivar (interruptor "Visible en el catálogo" del formulario).

**Formulario de producto (crear/editar)** — hoja "Nuevo producto" / "Editar producto":
- Foto: recuadro punteado "Sube la foto del celular" (+ "nosotros le ponemos
  la luz" en Caveat). La foto se guarda reducida (máx. 800 px, JPEG). La foto
  es obligatoria para publicar.
- Tarjeta **"Retocar foto"** con subtítulo "Luz, fondo y color" — ver pantalla 6.
- Nombre (ej. "Kiara Pink").
- Precio (RD$).
- **En stock**: contador − / + ("Al despachar, baja solito."). Opción de no
  controlar stock (`stock = null`).
- **Colección** (`categoria`, opcional): chips con las colecciones que ya usa
  la tienda + opción de escribir una nueva.
- Interruptor **"Visible en el catálogo"** ("Apágalo para esconderlo sin borrarlo.").
- Botón principal "Publicar" (crear) / "Guardar cambios" (editar). Si el
  retoque está activo: "Publicar · −5 créditos".
- Validación con tono de marca: "Ponle nombre y precio. Lo demás lo hacemos
  nosotros." / "Falta la foto. El producto es la estrella."

**Límite del plan:** si el catálogo está lleno, el botón "+ Producto" y el
medidor lo indican, pero la demo no se bloquea.

No hay "Marca o línea" ni "Eliminar producto" en esta entrega (esconderlo
con "Visible" cumple esa función sin romper el historial de pedidos).

---

## 2. Pedidos

**Qué muestra:**
- Titular "Pedidos" + "Del suspiro al chat. Y del chat, aquí."
- Pestañas con contador: **Nuevos · Por despachar · Despachados**
  (mapeadas a `estado` — ver `03-modelo-de-datos.md`; los `cancelado` no
  tienen pestaña).
- Tarjeta de pedido: "#1042 · Hace 8 min", etiqueta de origen ("Del
  catálogo" / "Manual"), nombre del cliente, cantidad de productos,
  miniaturas de los productos y total.
- Estado vacío: "Todo al día. Disfruta el silencio. Dura poco."
- Aviso (toast) cuando entra un pedido nuevo mientras se está viendo la pantalla.
- Contador de pedidos nuevos sobre el ícono de "Pedidos" en la barra.

**Acciones:**
- Tocar un pedido → Detalle de pedido.
- Botón **"+ Pedido"** para crear un pedido manual (ventas que no llegaron
  por el catálogo): elegir cliente existente o escribir nombre + WhatsApp de
  uno nuevo, elegir productos y cantidades, aplicar código de promo opcional
  ("¿Usó un código?"). Entra directo en estado `por_despachar` ("Pedido #1043
  guardado. Está en Por despachar.").

---

## 3. Detalle de pedido

**Qué muestra** (hoja inferior):
- Fecha y origen ("Ayer, 6:12 p. m. · manual"), "Pedido #1040" + chip de
  estado ("Nuevo" Mandarina, "Por despachar" Rosa, "Despachado" Verde,
  "Cancelado" arena).
- **Línea de avance**: Recibido → Confirmado → Despachado (3 tramos que se
  pintan de verde según el estado).
- Cliente: iniciales, nombre, teléfono y botón **"Escribir"** (abre WhatsApp
  con ese número). "Llegó por el catálogo" / "Pedido manual".
- Productos: foto, nombre, "cantidad × precio unitario" y estado de stock
  por ítem ("Quedan 3" / "Queda 1" / "Sin stock"; "Entregado" si ya se despachó).
- Subtotal, descuento del código de promo (si tiene) y Total.
- Nota de marca en Caveat: "al despachar, el stock se actualiza solito".

**Acciones:**
- Si el pedido está en `nuevo`: botón principal **"Confirmar pedido"** (ya
  hablaste con el cliente y va) → pasa a `por_despachar`. Opción secundaria
  "Cancelar pedido" → `cancelado`.
- Si está en `por_despachar`: botón principal Mandarina **"Despachar pedido"**.
- Al presionar "Despachar pedido":
  - `estado` pasa a `despachado`, se registra `despachado_en`
  - el `stock` de cada producto del pedido se descuenta según `cantidad`
  - si el stock de un producto llega a 0, se refleja como "Agotado" ahí mismo
  - aviso: "Despachado. {producto} se agotó y ya sale así en el catálogo." (si
    algo se agotó) o "Despachado. El stock ya se enteró."
  - si algún producto no tiene stock suficiente, no despacha y avisa: "No
    alcanza el stock de {producto}."

---

## 4. Clientes

**Qué muestra:**
- Titular "Clientes" + "Los que ya dijeron aaah. Y los que están por decirlo."
- Buscador "Busca un cliente".
- 3 contadores: total de clientes, cuántos "repiten" (`pedidos_count >= 2`),
  cuántos son del catálogo (`origen = 'catalogo'`).
- Lista: iniciales en círculo, nombre, etiqueta "Repite" si aplica, y "2
  pedidos · RD$3,721" (total gastado en pedidos no cancelados).
- Cliente sin pedidos: "Todavía no pide. Todavía."
- Búsqueda sin resultados: "Nadie con ese nombre. Todavía."

**Acciones:**
- Tocar un cliente → hoja con su WhatsApp ("Escribir") e historial de pedidos.
- "+ Cliente": nombre + WhatsApp ("Nombre y WhatsApp. Con eso basta.").

**De dónde salen los clientes:** se crean automáticamente cuando llega un
pedido del catálogo con datos de contacto, o manualmente desde el panel.

---

## 5. Promos

**Qué muestra:**
- Titular "Promos" + "Ponle un descuento y mira cómo se deslizan."
- Pestañas con contador: **Activas · Programadas · Terminadas** (el estado se
  calcula por fechas — ver `03-modelo-de-datos.md`).
- Tarjetas según `tipo`:
  - **Por colección**: "POR COLECCIÓN", nombre, "Colección Dulces", "15%",
    rango de fechas ("25 sep → 2 oct").
  - **Código**: "CÓDIGO", el código, "En todo el pedido", "10%", el código en
    recuadro punteado, rango de fechas y **"Usada en 7 pedidos"** (pedidos
    no cancelados con ese `codigo_promo`).
  - **Por producto**: foto + nombre + precio tachado + "−15%".

**Acciones — "+ Promo"** (hoja "Nueva promo"):
- Tipo: **En productos** (precio tachado en uno) · **Código** (lo escriben al
  pedir) · **Por colección** (toda una colección).
- Descuento en **%** (chips rápidos 10 / 15 / 20 / 30 o valor libre; más de
  90% no: "Más de 90% ya es regalar. Bájale un poco."). No hay descuento en RD$.
- Según el tipo: elegir colección (chips con cuántos productos tiene), elegir
  producto, o escribir el código (mayúsculas y números, máx. 12).
- Fechas: Empieza / Vence.
- Vista previa "así se ve en tu catálogo:" con una tarjeta de producto.
- "Crear promo" → "Promo activa. Ya se ve en tu catálogo." o "Promo
  programada. Arranca el 3 oct."
- Al llegar `fecha_fin`, la promo pasa sola a Terminadas.

---

## 6. Retoque de fotos con IA

No es una pantalla propia — vive dentro del formulario de producto (pantalla 1).

**Comportamiento:**
- Tarjeta "Retocar foto" · "Luz, fondo y color" con interruptor (apagado por
  defecto al editar; encendido por defecto al subir una foto nueva si hay
  créditos).
- Al activarlo: simular el retoque (sin IA real en esta entrega): se aplica
  a la foto un ajuste de luz, contraste y color (`retocarFoto` en
  `lib/imagen.ts`), con selector **Antes / Después** sobre la foto y etiqueta
  "Retocada ✦"; al guardar se guarda la versión retocada y se marca
  `foto_retocada = true`. Al editar un producto ya retocado, la foto dice "Ya
  está retocada" y la tarjeta ofrece "Retocar otra vez" (cobra de nuevo).
- Costo: **5 créditos por foto**, constante en `lib/config.ts` (ver
  "Créditos de retoque" en `03-modelo-de-datos.md`). El subtítulo lo dice:
  "Usa 5 créditos: te quedan 35 → 30."
- Descuenta de `tiendas.creditos_retoque` al publicar/guardar (el botón dice
  "Publicar · −5 créditos").
- Sin créditos suficientes: el interruptor se bloquea con un mensaje breve de
  marca (ej. "Te faltan créditos para retocar. Se recargan el día 1.") y un
  botón "Ver plan" que abre Plan y créditos. **No hay compra de créditos.**
- En el Catálogo, la tarjeta del producto puede mostrar "Retocada ✦".

---

## 7. Resumen (pantalla de inicio)

**Qué muestra:**
- Saludo: "Buenos días, {nombre del dueño}." (con el punto en Mandarina;
  "Buenas tardes/noches" según la hora de Santo Domingo).
- Remate: "Esta semana tu tienda sacó 312 aaahs. Nada mal para un {día}."
- **Tarjeta de pedidos nuevos** (Mandarina, solo si hay): número en cuadro
  verde, "2 pedidos nuevos" / "Alguien dijo aaah. No lo dejes en visto." →
  lleva a Pedidos.
- **Selector de periodo**: Hoy · 7 días · Este mes.
- **Tarjeta de ventas** (Verde Bosque): "VENTAS · 7 DÍAS", monto grande,
  variación ("+18%") y contra qué se compara ("vs. la semana pasada" / "vs.
  el lunes pasado" / "vs. agosto"), y un **gráfico de barras** tocable:
  - Hoy: barras por franja de 2 horas.
  - 7 días: una barra por día (la de hoy en Mandarina).
  - Este mes: una barra por semana.
  - Encima del gráfico, el valor de la barra elegida ("Hoy: RD$5,370").
- 4 datos del periodo: **Pedidos**, **Ticket promedio** (ventas / pedidos),
  **Aaahs** (tarjeta rosa) y **De aaah a pedido** (pedidos / aaahs, en %).
- **"Lo que más suspiran"** (+ "tu top 3" en Caveat): top 3 productos por
  aaahs del periodo, con foto, número y barra proporcional.
- **"Ojo con el stock"**: productos con `stock <= 1` ("Queda 1" Mandarina /
  "Agotado" verde); tocar uno abre su formulario.
- **Tarjeta del plan** (rosa, abre Plan y créditos): "Plan 20", "10 de 20
  productos", barra, "35 créditos · te alcanzan para 7 fotos retocadas".
- Cierre en Caveat: "tu pulgar tiene buen gusto. déjalo trabajar."

**Esta pantalla es de solo lectura** — solo consulta datos agregados (ver
"Resumen" en `03-modelo-de-datos.md`).

---

## 8. Plan y créditos

Hoja "Tu plan", se abre desde el botón de créditos del encabezado, el medidor
del Catálogo y la tarjeta del plan del Resumen. **Solo informa**: en esta
entrega no hay compra de paquetes ni cobro (ver `02-alcance.md`).

- Tarjeta Verde Bosque: nombre del plan ("Plan 20"), "10 de 20 productos",
  barra y "Te quedan 10 espacios. Los cambios de precio, stock y textos son
  ilimitados." (o "Catálogo lleno…" si no quedan).
- Tarjeta de créditos: "35 créditos", "Te alcanzan para 7 fotos retocadas" y
  "Cada foto retocada usa 5 créditos. El día 1 de cada mes vuelves a tener
  100; los que no uses no se acumulan."
- Tarjeta rosa "¿Se te quedó chiquito?" + botón **"Escribirle a Deslizapp"**
  que abre WhatsApp con un mensaje listo (tienda y plan) para cambiar de plan
  o pedir más créditos. El número está en `WHATSAPP_DESLIZAPP` de
  `lib/config.ts`.

---

## Estados vacíos y de error — regla general

Todos los estados vacíos deben llevar el tono de marca (ver `01-marca.md`),
nunca un mensaje técnico genérico tipo "No hay datos". Ejemplo ya validado:
Pedidos vacío → "Todo al día. Disfruta el silencio. Dura poco."

Si hace falta un estado vacío que no está en el prototipo, se escribe en el
mismo tono — no se deja el texto por defecto de un framework de UI.
