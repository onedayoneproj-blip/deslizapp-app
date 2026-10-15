# Relevo de Coding: demo pública aislada

Base: `main` actualizado en `27505049cebb58b679c82c048ac8699bfedaa13c`. Rama: `feat/demo-publica-aislada`. Encargo: [demo-publica-deslizapp-aislada](../prompts/demo-publica-deslizapp-aislada.md). PR abierto, sin merge, para validación de Lewis.

Implementación y fuentes: [demo pública e interno](../demo-publica-aislada.md). Novedades 0.78.0. No se incorporan los PR históricos excluidos. Sin migraciones ni escrituras en tiendas, Auth o Storage. Se leyeron el catálogo y sus imágenes públicos, y solo el ID/proveedor de la cuenta autorizada desde Auth.

Las evidencias finales, checks, revisión de Codex, HEAD, URL exacta y alias se completan en el PR al finalizar las comprobaciones. No hay prueba de Safari/PWA de iPhone físico ni de OAuth real. La identidad interna se configura solo para esta preview; producción queda pendiente del eventual merge autorizado.

Qué probar en tu iPhone (en navegador para abrir la preview; después también en la PWA si la instalas):

1. Entrar en la preview y tocar «Probar la app con datos de prueba». Ver Deslizapp · ejemplo, sus fotos y «Datos de prueba».
2. Crear un producto y editarlo. Abrir su catálogo/perfil: sigue diciendo ejemplo y no termina en la tienda comercial.
3. Preparar un pedido desde el catálogo. Registrarlo en la copia, confirmarlo y despacharlo: no abre WhatsApp.
4. Ver el resumen y reiniciar desde el menú: vuelven los nueve productos y la actividad de ejemplo.
5. Sin Google, abrir `/admin-demo` y `/prueba`: quedan cerrados. Con la cuenta Google autorizada, entrar por `/demo-interna` y comprobar sus fixtures; salir conserva Google.

Sin herramienta de mensajes entre sesiones, este documento sirve como relevo a Planning. No declara una sesión externa iniciada ni una validación de Lewis.

## Evidencia automatizada del 15 oct

PR [#134](https://github.com/onedayoneproj-blip/deslizapp-app/pull/134). `npm test`: **632/632**, cero saltos. Tipos y build de producción aprobados. Lint completo sin errores (40 advertencias); revisión de los archivos posteriores también sin errores. La suite `probar-inicio` pasa después de esperar el efecto real de theme-color, en lugar de medir antes de la hidratación en el equipo cargado; no cambia el diseño.

`probar-demo-publica`: recorridos completos en **360/393/430**, cero llamadas a Supabase/WhatsApp ni al compartir nativo, y ocho entradas internas cerradas con cookie falsificada más API 403. Incluye crear y editar producto, catálogo/perfil con recarga, pedido DEMO sin query, cliente, registro, confirmación, despacho, persistencia, resumen y reinicio. [Resultados](../capturas/demo-publica-aislada/resultados.json) y [captura de 393 px](../capturas/demo-publica-aislada/catalogo-393.png). Las imágenes de producto, comprador, pedido y resumen están en la misma carpeta.

La comprobación de Auth autorizada y otra cuenta es un fixture de transporte del servidor: no se inició una sesión Google real. Las suites internas se ejecutan en copia temporal con ese mismo criterio. El estado final de CI, Codex, regresiones, SHA y despliegue figura en el PR, evitando enlaces inventados o un HEAD autorreferente en este documento.

## Correcciones de la revisión de Codex

Los tres hallazgos sobre `a325494` se atendieron: la limpieza de la cookie interna es de mejor esfuerzo y no bloquea entrar/salir de la demo sin red; promociones, catálogo comprador e invitaciones del admin simulan compartir; el envío local de una jugada cierra su hoja y confirma directamente, sin esperar regresar de WhatsApp. Las descargas demo evitan también el compartir nativo de PWA, manteniendo la descarga local y el comportamiento real por defecto.

Se añadió `tests/demo-sesion-sin-red.test.mjs` y la suite `probar-salidas-demo.mjs` para esos caminos, incluida una PWA de iPhone simulada. Su página de fixture solo se crea en la copia temporal; la función de jugadas se habilita únicamente allí para probar el registro local. La función sigue apagada en el producto. El PR registra la repetición de checks, revisión y URLs del HEAD corregido.
