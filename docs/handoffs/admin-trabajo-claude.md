# Admin parte 3 — Trabajo, retoque real y Personalizar (Claude, Coding Admin, 2026-10-06)

**Rama:** `feature/admin-trabajo`, creada desde el HEAD remoto de `feature/admin-tiendas`
(`39d618f1a5ec363c7bf46c2f2d553f58b2485a30`) porque el PR #53 sigue abierto. **PR dependiente** contra
`feature/admin-tiendas` (no contra `main`): cuando #53 se fusione, este PR se rebasa sobre `main`. Checkout independiente
(`/home/user/admin-trabajo`, git worktree); el trabajo previo de otras ramas quedó intacto. No incorpora #45. Sin merge ni
publicación en producción. Validación detallada: [validacion-admin-trabajo.md](../validacion-admin-trabajo.md).

## Qué cambió

**Admin (`/admin` real y `/admin-demo`, mismas pantallas):**
- **Trabajo › Catálogos** (`components/admin/pantalla-trabajo.tsx`): segmento Catálogos · Fotos con conteos; grupos Por
  empezar («Empezar»), Armando (barra de 3 pasos, «Pasar a …», «Mandar a revisar» solo en el paso 3), Pidió cambios (la nota,
  «Mandar a revisar», «Personalizar») y Esperando su sí («Recordarle» por WhatsApp, `mensajeRevisarCatalogo`). Cada tarjeta dice
  hace cuánto. «Mandar a revisar» pide el enlace https (propone el actual o `/tienda/{slug}`). «Ver sus fotos» abre una hoja con
  las fotos y las baja una por una o todas en un .zip armado en el navegador (`lib/admin/zip.ts`, sin dependencias; si pasa de
  120 MB, una por una). Hoy enlaza con `?tienda=` (y `?ver=fotos` para retoques) y la tarjeta llega resaltada.
- **Trabajo › Fotos** (`components/admin/trabajo-fotos.tsx`): agrupado por tienda, la más vieja primero; antes/después, «Bajar
  original», «Subir la retocada» (`reducirFoto` → bucket `retoques` con nombre nuevo por intento, `upsert:false`), «Entregar»
  (`admin_retoque_entregar`) y abre la siguiente; «Devolver» con hoja de motivo (≤200, sugerencias) y `admin_retoque_devolver`.
  Créditos de la tienda a la vista y aviso si el saldo ya no cubre lo reservado.
- **Personalizar** (`/admin/tiendas/[id]/catalogo`, `components/admin/pantalla-personalizar.tsx`, lógica en
  `lib/admin/personalizar.ts`): vista previa de la cabecera; Marca (4 colores con aviso AA, letra de títulos de las que el
  catálogo ya carga, cabecera de texto o SVG validado); Frases con contador («Al agregar» hasta 5); Secciones (Chat, Búsqueda,
  Colecciones; Opiniones encendidas / Pronto / apagadas); Productos (orden arrastrando con «Mover arriba/abajo» y opiniones por
  producto). Guarda con `admin_guardar_personalizacion` (merge; null borra). Borrador guardado por tienda en este navegador.
  «Ver como lo verá un cliente» abre `/tienda/{slug}` (o `?demo`). Se abre desde la ficha y desde «Pidió cambios».
- **Lecturas nuevas** (migraciones aplicadas, ver abajo): `productosTienda` y `personalizacionTienda` en `FuenteAdmin`, más
  `subirRetocada`.

**Panel de la tienda:**
- **Retoque real** en la ficha del producto (`components/catalogo/ficha-medios.tsx`, `components/catalogo/taller.ts`):
  «Retocar» llama a `pedir_retoque` (reserva, no cobra). La miniatura muestra «En el taller» con anillo; no se puede pedir otra
  vez. Sin saldo libre: «Te faltan créditos para esta.». Entregada: la foto cambia sola (también en un borrador abierto y al
  guardar, que nunca vuelve a la original) y sale «Tu foto salió del taller.» una vez por foto. Devuelta: «Devuelta», el motivo y
  «Subir otra». Fotos sin guardar: «Guarda el producto para mandarla al taller.» Ver como: no deja pedir.
- Se quitó el retoque de demostración y el cobro al guardar (`hoja-producto.tsx`); `RETOQUE_REAL = true`, sin etiqueta «Demo».
- «Tu plan» explica el taller en una línea. Novedad `0.36.0`.
- **«Administrar Deslizapp»** en el menú que abre el nombre de la tienda (`components/panel/acceso-admin.tsx`): solo si
  `soy_admin()` devuelve `true`; oculto si la consulta falla, durante Ver como y para cualquier dueño que no sea admin. El enlace
  no autoriza nada: el layout de `/admin` vuelve a comprobarlo en el servidor y cada RPC también. En la demo dice «Admin de la
  demo» y lleva a `/admin-demo`.

**Catálogo público:**
- La cabecera SVG se valida con lista blanca (`lib/tienda/svg-cabecera.ts`) al guardar en el admin **y** al pintar
  (`temaDeTienda`); si no pasa, se ve el nombre en texto. Rechaza scripts, eventos `on*`, `href`/`xlink:href`, `<use>`,
  `<image>`, `<foreignObject>`, `<style>`, animaciones, comentarios/CDATA/DOCTYPE/ENTITY, `url()` externas, `data:`,
  `javascript:`, entidades numéricas y escapes CSS. La cabecera real de Michel pasa (mismo md5 que el seed).
- «Pronto» de opiniones: `secciones.opiniones_pronto = true` (la base solo admite booleanos); `modoOpiniones()` lo lee (y el
  valor viejo `"pronto"`).

