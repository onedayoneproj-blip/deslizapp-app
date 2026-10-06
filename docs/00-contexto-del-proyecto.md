## Activación en producción — Planning, 2026-10-05

Lewis autorizó aplicar la migración después del error al abrir Eliminar.
Aplicada en Supabase euihaeyfdlpvmbtfzvnt como **20261005225218_eliminar_producto_logico.sql**.
Sustituye el nombre provisional 20261005215350_eliminar_producto_logico.sql; contenido SQL conservado sin modificaciones.
El comentario inicial «NO aplicada» dentro del archivo es histórico de su preparación.

Verificado en producción: columna eliminado_en, ambas RPC, ejecución para authenticated y denegación para anon, y seis triggers de protección.
Productos antes/después: 16; activos: 15; stock total: 10; retirados después: 0.
No se eliminaron productos ni archivos para probar. Las pruebas de replay/concurrencia descritas abajo pertenecen a Coding; Planning no las repitió.
Pendiente: confirmación del recorrido autenticado en Safari por Lewis. Los bloqueos por pedidos, solicitudes o avisos pendientes siguen activos.

---

# Contexto del proyecto y forma de trabajo

Este es el documento que pone al día a cualquier sesión nueva (Claude o Codex, Planning o Coding). Léelo primero, después `AGENTS.md` y `HANDOFF.md`.

## Qué es

**Deslizapp** es un panel PWA (Next.js 16, React 19, TypeScript, Tailwind v4, Supabase) para dueños de tiendas dominicanas, más el **catálogo público** de cada tienda (se desliza como Reels y pide por WhatsApp). Es multi-tienda.

- **Repo:** `onedayoneproj-blip/deslizapp-app`. Producción: https://deslizapp-app.vercel.app (se despliega sola desde `main`).
- **Preview de cada rama:** `https://deslizapp-app-git-<rama-con-guiones>-onedayone.vercel.app`. Las URLs únicas de despliegue pueden necesitar un callback adicional permitido en Supabase; no asumir que un patrón de alias de rama cubre todos los hosts. En producción se usa el dominio estable.
- **Supabase:** proyecto `euihaeyfdlpvmbtfzvnt`.
- **Tienda real de prueba:** Esencias Michel (perfumes, de la prima de Lewis). Hay además tiendas demo en el modo demo (por ejemplo Lino & Algodón, ropa con variantes).
- **Quién:** Lewis (dueño del producto, habla español dominicano; todo el texto del producto va en español).

## Los dos puestos: Planning y Coding

Lewis trabaja con dos chats por herramienta (Claude o Codex), y los llama así:

- **Planning**: analiza, revisa PRs, consulta Supabase, escribe documentos y prompts, y propone cómo hacer las cosas. **No edita el código de la app.** Puede editar `docs/`, `referencias/` y los prompts. Cuando Lewis pide algo de la app, Planning analiza, lo corrige si se equivoca, y le da un prompt completo para Coding. Si Lewis dice "mergea", Planning mergea.
- **Coding**: construye. Recibe un prompt (casi siempre `docs/prompts/<nombre>.md`), trabaja en una rama, abre un PR y lo prueba.

Si una sola sesión hace los dos puestos, que sea explícita sobre cuál está haciendo.

## Cómo se trabaja

- **Prompts:** completos y que se pueden pegar tal cual, sin "reemplaza el punto 2 del anterior" ni nada que obligue a Lewis a mezclar a mano. Los largos viven en `docs/prompts/*.md` en `main`, y a Coding se le pega un prompt corto que apunta al archivo.
- **Cierre de un PR:** Coding hace merge (squash) si todo pasa; si algo falla o decidió algo que no estaba en el prompt, deja el PR abierto y lo explica. Cuando Lewis lo pide, Planning mergea: `gh api -X PUT repos/onedayoneproj-blip/deslizapp-app/pulls/N/merge -f merge_method=squash`.
- **Ramas:** Coding borra su rama al mergear. Si no puede, Lewis la borra (la API no deja borrar ramas a Planning).
- **Diseño:** las opciones de diseño se hacen en lienzos de Claude Design (artifacts de claude.ai) y se aprueban ahí; después se copian al repo en `referencias/` y se documentan. Quien construye usa `components/ui/` y crea los que falten según `docs/09-sistema-de-diseno.md` §16.5. **Nunca copia el HTML de una referencia.**
- **Texto de la app:** con la voz de la marca (`docs/01-marca.md` y `docs/11-voz-y-frases.md`).
- **Migraciones** (reglas completas en `AGENTS.md`): se aplican en Supabase y el archivo de `supabase/migrations/` lleva la versión que Supabase le puso. No se edita una migración aplicada. Los datos reales de una tienda no van en migraciones. `npm run revisar:migraciones` tiene que dar cero diferencias.
- **Novedades, teclado e iPhone, movimiento:** reglas permanentes en `HANDOFF.md`.
- **Pruebas antes de abrir un PR:** `npm run lint`, `npm run build`, `npm test` y los `scripts/probar-*.mjs` que tocan lo cambiado. `probar-proximamente` falla también en `main`; no es tuyo.
- **Cuando no se pueda probar algo** (por ejemplo, Safari de iPhone, que el entorno de Claude Code no tiene), el PR lo dice con claridad; Lewis lo prueba en el teléfono.

