# Landing · ajustes de Lewis, ronda 5: el like como en la app (14 oct 2026)

Lewis grabó el like en el catálogo real de su iPhone (Deslizapp → «Lo E'tickel»). Fotogramas: `like-real-secuencia.jpg`, a 8 cuadros por segundo, de izquierda a derecha y de arriba abajo. Dice: «La animación y color del like se ve de esta manera. **El corazón que usas ni siquiera tiene ese color.**» Se suma a las rondas 3 y 4. Para el ♥, **manda sobre todo lo anterior**.

## El color
- El like de la app es **mandarina**: `--dzf-mandarina: #ff834f` (`app/tienda/catalogo.css`, ≈ línea 6668). No es rosa.
- **Queda anulada** mi propuesta de la ronda 1 de un «♥ rosa para la compradora y verde para la tienda» (`.lt-hilo-rosa` y `.lt-hilo-verde` en `landing.css`). **El ♥ del hilo (el «dedo» de la ronda 3) es siempre mandarina** y usa el mismo SVG del corazón del reel. Al despachar puede seguir convirtiéndose en check.
- Saca el color del token del catálogo, no lo copies a mano.

## Lo que hace la app al dar like (lo que tiene que verse en la demo)
Según el video, en este orden:
1. El ♥ de la columna pasa a **relleno mandarina** y el contador sube.
2. **El burst:**
   - un corazón mandarina grande en el centro, con escala de 0.3 a 1.15 a 1 y puntitos que salen alrededor;
   - **«aaah»** debajo, con su animación.
3. Arriba a la izquierda aparece el sello **«EN TU PEDIDO»** (mandarina).
4. La bolsa muestra su **globito «1»**.
5. Sale el **aviso de la tienda**: un mensaje con el nombre y el texto (en el video: «¡Ay, qué buena elección! ¿Le agregas otro?…»).
6. Abajo aparece la **barra del pedido**: «1 producto · RD$…», el enlace «Ver o cambiar mi pedido» y el botón **«Enviar»**.

Todo esto ya lo hace el `Reel` real. Si en la demo no se ve alguna de estas cosas, la causa está en cómo se monta el reel en el iframe (props, estado, CSS que falta o capas que tapan), no en volver a dibujarlo. Revisa paso por paso que salgan las seis.

Si el ♥ del dedo coincide con el burst, que no se vean dos corazones a la vez: el dedo marca el toque con su pulso y desaparece, y el burst real hace el resto.

## Pruebas
- Captura a 393×852 de «aaah-termo» en mitad del burst, al lado de `like-real-secuencia.jpg`, en el PR.
- `probar-landing`:
  - el ♥ del hilo tiene el color `#ff834f` en todos los pasos (menos el check);
  - en «aaah-termo» se ven el burst, «EN TU PEDIDO», el globito de la bolsa y la barra «Enviar».
