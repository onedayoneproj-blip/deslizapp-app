# Catálogo: quitar «Planes y precios» de la historia «Cómo funciona»

Encargo de Planning, 14 oct 2026. Tu puesto es **Coding**. Parte de `main` actualizado.

**Modelo:** Claude Code **Sonnet** · en Codex, el más alto con razonamiento bajo.

## Por qué
El catálogo público muestra precios viejos y escritos a mano en el código, que no son los precios de Deslizapp:
- `components/tienda/planes.tsx`: los planes Básico RD$1,500, Pro RD$3,200 y Montaje RD$5,000, más condiciones de montaje que ya no existen (`docs/14` §1).
- Se abre con «Ver planes», al final de la historia «Cómo funciona» (`components/tienda/artes-deslizapp.tsx` ≈3655, `data-plans`), y también con el enlace `#planes`.

Cualquiera que vea un catálogo puede llegar ahí. Lewis pide quitarlo antes de las primeras tiendas.

## Qué hacer
1. **Quita el botón «Ver planes»** del final de «Cómo funciona». Quedan «Escríbenos por WhatsApp» y «Ver otra vez».
2. **Quita la vista `planes`** del catálogo:
   - en `components/tienda/catalogo.tsx`: el tipo de la vista, el `hash.startsWith("planes")`, el caso `#planes` al abrir y el render de `<Planes>`;
   - la prop `planes` de `Historias` y el manejo de `[data-plans]` en `components/tienda/historias.tsx`;
   - borra `components/tienda/planes.tsx` si nadie más lo usa.
   - Abrir `…#planes` debe dejar el catálogo normal, sin error.
3. Quita el CSS que solo usaban la hoja de planes y `.splans` (en `app/tienda/catalogo.css`), solo si nada más lo usa.
4. **No toques** los precios de los productos de ejemplo de las historias («RD$3,200» de la tarjeta, «RD$6,200» del pedido): son productos, no planes.
5. **Comprueba** con `grep` que no quede en `components/` ni en `app/` ningún precio de plan (`1,500`, `3,200` como mensualidad, «Montaje», «mensualidad»). Si aparece otro lugar visible para clientes o tiendas, dilo en el PR y no lo cambies sin preguntar.

## Pruebas
- `npm run tipos`, `npm run lint`, `npm test`, `npm run build`.
- Los `scripts/probar-*.mjs` que abren «Cómo funciona» o `#planes` (búscalos con `grep -l "planes\|como_funciona\|Cómo funciona" scripts/`): ajústalos para que comprueben que «Ver planes» ya no está y que `#planes` no abre nada.
- Una captura a 390×844 del final de «Cómo funciona», en `docs/capturas/catalogo/sin-planes/`.

## Entrega
- PR contra `main`, con «Qué probar en tu iPhone» corto: abrir un catálogo → «Cómo funciona» → al final ya no está «Ver planes».
- Solo quita contenido y no toca datos, así que **fusiona tú (squash)** cuando «Revisión» esté en verde y Codex salga limpio en el último commit. Borra la rama.
- Avisa a Planning (`send_message` a `@parent`) con el PR, el resultado y cualquier otro precio que hayas encontrado.
