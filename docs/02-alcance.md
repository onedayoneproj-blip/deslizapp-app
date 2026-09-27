# Alcance de esta entrega

Decisiones ya tomadas por el dueño del producto (Lewis). No son abiertas a
reinterpretación — si algo no está claro, es preferible preguntar que asumir.

## Entra en esta versión

Las 6 pantallas completas, con navegación real entre ellas:

1. **Catálogo** — crear/editar productos, activar/desactivar, ver contador de plan
2. **Pedidos** — lista por estado, detalle de pedido, despacho (con efecto sobre stock)
3. **Resumen** — estadísticas de la semana
4. **Clientes** — mini CRM: quién repite, historial
5. **Promos** — códigos, por colección o por producto
6. **Retoque de fotos con IA** — toggle dentro del formulario de producto, con consumo de créditos

Ninguna de estas se recorta ni se deja "para después" — el dueño fue explícito
en que quiere el paquete completo que ya se validó en los mockups, no un
subconjunto.

## Multi-tienda desde el día uno

El modelo de datos, la autenticación y cada pantalla deben asumir que existen
**múltiples tiendas**, cada una con su propio catálogo, pedidos, clientes y
promos, completamente aislados entre sí. No construir para "una tienda" y
agregar multi-tenancy después — se construye multi-tenant desde el modelo de
datos (ver `03-modelo-de-datos.md`).

Para esta entrega, un selector de tienda simple (ej. un dropdown o una tienda
fija de prueba mientras no hay login real) es suficiente — lo que no puede
faltar es que el modelo de datos y las consultas ya filtren por `tienda_id`
en todo momento, como si hubiera muchas tiendas reales.

## Explícitamente fuera de esta entrega

- **Supabase real** — se construye con datos de prueba (ver `05-arquitectura.md`). Conectar Supabase es el siguiente proyecto, no este.
- **Login con Google real** — para esta entrega puede simularse (una tienda "de sesión" fija, o un selector). El diseño debe dejar el espacio para el login, pero implementarlo no es parte de este alcance.
- **Catálogo público** (lo que ve el cliente final, tipo Reels) — sigue siendo el HTML independiente que ya existe. No se integra a este proyecto todavía.
- **Pagos/facturación de Deslizapp a sus clientes** (las tiendas) — no es parte de este panel.
- **Retoque con IA real** — en esta entrega el retoque es simulado (ver `04-pantallas.md`, pantalla 6). Elegir y conectar el servicio de IA es un proyecto aparte.
- **Pedidos reales llegando desde el catálogo** — dependen de conectar el catálogo público a la misma base de datos. Aquí se simulan (ver `04-pantallas.md`).

## Quién es el usuario de esta app

El dueño (o encargado) de una tienda pequeña que vende por WhatsApp/Instagram
— como Esencias Michel. No es técnico, usa el celular más que la computadora,
y ya conoce Instagram/WhatsApp de memoria. La app debe sentirse tan simple
como esas dos apps que ya usa.
