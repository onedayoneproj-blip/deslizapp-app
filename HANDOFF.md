# Deslizapp — Panel de tienda (handoff para Claude Code)

Este repo es el punto de partida del **panel de administración** de Deslizapp: la
app web donde el dueño de una tienda (ej. Esencias Michel) gestiona su catálogo,
ve sus pedidos, los despacha, arma promos y revisa cómo le va.

**No confundir con:** el catálogo público que ven los clientes finales (el que
se desliza tipo Instagram Reels y pide por WhatsApp). Ese ya existe como un HTML
independiente y **por ahora se mantiene separado** de este proyecto. Este repo
es solo el lado del dueño de la tienda.

Este documento es el punto de entrada. Antes de escribir código, lee en este
orden:

1. `docs/01-marca.md` — voz, colores, tipografía. Todo lo que se muestre debe sentirse como esto.
2. `docs/02-alcance.md` — qué entra en esta primera versión y qué no.
3. `docs/03-modelo-de-datos.md` — las tablas, ya con la forma que tendrán en Supabase.
4. `docs/04-pantallas.md` — spec de cada pantalla, campo por campo, sacada de los mockups ya validados.
5. `docs/05-arquitectura.md` — cómo se construye esto con datos falsos hoy sin tener que rehacerlo cuando se conecte Supabase.
6. `docs/06-orden-de-construccion.md` — en qué orden construir, y el criterio de "listo" de cada paso.
7. `docs/07-fase-2-cuentas-y-cobros.md` — **solo lectura por ahora:** decisiones ya tomadas para la fase 2 (verificación de Instagram, zona de administración, cobros manuales). No se construye en la primera entrega.
8. `docs/08-movimiento.md` — el sistema de movimiento: cómo se anima todo (reglas obligatorias para lo nuevo).

Además, en `referencias/` está el **prototipo interactivo y navegable del panel** (`referencias/prototipo-interactivo/Main.dc.html`, ábrelo en el navegador) y otros HTML de referencia. Es la referencia visual principal; los `docs/` mandan en reglas de datos, stock y créditos (ver `referencias/LEEME.md`).

## Regla permanente: novedades

**Cada cambio visible para el usuario suma una línea a `lib/novedades.ts`.**
Si el cambio sale en una versión nueva, se agrega una entrada nueva arriba
(número mayor, fecha y de 2 a 4 líneas cortas en tono de marca). Al abrir la
app después del despliegue, cada persona ve esas novedades una sola vez (la
primera vez que alguien entra no se le muestran). La versión actual se ve en
el menú de la tienda. Cambios internos sin efecto visible no llevan línea.

## Regla permanente: campos de texto y teclado (iPhone)

**Nunca animar ni remontar los ancestros de un campo de texto al enfocarlo o al cambiar el tamaño;
`focus()` siempre dentro del gesto del usuario; no cambiar `key` ni estado de layout por eventos de
`resize`/`visualViewport`.** En concreto:
- Ningún `useEffect` con listeners de `resize`/`visualViewport` cambia estado de React, ni el
  alto/posición de una hoja, ni llama a `focus()`. El teclado solo puede escribir una variable CSS
  (`--teclado`) y desplazar el contenido para dejar a la vista el campo enfocado (ver `components/hoja.tsx`).
- Los efectos que manejan foco (bloquear fondo, devolver el foco al cerrar) son **estables**: sin
  dependencias que cambien. Si se vuelven a ejecutar con un campo enfocado, su limpieza le quita el foco.
- Ninguna transición de vista (`ViewTransition`, `startViewTransition`, `addTransitionType`): en iOS
  le quita el foco al campo. Ya no se usan en ninguna parte.
- Una hoja con campos de texto es `"grande"` (una `"auto"` crece con el `--teclado` y se mueve). Si un toque abre un
  campo (ej. el selector de cliente), el `focus()` va en el mismo toque: `flushSync` + `focus()`.
- Toda hoja o pantalla nueva con campos de texto se prueba con `npm run probar:teclado`
  (`scripts/probar-teclado.mjs`, con la app corriendo): agrégale el campo nuevo.

## Regla permanente: movimiento

**Movimiento solo en hojas, barra de navegación y microinteracciones de un solo
elemento. Prohibido animar la página completa al cambiar de pestaña y prohibido
animar cada elemento de una lista o grilla al entrar. Solo `transform` y
`opacity`, con la excepción aprobada de `stroke-dashoffset` en el SVG de las
donas de Catálogo y Clientes.** Cambiar de pestaña es instantáneo; las listas y grillas aparecen de
una vez; las fotos no se funden al cargar; no hay librería de animación.

Toda pantalla o componente nuevo sigue `docs/08-movimiento.md`: tokens
(`--mov-*`, `--curva-*` en `app/globals.css` y `lib/movimiento.ts`), nada que haga
esperar un toque y respeto por `prefers-reduced-motion`. Los elementos tocables,
números, avisos y cargas usan los componentes base (`tocable`, `Numero`,
`Segmentos`, `Esqueleto`…).

**Excepción concreta de movimiento para «Tu próxima jugada»:** el resplandor granulado fijo al pie de su Hoja, visible desde que se abre la galería o un detalle, puede moverse continuamente con `transform` y `opacity`. Es decorativo, queda detrás del contenido, no bloquea toques y queda estático con movimiento reducido. La tarjeta inicial comparte ese brillo; al abrir galería o detalle hay una capa breve de morph o barrido y un pulso, y al abrir o elegir un borrador y al tocar «Ver más clientes» otro pulso. `LuzJugada` mantiene quietos el recorte y el grano; tres manchas independientes completan ciclos suaves de 8 s. Pulsos de 520 ms sustituibles y transiciones difusas de 480 ms; nunca se escala o desplaza un fondo rectangular. Todo usa solo transform y opacidad; con movimiento reducido no hay transición. Cabecera y desenfoque de `Hoja` siempre quedan encima del contenido desplazable y de las capas decorativas. Las reglas generales siguen vigentes: nada de transiciones de página ni entradas escalonadas de listas. Ver `docs/08-movimiento.md`.

