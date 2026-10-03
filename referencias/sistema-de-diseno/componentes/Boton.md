# Boton

Botón píldora con cinco jerarquías (principal, secundario, terciario, peligro, resalte) y tres tamaños (52, 44 y 36 px).

**Cuándo usar cada uno**

- **Principal** (`accion` relleno): la acción que la persona vino a hacer. Una por vista. Guardar, confirmar, crear y avanzar siempre son verdes.
- **Escribir por WhatsApp:** siempre compacto relleno `accion` con el icono de WhatsApp, también dentro de tarjetas, porque saca a la persona hacia el chat.
- **Secundario** (contorno `accion` con relleno `superficie`, nunca transparente): la alternativa al principal o una acción importante que no es la principal. En compacto (36 px) es la forma de toda acción dentro de una tarjeta o fila ("Cambiar", "Ver historial"): se tiene que ver que es un botón.
- **Terciario** (solo texto, sin subrayado): casi nunca. Solo la acción destructiva al final de una pila ("Cancelar pedido", en `peligro`) y "Reintentar" dentro de un aviso.
- **Peligro** (contorno y texto `peligro`): borrar, eliminar, terminar cuando es la acción central de su vista. En una pila de acciones bajo la principal ("Cancelar pedido") va como **terciario en `peligro`** (solo texto rojo). El relleno de peligro solo se usa en el botón final de una Alerta. Nunca un botón de borrar en cada fila: la fila abre una hoja con su detalle y ahí se borra.
- **Resalte** (Mandarina): solo el botón flotante (+) y una llamada emocional por pantalla, como "Despachar pedido" (el momento que cierra la venta). Nunca para guardar ni confirmar un formulario.

**Tamaños:** grande (52, letra 17) al pie de hojas y formularios; normal (44, letra 16); compacto (36, letra 14) dentro de tarjetas, con área de toque de 44.

**Reglas**

- Dos botones juntos nunca tienen la misma jerarquía: secundario a la izquierda, principal a la derecha, mismo ancho.
- Deshabilitado = opacidad 40 %. Mejor todavía: una línea debajo que diga qué falta.
- Texto con verbo y específico: "Guardar abono", no "Aceptar".

**Props (componente React previsto en `components/ui/boton.tsx`)**

- `jerarquia`: `"principal" | "secundario" | "terciario" | "peligro" | "resalte"` (por defecto principal)
- `tamano`: `"grande" | "normal" | "compacto"` (por defecto normal)
- `icono?`: icono a la izquierda; `anchoCompleto?`; `cargando?` (muestra puntos y bloquea el doble toque); y los atributos normales de `<button>` o `href` para enlaces.
