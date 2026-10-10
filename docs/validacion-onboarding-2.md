# Validación · Onboarding 2

Base main cd804c8a617725d3f0c50a200402d254f61a674c; rama feat/onboarding-checklist-codex. Sin SQL nuevo ni datos reales modificados.

## Qué se comprueba

- Cálculo de cada paso, visibles con foto, ocultos/retirados/video/otra tienda, instalación, miembros/invitaciones, permisos y cierre.
- Demo: persistencia/idempotencia/aislamiento. Transporte RPC simulado: argumentos, error sin invalidación/falsa finalización y éxito. Nuevos métodos bloqueados en soloMirar; marcar solo dueña.
- Chromium 360/390: 0/3/7, publicación vacía y vista previa, instalación/equipo/perfil, errores de perfil y borrador, recarga, cierre, colaboradora, movimiento reducido y overflow. Fixtures locales separados, cero tráfico Supabase en Demo.
- Historias/capítulos existentes con `scripts/probar-onboarding.mjs`, sin alterar sus capturas publicadas: salida en /tmp.

## Antecedentes y entorno

Clone y puertos inicialmente bloqueados en sandbox. Se completó el checkout aislado por API y después por clone temporal autorizado; no se tocaron checkouts ajenos. Turbopack rechazó el enlace local de node_modules; se usó Webpack, sin modificar dependencias o configuración de app. Primer build carecía de iconos y algunas pruebas carecían de assets; se completaron desde main antes de repetir. El test de conversión Tienda esperaba el objeto sin onboarding y se actualizó para el contrato ampliado. Una comprobación de permisos inicialmente usó `assert.throws` para una operación asíncrona; se corrigió a `assert.rejects`.

## Límites

No Safari/iPhone físico ni acciones autenticadas con tienda real, logo en Storage real, instalación nativa o retorno del teléfono. No se cambió Supabase/Auth. No se afirma validar OAuth real ni la tienda Soft Era.

## Resultados confirmados de la ronda

- TypeScript: `npm run tipos`, aprobado tras las correcciones.
- Lint: cero errores, 32 advertencias; main base también 32, ninguna añadida.
- Suite: 76/76 archivos de tests; 7 casos de cálculo y 3 de datos nuevos comprobados también individualmente.
- Build Webpack: aprobado con todos los assets de main; se verifica de nuevo al cerrar la ronda.
- Onboarding 1: script existente completo aprobado a 360/390 y movimiento reducido, salida /tmp.
- Checklist: primera vuelta 34 casos aprobados; después 36 incorporando protección de borrador. La ampliación del perfil descubrió el mensaje genérico y lo corrigió a DatosInvalidos. Una aserción temprana del contador se corrigió para esperar el rerender confirmado. Los resultados finales se registran en el PR.

Cierre de la ronda: **40/40 comprobaciones Chromium** del checklist aprobadas; **76/76 archivos** de tests; **build Webpack aprobado** tras completar assets, sin los errores ambientales iniciales. Typecheck aprobado. Lint **0 errores / 32 advertencias**, las mismas 32 de main base. No se ejecutaron suites generales ajenas a las superficies modificadas.

## Continuación · capítulos compactos (10 oct 2026)

Se retomó el PR #96 **abierto**, desde HEAD remoto `11532b43a456af35f8caf79e65edb70ecf4290fe`; no se repitió la implementación de datos ni se modificó Supabase. Comentario de revisión `discussion_r4236437210`: el reintento automático usa ahora `checklist_cerrado_en`, incluso tras marcar equipo o instalación. Se prueba con transporte demo que falla expresamente al cerrar.

Cálculo por capítulo: 3/2/2 tareas; vacío, parcial fuera de orden y completo comprobados con unitarias. Condiciones reales de los siete pasos y permisos originales conservados. Selección manual por modo/tienda en el proveedor de UI; no nueva persistencia de aplazamiento.

**Navegador:** 94 comprobaciones Chromium a 360/390/430: selección de pendientes y completos, teclado/foco/Home/End, toque ≥44 px, regreso de logo/colores/producto/publicación, perfil con error y borrador protegido, publicar vacío sin mínimo, vista previa, instalación/equipo, continuar por toque, no navegación al completar, cierre explícito/cancelación/recarga, colaboradora/cerrada, reducido, texto sin recorte y sin overflow. Capturas en `docs/capturas/onboarding-2/capitulos/`.

**Entrada normal:** navegador limpio, sin addInitScript ni fixtures: Ver demo → Inicio → guía de Esencias Michel **demo** (4/7 en el seed). No es la tienda real. No se borró ni reabrió una guía cerrada. En una Demo ya usada y cerrada se conserva el cierre; para probar la entrada inicial se puede usar navegación privada.

**Antecedentes de esta ronda:** el sandbox no alcanzaba el proxy; clone/npm/build/browser se ejecutaron con escalación autorizada. Primer lint tuvo una advertencia local por una constante de tarjetas ya retirada. El build local sin ID fijo compiló IDs distintos en cliente/API y mostró un falso aviso de versión, que tapaba Saltar; el build final usa un ID constante de validación. La hoja de producto conserva su retorno estándar a Catálogo; el script vuelve después a Inicio. El primer fixture de errores omitía nombre/email del miembro; se completó. Un error de prueba esperaba el texto interno del fallo en vez del mensaje público de la app; se corrigió la aserción. Se conservan estos antecedentes, no se presentan como errores de producto.

