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
- Izquierda: foto de la tienda circular de 42 px (iniciales sobre Rosa Suave si no hay
  foto) + nombre de la tienda + debajo "Plan 20 · deslizapp". Tocarlo abre el
  **menú de tus tiendas** (selector de tiendas y cuenta; ver abajo).
- Derecha: botón blanco con borde verde "✦ 35 créditos" (créditos de retoque
  disponibles). Tocarlo abre **Plan y créditos** (pantalla 8).

**Menú de tus tiendas** (`components/panel/menu-tienda.tsx`; título «Tus tiendas» si la cuenta tiene más de una, «Tu tienda»
si tiene una). De arriba abajo:
1. **La tienda activa**, en una tarjeta con contorno `accion`: logo, nombre, «Plan · N créditos» y el check; al pie de la misma
   tarjeta, la fila **Mi marca** (con chevron; abre la hoja). Su detalle es «Logo, colores y letra» hasta que entre el PR de Mi marca.
   Debajo, **Tu equipo** (solo la dueña; «N esperan tu visto bueno» con un punto si hay solicitudes). Un colaborador ve la fila
   apagada («Esto lo ve quien administra la tienda. Aquí eres {nivel}.») y «Salir de esta tienda» (pide confirmar).
2. **Las otras tiendas de la cuenta** (las de las que es miembro, sin las eliminadas; la activa primero y el resto por nombre).
   Tocar una **cambia de tienda**: en la app real guarda la tienda por defecto de la cuenta (`usuarios.tienda_id`, solo una propia)
   y **recarga la página**, así nunca se ve un dato de la anterior; sale «Ahora estás en X.». Con un error, la tienda sigue como estaba.
   Con una sola tienda no hay lista. En Ver como no se cambia de tienda.
3. «Administrar Deslizapp» (solo admins; oculto en Ver como).
4. En la demo, la sección «Modo demo» y su laboratorio.
5. **La cuenta**: foto de Google (o iniciales en rosa), nombre y correo, leídos de la sesión (no se guardan en la base), y «Cerrar
   sesión» (en la demo, «Cuenta de demo» y «Salir de la demo»; en Ver como, «Cerrar sesión y salir»).
6. Versión, «Ver novedades», Privacidad y Términos.
**Tu equipo** (`components/equipo/hoja-equipo.tsx`, hoja grande): «Esperan tu visto bueno» arriba (nombre y correo de Google,
nivel con `GrupoOpciones`, «Aprobar» o «Rechazar»); «Quiénes están» (la dueña y cada colaborador con su nivel, que se cambia ahí
mismo, y «Quitar» con segundo toque); los invitados por correo; «Invitar por enlace» (nivel y una nota opcional; el enlace se ve una
vez con «Compartir» y «Copiar») e «Invitar por correo» (no pide aprobación); «Enlaces activos» con «Cancelar enlace». En la demo,
«Modo demo» trae «Mirar la app como» (Dueña, Ayudante, Editor, Administrador) para ver lo que ve cada nivel.

**Lo que un nivel no puede, se ve apagado con «Esto lo hace quien administra la tienda.»** (`usePermisos()` en
`lib/data/permisos.ts`, el único lugar que lee el nivel): «+ Producto», «Editar» y «Guardar» de la ficha (Ayudante), «Retocar esta
foto» y «Retocar foto» (sin créditos: Ayudante y Editor) y Mi marca sin «Guardar» (Ayudante y Editor). Para el Ayudante, TODO lo que cambia el catálogo está apagado: «+ Producto», el botón del catálogo vacío, el interruptor «Visible», el ajuste de stock, «Editar», «Eliminar producto», «Pedirlo»/«Revisar» del catálogo en línea y, dentro del inventario (la dona), «Sumar al stock» y «Ocultar». En la demo, además, la capa de datos lo rechaza igual que la base (`conPermisosDeLaDemo`). Si igual llega un
`sin_permiso` de la base, se muestra el mismo texto.

**`/unirse/<código>`** (`components/unirse/pantalla-unirse.tsx`): el enlace de invitación. Guarda el código en el navegador y lo
quita de la barra al instante; sin sesión, «Entrar con Google» (vuelve a `/unirse`, sin el código). Estados: «Esperando que te
aprueben» (mira cada 15 s; cuando aprueban, entra directo), «Ya eres parte de {tienda}», «Crea tu tienda» (nombre y rubro; enlace
de Deslizapp), «Este enlace ya no sirve. Pídele uno nuevo a quien te invitó.», «Esta vez no se pudo» (rechazada) y sin conexión con
«Reintentar». Sin referer, sin índice y sin recursos de terceros.

**Sin tienda** (cuenta de Google que no es de ninguna tienda, `pantalla-entrada.tsx`): «Deslizapp es por invitación», si ya tiene un
enlace que lo abra, «Escríbenos» (Instagram de Deslizapp) y, si ya abrió uno, «Esperando que te aprueben» o «Crear mi tienda».

El encabezado no cambia; su etiqueta accesible es «Menú de tus tiendas» (más de una) o «Menú de la tienda». «Crear otra tienda»
llega con el PR de grupos de tiendas, debajo de las otras tiendas.

**Cuenta en el admin** (`components/admin/hoja-cuenta.tsx`): el círculo de la derecha del encabezado de `/admin` y `/admin-demo` es
la cuenta (foto de Google o iniciales) y abre una hoja corta con «Ir a mi tienda» (lleva a `/`, el panel de la tienda por defecto de
la cuenta; sin tienda no aparece) y la cuenta con «Cerrar sesión». Ida y vuelta: panel → «Administrar Deslizapp» → admin → cuenta →
«Ir a mi tienda» → panel.

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
"Pedidos", un contador Mandarina con el total de pedidos `nuevo` más solicitudes vigentes del catálogo por registrar
(`components/contador.tsx`, el mismo de las pastillas de filtro).

**Tamaño único de las pastillas** (`Segmentos` y `Chip`, `components/controles.tsx`): salen de los tokens de
`app/globals.css` — `--pastilla-alto` 36 px, `--pastilla-px` 14 px de relleno lateral, `--pastilla-letra` 13,5 px (14 px
desde 390 px de ancho) y `--pastilla-contador` 20 px—; con eso queda ~10 px de aire arriba y abajo del texto y 14 px a los
lados. Para cambiar el tamaño en toda la app se ajusta un solo valor. Toman su ancho natural (texto + relleno) y quedan
alineadas a la izquierda; el área de toque es de 45 px de alto (pseudo-elemento invisible, sin cambiar lo que se ve). Las filas
de `Chip` dentro de formularios (colección, porcentaje) pasan a la línea siguiente si no caben; las de `Segmentos` se desplazan.

**Pastillas de filtro** (`Segmentos`): el número va en el mismo `Contador`
(círculo; con 2–3 cifras se estira a píldora; desde 100, "99+"), a la derecha del
nombre y **oculto cuando es 0**. Es **neutro** por defecto (beige #F1E8D6 con
número Bosque; en la pastilla activa, crema translúcido con número crema); el
**naranja Mandarina se reserva para lo que pide acción** (`atencion` en la
opción de `Segmentos`, constante `PIDEN_ATENCION` en cada pantalla): hoy solo
Pedidos → "Nuevos" y Catálogo → "Agotados", y solo con número > 0. Las demás (por ejemplo Pedidos →
"Cancelados", con el total de cancelados) llevan el contador neutro, y en 0 no muestran número.
Si todas las pastillas caben, se reparten el ancho útil; si no caben **conservan su tamaño y la fila se desplaza en
horizontal** (sin barra visible, con inercia en iPhone): el contenedor sangra hasta los bordes de la pantalla y el
margen lateral va como padding de la fila, así la primera pastilla empieza alineada con el contenido, la última
termina con el mismo margen y las demás se deslizan por debajo del borde en vez de cortarse en el margen. La pastilla
elegida se acerca a la vista con `scrollIntoView` (suave, salvo movimiento reducido) al cambiar de pestaña y al abrir la
pantalla. Aplica a todas las pantallas que usan `Segmentos` (Inicio, Pedidos, Catálogo, Promos y el selector de productos
de "+ Pedido"). Sigue siendo `role="tablist"` con pestañas navegables con teclado.

**Barra de estado** (hora, batería): detrás va el mismo Papel Cálido de la
pantalla (`html`, `body`, `themeColor` y el manifiesto en `#FFF9EE`; el marco más
oscuro solo en pantallas de más de 480 px). Sin franja ni recuadro:
no hay ninguna capa ni borde arriba de las pantallas principales: con
`statusBarStyle: "default"` iOS no deja dibujar detrás de la barra de estado (no
usar `black-translucent`: la hora saldría blanca sobre el crema). El contenido
simplemente se desplaza por debajo de ese límite. (Se probó un borde de
desplazamiento con desenfoque y solo añadía un recuadro: descartado.)
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
- **Hojas apiladas** (ej. "Registrar abono" sobre el detalle del pedido): cada hoja se pinta en un portal en `<body>`, no dentro de la
  de abajo (antes iba anidada en el DOM y los toques de la de arriba subían hasta la de abajo, así que un deslizar cerraba las dos y
  se perdía lo escrito). Solo la de arriba responde a deslizar, tocar el fondo, Escape (y Tab), la X y **"atrás"** del teléfono: una
  hoja apilada guarda una entrada de historial que "atrás" consume, sin tocar la ruta. (Las hojas de ruta —pedido, cliente, promo…—
  siguen cerrándose con su ruta; el resto de las hojas de selección son vistas dentro de la misma hoja.)
- **Aviso al salir:** con cambios sin guardar (`avisarAlSalir` de `Hoja`, o `useAvisarAlSalir(bool)` desde el formulario) cerrar
  (deslizar, fondo, Escape, X o atrás) no cierra: la hoja vuelve a su lugar con un rebote (sin rebote con movimiento reducido) y sale
  un diálogo pequeño `role="alertdialog"`: **"¿Salir sin guardar?"** / "Lo que escribiste se va a perder." con **"Seguir aquí"**
  (principal) y **"Salir"** (contorno). Solo "Salir" cierra; Escape dentro del diálogo = "Seguir aquí"; el foco entra al diálogo y no
  sale con Tab. Guardar con éxito, cerrar desde el padre o cambiar de ruta nunca preguntan. Activo en: Registrar abono (monto o nota),
  + Pedido / venta pasada / Editar pedido (cualquier cambio respecto a como se abrió), Cliente nuevo (algún campo lleno), nota del
  cliente (texto cambiado), producto y promo (cambios respecto al original). No en hojas de solo lectura ni de selección.
- **Nunca en blanco:** las hojas de cliente y de pedido muestran, dentro de la misma hoja, un esqueleto mientras cargan y, si una
  lectura falla, "No pudimos abrir esto." con **"Reintentar"** y **"Volver a clientes / pedidos"**.
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
- **Dona del plan en la cabecera** (botón de 76 px, 64 px si la pantalla es estrecha):
  pista Rosa Suave, arco de productos usados sobre el límite, espacios libres y
  «LIBRES» en el centro, «N de L» debajo. Abre Plan y créditos, igual que el
  anterior «Ver plan». Antes del 80 % el arco es Verde Bosque; desde el 80 %
  es Mandarina y el número da un latido suave al aparecer. Al llenarse, el
  aro es completo y dice «Lleno»; tocarlo abre el plan para subirlo. El SVG
  es decorativo y el botón anuncia los números y la acción.
- **Buscador** "Busca un producto" (filtra por nombre).
- **Filtros** en chips con contador: Todos · Visibles (activos con stock) ·
  Agotados (`stock = 0`) · Ocultos (`activo = false`).
- **Grilla de 2 columnas**. Cada tarjeta: foto 4:5 con esquinas redondeadas;
  arriba a la izquierda una etiqueta ("Agotado" verde, "Oculto" papel, o el
  descuento "−15%" en Mandarina si tiene promo activa); abajo a la derecha
  una sola píldora horizontal Papel con corazón Mandarina y cifra de likes juntos, sin círculo interior. Debajo: nombre, precio (con el de lista tachado si hay
  promo), y "3 en stock" / "Sin stock" / «Sin cantidad guardada» (producto viejo). Los ocultos
  se ven atenuados y los agotados en escala de grises.
- Estado vacío: sin productos → "Tu vitrina está vacía." con el remate «Toca + Producto…» (sin botón al centro: el crear es siempre el flotante); búsqueda o filtro sin resultados (ilustración chica) →
  "No encontramos nada con eso." / "Ni un suspiro. Prueba con otra palabra u
  otro filtro."
- Botón flotante "+ Producto".

