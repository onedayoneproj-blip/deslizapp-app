# Handoff para Planning — selector, «De todo» y vista General

Coding, 10 oct 2026. Rama `fix/selector-catalogo-general-agregado`, desde `main` `614297f941354104451fc18e6230dc815510f277` (squash de #96). PR y commit: se completan tras publicar la rama y abrirlo.

## Cambios por comportamiento

### 1. Cierre al desplazarse

- `MenuFlotante` cierra al recibir scroll fuera de su tarjeta. Devuelve el foco al disparador sin mover la página.
- El scroll que nace dentro del menú no lo cierra. `overscroll-contain` evita que el gesto interno se encadene al scroll de la página al llegar a los extremos.
- El componente se usa en el selector de Catálogo y en la hoja de producto; ambos comparten el cierre por scroll.

### 2. Rubro físico «General» → «De todo»

- El rubro guardado sigue siendo `general`. `nombreCatalogoPanel` lo presenta como «De todo» en los selectores de la pestaña y de la ficha.
- Las claves existentes de `localStorage` no se migran ni cambian de significado: el valor `general` sigue seleccionando el catálogo físico. Sus productos y selección permanecen asociados al mismo rubro.
- `NOMBRE_TIPO` y los datos de tienda/producto no se modifican; no hubo migraciones ni escrituras de producción.

### 3. «General» agregado

- Se añadió la opción virtual `__general_agregado__`, distinta del rubro físico `general`, al selector de la pestaña Catálogo cuando hay más de un rubro.
- Filtra todos los productos una vez por `id`. El conteo de la opción también cuenta IDs únicos. No crea un catálogo ni altera relaciones guardadas.
- La selección virtual se guarda en la misma clave local de selección, con su sentinel separado. Si se crea un producto desde esa vista, el formulario usa el rubro principal real porque «General» no es un rubro asignable.
- La hoja de producto ofrece rubros asignables como antes; muestra el rubro físico `general` como «De todo» y no ofrece la vista virtual.

## Validación ejecutada

- `npm run tipos`: pasó.
- `node --test tests/selector-catalogos.test.mjs`: 8/8 aprobadas; cubre separación de nombres/claves, selección persistida, agregado, deduplicación por ID y rubro inicial de producto nuevo.
- `npm test`: 77/77 archivos de prueba aprobados.
- `npm run lint`: cero errores y 32 avisos preexistentes; los archivos afectados no agregan avisos.
- `CHROMIUM_PATH=/usr/bin/chromium URL=http://127.0.0.1:3000 npm run probar:selector-general`: aprobado a 360 y 390 px. La fixture local incluye rubros Ropa, Accesorios, General y Hogar vacío, además de un producto repetido con el mismo ID. Pasaron apertura, opciones y selección, persistencia de De todo y General, contenido/deduplicación, ficha de producto, scroll interno, cierre al desplazarse la página, catálogo vacío y errores JavaScript: cero.
- `npx next build --webpack`: pasó compilación, TypeScript, generación estática y trazas.
- `npm run build` (Turbopack predeterminado) no terminó en este entorno: la transformación de `app/tienda/fuentes.css` falla al crear un proceso/enlazar un puerto (`Operation not permitted`). Un intento inicial sin permisos de red tampoco pudo descargar las tres fuentes de Google. El build Webpack terminó correctamente.

## Datos y límites

La reproducción con productos asociados a más de un catálogo usa una fixture aislada en el `localStorage` demo. El esquema actual guarda un solo `rubro` por producto; la deduplicación se probó con dos representaciones de fixture con el mismo ID. No se consultó ni modificó producción, Supabase o datos de tiendas reales.

La prueba de navegador es Chromium con viewport/touch simulado, no Chrome Android físico, Safari/iPhone ni PWA instalada. Planning/Lewis deben validar en un teléfono: abrir y elegir opciones; confirmar que el rubro que antes decía General aparece como «De todo» y conserva sus productos; elegir «General» y comprobar todos los productos sin repetir; abrir el selector en la ficha; desplazar la página para cerrarlo y recorrer internamente el menú en una pantalla baja. Revisar también que «+ Producto» desde la vista agregada proponga el rubro principal.

## Revisión de Planning

- Confirmar que el nombre «De todo» se aplica a cada selector de rubros del panel donde el rubro real es `general`, mientras «General» queda reservado a la vista agregada.
- Confirmar que usar el rubro principal para un producto nuevo desde la vista agregada es la opción esperada.
- Comprobar el scroll y los nombres en Safari/iPhone y modo instalado antes de integrar.
