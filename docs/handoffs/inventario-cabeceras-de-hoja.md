# Inventario · cabeceras de hoja (✕ a la izquierda o a la derecha)

Encargo de Planning (13 oct 2026), puesto **Coding**, solo inventario: este documento no toca código. Lewis quiere acercar `components/hoja.tsx` a la lógica de Apple (iOS 26):

- Hojas que **confirman o guardan** algo → ✕ a la **izquierda**; a la derecha puede haber una acción de cabecera (Editar, Compartir, ⋯).
- Hojas de **solo lectura o de elección** → ✕ **sola a la derecha**.
- Los botones principales (Guardar, Publicar, Registrar, Seguir) **se quedan abajo** (teclado y pulgar).
- Hoy la ✕ está siempre a la derecha, salvo en la historia de crear producto, que se cambia aparte (`docs/prompts/crear-producto-cerrar-y-publicar.md`).

> **Decidido por Lewis, 13 oct** (vía Planning, mensaje sobre #121):
> - **D1.** Los detalles con acciones siguen la lógica de Apple: ✕ a la izquierda; a la derecha, la acción principal **en texto** («Editar») y, si hay más acciones, un **«⋯» con menú**. Las destructivas (Borrar, Cancelar pedido…) van **siempre dentro del «⋯», en rojo**. Detalle de promo: «✕ Promo   Editar ⋯». Si un título largo no cabe a 360 px, **elipsis; no se sacrifican acciones**. Ver «Detalles con acciones de cabecera».
> - **Pilas: máximo dos hojas.** La tercera se convierte en una **pantalla interna** de la segunda (como `alVolverInterno`); en la pantalla interna la izquierda de la cabecera muestra **«<»** (vuelve a la pantalla anterior de la misma hoja) en lugar de la ✕. Ver §1 y el lote 8.
> - Siguen sin empezar los lotes de código.

## Cómo se hizo (y qué no se pudo comprobar)

- Base: `main` en `f1d0820`. Se leyó el código de cada hoja; **no se ejecutó la app ni se midió nada en pantalla**.
- Hay **81 usos de `<Hoja`** en 51 archivos (sin contar `components/hoja.tsx`). Aquí aparecen en **73 filas**: las filas que agrupan varios usos son estados (cargando / error / final) de una misma hoja.
- Fuera de alcance, porque **no usan `components/hoja.tsx`**: las hojas del catálogo del comprador (`PanelCatalogo`, `components/tienda/dialogo.tsx`, reglas en `HANDOFF.md:86-91`), la `Alerta` (`components/ui/alerta.tsx`, diálogo centrado) y `AjustarFotoHistoria` (`components/catalogo/ajustar-foto-historia.tsx`, no usa `<Hoja`; cómo se presenta es dudoso).
- **Dudoso** = no se puede afirmar solo leyendo el código. Los anchos del apartado siguiente son **cuentas con las clases del código, no medidas**.

## Cómo es la cabecera hoy (`components/hoja.tsx`)

- Cabecera normal (`:874-881`): `flex items-center justify-between gap-3`; título `<h2>` a la izquierda (`min-w-0 font-display text-titulo-hoja`, **sin `truncate`**: un título largo baja a dos líneas) y `BotonCerrar` a la derecha (`:928-934`, `h-11 w-11` = 44 px).
- `tituloOculto` (`:875-876`): el `<h2>` es `sr-only` y la fila es `justify-end` (la ✕ sola a la derecha).
- `historia` (`:862-873`): fila 1 = título + `alLadoDelTitulo`; fila 2 = `avance` + ✕. Solo la usa crear producto.
- Cabecera arrastrable: `touch-none`, el gesto que empieza en ella mueve la hoja (`:744`); con ratón se ignoran `button, a, input, textarea, select, [role=tablist]` (`:786`).
- Otras ranuras de cabecera: `fijoArriba` / `<HojaFijoArriba>` (`:883-884`), `capaSuperior` (`:886-890`, decorativa por encima de la ✕).
- El alto de la cabecera se mide con `ResizeObserver` (`--cabecera`, `:431-441`) y el contenido arranca debajo (`pt-[calc(var(--cabecera,79px)+2px)]`, `:833`).

### Espacio junto al título a 360 px

Ancho útil de la cabecera = 360 − 2 × 20 (`px-5`, `:859`) = **320 px**. Separación `gap-3` = 12 px. ✕ = 44 px.

| Cabecera | Espacio del título | Aprox. de caracteres (Fredoka 24 px) |
|---|---|---|
| ✕ sola (izquierda o derecha) | 320 − 44 − 12 = **264 px** | ~20 |
| ✕ + 1 acción de icono (44 px) | 320 − 88 − 24 = **208 px** | ~16 |
| ✕ + 1 acción de texto («Editar», compacto, **~72 px: dudoso, no medido**) | ≈ **180 px** | ~14 |
| ✕ + 2 acciones de icono | 320 − 132 − 36 = **152 px** | ~12 |
| ✕ + «Editar» + «⋯» (D1, detalles) | 320 − 44 − 72 − 44 − 36 ≈ **124 px** | ~10 → **elipsis** (decidido: no se quitan acciones) |

Los caracteres suponen ~12–13 px por carácter en Fredoka 24 px (**dudoso, no medido**). A 390 px hay 30 px más; a 430, 70 px más. Con título que no cabe, hoy la cabecera crece a dos líneas; no hay `truncate`, salvo el `<span class="block truncate">` del nombre en `hoja-cliente.tsx:71-79`.

## Reglas de recomendación usadas en la tabla

- **R1 · Izquierda** si la hoja avisa al salir (`avisarAlSalir` / `useAvisarAlSalir`) o si su botón principal escribe en el servidor, envía o confirma algo irreversible.
- **R2 · Derecha** si es solo lectura, un selector/elección (incluido «Listo» o «Usar este» que solo aplica a un borrador del padre y no avisa), un menú o una navegación con vistas internas.
- **R3 · Estados** de carga y de error con «Reintentar» siguen la posición de la hoja real, para que la ✕ no salte cuando llegan los datos (`components/hoja-estado.tsx:6-8` dice que es la misma hoja). Un mensaje final sin acción de guardar («no vive aquí», «terminada») va a la derecha.
- **R4 · Cabecera** (D1, decidido por Lewis, 13 oct): ✕ izquierda; a la derecha la acción principal en texto («Editar») y, si hay más, «⋯» con menú. Nunca sube el botón principal de abajo (Guardar, Publicar, Registrar, Confirmar, Despachar…). Las destructivas van siempre dentro del «⋯», en rojo. El título lleva elipsis si no cabe. 

Abreviaturas de la tabla: **A** = `altura="auto"`, **G** = `"grande"`. «Aviso» = avisa al salir con cambios. «Cab.» = acciones que tendría la cabecera (0, 1 o 2) y qué hay de espacio.

## Tabla de hojas

Rutas relativas a `components/` salvo que se indique. Número de línea = donde abre `<Hoja`.

### Admin

| # | Archivo:línea · título | Qué es | Aviso | Acciones secundarias dentro hoy | Variantes de cabecera | Cab. | Recomendación |
|---|---|---|---|---|---|---|---|
| 1 | `admin/hoja-cuenta.tsx:42` «Tu cuenta» (A) | Menú / selector | No | «Cerrar sesión» como fila al final (`FilaCuenta`, `:60`) | — | 0 · 264 px | **Derecha** (R2) |
| 2 | `admin/pantalla-personalizar.tsx:262` «Letra de títulos» | Selector (aplica al borrador de la pantalla; la pantalla guarda con «Guardar cambios», `:256`) | No | «Como su marca» (terciario, `:277`) | `protegerAtras` | 0 · 264 | **Derecha** (R2) |
| 3 | `:284` «Opiniones» | Selector segmentado, aplica al borrador | No | — | `protegerAtras` | 0 · 264 | **Derecha** |
| 4 | `:305` «Colores» (`HojaColores`) | Editor que aplica directo al borrador | No | «Como su marca» por color (terciario compacto, `:321`) | `protegerAtras` | 0 · 264 | **Derecha** |
| 5 | `:346` «Cabecera» (G, `HojaCabecera`) | Formulario; «Usar esta cabecera» (`:363`) aplica al borrador de la pantalla | **Sí**, solo si el SVG cambió (`avisarAlSalir`, `:346`) | — | `protegerAtras` | 0 · 264 | **Izquierda** (R1) |
| 6 | `:383` `frase.nombre` (G, `HojaFrase`; el más largo: «Saludo de WhatsApp», 18 car., `lib/admin/personalizar.ts:30`) | Formulario; «Listo» (`:402`) aplica al borrador | **Sí** (`avisarAlSalir={cambio}`) | «Volver a la de siempre» (terciario, `:403`, restablece) | `protegerAtras` | 0 · 264 | **Izquierda** |
| 7 | `:427` «Orden en el catálogo» (G) | Editor de orden: arrastrar desde ⠿ o flechas por fila; aplica al borrador | No | Ordenar vive en cada fila, no es acción de hoja | `protegerAtras` | 0 · 264 | **Derecha**. No tiene botón «Listo» a la vista (dudoso) |
| 8 | `:488` título dinámico: «Opiniones de internet» → nombre del producto → «Nueva opinión» / «Editar opinión» (G, `HojaOpiniones`) | 3 niveles internos: productos → opiniones → formulario («Listo», `:540`) | No | «‹ Todos los productos» (terciario en el cuerpo, `:499`), «Editar» y «Quitar» por opinión, «Agregar opinión» | `protegerAtras`, `alVolverInterno` (`:488`), título cambia por nivel | 0 · 264 | **Derecha fija**: la ✕ no debe cambiar de lado entre niveles de la misma hoja. Apple pondría «‹» en la cabecera para volver (decisión, fuera de este encargo) |
| 9 | `admin/trabajo-fotos.tsx:103` «Referencia» | Solo lectura (foto grande) | No | — | — | 0 · 264 | **Derecha** |
| 10 | `:276` «Devolver la foto» | Formulario que confirma («Devolver»; no cobra) | **Sí** (`motivo` escrito y fase `listo`, `:276`) | Motivos rápidos como chips | `protegerAtras` | 0 · 264 | **Izquierda** |
| 11 | `admin/ficha-tienda.tsx:126` «Ajustar créditos» / «Pasar la tienda a otro dueño» (29 car.) | Formulario que lleva a una `Alerta` de confirmación | No | «Cancelar» + «Continuar» juntos al final (`:130`) | — | 0 · 264 | **Izquierda**. El título largo ya hoy baja a dos líneas |
| 12 | `admin/hoja-fotos-tienda.tsx:62` «Fotos de {nombre de la tienda}» | Solo lectura (galería) | No | «Bajar todas» (`:80`) y bajar cada foto (`BotonIcono` por foto, `:75`) | `protegerAtras` | 0 (o 1: «Bajar todas») | **Derecha**; no mover «Bajar todas». Título variable largo |
| 13 | `admin/pantalla-trabajo.tsx:224` «Mandar a revisar» | Formulario / confirmación (enlace + botón) | No (lo escrito en «Enlace» se pierde; dudoso si es deseable) | — | `protegerAtras` | 0 · 264 | **Izquierda** |

### UI compartida, inicio, instalar

| # | Archivo:línea · título | Qué es | Aviso | Acciones secundarias dentro hoy | Variantes de cabecera | Cab. | Recomendación |
|---|---|---|---|---|---|---|---|
| 14 | `ui/elegir-mensaje.tsx:48` «Elige el mensaje» (A) | Selector (cierra al elegir, `:52`) | No | — | Se apila (ver §1) | 0 · 264 | **Derecha** |
| 15 | `ui/funcion-en-preparacion.tsx:80` título por prop (ej. «Tu próxima jugada») | Solo lectura / aviso «Muy pronto»; «Listo, a esperar» cierra | No | — | `tituloOculto` (el título visible está en el cuerpo, `:90`) | 0 · ✕ sola | **Derecha**. Lo usan `clientes/contenido-resumen-clientes.tsx:79` y `/diseno` (`app/diseno/guia.tsx:611`) |
| 16 | `inicio/checklist-tienda.tsx:179` «Cuéntales quién eres» (G) | Formulario («Guardar», `:189`) | **Sí** (`useAvisarAlSalir` en `ProteccionBorrador`, `:194`) | — | `protegerAtras` | 0 · 264 | **Izquierda** |
| 17 | `pwa/hoja-instalar-app.tsx:61` «Tu tienda, a un toque» | Guía con «Ya lo hice» / «Instalar Deslizapp» (marca la guía como hecha, `marcar()`) | No | — | `protegerAtras` | 0 · 264 | **Derecha** (guía). Dudoso: «Ya lo hice» sí escribe una marca |

### Pedidos, crédito, equipo

| # | Archivo:línea · título | Qué es | Aviso | Acciones secundarias dentro hoy | Variantes de cabecera | Cab. | Recomendación |
|---|---|---|---|---|---|---|---|
| 18 | `pedidos/hoja-pedido-nuevo.tsx:52` «Editar pedido» (pedido cancelado o ajeno) | Mensaje final | No | «Volver a pedidos» | — | 0 | **Derecha** (R3, mensaje final) |
| 19 | `:67` «Nuevo pedido» / «Editar pedido #N» (G) | Formulario que guarda («Guardar pedido / venta / cambios», `:500`) | **Sí** (`useAvisarAlSalir`, `:186`) | Vistas internas cliente / productos / descuento con «‹» **dentro del cuerpo** (`selector-cliente.tsx:269`, `selector-descuento.tsx:139`) | **Sin `protegerAtras` ni `alVolverInterno`**: «atrás» del teléfono sale de toda la ruta (dudoso si es intencional) | 0 · 264 | **Izquierda** |
| 20 | `pedidos/hoja-pedido.tsx:76` «Pedido #N» (A) | Detalle por estado | No | «Editar pedido» (secundario, `:207`, usado en `:362,:381,:386`), «Cancelar pedido» (terciario peligro, `:212`), «Eliminar pedido» (cancelado, `:392`), tarjeta de factura (`:349`), descuento como vista interna (`:218`) | Sin `protegerAtras` ni `alVolverInterno` (dudoso) | 2 («Editar» + ⋯) | **Izquierda + «Editar» + «⋯»** (D1). «Cancelar pedido» (y «Eliminar pedido» si está cancelado) dentro del «⋯». Confirmar / Despachar / Reabrir se quedan abajo. Ver tabla de detalles |
| 21 | `pedidos/hoja-despachado.tsx:65` «Pedido despachado» | Celebración / solo lectura | No | «Avisarle a {nombre}» (`:172`) y «Volver a pedidos» (`:184`) | `tituloOculto`, `capaSuperior` (camión que cruza `-left-15` sobre la cabecera, `:71-80`), `decoracionAbajo` | 0 · ✕ sola | **Derecha** (no mover: el camión pasa por la cabecera; dudoso cómo se vería con ✕ a la izquierda) |
| 22 | `pedidos/acciones-factura.tsx:100` «Factura #N» (A) | Solo lectura (vista previa) + descargas | No | «PDF» e «Imagen» (`:116, :119`, son lo principal de la hoja). «Compartir» está en la tarjeta del pedido (`:96`), no en la hoja | — | 0 (1 posible: compartir) | **Derecha** |
| 23 | `equipo/hoja-equipo.tsx:35` «Tu equipo» (G) | Gestión: lista + formularios de invitación inline | No | «Invitar por enlace / por correo» (`:98`), por fila aprobar / cancelar enlace (`:257`), «Compartir» (`:289`), «Listo» (`:304`) | — | 0 · 264 | **Derecha** |
| 24 | `credito/hoja-detalle-abono.tsx:59` «Abono» (A) | Detalle | No | «Editar abono» (secundario, `:73`), «Borrar abono» (terciario peligro, `:76`) | Abre `HojaAbono` encima **sin cerrarse** (`:93`) | 2 («Editar» + ⋯) | **Izquierda + «Editar» + «⋯»** (D1). «Borrar abono» dentro del «⋯», en rojo. «Abono» cabe sobrado. Su «Editar abono» pasa a pantalla interna (lote 8) |
| 25 | `credito/hoja-abono.tsx:55` «Registrar abono» / «Editar abono» (A) | Formulario («Guardar abono / cambios», `:234`) | **Sí** (`useAvisarAlSalir`, `:114`) | — | — | 0 · 264 | **Izquierda** |

### Clientes

| # | Archivo:línea · título | Qué es | Aviso | Acciones secundarias dentro hoy | Variantes de cabecera | Cab. | Recomendación |
|---|---|---|---|---|---|---|---|
| 26 | `clientes/hoja-escribir-jugada.tsx:162` «Escribirle a {primer nombre}» (G) | Formulario que envía («Enviar por WhatsApp», `:226`; no se envía solo) | **No** (el mensaje editado se pierde al cerrar; dudoso si se quiere) | «Editar mensaje» (terciario, `:221`); `ElegirMensaje` como hoja encima | — | 0 · 264 | **Izquierda** |
| 27 | `clientes/hoja-resumen-clientes.tsx:117` título dinámico: «Tus clientes», «Tu próxima jugada», «{Grupo} · n», nombre (G) | Navegación entre vistas (lectura); sus acciones abren la hoja 26 | No | Filtrar cierra y filtra (`:109`) | `fijoArriba` con `BotonVolver` (`:119-122`), `decoracionEncima` (barrido), **título con cruce animado** (`CruceTexto`, `:114`); **no usa `alVolverInterno` ni `protegerAtras`**: maneja su propio historial (`:101-107`) | 0 · 264 | **Derecha**, no tocar (el cruce de títulos asume el título a la izquierda; dudoso) |
| 28 | `clientes/hoja-cliente-editar.tsx:19` «Editar cliente» (A) | Formulario («Guardar cambios», `:129`) | **Sí** (`:53`) | «Borrar contacto» (terciario peligro, `:136`); avatar y nota | — | 0 (⋯ opcional con Borrar) | **Izquierda** |
| 29 | `:141` «Borrar contacto» (A) | Confirmación (peligro) | No | «Cancelar» (`:181`) | Se apila sobre la 28 (§1) | 0 · 264 | **Izquierda** |
| 30 | `clientes/hoja-cliente.tsx:71` nombre del cliente (A) | Detalle | No | «Editar» (secundario compacto, `:127`), «Escribir» (WhatsApp, `:124`); avatar y nota abren Editar | Título `block truncate` (`:76`) | 1 («Editar»; sin ⋯) | **Izquierda + «Editar»** (D1). El nombre del cliente ya trunca (`:76`): con ~180 px la elipsis llega antes que hoy |
| 31 | `clientes/hoja-cliente-nuevo.tsx:24` «Cliente nuevo» (A) | Formulario («Guardar cliente», `:95`) | **Sí** (`:50`) | — | — | 0 · 264 | **Izquierda** |
| 32 | `clientes/avatar-y-nota.tsx:219` «Su avatar» (A) | Selector («Usar este», `:279`; devuelve al formulario padre, no guarda) | No | — | Se apila (28, 31) | 0 · 264 | **Derecha** (R2) |

### Promos

| # | Archivo:línea · título | Qué es | Aviso | Acciones secundarias dentro hoy | Variantes de cabecera | Cab. | Recomendación |
|---|---|---|---|---|---|---|---|
| 33 | `promos/hoja-promo.tsx:63` «Editar promo» / «Nueva promo» (G) | Estado: cargando / error con «Reintentar» (de la hoja 36) | No | «Volver a promos» | Hoja de ruta | 0 | **Izquierda** (R3) |
| 34 | `:73` «Promo» | Mensaje final («no vive aquí») | No | «Volver a promos» | — | 0 | **Derecha** |
| 35 | `:86` «Promo terminada» | Solo lectura | No | — | — | 0 | **Derecha** |
| 36 | `:95` «Editar promo» / «Nueva promo» (G) | Formulario («Guardar cambios» / «Crear promo», `:506`) | **Sí** (`useAvisarAlSalir`, `:139`; `useConfirmarSalida`, `:130`) | «Terminar promo» (texto rojo, `:512`, solo editando, con confirmación inline `ConfirmarFinPromo`, `:524`) | Hoja de ruta (`cerrar` = router) | 0 (⋯ opcional con Terminar) | **Izquierda** |
| 37 | `:302` «Nah, ah… así no.» (A) | Confirmación (cambiar de tipo → crear otra promo) | No | «Sí, crear otra promo» / «Me quedo con esta» | `alSalir` usa `confirmarSalida` (`:304-308`); apilada sobre la 36 | 0 · 264 | **Izquierda** (dudoso: también se lee como elección) |
| 38 | `promos/hoja-compartir.tsx:33` (cargando / error), `:42` (final), `:56` «Compartir promo» (G) | Formulario que envía («Enviar», `:158`); campo de mensaje | No | «Editar mensaje» / «Listo» (`:145`), «Exportar como imagen · PDF» (`:166`) | Hoja de ruta (`router.back` / `replace`, `:25-28`) | 0 (1 posible: Exportar) | **Izquierda** (`:33` por R3; `:42` derecha por ser final) |
| 39 | `promos/hoja-detalle-promo.tsx:39` «Detalle de promo» (G) | Detalle | No | «Editar promo» (`:103`) y «Compartir promo» (`:104`), o «Duplicar promo» si terminó (`:101`); botones de ancho completo al final | Navega por ruta (`router.push`, `:49`) | 2 («Editar» + ⋯) | **«✕ Promo   Editar ⋯»** (D1). «Compartir promo» va dentro del «⋯». El título pasa de «Detalle de promo» a «Promo» (así lo escribió Planning; hoy el título es `:39`). Si aun así no cabe, elipsis |

### Marca, pedido del catálogo

| # | Archivo:línea · título | Qué es | Aviso | Acciones secundarias dentro hoy | Variantes de cabecera | Cab. | Recomendación |
|---|---|---|---|---|---|---|---|
| 40 | `marca-tienda/hoja-mi-marca.tsx:42` «Mi marca» (G) | Formulario («Guardar mi marca», `:358`); con `soloMirar` es solo lectura (`:354`) | **Sí**, salvo `soloMirar` (`:168`) | — | — | 0 · 264 | **Izquierda**. En solo mirar la ✕ cambiaría de lado según el permiso: conviene dejarla a la izquierda siempre (decisión) |
| 41 | `pedido-catalogo/hoja-por-registrar.tsx:28` «Por registrar» (G) | Lista / selector (abre la 43) | No | «Volver a pedidos» si no hay nada (`:47`) | `protegerAtras`, `alSalir` | 0 · 264 | **Derecha** |
| 42 | `pedido-catalogo/tienda-en-pedido.tsx:207` «¿Eres la tienda?» (`HojaCompacta`) | Entrada / aviso para quien abre el pedido (comprobando, error, entrar, otra cuenta; `:147-186`) | No | «Cerrar» (`:183`), «Entrar con otra cuenta» | `protegerAtras`, `alSalir`. Se monta desde `tienda/pedido-comprador.tsx:384` (quién la ve exactamente: dudoso) | 0 · 264 | **Derecha** |
| 43 | `pedido-catalogo/registrar-solicitud.tsx:62` «Pedido del catálogo» (G) | Formulario («Registrar pedido», `:543`) | **Sí** (`avisarAlSalir={hayCambios}` con textos propios, `:69-71`) | «No es un pedido» (terciario peligro + `Alerta`, `:551`), «Usar a {nombre}» (aviso con acción) | `protegerAtras`, `alSalir`, `alVolverInterno` (vista cliente, `:72-76`); se apila sobre la 41 | 0 · 264 | **Izquierda** |

### Catálogo

| # | Archivo:línea · título | Qué es | Aviso | Acciones secundarias dentro hoy | Variantes de cabecera | Cab. | Recomendación |
|---|---|---|---|---|---|---|---|
| 44 | `catalogo/bienvenida-retoque.tsx:38` «Retoque con tu marca» (A) | Confirmación («Retocar foto», `:68`) | No | «Cancelar» (`:65`) | Se apila sobre 68 / 64 | 0 · 264 | **Izquierda** |
| 45 | `catalogo/ficha-medios.tsx:487` «Video» / «Portada» / «Foto» (A) | Detalle de un medio (edita el borrador del producto) | No | «Hacer portada» (`:516`), «Quitar foto / video» (terciario peligro, `:522`), «Retocar» (`:480`) | Se apila sobre 68 / 64 | 0 (⋯ posible) | **Derecha** |
| 46 | `:552` «Este dura {n} s» (A) | Selector de tramo («Usar este tramo») | No | — | — | 0 · 264 | **Derecha** |
| 47 | `catalogo/hoja-espera.tsx:39` nombre del producto / «Personas esperando» (G) | Lista → detalle (lectura; las acciones «Ya llegó» están en `TarjetaYaLlego`) | No | — | `protegerAtras`, `alSalir`, `alVolverInterno`, `fijoArriba` con `BotonVolver` (`:40`) | 0 · 264 | **Derecha** |
| 48 | `catalogo/inventario-historia.tsx:149` «Inventario» (G, `hueco={118}`) | Editor de stock dentro de la historia; «Cerrar sin Listo conserva todo» (`:69`) | No | Pie `‹` + «Listo · N» (`:207-211`) | `hueco`, `HojaFijoAbajo` + `PieFlotante`; se apila sobre la historia (64) | 0 · 264 | **Derecha** (aplica al borrador). Va junto con la historia (decisión) |
| 49 | `catalogo/hoja-historia.tsx:121` «Tu historia» (A) | Solo lectura (no escribe en la base, `:23`) | No | «Compartir» (principal, `:176`), «Ajustar» (píldora sobre la vista previa, `:140`) | — | 0 (Compartir es lo principal) | **Derecha** |
| 50 | `:193` «¿Dónde la compartes?» (A) | Selector | No | «Guardar la imagen» (terciario, `:212`) | Se apila sobre la 49 | 0 · 264 | **Derecha** |
| 51 | `catalogo/inventario-producto.tsx:221` «Ajustar inventario» (G) | Confirmación con motivo («Guardar», `:228`) | No (el aviso lo da el padre: `useAvisarAlSalir`, `hoja-producto.tsx:155`) | «Cancelar» (`:229`), «Revisar producto e historial» (`:227`) | Se apila sobre 68 / 69 | 0 · 264 | **Izquierda** |
| 52 | `catalogo/hoja-revisar-catalogo.tsx:51` «Revisa tu catálogo» (G) | Decisión (Publicar mi catálogo, `:81`) | No | «Pedir cambios» (secundario, `:91`), «Mejor no» | — | 0 · 264 | **Izquierda** |
| 53 | `catalogo/ficha-presentaciones.tsx:126` «¿Por qué baja el stock?» (A) | Confirmación con motivo («Guardar ajuste», `:138`) | No | — | Se apila sobre 68 | 0 · 264 | **Izquierda** |
| 54 | `catalogo/hoja-inventario.tsx:82` título dinámico («Tu inventario», «Por reponer», «Hacer espacio»…, «{Grupo} · n») (G) | Vistas: resumen (lectura), Por reponer, Hacer espacio (**oculta productos = escribe**, `vista-hacer-espacio.tsx:66`) | No | `‹ Tu inventario` en `fijoArriba` (`:91-97`) | `alVolverInterno` (`:86`) | 0 · 264 | **Derecha** (mezcla lectura y acciones; dudoso) |
| 55 | `catalogo/hoja-lo-que-vendes.tsx:46` «Lo que vendes» (A) | Formulario («Guardar», `:64`) | No | — | `alSalir`; se apila sobre 68 / 64 / 40 y `vista-catalogo.tsx:194` | 0 · 264 | **Izquierda**. Hoy no avisa aunque hay `cambio` (dudoso si importa) |
| 56 | `catalogo/hoja-pedir-catalogo.tsx:19` «¿Pedimos tu catálogo?» (A) | Confirmación («Sí, pedirlo») | No | «Ahora no» | **No se encontró ningún uso** en `components/` ni `app/` (grep) | 0 · 264 | **Izquierda** (si sigue existiendo; dudoso) |
| 57 | `catalogo/hoja-presentacion.tsx:88` título = punto de color + combinación («Rojo · M…») (A); `:70` hoja vacía cerrada | Formulario del borrador («Listo», `:181-184`) | No | «Ocultar esta presentación» (`:188`) / «Quitar» (`:201`), terciarios, «Cambiar / Elegir» foto | Variante `atras` (‹ + Listo, `:178-181`); **título variable de longitud libre** | 0 · 264 | **Derecha** (aplica al borrador sin aviso) |
| 58 | `:306` «Foto de cada color» / «Foto de cada {nombre}» (A, `HojaFotoColor`); `:302` vacía cerrada | Selector («Listo», `:361`) | No | «Cambiar / Elegir» por valor | Se apila sobre 59 | 0 · 264 (el título más largo ocupa dos líneas) | **Derecha** |
| 59 | `catalogo/flujo-presentaciones.tsx:446` «Qué cambia» / «Cuántas tienes» (G) | Flujo de 2 pasos que edita el borrador | **Sí** (`avisarAlSalir={cambios}`, `:451`) | «Atrás» (abajo, `:634`) | `fijoArriba` (Paso N de 2 + barras, `:452-460`), `HojaFijoAbajo` (`:620-647`); sin `alVolverInterno` (dudoso qué hace «atrás» del teléfono en el paso 2) | 0 · 264 | **Izquierda** |
| 60 | `catalogo/ficha-detalles.tsx:178` nombre del campo de detalle (A) | Formulario al borrador («Listo», `:241`) | No | «Quitar {nombre}» (terciario peligro, `:245`) | Título variable (dudoso el máximo) | 0 · 264 | **Derecha** |
| 61 | `catalogo/hoja-producto-filas.tsx:59` «Vista previa» (G) | Solo lectura (iframe `absolute inset-0`) | No | — | `tituloOculto` | 0 · ✕ sola | **Derecha** (la ✕ queda sobre un iframe oscuro; no se cambia) |
| 62 | `catalogo/hoja-catalogo-en-linea.tsx:42` «Tu catálogo en línea» (A) | Detalle / compartir | No | «Abrir catálogo», «Copiar enlace», «Compartir por WhatsApp» (`:66-79`), «Cambiar enlace» (`:84`) | — | 0 (Compartir 1 posible) | **Derecha**: las acciones son el contenido |
| 63 | `catalogo/hoja-publicar-catalogo.tsx:47` «¿Publicamos tu catálogo?» o «Tu catálogo tiene N productos» (hasta 28 car.) (A) | Confirmación (Publicar, `:81`) | No | «Ahora no» / «Agregar más» | Título dinámico (`lib/publicar-catalogo.ts:22-25`); se apila sobre 64 y `seccion-catalogo.tsx:169` | 0 · 264 | **Izquierda** |
| 64 | `catalogo/historia-producto.tsx:132` «Nuevo producto» (G, `historia`) | Historia que guarda | **Sí** (`useAvisarAlSalir`, `:267`) | — | `historia`, `protegerAtras`, `alSalir`, `alVolverInterno` (`:136`), `alLadoDelTitulo` | 1 (selector de catálogo) | **Fuera de este inventario**: lo cambia `docs/prompts/crear-producto-cerrar-y-publicar.md` |
| 65 | `:1041` «Foto de {v}» (A, `HojaFotoDeColor`) | Selector (‹ + Listo) | No | — | Se apila sobre la 64 | 0 · 264 | **Derecha** |
| 66 | `:1072` «Descripción» / «Ficha técnica» / «Detalles» (A o G, `HojaOpcional`) | Formularios al borrador (‹ + Listo) | No (el aviso lo da la historia) | — | Se apila sobre la 64 | 0 · 264 | **Derecha** |
| 67 | `catalogo/hoja-producto.tsx:70, :73, :76, :91` (cargando / error con reintentar) y `:80` (no vive aquí / eliminado) | Estados de la hoja 68 | No | «Volver al catálogo» | `protegerAtras`, `alSalir`; el título sigue a la 68 | 0 | **Izquierda** (`:70/:73/:76/:91`, R3) · **Derecha** (`:80`, final) |
| 68 | `:94` «Nuevo producto» / «Editar producto» / «Historial de ajustes» (G) | Formulario que guarda («Publicar» / «Guardar cambios», `:595`) | **Sí** (`useAvisarAlSalir`, `:303`, con textos propios) | «Vista previa» (secundario, `:592`), «Eliminar producto» (terciario peligro, `:603`), «Más opciones» (sección plegable, `:553`), «Historial» | `protegerAtras`, `alVolverInterno` (`historial.volver`), `fijoArriba` con «‹» al ver el historial (`:95`); el título cambia a «Historial de ajustes» | 1–2 (⋯ con Vista previa / Eliminar) | **Izquierda**. Cuando se vea el historial la ✕ debería seguir a la izquierda. El ⋯ llega en otro lote (`components/ui/menu-flotante.tsx` existe pero es un selector con chevron, no un ⋯) |
| 69 | `:120` nombre del producto (A, `HojaVistaProducto`) | Detalle | **Sí**, solo con stock sin guardar (`useAvisarAlSalir`, `:155`) | «Editar» (secundario, `:190`) y «Crear pedido» (principal, `:191`) en una fila de 2; interruptor «Visible»; stock y historial | `protegerAtras`, `alVolverInterno`, `fijoArriba` con «‹» (`:121`). **Título = nombre del producto, longitud libre** | 1 («Editar»; sin ⋯) | **Izquierda + «Editar»** (D1). «Editar» tiene que pasar por el mismo `confirmarSalida` (`:156-157`) que el botón de hoy. El título es el nombre del producto: elipsis |
| 70 | `:650` «Colección» (A) | Selector (+ «Agregar colección») | No | Campo de nombre con `autoFocus` | Se apila sobre 68 / 64 | 0 · 264 | **Derecha** |
| 71 | `:712` «¿Eliminar producto?» (A) | Confirmación (peligro) | No | «Cancelar», «Ocultar producto» | `alSalir`; se apila sobre la 68 | 0 · 264 | **Izquierda** |

### Panel

| # | Archivo:línea · título | Qué es | Aviso | Acciones secundarias dentro hoy | Variantes de cabecera | Cab. | Recomendación |
|---|---|---|---|---|---|---|---|
| 72 | `panel/hoja-plan.tsx:30` «Tu plan» (A) | Solo lectura + enlace a WhatsApp | No | «Escribirle a Deslizapp» (`:82`) | — | 0 · 264 | **Derecha** |
| 73 | `panel/menu-tienda.tsx:173` «Tu tienda» / «Tus tiendas» (A) | Menú / selector (Mi marca, Tu equipo, instalar, cambiar de tienda) | No | «Cerrar sesión» al final | Cierra y abre otra hoja (`cerrar(); abrirMiMarca()`, `:191`), no se apila | 0 · 264 | **Derecha** |

**Resumen del reparto:** izquierda = 28 filas (5, 6, 10, 11, 13, 16, 19, 25, 26, 28, 29, 31, 33, 36, 37, 38, 40, 43, 44, 51, 52, 53, 55, 56, 59, 63, 68, 71) más los estados de 67 y, si se acepta «✕ izquierda + Editar», 20, 24, 30, 39 y 69; derecha = el resto (hojas de lectura, selección, menú o con vistas internas). Con acción de cabecera: 20, 24, 30, 39, 69 (y 68 con ⋯ más adelante).

## Detalles con acciones de cabecera (D1, decidido por Lewis, 13 oct)

Regla: ✕ izquierda · derecha = acción principal en texto + «⋯» si hay más · destructivas solo dentro del «⋯», en rojo · título con elipsis. «Principal» = la que subiría a la cabecera; **no** es el botón principal de abajo.

| Detalle (sitio) | Acciones que hay hoy (archivo:línea) | Principal en cabecera | Iría al «⋯» | Se queda abajo |
|---|---|---|---|---|
| **Pedido** 20 (`pedidos/hoja-pedido.tsx:76`) | «Confirmar pedido» (`:359`, estado nuevo) · «Despachar pedido» (`:377`, por despachar) · «Editar pedido» (`:209`, usado en nuevo, por despachar y despachado, `:362,:381,:386`) · «Cancelar pedido» (`:214`, terciario peligro) · «Reabrir pedido» (`:390`, cancelado) · «Eliminar pedido» (`:393`, cancelado) · factura: descargar / compartir en `AccionesFactura` (`:349`) · descuento: fila que abre una vista interna (`:218, :323`) | **«Editar»** (no existe en cancelado: `:206`) | **«Cancelar pedido»** (rojo) y, en cancelado, **«Eliminar pedido»** (rojo) | Confirmar / Despachar / Reabrir; la tarjeta de factura |
| **Abono** 24 (`credito/hoja-detalle-abono.tsx:59`) | «Editar abono» (`:74`, secundario) · «Borrar abono» (`:77`, terciario peligro, con `Alerta` `:84-90`) | **«Editar»** | **«Borrar abono»** (rojo) | — (la hoja queda sin botones abajo) |
| **Cliente** 30 (`clientes/hoja-cliente.tsx:71`) | «Editar» (`:127`, secundario compacto; también lo abren el avatar y la nota, `:108-114`) · «Escribir» (WhatsApp, `:124`) · «Borrar contacto» vive dentro de «Editar cliente» (`hoja-cliente-editar.tsx:136`), no aquí | **«Editar»** | Nada (sin «⋯»). «Borrar contacto» sigue dentro de la hoja de edición | «Escribir» (acción de contenido) |
| **Promo** 39 (`promos/hoja-detalle-promo.tsx:39`) | «Editar promo» (`:103`) · «Compartir promo» (`:104`) · «Duplicar promo» (`:101`, solo si terminó; entonces no hay Editar ni Compartir) | **«Editar»** (si terminó: **«Duplicar»**, sin «⋯») | **«Compartir promo»** (no es destructiva, pero es la secundaria) | — |
| **Vista de producto** 69 (`catalogo/hoja-producto.tsx:120`) | «Editar» (`:190`, secundario) · «Crear pedido» (`:191`, principal de abajo) · interruptor «Visible en el catálogo» (`:171`) · stock y «Historial» (`:~176-184`, filas) · vista interna del historial / lista de espera (`:120-121`) | **«Editar»** | Nada (sin «⋯») | «Crear pedido»; interruptor y stock (son contenido) |

Notas:

- «Editar» debe seguir el camino de hoy: en el producto, `navegar` → `confirmarSalida` (`hoja-producto.tsx:156-157`); en el pedido, `Boton href` (`hoja-pedido.tsx:207-210`). Los «⋯» llaman a las mismas funciones que los botones actuales (`cancelar`, `setConfirmandoEliminar`, `setBorrando`), con sus `Alerta`.
- **Espacio:** con «Editar» + «⋯» quedan ≈124 px (~10 car.): «Pedido #1234» (12), «Abono» (5) y «Promo» (5) caben salvo pedidos de más de 4 cifras; el nombre de cliente o producto lleva elipsis. La hoja base hoy no trunca (`hoja.tsx:876`): la elipsis es cambio nuevo en el `<h2>` (solo en cabeceras con acción, o en todas, a decidir en el lote 0).
- **No existe** ningún «⋯» en el repo: `components/ui/menu-flotante.tsx` es un selector con chevron y opciones tipo radio (`menuitemradio`), no un menú de acciones. Hace falta un componente nuevo (con `aria-haspopup="menu"`, Escape, tocar fuera y foco), que ya pide `docs/prompts/crear-producto-cerrar-y-publicar.md` para «Publicar ⌄»; conviene compartirlo.
- En el pedido cancelado la cabecera quedaría con «⋯» solo (Eliminar), sin «Editar» (`hoja-pedido.tsx:206`).

## 1. Hojas apiladas y cómo se ve su cabecera

**Mecánica actual** (`components/hoja.tsx`): cada hoja se pinta en su propio portal en `<body>` (`:32-34, :233-234`), con su velo (`bg-velo`, `:806`) y `fixed inset-0 z-50` (`:805`). Solo la de arriba atiende Escape, Tab y «atrás» (`PILA_DE_HOJAS`, `:84, :609, :628`). El fondo se bloquea con un contador (`:94-109`). El comentario del archivo dice «máximo dos hojas apiladas» (`:41`), pero hay combinaciones de tres (abajo). Hoy cada una lleva su ✕ a la derecha: si la de arriba es `auto` y baja poco, se ve la franja superior de la de abajo con su ✕ atenuada por el velo (**dudoso: no se comprobó en pantalla**).

| Base (sitio) → encima (sitio) | Alturas | Cabecera hoy | Con la migración |
|---|---|---|---|
| Pedido 20 → Pedido despachado 21 (`hoja-pedido.tsx:398`) | A → A | ✕ derecha en ambas | 20 izq + Editar · 21 der |
| Pedido 20 → Factura 22 (`:349`) | A → A | ✕ derecha | 22 der |
| Pedido 20 → Abono (detalle) 24 → Editar abono 25 (`pago-del-pedido.tsx:209, :220`; `hoja-detalle-abono.tsx:93`) | A → A → A | **3 niveles**, ✕ derecha en las 3 | 20, 24 y 25 a la izquierda (misma esquina en las 3) |
| Cliente 30 → Editar cliente 28 (`hoja-cliente.tsx:167`) → Avatar 32 (`hoja-cliente-editar.tsx:133`) o Borrar contacto 29 (`:141`) | A → A → A | **3 niveles** | 30 y 28 y 29 izq (30 con Editar); 32 der |
| Cliente nuevo 31 → Avatar 32 (`hoja-cliente-nuevo.tsx:99`) | A → A | — | 31 izq · 32 der |
| Resumen clientes 27 → Escribir 26 (`hoja-resumen-clientes.tsx:126`) → Elegir mensaje 14 | G → G → A | **3 niveles** | 27 der · 26 izq · 14 der (la de abajo y la de arriba en esquinas opuestas) |
| Editar producto 68 → Colección 70, Vista previa 61, Motivo 53, Ajustar inventario 51, Eliminar 71, Lo que vendes 55, Detalles 60, Medio 45 / Tramo 46, Bienvenida retoque 44 | G → A o G | ✕ derecha | 68 izq; 51, 53, 71, 55, 44 izq; 70, 61, 60, 45, 46 der |
| Editar producto 68 → Flujo presentaciones 59 (`ficha-presentaciones.tsx:84`) → Presentación 57 / Foto de cada color 58 (`flujo-presentaciones.tsx:649, :680`) | G → G → A | **3 niveles** | 68 y 59 izq · 57 y 58 der |
| Vista de producto 69 → Ajustar inventario 51 (`hoja-producto.tsx:194`) | A → G | — | 69 izq + Editar · 51 izq |
| Historia 64 → Inventario 48 (`historia-producto.tsx:679`, `hueco=118`) → Presentación 57 (`inventario-historia.tsx:216`) | G → G → A | **3 niveles**; el hueco de 118 px deja ver la fila de título de la historia (`hoja.tsx:75, :72-73`) | 64 (cambia aparte) · 48 der · 57 der. Con la ✕ de la historia a la izquierda y la de Inventario a la derecha, las dos quedan en esquinas distintas (dudoso cómo se ve el hueco) |
| Historia 64 → Foto de color 65, Opcionales 66, Colección 70, Publicar 63 (`:750`), Lo que vendes 55 (`:677`) | G → A o G | ✕ derecha | 63 y 55 izq; 65, 66, 70 der |
| Promo 36 → «Nah, ah…» 37 (`hoja-promo.tsx:302`) | G → A | — | 36 izq · 37 izq |
| Por registrar 41 → Registrar solicitud 43 (`hoja-por-registrar.tsx:69`) | G → G | — | 41 der · 43 izq |
| Mi marca 40 → Lo que vendes 55 (`hoja-mi-marca.tsx:326`) | G → A | — | 40 izq · 55 izq |
| Tu historia 49 → ¿Dónde la compartes? 50 (`hoja-historia.tsx:193`) | A → A | — | 49 der · 50 der |
| Cuenta del cliente → Elegir mensaje 14 (`credito/cuenta-cliente.tsx:67`), Abono 25 (`:78`) | — | La pantalla donde vive `cuenta-cliente` no se leyó entera (dudoso si es hoja) | — |

No se apilan (se cierran antes de abrir la otra): el menú de tienda 73 → Mi marca / Equipo (`menu-tienda.tsx`), el checklist de inicio (`checklist-tienda.tsx:166-168`, una `hoja` a la vez) y las hojas de la pantalla de personalizar y de Trabajo (hermanas, no hijas).

**Lo que significa la migración para una pila:** hoy todas las ✕ están en la misma esquina; con la regla, una pila puede mezclar esquinas (p. ej. 27 der → 26 izq → 14 der). No es un fallo, pero conviene que Lewis lo vea en el teléfono antes de generalizar.

### Decidido por Lewis, 13 oct: máximo dos hojas

La tercera hoja se convierte en **pantalla interna** de la segunda. En la pantalla interna, la izquierda de la cabecera muestra «<» (vuelve a la pantalla anterior de la misma hoja) en lugar de la ✕; la ✕ solo está en la pantalla de entrada de cada hoja.

| Pila de tres de hoy | Pasa a | Archivos |
|---|---|---|
| Cliente 30 → Editar cliente 28 → **Su avatar 32** (`hoja-cliente-editar.tsx:133`) | 30 → 28 con «Su avatar» como pantalla interna de 28 | `clientes/hoja-cliente-editar.tsx`, `clientes/avatar-y-nota.tsx` (`HojaAvatar` pasa de `<Hoja>` a vista) y, por coherencia, `clientes/hoja-cliente-nuevo.tsx:99` (usa la misma pieza, aunque es una pila de dos) |
| Resumen clientes 27 → Escribir 26 → **Elegir mensaje 14** | 27 → 26 con «Elige el mensaje» como pantalla interna de 26 | `ui/elegir-mensaje.tsx` (hoy trae su botón y su `<Hoja>`, `:48`), `clientes/hoja-escribir-jugada.tsx`; la misma pieza la usan `credito/cuenta-cliente.tsx:67` y la guía `app/diseno/guia.tsx:389` (pilas de dos: pueden seguir como hoja o pasar a vista) |
| Pedido 20 → Abono 24 → **Editar abono 25** (`hoja-detalle-abono.tsx:93`) | 20 → 24 con el formulario de abono como pantalla interna de 24 | `credito/hoja-detalle-abono.tsx`, `credito/hoja-abono.tsx` (hoy `<Hoja>` + contenido, `:55`); `credito/pago-del-pedido.tsx:209, :220` y `credito/cuenta-cliente.tsx:78` usan `HojaAbono` aparte (registrar un abono nuevo: esas siguen siendo hoja) |

**Otras pilas de tres que Planning no nombró y siguen siendo tres** (hay que decidirlas; no las toco):

- **Borrar contacto 29** sobre Editar cliente 28 sobre Cliente 30 (`hoja-cliente-editar.tsx:141`): es la misma pila que la del avatar; si solo el avatar pasa a interna, la tercera hoja sigue ahí.
- **Editar producto 68 → Flujo de presentaciones 59 → Presentación 57 / Foto de cada color 58** (`ficha-presentaciones.tsx:84`, `flujo-presentaciones.tsx:649, :680`).
- **Historia 64 → Inventario 48 → Presentación 57** (`historia-producto.tsx:679`, `inventario-historia.tsx:216`).

## 2. Riesgos

1. **Gesto de cerrar.** La cabecera completa es zona de arrastre (`hoja.tsx:744`). Un botón nuevo dentro de ella arrastraría la hoja con el dedo igual que la ✕ de hoy; con ratón se ignoran los botones (`:786`), así que ahí no hay cambio. Las zonas táctiles deben ser ≥ 44 px (la ✕ lo es: `:930`). Prueba: `npm run probar:hojas-gestos`.
2. **`protegerAtras` y `alVolverInterno`.** Una acción de cabecera que navega («Editar» en las hojas 20, 24, 30, 39, 69) tiene que pasar por el mismo camino que el botón actual, o se salta el aviso: en la 69 es `confirmarSalida` (`hoja-producto.tsx:156-157`); en la 20 el botón es un `href` (`hoja-pedido.tsx:207-210`). Las acciones de cabecera necesitan el estado del contenido (`inventario.pendiente`, `navegar`), que vive en los hijos: hace falta una ranura de cabecera como `HojaFijoArriba` (portal) o una prop `accion`, y con portal la acción aparece un cuadro **después** de la primera pintura (la ranura se guarda en estado, `:300`): el título cambiaría de ancho al llegar (dudoso; hay que probarlo).
3. **Historial.** Las hojas de ruta (19, 20, 33–39) cierran con el router; las que tienen `protegerAtras` guardan una entrada de historial y la quitan al cerrar (`:600-604, :669-684`). Mover la ✕ no toca esa lógica, pero cualquier ✕/acción nueva debe llamar a `cerrar()` (`:397`) y no a `alCerrar` directo, o salta el aviso. Las hojas 19 y 20 tienen vistas internas con «‹» **y no declaran `alVolverInterno`**: es un hueco que ya existe y que la migración no debe esconder (dudoso si es intencional).
4. **Foco y orden de lectura.** El foco entra al panel (`:596`) y la trampa de Tab usa el orden del DOM (`:651-662`). Hoy la ✕ es lo primero enfocable. Para poner la ✕ a la izquierda hay que **reordenar el DOM**, no usar `flex-row-reverse` ni `order`: si no, el foco y el lector de pantalla van al revés de lo que se ve. El `<h2>` mantiene `aria-labelledby` (`:813`). Con `tituloOculto` (hojas 15, 21, 61) el `<h2>` sigue `sr-only`.
5. **Teclado (`HANDOFF.md:31-47`).** La cabecera no tiene campos, así que no hay problema de foco. Pero el alto de la cabecera entra en `--cabecera` (`:431-441`) y en `scroll-padding-top` (`:833`): si un título pasa a dos líneas con la acción nueva, el contenido y el cálculo de «campo enfocado a la vista» (`:531`) cambian de base. En hojas `auto` con campos (19 no, pero sí 25, 28, 31), una cabecera que cambie de alto con el teclado abierto sería un salto; el título es fijo por hoja, así que solo importa en las de título dinámico (8, 27, 30, 47, 54, 57, 60, 63, 69).
6. **`HANDOFF.md` y reglas del repo.** Cada cambio visible suma una línea a `lib/novedades.ts` (`HANDOFF.md:21-29`), y `docs/09-sistema-de-diseno.md:209-216` describe hoy «botón cerrar redondo» y la hoja historia: ambos hay que actualizar. 16 scripts mencionan «Cerrar» o `data-hoja-cabecera` (entre ellos `scripts/probar-hojas.mjs`, `probar-teclado.mjs`, `probar-crear-producto.mjs`, `probar-eliminar-producto.mjs`, `probar-pedido-catalogo-panel.mjs`, `probar-mi-marca.mjs`, `probar-detalle-promos.mjs`); 11 usan `button[aria-label="Cerrar"]` y no dependen del lado (dudoso: no se leyó cada script), pero `probar-crear-producto.mjs:157` mide la caja de la ✕ y habrá que ver cada lote (dudoso cuál más).
7. **Hojas con título largo.** El `<h2>` no trunca (`:876`): ya hoy «Pasar la tienda a otro dueño» (11), «Tu catálogo tiene N productos» (63) y los títulos de dato libre (8, 12, 26, 30, 47, 57, 60, 69) pueden bajar a dos líneas con 264 px. Con una acción de texto (180 px) o dos iconos (152 px) esos casos empeoran. Las únicas con acción propuesta y título libre son la 30 (nombre del cliente, que ya trunca) y la 69 (nombre del producto, que **no** trunca). Para la 39 el título fijo «Detalle de promo» (16 car.) no cabe con 2 acciones.
8. **Pilas de tres.** Tres hojas apiladas con esquinas de ✕ mezcladas (ver §1) y velos acumulados son el sitio donde más se notaría el cambio; además contradicen la regla escrita en `hoja.tsx:41` («máximo dos»).
9. **Estados que cambian de posición.** Si una hoja cambia de «lectura» a «guarda» según permisos (40 en `soloMirar`) o según la vista interna (8, 54), la ✕ saltaría de lado. Por eso se recomienda un lado fijo por hoja, no por vista.
10. **Hoja sin uso.** La 56 (`HojaPedirCatalogo`) no se usa en ningún sitio que encontré; conviene confirmar antes de migrarla.
11. **Prueba en iPhone.** Safari/PWA no se puede probar en este entorno; cada lote necesita que Lewis lo vea en el teléfono (`docs/00-contexto-del-proyecto.md`, «Cuando no se pueda probar algo»).

12. **Pantallas internas (lote 8).** Todas son riesgos nuevos del cambio decidido:
    - **Historial.** `alVolverInterno` (`hoja.tsx:615-618`) consume «atrás» y vuelve a guardar la entrada de historial, pero solo existe cuando la hoja tiene entrada (apilada o `protegerAtras`, `:601`). Las tres hojas que reciben la pantalla interna (28, 26, 24) están apiladas, así que la tienen; hay que comprobar que «<» y «atrás» del teléfono hagan lo mismo (como en `registrar-solicitud.tsx:72-76`) y que, al cerrar desde la pantalla interna, no queden entradas de más.
    - **Gesto de cerrar.** Deslizar hacia abajo o tocar el velo en la pantalla interna cierra **toda** la hoja (`hoja.tsx:717-727`, `:806`), no vuelve una pantalla: es lo esperable, pero distinto de «<». Con cambios sin guardar el aviso de salida salta igual.
    - **Foco.** Al entrar a la pantalla interna el foco debe ir a «<» o a su primer campo en el mismo toque (`flushSync` + `focus()`, `HANDOFF.md:43-45`); al volver, al botón que la abrió y con el scroll restaurado (patrón de `registrar-solicitud.tsx:322-345`). `ElegirMensaje` y el avatar hoy devuelven el foco por el efecto de cierre de `<Hoja>` (`hoja.tsx:688`), que dejaría de aplicar.
    - **`protegerAtras`.** Las hojas base de las pilas (30, 27, 20) son de ruta o con entrada propia; la pantalla interna no debe añadir `protegerAtras` (duplicaría entradas). Hoja 24, 26 y 28 no lo tienen y no lo necesitan mientras estén apiladas, pero si algún día se abren solas, «atrás» las cerraría de golpe sin pasar por la pantalla interna.
    - **Cambios sin guardar al cruzar pantallas.** El estado de los formularios debe vivir en la hoja padre, no en la vista interna: el avatar elegido vive hoy en `Formulario` de `hoja-cliente-editar.tsx` (`:133`) y `Selector` se remonta con `key={abierta}` (`avatar-y-nota.tsx:222`); el tipo de mensaje y el texto editado de «Escribir» (`hoja-escribir-jugada.tsx`) y el borrador del abono (`hoja-abono.tsx`) hay que conservarlos al ir y volver. «<» **no** debe disparar el aviso «¿Salir sin guardar?» (volver no descarta nada); sí debe dispararlo ✕/velo/Escape/atrás sobre la hoja entera (`useAvisarAlSalir` en 25, 28, 31).
    - **Altura.** 28, 24 y 25 son `altura="auto"`: cambiar a una pantalla de otro alto hace que la hoja salte de tamaño (el avatar trae una rejilla de emojis, `selector-emoji.tsx:26`). La regla de `HANDOFF.md:43` pide hoja completa cuando hay campos; hay que decidir si la hoja con pantalla interna pasa a `grande` o se fija al alto de la mayor de sus pantallas.
    - **Cabecera.** Hay que añadir a `hoja.tsx` el modo «pantalla interna» (título de la pantalla + «<» en vez de ✕, sin acción de cabecera o con la suya) sin romper `tituloOculto`, `historia` ni `fijoArriba` (que hoy ya sirve de «‹» en el cuerpo en 27, 47, 54, 68, 69).
    - **Pruebas.** `probar-hojas.mjs` (clic en `aria-label="Cerrar"`, p. ej. `:82, :108, :141`) y los scripts que abren avatar, mensajes y abonos (`probar-teclado.mjs`, `probar-pedido-catalogo-panel.mjs`; el resto, dudoso) deberán cubrir «<».

## 3. Orden de migración sugerido (de menor a mayor riesgo)

Cada lote debe poder fusionarse solo. El conteo es de archivos de código que se tocan (los de apoyo van aparte).

| Lote | Qué | Archivos de código | Hojas (#) | Por qué en ese orden |
|---|---|---|---|---|
| 0 · Base | `components/hoja.tsx`: prop `cerrar?: "izquierda" \| "derecha"` (por defecto derecha: **no cambia nada visible**), DOM reordenado para la izquierda, ranura de acción (`HojaAccionCabecera` por portal, como `HojaFijoArriba`) y `tituloOculto` con ✕ a la izquierda. Apoyo: `docs/09-sistema-de-diseno.md`, `app/diseno/guia.tsx` (demo), `scripts/probar-hojas.mjs` | **1** (+ 3 de apoyo) | — | Sin cambio visible; se prueba con la guía `/diseno` |
| 1 · Admin | Formularios del panel interno: `admin/ficha-tienda.tsx`, `admin/trabajo-fotos.tsx`, `admin/pantalla-trabajo.tsx`, `admin/pantalla-personalizar.tsx` (solo las hojas 5 y 6; el resto sigue a la derecha) | **4** | 5, 6, 10, 11, 13 | Lo ve solo el equipo de Deslizapp; lugar barato para validar el patrón |
| 2 · Confirmaciones del catálogo | `catalogo/hoja-publicar-catalogo.tsx`, `bienvenida-retoque.tsx`, `hoja-revisar-catalogo.tsx`, `inventario-producto.tsx`, `ficha-presentaciones.tsx`, `hoja-pedir-catalogo.tsx` (sin uso: se puede omitir) | **6** | 44, 51, 52, 53, 56, 63 | Hojas pequeñas, sin campos ni vistas internas, con botones abajo |
| 3 · Clientes y crédito | `clientes/hoja-cliente-nuevo.tsx`, `clientes/hoja-cliente-editar.tsx` (28 y 29), `credito/hoja-abono.tsx`, `clientes/hoja-escribir-jugada.tsx` | **4** | 25, 26, 28, 29, 31 | Formularios con aviso ya probados; hojas `auto` con campos (usar `probar:teclado`). Cuidado: 28 y 29 se apilan |
| 4 · Promos, marca, perfil y registrar | `promos/hoja-promo.tsx`, `promos/hoja-compartir.tsx`, `marca-tienda/hoja-mi-marca.tsx`, `catalogo/hoja-lo-que-vendes.tsx`, `inicio/checklist-tienda.tsx`, `pedido-catalogo/registrar-solicitud.tsx` | **6** | 33, 36–38, 40, 43, 55, 16 | Hojas de ruta, avisos y estados R3; `registrar-solicitud` tiene `alVolverInterno` |
| 5 · Con vistas internas | `pedidos/hoja-pedido-nuevo.tsx` (19 y 18), `catalogo/flujo-presentaciones.tsx` (59) | **2** | 18, 19, 59 | Tienen «‹» en el cuerpo y carecen de `alVolverInterno` (19) o un paso 2 que se gestiona abajo (59): arreglar eso no es parte de la ✕ |
| 6 · Detalles con «Editar» | `credito/hoja-detalle-abono.tsx`, `clientes/hoja-cliente.tsx`, `pedidos/hoja-pedido.tsx`, `promos/hoja-detalle-promo.tsx` | **4** | 20, 24, 30, 39 | Necesitan la ranura de acción (lote 0), la decisión R4 y cuidar el título largo |
| 7 · Producto | `catalogo/hoja-producto.tsx` (9 usos: 67, 68, 69, 71; 70 no cambia; 69 con «Editar» y aviso por stock; 68 con ⋯ después) | **1** | 67, 68, 69, 71 | La hoja más usada, con `protegerAtras`, `alVolverInterno`, historial interno y el aviso a medida. Va al final |
| 8 · Pantallas internas (decidido por Lewis, 13 oct) — **después de las cabeceras** | Máximo dos hojas: avatar dentro de «Editar cliente»; «Elige el mensaje» dentro de «Escribir»; formulario de abono dentro de «Abono». Modo «pantalla interna» con «<» en `hoja.tsx` (si no está ya en el lote 0). Archivos: `clientes/hoja-cliente-editar.tsx`, `clientes/avatar-y-nota.tsx`, `clientes/hoja-cliente-nuevo.tsx`, `ui/elegir-mensaje.tsx`, `clientes/hoja-escribir-jugada.tsx`, `credito/cuenta-cliente.tsx`, `app/diseno/guia.tsx`, `credito/hoja-detalle-abono.tsx`, `credito/hoja-abono.tsx`, `credito/pago-del-pedido.tsx` (+ `components/hoja.tsx`) | **10** (+ `hoja.tsx`) | 14, 25, 26, 28, 32, 24 | Cambia la navegación, no solo la cabecera; depende de los lotes 3 y 6 (las mismas hojas) y deja sin resolver las otras tres pilas de tres |
| — · Sin cambio | Quedan a la derecha: 1–4, 7–9, 12, 14, 15, 17, 21–23, 27, 32, 34, 35, 41, 42, 45–50, 54, 57, 58, 60–62, 65, 66, 70, 72, 73 | 0 | — | No hay que tocarlas |

Total de código tocado si se hace todo: **28 archivos** en los lotes 0–7 (1 + 4 + 6 + 4 + 6 + 2 + 4 + 1) más **10** del lote 8 (algunos repiten archivos de los lotes 3 y 6: `hoja-cliente-editar`, `hoja-cliente-nuevo`, `hoja-escribir-jugada`, `hoja-abono`, `hoja-detalle-abono`, `hoja.tsx`), más los 3 de apoyo del lote 0 y `lib/novedades.ts` en cada lote que cambie algo visible.

## Decisiones

**Decididas por Lewis, 13 oct:**

- **D1.** Detalles con acciones: ✕ izquierda; «Editar» en texto a la derecha; «⋯» con menú para el resto; destructivas dentro del «⋯», en rojo; elipsis en vez de sacrificar acciones (ver «Detalles con acciones de cabecera»).
- **Máximo dos hojas apiladas**, con pantallas internas y «<» (lote 8).

**Siguen abiertas:**

- **D2.** ¿«Compartir» (22, 49, 62) sube a la cabecera? Hoy es lo principal de esas hojas y se quedaría abajo. (En el detalle de promo ya se resolvió: va al «⋯».)
- **D3.** ¿Las hojas que solo aplican a un borrador (32, 46, 57, 58, 60, 65, 66, 48) cuentan como «elección» (derecha)? Aquí se tomó que sí cuando no avisan al salir.
- **D4.** Las otras tres pilas de tres (Borrar contacto, Flujo de presentaciones, Inventario de la historia): ¿también pantallas internas?
- **D5.** Hojas con vistas internas (8, 19, 20, 27, 54): ¿«<» en la cabecera como en el lote 8, o se queda en el cuerpo? Afecta al lado de la ✕ y encajaría con la decisión de las pantallas internas.
- **D6.** ¿La elipsis del título es para todas las hojas o solo para las que llevan acciones en la cabecera?
- **D7.** ¿El «⋯» se comparte con el menú de «Publicar ⌄» de crear producto (un solo componente)?
