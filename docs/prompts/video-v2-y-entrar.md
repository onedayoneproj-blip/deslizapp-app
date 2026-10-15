# Landing: video nuevo de portada y «Entrar» que lleva a la página principal

Encargo de Plan, 15 oct 2026, de Lewis. Tu puesto es **Coding**. **Rama nueva desde `main`** (ya tiene #132), PR nuevo y **sin fusionar** hasta que Lewis diga «mergea».

## 1. Video nuevo de la portada de `/conoce`
- El video nuevo es `referencias/landing/video-portada-v2-original.mov`: 7.9 s, 1440×2560, 24 cps, con audio. Sustituye al actual en todo.
- Comprímelo como el anterior: sin audio, unos 720×1280, AV1/WebM y H.264/MP4 de menos de 2.5 MB cada uno, más un póster WebP del primer fotograma. Sustituye los `portada.*` de `public/landing/` (o crea `portada-v2.*` y borra los viejos). El `.mov` de `referencias/` no se publica.
- **Nuevo comportamiento:**
  1. **Primera reproducción completa, sola y limpia:** al abrir `/conoce`, el video se ve a pantalla completa y entero **una vez**, sin el icono, el lema, el teléfono bloqueado ni «Desliza y mira» encima. Arriba solo queda «Saltar».
  2. **Al terminar esa primera vuelta** (evento `ended`, o `timeupdate` cerca del final), el video sigue **en bucle**, y entonces entran, como ahora y en su orden:
     - el icono y la línea de contexto;
     - el lema y la descripción;
     - el teléfono bloqueado que sube con el aviso de Tu Tienda;
     - «Desliza y mira».
  3. **Si la persona desliza o toca antes de que termine la primera vuelta**, no hay que esperar: entra todo de inmediato y el desbloqueo funciona como siempre.
- **Con movimiento reducido o ahorro de datos:** no hay video, solo el póster, y todo aparece desde el principio.
- Si el autoplay falla en iOS, se trata igual que movimiento reducido: el póster y todo visible, sin esperar un `ended` que nunca llega.
- Pon un tope de seguridad: si a los 10 s no ha llegado `ended`, entra todo igual.

## 2. «Entrar» lleva a la página principal
Hoy, el «Entrar» del cierre de `/conoce` (y el de «¿Ya tienes tienda? Entrar») lleva a `/entrar`, que es la pantalla vieja («Tu tienda, en tu bolsillo», captura `referencias/inicio/r2-entrar-viejo.png`). Lewis quiere que lleve a la página principal nueva.
- **«Entrar» de `/conoce` → `/`.** Sin sesión, `/` es la página principal nueva, con su «Iniciar sesión»; con sesión, el panel.
- **`/entrar` también usa el diseño de la página principal nueva** (el mismo componente: fondo Bosque con el feed, el lema y los mismos botones), para que no quede una segunda pantalla de entrada con otro estilo. Diferencias:
  - Los avisos que hoy muestra `/entrar` («Tu sesión se cerró…», `?error_login=1`, el de Safari e iPhone, y cualquier otro) van **en una tarjeta crema encima de los botones**, bien visibles, con el mismo texto de hoy.
  - **«Ver demo»** (entrar a la app con datos de prueba) se conserva en `/entrar` y también en `/`, como **enlace de texto pequeño** debajo de los tres botones: «Probar la app con datos de prueba». Ninguno de los tres botones cambia.
- No rompas la vuelta del inicio de sesión (`app/auth/callback`, `dz_volver`), `/unirse/<código>` ni los casos de error. Cualquier sitio de la app que hoy mande a `/entrar` tiene que seguir funcionando.
- Revisa los otros enlaces que lleven a `/entrar` (`grep -rn "/entrar"`) y decide en cada uno si va a `/` o se queda en `/entrar`. Explícalo en el PR.

## Pruebas
- `probar-landing` en `/conoce`:
  - en la primera vuelta del video no hay icono, lema, teléfono ni «Desliza y mira»;
  - al terminar (simulando `ended`) entran todos;
  - si se desliza antes, entran de inmediato;
  - con movimiento reducido aparece todo desde el principio;
  - el tope de 10 s funciona.
- `probar-inicio`:
  - el «Entrar» de `/conoce` lleva a `/`;
  - `/entrar` muestra el diseño nuevo con sus avisos (`?error_login=1`) y el enlace «Probar la app con datos de prueba»;
  - el flujo de Google no cambia.
- `npm run tipos`, `lint`, `test`, `build`, y los `probar-*` de entrada, sesión y unirse.
- Capturas de `/entrar` con un aviso, a 393×852.

## Entrega
PR con «Qué probar en tu iPhone». Pide «@codex review». Avisa a Plan con la vista previa.
