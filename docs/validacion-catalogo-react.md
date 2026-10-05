# Catálogo público React — implementación y validación

Rama `feature/catalogo-react`, PR #44. Parte 4 de `docs/12-catalogo-conectado.md`, anterior al registro de solicitudes en el panel (parte 3). **No fusionar:** Lewis compara el preview con el HTML antes de publicar las rutas nuevas.

## Alcance y datos

- `/tienda/{slug}` y `/pedido/{codigo}` están fuera del dashboard y de su sesión/DataProvider. La fábrica `lib/data/publica.ts` usa las cinco operaciones públicas de la misma `FuenteDatos`: cliente Supabase anónimo sin persistir sesión; `?demo` usa la implementación demo y su suscripción entre pestañas.
- Componentes en `components/tienda/`, CSS propio portado del HTML, fuentes locales. No se pega el HTML entero. El panel conserva `useData()`, aislamiento, despacho, stock y sus hojas.
- Reels, perfil, colecciones calculadas, búsqueda, carrito, opiniones, coach, historias y planes; medios, video, variantes, avisos, encargo, precios promocionales y aaahs públicos. Carrito/coach por slug; lectura inicial de las llaves antiguas de Michel.
- Crear una solicitud no crea un pedido ni descuenta stock. La respuesta de la base determina precios y total. WhatsApp abre en la misma pestaña tras la respuesta; nunca envía automáticamente. Agotado o límite de intentos no abre WhatsApp; error general/red usa el mensaje sin enlace.
- La página del comprador tiene historia, recibo PNG/PDF y regreso al catálogo. No incorpora el estado ni el registro de la parte 3. Si un código inexistente no permite conocer la tienda, el regreso usa el catálogo de procedencia o el historial del navegador: no se inventa una tienda.

## Migración y trabajo en producción

**Aplicada** en `euihaeyfdlpvmbtfzvnt`: `20261004184134_catalogo_react.sql`. El nombre lleva la versión devuelta por Supabase, no una fecha inventada.

Añade `productos.orden`, `opiniones` y su validación; amplía `catalogo_publico` con esos campos, `desde` y ventas despachadas agregadas (solo desde 10). Mantiene las políticas y las reglas de disponibilidad, stock público y promos.

Antes de aplicar: replay de las 30 migraciones en PostgreSQL 17 desechable, SQL de validación con rollback, RPC bajo `anon`, aislamiento y validación de opiniones (estructura, llaves, tipos, longitudes y máximo). Comprobación posterior de columnas, función, RLS, permisos e historial. `npm run revisar:migraciones -- lista.json`: **30/30, cero diferencias de versión**. Permanece el aviso histórico de nombre `20260930005714_invitaciones` / `invitaciones_y_tienda_esencias_michel`: misma versión; no se reparó historia ajena a esta tarea.

**Ejecutado** el SQL generado en `scripts/sql/esencias-michel-catalogo-react.sql`: 13 productos ordenados, 15 opiniones, tema con merge y descripción solo si vacía. Los otros productos quedan sin orden; los nuevos aparecen primero. Lectura real: **14 visibles**. `mensajes`, `secciones`, precios, existencias, visibilidad y `url_catalogo` conservados. Huella de stock/precio/visibilidad antes/después: `8b09f01f5d35da33bd64a248638794c3`.

El script `scripts/cargar-catalogo-esencias-michel.mjs` es idempotente y extrae también las fotos y el seed demo. En demo oculta el producto que no está en el HTML y conserva 13 para comparar; eso no cambia la visibilidad real. Omite detalles vacíos y ocasiones fuera del selector actual: un arreglo vacío no cumple el contrato de detalles. Las notas importadas ya existen: la regresión de producto las quita por el editor antes de comprobar una sustitución.

Se creó **una** solicitud real de prueba bajo `anon`, dispositivo `catalogo-react-pr44-validacion`, código `LUVGUMKWXM`, un Delilah, RD$2,350. Se verificó su página y se eliminó exclusivamente esa solicitud, condicionando código, tienda y dispositivo. La lectura posterior confirmó **0 solicitudes** de ese dispositivo. No se registra un pedido, no se modifica stock ni se envía WhatsApp.

El HTML estático, el enlace antiguo `#pedido/…` y `url_catalogo` siguen intactos. Aplicar esta migración no publica el frontend.

