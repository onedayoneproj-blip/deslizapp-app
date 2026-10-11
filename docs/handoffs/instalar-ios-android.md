# Instalar en iPhone (animación) y Android (botón)

Encargo: `docs/prompts/instalar-ios-animacion-y-android.md`. Decisión: `docs/17-onboarding.md` (11 oct 2026).

- **Base:** #103 y #102 ya estaban fusionados en `main` al terminar (squash `997a762` y `00f4c46`), así que la rama se rebasó sobre `origin/main` (`477064c`) y el PR apunta a `main`. La rama se creó primero desde la de #103 (`f0e0f26bb682b14ecf036221460b1b16366ccb73`). Novedad en 0.62.0, mayor que la 0.61.0 de #102.
- Nuevo: `components/pwa/animacion-instalar-ios.tsx`, `components/pwa/instalar-pwa.tsx` (`CapturaInstalacion` montado en `app/layout.tsx`, `useInstalarPwa`), `scripts/probar-instalar.mjs`. Cambio en `components/inicio/checklist-tienda.tsx` acotado a la hoja «instalar». Novedad 0.62.0.
- Pruebas: `npm run tipos`, `lint`, `test` (589), `build`; `probar-onboarding-checklist` (152) y `probar-instalar` (360/390/430, claro y oscuro, movimiento reducido, `beforeinstallprompt` simulado con `accepted` y `dismissed`, sin evento).
- **No probado aquí:** el diálogo real de Chrome en Android y Safari de iPhone. Para Lewis: Android con Chrome, tocar «Instalar Deslizapp» y confirmar; iPhone, ver la animación en Safari.
- Decisiones fuera del encargo: las pastillas iPhone/Android usan `Segmentos` con `tono="opcion"` (la barra de filtros con indicador está pensada para ancho de pantalla completo); (corregida tras probar Lewis en el teléfono: la primera versión cambiaba de escena con un `setInterval` y se sentía a saltos).

## Fila «Instalar app» en el menú de la tienda (pedido de Planning, 11 oct 2026)
- `components/panel/menu-tienda.tsx`: fila `data-fila-instalar` dentro de la tarjeta de la tienda activa, con el mismo estilo que «Tu equipo». Visible si `!instalada && (puedeInstalar || esIos)`.
- La hoja se extrajo a `components/pwa/hoja-instalar-app.tsx` y la usan la guía de Inicio y el menú. Los hooks nuevos `useAppInstalada` y `useEsIos` están en `instalar-pwa.tsx`.
- Pruebas añadidas a `scripts/probar-instalar.mjs`: sin evento, instalada (standalone simulado), iPhone, con evento `accepted` y `dismissed`, y `appinstalled`. Capturas `menu-android.png` y `menu-ios.png`.
- Decisión mía: staff y «Ver como» ven la fila pero el paso no se marca (`marcarOnboarding` es de la dueña).

## Animación de iPhone: una sola línea de tiempo CSS (pedido de Planning, 11 oct 2026)
- `components/pwa/animacion-instalar-ios.tsx` ya no tiene estado de React ni `setInterval`: escenas, toques, menú, hoja, lista, icono y pies de frase usan `@keyframes ins-*` de 13,2 s en `app/globals.css`, con retrasos de 0, 2,2, 4,4, 6,6, 8,8 y 11 s. Los valores salen de la referencia visual (no se copió su HTML ni sus colores). Solo `transform` y `opacity`.
- Pausa con la pestaña oculta: un único oyente de `visibilitychange` pone `data-pausada` y el CSS pausa las animaciones. Al cerrar la hoja se desmonta y al abrirla empieza del paso 1.
- Movimiento reducido: en CSS (`@media`), sin animación, escena 5 y su frase visibles.
- `scripts/probar-instalar.mjs` comprueba animaciones CSS corriendo, pausa con pestaña oculta y quieta sin animaciones con movimiento reducido. Capturas `ios-momento-2..5.png` e `ios-reducido.png`.
