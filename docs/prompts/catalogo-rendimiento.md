# Catálogo React: corregir la primera carga en 4G

> **Modelo recomendado en Codex:** GPT-6.1, razonamiento alto. **Alternativa para esta tarea en Claude Code:** Claude Opus 4.6. La recomendación corresponde a la complejidad; no implica equivalencia exacta.

## 0. Puesto, prioridad y rama

Lee `docs/00-contexto-del-proyecto.md`, `AGENTS.md`, `HANDOFF.md` y `docs/prompts/catalogo-react.md`. Tu puesto es Coding.

Lewis pidió resolver la lentitud antes de dar el catálogo por terminado. Haz esta corrección **antes** de implementar `pedido-catalogo-panel.md`. No combines ambas tareas.

PR #44 sigue en borrador, sin fusionar. Revisa su estado y head actuales; el último revisado es `a56553756e6c4e5ad2b25a52c2e67962dc73e8f6`. Si sigue abierto y eres la sesión que lo mantiene, continúa en `feature/catalogo-react` con commits específicos de rendimiento. Si otra sesión trabaja en esa rama, usa una rama dependiente y PR contra ella; documenta la dependencia. Si ya está fusionado, usa una rama nueva desde main actualizado. No sobrescribas trabajo ajeno.

**No hagas merge ni publiques producción.** Entrega preview para Lewis. Conserva HTML y `url_catalogo`.

## 1. Evidencia y diagnóstico

Lee `docs/validacion-catalogo-react.md`, `docs/capturas/catalogo-react/rendimiento.json`, `scripts/medir-catalogo.mjs` y el código del catálogo.

Medición anterior: 390 px, caché vacía, 1,6 Mbps/150 ms, primer reel 7.086 ms, 1.158.100 bytes, 28 solicitudes. Build local sin compresión de Vercel. **No es una medición del preview, Safari o cobertura móvil real.** Las tres fotos más pesadas reportadas suman 516.965 bytes; son candidatas de optimización, no una causa demostrada.

Obtén una traza de red y rendimiento. Separa documento, datos públicos, JavaScript, fuentes, portada, decodificación y render. Identifica qué bloquea la foto y qué bloquea la interacción. Revisa específicamente:
- `Medios` recibe prioridad para los dos primeros reels: evita que la segunda portada compita innecesariamente con la primera.
- Las fotos usan URLs originales: compara dimensiones/peso descargados con tamaño real y DPR.
- `colorDePortada` crea otro Image: comprueba si descarga originales o recursos adicionales aunque la portada visible use una versión optimizada.
- Video/posters y medios vecinos: verifica cuándo empiezan y cuánto compiten.
- Descargas del panel, recibos/PDF e interfaces no abiertas: determina qué entra realmente en la carga inicial.

No atribuyas el retraso a Supabase sin medirlo. No cambies datos, planes o permisos para mejorar una cifra.

## 2. Optimización conservando el diseño

Corrige los cuellos de botella comprobados:
- Prioriza la portada realmente visible (incluido enlace directo a otro producto). Reserva tamaño y conserva encuadre, nitidez, color extraído, contraste y accesibilidad.
- Sirve imágenes adaptadas a viewport/DPR y formato/peso adecuado. Elige una solución compatible con el proyecto y URLs reales/demo; verifica permisos de hosts y disponibilidad. No asumas que las transformaciones de Supabase están incluidas en el plan.
- Conserva originales, fotos del panel y referencias. No reemplaces ni recomprimas destructivamente archivos de producción.
- Carga el siguiente reel de forma progresiva sin competir con la primera portada; no descargues todos los carruseles/videos al abrir. Deslizar debe seguir siendo fluido.
- Evita descargar un original pesado solo para extraer color. Mantén la extracción aprobada y su fallback/CORS.
- Usa poster en video y conserva autoplay permitido, pausa fuera de vista, sonido y movimiento reducido.
- Difiere módulos de recibo PNG/PDF y vistas secundarias cuando su peso lo justifique; comprueba primera apertura y primer uso.
- Revisa fuentes críticas y compresión/caché reales del preview. No muestres precios/stock obsoletos ni caches respuestas privadas para ahorrar tiempo.
- Conserva la identidad del catálogo, sus transiciones y las funcionalidades completas. Un skeleton puede ayudar, pero no cuenta como primer producto visible.

