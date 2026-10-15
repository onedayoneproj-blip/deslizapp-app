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
