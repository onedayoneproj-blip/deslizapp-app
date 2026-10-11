# Crear producto «como una historia» (aprobado por Lewis, 11 oct 2026)

Lienzo de Claude Design: [Crear producto · rediseño](https://claude.ai/artifact/Y4cKDREEphaQcwd6TLvGE4) (privado). **Referencia visual: nunca copiar el HTML ni sus estilos en línea**; se construye con `components/ui/`, los tokens y `docs/09-sistema-de-diseno.md`.

- `historia.dc.html`: opción B aprobada, un producto con una sola presentación. Seis momentos: foto → nombre → precio → cuántos tienes → «así se ve en tu catálogo» (opcionales y Publicar) → celebración.
- `historia-presentaciones.dc.html`: la misma B cuando el producto tiene varias presentaciones: qué cambia → valores → colores y foto de cada color → cuántos de cada una → detalle de una presentación → así se ve.
- `descartada-dos-pasos.dc.html`: opción A (dos pasos con preguntas). Descartada; se conserva como antecedente.

Encargo: `docs/prompts/crear-producto-historia.md`.

## Proporción real de la foto (11 oct 2026)
La tarjeta de vista previa («así se verá» y «así se ve en tu catálogo») debe tener **la proporción real del reel: 4:5 (390×488, `--W`/`--H`), con la foto en `object-fit: cover` y sin barras laterales**. Las tarjetas de los pasos intermedios del lienzo son aproximadas (casi cuadradas); manda esta regla.

