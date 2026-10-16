# Animación del aro del Círculo Deslizapp

Encargo de Planning, 16 oct 2026. Aprobado por Lewis el 16 oct 2026. **Va después de que se fusione el PR #139** (página de planes y aro del Círculo), porque anima lo que ese PR crea. Tu puesto es **Coding** (Sonnet, salvo que Lewis diga otra cosa).

**Diseño:** lienzo [Círculo Deslizapp · animaciones del aro](https://claude.ai/artifact/Nx3kYyCfoWaAoC9N8GPhs5). Copias de las dos elegidas y sus tiempos en `referencias/circulo/` (`LEEME.md`, `animacion-a-salen.dc.html` y `animacion-c-ondas.dc.html`). **No copies su HTML.**

## Qué animación va en cada sitio
| Sitio | Animación | Cuándo |
|---|---|---|
| Tarjeta de fundadoras en `/planes` | **C · ondas** | En bucle mientras la tarjeta está a la vista. **Ya va en el PR #139**, junto con la propiedad `animacion` de `LogoTienda`; aquí solo se reutiliza. |
| Tarjeta verde del Círculo en el menú de la tienda | **C · ondas** | En bucle mientras el menú está abierto. |
| Avatar del encabezado del panel (`LogoTienda`) | **A · salen desde el centro** | Una sola vez: la primera vez que esa tienda abre el panel en ese dispositivo después de entrar al Círculo. Guárdalo por tienda en `localStorage` (con try/catch); si falla, el aro se ve quieto. Después el aro queda quieto. |

Lewis quiere C allí donde el movimiento es continuo, porque se ve más animada, y A donde no debe seguir moviéndose.

## Cómo
- **Solo CSS:** keyframes con `transform` y `opacity`; nada de librerías. Cada aro es su propio círculo, para poder animarlo solo.
  - En A, los aros pasan de `scale(.55)` y opacidad 0 a 1, con un rebote a 1.1. Hay 0,25 s entre cada aro, y el sello salta al final.
  - En C, sobre el aro ya formado, tres ondas en bucle crecen desde el aro mandarina hasta ~1.45 veces y se desvanecen.
- **Componente compartido:** el aro de la opción 6 (de #139) recibe una propiedad `animacion: 'ninguna' | 'entrada' | 'ondas'`. No hagas tres aros distintos.
- **C a cualquier tamaño:** las ondas crecen más allá del avatar, así que el contenedor no puede recortarlas (`overflow`) ni empujar el texto de al lado: usa capas absolutas.
- **Movimiento reducido:** con `prefers-reduced-motion: reduce`, nada se mueve y se ve el aro terminado.
- **Rendimiento:** pausa C cuando la tarjeta no está a la vista (IntersectionObserver o `animation-play-state`). Comprueba que no hay saltos al hacer scroll en `/planes` en un teléfono de gama baja (CPU ×4 en DevTools).

## Pruebas
- Tipos, lint, `npm test` y build.
- Un test de que el aro con movimiento reducido no lleva animación, y de que A no se repite al recargar el panel.
- Un video o GIF corto de A y de C a 393 px.

## Entrega
PR contra `main`, sin fusionar: Planning revisa y Lewis prueba en su iPhone. Añade «Qué probar en tu iPhone». Avisa a Planning al abrir el PR y al terminar.