## Dónde está cada cosa

| Qué | Dónde |
|---|---|
| Marca, voz, frases | `docs/01-marca.md`, `docs/10-marca-ilustracion-y-fondos.md`, `docs/11-voz-y-frases.md` |
| Sistema de diseño (reglas y componentes `components/ui`) | `docs/09-sistema-de-diseno.md`; la página `/diseno` de la app los muestra vivos |
| Movimiento | `docs/08-movimiento.md` |
| Alcance, modelo de datos, pantallas, arquitectura, orden | `docs/02` a `docs/07` |
| **Catálogo conectado** (el plan en curso) | `docs/12-catalogo-conectado.md`, prompts en `docs/prompts/` |
| Diseños aprobados | `referencias/` (cada carpeta tiene su `LEEME.md`) |
| Capturas de PRs anteriores | `docs/capturas/` |
| Catálogo conectado publicado de Esencias Michel | `/tienda/esencias-michel` (React, datos de Supabase) |
| Catálogo HTML anterior | `public/catalogos/esencias-michel.html` (histórico; el enlace de la tienda ya apunta a React) |

El sistema de diseño completo vive también como un artifact de Claude (no accesible desde otras herramientas); su copia en el repo es `docs/09-sistema-de-diseno.md`, y los tokens están en el código. Si algo no coincide, manda el repo.

## Dónde va el trabajo (octubre de 2026)

