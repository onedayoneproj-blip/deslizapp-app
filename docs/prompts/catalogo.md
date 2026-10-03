# Catálogo: inventario, "Por reponer", "Hacer espacio" y ajustes de pantalla

Contexto: crea la rama `feature/catalogo-inventario` desde main actualizado (git checkout main && git pull). Antes de empezar lee AGENTS.md, la guía de Next que aplique en node_modules/next/dist/docs/ y docs/09-sistema-de-diseno.md COMPLETO (sobre todo: "menos texto, nada repetido", "Menos texto no es menos voz", Caveat una vez por pantalla, iconos sueltos sin ficha pálida, Opción de formulario, jerarquía de botones, Ver más, Bloque de deuda). Solo components/ui y tokens; nada de hex ni tamaños sueltos; todo listo para modo oscuro. Haz un commit por punto.

Referencia visual: canvas "Catálogo: menos texto" (tableros Lista, Tu inventario, Por reponer, Hacer espacio, Título del plan, Producto, Nuevo producto). Si no tienes acceso, esta descripción manda.

Datos reales de hoy (Esencias Michel), útiles para probar: 15 productos, 14 visibles, 9 con 1 unidad, 6 agotados (5 de ellos visibles), 4 vendidos y agotados (Oxana Black, Orientica Pistache Absolu, Lattafa Asad Bourbon, Zakat).

## 0. Regla de negocio: el plan cuenta solo los productos VISIBLES

El espacio usado del plan (`tiendas.limite_productos`) es la cantidad de productos visibles en el catálogo (`productos.activo = true`). Los ocultos NO cuentan. Hoy la app cuenta todos (`usados = productos.length` en vista-catalogo.tsx): corrígelo en todos los lugares donde se calcule (busca `limiteProductos`).
- Centraliza el cálculo en un helper (lib/…): `usados = visibles`, `libres = limite − usados`, y el estado del plan: `sobra` (< 70 %), `quedan` (70–89 %), `casi` (90–99 %), `lleno` (100 %).
- Con el plan lleno: al crear un producto, el interruptor "Visible en el catálogo" queda apagado y deshabilitado, con una línea debajo "Tu catálogo está lleno. Lo guardamos oculto hasta que hagas espacio." (secundario, texto-secundario). Al intentar volver visible un producto oculto con el plan lleno, no se cambia y sale un Toast "Tu catálogo está lleno" con la acción "Hacer espacio" que abre esa hoja.
- No hay restricción en la base para esto (no la agregues ahora).

## 1. Lista del catálogo (vista-catalogo.tsx): se queda como está, salvo dos cosas

a) **Dona de la cabecera = salud del inventario** (ya no los cupos del plan):
- Anillo con tres tramos: con stock (3 o más unidades, `accion`), queda 1 o 2 (`resalte`) y agotados (`atencion-suave` o el tono pálido de Mandarina que exista como token). Productos sin control de stock cuentan como "con stock". Solo productos visibles.
- Dentro del anillo, solo la cifra de disponibles (visibles con stock > 0 o sin control). Debajo, fuera del anillo: "9 disponibles · 6 agotados" (si no hay agotados: "9 disponibles").
- Es un botón: abre la hoja "Tu inventario" (punto 2). aria-label con todo: "9 productos disponibles: 9 por agotarse, 6 agotados. Ver tu inventario".
- Quita la animación/estado "casi lleno" de la dona (eso ahora vive en la hoja).

b) **Tarjeta "En línea"**: una fila en una tarjeta `superficie` radio-l: punto verde de 10 px (estado en línea) · columna con "En línea" (destacado) y el enlace del catálogo debajo (secundario, una línea con elipsis) · botón compacto principal "Compartir" con icono de compartir (navigator.share con el enlace; si no hay, copia y Toast "Enlace copiado"). Tocar el resto de la tarjeta abre el catálogo en otra pestaña. Fuera la píldora "En línea" duplicada y los dos botones de solo icono. Si el catálogo no está publicado, la tarjeta muestra el estado que corresponda hoy (no cambies esa lógica).

Todo lo demás de la lista (subtítulo, buscador, pastillas, tarjetas de producto, FAB) NO cambia.

