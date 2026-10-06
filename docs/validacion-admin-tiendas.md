# Continuación de Coding Admin tras Planning — 2026-10-06

Estado actual del PR [#53](https://github.com/onedayoneproj-blip/deslizapp-app/pull/53), abierto y sin merge. Codex incorporó `f0f9438` en un checkout independiente `/workspace/deslizapp-admin-tiendas`; conservó la rama previa y los demás workspaces. `git fetch origin` y `git rebase origin/main` confirmaron la base `5ab86323f60d2a3778ef177f8ec1db467cab9260`, sin conflictos ni PR #45. Los informes bajo el separador son históricos; no describen pendientes actuales de migración o build.

## Corrección y contrato

`ProveedorSoloMirar` componía el contexto mediante un spread sobre el Proxy vacío de `soloMirar`, que no enumera métodos. Ahora cada acceso de `useData` resuelve metadatos tipados o delega al Proxy protegido. No enumera ni expone `real`, su cliente o su caché; tampoco añade lecturas permitidas. Los métodos actuales y futuros de escritura siguen bloqueados antes de Supabase; `marcarActividad` devuelve false sin escribir. La fuente normal y la vista tienen cachés diferentes. Cambiar identidad/tienda/vencimiento de sesión remonta la fuente.

Una validación fallida cierra permanentemente la envoltura, descarta caché y retira los hijos del contexto antes de navegar. Salida, error de cierre, sign-out y vencimiento también bloquean inmediatamente la vista. Las lecturas, incluidas las resueltas en caché, mantienen la comprobación antes y después. La ficha ahora usa el endpoint existente `/api/admin/ver-como` con `accion: iniciar`; antes llamaba una ruta inexistente. Si falla la detección al volver al panel normal, se recarga para volver a autorizar en servidor, sin enviar a una persona no admin a recuperación admin.

**Límite SQL:** soloMirar bloquea escrituras desde este flujo de la app. Una cuenta admin que también es dueña conserva sus permisos normales de dueño en la base. Esta corrección no los revoca.

## Pruebas propias de esta continuación

- `npm test`: **248/248**, cero fallos. El informe previo 39/39 era por archivos; conservarlo como histórico, sin equipararlo a 39 casos.
- `npx next typegen && npx tsc --noEmit`: pasó tras retirar la ruta fixture temporal.
- `npm run build`: pasó localmente, incluida generación de rutas; no se cambió la tipografía. Las fuentes se descargaron correctamente en este entorno.
- `npm run lint`: **27 advertencias, cero errores**, exactamente las mismas por archivo/regla/mensaje que main con el mismo lockfile y `eslint.config.mjs`; cero advertencias añadidas.
- `npm run probar:admin-db`: replay completo **desechable** de las 41 migraciones, permisos admin no miembro/dueño, no-admin/retirado, sesión exacta, vencida/cerrada, RLS, ACL e inmutabilidad. Paridad 33 escenarios × 3 usos; **42 funciones**, incluyendo ambas guardias de Ver como, idénticas en cuerpos y permisos al snapshot consultado de producción. **392 secuencias SQL/demo** y concurrencia de mensualidades; regresiones de eliminación, catálogo, pedido y stock, con dos sesiones solapadas. Pasó antes y después de ampliar el snapshot.
- `npm run probar:ver-como-transporte`: **12 recorridos Chromium con Auth/API/Supabase simulados**, montando los proveedores reales y un consumidor de `useData`. Verifica todos los métodos del contrato, carga de tienda, escritura programática/UI/futura sin transporte, admin sin membresía y admin/dueño sintéticos, guardias antes/después, resultado invalidado, cache entre fuentes y cambio de sesión, foco tras cierre en otra pestaña, reemplazo, error de autorización, Salir a ficha, fallo de cierre, vencimiento e inicio desde ficha. Cada consulta Supabase interceptada exige el Bearer ficticio. No es OAuth real ni prueba de RLS a través del navegador; RLS se comprueba en PostgreSQL desechable. La ruta fixture solo existe durante el script, fuera del dashboard, y se elimina; nunca se publica.
- `scripts/probar-admin-tiendas.mjs`: pasó también sobre el build local; Hoy/Tiendas/ficha Demo, búsqueda/filtros, WhatsApp editable, acciones solo sobre fixtures, 360/390/430 px y claro/oscuro, sin overflow ni tráfico Supabase; acceso directo no autenticado da 404.
- `probar:hojas`: pasó sobre el build local; gestos, Atrás, Escape, X, foco, diálogo y borradores. `probar:teclado`: pasó sobre build local con visualViewport/teclado simulados, no iPhone físico.

## Comparación de las 11 advertencias nuevas

No se cambiaron configuración ni reglas de ESLint. Las 26 advertencias `@next/next/no-img-element` y una `react-hooks/exhaustive-deps` de `components/tienda/catalogo.tsx` ya estaban en main y permanecen idénticas, fuera de este alcance. Ninguna advertencia nueva intencional permanece.

| Archivo y línea en f0f9438 | Regla | Resolución / motivo de la navegación completa |
| --- | --- | --- |
| ficha-tienda.tsx:68 | no-location-assign-relative-destination | Inicio: la nueva autorización debe construir un dashboard fresco. |
| provider.tsx:115 | misma regla | Fallo de detección: recarga y autorización de servidor, sin enviar al dueño común a recuperación admin. |
| provider.tsx:158 | misma regla | Sesión terminada: retirar vista y volver a ficha. |
| provider.tsx:159 | misma regla | Validación fallida: retirar vista y abrir recuperación. |
| provider.tsx:173 | misma regla | Cierre fallido: retirar vista y abrir recuperación. |
| provider.tsx:176 | misma regla | Sign-out fallido: retirar vista y abrir recuperación. |
| provider.tsx:190 | misma regla | SIGNED_OUT: retirar fuente autorizada y abrir entrada. |
| provider.tsx:200, primer aviso | misma regla | Vencimiento con cierre confirmado: ficha con árbol nuevo. |
| provider.tsx:200, segundo aviso | misma regla | Vencimiento con cierre rechazado: recuperación sin datos. |
| provider.tsx:201 | misma regla | Error de red al vencer: recuperación sin datos. |
| provider.tsx:185 | exhaustive-deps | Se quitó sesion.id de useMemo, que no lo lee. La identidad se usa como key del proveedor; dependencias efectivamente utilizadas conservadas. |

Las transiciones de autorización usan `navegarVerComo`: URL absoluta validada del mismo origen y carga completa para descartar árbol/caché anteriores. Es una decisión de comportamiento explícita, sin disable global ni local. La navegación normal del admin conserva Link.

## Supabase: comprobaciones reales de lectura

`list_migrations` y `revisar:migraciones`: **41/41, cero diferencias de versión**. El aviso histórico de nombre de `20260930005714` permanece y no es una diferencia de versión. `20261006111233_admin_ver_como_validar.sql` aplicada por Planning, **sin editar ni reaplicar**. Las seis originales tampoco cambiaron. Consulta propia de pg_proc confirmó hash, firma, SECURITY DEFINER, search_path vacío y ACL de las dos guardias: authenticated sí, anon no. El snapshot ahora contiene las 42 funciones aplicadas. No se invocó una RPC de negocio en producción, no se abrieron sesiones reales, no se repitió alta admin, no se modificó Auth, pagos, productos ni tiendas reales.

## Fallos y reintentos

Durante el desarrollo, TypeScript detectó el cast directo de metadatos a FuenteDatos: se corrigió con metadatos tipados y destino Proxy tipado. La prueba primero incluyó marcarActividad como escritura que lanza (su contrato es false sin transporte); se corrigió la aserción. El reloj de Playwright instalado después de montar no controlaba el timeout anterior: se instaló antes de navegar. La fixture de ficha inicialmente no tenía todo el contrato: se reemplazó por una ficha del almacén Demo. Un primer build compiló mientras la ruta temporal era retirada y falló en su validador; el build posterior, sin fixture, pasó. Typegen se repitió tras limpieza. Un primer rebase con cambios sin guardar fue rechazado; se preservaron con stash, rebase pasó y se recuperaron íntegros. El portal NEXTJS-PORTAL robó foco en el ensayo de teclado sobre dev; el ensayo final sobre build pasó. No se relajaron aserciones de seguridad ni tipografía para esconder estos fallos.

## Entrega / comprobación manual pendiente

El commit final, despliegue exacto READY y su URL única se verifican y se registran en la descripción actual del PR. Preview estable: https://deslizapp-app-git-feature-admin-tiendas-onedayone.vercel.app/admin.

Google real, lista efectiva de callbacks permitidos, Safari/iPhone físico y varias pestañas con Auth real **no se comprobaron**. El host de los pasos siguientes es el alias estable; su callback es exactamente `https://deslizapp-app-git-feature-admin-tiendas-onedayone.vercel.app/auth/callback`. No sustituirlo por un host único de otro despliegue ni asumir que ya está permitido. No cambiamos Site URL ni Auth. Si Supabase lo rechaza, Planning debe revisar ese host permitido, sin modificar tiendas para probar.

1. Si falta sesión, abrir la raíz del alias estable, tocar Entrar con Google y usar la cuenta admin existente; después abrir el enlace `/admin` anterior (sin sesión, `/admin` responde 404 deliberadamente).
2. Revisar Hoy y Tiendas; buscar Esencias Michel y abrir su ficha, sin ajustar créditos, transferir ni pausar.
3. Tocar Ver como ella; debe cargar la tienda con franja Solo mirar. Tocar Guardar/Despachar debe mostrar el aviso y no guardar nada.
4. Tocar Salir; debe regresar a la ficha. Volver a abrir Ver como y cerrarlo desde otra pestaña; al enfocar la primera debe retirarse la vista. Recarga/Atrás no deben mezclar tiendas. El vencimiento de 30 minutos también regresa a ficha.

No se fusionó el PR, no se publicó la app en producción y no se avanzó Trabajo/Cobros/Más.

---

# Informes históricos anteriores a esta continuación

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

# Admin parte 2 — validación de Coding

Rama `feature/admin-tiendas`, rebasada sobre main `5ab86323f60d2a3778ef177f8ec1db467cab9260`. PR #53 permanece abierto. El alias estable es https://deslizapp-app-git-feature-admin-tiendas-onedayone.vercel.app; la URL única READY, commit e ID verificados más recientes se mantienen en la descripción actual del PR para que esta nota no quede atada a un commit de documentación.

## Hecho en esta rama

- Hoy, Tiendas, ficha y rutas de demostración aisladas; Trabajo, Cobros y Más continúan como placeholders.
- Fuentes admin demo y real por separado. `/admin` valida sesión y `soy_admin()` en servidor. `/admin-demo` usa fixtures locales y no inicializa el cliente Supabase; el proxy de sesión excluye ese prefijo. Los enlaces de Hoy y Tiendas conservan el espacio demo y no saltan a rutas reales.
- Búsqueda con espera, filtros, resumen mensual, mensajes preparados para WhatsApp, posponer y acciones de crédito, transferencia y estado sobre fixtures Demo.
- Ver como usa fuente/caché independiente, `soloMirar` bloquea todas las escrituras del recorrido antes de llamar a la fuente, no marca actividad y valida autorización antes y después de lecturas. Las acciones muestran el aviso de solo mirar. El vencimiento, salida, otra pestaña o fallo de autorización retiran la fuente/caché y bloquean la vista; el cierre incierto ofrece recuperación.
- La base no revoca permisos normales de escritura de una persona dueña. Ver como aplica la protección dentro de este recorrido de la app.

## Supabase y migraciones

Se revisaron las firmas reales en las migraciones y el estado accesible del proyecto `euihaeyfdlpvmbtfzvnt`: las 40 migraciones originales están aplicadas; existen `admin_ver_como_iniciar(uuid)` y `admin_ver_como_terminar(uuid)`. La tabla `sesiones_ver_como` no da acceso directo a `anon` ni `authenticated`.

La ruta de Ver como necesita `admin_ver_como_actual()` y `admin_ver_como_validar(uuid)`: funciones para validar al usuario actual, que sigue siendo admin, la pertenencia del ID de sesión, la tienda y su vigencia. Sin ellas una cookie no puede validarse contra la base ni la app detectar el modo en otras pestañas sin abrir acceso a la tabla. La propuesta aditiva está en `supabase/migrations/20261006111233_admin_ver_como_validar.sql`; no cambia datos, políticas de dueño ni las 40 migraciones ya aplicadas. El replay completo desechable pasó. No se aplicó a producción ni se creó una rama de desarrollo porque no hay ninguna disponible. Las bases locales de la otra sesión permanecen desconocidas. Antes de aplicar, coordinar con la otra sesión y generar la versión con el Supabase CLI autorizado; el CLI no está instalado en este entorno, así que el número actual del archivo es provisional.

## Validaciones realmente ejecutadas

- Replay completo desde base desechable con `npm run probar:admin-db`: pasó las comprobaciones SQL de permisos, lectura entre tiendas, admin no miembro y dueño, admin retirado, sesión vencida/cerrada, aislamiento y funciones admin. El comparador confirmó 40 funciones previas iguales a producción y ACL limitada en las dos guardias nuevas. En la prueba del dueño, la base conserva sus permisos normales; esto confirma que el bloqueo corresponde a `soloMirar` de la app.
- Navegador Chromium local (Playwright): `/admin` y `/admin/tiendas` directos sin sesión dieron 404; Hoy/Tiendas/ficha Demo recorrieron sin peticiones a Supabase y sin overflow a 360, 390 y 430 px, en claro y oscuro. Se ejercitaron búsqueda, filtro «En prueba», posponer, ajuste de créditos, transferencia y pausa sobre fixtures volátiles. Capturas actuales de 390 px: `docs/capturas/admin-tiendas/`.
- `tests/admin-solo-mirar.test.mjs`: cubre todas las escrituras de la interfaz actual y escrituras futuras, accesos admin sin membresía y admin/dueño, validación antes/después de leer, cambio de tienda, cierre/vencimiento y comprobación de que un intento de escritura no llega al cliente Supabase.
- `npm test`: 39/39 pasaron, incluyendo el texto de WhatsApp y el enlace editable de la ficha.
- `npx next typegen && npx tsc --noEmit`: pasó.
- `npm run lint`: pasó con 38 advertencias (uso de `<img>` en código existente, navegación de recarga intencional para limpiar la fuente y dependencias existentes de hooks); cero errores.
- `npm run probar:teclado`: pasó en Chromium con viewport y teclado virtual simulado; no es Safari físico.
- `npm run probar:hojas`: pasó los cierres con gesto, fondo, Escape, X y Atrás, confirmación de cambios, foco y conservación de datos.
- `scripts/probar-admin-tiendas.mjs`: pasó en Chromium local con Demo aislada, filtros/búsqueda, ficha, posponer y acciones de ajuste/transferencia/pausa usando solo fixtures; verificó 360/390/430 px, tema claro/oscuro, cero overflow, cero tráfico Supabase desde Demo y enlace `wa.me` con borrador editable desde la ficha.
- Las capturas actuales de Hoy, Tiendas y ficha son de Chromium real ejecutando la app Demo y están en `docs/capturas/admin-tiendas/`.
- `npm run build`: bloqueado por el entorno de red; Next no pudo descargar Caveat, Figtree y Fredoka de Google Fonts. No se cambió la tipografía para ocultar el problema. Vercel construyó el commit funcional y los despliegues de sincronización de documentación en estado READY; las rutas Demo y `/api/version` respondieron HTTP 200. El despliegue exacto más reciente se conserva en el PR #53.

## Pendiente/no verificado

- La migración no está aplicada: la API real de Ver como responderá con una explicación de actualización pendiente; no se considera lista para probar con Michel hasta coordinar y desplegar la migración.
- OAuth real de Google, callback de preview, aviso de sesión real, membresía de tienda, panel de la cuenta admin/dueño, cierre/vencimiento SQL y navegadores de iPhone/Safari requieren validación manual. No se modificó Auth. Si Lewis autoriza login en esta preview, usar y permitir solo el callback exacto que muestra la descripción actual del PR; no asumir permitido el alias estable y no cambiar Site URL.
- No se probó visualmente el flujo Ver como con una sesión real: hacerlo requeriría la migración y credenciales Google. Demo informa que Ver como es exclusivo de sesión admin real y no intenta llamar el API.
- La otra sesión no expone bases locales o de desarrollo; no se puede confirmar si usa nombres/contratos aún no publicados.
