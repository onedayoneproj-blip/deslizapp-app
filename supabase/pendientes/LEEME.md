# Migraciones pendientes de aplicar

SQL listo pero aún sin aplicar en Supabase. **No es una migración**: `npm run revisar:migraciones` solo mira `supabase/migrations/`.
Al aplicar uno, se mueve a `supabase/migrations/` con la versión que asigne Supabase (reglas en `AGENTS.md`).

- `eventos_publicos_limites.sql`: límite por evento con contador que sigue sumando, `admin_eventos_descartados`, lista blanca de `ruta`, `tienda_slug` solo de tiendas publicadas y `purgar_eventos_publicos`. Su prueba: `probar-eventos_publicos_limites.sql` (reemplazará a `scripts/probar-eventos-publicos-db.sql`).
