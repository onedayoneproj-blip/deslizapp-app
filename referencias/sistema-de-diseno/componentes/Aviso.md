# Aviso

Mensaje en línea dentro de una pantalla u hoja, ligado a lo que se está viendo; no flota ni se va solo.

- `radio-m`, relleno 12 × 16, letra 15.
- Cuatro tonos: **neutro** (`superficie-hundida`, información), **atención** (`atencion-suave`, deuda, límites, algo que revisar), **éxito** (`accion-suave`) y **peligro** (error al guardar o cargar, texto `peligro`).
- Si necesita acción, lleva un botón terciario al final ("Reintentar"), nunca un texto subrayado.

**Cuál usar:** resultado de algo que la persona hizo → **Toast**. Estado de la app que dura (sin red, versión nueva) → **Toast** persistente. Confirmar algo que no se deshace → **Alerta**. Información sobre lo que se ve → **Aviso**.

**Props previstas:** `tono`: `"neutro" | "atencion" | "exito" | "peligro"`; `accion?: {texto, alTocar}`.
