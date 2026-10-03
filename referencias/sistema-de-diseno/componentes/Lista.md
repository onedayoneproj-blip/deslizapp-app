# Lista

Dos formas de listar, cada una con su trabajo: agrupada (filas en una sola tarjeta) y tarjetas sueltas.

**Agrupada** (`superficie`, borde `linea`, `radio-l`, filas de 60 px separadas por `linea`)

Para filas del mismo tipo, sencillas, que se recorren de corrido: clientes, productos de un pedido, ajustes, menú de la tienda, historial de abonos e inventario. Cada fila: avatar o icono opcional, nombre en `destacado`, una línea `secundario`, y chevron si abre algo. Toda la fila es tocable. Las filas no llevan botón de borrar: una fila de historial (abono, movimiento) abre una hoja con su detalle y sus acciones.

**Tarjetas sueltas** (una tarjeta por elemento, `espacio-3` entre ellas)

Para elementos con estado propio, varias líneas o acciones propias: pedidos, cuentas por cobrar, promos, productos del catálogo (en cuadrícula de dos columnas).

**Regla rápida:** si la fila lleva etiqueta de estado o un botón propio, va suelta; si solo lleva texto y chevron, va agrupada. Una lista nunca mezcla las dos formas.

**Props previstas:** `ListaAgrupada` con hijos `FilaLista` (`titulo`, `detalle?`, `inicio?` avatar o icono, `fin?` monto o chevron, `href` u `onClick`). Las tarjetas sueltas usan `Tarjeta` dentro de una lista con `gap`.
