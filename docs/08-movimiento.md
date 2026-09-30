# Movimiento

Cómo se mueve el Panel de tienda. La meta: que se sienta como una app nativa de
iOS — **rápido, suave y con propósito**, nunca lento ni recargado. **Ninguna
animación hace esperar al usuario ni bloquea un toque.**

Toda pantalla o componente nuevo sigue estas reglas (ver `HANDOFF.md`).

> **REGLA PERMANENTE:** movimiento solo en hojas, barra de navegación y
> microinteracciones de un solo elemento. **Prohibido animar la página completa
> al cambiar de pestaña** y **prohibido animar cada elemento de una lista o
> grilla al entrar.** Solo `transform` y `opacity`. (En el iPhone las
> transiciones de página y las de muchos elementos a la vez se sentían pesadas y
> a veces congelaban la app: por eso se quitaron.)

## Una sola fuente de verdad

Los tokens viven en `app/globals.css` (`:root`) y, para lo que se usa desde JS,
en `lib/movimiento.ts`. Si cambias uno, cambia los dos.

| Token | Valor | Para qué |
|---|---|---|
| `--mov-rapida` / `DURACION.rapida` | 150 ms | Toques (presionar), salidas, desvanecer lo viejo |
| `--mov-normal` / `DURACION.normal` | 250 ms | Aparecer, indicadores que se deslizan, números, fotos |
| `--mov-entrada` / `DURACION.entrada` | 350 ms | Hojas |
| `--curva-salida` / `CURVA.salida` | `cubic-bezier(.2,.8,.2,1)` | Casi todo: arranca rápido y se posa |
| `--curva-entrada` / `CURVA.entrada` | `cubic-bezier(.4,0,1,1)` | Lo que se va: acelera hacia afuera |
| `--curva-resorte` / `RESORTE` | `linear(…)` / rigidez 620, amortiguación 0.8 crítica | Gestos (selector de la barra): un rebote apenas perceptible |
| `--desplazar-corto` | 8 px | Aparecer (elementos sueltos) |
| `--mov-pop` / `--mov-pop-inicio` | 1,03 / 0,6 | "Pop" al elegir algo (sube y vuelve) y de dónde crece el check que aparece (`mov-pop-aparece`). Con movimiento reducido valen 1 |
| `--desplazar-aviso` | 12 px | Avisos que bajan desde arriba |
| `--mov-presion` | 0.97 | Escala al presionar algo tocable |

## Reglas

