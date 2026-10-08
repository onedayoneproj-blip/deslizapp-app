# Búsqueda del comprador: precio y presentaciones (rama `feat/busqueda-precio-presentaciones`)

> **Modelo:** en Claude Code, Sonnet 5.5; en Codex, el modelo principal con razonamiento medio. **Sin migraciones.** Es el catálogo que ven los compradores: **deja el PR abierto con su preview** para que Lewis lo pruebe en el iPhone. No hagas merge.

> **En paralelo con** `publicar-catalogo.md` (otra sesión, con migración, en el panel y `tienda_publica`). Tú trabajas en `lib/tienda/busqueda.ts`, la hoja de búsqueda de `components/tienda/catalogo.tsx` y un bloque propio al final de `app/tienda/catalogo.css`. Antes del PR, `git fetch origin && git rebase origin/main`.

## 0. Antes de empezar

Lee `docs/00-contexto-del-proyecto.md`, `AGENTS.md`, `HANDOFF.md`, `docs/12-catalogo-conectado.md`, `docs/11-voz-y-frases.md` y `docs/prompts/tipo-de-producto.md` (la búsqueda por tipo de #67). Tu puesto es **Coding**.

Mira: `lib/tienda/busqueda.ts` (`buscarSinTipos`: la lectura del precio con `max`/`min`/`cheap`, los campos con peso por rubro, el orden; `buscarCatalogo`, `tiposEnConsulta`), la hoja de búsqueda `#srBg` en `components/tienda/catalogo.tsx` (`resultados`, `.srhead`, `.srlist`, el estado vacío), `ProductoPublico` en `lib/types.ts` (`precio`, `precioPromo`, `opciones`, `variantes` con sus precios) y los tests existentes de búsqueda en `tests/`.

## 1. Qué decidió Lewis (8 oct 2026)

1. La búsqueda también debe encontrar por **lo que la tienda pone en Presentaciones** (colores, tamaños…), por la **descripción** y por el **tipo**. Hoy, en tiendas que no son de perfumes, solo mira nombre, marca (de Detalles), categoría y los Detalles; **los valores de las presentaciones no se buscan** (un «Aro» con Dorado y Plateado no sale al buscar «dorado»).
2. La búsqueda debe entender **el precio** mejor: «menos de 500», «hasta 2000», «más de 1000», «entre 500 y 1500», y un **número suelto** («2000») como «cerca de ese precio», no «todo lo que cueste menos».

## 2. Lo que hace hoy (confirmado en el código; no lo rompas)

- Ya entiende `menos de / hasta / maximo / max / debajo de / por debajo de / menor a|de / no mas de` (tope), `mas de / desde / minimo / arriba de / mayor a|de` (piso) y `barato(s)` (ordena por precio), quitando `rd$`, `$` y `pesos`.
- **El hueco:** un número suelto de 300 o más se toma como **tope** (`2000` = «todo lo que cueste 2000 o menos»); uno de menos de 300 se deja como **palabra** y trae cosas que no corresponden. No hay «entre», ni «cerca de», ni nada que le diga a la persona cómo se entendió.
- Con perfumes (Esencias Michel) los campos y pesos son otros (marca, familia, notas, ocasiones…). **Su búsqueda por palabras no puede cambiar.**

## 3. Qué se construye

### 3.1 Qué se busca (solo la parte de texto)

- Para las tiendas que **no** son de perfumes, suma al índice: **los valores de las presentaciones** (`opciones[].valores`, peso 3), la **descripción** (`detalles.descripcion`, sube a peso 3; hoy va mezclada con los Detalles a peso 2) y el **nombre del tipo** (peso 2: «accesorios», «ropa»; sin romper el filtro por tipo de #67). Nombre (5), marca (4) y categoría (3) quedan.
- Para perfumes, **no cambies pesos ni campos**. Puedes sumar los valores de las presentaciones con peso 1 solo si no altera los resultados de la prueba fija (ver §5); si la altera, déjalo fuera y dilo en el PR.
- Que la lista de palabras que se ignoran (`STOP`), los sinónimos de perfumes y el emparejamiento difuso sigan igual.

### 3.2 Precio

Se interpreta primero el precio y lo que sobra se busca como texto. Todo en **lib** (puro, con tests), no en el componente.

- **Tope:** `menos de, menor a|de|que, hasta, bajo, debajo de, por debajo de, maximo, max, no mas de, <`. **Piso:** `mas de, mayor a|de|que, desde, minimo, min, arriba de, por encima de, >`. **Rango:** `entre X y Y`, `de X a Y` y `X-Y` (solo si ambos son precios). El orden de los extremos no importa.
- **Cómo se escribe el número:** `2000`, `2,000`, `2.000`, `RD$2000`, `$ 2,000`, `2 mil`, `2k`, `1.5k`. Sin tildes ni mayúsculas (ya se normaliza).
- **Número suelto** («2000»): es **precio cercano** (de −25 % a +25 %), con lo más cercano primero, **solo si** vale 100 o más **y** no coincide con un valor del catálogo (un tamaño «100 ml», un número en un nombre o una presentación, p. ej. «Sombrero 2000» o «Talla 38»). Si coincide con texto, es texto. Menos de 100: siempre texto.
- **Con palabras** («aretes menos de 500», «perfume 3000»): las palabras buscan y el precio filtra (o, en «cerca de», ordena y filtra).
- **Qué precio se compara:** el que ve el comprador (`precioPromo ?? precio`) y, con presentaciones con precio propio, **cualquiera de sus precios**: el producto cumple si alguno cumple (`Desde RD$X` incluido).
- **Orden** (sin palabras; con palabras manda la relevancia y el precio desempata): tope, de **más cercano al tope** hacia abajo; piso y rango, de menor a mayor; cerca de, por cercanía. `barato` sigue ordenando por precio.
- **Sin resultados de precio:** nada de pantalla vacía. Un mensaje corto con la voz de `docs/11` («No hay nada hasta RD$200. Esto es lo más cercano:») y hasta 6 productos, los más cercanos al límite.
- **Etiqueta de cómo se entendió**, justo debajo de «N resultados para «…»»: «Hasta RD$500», «Desde RD$1,000», «Entre RD$500 y RD$1,500» o «Cerca de RD$2,000», con una **✕** que quita esa parte de la consulta y vuelve a buscar. Estilo del catálogo del comprador (`app/tienda/catalogo.css`, bloque propio al final; con el tema de la tienda), 44 px de toque en la ✕, `aria-label` en la ✕.

### 3.3 Lo que no cambia

La barra, las ideas para buscar, las pastillas de tipo, el orden y el diseño de cada resultado, el feed y la cabecera. Sin movimiento nuevo. Una tienda de un solo rubro y sin precios en la consulta se comporta como hoy.

## 4. Reglas

- **Esencias Michel no cambia en su búsqueda por palabras.** Antes de tocar nada, captura los resultados (ids en orden) de **al menos 15 consultas fijas** sin precio en la demo de Michel (marcas, notas, «para ella», «noche», errores de escritura…) y compáralos al final: deben ser idénticos.
- Sin migraciones, sin tocar `catalogo_publico` ni el panel.
- Textos mínimos y con la voz de `docs/11`; sin exclamaciones.
- Novedad en `lib/novedades.ts` (una frase para la dueña, p. ej. que sus clientes ya buscan por color, tamaño y precio); versión siguiente a la de `main` en el momento del merge.

## 5. Pruebas y cierre

- Unitarias en `tests/` (nuevo archivo, p. ej. `busqueda-precio.test.mjs`): cada forma de tope, piso y rango; los formatos del número; número suelto como precio cercano y como texto (coincide con «100 ml» o con un nombre); mezcla con palabras; precios por presentación y con promo; sin resultados y los 6 más cercanos; la lectura de la etiqueta; valores de presentaciones y descripción que se encuentran («dorado», «50 ml»); y la **prueba fija de Michel** (resultados idénticos).
- Navegador (demo `?demo`, 390 y 360; Lino & Algodón y Michel): escribir «dorado», «menos de 500», «2000», «entre 500 y 1500», «aretes menos de 800», quitar la etiqueta con la ✕, y un precio sin resultados. Capturas de la hoja de búsqueda.
- `tsc`, `npm test`, `npm run lint` (sin avisos nuevos), `npm run build` y las regresiones del catálogo del cliente (`probar-catalogo-*`, `probar-catalogo-por-tipo`, presentaciones).
- `docs/04-pantallas.md` y `docs/12-catalogo-conectado.md`.
- **PR abierto con preview.** Resume en español, corto: qué cambió, qué debe probar Lewis en el iPhone (la Tienda de ensayo o Lino en la demo: buscar «dorado», «menos de 500», «2000», «entre …») y lo que no pudiste probar (Safari físico).
