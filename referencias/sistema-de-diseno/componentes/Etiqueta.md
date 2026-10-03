# Etiqueta

Marca corta de estado sobre un elemento ("Pagado", "Atrasado 6 días", "Agotado"); no es tocable.

- Un solo tamaño: alto 24, letra `etiqueta` (12 extrabold), píldora, sin mayúsculas.
- Siempre con relleno visible, también sobre el fondo crema. Cuatro tonos: **éxito** (`accion-suave` + `exito-texto`: "Entregado", "Pagado", "Al contado", "Despachado"), **atención** (`atencion-suave` + `atencion-texto`: "Quedan 3", "A crédito", "Debe", "Atrasado"), **neutro** (relleno `borde-pastilla` + `texto`: "Por despachar", "Confirmado") y **fuerte** (`accion` + `sobre-accion`, solo "Agotado").
- Punto delante solo para estados vivos ("En línea").
- Máximo dos etiquetas por elemento. Si una etiqueta se toca para hacer algo, no es etiqueta: es un botón compacto.

**Contador:** círculo de 20 px con número `contador`; `resalte` cuando pide atención, `accion-suave` cuando solo informa.

Reemplaza las 16 variantes actuales (4 alturas, 3 letras).

**Props previstas:** `tono`: `"neutro" | "exito" | "atencion" | "fuerte"`, `punto?`.
