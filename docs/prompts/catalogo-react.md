# Catálogo conectado, parte 4: el catálogo en React (rama `feature/catalogo-react`)

> Orden cambiado el 4 oct 2026: esta parte va **antes** que la 3 (pedido del catálogo en el panel). Hoy el catálogo público es un HTML fijo (`public/catalogos/esencias-michel.html`) que no lee la base: lo que la tienda oculta, agota o agrega en la app no le llega. Esta parte lo arregla.

Las partes 1 y 2 (PR #40 y #42) dejaron la base y el panel: `slug`, `medios` (fotos y video), `detalles` por rubro, `opciones` + variantes con stock, `por_encargo`, avisos, y las funciones públicas `catalogo_publico`, `crear_solicitud_pedido`, `ver_solicitud`, `registrar_aaah` y `pedir_aviso` (en `lib/data`: `catalogoPublico`, `crearSolicitudPedido`, `verSolicitud`, `registrarAaah`, `pedirAviso`, con demo y real).

Esta parte hace **el catálogo público en React en `/tienda/{slug}`**, leyendo de la base, y **la página del pedido del comprador en `/pedido/{codigo}`**. Es una **copia fiel** del HTML de hoy más lo nuevo de docs/12.

Antes de empezar lee:
- `docs/12-catalogo-conectado.md` §0–§9, y sobre todo §5, §6, §7, §8 y §9.
- **El HTML completo**: `public/catalogos/esencias-michel.html` (casi la mitad del peso son imágenes en base64; para leerlo, quítalas primero). Esa es la referencia de cómo se ve, cómo se mueve y qué dice cada pantalla.
- `referencias/producto/img/real-*.jpg`: el HTML real con **solo lo nuevo** agregado (carrusel, video, opciones, opción agotada, Avísame, Por encargo, panel «más»). `referencias/producto/LEEME.md` los explica.
- `docs/11-voz-y-frases.md` para cualquier texto nuevo.
- `lib/rubros.ts` (campos por rubro, `OCASIONES_NOCHE`, `NOMBRE_PARA`).

## 0. La regla de esta parte: fiel al HTML

Para Esencias Michel, `/tienda/esencias-michel` tiene que verse y comportarse **igual** que `/catalogos/esencias-michel.html`, pantalla por pantalla:
- los mismos tamaños, tipografías, colores, sombras y radios;
- las mismas animaciones: entrada de los reels, aaah con estallido, sello de agotado, transformación del botón de pedido en hoja, historia del pedido, tostadas, coach;
- los mismos textos y los mismos gestos: deslizar, tocar a los lados en la historia, mantener presionado para pausar o copiar.

Lo único distinto es:
1. **Lo nuevo de docs/12**, en la sección 4 de este prompt.
2. **Los datos salen de la base y no de constantes**, según la sección 3.
3. **La marca de cada tienda** en vez de los valores fijos de Michel, según la sección 5.

El catálogo **no usa `components/ui/`** ni los tokens del panel: es otra superficie, con el aspecto de cada tienda. Sus componentes van en `components/tienda/` y sus estilos en un CSS propio (`app/tienda/catalogo.css` o módulos), portados del HTML. Pasa el HTML a componentes de React con estado; no lo pegues entero en un `dangerouslySetInnerHTML`. Lo que sí se reutiliza: `lib/data`, `lib/rubros.ts`, `lib/types.ts` y los formateadores de dinero.

## 1. Rutas

- **`app/tienda/[slug]/page.tsx`**: pública, sin sesión y fuera de `(dashboard)`. Se renderiza en el servidor con `catalogoPublico(slug)` (Supabase como `anon`), sin caché, para que un cambio en la app se vea al recargar.
  - Si la tienda no está activa o su catálogo no está publicado (`CatalogoNoDisponible`): una pantalla corta con la voz de la marca, sin datos de la tienda.
  - `generateMetadata`: `<title>`, `og:title` (nombre de la tienda), `og:description` (la `descripcion` de la tienda, o una genérica con la voz de la marca) y `og:image` (el logo o la primera foto).
- **Modo demo**: `/tienda/{slug}?demo` se renderiza en el cliente con la fuente demo (los datos viven en el navegador). Así lo prueban los scripts con las tiendas de la demo (Esencias Michel para perfumes, Lino & Algodón para ropa con variantes).
- **Rutas por hash**, las mismas del HTML:
  - `#p/{slug-producto}`
  - `#planes` y `#planes?plan=…`
  - `#como-funciona`
- **`app/pedido/[codigo]/page.tsx`**: pública, sin sesión. Es la vista del comprador; ver la sección 6.
- **`proxy.ts`**: no hace falta excluir estas rutas (sin cookies `sb-` no hace nada). Revisa que no redirijan al login ni pasen por `DataProvider` del panel.

## 2. Base de datos (una migración)

Migración `…_catalogo_react.sql`. Aplícala en Supabase y renombra el archivo a la versión que Supabase le ponga (`list_migrations`), como pide AGENTS.md. `npm run revisar:migraciones` tiene que dar cero diferencias.

1. **`productos.orden integer`** (null por defecto). En el catálogo van primero los que no tienen orden (los nuevos, del más nuevo al más viejo) y después los que tienen orden, de menor a mayor. Todavía sin pantalla para ordenar.
2. **`productos.opiniones jsonb not null default '[]'`**: un arreglo de hasta 20 objetos `{usuario, fuente, url, texto, estrellas (1–5 o null), traducida (bool)}`. Valídalo con un `check` y una función, como `detalles_validos`, con largos razonables: texto ≤ 600, url https. Sin pantalla en el panel todavía.
3. **`catalogo_publico`** (nueva versión con `create or replace`; no edites la migración vieja):
   - Suma por producto `orden` y `opiniones`.
   - Suma por tienda:
     - `desde`: `creado_en` de la tienda.
     - `ventas`: cuántos pedidos despachados tiene. Solo el número, y solo si son 10 o más; si no, null.
   - Mantén todo lo demás igual: disponibilidad sin stock exacto por encima de 3, promos automáticas y solo productos activos.
4. Actualiza `lib/types.ts`, la fuente demo y la real, y las pruebas de `tests/`.

**Datos de Esencias Michel**: esto no va en una migración (AGENTS.md: los datos reales de tiendas no van en migraciones). Escribe `scripts/cargar-catalogo-esencias-michel.mjs`, que lee el HTML y genera un `.sql` que corres una vez en Supabase. El SQL llena:
- `productos.orden`: el orden del arreglo `PRODUCTS`. Los productos que no están en el HTML quedan con null.
- `productos.opiniones`: desde `REVIEWS`, con `user` → `usuario`, `src` → `fuente`, `stars` → `estrellas` y `tr` → `traducida`.
- `tiendas.personalizacion.tema`: lo de la sección 5. Haz un merge que conserve `mensajes` y `secciones`, que ya existen.
- `tiendas.descripcion`: si está vacía, el texto del `og:description` del HTML.

Pon el SQL generado en el PR y di que lo corriste. Que el script sea idempotente y se pueda volver a correr.

## 3. De dónde sale cada cosa

| En el HTML | En `/tienda/{slug}` |
|---|---|
| `PRODUCTS[].id` | `slug` (Michel ya tiene los mismos, así los enlaces `#p/mayar` siguen sirviendo) |
| `name`, `sug` | `nombre`; `precio` (o `precioPromo` y la promo) |
| `line` | `detalles.marca` |
| `gender` | `detalles.para` (`NOMBRE_PARA`: ella → "Para ella", unisex → "Para los dos", el → "Para él") |
| `size` ("EDP 100 ml") | `detalles.concentracion` + `detalles.tamano_ml` |
| `family`, `occasions`, `desc`, `notes` | `detalles.familia`, `ocasiones`, `descripcion`, `notas_salida/corazon/fondo` |
| `agotado` | `disponibilidad` del producto o de la variante elegida |
| `IMG[id]` | `medios` (carrusel; la portada es el primero) |
| `TINT[id]` | `personalizacion.tema.tintes[slug]` si existe; si no, se calcula en el navegador desde la portada (color promedio de los bordes, `dark` según la luminancia) y se guarda en memoria |
| `REVIEWS[id]` | `opiniones` |
| `FILTERS` (colecciones) | Se arman solas (ver abajo) |
| `PHONE`, `IG_URL` | `whatsapp`, `instagram` de la tienda |
| `STORE.sales`, `STORE.since` | `ventas` (null → "Nueva tienda", como hoy con 0) y `desde` |
| Mensajes ("¡Lo quiero, Michel!", saludo y cierre de WhatsApp, frases al agregar, frase del sello de agotado, texto del chat) | `personalizacion.mensajes` (ya están para Michel). Si una tienda no tiene alguno, uno por defecto con la voz de docs/11 y el `nombre_vendedora` (o el nombre de la tienda) |
| Secciones (chat, búsqueda, colecciones, opiniones, cómo funciona) | `personalizacion.secciones`: `false` las esconde. En `opiniones`, `"pronto"` muestra la hoja solo con el mensaje fijado, sin la lista de opiniones |
| `michel-cart`, `michel-coach` (localStorage) | `dz-carrito-{slug}` y `dz-coach-{slug}`. Para `esencias-michel`, la primera vez lee también las llaves viejas, para no vaciarle el carrito a nadie |

**Colecciones** (pestaña "Colecciones", con la imagen del primer producto de cada una y su conteo), en este orden:
1. "Todos".
2. En perfumes:
   - "Para ella", "Para él" y "Para los dos", según `para`.
   - "Día" y "Noche", según `ocasiones` y `OCASIONES_NOCHE`, como el HTML.
3. Las `categoria` de la tienda.

Solo aparecen las que tienen al menos un producto. Las imágenes de `FILTERS` del HTML ya no se usan.

**Otros rubros**: lo que en perfumes es "EDP 100 ml", "Floral frutal fresca · EDP" y la tabla Salida/Corazón/Fondo, en otros rubros sale de `CAMPOS_POR_RUBRO`:
- **Línea corta**: los dos primeros detalles cortos que tenga.
- **Panel «más»**: una fila por detalle con valor, con la misma tipografía de la tabla de notas.

La palabra del producto en los textos ("todos mis perfumes", "3 perfumes", "Mira este perfume") sale de una tabla nueva en `lib/rubros.ts`: singular y plural por rubro (perfume, prenda, accesorio, producto…).

**Búsqueda**: la misma, con su índice, tolerancia a errores y chips. Los sinónimos y los chips de perfumes (`SR_SYN`, `SR_CHIPS`) quedan para el rubro perfumes; en los demás rubros los chips son las colecciones y la búsqueda usa nombre, marca, categoría y detalles.

## 4. Lo nuevo (docs/12 y `referencias/producto/img/real-*.jpg`)

- **Carrusel**:
  - Con más de un medio, puntos arriba del reel, centrados bajo la línea "05 / 13 · PARA ELLA".
  - Se desliza a los lados dentro del reel y el deslizar vertical sigue cambiando de reel. Mira `real-opciones.jpg`.
- **Video** (`real-video.jpg`):
  - Arranca solo, sin sonido, en bucle y en línea (`muted playsinline`), con la portada de póster.
  - Se pausa cuando el reel sale de la pantalla.
  - Arriba a la derecha, un botón redondo oscuro para el sonido (bocina tachada cuando va mudo).
  - Si el video no arranca, queda la portada.
  - Carga diferida: solo se pide el video del reel visible y el siguiente.
- **Opciones** (`real-opciones.jpg`):
  - Debajo del precio, pastillas por valor: la elegida en blanco y las demás con borde.
  - Las agotadas van tachadas y siguen tocables, para ver su estado y pedir el aviso.
  - Con dos ejes, dos filas.
  - El precio y la disponibilidad cambian con la elección.
  - En el panel «más» (`real-mas.jpg`), las mismas pastillas con su precio ("50 ml · RD$2,100").
  - Agregar al pedido guarda la variante, y el carrito y el mensaje la muestran ("Mayar Natural Intense · 50 ml").
- **Disponibilidad**: va en la línea pequeña junto al precio:
  - "Solo tengo 1" (con `quedan`; usa el `nombre_vendedora` si el mensaje lo pide).
  - "Agotado".
  - "Llega en 7 a 10 días" (`encargoTexto`).
- **Por encargo** (`real-encargo.jpg`): etiqueta rosa "POR ENCARGO" sobre la descripción. Se puede pedir aunque no haya stock.
- **Agotado + Avísame** (`real-agotada.jpg`, `real-avisame.jpg`):
  - En algo agotado sin encargo, el botón del corazón pasa a "Avísame", con el ícono de WhatsApp.
  - Abre la hoja "Te aviso cuando llegue": el producto y la variante, el campo "TU WHATSAPP" (809 000 0000, se guarda con 1 adelante), el botón "Avísame" y la nota "Solo para este aviso.".
  - Llama a `pedirAviso` y responde con una tostada con la voz de la marca.
  - El sello de agotado del HTML se queda.
- **Opiniones**: el botón de comentarios muestra el número de opiniones. Con 0 dice "Pregúntame", como en `real-encargo.jpg`.
- **Promo automática**: el precio con la promo y, al lado, el precio normal tachado y más chico.
- **Aaah**: el corazón hace lo mismo que hoy y además llama a `registrarAaah(slug, producto, dispositivo, true/false)`. `dispositivo` es un id al azar guardado en `localStorage` (`dz-dispositivo`). El número de likes sale de la base.

## 5. La marca de cada tienda

El HTML tiene la paleta de Michel en variables CSS (`--bg`, `--surface`, `--ink`, `--accent`, `--heart`, `--gold`, etc.), la cabecera "Esencias *Michel*" y las fuentes Cormorant Garamond + Manrope. Cada tienda necesita lo suyo:

- **`personalizacion.tema`** (jsonb, sin migración):
  - `colores`: las variables del HTML, por nombre.
  - `fuentes`: `display` y `body`.
  - `cabecera`: cómo se pinta el nombre arriba (para Michel, lo que hace hoy el HTML; si es un SVG propio, guárdalo como texto).
  - `tintes`: color por producto, `{slug: {c, dark}}`.

  El script de la sección 2 lo llena para Michel con los valores exactos del HTML.
- **Sin `tema`**: se arma solo desde `marca_color_principal`, `marca_color_acento` y `marca_estilo`, con una función pura en `lib/tienda/tema.ts` y sus pruebas, que revisan contraste AA del texto sobre el fondo.
  - Cada `marca_estilo` tiene su par de fuentes: elegante, moderna, divertida, clásica.
  - La cabecera es el nombre de la tienda en la fuente display.
  - Los colores salen de esos dos colores de marca.
- **Lo que es de Deslizapp** se queda igual en todas las tiendas: la historia "Cómo funciona", los planes, el reel final de Deslizapp, el "Hecho con Deslizapp" y su WhatsApp (`VV_PHONE`). Solo se cambia "Esencias Michel" por el nombre de la tienda en los textos ("Vi el catálogo de {tienda} en Deslizapp…").

## 6. Enviar el pedido y la página del pedido

En esta parte el comprador ya manda el enlace nuevo. **El registro en el panel y el estado son la parte 3**: aquí no.

1. **Carrito y hoja del pedido**: iguales al HTML, con variantes y "Por encargo" en cada línea.
2. **"Enviar pedido"**:
   - Llama a `crearSolicitudPedido(slug, líneas, null, dispositivo)`. El precio lo pone la base; si difiere del que se mostraba, se usa el de la base.
   - Con el `codigo`, abre WhatsApp con el mensaje del tablero 1 del canvas "Pedido del catálogo": saludo de `personalizacion`, una línea por producto ("• Kiara Pink (RD$1,100)", con la variante si la hay), "Total: …", cierre, línea en blanco, "Mi pedido #K7F2QX:" y el enlace `{origen}/pedido/K7F2QX`.
   - El enlace usa el origen real de la app, no un dominio inventado.
   - **iPhone**: abrir una pestaña después de un `await` lo bloquea Safari. Abre WhatsApp en la misma pestaña (`location.href`) o deja la pestaña abierta antes del `await`. Elige lo que funcione y pruébalo en la vista de iPhone.
   - **`ProductoNoDisponible`**: tostada con la voz de la marca ("Aaah… alguien se llevó {producto} antes que tú."). Ese producto pasa a agotado en el carrito, se recarga el catálogo y no se envía nada.
   - **`DemasiadosIntentos`**: tostada corta.
   - **Sin red o error de la base**: abre WhatsApp igual con la lista y el total, sin enlace, para que la venta no se pierda.
3. **`/pedido/{codigo}`**:
   - **Con `verSolicitud(codigo)`**: es **la vista del pedido del HTML** (`#pedido/…`, `openOrderView`).
     - La historia a pantalla completa con un producto por vez, las barras, "¡Gracias por tu compra!" y "1 de 3".
     - La hoja blanca con el total y los botones Recibo (imagen) y PDF, que hacen el mismo recibo del HTML (`invoiceCanvas`, `pdfFromJpeg`).
     - El botón **"Seguir explorando {nombre de la tienda}"**, que lleva a `/tienda/{slug}`.
   - **Sin estado**:
     - Ni barra de 3 pasos ni "¿Eres la tienda?": eso llega en la parte 3.
     - La etiqueta "1 de 3" ya no dice "vence en 24 h".
   - **Vencido**: si `estado` es `vencido`, una pantalla corta "Este pedido venció" con el mismo botón.
   - **No existe**: lo mismo, con otro texto.
   - **Vista previa en WhatsApp**: `generateMetadata` arma la tarjeta del tablero 1: "Tu pedido con {tienda}", "3 productos · RD$5,600" y la foto del primero.
4. **No toques todavía**:
   - `url_catalogo`.
   - `public/catalogos/esencias-michel.html`.
   - El enlace viejo `#pedido/…` de 24 h.

   El cambio de un catálogo al otro se hace después, cuando Lewis compare los dos en producción.

## 7. Comprobación

- `npm run lint`, `npm run build`, `npm test` y todos los `probar:*`.
- **Script nuevo `scripts/comparar-catalogo.mjs`**:
  - Abre `/catalogos/esencias-michel.html` y `/tienda/esencias-michel?demo` a 360, 390 y 430, en los mismos estados:
    1. Primer reel.
    2. Reel con panel «más».
    3. Colecciones.
    4. Búsqueda con "dulce".
    5. Perfil.
    6. Opiniones.
    7. Carrito con 2 productos.
    8. Hoja de pedido.
    9. Historia del pedido.
    10. Reel agotado con sello.
    11. Coach.
    12. "Cómo funciona".
    13. Planes.
    14. Reel final.
  - Guarda las capturas lado a lado en `docs/capturas/catalogo-react/comparar/` y calcula la diferencia de píxeles de cada par.
  - Antes, la demo de Esencias Michel tiene que tener los mismos datos que el HTML (orden, opiniones, tema, stock de los agotados). Si hace falta, ajusta el seed de la demo con el mismo script de la sección 2.
  - Revisa cada par y corrige hasta que la diferencia sea solo la esperada: la que cambia por datos, como un producto que en la base existe y en el HTML no.
- **Script nuevo `scripts/probar-catalogo-react.mjs`** (demo, 390, y lo crítico también a 360):
  1. `#p/mayar` abre en ese reel.
  2. El carrusel se desliza a los lados y el reel sigue bajando.
  3. Un video arranca mudo y el botón le pone sonido.
  4. Ropa con Talla y Color: la agotada va tachada, el precio cambia y el carrito muestra "Talla M · Negro".
  5. Agotado: "Avísame" llama a `pedirAviso`, y en el panel aparece "1 espera".
  6. Por encargo: se puede pedir y la línea dice "Por encargo".
  7. Enviar pedido: se crea la solicitud y el enlace de WhatsApp lleva "Mi pedido #…" y `/pedido/…`. `/pedido/{codigo}` muestra la historia, el total y el recibo.
  8. Producto agotado entre ver y enviar: sale la tostada y no se envía.
  9. Ocultar un producto en el panel lo quita del catálogo al recargar.
  10. Tienda sin `tema` (Lino & Algodón): se ve con sus colores y su estilo, sin errores.
- **Real (Supabase)**:
  - Corre el SQL de la sección 2 y abre el preview de Vercel en `/tienda/esencias-michel` sin sesión.
  - Tienen que verse los 14 productos visibles, con los agotados de la base.
  - Crea una solicitud real de prueba y bórrala después.
- **iPhone**: prueba en la vista de iPhone de Safari, o en WebKit de Playwright si está disponible, lo siguiente:
  - el video en línea;
  - el carrusel;
  - abrir WhatsApp después de enviar;
  - el recibo PDF.

  Di en el PR qué pudiste probar y qué no.
- **Rendimiento**: el primer reel tiene que verse rápido en 4G (las fotos con `loading="lazy"`, menos la primera y la siguiente). Anota en el PR el peso de la primera carga.
- Capturas finales en `docs/capturas/catalogo-react/`.

## 8. Cierre

PR contra `main` con:
- lo que cambió;
- la versión de la migración;
- el SQL de Michel y la confirmación de que lo corriste;
- los resultados de los dos scripts y el resumen de diferencias del comparador (qué quedó distinto y por qué);
- qué se probó en iPhone;
- las capturas.

Como `/tienda/…` y `/pedido/…` son rutas nuevas y nada existente cambia de comportamiento, si todo pasa haz el merge tú mismo (squash) y borra la rama. Si algo falla, o decidiste algo que no está aquí, deja el PR abierto y explícalo.
