# Catálogo conectado: preparación

Especificación del proyecto que conecta el catálogo público con la app. Decidida con Lewis el 3 oct 2026. Es la fuente para los tableros de diseño y para los prompts de Coding; si algo aquí cambia, se cambia aquí primero.

## 0. Decisiones

1. **El catálogo se reconstruye en React dentro de esta app**, como página pública aparte del panel: `/tienda/{slug}` (sin login, con la marca de cada tienda, liviana). Mismo repo, misma base, mismo despliegue. El HTML de Esencias Michel (`public/catalogos/esencias-michel.html`) se queda tal cual hasta que la página nueva esté lista; entonces `url_catalogo` pasa a la nueva y el HTML redirige.
2. **Cero pasos extra para el comprador.** Desliza, aaah, "Enviar pedido" → WhatsApp. No se le pide nombre ni teléfono para pedir.
3. **El pedido entra a la app cuando la tienda lo registra**, desde el mismo enlace que llega en el WhatsApp. Al enviar, el catálogo guarda una **solicitud** (borrador invisible en Pedidos). Un enlace, dos vistas: el comprador ve su pedido y su estado; la tienda, con sesión, ve "Registrar pedido".
4. **Stock por variante.** Un producto con opciones (talla, color, sabor…) tiene una variante por combinación, cada una con su stock.
5. **Detalles según el rubro de la tienda** (perfumes, ropa, accesorios, belleza, comida, hogar, general). Todos opcionales.
6. **Medios: carrusel de fotos y videos** por producto.
7. **Tipo producto o servicio** desde ya en la base (sin pantalla todavía).
8. **Entra en esta etapa:** aaahs contados, Por encargo y Avísame cuando llegue.
9. **Fuera por ahora:** RNC y NCF en la factura, reseñas, pagos en línea.

## 1. Detalles por rubro

Las listas viven en el código (`lib/rubros.ts`), así el formulario y el catálogo saben qué mostrar. La base valida que cada llave de `productos.detalles` pertenezca al rubro de su tienda (trigger con la misma lista; una prueba compara las dos para que no se separen).

| Rubro | Detalles (llave · tipo) | Opciones típicas |
|---|---|---|
| perfumes | `marca` texto · `para` ella/el/unisex · `tamano_ml` número · `concentracion` edp/edt/parfum/extrait/colonia · `familia` texto · `ocasiones` lista (dia, noche, oficina, citas, fiestas, verano…) · `notas_salida`, `notas_corazon`, `notas_fondo` listas de texto | — |
| ropa | `material` texto · `corte` texto · `cuidado` texto · `para` ella/el/unisex/ninos | Talla, Color |
| accesorios | `material` texto · `medidas` texto · `para` ella/el/unisex | Color |
| belleza | `contenido` texto (ml o g) · `tipo_piel` texto · `ingredientes` lista · `modo_uso` texto | Tono |
| comida | `porcion` texto · `ingredientes` lista · `conservacion` texto · `anticipacion` texto ("Pídelo con 2 días") | Sabor, Tamaño |
| hogar | `medidas` texto · `material` texto · `cuidado` texto | Color, Tamaño |
| general | `marca` texto · `tamano` texto | La tienda las nombra |

Todos los rubros comparten `descripcion` (texto corto, ya es el "desc" del catálogo). Las "Opciones típicas" son sugerencias del formulario, no obligación.

Lo que los filtros del catálogo usan: perfumes filtra por `para` y `ocasiones` (día/noche), ropa por `para` y Talla, el resto por colección (`categoria`).

## 2. Variantes

- `productos.opciones` sigue siendo la lista de ejes: `[{"nombre":"Talla","valores":["S","M","L"]},{"nombre":"Color","valores":["Negro","Blanco"]}]`. Máximo 2 ejes y 12 valores por eje.
- Tabla nueva **`producto_variantes`**: `id`, `tienda_id`, `producto_id`, `valores` jsonb (`{"Talla":"M","Color":"Negro"}`), `stock` integer null (null = sin control), `precio` integer null (null = el del producto), `activa` boolean, `orden`. Única por (producto_id, valores).
- Producto **sin opciones** = sin variantes; su stock sigue en `productos.stock`.
- Producto **con opciones**: el stock vive en las variantes; `productos.stock` pasa a ser la suma (la mantiene un trigger) para resúmenes y para "Agotado" del producto (todas en 0).
- `pedido_items` suma `variante_id` (null si no aplica) y `variante_texto` (foto fija: "Talla M · Negro"), y `por_encargo` boolean.
- `ajustes_inventario` suma `variante_id`. `ajustar_stock`, `reponer_stock`, `despachar_pedido`, deshacer despacho, editar y eliminar pedido descuentan o devuelven por variante cuando el item la tiene.
- Inventario y la dona: un producto con variantes cuenta como **Agotado** si todas están en 0 y como **Queda 1 o 2** si alguna tiene 1 o 2 (se muestra cuál).