## Validación ejecutada

Resultados ejecutados contra el build local. No confundir motor Chromium con Safari real.

- Build de producción y TypeScript: correctos.
- Unitarias: **190/190** con los subprocesos de Node habilitados. Dentro del sandbox, Node solo reportaba los 24 archivos: se repitió fuera de ese límite para verificar todos los casos.
- Lint: cero errores y 27 advertencias, principalmente de `img` nativo (portado del HTML, fuentes/URLs por tienda y carga diferida).
- Replay: completo y correcto; `scripts/probar-catalogo-replay.sh` crea y destruye su contenedor. No toca producción.
- `probar:hojas` y `probar:teclado`: correctos en Chromium contra el build local.
- `probar:inventario`: correcto tras eliminar los detalles vacíos del seed importado; verifica guardado conjunto, historial, motivos, stock cero/null, navegación y ausencia de pedidos por ajuste.
- `probar:producto`: **42/42 correctos** en la repetición final. La primera ejecución falló en los seis casos de perfume porque esperaba añadir notas a un producto sin ellas; ahora el seed ya las trae. No se marca esa ejecución como aprobada.
- `probar-catalogo-react.mjs`: hash, carrusel y video mudo/sonido/pausa a 360/390; aviso persistente y visible en el panel; ropa con dos ejes, opción agotada y precio variable; encargo; solicitud/WhatsApp sin envío; recibos PNG/PDF; agotado entre abrir/enviar; oculto al recargar; atrás, Escape, foco y movimiento reducido a 430. Fixtures y escrituras solo demo, solicitudes de WhatsApp interceptadas. Para interceptar el video se bloquea el service worker únicamente en el contexto de prueba.
- WebKit 26.5 descargado; no puede arrancar por bibliotecas ausentes. `install-deps` intentó instalar y falló porque el usuario del entorno no tiene permiso de root. **Safari físico de iPhone y WebKit no verificados**: video en línea, carrusel, salto a la app WhatsApp y compartir recibo/PDF siguen requiriendo prueba de Lewis.
- Preview protegido por Vercel SSO. La herramienta autorizada de Vercel obtuvo HTTP 200 del catálogo real y del pedido de prueba sin sesión de Supabase, con metadatos correctos; el navegador sin acceso a Vercel fue redirigido a SSO. Lectura visual real desde build local con cliente anónimo: **14 productos, metadatos y página del pedido correctos, sin errores de consola**. No se desactivó la protección.

## Comparación visual

`scripts/comparar-catalogo.mjs`: 14 estados × 360/390/430, con seed normalizado, fuentes cargadas, pestaña en primer plano y animaciones congeladas. Conserva pares y porcentajes en `docs/capturas/catalogo-react/comparar/`. La diferencia de píxeles **no es una prueba automática de equivalencia**: cuenta también cambios de texto y fotografías; se revisan los pares.

Diferencias previstas:
- Colecciones: imágenes del primer producto, conteos desde datos y categorías añadidas; el HTML tenía filtros e imágenes fijos.
- Perfil: descripción de la tienda/OG de la base, nuevas imágenes de colecciones y conteos. Cambia el alto de ese texto y por tanto el inicio de la cuadrícula.
- Disponibilidad: «Solo tengo 1» y agotados actuales; precio promo/tachado si existe.
- Hoja del pedido: código/origen real y eliminación de la promesa del enlace viejo de 24 h; «Tu pedido» evita afirmar que la vendedora está en línea.
- Comprador: código/fecha actuales, nombre de tienda, sin vencimiento de 24 h, botones nuevos «Recibo (imagen)»/«Seguir explorando…»; conserva la historia y factura.
- Opiniones: datos importados y palabra según rubro; la producción de Michel conserva `opiniones: "pronto"` (el comparador habilita la lista solo en su fixture para revisarla).
- Foco visible: búsqueda y navegación con teclado conservan su indicación accesible.

**42/42 pares generados y revisados**, incluyendo las tres anchuras. Los porcentajes y pares completos están en `docs/capturas/catalogo-react/comparar/resultados.json`. El perfil tiene la mayor diferencia (aproximadamente 26–28 %) por la biografía real y el desplazamiento de la cuadrícula; no se presenta como equivalencia automática. El HTML contiene una rifa de Kiara que no consta en los datos públicos: React muestra su precio real, sin inventar una rifa.

