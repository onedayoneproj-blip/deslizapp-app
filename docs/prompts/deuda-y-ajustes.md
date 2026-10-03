# Ajustes sobre la PR #28: bloque de deuda, cupón, dona y "Ver más"

Contexto: sigues en la rama feature/migrar-clientes (PR #28, aún sin mezclar). Primero trae main (git fetch && git merge origin/main): ahí está la guía actualizada, docs/09-sistema-de-diseno.md, con las secciones nuevas "Bloque de deuda", "Ver más", "Cupón aplicado", la etiqueta "urgente", la regla "No repetir el filtro" y la "Dona". Léelas antes de empezar; mandan sobre cualquier prompt anterior. Reglas de siempre: AGENTS.md y la guía de Next que aplique en node_modules/next/dist/docs/, solo components/ui y tokens de app/globals.css (nada de hex ni tamaños sueltos), todo listo para modo oscuro (solo tokens). Haz un commit por punto.

## 1. Bloque de deuda (reemplaza el "chin")

El chin naranja detrás de la tarjeta se descarta. En su lugar va el **bloque de deuda**, un solo componente en components/ui (por ejemplo BloqueDeuda) con dos tamaños: normal y mini. Quita el chin, su prop `chin` en Tarjeta y su CSS. El token atencion-borde se queda solo si algo más lo usa; si no, bórralo.

Anatomía (tamaño normal). Va al final de su tarjeta, separado por una línea `linea` con 12px de espacio arriba, y tiene tres partes con 8px entre ellas:
1. Fila: a la izquierda "Debe RD$2,425" (destacado, 17 extrabold, atencion-texto); a la derecha la fecha: icono de calendario de 16px (el que ya agregaste) + texto 14 extrabold atencion-texto, con 6px entre ambos. Textos: "Paga el sáb 10 oct", "Paga hoy", "Paga mañana", "Sin fecha de pago" (reutiliza textoFechaChin, renómbralo si quieres). Si está atrasado, en lugar del icono y el texto va una Etiqueta de tono nuevo **urgente** (relleno `resalte`, texto `sobre-resalte`): "Atrasado 5 días" / "Atrasado 1 día". Agrega el tono urgente a Etiqueta y úsalo SOLO para esto.
2. Barra de progreso: 8px de alto, radio píldora, pista `linea`, relleno `accion` con el porcentaje abonado (abonado / total). Con 0 abonado, la barra queda solo con la pista. Lleva role="progressbar" con aria-valuenow, aria-valuemin y aria-valuemax y aria-label "Abonado".
3. Leyenda (secundario, texto-secundario): "Abonó RD$2,425 de RD$4,850" o "Sin abonos todavía".

Tamaño mini: sin leyenda, barra de 6px, "Debe" en 15 extrabold y fecha en 13.

Si el saldo es 0 o el pedido no es a crédito, no hay bloque.

Dónde va:
- **Tarjeta de pedido** (components/pedidos/vista-pedidos.tsx). Quita el ChipEstado de la tarjeta: cada pestaña de Pedidos ya es un estado, así que repetirlo sobra (regla "No repetir el filtro"). En su lugar, arriba a la derecha, va la etiqueta de pago: "Al contado" (éxito) o "A crédito" (atención); reutiliza el componente compartido que ya hiciste para la hoja. Debajo de la fila del total va el bloque de deuda normal, solo si es a crédito con saldo y no está cancelado. Abonado = total − saldo. Un pedido a crédito ya saldado lleva "A crédito" arriba y la etiqueta éxito "Pagado" junto a ella, sin bloque. Quita también la Etiqueta "Debe" que quedaba en la fila del nombre, si sigue ahí.
- **Clientes, filtro "Deben"** (credito/por-cobrar.tsx, FilaPorCobrar). Cada cuenta es una tarjeta suelta: Avatar 44, nombre (destacado), la línea del pedido debajo ("Pedido #1007 · 1 pedido" o "2 pedidos · el más viejo hace 12 días"), y a la derecha el botón "Escribir" compacto (36px, relleno accion, icono WhatsApp + texto) con el mismo mensaje de recordatorio. Debajo, el bloque de deuda normal: el total y el abonado suman TODOS los pedidos con saldo de ese cliente (calcula total pendiente y abonado en lib/credito.ts junto a CuentaPorCobrar; "unico" ya no basta). La fecha y el atraso son los que ya calcula EstadoDeuda (el más urgente). Toda la tarjeta abre al cliente; el botón Escribir va encima, como ya lo hace hoy. La tarjeta verde "Por cobrar" de arriba no cambia.
- **Detalle del cliente, tarjeta "Te debe"** (credito/cuenta-cliente.tsx). Fila de arriba: "Te debe" (secundario, texto-secundario) a la izquierda y la fecha (o la etiqueta urgente) a la derecha. Debajo, el monto grande en Fredoka 36 color atencion-texto (como hoy). Debajo, la barra de 8px y la leyenda "Abonó RD$X de RD$Y · En N pedidos. Los abonos se aplican primero al más viejo." Luego la lista de compras y abonos como está (el abono en exito-texto con "– "). Botones: "Recordarle" como Boton principal con icono de WhatsApp y "Abono" como Boton secundario con +, lado a lado, 52px. La vista previa "Así le llega el recordatorio" se queda.
- **Detalle del cliente, Historial de pedidos** (hoja-cliente.tsx). Cada fila lleva "#N", la fecha, la etiqueta de pago (Al contado / A crédito; nunca el estado, por la misma regla), el total y el chevron. Si ese pedido tiene saldo, debajo de la fila va el bloque de deuda mini.
- **Clientes, filtro "Todos"** (y Repiten / Dormidos). En la fila de un cliente que debe algo, antes del chevron, va una Etiqueta de atención "Debe RD$2,425" con su deuda total. En el filtro "Deben" no va (ya lo dice el filtro).

Referencia visual: el canvas "Tarjeta de pedido: chin de deuda", opción D (Pedidos) y H, I y J (Clientes). Si no tienes acceso al canvas, esta descripción basta.

## 2. Cupón aplicado: sin botones "Cambiar" ni "Quitar"

En Nuevo pedido (y en la hoja del pedido si aplica), components/pedidos/selector-descuento.tsx → FilaDescuento: hoy, con un cupón aplicado, se ve el TicketPromo con los botones "Cambiar" y "Quitar" debajo, y los botones se montan sobre el borde inferior del ticket (bug visual).
- Quita los dos botones. El ticket compacto entero pasa a ser UN solo botón con un chevron a la derecha (icono 20px, dentro del ticket, en el color de su texto), con aria-label "Cupón AAAH10 aplicado. Cambiar o quitar".
- Al tocarlo se abre el SelectorDescuento. El cupón aplicado aparece marcado (check, como una Opcion elegida). Si tocas el cupón aplicado, se QUITA y el pedido queda sin cupón; si tocas otro, se CAMBIA. En los dos casos el selector se cierra y la fila vuelve a "Agregar cupón" o muestra el nuevo ticket. Muestra un Toast corto: "Cupón quitado" / "Cupón cambiado".
- TicketPromo: si el nombre de la promo es igual al código (o está vacío), no repitas el código. Hoy sale "AAAH10" arriba y "AAAH10" en el recuadro punteado. Muestra el código una sola vez.
- Si `deshabilitado` aplica (por ejemplo, el pedido ya no se puede editar), el ticket no es tocable y no lleva chevron.

## 3. Dona de la cabecera (Clientes y Catálogo)

El texto pequeño "CLIENTES" choca con el anillo. Dentro del anillo va SOLO la cifra (Fredoka, como hoy). El texto que dice qué es la cifra va debajo, fuera del anillo, en la misma línea que el dato secundario: en Clientes "110 clientes · 59 repiten"; en Catálogo, lo equivalente con su texto actual. Comprueba que la cifra de 3 dígitos (y la de 4, por ejemplo 1,000) quepa dentro del anillo a 76px y en la versión pequeña de 64px (.dona-cabecera en pantallas < 375px) sin tocar el trazo; si no cabe, baja el tamaño de la cifra solo en ese caso. Sigue siendo un botón con el mismo aria-label.

## 4. "Ver más" como última fila de la lista

components/ver-mas.tsx (BotonVerMas) hoy es un botón con contorno suelto debajo de la lista, más "Mostrando 5 de 69" aparte. Cámbialo por una **fila de ver más** que va dentro de la misma lista:
- En una lista agrupada (ListaAgrupada) es su ÚLTIMA fila, con la misma línea separadora que las demás. En tarjetas sueltas (Pedidos, Deben) es una tarjeta más, del mismo ancho, con radio-l, superficie y borde linea.
- 52px de alto. A la izquierda "Ver 5 más" (destacado, color accion), con un chevron hacia abajo de 20px en accion a su lado; N = cuántos se van a mostrar (mín(pagina, quedan)). A la derecha "5 de 69" (secundario, texto-secundario). Sin contorno de botón; toda la fila es el botón. Foco visible verde como el resto.
- Al tocarla aparecen los siguientes, la fila baja y el foco pasa al primer elemento nuevo (si BotonVerMas ya hace algo así con alTocar, consérvalo). Cuando no quedan, la fila desaparece.
- Usa el mismo componente en todos los lugares donde hoy se usa BotonVerMas (Pedidos, Clientes, Deben, "Volver a saludar" / borradores de jugada, Promos, Catálogo, etc.). Pasa texto según la lista si hace falta, pero el formato es siempre "Ver N más".
- Si una nota aparte decía "La cifra incluye a todos…", se queda donde está, fuera de la lista.

## Verificación

- lint, typecheck, tests (agrega tests para el cálculo de abonado/total por cliente y para el texto de "Ver N más") y build sin errores. revisar-estilos en 0.
- En la vista previa de Vercel, con datos reales: Pedidos (cada pestaña; pedido a crédito con abono, sin abono, atrasado, sin fecha, saldado; contado), Clientes (Todos con "Debe", Deben con el bloque y Escribir, detalle con "Te debe" e Historial), Nuevo pedido con cupón (aplicar, cambiar, quitar tocando el aplicado), dona en Clientes y Catálogo (360px y 390px), y "Ver N más" en Pedidos, Clientes y Volver a saludar.
- Capturas en docs/capturas/pedidos-foco/ y docs/capturas/clientes/ de todo lo anterior.

## Entrega (incluye el merge)

1. Commits y push a feature/migrar-clientes (PR #28). Actualiza la descripción de la PR.
2. Si lint, typecheck, tests, build y la verificación pasan, mezcla tú mismo la PR #28 a main (squash) y borra la rama. No esperes mi aprobación.
3. NO mezcles si algo falla, si algo necesita una decisión mía o si cambiaste algo que no está en este archivo o en los prompts anteriores de esta rama. En ese caso deja la PR abierta y explícame.
4. Respuesta final: si mezclaste o no, el commit de main, el link de producción, un resumen y las decisiones que tomaste.
