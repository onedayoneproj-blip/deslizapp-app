# Pruebas del navegador (`scripts/probar-*.mjs`)

Estado al 13 oct 2026 (encargo [pruebas-en-verde](prompts/pruebas-en-verde.md)): las 51 pruebas pasan, o saltan solo lo que el entorno no puede, con el motivo en la salida. Todas corren en **modo Demo**: ninguna escribe en Supabase real (las que simulan el transporte lo interceptan).

## Cómo se corren

Necesitan Playwright con Chromium. En el entorno de Claude Code:

```bash
export CHROMIUM_PATH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome   # los scripts buscan /usr/bin/chromium por defecto
export PLAYWRIGHT_MODULE=/opt/node22/lib/node_modules/playwright/index.mjs # solo probar-admin-tiendas y probar-admin-trabajo lo exigen
export URL=http://localhost:3000  BASE_URL=$URL                            # scripts/navegador-catalogo.mjs usa 3220 si no se define
export CAPTURAS=/tmp/capturas CAPTURE_DIR=/tmp/capturas                    # si no, algunos escriben PNG dentro del repo (docs/capturas, raíz)
```

Tres modos de servidor (la columna «Modo» de la tabla):

| Modo | Cómo se levanta | Por qué |
|---|---|---|
| **A** | `npm run build && npm start -- -p 3000`, sin `.env.local` | Demo pura. Es el caso de casi todas. |
| **B** | `npx next dev -p 3300` | El script monta una ruta temporal (`app/prueba-…`) y la borra al terminar; `next start` no la ve. |
| **C** | B con `NEXT_PUBLIC_SUPABASE_URL=https://euihaeyfdlpvmbtfzvnt.supabase.co NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<la de .env.example>` | Prueban el cliente de Supabase con el transporte **simulado**: sin esas variables la app ni crea el cliente, y el proyecto va en el nombre de la cookie de sesión. Todo `*.supabase.co` se intercepta. |

Un script que se interrumpe puede dejar su ruta temporal (`app/prueba-*`, `app/catalogos/fixture-ver-como`, `app/fixture-checklist-local`): bórrala antes de volver a correrlo. `probar-onboarding-fallos` levanta su propio `next dev`: no corras otro mientras tanto.

No las corras en paralelo con otras corridas pesadas: con la máquina cargada, `probar-ficha` llegó a agotar el tiempo del toque (pasó 3 de 3 veces sola).

## Tabla

Lo que **necesita el entorno** además de Chromium: ninguna necesita internet.

| Script | Qué comprueba | Modo | Notas del entorno |
|---|---|---|---|
| admin-navegacion | Navegación del panel admin demo | A | |
| admin-tiendas | Tiendas del admin demo | A | `PLAYWRIGHT_MODULE` |
| admin-trabajo | Trabajo › Catálogos, taller de retoque, Personalizar | A | `PLAYWRIGHT_MODULE` |
| agotados-y-likes | Selección de agotados, likes | A | |
| ajustar-foto-historia | Ajustar foto de la historia (horizontal, cuadrada, vertical) | A | |
| aviso-publico | Avísame del comprador, en Demo | A | |
| boton-historia | «Agregar a historia» | A | |
| carrusel-historias | Barras del carrusel y vista enfocada | A | |
| catalogo-cabecera | Pestañas del feed, hoja Catálogos, cabecera | A | |
| catalogo-errores | Errores de pedido (sin red, límite) | A | **Se salta** salvo `LECTURA_REAL=1`: lee el catálogo real de Esencias Michel y necesita variables de Supabase |
| catalogo-por-tipo | Catálogo del comprador por tipo | A | |
| catalogo-presentaciones | Presentaciones en el catálogo del cliente | A | |
| catalogo-pulido | Tarjetas del panel: píldora de likes, stock, 360/390/430 claro y oscuro | A | contraste en oscuro: aviso, ver abajo |
| catalogo-react | Catálogo público React: hash, carrusel, video, aviso, pedido | A | video H.264 y WebKit, ver abajo |
| contadores-catalogo | Likes y trabajo pendiente | A | |
| crear-producto | Crear producto «como una historia» | A | |
| detalle-promos | Detalle de promos | A | |
| eliminar-producto | Eliminación lógica | A | |
| equipo | «Tu equipo» y permisos | A | |
| espera-catalogo | Personas en espera en Catálogo e Inicio | A | |
| espera-fallos | Fallos al leer/marcar la espera | B | ruta `app/prueba-espera` |
| espera-tienda | Cambio de tienda con una lista abierta | A | |
| ficha | Ficha técnica y descripción | A | |
| historial-ajustes-lista | Historial de ajustes del inventario | A | |
| historial-interno | Navegación interna e inventario | A | |
| hoja-producto | Hoja de editar producto | A | |
| hojas-gestos | Gestos de las hojas (touch real por CDP) | A | |
| hojas | Hojas del panel | A | |
| instalar | Instalar en iOS/Android | A | |
| inventario-fallos | Fallos del inventario | A | |
| inventario | Vista previa y ajustes de stock | A | |
| mi-marca | Mi marca para el retoque | A | |
| onboarding-checklist | Guía de inicio | A | |
| onboarding-fallos | Fallos de la guía | — | levanta su propio `next dev` |
| onboarding | Las 4 historias | A | |
| pedido-catalogo-panel | Pedidos del catálogo en el panel | A | |
| pedido-catalogo-transporte | Transporte simulado del pedido | C | ruta temporal |
| presentaciones | Presentaciones por pasos | A | |
| producto | Producto en el panel | A | |
| proxima-jugada | «Tu próxima jugada» encendida | A | **Se salta** mientras `FUNCIONES.proximaJugada` sea `false` (hoy); entonces corre `proximamente` |
| proximamente | «Próximamente» con la función apagada | A | |
| publicar-catalogo | Publicar mi catálogo | A | |
| reemplazo-promos | Reemplazo de promos | A | |
| retoque-al-subir | «Retocar esta foto» al subir | A | |
| selector-general-agregado | Selector de catálogos, «General» | A | |
| selector-tiendas | Selector de tiendas | A | |
| stickers-historia | Stickers de la historia | A | |
| teclado | El foco no se pierde al escribir | A | |
| tipo-de-producto | Tipo de producto, Lino & Algodón | A | |
| ver-como-transporte | «Ver como» con transporte simulado | C | ruta temporal |
| visibilidad-catalogo | Visible/oculto con fallos simulados | B | ruta `app/prueba-visibilidad` |

