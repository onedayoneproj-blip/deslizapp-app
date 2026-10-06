# Retoque en Beta + pantalla de bienvenida + tienda de ensayo (rama `feat/retoque-beta`)

> **Modelo:** en Claude Code, Sonnet 5.5; en Codex, el modelo principal con razonamiento medio. Es un cambio de textos y de una pantalla, más una tienda de prueba creada con datos (no con una migración). Cuando todo pase, **fusiona (squash) a `main`** según la regla de cierre de `docs/00`. Lewis prueba en producción.

## 0. Antes de empezar

Lee `docs/00-contexto-del-proyecto.md`, `AGENTS.md`, `HANDOFF.md`, `docs/11-voz-y-frases.md` (la voz manda en todo texto), `docs/09-sistema-de-diseno.md`, `docs/13-admin.md` §7, `referencias/retoque-beta/LEEME.md` y `docs/14-precios-y-lanzamiento.md` §2. Tu puesto es **Coding**. Mira cómo quedó el retoque en `components/catalogo/ficha-medios.tsx`, `components/catalogo/taller.ts`, `lib/data/retoques.ts` y `lib/config.ts` (`RETOQUE_REAL`).

Diseño aprobado: `referencias/retoque-beta/` (LEEME y tableros `Ficha`, `Bienvenida`, `ComoFunciona`, `EnElTaller`, con capturas). Síguelo en medidas, jerarquía y textos; no copies su HTML.

## 1. Por qué

El retoque **no es automático**. Una persona de Deslizapp, con ojo y gusto, trabaja la foto con IA y escoge un resultado humano, que conecta con los clientes de esa tienda y va con sus valores. Por eso tarda. Hay que decirlo desde el principio y marcar la función como **Beta**, para que quien espere entienda por qué.

## 2. Etiqueta «Beta»

- Una etiqueta pequeña y visible «Beta» junto al botón «Retocar» y en cada estado del taller de la ficha (en el taller, entregada, devuelta). Mismo estilo de etiqueta de los demás avisos del sistema de diseño; que se lea con contraste AA.
- También en cualquier otro lugar del panel donde se hable de retocar (hoja de créditos, si la hay). Búscalos con grep; no cambies el admin.
- Un solo texto para la etiqueta, en `lib/config.ts` o en el archivo de textos que ya use el proyecto.

## 3. Pantalla de bienvenida (la primera vez)

- **Cuándo:** la primera vez que una persona toca «Retocar» en una tienda, **antes** de reservar los créditos. Después ya no sale sola.
- **Cómo se recuerda:** por tienda y dispositivo, en el almacenamiento local, con try/catch (si no hay almacenamiento, sale cada vez, sin romper nada). Un enlace «Cómo funciona» en la ficha la vuelve a abrir. Cuando se abre así, no pide confirmar nada, solo cierra.
- **Qué muestra:** tres pasos cortos y una nota. Botones: «Entendido, retocar» (sigue al pedido normal) y «Ahora no» (cierra sin pedir nada).
- **Textos propuestos** (en la voz de Deslizapp, sin signos de exclamación y sin palabras corporativas; puedes ajustar el ritmo, pero no el fondo ni inventar promesas):
  - Titular: «Retoque con ojo humano.» Remate (color de marca): «No lo hace una máquina sola.»
  - 1. «Pides.» «Reservamos los créditos; no se cobran hasta que la foto esté lista.»
  - 2. «Una persona la trabaja.» «Usa IA, pero escoge ella: la foto que se parece a tu marca y que conecta con tus clientes.»
  - 3. «Te avisamos.» «Te sale en el producto y ahí decides si te gusta.»
  - Nota: «Es una función en Beta. Tarda más que un filtro, y se nota en el resultado. Si una foto no sale como debe, te devolvemos los créditos.»
  - Si hay un tiempo estimado, ponlo en una constante de `lib/config.ts` (`TIEMPO_RETOQUE_TEXTO`) y no lo muestres si está vacía. **No inventes un número**; Lewis lo fija.
- Funciona igual en la demo (sin Supabase) y respeta el modo oscuro/claro que ya tenga el panel. No se muestra en Ver como (es solo mirar).

## 4. Tienda de ensayo (datos, no migración)

Una tienda falsa para que Lewis y los Coding prueben sin tocar Esencias Michel. **Es dato real en la base real, así que no va en el repo ni en `supabase/migrations/`** (regla de `docs/00`).

- **Antes:** confirma con `list_migrations` que nada se está aplicando y mira la estructura de `tiendas`, `miembros`, `productos`, `planes` y créditos, no adivines columnas.
- Crea con SQL (primero ensáyalo en `BEGIN; … ROLLBACK;`): una tienda llamada «Tienda de ensayo» (nombre y slug claros), **no publicada ni visible en ningún listado**, con Lewis (`bautistalewis.bl@gmail.com`, busca su `user_id` en `auth.users`) como `dueno` en `miembros`. **No escribas ese correo en ningún archivo del repo.**
- Un plan cualquiera de los existentes, 1 o 2 productos inventados (con foto de ejemplo, no de otra tienda) y unos 20 créditos con `admin_ajustar_creditos` (o la función que haya), para que el movimiento quede en `registro_admin`.
- Dime en el PR/resumen: el `id` de la tienda y su slug, para poder borrarla luego. **No se borra sin que Lewis lo pida.**
- Si alguna parte necesita saltarse una regla (por ejemplo, una función que exige ser admin), no la evites: dilo y para.

## 5. Pruebas y cierre

- Prueba en demo y en la tienda de ensayo: aparece la etiqueta; primera vez sale la bienvenida; «Ahora no» no reserva; «Entendido, retocar» sí; la segunda vez no sale sola; «Cómo funciona» la reabre.
- `tsc`, tests, lint y build sin errores nuevos. Los scripts de regresión que tocan la ficha.
- Novedad en el panel solo si el proyecto ya publica novedades por cambios así (mira cómo se hizo con la 0.36.0; no la inventes).
- Si todo pasa: squash a `main`. Si algo falla o tomaste una decisión que no estaba aquí, deja el PR abierto con la preview y dilo.
- Resume en español, corto: qué cambió, el `id` de la tienda de ensayo, y qué debe mirar Lewis.