## 3. Medios (fotos y videos)

- `productos.medios` jsonb, lista ordenada: `{"tipo":"foto"|"video","url":…,"portada":…(video),"retocada":bool(foto),"duracion_s":…(video)}`. Máximo 10 elementos y 2 videos.
- Se llena desde `fotos` + `foto_retocada` (migración de datos). `fotos` queda mientras la app se pasa a `medios` y luego se borra en otra migración.
- **Video:** se comprime en el teléfono antes de subir. Hasta 30 s, 720p, unos 8 MB (máximo duro 15 MB). El bucket `productos` acepta `video/mp4` y `video/webm` además de las imágenes. En el catálogo se reproduce solo cuando el reel está en pantalla, sin sonido hasta que se toca, sin precarga.
- El retoque con IA aplica solo a fotos.
- **Costo:** el plan gratis de Supabase trae 1 GB de almacenamiento, ~5 GB de descargas al mes y 50 MB por archivo. Con varias tiendas subiendo video hay que pasar a Pro o a un servicio de video. Lo vigila Deslizapp, no la tienda.

## 4. Producto o servicio

- `productos.tipo` text `producto` | `servicio`, por defecto `producto`.
- Un servicio no tiene stock ni variantes; puede llevar `detalles.duracion_min`. Un pedido puede mezclar productos y servicios (los items ya apuntan a `productos`).
- Sin pantalla en esta etapa: solo la base y los tipos.

## 5. Lo que ve el público

- `productos.slug`: corto, único por tienda (`mayar`, `asad-bourbon`). Se usa en `/tienda/{slug}#p/{producto}`. Esencias Michel recibe los mismos de su HTML para que los enlaces ya compartidos sigan sirviendo.
- **`catalogo_publico(p_slug)`** (security definer, para `anon`): la tienda (nombre, logo, colores, estilo, personalización, WhatsApp, Instagram, descripción, nombre de la vendedora, foto, rubro) solo si `estado = 'activa'` y `catalogo_estado = 'publicado'`; y sus productos con `activo = true`, con: slug, nombre, precio, precio con promo automática, medios, detalles, opciones, variantes disponibles, likes, tipo y disponibilidad.
- **Disponibilidad pública** (nunca el stock exacto salvo lo que la tienda ya muestra): `hay` · `quedan` (1 a 3, para "Solo tengo 1") · `agotado` · `por_encargo`. Por variante cuando aplica.
- Promos: solo las automáticas (producto o colección) se ven en el precio. Los códigos no se listan nunca; se validan al escribirlos.

## 6. Pedido del catálogo

