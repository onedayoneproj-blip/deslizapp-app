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
- **Pegadas a los bordes:** izquierdo, derecho e inferior, con **solo las
  esquinas de arriba redondeadas** (30 px, igual en todos los modelos y en
  todas las alturas: pasar de media a grande solo cambia la altura). El fondo
  de la hoja llega al borde físico de abajo (incluido el safe area); el
  relleno inferior del contenido es `max(1.75rem, safe area + 1rem)`. En
  pantallas anchas (> 480 px) va centrada con su ancho máximo, pegada abajo.
  El modo "flotante" de iOS 26 (margen alrededor y cuatro esquinas) se probó y
  se **descartó**.
- **Altura máxima:** el borde de arriba queda debajo de la barra de estado, a
  `safe area de arriba + 10 px` del borde de la pantalla (mínimo 20 px sin
  safe area; 24 px en escritorio). Altura máxima = `100dvh` menos ese valor
  (variable `--hoja-tope` en `app/globals.css`). Vale para toda hoja larga,
  `"expandible"` o `"grande"`; arriba sigue viéndose el fondo oscuro.
- **Cabecera fija** (tirador + título + X) superpuesta, con fondo
  transparente: el contenido ocupa toda la hoja y pasa por detrás de ella al
  desplazarse. **Borde de desplazamiento** (como iOS): bajo la cabecera hay 4
  capas de desenfoque progresivo (1, 2, 4 y 8 px, el mayor arriba) más un
  degradado Papel Cálido, muy opaco arriba y transparente abajo; alto =
  cabecera + 16 px. Es invisible con el contenido arriba del todo y aparece
  en los primeros 24 px de scroll. Sin `backdrop-filter`: solo el degradado.
  Con "reducir transparencia": fondo sólido con una línea.
- **Zona fija de arriba = una sola zona:** si una hoja necesita algo fijo bajo
  el título (buscador, pastillas), va DENTRO de la cabecera (`<HojaFijoArriba>`
  o la prop `fijoArriba` de `Hoja`). El desenfoque cubre toda la zona (su alto
  sale del alto real, medido) y se desvanece justo debajo de su último elemento;
  el contenido empieza debajo de toda la zona. Nada de `sticky` aparte.
- **Zona fija de abajo** (`<HojaFijoAbajo>`): p. ej. la píldora de resumen del
  selector de productos (verde bosque, "2 productos" + total en Fredoka y
  "Listo" Mandarina). El contenido suma su alto al relleno inferior, y se oculta
  mientras el teclado está abierto (vuelve al cerrarlo).
- **Se cierran deslizando hacia abajo** (más de ~30 % o con velocidad), además
  de con la X, Escape o tocando el fondo. El arrastre solo mueve la hoja si el
  contenido está arriba del todo o si el gesto empieza en la cabecera.
- **Altura** (propiedad `altura`): `"auto"` se ajusta al contenido (Tus
  tiendas, Tu plan); `"expandible"` abre a ~60 % y pasa a la altura máxima
  (para contenido largo, ej. detalle de pedido); `"grande"` abre a la altura
  máxima (formularios largos: producto, nueva promo, pedido manual).
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
- Estado vacío: sin productos → "Tu vitrina está vacía." + botón "Publicar mi
  primer producto"; búsqueda o filtro sin resultados (ilustración chica) →
  "No encontramos nada con eso." / "Ni un suspiro. Prueba con otra palabra u
  otro filtro."
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
- Estado vacío por pestaña: Nuevos "Todo al día. Disfruta el silencio. Dura
  poco."; Por despachar "Nada por despachar."; Despachados "Aún no hay
  despachos."; sin ningún pedido "Aún no tienes pedidos. Cuando alguien pida por
  tu catálogo, aparece aquí."
- Aviso (toast) cuando entra un pedido nuevo mientras se está viendo la pantalla.
- Contador de pedidos nuevos sobre el ícono de "Pedidos" en la barra.

**Acciones:**
- Tocar un pedido → Detalle de pedido.
- Botón **"+ Pedido"** para crear un pedido manual (ventas que no llegaron
  por el catálogo): elegir cliente, elegir productos y cantidades, aplicar
  código de promo opcional ("¿Usó un código?"). Entra directo en estado
  `por_despachar` ("Pedido #1043 guardado. Está en Por despachar.").
