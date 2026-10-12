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

## Ronda 3 · Bloque 1 (12 oct, prototipo v4; `docs/prompts/crear-producto-ronda-3.md`)

Lewis se quedó con #112. Hecho sobre la rama (merge de `main` primero; la novedad pasa a 0.68.0):

- **Hoja, no pantalla completa:** `Hoja` cambia `pantallaCompleta`/`juntoACerrar`/`cerrarSutil` por la prop `historia` (`avance`, `alLadoDelTitulo`): borde en y=78 (`max(78px, barra de estado + 20)`), `radio-xl`, agarradera; fila 1 «Nuevo producto» + selector a la derecha (Fredoka 18), fila 2 barras + ✕ con círculo. Contenido en y=180.
- **«Atrás» abajo** a la izquierda del botón principal en todos los pasos (apagado en la foto, oculto en la celebración) y en las hojas de los opcionales junto a «Listo».
- **Foto:** «Tomar foto» y «Elegir de la galería» en una fila; con fotos, portada grande con «1/N», tira, «Hasta 10…», «Con foto se vende más.» al final y un hueco debajo para el retoque.
- **Preguntas:** títulos de 26 px; nombre sin texto de ejemplo; «Escribe tu precio»; el chip de presentaciones solo con precio; «Llega en …» en la tarjeta.
- **Por encargo:** `FilaInterruptor` (nueva, `components/ui/interruptor.tsx`) y `GrupoEleccion` (nuevo, `components/ui/eleccion.tsx`: píldoras que quedan en `marca-rosa`, 40 px) para «¿Cuándo llega?».
- **Celebración animada:** 3 corazones y 2 burbujas con `cel-vivo` (docs/08, excepción nueva); quieta con movimiento reducido.
- **Sin foto:** «Publicar» apagado con «Agrega una foto para publicar · Volver a la foto»; el reel dice «Sin foto» (fondo del hueco de la foto); «Guardar sin publicar» lo deja oculto. `validar` y `puedePublicar` aceptan sin foto solo si queda oculto (también al editar). Etiqueta «Sin foto» en la tarjeta del panel. Pruebas: `tests/hoja-producto.test.mjs` y `tests/plan-catalogo.test.mjs` (los ocultos no cuentan para el plan; `resumenDelPlan` no cambió).

### Lienzo vs construido (390×844 y 393×852; medidas en `docs/capturas/crear-producto/fidelidad/medidas-*.json`)

| Pieza | Lienzo 390×844 | Construido 390×844 | Construido 393×852 |
|---|---|---|---|
| Borde de la hoja | y=78, radio 28, agarradera 40×5 | y=78, radio 28, agarradera 40×5 | y=78 |
| Fila 1 (título / selector) | y=98, alto 28; Fredoka 20 / 18 | título y=100 (24 de alto, centrado en 98–126) | igual |
| Fila 2 (barras + ✕) | y=128; barras 4 px; ✕ 44 en x=330 | barras centro y=150; ✕ 44 en (330,128) | ✕ en (333,128) |
| Contenido | y=180 | y=180 | y=180 |
| Marco / tarjeta | 350×372 | 350×372 | 353×372 |
| Pregunta | y=570, Fredoka 26 | y=570, 26 px | y=570 |
| «‹» + principal | 52 px en y=768 | 52 px en y=768 | y=776 (24 del borde) |
| Reel «así se ve» | 350×440 en y=212 | 350×438 en y=213 (390×488 × 0,897) | 353×442 |
| Celebración, titular | y≈520, Caveat 40 | y=520 | y=520 |

**Lo que difiere del lienzo y por qué:**
- Interruptor apagado en `borde-campo` (lienzo `#e7dcc8`): el del sistema de diseño, por contraste (3:1).
- En b2 el «‹» se ve encendido; el encargo dice «apagado en el primer paso»: va apagado en todo el paso de la foto.
- La burbuja blanca dice «¿Tienes en M?» solo si el producto tiene presentaciones (la del medio); si no, «¿Todavía hay?».
- Con un rubro con Detalles (Ropa en la demo), «Hazlo brillar» lleva una cuarta píldora y la fila se desliza.
- Miniaturas de 76 px con 8 px entre ellas (`TiraMedios` del sistema; lienzo 74/10).
- El hueco del retoque queda vacío (sin el texto de aviso del lienzo, que es una nota de diseño).
- Abajo, el pie respeta la zona segura del iPhone (`max(24 px, safe-area)`).
- A 390×844, al elegir «¿Cuándo llega?» el contenido se desplaza 6 px (las píldoras quedan justo sobre la barra).

