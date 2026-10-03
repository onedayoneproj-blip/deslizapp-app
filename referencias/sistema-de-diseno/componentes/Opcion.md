# Opcion

Opción de formulario: elige un dato que se va a guardar (método de pago, fecha acordada, motivo); incluye el control Segmentos para dos o tres opciones excluyentes.

**Opcion (pastilla de formulario)**

- Alto 44, letra 16 extrabold, píldora.
- Elegida: relleno `accion-suave`, texto `texto` y un check en círculo `accion` a la izquierda. **Sin contorno verde y sin rosa**: así no se confunde con el botón principal ni con un filtro.
- Sin elegir: `superficie` con contorno `borde-pastilla`.
- Van en grupo con `role="radiogroup"` y su pregunta como título ("¿Cómo te pagó?").

**Segmentos**

- Para cambiar la **vista o el modo** de la pantalla, con 2 o 3 opciones ("Día / Semana / Mes", "Claro / Oscuro").
- No para datos que se guardan: "¿Cómo te paga? Pagó todo / A crédito" usa Opcion aunque sean dos.
- Pista `superficie-hundida`; el segmento elegido en `superficie` con letra extrabold, como en iOS.
- Más de 3 opciones: usar Opcion.

**Props previstas:** `opciones: {id, texto}[]`, `valor`, `alCambiar`, `etiqueta` (la pregunta, para lectores de pantalla).
