# Ficha técnica y descripción corta (diseño en revisión, 8 oct 2026)

Lienzo de Claude Design: https://claude.ai/artifact/Wpsj134KTDLQk34zcLU9CU

Reemplaza los «Detalles» por campos en las tiendas nuevas: una **descripción corta** (caption) y una **ficha técnica como foto** que la tienda sube o pide a Deslizapp (con créditos, trabajo manual del equipo por ahora; la IA llega después). Los Detalles de Esencias Michel se conservan y se siguen mostrando.

## Decidido por Lewis
- **Comprador:** la ficha es un **círculo con ícono de ficha** al lado de «Ver presentaciones». **Si el producto no tiene presentaciones, es una píldora con ícono y «Ficha técnica»** (`1` y `2`). Sin ficha subida, el botón no sale.
- **Descripción corta:** el texto se corta y termina en **«…»** tocable (como en Instagram), **sin la palabra «más»**; va donde está la descripción, no junto a los botones. Aplica a **todos** los productos (hoy el catálogo usa «más»).
- **Visor:** la foto de la ficha a pantalla completa, con zoom (`3`).
- **Las fichas las hace la tienda** (8 oct, Lewis cambió de opinión): Deslizapp **no** las hace ni las cobra con créditos, y **no hay cola «Fichas» en el admin**.
- **Panel (hoja de producto):** «Descripción corta» (contador hasta 300) con la línea «Lo que escribas aquí también lo usa la búsqueda de tu catálogo.», y una tarjeta «Ficha técnica»: sin ficha («Si tienes la foto de las especificaciones, súbela.» y «Subir foto de la ficha») y subida (miniatura, «Cambiar», «Quitar») (`4`, `5`).
- **Búsqueda:** la imagen de la ficha no se puede buscar (no se indexa). Lo que sí se busca es el nombre, la descripción corta, el tipo, la colección y los valores de las presentaciones. Por eso la línea de ayuda bajo la descripción. Los Detalles de Esencias Michel se conservan y se siguen buscando. Leer el texto de la foto (para buscar por él) queda para cuando llegue la IA.

## Por decidir
- Cuánto crece el límite de la descripción (el dibujo dice 300) y qué campos del producto indexa la búsqueda desde que se dejan de pedir los Detalles (`lib/tienda/busqueda.ts`).

Se construye después de «Publicar mi catálogo» y del onboarding (lleva migración). Las cifras y los nombres del dibujo son de ejemplo; no copies su HTML.

## Construido (8 oct 2026) — en qué se aparta del dibujo
- La descripción se llama «Descripción» y llega a **600** caracteres (el dibujo decía «Descripción corta» y 300): es `detalles.descripcion`, que la base ya validaba a 600.
- «Quitar» pide una confirmación breve en la misma tarjeta («Sí, quitar» / «Mejor no»).
- La ficha se guarda con el producto (se ve «Se sube cuando guardes el producto» mientras tanto).
- El visor no es una hoja del catálogo: es una pantalla completa propia (`DialogoCatalogo`), así que sus gestos no son los de `PanelCatalogo`.
