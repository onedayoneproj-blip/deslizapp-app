# Toast

Mensaje flotante abajo, sobre la barra inferior: confirma algo que la persona acaba de hacer o informa un estado de la app que dura.

- `accion` con texto `sobre-accion`, `radio-l`, `sombra-flotante`, letra 16 bold.
- **Resultado** ("Abono guardado"): se va solo a los 3 s; puede llevar "Deshacer".
- **Persistente** ("Sin conexión", "Hay una versión nueva"): se queda hasta que cambia el estado; lleva una acción terciaria.
- Uno a la vez; el nuevo reemplaza al anterior. Se anuncia con `role="status"`.
- Si la acción se puede deshacer con el toast, no se pide confirmación antes.

Reemplaza a los avisos de red y de versión, que hoy tienen su propio diseño.

**Props previstas:** `mostrarToast(texto, {accion?, persistente?})` desde un proveedor único.