El script de recorridos completó **9/9 grupos**. El script `probar-catalogo-errores.mjs` completó **2/2**: red interrumpida prepara WhatsApp sin enlace; límite de intentos muestra el aviso y no abre WhatsApp. Estas pruebas interceptan todas las escrituras, incluidas solicitudes y aaahs.

**Primera carga medida:** 1.158.100 bytes, 28 solicitudes, primer reel a 7.086 ms con caché vacía, red simulada de 1,6 Mbps/150 ms y build local sin compresión de Vercel. Se redujo la precarga a fotos cercanas y se evitó precargar fuentes del panel en el catálogo. Es un resultado pendiente de mejorar/verificar en el preview, **no un aprobado de rapidez en 4G ni una medición de iPhone**. Archivo `docs/capturas/catalogo-react/rendimiento.json`.

La comparación congela animaciones: no certifica equivalencia temporal de las transiciones del HTML. La apertura/cierre, carrusel, video, coach, movimiento reducido y navegación se ejercitaron en Chromium; los gestos físicos, el retorno desde WhatsApp y la hoja nativa de compartir requieren Safari/iPhone.

## Repetir las pruebas

- `npm test`, `npm run lint`, `npx next typegen && npx tsc --noEmit`, `npm run build`.
- Con la app arrancada y Playwright/Chromium disponibles: `URL=http://localhost:3220 node scripts/probar-catalogo-react.mjs`, `node scripts/probar-catalogo-errores.mjs`, `node scripts/comparar-catalogo.mjs`, `node scripts/medir-catalogo.mjs` (el mismo `URL` para todos). Se admite `PLAYWRIGHT_MODULE` y `CHROMIUM_PATH` si no están instalados en la ruta habitual.
- Regresiones del panel: `npm run probar:hojas`, `npm run probar:teclado`, `npm run probar:inventario`, `npm run probar:producto`, con su `URL`, `NODE_PATH` y navegador configurados.
- Base desechable: `bash scripts/probar-catalogo-replay.sh` con Docker disponible. Historial: `npm run revisar:migraciones -- lista.json` con una lectura reciente de Supabase.

## Prueba manual de Lewis

1. Abre el preview autorizado en Safari, sin entrar con Google a Deslizapp, en `/tienda/esencias-michel`. Compara con `/catalogos/esencias-michel.html`. Debe haber 14 productos reales; un producto nuevo sin orden puede aparecer primero.
2. Desliza los reels; toca «más», perfil, colecciones, búsqueda «dulce», opiniones y pedido. Cierra con X/atrás y revisa que vuelvas al lugar correcto.
3. Usa `/tienda/lino-y-algodon?demo` (consulta el slug demo si cambió): elige talla/color, prueba una agotada, Avísame, un producto por encargo, carrusel y video. Demo no escribe en Supabase.
4. Envía un pedido de **Demo**; WhatsApp debe abrir un texto editable con código y enlace, sin enviarlo solo. Usa la página demo del pedido para revisar historia, total, PNG y PDF. El enlace de WhatsApp no añade `?demo`: para probar su página demo en otro navegador se necesitan los datos del mismo contexto; los enlaces reales sí se leen desde cualquier dispositivo.
5. Con «Reducir movimiento» en iPhone, repite navegación y cierre. En búsqueda/Avísame, abre el teclado, escribe, cambia orientación y cierra: no debe perderse el campo ni bloquearse la hoja.
6. Prueba un pedido real solo si deseas que exista esa solicitud de prueba: no es una venta ni descuenta stock, pero crea un borrador real. Esta PR ya comprobó una solicitud y la eliminó; no necesitas enviar WhatsApp para revisar la UI.

**No cambiar el enlace público ni fusionar antes de la comparación de Lewis.**


## Revisión posterior de rendimiento (sin fusionar PR #44)

El resultado histórico anterior permanece intacto. La rama dependiente `feature/catalogo-rendimiento` repite la versión `a565537` con el criterio corregido y cinco contextos fríos por versión; la comparación válida, trazas y regresiones están en [validacion-catalogo-rendimiento.md](validacion-catalogo-rendimiento.md). No mezclar los 7,086 s históricos con esa comparación. No cambia los SQL ya aplicados ni incorpora el panel de solicitudes.
