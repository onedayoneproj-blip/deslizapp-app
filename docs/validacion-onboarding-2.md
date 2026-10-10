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