**Acciones:**
- Tocar "+ Producto" → formulario de producto (crear).
- Tocar una tarjeta → hoja de vista previa con ficha de solo lectura: miniatura cuadrada de 112 px y bordes redondeados junto a nombre (máximo tres líneas visibles, texto completo accesible), precio vigente con promos, colección, estado y stock. «Editar» abre el formulario existente en `/catalogo/[id]/editar`; cerrar vuelve a la vista previa y conserva Catálogo debajo.
- «Crear pedido» abre el formulario manual existente con ese producto y una unidad preseleccionados si hay stock. El pedido no se guarda ni descuenta stock hasta completar el flujo; al crearlo queda «Por despachar» y el inventario baja una sola vez al despacharlo. Cancelar un pedido por despachar no toca el stock; deshacer un despacho devuelve las unidades.
- Todo producto lleva su cantidad (9 oct 2026): la interfaz ya no ofrece «No llevo la cuenta». La base sigue aceptando `stock = null` (sin migración; hoy 0 de 17 productos lo usan): si un producto viejo lo trae, se muestra como 0 con el aviso «Sin cantidad guardada», sin botones de ajuste (el ajuste atómico necesita una cantidad de base). «Se puede pedir aunque no haya» lo cubre «Por encargo».
- Vista previa y Editar comparten el contenedor «Inventario»: «Stock actual: N», cantidad en unidades junto a −/+, y delta breve («Añadirás 1 unidad» / «Retirarás N unidades») solo cuando cambia. +/− modifica una propuesta, nunca guarda ni baja de cero. «Guardar cambios» y «Descartar» son botones dentro del contenedor, uno junto al otro y del mismo ancho, visibles solo con diferencia. Descartar recupera la cantidad guardada sin perder otros campos editados. El Guardar interno del editor confirma ficha y ajuste juntos; mientras hay ajuste no se duplica el botón general. Sin ajuste, el Guardar general permite guardar solo la ficha.
- Al guardar una disminución se abre la confirmación existente y se pide daño, pérdida, corrección de inventario u otro (requiere nota). Aumentar guarda reposición. Un guardado crea un solo registro con el delta final; cancelar la confirmación conserva la propuesta sin aplicarla.
- Salir, Atrás o ir a Editar/Crear pedido con ajustes pendientes muestra el aviso existente: seguir aquí o descartar y continuar. Ante conflicto de stock se actualiza la base y se permite revisar la propuesta. Un resultado de red incierto exige «Revisar producto e historial» antes de otro intento, sin reenvío automático.
- Cada cambio manual se guarda con tienda, producto, variación, stock anterior y nuevo, motivo, actor y fecha en `ajustes_inventario`; la operación real actualiza el stock y añade el registro atómicamente. Si falla, la vista conserva el stock anterior y muestra el error.
- Un ajuste nunca crea un pedido ni se cuenta como venta. Las ventas siguen el flujo de pedido y descuentan stock al despacharse; deshacer un despacho lo devuelve. «Crear pedido» solo abre el formulario actual con el producto preseleccionado.
- «Ver historial», dentro del inventario, abre «Historial de ajustes» en la misma hoja. Volver recupera campos, propuesta, scroll y foco. La lista compartida `ListaAgrupada` / `FilaLista` muestra solo ajustes confirmados, más reciente primero, variación, anterior → posterior, motivo, nota, fecha/hora de Santo Domingo y actor o su respaldo existente. Carga, vacío «Todavía no hay ajustes.», error/reintento y Ver más se conservan; no se mezclan ventas ni despachos.
- Editar permite ajustar stock con las mismas reglas; no habilita/deshabilita el control en productos existentes. Guardar otros campos no crea ajuste. En un producto nuevo se conserva la definición del inventario inicial.
- Activar/desactivar (interruptor "Visible en el catálogo" del formulario).

**Formulario de producto (crear/editar)** — hoja "Nuevo producto" / "Editar producto":
(Rediseño del 8 oct 2026, `docs/prompts/hoja-producto-rediseno.md`, dibujos en `referencias/hoja-producto-nuevo/`. Mismos datos, mismas funciones de guardado y mismos permisos; solo cambia cómo se ordena.)
- **Foto grande arriba** (`SeccionMedios`): la principal a todo el ancho, cuadrado de bordes redondeados (nunca círculo), con el contador «1 / 10»; debajo, la tira de miniaturas con «Foto o video» para agregar. Tocar una miniatura la pone en grande y abre sus acciones (portada, mover, quitar, retoque); mantener presionado la ordena. Sin fotos: un espacio amplio con borde punteado, cámara y «Agrega la primera foto». Videos y límites como siempre.
- **Nombre y Precio** como campos grandes; el precio con el tipo de letra de las cifras (Fredoka).
- **Una tarjeta** (`data-tarjeta-stock`): «Cosas que cambian» (solo el resumen: sin presentaciones invita a crearlas; con ellas, una pastilla por cosa —«Color · 2», «Tamaño · 3»—; tocar abre el flujo de dos pasos, ver «Presentaciones del producto») y «En stock» (sin presentaciones, el control de siempre —al crear, − / + (arranca en 1); al editar, `ControlInventario` con su historial—; con presentaciones, «N presentaciones · M en total») y, debajo del stock y en la misma tarjeta, **«Por encargo»** (interruptor, con «Cuándo llega» al encenderlo; solo productos, no servicios).
- **Más opciones**, en dos grupos. El primero es una sola tarjeta con dos filas plegables que muestran su valor: Descripción (contador «N / 600» y la línea de la búsqueda) y Ficha técnica (sube, cambia o quita). El segundo: Colección (abre su hoja) y Visible en el catálogo. Abrir o cerrar una fila es instantáneo y no toca el foco. «Detalles» (Esencias Michel) sigue debajo, solo en productos que ya los tienen.
- **Barra fija abajo** (`HojaFijoAbajo`, se oculta con el teclado): «Cómo se ve» y «Publicar» / «Guardar cambios» flotan solos, del mismo ancho (mitad y mitad), con sombra y sin tarjeta ni recuadro detrás. El botón principal queda apagado hasta que haya al menos una foto, nombre y un precio mayor que cero (`lib/hoja-producto.ts`): es la misma regla de antes, que avisaba al tocar. «Cómo se ve» monta el reel real del catálogo del comprador (`components/tienda/reel.tsx`, `catalogo.css`, el tema y la cabecera de la tienda) con el borrador convertido a `ProductoPublico` (`lib/vista-previa-producto.ts`): vive en `/vista-previa-catalogo`, dentro de un iframe del mismo sitio, y recibe el borrador por `postMessage`. Sin pedir, sin carrito y sin escribir: los botones de comprar solo avisan «Así lo verá tu cliente». Lo que el borrador no tiene (likes, opiniones, promo, orden) va neutro. Al editar con stock sin presentaciones y un ajuste pendiente, el botón de guardar lo pone el control de stock, como antes.
- Al final, sin cambios: aviso de permiso, errores del inventario, «Eliminar producto». Un Ayudante lo ve apagado («Esto lo hace quien administra la tienda.»).
- Validación: "Ponle nombre y precio. Lo demás lo hacemos nosotros." / "Falta la foto. El producto es la estrella." siguen en el guardado, por si algo se cuela.
- Tarjeta **"Retocar foto"** (por foto, desde su hoja) — ver pantalla 6.

**Límite del plan:** si el catálogo está lleno, el botón "+ Producto" y el
medidor lo indican, pero la demo no se bloquea.

No hay "Marca o línea" ni "Eliminar producto" en esta entrega (esconderlo
con "Visible" cumple esa función sin romper el historial de pedidos).

**Tarjeta del catálogo en línea** (`components/catalogo/tarjeta-catalogo.tsx`, montada por `seccion-catalogo.tsx`; bajo el titular y el
subtítulo y la dona del plan, encima de los filtros). Reemplaza a la antigua fila de enlace. El estado visible sale de un solo
lugar, `vistaCatalogo()` en `lib/catalogo-estado.ts` (con tests): la tienda pausada manda sobre todo; después `tiendas.catalogo_estado`.
Ocho estados:

1. **Sin catálogo** (la tienda publica sola, `docs/prompts/publicar-catalogo.md`): sin lo mínimo (3 productos visibles con foto,
   `PRODUCTOS_MINIMOS_PARA_PUBLICAR` en `lib/config.ts`, regla en `lib/publicar-catalogo.ts`) dice «Te faltan N productos con foto para
   publicar tu catálogo» con «Crear producto» (lleva a `/catalogo/nuevo`); con lo mínimo, **«Publicar mi catálogo»** abre la hoja
   «¿Publicamos tu catálogo?» (el enlace que tendrá, la lista de lo que no se puede vender —`lib/productos-prohibidos.ts`— y «Al publicar
   aceptas los Términos») → «Publicar» (`publicar_mi_catalogo`) / «Ahora no». Solo la dueña: un colaborador ve el botón apagado y, al
   tocarlo, «Esto lo hace quien administra la tienda.». El flujo manual de ocho estados (`solicitar_catalogo`, `HojaPedirCatalogo`) sigue
   en el código para los catálogos que el equipo arma, pero la tarjeta ya no ofrece «Pedirlo».
2. **Pedido recibido**: solo informa.
3. **Armando tu catálogo**: icono de destellos, "Paso N de 3 · nombre" (Reuniendo tus fotos / Diseñando tu portada / Últimos detalles),
   barra 33 / 62 / 90 %, fila de tres pasos (hecho / en curso / pendiente). Si `catalogo_paso` viene vacío se toma el paso 1.
4. **Listo para revisar**: "Revisar" abre la hoja "Revisa tu catálogo": vista previa, **Publicar mi catálogo** (`publicar_catalogo`) o
   **Pedir cambios** (texto de 1 a 500 con contador, "Enviar cambios" → `pedir_cambios_catalogo`).
5. **Aplicando cambios**: muestra las notas enviadas (2 líneas como máximo).
6. **¡Recién publicado!**: confeti, texto en Caveat y "Compartir" (abre la hoja del catálogo en línea). Solo si se publicó hace menos de 3
   días y no se vio aún en este dispositivo (`localStorage`, clave `deslizapp-catalogo-visto-{tienda}`); se marca visto al tocar
   "Compartir" o a los 6 s en pantalla.
7. **En línea**: una sola fila — punto verde, «En línea» con el enlace y el botón compacto «Compartir» (hoja nativa). Tocar la tarjeta abre
   el catálogo. La celebración «¡Ya estás en línea!» (estado 6) sale al publicar la primera vez. La hoja `hoja-catalogo-en-linea.tsx`
   (abrir, copiar, WhatsApp, cambiar enlace) se abre desde la celebración. No hay «Dejar de mostrarlo» en pantalla por ahora: quien quiera
   dejar de mostrar su catálogo le escribe a Deslizapp (`despublicar_mi_catalogo` sigue en la base, sin usar en la interfaz).
8. **Pausado**: "Ver plan" abre lo mismo que el bloque del plan.

Publicado sin `url_catalogo` https válido (comprobado con `new URL`) se muestra como **Sin catálogo** con "Conectar mi catálogo" (abre Mi
marca acercando el campo del enlace, sin enfocarlo, por el teclado del iPhone). En la demo las tiendas arrancan en "Sin catálogo".

Transiciones: cada estado entra con "entrar" (fade + 10 px hacia arriba + escala .97→1, ~420 ms); si el estado cambia con la pantalla
abierta, la tarjeta vieja se desvanece y entra la nueva. Todo el movimiento se apaga con `prefers-reduced-motion`.

Quién cambia el estado: el **dueño** solo pide (sin→solicitado), pide cambios (revisar→cambios) y publica (revisar→publicado), siempre por
las tres funciones de base de datos, nunca con UPDATE directo. El **equipo** hace solicitado→generando (paso 1→2→3)→revisar y
cambios→revisar, fuera de la app. En la demo, el menú de la tienda trae "Simular avance del catálogo" que hace de equipo.

Actualización en vivo: la tienda se relee al volver a la app (`visibilitychange`) y cada 60 s en solicitado / generando / cambios. Al llegar
a "revisar" con la pantalla abierta sale el aviso "¡Tu catálogo está listo para revisar!"; en Inicio, con el catálogo en revisar, hay un
aviso rosa compacto "¡Tu catálogo está listo!" con "Revisar", que lleva a Catálogo y abre la hoja de revisión.

**Catálogo público de Esencias Michel (provisional):** página estática en `/catalogos/esencias-michel.html`
(`public/catalogos/`; el original queda en `referencias/`), sin sesión (el matcher de `proxy.ts` excluye `/catalogos/`),
`noindex, nofollow` y caché de 5 minutos (`next.config.ts`). Se enlaza guardando esa dirección en `tiendas.url_catalogo`. Es
provisional hasta que exista la plantilla `/tienda/[slug]`.