**Regresión de historial detectada al validar las animaciones:** al cerrar los borradores,
el guard de Strict Mode impedía retirar su entrada también en producción. Ese guard
solo corresponde a desarrollo. La salida vuelve a consumir la entrada de la hoja
apilada; el siguiente «atrás» regresa a la galería sin necesitar un segundo toque.
La mezcla de color del velo se aplica en la capa decorativa de `Hoja`, bajo el blur
y la cabecera, para conservar el contraste del texto.

## Pastillas de filtro

Un solo tamaño para todas (`Segmentos` y `Chip` en `components/controles.tsx`): tokens `--pastilla-alto` (36 px),
`--pastilla-px` (14 px), `--pastilla-letra` (13,5 / 14 px) y `--pastilla-contador` (20 px) en `app/globals.css`. Nadie pasa
un alto propio: para cambiarlas se edita un valor. Ancho natural, alineadas a la izquierda, y la fila de `Segmentos` se
desplaza en horizontal si no caben. Área de toque de 44 px o más con un pseudo-elemento invisible. Detalle en
`docs/04-pantallas.md`.

## Ticket de promo (Promos y selector de cupón)

**Cambiar de tipo mediante copia:** al tocar un tipo distinto en edición se explica la restricción
y se abre una hoja compacta sobre el editor; «Sí, crear otra promo» abre el formulario nuevo
con el tipo elegido después de cerrar esa hoja. Reutiliza la duplicación y sus fechas (hoy,
sin vencimiento ni pausa); no copia usos. Los cambios sin guardar piden el aviso existente antes
de salir. La original solo termina al elegir «Terminar la anterior» y confirmar «Sí, terminar».
Cancelar o «Dejar ambas» conserva la original. Detalles y límites en docs/04; comprobación de
demo local con `node scripts/probar-reemplazo-promos.mjs` y foco con `npm run probar:teclado`.
La tarjeta abre el detalle de solo lectura en `/promos/[id]`; la edición tiene su propia ruta
`/promos/[id]/editar`. La hoja de compartir vuelve al detalle cuando salió de él.
`node scripts/probar-detalle-promos.mjs` comprueba las rutas, hojas y capturas reales.
No necesita migraciones; PR #2 de reconciliación sigue separado y pendiente de revisión.

Un solo componente, `components/promos/ticket-promo.tsx`, con dos tamaños: normal (lista de Promos, vía `tarjeta-promo.tsx`) y
compacto (selector de cupón de pedidos, `selector-descuento.tsx`). Colores y forma salen de ahí: no se duplica el ticket.
Fila de descuento de un pedido = `FilaDescuento` ("+ Agregar cupón" o ticket compacto con Cambiar / Quitar).

## Resumen: qué es una venta

Una **venta confirmada** es un pedido `despachado` (fecha = `despachado_en`, o `creado_en` si viniera nulo); un **pedido recibido** es
cualquier no cancelado (por `creado_en`); un **pendiente** es `nuevo` o `por_despachar`. Vive en `lib/resumen.ts` (`ventasDe`,
`pendientesDe`, `fechaDeVenta`) con pruebas en `tests/resumen.test.mjs`. La cifra y las barras principales del Resumen suman ventas
confirmadas más pedidos `por_despachar` del tramo (no los `nuevo`); barras rosas = pagado, mandarina = por cobrar, según los importes actuales de `getPedidos`
(incluye abonos parciales; no agrupa cobros por fecha de abono). El total no cambia. La variación
compara ambos grupos. Ticket promedio, top 3 y Clientes continúan usando solo pedidos despachados; "Pedidos recibidos" y "De aaah a
pedido" usan recibidos. La tarjeta conserva la línea con el total global por despachar. Detalle en docs/03 y docs/04; validación de los colores de pago en
`docs/validacion-grafico-pagos.md`.

