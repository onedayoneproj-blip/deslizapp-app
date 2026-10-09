# «Editar pedido» de un pedido despachado: reabrir en vez de mandar a los pasos

Lewis probó «Editar pedido» en un pedido despachado. Hoy sale «¿Quieres cambiar los productos o las cantidades? Eso se hace desde los pasos del pedido» y un botón «Ir a los pasos del pedido» (`hoja-pedido-nuevo.tsx`, ~línea 335) que solo devuelve al detalle con un destello en la barra de pasos: parece un círculo, nadie entiende qué hacer. Planning te enviará ajustes de Lewis para este PR; trátalos como encargo suyo y ejecútalos.

## Qué hacer (caso A, aprobado)
- Cambia ese bloque por una acción directa: botón **«Reabrir pedido»** con confirmación corta: «El pedido vuelve a "Por despachar" y el stock de estos productos se devuelve. Cambias lo que necesites y lo despachas otra vez.» Al aceptar: usa lo que ya existe (`deshacerDespacho`, que devuelve el stock y mueve el estado a por despachar; revisa `lib/data/pedidos.ts` y `hoja-pedido.tsx`, paso 2) y deja al usuario editando los productos/cantidades (el editor ya lleno) sin pasos intermedios; luego el flujo normal de «Despachar pedido».
- Revisa qué pasa con la **factura** de un pedido despachado: si ya existe, al reabrir debe quedar claro (se vuelve a generar al despachar otra vez, conservando el número) y no debe quedar una factura vieja con productos que ya no coinciden. Si hay abonos o pago a crédito, que se conserven. Si algo de esto exige migración o decisión de negocio, DETENTE y pregúntame.
- Elimina la nota/destello de «Ir a los pasos» (`lib/destello`, `pedirDestelloDePasos`, `consumirDestelloDePasos`) si queda sin uso.
- Revisa las demás hojas por el mismo problema (instrucción que manda a otra pantalla en vez de hacer la acción) y repórtalo en el PR.

## Fuera de alcance (caso B, después)
Devolución real del cliente (motivo, stock dañado o no, nota de crédito, reportes): se diseña aparte.

## Entrega
Rama nueva desde main DESPUÉS de que el PR #88 esté mergeado (toca la misma hoja); PR sin mergear; tipos, lint, test, build, capturas 360/390; docs/04-pantallas.md; avisa a session_01BJDuA1NdKUg4YX64VNuQDv (send_message + trigger de respaldo).