- **Elegir cliente** (no es un desplegable): el campo "Cliente" abre, dentro de
  la misma hoja, un buscador ("Busca o crea un cliente") con botón de volver.
  Sin texto, la primera fila es siempre "+ Nuevo cliente" y debajo "Recientes"
  (máx. 8, por último pedido). Al escribir filtra por nombre (sin acentos ni
  mayúsculas), por teléfono (ignora espacios, guiones, paréntesis y el prefijo
  1 / +1) y por nota, resaltando en negrita lo que coincide; muestra la nota si
  coincidió por ella. Con texto, la fila de acción pasa a "+ Crear «texto»":
  arriba si no hay coincidencias, al final si las hay (así se puede crear otra
  "Ana" aunque exista "Ana Lucía"). Abre el formulario (nombre, WhatsApp, nota
  opcional) prellenado con lo escrito (WhatsApp si parece número, nombre si no).
  Los duplicados se evitan por **teléfono**, no por nombre: si el número ya es
  de alguien de la tienda, muestra "Este número ya es de «Nombre»" y "Usar ese
  cliente". El elegido se ve como tarjeta con "Cambiar". La misma búsqueda (`lib/buscar-clientes.ts`)
  se usa en la pantalla Clientes. "+ Cliente" (pantalla Clientes) aplica el mismo
  criterio de duplicados.
- **Pedido sin productos:** en vez de una zona en blanco, una invitación tocable
  (toda el área): ilustración de pedidos (~110 px), "Tu pedido está vacío",
  "Agrega los productos que va a llevar tu cliente." y botón Mandarina "+ Agregar
  productos". Al agregar el primero aparece la lista y "+ Agregar más productos";
  si se quitan todos, vuelve. "Guardar pedido" queda desactivado con una ayuda
  breve ("Agrega al menos un producto" / "Elige un cliente"), sin error rojo.
- **Elegir productos** (misma mecánica, dentro de la hoja): botón "Agregar
  productos" → buscador "Busca un producto" (nombre o colección, sin acentos ni
  mayúsculas, con la coincidencia resaltada) y pastillas de colección. Sin texto:
  los más vendidos (unidades en pedidos no cancelados) primero, luego por nombre.
  Cada fila: miniatura, nombre, precio (con el de lista tachado si hay promo) y
  stock, con − cantidad + (la cantidad nunca supera el stock). Agotados y
  ocultos van atenuados, con su etiqueta y sin poder agregarse (los agotados
  después de los disponibles; los ocultos, al final). Arriba, fijo: "3
  productos · RD$2,450" y "Listo", que vuelve al formulario, donde se siguen
  ajustando cantidades o quitando productos.

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
- 3 contadores: total de clientes, cuántos "repiten" (2 o más pedidos),
  cuántos son del catálogo (`origen = 'catalogo'`).
- Lista: iniciales en círculo, nombre, etiqueta "Repite" si aplica, y "2
  pedidos · RD$3,721" (total gastado en pedidos no cancelados).
- **Todo se deriva de los pedidos** de la tienda activa (no se marca a mano):
  número de pedidos, total gastado y última compra cuentan solo los pedidos
  **no cancelados** (los nuevos y por despachar cuentan; los cancelados no).
  "Repite" aparece sola con 2 o más pedidos y se actualiza al crear un pedido.
- El buscador filtra por nombre (sin importar tildes) o por WhatsApp (por dígitos).
- Cliente sin pedidos: "Todavía no pide. Todavía."
- Búsqueda sin resultados: "Nadie con ese nombre. Todavía."

**Acciones:**
- Tocar un cliente → hoja con su WhatsApp ("Escribir"), pedidos, total gastado,
  última compra e historial; tocar un pedido del historial abre su detalle.
