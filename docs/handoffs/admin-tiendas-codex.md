## Revisión de Planning — 2026-10-06

Lewis autorizó completar la coordinación del PR. Aplicada en Supabase
`20261006111233_admin_ver_como_validar.sql`, reemplazando el nombre provisional
`20261006130000_admin_ver_como_validar.sql`. El SQL se conserva idéntico.
Verificados ambos RPC, SECURITY DEFINER/search_path vacío y ACL:
authenticated puede ejecutarlos, anon no. No se modificaron tiendas ni se
abrieron sesiones reales para probar.

**Bloqueo de código antes del merge:** `soloMirar()` devuelve un Proxy sobre
un objeto vacío, sin ownKeys/getOwnPropertyDescriptor. En
`ProveedorSoloMirar`, `...instancia.lectura` no enumera los métodos de
FuenteDatos. Las lecturas a través de useData pueden quedar undefined.
Coding debe corregir la composición manteniendo el guard central y probar
el proveedor/contexto completo, no solo accesos directos al Proxy.

Pendiente también: comparación del lint de main/PR para las 11 advertencias
adicionales y corrección o justificación individual. No se ejecutó lint por
Planning ni se repitieron los replays de Coding. Google/Safari/Ver como real
siguen pendientes. No merge ni publicación del admin.

Lo que sigue abajo es el informe histórico anterior a esta activación.

---

# Admin parte 2 — handoff para Planning y Claude Code

