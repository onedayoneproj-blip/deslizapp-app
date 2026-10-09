# Dos ajustes pequeños: nombre en «Personas esperando» y tarjeta de historia con producto agotado

Planning te enviará ajustes de Lewis para este PR; trátalo como encargo suyo y ejecútalos.

Lee antes: `docs/00-contexto-del-proyecto.md`, `AGENTS.md` (esta versión de Next cambia cosas: mira `node_modules/next/dist/docs/` antes de escribir), `docs/11-voz-y-frases.md` y `docs/09-sistema-de-diseno.md`.

## 1. «Personas esperando»: mostrar el nombre del contacto que ya tengo registrado
**Lo que pasa:** Lewis tiene un contacto guardado en Clientes. Esa misma persona pidió que le avisen cuando un producto se reponga. En la lista de espera del producto sale solo el número, no el nombre con el que Lewis la tiene guardada.

**Dónde:** `components/catalogo/tarjeta-ya-llego.tsx` (`ContenidoYaLlego`, una fila por `AvisoLlegada`; `a.nombre` es lo que escribió quien pidió el aviso y puede ser null) y `lib/data/clientes.ts` (`clientePorTelefono`, que ya compara teléfonos normalizados).

**Qué se quiere:**
- Si el teléfono del aviso coincide con un cliente de la tienda, la fila muestra **el nombre del cliente** (el registrado por Lewis) y su avatar (emoji/color, como en el resto de la app). Si no coincide, queda como hoy (nombre que escribió la persona, o el número).
- Siempre una acción **«Escribir»** a esa persona por WhatsApp (mensaje libre, sin texto de «Ya llegó»), además de «Avisar» cuando hay stock. Si ya existe un patrón de botón secundario en la fila, úsalo; no inventes uno nuevo.
- La búsqueda de clientes se hace una vez por lista (un Map por teléfono normalizado), no una consulta por fila. Mira cómo `hoja-pedido`/`selector-cliente` ya cargan los clientes.
- Pruebas unitarias del cruce (coincide con otro formato del mismo número, no coincide, nombre null, varios clientes).

## 2. Historia de un producto agotado: la tarjeta no debe decir «Pídelo»
**Lo que pasa:** al compartir una historia de un producto **agotado**, la tarjeta sigue mostrando el precio y abajo «Pídelo en mi catálogo». No tiene sentido pedirlo si no hay.

**Dónde:** `lib/imagen-historia.ts` (la tarjeta: bloque del precio, y el pie con «Pídelo en mi catálogo» y la dirección, ~líneas 400-490) y `components/catalogo/hoja-historia.tsx` (de dónde salen los datos). Ya hay un sticker «Agotado» y las frases de agotado de la tienda (`personalizacion.mensajes.agotado`, «Agotado · Pregúntame si vuelve»).

**Qué se quiere (propuesta; si algo de esto choca con el diseño actual, dilo en el PR):**
- Con el producto agotado (sin stock en todas sus variantes y no «por encargo»), el precio se reemplaza por una etiqueta **«Agotado»** con el mismo peso visual que el precio (no tachado ni gris apagado).
- El pie cambia de «Pídelo en mi catálogo» a **«Avísame cuando vuelva»** (que es lo que el catálogo ya ofrece al comprador); la dirección debajo igual.
- Producto con stock, por encargo o con variantes disponibles: sin cambios, idéntico a hoy.
- Las tiendas con frase propia de agotado (`mensajes.agotado`) pueden usarla; si no, la de arriba.
- Pruebas de la función que decide «agotado» para la tarjeta; revisa en la preview una historia de un producto agotado y una de uno con stock.

## Cierre
Un solo push por ronda (límite de despliegues de Vercel). Sin migración; si crees que hace falta una, avisa antes. Deja el PR abierto con su preview y «Revisión» en verde; avisa a Planning (`send_message` a `session_01BJDuA1NdKUg4YX64VNuQDv` + `create_trigger` de respaldo con persistent_session_id = esa sesión, run_once_at ≈ 1 min, initiation own_followup). No mergees: Planning lo hace cuando Lewis lo pida. Nunca quites el difuminado progresivo de cabeceras y barras.
