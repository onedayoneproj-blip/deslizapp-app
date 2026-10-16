# Medición de la página principal, «Cómo funciona» y los catálogos

Encargo de Planning, 16 oct 2026. **Borrador: no lanzar hasta que Lewis lo apruebe.** Tu puesto es **Coding** (Sonnet). Parte de `main` actualizado.

## Para qué
Saber cuánta gente llega, de dónde viene y en qué paso se va, antes y después de cambiar la portada de «Cómo funciona» (`docs/prompts/conoce-portada-narrativa.md`). Por eso este encargo va **primero**: así hay al menos una semana de números del «antes».

## Reglas
- Sin Google Analytics ni otras herramientas de terceros.
- Sin cookies y sin datos personales: nada de teléfono, correo, IP guardada, `user_id` ni identificador persistente del visitante.
- Nada de esto puede romper ni frenar la página. Si falla, no pasa nada.

## 1. Visitas: Vercel Web Analytics
- Añade `@vercel/analytics` y su componente en `app/layout.tsx`, en una versión fijada.
- Excluye el panel y el admin: solo cuentan las rutas públicas (`/`, `/conoce`, `/tienda/*`, `/pedido/*`, `/privacidad` y `/terminos`). Usa `beforeSend` o el mecanismo que indique la documentación de la versión.
- Activarlo en el proyecto de Vercel es cosa de Lewis o de Planning. No cambies la configuración de Vercel.

## 2. El recorrido: eventos propios en Supabase
- **Migración nueva** (se aplica en `euihaeyfdlpvmbtfzvnt` y el archivo lleva la versión que asigne Supabase; reglas en `AGENTS.md`). **Pregunta a Planning antes de aplicarla.**
  - Tabla `eventos_publicos` con: `id`, `creado_en`, `evento` (texto de una lista cerrada), `ruta`, `origen` (`instagram`, `whatsapp`, `directo` u `otro`, deducido del referer o de `utm_source`), `paso` (opcional) y `tienda_slug` (opcional, solo en catálogos).
  - RLS: nadie lee desde el cliente. Solo se inserta con una función `registrar_evento_publico` (security definer) que valida el evento contra la lista, recorta los textos y limita el ritmo de forma básica.
- **Cliente:** una función `registrarEvento(evento, datos?)` en `lib/`. Envía con `navigator.sendBeacon` cuando exista, no espera respuesta, falla en silencio y no manda nada en desarrollo, en la demo interna ni en las pruebas.
- **Eventos iniciales:**
  - `inicio_visto` y los botones de la página principal: `cta_iniciar_sesion`, `cta_como_funciona`, `cta_quiero_vender`, `cta_demo`.
  - En `/conoce`: `conoce_paso` con el id del paso (una vez por paso y visita), `conoce_final` y los botones del final.
  - En `/tienda/[slug]`: `catalogo_visto` (con `origen`, para saber cuántos llegan desde Instagram o WhatsApp), `catalogo_reel_deslizapp` (llegó al reel final) y sus botones.
- **Lectura:** una vista o función solo para admin que dé los conteos por día y por evento, para que Planning consulte los números sin abrir otra herramienta.
- Documenta la lista de eventos y la política de privacidad del registro en `docs/`, y añade una línea en `/privacidad` si hace falta.

## Pruebas
- Tipos, lint, `npm test` y build.
- Un test de la función SQL: rechaza eventos fuera de la lista y textos largos.
- Comprobación con navegador de que la página carga igual de rápido y sin errores si la función falla.

## Entrega
PR contra `main`, sin fusionar: incluye una migración. Avisa a Planning (la sesión que te lance) antes de aplicar la migración, al abrir el PR y al terminar.
