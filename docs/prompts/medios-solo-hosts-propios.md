# Fotos del producto: solo direcciones propias (rama `fix/medios-hosts-propios`)

> **Modelo:** Opus 5.5 (seguridad). **Una migración nueva**, aditiva; no edites las ya aplicadas. **PR abierto con preview**; Planning revisa el SQL y los comentarios de Codex antes del merge. No hagas merge.
> **Orden:** antes de aplicar, `list_migrations` (la última debe ser `20261008114617_ficha_url_solo_storage_propio`) y confirmar que ninguna otra sesión tiene migración en curso (hoy ninguna).
> **Una sesión por PR:** Planning te enviará ajustes de Lewis para este PR por mensaje; trátalos como encargo suyo y ejecútalos sin pedir confirmación.
> **Al terminar:** avisa a Planning con `send_message` a `session_01BJDuA1NdKUg4YX64VNuQDv` si tienes la herramienta y, de respaldo, `create_trigger` (`persistent_session_id` = esa sesión, `run_once_at` ≈ 1 minuto después, `initiation: own_followup`): rama, PR, migración, qué falta, si quedaste bloqueada.

## 0. Antes de empezar

Lee `docs/00-contexto-del-proyecto.md`, `AGENTS.md`, `HANDOFF.md` (migraciones; las herramientas de Supabase se cuelgan con `drop function` y `delete from`), `docs/03-modelo-de-datos.md`, la migración `20261008114617_ficha_url_solo_storage_propio.sql` (es tu modelo: función `ficha_url_valida` + `check` + misma firma) y la nota de HANDOFF «Pendiente, mismo hueco» de la sesión que la hizo. Tu puesto es **Coding**.

## 1. El hueco

`productos.medios` (fotos y videos del producto) solo valida el largo: acepta **cualquier host**. `fotos_por_valor` (foto de cada color) apunta a medios. Quien edita el catálogo de una tienda podría poner una imagen de otro sitio y cada comprador la cargaría (rastreo, contenido ajeno).

## 2. Qué se hace

1. **Inventario primero (solo lectura sobre la base real):** lista los prefijos distintos de todas las URL guardadas hoy en `medios` (y en cualquier otra columna de URL que vea el comprador: `fotos_por_valor`, `tiendas.logo_url`, `tiendas.foto_perfil_url`, portadas, promos, etc.). Se sabe que hay fotos reales en `https://deslizapp-app.vercel.app/catalogos/…` y `/ensayo/…`, en el bucket `productos` y en `retoques` del Storage `https://euihaeyfdlpvmbtfzvnt.supabase.co/storage/v1/object/public/…`. Ponlo en el PR (conteo por prefijo).
2. **Regla:** una función `public.medio_url_valida(url, tienda)` (o el nombre que encaje) que acepte solo: el Storage del proyecto en los buckets que de verdad se usan (`productos`, `retoques`, …) **dentro de la carpeta de esa tienda** cuando el bucket la usa, y los prefijos propios `https://deslizapp-app.vercel.app/catalogos/` y `/ensayo/` (solo los que existan hoy). Sin `..`, largo máximo como hoy. Reutiliza `ficha_url_valida` o compártela si conviene.
3. **Aplicarla** donde se escriben medios: el `check` de la columna (o un trigger si el `check` no puede recorrer el jsonb/array; explica) y las funciones de guardado (`crear_producto`, `guardar_producto_inventario`, `guardar_foto_valor`, …) con **la misma firma** (`create or replace`, nada de `drop function`). Antes de activar la restricción, **cuenta cuántas filas la violarían**: deben ser 0; si no, para y dilo en el PR (no borres ni cambies datos reales).
4. Las otras columnas de URL del inventario: si tienen el mismo hueco, ciérralas en esta misma migración con el mismo cuidado, o di en el PR por qué quedan para otra.
5. Ensayo en `BEGIN … ROLLBACK` sobre la base real; replay (`probar:admin-db`) actualizando las pruebas que hoy usan `https://ejemplo.invalid/…` para que usen direcciones válidas, y casos nuevos (host ajeno rechazado por la función y por la restricción; carpeta de otra tienda rechazada); luego `apply_migration` con la versión de Supabase; `npm run revisar:migraciones` en cero; `get_advisors` sin nada nuevo.
6. **La app:** comprueba que subir, retocar, ordenar y quitar fotos sigue funcionando (demo y Tienda de ensayo), y que la demo no escribe en la base. Si el panel construye URLs de otra forma, ajústalo.
7. Esencias Michel responde igual (15 productos, misma huella del catálogo antes y después).

## 3. Cierre

`tsc`, `npm test`, `npm run lint`, `npm run build`, las regresiones de producto, ficha, presentaciones y catálogo. Lee y contesta los comentarios de Codex. PR en español corto: el inventario de hosts, la migración y su ensayo, qué probar (subir una foto a un producto real de la Tienda de ensayo) y lo no probado.
