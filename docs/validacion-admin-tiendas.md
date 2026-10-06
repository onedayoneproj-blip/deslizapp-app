# Admin parte 2 — validación de Coding

Rama de trabajo: `feature/admin-tiendas`, nacida de `origin/main` en `1454a782a5d5aaa59a8fecf56d1c124b419d7aee`, rebasada sobre `5ab86323f60d2a3778ef177f8ec1db467cab9260`. PR #53, commit remoto `dd0ba0c56e828065c23f9661d24c89ecd4817cc1`. Preview READY: https://deslizapp-i56aa91rm-onedayone.vercel.app; alias estable https://deslizapp-app-git-feature-admin-tiendas-onedayone.vercel.app. `/api/version` respondió `dpl_2CKUNrqfWbYWT4PveT18cyiW8884`.

## Hecho en esta rama

- Hoy, Tiendas, ficha y rutas de demostración aisladas; Trabajo, Cobros y Más continúan como placeholders.
- Fuentes admin demo y real por separado. `/admin` valida sesión y `soy_admin()` en servidor. `/admin-demo` usa fixtures locales y no inicializa el cliente Supabase; el proxy de sesión excluye ese prefijo. Los enlaces de Hoy y Tiendas conservan el espacio demo y no saltan a rutas reales.
- Búsqueda con espera, filtros, resumen mensual, mensajes preparados para WhatsApp, posponer y acciones de crédito, transferencia y estado sobre fixtures Demo.
- Ver como usa fuente/caché independiente, `soloMirar` bloquea todas las escrituras del recorrido antes de llamar a la fuente, no marca actividad y valida autorización antes y después de lecturas. Las acciones muestran el aviso de solo mirar. El vencimiento, salida, otra pestaña o fallo de autorización retiran la fuente/caché y bloquean la vista; el cierre incierto ofrece recuperación.
- La base no revoca permisos normales de escritura de una persona dueña. Ver como aplica la protección dentro de este recorrido de la app.

## Supabase y migraciones

Se revisaron las firmas reales en las migraciones y el estado accesible del proyecto `euihaeyfdlpvmbtfzvnt`: las 40 migraciones originales están aplicadas; existen `admin_ver_como_iniciar(uuid)` y `admin_ver_como_terminar(uuid)`. La tabla `sesiones_ver_como` no da acceso directo a `anon` ni `authenticated`.

La ruta de Ver como necesita `admin_ver_como_actual()` y `admin_ver_como_validar(uuid)`: funciones para validar al usuario actual, que sigue siendo admin, la pertenencia del ID de sesión, la tienda y su vigencia. Sin ellas una cookie no puede validarse contra la base ni la app detectar el modo en otras pestañas sin abrir acceso a la tabla. La propuesta aditiva está en `supabase/migrations/20261006130000_admin_ver_como_validar.sql`; no cambia datos, políticas de dueño ni las 40 migraciones ya aplicadas. El replay completo desechable pasó. No se aplicó a producción ni se creó una rama de desarrollo porque no hay ninguna disponible. Las bases locales de la otra sesión permanecen desconocidas. Antes de aplicar, coordinar con la otra sesión y generar la versión con el Supabase CLI autorizado; el CLI no está instalado en este entorno, así que el número actual del archivo es provisional.

## Validaciones realmente ejecutadas

- Replay completo desde base desechable con `npm run probar:admin-db`: pasó las comprobaciones SQL de permisos, lectura entre tiendas, admin no miembro y dueño, admin retirado, sesión vencida/cerrada, aislamiento y funciones admin. El comparador confirmó 40 funciones previas iguales a producción y ACL limitada en las dos guardias nuevas. En la prueba del dueño, la base conserva sus permisos normales; esto confirma que el bloqueo corresponde a `soloMirar` de la app.
- Navegador Chromium local (Playwright): `/admin` y `/admin/tiendas` directos sin sesión dieron 404; Hoy/Tiendas/ficha Demo recorrieron sin peticiones a Supabase y sin overflow a 360, 390 y 430 px, en claro y oscuro. Se ejercitaron búsqueda, filtro «En prueba», posponer, ajuste de créditos, transferencia y pausa sobre fixtures volátiles. Capturas actuales de 390 px: `docs/capturas/admin-tiendas/`.
- `tests/admin-solo-mirar.test.mjs`: cubre todas las escrituras de la interfaz actual y escrituras futuras, accesos admin sin membresía y admin/dueño, validación antes/después de leer, cambio de tienda, cierre/vencimiento y comprobación de que un intento de escritura no llega al cliente Supabase.
- `npm test`: 38/38 pasaron.
- `npx next typegen && npx tsc --noEmit`: pasó.
- `npm run lint`: pasó con 38 advertencias (uso de `<img>` en código existente, navegación de recarga intencional para limpiar la fuente y dependencias existentes de hooks); cero errores.
- `npm run probar:teclado`: pasó en Chromium con viewport y teclado virtual simulado; no es Safari físico.
- `npm run probar:hojas`: pasó los cierres con gesto, fondo, Escape, X y Atrás, confirmación de cambios, foco y conservación de datos.
- `scripts/probar-admin-tiendas.mjs`: pasó en Chromium local con Demo aislada, filtros/búsqueda, ficha, posponer y acciones de ajuste/transferencia/pausa usando solo fixtures; verificó 360/390/430 px, tema claro/oscuro, cero overflow y cero tráfico Supabase desde Demo.
- Las capturas actuales de Hoy, Tiendas y ficha son de Chromium real ejecutando la app Demo y están en `docs/capturas/admin-tiendas/`.
- `npm run build`: bloqueado por el entorno de red; Next no pudo descargar Caveat, Figtree y Fredoka de Google Fonts. No se cambió la tipografía para ocultar el problema. Vercel construyó este mismo commit y publicó una preview en estado READY; `admin-demo`, `admin-demo/tiendas` y `api/version` respondieron HTTP 200.

## Pendiente/no verificado

- La migración no está aplicada: la API real de Ver como responderá con una explicación de actualización pendiente; no se considera lista para probar con Michel hasta coordinar y desplegar la migración.
- OAuth real de Google, callback de preview, aviso de sesión real, membresía de tienda, panel de la cuenta admin/dueño, cierre/vencimiento SQL y navegadores de iPhone/Safari requieren validación manual. No se modificó Auth. Si Lewis autoriza login en esta preview, permitir exactamente `https://deslizapp-i56aa91rm-onedayone.vercel.app/auth/callback`; no asumir permitido el alias estable y no cambiar Site URL.
- No se probó visualmente el flujo Ver como con una sesión real: hacerlo requeriría la migración y credenciales Google. Demo informa que Ver como es exclusivo de sesión admin real y no intenta llamar el API.
- La otra sesión no expone bases locales o de desarrollo; no se puede confirmar si usa nombres/contratos aún no publicados.
