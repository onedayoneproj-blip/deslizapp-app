# Pastilla

Pastilla de filtro: cambia lo que se ve en una lista, no guarda ningún dato.

- Alto 36 (área de toque 44), letra 14 extrabold, contador opcional.
- Elegida: relleno `accion`, texto `sobre-accion`. Sin elegir: `superficie` con contorno `borde-pastilla`.
- Una sola elegida a la vez. La fila hace scroll horizontal y deja ver la siguiente cortada.
- **Divisor:** solo entre filtros fijos (siempre visibles) y condicionales (aparecen cuando tienen algo, como Deben o Dormidos). Los condicionales se ocultan con contador 0, salvo que estén elegidos.
- Contador `resalte` solo cuando pide atención (Agotados, Deben, Nuevos pedidos); si no, `accion-suave`.

Para elegir un dato que se va a guardar se usa **Opcion**; para dos o tres opciones excluyentes, **Segmentos**.

**Props previstas:** `opciones: {id, texto, cantidad?, condicional?, atencion?}[]`, `valor`, `alCambiar`.
