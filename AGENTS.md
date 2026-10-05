<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Migraciones de Supabase

- Toda migración nueva se aplica en Supabase (proyecto `euihaeyfdlpvmbtfzvnt`) y el archivo de `supabase/migrations/` lleva **la versión que Supabase le puso** (verla con `list_migrations`). Nunca un número inventado.
- No se edita una migración ya aplicada: se crea otra.
- Los datos reales de tiendas (crear una tienda, invitar a alguien) no van en migraciones del repo.
- Para comprobar que el repo y Supabase coinciden: `npm run revisar:migraciones -- lista.json` (el JSON de `list_migrations`), o con `SUPABASE_ACCESS_TOKEN` definido, sin argumentos. Tiene que dar cero diferencias.

# Contexto y forma de trabajo

- Antes de empezar, lee `docs/00-contexto-del-proyecto.md` (qué es el proyecto, los puestos Planning y Coding, cómo se cierran los PR, dónde está la marca y el sistema de diseño, y dónde va el trabajo).


# Convivencia durante el catálogo conectado

- Cada sesión usa un checkout/worktree separado. No cambiar la rama, carpeta ni archivos pendientes de la sesión de rendimiento.
- Antes de actualizar una rama propia, guardar los cambios en commits, revisar los commits nuevos de `feature/catalogo-react` y hacer rebase. Resolver conflictos conservando ambas funcionalidades y repetir las pruebas afectadas; nunca aceptar una versión automáticamente.
- Si la rama propia ya está publicada y necesita actualizar su historial, usar `--force-with-lease` solo en esa rama. Nunca forzar `feature/catalogo-react` ni `main`.
- Supabase es compartido: migraciones aditivas y compatibles con el catálogo y la sesión de rendimiento. No renombrar/eliminar contratos que otra sesión esté usando. Documentar y coordinar un cambio incompatible antes de aplicarlo.
- La solicitud **`4DCQ2PZ28F`** está reservada: no registrarla, descartarla ni modificarla. Las pruebas que escriban usan fixtures separados.
