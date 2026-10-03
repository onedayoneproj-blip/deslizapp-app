# Campo

Campo de texto con su rótulo arriba, ayuda o error abajo; incluye la variante Buscador.

- Alto 50, `radio-m`, fondo `superficie`, contorno 1.5 px `borde-campo` (3:1, para que se vea dónde escribir), letra 16 (evita el zoom automático de iOS).
- Rótulo siempre visible arriba (14 extrabold); nunca solo un texto de ejemplo dentro.
- Foco: anillo `foco` de 3 px. Error: contorno `peligro` y mensaje debajo que explique cómo arreglarlo.
- Teclado correcto según el dato: numérico para montos, teléfono para WhatsApp.
- **Buscador:** píldora de 50 px con lupa, contorno `borde-pastilla`; solo para filtrar listas.

Hoy la clase del campo está copiada en 6 archivos; pasa a ser un solo componente.

**Props previstas:** `etiqueta`, `ayuda?`, `error?`, más los atributos de `<input>`; `Buscador` con `valor`, `alCambiar`, `placeholder`.
