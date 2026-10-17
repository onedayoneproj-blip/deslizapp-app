# Medición de lo público

Encargo: `docs/prompts/medicion-landing.md`. Cuántas personas llegan a la página principal, a «Cómo funciona» y a los catálogos, de dónde vienen y en qué paso se van. **Sin cookies, sin terceros (salvo Vercel Web Analytics, que tampoco usa cookies) y sin datos personales.**

## Qué se guarda y qué no

- **Se guarda:** el evento (de una lista cerrada), la ruta sin `?consulta` ni `#hash`, el origen (`instagram`, `whatsapp`, `directo`, `otro`), el paso de `/conoce` y el slug de la tienda en los catálogos. Más la fecha.
- **No se guarda:** IP, teléfono, correo, `user_id`, agente del navegador ni ningún identificador del visitante. No hay cookie ni `localStorage`; solo `sessionStorage` con el origen de la visita (`dz_origen`), que se borra al cerrar la pestaña. Un código de pedido (`/pedido/…`) se guarda como `/pedido/*`.
- Una persona que vuelve mañana cuenta como otra visita: no hay forma de reconocerla. Así es a propósito.

## Cómo funciona

1. El navegador llama a `registrarEvento(evento, datos?)` (`lib/medicion/registrar-evento.ts`). Usa `navigator.sendBeacon` a `/api/evento` (o `fetch` con `keepalive`), no espera respuesta y falla en silencio. No manda nada en desarrollo, con `navigator.webdriver` (pruebas), en la demo interna, en la demo de la landing, en `/admin` ni en `?demo`.
2. `app/api/evento/route.ts` lee el cuerpo con tope (2 KB), comprueba el `Origin` (el mismo host o el de producción; sin `Origin`, deja pasar, por `sendBeacon`), valida el evento contra la lista, responde 204 y **después** (con `after`) llama a `registrar_evento_publico` en Supabase con la llave pública y un tiempo máximo de 2 s.
3. `registrar_evento_publico` (security definer) valida otra vez, limpia los textos y guarda en `eventos_publicos`. La tabla no tiene políticas: nadie la lee ni escribe desde el cliente.
4. **Ritmo:** como máximo 120 eventos por minuto **por tipo de evento** (`conoce_paso`, 600, porque una sola visita completa manda hasta 22), contados en `eventos_publicos_ritmo` (una fila por minuto y evento, sin `count(*)` en cada inserción). Pasado el tope, el evento no se inserta en `eventos_publicos`, **pero el contador sigue sumando**: `select * from admin_eventos_descartados(desde, hasta)` (solo admin) da, por minuto y evento, cuántos llegaron, el tope y cuántos se descartaron (`llegaron - tope`, solo si es positivo; los contadores se conservan hasta 30 días). **Sin IP no hay límite por visitante**: un abusador puede agotar el cupo de un tipo de evento, pero no el de los demás. El tope vive en `tope_evento_publico()`.
5. **Textos:**
   - `ruta`: lista blanca en minúsculas, sin `?consulta`, `#hash` ni barra final: `/`, `/conoce`, `/privacidad`, `/terminos`, `/tienda/<slug>` (solo si esa tienda tiene el catálogo publicado; si no, `/tienda/*`) y `/pedido/*` (el código no se guarda). Todo lo demás se guarda como `otra`.
   - `tienda_slug`: solo se guarda si es una tienda con catálogo publicado (`activa` o `en_prueba`, como `tienda_publica`); si no, vacío.
   - `paso` (hasta 40, `[a-z0-9_-]`) que no cumpla se guarda vacío; un origen raro pasa a `otro`; un evento fuera de la lista se rechaza (`22023`).

> **Nota de aplicación:** la migración `20261016145000_eventos_publicos_limites` se aplicó desde el editor SQL de Supabase (16 oct 2026) porque `apply_migration` expiraba por un fallo de la herramienta; la versión se anotó en el historial a mano.

> **17 oct 2026:** la migración `20261017114521_eventos_publicos_planes` (aplicada con `apply_migration`) añade `catalogo_cta_planes` y `cta_planes` a la lista.

> **17 oct 2026:** el botón que decía «Quiero vender» ahora dice «Escríbenos» (mismo destino, el Instagram de Deslizapp, y mismo icono). Los eventos conservan su nombre (`cta_quiero_vender`, `catalogo_cta_quiero_vender`, `conoce_cta_vender`) para no romper los datos.

