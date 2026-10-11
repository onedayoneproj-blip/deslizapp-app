# Handoff · rediseño visual de la guía «Deja tu tienda lista» (11 oct 2026)

Encargo: [onboarding-guia-rediseno-visual.md](../prompts/onboarding-guia-rediseno-visual.md). Rama `feat/onboarding-guia-rediseno`, PR abierto contra `main`, **sin merge** (Lewis prueba la preview). HEAD exacto: el del PR.

## Qué cambió
- `components/inicio/checklist-tienda.tsx`: tarjeta única (`superficie`, `linea`, `radio-l`), cabecera «Capítulo X · nombre» con botón de colapsar 44×44, rayas tipo historia con relleno proporcional (completo `accion`, en curso `resalte`, sin iniciar solo pista), punta bajo la raya elegida, filas con círculo de 26 px y chevron (sin «Hecho/Pendiente» visibles; quedan `sr-only`), acciones dentro de la tarjeta, píldora minimizada de 56 px con mini rayas y «N de 7».
- Quitadas las frases «Capítulo listo…» y «Cinco productos para empezar…» y las etiquetas «Capítulo X» bajo las rayas.
- Texto (decidido por Lewis, encargo 742cc6a): «Lo hago sola» → «Por ahora sin equipo», misma lógica y clave.
- Sin cambios de lógica, datos, permisos ni Supabase. Sin animaciones nuevas.
- Docs: `docs/17-onboarding.md` (estado y texto), `docs/09-sistema-de-diseno.md` §11 (rayas de historia). `lib/novedades.ts`: 0.60.0 (era 0.59.0 la última en `main`).
- Pruebas actualizadas a la nueva estructura: `scripts/probar-onboarding-checklist.mjs` y `probar-onboarding-fallos.mjs` (contador por `aria-label` de las rayas, «Minimizar la guía», versión de novedades fija en 99.0.0 para que no tape la pantalla, ruta de Chromium por `CHROMIUM_PATH`).

## Decisiones que no estaban en el encargo
- El detalle «N de 5 con foto» salió de la fila y queda como texto oculto (`sr-only`) del paso, para lectores de pantalla.
- Se perdió el `role="status"` de «Capítulo listo»; al ser texto retirado, no hay anuncio equivalente.

## Pruebas
`npm run tipos` OK · `npm run lint` 0 errores (32 avisos previos) · `npm test` 589/589 · `npm run build` OK · `probar-onboarding-checklist` 152 comprobaciones (360/390/430, texto al 200 %, sin overflow, minimizar/recargar, movimiento reducido) · `probar-onboarding-fallos` 15 · capturas en `docs/capturas/onboarding-guia/`.

## No verificado
- Safari/iPhone físico y VoiceOver.
- Modo oscuro: la app aún no lo activa (`globals.css`); la guía solo usa tokens, sin colores a mano.
- `probar:teclado` no corrido: no se tocaron las hojas ni su comportamiento.