Límites: Safari/iPhone físico, instalación nativa y Storage/OAuth reales siguen pendientes. Ver como y permisos se comprueban por los contratos unitarios/transportes simulados; no se abrió una sesión real de Ver como. No se probaron ni alteraron los onboarding reales de Michel, María, Soft Era ni otras tiendas.

Fixture ampliado: **11/11** comprobaciones de fallo, reintento de cierre tras equipo, celebración, 7/7 con hoja abierta/borrador/foco, recuperación de lectura y selección independiente al cambiar tienda. La ruta temporal y sus tipos generados se eliminan al terminar. Primer typecheck final encontró referencias generadas de la ruta eliminada; se limpió la caché de desarrollo y se añadió limpieza explícita al script. Sin cambios de producto por este error ambiental.

**Cierre de validación local:** typecheck aprobado; suite general 76/76 archivos (incluye cálculo por capítulo); lint general 0 errores/33 avisos antes de retirar la constante de tarjetas, y lint final de todos los archivos afectados **0 errores/0 avisos** (los otros 32 son antecedentes del repo). Build Webpack final aprobado con ID constante. Script de bienvenida completo a 360/390 y movimiento reducido: «Listo: todo pasó». Smoke del build final: entrada normal Demo, selección, foco al Continuar, cero errores JS y sin falso aviso de versión. `revisar-estilos` ejecutado: informativo, 54 archivos/414 ocurrencias previas; guía nueva con tokens existentes. No se repitió la suite general después de aprobarla.

Capturas de los pasos de creación actualizados incluidas en `capitulos/00-creacion-*`; las capturas previas de onboarding-1 permanecen intactas. El script `npm run probar:onboarding-fallos` crea exclusivamente una ruta local temporal y la elimina junto con sus tipos generados al finalizar.

## Ronda correctiva de integración documental

Después del push de `b66ebb4`, main avanzó a `ca0b614` (reorganización de documentación, sin cambios de app). El PR entró en conflicto y no inició Revisión. Se integra main mediante merge en la misma rama, sin force ni sobrescribir trabajo remoto: HANDOFF/contexto conservan la estructura nueva, docs/17 combina decisión y especificación, el relevo registra la implementación y la revisión de Lewis pendiente. Un push en esta ronda correctiva; el primer push pertenece a la ronda de implementación. No se repiten suites de app porque el código y los assets son idénticos a `b66ebb4`. La preview de ese commit quedó READY; la del merge se verificará en el PR y en el handoff de esta conversación.

La preview está protegida por Vercel Authentication: el fetch conectado autorizado de `/api/version` confirmó HTTP 200 y el despliegue `dpl_HymBzThr2kcYKsTxDMTV4khcLWb5` para la primera ronda. El navegador remoto sin autenticación no verificó Demo; la entrada normal comprobada y capturada es sobre el build local. No se desactivó protección ni se configuró Auth.

## Continuación vigente · minimizar y estados discretos (10 oct 2026)

Base remota comprobada: PR abierto `0779aff`; integración de main `f7e05fa` y avance documental `ece4c79`, misma rama. Las pruebas de ocultación permanente/proporción anteriores son antecedentes sustituidos, no reglas vigentes.

- Tipos aprobados (`next typegen && tsc --noEmit`). Suite general: **77/77 archivos**, sin fallos; incluye preferencia local, aislamiento por usuario/modo/tienda, almacenamiento bloqueado/corrupto y capítulos vacíos/parciales fuera de orden/completos. No se repite suite general tras aprobarla.
- Lint general: **0 errores / 32 advertencias previas**. Lint de archivos afectados: 0 errores/avisos. Build Webpack final aprobado con ID fijo local. Revisar-estilos informativo: 54 archivos / 414 ocurrencias previas.
- Chromium: **125 comprobaciones** a 360/390/430. Minimizar/desplegar, foco conectado y toque ≥44 px; navegación/recarga y mismo capítulo, sin destello expandido; no marca cierre; fallback en memoria; controles/flechas/Home/End y estados accesibles; texto 200 % sin overflow (también píldora a 360/390/430 en captura adicional). Logo/colores/producto/publicación, perfil con error y protección de borrador, publicar vacío, vista previa, selección estable, capítulos completos consultables, colaboradora/cerrada/7 pasos y reducido conservados.
- Fixture de fallos: **15 comprobaciones**. 7/7 con hoja espera; borrador/foco estable; fallo de lectura y recuperación; cambio de tienda con selección independiente; cierre minimizado falla, sigue con píldora y reintenta la clave correcta, celebración tras éxito. Ruta temporal eliminada junto con tipos generados.
- Entrada normal Demo limpia, sin fixtures ni addInitScript: **Ver demo → Inicio**, guía de Esencias Michel demo. No tiendas reales ni reapertura de guías previas. Capturas nuevas expandidas/minimizada/estados/200 % en `minimizar/`; las anteriores permanecen históricas. Capturas limpias adicionales usan fixtures y eliminan avisos superpuestos para revisar la presentación.

