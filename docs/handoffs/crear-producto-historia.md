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

## Después de abrir el PR (#112)

- Planning: la barra de abajo ahora es sólida (fondo de la hoja, de lado a lado, `linea` arriba) y el aviso de catálogo lleno va completo dentro de ella, encima de «Publicar»; comprobado a 360, 390, 430 y 360×640. El reel del paso 5 no baja de 272×340 (a 360×640 se desplaza en vez de apretar su texto).
- Codex: «Otro» de «¿Cuándo llega?» se conserva al apagar y volver a prender el encargo; por encargo, las presentaciones también se guardan con stock 0.

## Bloque 1: fidelidad al prototipo (12 oct, Lewis vía Planning)

Lewis probó el preview y pidió que se vea **exactamente** como el lienzo (`referencias/crear-producto/capturas/b1…b6`), con una excepción: el catálogo en la cabecera. La regla «todo 4:5» del 11 oct quedó anulada. Hecho:

- Hoja a pantalla completa (`pantallaCompleta`, ✕ sin círculo), barras de 4 px separadas 4 px; el selector de catálogo (compacto) en la fila de las barras, a la izquierda; recuerda el último catálogo en el que se creó por tienda (`leerCatalogoAlCrear` / `guardarCatalogoAlCrear`).
- Tarjeta de las preguntas 350×372 de margen a margen, igual y en el mismo lugar en los 4 pasos; no se encoge (en pantallas cortas se desplaza y el campo enfocado queda sobre la barra: la `Hoja` suma `scroll-padding-bottom`).
- Título Fredoka 28, ayuda 15, `Campo grande` (56 / precio 64 con cifra de 32), `Cantidad grande` redonda (56, número de 44), `Chip` para «Tiene tallas o colores», «Es por encargo» y los opcionales. Textos exactos del lienzo.
- «así se ve en tu catálogo»: el reel real armado a 390×488 y reducido en proporción (350×438 a 390 px), sin salirse ni cortarse. «Publicar» a lo ancho y «Guardar sin publicar» debajo, como el lienzo (sin «‹»: atrás es el del teléfono).
- Con 0 unidades (y sin «por encargo») no se sigue: la vista previa no dice «Agotado» al crear.
- Celebración 230×290 con las formas del lienzo y una sola línea «… ya se puede deslizar. Van N de 5 para arrancar.»; los botones en la barra.

Lo que difiere del lienzo y por qué: «Seguir sin foto» (terciario) y «Con foto se vende más.» dentro del marco del paso 1 (decisión del encargo y pedido anterior de Planning); con varios catálogos, el selector acorta las barras; el pie respeta la zona segura del iPhone (`max(28 px, safe-area)`).

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