**El catálogo conectado** (`docs/12-catalogo-conectado.md` §10), en este orden:
1. Base de datos y capa de datos. **Hecho** (PR #40).
2. Panel: producto con detalles por rubro, opciones con stock por variante, fotos y video, Por encargo, "Ya llegó". **Hecho** (PR #42).
3. **Catálogo en React** en `/tienda/{slug}` y comprador `/pedido/{codigo}`: **publicado**, PR #44 fusionado por autorización de Lewis.
4. **Pedido del catálogo en el panel**: **publicado**, PR #46 fusionado después de #44. Incluye el trabajo original de Claude y su continuación; no se fusionó su rama por separado. Likes, contadores y retorno al código incluidos. Leer `docs/handoffs/publicacion-catalogo-conectado.md` y el informe de continuación.
5. **Rendimiento, PR #45:** separado y sin fusionar, excluido de esta publicación por decisión de Lewis. No dar su precarga ni métricas como comportamiento de producción.

El enlace guardado de Esencias Michel se cambió a https://deslizapp-app.vercel.app/tienda/esencias-michel después de verificar producción READY. No se reaplicaron migraciones ni modificaron pedidos/existencias para publicar. Google real al pedido específico en producción y compartir nativo siguen requiriendo comprobación; las pruebas simuladas y el reporte previo de Lewis están diferenciados en los handoffs.

(En el documento 12 estas dos últimas figuran como partes 4 y 3; el orden se cambió porque el HTML fijo no refleja lo que la tienda cambia en la app.)

**Catálogo conectado, estado actual:** PR #47 y el pulido de likes PR #48 ya están publicados en main; PR #45 de rendimiento no se incluye. Esta rama independiente añade selección de agotados visibles, historial con filas comunes y la nueva píldora de likes. Estado y validaciones: `docs/handoffs/catalogo-agotados-visibles.md`.

**Admin de Deslizapp** (diseño aprobado el 5 oct 2026): el panel de Lewis para administrar todas las tiendas en `/admin`. Especificación: `docs/13-admin.md`. Diseño: `referencias/admin/`. Se construye en 4 partes, cada una un PR que se deja abierto para que Lewis lo pruebe:
1. Base y capa de datos: `docs/prompts/admin-1-base.md`. **En revisión**, [PR #51](https://github.com/onedayoneproj-blip/deslizapp-app/pull/51), rama `feature/admin-base`: Codex tomó el relevo de Claude, recuperó las seis SQL aplicadas del historial y reconstruyó la capa TypeScript sin pantallas. [Handoff](handoffs/admin-base-codex.md) y [validación](validacion-admin-base.md). Fallo de anulación encadenada documentado con propuesta desechable; coordinar corrección antes de habilitar Cobros. Claude debe leer el estado remoto y no empujar su copia antigua.
2. Hoy, Tiendas, ficha y Ver como: `docs/prompts/admin-2-tiendas.md`.
3. Trabajo (catálogos, retoque real) y Personalizar: `docs/prompts/admin-3-trabajo.md`.
4. Cobros, Planes, Más, Salud y Registro: `docs/prompts/admin-4-cobros.md`.

**Dos Coding en paralelo** (desde el 5 oct 2026): uno construye el admin y otro hace los pendientes de la app. Reglas para que no se pisen:
- Cada uno en su rama, desde `main` actualizado. Antes de abrir o actualizar un PR, `git fetch origin && git rebase origin/main`.
- **Migraciones:** las dos sesiones comparten la base de producción, así que un PR sin merge igual cambia Supabase. Reglas:
  - Una a la vez, y quien coordina es Lewis: antes de aplicar, se le pregunta si otra sesión está a mitad de un cambio. Cualquier Coding (Claude o Codex) puede aplicar.
  - Antes de aplicar, ensayo con `execute_sql` dentro de `BEGIN; … ROLLBACK;`. Después de aplicar, comprobar que la app de `main` sigue funcionando (catálogo y panel de Michel). Las políticas existentes solo se amplían, nunca se quita acceso que hoy existe.
  - `list_migrations` antes de aplicar; si la otra sesión tocó la misma tabla o política, se para y se avisa a Lewis. Nunca editar una migración de la otra sesión.
  - Subir la rama a GitHub a menudo, para que otra herramienta pueda seguir si se acaba el límite de uso.
- Archivos compartidos (`lib/types.ts`, `lib/data/fuente.ts`, `lib/data/demo.ts` y su seed, `components/ui/`, `lib/novedades.ts`): cambios pequeños y aditivos. Si hace falta reorganizar uno, se dice en el PR.
- `lib/novedades.ts`: una versión nueva por PR que se publique, con el número siguiente al de `main` en el momento del merge.

La parte 5, las invitaciones, llega con el onboarding, que sigue en diseño (lienzo «Onboarding de Deslizapp», tres opciones sin elegir).

**Pendientes sueltos:**
- Pasar Promos al sistema de diseño (`components/ui`).
- Inicio y el esqueleto de la app.
- Modo oscuro (tokens de peligro y resalte, fondo y burbuja del chat).
- "Eliminar para siempre" en productos.
- "Nuevo cliente" al inicio de la lista también en el selector de + Pedido (`components/pedidos/selector-cliente.tsx`).
- Aligerar más el video (hoy sale cerca de 10 MB en 30 s; el plan gratuito de Supabase tiene 1 GB y ~5 GB de salida).
- Habilitar `cdn.playwright.dev` en el acceso a red de Claude Code para probar con WebKit.

**Cosas a las que Lewis tiene que estar atento:** el producto "Test" de Esencias Michel está oculto y es de prueba; las ramas viejas `fix/animaciones-jugada`, `feature/catalogo-base`, `chore/reconciliar-migraciones` y `feature/producto-panel` siguen sin borrar.

## Para Lewis, al cambiar de herramienta

Para que una sesión nueva sepa todo esto, empieza con: "Lee `docs/00-contexto-del-proyecto.md`, `AGENTS.md` y `HANDOFF.md`, y dime cuál es tu puesto (Planning o Coding)". Cuando termine algo importante, que se actualice la sección "Dónde va el trabajo" de este documento en el mismo PR.
Seguimiento dentro de PR #47: visibilidad de «Avísame» en Inicio/Catálogo/vista previa, filtro En espera y likes dentro de foto. Conserva los cambios anteriores de la misma rama. No incorpora #45 ni cambios de Supabase. Handoff adicional: docs/handoffs/espera-catalogo.md; validación: docs/validacion-espera-catalogo.md.


### Propuesta de eliminación de productos (2026-10-05, Coding)

Rama `feature/catalogo-eliminar-producto` desde main con PR #49. Eliminación lógica con historial conservado; bloqueada por pedidos/solicitudes/avisos pendientes. Contrato aditivo y replay en `docs/validacion-eliminar-producto.md`. No equivale a «Eliminar para siempre». Migración nueva pendiente de producción por instrucción del dueño; PR sin merge ni publicación. No incorpora PR #45.
