# Presentaciones: «¿Qué cambia de una a otra?» más claro (rama `feat/presentaciones-que-cambia`)

> **Modelo:** en Claude Code, Sonnet 5.5; en Codex, el modelo principal con razonamiento medio. **Sin migraciones.** Es el formulario del panel (no cambia datos ni lo que ven los compradores). Cuando todo pase y se vea como `referencias/presentaciones-que-cambia/`, **fusiona (squash) a `main`**. Déjalo abierto solo si algo falla o decides algo que no estaba aquí.

> **En paralelo con** `selector-catalogos-ajustes.md` (otra sesión, en `vista-catalogo` y el selector) y `catalogo-por-tipo-comprador.md` (comprador). Quédate en `components/catalogo/ficha-presentaciones.tsx`, `lib/presentaciones.ts`, `lib/rubros.ts` (solo lo de presentaciones típicas) y `components/ui/` si hace falta un componente. Antes del PR, `git fetch origin && git rebase origin/main`.

## 0. Antes de empezar

Lee `docs/00-contexto-del-proyecto.md`, `AGENTS.md`, `HANDOFF.md` (teclado e iPhone, permisos, movimiento), `docs/09-sistema-de-diseno.md` (`Opcion`, `Campo`, `EditorEtiquetas`), `docs/11-voz-y-frases.md`, `docs/04-pantallas.md` (presentaciones) y `referencias/presentaciones-que-cambia/LEEME.md` con sus cuatro dibujos. Tu puesto es **Coding**. No copies el HTML de las referencias.

Mira: `HojaElegir` en `components/catalogo/ficha-presentaciones.tsx` (la hoja «Presentaciones» / «Qué varía», `EjeBorrador`, `OTRA`, `alternar`), `lib/presentaciones.ts` (`MAX_EJES = 2`, `errorDeEjes`, `cuantasSalen`, `atajosDe`, `plural`), `OPCIONES_TIPICAS` en `lib/rubros.ts`, `components/ui/editor-etiquetas.tsx` y `components/ui/opcion.tsx`.

## 1. El problema (Lewis, 7 oct 2026)

1. En un producto de una tienda «General» (o con cualquier tipo sin atajos) solo sale **«Otra…»**, que pide **«¿Cómo se llama?»**: parece que pregunta el nombre del producto.
2. **Solo se puede crear una cosa que cambie** con «Otra…» (si escribes Color, ya no puedes agregar Tamaño). La base sí admite **hasta 2** por producto (`opciones_validas`); el formulario no lo deja.
3. Lo que cambia (Color, Tamaño) y sus valores (Dorado, Grande) se ven con el mismo estilo de pastilla y se confunden.

## 2. Qué se construye (el dibujo manda)

**Palabras en pantalla:** «cosas que cambian» y «lo que tienes». Nunca «dimensión», «eje» ni «opción» (esa palabra ya significa otra cosa en la app).

1. **Una lista de cosas que cambian, para cualquier tienda.** Dos grupos:
   - **«Lo típico en {tipo}»:** las de `OPCIONES_TIPICAS` del tipo del producto (si el tipo no tiene, el grupo no sale).
   - **«Otras»:** el resto de un catálogo fijo: Color, Tamaño, Talla, Material, Modelo, Sabor, Tono (sin repetir las de arriba).
   - Al final, **«+ Otra cosa»**.
   Cada una es un **rectángulo** (esquinas poco redondeadas, no pastilla), en dos columnas, con «+» a la derecha; al elegirla se pone **verde oscuro con letra blanca y un check**. Tocar de nuevo la quita.
2. **Lo que tienes, de cada una:** por cada cosa elegida sale **su sección** (tarjeta): arriba la **misma etiqueta verde oscuro** de su rectángulo y un «Quitar»; dentro, **pastillas redondas** (el estilo de `Opcion`: menta con check al elegirla) con **valores sugeridos**, y «+ Otro color / tamaño…» que abre el campo para escribir uno propio. Títulos de la hoja, en `font-display`: **«¿Qué cambia de una a otra?»** y **«¿Cuáles tienes?»**.
3. **Valores sugeridos** (una constante en `lib/presentaciones.ts`; las de siempre, `atajosDe`, se integran: «XS a XL», «36 a 42», «Única», «30 · 50 · 100 ml» en perfumes):
   - Talla: XS, S, M, L, XL (y los atajos de arriba). Color: Dorado, Plateado, Negro, Blanco, Rojo, Azul, Rosado, Verde, Beige, Gris, Marrón. Tamaño: Pequeño, Mediano, Grande (en perfumes, 30 ml, 50 ml, 100 ml). Material: Algodón, Lino, Cuero, Metal. Sabor: Vainilla, Chocolate, Fresa, Limón. Tono: Claro, Medio, Oscuro. Modelo: sin sugeridos.
   - Puedes ajustar la lista si algo no tiene sentido, pero cortas (de 4 a 11 por cosa) y en español dominicano natural.