## 3. Medición reproducible y criterio de cierre

Mejora el script existente para comparar condiciones idénticas. Conserva el resultado histórico; guarda nuevos resultados y una tabla antes/después.

Haz al menos cinco cargas frías por versión en build de producción, a 390 px, misma tienda/datos y perfil de red, indicando navegador, CPU, compresión y tratamiento del service worker. Usa contexto nuevo, caché vacía y sin recursos previamente calentados. También mide carga repetida con service worker normal para evitar esconder problemas de la PWA.

El script anterior espera a `p.goto` antes de comprobar la imagen: el evento load puede ocurrir después de que el producto ya sea visible. Mide el instante real desde el inicio de navegación hasta portada decodificada y visible, nombre/precio presentes y control principal utilizable. Si corriges ese criterio, **vuelve a medir la versión anterior con el mismo criterio**; no atribuyas a la optimización una mejora causada por cambiar la medición.

Registra por separado:
- Tiempo al primer reel completo/utilizable y tiempo a la foto.
- LCP, CLS, transferencia hasta primer reel y transferencia en una ventana fija posterior; solicitudes y recursos dominantes.
- Mediana y rango de las cinco pruebas. Documenta si Resource Timing no permite leer tamaños de recursos externos; no uses un cero como prueba de ahorro.
- Carga posterior al deslizar y primera apertura de carrito/recibo/PDF.

**Objetivo de laboratorio propuesto:** mediana del primer reel utilizable ≤3 s en ese perfil, LCP ≤2,5 s y CLS ≤0,1. Son metas para esta prueba, no una garantía para cualquier conexión ni aprobación de Core Web Vitals de campo. Si no se alcanzan, muestra qué limita el resultado y deja el rendimiento pendiente; no declares rapidez aprobada por una sola ejecución.

Repite en preview Vercel con compresión real, misma red, sin incluir login SSO en la medición. Usa acceso autorizado; no desactives protección. Si está bloqueado, distingue mejora local demostrada de rendimiento del preview sin verificar. Nunca inventes resultados.

## 4. Regresiones y entrega

Corre typecheck, lint, tests, build y scripts de catálogo/errores pertinentes. Comprueba 360/390/430 px; reels, enlaces directos, color de portada, variantes, video, carrito, avisos, solicitud y PNG/PDF. Comprueba que las optimizaciones no añaden escrituras ni cambian precios, stock o disponibilidad. Prueba movimiento reducido.

Actualiza el informe de validación, HANDOFF y el estado del proyecto. En el PR incluye commits, diagnóstico probado, cambios, tabla antes/después, condiciones exactas, preview y límites. Mantén el PR abierto para Lewis; no publiques ni fusiones.

**Al final explica a Lewis cómo validarlo:**
1. Abrir el preview autorizado en Safari/iPhone con Wi-Fi apagado, usando datos móviles, y observar cuándo se ve y se puede usar el primer producto.
2. Abrir el catálogo de nuevo y comparar; aclarar que esto es carga repetida, no fría.
3. Deslizar varios productos, abrir variantes y video; no deben aparecer fotos borrosas, saltos de diseño o pantallas vacías.
4. Abrir carrito y generar PNG/PDF en Demo; deben seguir funcionando aunque se carguen después.
5. Repetir con Reducir movimiento.
Indica qué fue realmente probado y qué queda pendiente de teléfono/Safari o preview. Esta comprobación manual complementa las mediciones, no las sustituye.
