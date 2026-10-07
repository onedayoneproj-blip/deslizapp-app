# Publicar mi catálogo: que la tienda lo ponga en línea sola (rama `feat/publicar-catalogo`)

> **Modelo:** en Claude Code, Sonnet 5.5; en Codex, el modelo principal con razonamiento medio. **Una migración que cambia qué ven los compradores** (qué tiendas tienen catálogo público): **deja el PR abierto con su preview** para que Planning revise el SQL y Lewis lo pruebe. No hagas merge.

> **Orden:** va **después** de `docs/prompts/bloquear-video.md` y, si ya está en curso, de `docs/prompts/tipo-de-producto.md` (una migración a la vez). `git fetch` seguido y rebasa antes de abrir el PR.

## 0. Antes de empezar

Lee `docs/00-contexto-del-proyecto.md`, `AGENTS.md`, `HANDOFF.md` (reglas de migraciones, permisos de colaboradores, la nota sobre las herramientas de Supabase que se cuelgan con `drop function` y con `delete from`), `docs/12-catalogo-conectado.md`, `docs/16-ruta-al-lanzamiento.md`, `docs/09-sistema-de-diseno.md` y `docs/11-voz-y-frases.md`. Tu puesto es **Coding**.

Mira antes: en la base `tienda_publica(p_slug)` (hoy exige `estado = 'activa'` **y** `catalogo_estado = 'publicado'`), `publicar_catalogo`, `solicitar_catalogo`, `pedir_cambios_catalogo`, `cambiar_estado_tienda` y las funciones públicas del comprador que dependen de la tienda pública (`catalogo_publico`, `registrar_solicitud`, `ver_solicitud`, `pedir_aviso`, `registrar_aaah`, `actualizar_likes`, `stock_publico`, `crear_codigo_cliente`…); en la app `lib/catalogo-estado.ts`, `components/catalogo/tarjeta-catalogo.tsx`, `hoja-catalogo-en-linea.tsx`, `lib/enlace-catalogo.ts`, `lib/data/fuente.ts` (`solicitarCatalogo`, `publicarCatalogo`…), `app/tienda/[slug]/page.tsx` (ya hay un `robots: { index: false }`: mira cuándo se aplica) y `lib/config.ts`.

## 1. El problema y lo que decidió Lewis (7 oct 2026)

Hoy una tienda nueva (creada con un enlace de Lewis) queda `en_prueba` con el catálogo en `sin`, y **su catálogo público no existe** hasta que Lewis la active (solo pasa al registrar su primer pago) y publique el catálogo con el flujo manual de ocho estados. Lewis quiere mandar enlaces a **contactos de confianza que prueben**, sin pasos manuales suyos.

**Decisión:** la tienda **publica su propio catálogo** cuando quiera, y **una tienda en prueba tiene catálogo público en cuanto lo publica**, con el enlace **sin indexar** para buscadores (los previews de WhatsApp e Instagram siguen funcionando). Lo de Esencias Michel (activa, publicada) **no cambia en nada**.

## 2. Qué se construye

### Base (migración nueva, sin editar ninguna aplicada)

1. **`tienda_publica`**: acepta `estado in ('activa', 'en_prueba')` (nunca `pausada` ni `eliminada`) y `catalogo_estado = 'publicado'`. `create or replace` con **la misma firma**, sin `drop`. **Audita todas las funciones públicas y de comprador** que dependan de que la tienda sea pública o activa (la lista de §0; busca también `'activa'` en funciones de la tienda como `crear_codigo_cliente`) y deja el mismo criterio en todas; comprueba con un recorrido completo que un comprador puede ver el catálogo, pedir, dar ♥, «Avísame» y abrir su pedido en una tienda en prueba.
2. **Una función nueva para publicar sola**, p. ej. `publicar_mi_catalogo(p_tienda_id)`: solo el **dueño** (`soy_dueno`), con `exigir_no_viendo` y `exigir_permiso(..., 'equipo')` (publicarse al público es decisión del dueño; un colaborador no); comprueba **lo mínimo** (ver abajo) y, si cumple, deja `catalogo_estado = 'publicado'`, `catalogo_publicado_en = now()` (si era null) y `url_catalogo = <URL_BASE>/tienda/<slug>` (la base de la dirección en una constante de `lib/config.ts`; nunca una dirección escrita por el usuario). Respeta los estados del flujo manual: desde `sin` publica directo; desde otros estados, no pisa un flujo manual en curso (decide y explícalo). Lanza errores claros (`catalogo_incompleto`, `solo_dueno`, `tienda_pausada`).
3. **Despublicar:** `despublicar_mi_catalogo(p_tienda_id)` (mismas guardas) que lo deja en `sin` (o el estado que corresponda; el comprador deja de verlo al instante) y **conserva** `url_catalogo` e historial. Hay que poder volver a publicar sin perder nada.
4. **Lo mínimo para publicar:** una constante en `lib/config.ts` y la misma regla en la base (en un solo lugar de la base): al menos **3 productos visibles con foto** (`activo`, no eliminados, con al menos una foto). Sin logo ni colores obligatorios (hay valores por defecto). El checklist del onboarding (`docs/16`) lo subirá a 5 productos más adelante.
5. Permisos y seguridad: `security definer`, `set search_path = ''`, `revoke … from public, anon`, `grant … to authenticated`; que nadie pueda publicar la tienda de otra persona; el admin sigue viendo el estado real en su ficha.
6. Migración nueva con ensayo en `BEGIN; … ROLLBACK;` con `execute_sql` sobre la base real, replay (`probar:admin-db`) con pruebas nuevas, y `apply_migration` con la versión que asigne Supabase (`list_migrations` antes; Lewis trabaja con una sola sesión a la vez). `npm run revisar:migraciones` en cero, `get_advisors` sin nada nuevo. **Ningún dato real en migraciones.** Comprueba **antes y después** que Esencias Michel responde igual (15 productos, mismo catálogo) y que la Tienda de ensayo (que Planning ya dejó activa y publicada por SQL) sigue igual.

