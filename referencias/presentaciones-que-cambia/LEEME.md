# Presentaciones: «¿Qué cambia de una a otra?» (aprobado por Lewis el 7 oct 2026)

Lienzo de Claude Design: https://claude.ai/artifact/RruuuejLhTu6QHVTYz96xY

1. `1-elegir` — la lista: «Lo típico en {tipo}», «Otras» y «+ Otra cosa». Cada cosa que cambia es un **rectángulo** (no pastilla), que al elegirlo se pone verde oscuro con check.
2. `2-una-elegida` — al elegir una sale su sección («¿Cuáles tienes?»): la **misma etiqueta verde oscuro**, «Quitar» y los valores como **pastillas redondas** menta con check, más «+ Otro color».
3. `3-dos-elegidas` — el máximo (2): las demás se apagan y **«+ Otra cosa» se convierte, en el mismo lugar, en «Ya elegiste 2: es el máximo.»** Sin contador, sin aviso grande, sin tostada. La cifra de cuántas salen está en el botón («Crear las 6»).
4. `4-otra-cosa` — «+ Otra cosa» abre su sección con «¿Qué otra cosa cambia?» y «Listo».

Decisiones de Lewis: hasta 2 cosas que cambian por producto; lo que se agrega o quita vale solo para ese producto; en pantalla nunca «dimensión».
Las listas de valores y los nombres del lienzo son de ejemplo. No copies su HTML: `components/ui/` y los tokens (`docs/09`).

## La lista que se expande (8 oct 2026, aprobada por Lewis)

Reemplaza la cuadrícula de rectángulos de arriba de #70. Prompt: `docs/prompts/presentaciones-lista-expandible.md`.

5. `5-lista-una-abierta` — una lista de tarjetas blancas de bordes redondeados, sin recuadro verde en el nombre. Sin elegir: nombre y círculo arena con «+». Elegida y abierta: nombre con **chevron** al lado, **«Quitar»** (texto) arriba a la derecha y los valores en **filas**.
6. `6-lista-dos-elegidas` — una cerrada con su resumen («Dorado, Plateado») y otra abierta; las demás apagadas y «Ya elegiste 2: es el máximo.» en lugar de «+ Otra cosa».
7. `7-lista-valores-con-scroll-descartada` — los valores en una sola fila con scroll de lado. **Se descartó**; solo queda de referencia.

Descartado en el camino: la franja verde de encabezado, la etiqueta verde en el nombre, el botón X en el borde de la tarjeta y el chevron en un círculo en la esquina.
