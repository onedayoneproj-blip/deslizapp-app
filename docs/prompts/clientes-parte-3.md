# Parte 3 · Migrar Clientes al sistema de diseño (+ entrega y merge)

Contexto: estás en la rama feature/migrar-clientes. Las Partes 1 y 2 (ajustes de Pedidos, chin de deuda, etiqueta de pago) ya están hechas y subidas. Esta es la Parte 3 y la entrega. Reglas de siempre: lee AGENTS.md y la guía de Next que aplique en node_modules/next/dist/docs/, usa solo componentes de components/ui y tokens de app/globals.css (nada de hex sueltos ni tamaños de letra inventados), sigue docs/09-sistema-de-diseno.md, toma Pedidos como modelo y deja todo listo para modo oscuro (solo tokens, sin activarlo). Haz un commit para esta parte.

## Alcance

Archivos: components/clientes/* (vista-clientes, hoja-cliente, hoja-cliente-nuevo, hoja-cliente-editar, hoja-resumen-clientes, contenido-resumen-clientes, campo-nota, comunes, texto-resaltado, hoja-borradores-jugada) y components/credito/{cuenta-cliente, por-cobrar, tarjeta-saldado}.tsx, más las páginas de app/(dashboard)/clientes. Ninguno usa components/ui todavía. Reemplaza los <button>, <input>, <textarea>, filas y chips hechos a mano por los componentes del sistema, y los colores sueltos (#b4432a, #ff834f, #e3eee6, etc.) por tokens. No cambies la lógica, los datos, los textos ni la navegación, salvo lo que se indica abajo.

## Lista de clientes (vista-clientes)

- El buscador es el mismo Buscador de components/ui que usa Pedidos (foco verde de 2px, sin anillo naranja).
- El filtro "Qué clientes ver" hoy es un control segmentado. Pásalo a la fila de Pastillas con cápsula deslizante, igual que los filtros de Pedidos. Regla del sistema: los Segmentos son solo para cambiar de vista o modo, no para filtrar.
- La lista va en ListaAgrupada con FilaLista: Avatar, nombre (con resaltado de búsqueda), subtítulo y chevron. Toda la fila lleva al detalle y no hay botones de borrar en la fila.
- "Repite" pasa a Etiqueta de tono éxito.
- En el filtro de dormidos, el botón de WhatsApp de cada fila (hoy círculo menta solo con ícono) pasa al patrón "Escribir" del sistema: botón compacto de 36px relleno accion con ícono de WhatsApp y el texto "Escribir". Ocupa el lugar del chevron en esa fila y mantiene el mismo mensaje y aria-label.
- "Ver más clientes" usa Boton secundario, el mismo patrón que en Pedidos.
- Estados vacíos y esqueletos se quedan, pero con tokens. El botón flotante "Cliente" sigue siendo el FAB Mandarina.
- La dona del encabezado y el resumen se quedan igual en lo visual; solo tokens.

## Detalle del cliente (hoja-cliente)

- "Escribir" es Boton principal a todo lo ancho (52px) con ícono de WhatsApp. "Editar datos" es Boton secundario a todo lo ancho (52px) con ícono de editar.
- Las tarjetas de pedidos y total gastado se mantienen. El bloque rosa es decoración de marca y está permitido, pero con tokens y radios del sistema.
- La nota usa Campo en modo multilínea (foco verde, error peligro). "Guardar nota" es Boton principal compacto.
- Historial: ListaAgrupada con filas que llevan "#N", la fecha, la Etiqueta del estado con los mismos tonos que Pedidos (Despachado éxito, Por despachar/Confirmado neutro, etc.; reutiliza el mismo componente o mapa de tonos de Pedidos), el total y el chevron.
- Cuenta del cliente (credito/cuenta-cliente): "Te debe" y el resto pasan a tokens. La previsualización "Así le llega el recordatorio" se queda. Su botón de recordar por WhatsApp usa el patrón "Escribir" (o Boton principal si es la acción principal de la tarjeta). "Debe"/"A crédito" son Etiqueta de atención, "Pagado" de éxito.

## Nuevo cliente y Editar cliente (hoja-cliente-nuevo, hoja-cliente-editar)

- Todos los campos con Campo (etiqueta arriba, foco verde de 2px, error peligro de 2px con mensaje). Teléfono con el mismo formato y validación de hoy.
- Botón principal "Guardar" (o el texto actual) a todo lo ancho, abajo. "Cancelar", si existe, como terciario.
- Eliminar cliente: Boton terciario en tono peligro, con la misma confirmación de hoy usando Alerta del sistema.
- Sheets de altura automática salvo que el teclado o una lista que crece lo exijan.

## Resumen de clientes (hoja-resumen-clientes, contenido-resumen-clientes)

Tarjetas, listas y botones con componentes del sistema. Los atajos que filtran la lista (alFiltrar) siguen funcionando.

## Por cobrar (credito/por-cobrar, tarjeta-saldado)

- La tarjeta "Por cobrar" (fondo verde bosque) se queda como tarjeta destacada de marca, con tokens.
- Cada FilaPorCobrar usa FilaLista y su botón de recordar por WhatsApp sigue el patrón "Escribir" compacto.
- tarjeta-saldado conserva su animación (mov-aparece) y su fondo de marca, con tokens.

## No toques

luz-jugada.tsx y sus efectos decorativos (manchas de color, grano, pulso). En hoja-borradores-jugada solo migra los botones y las filas; los efectos se quedan.

## Verificación

- npm run lint, typecheck, tests y build sin errores. Corre revisar-estilos: no deben quedar hex ni tamaños sueltos en los archivos migrados (y sigue en 0 para Pedidos).
- Prueba en la vista previa de Vercel, idealmente en iPhone y en escritorio. Clientes: lista con búsqueda, cada filtro (incluido dormidos con "Escribir"), detalle, guardar nota, nuevo, editar, eliminar, cuenta con deuda y recordatorio, resumen. Pedidos (de las Partes 1 y 2): chin en los cinco casos, hoja con etiqueta de pago, despachar un pedido (sin hueco, botones visibles sobre la barra de Safari), descargar PDF e imagen con fondo blanco. Si algo no lo pudiste probar en iPhone, dilo en tu respuesta.
- Capturas en docs/capturas/clientes/ (lista, filtros, detalle, editar, nuevo, cuenta con deuda, resumen).

## Entrega (incluye el merge)

1. Commit y push, y abre la PR hacia main con un resumen corto que cubra las tres partes.
2. Si lint, typecheck, tests, build y toda la verificación pasan sin problemas, mezcla tú mismo la PR a main (squash merge) y borra la rama. No esperes mi aprobación.
3. NO mezcles si algo falla, si encontraste algo que necesite una decisión mía o si cambiaste algo que no está en estos prompts. En ese caso deja la PR abierta, explícame el problema y pásame el link de la vista previa.
4. En tu respuesta final dime: si mezclaste o no, el commit de main, el link de producción, un resumen de lo que cambió y cualquier decisión que tomaste.
