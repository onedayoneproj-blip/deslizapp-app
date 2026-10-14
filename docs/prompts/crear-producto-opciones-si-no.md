# Crear producto: «¿Viene en varias opciones?» con Sí / No, «+ Otra» que se vuelve campo y Elección en verde

Encargo de Planning, 14 oct 2026. Tu puesto es **Coding**. Parte de `main` actualizado.

**Modelo:** Claude Code **Sonnet** · en Codex, el más alto con razonamiento medio.

## Por qué
Lewis probó crear producto en su iPhone (14 oct) y pidió tres cambios:
- En el paso del precio, «¿Viene en varias opciones?» con las píldoras «Tamaño · Otra» no se entiende: no queda claro que tocar una abre las opciones.
- Con el teclado abierto, el pie «Seguir» tapa esa pregunta.
- Las respuestas de la historia se marcan en rosado, pero en el resto de la app elegir algo es verde con check. El rosado vino del lienzo (#112) y va contra la regla 3 de `docs/09`: «Rosa es marca, no estado».

## Qué hacer
1. **Sí / No en el paso del precio** (`PreguntaOpciones` en `components/catalogo/pasos-producto.tsx`; la usa `historia-producto.tsx:565`).
   - Cambia las píldoras de `OPCIONES_TIPICAS` y «Otra» por dos `Eleccion`: **«Sí»** y **«No»**. La pregunta y su texto se quedan igual.
   - **Sí:** abre «¿En qué cambia?» sin nada marcado. Es lo que hoy hace `abrirVariantes(undefined)` con `ejes` vacíos; no uses el camino de «Otra» (`abrirOtra`), que abre el campo de una vez.
   - **No:** avanza al paso siguiente, igual que «Seguir». Si falta el precio, haz lo mismo que haría «Seguir» con ese error.
   - Con un toque en Sí o en No ya se avanza, así que el pie tapando la pregunta deja de molestar. Revisa `alEnterPrecio` / `preguntaPendiente` (`historia-producto.tsx` ≈396): Enter en el precio sigue cerrando el teclado y deja Sí / No a la vista.
   - Quita `abrirOtra`, `empezarEnOtra` y `alUsarOtra` si quedan sin uso.
2. **«+ Otra» se vuelve el campo, en su lugar** (`QueCambia`, `pasos-producto.tsx` ≈150).
   - Hoy, al tocar «+ Otra», la píldora desaparece y sale debajo un `Campo` con la etiqueta «¿Qué otra cosa cambia?» y un botón «Listo».
   - Ahora, al tocarla, esa misma píldora se convierte en un campo de texto en línea, en el mismo sitio de la fila y con la misma altura y forma redonda. Placeholder: «Por ejemplo: Aroma». El foco va dentro del mismo toque (`flushSync` + `focus()`).
   - **Enter (o «Listo» del teclado)** agrega la cosa, como hoy `listoOtra`. Si el campo está vacío y pierde el foco, vuelve a ser «+ Otra». El error de nombre repetido sale debajo de la fila.
   - Mantén `aria-label` «¿Qué otra cosa cambia?» en el campo. Si hace falta, deja un botón ✓ pequeño dentro de la píldora para confirmar sin teclado.
   - Haz lo mismo con el «+ Otra» de los valores (`ValoresDeEje`, ≈212) **solo si usa el mismo patrón**. Si es distinto, déjalo y dilo en el PR.
3. **Elección elegida = verde con check** (`components/ui/eleccion.tsx`).
   - Elegida: relleno `accion-suave`, contorno `accion-suave`, texto `texto` y un check en círculo a la izquierda, como `Opcion` (`components/ui/opcion.tsx`): reutiliza su ícono. Sin elegir, igual que hoy.
   - Comprueba que, en `compacta` (tallas del Inventario, `inventario-historia.tsx`), el check no rompa la fila a 360 px. Si no cabe, en `compacta` va solo el color sin check, y lo dices en el PR.
   - Actualiza el comentario del componente y `docs/09` (la línea de **Elección** y quitar la excepción a la regla 3).

## Reglas que aplican
- `HANDOFF.md`: teclado e iPhone. Nada de `resize`/`visualViewport` que cambie estado. Foco dentro del toque. Sin transiciones de vista.
- Textos según `docs/11`.
- Una línea en `lib/novedades.ts`: es un cambio visible.
- No toques editar producto más allá de lo que herede de `QueCambia` y `Eleccion`, ni el catálogo del comprador (`components/tienda/`).

## Pruebas
- `npm run tipos`, `npm run lint`, `npm test`, `npm run build`.
- `probar-crear-producto` completo (360/390/430, 360×640, movimiento reducido, y sin scroll a 390×844 y 393×852 con safe 59/34). Ajusta las aserciones de la pregunta de opciones y de «+ Otra», con casos nuevos:
  - Sí abre «¿En qué cambia?» sin nada marcado.
  - No avanza.
  - Sin precio, No muestra el error.
  - «+ Otra» se vuelve campo con el foco dentro; Enter agrega; vacío y sin foco vuelve a ser «+ Otra».
  - Elegida muestra el check.
- `probar-hoja-producto` y `probar-presentaciones` (editar usa `QueCambia` y `Eleccion`), `probar:teclado`.
- Capturas antes/después a 390×844 del paso del precio, de «¿En qué cambia?» con «+ Otra» abierto, de «¿Cuándo llega?» y del Inventario con tallas, en `docs/capturas/crear-producto/opciones-si-no/`.

## Entrega
- PR contra `main` con «Qué probar en tu iPhone» (3 a 6 pasos; Lewis usa un iPhone 15 Pro con la app instalada).
- **Déjalo abierto sin fusionar:** es un cambio visible y Lewis lo prueba.
- Pide «@codex review» y atiende sus hallazgos hasta que salga limpio.
- Avisa a Planning (`send_message` a `@parent`) al abrir el PR, si quedas bloqueado y al terminar, con: PR, HEAD, «Revisión», Codex, pruebas hechas y no hechas, y decisiones fuera del encargo.
