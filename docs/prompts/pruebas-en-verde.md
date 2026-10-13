# Pruebas en verde: arreglar las que ya fallan en `main`

Encargo de Planning, 13 oct 2026, aprobado por Lewis. Tu puesto es **Coding**. Parte de `main` actualizado.

**Modelo:** Claude Code **Sonnet** · en Codex, el más alto con razonamiento medio.

## Por qué
Varias pruebas de `scripts/` fallan también en `main` y nadie investigó la causa. Cada sesión pierde tiempo comprobando que no son suyas, y un fallo real se puede esconder entre ellas. La meta: que cada una pase, o que quede escrito por qué no puede pasar en este entorno.

## Cuáles
Las conocidas (relevo de Planning y PR recientes):
- `probar-retoque-al-subir` (TimeoutError).
- `probar-catalogo-react`, `probar-catalogo-pulido`, `probar-catalogo-errores`.
- `probar-espera-catalogo` y `probar-visibilidad-catalogo` (se sospecha del entorno: video sin códec, layout, panel).
- `probar-teclado`: el paso «Minimizar» del checklist de inicio.
- `probar-proximamente` (el contexto dice que falla también en `main`).

Empieza corriendo **todas** las `scripts/probar-*.mjs` contra `main` (con la app corriendo como dice cada script) y anota cuáles fallan y dónde. Si aparecen otras, entran en el encargo. **Solo en modo Demo:** no corras nada que escriba en Supabase real ni toque datos de tiendas reales (Esencias Michel); si un script lo necesita, no lo corras y dilo en la tabla.

## Qué hacer con cada una
1. Reproduce el fallo y encuentra la causa. «Flaky» no es una causa.
2. Según la causa:
   - **La prueba quedó vieja** (un texto, un selector o una medida cambió a propósito en un PR fusionado): actualízala al comportamiento vigente de `docs/04-pantallas.md`, sin quitarle casos.
   - **El entorno no lo permite** (por ejemplo, el Chromium de Playwright no reproduce video H.264): haz que esa comprobación concreta se salte **solo** cuando falte la capacidad, con un mensaje claro, y que el resto del script sí corra. Nunca borres ni desactives una prueba entera.
   - **Es un bug real de la app:** no lo arregles en este PR. Avisa a Planning en el momento con la causa y una propuesta; Planning decide.
   - **Tiempo de espera:** espera a una condición concreta, no subas el timeout a ciegas.
3. Solo se tocan `scripts/` y, si hace falta, `docs/`. **No toques código de la app** (`app/`, `components/`, `lib/`). Otra sesión trabaja en `components/catalogo/historia-producto.tsx` (editar producto, PR 1): si una prueba de crear producto falla por ese cambio, no la toques y avisa.
4. Deja en `docs/` (en `HANDOFF.md`, sección de revisión automática, o en un archivo nuevo enlazado desde ahí) una tabla corta: script, qué comprueba, cómo se corre, y las capacidades que necesita del entorno.

## Pruebas
- `npm run tipos`, `npm run lint`, `npm test`.
- Cada `probar-*.mjs`: pasa, o salta solo lo que el entorno no puede, con el motivo en la salida.
- El PR lista script por script: antes (cómo fallaba), causa, qué cambió, después.

## Entrega
PR contra `main`. No cambia nada visible ni datos: **fusiona tú (squash) cuando «Revisión» esté en verde y la revisión de Codex del último commit no tenga hallazgos** (si haces pushes después de su revisión, comenta «@codex review» y espera). Borra la rama. Si encontraste un bug real de la app o algo no se pudo arreglar, explícalo en el PR.

**Avisos a Planning** (`send_message` a la sesión de Planning cuyo identificador va en tu prompt; regla en `docs/forma-de-trabajo.md`): al terminar (estado, PR, HEAD, «Revisión», Codex, tabla de resultados, pendientes); durante el trabajo si encuentras un bug real de la app, algo que afecte a otra sesión o una decisión que el encargo no cubre; y si quedas bloqueado o sin contexto, con un checkpoint.
