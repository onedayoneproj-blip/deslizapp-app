# Último reel del catálogo: «Ver planes» en lugar de «Iniciar sesión»

Encargo de Planning, 17 oct 2026. Lo pidió Lewis. Tu puesto es **Coding** (Sonnet, salvo que Lewis diga otra cosa).

## Qué cambia
Al final de cada catálogo, el último reel es la portada de Deslizapp (`components/inicio-publico/portada-inicio.tsx`, `modo="reel"`). Ahí:
- **Se quita el botón «Iniciar sesión» con Google.** Quien llega desde el catálogo de una tienda es una posible vendedora, no alguien con cuenta.
- **En su lugar va «Ver planes»**, en el mismo sitio, con el mismo tamaño y el mismo estilo de botón principal. Lleva a `RUTA_PLANES` (`/planes`).
- «Cómo funciona», «Quiero vender» y el enlace a la demo se quedan como están.
- La página principal (`/`, `modo="pagina"`) **no cambia**: sigue con «Iniciar sesión».

## Medición
- El toque se registra como evento propio, `catalogo_cta_planes`, igual que los demás botones de ese reel (`lib/medicion/eventos.ts`, `docs/18-medicion.md`).
- La base solo acepta los eventos de su lista (migración `20261016145000_eventos_publicos_limites`), así que hace falta una **migración nueva** que añada `catalogo_cta_planes` a esa lista. Aprovecha para añadir también `cta_planes`, el enlace «Planes» de la cabecera de `/`, y regístralo.
- **Pregunta a Planning antes de aplicar la migración**, siguiendo las reglas de `AGENTS.md`.
- `catalogo_cta_iniciar_sesion` se queda en la lista, porque los datos viejos lo usan.

## Pruebas
- Tipos, lint, `npm test`, build, `probar-inicio` y `probar-landing`.
- Un test de que el reel muestra «Ver planes» y no «Iniciar sesión», y de que `/` sigue con «Iniciar sesión».
- Capturas del último reel a 393 y 360.

## Entrega
PR contra `main`, sin fusionar. Añade «Qué probar en tu iPhone». Avisa a Planning al abrir el PR y al terminar.
