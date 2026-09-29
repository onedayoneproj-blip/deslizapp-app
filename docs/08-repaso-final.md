# Repaso final de la primera entrega (paso 10)

Recorrido de la app como si fuera el dueño de una tienda, con las dos tiendas de
prueba (Esencias Michel y Luna Bisutería), en emulación móvil de 360, 390 y 430 px
con Playwright, sobre la versión de producción local (`next build` + `next start`).
Pruebas automáticas: `npm test` (29 unitarias) y `npm run probar:teclado`.

> No confundir con `08-movimiento.md`: ese documento es el sistema de movimiento;
> este es el cierre de la primera entrega.

## Lo que se probó

**Recorrido del dueño (Esencias Michel)**

| # | Paso | Resultado |
|---|---|---|
| 1 | Crear producto con foto, verlo, editarlo, ocultarlo y mostrarlo | ✅ (avisa con tono de marca si falta nombre o precio; "Oculto" y filtro Ocultos) |
| 2 | Pedido manual: cliente existente y cliente nuevo, productos desde el buscador, con y sin código | ✅ (los totales incluyen la promo de colección vigente y luego el código: 1,800 → 1,530 → 1,377) |
| 3 | Confirmar, despachar, stock y "Agotado" | ✅ (stock 1 → 0, aviso "se agotó", filtro Agotados, "Ojo con el stock" del Inicio) |
| 4 | Cliente con historial y "Repite" | ✅ (con 2 o más pedidos no cancelados) |
| 5 | Una promo de cada tipo, pestañas por fechas, compartir (imagen, PDF, texto) y terminar | ✅ (PNG 1080×1350 < 400 KB, PDF con el cupón, `Enviar` con imagen + texto) |
| 6 | Resumen: simular pedido, periodo, mes anterior, barra, cancelado | ✅ (todas las cifras cambian; un cancelado no cuenta) |
| 7 | Mi marca y el cupón compartido | ✅ (color y tipografía nuevos en el cupón; Luna se ve distinta) |
| 8 | Créditos: retocar descuenta, sin saldo se bloquea | ✅ (35 → 30; con 3 créditos: "Te faltan 2 créditos (tienes 3). Se recargan el día 1." y el interruptor avisa) |
| 9 | Reiniciar datos de prueba | ✅ (vuelve al inicio: 10 productos, 4 promos, 35 créditos, marca Elegante) |

**Aislamiento entre tiendas** (creando cosas en Michel y cambiando a Luna, sin recargar):
productos, pedidos, clientes, promos, marca, créditos, Resumen, contador de la barra
y de las pastillas, mensaje y enlace del cupón compartido — nada se mezcla.

**Estados y bordes**
- Estados vacíos con ilustración y tono de marca en Catálogo, Pedidos ×3, Clientes, Promos ×3 y Resumen ×4 (Hoy, 7 días, Mes, Año); buscadores y selectores sin resultados también. Ningún "undefined".
- Cero NaN, Infinity, "undefined" o fechas inválidas visibles en todas las pantallas.
- Nombres de 60–90 caracteres (producto, cliente, promo, colección) no rompen tarjetas ni pastillas (se recortan con "…").
- Sin scroll horizontal a 360 px en ninguna pantalla; sin errores en consola ni avisos de hidratación.
- Recargar cada pantalla conserva los datos.

**Accesibilidad y rendimiento**
- Barrido con axe-core (WCAG 2 A/AA + buenas prácticas) sobre todas las pantallas y las hojas abiertas durante el recorrido.
- Objetivos táctiles ≥ 44 px medidos en todo el recorrido (los interruptores de 54×32 tienen zona táctil ampliada a 44 px; los 7 días del gráfico ocupan toda la altura de su columna).
- Teclado en iPhone (`npm run probar:teclado`): 23 campos, incluidos los nuevos de este repaso (código de promo del pedido, colección nueva, nota de un cliente y buscador de producto de una promo). Todos conservan el foco.
- Lighthouse móvil (versión de producción local, simulación de red lenta):

| Pantalla | Rendimiento | Accesibilidad | Buenas prácticas | SEO | CLS |
|---|---|---|---|---|---|
| Inicio | 62 → **89** | 96 | 96 → **100** | 100 | 0.90 → **0.01** |
| Catálogo | 79 → **85** | 100 | 96 → **100** | 100 | 0.08 |
| Pedidos | 89 | 100 | 100 | 100 | 0.01 |
| Clientes | 89 | 100 | 100 | 100 | 0.00 |
| Promos | 89 | 100 | 100 | 100 | 0.00 |

## Lo que se corrigió

