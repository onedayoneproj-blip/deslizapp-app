# «Cómo funciona»: recorte de pasos, textos y arreglos

Encargo de Planning, 17 oct 2026. Lewis lo aprobó el 17 oct 2026. Tu puesto es **Coding** (Sonnet, salvo que Lewis diga otra cosa).

**Fuente:** `referencias/landing/analisis-grok-conoce-2026-10-17.pdf`, un análisis externo de `/conoce` en móvil. Planning lo revisó con Lewis y aquí está solo lo aprobado. **No hagas lo que el análisis propone y este encargo no recoge**: botón de WhatsApp, formulario «Pedir mi invitación», demo automática, precio en la primera pantalla, cambiar «Entrar» o recortar a 10 pasos.

## 1. Recorte: de 24 a unos 16 pasos
Cada paso fusionado conserva sus subanimaciones (`fases`) y su duración, que tiene que dejar leer.
- **`perfil` + `navegador` → un solo paso automático** (por ejemplo `enlace`). Reúsa `PerfilACatalogo` con una opción para que corra **una sola vez** y se quede en el catálogo abierto, en vez de repetirse.
  - Burbuja: «Tu cliente toca el link de tu bio y tu catálogo se abre ahí mismo, dentro de Instagram.» Remate: «Sin descargar nada. También desde tus estados.»
  - Di «link de tu bio», como en `/planes`.
- **`cambio-lado` + `cambio` → una sola transición.** Se queda `cambio-lado` y el paso `cambio` desaparece; si hace falta, su contenido pasa a `aviso`.
- **`eres-tienda`** se fusiona con `registrar`, o se quita si no aporta.
- **`aaah-termo` + `aaah-tote`** → un paso con sus dos fases. **`hola` + `pasa`** → un paso.
- Los separadores (`bienvenida`, `antes`, `solucion`) se quedan.
- Actualiza el índice (`CAPITULOS_NOMBRES`), los tests y `probar-landing`. Si un id desaparece, revisa la medición de `conoce_paso` (`docs/18-medicion.md`): los ids viejos se quedan en la lista de la base, no hace falta migración.

## 2. Textos
- **Quién es «tú»:** en los pasos de quien compra, la burbuja deja claro que se habla de la clienta. Para el primero: «Así lo ve tu cliente: desliza como en los Reels.» Revisa los demás pasos de compra con el mismo criterio.
- **«solucion»:** «…fotos, precios y lo que te queda en stock.» en lugar de «…y lo que queda».
- **El nombre de la marca:** en el texto corrido se escribe «Deslizapp». La palabra «deslizapp» en minúsculas solo aparece como logotipo, en la bienvenida.

## 3. Cierre: el precio
Junto a «Ver los planes», una línea pequeña: «Desde RD$499/mes · 30 días gratis». El precio sale de la tabla `planes` (el más barato con `se_ofrece`), nunca escrito en el código; la prueba gratis, de la constante que ya use `/planes`.

## 4. Arreglos visuales
- **`solucion`:** las burbujas «¿precio?» y «¿cuál era?» no pueden quedar detrás del icono. Sepáralas para que se lean.
- **Avisos de la tienda** («¡Ay, qué buena elección!…», «Confirmado. Pasa a Por despachar.»): en la demo no pueden tapar el nombre del producto, su descripción ni el encabezado «Pedidos». Ponlos arriba o que se vayan antes de que salga la burbuja.
- **La etiqueta del ♥** (número y «Lo quieren»): no se monta sobre el icono a 360 ni a 393.
- **Las rayitas del índice:** no pueden tocar ni montarse sobre el teléfono ni sobre las burbujas en móvil. Muévelas, achícalas o pásalas a una barra fina arriba; elige lo más limpio y dime qué hiciste.
- **El total del final (`despachar`):** en la demo sale directo en RD$1,500, sin contar desde 0 (una opción `sinConteo` o similar en `hoja-despachado`). En el panel real no cambia.
- **Un solo reloj:** la pantalla bloqueada, el pedido y las horas de las burbujas cuentan la misma historia. Fecha coherente (o sin fecha) y horas que avanzan de minuto en minuto. Nada de «martes 14 de octubre», que fue miércoles.

## 5. Técnico
- **`public/sw.js`:** solo se guarda en caché si `status === 200` y la petición no lleva `Range`, y se captura el error del `cache.put`. Lo mismo en `cachePrimero`.
- **`AvisoVersion`:** no se monta dentro de los iframes de la demo (`/demo-landing/...`, la tienda dentro del teléfono), para no multiplicar las consultas a `/api/version`.
- **Precargas:** quita las 4 que no se usan (los 3 CSS y `apple-touch-icon`), si salen del código del proyecto.

## Pruebas
- Tipos, lint, `npm test`, build, `probar-landing` y `probar-inicio`.
- Capturas de **cada paso** a 393×852 y 360×640 en `docs/capturas/conoce-recorte/`. Míralas con zoom antes de dar nada por bueno: nada tapado, nada cortado, nada montado.
- Di cuántos pasos quedan y la duración total aproximada.

## Entrega
PR contra `main`, sin fusionar: Lewis lo prueba antes. Añade «Qué probar en tu iPhone». Avisa a Planning al abrir el PR y al terminar.
