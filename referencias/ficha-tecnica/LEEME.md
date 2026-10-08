# Ficha técnica y descripción corta (diseño en revisión, 8 oct 2026)

Lienzo de Claude Design: https://claude.ai/artifact/Wpsj134KTDLQk34zcLU9CU

Reemplaza los «Detalles» por campos en las tiendas nuevas: una **descripción corta** (caption) y una **ficha técnica como foto** que la tienda sube o pide a Deslizapp (con créditos, trabajo manual del equipo por ahora; la IA llega después). Los Detalles de Esencias Michel se conservan y se siguen mostrando.

## Decidido por Lewis
- **Comprador:** la ficha es un **círculo con ícono de ficha** al lado de «Ver presentaciones». **Si el producto no tiene presentaciones, es una píldora con ícono y «Ficha técnica»** (`1` y `2`). Sin ficha subida, el botón no sale.
- **Descripción corta:** el texto se corta y termina en **«…»** tocable (como en Instagram), **sin la palabra «más»**; va donde está la descripción, no junto a los botones. Aplica a **todos** los productos (hoy el catálogo usa «más»).
- **Visor:** la foto de la ficha a pantalla completa, con zoom (`3`).
- **Panel (hoja de producto):** «Descripción corta» (con contador) y una tarjeta «Ficha técnica»: sin ficha («Subir foto de la ficha» / «Que Deslizapp la haga · [N] créditos»), subida (miniatura, «Cambiar», «Quitar») y pedida («La estamos haciendo», «Cancelar el pedido») (`4`, `5`, `6`).
- **Admin:** Trabajo › **Fichas**, la cola de fichas pedidas, como la de fotos del retoque (`7`).

## Por decidir
- Cuántos créditos cuesta que Deslizapp haga la ficha (**[N]**) y quién las hace (se supone Lewis desde el admin).
- La búsqueda del catálogo (`lib/tienda/busqueda.ts`) se apoya hoy en los Detalles («para ella», notas, ocasiones): hay que resolverlo antes de dejar de pedirlos.

Se construye después de «Publicar mi catálogo» y del onboarding (lleva migración). Las cifras y los nombres del dibujo son de ejemplo; no copies su HTML.