## 2. Hoja "Tu inventario" (nueva, al tocar la dona)

Hoja (components/hoja) de altura automática con título "Tu inventario" y X. De arriba abajo:

1. **Resumen**: dona grande (112 px) con la misma lógica que la de la cabecera y, a su lado, la leyenda en tres filas tocables (44 px): punto de color · "Con stock" · número; "Queda 1 o 2" · número; "Agotados" · número. Cada fila cierra la hoja y aplica el filtro equivalente en la lista (crea el filtro "Por agotarse" si no existe; si no quieres agregar pastilla, filtra por búsqueda interna — decide y dímelo).
2. **"Necesita tu atención"** (título de sección, destacado 17). Tarjetas, cada una solo si aplica:
   - **Por reponer**: icono bolsa (IconoPedidos, suelto, sin círculo) · "Por reponer" · subtítulo con voz: "4 se fueron volando" (N = productos vendidos que quedaron en 0; si no hay vendidos pero sí agotados, "N agotados") · chevron. Debajo, una fila de miniaturas superpuestas (hasta 4) de esos productos. Toca → vista "Por reponer" (punto 3) dentro de la misma hoja (como las vistas internas de la hoja del pedido, con botón Volver).
   - **N agotados siguen a la vista**: icono ojo suelto · título "5 agotados siguen a la vista" · subtítulo "Ocupan 5 lugares de tu plan" · botón secundario compacto "Ocultarlos" (oculta todos los visibles con stock 0 en una sola operación; Toast "Ocultaste 5 · Deshacer" que los vuelve a mostrar).
   - **Sin movimiento**: icono reloj suelto · "Sin movimiento" · "N sin venderse en 30 días · hazles una promo" · chevron → lista de esos productos (fila con foto, nombre, stock) y al pie un botón principal "Crear promo" que lleva a crear una promo en Promos (si Promos ya acepta preseleccionar productos, pásaselos; si no, solo navega).
   - Los iconos van sueltos (`texto`, 26 px), sin ficha de color detrás.
3. **Título dinámico del plan** (fuera de la tarjeta), en Fredoka como los títulos de pantalla (24/28), y debajo un subtítulo (secundario, texto-secundario):
   - sobra: "Tienes espacio de sobra" / "Sube lo que quieras, aquí cabe."
   - quedan: "Te quedan N lugares" / "Haz espacio con lo que ya no se mueve o sube de plan."
   - casi: "Ya casi no te cabe nada" / "Te quedan N lugares. Libera los agotados o sube de plan." (N=1: "Te queda 1 lugar.")
   - lleno: "Tu catálogo está lleno" / "Para subir otro producto, haz espacio o sube de plan."
4. **Tarjeta del plan**: "Plan 20" (destacado) y debajo "14 visibles de 20" (secundario) · barra continua de 12 px, radio píldora, con tramos proporcionales al límite: visibles con stock (`accion`), visibles agotados (`resalte`) y libre (`superficie-hundida`), separados por 3 px · leyenda en dos columnas (punto + nombre + número): "Con stock", "Agotados", "Libres" · botones lado a lado de 44 px: "Hacer espacio" (secundario, izquierda) y "Subir de plan" (principal, derecha; abre lo mismo que la píldora de créditos/plan hoy). En estado "sobra", solo "Hacer espacio" como secundario compacto. role="img" con aria-label que describa la barra.

## 3. Vista "Por reponer"