Antecedentes de ejecución: un primer typecheck detectó una referencia equivocada de identidad en Ver como; se corrigió a null antes de aprobar tipos. Primer script de teclado se interrumpió al abrir una promo mientras se reconstruía el build local; se repite con servidor reiniciado y build estable. Build/capturas se repitieron solo por cambios visuales/accesibles concretos. No se modifica código de promos por esa interrupción. La segunda pasada identificó un selector histórico que buscaba la nota de Cliente nuevo/Editar como input; se amplió para el textarea vigente, sin cambiar Clientes, y se repite la suite porque todavía no estaba aprobada. Lectura remota protegida y checks/preview actuales se documentan en la entrega del PR.

Límites: Safari/VoiceOver físico e instalación nativa pendientes. Publicación/errores/cambio de tienda son Demo/fixtures; aislamiento entre usuarios/modos probado con unitarias, no cuentas reales. OAuth/Storage reales y Ver como real no se ejercitan. No modificación de Supabase ni datos de tiendas.

**Cierre local de esta continuación:** script completo `npm run probar:teclado` aprobado, incluido perfil después de minimizar/restaurar: mismo nodo, foco continuo, hoja quieta y ninguna transición de vista. Se conservan los intentos anteriores como antecedentes. Lewis añadió la referencia de Pedido #1008 antes de push: indicador con raya arriba y nombre debajo, tokens de Pedidos (borde-pastilla/atencion-texto/accion). Se recompila y vuelve a verificar el script visual por este cambio; no se repiten suites generales ya aprobadas. La captura ampliada detectó whitespace-nowrap heredado de Boton en la píldora: se permite envolver el texto izquierdo, el contador sigue compacto y la comprobación usa el ancho configurado, evitando falsos positivos del viewport móvil expandido. Capturas ampliadas finales actualizadas.

Lewis pidió también quitar el recuadro del capítulo seleccionado antes de push. Se sustituye por subrayado del nombre; el contorno solo aparece con foco de teclado. Verificación visual/teclado localizada y capturas finales nuevas, sin repetir la suite general o el script completo de teclado ya aprobados por un cambio únicamente decorativo.

Último feedback de Lewis: retirar también los símbolos de completado/pendiente junto a Capítulo X. Solo raya uniforme y nombre, con subrayado del activo; aria-label mantiene estado/avance y las filas consultables conservan sus estados. Esta instrucción sustituye la marca simbólica del prompt.

**Última presentación comprobada:** 21 verificaciones localizadas a 360/390/430 después de ambos feedbacks: sin recuadro ni símbolos, controles ≥44 px, nombres breves, selección/foco por teclado y subrayado, recuperación del capítulo al plegar, texto y píldora al 200 % sin overflow respecto al ancho real configurado. Capturas finales de estados discretos y Demo normal actualizadas. Build final y tipos/lint aprobados; no cambios de lógica desde las suites de 77/125/15 y teclado ya aprobadas.


## Ronda posterior · cabecera solo del capítulo activo

Feedback adicional de Lewis: «Deja tu tienda lista» únicamente minimizada. Cabecera superior expandida = «Capítulo X · nombre», sin duplicado inferior. Otros nombres no se muestran hasta tocar su raya; navegación directa y teclado conservados.

- Typecheck y build Webpack aprobados. Lint general: cero errores, 32 avisos anteriores. Tests: 77/77 archivos.
- Script de checklist: 134 comprobaciones aprobadas a 360/390/430, incluidas cabecera H2 única, ausencia del título general expandida y cambio de nombre por toque. Publicar sin mínimo, retorno de hojas, selección, minimización, recarga, foco y texto ampliado conservados.
- Fallos: 15 comprobaciones aprobadas; fixture temporal eliminado. Script completo de teclado aprobado, incluido perfil tras minimizar/desplegar.
- Demo normal sin inyección: entrada Ver demo → Inicio y 12 comprobaciones localizadas de cabecera/píldora al 200 %, con capturas. El contenido de la guía no desborda a las tres anchuras.
- Límite observado en Demo normal al 200 %: ancho global de 362 px con viewport de 360, tanto expandida como minimizada; las cajas fijas de navegación/toasts llegan a 362. A 390 y 430 el ancho global coincide con viewport. Se conserva como límite de la página, sin atribuir un aprobado global a ese caso ni modificar la navegación común en este ajuste de cabecera. Las pruebas con fixture no muestran ese exceso.

Capturas actuales: `docs/capturas/onboarding-2/cabecera/` (22 imágenes). Antecedentes anteriores conservados. Safari/VoiceOver e instalación física siguen pendientes; no se probaron cuentas, Storage/OAuth ni Ver como reales. No cambios en Supabase ni guías de tiendas reales. HEAD, Revisión y preview READY exacta de esta ronda: PR y handoff en el chat.
