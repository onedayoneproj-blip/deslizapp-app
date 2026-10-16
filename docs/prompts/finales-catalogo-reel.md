# Finales del catálogo como reels: «Ya estás al día» y «Hecho con Deslizapp»

Encargo de Planning, 16 oct 2026. Tu puesto es **Coding** (Sonnet). Parte de `main` actualizado. Diseño aprobado por Lewis: [`referencias/finales-catalogo/`](../../referencias/finales-catalogo/LEEME.md). Lee el LEEME y los dos `.dc.html` (medidas, textos y jerarquía; **no copies su HTML**).

## Problema
Las dos últimas tarjetas del catálogo de comprador rompen el lenguaje de los reels:
- **«¡Ya viste todos mis productos!»** (`components/tienda/catalogo.tsx`, `<article className="reel fin">`, ~líneas 887-968) es un fondo claro con un avatar, un título centrado y botones de formulario. No usa la marca de la tienda más allá del color de texto.
- **«Hecho con Deslizapp»** (`ArteFinal` en `components/tienda/artes-deslizapp.tsx`, ~línea 3663) es un cartel mandarina con el logo grande. No se parece a un reel ni al landing nuevo.

Al deslizar desde un producto, las dos se sienten como otra app.

## Decisión de Lewis
Las dos tarjetas pasan a ser **reels**, como los de producto: imagen a pantalla completa, la cabecera de la tienda encima (como ya ocurre), y el contenido en el pie, abajo a la izquierda, con el mismo margen que el pie de un reel de producto. **Sin la columna de botones de la derecha** (♥, Pregúntame, Compartir) en estas dos tarjetas.

## 1. Fin del catálogo con la marca de la tienda (`fin-del-catalogo.dc.html`)
Todo sale de `temaDeTienda(t)` (`lib/tienda/tema.ts`): colores principal y acento, y las fuentes del estilo de Mi marca. Nada fijo de una tienda concreta.

- **Fondo:** mosaico 2×2 de fotos difuminadas (blur fuerte, ligeramente ampliado para que no se vean bordes), cubierto con un velo del color principal al ~62% y un degradado oscuro arriba y abajo, como el `shade` del reel.
  - Fotos: las del pedido si hay. Si no, las primeras de la lista visible. Si no hay fotos, solo el color principal.
- **Centro (debajo de la cabecera):**
  - Anillo de ~96px en degradado cónico de acento a blanco, con un ✓ blanco sobre el principal.
  - Título **«Ya estás al día»** con la fuente display de la tienda (~40px).
  - Debajo, «Viste los N {nombreLista} de {t.nombre}». Con filtro de colección: «Viste toda la colección {nombre}».
- **«Sigue viendo»:** fila de círculos con anillo de historia (~58px) y nombre debajo.
  - Muestra las colecciones (`coleccionesDe`) o los catálogos (`catalogosDe`), según lo que muestre `pestanaDelFeed` en la cabecera. Excluye la que se está viendo y pon hasta 4.
  - Al tocar uno, se aplica ese filtro o se abre ese catálogo con las funciones que ya existen, y se va al primer producto.
  - Si no hay a dónde seguir, la fila no aparece.
- **Pie, con pedido (`cart.length > 0`):**
  - La cuenta de la tienda, como en el pie del reel.
  - «Te gustaron N» con la fuente display.
  - Hasta 3 miniaturas con borde blanco, más el total.
  - Botón ancho blanco con texto del color principal y el icono de WhatsApp: «Pedir {los N | el producto} por WhatsApp». Hace lo mismo que el actual «Enviar mi pedido a…» (`enviar()`, respeta `enviando`).
  - Debajo, dos enlaces de texto: «Ver o cambiar mi pedido» (`abrir("pedido")`) y «↑ Volver al primero».
- **Pie, sin pedido:** «Dale ♥ a los que te gustaron y me mandas tu pedido por WhatsApp.» y «↑ Volver al primero».
- **Catálogo publicado sin productos:** el mismo reel con el texto de «pronto» que ya existe (`textoCatalogoPronto`, `SUBTEXTO_CATALOGO_PRONTO`), sin fila ni botones.
- **Contraste:** si el color principal es claro (usa `textoSobre` de `lib/marca.ts`), el texto y el ✓ pasan a oscuro y el velo se ajusta para que se lea.
- **Ajuste a la pantalla:** debe caber en 360×640 sin scroll. Si no cabe, primero se esconde la fila «Sigue viendo» y después se reduce el anillo.

## 2. Hecho con Deslizapp (`hecho-con-deslizapp.dc.html`)
Usa la marca de Deslizapp (tokens del landing: verde #174b3a, crema #fff9ee, rosa #f5c9d6, mandarina #ff834f; Fredoka, Figtree y Caveat). La cabecera de la tienda queda encima, como ahora.

- **Fondo:** mandarina con dos formas redondeadas (verde arriba a la derecha y rosa a la izquierda), más un degradado oscuro suave arriba y abajo.
- **Contenido del reel:** una conversación de WhatsApp entre Deslizapp y quien compra.
  - Burbujas crema: «¿Te gustó comprar deslizando? 👀» y «Tus clientes ya saben usarla: deslizan, le dan ♥ y te escriben.».
  - Respuesta rosa a la derecha con doble check: «¡Quiero la mía!».
  - Al final, los tres puntos de «escribiendo».
  - Cuando el reel está `activo`, las burbujas aparecen una tras otra, como un chat que se graba. Con `prefers-reduced-motion` aparecen todas a la vez (`docs/08-movimiento.md`).
- **Pie:**
  - Avatar con el icono de la app y «@deslizapp · hecho con».
  - Título «Ese **aaah** ya tiene nombre.» en Fredoka, verde, con «aaah» en crema.
  - «Y tu tienda puede tener el suyo.».
  - Dos botones píldora: «▶ ¿Cómo funciona?» (crema) abre las historias de «Cómo funciona», como hoy (`data-vv` y `secciones.como_funciona`). «Escríbenos» (verde, con el icono de WhatsApp) usa el `contacto` actual.
- **Otros usos:** si `ArteFinal` o sus estilos (`.irbg`, `.deco`…) se usan fuera del catálogo (landing, `/conoce`, demos), no cambies esos usos. Crea el reel nuevo aparte o con una variante y comprueba que el landing no cambia.

## Comportamiento que se conserva
- El orden «último producto → fin → Deslizapp» y las clases `on`/`prev`/`next`.
- La navegación con flechas y teclado.
- Que `BotonPedido` se oculte en estas dos tarjetas.
- Los `data-id` `fin` y `deslizapp`.
- El tema oscuro de la tienda (comprobar).

## Pruebas
- Tipos, lint, `npm test` y build.
- Los `scripts/probar-*.mjs` que tocan el catálogo de comprador (busca `r-fin`, `deslizapp` y «Ya viste» y actualiza los textos que cambian).
- `probar-landing` sin cambios nuevos (su único ✗ también falla en `main`).
- Capturas a 393×852, cada una con dos marcas distintas (una elegante oscura y una clara), en tres estados: fin con pedido, fin sin pedido y tarjeta de Deslizapp. Una más a 360×640.

## Entrega
- PR contra `main`. Cambia lo que ven los compradores, así que **no lo fusiones**: Planning revisa y Lewis prueba antes.
- Entrada corta en `lib/novedades.ts`.
- «Qué probar en tu iPhone» en el PR.
- Avisa a Planning (`@parent` o el identificador que te pasen) al abrir el PR, si tienes una duda que cambia lo que se ve, y al terminar, con PR, HEAD, preview, «Revisión», pruebas hechas y no hechas.
