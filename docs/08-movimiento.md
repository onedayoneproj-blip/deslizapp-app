# Movimiento

Cómo se mueve el Panel de tienda. La meta: que se sienta como una app nativa de
iOS — **rápido, suave y con propósito**, nunca lento ni recargado. **Ninguna
animación hace esperar al usuario ni bloquea un toque.**

Toda pantalla o componente nuevo sigue estas reglas (ver `HANDOFF.md`).

## Una sola fuente de verdad

Los tokens viven en `app/globals.css` (`:root`) y, para lo que se usa desde JS,
en `lib/movimiento.ts`. Si cambias uno, cambia los dos.

| Token | Valor | Para qué |
|---|---|---|
| `--mov-rapida` / `DURACION.rapida` | 150 ms | Toques (presionar), salidas, desvanecer lo viejo |
| `--mov-normal` / `DURACION.normal` | 250 ms | Aparecer, indicadores que se deslizan, números, fotos |
| `--mov-entrada` / `DURACION.entrada` | 350 ms | Entradas de pantalla (detalle) y hojas |
| `--curva-salida` / `CURVA.salida` | `cubic-bezier(.2,.8,.2,1)` | Casi todo: arranca rápido y se posa |
| `--curva-entrada` / `CURVA.entrada` | `cubic-bezier(.4,0,1,1)` | Lo que se va: acelera hacia afuera |
| `--curva-resorte` / `RESORTE` | `linear(…)` / rigidez 620, amortiguación 0.8 crítica | Gestos (selector de la barra): un rebote apenas perceptible |
| `--desplazar-corto` | 8 px | Aparecer, cambio de pestaña, listas |
| `--desplazar-aviso` | 12 px | Avisos que bajan desde arriba |
| `--desplazar-pantalla` | 100 % | Entrar a un detalle (como iOS) |
| `--mov-presion` | 0.97 | Escala al presionar algo tocable |
| `--mov-escalon` | 30 ms | Retraso entre elementos de una lista (tope: 8 elementos) |

## Reglas

1. **Solo se anima `transform` (translate/scale) y `opacity`.** Nada de
   width, height, top, left, márgenes ni colores. Excepciones justificadas:
   `clip-path` en las hojas (margen y esquinas flotantes, ver `04-pantallas.md`)
   y el brillo de los esqueletos. Si algo tiene que cambiar de color con
   suavidad, se funde una capa encima con `opacity` (ej. la tarjeta "Retocar
   foto" que pasa a Mandarina).
2. **Nada espera a una animación.** Los toques funcionan durante cualquier
   animación; las transiciones de pantalla dejan pasar los toques
   (`::view-transition { pointer-events: none }`).
3. **`will-change` solo mientras se anima** (hojas y selector de la barra lo
   ponen al empezar y lo quitan al terminar). Nada de sombras animadas.
4. **Una sola animación infinita:** el brillo de los esqueletos de carga.
5. **`prefers-reduced-motion`:** los tokens pasan a fundidos cortos (150 ms)
   sin desplazamientos ni escalas (`--desplazar-*: 0`, `--mov-presion: 1`); el
   resorte y el estiramiento de la barra se desactivan (cambio directo); las
   hojas aparecen sin deslizar.

## Qué se anima y cómo

### Entre pantallas — React `<ViewTransition>`

Se usa la integración de View Transitions de React que trae Next 16 (React
canary incluido, sin configuración; tipos en `@types/react` 19.3). En Safari
de iPhone funciona desde iOS 18 (clases y tipos de transición desde 18.2); en
navegadores sin soporte la app funciona igual, sin animar. Se eligió esta vía y
no la librería `motion` porque es nativa del navegador (anima capturas en el
compositor, sin JS por cuadro), no agrega dependencias y es la que documenta
Next para esta versión. **Es la única vía para transiciones de pantalla.**

- Cada pantalla envuelve su contenido en `<Pantalla>` (`components/pantalla.tsx`).
  Va en la página (o en el layout que la monta, como el Catálogo), nunca en un
  layout que persiste.
- Cada navegación lleva un **tipo** (`TRANSICION` en `lib/movimiento.ts`):
  - `pestana` (barra inferior): lo viejo se desvanece (rápida) y lo nuevo
    aparece con un leve desplazamiento (normal). `transitionTypes` en `<Link>`
    y en `router.push`.
  - `adelante` (entrar a un detalle): lo nuevo entra desde la derecha; lo
    viejo se corre un 30 % y se atenúa (entrada).
  - `atras` (volver con un botón de la app): lo viejo sale hacia la derecha
    por encima; lo de atrás regresa desde la izquierda (entrada).
  - Sin tipo (atrás del navegador, recargas, abrir una hoja): no se anima.
- **El encabezado y la barra no se animan:** la raíz no tiene animación y la
  barra está anclada (`view-transition-name: barra-nav`).
- Las hojas no son pantallas: tienen su propio movimiento (`components/hoja.tsx`).

### Listas y grillas

- **Primera vez que se muestra la pantalla:** entrada escalonada muy corta
  (`mov-escalonado` + `--i`), con `usePrimeraVez()` para que no se repita en
  cada render.
- **Crear, desactivar, filtrar, buscar:** cada elemento va en un
  `<ViewTransition name="…">` que solo se anima con los tipos `lista` (filtros
  y búsqueda, con `addTransitionType` dentro de `startTransition`) o `datos`
  (lo agrega `useConsulta` cuando cambia la versión de los datos). Lo que entra
  aparece, lo que sale se desvanece y el resto se reacomoda con suavidad. La
  primera carga de datos no lleva tipo: no anima ni hace esperar.

### Microinteracciones (en los componentes base)

| Qué | Cómo | Dónde |
|---|---|---|
| Presionar botones, enlaces, tarjetas, chips, pestañas | escala `--mov-presion`, vuelve con `--mov-rapida` | regla base en `globals.css`; `tocable` si el elemento tiene otras transiciones |
| Interruptor | la perilla se desliza (`translateX`, normal) | `Interruptor` en `components/controles.tsx` |
| Filtros y pestañas internas | indicador en cápsula que se desliza y cambia de ancho (tres piezas con transform) | `Segmentos` en `components/controles.tsx` |
| Antes / Después del retoque | selector que se desliza + fundido entre las dos fotos | `hoja-producto.tsx` |
| Números que cambian (créditos, contadores, badge) | el valor nuevo sube con un pequeño "pop" (WAAPI, normal); la primera vez no | `Numero` en `components/numero.tsx` |
| Avisos (toast) y aviso de versión | bajan al entrar (`mov-baja`), suben al salir (`mov-sube-sale`) | `toast.tsx`, `aviso-version.tsx` |
| Pantalla de novedades | aparece (`mov-aparece`) con líneas escalonadas; sale bajando (`mov-baja-sale`) | `pantalla-novedades.tsx` |
| Carga | esqueletos con brillo (`Esqueleto`), nunca pantalla en blanco | `esqueleto.tsx`, `pantalla-carga.tsx` |
| Fotos | aparecen con un fundido al cargar | `Foto` en `components/foto.tsx` |
| Hojas | suben/bajan con transform; se arrastran con el dedo | `components/hoja.tsx` |
| Barra inferior | selector con resorte e imán (requestAnimationFrame) | `nav-inferior.tsx` |

## Utilidades CSS disponibles

`mov-aparece`, `mov-desvanece`, `mov-baja`, `mov-sube-sale`, `mov-baja-sale`,
`mov-escalonado` (con `--i`), `tocable`, `esqueleto`. Úsalas antes de inventar
una animación nueva; si hace falta una nueva, se define con los tokens de arriba
y se documenta aquí.
