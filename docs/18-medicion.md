# Medición de lo público

Encargo: `docs/prompts/medicion-landing.md`. Cuántas personas llegan a la página principal, a «Cómo funciona» y a los catálogos, de dónde vienen y en qué paso se van. **Sin cookies, sin terceros (salvo Vercel Web Analytics, que tampoco usa cookies) y sin datos personales.**

## Qué se guarda y qué no

- **Se guarda:** el evento (de una lista cerrada), la ruta sin `?consulta` ni `#hash`, el origen (`instagram`, `whatsapp`, `directo`, `otro`), el paso de `/conoce` y el slug de la tienda en los catálogos. Más la fecha.
- **No se guarda:** IP, teléfono, correo, `user_id`, agente del navegador ni ningún identificador del visitante. No hay cookie ni `localStorage`; solo `sessionStorage` con el origen de la visita (`dz_origen`), que se borra al cerrar la pestaña. Un código de pedido (`/pedido/…`) se guarda como `/pedido/*`.
- Una persona que vuelve mañana cuenta como otra visita: no hay forma de reconocerla. Así es a propósito.

## Cómo funciona

1. El navegador llama a `registrarEvento(evento, datos?)` (`lib/medicion/registrar-evento.ts`). Usa `navigator.sendBeacon` a `/api/evento` (o `fetch` con `keepalive`), no espera respuesta y falla en silencio. No manda nada en desarrollo, con `navigator.webdriver` (pruebas), en la demo interna, en la demo de la landing, en `/admin` ni en `?demo`.
2. `app/api/evento/route.ts` valida el evento contra la lista y llama a `registrar_evento_publico` en Supabase con la llave pública. Siempre responde 204.
3. `registrar_evento_publico` (security definer) valida otra vez, limpia los textos y guarda en `eventos_publicos`. La tabla no tiene políticas: nadie la lee ni escribe desde el cliente.
4. **Ritmo:** como máximo 600 eventos por minuto en total (sin IP no se puede limitar por visitante); pasado eso, se descartan en silencio.
5. **Textos:** la ruta se recorta a 120 caracteres; `paso` (hasta 40, `[a-z0-9_-]`) y `tienda_slug` (hasta 60, `[a-z0-9-]`) que no cumplan se guardan vacíos; un origen raro pasa a `otro`; un evento fuera de la lista se rechaza (`22023`).

## Eventos

| Evento | Cuándo |
|---|---|
| `inicio_visto` | Se ve la página principal (`/`) sin sesión. |
| `cta_iniciar_sesion`, `cta_como_funciona`, `cta_quiero_vender`, `cta_demo` | Toques de los botones de la página principal. |
| `conoce_paso` (`paso` = id del paso) | Un paso de `/conoce` llega a pantalla; una vez por paso y visita. El primero es `intro`. |
| `conoce_final` | Se llega al cierre de `/conoce`; una vez por visita. |
| `conoce_cta_vender`, `conoce_cta_catalogo`, `conoce_cta_entrar`, `conoce_cta_otra_vez` | Botones del cierre de `/conoce`. |
| `catalogo_visto` (`tienda_slug`, `origen`) | Se abre un catálogo público real (no la demo); una vez por visita. |
| `catalogo_reel_deslizapp` | El catálogo llega a su último reel (la portada de Deslizapp); una vez por visita. |
| `catalogo_cta_iniciar_sesion`, `catalogo_cta_como_funciona`, `catalogo_cta_quiero_vender`, `catalogo_cta_demo` | Los mismos botones, tocados desde ese último reel. |

Un evento nuevo pide una migración nueva (la lista vive en `registrar_evento_publico`) y actualizar `lib/medicion/eventos.ts`; `tests/medicion.test.mjs` comprueba que las dos listas coincidan.

## Cómo se deduce el origen

`utm_source` (`instagram`/`ig`, `whatsapp`/`wa`; otro valor → `otro`) manda; si no, el dominio del `referer` (`instagram.com`, `wa.me`, `whatsapp.com`); en el navegador interno de Instagram, su agente. Sin nada de eso, `directo`. **WhatsApp casi nunca manda referer**, así que sus enlaces aparecen como `directo` salvo que lleven `?utm_source=whatsapp`: conviene usar esa marca en los enlaces que se comparten. El origen se fija en la primera página de la visita y se conserva al navegar (en `sessionStorage`).

## Leer los números

Solo admin: `select * from admin_eventos_publicos(desde, hasta)` (fechas opcionales; por defecto, los últimos 30 días) devuelve `dia` (hora de Santo Domingo), `evento`, `origen`, `paso`, `tienda_slug` y `total`. Con la sesión de admin desde la app o con `execute_sql` de Supabase (que corre como `postgres`, sin `soy_admin()`: ahí se consulta `eventos_publicos` directamente).

## Visitas: Vercel Web Analytics

`@vercel/analytics` (versión fijada) en `app/layout.tsx` mediante `components/medicion/analitica.tsx`. `beforeSend` descarta todo lo que no sea `/`, `/conoce`, `/tienda/*`, `/pedido/*`, `/privacidad` y `/terminos`, y reemplaza el código de pedido por `*`. Activarlo en el proyecto de Vercel (Analytics → Enable) lo hace Lewis o Planning. **Límite:** `/` también es el panel con sesión iniciada (misma URL), así que las visitas de Vercel a `/` incluyen a las tiendas que abren su panel; para la página principal sin sesión, el número limpio es `inicio_visto`.

## Retención

No hay borrado automático todavía. Son filas pequeñas y sin datos personales; si crece, se decide después.
