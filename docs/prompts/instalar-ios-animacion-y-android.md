# Instalar la app: animación en iPhone y botón en Android

Encargo de Planning, 11 oct 2026. Tu puesto es **Coding**. Lewis aprobó el diseño de la animación y pidió el botón de Android.

## 0. Contexto

Lee desde `main` actualizado: `docs/00-contexto-del-proyecto.md`, `AGENTS.md`, `HANDOFF.md` (reglas de movimiento y teclado), `docs/handoffs/planning-sesion.md`, `docs/forma-de-trabajo.md`, `docs/17-onboarding.md` (paso 6 «Pantalla de inicio»), `docs/08-movimiento.md`, `docs/09-sistema-de-diseno.md` y `referencias/instalar-ios/LEEME.md` (abre el lienzo vinculado; solo referencia visual).

**PR dependiente (excepción autorizada por Planning, regla 4 de `docs/forma-de-trabajo.md`).** Hoy el paso vive en `components/inicio/checklist-tienda.tsx` (hoja «Tu tienda, a un toque», `hoja === "instalar"`) y el PR #103 (rediseño visual de la guía, rama `feat/onboarding-guia-rediseno`, HEAD `f0e0f26bb682b14ecf036221460b1b16366ccb73`) reescribe ese mismo archivo y aún no está fusionado. Por eso:
- Primero comprueba si #103 ya está en `main`. Si lo está, rama `feat/instalar-ios-android` desde `origin/main` y PR normal contra `main`.
- Si no lo está, crea `feat/instalar-ios-android` desde la rama de #103 y abre el PR **contra `feat/onboarding-guia-rediseno`** (base declarada), diciéndolo al inicio de la descripción: «Depende de #103; no fusionar antes». Registra el SHA de partida. Después del squash de #103, Planning cambia la base a `main` y tú revisas que el diff no arrastre cambios de #103.
- Orden de integración: #103 primero, este después. Todo lo nuevo (animación, hook de instalación) va en archivos nuevos bajo `components/pwa/`; el cambio en `checklist-tienda.tsx` debe quedar acotado a la hoja «instalar».
- El otro PR abierto (#102, carrusel) toca `components/tienda/` y `app/tienda/catalogo.css`: no los toques. `lib/novedades.ts` es compartido: usa la versión siguiente a la última que haya en la base (hoy #102 y #103 usan `0.60.0`; la tuya debe ser mayor).

## 1. iPhone: animación del flujo

Reemplaza el párrafo «En iPhone» por la animación aprobada (referencia visual en el lienzo): un iPhone esquemático con seis momentos en bucle (~13 s) y una frase por momento debajo («1 En Safari, toca el menú ☰ de la barra de abajo», «2 Elige Compartir», «3 Toca Ver más», «4 Baja y toca Añadir a pantalla de inicio», «5 Deja Abrir como app web encendido y toca Añadir», «Listo. Deslizapp ya vive en tu pantalla de inicio»).

- Componente propio y reutilizable (por ejemplo `components/pwa/animacion-instalar-ios.tsx`), con SVG/HTML propio y **solo tokens** (`superficie`, `superficie-hundida`, `linea`, `texto`, `accion`, `marca-rosa`…; nada de colores a mano; el icono de Deslizapp con el isotipo existente). Funciona en claro y oscuro. **No copies el HTML del lienzo.**
- Movimiento: solo `transform` y `opacity`, con los tokens `--mov-*`/`--curva-*` donde apliquen, sin librerías. La animación corre solo mientras la hoja está abierta y visible (se detiene al cerrar o con la pestaña oculta). Con `prefers-reduced-motion` queda **quieta en el paso 5** (el más importante) con su frase.
- Accesibilidad: la ilustración es decorativa para lectores de pantalla (`aria-hidden`) y los seis pasos se ofrecen como **lista de texto accesible** (puede ir `sr-only` o visible como resumen, tú decides lo mejor); el texto del paso activo se actualiza visualmente con la animación.
- Nota: el flujo es el de **Safari en iOS 26**. En iOS anteriores el botón Compartir está directo en la barra: añade una línea pequeña «¿No ves ☰? Toca Compartir directamente».
- Otros navegadores en iPhone (Chrome/Instagram dentro de la app): si se detecta un navegador integrado (UA de Instagram/Facebook/WhatsApp), una línea «Ábrela en Safari».

## 2. Android: botón «Instalar»

Chrome (y Edge, Samsung Internet) en Android dispara el evento `beforeinstallprompt` cuando la app es instalable (ya hay `app/manifest.ts`, iconos y `public/sw.js`). Con eso:

- Captura el evento **globalmente y pronto** (puede llegar antes de que se abra la hoja): un pequeño proveedor/hook (por ejemplo `components/pwa/instalar-pwa.tsx`) que guarda el evento (`preventDefault()` y lo retiene), expone `puedeInstalar`, `instalar()` y `instalada`, y escucha `appinstalled`. Solo en cliente, sin romper SSR; sin tocar `public/sw.js` salvo que haga falta.
- En la hoja, con Android y el evento disponible: botón principal **«Instalar Deslizapp»** (jerarquía principal). Al tocarlo se llama a `prompt()`; Chrome muestra **su propio diálogo de confirmación** (no se puede instalar en silencio: dilo tal cual en el PR; el usuario da un toque y confirma). Resultado `accepted` → se marca el paso `pantalla_inicio_en` con la misma función que ya existe (`marcar`), toast breve y se cierra la hoja; `dismissed` → no pasa nada, el botón sigue disponible (el evento se consume tras `prompt()`: maneja que Chrome tarde en volver a emitirlo y cae al texto manual).
- Sin evento (ya instalada, Firefox, navegador integrado, iOS, escritorio): para **ya instalada** (`display-mode: standalone`, ya hay detección en `checklist-tienda.tsx`) muestra «Ya está instalada» y marca el paso como hecho por la vía existente si corresponde; para el resto, el texto manual actual pero más claro y corto: «Abre Deslizapp en Chrome. Toca ⋮ y luego Instalar aplicación (o Añadir a pantalla de inicio).»
- `appinstalled` también marca el paso (si la persona instala por el menú de Chrome estando la hoja abierta).

## 3. La hoja

Mantén `Hoja` `titulo="Tu tienda, a un toque"` con `protegerAtras`. Arriba, un `Segmentos` **iPhone / Android** (jerarquía de pastillas existente), preseleccionado según el dispositivo (`navigator.userAgent`; en escritorio, iPhone). Debajo, según la pestaña: la animación (iPhone) o el botón (Android). «Ya lo hice» se mantiene para iPhone (no hay API) y para el texto manual de Android. Mantén la lógica de `guardando`, errores y `Aviso` actuales. Sin cambios de datos, permisos ni Supabase.

## 4. Documentación y novedades

- `docs/17-onboarding.md`: bloque de decisión fechado (11 oct 2026) para el paso 6 (animación iOS, botón Android, qué se marca y cuándo).
- `docs/09-sistema-de-diseno.md`: una línea sobre ilustraciones esquemáticas de pasos (solo tokens, quietas con movimiento reducido).
- `lib/novedades.ts`: una línea en tono de marca (versión siguiente a la de main).

## 5. Pruebas

`npm run lint`, `npm run build`, `npm test`, `npm run tipos`. Pruebas de navegador: la animación aparece y se detiene con movimiento reducido; con `beforeinstallprompt` simulado (despáchalo con un evento falso que tenga `prompt()` y `userChoice`) el botón aparece, `accepted` marca el paso y `dismissed` no; sin evento se ve el texto manual; a 360/390/430 px, claro y oscuro. Actualiza los scripts de onboarding que buscaban el texto anterior de la hoja. El diálogo real de Chrome y Safari de iPhone no se pueden probar aquí: dilo en el PR y deja a Lewis una lista corta (Android con Chrome: tocar Instalar y confirmar; iPhone: ver la animación).

## 6. Entrega y aviso a Planning

PR abierto contra `main`, **sin merge**: Lewis prueba la preview en su teléfono. Un solo push por ronda. La URL del alias de la rama la recorta Vercel si el nombre es largo: **búscala en el despliegue de Vercel del PR y pon la real**. Handoff en `docs/handoffs/instalar-ios-android.md`.

**Avísame siempre cuando termines** (regla permanente de Lewis, 11 oct 2026): envía un `send_message` a la sesión de Planning que te creó (`@parent`) con estado, número de PR, HEAD, resultado de «Revisión», pruebas hechas y no hechas, decisiones fuera del encargo y pendientes. También si quedas bloqueado o tu sesión se va a agotar. Esta sesión no tiene Notion: Planning actualiza la tarea con tu mensaje.