- **Objetivos táctiles < 44 px** (en total unos 20): botón de tienda y de créditos del encabezado, chips de colección y de porcentaje, interruptores (zona táctil), "No llevo la cuenta de este", "Editar mensaje", enlaces "imagen · PDF", "Quitar logo", "Quitar la fecha de fin", "Ver mes →" y ✕ del filtro del Resumen, "Actualizar" del aviso de versión, +/− de cantidades del pedido, selector de color, "Antes / Después", "Cambiar foto", barras de 7 días (más anchas).
- **Contraste**: texto Bosque sobre Mandarina en la tarjeta de pedidos nuevos (4.1 → 5.4:1; ahora usa el Bosque oscuro de la marca), texto inactivo de la barra de navegación (`--color-tenue`, 4.45 → 4.9:1), etiquetas de productos ocultos (ya no se atenúa toda la tarjeta, solo la foto) y etiquetas del gráfico del Resumen (al elegir una barra se atenúan las barras, no sus etiquetas).
- **Orden de encabezados** en el detalle de cliente y en el menú de la tienda.
- **Saltos de diseño (CLS) en Inicio**: 0.90 → 0.01. Se reserva el espacio del saludo, de la tarjeta de pedidos nuevos y de las tarjetas mientras llegan los datos.
- **Favicon**: `/favicon.ico` daba 404 (ahora existe). Las primeras fotos del Catálogo cargan con prioridad.
- **Datos de prueba**: la historia de ~14 meses tenía casi todos los clientes con 8–18 pedidos (18 de 20 "Repite"); ahora hay ~110 clientes en Michel y ~50 en Luna, con clientes fieles y muchos de una sola compra.
- **Docs**: `03` (los pedidos manuales nacen en `por_despachar`; stock nunca negativo), `06` y `HANDOFF.md`.

## Decisiones tomadas después del repaso

1. **Notas a mano en Mandarina**: ahora usan `--color-mandarina-texto` (`#C24E18`; 4.56:1 sobre Papel Cálido y 4.78:1 sobre blanco; el `#C4501A` propuesto daba 4.44:1 sobre crema, por eso se oscureció un punto). El Mandarina `#FF834F` queda para botones, círculos, sellos y fondos. La nota "lo nuevo" de la pantalla de novedades, que va sobre verde, no cambia.
2. **Nombres accesibles** alineados con el texto visible (WCAG 2.5.3): el botón de la tienda, la barra de navegación ("Pedidos, 2 nuevos") y las tarjetas de producto ("Kiara Pink,RD$935,RD$1,100,1 en stock,−15%,…. Editar"); las filas de Pedidos y Clientes y las tarjetas de Promos ya no repiten una etiqueta distinta de su texto. El contador de la barra ya no es texto del DOM (se pinta con CSS) para que el nombre visible siga siendo "Pedidos". La regla experimental de axe (`label-content-name-mismatch`) ya no encuentra discordancias.
3. **Pedidos manuales** siguen entrando a "Por despachar" (razón documentada en `04-pantallas.md`).
4. **Despachados y otras listas largas** por tramos de 30 con "Ver más antiguos" / "Ver más clientes" (Pedidos ×3, Clientes, Promos ×3). El contador de las pastillas muestra el total.
5. **"Hecho con Deslizapp"** en la imagen del cupón se queda, controlado por `MOSTRAR_MARCA_DESLIZAPP_EN_CUPON` (`lib/config.ts`).
6. **Retoque de fotos**: sin cambios de lógica; `RETOQUE_REAL = false` (`lib/config.ts`) muestra la etiqueta "Demo" junto al interruptor.

## Pendiente (no bloquea la primera entrega)

- **El seed pesa ~900 KB dentro del código que descarga la app** (Rendimiento 85–89, LCP ~3.6 s con red lenta simulada). Se resuelve solo al conectar Supabase; hasta entonces se podría cargar bajo demanda.
- **Nombres muy largos de cliente** en el detalle: se acomodan en varias líneas y la etiqueta "Repite" queda al lado; se ve bien pero podría ir debajo.
- WhatsApp en iPhone puede descartar el texto al compartir imagen + texto: no se puede verificar fuera de un iPhone real (ya se copia el mensaje y se avisa).
- La foto retocada, el catálogo público y el compartir con enlaces reales dependen de las fases siguientes (`HANDOFF.md`).
- Retoque de fotos: decidir el proveedor y el costo real por foto antes de cobrar 5 créditos.

## Checklist para probar en el celular

Cierra la PWA por completo y ábrela de nuevo. Toca el nombre de la tienda → **Reiniciar datos de prueba** (dos toques).

1. **Inicio**: saludo, tarjeta naranja de pedidos nuevos, ventas de 7 días con variación y barras. Toca una barra (filtra), ✕ para quitar; prueba Hoy, Mes (‹ ›) y Año.
2. **Catálogo**: sube un producto con foto del celular, edítalo, oculta y muestra. Comprueba los interruptores y los chips con el pulgar (deben acertar fácil).
3. **Pedidos**: "+ Pedido" con un cliente nuevo y otro existente; prueba el código AAAH10. Despacha uno y mira que baje el stock y salga "Agotado".
4. **Clientes**: el cliente del pedido aparece con su historial; con 2 pedidos sale "Repite". Escribe una nota.
5. **Promos**: crea una de código, una de colección y una de producto; compártela (**Enviar** hacia WhatsApp: ¿llegan la imagen y el texto? si no, el mensaje queda copiado), guarda la imagen y el PDF, y termina otra.
6. **Mi marca**: cambia color y letra; el cupón compartido debe cambiar. Cambia a Luna Bisutería: otra marca, otros datos, otro contador.
7. **Créditos**: retoca una foto (baja 5 créditos). Con pocos créditos, el interruptor avisa y "Ver plan" abre Tu plan.
8. **Teclado**: en cada campo (buscadores, precio, nota, mensaje del cupón) escribe sin que el teclado se cierre ni la hoja salte.
9. **Barra de estado y hojas**: sin franja ni recuadro arriba; las hojas se cierran deslizando hacia abajo.
10. Recarga la app en cada pestaña: los datos siguen ahí. Vuelve a **Reiniciar datos de prueba** y confirma que todo queda como al inicio.
