# Onboarding, parte 1: base de datos, historias de bienvenida y la historia de tu tienda

Planning te enviará ajustes de Lewis para este PR; trátalo como encargo suyo y ejecútalos.

Lee antes, en este orden: `docs/00-contexto-del-proyecto.md`, `AGENTS.md` (Next cambia cosas: lee `node_modules/next/dist/docs/` antes de escribir; reglas de migraciones), **`docs/17-onboarding.md` (la especificación)**, `referencias/onboarding/LEEME.md` y las capturas 08-17 de `referencias/onboarding/pantallas/`, `docs/08-movimiento.md`, `docs/09-sistema-de-diseno.md`, `docs/11-voz-y-frases.md`, `HANDOFF.md` (teclado e iPhone), `components/unirse/pantalla-unirse.tsx`, `lib/data/unirse.ts` y la migración `supabase/migrations/20261007031102_tienda_nueva_por_enlace.sql`.

## Base de datos (una migración; NO la apliques tú)
1. `tiendas.onboarding jsonb not null default '{}'` con check de que es objeto. Claves que se usan: `intro_vista_en`, `colores_elegidos_en`, `pantalla_inicio_en`, `equipo_omitido_en`, `checklist_cerrado_en` (timestamps ISO).
2. Relleno: todas las tiendas existentes quedan con `{"checklist_cerrado_en": now(), "intro_vista_en": now()}` **menos** `tienda-de-ensayo` y `soft-era` (quedan `{}`).
3. `crear_mi_tienda_completa(p_enlace_id uuid, p_nombre text, p_rubros text[], p_whatsapp text, p_nombre_vendedora text)`: mismas comprobaciones que `crear_mi_tienda` (enlace `tienda_nueva`, reclamado por quien llama, aprobado, sin tienda creada) y además valida rubros (lista permitida, 1 a 7, el primero es el principal), WhatsApp (`^[0-9]{10,15}$`, ya normalizado por la app) y nombre de la vendedora (1 a 40). Crea la tienda reutilizando `crear_tienda_para` y deja `rubros`, `whatsapp`, `nombre_vendedora` y `onboarding.intro_vista_en` en la misma transacción. No toques `crear_mi_tienda` (sigue existiendo).
4. `vista_slug(p_nombre text) returns text`: de solo lectura, devuelve el slug que se asignaría hoy (mismo cálculo que `crear_tienda_para`, incluido `-2`, `-3`…). Solo `authenticated`. Si puedes, saca el cálculo a una función interna compartida para que no haya dos copias (sin cambiar la firma de `crear_tienda_para`).
5. `marcar_onboarding(p_tienda_id uuid, p_clave text)`: solo dueño (`soy_dueno`, `exigir_no_viendo`), solo claves de la lista, guarda `now()`. No borra claves.
6. `publicar_mi_catalogo`: `v_minimo` de 3 a 5, con `create or replace` y la misma firma; y `PRODUCTOS_MINIMOS_PARA_PUBLICAR` en `lib/config.ts`.
7. Todo con `security definer`, `set search_path = ''`, `revoke … from public, anon`, `grant … to authenticated`. **Nunca `drop function`.**
8. Prueba la migración en `BEGIN … ROLLBACK` si tienes cómo; si no, mándale el SQL completo a Planning (`send_message` a `session_01BJDuA1NdKUg4YX64VNuQDv`) **antes** de abrir el PR: Planning la revisa, la aplica en Supabase y te devuelve la versión para el nombre del archivo.

## La app
- En `/unirse`, cuando hoy aparece el formulario «crear tu tienda», va el recorrido de `docs/17` §1-5: historias de bienvenida → 4 capítulos → «ya existe» → Inicio. El resto de estados de `/unirse` (sin sesión, esperando, ya no sirve, error) no cambia.
- Historias: barras arriba, toque derecho avanza, izquierdo vuelve, mantener pausa, «Saltar». Respeta `prefers-reduced-motion`. Sin vídeos. Las imágenes de ejemplo de producto: usa las del modo demo, no fotos nuevas de terceros.
- Capítulos: componentes de `components/ui/` (Campo con icono, botones), teclado de iPhone según `HANDOFF.md` (el botón «Seguir» siempre visible con el teclado abierto). La vista del enlace llama a `vista_slug` con espera corta (debounce) y muestra lo que devuelve. Borrador local por si cierra a mitad.
- Modo demo: el recorrido completo se puede ver sin tocar nada real.
- Texto: el del lienzo, con la voz de la marca. «Hola, {nombre}» con el primer nombre de Google; si no hay, «Hola».
- `lib/novedades.ts`: no hace falta entrada (es para tiendas nuevas).

## Pruebas
Unitarias de validación y del borrador; las de la base, en el SQL de prueba. En el navegador (390 y 360 px) el recorrido entero en demo. Capturas en `docs/capturas/onboarding-1/`. Safari de iPhone no lo tienes: dilo en el PR.

## Cierre
Un solo push por ronda (límite de despliegues de Vercel). PR abierto, «Revisión» en verde, preview lista; avisa a Planning con `send_message` y `create_trigger` de respaldo (persistent_session_id = `session_01BJDuA1NdKUg4YX64VNuQDv`, run_once_at ≈ 1 min, initiation own_followup). **No mergees.** Nunca quites el difuminado progresivo de cabeceras y barras.
