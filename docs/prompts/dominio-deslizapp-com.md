# Dominio propio: los enlaces de los catálogos pasan a deslizapp.com

Encargo de Planning, 14 oct 2026. Tu puesto es **Coding**. Parte de `main` actualizado.

**Modelo:** Claude Code **Sonnet** · en Codex, el más alto con razonamiento medio.

## Contexto
- Lewis compró **deslizapp.com** en Cloudflare (14 oct). El DNS ya apunta a Vercel: `deslizapp.com` es un dominio del proyecto y `www` redirige con 308.
- Supabase Auth ya acepta `https://deslizapp.com/**` como dirección de vuelta. Lo configura Lewis; compruébalo con él si falla el inicio de sesión.
- `deslizapp-app.vercel.app` sigue funcionando y se queda así: no la bloquees ni la redirijas.
- Lewis aprobó la migración y que **todos** los enlaces guardados pasen al dominio nuevo.

## Qué hacer
1. **Migración nueva** (aplicada en Supabase con `apply_migration` y guardada con la versión que Supabase le ponga, como dice `AGENTS.md`):
   - Redefine las funciones que hoy tienen `'https://deslizapp-app.vercel.app'` como base del catálogo para que usen `'https://deslizapp.com'`. Como mínimo: `publicar_mi_catalogo` (la versión vigente es la de `20261009232947_publicar_catalogo_sin_minimo.sql`) y la de `20261009232614_onboarding_historias_y_datos.sql` (≈ línea 155).
   - Antes de nada, haz `grep -rn "deslizapp-app.vercel.app" supabase/migrations` y revisa en la base, con `execute_sql` y en solo lectura, qué funciones vigentes contienen esa cadena: `select proname from pg_proc where prosrc like '%deslizapp-app.vercel.app%'`. Cambia solo las que arman enlaces que ve una persona.
   - **No cambies** la regla de medios (`20261008165331_medios_solo_hosts_propios.sql`), que acepta `/catalogos/` y `/ensayo/` de `vercel.app`. Lo que hace falta ahí es **agregar** `deslizapp.com` como host permitido, sin quitar el viejo, si la regla compara el host.
   - Actualiza en general los enlaces guardados: `update tiendas set url_catalogo = replace(url_catalogo, 'https://deslizapp-app.vercel.app', 'https://deslizapp.com') where url_catalogo like 'https://deslizapp-app.vercel.app/%'`. Revisa también si otras columnas guardan esa dirección y trátalas igual. Sin nombres de tiendas en la migración.
2. **Código:**
   - `lib/config.ts` → `URL_BASE_CATALOGO = "https://deslizapp.com"`.
   - Los respaldos escritos a mano en `components/inicio/checklist-tienda.tsx:168` y `app/pedido/[codigo]/page.tsx:36-38` pasan a `deslizapp.com`. `VERCEL_PROJECT_PRODUCTION_URL` ya debería dar `deslizapp.com` en producción.
   - Revisa `grep -rn "vercel.app" app components lib public` por si hay más: metadatos, `manifest.ts`, Open Graph o `metadataBase`.
3. **Pruebas:** actualiza los tests que comparan la URL (`tests/publicar-catalogo.test.mjs` comprueba que la base y la app coinciden, más `enlace-catalogo`, `imagen-pedido*`, `auth*` y `historia`) y los `scripts/*.sql` de prueba que la usen.
4. Corre `npm run revisar:migraciones` y deja cero diferencias.

## Comprobar
- `npm run tipos`, `npm run lint`, `npm test`, `npm run build`.
- En la base (solo lectura): `select slug, url_catalogo from tiendas where url_catalogo is not null` muestra solo `https://deslizapp.com/tienda/…`.
- Con `curl -sI https://deslizapp.com/tienda/<slug publicado>` responde 200, y `https://www.deslizapp.com` redirige.

## Entrega
- PR contra `main` con «Qué probar en tu iPhone»:
  1. Abrir `deslizapp.com` y entrar con Google.
  2. En el checklist o en «Publicar», el enlace dice `deslizapp.com/tienda/…`.
  3. Abrir el catálogo con ese enlace.
  4. Hacer un pedido y ver que su enlace también usa el dominio nuevo.
- **Déjalo abierto sin fusionar**: tiene migración y cambia datos de tiendas. Planning lo fusiona cuando Lewis lo pruebe y diga «mergea».
- Pide «@codex review» y atiende sus hallazgos.
- Avisa a Planning (`send_message` a `@parent`) al abrir el PR, si quedas bloqueado y al terminar, con la versión de la migración y las filas que actualizaste.