- Cabecera con Volver y título "Por reponer". Justo debajo de la cabecera, alineado con el borde izquierdo del contenido (no con el texto del título), la frase a mano (Caveat, token `mano`, `atencion-texto`): "Que vuelva lo que se fue volando". Es el único Caveat de esta vista.
- Lista agrupada con todos los agotados y los que quedan 1 o 2, en este orden: vendidos y agotados (por fecha de última venta, más reciente primero), agotados sin ventas, y al final los que quedan 1 o 2 (estos detrás de una fila "Ver N más que se están acabando" con el patrón "Ver más"). Cada fila: check de selección (el mismo check en círculo de Opción) · miniatura 44 · nombre y subtítulo ("Vendido 30 sep", "Queda 1", "Nunca se vendió") · si está marcada, el control Cantidad (−/+, mínimo 1) con la cantidad a pedir. Preseleccionados: los vendidos y agotados, con cantidad = lo que se vendió en los últimos 30 días (mínimo 1).
- Pregunta con voz (destacado 17): **"¿Ya tienes la mercancía en tus manos?"** y un GrupoOpciones con dos Opción (las mismas píldoras de "¿Cómo te paga?"): **"Todavía viene"** (elegida por defecto) y **"¡Ya la tengo!"**.
  - **Todavía viene**: vista previa del mensaje con el componente nuevo `VistaPreviaWhatsApp` (ver abajo) y, debajo, botón principal grande "Enviar lista" con icono de compartir: navigator.share({ text }) para que la persona elija WhatsApp y el chat (o cualquier app); si share no existe, abre `https://wa.me/?text=…` (WhatsApp deja elegir el chat); además deja "Copiar lista" como terciario si share no está disponible. Mensaje:
    "¡Hola! Para reponer:\n• 2 Oxana Black\n• 1 Orientica Pistache Absolu\n…\n¿Me confirmas precio y cuándo llegan? ¡Gracias!"
  - **¡Ya la tengo!**: botón principal grande "Sumar N al stock" (N = total de unidades marcadas). Llama a la RPC nueva `reponer_stock(p_tienda_id, p_items jsonb, p_nota)` (ya está en la base y en supabase/migrations/20261003170000_reponer_stock.sql): p_items = [{producto_id, cantidad}], todo o nada; cada línea queda en el historial como reposición. Productos sin control de stock no se pueden marcar (sale "Sin control" y no tienen check). Al terminar: vuelve a "Tu inventario", Toast "Sumaste N al stock" y la dona/barra se actualizan. Errores con mensajeDeError.
- No hay proveedores guardados: el destinatario se elige al compartir.

**`VistaPreviaWhatsApp`** (components/ui, nuevo): la misma vista previa de chat del catálogo de clientes (referencias/catalogo-esencias-michel.html, clases .wabody y .wamsg.out "vestidas de Deslizapp"): fondo papel (`fondo`) con el patrón suave de corazón y flecha en Verde Bosque al 6 % y puntitos (mueve ese SVG a un archivo en public/ o a CSS con url() — no lo dupliques inline en cada uso), radio-l y borde `linea`; una burbuja de mensaje enviado a la derecha: fondo menta (`accion-suave`), radio 8 con la esquina superior derecha recta y el piquito a la derecha, sombra 0 1px .5px, texto 14.5/1.38 con saltos de línea, y la hora con ✓✓ abajo a la derecha (11 px, texto-secundario). Úsalo también en el recordatorio de cobro del detalle del cliente (credito/cuenta-cliente.tsx), reemplazando la burbuja actual, para que ambos se vean igual. Debe verse bien en oscuro con tokens.

## 4. Vista "Hacer espacio"

- Cabecera con Volver y título "Hacer espacio"; debajo, a mano (Caveat, alineado al contenido): "Que entren los nuevos".
- Grupos (cada uno solo si tiene algo), en listas agrupadas con check de selección, miniatura (al 60 % de opacidad) y una historia corta como subtítulo:
  - **Agotados a la vista** (visibles con stock 0), marcados: "Se fue volando el 30 sep" (si se vendió) o "Nunca se vendió". Si el producto está marcado en "Por reponer" (estado de la sesión), sale DESmarcado con "Lo vas a reponer".
  - **Sin moverse en 30 días** (visibles con stock que no se venden hace 30 días), sin marcar, con "Queda 1 · sin ventas"; detrás de "Ver N más" si son muchos.
- Al pie: línea centrada (secundario) "Liberas N lugares · los vuelves a mostrar cuando quieras" y botón principal grande "Ocultar N del catálogo". Ocultar = activo false (reversible; los ocultos no cuentan en el plan). Toast "Liberaste N lugares · Deshacer". Vuelve a "Tu inventario" con la barra animándose al nuevo valor y el título del plan actualizado.
- NO hay "Eliminar para siempre" en esta versión: pedido_items y ajustes_inventario referencian productos y hoy la app no borra productos. (Queda para después.)