## Ronda 3 · Bloque 2: presentaciones como historia + «Inventario» (12 oct)

Visto bueno de Planning al Bloque 1. Hecho:

- **Pasos** (`lib/historia-producto.ts`): con presentaciones, `foto → nombre → precio → cambia → eje1 → eje2 → vista` (7 barras; 6 con una sola cosa), sin paso de stock. `ordenDePreguntas` pone el color al final y `ordenParaGuardar`, primero (el Inventario agrupa por color con una fila por talla). `textosDeEje`: «¿Qué tallas hay?», «¿Y qué colores?», «¿Qué materiales hay?». Pruebas en `tests/historia-producto.test.mjs`.
- **Pantallas** (`historia-producto.tsx`): `TarjetaPresentaciones` 350×212, `QueCambia`, `ValoresDeEje` (sugeridos + «+ Otro» + atajos), `FotoDeCadaColor` y `HojaFotoDeColor` (elige entre las fotos del producto con `SelectorFotos`, ahora exportado), resumen «Inventario · … · Editar».
- **Hoja «Inventario»** (`inventario-historia.tsx`): `HojaInventarioHistoria` (encima, `hueco={118}`), `CuandoLlega` (compartido con el paso de stock), detalle con la `HojaPresentacion` de siempre (`atras`: «‹» + «Listo», `Cantidad redonda`, elecciones rosas). Las cantidades usan `crearTodas`, `ponerATodas`, `resumenDe`, `unificarPrecios` de `lib/presentaciones.ts`; el guardado es `useGuardarProducto` (sin cambios). El `FlujoPresentaciones` de dos pasos ya no se usa al crear; editar sigue igual.
- **Reglas:** cerrar sin «Listo» conserva y «Seguir» reabre; nunca a «Así se ve» con 0 (salvo por encargo con plazo); cambiar valores conserva lo que sigue, lo nuevo en 0 y quitar con cantidades pregunta; «Foto de cada color» sin fotos apagada con pista; atrás del teléfono cierra primero la hoja de encima; máx. 2 cosas, 12 valores, 144.
- Nuevos o ampliados: `Eleccion` (`deshabilitada`, `accion`), `FilaInterruptor` (`detalle`), `Cantidad redonda`, `Hoja` (`hueco`), `BotonAtras` en `boton-atras-historia.tsx`. `lib/colores.ts` suma «Rosado» y «Bosque».

### Lienzo vs construido, Bloque 2 (390×844; a 393×852 igual con 3 px más de ancho; `medidas-presentaciones-*.json`)

| Pieza | Lienzo | Construido |
|---|---|---|
| Barras | 7 (5 sin presentaciones) | 7; 4.ª llena en P1, 5.ª en P2, 6.ª en P3/P4, 7.ª en P5 |
| Tarjeta P1–P4 | 350×212 en y=180 | 350×212 en y=180 (353 a 393) |
| Pregunta P1–P3 | y≈406, Fredoka 26 | y=406 |
| «‹» + Seguir | y=768 | y=768 (776 a 852) |
| P4 | desplazado 150, resumen «6 presentaciones · 21 en total · Editar» | igual (64 px de alto, «Editar» secundario) |
| Hoja «Inventario» | borde y=118, título Fredoka 22 en y=134, ✕ 44 | borde y=118, título (24) y ✕ en y≈141–149 (cabecera de siempre: 7 px más abajo) |
| Filas Inventario | encargo y≈230 (52), precios (56), «Poner a todas» (52), grupo con cabecera 36 y filas 46 | 227 / 287 / 351; cabecera 36, filas 46, − + de 34 |
| Pie Inventario | «‹» + «Listo · 21 en total» / «Listo · por encargo» | igual |
| I3 detalle | hoja inferior desde y≈348 | desde y≈201: la `HojaPresentacion` de siempre (lleva también «Quitar» y el rótulo del precio) |
| P5 | reel con «Desde RD$…» y «Ver presentaciones» | el reel real: «RD$1,450 · 2 colores · 3 tallas» y «Ver presentaciones ›» |

