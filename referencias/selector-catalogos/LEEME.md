# Selector de catálogos (aprobado por Lewis el 7 oct 2026)

Lienzo de Claude Design: https://claude.ai/artifact/TrrXrRkCMNej86ZB2GDyvX (incluye las alternativas que se descartaron: pestañas, control segmentado, barra abajo, píldora, fichas).

Solo cuando la tienda vende **más de un rubro**. Con uno solo, todo queda como hoy.

## Lo aprobado

1. **Pestaña Catálogo (opción E)** — `CatalogoCerrado.dc.html` y `CatalogoMenu.dc.html`.
   - El título «Tu catálogo» pasa a ser **el nombre del catálogo que se está viendo** («Accesorios») con un chevron: es el selector. Se ve **un catálogo a la vez; no hay «Todo»**.
   - El texto de debajo cambia a «Tus catálogos viven aquí. Toca el nombre y cambia.»
   - El menú lista los catálogos con su cantidad de productos y, al final, «Lo que vendes» (sumar otro). El buscador dice «Busca en Accesorios».
   - El botón naranja «+ Producto» se queda donde está. La tarjeta «Tu catálogo está en línea» (el enlace público) no cambia.
2. **Hoja de producto (opción A, ajustada)** — `HojaProducto.dc.html`.
   - Justo **debajo del título «Producto nuevo»**, **fijo en la cabecera** (dentro de la zona del desenfoque progresivo, como cualquier cosa que va en `HojaFijoArriba`).
   - **Sin píldora ni fondo**: se ve igual que el selector del título de la pantalla Catálogo (nombre en Fredoka con chevron). Sale con el catálogo que se estaba viendo.

## Notas

- Las cifras y los nombres del lienzo son de ejemplo. No copies su HTML: usa `components/ui/`, `components/hoja.tsx` y los tokens (`docs/09`).
- La dona de la cabecera del dibujo muestra la cifra del catálogo; en la app se queda como hoy (es de toda la tienda y abre «Tu inventario»).
- El menú del dibujo es una ilustración; en la app el selector es el `<select>` nativo de iOS (ver el prompt).

## Cambios del 7 oct (tras probar #68)

- **El botón naranja «+ Producto» no se mueve nunca**, tampoco con un catálogo vacío (ahí #68 lo reemplazó por un botón al centro; está mal).
- **Sin selector nativo de iOS**: el selector (título de la pestaña y cabecera de la hoja de producto) abre un **menú flotante** como el de `CatalogoMenu.dc.html`. Prompt: `docs/prompts/selector-catalogos-ajustes.md`.
- **Comprador:** perfil con **pestañas de texto** («Todo · Perfumes · Accesorios», como la barra de pestañas del perfil de Instagram pero con nombres) y, en «Colecciones», el menú flotante. Prompt: `docs/prompts/catalogo-por-tipo-comprador.md`.
