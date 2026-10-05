# Pedido del catálogo en el panel — continuación de Coding

**Claude y Codex: leer este archivo antes de retomar.** Fecha: 5 de octubre de 2026. Puesto: Coding. PR [#46](https://github.com/onedayoneproj-blip/deslizapp-app/pull/46), en borrador, sin fusionar. Rama `feature/pedido-catalogo-panel-continuacion`, base `feature/catalogo-react` mientras #44 siga abierto. El trabajo de rendimiento de #45 permanece separado.

## Procedencia y convivencia

- Main revisado: `1d8bf5d081cdcc8fe497deac342cbece37572e7f`.
- Catálogo React #44: `a56553756e6c4e5ad2b25a52c2e67962dc73e8f6`, abierto/borrador.
- Trabajo inicial publicado de Claude: `4307a1416d0364b116a875361ecf7d7e1f44cac3`. Se conservan sus cuatro commits; no se reinició la implementación ni se empujó a su rama.
- Rendimiento #45: `ddd0057cd1047db679eb155e16c9a7a8be2b2927`, abierto/borrador. Se volvieron a consultar los tres heads y main al cierre: sin nuevos commits.
- Worktree propio `/workspace/deslizapp-pedido-panel`; integraciones temporales propias `/workspace/deslizapp-panel-integracion` (código funcional) y `/workspace/deslizapp-panel-integracion-final` (entrega completa). No se modificaron rama, archivos ni servidor de `/workspace/deslizapp-rendimiento`.
- El script local de 13 escenarios y las últimas correcciones/documentación locales de Claude no estaban accesibles. Se reconstruyó el script desde el código publicado y el prompt documental; **no** se afirma haber recuperado esos archivos ni su resultado 12/13.
- Publicación por conector GitHub porque `git push` devolvió HTTP 401. Se verificó que los árboles de cada commit publicado coinciden con los locales; las SHA cambian por los metadatos del conector. Commits publicados iniciales: `539106c` (local `6adc698`), `615085f` (local `fb35005`), `b75562b` (local `a1e4d28`). El head definitivo se consulta en el PR.

## Auditoría del prompt y correcciones

| Área | Estado publicado por Claude | Resultado de la continuación |
|---|---|---|
| Una ruta pública/privada, estado del comprador | Implementado | Conservado; error de lectura distinto de inexistente, reintento, índice de historia seguro al quitar líneas |
| Registrar, Quitar/Deshacer/Encargo, cliente provisional | Implementado | Validación de disponibilidad en demo/RPC; error no deja cliente/pedido parcial; conserva borradores internos |
| Selector compartido, teléfono completo/Contact Picker | Implementado | Prefijo numérico rellena WhatsApp; búsqueda sigue activa solo en su vista; confirmación al abandonar cliente nuevo |
| Capas, Atrás, Ver pedido | Bugs reportados, últimas soluciones sin evidencia publicada | Corregidos y probados: overlay debajo de Hoja, historial consumido en alSalir antes de navegar, cierres protegidos |
| Respaldo en Nuevos y descarte | Implementado | Navegación lista → Registrar → lista, vacío y descarte explícito verificados |
| Ya llegó / marcado del aviso | Implementado con producto anterior y temporizador | Relectura tras reponer y variante correcta; marca solo tras retorno de foco/visibilidad, reintento sin segundo WhatsApp |
| Manifest scope `/` | Ya implementado | Sin cambios; no promete apertura automática de PWA |
| Script local de 13 casos / docs locales | Sin evidencia accesible | Nuevo script reproducible y documentación en esta rama |

Registrar sigue creando un único pedido **Nuevo**; no confirma, despacha, reserva ni descuenta stock. Cliente nuevo/note se guardan atómicamente con el pedido. El nombre no une identidades; el teléfono completo normalizado sí identifica el existente. Quitar conserva foto/precio/condiciones de la solicitud y recalcula descuento/total según la RPC existente. Encargo es local a la línea/variante; no activa el producto globalmente. Los datos privados se obtienen con sesión y RLS, nunca con metadata editable. La tienda objetivo deriva de la solicitud accesible, aunque el perfil tenga otra tienda por defecto.

Si se pierde la respuesta de una escritura, «Comprobar registro» hace una lectura. No reenvía automáticamente. Si esa lectura confirma que sigue pendiente, hace falta un nuevo toque explícito para registrar; si encuentra el pedido, abre el existente. Los avisos no afirman que WhatsApp se envió o que la persona respondió. HTTPS inválido se omite del mensaje.

## Supabase

- Proyecto único accesible: **producción `euihaeyfdlpvmbtfzvnt`**. Otros entornos y bases locales de otras sesiones: desconocidos/inaccesibles.
- `20261004223008_pedido_catalogo_panel.sql` ya estaba aplicada. No se editó ni reaplicó.
- **Aplicada:** `20261005013157_registrar_solicitud_disponibilidad.sql`, después de validación en base desechable. Versión tomada del historial real de Supabase.
- Reemplaza solo el cuerpo de `registrar_solicitud`, misma firma/retorno/permisos. Mantiene bloqueo de solicitud, identidad y pertenencia; bloquea productos y luego variantes en orden estable, valida actividad/compatibilidad y stock agregado antes de crear filas. Encargo permite cero, sin reserva/descuento ni cambio global. Stock null conserva sin control. Compatible con las apps de #44/#45.
- Replay completo de **32 migraciones** en PostgreSQL 17.6 desechable; Auth/Storage con bootstrap mínimo para ejecutar los contratos, **no** un entorno hospedado completo de Supabase Auth.
- Pruebas SQL: RLS anónimo/otra tienda, disponibilidad, variantes, descuentos finales, cliente y nota, registro duplicado, encargo, stock null, producto/variante inactivos, despacho/deshacer. Dos sesiones SQL concurrentes reales: una espera el bloqueo, generan un solo pedido/cliente; carrera contra cambio de stock rechaza sin filas parciales. Fixtures propios; rollback y contenedor desechable.
- Verificación posterior de solo lectura: función, ACL, `search_path` vacío, guardas e historial presentes. `npm run revisar:migraciones -- lista.json`: **32 repo / 32 producción, cero diferencias de versión**. Aviso histórico intencional: `20260930005714_invitaciones.sql` frente al nombre aplicado `invitaciones_y_tienda_esencias_michel`; no se alteró historia ni se incorporaron datos de tienda a migraciones.
- Advisors no dan cero avisos: persisten funciones públicas/authenticated SECURITY DEFINER y avisos de invitaciones/Auth ya existentes. Esta función sigue restringida a authenticated/service_role y comprobación de pertenencia; no tiene permiso anon/PUBLIC. No se amplió ese contrato.
- **No se modificaron existencias, pedidos ni solicitudes reales de prueba. `4DCQ2PZ28F` quedó intacta.** La única escritura de producción fue la migración compatible autorizada. No se cambió `url_catalogo`, el HTML ni se desplegó la app a producción.

## Validación ejecutada

| Comprobación | Resultado real |
|---|---|
| TypeScript (`npx tsc --noEmit`) | Pasó; también pasó dentro del build |
| Lint | Pasó: 0 errores, 27 advertencias de imágenes existentes |
| `npm test` | Pasó: 25 archivos; corrida detallada con `--test-isolation=none`: **199/199 tests** |
| Build local final | Pasó Next.js 16.3.6; sin la ruta temporal de transporte |
| Matriz comprador/registro | **91/91 comprobados**: 13 casos × 360/390/430 claro/oscuro + 390 reducido. Primera corrida 84/91 por expectativa textual antigua; aislamiento repetido 7/7. JSON de ambos intentos y consolidado incluidos |
| Transporte simulado | **7/7**: sin sesión, otra tienda, respuesta perdida, red fallida/recuperada, lectura con reintento, fallo de marcado sin segundo WhatsApp, apertura bloqueada sin marcar |
| Catálogo original | **9/9**, incluidos solicitud, precio autoritativo, disponibilidad, PNG/PDF, foco y movimiento reducido |
| Producto original | **42/42** a 360/390/430 claro/oscuro; reposición y WhatsApp marcados solo al volver, variantes y despacho |
| Hojas general | Pasó completo; cinco cierres, hoja apilada, guardas, foco atrapado y cliente nuevo |
| Teclado general | Pasó completo con confirmación explícita de descarte; primer intento con límite de 180 s se interrumpió. Corrida final permitía 480 s y terminó con exit 0 |
| Inventario general | Pasó completo: propuesta, historial, guardado conjunto, motivos, descarte, stock cero/null, navegación y pedido |
| Replay SQL | Pasó cadena completa de 32, RLS, atomicidad, concurrencia real y carrera de stock en base desechable |
| Convivencia #45 | Build conjunto; catálogo **9/9** y comprador/registro **26/26** (390 normal/reducido, incluido aislamiento repetido) |
| Capturas | Reales en Chromium local; registrar/resuelto en 360/390/430 y principales vistas a 390; inspeccionadas visualmente. WebP sin retoque de UI, originales guardados |
| Recibos | PNG/PDF descargados en rama y mezcla; PDF rasterizado para comparar visualmente. Producto/total y estructura coherentes, variaciones legítimas de código/hora/puerto |


Los primeros intentos paralelos contra dev tuvieron timeouts; un reinicio del entorno interrumpió otras corridas. No se contaron como aprobadas. El build detectó y permitió corregir el relevo de historial entre «¿Eres la tienda?» y Registrar. Una ruta temporal de transporte dejó tipos dev obsoletos tras el reinicio: se retiró el archivo generado y se reconstruyó sin esa ruta. La prueba general de teclado se actualizó para **comprobar**, no saltarse, la confirmación nueva al abandonar el borrador; su primer límite de 180 s se excedió, luego se repitió completo.

La primera matriz de aislamiento esperaba el texto del aviso previo; el contenido privado estaba bloqueado. Se corrigió el localizador al texto real «Este pedido no es de tu tienda.» y se repitió el caso en todas las configuraciones, manteniendo las aserciones de ausencia de Registrar y de pedidos nuevos. Los JSON conservan ambos intentos para no ocultar ese resultado.

## Combinación temporal con #45

Primera mezcla del código funcional (`fb35005`) solo en el worktree temporal, sin conflictos Git. Revisión manual de archivos comunes confirmó: import SSR `publica-real`, delegación pública con SDK bajo demanda, descarga de recibo lazy, medios/imágenes responsivos de #45; estados, error público, guardas del índice, carga privada lazy y registro de esta rama. Ninguna optimización se duplicó en la continuación.

Build conjunto pasó; catálogo conjunto **9/9** (incluidos PNG/PDF); 13 escenarios a 390 px normal/reducido **26/26**, con 24 en la primera corrida y los dos casos de aislamiento repetidos tras corregir la expectativa textual.

También se combinó la entrega completa (`5002c7d`, equivalente a `00cfcb3`) con #45 en otro worktree temporal. Hubo tres conflictos **documentales**: HANDOFF, contexto y pantallas. Se leyeron ambas versiones y se conservaron ambos handoffs, el estado actualizado del panel y la sección de rendimiento; se retiraron las frases obsoletas «Prompt por escribir» / «No muestra estado». Código y novedades se unieron sin conflictos, conservando 0.33.0 y la mejora de carga de 0.32.0. Tras resolver: **build pasó, 206/206 tests, catálogo 9/9 y los 13 casos de comprador/registro/navegación 13/13 a 390 px**. Patch de integración resuelto conservado localmente, sin publicar. Se guardaron JSON y comparación visual de recibos. No se publicó ni fusionó la integración temporal. Esto prueba esos recorridos, **no** rendimiento Vercel/4G ni Safari físico.

## Límites, diferencias y decisiones

- Demo: solicitudes/carrito/avisos viven en el navegador. El WhatsApp demo existente no añade `?demo`; por tanto el enlace enviado no transporta una solicitud local a otro dispositivo. Para probarla, reabrir en el mismo contexto con `?demo`. No se presenta eso como registro real.
- Los códigos del tablero de seis caracteres son ejemplos: se conserva el contrato de diez. Nombres, cantidades, precios y tiempos vienen de datos, no del mockup. La relectura de Ya llegó tiene carga/error/reintento además del tablero; nunca simula reposición ni mensaje enviado.
- Recepciones PNG/PDF descargadas y revisadas visualmente en Chromium local y la combinación con #45: coinciden en estructura, producto y total. Códigos, fecha/hora, código de barras y puerto varían por los fixtures. No es una comparación pixel a pixel de todos los recibos contra el HTML ni prueba de impresión/compartir nativo; quedan pendientes recibos con múltiples variantes/condiciones reales después de editar el pedido.
- No verificados **por Coding**: Safari/iPhone físico, Google OAuth real entre Safari/PWA, Contact Picker Android, regreso físico de WhatsApp, compartir nativo y lectura privada autenticada en tienda Supabase real no verificados. La prueba de transporte intercepta Supabase; SQL prueba RLS separadamente en PostgreSQL.
- Rendimiento comparable en Vercel y 4G **no aprobado**; es tarea de #45. No se cambió protección de preview para evitar el login de Vercel.
- `probar-proximamente` no ejecutado en esta tarea; el contexto documenta fallo previo en main. No se presenta como validado.

## Preview, revisión y próximos pasos

PR #46 sigue abierto/borrador y apunta a `feature/catalogo-react`. Preview final y SHA exacta: ver descripción del PR (se verifica READY después del último commit). READY confirma build, no prueba de login/flujo visual remoto.

Antes de continuar Claude: comprobar heads, commits y migraciones; conservar esta rama, no repetir SQL ni registrar/descartar la solicitud reservada. Tras merge autorizado de #44, mover solo los commits de esta etapa y retargetear a main con pruebas; coordinar con #45 preservando ambas funcionalidades. No usar --force fuera de la rama propia.

## Comprobaciones manuales de Lewis (separadas de las automáticas)

1. **Demo, mismo Safari:** abre preview → Demo → Catálogo → enlace de catálogo React `/tienda/esencias-michel?demo`. Elige dos perfumes y pulsa pedir. WhatsApp muestra borrador; no hace falta enviarlo. Regresa al mismo Safari y abre `/pedido/CODIGO?demo`: Enviado, cantidad y recibo coherentes.
2. Toca «Entra para registrarlo» → «Ver como la tienda (demo)». Busca cliente; con nombre incompleto debe ofrecer crear, y con teléfono completo existente solo elegir. Escribe nombre/teléfono/nota; vuelve, cierra con X y prueba Atrás: pregunta si abandonar y «Seguir aquí» conserva el borrador y teclado.
3. Prueba Quitar/Deshacer y una opción agotada → Por encargo. Registra una vez: Confirmado para comprador, un solo pedido en Nuevos y stock igual. «Ver pedido» debe ir al detalle sin rebote de URL.
4. En ese **pedido demo**, confirma/despacha: comprador Va en camino. Solo despacho baja stock; Por encargo no lo baja. Descarga imagen/PDF y revisa productos y total. No uses un pedido real de ventas para esta prueba.
5. Sin registrar otra solicitud demo, abre Pedidos → Nuevos → Del catálogo por registrar; revisa listado y descarte con confirmación. Cancelar deja la solicitud disponible.
6. **Demo ropa:** usa Lino & Algodón, pide aviso de una variante agotada y repón esa misma variante. Ya llegó debe ofrecer Avisar; abre el borrador y vuelve: Avisado. No debe cambiar el aviso de otra variante. Revisa la plantilla sin enviar automáticamente.
7. **iPhone:** repite apertura desde WhatsApp a Safari, teclado, gesto de cierre, Atrás, movimiento reducido y descarga/compartir de recibo. Estos pasos físicos no están aprobados por Chromium.
8. **Tienda real:** entrar con Google en preview debe regresar al mismo enlace y otra cuenta no permitir registrar. Para escrituras usa una solicitud nueva de prueba acordada y productos destinados a pruebas; no `4DCQ2PZ28F`, existencias vendibles ni clientes reales sin acuerdo. El flujo hospedado necesita esta revisión manual; no lo describimos como probado.


## Reporte manual de Lewis — 5 oct 2026 (distinto de Coding)

Lewis reportó que Google funcionó después de permitir el callback de la preview; la solicitud apareció en el panel; el enlace del comprador reflejó los estados; al despachar, el producto quedó agotado. Es validación manual comunicada por Lewis, **no** una prueba ejecutada/repetida por Coding ni evidencia de cobertura completa en Safari/PWA, aislamiento, Contact Picker, fallos de red o recibos nativos. Coding no modificó callbacks, Supabase, pedidos ni existencias durante la corrección de likes.

## Corrección visual de likes en PR #46

Head revisado al comenzar: `6bb5c954d53eae3dd2d71110a811e012d89e0cab`, rama `feature/pedido-catalogo-panel-continuacion`; #46 abierto/borrador contra `feature/catalogo-react`. Main y #44/#45 permanecían en los SHA del informe anterior, sin nuevos commits.

La clase `.cnt` de la bolsa dibuja un corazón pequeño y se estaba usando también para likes. El reel ahora usa `.likes-count` y un span en el flujo del botón: corazón principal, número centrado debajo, «Lo quiero». El nombre accesible incluye el contador positivo mostrado. Cero permanece oculto; agotados conservan Avísame sin likes. `.cnt`, bolsa, cálculos, stock, Supabase, rendimiento y aaah no se modifican.

**Pruebas de Coding para esta corrección:** TypeScript y build local pasaron; lint 0 errores/27 advertencias existentes; npm test 199/199; catálogo original 9/9. Verificación específica Chromium/demo: 12 grupos (1, 12 y 1234 por ancho; cero/selección/aaah/bolsa/agotado por ancho) a 360/390/430. Número en posición estática sin background/insignia, orden vertical y centrado comprobados; botón al menos 44 × 44, etiqueta accesible con cantidad, cero oculto, selección reversible y contador de bolsa intacto. Contraste inspeccionado visualmente sobre foto clara: texto blanco con la sombra existente. No se certifica contraste de todas las fotos posibles ni VoiceOver físico.

El primer intento de la comprobación local intentó modificar fixtures con un evento artificial sin recargar, y falló por no refrescar ese dato; se repitió con recargas. Las primeras capturas tomaron otro reel; se repitieron con el producto de fixture visible. Solo las capturas finales corresponden a la validación indicada. Ver `../capturas/pedido-catalogo-panel/likes/README.md`. Sin cambios en Supabase/migraciones/stock/rendimiento. Preview del nuevo commit: ver PR #46.

Safari físico sigue pendiente para **esta corrección visual**. Pasos breves: abrir el preview actualizado y el catálogo; revisar un producto disponible con likes, tocar su corazón y comprobar el número separado del icono, aaah y contador de bolsa; tocar otra vez para quitarlo; revisar un producto sin likes y uno agotado (Avísame). VoiceOver debe anunciar la cantidad cuando se muestre. Usar demo para seleccionar sin tocar datos reales; los números de fixture 1/12/1234 solo se usan en pruebas locales y no se fijan en la app.


## Seguimiento Coding — frase del corazón, trabajo pendiente y OAuth específico

Base revisada: head #46 `3d7a86612fa8700232587d1152d9143b4ea5c1ec`, borrador abierto contra `feature/catalogo-react`. Se conservan todos los cambios anteriores; no se mezcla #45, no se fusiona ni se publica a producción. Rama `feature/pedido-catalogo-panel-continuacion`. SHA final y URL exacta de preview se publican en el PR; refrescar una preview antigua no carga este commit.

**Cambios/producto:** corazón con «1 lo quiere» / «N lo quieren» y cero «Lo quiero»; nombre accesible distingue añadir/quitar y contador; bolsa sigue contando unidades. `usePendientesPedidos` publica conjuntamente pedidos Nuevos y solicitudes vigentes por tienda para píldora y aviso inferior, sin alterar ninguna métrica de ventas/deuda/stock. Registrar conserva total; confirmar/descartar/vencer lo reduce. Reintento invalida lecturas comunes, no inventa cero; si falla conserva el par conocido y avisa. La lista por registrar comparte el vencimiento.

Google lleva el destino local validado en `volver` del callback además de cookie; cada pestaña conserva su código aunque otra cambie la cookie. `registrar=1` monta la vista privada, sin autorizar nada: Auth + consulta autenticada de solicitud con RLS comprueban acceso. Registrada ofrece pedido existente; vencida/descartada rechaza otro registro. Login normal conserva Inicio. El acceso «¿Eres la tienda?» también está disponible en el estado público vencido/descartado. El aviso de login fallido se lee una vez por código para no perderse en Strict Mode.

**Validaciones realmente ejecutadas:** TypeScript pasó; lint 0 errores/27 advertencias previas; npm test pasó (27 archivos) y corrida detallada 204/204; build local pasó, sin ruta temporal de fixtures. Chromium demo/build: tres anchos 360/390/430 con 1/2/1234/0, seleccionados, aaah/bolsa, agotados, objetivos ≥44, centrado y ausencia de overflow; 0 Nuevos+2 solicitudes →2; registrar segunda →1+1=2; confirmar →0+1=1; descartar →0. Otro tenant no participa. Vencimiento con reloj del navegador sin escritura. **24/24** casos afectados de registro/comprador/cierres/foco/teclado/aislamiento, tres anchos y 390 reducido. Hojas y teclado generales pasaron completos; catálogo original **9/9** en repetición. Capturas y JSON en `../capturas/pedido-catalogo-panel/seguimiento-46/README.md`.

Auth/RLS de navegador es **transporte simulado**, con dos solicitudes distintas y sin escrituras remotas: sin sesión → Google simulado → código elegido; sesión válida para ambos; otra cuenta/tienda; aviso de login fallido; registrada/vencida/descartada; lectura fallida y reintento; casos anteriores de respuesta incierta/avisos preservados. Segunda corrida **16/17**, más **1/1** repetición del nuevo fixture del contador. Handler real probado con transporte Auth local: preview/producción, cookies de otro código válido, error/cancelación, destinos externos rechazados y login normal. No se prueba un canje de Google real ni se afirma cobertura Safari por estas pruebas.

**Primeros fallos y límites:** fixture unitario de descarte corregido (retorna DB, no `.db`); lint rechazó Date.now en render (corregido con instante de lectura/estado). Suite específica inicial usó texto DOM del contador CSS inferior y dejó stock cero del fixture de agotado; se corrigieron ambas suposiciones. Primera matriz de desarrollo se interrumpió tras timeouts de hoja en dos casos; se repitieron los 24 afectados sobre build estable y pasaron. Hojas inicialmente sin binario predeterminado; pasó con Chromium del sistema. Catálogo inicial 8/9, timeout del sonido a 360; repetición 9/9. No se ocultan ni se marcan aprobados los intentos fallidos. Contraste inspeccionado sobre las fotos de fixture, no certificado para cualquier imagen.

**Supabase:** no migraciones, configuración Auth, Site URL, solicitudes, pedidos ni existencias modificadas. Solo lectura de políticas/función: producción confirma `solicitudes_pedido_de_mis_tiendas` SELECT authenticated y `mis_tiendas()` basada en `miembros.usuario_id = auth.uid()`, sin user_metadata. No se consultan filas de solicitudes reales ni `4DCQ2PZ28F`. La lista de Redirect URLs de Auth no está expuesta por las herramientas conectadas y no hay token de Management API disponible. Callback exacto y patrón necesario para sus parámetros figuran en el PR al verificar la nueva preview; no se cambia Site URL para ocultar un fallo de código. OAuth real/Safari/PWA/VoiceOver físicos pendientes de Lewis. El reporte manual anterior de Lewis sigue siendo independiente de Coding y corresponde al preview anterior.

**Safari para Lewis (comprobaciones pendientes):**
1. Abre la **nueva** preview del PR. Demo → catálogo React: Delilah o Yara rosa, si disponibles y sin likes, muestran «Lo quiero». Toca corazón: debe aparecer «1 lo quiere»; en otro con varios, «N lo quieren». Quitar conserva aaah/bolsa y cero sin contador. Un agotado conserva Avísame.
2. En el mismo Safari demo arma dos solicitudes distintas y abre Pedidos: Nuevos y el tab inferior cuentan ambas, además de sus pedidos Nuevos. La tarjeta desglosa las del catálogo. Registra una: total igual; confirma ese pedido: baja uno; descarta la otra: baja otro. No se necesita despachar.
3. Con **dos solicitudes nuevas de prueba acordadas en una tienda real**, abre el enlace de una en Safari sin sesión → ¿Eres la tienda? → Google. Debe regresar al mismo dominio/código y abrir directamente ESA hoja. No es necesario registrar ni modificar solicitudes reales de clientes. Repite con sesión válida y comprueba que otra cuenta recibe aviso.
4. Cancela Google o vuelve atrás: conserva código/aviso; prueba teclado, X/Escape/Atrás y VoiceOver. Una solicitud ya registrada ofrece su pedido, sin otro registro; vencida/descartada informa su estado. Estos pasos físicos no los sustituye Chromium.
