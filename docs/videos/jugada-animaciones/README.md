# Videos de «Tu próxima jugada»

Grabaciones reales de Chromium, modo demo, build local de producción. No son un
prototipo ni una animación reconstruida. Tamaño: 360, 390 y 430 × 844 px. Se usa el
FFmpeg oficial de Playwright para conservar los colores; MP4 H.264 a 24 fps.

Cada ciclo dura 8 segundos. Los clips de tarjeta, galería y detalle incluyen al
menos 16 segundos continuos (dos ciclos), sin acelerar ni pausar las animaciones.
Los recorridos muestran el morph, los cuatro barridos, los pulsos, los borradores,
scroll, edición y cierre durante una transición. Los clips reducidos muestran el
mismo recorrido sin movimiento decorativo.

| Ancho | Tarjeta (2 ciclos) | Galería (2 ciclos) | Detalle (2 ciclos) | Interacciones | Movimiento reducido |
|---|---|---|---|---|---|
| 360 px | [Video](tarjeta-360.mp4) | [Video](galeria-360.mp4) | [Video](detalle-360.mp4) | [Video](recorrido-360.mp4) | [Video](reducido-360.mp4) |
| 390 px | [Video](tarjeta-390.mp4) | [Video](galeria-390.mp4) | [Video](detalle-390.mp4) | [Video](recorrido-390.mp4) | [Video](reducido-390.mp4) |
| 430 px | [Video](tarjeta-430.mp4) | [Video](galeria-430.mp4) | [Video](detalle-430.mp4) | [Video](recorrido-430.mp4) | [Video](reducido-430.mp4) |

Para repetir: arrancar un build local con el mismo `VERCEL_DEPLOYMENT_ID` al
compilar y al ejecutar `npm start`, e instalar Playwright con su FFmpeg. Después:

```sh
URL=http://127.0.0.1:3104 node scripts/probar-movimiento-jugada.mjs
```

`VIDEOS` cambia el directorio de salida (`/tmp/jugada-animaciones` por defecto).
`CHROMIUM_PATH` permite elegir Chromium del sistema. `ANCHOS=390` limita los
ciclos y el recorrido a un ancho; `SOLO_RECORRIDO=1` omite los ciclos largos.
Las tres comprobaciones de movimiento reducido se ejecutan siempre.

El teclado se simula mediante `visualViewport`; estos videos no demuestran el
comportamiento de Safari ni de un teclado físico de iPhone. Ningún enlace de
WhatsApp se abre ni se envía mensaje alguno. Ninguna tienda real participa.