## 5. Hoja del producto (vista previa)

- El título de la hoja es el nombre del producto (Fredoka), no "Vista previa del producto". Arriba: foto 120 radio-m a la izquierda; a la derecha nombre, precio (destacado) y la colección (secundario).
- Quita la etiqueta "Visible en el catálogo". Solo si está oculto, una etiqueta neutra "Oculto".
- Inventario: una sola lista agrupada con dos filas: "En stock" con el control Cantidad (−/+, cuadrados 36) a la derecha, y "Historial" con chevron (hoy parece un campo). Fuera "Inventario", "Stock actual: 1" y "1 unidad". Si el producto no lleva stock, la fila dice "Sin control de stock".
- Botones al pie, lado a lado, 52 px: "Editar" (secundario, izquierda) y "Crear pedido" (principal, derecha).

## 6. Nuevo producto y Editar producto: solo cambia una parte

Todo se queda como está hoy (foto con "Sube la foto del celular" y "nosotros le ponemos la luz", "Retocar foto", Nombre, Precio, la tarjeta de stock con "Al despachar, baja solito." y "No llevo la cuenta de este"), EXCEPTO las pastillas de Colección y la tarjeta "Visible en el catálogo" con su ayuda. Esas dos se reemplazan por UNA lista agrupada:
- Fila "Colección" con el valor elegido a la derecha (texto-secundario; "Sin colección" si no hay) y chevron → abre una hoja/selector con las colecciones como Opción (check), "Sin colección" y una fila "Agregar colección" (FilaAgregar) que pide el nombre. Mantén la lógica actual de colecciones.
- Fila "Visible en el catálogo" con el interruptor (sin texto de ayuda), con la regla del plan lleno del punto 0.

## 7. Ajustes pendientes de otras pantallas

- **Iconos sin ficha pálida** (regla nueva de la guía): en los movimientos del cliente (credito/cuenta-cliente.tsx) y en los abonos de la tarjeta de Pago (credito/pago-del-pedido.tsx), la bolsa y la moneda van sueltas (24 px, color `texto`; la moneda en `exito-texto`), sin el círculo de color detrás. Revisa otros lugares con icono dentro de un círculo pálido decorativo y quítalo (no toques el check de Opción ni botones con relleno sólido).
- **Devolver la voz que se quitó** (regla "Menos texto no es menos voz"):
  - Bajo "Despachar pedido", la nota a mano (Caveat) "al despachar, el stock se actualiza solito".
  - En un pedido cancelado, junto al chip "Cancelado", la nota a mano "pasa hasta en las mejores tiendas".
  - En Clientes, el subtítulo de un cliente sin pedidos vuelve a "Todavía no pide. Todavía."

## Verificación

- lint, typecheck, tests y build sin errores; revisar-estilos en 0. Tests nuevos: cálculo del plan (visibles, estados sobra/quedan/casi/lleno), salud del inventario (con stock / 1–2 / agotados), orden y preselección de "Por reponer", texto del mensaje, candidatos de "Hacer espacio".
- En la vista previa de Vercel con datos reales (Esencias Michel) a 360 y 390 px: dona y tarjeta En línea; hoja Tu inventario con cada tarjeta; Por reponer en los dos estados (compartir y sumar al stock — prueba sumar y luego revisa el historial de un producto; si quieres, deshaz con un ajuste de corrección); Hacer espacio (ocultar y deshacer); hoja del producto; Nuevo y Editar producto (colección y visible, incluido el caso de plan lleno simulando un límite bajo en demo); recordatorio de cobro con la vista previa nueva; iconos sueltos; las tres frases devueltas.
- Capturas en docs/capturas/catalogo/.

## Entrega (incluye el merge)

1. Commits y push, PR hacia main con un resumen por punto.
2. Si todo pasa, mézclala tú mismo (squash) y borra la rama.
3. NO mezcles si algo falla o necesita una decisión mía (por ejemplo, el filtro "Por agotarse" del punto 2.1). En ese caso deja la PR abierta y explícame.
4. Respuesta final: si mezclaste, el commit de main, el link de producción, un resumen y las decisiones que tomaste.