---

### Presentaciones del producto (tallas, colores, tamaños)

Reemplaza la sección «Opciones» de la ficha del producto (solo `tipo = producto`; diseño en `referencias/presentaciones/` y, para el flujo por pasos, `referencias/presentaciones-por-pasos/`). Se construye con `components/ui/` (`components/catalogo/flujo-presentaciones.tsx`, `ficha-presentaciones.tsx`, `hoja-presentacion.tsx`; lógica pura en `lib/presentaciones.ts`). Todo edita el borrador de la ficha y se guarda con «Guardar cambios» o «Publicar»; los cambios de stock de las que ya existían siguen pidiendo el motivo de ajuste si bajan.
- **Un solo flujo de dos pasos** (`docs/prompts/presentaciones-por-pasos.md`), en una hoja grande con «Paso N de 2» y una barra de progreso. Ya no existen «Agregar presentación» (suelta) ni «Cambiar qué varía» como caminos aparte, ni el filtro «Todas / …», ni la fila de stock repetida.
- **Paso 1, «Qué cambia»:** una lista de tarjetas: lo típico del tipo (`OPCIONES_TIPICAS`) y después Color, Tamaño, Talla, Material, Modelo, Sabor, Tono, las propias (arriba, donde se ven) y «+ Otra cosa» (campo «¿Qué otra cosa cambia?», hasta 20 letras). Tocar una la elige y la expande con sus valores sugeridos más «+ Otro color» / «+ Otra talla» (las propias usan `EditorEtiquetas`); nombre + chevron la colapsa y «Quitar» la saca con sus valores. Hasta 2: al elegir la 2.ª las demás se apagan y dice «Ya elegiste 2: es el máximo. Quita una para elegir otra.». Atajos «XS a XL», «36 a 42», «Única» (Talla). Botón fijo «Siguiente · N presentaciones»; apagado, una línea dice qué falta («Elige al menos un valor de Talla.»). Con 12 valores «+ Otro …» queda apagado y el campo se cierra al llegar a 12, para que la hoja no se mueva debajo del dedo.
- **Paso 2, «Cuántas tienes»:** el resumen (pastillas, «N presentaciones · M en total») con el enlace «Cambiar qué cambia», «Poner a todas», y una fila por combinación con su muestra de color, «Quedan N», «Agotada» u «Oculta», «RD$… · precio propio» y stock − / +. Con dos cosas, agrupadas por la primera (grupos plegables; con más de 24 filas solo el primero abierto). Tocar una fila abre su detalle. «Foto de cada color» vive aquí. Barra flotante: «Atrás» (si se llegó desde el paso 1) y «Listo · M en total» del mismo tamaño, mitad y mitad, misma altura; sin «Atrás», «Listo» ocupa todo el ancho. «Agotada» solo sale en una presentación que ya existía de un producto ya publicado: con 0 recién creada, o en un producto nuevo, se ve «0».
- **Editar** abre directo en el paso 2. **Cambiar lo que existe** (paso 1 al editar; `cambiarEjes`): agregar un valor suma sus filas con 0; quitar un valor se las lleva (pregunta antes, con cuántas y cuánto stock; con pedidos solo quedan ocultas); quitar una cosa junta las que quedan iguales y suma su stock (pregunta antes); sin ninguna cosa, «Volver a un solo stock».
- **El reparto** (nunca se pierde stock en silencio): al agregar una 2.ª cosa, el stock de cada valor viejo se reparte entre sus filas nuevas («Tenías 5 de Plateado. Repártelas entre las tallas: faltan 2.», encabezado «Plateado · 3 de 5», «Todas en S»). Al pasar de stock simple a presentaciones pasa lo mismo con un solo total («Tenías 8. Repártelas entre ellas: faltan 8.», «Ponerlas todas en …»). «Listo» queda apagado, y la barra dice «Faltan N por repartir» o «Te pasaste por N», hasta que cuadre. En un producto nuevo, el 1 que arranca el stock no cuenta como stock que repartir mientras no se toque.
- **Hoja de UNA presentación:** stock, precio («El mismo» / «Uno propio», `CampoMonto`), foto del color (elige entre las fotos del producto), «Ocultar esta presentación» y «Quitar» con confirmación. Si tiene pedidos dice «Ya tiene pedidos: la ocultamos para no perder tu historial» y solo la oculta (`activa = false`); sin pedidos se borra al guardar.
- **«Foto de cada color»** (desde el paso 2): una fila por valor del eje Color (o del primero), con su foto o «Sin foto: se ve la del producto»; el selector usa las fotos del producto y deja «Subir otra» (entra a las fotos del producto). La foto se guarda por `guardar_foto_valor` después de guardar las fotos y las presentaciones.
- **Catálogo del panel:** la tarjeta dice «Desde RD$ X · N presentaciones» con «N agotadas» y «N en total» (o «Hay de todas»). «Por reponer» y «Tu inventario» ya listaban por presentación.
- **Permisos:** todo es del grupo `catalogo`. Un Ayudante las ve pero la fila «Cosas que cambian» solo avisa con «Esto lo hace quien administra la tienda.»; Ver como no escribe (la base lo bloquea y `guardarFotoValor` no está entre las lecturas permitidas).
- Un producto sin presentaciones se ve y se guarda como antes. Pruebas: `npm run probar:presentaciones` (los 17 escenarios del QA, `docs/qa/presentaciones-escenarios.md`), `tests/presentaciones.test.mjs`, `probar:teclado` (precio propio, «Otro color», «¿Qué otra cosa cambia?», valor de una cosa propia).

## 2. Pedidos

**Qué muestra:**
- Titular "Pedidos" + "Del suspiro al chat. Y del chat, aquí."
- Pestañas: **Nuevos · Por despachar · Despachados** (con contador) y **Cancelados** (contador neutro con el total; no pide acción). Si no caben, la fila se desplaza en horizontal y la elegida queda a la vista
  (mapeadas a `estado` — ver `03-modelo-de-datos.md`; los `cancelado` no
  tienen pestaña).