**Diferencias y por qué:** los colores sugeridos son los de siempre (11, de `valoresSugeridos`), así que la pantalla de colores es más larga que la del lienzo (Crema/Bosque se escriben con «+ Otro»); con 2 cosas elegidas las demás se ven igual que en el lienzo y tocarlas explica el máximo (en vez de apagarlas); el detalle reutiliza la hoja de editar (más alta, con «Quitar»); el reel dice el precio como el catálogo (si todas valen lo mismo, sin «Desde»). Con una sola cosa son 6 barras.

## Revisiones de Codex y auditoría de transiciones (12 oct)

Codex revisó 5b87125, efd9713 y f063507; todo lo válido quedó corregido con pruebas: el plan cuenta el recién publicado al tocar «Agregar otro» (`conLosCreados`), las quitadas no vuelven por cambios ajenos (`quitadasTrasCambiar`), quitar un valor descarta sus cantidades, precios y foto, el último catálogo se guarda solo al crear, y quitar una cosa suma las cantidades en lo que queda (`juntarPorEjes`, `quitarEje`).

Después, a pedido de Planning, una auditoría de **todas** las transiciones de las presentaciones en la historia (resultado en `docs/04-pantallas.md`, «Transiciones»):

| Transición | Cantidades | Precio propio | Foto del color | Quitadas a mano | Prueba |
|---|---|---|---|---|---|
| Quitar valor | pregunta y se pierden | pregunta y se pierden | se va | quedan registradas | auditoría |
| Reintroducir valor | 0 | ninguno | sin foto | vuelven | auditoría + unitaria |
| Sumar valor | se conservan; lo nuevo en 0 | se conservan | se conservan | siguen quitadas | Codex P2 + unitaria |
| Quitar cosa | se suman | solo si todas iguales | la del color se guarda pero no se usa | junta quitada solo si todas | auditoría + unitarias |
| Sumar cosa | pregunta y vuelven a 0 | pregunta y se quitan | se conservan (por color) | siguen quitadas en cada combinación; las ocultas, ocultas | auditoría completa + unitaria |
| Quitar todas y elegir otra | pregunta y vuelven a 0 (la misma: se conservan) | igual | — | siguen quitadas | auditoría completa |
| Quitar todas y volver | pasan al stock del producto | — | — | se limpian | auditoría (‹ y teléfono) |
| Por encargo on/off | escondidas, no perdidas | se conservan | se conservan | se conservan | auditoría |
| ✕ del Inventario / atrás-adelante | se conservan | se conservan | se conservan | se conservan | auditoría + bloque principal |
| «Agregar otro» | historia limpia | — | — | — | auditoría |
| Quitar presentación y tocar valores/cosas | — | — | — | ver filas de arriba | auditoría + Codex P2 |
| Atajos de valores («Única», «XS a XL») | pregunta como quitar valor | pregunta | se va | como quitar valor | Codex P2 (5.ª) |

Auditoría completa (Planning, tras la 5.ª revisión): rutas revisadas — atajos, alternar valor, quitar y ocultar en el detalle, cambiar valores del primer eje, «Poner a todas» (solo las visibles), precio propio y «Cada una tiene su precio» apagado (vuelven al precio del producto con aviso), encargo on/off, atrás y volver a cambiar, sumar y quitar cosas, quitar todas y elegir otra. Hallazgos corregidos: sumar una cosa resucitaba lo quitado y mostraba lo oculto; quitar todas las cosas y elegir otra distinta perdía las cantidades sin aviso; guardar ahora vuelve a exigir el Inventario completo. Regla: las ocultas no cuentan unidades.

## Decisiones fuera del encargo (o donde había que elegir)

- **Seguir sin foto:** se puede; desde la ronda 3, sin foto solo se guarda oculto (regla de Lewis), también al editar.
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

- Ronda siguiente: tarjeta «¿Quieres que Deslizapp retoque estas fotos?» en el paso de fotos (sección 7, falta diseño).
