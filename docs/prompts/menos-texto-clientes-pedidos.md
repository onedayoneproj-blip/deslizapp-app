# Menos texto en Clientes y Pedidos + recordatorio con mensajes

Contexto: crea la rama `fix/menos-texto` desde main actualizado (git checkout main && git pull). Antes de empezar, lee completo docs/09-sistema-de-diseno.md. Hay reglas nuevas que mandan sobre todos los prompts anteriores: el principio "menos texto, nada repetido" al inicio, "Orden de los filtros", "Bloque de deuda", la tabla de jerarquías de botones (Recordarle principal y Registrar abono secundario) y la señal de "repite" en el Avatar. Reglas de siempre: AGENTS.md y la guía de Next que aplique en node_modules/next/dist/docs/, solo components/ui y tokens (nada de hex ni tamaños sueltos), todo listo para modo oscuro. Haz un commit por punto.

Referencia visual: el canvas "Cliente: cobro y recordatorio", tableros "Detalle del cliente", "Iconos de movimientos" y "Sin texto de más". Si no tienes acceso, esta descripción basta.

## 1. Filtros de Clientes

- El orden es `Todos · Deben · Repiten · Nuevos · Dormidos`, sin divisor. Quita el divisor de FilaPastillas (y sus props `condicional`/`sinDivisor` si ya no se usan en ningún lado; revisa también Pedidos y selector-producto).
- Todo filtro con contador en 0 se oculta, salvo "Todos" y el que esté activo. "Deben" lleva el contador `resalte`; los demás, `accion-suave`.
- Quita "Del catálogo" de la fila.
- La hoja "Tus clientes" (hoja-resumen-clientes / contenido-resumen-clientes) ya no agrega pastillas nuevas: sus filas solo pueden llevar a un filtro que ya existe (Deben, Repiten, Nuevos, Dormidos). Las filas sin filtro propio ("Compraron una vez", "Sin comprar", "Del catálogo", "A mano") quedan como dato, sin chevron ni toque. Si eso deja tipos de FiltroClientes sin uso, bórralos.

## 2. "Repite" pasa a ser una señal en el avatar

- Agrega a Avatar (components/ui) una señal opcional `repite`: un círculo `accion` de 20px con un corazón relleno `sobre-accion` (el corazón de la marca, ya está en iconos o en el patrón), con borde `superficie` de 2px, en la esquina inferior derecha. Su texto va en el aria-label de la fila o del avatar ("repite").
- Úsala en la lista de Clientes, en "Deben" y en la cabecera del detalle del cliente. En el filtro "Repiten" no se muestra (ya lo dice el filtro).
- Borra EtiquetaRepite y todos sus usos.

## 3. Deuda sin píldoras

- Etiqueta: quita el tono `urgente`. Lo atrasado ya no lleva píldora en ninguna parte.
- BloqueDeuda (texto de la fecha, reutiliza la función que ya tienes):
  · futura: icono calendario + "Paga el sáb 10 oct"; hoy: "Paga hoy"; mañana: "Paga mañana"; sin fecha: "Sin fecha de pago";
  · vencida: icono de RELOJ en `resalte` (16px) + "Quedó de pagar el 27 sep" (texto `atencion-texto`, 14 extrabold). Nada de "Atrasado N días".
  · Prefijo del monto: "Debe RD$X" en Pedidos y "Te debe RD$X" en Clientes (prop del componente).
- Tamaño normal (tarjeta de pedido, tarjeta de "Deben"): fila con el monto y la fecha + barra de 8px. Quita la leyenda "Abonó X de Y" en estas dos tarjetas: la barra ya lo muestra y el número exacto está en el detalle.
- Tamaño mini (filas de lista agrupada: Todos/Repiten/Nuevos/Dormidos de Clientes e Historial del cliente): debajo del subtítulo, UNA línea con icono: "Te debe RD$1,900 · quedó de pagar el 27 sep" o "Te debe RD$2,425 · paga el vie 9 oct" (o "· sin fecha de pago"), en `atencion-texto` 14 extrabold, y debajo la barra de 6px. Nada a la derecha de la fila salvo el chevron. Verifica que no se trunque a 360px; si no cabe, la línea puede partirse en dos, pero nunca cortarse con "…".

