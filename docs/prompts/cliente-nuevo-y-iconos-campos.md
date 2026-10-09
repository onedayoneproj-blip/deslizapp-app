# Cliente nuevo (avatar emoji + nota) y iconos en todos los campos

Referencia aprobada por Lewis: `referencias/cliente-nuevo-nota/` (4 pantallas; canvas https://claude.ai/artifact/98UwZvbCAXJe9ynSREXUQ5). Planning te enviará ajustes de Lewis para este PR; trátalos como encargo suyo y ejecútalos.

## Parte 1: iconos (glifos) en los campos de texto, en TODA la app
Lewis aprobó que los campos de texto lleven un icono a la izquierda. Debe ser el mismo en todas las pantallas (regla de docs/09: todos los campos se ven iguales).
- El componente central es `components/ui/campo.tsx` (`Campo`, ya tiene `prefijo`). Añade la prop `icono` (un ReactNode del set de `components/iconos.tsx`; añade los glifos que falten con el mismo trazo).
- Medidas: icono 22 px, trazo 2 px, redondeado, color `texto-secundario`, a 18 px del borde izquierdo; el texto del campo empieza a 52 px. `aria-hidden`, nunca reemplaza al rótulo (el rótulo de arriba se queda). Sin icono: textareas largos, campos con `prefijo` (RD$) y campos donde ningún glifo aporte; no inventes iconos decorativos.
- Haz primero una auditoría de TODOS los usos de `Campo` y de `<input>` sueltos (componentes de admin, catálogo, clientes, promos, equipo, unirse, marca, abono, buscadores, etc.) y propón en el PR la tabla «campo → icono». Guía: nombre de persona → persona; teléfono/WhatsApp → WhatsApp; buscar → lupa (ya existe); nombre de producto → etiqueta; cantidad/stock → #; fecha → calendario; enlace → cadena; código/cupón → etiqueta de descuento; correo → sobre; nota → lápiz. Los buscadores y campos que ya tienen su icono deben verse igual al resto.
- Actualiza docs/09-sistema-de-diseno.md (regla + medidas), la guía de /diseno (`app/diseno/guia.tsx`) y `docs/04-pantallas.md` donde aplique. Pruebas: que el icono no tape el texto ni cambie la altura del campo; contraste 3:1; foco igual que hoy. Capturas 360/390 de 4–5 pantallas distintas.

## Parte 2: hoja «Cliente nuevo» (y su edición, `hoja-cliente-nuevo.tsx`, `hoja-cliente-editar.tsx`)
Según `referencias/cliente-nuevo-nota/`:
- Arriba, centrado, el avatar grande (círculo ~112 px): iniciales por defecto; tocar abre la elección de **emoji + color de fondo** (cuadrícula de emojis comunes, 5 colores de la marca: crema, rosa, dorado, menta, durazno; opción «Aa» = iniciales). El avatar de cliente (emoji o iniciales con ese color) se usa en todo lugar donde hoy sale el avatar del cliente. Solo emoji, NO fotos. Guardar `avatar_emoji` y `avatar_color` en el cliente (migración si hace falta: sigue las reglas de AGENTS.md; avísame antes de aplicarla; usa Opus o pídeme cambiar de modelo para la migración).
- La **nota** deja de ser un campo: es una burbuja estilo nota de Instagram sobre el avatar (píldora muy redondeada con gotita y puntito abajo-izquierda, sombra única, fondo superficie). Tocarla abre la vista «Nota» (burbuja grande con cursor, contador «Solo tú la ves · N/60», botón Listo). El límite sigue siendo 60. Sin nota: la burbuja muestra el placeholder «Talla, gustos…». Fuera del formulario, mostrar la nota del cliente como esa burbuja donde hoy se muestra la nota (perfil del cliente).
- Quita la frase «Nombre y WhatsApp. Con eso basta.». La hoja mide lo que mide su contenido (sin la mitad vacía); el botón «Guardar cliente» va pegado debajo de los campos y queda a la vista con el teclado abierto.
- Campos Nombre y WhatsApp con icono (Parte 1).
- La nota nueva debe seguir encontrándose en el buscador de clientes como hoy.

## Entrega
Rama nueva desde main actualizado; PR separado por parte si es más claro (Parte 1 primero). Sin mergear (Planning mergea cuando Lewis diga). Tipos, lint, test, build, capturas 360/390, novedades/versión si el repo lo exige. Avisa a session_01BJDuA1NdKUg4YX64VNuQDv con send_message y trigger de respaldo.
