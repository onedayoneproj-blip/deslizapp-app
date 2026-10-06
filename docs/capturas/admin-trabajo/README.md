# Capturas — Admin parte 3 (Trabajo, taller, Personalizar)

Generadas por `scripts/probar-admin-trabajo.mjs` (con `CAPTURE_DIR`) sobre el build de producción local de la rama, en la
**demo** (sin Supabase), Chromium 390 px salvo que el nombre diga otra cosa, **solo en el tema claro**: el modo oscuro de la
app todavía no está diseñado (pendiente para toda la app), así que no hay capturas ni validación de oscuro.

| Captura | Referencia | Comparación |
|---|---|---|
| `trabajo-catalogos-390-claro.png` | `referencias/admin/capturas/Trabajo.png` | Mismo orden: título, segmento Catálogos · Fotos con conteo, grupos en versalitas, tarjeta con avatar, rubro y «Hace N días», botones «Empezar» y «Ver sus fotos». La tarjeta que llega desde Hoy (`?tienda=`) va con anillo mandarina. La tienda de la demo no tiene conteo de productos en la lista admin, así que la línea dice rubro · tiempo. |
| `trabajo-fotos-mesa-390-claro.png`, `trabajo-fotos-390-claro.png` | `referencias/admin/capturas/Fotos.png` | Grupo por tienda con «N fotos · llegaron … · créditos», miniaturas (la abierta con anillo), mesa verde con Antes/Después punteado, «Bajar original» en blanco y «Entregar» mandarina, y la línea de abajo. Diferencias: «Devolver» va como enlace subrayado en la mesa (en la referencia solo se menciona en el texto); «La más vieja» solo aparece si hay más de una tienda. |
| `trabajo-fotos-devolver.png` | (no hay tablero) | Hoja de motivo con sugerencias y contador 200. |
| `personalizar-390-claro.png`, `personalizar-360-claro.png`, `personalizar-430-claro.png` | `referencias/admin/capturas/Personalizar.png` | Encabezado «Su catálogo» con la tienda, vista previa de la cabecera con la letra y el SVG reales (fondo liso del color de botones, que el tema deja en AA con letra blanca; la referencia usa un degradado), filas Marca / Frases / Secciones / Productos con los mismos textos y valores a la derecha. «Vista previa» de la referencia es «Ver como lo verá un cliente» (texto del prompt). El subtítulo dice el estado del catálogo, no «lo que hoy se hace con SQL». |
| `personalizar-colores-aviso.png` | — | Aviso AA al elegir un texto sin contraste. |
| `panel-foto-en-el-taller.png`, `panel-foto-devuelta.png` | (panel, prompt §2) | Miniatura con anillo y sello «En el taller»; devuelta con sello, motivo y «Subir otra». |
| `catalogo-demo-personalizado.png` | — | Catálogo `?demo` después de guardar (botón nuevo, sin Búsqueda). |
| `hoy-390-claro.png`, `tiendas-390-claro.png`, `ficha-390-claro.png` | `Hoy.png`, `Tiendas.png`, `Tienda.png` | Revisión del tema claro de la parte 2 (ver abajo). |
| `menu-tienda-acceso-demo.png` | — | En la demo, «Admin de la demo» lleva a `/admin-demo`. En real solo lo ve un admin activo (no capturado: requiere sesión real). |

**Revisión del tema claro (parte 2, corregido aquí):** Hoy decía «Buenas días» (ahora «Buenos días / Buenas tardes / Buenas
noches») y la fecha salía «6 De Octubre» (`capitalize`; ahora solo la primera letra). En Tiendas el punto «Viva» no se veía
(`bg-exito` no existe), «Te necesita» y «Se enfría» tenían el mismo naranja y la leyenda eran cuatro «●» del mismo color; ahora
siguen el tablero (Viva verde `exito-texto`, Te necesita `resalte`, Se enfría `apagado`, Esperando al equipo `accion`) y la
leyenda usa los mismos puntos. En la vista previa de Personalizar, «Colecciones» inactiva subió de 60 % a 85 % de opacidad.

**Modo oscuro:** no se revisó ni se cambió. No está diseñado para la app; queda pendiente de diseño para toda la app.
