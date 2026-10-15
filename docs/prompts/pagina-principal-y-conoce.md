# Página principal nueva en deslizapp.com y la landing a /conoce

Encargo de Plan, 15 oct 2026. Tu puesto es **Coding**. Parte de `main` actualizado.

**Modelo:** Claude Code **Opus** (la sesión de la landing, que ya conoce el código) · en Codex, el más alto con razonamiento alto.

## Qué decidió Lewis
1. **La landing que hicimos (#130 y #131) pasa a `deslizapp.com/conoce`.** Se ve **siempre**, haya sesión o no, para poder compartirla y enseñarla.
2. **`deslizapp.com/` sin sesión** muestra una **página principal nueva**, corta y con una animación continua: la opción «Inicio A» del lienzo de diseño (https://claude.ai/artifact/F6iDkiTg9CJp3kW8NKLzKJ). La fuente de referencia está en `referencias/inicio/inicio.dc.html`, a 390×844. **Es referencia visual, no código**: constrúyelo con los tokens y componentes de la app.
3. **Con sesión**, `/` sigue abriendo el panel, igual que hoy. No rompas `/entrar`, la vuelta del inicio de sesión (`app/auth/callback`, cookie `dz_volver`), «Ver demo» ni `/unirse/<código>`.
4. **«Quiero vender» abre el Instagram de Deslizapp**, no WhatsApp: `https://instagram.com/${INSTAGRAM_DESLIZAPP}` (`lib/config.ts`), con el icono de Instagram. Vale **también para el «Quiero vender» del cierre de la landing**.

## La página principal (`/` sin sesión)
- **Fondo Verde Bosque** `#174b3a` y theme-color igual.
- **Arriba:** solo el logo (icono de la app más la palabra «deslizapp» en Fredoka, en crema). No lleva «Entrar» arriba.
- **De fondo, el feed:**
  - tres columnas de fotos de producto 4:5 con esquinas de 18 px, giradas unos −7°, que **suben sin parar**, cada columna a su velocidad (por ejemplo 60, 45 y 75 s por vuelta), en bucle sin costura (la lista duplicada);
  - **las fotos son las del catálogo real de la tienda Deslizapp** (slug `deslizapp`): solo sus productos activos y sin borrar, con la primera foto de cada uno. Hoy son 9 (El Poloché, El Bolsito, La Gorrita, El Llavero, La Botella, El Librito, Lo E'tickel, Lo Covel, Lo' Hoddie).
  - Léelas en el servidor con revalidación (ISR, una hora más o menos) o en la compilación. Que la página no dependa del cliente para tenerlas. Pásalas por `next/image` a un tamaño pequeño.
  - Si hay menos de 6 fotos, completa con las `feed-*` de la landing.
  - Un degradado Bosque de lectura: suave arriba y sólido desde la mitad, detrás del texto.
- **La animación «viva»**, alternando cada 3 o 4 s:
  - un **corazón mandarina con «aaah»** que hace el burst sobre una foto al azar (la misma animación del like del reel, en pequeño);
  - una **burbuja de WhatsApp** (la de la landing: verde claro, Fredoka, cola de una pieza y doble check azul) que crece desde abajo y se va. Textos en bucle, con nombres de productos reales: «Nuevo pedido de Ana · RD$1,500», «Carlos le dio aaah a El Poloché», «Despachado», «Te escribió una clienta». Lleva sus iconos de la app, como en la ronda 12 (pedido → IconoPedidos, despachado → IconoCamion, etc.).
  - Todo con `transform` y `opacity`. Se pausa con la pestaña oculta. **Con movimiento reducido, todo quieto** (las columnas sin moverse, sin corazones y una sola burbuja fija).
- **Abajo:**
  - el **lema** con el mismo estilo de la portada de la landing: Fredoka 700 con trazo, **dos líneas por frase**, «vuelta.» en mandarina y «Vender con / más orden.» en rosa. Que no se parta a 360;
  - debajo, en Figtree 600 de 16 px, color `#dcebe2`: «Tu catálogo para vender por WhatsApp, y una app para todo lo que pasa después.»;
  - **botón principal «Iniciar sesión»**: crema `#fff9ee`, 56 px de alto, texto Bosque en 800, con el **logo de Google a color** (el «G» oficial de cuatro colores, según las pautas de marca de Google para el botón de inicio de sesión). Hace exactamente lo mismo que el botón de `/entrar`: el mismo flujo de Google, `dz_volver` incluido;
  - debajo, dos botones lado a lado, de 50 px:
    - **«Cómo funciona»**: mandarina `#ff834f`, texto `#10362a`, con un **icono tipo Reels** (cuadrado redondeado, franja de arriba con dos rayas en diagonal y triángulo de play; está en la referencia). Lleva a **`/conoce`**;
    - **«Quiero vender»**: contorno crema de 2 px, con el icono de Instagram. Abre el Instagram de Deslizapp.
- **Escritorio:** las columnas llenan el fondo (cinco o seis columnas) y el bloque de texto y botones queda a la izquierda, con un ancho máximo de unos 480 px. Muéstralo en el PR.
- Metadatos para compartir: título, descripción e imagen Open Graph propios de la página principal. La landing en `/conoce` conserva los suyos.

## `/conoce`
- Es la landing tal cual (después de #131), en su propia ruta. Funciona con sesión o sin ella; con sesión no redirige al panel.
- Los enlaces internos de la landing siguen funcionando ahí: «Saltar», el índice, «Ver la demo otra vez», el icono que vuelve a la portada y «Entrar».
- «Entrar» lleva a `/entrar`.
- Si alguien abre un enlace viejo a un paso (`/#paso-…`), que llegue a `/conoce#paso-…`.

## Pruebas
- `npm run tipos`, `npm run lint`, `npm test`, `npm run build`.
- `scripts/probar-landing.mjs` adaptado a `/conoce`, más un `scripts/probar-inicio.mjs` a 360×640, 393×852, 430×932 y 1440×900:
  - `/` sin sesión muestra la página principal; con sesión, el panel;
  - `/conoce` muestra la landing con sesión y sin ella;
  - las fotos de las columnas vienen de la tienda `deslizapp`;
  - «Iniciar sesión» inicia el mismo flujo que `/entrar`; «Cómo funciona» lleva a `/conoce`; «Quiero vender» abre el Instagram;
  - el lema en cuatro líneas sin partirse;
  - con movimiento reducido, nada se mueve.
- Corre también los `probar-*` de entrada, sesión y unirse.
- Capturas de la página principal a 393×852 y 1440×900 en `docs/capturas/inicio/`.

## Entrega
- Rama nueva desde `main` y PR contra `main`, con «Qué probar en tu iPhone».
- Si #131 todavía no está fusionado, parte de `main` y, cuando se fusione, trae `main` y resuelve. Avisa si chocan.
- **Déjalo abierto sin fusionar**: cambia lo primero que ve cualquiera en deslizapp.com. Plan lo fusiona cuando Lewis diga «mergea».
- Pide «@codex review» y atiende sus hallazgos.
- Avisa a Plan (`send_message` a `@parent`) al abrir el PR, con la primera vista previa visible, si quedas bloqueado y al terminar.
