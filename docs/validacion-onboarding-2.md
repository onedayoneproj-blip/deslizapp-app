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
