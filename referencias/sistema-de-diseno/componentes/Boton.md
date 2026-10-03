# Boton

Botón píldora con cinco jerarquías (principal, secundario, terciario, peligro, resalte) y tres tamaños (52, 44 y 36 px).

**Cuándo usar cada uno**

- **Principal** (`accion` relleno): la acción que la persona vino a hacer. Una por vista. Guardar, confirmar, crear y avanzar siempre son verdes.
- **Secundario** (contorno `accion`): la alternativa al principal o una acción importante que no es la principal.
- **Terciario** (solo texto `accion`, sin subrayado): acciones menores dentro de tarjetas y filas ("Cambiar", "Ver historial", "Reintentar"). Reemplaza todo texto subrayado usado como botón.
- **Peligro** (contorno y texto `peligro`): borrar, eliminar, terminar. El relleno de peligro solo se usa en el botón final de una Alerta.
- **Resalte** (Mandarina): solo el botón flotante (+) y una llamada emocional por pantalla. Nunca para guardar ni confirmar.

**Tamaños:** grande (52, letra 17) al pie de hojas y formularios; normal (44, letra 16); compacto (36, letra 14) dentro de tarjetas, con área de toque de 44.

**Reglas**

- Dos botones juntos nunca tienen la misma jerarquía: secundario a la izquierda, principal a la derecha, mismo ancho.
- Deshabilitado = opacidad 40 %. Mejor todavía: una línea debajo que diga qué falta.
- Texto con verbo y específico: "Guardar abono", no "Aceptar".

**Props (componente React previsto en `components/ui/boton.tsx`)**

- `jerarquia`: `"principal" | "secundario" | "terciario" | "peligro" | "resalte"` (por defecto principal)
- `tamano`: `"grande" | "normal" | "compacto"` (por defecto normal)
- `icono?`: icono a la izquierda; `anchoCompleto?`; `cargando?` (muestra puntos y bloquea el doble toque); y los atributos normales de `<button>` o `href` para enlaces.