**Demo compartida** (`lib/data/admin/demo-compartida.ts`): `/admin-demo` y la demo del panel del mismo navegador comparten
tiendas, productos, taller, créditos y personalización (localStorage `deslizapp-demo-v5`, nunca Supabase). Antes de cada
operación se relee el panel; después de una escritura del admin se devuelve **solo lo que cambió** campo a campo; las operaciones
van en fila. Lo que es solo del admin (pagos, registro, tiendas de ejemplo de Hoy) sigue en memoria.

## Tema claro y modo oscuro

Revisión visual en el tema claro de las pantallas nuevas y de Hoy, Tiendas y ficha; se corrigieron problemas de legibilidad
(saludo y fecha de Hoy, puntos y leyenda de salud en Tiendas, contraste de la vista previa de Personalizar). **El modo oscuro no
está diseñado para la app:** no se revisó, no se cambiaron colores para él y no se presenta como validado. Queda pendiente de
diseño para toda la app.

## Seguridad de las acciones

- **Doble envío:** cada acción tiene un candado (`useRef`) además del botón en «cargando». Probado: doble toque en Entregar cobra 5
  una sola vez.
- **Respuesta incierta:** si la red falla sin un código conocido, se vuelve a leer antes de decir nada (entregado/devuelto/
  catálogo avanzado/personalización aplicada con `yaAplicado`). Solo se anuncia éxito si de verdad quedó. Un reintento de
  Entregar reutiliza la foto ya subida.
- **Foto cambiada mientras esperaba:** la RPC devuelve `foto_no_encontrada`; no reemplaza ni cobra. El admin ve el motivo y la
  hoja de Devolver queda con el texto propuesto. Producto retirado: `producto_no_encontrado`, igual.
- **Historial:** el trabajo guarda la URL original; el archivo original queda en `productos` (la limpieza del panel solo borra
  rutas del bucket `productos` que ya no se usan; las retocadas viven en `retoques`, que no tiene política de borrado).
- **soloMirar:** `pedirRetoque` sigue bloqueado; `trabajosRetoque` es lectura permitida. El acceso admin no aparece en Ver como.

## Migraciones (aplicadas, cero diferencias)

| Versión Supabase | Archivo | Qué |
|---|---|---|
| 20261006130421 | `admin_productos_tienda.sql` | Lectura admin de productos de una tienda (sin retirados, orden del catálogo). |
| 20261006130705 | `admin_personalizacion_tienda.sql` | Lectura admin de marca y personalización. |

Ambas: `SECURITY DEFINER`, `search_path=""`, `soy_admin()` primero, `tienda_no_encontrada`, execute solo `authenticated`.
Ensayadas en replay desechable (`npm run probar:admin-db`, Postgres 17.6) antes de aplicarlas; `list_migrations` antes de cada una
(sin cambios de la otra sesión en esas tablas); historial 43/43 y `revisar:migraciones` sin diferencias; snapshot de 44
funciones (md5 + ACL) igual a producción. No se editaron ni reaplicaron las 41 anteriores; no se repitió el alta del admin.

## Lo que NO se probó en real (y por qué)

En Supabase solo existe **Esencias Michel**. Por instrucción, no se usó Michel para nada que cambie créditos, fotos,
personalización o catálogo, y no se creó una tienda de ensayo sin autorización. **Bloqueo documentado:** el retoque real
(pedir/entregar/devolver con Storage), Avanzar catálogo y Guardar personalización en producción no se ejecutaron. En real solo
se hicieron lecturas: las dos RPC nuevas como admin dentro de `BEGIN READ ONLY … ROLLBACK` (15 productos, mismo orden que
`catalogo_publico`), `no_admin` para un usuario cualquiera, políticas de `trabajos_retoque` y del bucket `retoques`, y el md5 de la
cabecera de Michel. Michel quedó igual: 95 créditos (movimiento inicial), 0 trabajos. Las escrituras están probadas en el replay
(RPC reales sobre Postgres desechable) y en la demo; eso no sustituye una prueba con Storage y Auth reales.

**Para probar en real hace falta:** que Lewis autorice crear una tienda de ensayo (o indique una), con un producto oculto y
créditos de prueba; luego seguir los pasos de la validación con la cuenta admin y una cuenta de esa tienda.

## Para Planning

- Revisar el PR dependiente; no fusionar antes que #53. Al fusionar #53, rebasar esta rama sobre `main` y cambiar la base del PR.
- Decidir la tienda de ensayo para el retoque real (bloqueo de arriba).
- `lib/novedades.ts` usa `0.36.0`; si `main` cambia de versión antes del merge, renumerar.

## Para la sesión que retome

- Leer este handoff, la validación y el PR. `git fetch` y partir del HEAD remoto de `feature/admin-trabajo`; no empujar copias
  viejas.
- Pruebas: `npm test`, `npm run probar:admin-db` (necesita Docker; arrancar `dockerd` si no corre),
  `PLAYWRIGHT_MODULE=… CHROMIUM_PATH=… BASE_URL=… npm run probar:admin-trabajo` contra un build local.
- Límite conocido: si la tienda tiene la ficha abierta cuando le entregan una foto, el borrador toma la retocada y el guardado
  vuelve a leer el taller antes de guardar, así que no vuelve a la original. Un guardado que reescriba `medios` por otra vía
  (una versión vieja de la app abierta en otro dispositivo, o un `UPDATE` directo) sí podría volver a la original; el trabajo
  conserva ambas URL para recuperarla.
