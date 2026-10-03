# Tu próxima jugada: base de datos, tarjeta viva, animaciones, escribir con código o productos y vista de WhatsApp

Rama: `feature/proxima-jugada`. Es un trabajo grande; hazlo **en este orden** y con un commit por parte (0 → 9). Si una parte falla y no la puedes resolver, termina las demás que no dependan de ella, deja el PR abierto y explica.

## 0. Antes de empezar (obligatorio)

- Lee `AGENTS.md` y la guía de Next que indica.
- Lee `docs/09-sistema-de-diseno.md` completo. Cambió hoy en:
  - §7, Hoja de resumen, punto 5: la tarjeta va arriba.
  - §10: Tarjeta de jugada y Vista previa de WhatsApp.
  - §13: excepción de movimiento de Tu próxima jugada.
  - §16, punto 5: componentes.
- Lee `referencias/proxima-jugada/LEEME.md` y abre los tableros en el navegador: ahí están los colores, tamaños, tiempos y curvas exactos.
- **Regla de componentes (la más importante de este prompt):** los tableros de diseño muestran cómo se ve y cómo se mueve. **No copies su HTML ni sus estilos sueltos.**
  - Construye todo con los componentes de `components/ui/`: Boton, Opcion/GrupoOpciones, ListaAgrupada/FilaLista, CheckSeleccion, Campo, CampoMultilinea, Cantidad, Tarjeta, Hoja, Avatar, Buscador, VistaPreviaWhatsApp y los demás.
  - Donde no exista el componente que hace falta, créalo en `components/ui/` siguiendo la guía (tokens, radios, alturas de 44 px mínimo, estados, foco, lectores de pantalla), expórtalo en `components/ui/index.ts` y muéstralo en `/diseno`.
  - En el tablero hay piezas que **no** son componentes nuestros (filas de radio dibujadas a mano, la cuadrícula de productos, pastillas con estilos propios). En la app esas piezas son los componentes nuestros equivalentes, o uno nuevo hecho bien.
  - Colores y medidas siempre con tokens. Los únicos colores fijos nuevos permitidos son los de la malla y el chat, y van como tokens en `app/globals.css` (ver 3 y 8).

## 1. Base de datos (Supabase, proyecto `euihaeyfdlpvmbtfzvnt`)

El SQL completo está en `docs/prompts/proxima-jugada.sql`. Solo agrega cosas, no cambia ni borra datos:
- `promos.cliente_id`: el código solo vale para ese cliente.
- `crear_codigo_cliente(p_tienda_id, p_cliente_id, p_porcentaje, p_dias default 14, p_codigo default null)`:
  - Crea el código personal: un solo uso, vence al final del día en hora de Santo Domingo.
  - Sin `p_codigo`, arma uno legible con la primera palabra del nombre, hasta 6 letras sin tildes, más el porcentaje (`LUISAN10`). Si ya existe, le agrega 2 dígitos.
  - Con `p_codigo` lo respeta en mayúsculas. Si no cumple `^[A-Z0-9]{3,15}$` lanza `codigo_formato_invalido`, y si ya está en uso, `codigo_en_uso`.
  - Devuelve la promo creada.
- Tabla `jugada_envios`: tienda, cliente, jugada, tipo `saludo|codigo|productos`, `promo_id`, `producto_ids` (1 a 3) y `enviado_en`.
  - RLS solo de lectura para las tiendas de la persona.
  - Se escribe **solo** con `registrar_envio_jugada(p_tienda_id, p_cliente_id, p_jugada, p_tipo, p_promo_id default null, p_producto_ids default '{}')`, que valida que todo sea de esa tienda.

