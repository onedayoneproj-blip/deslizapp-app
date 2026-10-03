# Tus clientes: cuadros con ícono que filtran la pantalla (rama `fix/cuadros-resumen`)

Este prompt **reemplaza** al de `docs/prompts/iconos-resumen.md` (ya no existe). Si empezaste la rama `fix/iconos-resumen`, ciérrala sin merge (o reutiliza lo que sirva, como los íconos) y haz todo aquí. Si ya la mergeaste, trabaja encima de main.

Antes de empezar lee en `docs/09-sistema-de-diseno.md` §7 "Hoja de resumen con dona" (puntos 3 y 4, cambiaron) y la regla "Orden de los filtros" de §6 (cambió la última frase).

Referencia visual: en el canvas "Cliente: cobro y recordatorio", los tableros "Tus clientes: cuadros con ícono…" y "Tocar «Del catálogo»…".

## Qué cambia y por qué

En la hoja "Tus clientes", la leyenda de la dona (Repiten, Compraron una vez, Sin comprar todavía) se queda **exactamente como está**: lista agrupada con punto de color, y al tocar una fila se abre la lista interna con Volver.

Los otros cuatro grupos (Nuevos, Dormidos, Del catálogo, A mano) dejan de ser una segunda lista y vuelven a ser **cuadros de 2 × 2**, como antes del PR #35. Al tocarlos ya no abren una lista dentro de la hoja: **cierran la hoja y filtran la pantalla de Clientes**, como hacían antes.

## 1. Íconos nuevos en `components/iconos.tsx`

Usa el mismo `Icono` base (24, trazo 2, puntas y uniones redondeadas, sin relleno). Si ya existen por la rama anterior, déjalos.

- `IconoBrote` (Nuevos):
  - `M12 20v-7.5`
  - `M12 12.5C12 8.9 9.6 6.5 5.5 6.5c0 3.6 2.4 6 6.5 6z`
  - `M12 14.5c0-3 2.1-5 5.5-5 0 3-2.1 5-5.5 5z`
- `IconoLuna` (Dormidos):
  - `M19.5 14.6A7.8 7.8 0 0 1 9.4 4.5a8 8 0 1 0 10.1 10.1z`
- `IconoEnlace` (Del catálogo):
  - `M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1`
  - `M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1`
- A mano usa el `IconoEditar` que ya existe (lápiz).

## 2. `ResumenDona` (`components/ui/resumen-dona.tsx`): los `otros` pasan a cuadros

- Cambia la prop `otros` para que se pinte como una cuadrícula de 2 columnas (`grid grid-cols-2 gap-2.5`), no como `ListaAgrupada`. Cada elemento lleva `id`, `nombre`, `subtitulo`, `valor`, `icono: ReactNode` y `alTocar?`.
- Cada cuadro es una `Tarjeta`:
  - Primera fila (`flex items-center gap-2`): el ícono (suelto, color `texto`, **sin círculo ni fondo**) **al lado de la cifra**. La cifra va en `font-display text-titulo-hoja` y ocupa el resto (`flex-1`). Al final de esa fila va `IconoChevronDerecha` en `texto-secundario`, solo si se toca. El ícono no va solo arriba: va junto a la cantidad.
  - Debajo: el nombre en `text-secundario font-bold` y la explicación en `text-etiqueta text-texto-secundario`. Es lo mismo que tenían los cuadros antes del #35, más el ícono y el chevron en la fila de la cifra.
- **Tocable solo si `valor > 0` y hay `alTocar`.** En 0: no es botón, no lleva chevron y la cifra va en `text-texto-secundario`.
- Etiqueta accesible del cuadro tocable: `"{nombre}: {valor} clientes, {subtitulo}. Ver en la lista"`. El ícono y el chevron son `aria-hidden`.
- Actualiza el comentario del componente: leyenda = lista con punto y vista interna; `otros` = cuadros con ícono que llevan a la pantalla de atrás.

## 3. Filtros de Clientes (`lib/clientes-resumen.ts` y `components/clientes/vista-clientes.tsx`)

- `FiltroClientes` suma `"catalogo"` y `"manual"`. `cumpleFiltroCliente` ya sabe contar esos grupos; haz que también filtre por ellos (`origen === "catalogo"` / `"manual"`). El orden de esos dos filtros es el mismo que en "Todos".
- La fila de pastillas sigue siendo `Todos · Deben · Repiten · Nuevos · Dormidos`, con los vacíos ocultos como hoy.
- **Pastilla temporal:** "Del catálogo" y "A mano" **no** están en la fila normalmente. Solo aparecen cuando son el filtro elegido, al final de la fila, ya elegidas (con su contador como las demás). Cuando la persona elige otro filtro, esa pastilla desaparece. No lleva X: para quitarla se toca "Todos" u otro filtro. La cápsula que se desliza debe animarse bien al llegar y al irse. Si `FilaPastillas` no lo maneja, agrega la opción solo mientras esté activa.
- Estado vacío de esos filtros, por si alguien llega con 0 (no debería, porque el cuadro en 0 no se toca): "Todavía no llega nadie por aquí." con remate "Aquí aparecerán cuando lleguen."

## 4. `contenido-resumen-clientes.tsx` y `hoja-resumen-clientes.tsx`

- Leyenda: sin cambios (punto, porcentaje, vista interna con Volver).
- Cuadros:
  - Nuevos → `<IconoBrote />`, filtro `"nuevos"`.
  - Dormidos → `<IconoLuna />`, filtro `"dormidos"`.
  - Del catálogo → `<IconoEnlace />`, filtro `"catalogo"`.
  - A mano → `<IconoEditar />`, filtro `"manual"`.
  - Subtítulos iguales que hoy.
- Al tocar un cuadro: cierra la hoja, pon ese filtro en la pantalla de Clientes y lleva el scroll al inicio de la lista. Recupera la prop `alFiltrar` que había antes del #35. Quita la vista interna solo para estos cuatro grupos; la de la leyenda se queda.
- Las acciones de la hoja (Tu próxima jugada) siguen debajo de los cuadros.

## 5. Tu inventario no cambia

No usa `otros`.

## 6. Verifica

- `npm run lint`, `npm run build` y las pruebas. Agrega una prueba de `cumpleFiltroCliente` para `"catalogo"` y `"manual"`, y otra de que la pastilla temporal solo aparece mientras está elegida.
- Capturas a 360 y 390 en `docs/capturas/clientes/`:
  - La hoja con los cuadros, con al menos uno en 0.
  - La pantalla de Clientes después de tocar "Del catálogo", con la pastilla al final y elegida.
  - La misma pantalla después de tocar "Todos", ya sin esa pastilla.
- Ningún ícono tiene fondo. Los cuadros en 0 no reaccionan al toque.

## 7. Cierre

Abre el PR contra `main` con las capturas. Si todo pasa, haz el merge tú mismo (squash) y borra la rama. Si algo falla o tuviste que decidir algo que no está aquí, deja el PR abierto y explícalo.
