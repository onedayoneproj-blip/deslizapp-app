# Alerta

Tarjeta centrada sobre `velo` para confirmar algo que no se puede deshacer o que pierde datos.

- `superficie`, `radio-xl`, `sombra-hoja`, 300 px de ancho.
- Título en pregunta (`titulo-hoja`), una línea que diga la consecuencia concreta ("La deuda vuelve a subir RD$500") y dos botones: **Cancelar** (secundario, izquierda) y la acción (derecha): `peligro` relleno si destruye, `accion` si solo confirma.
- Escape y tocar fuera equivalen a Cancelar. Atrapa el foco y usa `role="alertdialog"`.
- Usos: borrar o eliminar, terminar una promo, "¿Salir sin guardar?".
- Nunca una confirmación que se despliega dentro de una tarjeta empujando el contenido. Si hay más de dos caminos, se usa una **Hoja** de acciones.

**Props previstas:** `abierta`, `titulo`, `descripcion`, `accion: {texto, tono: "peligro" | "accion", alConfirmar}`, `alCancelar`.