Pasos:
1. Mueve el archivo a `supabase/migrations/20261003200000_jugadas_codigos_y_envios.sql` (`git mv`).
2. Aplícalo al proyecto con tu herramienta de Supabase (apply_migration). **Si no puedes aplicarlo, para aquí, no sigas con 4–7, deja el PR abierto y dilo.**
3. Pruébalo en una transacción que termine en `rollback`, con una sesión simulada de la dueña de Esencias Michel. Comprueba:
   - Que `crear_codigo_cliente` sin código da `NOMBRE10`.
   - Que al repetirlo da `NOMBRE10xx`.
   - Que con un código ya usado da `codigo_en_uso` y con `"ab"` da `codigo_formato_invalido`.
   - Que `registrar_envio_jugada` con 4 productos falla.
   - Que con un cliente de otra tienda falla.
   - Que un usuario anónimo no puede llamar a ninguna de las dos funciones.
4. Corre los avisos de seguridad de Supabase (advisors) y confirma que no aparece nada nuevo.

## 2. Datos en la app (`lib/types.ts`, `lib/data/*`)

- `Promo` gana `clienteId: string | null`. Léelo en `lib/data/promos.ts` y en las filas.
- **Cuidado:** guardar o editar una promo desde Promos **no debe borrar** `cliente_id`.
- Tipo nuevo `EnvioJugada` (`id`, `tiendaId`, `clienteId`, `jugada`, `tipo`, `promoId`, `productoIds`, `enviadoEn`).
- En `lib/data/fuente.ts`, agrega:
  - `crearCodigoCliente(tiendaId, clienteId, porcentaje, dias, codigo?) => Promise<Promo>`
  - `registrarEnvioJugada(...) => Promise<EnvioJugada>`
  - `enviosJugada(tiendaId) => Promise<EnvioJugada[]>`: los de los últimos 30 días.
- Implementa las tres en `lib/data/supabase.ts` (como `reponerStock`) y en `lib/data/demo.ts`, con las mismas reglas y errores.
- Traduce los errores nuevos en `lib/data/errores.ts`:
  - `codigo_en_uso`: "Ese código ya existe. Prueba otro."
  - `codigo_formato_invalido`: "Usa de 3 a 15 letras o números, sin espacios."
  - Los demás en el mismo tono.

## 3. Regla de códigos personales (`lib/promos.ts` y donde se eligen descuentos)

- `ContextoCodigo` suma `clienteId?: string | null`, el cliente del pedido.
- `razonNoUsable` devuelve una razón nueva `"otro_cliente"` si `promo.clienteId` existe y no es el del pedido.
- `buscarCodigoPromo` nunca devuelve un código personal para otro cliente.
- Pásale el cliente del pedido desde "+ Pedido", "Editar pedido" y el detalle.
- En el selector de descuento (`components/pedidos/selector-descuento.tsx`):
  - Los códigos personales de **otros** clientes no aparecen.
  - El del cliente del pedido aparece primero, con el subtítulo "Solo para Luisanna".
- En Promos (lista y detalle), un código personal lleva "Solo para {nombre}" como dato. No se puede cambiar a otro cliente.
- Pruebas: una por cada caso.

## 4. Tarjeta "Tu próxima jugada"

- **Lugar:** primera cosa de la hoja "Tus clientes", antes de la dona (docs/09 §7, punto 5).
- **Texto:**
  - "Tu próxima jugada" en Caveat.
  - Debajo, el **nombre** de la jugada destacada en Fredoka ("Segundo aaah").
  - Una línea con quiénes y qué hacer, sin repetir porcentajes: "4 clientes compraron una vez. Invítalos a volver." Las otras jugadas siguen el mismo patrón.
  - Botón "Ver tus jugadas" con chevron.
  - Sin datos: "La próxima conversación empieza aquí." sin botón de jugada.
  - Toda la tarjeta es un botón, con un `aria-label` que diga la jugada y la cantidad.