- Tabla **`solicitudes_pedido`**: `id`, `tienda_id`, `codigo` (10 caracteres sin ambigüedad, único), `items` jsonb (foto fija: producto, variante, nombre, variante_texto, precio_unitario, cantidad, por_encargo), `codigo_promo`, `descuento`, `total`, `dispositivo`, `creada_en`, `vence_en` (+7 días), `pedido_id` (al registrarse), `descartada_en`.
- **`crear_solicitud_pedido(p_slug, p_items, p_codigo_promo, p_dispositivo)`** (anon): revisa que cada producto y variante exista, esté visible y se pueda pedir (hay o por encargo), calcula precios y promos en la base, guarda y devuelve el `codigo`. Límite: 10 solicitudes por dispositivo por hora y 300 por tienda por día.
- Mensaje de WhatsApp: el de hoy, con el número corto y el enlace `/pedido/{codigo}` en vez del enlace de 24 h.
- **`/pedido/{codigo}`, vista del comprador** (`ver_solicitud(p_codigo)`, anon): **la misma pantalla de pedido que ya tiene el catálogo** (historia a pantalla completa con un perfume por vez, barras de avance, "¡Gracias por tu compra!", hoja blanca con total, recibo en Imagen o PDF y "Ver el catálogo"). La hoja se simplifica: arriba, el **estado como título** ("Le llegó a Michel", "Michel lo confirmó", "Va en camino", "Se canceló") con el total a la derecha; debajo una línea corta ("3 perfumes · te responde por WhatsApp"); una **barra de 3 tramos** como las de las historias (se llena con cada paso; gris si se canceló); Recibo y PDF; "Ver el catálogo"; y, discreto, "¿Eres la tienda? Entra para registrarlo". Sin la fila "Pedido #… · fecha" (el número ya está arriba) ni el rótulo "Descargar recibo". La etiqueta "1 de 3" ya no dice "vence en 24 h". Sin registrar a los 7 días: "Este pedido venció".
- **`/pedido/{codigo}`, vista de la tienda** (sesión y miembro de esa tienda): "Registrar pedido".
  1. Lo que pidió y hace cuánto.
  2. Si algo ya no está (agotado desde entonces): "Quitar" o "Por encargo" ahí mismo.
  3. "¿Quién te escribió?": el mismo selector de cliente de + Pedido (`components/pedidos/selector-cliente.tsx`). **"Nuevo cliente" va siempre al inicio de la lista**, antes de "Recientes" o de las coincidencias (con una búsqueda: "Crear «809 555»"). En Android, el formulario de cliente nuevo suma "Elegir de mis contactos" (Contact Picker), que llena nombre y WhatsApp.
  4. "Registrar pedido" → `registrar_solicitud` (authenticated) crea el pedido (`origen = 'catalogo'`, `estado = 'nuevo'`), une o crea el cliente (`origen = 'catalogo'`) y guarda `pedido_id`. El comprador ya ve "Confirmado".
  5. "No es un pedido" → la descarta.
- **Respaldo en Pedidos › Nuevos:** fila "N pedidos del catálogo por registrar" que abre la lista de solicitudes vigentes. Así ninguno se pierde si la tienda no toca el enlace.
- En iPhone el enlace de WhatsApp abre Safari, no la app instalada: la primera vez la tienda entra con Google en Safari desde "¿Eres la tienda?". En Android, Chrome puede abrirlo en la app instalada (declararlo en el manifest).
- Las solicitudes vencidas sin registrar se borran a los 7 días (tarea programada o al leer).

## 7. Aaahs

- `eventos_aaah` suma `dispositivo` (id al azar guardado en el navegador del comprador). Único por (producto_id, dispositivo).
- **`registrar_aaah(p_slug, p_producto_slug, p_dispositivo, p_on)`** (anon): con `p_on = true` lo crea, con `false` lo borra. El trigger de `likes` ya existente sigue funcionando. Límite: 120 por dispositivo por hora.

## 8. Por encargo

- `productos.por_encargo` boolean y `productos.encargo_texto` (≤ 40, ej. "Llega en 7 a 10 días").
- Si está encendido y no hay stock (producto o variante), el catálogo lo muestra como "Por encargo · {encargo_texto}" y se puede pedir. El item del pedido guarda `por_encargo = true` y no descuenta stock al despachar (o lo deja en 0, nunca negativo).

## 9. Avísame cuando llegue

- Tabla **`avisos_llegada`**: `id`, `tienda_id`, `producto_id`, `variante_id`, `telefono` (obligatorio, solo dígitos con código de país), `nombre` (opcional), `dispositivo`, `creado_en`, `avisado_en`. Único por (producto, variante, teléfono) mientras no se avise.
- **`pedir_aviso(p_slug, p_producto_slug, p_variante_id, p_telefono, p_nombre, p_dispositivo)`** (anon), con límite por dispositivo.
- En el panel: el producto agotado muestra "3 esperan que llegue". Al reponer stock, la app ofrece avisarles: lista con un botón de WhatsApp por persona (mensaje con el enlace al producto) y cada envío marca `avisado_en`.

## 10. Orden de trabajo

1. **Base de datos y capa de datos** (sin pantallas nuevas): migraciones de §1–§9, tipos, `lib/data`, `lib/rubros.ts`, pruebas, y llenar Esencias Michel con los detalles y slugs de su HTML. La app sigue funcionando igual.
2. **Panel, producto:** formulario con Detalles por rubro, variantes con stock, carrusel con video, Por encargo; inventario y pedidos por variante. Diseño: tablero "Producto".
3. **Panel, pedido del catálogo:** `/pedido/{codigo}` (las dos vistas), fila de respaldo, lista de espera de Avísame. Diseño: tablero "Pedido del catálogo".
4. **Catálogo en React** `/tienda/{slug}` con el diseño del HTML actual, leyendo de §5–§9. Luego `url_catalogo` apunta ahí.