## 4. Lista de Clientes

- "Todavía no pide. Todavía." pasa a "Sin pedidos".
- Fila: Avatar (con señal repite) · nombre · subtítulo ("11 pedidos · RD$28,700") · línea mini de deuda si debe · chevron. Ninguna etiqueta.

## 5. Filtro "Deben" (FilaPorCobrar)

- La línea bajo el nombre pasa a ser solo "1 pedido" / "2 pedidos". Quita "pagó RD$X de Y", "sin abonos todavía" y "el más viejo hace N días": la barra y la fecha ya lo cuentan.
- El bloque es el normal, sin leyenda. "Escribir" compacto se queda.
- El aria-label de la tarjeta conserva todo el detalle (nombre, cuántos pedidos, cuánto debe, cuánto abonó y la fecha).

## 6. Detalle del cliente (hoja-cliente + credito/cuenta-cliente)

- Cabecera: avatar 64 con la señal repite. Nombre sin etiqueta. Debajo, el teléfono (quita "· Del catálogo" / "· Manual"). Debajo, en una fila, "Escribir" (compacto relleno con WhatsApp) y "Editar" (secundario compacto con icono de editar). Ya no van como dos botones grandes.
- Tarjeta "Te debe": fila "Te debe" (secundario) a la izquierda y la fecha a la derecha (con las reglas del punto 3), el monto grande en Fredoka `atencion-texto`, la barra de 8px y la leyenda corta "Abonó RD$2,425 de RD$4,850". Quita "En N pedidos. Los abonos se aplican primero al más viejo."
- Movimientos: lista agrupada debajo de la tarjeta. Cada fila lleva un círculo de 40px a la izquierda, un título, un subtítulo (fecha y, si hay, nota o "quedó en pagar el 9 oct"), el monto y el chevron:
  · Compra: icono bolsa en `superficie-hundida`, monto en `texto`.
  · Abono: IconoMoneda (el que ya usa la app) en `accion-suave`, monto en `exito-texto` con "– ".
  · Pedido saldado (si el historial lo tiene): check `sobre-accion` sobre `accion`.
  · Si hace falta un icono que no existe (bolsa), agrégalo a components/iconos.tsx con el mismo trazo 2.2 redondeado.
- "Registrar abono": Boton secundario grande a todo lo ancho, con +, debajo de los movimientos.
- Recordatorio: una sola tarjeta `accion-suave`, radio-l, que agrupa:
  · arriba, "Así le llega el recordatorio" (secundario, extrabold) a la izquierda y a la derecha un selector compacto con el nombre del mensaje elegido y un chevron hacia abajo (fondo `superficie`, píldora, 36px, aria-label "Cambiar el mensaje. Ahora: Con cariño");
  · la burbuja blanca con el mensaje;
  · abajo, "Recordarle por WhatsApp", Boton PRINCIPAL grande a todo lo ancho con el icono de WhatsApp, que abre WhatsApp con el mensaje elegido.
  Al tocar el selector se abre una Hoja "Elige el mensaje" con cuatro Opcion (check en círculo al elegir), cada una con su título y el texto completo debajo (secundario, texto-secundario). Al elegir, la hoja se cierra y cambian la burbuja y el enlace. Los mensajes van en lib/credito.ts junto a mensajeRecordatorio, con los datos reales (nombre, vendedora, tienda, monto, fecha):
  · "Con cariño" (el actual);
  · "Con la fecha": "¡Hola, {nombre}! Te escribe {vendedora}, de {tienda}. Te recuerdo que quedamos en el pago de {monto} para el {día largo, ej. viernes 9 de octubre}. ¡Gracias!" (solo si hay fecha);
  · "Corto": "Hola, {nombre}. Te recuerdo el pendiente de {monto} con {tienda}. ¡Gracias!";
  · "Si ya pasó la fecha": "¡Hola, {nombre}! Te escribe {vendedora}, de {tienda}. El pago de {monto} quedó para el {fecha} y todavía aparece pendiente. ¿Me confirmas cuándo puedes? ¡Gracias!" (solo si está vencido).
  Mensaje elegido por defecto: "Si ya pasó la fecha" cuando está vencido; si no, "Con cariño". Si falta la vendedora, usa la versión sin "Te escribe…".
