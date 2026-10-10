# Validación del indicador de imágenes · 10 oct 2026

Base: `a27da202904567f3344ee798a7accd074bc01021`, main con PR #100 fusionado. Rama: `fix/indicador-carrusel-imagenes`. [Encargo](https://app.notion.com/p/3f5ed62010cb81fbb5a3eaa6d9ac94a5).

## Resultado

El `topmeta` de Reel contenía el índice/total global de productos; no era paginación de imágenes. Se retira esa fracción y la prop `n`, sin trasladarla. Las etiquetas Para ella/él y En tu pedido conservan su propósito. El indicador horizontal ya existente en Medios se reutiliza: pie reservado de 44 px más área segura, puntos tocables de 44 px y estado accesible. La foto, descripción y controles no invaden el indicador. Con un medio no se reserva pie. Vídeos existentes siguen funcionando; no se habilita su carga.

## Verificaciones

- `npm run tipos`: aprobado.
- `npm run lint`: aprobado, 0 errores y 32 warnings previos; lint final de archivos afectados también comprobado.
- `npm test`: 77 archivos aprobados.
- `VERCEL_DEPLOYMENT_ID=carrusel-puntos-local npm run build`: build de producción Webpack aprobada. Dos builds previas interrumpidas por ajustes durante la implementación; no representan resultados del código final.
- `npm run probar:carrusel-imagenes`: 165 comprobaciones aprobadas. Chromium, 12 combinaciones de 360/390/430/1280 px con 1/3/10 medios; swipe táctil real, toque, desplazamiento al último, foco visible, movimiento reducido, video mudo en línea, ausencia del progreso global, sin overflow de página, sin errores JS ni tráfico Supabase. Geometría y hit testing comprueban separación respecto de foto, descripción, cabecera, acciones, bolsa y sonido. Área segura de 34 px simulada a 360.
- `scripts/probar-catalogo-react.mjs`: regresión completa aprobada en Chromium (pedido, búsqueda, agotados, visibilidad, video, navegación, foco, movimiento reducido). Capturas de regresión guardadas en /tmp para conservar las anteriores.
- `probar:catalogo-presentaciones`, alcance reel/hojaB/sinPresentaciones a 360 y 390: regresión y nueva prueba de punto activo al elegir color. El primer pase detectó dos expectativas incorrectas: Pantalón tiene cuatro fotos (Arena es foto 3 de 4); el scrollWidth incluía el ::after invisible de 44 px de «…». Se corrige la prueba para medir rectángulos del contenido visible. Se repiten solo los escenarios afectados.

[Capturas](capturas/carrusel-imagenes/README.md). La revisión visual de móvil y escritorio coincide con las comprobaciones geométricas.

## Límites y revisión manual

WebKit no está instalado; Chromium móvil no demuestra Safari. El área segura se verifica con simulación, pendiente iPhone real. No se modificaron tiendas reales, Supabase, migraciones ni permisos. La preview READY, su HEAD y Revisión se registran en el PR y Notion tras el único push de esta ronda; no requieren otro despliegue documental.

En Safari abrir la preview, entrar en Demo y visitar Lino & Algodón → Pantalón de algodón. Deslizar fotos, tocar los puntos y elegir Arena en «Ver presentaciones»: queda activo el tercero. Los puntos deben quedar bajo la foto sin cruzar botones o descripción. En Esencias Michel → Mayar (una foto), no deben aparecer puntos. Recorrer productos verticalmente y comprobar que no aparece «n/n productos». Repetir en escritorio, probar Tab/Enter y revisar el área segura con la barra de Safari visible.
