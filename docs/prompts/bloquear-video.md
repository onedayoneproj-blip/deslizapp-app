# Bloquear la carga de videos por ahora (rama `fix/bloquear-video`)

> **Modelo:** en Claude Code, Sonnet 5.5; en Codex, el modelo principal con razonamiento medio. Cambio chico: UI y una migración que **restringe** la configuración de un bucket. Cuando todo pase, **fusiona (squash) a `main`**; déjalo abierto solo si algo falla o decides algo que no estaba aquí.

## 0. Antes de empezar

Lee `docs/00-contexto-del-proyecto.md`, `AGENTS.md` y `HANDOFF.md` (reglas de migraciones, la nota sobre las herramientas de Supabase que se cuelgan con `drop function` y con `delete from`). Tu puesto es **Coding**.

Mira antes: `components/catalogo/ficha-medios.tsx` (`MAX_VIDEOS`, `TiraMedios`, la preparación y el recorte del video), `lib/video.ts`, `components/ui` (`VideoProducto`), `supabase/migrations/20261004132336_bucket_productos_video.sql` (el bucket `productos` acepta `video/mp4`, `video/webm`, `video/quicktime`) y lo que dice `docs/14` sobre el video por plan.

## 1. Qué decidió Lewis (7 oct 2026)

**No se pueden subir videos por ahora** (cuida el almacenamiento y la salida de datos del plan gratis de Supabase y el peso en el catálogo). Más adelante se volverá a abrir, probablemente solo desde cierto plan, así que **no borres el código del video**: apágalo de forma que encenderlo después sea un cambio pequeño.

## 2. Qué se hace

1. **Una sola constante** (p. ej. en `lib/config.ts`, `VIDEO_PERMITIDO = false`, con un comentario que diga que es una decisión de negocio temporal) que decide si la app deja **agregar** videos. Con `false`:
   - En la ficha del producto no aparece nada para subir o grabar video (ni la opción, ni el selector de archivo, ni el recorte). Nada de «Próximamente» ni de textos de error: simplemente no está, y la tira de medios queda como la de fotos.
   - Los videos que **ya existen** en un producto **se siguen viendo y reproduciendo** igual (panel y catálogo del cliente) y se pueden **quitar** o reordenar. Hoy ningún producto real usa video (Esencias Michel tiene 2 archivos sueltos en el bucket, de pruebas, sin producto).
   - En la demo, igual: no se puede agregar; los videos de la demo, si hay, se siguen viendo.
2. **Que la base también lo impida** (no solo la pantalla): una migración nueva y **aditiva en forma** (no edites una aplicada) que deje el bucket `productos` aceptando **solo imágenes** (`image/jpeg`, `image/png`, `image/webp`). Es una restricción deliberada (en este caso sí se quita permiso, porque es la decisión); no toca archivos ya subidos ni su lectura pública. Comprueba que subir una foto sigue funcionando (producto y logo) y que subir un video ahora es rechazado por Storage con un error que la app no muestre como algo roto (si por alguna razón llegara, mensaje en la voz de `docs/11`, sin romper la pantalla).
   - Usa `update storage.buckets set allowed_mime_types = ... where id = 'productos'` (sin `drop`); ensayo en `BEGIN; … ROLLBACK;` con `execute_sql`, replay (`probar:admin-db`), luego `apply_migration` con la versión que asigne Supabase; `list_migrations` antes (Lewis trabaja con una sola sesión a la vez). `npm run revisar:migraciones` en cero.
3. **Que reabrirlo sea fácil:** deja en `HANDOFF.md` y en el comentario de la constante qué hay que cambiar para volver a abrirlo (la constante y la migración inversa que restaura los tipos de video).

## 3. Reglas

- No cambies nada del video que ya está guardado ni de cómo se reproduce.
- No cambies el límite de fotos ni cómo se suben.
- Teclado, movimiento y permisos como siempre (`HANDOFF.md`). Un Ayudante no ve el video de todas formas.

## 4. Pruebas y cierre

- Unitarias: la constante apagada oculta lo de subir video; con la constante encendida (en el test) vuelve.
- Navegador (demo, 390 y 360): crear un producto con foto sin ver nada de video; abrir un producto con video (si la demo tiene) y comprobar que se ve y se puede quitar.
- Replay de la migración y prueba de Storage: foto sí, video no.
- `tsc`, `npm test`, `npm run lint` (sin avisos nuevos), `npm run build` y las regresiones de producto y de fotos/retoque.
- Novedad solo si el usuario nota algo (aquí no: no se anuncia que se quita). Actualiza `docs/04` donde hable de subir video.
- Resume en español, corto.
