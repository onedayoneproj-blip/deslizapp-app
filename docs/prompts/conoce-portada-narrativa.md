# «Cómo funciona»: portada narrativa, el viaje desde Instagram y el cambio de lado

Encargo de Planning, 16 oct 2026. Diseño aprobado por Lewis el 16 oct 2026. **Se lanza cuando la medición (PR #138) lleve unos días en producción**, para tener números del «antes». Tu puesto es **Coding** (Sonnet, salvo que Lewis diga otra cosa). Va después de `medicion-landing.md`.

**Diseño:** lienzo [Cómo funciona · pantallas nuevas](https://claude.ai/artifact/YVuiHFNWVwrbFYyGFTtQDP). Copia en `referencias/landing/conoce-narrativa/`. **No copies su HTML.**

## Decisión de Lewis (16 oct 2026)
- Las pantallas nuevas **sustituyen la portada actual** de `/conoce` (el paso `intro`, con el video y el teléfono bloqueado).
- Antes de mostrar la app, la historia conecta con el dolor del vendedor.
- Después enseña de dónde sale el enlace del catálogo.
- Al pasar del lado de quien compra al de la tienda, hay una pantalla propia con los dos iconos que se intercambian.

**Reutiliza lo que ya existe en la landing:** el mockup real del teléfono, las burbujas de WhatsApp, el índice, los fondos rosa y verde, el controlador de pasos (`lib/landing/pasos.ts`, `components/landing/*`) y los teléfonos reales (`app/demo-landing`). Crea solo lo que falte.

## Pasos nuevos, al principio de `PASOS`

| # | Id | Fondo | Qué se ve | Burbuja |
|---|---|---|---|---|
| 1 | `dolor-dm` | arena neutro | Un mensaje directo de Instagram: captura del producto, «¿precio?», «¿lo tienes en negro?» y la tienda contestando «escríbeme al WhatsApp» | «Te escriben por Instagram, mandan capturas y preguntan el precio.» · «Y tú: “escríbeme al WhatsApp”.» |
| 2 | `dolor-chats` | arena neutro | Una lista de chats con muchos sin leer («¿precio?», fotos, «¿en qué va mi pedido?») y una nota de libreta tachada encima | «Ahora multiplícalo por todos tus chats.» · «Precios repetidos, notas sueltas y pedidos que se pierden.» |
| 3 | `post` | rosa | Una publicación de @tutienda (red social genérica, sin el logo ni la interfaz exacta de Instagram) con «Pídela desde el enlace de mi perfil» | «Tu Tienda publica como siempre.» · «La diferencia: el pedido se hace en su catálogo.» |
| 4 | `perfil` | rosa | El perfil con el enlace `deslizapp.com/tutienda` y el ♥ tocándolo (dedo «toque») | «Tu cliente toca el enlace de tu perfil.» · «También funciona desde tus estados de WhatsApp.» |
| 5 | `navegador` | rosa | El navegador interno con la barra `deslizapp.com/tutienda` y, dentro, el teléfono de la compradora real, que sigue con `hola`, `pasa`, `aaah`… | «Y se abre tu catálogo, sin salir de Instagram.» · «Sin descargar nada. Con precios a la vista.» |

- Las dos pantallas de dolor son cortas y van en tonos neutros. El color de la marca entra cuando aparece Deslizapp, en la pantalla 3.
- Los pasos actuales `hola` y siguientes se mantienen. Ajusta el texto de `hola` si repite lo de la pantalla 5.

## Cambio de lado (nuevo paso antes de `aviso`)
- `cambio-lado`: pantalla dedicada sin teléfono.
  - El icono rosa (quien compra) y el verde (la tienda) se intercambian de lugar y de tamaño.
  - El fondo pasa de rosa a verde.
  - El texto pasa de «Pidió en segundos.» a «Así lo ve Tu Tienda.», con «El pedido te llega completo: qué quiere, cuánto y a quién se lo mandas.».
- Usa los iconos `public/landing/icono-rosa.webp` e `icono-verde.webp`.
- Con movimiento reducido, sin animación: se ve el estado final.

## Índice y pruebas
- Actualiza `CAPITULOS_NOMBRES` si hace falta, por ejemplo con un capítulo «Antes» al principio.
- Actualiza `tests/landing.test.mjs` y `scripts/probar-landing.mjs`: la portada ya no es `intro`.
- La primera pantalla se ve completa sin hacer scroll. Esto responde a la crítica de que «se ve en blanco».
- Si la medición ya está en `main`, registra `conoce_paso` para los pasos nuevos.
- Tipos, lint, `npm test`, build y `probar-landing`. Capturas de cada paso nuevo a 393×852 y 360×640.

## Entrega
PR contra `main`, sin fusionar (cambia la página pública): Planning revisa y Lewis prueba. Añade «Qué probar en tu iPhone». Avisa a Planning al abrir el PR y al terminar.