### App

1. **La tarjeta del catálogo en línea** (pestaña Catálogo, `tarjeta-catalogo.tsx`): hoy empieza por «Pídelo» (el flujo manual). Para una tienda con el catálogo en `sin`:
   - Si **no cumple lo mínimo**: dice qué falta («Te faltan 2 productos con foto para publicar tu catálogo») con un botón que lleva a crear un producto.
   - Si **lo cumple**: **«Publicar mi catálogo»**.
   - El flujo manual de ocho estados queda para los catálogos que ya están en curso o los que pida el equipo; no lo borres.
2. **Hoja de confirmación al publicar:** en la voz de la marca, breve: qué va a pasar («Tus clientes lo verán en este enlace»), el enlace que va a tener, y la **lista de lo que no se puede vender** (armas y municiones, drogas ilegales, contenido sexual explícito, productos falsificados, documentos falsos, medicamentos con receta, animales vivos) con «Al publicar aceptas los Términos». Botones «Publicar» / «Ahora no». Esa lista vive **en un solo archivo** (`lib/config.ts` o `lib/productos-prohibidos.ts`) para poder usarla en los Términos.
3. **Ya publicado:** la tarjeta muestra «Tu catálogo está en línea» con el enlace, **«Copiar enlace»**, **«Compartir»** (la hoja nativa o WhatsApp, como el resto de la app) y **«Dejar de mostrarlo»** (despublicar, con confirmación; explica que los clientes dejan de verlo y se puede volver a publicar). Muestra el momento del primer «publicado» con la celebración que ya existe (`recien`), sin inventar otra.
4. **Sin indexar para tiendas en prueba:** las páginas públicas de una tienda **en prueba** (`/tienda/[slug]` y `/pedido/…`) llevan `robots: noindex, nofollow` (y que no entren en un sitemap si existe), **sin afectar** las vistas previas de enlaces (Open Graph e imagen). Las tiendas **activas** quedan como hoy (revisa qué hacen hoy y no lo cambies). Compruébalo con la cabecera y la etiqueta reales en el build de producción.
5. **Pausada:** el catálogo de una tienda pausada no se ve (ya pasa; que siga).
6. **Demo:** la demo permite recorrer los estados (publicar, dejar de mostrar) sin tocar nada real; «Simular avance del catálogo» sigue funcionando.
7. **Textos** en la voz de `docs/11`, mínimos; permisos en pantalla: la tarjeta la ve el dueño con el botón; un colaborador ve el estado pero el botón sale apagado con «Esto lo hace quien administra la tienda.» (solo el dueño publica).

## 3. Reglas

- Sin cambios para Esencias Michel ni para lo que ve hoy cualquier comprador de una tienda activa.
- No cambies cómo se registra un pedido, el stock ni el «aaah».
- Teclado, movimiento y diseño como siempre (`HANDOFF.md`, `docs/08`, `docs/09`).
- No cambies `admin_*`. El admin ya ve el estado; esto no es trabajo del admin.

## 4. Pruebas y cierre

- Pruebas de la base (replay y scripts): publicar con y sin lo mínimo; un colaborador (cualquier nivel) no puede publicar ni despublicar; un extraño tampoco; despublicar y volver a publicar; en prueba y publicada el comprador ve catálogo y puede pedir; pausada no se ve; la tienda de otra persona no se toca; Ver como no escribe.
- Navegador (demo y build de producción, 390 y 360): sin lo mínimo, con lo mínimo, publicar, copiar enlace, dejar de mostrar; la cabecera y la etiqueta `noindex` de una tienda en prueba; una tienda activa sin cambios.
- `tsc`, `npm test`, `npm run lint` (sin avisos nuevos), `npm run build` y las regresiones de catálogo, pedido del comprador, producto, equipo y Mi marca.
- Novedad en `lib/novedades.ts` (una frase en la voz de la marca), `docs/04`, `docs/12` y `HANDOFF.md`.
- **PR abierto con su preview.** En el PR: qué cambió en las funciones públicas (la lista que auditaste), las pruebas, y qué debe probar Lewis: con una tienda **de prueba** crear 3 productos con foto, publicar el catálogo, abrir el enlace en el iPhone y hacer un pedido como comprador; después «Dejar de mostrarlo» y comprobar que el enlace deja de funcionar. Di claro lo que no pudiste probar.
- Resume en español, corto.