1. **Solo se anima `transform` (translate/scale) y `opacity`.** Nada de
   width, height, top, left, márgenes ni colores. Excepción justificada: el
   brillo de los esqueletos. Si algo tiene que cambiar de color con
   suavidad, se funde una capa encima con `opacity` (ej. la tarjeta "Retocar
   foto" que pasa a Mandarina).
2. **Nada espera a una animación.** Los toques funcionan durante cualquier
   animación.
3. **`will-change` solo mientras se anima** (hojas y selector de la barra lo
   ponen al empezar y lo quitan al terminar). Nada de sombras animadas.
4. **Una sola animación infinita:** el brillo de los esqueletos de carga. Excepciones aprobadas, solo transform/opacity y apagadas con
   `prefers-reduced-motion`: los microdetalles de la tarjeta del catálogo (`cat-anim-*` en `app/globals.css`: punto que late,
   destellos, ondas, confeti) y los de "Saldado" en crédito y abonos (`cre-*`: sello, confeti y el punto que late de "atrasado"; la
   barra de pago crece con `scaleX`, no con el ancho).
5. **`prefers-reduced-motion`:** los tokens pasan a fundidos cortos (150 ms)
   sin desplazamientos ni escalas (`--desplazar-*: 0`, `--mov-presion: 1`); el
   resorte y el estiramiento de la barra se desactivan (cambio directo); las
   hojas aparecen sin deslizar.

## Campos de texto y teclado (regla permanente)

Un campo de texto **nunca** puede perder el foco por culpa de una animación (en iOS, perder el foco
cierra el teclado y no deja escribir). Por eso:

1. **Nunca animar ni remontar los ancestros de un campo de texto al enfocar o al cambiar el tamaño.**
   La hoja no cambia de tamaño, posición ni estado cuando se abre el teclado; solo escribe
   `--teclado` (espacio al final del contenido) y desplaza el contenido para dejar a la vista el campo.
   En reposo, el panel de la hoja no lleva `transform`.
2. **`focus()` siempre dentro del gesto del usuario** (un `autoFocus` en un campo que aparece por un
   toque está bien; un `focus()` con retraso o tras una animación, no).
3. **No cambiar `key` ni estado de layout por eventos de `resize`/`visualViewport`**, y los efectos
   que manejan foco no dependen de nada que cambie con el teclado (su limpieza devolvería el foco).
4. **Ninguna transición de vista** (`ViewTransition`, `startViewTransition`): reemplaza la página por
   una captura mientras dura y, en iOS, eso le quita el foco al campo. Ya no se usa en ninguna parte.
   Al tocar una pestaña de la barra con el teclado abierto se suelta el foco antes.
5. Se comprueba con `npm run probar:teclado` (simula el `visualViewport` de iOS).

## Qué se anima y cómo

### Entre pantallas, listas y grillas: NO se anima

- **Cambio de pestaña:** instantáneo. La pantalla nueva aparece de una vez, sin
  animar la página ni la anterior. El único movimiento es el selector de la barra.
- **Entrar a un detalle o volver:** también sin animar (los formularios y detalles
  son hojas, con el movimiento de `components/hoja.tsx`).
- **Listas y grillas** (Catálogo, Pedidos, Clientes, Promos, Inicio): aparecen de
  una vez. Nada de entrada escalonada, `ViewTransition`, `layout` ni animación por
  tarjeta o fila; filtrar o buscar cambia el resultado directo.
- **Fotos:** sin fundido ni escala al cargar.
- No hay librería de animación (`motion`/`framer-motion`): no se agrega.

### Microinteracciones (en los componentes base)

| Qué | Cómo | Dónde |
|---|---|---|
| Presionar botones, enlaces, tarjetas, chips, pestañas | escala `--mov-presion`, vuelve con `--mov-rapida` | regla base en `globals.css`; `tocable` si el elemento tiene otras transiciones |
| Interruptor | la perilla se desliza (`translateX`, normal) | `Interruptor` en `components/controles.tsx` |
| Filtros y pestañas internas | indicador en cápsula que se desliza y cambia de ancho (tres piezas con transform) | `Segmentos` en `components/controles.tsx` |
| Antes / Después del retoque | selector que se desliza + fundido entre las dos fotos | `hoja-producto.tsx` |
| Números que cambian (créditos, contadores, badge) | el valor nuevo sube con un pequeño "pop" (WAAPI, normal); la primera vez no | `Numero` en `components/numero.tsx` |
| Avisos (toast) y aviso de versión | bajan al entrar (`mov-baja`), suben al salir (`mov-sube-sale`) | `toast.tsx`, `aviso-version.tsx` |
| Pantalla de novedades | aparece (`mov-aparece`); sale bajando (`mov-baja-sale`) | `pantalla-novedades.tsx` |
| Carga | esqueletos con brillo (`Esqueleto`), nunca pantalla en blanco | `esqueleto.tsx`, `pantalla-carga.tsx` |
| Hojas | suben/bajan con transform; se arrastran con el dedo | `components/hoja.tsx` |
| Barra inferior | selector con resorte e imán (requestAnimationFrame) | `nav-inferior.tsx` |

## Utilidades CSS disponibles

`mov-aparece`, `mov-desvanece`, `mov-baja`, `mov-sube-sale`, `mov-baja-sale`,
`tocable`, `esqueleto`. Úsalas antes de inventar
una animación nueva; si hace falta una nueva, se define con los tokens de arriba
y se documenta aquí.
