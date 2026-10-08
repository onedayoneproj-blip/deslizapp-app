# Revisión automática en GitHub (rama `chore/revision-automatica`)

> **Modelo:** Sonnet 5.5. **Sin migraciones**, sin tocar la app salvo los errores de tipos. **PR abierto**; Planning lo revisa (incluidos los comentarios de Codex) y lo fusiona cuando Lewis diga.

## 0. Antes de empezar

Lee `docs/00-contexto-del-proyecto.md`, `AGENTS.md` (Next.js 16: lee `node_modules/next/dist/docs/` antes de tocar tipos de páginas) y `package.json`. Tu puesto es **Coding**.

## 1. Qué se hace

1. **`.github/workflows/revision.yml`**: en `pull_request` (abierto, sincronizado, reabierto) y en `push` a `main`. Ubuntu, Node de la versión que usa el proyecto (mira `.nvmrc`, `engines` o lo que use Vercel), caché de npm. Pasos: `npm ci`, `npx tsc --noEmit`, `npm test`, `npm run lint`. **Sin `build`** (ya lo hace Vercel) y **sin Playwright**. `concurrency` por rama con `cancel-in-progress: true` para no gastar minutos en corridas viejas. `timeout-minutes` razonable (10). Nombre del check corto y en español (p. ej. «Revisión»).
2. **Los errores conocidos de `tsc`** (`PageProps` / `LayoutProps` de Next 16): corrígelos de verdad (los tipos generados de Next 16; `next typegen` o lo que digan sus docs) para que `tsc` dé **cero errores**. Si hace falta generar tipos antes de `tsc` en el flujo, agrégalo como paso. Nada de `// @ts-ignore` ni de excluir archivos.
3. Si `npm test` o `lint` necesitan variables de entorno, usa valores falsos seguros en el flujo (nunca claves reales; nada de secretos nuevos sin decirlo).
4. Documenta en `HANDOFF.md` y `docs/00-contexto-del-proyecto.md`: qué corre el check, que un PR en rojo no se fusiona, y que los minutos de Actions son limitados (no lanzar corridas de más).

## 2. Cierre

- Prueba el flujo en el propio PR: debe salir verde. Haz una prueba de que sale rojo (un commit temporal que rompa un test) y luego revierte ese commit.
- Resume en español corto: qué corre, cuánto tarda, qué arreglaste en los tipos.