- **Nota** (opcional, máx. 200 caracteres: "Talla M", "Prefiere entrega en la
  tarde"): se ve y se edita en la hoja del cliente, y se escribe al crear el
  cliente. La búsqueda también la encuentra.
- "+ Cliente": nombre + WhatsApp ("Nombre y WhatsApp. Con eso basta.") y nota. El
  WhatsApp debe ser dominicano (809, 829 o 849 + 7 dígitos; se guarda como
  `+1809…`). Si ya hay un cliente con ese WhatsApp en la tienda, avisa y no lo
  duplica. Un pedido manual con un WhatsApp que ya existe usa a ese cliente.

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

**Tarjetas de la lista: estilo cupón** (opción C,
`referencias/promos-cupon/opcion-c-ticket-verde.dc.html`, **manda sobre el
prototipo**): 148 px de alto, verde bosque con talón de 116 px (el % en Fredoka
Mandarina y "DE DESCUENTO"), perforación punteada y muescas recortadas con máscara
CSS (la sombra va en un contenedor con `drop-shadow` para seguir la forma). Las
de código muestran el código en caja punteada; las terminadas van en crema
apagado (#E4DDCC, "TERMINADA"); las programadas, en verde con "PROGRAMADA" y
"Empieza en N días" si faltan menos de 7. Un solo componente
(`components/promos/tarjeta-promo.tsx`), también usado en la vista previa de
"Nueva promo".

**Compartir promo** (`components/promos/hoja-compartir.tsx`, ruta
`/promos/[id]/compartir`): botón "Compartir esta promo" en el detalle de cada
promo activa o programada (las terminadas no) y, al crear una promo, el aviso
"¡Lista! ¿La compartes ahora?" con "Compartir" / "Después". La hoja (grande, por
el campo de texto) muestra la tarjeta de cupón y:
1. **Compartir…** (Mandarina; Web Share API con la imagen PNG y el texto; si no se
   pueden compartir archivos, solo texto y enlace; sin `navigator.share` se oculta).
2. **Mensaje** editable + **Copiar texto**; **Copiar enlace**
   (`URL_CATALOGO_PUBLICO/{slug}?promo=CODIGO` · `?coleccion=` · `?producto=`; la
   base está en `lib/config.ts`); **Copiar imagen** (si el navegador deja) y
   **Guardar imagen**; **Enviar por WhatsApp** (`wa.me/?text=`, sin número).
- Plantillas por tipo en `lib/mensajes-promo.ts` (código, colección, producto; con
  o sin fecha de fin; programada: "desde/del … al …").
- Imagen 1080×1350 dibujada en un canvas (`lib/imagen-promo.ts`, tipografías de
  marca ya cargadas, logo o iniciales de la tienda, "Hecho con Deslizapp"); se
  genera al abrir la hoja y queda en memoria, para que las acciones se ejecuten
  directo dentro del toque. Pesa < 400 KB (si el PNG pasara, JPEG).

**Cómo quedó construida (`components/promos/`):**
- El estado de cada promo se calcula (`lib/promos.ts`): terminada guardada por el
  dueño → Terminadas; si no, por fechas. Nada se mueve de pestaña a mano.
- "Usada en N pedidos" cuenta los pedidos no cancelados con ese código **hechos
  mientras la promo corría** (así un código repetido en una promo vieja y una
  nueva no cuenta dos veces los mismos pedidos).
- Validaciones: nombre; descuento entero de 1 a 90 ("Más de 90% ya es regalar.
  Bájale un poco."); código de 3 a 12 letras/números en mayúsculas y sin
  espacios, sin repetir el de otra promo **activa o programada** de la tienda
  (uno terminado se puede reutilizar); colección o producto elegidos con el
  selector con búsqueda; vence no antes de empezar. Fechas en día de Santo
  Domingo (empieza a las 00:00, vence a las 23:59).
- Vista previa en vivo: "Así se ve en tu catálogo" (precio nuevo, tachado y −N%)
  o, en los códigos, un pedido de ejemplo con el descuento.
- Editar (el tipo no cambia) y "Terminar promo" con confirmación. Una terminada
  no se reactiva ni se edita: se **duplica como nueva** (`/promos/nueva?copiar=id`).
- "+ Pedido" tiene el campo "Código de promo": si está activo aplica el % al
  total y guarda `codigo_promo`; si no, avisa. El detalle del pedido muestra el
  descuento y "Simular pedido del catálogo" usa los precios con promo vigente.

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

**Ilustraciones** (`components/estado-vacio.tsx`, archivos en
`public/ilustraciones/*.webp`, originales en `referencias/ilustraciones/`): cada
sección tiene la suya (`pedidos`, `catalogo`, `clientes`, `promos`, `inicio`).
Van centradas, ~210 px de ancho (~120 px en búsquedas o filtros sin resultados),
sin marco ni sombra, decorativas (`alt=""`) y **sin animación**. Debajo: título en
Fredoka, texto en Figtree y, si aplica, un botón Mandarina. Estas ilustraciones
**mandan sobre el prototipo**, que usa otras. Si se agrega una nueva, se reduce a
600 px de ancho, se limpia el borde y se guarda como WebP (< 60 KB).

Si hace falta un estado vacío que no está en el prototipo, se escribe en el
mismo tono — no se deja el texto por defecto de un framework de UI.
