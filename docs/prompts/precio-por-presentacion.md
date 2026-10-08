# Precio por presentación y Precio en la tarjeta (misma rama del PR #78)

> **Modelo:** Sonnet 5.5. **Sin migraciones** (el precio propio por presentación ya existe en `variantes`). Trabaja en `feat/hoja-producto-rediseno` (PR #78): merge de `main` si hace falta (sin rebase ni force-push), push ahí, **no hagas merge a main**.
> **Al terminar:** crea un aviso con `create_trigger` (`persistent_session_id` = `session_01BJDuA1NdKUg4YX64VNuQDv`, `run_once_at` ≈ 1 minuto después, `initiation: own_followup`) con rama, PR, qué falta y si quedaste bloqueada.

## 0. Antes de empezar

Lee `docs/00-contexto-del-proyecto.md`, `AGENTS.md`, `HANDOFF.md` (teclado e iPhone, gestos, permisos), `docs/09`, `docs/11`, `referencias/presentaciones-por-pasos/` y la descripción del PR #78. Mira `components/catalogo/flujo-presentaciones.tsx`, `hoja-presentacion.tsx`, `hoja-producto.tsx`, `lib/presentaciones.ts` (`precioDe`, `resumenDe`) y cómo el catálogo muestra «Desde RD$X».

## 1. Qué decidió Lewis (8 oct 2026)

1. **Paso 2 «Cuántas tienes»:** arriba, un interruptor **«Cada una tiene su precio»**.
   - Apagado (lo normal): todas usan el precio del producto; solo stock, como hoy.
   - Encendido: cada fila muestra su stock («− N +») y **debajo un campo de precio** (teclado numérico), que arranca con el precio del producto; solo se cambian los distintos. Al apagarlo, avisa si había precios distintos y vuelven todos al del producto.
   - Al abrir un producto que ya tiene precios propios, el interruptor arranca encendido.
   - El precio propio sigue editable también desde el detalle de la fila (no lo quites), pero ya no es la única vía.
2. **El Precio pasa a la tarjeta de «Cosas que cambian»**, en este orden: **Precio · Cosas que cambian · En stock · Por encargo**. Arriba, junto a la foto, solo queda el Nombre.
3. Si las presentaciones tienen precios distintos, el Precio de la tarjeta muestra **«Desde RD$ X»** con una línea «Varía por presentación» (y tocarlo lleva al paso 2 con el interruptor encendido). Sin presentaciones o con el mismo precio, es el campo de siempre.

## 2. Reglas

- **Teclado e iPhone:** varios campos de precio seguidos en una hoja `grande`: el teclado no tapa la fila enfocada, nada salta de lugar, «siguiente» del teclado pasa al próximo precio si es posible; foco dentro del gesto. Agrégalo a `scripts/probar-teclado.mjs`.
- Mismos datos y guardado (`guardar_variantes`, precio > 0, límites). «Cómo se ve» refleja los precios del borrador. Permisos del grupo `catalogo`; Ver como bloquea.
- Textos cortos con la voz de `docs/11`. Movimiento instantáneo.

## 3. Pruebas y cierre

- Unitarias: interruptor (encender, apagar con precios distintos, arranque con precios propios), «Desde» en la tarjeta.
- Navegador (demo, 390 y 360): perfume de Michel con 30/50/100 ml a precios distintos; ropa con el mismo precio; guardar y reabrir; «Cómo se ve». Capturas.
- `tsc`, `npm test`, `npm run lint`, `npm run build`, `probar:presentaciones`, `probar:hoja-producto`, `probar:teclado`, `probar-producto`.
- Lee los comentarios de Codex nuevos en el PR #78, arréglalos y contesta cada hilo. Actualiza la descripción del PR #78.