- Historial de pedidos: cada fila lleva "#N", la fecha, el total y el chevron, SIN etiqueta (ni de pago ni de estado). Si el pedido tiene saldo, la línea mini de deuda del punto 3 va debajo.
- Nota: sin cambios.

## 7. Tarjeta de pedido (vista-pedidos)

- "#1007 · Ayer, 10:18 a. m." pasa a "#1007 · Ayer" (solo la parte relativa o la fecha; la hora queda en el detalle).
- "1 producto · Manual" pasa a "1 producto" (quita el origen).
- La etiqueta de pago ("A crédito" / "Al contado") se queda arriba a la derecha. En crédito saldado, "Pagado" (éxito) EN LUGAR de "A crédito", no junto a ella: una sola etiqueta por tarjeta.
- El bloque de deuda (normal, sin leyenda) se queda.

## 8. Hoja del pedido (hoja-pedido + credito/pago-del-pedido)

- Fila de arriba: solo la fecha y hora ("3 oct, 10:18 a. m."). Quita el origen ("· manual" / "· desde el catálogo") y el ChipEstado, salvo "Cancelado" (que la barra de pasos no puede mostrar).
- Quita "Despachado. Final feliz." (la barra de pasos ya lo dice).
- Quita la nota a mano "al despachar, el stock se actualiza solito".
- Pedido cancelado: quita el Aviso "Pedido cancelado. Pasa hasta en las mejores tiendas." (el chip "Cancelado" basta).
- Productos (EtiquetasStock): en pedidos sin despachar, etiqueta SOLO si el stock no alcanza para la cantidad ("Sin stock" fuerte, o "Quedan N" atención cuando 0 < stock < cantidad). Quita "Sin control" y "Quedan N" cuando sí alcanza. Despachado: solo "Agotado" si quedó en 0.
- Total: quita la EtiquetaPago junto al Total (la tarjeta de Pago ya lo dice).
- Tarjeta de Pago, de contado: se queda ("✓ Pagado" + "Cambiar a crédito").
- Tarjeta de Pago, a crédito: título "Pago" con UNA etiqueta ("A crédito" o, si está saldado, "Pagado"). Debajo, el BloqueDeuda normal con prefijo "Debe" y CON la leyenda "Abonó X de Y" (aquí sí, es el detalle). Quita la fila "Debe … Pagó X de Y" y la LineaFecha aparte (ya van dentro del bloque). Abonos con IconoMoneda como hoy.
- Botones de la tarjeta de Pago: "Recordarle por WhatsApp" como PRINCIPAL (relleno, con icono) y "Registrar abono" como SECUNDARIO, en ese orden (el principal arriba, o a la derecha si van lado a lado).

## Verificación

- lint, typecheck, tests y build sin errores; revisar-estilos en 0. Actualiza o agrega los tests de los textos de fecha ("Quedó de pagar el…") y de los mensajes de recordatorio.
- En la vista previa, con datos reales y a 360px y 390px: los filtros (Deben segundo, sin divisor, sin pastillas extra al tocar la hoja "Tus clientes"); la lista de Clientes con alguien que repite y debe atrasado (sin píldoras); Deben; el detalle del cliente (cabecera, Te debe, movimientos con iconos, Registrar abono, recordatorio con los 4 mensajes); las tarjetas de pedido; y la hoja del pedido (nuevo, por despachar con y sin stock, despachado, cancelado, contado, crédito con abono y saldado).
- Capturas antes y después en docs/capturas/menos-texto/.

## Entrega (incluye el merge)

1. Commits y push, y abre la PR hacia main con un resumen.
2. Si lint, typecheck, tests, build y la verificación pasan, mezcla tú mismo la PR (squash) y borra la rama.
3. NO mezcles si algo falla, si necesitas una decisión mía o si cambiaste algo que no está aquí. En ese caso deja la PR abierta y explícame.
4. Respuesta final: si mezclaste o no, el commit de main, el link de producción, un resumen y las decisiones que tomaste.