4. **Hasta 2 cosas que cambian por producto** (`MAX_EJES`, y la base lo exige). **Sin contador, sin aviso grande, sin tostada:** al elegir la 2.ª, las demás rectángulos se **apagan** (no se pueden tocar) y **«+ Otra cosa» se convierte, en el mismo lugar y con el mismo borde punteado, en el texto «Ya elegiste 2: es el máximo.»** Para cambiar una, se toca «Quitar» en su sección.
5. **«+ Otra cosa»** reemplaza a «Otra…» y a «¿Cómo se llama?»: abre una sección con el campo **«¿Qué otra cosa cambia?»** (ayuda: «Ej: Material, Aroma, Estampado. Después eliges cuáles tienes.») y un botón «Listo». **Pueden ser hasta 2 propias** (siempre dentro del máximo de 2 en total), nombre de hasta 20 caracteres, sin repetir (sin distinguir mayúsculas) ni chocar con las del catálogo. Sus valores se escriben con `EditorEtiquetas` (máximo 12 por cosa y 20 caracteres cada uno, como la base).
6. **El botón de abajo** sigue diciendo «Crear las N» (o «Guardar» en «Qué varía») y es donde vive la cuenta de cuántas salen. **Quita el recuadro verde de «Salen N presentaciones»** y el texto «¿Solo una? Elige un solo valor y listo.» si queda sobrando. Mientras falte una cosa o algún valor, el botón sigue deshabilitado.
7. **Lo que no cambia:** el modo «Qué varía» (editar un producto con presentaciones: las que ya tiene vienen elegidas), la alerta de «¿Quitar N presentaciones?» al guardar, `errorDeEjes`, `cuantasSalen`, el stock por presentación, los límites de la base y el catálogo del comprador. **No toques `guardar_variantes` ni `opciones_validas`.**
8. **Lo que agregues o quites vale solo para ese producto.** No se guarda nada nuevo en la base (la tienda «recordando» sus valores queda para después).

## 3. Reglas

- Componentes de `components/ui/`; si falta uno (el rectángulo elegible), créalo y documéntalo en `docs/09` §16.5.
- Teclado e iPhone (`HANDOFF.md`): el campo «¿Qué otra cosa cambia?» y los valores propios están en una hoja `grande`; foco dentro del gesto; nada de animar ni remontar los ancestros de un campo. Agrégalos a `scripts/probar-teclado.mjs`.
- Movimiento: nada nuevo; apagar y encender rectángulos es instantáneo.
- Textos en la voz de la marca, mínimos (`docs/11`); sin exclamaciones.
- Permisos: es del grupo `catalogo`; un Ayudante lo ve apagado como el resto de la ficha.
- Novedad en `lib/novedades.ts` (una frase; versión siguiente a la de `main` en el momento del merge).

## 4. Pruebas y cierre

- Unitarias: lista por tipo (típicas primero, sin repetir), límite de 2 (incluidas las propias), nombres propios (vacío, repetido, largo), valores sugeridos y propios (máximo 12, 20 caracteres, sin duplicados), cuántas salen, y que `OPCIONES_TIPICAS` vacío (General) deja solo «Otras».
- Navegador (demo y la Tienda de ensayo en el preview, 390 y 360): crear un producto General con Color y Tamaño, uno con una cosa propia («Aroma»), elegir una tercera (apagada), quitar una y elegir otra, un perfume (Tamaño con sus 30/50/100 ml), editar un producto con presentaciones desde «Qué varía» y confirmar que las que ya tiene siguen.
- Compara contra `referencias/presentaciones-que-cambia/` y di en el PR en qué se diferencia.
- `tsc`, `npm test`, `npm run lint` (sin avisos nuevos), `npm run build`, `probar:presentaciones`, `probar:teclado` y las regresiones de producto y catálogo del cliente.
- `docs/04-pantallas.md` y `HANDOFF.md` si cambia una regla.
- Resume en español, corto: qué cambió, qué debe probar Lewis en el iPhone (Tienda de ensayo: crear un producto con Color y Tamaño, uno con una cosa propia, intentar una tercera) y las decisiones que tomaste (en especial las listas de valores sugeridos). Di claro que Safari/iPhone no se pudo probar.