- **Malla viva** (reemplaza `LuzJugada` de `components/clientes/luz-jugada.tsx`). Ver `Main.dc.html`:
  - **Manchas:** cuatro, cada una en su zona: rosa `#f59bbb` arriba a la derecha, sol `#ffb36b` arriba al centro, mandarina `resalte` abajo al centro y menta `#5fc79a` abajo a la izquierda. Unos 170–190 px, `blur(24px)`, opacidad .9.
  - **Movimiento continuo:** keyframes de 6, 7, 8 y 9 s en bucle, con recorridos de 60–90 px. Que nunca se junten las cuatro en el centro.
  - **Velo:** crema a la izquierda (`linear-gradient(90deg, rgba(255,249,238,.78), rgba(255,249,238,.45) 50%, transparent 70%)`).
  - **Grano:** encima, con el nuevo `public/ilustraciones/proxima-jugada/grano.svg` (cópialo de `referencias/proxima-jugada/img/grano.svg` y reemplaza el `grain.svg` viejo). Va en `background-size:180px`, `opacity:.32`, `mix-blend-mode:overlay`. **Nunca `multiply`.**
  - **Al tocar o arrastrar** (pointer events, `touch-action: none` solo en la tarjeta), sin ondas:
    - Cada mancha se desplaza hacia el dedo una fracción de la distancia: rosa .55, mandarina .5, sol .4, menta .35.
    - Crecen a `scale(1.12)`, cada una con su transición (700, 950, 1100 y 1200 ms, `cubic-bezier(.2,.8,.2,1)`).
    - Se saturan un poco (`saturate(1.25)`).
    - Al soltar vuelven. El movimiento propio no se detiene.
  - **Tokens:** pon los cuatro colores en `app/globals.css` como `--jugada-rosa`, `--jugada-sol`, `--jugada-mandarina` (= `resalte`) y `--jugada-menta`.
- **Cartas:** el ciclo "Las tres" de 14 s de `Cartas.dc.html`. Copia los porcentajes de `@keyframes tres0…tres3`; la carta de la jugada destacada es la que se asoma.
  - Corre solo mientras la tarjeta está en pantalla (IntersectionObserver).
  - Después de que la persona toca la tarjeta, deja de repetirse en esa sesión.
- **Reducir movimiento:** malla quieta (en su primer cuadro), cartas quietas en abanico, sin seguir el dedo.

## 5. Entrada: de la tarjeta a la galería (`Entrada.dc.html`)

Reemplaza `TransicionJugada` tipo "galeria":
- **La tarjeta se agranda:** pasa de su lugar a llenar la hoja en 900 ms con `cubic-bezier(.65,0,.25,1)` y se desvanece al final. Su texto y el velo se apagan en los primeros 260 ms.
- **Las cartas vuelan:** las cuatro van desde el mazo a la posición de su cuadro en la galería, en 950 ms con `cubic-bezier(.5,0,.15,1.08)`, escalonadas 70 ms. Se enderezan (`rotate(0)`) y crecen al tamaño del cuadro. Usa FLIP: mide el rect de origen y el de destino.
- **Al terminar:** aparecen los textos de cada cuadro (nombre y cantidad) y queda el brillo suave arriba de la hoja.
- Todo es decoración encima de la navegación real. No retrasa la navegación ni el foco, y el historial (Volver) sigue igual que hoy.

## 6. Barrido al elegir una jugada (`Barrido.dc.html`)

Reemplaza `TransicionJugada` tipo "detalle". Tiene que verse **sin cortes**:
- **La página nueva se descubre con máscara, no con `clip-path`:**
  - `mask-image: linear-gradient(180deg, #000 0%, #000 40%, transparent 45.3%)` con `mask-size: 100% 300%`.
  - `mask-position` va de `0 100%` a `0 0%` en **1300 ms** con `cubic-bezier(.65,0,.35,1)`.
- **Franja del degradado:** 300 px de alto, recortada a la forma de la hoja. Lleva los cuatro colores en vertical, `blur(16px)`, dos brillos crema y el grano.
  - Se mueve con `transform: translateY()` de −717 px a 859 px, relativos al borde de arriba de la hoja, con la **misma duración y curva**, así el borde difuminado queda siempre escondido debajo de la franja.
  - Si la hoja no mide 788 px, calcula las posiciones con la fórmula: el centro del borde va de −0,72·H a 1,28·H.
