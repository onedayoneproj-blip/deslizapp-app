# Capturas — Admin parte 3 (Trabajo, taller, Personalizar)

Generadas por `scripts/probar-admin-trabajo.mjs` (con `CAPTURE_DIR`) sobre el build de producción local de la rama, en la
**demo** (sin Supabase), Chromium 390 px salvo que el nombre diga otra cosa.

| Captura | Referencia | Comparación |
|---|---|---|
| `trabajo-catalogos-390-claro.png` | `referencias/admin/capturas/Trabajo.png` | Mismo orden: título, segmento Catálogos · Fotos con conteo, grupos en versalitas, tarjeta con avatar, rubro y «Hace N días», botones «Empezar» y «Ver sus fotos». La tarjeta que llega desde Hoy (`?tienda=`) va con anillo mandarina. La tienda de la demo no tiene conteo de productos en la lista admin, así que la línea dice rubro · tiempo. |
| `trabajo-fotos-mesa-390-claro.png`, `trabajo-fotos-390-claro/oscuro.png` | `referencias/admin/capturas/Fotos.png` | Grupo por tienda con «N fotos · llegaron … · créditos», miniaturas (la abierta con anillo), mesa verde con Antes/Después punteado, «Bajar original» en blanco y «Entregar» mandarina, y la línea de abajo. Diferencias: «Devolver» va como enlace subrayado en la mesa (en la referencia solo se menciona en el texto); «La más vieja» solo aparece si hay más de una tienda. |
| `trabajo-fotos-devolver.png` | (no hay tablero) | Hoja de motivo con sugerencias y contador 200. |
| `personalizar-390-claro.png`, `personalizar-360/390-oscuro.png` | `referencias/admin/capturas/Personalizar.png` | Encabezado «Su catálogo» con la tienda, vista previa de la cabecera con la letra y el SVG reales, filas Marca / Frases / Secciones / Productos con los mismos textos y valores a la derecha. «Vista previa» de la referencia es «Ver como lo verá un cliente» (texto del prompt). El subtítulo dice el estado del catálogo, no «lo que hoy se hace con SQL». |
| `personalizar-colores-aviso.png` | — | Aviso AA al elegir un texto sin contraste. |
| `panel-foto-en-el-taller.png`, `panel-foto-devuelta.png` | (panel, prompt §2) | Miniatura con anillo y sello «En el taller»; devuelta con sello, motivo y «Subir otra». |
| `catalogo-demo-personalizado.png` | — | Catálogo `?demo` después de guardar (botón nuevo, sin Búsqueda). |
| `menu-tienda-acceso-demo.png` | — | En la demo, «Admin de la demo» lleva a `/admin-demo`. En real solo lo ve un admin activo (no capturado: requiere sesión real). |

**Oscuro:** los títulos en `text-bosque` (verde fijo de la marca) se leen con poco contraste sobre el fondo oscuro. Es el mismo
patrón de Hoy, la ficha y el marco de la parte 2; no se cambió aquí para no desviarse de esas pantallas. Queda anotado para
Planning.