**Borrar contacto:** la edición ofrece conservar los pedidos y abonos sin asociarlos al contacto, o borrar también todo ese historial.
La segunda opción exige confirmación. Demo y Supabase comparten la regla; la RPC `borrar_cliente` en `20261002161112_borrar_cliente.sql`
opera solo en la tienda de sesión. Borrar pedidos históricos no restaura stock. La migración se aplicó a producción en Supabase con el identificador `20261002161112`. El historial previo de migraciones del repositorio y producción aún está pendiente de reconciliarse (PR #2).

## Donas de Catálogo y Clientes

`components/dona.tsx` pinta el SVG reutilizable. Catálogo muestra en su cabecera
la salud del inventario y abre «Tu inventario» (ver la sección de arriba; antes mostraba los espacios libres del plan). Clientes muestra la mezcla
de quienes repiten, compraron una vez y no han comprado; su hoja «Tus clientes»
abre filtros y el mensaje de WhatsApp para Dormidos. Todos esos grupos usan solo
pedidos despachados; «Nuevos» y «Dormidos» usan días civiles de Santo Domingo.
«Deben» sigue usando cuentas por cobrar. Cálculo puro en
`lib/clientes-resumen.ts`; detalles en docs/04-pantallas.md. La demo ya contiene
los tres segmentos, nuevos y dormidos. No requiere migraciones.

La hoja «Tus clientes» comienza con la tarjeta «Tu próxima jugada»: galería y cuatro detalles dentro de la misma hoja. «Escribir» abre una hoja apilada con tres borradores locales; el elegido se puede editar antes de abrir WhatsApp, sin envío automático. `lib/proxima-jugada.ts` reutiliza el análisis de compras despachadas, excluye clientes con pedidos en curso y respeta la tienda activa; los grupos se recalculan al cambiar los datos o el día de Santo Domingo. Los datos de ejemplo del mockup no se copian al código. Ver `docs/04-pantallas.md` y `tests/proxima-jugada.test.mjs`.

## Catálogo: inventario, Por reponer y Hacer espacio

- **El plan cuenta solo los productos VISIBLES** (`activo = true`; los ocultos no ocupan lugar). Helper único: `lib/plan-catalogo.ts`
  (`resumenDelPlan`, estados `sobra` < 70 % · `quedan` 70–89 % · `casi` 90–99 % · `lleno`, y `textosDelPlan`). Lo usan la lista del
  Catálogo, la hoja del producto, «Tu plan» y la tarjeta del Inicio. Con el plan lleno, un producto nuevo se guarda oculto
  (interruptor apagado y deshabilitado) y volver visible uno oculto no cambia nada y avisa con un Toast con «Hacer espacio».
  No hay restricción en la base para esto (a propósito).
- **La dona del Catálogo es la salud del inventario** (visibles: con stock ≥ 3 o sin control · queda 1 o 2 · agotados;
  `lib/inventario-catalogo.ts`) y abre la hoja **«Tu inventario»** (`components/catalogo/hoja-inventario.tsx`, montada en
  `PanelUIProvider`; se abre con `usePanelUI().abrirInventario()`, o `abrirInventario("espacio")` para ir directo a «Hacer espacio»).
  Vistas internas con Volver: **Por reponer** (`vista-por-reponer.tsx`), **Sin movimiento** y **Hacer espacio**
  (`vista-hacer-espacio.tsx`). Lo marcado en Por reponer vive en la hoja mientras está abierta.
- **Por reponer**: «Todavía viene» comparte el mensaje (`mensajeReposicion`, `navigator.share` o `wa.me`); «¡Ya la tengo!» llama a
  `reponerStock` → RPC `reponer_stock` (todo o nada, motivo `reposicion` en el historial). **Hacer espacio**: `cambiarVisibilidad`
  (un solo UPDATE) oculta; Deshacer vuelve a mostrar. No hay «eliminar para siempre» (pedidos e historial apuntan a los productos).
- Ventas de «30 días» salen de los pedidos **despachados** (`ventasPorProducto`). «Sin movimiento» = visibles con stock y sin
  ventas en 30 días (productos recién creados también entran). Los que no llevan stock no se reponen.
- La leyenda de la dona filtra la lista; para «Queda 1 o 2» se creó la pastilla **«Por agotarse»** (stock 1 o 2, visibles).
  `usePanelUI().filtrarCatalogo()` pide el filtro a la lista aunque se esté en otra ruta.
- El Toast con acción es `components/ui/toast.tsx` (`useToastUI`), montado junto al antiguo `components/toast.tsx` en el layout del
  panel (el antiguo sigue para el resto de la app hasta migrarlo).
- Componentes ui nuevos: `VistaPreviaWhatsApp` (burbuja enviada con el patrón `public/chat/patron-whatsapp.svg`; también en el
  recordatorio de cobro del cliente) y `CheckSeleccion` (+ `FilaLista marcada` = casilla). Capturas en `docs/capturas/catalogo/`.

## Vista previa de producto e inventario

Las tarjetas de Catálogo abren `/catalogo/[id]`: ficha de solo lectura: el título de la hoja es el nombre del producto, foto de 120 px, precio vigente, colección,
etiqueta «Oculto» solo si lo está, e inventario en lista agrupada («En stock» con Cantidad e «Historial»). «Crear pedido» abre el formulario preseleccionado; solo despachar
el pedido descuenta inventario. «Editar» conserva el formulario y sus fotos.

**Inventario provisional de PR #21:** vista previa y edición
comparten un borrador de cantidad mediante `useData()`. +/− no escribe; guardar
confirma un único delta final. Disminuir pide motivo al guardar («Otro» requiere
nota); aumentar usa reposición. Descartar o volver al stock base no crea registros.
El historial visible muestra solo ajustes reales, con antes/después, motivo, nota,
actor y fecha de Santo Domingo, por tramos de diez y con error/reintento.
`stock = null` sigue sin control; no se habilita/deshabilita en productos existentes.

**Contenedor y navegación interna:** Guardar cambios y Descartar viven dentro de
Inventario, tienen el mismo ancho y aparecen solo con diferencia. Descartar afecta únicamente la cantidad;
el Guardar del editor sigue usando la operación conjunta de ficha e inventario.
No duplicar ese botón con el Guardar general mientras haya ajuste pendiente.
«Ver historial» es una fila de ancho completo con borde y chevron existente;
abre una vista de la misma Hoja, conserva la ficha/formulario
montados y restaura scroll y foco al volver. `Hoja.alVolverInterno` consume Atrás
solo en esa vista antes de evaluar la salida con cambios; no crea otra hoja ni
otra entrada al abrir el historial. X/Escape mantienen la protección de salida.
No se cambiaron operaciones de datos, Supabase ni migraciones para esta mejora.
Ver `docs/validacion-historial-interno.md`.

`20261002203414_ajustes_inventario.sql` **está aplicada**: tabla `ajustes_inventario`,
RLS y RPC `ajustar_stock`. La nueva migración
`20261002223718_guardar_producto_inventario.sql` **está aplicada en producción**. Añade una RPC
con nombre distinto (sin sobrecarga), conserva la anterior e incorpora índice del
historial. Bloquea el producto, verifica base/membresía/actor y guarda ficha, stock,
ajuste y créditos de retoque juntos. El ID del ajuste evita repetir una operación
confirmada. El cliente no puede escribir stock ni historial directamente.
El usuario autorizó aplicar esta migración y después fusionar PR #21. Se aplicó
mediante el conector, con la versión `20261002223718` generada por Supabase.
El archivo se renombró desde `20261002205119`; no se alteró el historial interno.
En producción se comprobó ficha+stock, registro/actor, repetición sin duplicar,
conflicto sin ficha parcial y aislamiento mediante una transacción revertida.
La lectura posterior conservó 15 productos, 2 ajustes y la firma de stock
`338ecaf4cc10f82a36acf78d275e6596`. No equivale al recorrido de navegador real.

Si cambia el stock, se relee el producto/historial y se conserva la propuesta para
revisarla. Ante resultado de red incierto, se bloquea el reenvío hasta releer; no hay
reintento automático. Con respuesta perdida pero ajuste confirmado, se reconoce
por ID. Fotos se suben antes de la transacción: errores conocidos limpian las nuevas;
una respuesta incierta las conserva para no borrar fotos posiblemente guardadas.

Las dos hojas de ruta optan por `Hoja.protegerAtras`: misma confirmación existente
antes de Atrás, X, Escape, gesto o navegación a edición/pedido. Retiran su marcador
antes de navegar mediante `alSalir`; las otras hojas mantienen su comportamiento.
Los efectos de foco siguen estables, sin cambios por teclado/resize. No se añaden
animaciones ni entradas de filas. Ver `docs/validacion-inventario-provisional.md`.

**Histórico de PR #20 (interacción anterior al inventario provisional):**
La RPC, RLS y los permisos se comprobaron en producción; incrementos,
disminuciones, registro/actor, rechazo de negativos, cambios directos y otra
tienda pasaron dentro de una transacción revertida. No persistieron ajustes de prueba; después se observaron dos reposiciones
+1 registradas a las 20:36:30/20:36:36 UTC, posteriores a la verificación. Ver `docs/validacion-inventario-pr20.md`.

PR #2 de reconciliación sigue separado: los identificadores antiguos todavía
difieren del historial de Supabase. No ejecutar un `db push` general a ciegas.
El CLI ya está instalado; el dry-run dirigido a producción sigue sin ejecutarse
por falta de credenciales y la divergencia pendiente;
la comprobación transaccional del SQL y la aplicación individual no equivalen
a ese dry-run. Navegador con tienda real, fallos de red reales e iPhone físico siguen
pendientes.

## Ventas a crédito y abonos

Un pedido puede ser `contado` o `credito` (columnas `pago_modo` y `pago_fecha_acordada` de `pedidos`, que la app sí escribe) y los abonos
viven en la tabla `abonos` (solo lectura: se crean con la RPC `registrar_abono`, se editan con `editar_abono` —monto, método, fecha y nota; el monto máximo es el saldo del pedido + el monto viejo— y se borran con `eliminar_abono`). Todas las cuentas
(saldo, reparto del más viejo al más nuevo, "Atrasado N días" en hora de Santo Domingo, cuentas por cobrar, recordatorio) están en
`lib/credito.ts` con pruebas en `tests/credito.test.mjs`; la demo las usa en `lib/data/creditos.ts` y `lib/data/pedidos.ts` (la demo
reparte igual que la RPC y trae tres clientes que compraron fiado). Pantallas en `components/credito/` y detalle en docs/03 y docs/04.
Un pedido cancelado no genera deuda; las ventas del Resumen no cambian (cuentan al despachar, esté pagado o no). El recordatorio por
WhatsApp lo abre siempre el dueño. Las RPC de abonos (incluida `editar_abono`) aún no se probaron contra Supabase real; la demo tiene `editarAbono` con la misma firma (`planearEdicionAbono` en `lib/credito.ts`, con tests). Al cambiar la forma de los datos de la
demo, su clave de almacenamiento pasó a `deslizapp-demo-v3` (los datos de prueba anteriores se reinician una vez).

## Catálogo en línea (enlace)

`tiendas.url_catalogo` (Mi marca) alimenta la tarjeta de la pestaña Catálogo (`components/catalogo/tarjeta-catalogo.tsx`), con 8 estados
que salen de `tiendas.catalogo_estado` (+ `catalogo_paso`, `catalogo_notas_cambios`, fechas) vía `lib/catalogo-estado.ts` (puro, con tests).
El dueño solo cambia el estado con las RPC `solicitar_catalogo`, `pedir_cambios_catalogo` y `publicar_catalogo` (nunca UPDATE directo);
el equipo hace el resto fuera de la app. La demo tiene "Simular avance del catálogo" en el menú de la tienda. Las RPC aún no se probaron
contra Supabase real. Detalle en docs/04-pantallas.md. El enlace se valida con `lib/enlace-catalogo.ts` (solo https) y nunca se pinta como
HTML. El catálogo todavía no se alimenta solo de los productos del panel. El de Esencias Michel vive provisionalmente en `/catalogos/esencias-michel.html` (`public/catalogos/`).

## Sistema de diseño (tokens, components/ui y /diseno)

- **Reglas:** `docs/09-sistema-de-diseno.md` (y `docs/10-marca-ilustracion-y-fondos.md`). Valores en `referencias/sistema-de-diseno/tokens.json`.
- **Tokens** en `app/globals.css`: colores por FUNCIÓN (`--fondo`, `--superficie`, `--texto`, `--accion`, `--atencion-texto`, `--peligro`…) con
  el valor claro en `:root` y el oscuro SOLO bajo `[data-theme="dark"]` (en `<html>` o en cualquier contenedor; todavía sin
  `prefers-color-scheme`: el oscuro automático se activa cuando las pantallas estén migradas). Utilidades de Tailwind sin prefijo:
  `bg-superficie`, `bg-superficie-hundida`, `text-texto`, `text-texto-secundario`, `border-linea`, `border-borde-campo`, `bg-accion
  text-sobre-accion`, `bg-accion-suave`, `bg-atencion-suave text-atencion-texto`, `text-peligro`, `outline-foco`, `bg-velo`…
  (`linea`, `peligro` y `marco` coinciden con los nombres viejos y tienen el mismo valor en claro).
- **Texto:** `text-cifra`, `text-titulo-pantalla`, `text-titulo-hoja`, `text-titulo-seccion` (con `font-display`), `text-destacado`,
  `text-cuerpo`, `text-secundario`, `text-etiqueta`, `text-contador`, `text-mano` / `text-mano-celebracion` (con `font-mano`). En rem.
- **Radios:** `rounded-radio-s/m/l/xl` (10/16/22/28; las píldoras, `rounded-full`). **Sombras:** `shadow-flotante`, `shadow-hoja`.
  **Alturas:** `h-(--alto-boton-grande)`, `h-(--alto-control)`, `h-(--alto-compacto)`, `h-(--alto-campo)`, `h-(--alto-etiqueta)`,
  `size-(--alto-avatar)`.
- **Colores heredados** (`bosque`, `rosa`, `mandarina`, `papel`, `menta`, `arena`, `suave`, `borde`, `tenue`, `apagado`, `tinta`,
  `bosque-oscuro`, `mandarina-texto`): siguen igual mientras dura la migración; se reemplazan al migrar cada pantalla.
- **`components/ui/` es la fuente de verdad para todo lo nuevo:** Boton (+ BotonIcono), Pastilla / FilaPastillas, Opcion /
  GrupoOpciones, ControlSegmentado, ListaAgrupada / FilaLista, Tarjeta, Aviso, Alerta, Etiqueta / Contador, Campo / Buscador, Avatar
  y el Toast nuevo (ProveedorToast + useToastUI). Se importan desde `@/components/ui`. Los componentes viejos (`controles.tsx`,
  `toast.tsx`…) siguen en las pantallas que aún no se migran.
- **Pantallas migradas al sistema:** **Pedidos** (lista, detalle, "+ Pedido"/venta pasada/Editar, selectores de cliente, producto y cupón, y el
  pago y los abonos: `components/pedidos/*`, `components/credito/{pago-del-pedido,campos-pago,hoja-abono,hoja-detalle-abono,tarjeta-saldado,comunes}`). Variantes
  nuevas en `components/ui/`: `Cantidad` (− 1 +, cuadrados de 36, `radio-s`; `BotonCantidad` suelto), `Boton jerarquia="terciario" tono="peligro"` (texto rojo sin contorno: Cancelar / Eliminar pedido, Borrar abono), `Boton whatsapp` (Escribir: compacto, relleno `accion`, icono WhatsApp), `Boton jerarquia="resalte"` (Despachar pedido, la llamada emocional de la pantalla), `CampoMonto` (monto en pesos, normal o grande), `BotonIcono tono="accion"`, `Buscador entrada=` (ref para el
  teclado de iPhone), `Boton scroll=` (para enlaces que abren hojas) y `soloDigitos`. Quedó con tokens también lo compartido que usa la
  pantalla: `selector-busqueda`, `ver-mas`, `hoja-estado`, `boton-flotante`, `titulo-pantalla`, `Interruptor`, `estado-vacio`, el esqueleto,
  el fondo del `body` y de `(dashboard)/layout`, y los colores de `hoja.tsx` (solo tokens, sin reescribirla). Pendiente de Pedidos: el encabezado y
  la barra inferior (shell), `TicketPromo` (Promos) y la hoja `Hoja` completa (radio 28, sombra).
- **FilaPastillas (filtros) = cápsula que se desliza:** el indicador `accion` es de tres piezas con `transform` (puntas + centro con `scaleX`, `--mov-normal` y `--curva-salida`, sin transición con reducir movimiento) sobre una capa de relleno `superficie` + `borde-pastilla` por pastilla; alto `--pastilla-alto`, `--pastilla-px`, `--pastilla-letra` en bold, gap 6 px, toque 44. Mantiene `aria-pressed` (lo que prueban `probar:teclado` y `probar:hojas`), flechas/Inicio/Fin y divisor solo antes del primer condicional. Usa el `Contador` de `ui/etiqueta` (tokens, claro/oscuro), no el viejo `components/contador.tsx`. Afecta a toda pantalla que use `FilaPastillas` (Pedidos y el selector de productos de + Pedido).
- **Vista previa de la factura:** "Descargar" de la `TarjetaDocumento` abre la hoja "Factura #N" (altura automática) con la vista previa = el MISMO PNG que genera `generarImagenFactura` (blob local) en una hoja de papel con scroll interno (máx. 55vh), skeleton mientras se genera y `Aviso` con "Reintentar" si falla. Botones "PDF" (principal) e "Imagen" (secundario); archivos `factura-N.pdf` / `factura-N.png`; al terminar cierra y muestra "Factura descargada". `descargarArchivo` (`lib/portapapeles.ts`) usa la hoja de compartir con el archivo en la PWA de iPhone/iPad y la descarga normal en el resto. "Compartir" no cambió.
- **Celebración de despacho:** `components/pedidos/hoja-despachado.tsx` (referencia `referencias/animacion-despacho/pedido-despachado.html`). Se abre desde `hoja-pedido.tsx` solo cuando `despacharPedido` respondió OK y reemplaza al toast. Movimiento solo CSS (`desp-*` en `app/globals.css`, transform/opacity; estilos base = estado final, sin animación con reducir movimiento) y el conteo del monto con `requestAnimationFrame` (se cancela al cerrar). Token nuevo `--patron` (claro #ebe1d0, oscuro #1c3027) para los íconos del fondo. `Hoja` ganó `tituloOculto` (título solo para lectores de pantalla). La etiqueta de stock usa `STOCK_BAJO` (≤ 2) y el stock que trae el servidor al releer `productos`.
- **`TarjetaDocumento`** (`components/ui/tarjeta-documento.tsx`): la factura del detalle del pedido (miniatura de papel, "Factura #N", etiqueta Al contado/Pagado en éxito o A crédito en atención, y "Descargar" secundario + "Compartir" principal con texto). Va después de la tarjeta de productos y antes de la de Pago, solo en pedidos despachados. Usa las mismas funciones de `AccionesFactura` (hoja "Descargar como PDF / imagen" y compartir); no cambió cómo se genera ni lo que se comparte.
- **Etiquetas con relleno visible:** neutro = `borde-pastilla` + `texto`; éxito (Entregado, Pagado, Al contado, Despachado); atención (Quedan N, A crédito, Debe, Atrasado); fuerte solo Agotado.
- **Hojas de abono:** Registrar y Editar abono, y el detalle del abono, tienen altura automática. **GrupoOpciones:** la pregunta es subtítulo `destacado` en `texto` (sigue siendo la etiqueta del radiogroup).
- **Clientes migrado al sistema** (`components/clientes/*`, `components/credito/{cuenta-cliente,por-cobrar,tarjeta-saldado,comunes}`): `Buscador`, filtros con `FilaPastillas` (los Segmentos ya no filtran), `ListaAgrupada` + `FilaLista` (nuevo: prop `accion` para un botón "Escribir" junto a la fila, y `pie` para una etiqueta debajo), `Etiqueta` Repite en éxito, `CampoMultilinea` (nota), `Campo`, `Alerta` para borrar el historial, `Tarjeta tono="destacada"` para "Por cobrar". `luz-jugada.tsx` no se tocó; las tarjetas de jugadas conservan su color de datos (`lib/proxima-jugada`) y el texto fijo `marca-bosque`.
- **Menos texto (docs/09, principio inicial):** filtros de Clientes `Todos · Deben · Repiten · Nuevos · Dormidos` sin divisor (`FilaPastillas ocultarVacios`); "Repite" es la señal de corazón de `Avatar repite`; lo atrasado es reloj + texto, sin píldora (ya no existe el tono `urgente`); en filas de lista la deuda es `MontoDeuda` (a la derecha) + `BarraAbonado mini`; la tarjeta de pedido empieza por el cliente (avatar, nombre, "#N · Ayer") con una sola etiqueta de pago; la hoja del pedido ya no repite el estado, el origen ni frases; el detalle del cliente tiene cabecera compacta, movimientos con íconos, "Registrar abono" y el recordatorio con 4 mensajes (`mensajesRecordatorio` en `lib/credito.ts`). La nota del cliente (máx. 60, `clientes_nota_largo`) se edita en "Editar cliente" y se ve como burbuja sobre el avatar de 88 px.
- **Bloque de deuda** (`components/ui/bloque-deuda.tsx`: `BloqueDeuda`, `FechaDeuda`, `BarraAbonado`; reemplaza al chin, ya no existe `Tarjeta chin` ni `atencion-borde`): "Debe RD$X" + fecha (`textoFechaDeuda` en `lib/credito.ts`) o la etiqueta `urgente` (token nuevo de `Etiqueta`, solo para "Atrasado N días"), barra de lo abonado y leyenda; `tamano="mini"` en el historial del cliente. Va en la tarjeta de pedido (que ya no lleva el estado: lleva la etiqueta de pago, regla "No repetir el filtro"), en las cuentas de "Deben" (suman TODOS los pedidos con saldo: `totalPedidos` y `abonado` en `CuentaPorCobrar`/`CuentaCliente`, `totalYAbonado`) y en "Te debe". Las filas de "Todos" llevan la etiqueta "Debe RD$X". La hoja del pedido muestra una sola `EtiquetaPago`. `Hoja` tiene `capaSuperior`. La factura es siempre blanca (`PAPEL_DOCUMENTO`).
- **Cupón aplicado:** el ticket compacto es UN botón con chevron que abre el selector; tocar el cupón aplicado lo quita y tocar otro lo cambia (toasts "Cupón quitado" / "Cupón cambiado"); el código se muestra una sola vez.
- **Ver más:** `BotonVerMas` es la última fila de la lista ("Ver N más" + "5 de 69"); `forma="fila"` en listas agrupadas y `forma="tarjeta"` en tarjetas sueltas; el foco pasa al primer elemento nuevo (`lib/ver-mas.ts`). **Dona:** solo la cifra dentro del anillo; el texto va debajo.
- **Foco verde, nunca naranja:** `--foco` es #174b3a (claro) / #9ed3b8 (oscuro). Campo, CampoMonto y Buscador no llevan anillo: con el cursor dentro el contorno de 2 px pasa a `accion` (con error, `peligro`); el borde es siempre de 2 px para que no salte. Botones, opciones, pastillas y filas tocables usan el anillo `foco` de 3 px solo con `:focus-visible`.
- **Secundario con relleno:** `Boton jerarquia="secundario"` lleva relleno `superficie` (nunca transparente). Las acciones dentro de tarjetas y filas (Cambiar, Quitar, Cambiar a crédito) son secundario `compacto`; el terciario queda solo para Cancelar/Eliminar pedido y Borrar abono (peligro) y Reintentar en un aviso.
- **Cantidad:** − en `superficie-hundida`, + en `accion` con icono `sobre-accion`; cada uno se apaga al llegar al mínimo o al tope. **`FilaAgregar`** (`components/ui/fila-agregar.tsx`): círculo `accion` de 24 px con +, texto `destacado` (Agregar cupón).
- **Regla Opcion vs segmentado:** `ControlSegmentado` solo cambia una vista o modo (Día / Semana / Mes); un dato que se guarda va con `GrupoOpciones` / `Opcion` aunque sean dos opciones (por eso "¿Cómo te paga?" ya no es segmentado).
- **Guía viva:** `/diseno` (pública, noindex, sin enlace desde la app), con todos los componentes y sus estados, en claro y oscuro.
- **Regla:** en código nuevo no se escriben colores ni tamaños a mano (ni hex, ni `bg-white`, ni `text-[Npx]` fuera de la escala, ni
  `rounded-[Npx]`, ni `shadow-[…]`). `npm run revisar-estilos` cuenta lo que queda a mano en las pantallas viejas (solo informa).

## Icono de la app

Fondo Menta, isotipo Verde Bosque con borde Menta (fuente: `public/icons/isotipo-app.svg`; se regenera con `npm run iconos`, que usa sharp). Para ver el icono nuevo en iPhone hay que borrar la app de la pantalla de inicio y volver a agregarla desde Safari (iOS guarda el icono al instalar).

## Hojas apiladas, aviso al salir y color de opciones

- `Hoja` se pinta en un portal en `<body>`: una hoja sobre otra (ej. "Registrar abono" sobre el detalle del pedido) no comparte gestos con la
  de abajo; solo la de arriba responde a deslizar, fondo, Escape, X y "atrás". Con cambios sin guardar (`avisarAlSalir` o `useAvisarAlSalir`)
  cerrar pregunta "¿Salir sin guardar?". Se prueba con `npm run probar:hojas` (con la app corriendo; igual que `probar:teclado`).
  Límite conocido: en hojas de RUTA con cambios sin guardar (pedido nuevo, cliente nuevo…) el botón atrás del teléfono sale directo con la
  ruta; deslizar, fondo, Escape y X sí preguntan. Excepción optativa de esta rama: vista previa y formulario de producto usan `protegerAtras` y coordinan `alSalir` después de retirar el marcador; sus cambios pendientes sí se protegen al volver. No se extiende a las otras rutas.
- Las opciones de un formulario (`Chip` / `Segmentos` con `tono="opcion"`) van en Rosa con check; las acciones, en Verde Bosque (principal) o
  contorno (secundaria); ver docs/04-pantallas.md. No cambia las pastillas de filtro.
- Las hojas de cliente y de pedido nunca quedan en blanco (esqueleto, o error con "Reintentar"): `components/hoja-estado.tsx`, y
  `useConsulta` devuelve también `error` y `reintentar`.

## Hojas inferiores

Para elegir algo de una lista larga dentro de una hoja (cliente, producto, y en el paso 8 producto o colección) se usa
`components/selector-busqueda.tsx` (`SelectorBusqueda`, `FilaAccion`, `ListaSeleccion`) y los helpers de `lib/texto.ts`
y `lib/telefono.ts`: una vista más DENTRO de la misma hoja, nunca una segunda hoja encima. Lo fijo arriba va
con `<HojaFijoArriba>` (dentro de la cabecera y de su desenfoque: nunca `sticky` suelto) y lo fijo abajo con
`<HojaFijoAbajo>` / `PildoraSeleccion` (se oculta con el teclado).

Toda hoja nueva (detalle de pedido, nuevo pedido, nueva promo…) usa el
componente `Hoja` de `components/hoja.tsx` y elige su altura con la propiedad
`altura`: `"auto"` (contenido corto), `"expandible"` (contenido largo: abre a
media altura) o `"grande"` (formularios largos). La forma (pegada a los bordes,
esquinas de arriba de 30 px, tope bajo la barra de estado), la cabecera fija con
borde de desplazamiento, cerrar deslizando, el teclado y la accesibilidad ya
vienen resueltos ahí (detalle en `docs/04-pantallas.md`).

## App instalable (PWA)

- `app/manifest.ts` + íconos en `public/icons/` y `app/icon.png` (se regeneran con
  `node scripts/generar-iconos.mjs` a partir de `referencias/iconos/icono-vendedores.png`,
  la "d" verde sobre crema). El ícono rosado es de la futura app marketplace: no se usa aquí
  (ver "Íconos de las apps" en `docs/01-marca.md`).
- `public/sw.js` (solo en producción): red primero para páginas y código,
  caché para imágenes, fuentes e íconos. Nunca guarda HTML por adelantado.
- Aviso "Hay una versión nueva": compara el despliegue compilado
  (`NEXT_PUBLIC_ID_DESPLIEGUE`, ver `next.config.ts`) con `/api/version`.

## Importante sobre esta versión de Next.js

Este proyecto usa **Next.js 16** (App Router), que tiene cambios respecto a
versiones anteriores que puede que tu conocimiento no refleje (por ejemplo,
`params` y `searchParams` llegan como `Promise` en las páginas, y existen los
helpers globales `PageProps<'/ruta'>` / `LayoutProps<'/ruta'>`). Antes de
escribir rutas o layouts, revisa `node_modules/next/dist/docs/01-app/` —
ahí está la documentación exacta de esta versión instalada.

## Estado actual del repo

- Next.js 16 + TypeScript + Tailwind v4 + App Router, publicado en Vercel
  (https://deslizapp-app.vercel.app; cada push a `main` publica solo).
- Hechos: tema de marca, capa de datos de prueba (`useData()` + `localStorage`),
  layout con navegación, Plan y créditos, Catálogo, retoque de fotos, Pedidos
  (lista, detalle, despacho con stock y pedido manual), Clientes (derivados de los pedidos), Promos (estado por fechas, compartir), Mi marca (logo, colores y letra de los cupones), Resumen (Inicio, con cálculos en `lib/resumen.ts`) y app instalable con novedades. El avance paso a paso está en `docs/06-orden-de-construccion.md`.
- **Primera entrega cerrada** (pasos 0–10 de `docs/06-orden-de-construccion.md`). El repaso final, con lo que
  se probó, lo que se corrigió y lo pendiente, está en `docs/08-repaso-final.md`.
- **Supabase conectado (paso 11)**: dos modos detrás de la misma interfaz de datos — **demo** (seed +
  `localStorage`, sin login) y **real** (Supabase con Google; una cuenta = una tienda vía `usuarios`). El esquema
  vive en `supabase/migrations/` (manda sobre los docs). Cómo está armado: `docs/05-arquitectura.md`; reglas que
  pone la base y errores: `docs/03-modelo-de-datos.md`. Variables: `.env.example` (solo la llave publicable;
  nunca una secreta ni `service_role`). **Fotos y logos**: en modo real se comprimen en el navegador y se suben al
  bucket `productos` de Storage (`<tienda_id>/<uuid>.webp`, logo en `<tienda_id>/logo/`; JPEG en iPhone porque
  Safari no crea WebP); la base guarda solo la URL pública. Reglas en `lib/data/almacen.ts`. La demo sigue con data URLs.

### Lo que sigue (en este orden)

1. **Terminar Supabase**: recarga mensual de créditos en la base, y el Resumen con consultas agregadas cuando el
   historial crezca (sus pruebas, `npm test`, son el contrato). El seed (~900 KB) sigue dentro del código de la
   app por la demo: se puede cargar bajo demanda. Borrar un producto entero (hoy no existe en la app) deberá
   borrar también sus fotos del bucket (`rutasParaBorrar` en `lib/data/almacen.ts`).
2. **Cuentas** (verificación de Instagram, zona de administración para crear tiendas y filas de `usuarios`,
   cobros manuales): `docs/07-fase-2-cuentas-y-cobros.md`. Hoy las filas de `usuarios` se crean a mano en Supabase.
3. **Retoque de fotos con IA de verdad** (hoy es un efecto de demostración) con su descuento de créditos en el servidor.
4. **Catálogo público integrado**: el HTML independiente pasa a leer la marca (`marca_*`, `url_catalogo`) y las
   promos de cada tienda; los enlaces de compartir promo dejan de depender del enlace que escribe el dueño.
5. **Notificaciones** de pedidos nuevos (hoy solo el contador) y **sincronización entre dispositivos**.
6. Pendientes del repaso: `docs/08-repaso-final.md` ("Pendiente").

### Interruptores de negocio (`lib/config.ts`)

- `RETOQUE_REAL` (hoy `false`): mientras sea `false`, el retoque de fotos se presenta como demostración (etiqueta "Demo").
  Al conectar el retoque de verdad, pasar a `true`.
- `MOSTRAR_MARCA_DESLIZAPP_EN_CUPON` (hoy `true`): el "Hecho con Deslizapp" al pie de la imagen del cupón; pensado
  para quitarse por plan.
- `STOCK_BAJO`, `CREDITOS_POR_RETOQUE`, límites y nombres de plan: ver el mismo archivo.

## Qué se espera de esta primera entrega

Construir las pantallas descritas en `docs/04-pantallas.md`, funcionando por
completo contra datos de prueba (ver `docs/05-arquitectura.md`), con
navegación real entre ellas, multi-tienda desde el modelo de datos (aunque el
selector de tienda pueda ser simple al inicio), y fiel a la identidad visual
de `docs/01-marca.md`. Al terminar, el dueño de una tienda debería poder abrir
la app, ver su catálogo, recibir y despachar un pedido, crear una promo y ver
su resumen semanal — todo con datos falsos pero con la sensación de producto
terminado.

El catálogo público integrado queda fuera de esta entrega (Supabase y el
acceso con Google llegaron en el paso 11) (están detallados como próximos pasos en
`docs/05-arquitectura.md` y `docs/06-orden-de-construccion.md`, para que quien
retome sepa exactamente qué sigue).


## Pedido despachado: estado y comprobante
En la hoja de un pedido despachado, «Despachado. Final feliz.» aparece al inicio como texto con check, sin fondo ni estilo de botón. Debajo de «Editar pedido» aparecen «Descargar factura» y «Compartir». Descargar abre una hoja para elegir PDF o imagen; el PNG y el PDF salen del recibo visual de `referencias/catalogo-esencias-michel.html` (ticket con logo, artículos, totales y pago). Compartir invoca la hoja nativa con el PNG y el texto: «¡Hola, {cliente}! Te comparto el comprobante de tu pedido #{número} de {tienda}. ¡Gracias por tu compra!». Si el navegador no admite compartir archivos, guarda el PNG y copia el texto. El comprobante no tiene valor fiscal; la app aún no guarda RNC ni NCF.

### Aplicación coordinada del inventario

No aplicar esta migración separada de una versión compatible de la app: restringe UPDATE directo de stock, y el editor publicado anteriormente lo incluía en su escritura. Una aplicación anticipada puede impedir guardar productos en esa versión. La PR sigue sin desplegar; la migración no está aplicada. En productos existentes, activar/desactivar el control de stock queda pendiente de una operación auditada específica; crear productos conserva esa elección inicial. El registro persiste sin añadir una pantalla de historial.
