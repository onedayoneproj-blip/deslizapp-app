# Donas sin anillo de fondo y Agotados en rojo (rama `fix/dona-sin-pista`)

Antes de empezar, lee en `docs/09-sistema-de-diseno.md` §11 las reglas "Barras y anillos" (se agregó **Sin anillo de fondo**) y "Colores del inventario" (nueva).

## Problemas

1. Todas las donas (Clientes en la pantalla y en la hoja "Tus clientes"; Catálogo en la pantalla y en la hoja "Tu inventario") dibujan un **anillo pálido completo detrás** (`pista`). Ese anillo no está en ninguna leyenda: parece un tramo más y confunde. Se nota sobre todo entre tramos y donde hay huecos.
2. En el inventario, **Agotados** sale en `atencion-suave` (un crema durazno) en la dona y en la leyenda, y en `resalte` en la barra del plan. Es lo que más pide acción, así que debe ser rojo, y el mismo color en los tres lugares.

## 1. `components/dona.tsx`: sin pista cuando hay datos

- El `<circle>` de la pista se dibuja **solo cuando la suma de los segmentos es 0** (estado vacío: anillo entero en `pista`, para que la dona no desaparezca). Con cualquier dato, no se dibuja: solo los arcos, con su separación de 3 px, y entre ellos se ve el fondo.
- Deja la prop `pista` (sirve para el estado vacío) y actualiza el comentario del componente.
- La animación de los arcos no cambia.

## 2. Colores del inventario

- En `components/catalogo/dona-inventario.tsx`, `COLOR_STOCK.agotados` pasa a `"var(--peligro)"`. `conStock` sigue en `accion` y `quedan` en `resalte`.
- En `components/catalogo/hoja-inventario.tsx`, la barra del plan y su leyenda usan `COLOR_STOCK` en vez de clases sueltas: Disponibles = `COLOR_STOCK.conStock`, Agotados = `COLOR_STOCK.agotados` (hoy está `bg-resalte`), Libres = `superficie-hundida` (ese sí es un tramo de su leyenda, se queda).
- Busca cualquier otro lugar que pinte "agotados" en un gráfico o en un punto de leyenda (por ejemplo la dona chica de la pantalla de Catálogo o la tarjeta En línea) y usa el mismo `COLOR_STOCK.agotados`.
- **No toques los tokens del modo oscuro.** En oscuro, `peligro` y `resalte` hoy casi coinciden. Eso se resuelve en el paso del modo oscuro, no aquí.

## 3. Clientes

- Los colores de la dona de Clientes no cambian: "Sin comprar todavía" en `borde-pastilla` sí es un tramo de su leyenda, con su punto en aro.
- Solo se quita la pista, en las dos donas de Clientes.

## 4. Verifica

- `npm run lint`, `npm run build` y las pruebas.
- Capturas a 360 y 390 en `docs/capturas/` de:
  - Las dos donas de Clientes (pantalla y hoja).
  - Las dos de Catálogo, con al menos un agotado y uno con 1 o 2 unidades.
  - Una dona en estado vacío (todo en 0), para comprobar que se ve el anillo vacío.
- Comprueba que ningún anillo tiene círculo pálido detrás cuando hay datos, y que Agotados se ve rojo en la dona, en la leyenda y en la barra del plan.

## 5. Cierre

Abre el PR contra `main` con las capturas. Si todo pasa, haz el merge tú mismo (squash) y borra la rama. Si algo falla o tuviste que decidir algo que no está aquí, deja el PR abierto y explícalo.
