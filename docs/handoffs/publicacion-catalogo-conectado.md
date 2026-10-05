# Publicación del catálogo conectado

Planning ejecutó la publicación autorizada por Lewis el 5 de octubre de 2026 (hora de Santo Domingo).

## Publicado

- PR #44: squash `9d57f39a1c152f60ced3cfe494c83dfa4c2c74dd`.
- PR #46: squash `131d82dbd50b884ddbbb497434a0f1b974ac1d1f`.
- Se conservó exactamente el árbol de código validado de #46, `8e217bcd0874dbeeb111a45eec4862aa01cd274d`. Al retargetear después del squash de #44 aparecieron conflictos de historial. Se verificó que el árbol del main fusionado y el de la base original #44 eran idénticos (`c4305f07bae42012e8cd28587ed9fa47e7cc9b0c`), y se creó una integración con ambos padres conservando el árbol #46. No se reescribió ni modificó código de la app.
- Vercel producción READY: `dpl_FcTMo4b7SSJnWxp9TSMxPfZ57SZA`, SHA `131d82d`. Dominio estable `deslizapp-app.vercel.app`.
- PR #45 y rama original de Claude no se fusionaron por separado. #46 conserva la implementación original de Claude.

## Enlace de Esencias Michel

Después de verificar READY y HTTP 200 del catálogo, se actualizó exclusivamente `tiendas.url_catalogo` para tienda `0753d2a7-469e-43a5-9fc7-51336720db83`:

- Anterior: https://deslizapp-app.vercel.app/catalogos/esencias-michel.html
- Actual: https://deslizapp-app.vercel.app/tienda/esencias-michel

UPDATE condicionado por tienda, slug y valor anterior; RETURNING y SELECT posteriores confirmaron el valor nuevo. Datos específicos de tienda fuera de migraciones. Se conserva el HTML anterior para enlaces históricos; la app abre/compartirá el enlace conectado guardado.

## Verificación y límites

Realizado por Planning: lectura de PR/head/estados, identidad de árboles, fusión secuencial, comprobación de Vercel READY y SHA/alias, HTTP 200 del catálogo con metadatos de la tienda, /api/version identificando el despliegue y lectura posterior del enlace.

Las migraciones `20261004184134`, `20261004223008` y `20261005013157` ya estaban aplicadas; se confirmó su presencia. No se reaplicaron ni modificaron esquema/historial, solicitudes, pedidos o existencias. Las pruebas de Coding (204 tests y recorridos) y la prueba real previa de Lewis constan en #46 y su handoff; Planning no las repitió ni las llama pruebas nuevas.

Pendiente: OAuth Google real al código específico en producción, Safari/iPhone de la última corrección, Contact Picker, compartir nativo y límites restantes del handoff. El callback añade `?volver=/pedido/CODIGO`; la lista de URLs permitidas de Auth no fue accesible con el conector de Planning, por lo que no se afirma haberla comprobado. No se alteró Site URL ni configuración de Auth.

## Comprobación manual

En el mismo Safari, abrir /tienda/esencias-michel y /pedidos del dominio de producción. Confirmar que la tarjeta del panel abre React. Desde una solicitud de prueba, abrir /pedido/CODIGO, entrar con Google si corresponde y comprobar que vuelve al mismo código con Registrar. Usar fixtures acordados para nuevas escrituras; las solicitudes existentes no se alteraron como parte de esta publicación.

## Recuperación

El enlace anterior queda registrado arriba. Si se revierte el frontend al panel previo al catálogo, coordinar también restaurar url_catalogo. No revertir migraciones ni borrar ventas para deshacer una publicación de frontend.