## Qué cambió (13 oct 2026)

| Script | Antes | Causa | Después |
|---|---|---|---|
| catalogo-pulido, espera-catalogo | Fallaba al medir la cifra «bajo el círculo» | La píldora de likes pasó a ser una sola píldora horizontal (corazón + cifra) | Comprueban la píldora: corazón a la izquierda, misma fila, dentro de la foto, borde y contraste |
| catalogo-pulido | `11 en stock · queda 1 de M` no aparecía | Con presentaciones la tarjeta dice «Hay de todas» / «N agotadas» | Espera «Hay de todas» |
| catalogo-pulido (oscuro) | — | **Bug de la app** (`vista-catalogo.tsx`): en `data-theme="dark"` la cifra es `text-texto` claro sobre `bg-marca-papel` fijo (contraste 1,13). El modo oscuro aún no está activo para usuarias, así que no es visible hoy | Se imprime `⚠` en vez de fallar; `ESTRICTO=1` lo vuelve fallo. Quitar el aviso al corregir la app |
| espera-catalogo | `Persona c` no aparecía | La lista de espera muestra el nombre del cliente si el teléfono coincide (aquí, Carolina Peña) | Espera el nombre del cliente y «Persona d» |
| espera-fallos | Agotaba el tiempo con el botón «Reintentar marcar como avisado a Fixture» | Igual: el teléfono coincidía con un cliente de la demo | Usa un teléfono sin cliente |
| visibilidad-catalogo, espera-fallos, ver-como-transporte, pedido-catalogo-transporte | Tiempo agotado / «This page couldn't load» | Sin cambio de código: necesitan los modos B/C, no `next start` | Documentado arriba |
| ajustar-foto-historia | Caso vertical: «Fondo difuminado» apagado por defecto fallaba | El service worker servía la foto original e ignoraba `page.route` (foto de 788×800 en vez de la de prueba) | El contexto usa `serviceWorkers: "block"` |
| hojas-gestos | Colecciones: el contenido no se desplazaba (0 px) | El scroll pasó a `.coscroll` dentro de `#coBg` | Mide `#coBg .coscroll` |
| inventario-fallos | Esperaba el botón «Salir»; luego «Ajustes de inventario» y 10 `li` | Aviso de salir ahora es «Descartar y salir» (#115); el historial es «Historial de ajustes» y «Ver más ajustes» es otra fila | Actualizados los tres |
| tipo-de-producto | Esperaba «Catálogo: Ropa» | Sin preferencia, el panel abre «General» (con «General 4» entre las opciones) | Actualizado |
| retoque-al-subir | Caso 6: esperaba el botón «Video» tras elegir un video | `VIDEO_PERMITIDO = false` (7 oct): un video elegido no se agrega | Comprueba que no se agrega y que uno ya guardado se abre sin interruptor de retoque |
| teclado | «Minimizar» no existía | El botón se llama «Minimizar la guía» | Actualizado |
| admin-trabajo | Buscaba «Pedirlo» | La tarjeta ya no ofrece «Pedirlo» (`docs/04-pantallas.md`) | Comprueba que no está y escribe el estado `solicitado` como lo hacía `pedirCatalogo` |
| catalogo-react | Agotaba el tiempo esperando reproducir el video | El Chromium de Playwright no trae H.264 y el video de prueba es H.264 | Se salta solo esa parte si `canPlayType` no lo soporta; el hash y el carrusel sí se comprueban |
| catalogo-errores | Agotaba el tiempo esperando `#r-delilah` | Necesita Supabase real (lectura del catálogo de Esencias Michel) | Se salta salvo `LECTURA_REAL=1` |
| proxima-jugada | Lanzaba un error | La función está apagada a propósito | Se salta con mensaje (sale con 0) |
| catalogo-react, ficha | — | WebKit no está instalado aquí (ya se avisaba y se seguía); `ficha` falló una vez bajo carga | Sin cambio |
| admin-tiendas | «Define PLAYWRIGHT_MODULE» | Entorno | Documentado |
| proximamente | (se decía que fallaba en `main`) | Pasa | Sin cambio |
