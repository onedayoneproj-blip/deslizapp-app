# Landing · ronda 11: simetría de la burbuja y el doble check (15 oct 2026)

Captura de Lewis sobre c76b64e: `r11-burbuja-simetria-y-checks.png` (paso «eres-tienda»). Se suma a todo lo anterior.

## 1. Simetría: el aire de abajo de la burbuja = el de arriba
La burbuja tiene más aire arriba, donde el teléfono se monta sobre ella, que abajo. Lewis entiende que es a propósito (para que el teléfono no choque con las letras), pero quiere que se vea simétrico.
- Mide, dentro de la burbuja, la distancia **del texto al borde de arriba visible** (desde el borde de abajo del teléfono hasta la primera línea del texto) y la distancia **de la última línea al borde de abajo** de la burbuja.
- **Súbele el relleno de abajo** de la burbuja hasta que las dos distancias sean iguales (con tolerancia de 2 px). No toques el montaje del teléfono (unos 18 px) ni el tamaño de las letras.
- Las medidas dependen de cuántas líneas lleve el texto. Calcúlalo con una variable CSS, no con un número fijo, y revísalo con burbujas de una, dos y tres líneas, a 360, 393 y 430.
- Añade a `probar-landing` la comprobación de simetría (aire de arriba visible = aire de abajo, ±2 px) en todos los pasos.

## 2. El doble check «leído» se ve a medias
En la burbuja, los dos checks azules no terminan de dibujarse: se ve uno completo y el segundo a medias (en la captura parece una «✓\\»). Parece un bug.
- Es un fallo de animación o de dibujo. Mira cómo se pinta el SVG de los checks (`stroke-dashoffset`, `clip-path` o una escala) y en qué estado queda cuando termina el paso o al llegar de golpe a él (salto del índice, «Saltar», movimiento reducido).
- Los dos checks tienen que quedar **completos y azules `#53bdeb`** al final de la animación de la burbuja, también si la persona llega sin ver la animación y si retrocede y avanza.
- Deja la animación de los checks (se dibuja el primero y luego el segundo, en unos 300 ms) pero con un estado final garantizado (`animation-fill-mode: forwards` o el estilo final en la regla base).
- Prueba: al terminar cada paso, los dos trazos de los checks tienen la longitud completa (`getTotalLength()` o `stroke-dashoffset: 0`) y el color azul. Haz una captura a 393×852 con la burbuja ampliada en el PR.

## 3. Otras cosas que se ven en la captura
(Avisa de lo que no tenga arreglo sencillo; no cambies nada de diseño sin avisar.)
- En la hoja «¿Eres la tienda?» se lee el texto técnico «En iPhone este link se abrió en Safari, y Safari no comparte la sesión de la app instalada…». Es real de la app; déjalo como está.
- En el reel de arriba todavía dice «La Vuelta»: se corrige con el cambio a «Tu Tienda» de la ronda 10.
