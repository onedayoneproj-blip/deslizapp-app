# Arreglos de la revisión de Codex en #75 y #76 (rama `fix/revision-codex-75-76`)

> **Modelo:** Opus 5.5 (toca seguridad). **Una migración nueva** (aditiva, no se edita la ya aplicada). **PR abierto con preview**; Planning revisa el SQL y lee de nuevo los comentarios de Codex del PR antes del merge. No hagas merge.
> **Orden:** antes de aplicar, `list_migrations` (la última debe ser `20261008023803_ficha_tecnica`) y que no haya otra sesión con migración en curso (hoy ninguna; `presentaciones-por-pasos` en el #78 no lleva).

## 0. Antes de empezar

Lee `docs/00-contexto-del-proyecto.md`, `AGENTS.md`, `HANDOFF.md` (migraciones, permisos, Ver como, la nota de que `drop function` y `delete from` cuelgan las herramientas de Supabase), `docs/prompts/ficha-tecnica.md` y `docs/prompts/busqueda-comprador-precio-y-presentaciones.md`. Lee los hilos de Codex (`chatgpt-codex-connector`) en el PR #75 (3 hilos en `lib/tienda/busqueda.ts`) y en el #76 (2 hilos) y los 2 comentarios del #78 sobre `lib/data/supabase.ts` y `lib/tienda/zoom.ts`. Tu puesto es **Coding**.

## 1. Qué arreglar

1. **Seguridad, `ficha_url` (#76):** el `check` de `productos.ficha_url` y la validación de `guardar_ficha_producto` aceptan **cualquier host** (`^https://[a-z0-9.-]+/storage/v1/object/public/productos/<tienda>/…`). Debe aceptar **solo** el host del Storage del proyecto. Comprueba cómo son de verdad las URL de fotos guardadas (`select fotos … from productos limit 5` o las de Storage) para saber el host exacto (p. ej. `euihaeyfdlpvmbtfzvnt.supabase.co`, o un dominio propio si lo hay). Migración nueva: antes de cambiar el `check`, verifica que ninguna fila viole la regla nueva (hoy deberían ser 0 con ficha; si hay, dilo y no las borres); reemplaza la restricción (`drop constraint` + `add constraint` en la misma migración está bien) y `create or replace` de `guardar_ficha_producto` con la **misma firma**. Ensayo en `BEGIN … ROLLBACK`, replay (`probar:admin-db`) con un caso nuevo (host ajeno rechazado por la función y por el `check`), `apply_migration`, `revisar:migraciones` en cero y `get_advisors` sin nada nuevo. Revisa si las **fotos del producto** y las **fotos por valor** (`fotos_por_valor`, `guardar_foto_valor`) tienen el mismo hueco y, si lo tienen, ciérralo en la misma migración con el mismo cuidado (o dilo si prefieres dejarlo para otra).
2. **Ficha rota tras un corte (#76, P1/P2):** en `lib/data/supabase.ts` (≈L1262), si `guardar_ficha_producto` falla por **red/incierto**, no borres el archivo recién subido; reconcilia como `guardarProductoConInventario` (releer la fila y decidir). Solo borra si el error es seguro (rechazo del servidor).
3. **Zoom del visor (#76, P2):** en `lib/tienda/zoom.ts`, calcula los límites del arrastre con el tamaño **real** de la imagen dentro de la escena (`object-fit: contain`), no con el de la escena.
4. **Búsqueda (#75, 3×P2) en `lib/tienda/busqueda.ts`:** (a) el precio para filtrar usa solo presentaciones **disponibles** (si todo está agotado, todas), igual que `desde()`; (b) `de X a Y` / `entre X y Y` explícitos son rango siempre, aunque X o Y aparezcan como texto del catálogo (la desambiguación solo aplica al número suelto); (c) la ✕ de la etiqueta quita el tramo de precio ya reconocido sin volver a interpretarlo contra otro conjunto de productos.

## 2. Reglas y cierre

- Nada de datos reales en la migración. Esencias Michel responde igual (15 productos, misma huella del catálogo).
- **La prueba fija de Michel** de la búsqueda (`tests/fixtures/michel-busqueda-base.json`) sigue idéntica.
- Unitarias para cada arreglo (host ajeno, error incierto conserva el archivo, límites del zoom, los 3 casos de búsqueda). `tsc`, `npm test`, `npm run lint`, `npm run build`, `probar-ficha`, regresiones del catálogo y de búsqueda.
- En el PR, **responde cada hilo de Codex** de #75 y #76 (qué hiciste y el commit) y resume en español corto: qué cambió, la migración y su ensayo, qué debe probar Lewis.
