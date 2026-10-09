# Soft Era (tienda de la amiga de Lewis)

Accesorios y maquillajes. La tienda ya existe en Supabase (`slug: soft-era`, id `b124bc9a-77ed-4a91-963e-d88ee7cb804a`) **sin dueña**: se le une cuando ella entre con su cuenta de Google (Planning pone su correo en `invitaciones`, rol `dueno`). Los datos reales de la tienda no van en migraciones.

## Marca
- Vino/ciruela: `#7A1F3D` (acento; los textos de los stickers son `#680020`), ciruela del fondo del manifiesto `#752C4A`, rosa pálido `#F6DDE4`, dorado `#B88A4A`.
- Letras: títulos Cormorant Garamond, texto Jost (las del manifiesto). Las letras de los stickers y del logo son otras (display fino); no están como fuente: solo existen dentro de las imágenes.
- Voz: suave, cálida, de amor propio. «Abraza tu yo puro», «Brilla siendo quien ya eres», «Belleza genuina», «Eres única».
- `marca/`: portada con el logo, manifiesto «Tu era» y tarjeta de frases (referencias, no se publican tal cual).

## Stickers exclusivos (`stickers/`)
Recortados por Planning desde 8 imágenes sobre tela satinada; borde blanco troquelado, fondo transparente.
`ofertas`, `abraza-tu-yo-puro`, `abraza-tu-yo-puro-beso`, `amor-propio`, `eres-unica`, `belleza-genuina`, `soft-era`, `cuidado-con-amor`.
Detalles a mejorar si ella los reenvía con fondo transparente: `eres-unica` (borde repintado a mano) y `amor-propio` (restos mínimos en el borde).
Plan de integración: `docs/prompts/stickers-de-tienda.md`.