- Tarjeta de pedido: "#1042 · Hace 8 min", etiqueta de origen ("Del
  catálogo" / "Manual"), nombre del cliente, cantidad de productos,
  miniaturas de los productos y total. Las miniaturas de la tarjeta son cuadrados
  de 36 px con esquinas redondeadas, también cuando falta la foto. Conservan el
  recorte centrado de la imagen; los avatares de clientes mantienen su forma.
- **Listas largas por tramos** (`components/ver-mas.tsx`): cada pestaña muestra
  los 30 más recientes y, al final, "Ver más antiguos" (con "Mostrando 30 de N")
  agrega 30 cada vez; desaparece cuando no queda nada. Los contadores de las
  pastillas siguen mostrando el total. Al cambiar de pestaña o de tienda vuelve a
  empezar en 30. Sin animación por elemento. La misma lógica se usa en Clientes
  ("Ver más clientes", ~110 en la demo, también al buscar) y en las pestañas de
  Promos. Probado con la lista completa cargada (223 despachados): desplazamiento
  de punta a punta a 3.000 px/s con la CPU 4 veces más lenta, mediana de 16.7 ms
  por cuadro y 1 de ~590 cuadros por encima de 50 ms.
- Estado vacío por pestaña: Nuevos "Todo al día. Disfruta el silencio. Dura
  poco."; Cancelados "No tienes pedidos cancelados."; Por despachar "Nada por despachar."; Despachados "Aún no hay
  despachos."; sin ningún pedido "Aún no tienes pedidos. Cuando alguien pida por
  tu catálogo, aparece aquí."
- Aviso (toast) cuando entra un pedido nuevo mientras se está viendo la pantalla.
- Contador de pedidos nuevos sobre el ícono de "Pedidos" en la barra.

**Acciones:**
- Tocar un pedido → Detalle de pedido.
- Botón **"+ Pedido"** para crear un pedido manual (ventas que no llegaron
  por el catálogo): elegir cliente, elegir productos y cantidades, aplicar
  descuento opcional (botón "+ Agregar cupón" que abre una lista de cupones, en vez de escribir el código). Entra directo en estado
  `por_despachar` ("Pedido #1043 guardado. Está en Por despachar.").
  **Por qué:** "Nuevos" son los pedidos que llegan del catálogo y esperan
  confirmación del dueño; un pedido manual lo arma el dueño después de hablar
  con el cliente, así que ya nace confirmado (decisión tras el repaso final:
  se queda así).
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
- **Venta que ya hice** (registrar el pasado): arriba de "Guardar", el interruptor
  **"Es una venta que ya hice"**. Al activarlo aparecen **"Fecha de la venta"**
  (`<input type="date">`, por defecto hoy, máximo hoy: no hay fechas futuras; se
  guarda a mediodía hora local, o "ahora" si es hoy antes del mediodía) y la
  casilla **"Descontar del stock"**, apagada por defecto ("Déjala apagada si vendiste
  esto antes de cargar tu inventario."). El botón pasa a **"Guardar venta"** y el
  aviso es "Venta #N guardada con fecha 10 de septiembre." La venta entra directo
  como `despachado` con esa fecha en `creado_en` y `despachado_en`, y la app abre
  la pestaña Despachados. El stock solo baja si la casilla está marcada (y nunca
  queda negativo). Si la fecha es anterior al primer pedido del cliente, esa pasa
  a ser su "primer pedido". Con el interruptor apagado todo funciona como antes.
  Los precios son los que muestra el formulario (con promo de colección o producto);
  el Resumen, "Repite" y los más vendidos usan la fecha del pedido, así que la venta
  cae en su periodo real. En modo real llama a la RPC `registrar_venta_pasada`
  (errores `fecha_invalida`, `sin_productos`, `items_invalidos`, `producto_no_encontrado`,
  `cliente_no_encontrado`, `tienda_no_encontrada` y `stock_insuficiente: <producto>`
  salen en español); como la RPC suma cantidad × precio sin el código de promo, la app
  ajusta después el `total` para que coincida con el que se vio. En la demo se hace lo
  mismo en `lib/data/pedidos.ts`.
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
- Fecha y origen ("Ayer, 6:12 p. m. · manual"), "Pedido #1040" y estado.
  En despachados, "Despachado. Final feliz." aparece arriba como texto con check,
  sin fondo ni apariencia de botón. Los demás estados mantienen su chip.
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
- Si está `despachado`: debajo de **"Editar pedido"** aparecen **"Descargar factura"** y
  **"Compartir"**. Descargar abre una hoja con las opciones PDF e imagen; usa el recibo
  visual del catálogo en línea. Compartir abre el selector nativo del teléfono con la imagen
  y un texto listo para enviar. Es un comprobante sencillo, sin valor fiscal NCF/RNC.
- Al presionar "Despachar pedido":
  - `estado` pasa a `despachado`, se registra `despachado_en`
  - el `stock` de cada producto del pedido se descuenta según `cantidad`
  - si el stock de un producto llega a 0, se refleja como "Agotado" ahí mismo
  - aviso: "Despachado. {producto} se agotó y ya sale así en el catálogo." (si
    algo se agotó) o "Despachado. El stock ya se enteró."
  - si algún producto no tiene stock suficiente, no despacha y avisa: "No
    alcanza el stock de {producto}."

**Cupón en el detalle** (solo en `nuevo` y `por_despachar`): arriba del Subtotal hay una fila con el botón **"+ Agregar cupón"**
(un círculo pequeño con "+" en Verde Bosque a la izquierda del texto; no hay otro "+" a la derecha) o, si ya tiene uno, el
**ticket compacto** del cupón elegido con **"Cambiar"** y **"Quitar"**. Tocar el botón (o "Cambiar") abre, dentro de la misma
hoja, la vista **"Elige un cupón"** (`components/pedidos/selector-descuento.tsx`, con botón de volver, como los selectores de
cliente y de producto):
- Primero **"Sin descuento"**: fila simple con borde punteado y sin muescas.
- Luego los cupones que se pueden usar, cada uno como **ticket compacto** (76 px de alto): el mismo ticket de la pestaña Promos
  (`components/promos/ticket-promo.tsx`, que usan `TarjetaPromo` —tamaño normal— y este selector —compacto—: forma con muescas,
  línea punteada, porcentaje grande en el talón, mismos colores) con el nombre, el código en caja punteada y "usada 3 de 10" /
  "usada 3 veces". Cada ticket es un botón (`aria-label` "Descuento AAAH10, 10 por ciento, usada 1 vez", `aria-pressed`, 86 px de
  área tocable con su marco).
- Al final, atenuados y sin poder tocarse, los que no se pueden usar, con una etiqueta corta (Pausado, Vencido, Programado,
  Agotado). La regla de "se puede usar" es `razonNoUsable` (`lib/promos.ts`).
- El elegido se marca con borde Verde Bosque y un check dentro de un círculo (sin sombras nuevas). Sin cupones creados: estado
  vacío con el botón "Crear un código en Promos".
- **Al elegir**: el ticket hace un pop (escala 1 → 1,03 → 1, 200 ms), su check aparece con escala y fundido, los demás se
  atenúan y, pasado el pop (~220 ms), la vista se cierra. En la pantalla de origen, la fila pasa de "+ Agregar cupón" al
  ticket (y al revés al quitarlo) con fundido y un desplazamiento de 8 px; la altura de la fila cambia de una vez, porque la regla
  de movimiento prohíbe animar el layout (`docs/08-movimiento.md`). Con movimiento reducido no hay escala ni desplazamiento, solo
  opacidad, y la vista se cierra sin espera.
Elegir (o quitar) recalcula los precios unitarios (`precioConPromo`, la misma función de "+ Pedido") y el total (subtotal menos el
descuento); se guardan `pedido_items.precio_unitario`, `pedidos.total` y `pedidos.codigo_promo`. El Subtotal nunca incluye el
cupón: entre Subtotal y Total aparece "Descuento · CÓDIGO". Un pedido que ya usa un cupón lo **conserva** aunque el cupo se haya
llenado (ya cuenta en los usos), pero ningún otro pedido puede elegirlo. En `despachado` y `cancelado` el cupón solo se muestra:
primero hay que volver a `por_despachar` desde la barra de pasos. La misma fila y la misma vista sirven en "+ Pedido", "Editar
pedido" y el detalle, con la misma regla y el mismo cálculo (`razonNoUsable` / `buscarCodigoPromo` en `lib/promos.ts`;
`calcularLineas` / `recalcularConCodigo` en `lib/data/pedidos.ts`). En la demo se hace lo mismo (`aplicarCodigoAlPedido`).

**Editar pedido** (acción secundaria: botón de contorno en píldora —borde fino, sin relleno, 44 px— debajo del botón principal; en `nuevo`, `por_despachar` y
`despachado`, no en `cancelado`): abre el MISMO formulario de "+ Pedido" (`hoja-pedido-nuevo.tsx`, ruta
`/pedidos/[id]/editar`) con el título **"Editar pedido #N"**, ya lleno con cliente, productos, cantidades, código y fecha.
Guardar actualiza ese mismo pedido (mismo número; "Pedido #N actualizado.") y vuelve al detalle.
- `nuevo` / `por_despachar`: se cambia todo; los precios y el total se recalculan como en "+ Pedido". El interruptor
  **"Es una venta que ya hice"** funciona igual que al crear (fecha máx. hoy + "Descontar del stock", apagada): si se
  enciende y se guarda, el pedido pasa a `despachado` con esa fecha ("Venta #N guardada con fecha …"); apagado, conserva su
  estado.
- `despachado`: solo se cambian el cliente y la fecha (el campo de fecha se ve siempre, con el mismo tope de "no futura").
  Los productos, cantidades y el descuento se ven atenuados y sin poder tocarse. Sobre la lista hay un aviso corto, en un recuadro naranja suave (Mandarina): "¿Quieres
  cambiar los productos o las cantidades? Eso se hace desde los pasos del pedido." con el botón de contorno **"Ir a los pasos
  del pedido"**. Al tocarlo se cierra el editor SIN guardar y se vuelve al detalle de ese pedido, donde el paso anterior de la
  barra (el que sirve para retroceder) hace un destello breve, una sola vez (~600 ms; con movimiento reducido, solo un resalte
  fijo). Si el cliente o la fecha ya cambiaron, antes pide confirmación: "Tienes cambios sin guardar. ¿Salir de todos modos?"
  ("Seguir editando" / "Salir"). No aparece el interruptor de "venta que ya hice".
- Real: RPC `editar_pedido(p_pedido_id, p_cliente_id, p_items, p_codigo_promo, p_fecha, p_ya_hecho, p_descontar_stock)`; sus
  errores (`pedido_no_encontrado`, `pedido_no_editable`, `fecha_invalida`, `cliente_no_encontrado`, `sin_productos`,
  `items_invalidos`, `producto_no_encontrado`, `stock_insuficiente: <producto>`) salen en español. Como la RPC suma cantidad ×
  precio sin el descuento del código, la app ajusta después el `total`. Demo: `modificarPedido` en `lib/data/pedidos.ts`.

**Pago (ventas a crédito)** (`components/credito/pago-del-pedido.tsx`, entre los productos y las acciones; diseño en
`referencias/credito-abonos/`). Los abonos y saldos vienen con el pedido (`pagado`, `saldo`, `abonos`).
- **De contado**: una línea pequeña "Pagado" con check y, si el pedido no está cancelado, **"Cambiar a crédito"** (pregunta "¿Dejar
  este pedido a crédito? Quedará debiendo RD$X.", con las pastillas de fecha y "Sí, dejarlo a crédito" / "Mejor no").
- **A crédito**: tarjeta **"Pago"** con la etiqueta "A crédito"; **"Debe"** en grande (Mandarina texto `#c24e18`, Fredoka 38),
  "Pagó RD$X de RD$Y", barra de progreso (crece con `scaleX`, 600 ms), la fecha acordada ("Quedó en pagar el 15 oct · faltan 15 días";
  atrasado: punto que late y **"Atrasado N días"**; sin fecha: "Sin fecha acordada") y la lista de abonos (fecha, método, nota, monto).
  Cada abono es una **fila** (`FilaLista`: icono, "Abono · Transferencia" con puntos suspensivos, fecha debajo, monto y flecha) y TODA la
  fila abre la hoja **"Abono"** (`hoja-detalle-abono.tsx`, apilada sobre el detalle): monto en grande, cómo pagó, fecha, a qué pedido se
  aplicó y la nota si hay; abajo **"Editar abono"** (secundario, ancho completo) y **"Borrar abono"** (terciario peligro, abre la Alerta
  "¿Borrar este abono? La deuda vuelve a subir RD$X."; al borrar se cierra la hoja). No hay "Borrar" en cada fila. Botones **"+ Registrar abono"**
  (principal) y **"Recordarle por WhatsApp"** (contorno; solo con teléfono y deuda). Los cambios de saldo se anuncian con `aria-live`.
- **Colores en el flujo de crédito** (+ Pedido / venta pasada / Editar pedido, "Registrar abono" y "Cambiar a crédito"; las pastillas de
  filtro de Pedidos, Clientes, Catálogo y Promos no cambian): una **opción elegida** (`tono="opcion"` de `Chip` y `Segmentos`,
  `role="radio"` dentro de `GrupoOpciones`) va en **Rosa Suave con borde Verde Bosque de 1,5 px y un check en círculo a la izquierda**
  (no depende solo del color); la libre, blanca con el borde de las pastillas. La **acción principal** (una por pantalla) va en Verde
  Bosque lleno con texto Papel Cálido; la **secundaria** ("Mejor no", "Recordarle por WhatsApp") en contorno Verde Bosque; la que
  **borra** ("Sí, borrar" el abono) en contorno y texto de peligro. Mandarina queda para llamar la atención (deuda, "Atrasado", botón
  flotante), nunca en pastillas ni botones de estos formularios.
- **Editar abono** (`hoja-abono.tsx` con `abono=`; RPC `editar_abono`): la MISMA hoja de registrar, apilada sobre la hoja "Abono", con
  título "Editar abono", monto, método, fecha y nota ya llenos, sin botones rápidos ni reparto entre pedidos, y "Guardar cambios".
  El abono sigue en su pedido. El monto no puede pasar de lo que el pedido debía antes de ese abono (su saldo + el monto viejo): el campo
  dice "Lo máximo para este abono es RD$N". Con cambios sin guardar, salir pregunta "¿Salir sin guardar?". Al guardar: aviso "Abono
  actualizado", se cierra la hoja de edición, y se refrescan la hoja "Abono", la tarjeta Pago (pagado, saldo, barra) y las listas
  Clientes / Por cobrar / Inicio (derivan de los pedidos, así que se recalculan solas). Misma firma en demo y Supabase (`editarAbono`).
- **Hoja "Registrar abono"** (`hoja-abono.tsx`, una hoja encima del detalle): "<Cliente> debe RD$X del pedido #N" (o "en N pedidos"
  desde la cuenta del cliente), monto grande con teclado numérico (solo enteros), botones rápidos "Todo · RD$X", "Mitad · RD$X",
  RD$500 y RD$1,000 (solo los que no superan la deuda), método (Efectivo / Transferencia / Otro), fecha (hoy; una pasada si hace falta),
  nota opcional (200) y el aviso en vivo "Después de este abono debe RD$X" o "Con este abono queda saldado". "Guardar abono" queda
  deshabilitado con monto 0 o mayor que la deuda ("Te debe RD$X; no puedes abonar más que eso."). Al guardar: aviso "Abono guardado".
- **Saldado** (`tarjeta-saldado.tsx`): cuando un abono deja el saldo en 0, el detalle muestra por única vez la tarjeta verde con
  confeti, el sello "SALDADO", el texto a mano "¡Terminó de pagar!", "<Nombre> pagó los RD$X en N abonos, en N días." y "Darle las gracias
  por WhatsApp". "Una vez" = una marca en este dispositivo por pedido (`deslizapp-saldado-visto-{pedido}`); al abrir un pedido ya
  saldado solo se celebra si el último abono se registró hace menos de 3 días y no se vio. Después queda como pedido pagado ("Pagado")
  con su historial. Sin movimiento (reducir movimiento) queda quieta.
- Un pedido **cancelado** no genera deuda (saldo 0) y no muestra "Debe".
- **+ Pedido, venta pasada y Editar pedido** llevan la tarjeta **"¿Cómo te paga?"** (`campos-pago.tsx`): "Pagó todo" / "A crédito"
  (`Segmentos`). A crédito: **"Te dio ahora (opcional)"** (teclado numérico; no puede superar el total), método en pastillas,
  **"¿Cuándo quedó en pagar?"** ("En 1 semana", "Fin de mes", "Elegir fecha" con campo de fecha, "Sin fecha") y el aviso "Queda debiendo
  RD$X. Te aviso el <fecha> si no ha pagado.". Si lo que dio iguala el total, el pedido se guarda como "Pagó todo" y no registra abono.
  Al crear a crédito, primero se crea el pedido con `pago_modo = 'credito'` y su fecha, y después se registra el abono inicial
  (`registrar_abono` con el pedido fijo; en la venta pasada, con la fecha de la venta). En **Editar pedido**, con abonos no se puede
  volver a "Pagó todo" (se explica por qué; hay que borrar los abonos) y sí se puede cambiar la fecha acordada.
- En la **lista de Pedidos**, un pedido a crédito con saldo muestra la etiqueta **"Debe RD$X"** (mandarina suave); el saldado, nada.
- Lógica en `lib/credito.ts` (reparto, saldo, atraso en hora de Santo Domingo, cuentas por cobrar, recordatorio; con pruebas en
  `tests/credito.test.mjs`); demo en `lib/data/creditos.ts` y `lib/data/pedidos.ts`; real: RPC `registrar_abono` / `eliminar_abono`
  y el modo de pago con UPDATE de `pago_modo` y `pago_fecha_acordada` (`lib/data/supabase.ts`).

**Volver a un paso previo** = tocar un paso ANTERIOR de la línea de avance (no hay botón de texto aparte):
- Cada paso anterior es un botón ("Volver a Confirmado") con área de 44 px de alto que incluye barra y etiqueta (la barra sigue
  delgada); se distinguen solo por el color (verde fuerte de los pasos ya alcanzados) y por el feedback al tocar, sin subrayado. El paso actual y los futuros no son botones (avanzar es con el botón principal).
- Desde `por_despachar` → Recibido (`nuevo`): directo. Aviso: "Pedido #N volvió a Recibido."
- Desde `despachado` (a cualquier paso anterior): confirmación breve en la misma hoja ("Se devolverá el stock de los
  productos. ¿Volver a Confirmado?", "Sí, volver" / "Mejor no"); devuelve el stock de cada producto según `cantidad` (los de
  `stock = null` no cambian), quita `despachado_en` y deja el pedido en `por_despachar`; si el destino es Recibido, después lo
  pasa a `nuevo`. Real: RPC `deshacer_despacho(p_pedido_id)` (errores `pedido_no_deshacible` y `pedido_no_encontrado` en
  español). Demo: lo mismo en `lib/data/pedidos.ts`.
- `cancelado`: botón principal **"Reabrir pedido"** (pasa a `nuevo`; "Pedido #N reabierto.") y, debajo, en rojo,
  **"Eliminar pedido"**: confirmación "Se borrará para siempre y no se puede recuperar. ¿Eliminar el pedido #N?" (Sí, eliminar
  / Mejor no); al terminar cierra el detalle y avisa "Pedido #N eliminado." Real: RPC `eliminar_pedido` (solo cancelados;
  errores `pedido_no_encontrado`, `solo_cancelados`). Demo: se borra del almacenamiento local con sus productos. Los números
  de pedido no se reutilizan: quedan huecos.
- La línea de avance, las pastillas de Pedidos, el número de la barra y los totales del Resumen se calculan
  desde el estado, así que se actualizan solos. «Repite» cuenta solo los despachados:
  un pedido reabierto deja de contar para esa etiqueta. En Supabase, el trigger
  de la base también recalcula `pedidos_count` al cambiar `estado`.

---

## 4. Clientes

**Filtro "Deben"** (ventas a crédito): bajo el buscador, `Segmentos` "Todos" · **"Deben"** con contador (mismo estilo que Cancelados en
Pedidos). En "Deben" aparece la tarjeta Verde Bosque **"Por cobrar"** (total, "N clientes · N pedidos"
y "Cobrado este mes: RD$X" = abonos del mes en hora de Santo Domingo) y la lista, **una fila por cliente** ordenada: primero los
atrasados (más días primero), luego los que tienen fecha (la más próxima primero), luego los sin fecha (la deuda más vieja primero).
Cada fila: inicial en círculo rosa, nombre, "Pedido #N · pagó RD$X de Y" o "N pedidos · el más viejo hace N días", etiqueta
("Atrasado N días" mandarina suave, "Paga el 15 oct" menta, "Sin fecha acordada" arena), lo que debe en Mandarina texto y un botón
redondo de WhatsApp de 44 px (solo con teléfono; abre el recordatorio). Tocar la fila (en cualquier parte) abre la cuenta del cliente: toda la tarjeta es un enlace real (el botón de WhatsApp es otro enlace
en su esquina). El buscador también
filtra esta lista. Inicio abre directo en "Deben" con su línea "Por cobrar".

**Cuenta del cliente** (`components/credito/cuenta-cliente.tsx`, en el detalle del cliente, solo si debe algo): tarjeta "Te debe" con
el total y su estado, "En N pedidos. Los abonos se aplican primero al más viejo." y el historial mezclado de compras a crédito y abonos
(del más reciente al más viejo; cada renglón abre su pedido); vista previa del recordatorio y botones **"Recordarle"** (WhatsApp) y
**"+ Abono"** (hoja de abono sin pedido fijo: reparte del más viejo al más nuevo).

**Recordatorio por WhatsApp**: `https://wa.me/<teléfono en dígitos, con 1 delante si tiene 10>` con "¡Hola, Marleny! Te escribe
<nombre de quien vende>, de <tienda>. Te recuerdo con cariño que quedó pendiente RD$X. Cuando puedas me avisas. ¡Gracias!". **Nunca se
envía solo**: siempre lo abre el dueño desde su teléfono.

**Qué muestra:**
- Titular "Clientes" + "Los que ya dijeron aaah. Y los que están por decirlo."
- Buscador "Busca un cliente".
- Dona de 76 px en la cabecera (64 px en pantallas estrechas), con total en el
  hueco y «N repiten» debajo. Tres partes: **Repiten** (Verde Bosque),
  **Compraron una vez** (Mandarina) y **Sin comprar todavía** (arena, con borde
  en la leyenda). Si no hay clientes, solo se ve la pista y el 0. Tocar la
  dona abre la hoja «Tus clientes»; el botón anuncia los tres números.
- Pastillas: **Todos** | divisor decorativo | **Deben**, **Repiten**, **Nuevos**,
  **Dormidos**, **Del catálogo**. Cada una muestra su contador; si es 0 se
  oculta salvo que esté elegida. Buscador y filtro actúan juntos. Dormidos
  ordena por más tiempo sin comprar; Nuevos por primera compra más reciente;
  Repiten por mayor número de compras. Cada filtro tiene un vacío amable.
- Definiciones, calculadas solo con pedidos **despachados** de la tienda:
  Repiten, 2 o más; Compraron una vez, 1; Sin comprar todavía, 0. Nuevos:
  primera venta en los últimos 30 días civiles de Santo Domingo. Dormidos:
  al menos una venta y última hace 60 días civiles o más. Del catálogo:
  `origen = 'catalogo'`; A mano: `origen = 'manual'`. «Deben» conserva su
  cálculo de cuentas por cobrar y su tarjeta verde.
- Hoja **«Tus clientes»**: dona de 148 px, «1 de cada N vuelve a comprar» o
  «Nadie repite todavía» y porcentaje de ventas despachadas que dejaron los
  clientes que repiten (se omite si no hay ventas). Su leyenda abre los filtros
  Repiten, Compraron una vez y Sin comprar; los dos últimos son temporales,
  sin pastilla fija. Cuatro cuadros abren Nuevos, Dormidos, Del catálogo y A
  mano. La tarjeta «Tu próxima jugada» encabeza el contenido, antes de la dona, sustituye «Escribirle a los dormidos» y abre una galería dentro de la misma hoja. Tiene un brillo granulado suave que no tapa su texto. En el filtro Dormidos,
  cada cliente con teléfono tiene un botón de WhatsApp con mensaje preparado,
  vendedora, tienda y enlace del catálogo en línea si existe. Nunca se envía
  automáticamente.
- **Tu próxima jugada:** la tarjeta del resumen destaca el grupo elegible más grande; en empate gana Volver a saludar, El primer hola, Segundo aaah, Gracias por volver. Texto y baraja ocupan columnas separadas. Cuatro cartas con borde fino, ilustraciones decorativas, degradado hacia Papel Cálido bajo los textos y un chevron decorativo llevan a una galería de dos columnas y a detalles con porcentaje, explicación, consejo y clientes. Se ocultan jugadas sin clientes elegibles y se muestra un vacío amable si no hay ninguna. La navegación interna permite volver de detalle a galería y de galería a resumen sin apilar hojas; «Escribir» abre una hoja apilada con tres borradores locales para la jugada (cercano, directo y catálogo si existe enlace HTTPS). La dueña elige y puede editar antes de abrir WhatsApp; la app no envía mensajes. «Sin WhatsApp · Ver datos» lleva a la ficha del cliente. Galería y detalle usan una transición difusa de 480 ms: expansión desde la tarjeta y revelado vertical respectivamente. La luz continua mueve tres manchas independientes dentro de un recorte fijo, con grano estático. Un pulso visible de 520 ms responde a abrir galería, elegir estrategia, abrir o elegir borrador y «Ver más clientes», sin acumularse con toques repetidos; con movimiento reducido aparecen directamente. El contenido desplazable de todas las hojas permanece bajo el desenfoque y la cabecera fija.
- Los grupos salen únicamente de compras `despachado` de la tienda activa (`despachadoEn`, o `creadoEn` si falta), sin fechas futuras o inválidas. Volver a saludar: última compra hace al menos 60 días civiles en Santo Domingo. Segundo aaah: una compra. Gracias por volver: dos o más. El primer hola: ninguna. Un pedido `nuevo` o `por_despachar` excluye al cliente de **todas** las recomendaciones; un pedido cancelado no cuenta. Una persona puede entrar en varias jugadas. El porcentaje divide elegibles entre todos los clientes de la tienda, incluidos los que tienen pedido pendiente. Los cálculos se actualizan con datos y cambio de día local, sin tabla ni tarea programada.
- Las listas se ordenan por antigüedad sin compra, compra única más reciente, mayor número de compras y nombre, respectivamente; cargan cinco filas y «Ver más». La cifra incluye a los clientes sin teléfono; estos tienen «Sin WhatsApp · Ver datos». «Escribir» solo abre WhatsApp con texto editable, sin envío automático. El enlace HTTPS válido del catálogo se agrega si existe. No se infiere si hubo respuesta o si la vendedora escribió.
- Lista: iniciales en círculo, nombre, etiqueta "Repite" si aplica, y "2
  pedidos · RD$3,721" (total gastado en pedidos despachados).
- **Todo se deriva de los pedidos** de la tienda activa (no se marca a mano):
  el número de pedidos cuenta los **recibidos** (no cancelados: los nuevos y por
  despachar cuentan; los cancelados no); el total gastado y la última compra
  cuentan solo las **ventas** (pedidos despachados, por su fecha de despacho).
  «Repite» aparece con 2 o más ventas despachadas y se actualiza al despachar.
- El buscador filtra por nombre (sin importar tildes) o por WhatsApp (por dígitos).
- Cliente sin pedidos: "Todavía no pide. Todavía."
- **Editar cliente**: al final de la hoja aparece **«Borrar contacto»**. Si tiene pedidos, abre una hoja con dos opciones: conservar los pedidos y abonos en el historial sin nombre asociado, o borrarlos también con el detalle de productos; borrar el historial pide una segunda confirmación. Sin pedidos, confirma el borrado del contacto. En demo y Supabase se conserva el mismo comportamiento; la RPC `borrar_cliente` aplica el cambio de forma atómica y aislada por tienda. Borrar el historial no cambia el stock: se elimina el registro, no se revierte una venta real.
- Búsqueda sin resultados: "Nadie con ese nombre. Todavía."

**Acciones:**
- Tocar un cliente → hoja con su WhatsApp ("Escribir"), pedidos, total gastado,
  última compra e historial; tocar un pedido del historial abre su detalle.
- **"Editar datos"** en esa hoja abre otra hoja apilada con nombre y WhatsApp ya llenos. El nombre es obligatorio; el WhatsApp
  puede quedar vacío, pero si se escribe debe ser dominicano y no puede pertenecer a otro cliente de la tienda. Al guardar vuelve
  al detalle y muestra "Datos actualizados."; cerrar con cambios sin guardar pide confirmación.
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
- Pestañas con contador: **Activas · Programadas · Terminadas** (la pestaña sale
  del estado por fechas — ver `03-modelo-de-datos.md`). La tarjeta muestra el estado visible: si la promo está
  **pausada**, "PAUSADA"; si es un código con límite y sus usos (pedidos no cancelados) llegaron al límite, "AGOTADA"; en los
  demás casos, el de las fechas. Una terminada sigue terminada. Pausada y agotada se ven apagadas (crema) y siguen en su pestaña.
  Los códigos con límite muestran "Usada N de L pedidos"; sin límite, "Usada N pedidos".
- En el formulario de una promo de **código**: campo opcional **"¿Cuántas veces se puede usar?"** (entero ≥ 1; vacío = sin
  límite) y, en todas las promos, el interruptor **"Pausar promo"**. Una promo pausada o agotada **nunca** se aplica a un pedido
  nuevo ni al precio de un producto (regla central en `lib/promos.ts`; el límite se controla en la app, la base solo guarda
  `limite_usos` y `pausada`).
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
`/promos/[id]/compartir`): botón "Compartir promo" en el detalle de cada
promo activa o programada (las terminadas no) y, al crear una promo, el aviso
"¡Lista! ¿La compartes ahora?" con "Compartir" / "Después". La hoja (grande, por
el campo de texto) tiene, de arriba abajo:
1. **Vista previa** del cupón con la marca de la TIENDA (`CuponTienda`).
2. **Mensaje** como un globo de chat enviado (`components/globo-mensaje.tsx`,
   `GloboMensaje`, reutilizable): panel beige liso (#EFE7DC, sin papel tapiz ni
   marca de WhatsApp) con el globo verde claro (#D9FDD3) a la derecha, colita,
   mensaje COMPLETO (enlace azul y subrayado), hora en 12 h y dos checks azules
   (SVG propio) abajo a la derecha. "Editar mensaje" (o tocar el globo) lo vuelve
   editable en el mismo globo (textarea transparente sobre el texto, crece solo;
   el foco va en el mismo toque, `flushSync`); el link pasa a "Listo". Vacío:
   aviso y "Enviar" deshabilitado. El enlace ("Míralo aquí: …") es el
   `url_catalogo` de Mi marca y solo va si existe; sin él, se quita la frase. Ya
   no se usa el dominio deslizapp.com.
3. **Enviar** (único botón, Mandarina): `navigator.share` con la imagen PNG + el
   texto; si el navegador no comparte archivos, solo el texto; sin
   `navigator.share` (escritorio) copia el mensaje y avisa "Mensaje copiado".
   Al compartir imagen + texto también copia el mensaje y avisa "Te copiamos el
   mensaje por si WhatsApp no lo pega": en iOS, WhatsApp puede descartar el
   texto cuando recibe imagen + texto (comportamiento conocido de WhatsApp; no
   verificable en el entorno de pruebas, se comprueba en el iPhone).
4. Discreto, como texto con enlaces: **Exportar como imagen · PDF**. Imagen: el
   PNG 1080×1350. PDF: una página con el cupón (`lib/pdf-imagen.ts`, PDF mínimo
   con el JPEG del cupón; sin librerías), para imprimir y pegar en la tienda.
- Plantillas por tipo en `lib/mensajes-promo.ts` (código, colección, producto; con
  o sin fecha de fin; programada: "desde/del … al …").
- Imagen 1080×1350 dibujada en un canvas (`lib/imagen-promo.ts`): fondo claro
  derivado de la marca (el principal mezclado 90 % con blanco), logo o iniciales
  y nombre arriba, el cupón grande al centro, colores y fuentes del estilo de la
  tienda (se espera a que carguen) y al pie, discreto, "Hecho con Deslizapp" (se
  queda; lo controla `MOSTRAR_MARCA_DESLIZAPP_EN_CUPON` en `lib/config.ts`, para
  poder quitarlo por plan más adelante); se
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
- Tocar una tarjeta abre `/promos/[id]`, una hoja de solo lectura que conserva la
  pestaña elegida. El cupón existente es protagonista; debajo se ven nombre,
  porcentaje, estado visible calculado (incluidas pausada y agotada), tipo,
  destino, inicio y vencimiento o «Sin fecha de fin». En códigos se muestran
  pedidos no cancelados que lo usaron, límite o «Sin límite» y usos restantes
  nunca negativos. La hoja tiene carga, error con reintento y estado de promo
  inexistente; una promo de otra tienda no se revela. «Editar promo» abre
  `/promos/[id]/editar`; «Compartir promo» abre la hoja existente. Al cerrar
  edición o compartir se vuelve al detalle, también con el botón atrás.
  En terminadas solo está «Duplicar promo».
- Editar (el tipo no cambia) y "Terminar promo" con confirmación. Una terminada
  no se reactiva ni se edita: se **duplica como nueva** (`/promos/nueva?copiar=id`).
  Al tocar otro tipo en edición, una hoja `Hoja` compacta se superpone al editor
  con el título «Nah, ah… así no.» y la explicación «Cambiar el tipo cambia cómo
  se aplica el descuento. Para mantener el historial en orden, crea otra promo.
  Te dejamos la copia lista.». Acciones: «Sí, crear otra promo» y «Me quedo con esta».
  Cerrar el aviso conserva el borrador y el foco vuelve al botón del tipo intentado.
  Solo la hoja superior responde a fondo, gestos, Escape y atrás. No hay aviso inline.
  La primera abre el mismo formulario nuevo (`?copiar=id&tipo=...`) con el tipo elegido desbloqueado.
  Copia nombre y porcentaje guardados, limpia campos incompatibles (código, producto, colección y
  límite de usos exclusivo de código), y empieza hoy sin vencimiento ni pausa, como la duplicación.
  Con cambios sin guardar se usa «¿Salir sin guardar?»: «Seguir aquí» conserva el borrador;
  «Salir» autoriza descartarlo para partir de los datos guardados. La creación usa la validación existente.
  No se copian usos, pedidos ni identidad. Cancelar no modifica la original.
  Tras guardar, si la original no terminó, se ofrecen «Terminar la anterior» y «Dejar ambas».
  Terminar requiere además la confirmación existente «Sí, terminar»; «Mejor no» conserva ambas.
  Cerrar esta elección también deja ambas. Una original ya terminada no recibe esta elección.
  Comprobación local: `node scripts/probar-reemplazo-promos.mjs` y `node scripts/probar-detalle-promos.mjs`.
- "+ Pedido" tiene el botón "+ Agregar cupón": elige un cupón de la lista (solo los que se pueden usar), aplica el % al
  total y guarda `codigo_promo`. El detalle del pedido muestra el
  descuento y "Simular pedido del catálogo" usa los precios con promo vigente.

### Mi marca

Identidad visual de cada tienda: la llevan el cupón que se comparte (tarjeta e
imagen). **El panel sigue siempre en verde Deslizapp**; las tarjetas de la lista
de Promos también.

**Entrada:** menú de la tienda (tocar el nombre en el encabezado) → "Mi marca".
Hoja grande (`components/marca-tienda/hoja-mi-marca.tsx`), de arriba abajo:
1. **Vista previa en vivo** con `CuponTienda` y la primera promo activa de la
   tienda (o una de ejemplo).
2. **Logo**: subir/cambiar; se reduce a 512 px (WebP, conserva transparencia).
   Sin logo, el cupón muestra las iniciales.
3. **Colores**: 3 combinaciones propuestas desde el logo (tocables; al subir un
   logo se aplica la primera) + ajuste manual (selector y código hex) de
   principal y acento. Si un color no se lee, se ajusta su luminosidad y se avisa
   "Lo ajustamos un poquito para que se lea bien".
4. **Estilo**: 4 tarjetas con "Aa" en su tipografía — Elegante (Playfair Display
   + Figtree), Moderna (Poppins + Inter), Divertida (Fredoka + Nunito), Clásica
   (Libre Baskerville + Source Sans 3).
5. **Enlace de tu catálogo** (opcional, validado: dominio con punto, sin espacios).
6. **Guardar mi marca** → aviso "¡Tu marca quedó lista!".

**Reglas (`lib/marca.ts`, con pruebas en `tests/marca.test.mjs`, `npm test`):**
- Colores dominantes del logo por *median cut* sobre la imagen reducida a 64 px;
  blanco, negro y grises no pueden ser principal (sí acento claro/oscuro).
- Legibilidad: texto sobre el principal ≥ 4.5:1 (crema `#FFF9EE` o tinta
  `#1D1A17`, el que más contraste dé); el % en acento ≥ 3:1. Si no llega, se
  mueve solo la luminosidad (el tono se conserva).
- Sin logo ni colores: paleta neutra elegante (`#2E2A27` + `#E2B77A`), nunca el
  verde Deslizapp.
- Fuentes de Google cargadas bajo demanda (`lib/fuentes-marca.ts`): solo el par
  del estilo en uso (la hoja Mi marca carga los 4 mientras está abierta). La
  imagen del cupón espera a que estén listas antes de dibujar.

**`CuponTienda`** (`components/marca-tienda/cupon-tienda.tsx`): el cupón
formato C (perforación y talón) con los colores y tipografías de la tienda, su
logo o iniciales y su nombre. Recibe `promo` + `marca`. Es la base de la vista
previa de Compartir y de la imagen PNG (`lib/imagen-promo.ts` usa los mismos
colores).

---

## 6. Retoque de fotos con IA

> **Demo:** mientras `RETOQUE_REAL` (`lib/config.ts`) sea `false`, junto al
> título de la tarjeta de retoque se muestra una etiqueta discreta "Demo". La
> lógica de créditos no cambia; al conectar el retoque de verdad se pasa a
> `true` y la etiqueta desaparece.

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

Construida en `components/inicio/` con los cálculos de `lib/resumen.ts` (ver
"Resumen" en `03-modelo-de-datos.md`). Todo sale de la tienda activa.

**Qué muestra:**
- Saludo: "Buenas tardes, {nombre de la tienda}." (con el punto en Mandarina;
  "Buenos días/tardes/noches" según la hora de Santo Domingo).
- Remate: "Esta semana tu tienda sacó 194 aaahs. Nada mal para un {día}." (aaahs
  de los últimos 7 días; sin aaahs: "Esta semana todavía no hay aaahs…").
- **Tarjeta de pedidos nuevos** (Mandarina, solo si hay): número en cuadro
  verde, "2 pedidos nuevos" / "Alguien dijo aaah. No lo dejes en visto." →
  lleva a Pedidos (pestaña Nuevos).
- **Por cobrar**: bajo la línea "Por despachar" de la tarjeta de ventas, otra igual de discreta, **"Por cobrar: RD$X · N clientes"**
  (solo si hay deuda; toda la tienda; lleva a Clientes con el filtro "Deben"). No cambia el cálculo de ventas: un pedido a crédito
  despachado es venta aunque no esté pagado.
- **Selector de periodo** (`Segmentos`): Hoy · 7 días (por defecto) · Mes ·
  Año. Se recuerda mientras la app esté abierta (en memoria). Cambiar de
  pastilla vuelve al periodo actual de esa pastilla.
- **Navegador** (solo Mes y Año): "‹ Septiembre 2026 ›" / "‹ 2026 ›", botones
  de 44 px ("Mes anterior", "Mes siguiente"…). › desactivado en el periodo
  actual; ‹ desactivado en el primer mes/año con datos de la tienda. Fuera del
  periodo actual: "Volver a este mes" / "Volver a este año".
- **Tarjeta de ventas y pedidos por despachar** (Verde Bosque): "VENTAS + POR DESPACHAR DE SEPTIEMBRE" (o "DE HOY",
  "DE LOS ÚLTIMOS 7 DÍAS", "DE 2026"; con barra elegida, "DEL 12 DE SEPT"),
  monto grande, variación con signo ("+18%": menta si sube, rosa si baja, sin
  rojo) y debajo, en pequeño, contra qué se compara ("vs. 1–5 sept", "vs.
  agosto", "vs. ene–sept 2025"); sin datos para comparar: "Sin comparación
  todavía". El monto y la comparación incluyen pedidos despachados más pedidos
  **por despachar** del periodo; debajo se aclara cuánto corresponde a estos
  últimos. Los pedidos nuevos y cancelados no se suman. Reglas en "Resumen" de
  `03-modelo-de-datos.md`.
  **Una venta confirmada sigue siendo un pedido despachado** (fecha = `despachado_en`, o `creado_en` si
  viniera nulo; las ventas pasadas ya traen la fecha elegida). El gráfico agrega
  por separado los pedidos por despachar según `creado_en`; no los presenta como
  ventas confirmadas.
  Bajo la cifra, si hay pendientes en TODA la tienda (sin importar el periodo), una línea
  pequeña "Por despachar: 3 pedidos · RD$10,321" (singular con 1; oculta con 0; entra con
  `mov-aparece`, que respeta reducir movimiento); al tocarla lleva a Pedidos (que abre en
  "Nuevos"). Se recorta con "…" antes de desbordar a 360 px.
- **Gráfico de barras** (`components/inicio/grafico-ventas.tsx`; divs, sin
  librería ni animación de entrada; al cambiar de periodo cambia de una vez):
  - Hoy: 12 franjas de 2 h · 7 días: una por día · Mes: una por día (28–31,
    etiquetas cada 5 días) · Año: 12 meses (Ene–Dic).
  - La etiqueta de "ahora" (hoy, este mes) en Mandarina; las futuras en contorno
    discontinuo y las anteriores al inicio de la tienda en contorno punteado
    (distintas de un cero, que es una barra mínima).
  - El tramo rosa representa lo **Pagado** y el mandarina lo **Por cobrar**.
    Los abonos parciales reparten un pedido entre ambos colores. El alto y el eje
    conservan el total de despachados más por despachar; se usan sus fechas actuales
    (despacho/creación), no la fecha de los abonos. El reparto refleja el pago actual. Eje abreviado arriba
    ("RD$12k", "RD$1.2M"); texto alternativo con el total, ambas partes y la
    mejor barra.
- **Tocar una barra** la ELIGE: queda en su color y las demás se atenúan
  (opacidad 0.35, transición de 150 ms solo de opacidad). Todo lo que depende
  del periodo se recalcula para esa barra (ventas, variación, Pedidos, Ticket,
  Aaahs, De aaah a pedido, top 3); pedidos nuevos, pendientes, stock y plan no cambian.
  - Bajo la tarjeta, una píldora rosa "Mostrando solo el 12 de sept" (o "solo
    agosto", "solo de 2 a 4 p. m.") con ✕ ("Ver todo el periodo"). En Año,
    además "Ver mes →", que abre la vista Mes de ese mes sin selección.
  - Se quita al tocar la ✕, la misma barra, el gráfico fuera de las barras, otra
    pastilla o ‹ ›. Vive en memoria.
  - Una barra futura o anterior al inicio no se elige: la píldora dice un
    momento "Aún no hay datos de este mes/día/franja".
  - Cada barra es un botón (aria-pressed) que anuncia el total y separa cuánto
    está pagado y cuánto queda por cobrar.
  - No hay globo flotante con el monto: lo dice la tarjeta.
- 4 datos del periodo: **Pedidos recibidos** (no cancelados, por fecha de creación),
  **Ticket promedio** (total despachado ÷ cantidad de despachados; "—" sin ventas),
  **Aaahs** (tarjeta rosa) y **De aaah a pedido** (pedidos recibidos / aaahs, en % con un
  decimal; "—" sin aaahs).
- **"Lo que más se vende"** (+ "tu top 3" en Caveat): top 3 productos por
  unidades vendidas en pedidos despachados (ventas) del periodo, con foto, "N
  vendidos" y barra proporcional; tocar uno abre su formulario. (El prototipo
  lo ordenaba por aaahs: se cambió en el paso 9.)
- **"Ojo con el stock"**: productos con `stock <= STOCK_BAJO` (2, en
  `lib/config.ts`): "Agotado" verde / "Queda 1" · "Quedan 2" Mandarina; tocar
  uno abre su formulario. Sin ninguno: "Todo con stock. Tu vitrina está lista
  para lo que venga."
- **Tarjeta del plan** (rosa, abre Plan y créditos): "Plan 20", "Ver plan",
  "10 de 20 productos", barra, "35 créditos · te alcanzan para 7 fotos retocadas".
- **Periodo sin pedidos ni aaahs**: en lugar de la tarjeta de ventas, los datos
  y el top, `EstadoVacio` con la ilustración de inicio ("Una semana
  calladita." / "Hoy todavía está tranquilo." / "Un mes calladito." / "Un año
  en blanco… por ahora.").
  Nunca ceros fríos, NaN, Infinity ni "-%".
- Cierre en Caveat: "tu pulgar tiene buen gusto. déjalo trabajar."

**Esta pantalla es de solo lectura** — solo consulta datos agregados.

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

## Catálogo público React — revisión PR #44

`/tienda/{slug}` replica el catálogo HTML con la marca de cada tienda: reels, perfil/cuadrícula, colecciones calculadas, búsqueda, panel «más», coach, opiniones y hoja de pedido. Medio horizontal con puntos, video mudo en línea con sonido opcional, opciones y precio/disponibilidad por variante, promo automática y Por encargo. Agotados conservan sello y abren «Te aviso cuando llegue»; el teléfono se guarda para ese aviso. La fuente pública no expone stock exacto por encima de tres.

**Video en la ficha (desde el 7 oct 2026):** no se pueden agregar videos (`VIDEO_PERMITIDO = false`, `lib/config.ts`); la tira de medios queda como la de fotos. Los videos que ya existen se siguen viendo y se pueden mover y quitar.

El corazón mantiene pedido local y registra el aaah. Enviar crea solicitud con precios de la base y abre WhatsApp en la misma pestaña; no envía automáticamente. Agotado y límite de intentos mantienen el carrito; fallo de red permite texto sin enlace. Opiniones respeta `false` / `pronto`; el resto de secciones respeta personalización.

`/pedido/{codigo}` muestra historia del comprador, total, recibos PNG/PDF y «Seguir explorando {tienda}». La continuación de la parte 3 añade estado/registro (ver la sección siguiente); ambas entregas siguen pendientes de fusión. Vencido/inexistente tienen mensaje breve; para un código desconocido sin tienda se usa procedencia/historial al volver. `?demo` permanece enteramente local. URL real y metadatos sociales; no se cambia aún `url_catalogo` ni el HTML antiguo. Validación y diferencias previstas: `validacion-catalogo-react.md`.

### Presentaciones en el catálogo del cliente (opción B)

Solo para productos **con presentaciones** (ejes + variantes); un producto sin ellas se ve y se comporta como siempre. Lógica pura en `lib/tienda/presentaciones.ts`; superficie propia (`components/tienda/reel.tsx`, `hoja-presentaciones.tsx`, `app/tienda/catalogo.css`), sin `components/ui`. Diseño en `referencias/presentaciones/` (`OpcionB1`–`B3`, `OpcionA2`, `Publico2`–`Publico5`).
- **Reel limpio:** sin las filas de pastillas ni la descripción larga. Debajo del precio, «4 tallas · 3 colores» y **un solo botón «Ver presentaciones ›»** con los colores conocidos en puntitos (un nombre que no se conoce no se dibuja). Al lado, «más». Ya elegida, el botón dice «M · Negro · Elegir otra ›» y el reel muestra «En tu pedido».
- **Hoja «Ver presentaciones»:** título «Elige tu talla», «Elige tu tamaño» o «Elige la tuya». Con **dos ejes**, cuadrícula: el eje Color en filas (con la foto de ese color) y el otro en columnas; **tachada = agotada**, un número = quedan pocas (la regla de «quedan» de siempre), el precio propio solo si difiere del base; la celda elegida lleva ✓ y un anillo (no solo color); celdas de 44 px; se desplaza si hay muchas. Con **un solo eje** (perfumes), una lista con valor, precio y estado. Debajo, la línea «M · Negro · Quedan 2» y «Agregar a mi pedido» (o «Quitar de mi pedido» si ya está). Tocar una tachada cambia el botón a «Avísame cuando vuelva» (el mismo aviso de siempre).
- **♥:** sin elegir abre la hoja de pastillas (opción A, «Elige la tuya»); con una elegida la agrega directo (o la quita si ya está en el pedido); si esa está agotada, «Avísame». Lo mismo vale para el doble toque sobre la foto, el botón del detalle y el corazón de la cuadrícula. «Agregar a mi pedido» usa el mismo `elegir` y el mismo «aaah» (el pedido, el stock y el contador no cambian).
- **La foto sigue al color:** al elegir un color con foto asignada (`fotosPorValor`, parte 1), el carrusel de ese reel va a esa foto (solo `scrollTo` horizontal del carrusel, sin tocar la página ni el foco; sin animación con movimiento reducido). Sin foto asignada no se mueve.
- **Agotada:** la combinación elegida agotada (o inexistente) sella el reel como un agotado de hoy, solo para ella; si todas lo están, «Agotado» como hoy.
- **Búsqueda del comprador (precio y presentaciones):** `lib/tienda/busqueda.ts`. Fuera de perfumes busca nombre (5), marca (4), categoría, valores de las presentaciones y descripción (3), tipo y demás detalles (2); en perfumes los campos y pesos no cambian. El precio se lee primero y lo que sobra se busca como texto: tope (`menos de`, `hasta`, `<`…), piso (`más de`, `desde`, `>`…), rango (`entre X y Y`, `de X a Y`, `X-Y`) y número suelto = «cerca de» (±25 %, solo si vale 100 o más y no está escrito en el catálogo, como «100 ml» o «Sombrero 2000»). Acepta `2,000`, `2.000`, `RD$2000`, `2 mil`, `2k`, `1.5k`. Compara el precio que ve el comprador (con promo) y cualquiera de las presentaciones. Debajo del conteo va la etiqueta «Hasta RD$500» / «Desde» / «Entre … y …» / «Cerca de», con una ✕ (44 px) que quita solo esa parte. Sin nada a ese precio: «No hay nada hasta RD$200. Esto es lo más cercano:» y hasta 6 productos.
- **«Desde RD$ X»:** si los precios difieren, el reel (mientras no haya elegida), la cuadrícula del catálogo y la búsqueda dicen «Desde» con el más bajo de las que se pueden pedir; al elegir una, su precio. Con la promo, el tachado sigue como hoy.
- **Detalle «más»:** en vez de las pastillas, el mismo botón de presentaciones.
- **Pedido:** cada línea ya lleva `varianteTexto`; la foto de la línea es la del color elegido. La misma camisa en dos presentaciones son dos líneas. Una agotada antes de enviar sale «Agotado» y frena el envío (sin cambios).
- Pruebas: `tests/catalogo-presentaciones.test.mjs`, `npm run probar:catalogo-presentaciones` (demo `?demo`, 390 y 360).

## Pedido del catálogo en el panel — continuación, sin publicar

La misma historia del comprador mantiene productos, precios y recibos. La hoja inferior muestra Enviado / Confirmado / Despachado con tres tramos; cancelado y vencido son estados distintos. Registrado no vence al cumplir siete días. Las líneas finales y el descuento reflejan Quitar/Por encargo; no se deduce confirmación por abrir WhatsApp.

«Entra para registrarlo» comprueba la sesión y la tienda de la solicitud mediante RLS. La hoja privada reutiliza Hoja y SelectorCliente: búsqueda parcial permite crear un borrador; un teléfono completo ya existente permite elegirlo. Personas con el mismo nombre no se unen automáticamente. El cliente provisional, su nota y las decisiones solo persisten al registrar. Quitar ofrece Deshacer; Por encargo afecta únicamente esa línea/variante. Productos ocultos, variantes incompatibles o retiradas deben quitarse.

Registrar crea un único pedido Nuevo, sin descontar stock; despachar/deshacer usan sus operaciones actuales. Ante respuesta incierta aparece «Comprobar registro»: primero relee, nunca vuelve a escribir automáticamente. Cierres, Atrás y cambios sin guardar conservan el borrador; Ver pedido consume el historial de la hoja antes de navegar. Nuevos incluye «Del catálogo por registrar», incluso sin pedidos nuevos, con carga, vacío y error/reintento.

Tras reponer, «Ya llegó» relee el producto y la variante confirmados. Avisar abre WhatsApp sin envío automático; marca al recuperar foco/visibilidad, no mediante un temporizador. Eso indica que se abrió el mensaje y se volvió, **no** que se envió ni recibió. Si falla marcar, el reintento no vuelve a abrir WhatsApp. No ofrece avisar con stock cero; null conserva sin control. El enlace se incluye solo si es HTTPS válido.

Demo conserva solicitudes en el mismo navegador: el enlace de WhatsApp sin `?demo` no transporta los datos locales a otro dispositivo. Recorrido seguro: volver al catálogo demo en el mismo contexto y usar `/pedido/{codigo}?demo`. No se cambia el enlace publicado ni el HTML antiguo. Pruebas y límites en `handoffs/pedido-catalogo-panel-continuacion.md`.


### Likes en los reels públicos (corrección PR #46)

El botón presenta corazón principal → «1 lo quiere» o «N lo quieren» como texto centrado sin insignia. En cero conserva «Lo quiero» sin contador. El contador de likes utiliza `.likes-count`, independiente de `.cnt` (insignia de la bolsa, sin cambios). El nombre accesible mantiene la acción «Lo quiero: producto» o «Quitar del carrito: producto» y añade la cantidad/frase mostrada. Cero permanece oculto; agotados conservan Avísame sin contador. No cambia selección, cálculo de likes ni animación aaah.


### Trabajo pendiente y retorno de Google (seguimiento PR #46)

«Nuevos» y el único contador del tab inferior «Pedidos» suman pedidos registrados `nuevo` + solicitudes vigentes por registrar de la tienda activa. La tarjeta «N del catálogo por registrar» conserva el desglose. Registrar cambia una solicitud por un Nuevo sin variar el total; confirmar, descartar o vencer retira su pendiente. Las solicitudes nunca se suman a ventas, deuda, inventario ni otras métricas de pedidos. `usePendientesPedidos()` publica ambas lecturas juntas, conserva el último resultado si falla y comunica el error; sin primera lectura, la cifra queda pendiente, nunca cero inventado. El vencimiento se recalcula sin escrituras y también al volver al foco.

Desde `/pedido/CODIGO`, Google vuelve al mismo dominio/código. `redirectTo` incluye `volver` validado; `dz_volver` es respaldo compatible con callbacks anteriores. El callback agrega `registrar=1` para montar explícitamente la vista; ese marcador no concede acceso. `getClaims` + lectura autenticada de `usuarios` y `solicitudes_pedido` bajo RLS resuelven el miembro/tienda. Otra cuenta recibe aviso; registrada ofrece el pedido existente; vencida/descartada no permite registrar. El error vuelve al código y conserva su aviso incluso en Strict Mode. Login normal del panel sigue usando Inicio. No depende del perfil por defecto ni de `user_metadata`.


## Seguimiento del catálogo publicado: visibilidad, likes, stock e imagen del pedido

- Vista previa: antes del inventario, una fila «Visible en el catálogo» con el Interruptor compartido y estado «Visible» / «Oculto del catálogo». Cambiarlo guarda inmediatamente solo `activo` mediante `useData().actualizarProducto`, espera confirmación y bloquea toques durante el envío. El error conserva el último estado confirmado y muestra un aviso. No toca la propuesta de cantidad ni crea ajustes, ventas o pedidos.
- Mostrar usa el mismo límite de plan y aviso «Tu catálogo está lleno» / «Hacer espacio» del editor. Si la lista no pudo leerse o se está actualizando, no se considera que haya espacio. Ocultar sigue conservando producto, fotos, likes, stock e historial. Oculto y Agotado pueden coincidir; se muestran por separado. El editor mantiene su interruptor y, cuando la persona no lo ha cambiado, refleja la última lectura y omite `activo` en su guardado para no restaurar una visibilidad antigua.
- Tarjetas del panel: una única píldora horizontal Papel dentro de la foto, con corazón Mandarina y cifra juntos (también cero), sin círculo interior. El enlace incluye el dato en su nombre accesible; no se anidan botones. Una Etiqueta contiene «N en stock» en éxito o atención con `STOCK_BAJO`; cero «Agotado», null «Sin control de stock» neutro. Las variantes conservan el total activo, el detalle de combinaciones bajas/agotadas y la situación sin control. «Oculto del catálogo» va como texto aparte. Filtros, disponibilidad pública y cálculos de likes no cambian.
- Feed del comprador: corazón, número positivo y frase son elementos separados centrados verticalmente; «Lo quiere» / «Lo quieren» puede partir solo entre palabras. Cero conserva «Lo quiero». Agotado conserva Avísame y oculta likes según la regla anterior. Selección, aaah y contador de unidades de la bolsa no cambian.
- `/pedido/[codigo]/imagen`: PNG público 1200×630 generado en servidor desde `verSolicitud` anónima. Una portada por línea, primeras cuatro en orden, sin multiplicar por cantidad ni deduplicar variantes; composición de hasta 2×2, y «+N productos» cuando sobran líneas. Datos importantes dentro del cuadrado central de 630 px; WhatsApp elige su propio recorte. Fotos ausentes, no permitidas o fallidas usan el isotipo de marca. Título, total y descripción pública se conservan. No se incluyen comprador, teléfono ni notas.
- La imagen tiene caché de navegador/CDN de 5 minutos; la página y la lectura pública siguen siendo dinámicas. WhatsApp puede conservar una preview anterior durante más tiempo. `?demo` no genera imágenes de pedidos guardados solo en el navegador. Límites de descarga y seguridad: `docs/validacion-catalogo-visibilidad-og.md`.

Estas reglas actuales sustituyen las descripciones históricas anteriores de «Sin stock», etiqueta genérica «Oculto» y foto OG única; no alteran las reglas de filtros o de inventario.
- **Seguimiento de espera, PR #47:** «N personas esperan» es una acción independiente debajo de la ficha, fuera del enlace del producto, que reutiliza la lista de Ya llegó. El enlace mantiene su nombre accesible con likes. Stock y visibilidad siguen independientes.
- **En espera:** pastilla compartida con contador de productos distintos, combinable con búsqueda y orden actual. Incluye ocultos y productos ya repuestos. Se oculta con cero salvo que esté elegida; resolver el último aviso no cambia el filtro y muestra «Nadie esperando por ahora.». Lectura fallida muestra error/reintento, nunca cero inventado.
- **Vista previa:** fila «1 persona espera»/«N personas esperan» abre la lista como vista interna de la misma Hoja. Ficha e inventario provisional quedan montados; volver restaura scroll/foco. No guarda, descarta ni confirma la propuesta. Se comprueba stock confirmado/variante antes de Avisar; oculto sigue independiente.
- **Inicio:** tarjeta rosa separada de pedidos y ventas: personas distintas por teléfono normalizado en la tienda, y productos distintos debajo. Una persona en dos productos cuenta una vez; sus variantes siguen siendo filas separadas. Abre productos → lista dentro de una Hoja, con Atrás y cierre existentes. No se limita a agotados.
- Confirmar Avísame guarda la solicitud sin abrir WhatsApp. Desde el panel Avisar prepara WhatsApp; volver puede marcar como avisado según el flujo existente, pero no demuestra envío ni entrega. Reponer no resuelve avisos. Se usan avisos_llegada y las operaciones existentes, sin otra lista persistente.

### Pulido de cifra de likes del panel

En las tarjetas de Catálogo, el número es texto sin fondo, borde ni insignia bajo el corazón, dentro de la foto. Se conserva el círculo, su tamaño, posición y margen interior. Papel Cálido con sombra de texto Verde Bosque mantiene legibilidad sobre fotos claras/oscuras; cero y cifras largas siguen visibles y el nombre accesible incluye la cantidad. No modifica feed público, bolsa, espera, stock ni visibilidad.


### Selección para ocultar productos agotados

En «Tu inventario», «N agotados siguen a la vista» → «Ocultarlos» abre una vista interna de selección en la misma Hoja. Lista solo productos visibles con `stockParaSalud(...) === 0` (variantes activas incluidas; sin control queda fuera), ninguno viene seleccionado. El buscador limita la lista y «Seleccionar todos los resultados» afecta solo esa búsqueda. Cancelar/volver no cambia nada. «Ocultar 1 producto» / «Ocultar N productos» relee producto y tienda antes de cada actualización de `activo`; no cambia stock, pedidos ni avisos. Los fallos parciales identifican los pendientes y el reintento se limita a ellos.


### Eliminar producto (rama de revisión, pendiente de migración)

Al final de Editar producto: acción terciaria de peligro «Eliminar producto». Abre la misma Hoja apilada de confirmación, con nombre guardado, consecuencias y Cancelar. No usa confirm/alert del navegador. Cancelar conserva el borrador y los ajustes provisionales. Confirmar descarta explícitamente los cambios de ficha aún no guardados. La hoja superior termina de salir antes de cerrar el editor (también con movimiento reducido).

La eliminación es lógica: `eliminado_en` y `activo=false`; sale de Catálogo y de los selectores de nuevos pedidos. Conserva fila, variantes, stock, likes, colecciones, promos, medios y referencias históricas. No es una promesa de borrado permanente. Se conservan artículos con nombre/variante/precio históricos, pedidos, ventas, pagos, saldos, comprobantes y ajustes. Las superficies históricas leen productos retirados; las alertas de stock y los selectores no los incluyen. Enlaces del panel muestran «Producto eliminado. Su historial se conserva.»; el catálogo público usa su estado existente de producto no disponible, sin exponer datos de otra tienda.

Se bloquea ante pedidos Nuevo/Por despachar, solicitudes vigentes sin registrar o avisos de reposición sin avisar. La confirmación muestra los pendientes y ofrece «Ocultar producto»: solo cambia visibilidad y conserva los demás campos del borrador. Nunca marca avisos ni cancela pedidos. Revisa nuevamente bajo bloqueo de fila al confirmar. Las nuevas relaciones toman el mismo bloqueo para evitar carreras. Un pedido histórico puede devolver stock y volver a despacharse: no se borra su producto ni su variante. Agregar un artículo retirado a un pedido nuevo se rechaza. Una edición que intente reconstruir líneas retiradas se rechaza; el vendedor conserva la consulta, despacho/devolución y puede ocultar en lugar de eliminar cuando necesite seguir editando su selección.

Fallo de escritura: no anuncia éxito ni reintenta automáticamente; exige revisar producto y pendientes. La operación es idempotente. Si la migración no está disponible, no permite eliminar; ofrece Ocultar.

Se conservan de main/PR #49: selección interna de agotados sin selección inicial, revalidación y fallos parciales; historial con ListaAgrupada/FilaLista y Ver más; única píldora horizontal `[corazón cifra]` dentro de la foto (cero incluido).

### Tipo de producto («Lo que vendes»)

Una tienda puede vender varios rubros; cada producto lleva su tipo. En la app: **«Lo que vendes»** (la tienda) y **«Tipo de producto»** (cada producto); la palabra «rubro» no sale. Con **un solo rubro nada de esto aparece** y todo queda como antes (solo suma la fila «Lo que vendes» en Mi marca).
- **«Lo que vendes»:** una fila en la hoja de **Mi marca** abre una hoja con los rubros como filas con check (al menos uno; el primero es el principal). Es del grupo `catalogo`. Quitar un tipo que algún producto usa avisa cuáles (no se quita).
- **Formulario del producto:** con más de un rubro, el **selector de catálogos** va fijo en la cabecera de la hoja (`<HojaFijoArriba>`), justo debajo del título: el nombre en Fredoka con chevron, sin píldora ni fondo, con un `<select>` nativo encima (`components/catalogo/selector-catalogo.tsx`); su última opción, «Vendo otra cosa también», abre «Lo que vendes». Un producto nuevo sale con el catálogo que se estaba viendo en la pestaña Catálogo (localStorage, por tienda; si no hay, el principal); uno que existe, con su tipo. Sin permiso de catálogo (Ayudante) se ve el nombre sin chevron y, al tocarlo, la tostada de siempre. Las presentaciones típicas salen del tipo del producto; los Detalles, del principal.
- **Catálogo del panel («catálogo» = cada rubro de la tienda):** con más de un rubro, el título es **el nombre del catálogo que se ve** con chevron y es el selector (`<select>` nativo encima; opciones «Perfumes · 8»… y al final «Lo que vendes…»). Un catálogo a la vez, **sin «Todo»**; abre el último que miró esa persona en esa tienda (localStorage) o el principal. El buscador («Busca en Accesorios»), las pastillas con sus contadores y la grilla trabajan sobre el catálogo activo (un producto sin tipo cuenta como el principal). La dona y «N disponibles» siguen siendo de toda la tienda. Un catálogo sin productos tiene su estado vacío pequeño que manda a «+ Producto». Con un solo rubro: «Tu catálogo», sin chevron, igual que siempre. Diseño: `referencias/selector-catalogos/`.
- **Catálogo del cliente:** en la búsqueda, con más de un rubro, pastillas «Todo / Ropa / Accesorios» y las palabras que nombran un tipo («ropa», «perfumes») filtran por él; el resto de la consulta se busca como siempre (`lib/tienda/busqueda.ts`). Con un solo rubro la búsqueda es idéntica (prueba con un caso fijo de Esencias Michel).

**Catálogo del comprador, ver por catálogo:** con más de un rubro, el perfil lleva pestañas de texto «Todo / Perfumes / …» y la hoja «Colecciones» un menú flotante «Catálogo». Ver `docs/12-catalogo-conectado.md`.

## Selector de catálogos: menú flotante (7 oct 2026)

Con más de un rubro, el nombre del catálogo (título de la pestaña Catálogo y cabecera fija de la hoja de producto) abre un **menú flotante** (`MenuFlotante`, `docs/09` §16), no el selector nativo de iOS. Opciones: cada catálogo con su cantidad y, al final, «Lo que vendes» («Vendo otra cosa también» en la hoja). Sin «Todo». El botón «+ Producto» queda siempre abajo a la derecha; solo se esconde si la tienda entera no tiene productos. Un catálogo vacío muestra el estado pequeño «Todavía no hay nada en X.» sin botón propio.

- **Botón de crear, siempre el flotante (8 oct 2026):** en Pedidos, Catálogo, Clientes y Promos el único botón de crear es `BotonFlotante` (abajo a la derecha), también cargando, con la pestaña vacía, con filtro sin resultados o con error. Los estados vacíos no llevan botón: solo ilustración, título y un remate que manda al flotante («Toca + Cliente…», «Toca + Promo…», «Toca + Producto…»). Se quitaron «Agregar cliente», «Crear promo» y «Publicar mi primer producto».

- **Ficha técnica y descripción (8 oct 2026, `docs/prompts/ficha-tecnica.md`, diseño en `referencias/ficha-tecnica/`):** en la hoja de producto, «Descripción» (hasta 600 caracteres, contador «43 / 600» y «Lo que escribas aquí también lo usa la búsqueda de tu catálogo.») va debajo del precio; «Detalles» solo sale en un producto que ya tiene Detalles distintos de la descripción (Esencias Michel); la tarjeta «Ficha técnica» sube, cambia o quita (con confirmación) UNA foto de las especificaciones, que se guarda junto con el producto. Un Ayudante lo ve apagado («Esto lo hace quien administra la tienda.»). En el catálogo del comprador la descripción se ve siempre bajo el precio, a dos líneas y terminada en un «…» tocable (sin la palabra «más») que abre el detalle; con ficha sale un círculo de vidrio con el ícono al lado de «Ver presentaciones», o una píldora «Ficha técnica» si no hay presentaciones; abre un visor a pantalla completa con zoom (pellizcar y mover, o un toque alterna ajustar y acercar). Se aparta del dibujo en: el límite de la descripción es 600 (el dibujo decía 300) y el título del campo es «Descripción», no «Descripción corta».
