# Handoff · Crear producto «como una historia» (PR 1)

Encargo: [docs/prompts/crear-producto-historia.md](../prompts/crear-producto-historia.md). Referencia: [referencias/crear-producto/](../../referencias/crear-producto/LEEME.md). Comportamiento vigente: [docs/04-pantallas.md](../04-pantallas.md) («Crear producto (historia)»). Rama `feat/crear-producto-historia`. PR 2 (varias presentaciones dentro de la historia) va en una rama nueva desde `main` cuando el 1 esté fusionado.

## Qué se hizo

- `/catalogo/nuevo` monta `HistoriaProducto` (`components/catalogo/historia-producto.tsx`): foto → nombre (y catálogo, si hay varios) → precio → cuántos tienes / cuándo llega → así se ve (reel real, opcionales, Publicar) → celebración. Lógica pura en `lib/historia-producto.ts` (pasos, textos, «¿Cuándo llega?», celebración) con `tests/historia-producto.test.mjs`.
- **Editar** (`/catalogo/[id]/editar`) sigue con `HojaProducto`. El guardado se extrajo a `useGuardarProducto` (`components/catalogo/guardar-producto.tsx`): validar, bienvenida del retoque, crear en una llamada, foto de cada color, ficha técnica y taller. La hoja (crear y editar) y la historia lo usan; no hay lógica de guardado duplicada. `variantesParaGuardar` y `agregarFotoAlBorrador` (fotos de color) también son compartidas.
- Piezas nuevas o ampliadas: `Hoja` acepta `juntoACerrar` (las barras junto a la ✕, con `tituloOculto`); `Cantidad grande` (56 px, en `/diseno`); `SeccionMedios` acepta `historia` (solo la tira; sin fotos, «Tomar foto» con `capture="environment"` y «Elegir de la galería»). `HojaColeccion` se exporta para reusarla.
- **Reel solo:** `/vista-previa-reel` (`app/vista-previa-reel/`, `components/catalogo/reel-solo.tsx`) monta únicamente `Reel` con `catalogo.css` y el tema, llenando un marco 4:5 sin cabecera ni pestañas. No se tocó `components/tienda/` ni `app/tienda/catalogo.css` (otra sesión trabaja ahí); el CSS propio de esa vista va en `app/vista-previa-reel/reel-solo.css`.

## Correcciones de Lewis antes del PR (mensajes de Planning, 11 oct)

1. La barra fija de abajo ya no tapa contenido: el cuerpo deja su alto de relleno y, a 844 px de alto, los opcionales del paso 5 quedan sobre «Publicar» sin desplazar (el reel se ajusta con `dvh`). Comprobado en el script.
2. El reel de «Así se ve» es solo el reel, sin cabecera, llenando su marco 4:5 (hasta 352×440).
3. «Con foto se vende más.» a mano (`mano`, `atencion-texto`) junto al marco del paso 1; «así se verá» solo en los pasos 2–4.
4. La tarjeta «así se verá» es 4:5 con la foto en `cover` en los pasos 1–4 (también con fotos horizontales y verticales) y su tamaño sale de `dvh`, así el teclado no la cambia; a 360×640 caben la tarjeta, el campo y «Seguir». La foto de la celebración también es 4:5.
5. La tarjeta de retoque del paso de fotos (sección 7 del encargo) queda para otra ronda: `SeccionMedios` en modo historia deja sitio debajo de la tira, sin cambiar la marca por foto de hoy.

## Decisiones fuera del encargo (o donde había que elegir)

- **Seguir sin foto:** se puede, y también publicar sin foto (la base lo acepta). Al editar, «Guardar cambios» sigue pidiendo foto como siempre.
- **Catálogo:** en el mismo paso del nombre (pastillas `Opcion` + «Vendo otra cosa también»), no en un paso propio.
- **Campos:** el nombre y el precio usan el `Campo` de siempre (docs/09: todos los campos se ven iguales), no uno más grande.
- **Tarjeta «así se verá»:** nombre en Fredoka del panel, no la letra del tema de la tienda (esas fuentes solo se cargan en el catálogo); el reel del paso 5 sí lleva la del tema.
- **Por encargo** guarda stock 0 (el chip dice «no llevo stock») y «Llega en …» con la opción rápida.
- **Detalles** sale como opcional si el producto va en el catálogo principal y su rubro tiene campos (los Detalles se validan con el rubro principal); antes un producto nuevo no los pedía.
- **Compartir mi catálogo:** comparte si el catálogo está publicado; abre la hoja de publicar si está «sin catálogo»; en los estados del equipo (solicitado, armando…) no aparece.
- **Celebración sin publicar:** «¡Quedó guardado!» y una línea; sin «Van N de 5».

## Pruebas

Con `npm run build && npm start` (modo demo; el indicador de Next en `dev` tapa «Atrás»):

- `node scripts/probar-crear-producto.mjs` (360/390/430 y 360×640): 214 comprobaciones, todo bien.
- `npm test` (597), `npm run tipos`, `npm run lint` (0 errores; las advertencias son de archivos que no se tocaron), `npm run build`.
- Adaptados a la historia y pasando entero: `probar:teclado` (hasta su bloque final de la guía de Inicio, ver abajo), `probar:presentaciones` (186), `probar:hoja-producto` (92, ahora sobre editar), `probar:producto` (348), `probar-mi-marca` (68), `probar-equipo` (63), `probar-ficha` (78), `probar-selector-tiendas` (45), `probar-selector-general-agregado` (40). Ayudas comunes en `scripts/historia-crear-producto.mjs`.
- Fallan igual en `main` (comprobado con `main` en otro puerto) y no son de este cambio: `probar-teclado` (bloque final «Minimizar»: el botón se llama «Minimizar la guía»), `probar-onboarding-checklist`, `probar-retoque-al-subir` caso 6 (sube un video con `VIDEO_PERMITIDO = false`), `probar-tipo-de-producto` (título del catálogo), `verificar-boton-crear-flotante` (6). Las partes de crear de `probar-tipo-de-producto` se adaptaron y pasan corriéndolas sin detenerse en el fallo previo.
- **No probado:** Safari de iPhone físico (teclado real, cámara de «Tomar foto», hoja nativa de compartir), Supabase real (la demo no toca la base).

Capturas: [docs/capturas/crear-producto/](../capturas/crear-producto/).

## Pendiente

- PR 2: varias presentaciones dentro de la historia (sección 4 del encargo).
- Ronda siguiente: tarjeta «¿Quieres que Deslizapp retoque estas fotos?» en el paso de fotos (sección 7, falta diseño).
