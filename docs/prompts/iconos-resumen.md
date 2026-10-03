# Íconos en los grupos del resumen (rama `fix/iconos-resumen`)

Contexto: en la hoja "Tus clientes" (componente `components/ui/resumen-dona.tsx`, usado por `components/clientes/contenido-resumen-clientes.tsx`), la primera lista (la leyenda) lleva punto de color porque cada fila es un tramo de la dona. La segunda lista (Nuevos, Dormidos, Del catálogo, A mano) no lleva nada delante y se ve coja. La regla nueva de la guía (`docs/09-sistema-de-diseno.md` §7, "Hoja de resumen con dona", punto 3) dice: **punto = tramo de la dona; ícono = otro grupo**. Léela antes de empezar.

Referencia visual: tablero "Tus clientes: iconos en los grupos que no son de la dona" del canvas "Cliente: cobro y recordatorio" (Lewis lo tiene abierto).

## Qué hacer

1. **Íconos nuevos en `components/iconos.tsx`**, con el mismo `Icono` base (24, trazo 2, puntas y uniones redondeadas, sin relleno):
   - `IconoBrote` (Nuevos):
     - `M12 20v-7.5`
     - `M12 12.5C12 8.9 9.6 6.5 5.5 6.5c0 3.6 2.4 6 6.5 6z`
     - `M12 14.5c0-3 2.1-5 5.5-5 0 3-2.1 5-5.5 5z`
   - `IconoLuna` (Dormidos):
     - `M19.5 14.6A7.8 7.8 0 0 1 9.4 4.5a8 8 0 1 0 10.1 10.1z`
   - `IconoEnlace` (Del catálogo):
     - `M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1`
     - `M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1`
   - A mano usa el `IconoEditar` que ya existe (lápiz). No dupliques.

2. **`FilaResumen` acepta `icono?: ReactNode`.** En `Fila` de `resumen-dona.tsx`, `inicio` es una ranura fija de 24 × 24 (`flex size-6 items-center justify-center text-texto`) para todas las filas: adentro va el punto (si hay `color`) o el ícono (si hay `icono`). Así los nombres de la leyenda y de la segunda lista quedan en la misma columna. Si una fila no trae ni color ni ícono, no lleva ranura (como hoy).

3. **El ícono va suelto**: color `texto`, sin círculo ni fondo pálido detrás (regla de iconos de la guía). Mismo color en filas con 0 y con datos; lo que cambia en 0 es el número (secundario) y la falta de chevron, como ya está.

4. **En `contenido-resumen-clientes.tsx`** pasa `icono` a las cuatro filas de `otros`: Nuevos → `<IconoBrote />`, Dormidos → `<IconoLuna />`, Del catálogo → `<IconoEnlace />`, A mano → `<IconoEditar />`. Los subtítulos y lo demás no cambian.

5. **Tu inventario no cambia**: no usa `otros` (sus tarjetas de "Necesita tu atención" ya llevan su ícono). Si en el futuro una hoja usa `otros`, cada fila debe traer su ícono; documenta eso en el comentario de `ResumenDona` ("`otros`, con ícono de línea en vez de punto").

6. **Verifica**:
   - `npm run lint`, `npm run build` y las pruebas.
   - Capturas a 360 y 390 de la hoja Tus clientes (con al menos un grupo en 0) en `docs/capturas/clientes/`. Comprueba que los nombres de las dos listas están alineados y que ningún ícono tiene fondo.
   - Lector de pantalla: el ícono es `aria-hidden`; la etiqueta de la fila no cambia.

7. Abre el PR contra `main` con las capturas. Si todo pasa, haz el merge tú mismo (squash) y borra la rama. Si algo falla o tuviste que decidir algo que no está aquí, deja el PR abierto y explícalo.
