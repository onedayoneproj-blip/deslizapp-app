# Contexto del proyecto y forma de trabajo

Este es el documento que pone al día a cualquier sesión nueva (Claude o Codex, Planning o Coding). Léelo primero, después `AGENTS.md` y `HANDOFF.md`.

## Qué es

**Deslizapp** es un panel PWA (Next.js 16, React 19, TypeScript, Tailwind v4, Supabase) para dueños de tiendas dominicanas, más el **catálogo público** de cada tienda (se desliza como Reels y pide por WhatsApp). Es multi-tienda.

- **Repo:** `onedayoneproj-blip/deslizapp-app`. Producción: https://deslizapp-app.vercel.app (se despliega sola desde `main`).
- **Preview de cada rama:** `https://deslizapp-app-git-<rama-con-guiones>-onedayone.vercel.app`. Supabase Auth ya acepta ese patrón, así que se puede entrar con Google en los previews.
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
| Catálogo HTML actual de Esencias Michel | `public/catalogos/esencias-michel.html` (fijo, no lee la base) |

El sistema de diseño completo vive también como un artifact de Claude (no accesible desde otras herramientas); su copia en el repo es `docs/09-sistema-de-diseno.md`, y los tokens están en el código. Si algo no coincide, manda el repo.

## Dónde va el trabajo (octubre de 2026)

**El catálogo conectado** (`docs/12-catalogo-conectado.md` §10), en este orden:
1. Base de datos y capa de datos. **Hecho** (PR #40).
2. Panel: producto con detalles por rubro, opciones con stock por variante, fotos y video, Por encargo, "Ya llegó". **Hecho** (PR #42).
3. **Catálogo en React** en `/tienda/{slug}` y la página del pedido del comprador `/pedido/{codigo}`, como copia fiel del HTML. **Sigue**: `docs/prompts/catalogo-react.md`.
4. **Pedido del catálogo en el panel**: estado del pedido para el comprador, "Registrar pedido" para la tienda, la fila de respaldo en Pedidos › Nuevos, la lista de Avísame. Prompt por escribir; los tableros están en `referencias/pedido-catalogo/`.

(En el documento 12 estas dos últimas figuran como partes 4 y 3; el orden se cambió porque el HTML fijo no refleja lo que la tienda cambia en la app.)

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
