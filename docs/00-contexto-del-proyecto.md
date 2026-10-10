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
- **Cierre de un PR (desde el 6 oct 2026, decisión de Lewis):** por defecto Coding hace merge (squash) a `main` en cuanto todo pasa, y Lewis prueba en producción. El PR queda abierto con su preview **solo cuando es estrictamente necesario por precaución**: cobros o dinero de tiendas reales, algo que borre o cambie datos de tiendas, algo que vean los compradores de una forma arriesgada, o cuando el prompt lo pide. También queda abierto si algo falla o si Coding decidió algo que no estaba en el prompt; lo explica en el PR. Cuando Lewis lo pide, Planning mergea: `gh api -X PUT repos/onedayoneproj-blip/deslizapp-app/pulls/N/merge -f merge_method=squash`.
- **Ramas:** Coding borra su rama al mergear. Si no puede, Lewis la borra (la API no deja borrar ramas a Planning).
- **Diseño:** las opciones de diseño se hacen en lienzos de Claude Design (artifacts de claude.ai) y se aprueban ahí; después se copian al repo en `referencias/` y se documentan. Quien construye usa `components/ui/` y crea los que falten según `docs/09-sistema-de-diseno.md` §16.5. **Nunca copia el HTML de una referencia.**
- **Texto de la app:** con la voz de la marca (`docs/01-marca.md` y `docs/11-voz-y-frases.md`).
- **Migraciones** (reglas completas en `AGENTS.md`): se aplican en Supabase y el archivo de `supabase/migrations/` lleva la versión que Supabase le puso. No se edita una migración aplicada. Los datos reales de una tienda no van en migraciones. `npm run revisar:migraciones` tiene que dar cero diferencias.
- **Novedades, teclado e iPhone, movimiento:** reglas permanentes en `HANDOFF.md`.
- **Revisión automática:** cada PR y push a `main` corre el check «Revisión» (tipos con `npm run tipos`, `npm test`, `npm run lint`; sin build ni Playwright). Un PR en rojo no se fusiona. Los minutos de Actions son limitados: no lanzar corridas de más. Detalle en `HANDOFF.md`.
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
| **Precios, pago anual, pruebas y lanzamiento** | `docs/14-precios-y-lanzamiento.md` |
| Diseños aprobados | `referencias/` (cada carpeta tiene su `LEEME.md`) |
| Capturas de PRs anteriores | `docs/capturas/` |
| Catálogo conectado publicado de Esencias Michel | `/tienda/esencias-michel` (React, datos de Supabase) |
| Catálogo HTML anterior | `public/catalogos/esencias-michel.html` (histórico; el enlace de la tienda ya apunta a React) |

El sistema de diseño completo vive también como un artifact de Claude (no accesible desde otras herramientas); su copia en el repo es `docs/09-sistema-de-diseno.md`, y los tokens están en el código. Si algo no coincide, manda el repo.

## Estado vigente y memoria compartida

- **Cola y estado actual:** [docs/handoffs/planning-sesion.md](handoffs/planning-sesion.md). Es el único índice de trabajo activo. Leerlo antes de lanzar una tarea y contrastar su fecha, PR y HEAD con GitHub.
- **Reglas de memoria y coordinación:** [docs/forma-de-trabajo.md](forma-de-trabajo.md). Las decisiones se organizan por función; una rama es un dato temporal, no la estructura de la memoria.
- **Decisiones de producto:** en el documento de cada función. Onboarding: [docs/17-onboarding.md](17-onboarding.md). Marca, diseño y catálogo: usar el índice anterior.
- **Reglas técnicas permanentes:** [HANDOFF.md](../HANDOFF.md). Pruebas y límites de cada entrega: en su handoff y validación, enlazados desde la tarea.
- **Plan de lanzamiento:** [docs/16-ruta-al-lanzamiento.md](16-ruta-al-lanzamiento.md). No constituye una cola de sesiones ni una confirmación del estado de un PR.
- **Antecedentes anteriores a esta organización:** [archivo del contexto](archivo/2026-10-10/contexto-anterior.md), [archivo de HANDOFF](archivo/2026-10-10/handoff-anterior.md) y [archivo de Planning](archivo/2026-10-10/planning-anterior.md). Sus estados son históricos.

No añadir aquí entregas sucesivas ni repetir la cola. Después de una decisión o entrega importante, actualizar el documento de su función y el relevo vigente con enlaces, siguiendo las reglas de coordinación.