> **17 oct 2026:** el pie de contacto (`@deslizapp` y `hola@deslizapp.com`) de `/`, `/planes` y el cierre de `/conoce`. El pie no se mide (ni el Instagram ni el correo), para no mezclar sus toques con los del botón «Escríbenos»; medirlo pediría un evento nuevo y, con él, una migración.

## Eventos

| Evento | Cuándo |
|---|---|
| `inicio_visto` | Se ve la página principal (`/`) sin sesión. |
| `cta_iniciar_sesion`, `cta_como_funciona`, `cta_quiero_vender`, `cta_demo` | Toques de los botones de la página principal. |
| `cta_planes` | Toque en el enlace «Planes» de la cabecera de la página principal. |
| `conoce_paso` (`paso` = id del paso) | Un paso de `/conoce` llega a pantalla; una vez por paso y visita. El primero es `dolor-dm`. |
| `conoce_final` | Se llega al cierre de `/conoce`; una vez por visita. |
| `conoce_cta_vender`, `conoce_cta_catalogo`, `conoce_cta_entrar`, `conoce_cta_otra_vez` | Botones del cierre de `/conoce`. |
| `catalogo_visto` (`tienda_slug`, `origen`) | Se abre un catálogo público real (no la demo); una vez por visita. |
| `catalogo_reel_deslizapp` | El catálogo llega a su último reel (la portada de Deslizapp); una vez por visita. |
| `catalogo_cta_como_funciona`, `catalogo_cta_quiero_vender`, `catalogo_cta_demo` | Los mismos botones, tocados desde ese último reel. |
| `catalogo_cta_planes` | «Ver planes», el botón principal de ese último reel (desde el 17 oct 2026; antes era «Iniciar sesión»). |
| `catalogo_cta_iniciar_sesion` | Ya no hay un botón así en el reel; sigue en la lista porque los datos anteriores al 17 oct 2026 lo usan. |

Un evento nuevo pide una migración nueva (la lista vive en `registrar_evento_publico`) y actualizar `lib/medicion/eventos.ts`; `tests/medicion.test.mjs` comprueba que las dos listas coincidan.

## Cómo se deduce el origen

`utm_source` (`instagram`/`ig`, `whatsapp`/`wa`; otro valor → `otro`) manda; si no, el dominio del `referer` (`instagram.com`, `wa.me`, `whatsapp.com`); en el navegador interno de Instagram, su agente. Sin nada de eso, `directo`. **WhatsApp casi nunca manda referer**, así que sus enlaces aparecen como `directo` salvo que lleven `?utm_source=whatsapp`: conviene usar esa marca en los enlaces que se comparten. El origen se fija en la primera página de la visita y se conserva al navegar (en `sessionStorage`).

## Leer los números

Solo admin: `select * from admin_eventos_publicos(desde, hasta)` (fechas opcionales; por defecto, los últimos 30 días) devuelve `dia` (hora de Santo Domingo), `evento`, `origen`, `paso`, `tienda_slug` y `total`. Con la sesión de admin desde la app o con `execute_sql` de Supabase (que corre como `postgres`, sin `soy_admin()`: ahí se consulta `eventos_publicos` directamente).

## Visitas: Vercel Web Analytics

`@vercel/analytics` (versión fijada) en `app/layout.tsx` mediante `components/medicion/analitica.tsx`. `beforeSend` descarta todo lo que no sea `/`, `/conoce`, `/tienda/*`, `/pedido/*`, `/privacidad` y `/terminos`; descarta también la demo (la misma regla que `registrarEvento`: `/tienda/deslizapp-ejemplo`, `?demo`, la demo interna y quien eligió «Ver demo»); quita la `?consulta` y el `#hash` de la URL y reemplaza el código de pedido por `*`. Activarlo en el proyecto de Vercel (Analytics → Enable) lo hace Lewis o Planning. **Límite:** `/` también es el panel con sesión iniciada (misma URL), así que las visitas de Vercel a `/` incluyen a las tiendas que abren su panel; para la página principal sin sesión, el número limpio es `inicio_visto`.

## Retención

`select purgar_eventos_publicos(180)` (solo admin) borra los eventos de más de 180 días (el parámetro, mínimo 1, por defecto 180) y los contadores de ritmo de más de 30 días (o de `p_dias`, si es menor), y devuelve cuántos eventos borró. Se llama a mano; todavía no hay cron.
