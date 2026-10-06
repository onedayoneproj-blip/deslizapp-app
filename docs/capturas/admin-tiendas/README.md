# Admin parte 2 — capturas de Coding

Capturas reales de Chromium local en modo Demo, a 390 px de ancho. Se pueden comparar con los tableros aprobados de `referencias/admin/capturas/`:

| Captura | Referencia | Comparación |
|---|---|---|
| `Hoy.png` | `Hoy.png` | Mantiene cabecera, cuatro indicadores, asuntos y barra inferior. Incluye una franja de Demo para distinguir los fixtures; nombres y valores son datos de ejemplo. |
| `Tiendas.png` | `Tiendas.png` | Mantiene búsqueda, filtros con conteo, salud y filas con acceso a ficha. Muestra búsqueda combinada con «En prueba». |
| `Tienda.png` | `Tienda.png` | Mantiene resumen, accesos, cuenta, actividad, catálogo, equipo y acciones al final. Corresponde a una tienda fixture marcada como prueba. |

Las imágenes se capturaron de la aplicación ejecutándose; no son composiciones ni capturas de los HTML de referencia. El tablero `VerComo.png` se deja como comparación conceptual, pero no se incluye captura de una tienda real: la migración de guardias aún no está aplicada y no se usaron credenciales Google ni datos reales para fabricar esa sesión. El estado esperado de Ver como está documentado en `docs/handoffs/admin-tiendas-codex.md`.
