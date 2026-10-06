# Admin parte 2 — handoff para Planning y Claude Code

**Puesto:** Coding. **Rama:** `feature/admin-tiendas`. Base verificada: `origin/main` en `1454a782a5d5aaa59a8fecf56d1c124b419d7aee`. El PR/commit final y la URL exacta de preview se completan al subir la rama. No incorporar #45, no fusionar y no publicar producción. Lewis ya tiene alta admin; no se repitió.

## Cambios

- Hoy, Tiendas, ficha y cinco pestañas. Trabajo, Cobros y Más son solo preparación.
- Demo usa almacenamiento de fixtures independiente, sin cliente Supabase, sin proxy de sesión y con enlaces que permanecen en `/admin-demo`. El modo real está separado y `/admin` no muestra contenido si faltan sesión/autorización admin.
- Ficha permite abrir Ver como, WhatsApp con borrador/enlace, catálogo y acciones de créditos, transferir y pausar/reactivar. Las acciones mutables reales llaman las RPC existentes, con sus firmas verificadas; pruebas de acciones solo usaron fixtures Demo.
- Ver como usa fuente/caché aislada y envoltura central `soloMirar`, bloquea escribir antes de invocar Supabase incluso cuando el admin también sea dueño, comunica el intento y omite `marcarActividad`. Lecturas se validan contra la sesión exacta, admin actual, tienda y vencimiento antes/después. Salir/vencer/quedar sin autorización vacía la caché y retorna a la ficha; ante error de cierre muestra una pantalla bloqueada con recuperación. Ningún ID/cookie autoriza por sí mismo.
- Si la sesión de Auth venció durante un cierre fallido, la pantalla bloqueada permite volver a entrar con Google y reintentar; no revela el panel mientras la RPC no confirme el cierre.
- Se corrigió el margen de pantalla para eliminar 4 px de overflow horizontal en 360 px y se corrigió la combinación de clases en `Foto` que dejaba los logos/avatares sin altura.
- Capturas de Chromium y comparación con refs: [docs/capturas/admin-tiendas](../capturas/admin-tiendas/README.md). El reporte de validación está en [validacion-admin-tiendas.md](../validacion-admin-tiendas.md).

## SQL / bloqueo a coordinar

- Producción tiene 40 migraciones aplicadas, sin cambios. Se inspeccionaron los contratos y nombres reales; tabla `sesiones_ver_como` bloquea SELECT directo a roles app.
- Se necesita una migración aditiva con dos guardias para Ver como, porque la fuente real no puede consultar la tabla directamente y la cookie no basta para autorizar ni sincronizar pestañas: `admin_ver_como_actual()` y `admin_ver_como_validar(uuid)`. Sin ella el endpoint de inicio falla cerrado; no usar Ver como contra tienda real todavía.
- Archivo propuesto: `supabase/migrations/20261006130000_admin_ver_como_validar.sql`. Replay completo en una base desechable pasó; no se aplicó en producción. No existe rama de desarrollo accesible. Las bases locales de la otra sesión siguen desconocidas. Antes de aplicar, coordinar con esa sesión e historial y crear la versión correcta con Supabase CLI; la CLI no está instalada en este entorno, por eso el identificador del archivo es provisional y debe normalizarse antes de aplicar/mergear.
- No cambia las políticas de escritura del dueño. SQL permite que Lewis, dueño de Michel, use sus permisos normales; solo el flujo de la app establece `soloMirar`.

## Pruebas y límites

- Pasaron las pruebas Chromium de Demo a 360/390/430, claro/oscuro, acceso directo no autenticado 404, búsqueda/filtro, posponer, ficha y acciones de ajuste de créditos/transferencia/pausa solo en fixtures. Demo no emitió solicitudes a Supabase; no hubo overflow horizontal. Script: `scripts/probar-admin-tiendas.mjs`.
- `npm run probar:admin-db`: replay desechable completo pasó; incluye admin sin membresía, cuenta admin/dueño, no-admin, admin retirado, vencimiento/salida, ACL, 40 funciones existentes y las dos guardias nuevas.
- `npm test`: 38/38. `npx next typegen && npx tsc --noEmit`: pasó. `npm run lint`: pasó con advertencias conocidas y cero errores.
- `npm run probar:teclado`: pasó (teclado virtual simulado en Chromium). `npm run probar:hojas`: pasó gestos, Atrás, Escape, X, foco, diálogo y borradores.
- Build local no terminó: el entorno bloqueó la descarga de Caveat, Figtree y Fredoka desde Google Fonts. Verificar el build remoto de la preview Vercel.
- Google OAuth, callbacks, login real, captura del panel real Ver como, ciclo de varias pestañas/salida/expiración con Auth real, Safari físico y teclado iPhone no ejecutados.
- Callback exacto a permitir en Supabase cuando se sepa el despliegue: `https://<host-exacto-del-preview>/auth/callback`. No cambiar Site URL ni allowlist por esta rama. Refrescar preview antiguo no incluye el commit nuevo.
- La migración sigue sin aplicar y la CLI de Supabase no está instalada para asignar su versión oficial. El identificador actual es provisional; no fusionar/aplicar hasta coordinar el espacio de migración con la otra sesión. Sus bases locales siguen desconocidas.

## Pasos de Lewis en iPhone (cuando haya preview y migración disponible)

1. Abrir `/admin` e iniciar sesión con Google; revisar Hoy.
2. En Tiendas, buscar «Esencias Michel» y abrir su ficha.
3. Tras coordinar/aplicar la migración y permitir el callback exacto del preview, tocar «Ver como ella» y revisar la franja «Solo mirar».
4. Tocar Despachar o Guardar: debe aparecer el aviso y no cambiar nada.
5. Tocar Salir; debe volver a la ficha. Repetir atrás/recarga y revisar que no haya datos de otra tienda.
