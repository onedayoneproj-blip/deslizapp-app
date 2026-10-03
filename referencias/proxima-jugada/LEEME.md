# Tu próxima jugada: referencias de diseño

Tableros del canvas "Tu próxima jugada" (Claude Design), aprobados por Lewis el 3 oct 2026. Sirven para ver **cómo se ve y cómo se mueve**: colores, tamaños, tiempos, curvas y orden de las animaciones. **No son código para copiar.** La app se construye con los componentes de `components/ui/` (docs/09 §16, punto 5).

Para verlos, ábrelos en un navegador. Son `.dc.html` con estilos dentro; la lógica de cada uno está en el `<script type="text/x-dc">` del final. Las fotos de las cartas están en `public/ilustraciones/proxima-jugada/`.

| Tablero | Qué muestra |
|---|---|
| `Main.dc.html` | La tarjeta con la **malla viva**: cuatro manchas que se mueven siempre, el velo, el grano y cómo los colores van hacia el dedo. El mazo sigue el ciclo de 14 s. |
| `Cartas.dc.html` | El ciclo de las cartas ("Las tres"): se asoma la destacada, se recoge, se baraja y se abre. Los `@keyframes tres0…tres3` tienen los porcentajes exactos. |
| `Arriba.dc.html` | La tarjeta arriba de todo en "Tus clientes", antes de la dona. |
| `Entrada.dc.html` | Al tocar la tarjeta: se agranda hasta llenar la hoja y las cartas vuelan a la galería. |
| `Barrido.dc.html` | Al elegir una jugada: el barrido de arriba abajo con el borde difuminado escondido bajo la franja. |
| `Acercarte.dc.html` | "Escribirle a…": saludo, código o productos, con la vista previa de WhatsApp. |
| `ChatVentana.dc.html` | La vista previa de WhatsApp nueva (ventana con cabecera) en el recordatorio y en Por reponer. |

`img/grano.svg` es el grano (ruido) que va encima del degradado; `img/patron-medio.svg` es el patrón de corazones del fondo de chat, un poco más visible que el de hoy.
