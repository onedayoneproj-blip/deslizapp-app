# Compartir en historia, fase 1 sin stickers (rama `feat/compartir-historia`)

> **Modelo:** Sonnet 5.5. **Sin migraciones.** Lo ven los clientes de la tienda (la imagen y el enlace): **PR abierto con preview**, no hagas merge.
> **En paralelo** con el PR #78 (hoja de producto y presentaciones, otra sesión): no toques `hoja-producto.tsx`, `flujo-presentaciones.tsx` ni `ficha-presentaciones.tsx`. Rebasa/merge `main` antes del PR.
> **Al terminar:** crea un aviso con `create_trigger` (`persistent_session_id` = `session_01BJDuA1NdKUg4YX64VNuQDv`, `run_once_at` ≈ 1 minuto después, `initiation: own_followup`) con rama, PR, qué falta y si quedaste bloqueada.

## 0. Antes de empezar

Lee `docs/00-contexto-del-proyecto.md`, `AGENTS.md`, `HANDOFF.md`, `docs/09` (regla de formas: círculo solo tienda/persona), `docs/11`, **`referencias/compartir-historia/LEEME.md`** con sus dibujos. Mira cómo ya se genera y comparte una imagen: `components/promos/hoja-compartir.tsx`, `lib/imagen-factura.ts`, `components/pedidos/acciones-factura.tsx` (`navigator.share` con archivos y su respaldo), la pestaña Catálogo (`components/catalogo/vista-catalogo.tsx` y la tarjeta de producto), `catalogoUrl`/enlace directo a un producto (`#p/<slug>` del catálogo público) y `precioConPromo`.

## 1. Qué se construye (fase 1)

1. **Botón** redondo con el ícono de historia **arriba a la derecha de cada producto** en la pestaña Catálogo (vidrio oscuro, 44 px de toque, `aria-label` «Compartir <nombre> en historia»). No debe abrir el producto al tocarlo.
2. **Hoja «Tu historia»**: vista previa de la imagen y tres interruptores: **Precio**, **Presentaciones**, **Foto de tu tienda**. Botón «Compartir». **Sin stickers** (fase 2).
3. **La imagen** (1080×1920, PNG o JPG de buena calidad, generada en el teléfono): la foto principal del producto a pantalla completa (recorte tipo `cover`), y abajo la tarjeta crema de los dibujos: nombre, precio (con promo vigente: precio de promo y el normal tachado; con presentaciones de precio distinto: «Desde»), presentaciones (colores como puntos con su color, el resto como pastillas; máx. una línea o dos, con «+N»), y «Pídelo en mi catálogo» con la dirección corta; a la izquierda la **foto de la tienda en círculo** con la miniatura de deslizapp en la **esquina inferior derecha** separada por un **recorte** (no borde). Fuentes de la marca (Fredoka/Figtree) ya cargadas antes de dibujar. Sin logo ni nombre de tienda arriba. Producto sin foto: el botón no sale o avisa «Ponle una foto primero».
4. **Compartir**: hoja con **«Estado de WhatsApp»** (ícono círculo con cámara y «+», verde), **«Historia de Instagram»** (círculo punteado con «+») y «Guardar la imagen». Ambos usan el menú de compartir del sistema (`navigator.share` con el archivo):
   - WhatsApp: con el texto «<nombre> · Pídelo aquí: <enlace>».
   - Instagram: antes copia el enlace al portapapeles y avisa «Copiamos el enlace: pégalo con el sticker «Enlace»».
   - Sin `navigator.share` con archivos: descarga la imagen y copia el enlace, con un aviso.
5. **El enlace** abre el catálogo directo en ese producto, con `?ref=historia` (sin medir nada todavía; que el catálogo lo ignore sin romperse). Si el catálogo no está publicado/activo, avisa antes: «Tu catálogo aún no está publicado: el enlace no abrirá.».

## 2. Reglas

- Solo lectura: no escribe en la base. Funciona en Ver como (no escribe) y para cualquier nivel del equipo.
- Componentes de `components/ui/`, textos de `docs/11`, sin exclamaciones. Movimiento solo `transform`/`opacity`.
- La imagen debe verse bien con fotos claras y oscuras, nombres largos (2 líneas máx.) y precios grandes.
- Demo: que funcione en `?demo` con Michel y Lino.

## 3. Pruebas y cierre

- Unitarias de lo puro (qué se muestra según interruptores, texto de precio, presentaciones resumidas, enlace con `ref`).
- Navegador (demo, 390): botón en las tarjetas, hoja, imagen generada (guarda capturas de 3 imágenes: perfume con tamaños, ropa con colores y tallas, producto sin presentaciones y con promo), respaldo sin `navigator.share`.
- `tsc`, `npm test`, `npm run lint`, `npm run build`, regresiones del catálogo del panel.
- Lee los comentarios de Codex del PR y contesta cada hilo. Novedad en `lib/novedades.ts`. Descripción del PR en español: qué probar en el iPhone (compartir de verdad a WhatsApp e Instagram) y lo no probado (Safari físico, apps reales).