- **Chispas:** cinco de 4 puntas en crema viajan dentro de la franja y titilan (900 ms en bucle).
- **Lo de atrás:** la galería baja a opacidad .45 con `blur(4px)` y `scale(.97)`. El contenido nuevo sube 28 px mientras aparece. El brillo de arriba entra a los 250 ms.
- **Al terminar:** se quitan la franja y la máscara (nada queda encima de la página).
- Con reducir movimiento: cambio directo.

Borra el código y el CSS viejo de `.jugada-velo*`, `.jugada-luz*` y `.jugada-mini*` que ya no se use. Pon las duraciones nuevas con nombre en `lib/movimiento.ts`: `jugadaEntrada: 950`, `jugadaBarrido: 1300` y `jugadaCartas: 14000`.

## 7. "Escribirle a {nombre}": saludo, código o productos (`Acercarte.dc.html`)

Reemplaza `components/clientes/hoja-borradores-jugada.tsx`. Es una hoja apilada, grande, con título "Escribirle a Luisanna".

1. **"¿Con qué te acercas?"**: `GrupoOpciones`/`Opcion` en fila con "Un saludo", "Un código" y "Productos". Empieza en "Un saludo".
2. **Un saludo:** los tres tonos de `borradoresJugada` (Cercano, Directo, Mirar el catálogo). Se eligen con el mismo patrón del recordatorio de cobro: un botón compacto con el nombre del tono y chevron abajo que abre una hoja "Elige el mensaje" con `GrupoOpciones`. Copia ese patrón de `components/credito/cuenta-cliente.tsx` y, si se repite, sácalo a un componente.
3. **Un código:** **viene ya propuesto** y se puede editar antes de enviar.
   - **La tarjeta "Su código":**
     - `Campo` "Código" con el valor propuesto (misma regla que el SQL: nombre + porcentaje). Si choca con un código activo de la tienda, propón uno con 2 dígitos más. Se convierte a mayúsculas mientras se escribe y acepta solo A–Z y 0–9, de 3 a 15.
     - `Cantidad` "Descuento" de 5 a 50 de 5 en 5, empezando en 10, con "%" al lado.
     - `GrupoOpciones` "Vence en" con 7, 14 y 30 días (empieza en 14).
     - Una línea secundaria: "Un solo uso. Solo vale en pedidos de Luisanna."
     - Si la persona cambia el porcentaje y no ha tocado el código, el código propuesto se actualiza.
   - **Debajo, "O usa uno de tus códigos":** `ListaAgrupada` con los códigos activos que esta persona puede usar (`razonNoUsable` = null), generales o personales de ella, con radio, código, % y vigencia. Elegir uno cambia el mensaje a ese código. Elegir "Su código" vuelve a la propuesta.
   - El mensaje incluye el código y el porcentaje, y el enlace del catálogo si existe.
4. **Productos:** una cuadrícula de 3 columnas con los productos **visibles con stock** (stock nulo o > 0).
   - Usa la foto (`MiniaturaProducto`), el nombre y el precio, con `CheckSeleccion`. Hasta 3; al llegar a 3, los demás se ven desactivados.
   - Con más de 9 productos, un `Buscador` arriba.
   - Si esta cuadrícula seleccionable no existe como componente, créala en `components/ui/` (por ejemplo `CuadriculaSeleccion`) según la guía.
   - Mensaje: una línea por producto, "• {nombre} · RD${precio}", y debajo `{url_catalogo}#p/{producto.id}`. Sin `url_catalogo`, sin enlaces.
   - Hoy el catálogo es estático y ese enlace abre el catálogo completo. Cuando lo conectemos a la base de datos, abrirá el producto. **No hace falta nada más ahora.**
