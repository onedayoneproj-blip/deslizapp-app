# Onboarding 1b: movimiento, fondos de marca y stickers de Deslizapp

El PR #94 (parte 1 del onboarding) ya está en `main`. Esto es un **PR nuevo** sobre el mismo recorrido (`components/unirse/recorrido-onboarding.tsx`, `lib/onboarding.ts`): parte de `main` actualizado.

Planning te enviará ajustes de Lewis para este PR; trátalo como encargo suyo y ejecútalos.

## Lo que pidió Lewis
«Se vería mucho mejor si agregáramos movimiento a los diferentes elementos en pantalla y utilizáramos algunos de los stickers de Deslizapp. El fondo debería tener los patrones de background que se referencian en la guía de lenguaje de diseño. Que no se vea cargada la interfaz.»

## Referencias
`docs/10-marca-ilustracion-y-fondos.md` (§ Fondos con patrón: fondo plano de un solo color de marca + **máximo dos patrones**: iconos regados —flecha, corazón, burbuja de chat— en un tono apenas distinto del fondo, destellos Mandarina —máx. 3 grupos—, flecha curva; «en la app, solo en bienvenida, novedades, pantallas vacías, celebraciones y catálogo público»; «nunca detrás de listas, formularios o números»; el patrón queda detrás y **nunca baja el contraste del texto**), `docs/08-movimiento.md` (reglas y utilidades; si algo de abajo necesita una excepción, se documenta ahí como las otras), `public/stickers/marca/*.webp` (aaah, aaah-corazon, deslizapp, hecho-con-deslizapp, mira-mas, desliza-y-pide, te-lo-guardo, ya-disponible, pidelo-en-mi-catalogo) y `referencias/onboarding/pantallas/` (el diseño de Lewis).

## Qué hacer
1. **Fondos:** en las 4 historias de bienvenida y en «Tu tienda ya existe» (pantallas de bienvenida y celebración), el patrón de iconos regados del §10 detrás del contenido, en el tono del fondo de cada pantalla (rosa más intenso sobre rosa, verde más claro sobre Verde Bosque, Mandarina más oscuro sobre Mandarina). Reutiliza lo que ya exista en `globals.css` o `components/marca`; si no hay, crea un componente en `components/ui/` con el patrón como SVG propio, no una imagen pesada. **En los 4 capítulos de datos (formularios) NO va patrón detrás del campo**: solo los destellos y las tarjetas flotantes que ya tiene el diseño, y como mucho un patrón muy tenue en la franja superior fuera del campo, sin tocar el contraste.
2. **Stickers de Deslizapp:** usa 3 o 4 de `public/stickers/marca/` con criterio: p. ej. «aaah» y «aaah-corazon» en la bienvenida y en «ya existe», «desliza-y-pide» en la historia del catálogo, «hecho-con-deslizapp» al final. **Uno por pantalla como máximo**, girado un poco, sin tapar el titular ni los campos. Carga perezosa y tamaño correcto (son WebP con alfa).
3. **Movimiento:** entrada escalonada de los elementos de cada historia (titular, texto, tarjeta de ejemplo), flotación suave (muy leve) de los stickers y los corazones, el «aaah» que aparece con un rebote corto, y en «ya existe» las iniciales de la tienda con su halo. Solo `transform` y `opacity`, curvas y duraciones de `docs/08`. **Respeta `prefers-reduced-motion`** (sin animación, todo visible). Nada que se mueva mientras la persona escribe en los capítulos de datos.
4. **No cargar la interfaz** (la advertencia principal de Lewis): máximo 1 sticker + 1 patrón + 1 grupo de destellos por pantalla; si una pantalla se siente llena, quita elementos antes de quitar aire. El texto legible primero. Revisa cada pantalla en 390 y 360 px con las capturas de `referencias/onboarding/pantallas/` al lado.
5. No cambies textos, pasos ni lógica del recorrido. No quites el difuminado progresivo de cabeceras y barras.

## Pruebas y cierre
Que `npm run probar:onboarding` siga pasando (incluido movimiento reducido), más lo de siempre (`tipos`, `lint`, `test`). Capturas antes/después en `docs/capturas/onboarding-1b/`. Un solo push por ronda (límite de despliegues de Vercel). PR abierto, «Revisión» en verde, preview lista; avisa a Planning con `send_message` a `session_01BJDuA1NdKUg4YX64VNuQDv` y `create_trigger` de respaldo (persistent_session_id = esa sesión, run_once_at ≈ 1 min, initiation own_followup). No mergees.
