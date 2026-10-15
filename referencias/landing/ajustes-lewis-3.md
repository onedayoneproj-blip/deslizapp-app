# Landing · ajustes de Lewis, ronda 3 (14 oct 2026)

Lewis vio el commit `29d090e` en su iPhone. Su captura está en `captura-lewis-3.png` (paso «pasa», 01 / 06). Si algo choca con las rondas anteriores, **manda esto**.

## 1. La bolsa queda lejos de los otros botones
En la captura, «Pedido» aparece muy abajo, separado de ♥, «Pregúntame» y «Compartir».
- La causa que se ve: **la tarjeta del reel no llena la pantalla del teléfono**. El termo termina a media pantalla y debajo asoma el tote. Los botones del lado van con la tarjeta, pero la bolsa va fija al borde de la pantalla.
- **Arréglalo en el origen:** cada tarjeta del reel debe medir lo mismo que la pantalla del mockup, como en la app. Revisa la altura del iframe y lo que usa el reel (`dvh`, `svh` o `innerHeight`) dentro del iframe. Así la bolsa queda en su sitio de la app.
- Compara con una captura del catálogo real a 393×852. Si no coinciden, la que manda es la de la app.

## 2. Burbujas más grandes
Hoy se ven pequeñas en el iPhone. Súbeles el tamaño de letra y el relleno, más o menos un 25 a 30 %, para que se lean de un vistazo. Siguen en el espacio reservado debajo del teléfono, sin tapar la pantalla.

## 3. El ♥ solo aparece cuando hace algo, y marca dónde se toca
Hoy el ♥ está siempre visible y se ve raro cuando está quieto. Lewis propuso también que el ♥ muestre dónde se hace clic. Planning junta las dos ideas: **el ♥ funciona como el dedo de la demo.**
- Aparece justo antes de un toque. Va hasta el lugar del toque (el botón «Lo quiero», la bolsa, «Enviar», el enlace, «¿Eres la tienda?», «Registrar», «Despachar»…) y hace un pulso de toque, como un círculo que se expande. Entonces el componente real reacciona.
- Si el paso lleva el pedido de un sitio a otro (de la bolsa a WhatsApp, o de un teléfono al otro), el ♥ viaja y **al llegar se desvanece**.
- En los pasos sin toque ni viaje («hola», «pasa», «aviso»), no se ve.
- En «aaah», el burst real ya es el corazón: el ♥ del dedo marca el toque y deja que el burst haga lo suyo.
- Los colores no cambian: rosa con la compradora, verde con la tienda y check al despachar.
- Con movimiento reducido, no hay ♥.

## 4. Índice del recorrido a un lado
Es para que se sepa cuánto falta y la demo no parezca un scroll sin fin. Es como la navegación del video.
- Una lista vertical con los 6 capítulos, en palabras cortas: **Elige · Envía · Sigue · Te llega · Registra · Despacha**. Si encuentras palabras más claras y del mismo largo, propónlas en el PR.
- Marca el capítulo actual (resaltado), los ya vistos (atenuados con check o en relleno) y los que faltan.
- **En el iPhone:** una columna estrecha pegada al borde derecho, con puntos o una barrita por capítulo. Solo el capítulo actual muestra su palabra. No debe empujar ni encoger el teléfono.
- **En escritorio:** la lista completa con todas las palabras.
- Tocar un capítulo lleva a su primer paso.
- Sustituye al contador «01 / 06». Si la columna no cabe bien en 360 de ancho, deja el contador en ese tamaño y avisa.

## Pruebas
- `probar-landing`:
  - la tarjeta del reel mide lo mismo que la pantalla del mockup;
  - la bolsa queda a la distancia de la app respecto a «Compartir», con una tolerancia de pocos píxeles;
  - el ♥ está oculto en los pasos sin toque ni viaje;
  - el índice marca el capítulo correcto en cada paso, y al tocarlo salta al paso correcto.
- Haz las capturas otra vez, sobre todo a 393×852.