5. **Vista previa:** la nueva `VistaPreviaWhatsApp` (parte 8) con el nombre del cliente. Debajo, un botón de texto "Editar mensaje" que muestra el `CampoMultilinea` con el texto (como hoy). Si la persona edita, se manda lo que escribió.
6. **"Enviar por WhatsApp"** (Boton principal, grande, ícono de WhatsApp), en este orden:
   1. Si es un código propuesto: llama a `crearCodigoCliente`. Si la persona no tocó el código, va sin `codigo`; si lo editó, con el suyo. Si falla con `codigo_en_uso` o `codigo_formato_invalido`, muestra el error en el `Campo` y no sigues. Si el código que vuelve es distinto al propuesto, rehaz el mensaje con el que volvió (y con el texto editado, reemplaza el código viejo por el nuevo).
   2. Llama a `registrarEnvioJugada`. **Si esto falla, no bloquea**: sigue y avisa en consola.
   3. Abre WhatsApp. Como antes hubo un `await`, usa `window.location.assign(enlace)` en vez de abrir una pestaña nueva, porque iPhone bloquea ventanas abiertas después de esperar.
   - Mientras llama, el botón está en estado cargando. Al volver a la app, cierra la hoja y muestra el toast "Listo. A ver qué dice."
7. **En la lista de clientes de cada jugada**, si a esa persona se le escribió desde una jugada en los últimos 7 días:
   - Su fila dice "Le escribiste hoy", "ayer" o "hace N días", en vez del dato de siempre.
   - Va al final de la lista.
   - "Empieza con estos 5" toma primero a los que no tienen envío reciente.

## 8. Vista previa de WhatsApp nueva (todas las pantallas)

Rediseña `components/ui/vista-previa-whatsapp.tsx` según docs/09 §10 y `ChatVentana.dc.html`:
- **Recuadro:** `superficie` con borde `borde-pastilla`, `radio-m` y sombra suave.
- **Cabecera:** avatar de 34 px (`Avatar`, con las iniciales del cliente) y su nombre, con "WhatsApp" debajo en secundario. Props nuevas: `nombre` y `sinDestinatario`. Sin destinatario: el ícono de WhatsApp en un círculo `superficie-hundida`, "Tu proveedor" y "Eliges a quién al enviar".
- **Fondo de chat:** token nuevo `--chat-fondo: #efe5d3` con el patrón de corazones algo más visible. Actualiza `public/chat/patron-whatsapp.svg` con el de `referencias/proxima-jugada/img/patron-medio.svg`.
- **Burbuja:** token nuevo `--chat-burbuja: #cfeedd`, con el piquito, la hora y ✓✓ como hoy.
- **Dónde se usa:** el recordatorio de cobro (`components/credito/cuenta-cliente.tsx`, con el nombre del cliente), Por reponer (`components/catalogo/vista-por-reponer.tsx`, sin destinatario), "Escribirle a…" (parte 7) y `/diseno`.
- **Modo oscuro:** deja los dos tokens solo en claro con un comentario `TODO modo oscuro`. Se hace en ese paso.

## 9. Verifica y cierra

- `npm run lint`, `npm run build` y todas las pruebas. Pruebas nuevas:
  - La regla de códigos personales (parte 3).
  - El código propuesto (nombre con tildes, nombre vacío, choque).
  - Los mensajes de código y de productos (con y sin `url_catalogo`).
  - El orden por envío reciente.
- Capturas a 360 y 390 en `docs/capturas/jugada/`:
  - La hoja Tus clientes con la tarjeta arriba.
  - La galería.
  - El detalle de una jugada.
  - "Escribirle a…" en las tres opciones.
  - El recordatorio de cobro y Por reponer con la vista previa nueva.
- Graba o describe paso a paso las tres animaciones. Comprueba con reducir movimiento activado que todo queda quieto y funciona.
- Comprueba con datos reales de Esencias Michel que crear un código personal y registrarlo funciona de punta a punta, y **borra después lo que creaste de prueba** (la promo y el envío).
- Abre el PR contra `main` con las capturas y un resumen por parte.
  - Si todo pasa, haz el merge tú mismo (squash) y borra la rama.
  - Si algo falla o tuviste que decidir algo que no está aquí, deja el PR abierto y explícalo.
