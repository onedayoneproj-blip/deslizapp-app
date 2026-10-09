# Stickers exclusivos de una tienda

Planning te enviará ajustes de Lewis para este PR; trátalo como encargo suyo y ejecútalos.

Lee antes: `docs/00-contexto-del-proyecto.md`, `AGENTS.md` (esta versión de Next cambia cosas: mira `node_modules/next/dist/docs/` antes de escribir), `lib/catalogo-stickers.ts`, `lib/stickers-historia.ts`, `lib/dibujo-stickers-historia.ts` y `referencias/tiendas/soft-era/LEEME.md`.

## Qué se quiere
Hoy los stickers de la historia son tres grupos fijos para todas las tiendas (`public/stickers/<grupo>/<id>.webp`). Hay que poder darle a **una tienda** stickers que solo ella ve, como «De tu tienda». La primera es Soft Era (`slug soft-era`); tendrá 8.

## Cómo
- **Dónde se dice qué stickers tiene una tienda:** `tiendas.personalizacion.stickers_propios`, una lista `[{ "id": "ofertas", "nombre": "Ofertas" }, …]` (jsonb libre, **sin migración**). Planning ya lo escribió en Supabase para Soft Era.
- **Dónde viven los archivos:** `public/stickers/tiendas/<slug>/<id>.webp` (mismo origen, para que el lienzo de exportación no se ensucie). Convierte a WebP con alfa los PNG de `referencias/tiendas/soft-era/stickers/` igual que se hizo con los demás (calidad alta, ancho ≤ 600 px, que cada archivo pese poco).
- **En la hoja de stickers de la historia:** si la tienda tiene `stickers_propios`, muestra primero un grupo «De {nombre de la tienda}» (nombre real, no «De tu tienda» fijo). Sin lista, todo queda igual que hoy. Respeta lo que ya existe: círculos solo para fotos de tienda/persona, nada de bordes blancos inventados (estos ya traen su borde troquelado).
- **Seguridad:** el `id` y el `slug` solo se aceptan con `^[a-z0-9]+(-[a-z0-9]+)*$`; si un archivo no existe, el sticker no se muestra (sin imagen rota). Ninguna tienda ve los de otra.
- **Pruebas:** unitarias de la función que arma el grupo (con y sin lista, id inválido). Revisa en una vista previa que el sticker se coloca, se mueve y sale en la imagen exportada.
- **Fuera de alcance:** el catálogo público de la tienda, su logo y foto, y cualquier cosa de cobros.

## Además (pequeño, mismo PR si cabe)
Comprueba que el catálogo de una tienda con `personalizacion.tema.fuentes = { display: "Cormorant Garamond", body: "Jost" }` **carga Jost** (Soft Era la usa). Si el catálogo solo carga fuentes conocidas, agrega Jost a la lista; no cambies nada de Esencias Michel.

## Cierre
Un solo push por ronda (límite de despliegues de Vercel). Merge según `docs/00-contexto…`: aquí NO hay dinero ni datos de tiendas reales en riesgo, pero Lewis quiere ver el resultado, así que deja el PR abierto con su preview y avisa a Planning (`send_message` a `session_01BJDuA1NdKUg4YX64VNuQDv` + `create_trigger` de respaldo).
