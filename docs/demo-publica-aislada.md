# Demo pública e interno separados

Decisión implementada el 15 oct 2026 según [el encargo](prompts/demo-publica-deslizapp-aislada.md). Pendiente de validación de Lewis en la preview; este cambio no se fusiona automáticamente.

«Probar la app con datos de prueba» se conserva en sus entradas públicas. Abre una sola tienda, **Deslizapp · ejemplo**, con el perfil y nueve productos capturados por lectura de https://deslizapp.com/tienda/deslizapp el 15 de octubre. Nombres, presentación y opciones proceden del catálogo público. Los 30 archivos de fotos/logo se descargaron sin alterar sus originales. [Manifiesto de procedencia](demo-publica-medios.json); copias en `public/demo/deslizapp/`; snapshot sin cuenta ni contactos en `lib/data/seed/deslizapp-publico.json`. No hay sincronización con el negocio. No se modificaron la portada, su feed con caché, `/conoce` ni el catálogo comercial.

Los precios, inventario, likes, clientes, pedidos, fechas, abonos y dueño son ficticios. El slug reservado es `deslizapp-ejemplo`, la tienda tiene ID `demo-publica-deslizapp` y las relaciones iniciales llevan prefijo `demo-publica-`. Los nuevos IDs los genera el almacén local. Las existencias de productos con variantes suman sus variantes activas. Cada total de pedido coincide con sus líneas; los abonos no superan el total. Las fechas se desplazan con el reloj al iniciar/reiniciar.

## Fuentes y persistencia

| Experiencia | Fuente | Persistencia | Acceso |
| --- | --- | --- | --- |
| Pública | Instancia pública de `crearAlmacenDemo`, `construirDemoPublica` | `deslizapp-publica-v1`, selección propia | Sin Google |
| Interna | Instancia `demoInterna`, `construirDesdeSeed` | Se conservan `deslizapp-demo-v5` y `deslizapp-sesion-v1` | Identidad Google de Lewis comprobada en servidor |
| `/conoce` | DB propia del iframe, `usarDemoEnMemoria` | Solo memoria | Público |
| Negocio real | Fuente Supabase existente | Sin cambios | Permisos existentes |

La pública ignora el almacén y selección antiguos; no los migra ni borra. El reinicio afecta sus datos y preferencias propias. Los carritos usan el slug de la copia y el dispositivo demo tiene namespace propio. Los enlaces de catálogo y productos se resuelven al origen actual con su marca demo. Una solicitud pública lleva código `DEMO-…`; aun perdiendo el query, servidor y cliente siguen en demo. La interna usa `?demo=interna` y códigos nuevos `INTERNA-…`; sus páginas y metadatos comprueban acceso antes de cargar la fuente. Ninguna de esas identidades se resuelve mediante consultas al catálogo comercial.

Mensajes del panel se interceptan en el límite de demo; las acciones programáticas de avisos, invitaciones y listas de reposición también simulan su efecto. El pedido del comprador abre su confirmación local en lugar de WhatsApp. Las fotos nuevas se guardan localmente con la fuente demo; no se suben a Storage. No se ejecutan cobros, invitaciones ni envíos reales.

## Acceso interno

`lib/demo/acceso-servidor.ts` usa `auth.getUser()` y compara el ID autenticado y una identidad Google con `DEMO_INTERNAL_AUTH_USER_ID`, variable **solo del servidor**. No usa `soy_admin`, `user_metadata`, query params, localStorage ni una cookie como autorización. Sin configuración, sesión válida o coincidencia, se cierra con 404 (403 en activación API).

La vinculación se obtuvo de la cuenta aprobada en la tarea privada y se verificó por lectura de Auth, sin exportar el correo, crear cuentas ni modificar usuarios. La configuración se limita a **preview / rama `feat/demo-publica-aislada`** en Vercel. La producción conserva su configuración anterior; antes de un eventual merge deberá configurarse la misma vinculación allí. No se modifica la autorización del admin real `/admin`.

Entrada interna: `/demo-interna` → «Abrir el sandbox interno». El POST de activación exige identidad y mismo origen. Guarda una cookie HttpOnly de selección; el layout vuelve a validar la identidad antes de montar la fuente sintética. El menú interno conserva selector, niveles, simulaciones, laboratorio y admin demo. `/admin-demo` y todas sus subrutas, `/prueba`, `/unirse/demo`, catálogo/pedido internos y la API quedan protegidos. El laboratorio monta explícitamente la fuente interna incluso si la cuenta estaba mirando su panel real.

«Salir de la demo» borra la selección interna y vuelve a la entrada sin cerrar Google ni cambiar la tienda real por defecto. El borrado de esa selección local no requiere Auth. No es un permiso para abrir herramientas.

## Pruebas reproducibles

- `npm run tipos`, `npm run lint`, `npm test`, `npm run build`.
- `PLAYWRIGHT_MODULE=/ruta/a/playwright URL=http://localhost:3002 node scripts/probar-demo-publica.mjs`: entradas públicas, fotos, menú sin herramientas, crear/editar producto, enlace a catálogo, pedido local, registro, confirmación/despacho, recarga, resumen y reinicio en 360/393/430 px. Registra solicitudes y falla ante cualquier petición a Supabase o WhatsApp. También comprueba rutas internas con cookie falsificada.
- `node --test tests/demo-publica.test.mjs tests/demo-acceso.test.mjs`: dinero/relaciones/IDs, persistencia antigua, memoria independiente, Auth simulado con Google autorizado, otra cuenta, proveedor ajeno, metadata manipulada, errores y configuración ausente; API con control de origen.
- `NODE_PATH=/ruta/node_modules PLAYWRIGHT_MODULE=/ruta/playwright CHROMIUM_PATH=/usr/bin/chromium node scripts/probar-demo-interna.mjs probar-selector-tiendas.mjs probar-equipo.mjs`: suites históricas en **copia temporal**, con Auth Google ficticio. El guard de identidad se ejecuta con un cliente Auth sustituido solo en esa copia. No se añaden bypasses de prueba al producto ni se cargan credenciales reales. La copia y su servidor se eliminan al terminar.

Los resultados ejecutados, capturas, preview, alias y HEAD se registran en el PR y en [el relevo](handoffs/demo-publica-aislada.md). Las suites de navegador simulan Chromium; no equivalen a Safari/PWA en un iPhone físico ni a un login OAuth real.

Los 18 comandos npm de navegador que usan fixtures o herramientas internas ejecutan ese wrapper (incluidos inventario, producto, pedido de catálogo, publicación, onboarding y admin). Para una suite interna adicional, usa `node scripts/probar-demo-interna.mjs nombre-de-suite.mjs`, nunca un arranque directo contra la demo pública. Los comandos de transporte y replay de DB conservan su mecanismo específico. El wrapper adapta las URLs de las suites antiguas a `demo=interna`; conserva intactas las reglas de origen/query, fuentes públicas y receptor de pedidos de producción. `probar-enlaces-internos.mjs` comprueba los enlaces generados sin reescribir sus URLs.
