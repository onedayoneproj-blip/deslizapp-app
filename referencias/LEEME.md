# Referencias visuales

Archivos HTML autocontenidos (se abren con doble clic en el navegador). Son
**referencia de diseño y comportamiento, no código para copiar**: el panel real
se construye en Next.js según `docs/`.

| Archivo | Qué es | Úsalo para |
|---|---|---|
| `prototipo-interactivo/` | **El prototipo interactivo y navegable del panel** (9 pantallas: Inicio, Catálogo, Nuevo producto + retoque, Pedidos, Detalle de pedido, Clientes, Promos, Nueva promo, Plan y créditos). Abre `Main.dc.html` en el navegador; la barra inferior navega entre pantallas y los botones funcionan. Los demás `.dc.html` solo muestran una pantalla suelta; `canvas.json` es el orden del tablero | La **referencia visual principal**: medidas, colores, tarjetas, textos y comportamiento de cada pantalla. Para leer el código de una pantalla, busca su bloque en `Main.dc.html` (estilos en línea con valores exactos) |
| `panel-de-tienda-prototipo.html` | Reel animado del panel de tienda con las pantallas validadas (Resumen, Catálogo, retoque, Pedidos, Detalle, Clientes, Promos) | Ver cómo debe verse y sentirse cada pantalla: espaciado, tarjetas, navegación inferior, colores, tono de los textos |
| `catalogo-esencias-michel.html` | Catálogo público de ejemplo con la capa de firma Deslizapp | Referencia del catálogo (vive en otro proyecto; no se construye aquí) |
| `catalogo-y-app-conectados.html` | Video que muestra cómo se conectan el catálogo y el panel | Entender el flujo completo: aaah, pedido, despacho, agotado, promo |


## Cómo resolver diferencias

- **Diseño visual y textos de pantalla:** manda `prototipo-interactivo/`,
  **salvo estas dos decisiones del dueño, que mandan sobre el prototipo**:
  - **Barra de navegación inferior:** barra en cápsula con pestañas
    tradicionales (ícono arriba, nombre siempre visible debajo) y un selector
    Rosa Suave en cápsula de ancho variable con "imán" al arrastrar el dedo
    (se estira con resistencia y salta de pestaña en pestaña). En el prototipo
    el ícono activo se expande en una píldora verde con su nombre: eso **ya no
    aplica**.
  - **Hojas inferiores:** pegadas a los bordes, con solo las esquinas de
    arriba redondeadas (30 px); altura máxima hasta debajo de la barra de
    estado (safe area de arriba + 10 px); cabecera fija superpuesta con borde
    de desplazamiento (desenfoque progresivo + degradado Papel); alturas
    "auto" / "expandible" / "grande" y cerrar deslizando hacia abajo
    (`components/hoja.tsx`). El modo flotante de iOS 26 se descartó. En el
    prototipo la hoja se desplaza entera y su tope es otro: eso **ya no
    aplica**.
  Ver `docs/04-pantallas.md` ("Reglas generales").
- **Reglas de datos, stock, créditos y arquitectura:** mandan los `docs/`.
- El prototipo incluye cosas que `docs/04-pantallas.md` describe poco o
  no describe (por ejemplo la tarjeta de ventas del Resumen, el selector
  Hoy / 7 días / Este mes, el ticket promedio y la pantalla "Plan y
  créditos"). Antes de construir cada pantalla, ábrela en el prototipo y
  decide con `docs/02-alcance.md`; si algo no está claro, pregúntale al dueño.
- Los datos de ejemplo del prototipo (montos, nombres) son solo de muestra: los
  datos reales de prueba salen de `lib/data/seed/`.
- El prototipo carga tipografías desde Google Fonts; sin internet se ven
  con una tipografía de reemplazo.
