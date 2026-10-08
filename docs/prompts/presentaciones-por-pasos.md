# Presentaciones por pasos (sobre la rama `feat/hoja-producto-rediseno`, PR #78)

> **Modelo:** en Claude Code, Sonnet 5.5; en Codex, el modelo principal con razonamiento medio. **Sin migraciones** (si crees que hace falta una, para y dilo). Trabaja **en la misma rama del PR #78** (`feat/hoja-producto-rediseno`): merge de `main` si hace falta (sin rebase ni force-push) y push ahí. El PR sigue abierto con preview; no hagas merge.

## 0. Antes de empezar

Lee `docs/00-contexto-del-proyecto.md`, `AGENTS.md`, `HANDOFF.md` (teclado, gestos, permisos, movimiento), `docs/09`, `docs/11`, **`referencias/presentaciones-por-pasos/LEEME.md`** con sus 6 dibujos, `referencias/hoja-producto-nuevo/LEEME.md`, y **el informe de pruebas `docs/qa/presentaciones-escenarios.md` de la rama `qa/presentaciones-escenarios`** (`git fetch origin qa/presentaciones-escenarios`; si aún no existe, sigue sin él y dilo). Tu puesto es **Coding**.

Mira: `components/catalogo/ficha-presentaciones.tsx` (`SeccionPresentaciones`, `HojaElegir`, `HojaSuelta`, `HojaPresentacion`, `HojaFotoColor`), `lib/presentaciones.ts` (`crearTodas`, `cambiarQueVaria`, `agregarSuelta`, `cuantasSeVan`, `valorSin`, `estadoDe`, límites) y `components/catalogo/hoja-producto.tsx`.

## 1. El problema (Lewis, 8 oct 2026)

Hay tres caminos para lo mismo (elegir al crear, «Agregar presentación», «Cambiar qué varía») y confunden: tras crear Color, Lewis quiso agregar Tamaño con «Agregar presentación» y el campo «¿Otro valor de color?» guardó «Tamaño» como un color. Además la tarjeta desplegada mezcla filtros, lista, acciones y stock repetido, y un producto nuevo muestra «Agotada» en naranja con 0.

## 2. Lo que se construye (ver los dibujos)

1. **Un solo flujo de dos pasos** en una hoja `grande`, como el pedido nuevo: **Paso 1 «Qué cambia»** (las tarjetas de hoy: máx. 2, valores sugeridos, «+ Otra cosa», «Quitar»; botón «Siguiente · N presentaciones», apagado si falta algo) y **Paso 2 «Cuántas tienes»** (una fila por combinación con su stock; con dos cosas, agrupadas por la primera; «Poner a todas»; tocar una fila abre su detalle actual: precio propio, foto, ocultar/quitar con la regla de pedidos; «Listo · M en total»). «Atrás» vuelve al paso 1 sin perder nada.
2. **En la hoja de producto**, «Cosas que cambian» es solo el resumen (pastillas por cosa y «N presentaciones · M») y abre el flujo. Sin presentaciones, la fila invita a crearlas y el stock simple sigue como hoy.
3. **Editar** abre directo en el paso 2, con el resumen arriba y el enlace «Cambiar qué cambia» al paso 1.
4. **Cambiar lo que ya existe** (en el paso 1 al editar): agregar un valor (se suman sus filas con 0), quitar un valor (sus filas se van; con pedidos, se ocultan como hoy, avisando), quitar una cosa entera (las combinaciones se juntan: pregunta clara, sin perder stock sin avisar), **agregar una 2.ª cosa**: el stock de cada valor viejo se **reparte** en el paso 2 (aviso «Tenías 5 de Plateado. Repártelas entre las tallas: faltan 2.», encabezado «Plateado · 3 de 5», «Listo» apagado hasta que cuadre; permitir también «dejarlo en una sola» si es más simple, explica qué elegiste).
5. **Se quitan** «Agregar presentación» (suelta) y «Cambiar qué varía» como caminos aparte, los filtros «Todas / …» (solo si hay más de 12 filas, si los conservas) y la fila repetida de stock.
6. **«Agotada»** no sale en un producto que aún no se publicó; con 0 se ve «0».
7. **Barra fija de la hoja de producto:** «Cómo se ve» y «Publicar»/«Guardar cambios» **flotan solos, del mismo ancho (mitad y mitad), con sombra, sin la tarjeta/recuadro detrás**.
8. **El «0» fantasma** detrás del título «Nuevo producto» (el desenfoque progresivo de la cabecera deja ver un campo de abajo): corrígelo.
9. Corrige todo lo que el informe de pruebas marque como «bloquea» o «confunde» en presentaciones; lo que no corrijas, dilo en el PR con el porqué.

## 3. Reglas

- Mismos datos y funciones de guardado (`guardar_variantes`, `opciones_validas`, límites de la base: 2 cosas, 12 valores, 144 presentaciones). Permisos del grupo `catalogo`; Ver como bloquea.
- Componentes de `components/ui/`, textos cortos con la voz de `docs/11`, sin exclamaciones. Cambio de paso **instantáneo** o solo `transform`/`opacity`; nada de animar alturas. Teclado e iPhone (`HANDOFF.md`): el campo de «Otra cosa» y los valores propios; actualiza `scripts/probar-teclado.mjs`.
- Perfumes de Michel (Tamaño en ml) siguen funcionando. El catálogo del comprador no cambia.
- Novedad en `lib/novedades.ts` (versión mayor que la de `main`).

## 4. Pruebas y cierre

- Unitarias: crear con 1 y 2 cosas, agregar/quitar valor, agregar 2.ª cosa con reparto, quitar una cosa, «Poner a todas», límites, «Agotada» solo publicado.
- Navegador (demo y Tienda de ensayo, 390 y 360): los 17 escenarios del informe de QA, uno por uno, antes/después; capturas junto a los 6 dibujos.
- `tsc`, `npm test`, `npm run lint`, `npm run build`, `probar:presentaciones`, `probar:hoja-producto`, `probar:teclado`, `probar-producto`, `probar-ficha`, `probar:catalogo-presentaciones`.
- Actualiza la descripción del PR #78 (qué cambió, tabla de escenarios, qué debe probar Lewis en el iPhone, lo no probado: Safari físico).
