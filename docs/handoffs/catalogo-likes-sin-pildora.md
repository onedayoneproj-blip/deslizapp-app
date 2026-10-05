# Coding: cifra de likes sin pastilla

Rama: `fix/catalogo-likes-sin-pildora`, desde main `8dded0d78279ecb522e007c7c5ce04e267d9d384` (PR #47 fusionado). PR #45 no incorporado.

## Cambio

Solo cambia la presentación del número en las tarjetas del panel: sin fondo, borde ni caja, debajo del mismo corazón y dentro de la foto. Se conservan dimensiones y márgenes; Papel Cálido con sombra de texto Verde Bosque da contraste en fotos claras/oscuras. Cero y números largos siguen visibles; los largos pueden ocupar dos líneas para evitar recortes. Se mantiene el nombre accesible con la cantidad. No cambia el feed, bolsa, cálculos, espera, stock, visibilidad, datos ni Supabase. Novedades 0.35.1.

## Validaciones ejecutadas

- `npx next typegen && npx tsc --noEmit`: pasó.
- `npm run lint`: pasó, 0 errores y 27 avisos existentes de `no-img-element`. ESLint del script modificado también pasó.
- `npm test`: 33 archivos pasaron; ejecución sin aislamiento: 219 pruebas pasaron.
- `npm run build`: pasó.
- `scripts/probar-catalogo-pulido.mjs`, Chromium contra build de producción local: 360/390/430 px, claro/oscuro; oscuro con movimiento reducido. Fixtures demo separados, Supabase bloqueado. Likes 0, 1, 2, 8, 12 y 1234567890; fotografías blancas/negras y fotos demo. Comprueba ausencia de fondo/borde/box-shadow en cifra, sombra de texto, contraste entre Papel y Bosque >= 4.5, centrado, límites de foto y ausencia de recortes. Compara geometría del círculo con el estilo anterior: idéntica. Sin overflow horizontal ni errores de página.
- Apertura de vista previa desde tarjeta, cierre con Escape, aviso de cambios pendientes, descarte, foco de nombre en editor y cancelación: pasaron en los seis contextos. El mismo script verifica que ocultar/mostrar conserva stock provisional e historiales y separa tiendas. Estas operaciones fueron solo demo.
- Capturas reales: `docs/capturas/likes-sin-pildora/`.

## Límites y publicación

No se verificó Safari/iPhone físico, VoiceOver ni una tienda real autenticada. No se ejecutaron otra vez los scripts generales completos de hojas/teclado: no cambian sus componentes ni formularios; sí se probaron los recorridos específicos anteriores. Ninguna escritura en Supabase ni migración.

Lewis autorizó abrir PR y squash merge si pasan las validaciones. El resultado de merge, commit final, despliegue READY y `/api/version` se registra en el PR y en la entrega; no confundir build local con despliegue publicado.

## Para Lewis en Safari

1. Abre producción, recarga y entra a Catálogo.
2. Mira la esquina inferior derecha de la foto: mismo corazón Mandarina en círculo; cifra debajo sin pastilla, dentro de la foto. Revisa cero y fotos claras/oscuras; cifras largas no deben recortarse.
3. Toca la tarjeta: abre la vista previa habitual. Ciérrala y confirma que vuelve al Catálogo.