**Puesto:** Coding. **Rama:** `feature/admin-tiendas`. Partió de `origin/main` `1454a782a5d5aaa59a8fecf56d1c124b419d7aee`, luego se rebasó manualmente sobre `5ab86323f60d2a3778ef177f8ec1db467cab9260` para conservar los cambios nuevos de documentación. PR abierto: [#53](https://github.com/onedayoneproj-blip/deslizapp-app/pull/53). El commit remoto y la URL única READY más recientes se actualizan en la descripción del PR; [el alias estable de la rama](https://deslizapp-app-git-feature-admin-tiendas-onedayone.vercel.app) permite abrir la preview. No incorporar #45, no fusionar y no publicar producción. Lewis ya tiene alta admin; no se repitió.

## Cambios

- Hoy, Tiendas, ficha y cinco pestañas. Trabajo, Cobros y Más son solo preparación.
- Demo usa almacenamiento de fixtures independiente, sin cliente Supabase, sin proxy de sesión y con enlaces que permanecen en `/admin-demo`. El modo real está separado y `/admin` no muestra contenido si faltan sesión/autorización admin.
- Ficha permite abrir Ver como, WhatsApp con borrador editable que incluye la tienda/vendedora, catálogo y acciones de créditos, transferir y pausar/reactivar. Las acciones mutables reales llaman las RPC existentes, con sus firmas verificadas; pruebas de acciones solo usaron fixtures Demo.
- Ver como usa fuente/caché aislada y envoltura central `soloMirar`, bloquea escribir antes de invocar Supabase incluso cuando el admin también sea dueño, comunica el intento y omite `marcarActividad`. Lecturas se validan contra la sesión exacta, admin actual, tienda y vencimiento antes/después. Salir/vencer/quedar sin autorización vacía la caché y retorna a la ficha; ante error de cierre muestra una pantalla bloqueada con recuperación. Ningún ID/cookie autoriza por sí mismo.
- Si la sesión de Auth venció durante un cierre fallido, la pantalla bloqueada permite volver a entrar con Google y reintentar; no revela el panel mientras la RPC no confirme el cierre.
- Se corrigió el margen de pantalla para eliminar 4 px de overflow horizontal en 360 px y se corrigió la combinación de clases en `Foto` que dejaba los logos/avatares sin altura.
- Capturas de Chromium y comparación con refs: [docs/capturas/admin-tiendas](../capturas/admin-tiendas/README.md). El reporte de validación está en [validacion-admin-tiendas.md](../validacion-admin-tiendas.md).

## SQL / bloqueo a coordinar

- Producción tiene 40 migraciones aplicadas, sin cambios. Se inspeccionaron los contratos y nombres reales; tabla `sesiones_ver_como` bloquea SELECT directo a roles app.
- Se necesita una migración aditiva con dos guardias para Ver como, porque la fuente real no puede consultar la tabla directamente y la cookie no basta para autorizar ni sincronizar pestañas: `admin_ver_como_actual()` y `admin_ver_como_validar(uuid)`. Sin ella el endpoint de inicio falla cerrado; no usar Ver como contra tienda real todavía.
- Archivo propuesto: `supabase/migrations/20261006111233_admin_ver_como_validar.sql`. Replay completo en una base desechable pasó; no se aplicó en producción. No existe rama de desarrollo accesible. Las bases locales de la otra sesión siguen desconocidas. Antes de aplicar, coordinar con esa sesión e historial y crear la versión correcta con Supabase CLI; la CLI no está instalada en este entorno, por eso el identificador del archivo es provisional y debe normalizarse antes de aplicar/mergear.
- No cambia las políticas de escritura del dueño. SQL permite que Lewis, dueño de Michel, use sus permisos normales; solo el flujo de la app establece `soloMirar`.

## Pruebas y límites

- Pasaron las pruebas Chromium de Demo a 360/390/430, claro/oscuro, acceso directo no autenticado 404, búsqueda/filtro, posponer, ficha, WhatsApp preparado y acciones de ajuste de créditos/transferencia/pausa solo en fixtures. Demo no emitió solicitudes a Supabase; no hubo overflow horizontal. Script: `scripts/probar-admin-tiendas.mjs`.
- `npm run probar:admin-db`: replay desechable completo pasó; incluye admin sin membresía, cuenta admin/dueño, no-admin, admin retirado, vencimiento/salida, ACL, 40 funciones existentes y las dos guardias nuevas.
- `npm test`: 39/39. `npx next typegen && npx tsc --noEmit`: pasó. `npm run lint`: pasó con advertencias conocidas y cero errores.
- `npm run probar:teclado`: pasó (teclado virtual simulado en Chromium). `npm run probar:hojas`: pasó gestos, Atrás, Escape, X, foco, diálogo y borradores.
- Build local no terminó: el entorno bloqueó la descarga de Caveat, Figtree y Fredoka desde Google Fonts. El build de Vercel sí terminó READY; las rutas `/admin-demo`, `/admin-demo/tiendas` y `/api/version` respondieron 200. En ambos hosts de preview `/api/version` informó el ID exacto de despliegue anterior.
- Google OAuth, callbacks, login real, captura del panel real Ver como, ciclo de varias pestañas/salida/expiración con Auth real, Safari físico y teclado iPhone no ejecutados.
- No se cambió la configuración Auth. Si Lewis autoriza OAuth en la preview, el callback exacto a permitir es `https://deslizapp-i56aa91rm-onedayone.vercel.app/auth/callback`. No cambiar Site URL; no asumir que el alias también está permitido. Refrescar un despliegue anterior no incorpora este commit.
- La migración sigue sin aplicar y la CLI de Supabase no está instalada para asignar su versión oficial. El identificador actual es provisional; no fusionar/aplicar hasta coordinar el espacio de migración con la otra sesión. Sus bases locales siguen desconocidas.

## Pasos de Lewis en iPhone (cuando haya preview y migración disponible)

1. Abrir `/admin` e iniciar sesión con Google; revisar Hoy.
2. En Tiendas, buscar «Esencias Michel» y abrir su ficha.
3. Tras coordinar/aplicar la migración y permitir el callback exacto del preview, tocar «Ver como ella» y revisar la franja «Solo mirar».
4. Tocar Despachar o Guardar: debe aparecer el aviso y no cambiar nada.
5. Tocar Salir; debe volver a la ficha. Repetir atrás/recarga y revisar que no haya datos de otra tienda.
