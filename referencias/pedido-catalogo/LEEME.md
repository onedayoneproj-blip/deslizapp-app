# Pedido del catálogo: referencias de diseño

Tableros del canvas "Pedido del catálogo" (Claude Design), aprobados por Lewis el 3 de octubre de 2026. Especificación: `docs/12-catalogo-conectado.md` §6.

Muestran **qué va y dónde, con qué tamaños y textos**. **No son código para copiar.** En `capturas/` están como imagen, que es lo más fácil de mirar. Los `.dc.html` traen las medidas exactas: ábrelos en un navegador; los estilos van dentro.

| Tablero | Qué muestra | Parte |
|---|---|---|
| `WhatsApp` | El mensaje que manda el comprador, con "Mi pedido #K7F2QX:", el enlace corto y la tarjeta de vista previa. | 4 |
| `Comprador` | `/pedido/{codigo}`: la pantalla de pedido del catálogo de hoy, con la hoja de estado. En la parte 4 va sin la barra de pasos y sin "¿Eres la tienda?". | 4 (sin estado) y 3 (estado) |
| `Estados` | La misma hoja en Enviado, Confirmado, Despachado, Cancelado y Vencido, con el color de cada estado. | 3 |
| `EresLaTienda` | La tienda en iPhone la primera vez: entra con Google desde Safari. | 3 |
| `Registrar` (+ `-b`, `-c` en capturas) | Vista de la tienda "Registrar pedido": lo agotado se resuelve ahí mismo, "¿Quién te escribió?" con "Nuevo cliente" arriba, y el pedido registrado. | 3 |
| `Buscar` | El selector de cliente buscando por número: "Crear «809 555»" arriba. | 3 |
| `Respaldo` | La fila "N del catálogo por registrar" arriba en Pedidos › Nuevos. | 3 |
| `PorRegistrar` | La lista de solicitudes vigentes. | 3 |
