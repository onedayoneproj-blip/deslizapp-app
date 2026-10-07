## Presentaciones del producto, parte 2 (catálogo del cliente) — Coding (Claude), 2026-10-08

Rama `feat/presentaciones-catalogo`. **PR abierto, sin merge** (lo ven compradores de tiendas reales y cambia cómo piden: lo prueba Lewis en el iPhone). **Sin migraciones**; no cambia cómo se registra un pedido, el stock ni el «aaah». Opción B: el reel sale limpio con un solo botón «Ver presentaciones ›»; hoja con todas (cuadrícula con dos ejes, lista con uno); ♥ sin elegir abre la hoja de pastillas (opción A) y con una elegida agrega directo; la foto sigue al color (`fotosPorValor`); agotada solo para esa combinación; «Desde RD$ X»; el detalle «más» y la cuadrícula del catálogo usan lo mismo. Lógica pura: `lib/tienda/presentaciones.ts`; pantalla: `components/tienda/reel.tsx`, `hoja-presentaciones.tsx`, `app/tienda/catalogo.css`. Pruebas: `tests/catalogo-presentaciones.test.mjs`, `npm run probar:catalogo-presentaciones`; el escenario «ropa» de `probar-catalogo-react.mjs` pasó a la hoja nueva. **Ya fallaban igual en `main` (entorno):** el video de `probar-catalogo-react`, `probar-catalogo-pulido` y `probar-catalogo-errores`. **Sin probar:** Safari del iPhone, WhatsApp nativo, Supabase real con presentaciones (solo la demo `?demo`), modo oscuro.

## Presentaciones del producto, parte 1 (panel y datos) — Coding (Claude), 2026-10-08

Rama `feat/presentaciones-panel`, mergeada (squash). **Una migración aditiva** (`20261007125411_presentaciones_fotos_por_valor`, aplicada con `list_migrations` → ensayo en `BEGIN … ROLLBACK` sobre la base real → replay → `apply_migration`; `revisar:migraciones` en cero, `get_advisors` sin nada nuevo): `productos.fotos_por_valor`, `guardar_foto_valor` (grupo `catalogo`), limpieza por trigger y `catalogo_publico` con la misma firma. **No se tocó `guardar_variantes` ni `opciones_validas`; sin `drop function`.** Panel: sección «Presentaciones» (`components/catalogo/ficha-presentaciones.tsx`, `lib/presentaciones.ts`), «Desde RD$ X · N presentaciones» en el catálogo del panel, `Tamaño` típico de perfumes. Demo: «Pantalón de algodón» (Lino & Algodón, 12 presentaciones, foto por color y la XL con precio propio) y «Majestic Oud» (Michel, 30/50/100 ml con precios distintos). Detalle en `docs/03` y `docs/04`. Pruebas: `tests/presentaciones.test.mjs`, `npm run probar:presentaciones`, `scripts/probar-presentaciones-db.sql`, y `probar:teclado` con los campos nuevos. **Falta (parte 2, `presentaciones-catalogo.md`):** la lectura en el catálogo del comprador. **Sin probar:** Supabase real con la interfaz (solo la base con SQL y la demo), Safari del iPhone, modo oscuro.

## Equipo, niveles de permiso e invitaciones — Coding (Claude), 2026-10-07

Rama `feat/equipo-e-invitaciones`. **PR abierto, sin merge** (seguridad y créditos: lo mergea Planning cuando Lewis lo diga). **Cuatro migraciones aplicadas** (una a la vez; `list_migrations`, ensayo en transacción revertida, replay, `apply_migration`): `20261007024238_permisos_niveles` (`miembros.nivel`, `invitaciones.nivel`, `nivel_tiene_grupo`, `tengo_permiso`, `exigir_permiso`, `puede_sumar_colaborador`, políticas restrictivas `permiso_<grupo>_<tabla>_*` y de Storage; sin escritura directa en `miembros`/`invitaciones`), `20261007030128_permisos_rpc` (`exigir_permiso` en las 27 RPC que escriben; quitar y salir; invitar por correo con nivel; la exdueña queda Administradora al transferir), `20261007030828_enlaces_invitacion` (tabla, código solo como hash, reclamar, aprobar, rechazar, cancelar, cambiar nivel, `equipo_de_tienda`), `20261007031102_tienda_nueva_por_enlace` (admin crea el enlace, `crear_mi_tienda`, **`crear_tienda` ya no es ejecutable por `authenticated`**). Auditoría: `docs/handoffs/permisos-auditoria.md`. No había ningún `staff` en la base real. Ninguna invitación, miembro ni tienda real se creó.

**REGLA PERMANENTE:** toda función o política nueva que escriba datos de una tienda **declara su grupo de permiso** (ventas, catalogo, creditos, marca, compras, equipo) y empieza con `perform public.exigir_no_viendo(<tienda>); perform public.exigir_permiso(<tienda>, '<grupo>');`; toda tabla nueva con escritura para miembros lleva sus tres políticas restrictivas `permiso_<grupo>_<tabla>_*` además de las `ver_como_no_escribe_*`. El mapa nivel → grupo vive solo en `public.nivel_tiene_grupo` (la app lo refleja en `lib/equipo.ts`; `tests/equipo.test.mjs` compara los dos). En la app, lo que un nivel no puede se apaga con `usePermisos()` y el texto «Esto lo hace quien administra la tienda.».

**Seguimiento de la revisión de Codex (PR #61):** `public/sw.js` ya no intercepta ni guarda `/unirse` (la caché pasó a `v2`; prueba en `tests/service-worker.test.mjs`); el permiso `catalogo` se aplica a todos los controles que cambian el catálogo y la demo lo rechaza igual que la base (`GRUPO_DE_OPERACION` en `lib/data/equipo-demo.ts`: añade ahí toda operación nueva); crear un enlace bloquea el botón mientras corre y relaciona el código con su fila comparando los enlaces de antes y de después (si no hay exactamente uno nuevo, no adivina).

**Ojo, herramienta:** el `execute_sql`/`apply_migration` de Supabase se queda colgado (60 s, sin aplicar nada) con un `drop function` o con ciertos cuerpos que incluyen `delete from`. Por eso `quitar_de_tienda` y `aplicar_invitacion` se editaron con reemplazos exactos sobre su definición vigente, e `invitar_a_tienda` conserva su firma y delega en la nueva `invitar_por_correo`.

Pruebas: `scripts/probar-permisos-db.sql` y `scripts/probar-enlaces-concurrencia.py` (en `npm run probar:admin-db`), `tests/equipo.test.mjs`, `npm run probar:equipo` (demo y `/admin-demo`), `probar:teclado` con los campos de «Tu equipo». **Sin probar:** Google real con una segunda cuenta, `/unirse` con sesión real, Safari del iPhone.

## Admin: navegación fluida — Coding (Claude), 2026-10-07

Rama `fix/admin-navegacion`. Lewis notaba el admin lento: toques en la barra que no se registraban, el scroll trabado a veces, la barra distinta a la del panel y esperas entre pestañas. Causas y arreglos: (1) la barra del admin era de enlaces sueltos, sin respuesta hasta que el servidor contestaba; ahora es la misma del panel (`BarraPestanas`, con selector inmediato y arrastre). (2) Las rutas del admin son dinámicas y sin `loading.tsx`, así que Next no las precargaba y cada toque esperaba al servidor; ahora las pestañas se precargan y hay `app/admin/loading.tsx` (y en `/admin-demo`). (3) Cada pantalla volvía a mostrar el esqueleto; Hoy, Tiendas y Trabajo recuerdan su última lectura y se actualizan por detrás. La ficha de tienda no, porque tiene acciones de plata. (4) Las hojas guardaban y restauraban `overflow` cada una por su lado: si una se abría mientras otra se cerraba, el fondo quedaba trabado; ahora hay un contador en `components/hoja.tsx` (afecta a todo el panel, para bien). Prueba: `npm run probar:admin-navegacion`.

**Sin probar:** el admin real (necesita Supabase y la cuenta de Lewis) ni Safari/iPhone. La precarga solo funciona en producción.
## Ver como: la base bloquea las escrituras — Coding (Claude), 2026-10-07

Rama `fix/ver-como-bloqueo`. **Cuatro migraciones aplicadas** (una a la vez, ensayo en `BEGIN … ROLLBACK`, replay y luego `apply_migration`): `20261007012749_ver_como_bloqueo_tablas` (función `exigir_no_viendo`, políticas restrictivas, Storage), `20261007013121_ver_como_bloqueo_rpc_producto`, `20261007013437_ver_como_bloqueo_rpc_pedidos`, `20261007013546_ver_como_bloqueo_rpc_tienda`. Mientras un admin tenga Ver como vigente sobre una tienda, la base rechaza escrituras sobre ella aunque sea dueño; las otras tiendas y el uso sin sesión no cambian. Auditoría: `docs/handoffs/ver-como-bloqueo-auditoria.md` (incluye Mi marca: `marca_tienda`, `marca_referencias` y el bucket `marca-referencias`). `marcar_actividad` devuelve `false` en vez de fallar. La app traduce `solo_mirar` y los rechazos de RLS a un mensaje claro.

**REGLA PERMANENTE (para el PR de colaboradores e invitaciones y todos los que siguen):** toda función nueva que escriba datos de una tienda empieza con `perform public.exigir_no_viendo(<id de la tienda>)` (si no recibe la tienda, se resuelve desde la fila que toca). Toda tabla nueva que un miembro pueda escribir recibe las tres políticas **restrictivas** `ver_como_no_escribe_<tabla>_insert|update|delete`; un bucket nuevo con carpeta por tienda, las de Storage. Al agregar políticas de permisos sobre estas tablas, que sean restrictivas y se sumen a estas, no las reemplacen. Se prueba en `scripts/probar-ver-como-bloqueo-db.sql` y se refleja en `tests/fixtures/admin-funciones-produccion.json`.

**Sin probar:** Ver como real en navegador ni subida real a Storage bajo sesión bloqueada (solo ensayo SQL en transacción revertida). Lewis: abrir Ver como en Esencias Michel y, desde otra pestaña normal con la misma cuenta, intentar guardar algo.

## Mi marca para el retoque + bienvenida animada — Coding (Claude), 2026-10-06

Rama `feat/mi-marca`. **Migraciones aplicadas** en Supabase (autorizadas por Lewis, con `list_migrations` antes y confirmación de que no había otra sesión): `20261006200857_mi_marca` (tablas `marca_tienda` y `marca_referencias` con tope de 6 en la base, bucket PRIVADO `marca-referencias`, políticas de miembros/admin/Ver como) y `20261006201145_mi_marca_revoke_funciones` (`revoke execute … from public` en las dos funciones de apoyo). **Ojo con `marca_palabras_validas`:** la usa un CHECK y Postgres comprueba EXECUTE con el rol de quien escribe, así que además de `public` y `anon` se le quitó y se dejó con `grant execute … to authenticated` (sin eso, guardar las palabras falla con «permission denied»; el replay lo mostró). `marca_referencias_limite` (trigger) quedó sin acceso para la API. `revisar:migraciones`: cero diferencias. `get_advisors`: nada nuevo sobre estos objetos. Michel intacto (15 productos, 95 créditos, 0 trabajos, catálogo público responde).

**Una sola regla «marca lista»** (3 palabras y al menos 3 referencias) en `lib/marca-retoque.ts`; la usan la hoja, el menú, `useTaller` (`taller.marcaLista`), el interruptor «Retocar esta foto», el botón «Retocar» de las fotos guardadas y `taller.pedirDe` (compuerta también ahí). Sin marca lista: el interruptor sale apagado y deshabilitado con «Antes de retocar, cuéntanos de tu marca.» y «Completar Mi marca»; el botón «Retocar» se reemplaza por «Completar Mi marca» (cierra la hoja de la foto y abre Mi marca: nunca tres hojas). No sigue solo al pedido tras guardar la marca (la persona vuelve a tocar «Retocar»). Datos: `getMarcaRetoque` (lectura, permitida en Ver como) y `guardarMarcaRetoque`; quitar una referencia borra también su archivo del bucket; las fotos se ven con URLs firmadas (4 h). Hoja «Para el retoque» en `components/marca-tienda/seccion-retoque.tsx`; «¿Todavía no tienes marca?»: «Hablemos» lleva a `instagram.com/deslizapp` (`INSTAGRAM_DESLIZAPP` en `lib/config.ts`) mientras no haya WhatsApp; sin precio (`precios_extra` es del admin, falta decidir cómo exponerlo). **Tienda de ensayo:** Lewis ya es `dueno` en `miembros`, pero su perfil (`usuarios.tienda_id`) sigue apuntando a Michel y la tienda tiene 0 créditos; vincularla de verdad (y +20 créditos desde su admin) queda para cuando él lo pida. Bienvenida animada en `components/catalogo/bienvenida-retoque.tsx` (solo transform/opacity, excepción documentada en docs/08, sin movimiento con `prefers-reduced-motion`); sale la primera vez por tienda y dispositivo, al tocar «Retocar» y también al GUARDAR un producto con una foto marcada (antes de guardar y de reservar; cancelar no guarda nada). El admin ve «Su marca» y «Copiar instrucciones» en Trabajo › Fotos (solo lectura). Demo: Luna trae marca lista; Michel y Lino empiezan sin marca. Novedad `0.39.0`. Pruebas: `scripts/probar-mi-marca.mjs`, `tests/marca-retoque.test.mjs`, `scripts/probar-mi-marca-db.sql`.

**Sin probar:** nada contra Supabase real (el contenedor no llega a `*.supabase.co`): subida a Storage, URLs firmadas y las políticas reales con una sesión de tienda. La tienda de ensayo no tiene cuenta ligada ni créditos; Ver como solo se probó con test unitario, no en navegador.

## Selector de tiendas y cuenta — Coding (Claude), 2026-10-06

Rama `feat/selector-tiendas` desde `main`. **Sin migraciones.** Menú «Tus tiendas»/«Tu tienda» (`components/panel/menu-tienda.tsx`): tarjeta de la activa con Mi marca dentro (detalle: el estado de Mi marca con `detalleMiMarca` de `lib/marca-retoque.ts`, que el PR de Mi marca puso en lugar del texto fijo «Logo, colores y letra»), otras tiendas, admin, cuenta y versión. **Cambiar de tienda (real):** `elegirTiendaPorDefecto` (`lib/data/sesion.ts`) actualiza `usuarios.tienda_id` (columna con UPDATE y política `usuarios_elegir_tienda`) y el proveedor **recarga la página** (`/`), guardando el aviso «Ahora estás en X.» en `sessionStorage` (`useAvisoTrasCambio` lo muestra una sola vez); con error la tienda no cambia. **`getTiendas` real** ahora pide `mis_tiendas()` (miembro, sin eliminadas) en vez de todo lo que deje ver la RLS. La cuenta (`lib/cuenta.ts`: nombre, correo y foto https de los claims de Google; nada en la base) llega por `useData().cuenta` (`null` en Ver como); la foto va con `referrerPolicy="no-referrer"` en un `<img>` (sin pasar por `next/image`, así no hace falta configurar dominios) y cae a iniciales. **Admin (§2b):** el círculo «LE» fijo es ahora la cuenta real; abre `HojaCuentaAdmin` con «Ir a mi tienda» (`/`) y «Cerrar sesión»; `app/admin/layout.tsx` lee la cuenta y la tienda por defecto en el servidor; `/admin-demo` usa la demo del navegador y `salirDeLaDemo()` (nunca toca Supabase). Novedad `0.38.0`. Pruebas: `tests/selector-tiendas.test.mjs`, `scripts/probar-selector-tiendas.mjs`. **Sin probar:** nada con sesión real de Google ni con la cuenta de Lewis (foto real, cambio Michel ↔ ensayo, `/admin` real: «Ir a mi tienda»); Ver como solo por código.

## Retoque al subir — Coding (Claude), 2026-10-06

Rama `feat/retoque-al-subir` desde `main`. Interruptor «Retocar esta foto» (Beta, 5 créditos) en la hoja de cada foto NUEVA de la ficha (`ficha-medios.tsx`, `retocar` en el borrador). Encender solo anota la intención; al guardar, `hoja-producto.tsx` manda cada foto marcada con su URL ya guardada (`taller.pedirDe`, silencioso, una sola tostada). Lógica pura en `lib/retoque-al-subir.ts` (interruptor deshabilitado si los créditos libres no cubren TODAS las marcadas; emparejado por posición). Si el pedido falla, el producto sigue guardado y la foto conserva su «Retocar». Videos y fotos ya guardadas: sin interruptor. Sin tocar admin, RPC ni el cobro (reserva al pedir, cobra al entregar). Ningún flujo de la UI manda `retocar: true` a `guardarProductoConInventario`. **Mi marca** no está en main: no hay compuerta de marca. Novedad `0.37.0`. Prueba: `scripts/probar-retoque-al-subir.mjs`.

## Retoque Beta + tienda de ensayo — Coding (Claude), 2026-10-06

Rama `feat/retoque-beta` desde `main`. Etiqueta «Beta» (`ETIQUETA_RETOQUE_BETA`) junto a «Retocar foto» y en cada estado del taller de la ficha (en el taller, entregada, devuelta) y en «Tu plan»; textos nuevos en `lib/retoque-textos.ts` (ficha, taller, remate en Caveat, tostada); `TIEMPO_RETOQUE_TEXTO` vacío y oculto. Admin sin tocar. Novedad `0.36.1`. **Tienda de ensayo** creada con SQL (no migración): `tienda-de-ensayo`, `en_prueba`, catálogo `sin` (no es pública), dos productos ocultos con fotos de `public/ensayo/`, Lewis como `dueno` en `miembros` (su perfil en `usuarios` sigue apuntando a Michel). **Sin créditos:** `admin_ajustar_creditos` exige `soy_admin()` y no se forzó una identidad; Lewis puede ajustar +20 desde su admin. PR abierto, sin merge. Detalle en el PR.

## Admin parte 3: Trabajo, retoque real y Personalizar — Coding (Claude), 2026-10-06

PR dependiente desde `feature/admin-trabajo` contra `feature/admin-tiendas` (#53 abierto; partió de su HEAD `39d618f`). Sin merge ni producción; no incorpora #45. Trabajo › Catálogos y Fotos, Personalizar (`/admin/tiendas/[id]/catalogo`), retoque real en la ficha del producto (reserva al pedir, cobra una vez al entregar, devolver no cobra), cabecera SVG con lista blanca al guardar y al pintar el catálogo público, «Pronto» de opiniones como `secciones.opiniones_pronto`, y «Administrar Deslizapp» en el menú de la tienda solo para admins activos (oculto en Ver como y si la consulta falla). `/admin-demo` comparte el taller con la demo del panel del mismo navegador, sin Supabase. Migraciones de lectura aplicadas: `20261006130421_admin_productos_tienda`, `20261006130705_admin_personalizacion_tienda` (43/43, cero diferencias, snapshot de 44 funciones). **No hay tienda de ensayo en Supabase: el retoque real con Storage/Auth no se ejecutó y Michel no se tocó** (95 créditos, 0 trabajos). Detalles: [handoff](docs/handoffs/admin-trabajo-claude.md) y [validación](docs/validacion-admin-trabajo.md).

## Admin: base fusionada y prueba de inventario corregida — Coding, 2026-10-06

PR #51 está fusionado en `main` en `a07acfc`. La corrección autorizada de anulación encadenada se aplicó como **20261006030939_admin_anular_mensualidades_recalculo**, sin tocar pagos reales. Contrato, 392 secuencias SQL/demo, concurrencia y límites de cobertura externa: [validación de anulación](docs/validacion-admin-anulacion.md).

El replay de inventario reportó inicialmente una firma obsoleta de `ajustar_stock` de cinco argumentos, también presente en main sin el admin. La prueba se ajustó al contrato actual de seis argumentos; replay completo posterior pasó. El addendum conserva el fallo histórico y registra el resultado nuevo. Solo cambian pruebas/documentación; no se altera el inventario. Rama independiente de corrección: `fix/inventario-prueba-firma`.

SQL aplicada recuperada y publicada; capa TypeScript, demo y soloMirar reconstruidas sin pantallas. Leer [el handoff admin](docs/handoffs/admin-base-codex.md) y la [validación](docs/validacion-admin-base.md), incluyendo la corrección posterior de anulación y los advisors. soloMirar bloquea desde la app; una cuenta admin/dueño conserva permisos de dueño en la base.

Claude: leer el handoff y hacer fetch del estado remoto antes de continuar. No empujar la copia antigua encima del trabajo de Codex ni reaplicar las seis migraciones. Lewis ya es admin activo; no repetir el alta.

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

# Deslizapp — Panel de tienda (handoff para Claude Code)

## Admin parte 2: Hoy, Tiendas, ficha y Ver como — Coding

PR #53 abierto desde `feature/admin-tiendas`, sin merge ni deploy a producción. Alias de preview de la rama: `https://deslizapp-app-git-feature-admin-tiendas-onedayone.vercel.app`; la URL única, el commit/ID exacto READY y el callback que correspondería permitir están en la descripción actual del PR. Parte de main rebasado a `5ab8632` (incluye los cambios de documentación posteriores a #51/#52). Lewis ya tiene alta admin; no repetirla. No incorporar #45.

La implementación, comparación de capturas, resultados y límites se detallan en [handoff para Planning y Claude](docs/handoffs/admin-tiendas-codex.md) y [validación de Admin parte 2](docs/validacion-admin-tiendas.md). Incluye Demo aislada, fuentes admin real/demo, guardia central `soloMirar` y una migración aditiva propuesta para dos RPC. Replay completo desechable pasó; producción permanece en 40 migraciones sin cambios. **Las bases locales de la otra sesión son desconocidas.** Coordinar SQL compartido y asignar versión oficial con Supabase CLI antes de aplicar; no está instalado y el nombre local de la migración es provisional. Google real, Safari físico, cierre/verificación real y la tienda real no están verificados.

No se cambió Auth. Para probar Google en la preview, permitir el callback exacto que indique la descripción del PR; no cambiar Site URL. Ver como no revoca en la base permisos ordinarios del dueño: `soloMirar` bloquea las escrituras únicamente dentro de ese recorrido de la app.

Capturas/comparación: [`docs/capturas/admin-tiendas/README.md`](docs/capturas/admin-tiendas/README.md). En Demo puede revisarse la interfaz segura; Ver como real requiere coordinar la migración primero.

### Corrección posterior de la prueba de replay de inventario

PR #52 actualizado; consulta la [validación de inventario](validacion-admin-base.md) antes de repetir el replay. El historial conserva los resultados iniciales fallidos y el resultado posterior que pasó.

Este repo es el punto de partida del **panel de administración** de Deslizapp: la
app web donde el dueño de una tienda (ej. Esencias Michel) gestiona su catálogo,
ve sus pedidos, los despacha, arma promos y revisa cómo le va.

**No confundir con:** el catálogo público que ven los clientes finales (el que
se desliza tipo Instagram Reels y pide por WhatsApp). Ese ya existe como un HTML
independiente y **se mantenía separado** de este proyecto; desde octubre de 2026 se conecta y se pasa a React aquí (ver `docs/12-catalogo-conectado.md`). Este repo
incluye el panel y las rutas públicas nuevas; el cambio del enlace público se hará después de comparar ambas superficies.

**Primero lee `docs/00-contexto-del-proyecto.md`**: qué es el proyecto, cómo se trabaja (Planning y Coding), dónde va el trabajo y dónde está cada cosa. Lo que sigue en este documento es la base del panel.

Este documento es el punto de entrada. Antes de escribir código, lee en este
orden:

1. `docs/01-marca.md` — voz, colores, tipografía. Todo lo que se muestre debe sentirse como esto.
2. `docs/02-alcance.md` — qué entra en esta primera versión y qué no.
3. `docs/03-modelo-de-datos.md` — las tablas, ya con la forma que tendrán en Supabase.
4. `docs/04-pantallas.md` — spec de cada pantalla, campo por campo, sacada de los mockups ya validados.
5. `docs/05-arquitectura.md` — cómo se construye esto con datos falsos hoy sin tener que rehacerlo cuando se conecte Supabase.
6. `docs/06-orden-de-construccion.md` — en qué orden construir, y el criterio de "listo" de cada paso.
7. `docs/07-fase-2-cuentas-y-cobros.md` — **solo lectura por ahora:** decisiones ya tomadas para la fase 2 (verificación de Instagram, zona de administración, cobros manuales). No se construye en la primera entrega.
8. `docs/08-movimiento.md` — el sistema de movimiento: cómo se anima todo (reglas obligatorias para lo nuevo).

Además, en `referencias/` está el **prototipo interactivo y navegable del panel** (`referencias/prototipo-interactivo/Main.dc.html`, ábrelo en el navegador) y otros HTML de referencia. Es la referencia visual principal; los `docs/` mandan en reglas de datos, stock y créditos (ver `referencias/LEEME.md`).

## Eliminación de productos — propuesta, sin publicación

Rama `feature/catalogo-eliminar-producto`, desde main `709d7df` (PR #49). Conserva sus tres mejoras de selección, historial y likes; no incorpora PR #45. Nuevo contrato y validación en `docs/validacion-eliminar-producto.md`. Migración CLI `20261005225218_eliminar_producto_logico.sql` **pendiente, no aplicada a producción**; al aplicar en una entrega autorizada, usar la versión que asigne Supabase según AGENTS.md. La preview real conserva el catálogo existente pero no podrá eliminar hasta ese paso. Demo sí permite probarlo.

Eliminar retira lógicamente; no borra archivos, filas históricas ni variantes. Bloquea pedidos en curso, solicitudes vigentes y avisos pendientes; ofrece Ocultar sin perder otros campos. Las nuevas referencias bloquean el producto y rechazan retirados. Historial usa `getProductos(tiendaId, true)`; la lista administrativa/selectores usan el valor por defecto. No reintroducir retirados en alertas de stock. No agregar limpieza de medios: siguen referenciados por la fila histórica. Confirmación sale primero, luego editor, para conservar Atrás con movimiento reducido.

## Publicación autorizada del catálogo conectado

PR #44 y #46 fusionados y publicados en producción. Esencias Michel abre el catálogo React desde `tiendas.url_catalogo`. PR #45 de rendimiento queda fuera. El código original de Claude está incluido mediante #46; no retomar su rama para publicarla por separado. Estado, comprobaciones y límites: `docs/handoffs/publicacion-catalogo-conectado.md`. Las notas de implementación anteriores son históricas; no asumir que las previews antiguas tienen la versión actual.

## Regla permanente: novedades

**Cada cambio visible para el usuario suma una línea a `lib/novedades.ts`.**
Si el cambio sale en una versión nueva, se agrega una entrada nueva arriba
(número mayor, fecha y de 2 a 4 líneas cortas en tono de marca). Al abrir la
app después del despliegue, cada persona ve esas novedades una sola vez (la
primera vez que alguien entra no se le muestran). La versión actual se ve en
el menú de la tienda. Cambios internos sin efecto visible no llevan línea.

## Regla permanente: campos de texto y teclado (iPhone)

**Nunca animar ni remontar los ancestros de un campo de texto al enfocarlo o al cambiar el tamaño;
`focus()` siempre dentro del gesto del usuario; no cambiar `key` ni estado de layout por eventos de
`resize`/`visualViewport`.** En concreto:
- Ningún `useEffect` con listeners de `resize`/`visualViewport` cambia estado de React, ni el
  alto/posición de una hoja, ni llama a `focus()`. El teclado solo puede escribir una variable CSS
  (`--teclado`) y desplazar el contenido para dejar a la vista el campo enfocado (ver `components/hoja.tsx`).
- Los efectos que manejan foco (bloquear fondo, devolver el foco al cerrar) son **estables**: sin
  dependencias que cambien. Si se vuelven a ejecutar con un campo enfocado, su limpieza le quita el foco.
- Ninguna transición de vista (`ViewTransition`, `startViewTransition`, `addTransitionType`): en iOS
  le quita el foco al campo. Ya no se usan en ninguna parte.
- Una hoja con campos de texto es `"grande"` (una `"auto"` crece con el `--teclado` y se mueve). Si un toque abre un
  campo (ej. el selector de cliente), el `focus()` va en el mismo toque: `flushSync` + `focus()`.
- Toda hoja o pantalla nueva con campos de texto se prueba con `npm run probar:teclado`
  (`scripts/probar-teclado.mjs`, con la app corriendo): agrégale el campo nuevo.

## Regla permanente: movimiento

**Movimiento solo en hojas, barra de navegación y microinteracciones de un solo
elemento. Prohibido animar la página completa al cambiar de pestaña y prohibido
animar cada elemento de una lista o grilla al entrar. Solo `transform` y
`opacity`, con la excepción aprobada de `stroke-dashoffset` en el SVG de las
donas de Catálogo y Clientes.** Cambiar de pestaña es instantáneo; las listas y grillas aparecen de
una vez; las fotos no se funden al cargar; no hay librería de animación.

Toda pantalla o componente nuevo sigue `docs/08-movimiento.md`: tokens
(`--mov-*`, `--curva-*` en `app/globals.css` y `lib/movimiento.ts`), nada que haga
esperar un toque y respeto por `prefers-reduced-motion`. Los elementos tocables,
números, avisos y cargas usan los componentes base (`tocable`, `Numero`,
`Segmentos`, `Esqueleto`…).

**Excepción concreta de movimiento para «Tu próxima jugada»:** el resplandor granulado fijo al pie de su Hoja, visible desde que se abre la galería o un detalle, puede moverse continuamente con `transform` y `opacity`. Es decorativo, queda detrás del contenido, no bloquea toques y queda estático con movimiento reducido. La tarjeta inicial comparte ese brillo; al abrir galería o detalle hay una capa breve de morph o barrido y un pulso, y al abrir o elegir un borrador y al tocar «Ver más clientes» otro pulso. `LuzJugada` mantiene quietos el recorte y el grano; tres manchas independientes completan ciclos suaves de 8 s. Pulsos de 520 ms sustituibles y transiciones difusas de 480 ms; nunca se escala o desplaza un fondo rectangular. Todo usa solo transform y opacidad; con movimiento reducido no hay transición. Cabecera y desenfoque de `Hoja` siempre quedan encima del contenido desplazable y de las capas decorativas. Las reglas generales siguen vigentes: nada de transiciones de página ni entradas escalonadas de listas. Ver `docs/08-movimiento.md`.

**Regresión de historial detectada al validar las animaciones:** al cerrar los borradores,
el guard de Strict Mode impedía retirar su entrada también en producción. Ese guard
solo corresponde a desarrollo. La salida vuelve a consumir la entrada de la hoja
apilada; el siguiente «atrás» regresa a la galería sin necesitar un segundo toque.
La mezcla de color del velo se aplica en la capa decorativa de `Hoja`, bajo el blur
y la cabecera, para conservar el contraste del texto.

## Pastillas de filtro

Un solo tamaño para todas (`Segmentos` y `Chip` en `components/controles.tsx`): tokens `--pastilla-alto` (36 px),
`--pastilla-px` (14 px), `--pastilla-letra` (13,5 / 14 px) y `--pastilla-contador` (20 px) en `app/globals.css`. Nadie pasa
un alto propio: para cambiarlas se edita un valor. Ancho natural, alineadas a la izquierda, y la fila de `Segmentos` se
desplaza en horizontal si no caben. Área de toque de 44 px o más con un pseudo-elemento invisible. Detalle en
`docs/04-pantallas.md`.

## Ticket de promo (Promos y selector de cupón)

**Cambiar de tipo mediante copia:** al tocar un tipo distinto en edición se explica la restricción
y se abre una hoja compacta sobre el editor; «Sí, crear otra promo» abre el formulario nuevo
con el tipo elegido después de cerrar esa hoja. Reutiliza la duplicación y sus fechas (hoy,
sin vencimiento ni pausa); no copia usos. Los cambios sin guardar piden el aviso existente antes
de salir. La original solo termina al elegir «Terminar la anterior» y confirmar «Sí, terminar».
Cancelar o «Dejar ambas» conserva la original. Detalles y límites en docs/04; comprobación de
demo local con `node scripts/probar-reemplazo-promos.mjs` y foco con `npm run probar:teclado`.
La tarjeta abre el detalle de solo lectura en `/promos/[id]`; la edición tiene su propia ruta
`/promos/[id]/editar`. La hoja de compartir vuelve al detalle cuando salió de él.
`node scripts/probar-detalle-promos.mjs` comprueba las rutas, hojas y capturas reales.
No necesita migraciones. (La reconciliación de migraciones ya se hizo: PR #41.)

Un solo componente, `components/promos/ticket-promo.tsx`, con dos tamaños: normal (lista de Promos, vía `tarjeta-promo.tsx`) y
compacto (selector de cupón de pedidos, `selector-descuento.tsx`). Colores y forma salen de ahí: no se duplica el ticket.
Fila de descuento de un pedido = `FilaDescuento` ("+ Agregar cupón" o ticket compacto con Cambiar / Quitar).

## Resumen: qué es una venta

Una **venta confirmada** es un pedido `despachado` (fecha = `despachado_en`, o `creado_en` si viniera nulo); un **pedido recibido** es
cualquier no cancelado (por `creado_en`); un **pendiente** es `nuevo` o `por_despachar`. Vive en `lib/resumen.ts` (`ventasDe`,
`pendientesDe`, `fechaDeVenta`) con pruebas en `tests/resumen.test.mjs`. La cifra y las barras principales del Resumen suman ventas
confirmadas más pedidos `por_despachar` del tramo (no los `nuevo`); barras rosas = pagado, mandarina = por cobrar, según los importes actuales de `getPedidos`
(incluye abonos parciales; no agrupa cobros por fecha de abono). El total no cambia. La variación
compara ambos grupos. Ticket promedio, top 3 y Clientes continúan usando solo pedidos despachados; "Pedidos recibidos" y "De aaah a
pedido" usan recibidos. La tarjeta conserva la línea con el total global por despachar. Detalle en docs/03 y docs/04; validación de los colores de pago en
`docs/validacion-grafico-pagos.md`.

**Borrar contacto:** la edición ofrece conservar los pedidos y abonos sin asociarlos al contacto, o borrar también todo ese historial.
La segunda opción exige confirmación. Demo y Supabase comparten la regla; la RPC `borrar_cliente` en `20261002161112_borrar_cliente.sql`
opera solo en la tienda de sesión. Borrar pedidos históricos no restaura stock. La migración se aplicó a producción en Supabase con el identificador `20261002161112`. El historial de migraciones del repositorio y de Supabase ya está reconciliado (PR #41).

## Donas de Catálogo y Clientes

`components/dona.tsx` pinta el SVG reutilizable. Catálogo muestra en su cabecera
la salud del inventario y abre «Tu inventario» (ver la sección de arriba; antes mostraba los espacios libres del plan). Clientes muestra la mezcla
de quienes repiten, compraron una vez y no han comprado; su hoja «Tus clientes»
abre filtros y el mensaje de WhatsApp para Dormidos. Todos esos grupos usan solo
pedidos despachados; «Nuevos» y «Dormidos» usan días civiles de Santo Domingo.
«Deben» sigue usando cuentas por cobrar. Cálculo puro en
`lib/clientes-resumen.ts`; detalles en docs/04-pantallas.md. La demo ya contiene
los tres segmentos, nuevos y dormidos. No requiere migraciones.

La hoja «Tus clientes» comienza con la tarjeta «Tu próxima jugada»: galería y cuatro detalles dentro de la misma hoja. «Escribir» abre una hoja apilada con tres borradores locales; el elegido se puede editar antes de abrir WhatsApp, sin envío automático. `lib/proxima-jugada.ts` reutiliza el análisis de compras despachadas, excluye clientes con pedidos en curso y respeta la tienda activa; los grupos se recalculan al cambiar los datos o el día de Santo Domingo. Los datos de ejemplo del mockup no se copian al código. Ver `docs/04-pantallas.md` y `tests/proxima-jugada.test.mjs`.

## Catálogo: inventario, Por reponer y Hacer espacio

- **El plan cuenta solo los productos VISIBLES** (`activo = true`; los ocultos no ocupan lugar). Helper único: `lib/plan-catalogo.ts`
  (`resumenDelPlan`, estados `sobra` < 70 % · `quedan` 70–89 % · `casi` 90–99 % · `lleno`, y `textosDelPlan`). Lo usan la lista del
  Catálogo, la hoja del producto, «Tu plan» y la tarjeta del Inicio. Con el plan lleno, un producto nuevo se guarda oculto
  (interruptor apagado y deshabilitado) y volver visible uno oculto no cambia nada y avisa con un Toast con «Hacer espacio».
  No hay restricción en la base para esto (a propósito).
- **La dona del Catálogo es la salud del inventario** (visibles: con stock ≥ 3 o sin control · queda 1 o 2 · agotados;
  `lib/inventario-catalogo.ts`) y abre la hoja **«Tu inventario»** (`components/catalogo/hoja-inventario.tsx`, montada en
  `PanelUIProvider`; se abre con `usePanelUI().abrirInventario()`, o `abrirInventario("espacio")` para ir directo a «Hacer espacio»).
  Vistas internas con Volver: **Por reponer** (`vista-por-reponer.tsx`), **Sin movimiento** y **Hacer espacio**
  (`vista-hacer-espacio.tsx`). Lo marcado en Por reponer vive en la hoja mientras está abierta.
- **Por reponer**: «Todavía viene» comparte el mensaje (`mensajeReposicion`, `navigator.share` o `wa.me`); «¡Ya la tengo!» llama a
  `reponerStock` → RPC `reponer_stock` (todo o nada, motivo `reposicion` en el historial). **Hacer espacio**: `cambiarVisibilidad`
  (un solo UPDATE) oculta; Deshacer vuelve a mostrar. No hay «eliminar para siempre» (pedidos e historial apuntan a los productos).
- Ventas de «30 días» salen de los pedidos **despachados** (`ventasPorProducto`). «Sin movimiento» = visibles con stock y sin
  ventas en 30 días (productos recién creados también entran). Los que no llevan stock no se reponen.
- La leyenda de la dona filtra la lista; para «Queda 1 o 2» se creó la pastilla **«Por agotarse»** (stock 1 o 2, visibles).
  `usePanelUI().filtrarCatalogo()` pide el filtro a la lista aunque se esté en otra ruta.
- El Toast con acción es `components/ui/toast.tsx` (`useToastUI`), montado junto al antiguo `components/toast.tsx` en el layout del
  panel (el antiguo sigue para el resto de la app hasta migrarlo).
- Gráficos redondeados (docs/09 «Barras y anillos»): `Dona` dibuja cada segmento con punta redonda y 3 px de separación; la barra del
  plan y `BarraAbonado` llevan extremos de píldora y un mínimo de ancho igual a su alto. En la barra y la leyenda del plan el tramo
  verde se llama «Disponibles» (igual que la dona). En la vista previa del producto, «Guardar/Descartar» van encima de la tarjeta de
  stock y «Editar/Crear pedido» se ocultan mientras haya cambios sin guardar.
- **Hoja de resumen con dona unificada** (`components/ui/resumen-dona.tsx`, docs/09): «Tus clientes» y «Tu inventario» usan el mismo
  `ResumenDona` (dona 112 + título Fredoka y línea; leyenda y «otros grupos» como `ListaAgrupada`, filas con número > 0 tocables con
  chevron). Tocar una fila abre dentro de la hoja la lista del grupo (clientes con `FilaCliente`, productos). La leyenda del inventario ya no
  filtra la lista de atrás (se quitó `filtrarCatalogo`; la pastilla «Por agotarse» sigue). Lecturas puras: `lecturaClientes`, `lecturaInventario`.
- Donas sin anillo de fondo: `Dona` solo dibuja la `pista` cuando la suma de los segmentos es 0 (estado vacío). `COLOR_STOCK.agotados` es
  `var(--peligro)` y lo usan la dona, la leyenda y la barra del plan (no se tocó el modo oscuro).
- Cuadros del resumen de Clientes: en `ResumenDona` los `otros` son cuadros 2×2 (ícono suelto junto a la cifra; nombre y explicación con
  el chevron a su derecha). Con valor > 0 cierran la hoja y filtran la pantalla de Clientes; `FiltroClientes` suma `catalogo` y `manual`,
  cuyas pastillas solo aparecen mientras están elegidas (`pastillasClientes`). La leyenda de la dona mantiene su vista interna con Volver.
- Componentes ui nuevos: `VistaPreviaWhatsApp` (burbuja enviada con el patrón `public/chat/patron-whatsapp.svg`; también en el
  recordatorio de cobro del cliente) y `CheckSeleccion` (+ `FilaLista marcada` = casilla). Capturas en `docs/capturas/catalogo/`.

## Vista previa de producto e inventario

Las tarjetas de Catálogo abren `/catalogo/[id]`: ficha de solo lectura: el título de la hoja es el nombre del producto, foto de 120 px, precio vigente, colección,
etiqueta «Oculto» solo si lo está, e inventario en lista agrupada («En stock» con Cantidad e «Historial»). «Crear pedido» abre el formulario preseleccionado; solo despachar
el pedido descuenta inventario. «Editar» conserva el formulario y sus fotos.

**Inventario provisional de PR #21:** vista previa y edición
comparten un borrador de cantidad mediante `useData()`. +/− no escribe; guardar
confirma un único delta final. Disminuir pide motivo al guardar («Otro» requiere
nota); aumentar usa reposición. Descartar o volver al stock base no crea registros.
El historial visible muestra solo ajustes reales, con antes/después, motivo, nota,
actor y fecha de Santo Domingo, por tramos de diez y con error/reintento.
`stock = null` sigue sin control; no se habilita/deshabilita en productos existentes.

**Contenedor y navegación interna:** Guardar cambios y Descartar viven dentro de
Inventario, tienen el mismo ancho y aparecen solo con diferencia. Descartar afecta únicamente la cantidad;
el Guardar del editor sigue usando la operación conjunta de ficha e inventario.
No duplicar ese botón con el Guardar general mientras haya ajuste pendiente.
«Ver historial» es una fila de ancho completo con borde y chevron existente;
abre una vista de la misma Hoja, conserva la ficha/formulario
montados y restaura scroll y foco al volver. `Hoja.alVolverInterno` consume Atrás
solo en esa vista antes de evaluar la salida con cambios; no crea otra hoja ni
otra entrada al abrir el historial. X/Escape mantienen la protección de salida.
No se cambiaron operaciones de datos, Supabase ni migraciones para esta mejora.
Ver `docs/validacion-historial-interno.md`.

`20261002203414_ajustes_inventario.sql` **está aplicada**: tabla `ajustes_inventario`,
RLS y RPC `ajustar_stock`. La nueva migración
`20261002223718_guardar_producto_inventario.sql` **está aplicada en producción**. Añade una RPC
con nombre distinto (sin sobrecarga), conserva la anterior e incorpora índice del
historial. Bloquea el producto, verifica base/membresía/actor y guarda ficha, stock,
ajuste y créditos de retoque juntos. El ID del ajuste evita repetir una operación
confirmada. El cliente no puede escribir stock ni historial directamente.
El usuario autorizó aplicar esta migración y después fusionar PR #21. Se aplicó
mediante el conector, con la versión `20261002223718` generada por Supabase.
El archivo se renombró desde `20261002205119`; no se alteró el historial interno.
En producción se comprobó ficha+stock, registro/actor, repetición sin duplicar,
conflicto sin ficha parcial y aislamiento mediante una transacción revertida.
La lectura posterior conservó 15 productos, 2 ajustes y la firma de stock
`338ecaf4cc10f82a36acf78d275e6596`. No equivale al recorrido de navegador real.

Si cambia el stock, se relee el producto/historial y se conserva la propuesta para
revisarla. Ante resultado de red incierto, se bloquea el reenvío hasta releer; no hay
reintento automático. Con respuesta perdida pero ajuste confirmado, se reconoce
por ID. Fotos se suben antes de la transacción: errores conocidos limpian las nuevas;
una respuesta incierta las conserva para no borrar fotos posiblemente guardadas.

Las dos hojas de ruta optan por `Hoja.protegerAtras`: misma confirmación existente
antes de Atrás, X, Escape, gesto o navegación a edición/pedido. Retiran su marcador
antes de navegar mediante `alSalir`; las otras hojas mantienen su comportamiento.
Los efectos de foco siguen estables, sin cambios por teclado/resize. No se añaden
animaciones ni entradas de filas. Ver `docs/validacion-inventario-provisional.md`.

**Histórico de PR #20 (interacción anterior al inventario provisional):**
La RPC, RLS y los permisos se comprobaron en producción; incrementos,
disminuciones, registro/actor, rechazo de negativos, cambios directos y otra
tienda pasaron dentro de una transacción revertida. No persistieron ajustes de prueba; después se observaron dos reposiciones
+1 registradas a las 20:36:30/20:36:36 UTC, posteriores a la verificación. Ver `docs/validacion-inventario-pr20.md`.

Nota histórica: la reconciliación de identificadores ya se hizo (PR #41); hoy el repo y Supabase coinciden (`npm run revisar:migraciones`). Aun así, no ejecutar un `db push` general a ciegas.
El CLI ya está instalado; el dry-run dirigido a producción sigue sin ejecutarse
por falta de credenciales y la divergencia pendiente;
la comprobación transaccional del SQL y la aplicación individual no equivalen
a ese dry-run. Navegador con tienda real, fallos de red reales e iPhone físico siguen
pendientes.

## Ventas a crédito y abonos

Un pedido puede ser `contado` o `credito` (columnas `pago_modo` y `pago_fecha_acordada` de `pedidos`, que la app sí escribe) y los abonos
viven en la tabla `abonos` (solo lectura: se crean con la RPC `registrar_abono`, se editan con `editar_abono` —monto, método, fecha y nota; el monto máximo es el saldo del pedido + el monto viejo— y se borran con `eliminar_abono`). Todas las cuentas
(saldo, reparto del más viejo al más nuevo, "Atrasado N días" en hora de Santo Domingo, cuentas por cobrar, recordatorio) están en
`lib/credito.ts` con pruebas en `tests/credito.test.mjs`; la demo las usa en `lib/data/creditos.ts` y `lib/data/pedidos.ts` (la demo
reparte igual que la RPC y trae tres clientes que compraron fiado). Pantallas en `components/credito/` y detalle en docs/03 y docs/04.
Un pedido cancelado no genera deuda; las ventas del Resumen no cambian (cuentan al despachar, esté pagado o no). El recordatorio por
WhatsApp lo abre siempre el dueño. Las RPC de abonos (incluida `editar_abono`) aún no se probaron contra Supabase real; la demo tiene `editarAbono` con la misma firma (`planearEdicionAbono` en `lib/credito.ts`, con tests). Al cambiar la forma de los datos de la
demo, su clave de almacenamiento pasó a `deslizapp-demo-v3` (los datos de prueba anteriores se reinician una vez).

## Catálogo en línea (enlace)

`tiendas.url_catalogo` (Mi marca) alimenta la tarjeta de la pestaña Catálogo (`components/catalogo/tarjeta-catalogo.tsx`), con 8 estados
que salen de `tiendas.catalogo_estado` (+ `catalogo_paso`, `catalogo_notas_cambios`, fechas) vía `lib/catalogo-estado.ts` (puro, con tests).
El dueño solo cambia el estado con las RPC `solicitar_catalogo`, `pedir_cambios_catalogo` y `publicar_catalogo` (nunca UPDATE directo);
el equipo hace el resto fuera de la app. La demo tiene "Simular avance del catálogo" en el menú de la tienda. Las RPC aún no se probaron
contra Supabase real. Detalle en docs/04-pantallas.md. El enlace se valida con `lib/enlace-catalogo.ts` (solo https) y nunca se pinta como
HTML. El catálogo todavía no se alimenta solo de los productos del panel. El de Esencias Michel vive provisionalmente en `/catalogos/esencias-michel.html` (`public/catalogos/`).

## Sistema de diseño (tokens, components/ui y /diseno)

- **Reglas:** `docs/09-sistema-de-diseno.md` (y `docs/10-marca-ilustracion-y-fondos.md`). Valores en `referencias/sistema-de-diseno/tokens.json`.
- **Tokens** en `app/globals.css`: colores por FUNCIÓN (`--fondo`, `--superficie`, `--texto`, `--accion`, `--atencion-texto`, `--peligro`…) con
  el valor claro en `:root` y el oscuro SOLO bajo `[data-theme="dark"]` (en `<html>` o en cualquier contenedor; todavía sin
  `prefers-color-scheme`: el oscuro automático se activa cuando las pantallas estén migradas). Utilidades de Tailwind sin prefijo:
  `bg-superficie`, `bg-superficie-hundida`, `text-texto`, `text-texto-secundario`, `border-linea`, `border-borde-campo`, `bg-accion
  text-sobre-accion`, `bg-accion-suave`, `bg-atencion-suave text-atencion-texto`, `text-peligro`, `outline-foco`, `bg-velo`…
  (`linea`, `peligro` y `marco` coinciden con los nombres viejos y tienen el mismo valor en claro).
- **Texto:** `text-cifra`, `text-titulo-pantalla`, `text-titulo-hoja`, `text-titulo-seccion` (con `font-display`), `text-destacado`,
  `text-cuerpo`, `text-secundario`, `text-etiqueta`, `text-contador`, `text-mano` / `text-mano-celebracion` (con `font-mano`). En rem.
- **Radios:** `rounded-radio-s/m/l/xl` (10/16/22/28; las píldoras, `rounded-full`). **Sombras:** `shadow-flotante`, `shadow-hoja`.
  **Alturas:** `h-(--alto-boton-grande)`, `h-(--alto-control)`, `h-(--alto-compacto)`, `h-(--alto-campo)`, `h-(--alto-etiqueta)`,
  `size-(--alto-avatar)`.
- **Colores heredados** (`bosque`, `rosa`, `mandarina`, `papel`, `menta`, `arena`, `suave`, `borde`, `tenue`, `apagado`, `tinta`,
  `bosque-oscuro`, `mandarina-texto`): siguen igual mientras dura la migración; se reemplazan al migrar cada pantalla.
- **`components/ui/` es la fuente de verdad para todo lo nuevo:** Boton (+ BotonIcono), Pastilla / FilaPastillas, Opcion /
  GrupoOpciones, ControlSegmentado, ListaAgrupada / FilaLista, Tarjeta, Aviso, Alerta, Etiqueta / Contador, Campo / Buscador, Avatar
  y el Toast nuevo (ProveedorToast + useToastUI). Se importan desde `@/components/ui`. Los componentes viejos (`controles.tsx`,
  `toast.tsx`…) siguen en las pantallas que aún no se migran.
- **Pantallas migradas al sistema:** **Pedidos** (lista, detalle, "+ Pedido"/venta pasada/Editar, selectores de cliente, producto y cupón, y el
  pago y los abonos: `components/pedidos/*`, `components/credito/{pago-del-pedido,campos-pago,hoja-abono,hoja-detalle-abono,tarjeta-saldado,comunes}`). Variantes
  nuevas en `components/ui/`: `Cantidad` (− 1 +, cuadrados de 36, `radio-s`; `BotonCantidad` suelto), `Boton jerarquia="terciario" tono="peligro"` (texto rojo sin contorno: Cancelar / Eliminar pedido, Borrar abono), `Boton whatsapp` (Escribir: compacto, relleno `accion`, icono WhatsApp), `Boton jerarquia="resalte"` (Despachar pedido, la llamada emocional de la pantalla), `CampoMonto` (monto en pesos, normal o grande), `BotonIcono tono="accion"`, `Buscador entrada=` (ref para el
  teclado de iPhone), `Boton scroll=` (para enlaces que abren hojas) y `soloDigitos`. Quedó con tokens también lo compartido que usa la
  pantalla: `selector-busqueda`, `ver-mas`, `hoja-estado`, `boton-flotante`, `titulo-pantalla`, `Interruptor`, `estado-vacio`, el esqueleto,
  el fondo del `body` y de `(dashboard)/layout`, y los colores de `hoja.tsx` (solo tokens, sin reescribirla). Pendiente de Pedidos: el encabezado y
  la barra inferior (shell), `TicketPromo` (Promos) y la hoja `Hoja` completa (radio 28, sombra).
- **FilaPastillas (filtros) = cápsula que se desliza:** el indicador `accion` es de tres piezas con `transform` (puntas + centro con `scaleX`, `--mov-normal` y `--curva-salida`, sin transición con reducir movimiento) sobre una capa de relleno `superficie` + `borde-pastilla` por pastilla; alto `--pastilla-alto`, `--pastilla-px`, `--pastilla-letra` en bold, gap 6 px, toque 44. Mantiene `aria-pressed` (lo que prueban `probar:teclado` y `probar:hojas`), flechas/Inicio/Fin y divisor solo antes del primer condicional. Usa el `Contador` de `ui/etiqueta` (tokens, claro/oscuro), no el viejo `components/contador.tsx`. Afecta a toda pantalla que use `FilaPastillas` (Pedidos y el selector de productos de + Pedido).
- **Vista previa de la factura:** "Descargar" de la `TarjetaDocumento` abre la hoja "Factura #N" (altura automática) con la vista previa = el MISMO PNG que genera `generarImagenFactura` (blob local) en una hoja de papel con scroll interno (máx. 55vh), skeleton mientras se genera y `Aviso` con "Reintentar" si falla. Botones "PDF" (principal) e "Imagen" (secundario); archivos `factura-N.pdf` / `factura-N.png`; al terminar cierra y muestra "Factura descargada". `descargarArchivo` (`lib/portapapeles.ts`) usa la hoja de compartir con el archivo en la PWA de iPhone/iPad y la descarga normal en el resto. "Compartir" no cambió.
- **Celebración de despacho:** `components/pedidos/hoja-despachado.tsx` (referencia `referencias/animacion-despacho/pedido-despachado.html`). Se abre desde `hoja-pedido.tsx` solo cuando `despacharPedido` respondió OK y reemplaza al toast. Movimiento solo CSS (`desp-*` en `app/globals.css`, transform/opacity; estilos base = estado final, sin animación con reducir movimiento) y el conteo del monto con `requestAnimationFrame` (se cancela al cerrar). Token nuevo `--patron` (claro #ebe1d0, oscuro #1c3027) para los íconos del fondo. `Hoja` ganó `tituloOculto` (título solo para lectores de pantalla). La etiqueta de stock usa `STOCK_BAJO` (≤ 2) y el stock que trae el servidor al releer `productos`.
- **`TarjetaDocumento`** (`components/ui/tarjeta-documento.tsx`): la factura del detalle del pedido (miniatura de papel, "Factura #N", etiqueta Al contado/Pagado en éxito o A crédito en atención, y "Descargar" secundario + "Compartir" principal con texto). Va después de la tarjeta de productos y antes de la de Pago, solo en pedidos despachados. Usa las mismas funciones de `AccionesFactura` (hoja "Descargar como PDF / imagen" y compartir); no cambió cómo se genera ni lo que se comparte.
- **Etiquetas con relleno visible:** neutro = `borde-pastilla` + `texto`; éxito (Entregado, Pagado, Al contado, Despachado); atención (Quedan N, A crédito, Debe, Atrasado); fuerte solo Agotado.
- **Hojas de abono:** Registrar y Editar abono, y el detalle del abono, tienen altura automática. **GrupoOpciones:** la pregunta es subtítulo `destacado` en `texto` (sigue siendo la etiqueta del radiogroup).
- **Clientes migrado al sistema** (`components/clientes/*`, `components/credito/{cuenta-cliente,por-cobrar,tarjeta-saldado,comunes}`): `Buscador`, filtros con `FilaPastillas` (los Segmentos ya no filtran), `ListaAgrupada` + `FilaLista` (nuevo: prop `accion` para un botón "Escribir" junto a la fila, y `pie` para una etiqueta debajo), `Etiqueta` Repite en éxito, `CampoMultilinea` (nota), `Campo`, `Alerta` para borrar el historial, `Tarjeta tono="destacada"` para "Por cobrar". `luz-jugada.tsx` no se tocó; las tarjetas de jugadas conservan su color de datos (`lib/proxima-jugada`) y el texto fijo `marca-bosque`.
- **Menos texto (docs/09, principio inicial):** filtros de Clientes `Todos · Deben · Repiten · Nuevos · Dormidos` sin divisor (`FilaPastillas ocultarVacios`); "Repite" es la señal de corazón de `Avatar repite`; lo atrasado es reloj + texto, sin píldora (ya no existe el tono `urgente`); en filas de lista la deuda es `MontoDeuda` (a la derecha) + `BarraAbonado mini`; la tarjeta de pedido empieza por el cliente (avatar, nombre, "#N · Ayer") con una sola etiqueta de pago; la hoja del pedido ya no repite el estado, el origen ni frases; el detalle del cliente tiene cabecera compacta, movimientos con íconos, "Registrar abono" y el recordatorio con 4 mensajes (`mensajesRecordatorio` en `lib/credito.ts`). La nota del cliente (máx. 60, `clientes_nota_largo`) se edita en "Editar cliente" y se ve como burbuja sobre el avatar de 88 px.
- **Bloque de deuda** (`components/ui/bloque-deuda.tsx`: `BloqueDeuda`, `FechaDeuda`, `BarraAbonado`; reemplaza al chin, ya no existe `Tarjeta chin` ni `atencion-borde`): "Debe RD$X" + fecha (`textoFechaDeuda` en `lib/credito.ts`) o la etiqueta `urgente` (token nuevo de `Etiqueta`, solo para "Atrasado N días"), barra de lo abonado y leyenda; `tamano="mini"` en el historial del cliente. Va en la tarjeta de pedido (que ya no lleva el estado: lleva la etiqueta de pago, regla "No repetir el filtro"), en las cuentas de "Deben" (suman TODOS los pedidos con saldo: `totalPedidos` y `abonado` en `CuentaPorCobrar`/`CuentaCliente`, `totalYAbonado`) y en "Te debe". Las filas de "Todos" llevan la etiqueta "Debe RD$X". La hoja del pedido muestra una sola `EtiquetaPago`. `Hoja` tiene `capaSuperior`. La factura es siempre blanca (`PAPEL_DOCUMENTO`).
- **Cupón aplicado:** el ticket compacto es UN botón con chevron que abre el selector; tocar el cupón aplicado lo quita y tocar otro lo cambia (toasts "Cupón quitado" / "Cupón cambiado"); el código se muestra una sola vez.
- **Ver más:** `BotonVerMas` es la última fila de la lista ("Ver N más" + "5 de 69"); `forma="fila"` en listas agrupadas y `forma="tarjeta"` en tarjetas sueltas; el foco pasa al primer elemento nuevo (`lib/ver-mas.ts`). **Dona:** solo la cifra dentro del anillo; el texto va debajo.
- **Foco verde, nunca naranja:** `--foco` es #174b3a (claro) / #9ed3b8 (oscuro). Campo, CampoMonto y Buscador no llevan anillo: con el cursor dentro el contorno de 2 px pasa a `accion` (con error, `peligro`); el borde es siempre de 2 px para que no salte. Botones, opciones, pastillas y filas tocables usan el anillo `foco` de 3 px solo con `:focus-visible`.
- **Secundario con relleno:** `Boton jerarquia="secundario"` lleva relleno `superficie` (nunca transparente). Las acciones dentro de tarjetas y filas (Cambiar, Quitar, Cambiar a crédito) son secundario `compacto`; el terciario queda solo para Cancelar/Eliminar pedido y Borrar abono (peligro) y Reintentar en un aviso.
- **Cantidad:** − en `superficie-hundida`, + en `accion` con icono `sobre-accion`; cada uno se apaga al llegar al mínimo o al tope. **`FilaAgregar`** (`components/ui/fila-agregar.tsx`): círculo `accion` de 24 px con +, texto `destacado` (Agregar cupón).
- **Regla Opcion vs segmentado:** `ControlSegmentado` solo cambia una vista o modo (Día / Semana / Mes); un dato que se guarda va con `GrupoOpciones` / `Opcion` aunque sean dos opciones (por eso "¿Cómo te paga?" ya no es segmentado).
- **Guía viva:** `/diseno` (pública, noindex, sin enlace desde la app), con todos los componentes y sus estados, en claro y oscuro.
- **Regla:** en código nuevo no se escriben colores ni tamaños a mano (ni hex, ni `bg-white`, ni `text-[Npx]` fuera de la escala, ni
  `rounded-[Npx]`, ni `shadow-[…]`). `npm run revisar-estilos` cuenta lo que queda a mano en las pantallas viejas (solo informa).

## Icono de la app

Fondo Menta, isotipo Verde Bosque con borde Menta (fuente: `public/icons/isotipo-app.svg`; se regenera con `npm run iconos`, que usa sharp). Para ver el icono nuevo en iPhone hay que borrar la app de la pantalla de inicio y volver a agregarla desde Safari (iOS guarda el icono al instalar).

## Hojas apiladas, aviso al salir y color de opciones

- `Hoja` se pinta en un portal en `<body>`: una hoja sobre otra (ej. "Registrar abono" sobre el detalle del pedido) no comparte gestos con la
  de abajo; solo la de arriba responde a deslizar, fondo, Escape, X y "atrás". Con cambios sin guardar (`avisarAlSalir` o `useAvisarAlSalir`)
  cerrar pregunta "¿Salir sin guardar?". Se prueba con `npm run probar:hojas` (con la app corriendo; igual que `probar:teclado`).
  Límite conocido: en hojas de RUTA con cambios sin guardar (pedido nuevo, cliente nuevo…) el botón atrás del teléfono sale directo con la
  ruta; deslizar, fondo, Escape y X sí preguntan. Excepción optativa de esta rama: vista previa y formulario de producto usan `protegerAtras` y coordinan `alSalir` después de retirar el marcador; sus cambios pendientes sí se protegen al volver. No se extiende a las otras rutas.
- Las opciones de un formulario (`Chip` / `Segmentos` con `tono="opcion"`) van en Rosa con check; las acciones, en Verde Bosque (principal) o
  contorno (secundaria); ver docs/04-pantallas.md. No cambia las pastillas de filtro.
- Las hojas de cliente y de pedido nunca quedan en blanco (esqueleto, o error con "Reintentar"): `components/hoja-estado.tsx`, y
  `useConsulta` devuelve también `error` y `reintentar`.

## Hojas inferiores

Para elegir algo de una lista larga dentro de una hoja (cliente, producto, y en el paso 8 producto o colección) se usa
`components/selector-busqueda.tsx` (`SelectorBusqueda`, `FilaAccion`, `ListaSeleccion`) y los helpers de `lib/texto.ts`
y `lib/telefono.ts`: una vista más DENTRO de la misma hoja, nunca una segunda hoja encima. Lo fijo arriba va
con `<HojaFijoArriba>` (dentro de la cabecera y de su desenfoque: nunca `sticky` suelto) y lo fijo abajo con
`<HojaFijoAbajo>` / `PildoraSeleccion` (se oculta con el teclado).

Toda hoja nueva (detalle de pedido, nuevo pedido, nueva promo…) usa el
componente `Hoja` de `components/hoja.tsx` y elige su altura con la propiedad
`altura`: `"auto"` (contenido corto), `"expandible"` (contenido largo: abre a
media altura) o `"grande"` (formularios largos). La forma (pegada a los bordes,
esquinas de arriba de 30 px, tope bajo la barra de estado), la cabecera fija con
borde de desplazamiento, cerrar deslizando, el teclado y la accesibilidad ya
vienen resueltos ahí (detalle en `docs/04-pantallas.md`).

## App instalable (PWA)

- `app/manifest.ts` + íconos en `public/icons/` y `app/icon.png` (se regeneran con
  `node scripts/generar-iconos.mjs` a partir de `referencias/iconos/icono-vendedores.png`,
  la "d" verde sobre crema). El ícono rosado es de la futura app marketplace: no se usa aquí
  (ver "Íconos de las apps" en `docs/01-marca.md`).
- `public/sw.js` (solo en producción): red primero para páginas y código,
  caché para imágenes, fuentes e íconos. Nunca guarda HTML por adelantado.
- Aviso "Hay una versión nueva": compara el despliegue compilado
  (`NEXT_PUBLIC_ID_DESPLIEGUE`, ver `next.config.ts`) con `/api/version`.

## Importante sobre esta versión de Next.js

Este proyecto usa **Next.js 16** (App Router), que tiene cambios respecto a
versiones anteriores que puede que tu conocimiento no refleje (por ejemplo,
`params` y `searchParams` llegan como `Promise` en las páginas, y existen los
helpers globales `PageProps<'/ruta'>` / `LayoutProps<'/ruta'>`). Antes de
escribir rutas o layouts, revisa `node_modules/next/dist/docs/01-app/` —
ahí está la documentación exacta de esta versión instalada.

## Estado actual del repo

- Next.js 16 + TypeScript + Tailwind v4 + App Router, publicado en Vercel
  (https://deslizapp-app.vercel.app; cada push a `main` publica solo).
- Hechos: tema de marca, capa de datos de prueba (`useData()` + `localStorage`),
  layout con navegación, Plan y créditos, Catálogo, retoque de fotos, Pedidos
  (lista, detalle, despacho con stock y pedido manual), Clientes (derivados de los pedidos), Promos (estado por fechas, compartir), Mi marca (logo, colores y letra de los cupones), Resumen (Inicio, con cálculos en `lib/resumen.ts`) y app instalable con novedades. El avance paso a paso está en `docs/06-orden-de-construccion.md`.
- **Primera entrega cerrada** (pasos 0–10 de `docs/06-orden-de-construccion.md`). El repaso final, con lo que
  se probó, lo que se corrigió y lo pendiente, está en `docs/08-repaso-final.md`.
- **Supabase conectado (paso 11)**: dos modos detrás de la misma interfaz de datos — **demo** (seed +
  `localStorage`, sin login) y **real** (Supabase con Google; una cuenta = una tienda vía `usuarios`). El esquema
  vive en `supabase/migrations/` (manda sobre los docs). Cómo está armado: `docs/05-arquitectura.md`; reglas que
  pone la base y errores: `docs/03-modelo-de-datos.md`. Variables: `.env.example` (solo la llave publicable;
  nunca una secreta ni `service_role`). **Fotos y logos**: en modo real se comprimen en el navegador y se suben al
  bucket `productos` de Storage (`<tienda_id>/<uuid>.webp`, logo en `<tienda_id>/logo/`; JPEG en iPhone porque
  Safari no crea WebP); la base guarda solo la URL pública. Reglas en `lib/data/almacen.ts`. La demo sigue con data URLs.

### Lo que sigue (en este orden)

1. **Terminar Supabase**: recarga mensual de créditos en la base, y el Resumen con consultas agregadas cuando el
   historial crezca (sus pruebas, `npm test`, son el contrato). El seed (~900 KB) sigue dentro del código de la
   app por la demo: se puede cargar bajo demanda. Borrar un producto entero (hoy no existe en la app) deberá
   borrar también sus fotos del bucket (`rutasParaBorrar` en `lib/data/almacen.ts`).
2. **Cuentas** (verificación de Instagram, zona de administración para crear tiendas y filas de `usuarios`,
   cobros manuales): `docs/07-fase-2-cuentas-y-cobros.md`. Hoy las filas de `usuarios` se crean a mano en Supabase.
3. **Retoque de fotos con IA de verdad** (hoy es un efecto de demostración) con su descuento de créditos en el servidor.
4. **Catálogo público integrado**: el HTML independiente pasa a leer la marca (`marca_*`, `url_catalogo`) y las
   promos de cada tienda; los enlaces de compartir promo dejan de depender del enlace que escribe el dueño.
5. **Notificaciones** de pedidos nuevos (hoy solo el contador) y **sincronización entre dispositivos**.
6. Pendientes del repaso: `docs/08-repaso-final.md` ("Pendiente").

### Interruptores de negocio (`lib/config.ts`)

- `RETOQUE_REAL` (hoy `false`): mientras sea `false`, el retoque de fotos se presenta como demostración (etiqueta "Demo").
  Al conectar el retoque de verdad, pasar a `true`.
- `MOSTRAR_MARCA_DESLIZAPP_EN_CUPON` (hoy `true`): el "Hecho con Deslizapp" al pie de la imagen del cupón; pensado
  para quitarse por plan.
- `STOCK_BAJO`, `CREDITOS_POR_RETOQUE`, límites y nombres de plan: ver el mismo archivo.

## Qué se espera de esta primera entrega

Construir las pantallas descritas en `docs/04-pantallas.md`, funcionando por
completo contra datos de prueba (ver `docs/05-arquitectura.md`), con
navegación real entre ellas, multi-tienda desde el modelo de datos (aunque el
selector de tienda pueda ser simple al inicio), y fiel a la identidad visual
de `docs/01-marca.md`. Al terminar, el dueño de una tienda debería poder abrir
la app, ver su catálogo, recibir y despachar un pedido, crear una promo y ver
su resumen semanal — todo con datos falsos pero con la sensación de producto
terminado.

El catálogo público integrado queda fuera de esta entrega (Supabase y el
acceso con Google llegaron en el paso 11) (están detallados como próximos pasos en
`docs/05-arquitectura.md` y `docs/06-orden-de-construccion.md`, para que quien
retome sepa exactamente qué sigue).


## Pedido despachado: estado y comprobante
En la hoja de un pedido despachado, «Despachado. Final feliz.» aparece al inicio como texto con check, sin fondo ni estilo de botón. Debajo de «Editar pedido» aparecen «Descargar factura» y «Compartir». Descargar abre una hoja para elegir PDF o imagen; el PNG y el PDF salen del recibo visual de `referencias/catalogo-esencias-michel.html` (ticket con logo, artículos, totales y pago). Compartir invoca la hoja nativa con el PNG y el texto: «¡Hola, {cliente}! Te comparto el comprobante de tu pedido #{número} de {tienda}. ¡Gracias por tu compra!». Si el navegador no admite compartir archivos, guarda el PNG y copia el texto. El comprobante no tiene valor fiscal; la app aún no guarda RNC ni NCF.

### Aplicación coordinada del inventario

No aplicar esta migración separada de una versión compatible de la app: restringe UPDATE directo de stock, y el editor publicado anteriormente lo incluía en su escritura. Una aplicación anticipada puede impedir guardar productos en esa versión. La PR sigue sin desplegar; la migración no está aplicada. En productos existentes, activar/desactivar el control de stock queda pendiente de una operación auditada específica; crear productos conserva esa elección inicial. El registro persiste sin añadir una pantalla de historial.

## Catálogo React (PR #44, abierto para revisión)

Rutas públicas `/tienda/{slug}` y `/pedido/{codigo}` fuera del dashboard, sin sesión del panel. Superficie propia en `components/tienda/` / `app/tienda/catalogo.css`, fiel al HTML; no aplica `components/ui` del panel. Usa las operaciones públicas de `FuenteDatos` mediante `lib/data/publica.ts`; `?demo` conserva la fuente demo, carrito y coach por tienda. El despacho y registro de pedidos no cambia: enviar crea una solicitud, no una venta.

Migración **aplicada** `20261004184134_catalogo_react.sql`: orden/opiniones, catálogo público ampliado y agregados desde/ventas. SQL de Michel generado y ejecutado, separado de migraciones; conserva sus mensajes, secciones, stock, precios, visibilidad y enlace anterior. No editar el HTML antiguo ni `url_catalogo` hasta autorizar el cambio. Informe, capturas, limitaciones de WebKit/iPhone y pruebas reales en `docs/validacion-catalogo-react.md`.

La excepción visual de la superficie pública está en `docs/08-movimiento.md`: portado del HTML (reels, aaah, coach, historias y hojas), reducido cuando se pide menos movimiento. Formularios públicos conservan altura, foco y teclado; nunca animar el campo enfocado. **Esta PR no se fusiona automáticamente: Lewis prueba el preview.**

### Admin parte 2 — Hoy, Tiendas, ficha y Ver como

Implementación en `feature/admin-tiendas`, PR #53 abierto y rama enlazada arriba. No incorpora #45, no fusionar ni desplegar producción. Lewis ya era admin y no se dio de alta otra vez. Hoy, Tiendas y ficha usan contratos y RPC reales; Trabajo, Cobros y Más continúan como placeholders. `/admin-demo` tiene fuente aislada y nunca conecta a Supabase. Ver como bloquea escrituras en la app incluso para un admin que también es dueño, sin afirmar que la base revoque los permisos del dueño. Detalles, capturas comparativas, validaciones y pasos manuales en `docs/handoffs/admin-tiendas-codex.md` y `docs/validacion-admin-tiendas.md`.

**Continuación de Codex tras Planning (`f0f9438`):** corregidos el contexto de Ver como, su inicio desde ficha y retirada inmediata al cerrar/perder autorización. 248 tests, build local, typecheck y replay desechable pasaron; 12 recorridos de proveedor/useData con transporte autenticado SIMULADO. Lint compara 27/27 con main, cero avisos añadidos y sin silenciar reglas. Hojas/teclado simulados pasaron sobre build local. Fallos/reintentos y resultados históricos conservados en la validación.

Planning aplicó `20261006111233_admin_ver_como_validar.sql`; Coding no la reaplicó ni editó. Historial actual 41/41, cero diferencias; snapshot de 42 funciones coincide con metadatos reales y ACL. No cambios Auth, altas admin ni escrituras reales. Google real/Safari físico siguen pendientes. Alias estable `/admin` y callback exacto, pasos y despliegue actual en handoff/PR. **Claude: leer handoff y fetch remoto antes de retomar; no empujar copia antigua encima de Codex.** PR #53 abierto, sin merge ni producción; #45 excluido.


## Pedido del catálogo en el panel — continuación de Coding

**Claude/Codex: antes de retomar, leer `docs/handoffs/pedido-catalogo-panel-continuacion.md`.** Conserva la implementación inicial de Claude y las correcciones en la rama separada `feature/pedido-catalogo-panel-continuacion`. No fusionar #44, #45 ni esta continuación sin Lewis. No tocar `/workspace/deslizapp-rendimiento` ni la solicitud real reservada `4DCQ2PZ28F`.

Estado/registro del comprador, respaldo en Nuevos y Avísame implementados, pendientes de revisión en preview. Registrar no descuenta stock; solo despacho. La hoja consume su historial antes de Ver pedido; selector interno conserva borradores y no deja portales ocultos activos. Ya llegó usa producto/variante releídos tras reponer y marca al volver del WhatsApp, sin afirmar envío. Resultado de escritura incierto obliga a comprobar primero.

`20261004223008` estaba aplicada; no se reaplicó/editó. Adicional `20261005013157_registrar_solicitud_disponibilidad.sql` aplicada después de replay completo y pruebas de RLS/concurrencia en base desechable: misma firma, stock validado y bloqueos compatibles, sin reservas ni modificaciones de existencias de producción. Solo producción accesible; otras bases locales siguen desconocidas. Historial: 32 versiones en repo y producción, cero diferencias; el nombre histórico de `20260930005714` difiere intencionalmente.

Las secciones de primera entrega y «Aplicación coordinada del inventario» son históricas: no describen el catálogo/stock actual. `supabase/migrations/` manda. No se ejecutó limpieza ni una operación de prueba sobre datos reales. Safari/iPhone físico, login Google real, Contact Picker, retorno físico de WhatsApp y rendimiento Vercel/4G requieren validación de Lewis. No asumir que una captura o respuesta HTTP verifica esos recorridos.


### Seguimiento PR #46: likes y validación reportada

Los likes del reel utilizan `.likes-count` (texto bajo el corazón), separados de `.cnt` de la bolsa; contador positivo incluido en el nombre accesible, cero oculto. No cambia cálculos, inventario ni aaah. Resultados y capturas en `docs/handoffs/pedido-catalogo-panel-continuacion.md`.

**Reporte de Lewis, no pruebas de Coding:** Google funcionó tras permitir el callback de la preview; solicitud visible en el panel, enlace con estados actualizados y producto agotado tras despachar. Coding no cambió ese callback ni repitió escrituras reales. Los pendientes de Safari físico/cobertura completa se conservan; distinguir este reporte del navegador automatizado.


### Seguimiento PR #46: likes, pendientes y Google al código

Likes positivos del reel: «1 lo quiere» / «N lo quieren» bajo el corazón; cero conserva «Lo quiero», agotado Avísame. Nombre accesible incluye acción y contador; `.cnt` de la bolsa intacta. `usePendientesPedidos` reúne pedidos y solicitudes, suma solo trabajo pendiente y conserva errores/carga; el mismo desglose alimenta Nuevos y el único contador inferior. Registrar mantiene el total; confirmar/descartar/vencer lo reduce, sin alterar ventas/deuda/stock.

Google conserva el código en `redirectTo` (parámetro local validado `volver`) además de `dz_volver`. Callback retorna al código con `registrar=1`; la vista privada comprueba sesión y pertenencia por RLS antes de abrir. Destinos externos/rebotes al panel no se usan para resolver solicitudes. Error/cancelación conserva el aviso y código; ya registrada ofrece su pedido existente. No cambia Site URL ni configuración Auth. Lista de callbacks permitidos no accesible en esta sesión: documentar dirección exacta de la nueva preview en el PR y completar OAuth real en Safari. Handoff ampliado en `docs/handoffs/pedido-catalogo-panel-continuacion.md`. No incorporar #45 ni fusionar/publicar.


## Seguimiento desde main publicado: visibilidad e imagen compuesta

Coding trabaja aislado en `feature/catalogo-visibilidad-og`, desde `be3f1fe` (incluye #44/#46, excluye #45). No fusionar ni publicar sin Lewis. Leer `docs/validacion-catalogo-visibilidad-og.md` para resultados y `docs/handoffs/catalogo-visibilidad-og.md` para entrega.

Vista previa guarda únicamente visibilidad con la operación existente, sin optimismo ni tocar borrador/historial de inventario; conserva aviso del plan. El editor refleja visibilidad externa cuando no la editó y omite ese campo al guardar otros datos. Panel: corazón de lectura y cifra debajo, Etiqueta de stock con variantes y texto separado «Oculto del catálogo». Feed: número y frase son bloques separados. No cambian likes, bolsa, filtros o stock del comprador.

Imagen pública de pedido en servidor: hasta cuatro líneas en orden, variante conservada y cantidad sin duplicar fotos. Fallback de marca, área central segura para recorte cuadrado, PNG 1200×630, URL absoluta del despliegue y caché de 5 minutos. Solo fotos públicas del bucket `productos` del proyecto configurado; sin URL arbitraria, redirecciones ni datos del comprador. Demo local no produce previews públicas; WhatsApp puede guardar la imagen anterior. No requiere SQL ni configura Supabase. El límite de productos visibles ya era una comprobación de interfaz: no se encontró su equivalente atómico en las migraciones; esta tarea conserva esa regla y documenta la limitación, sin darla como protección de servidor.
### Seguimiento de espera y likes dentro de foto — PR #47

Coding continúa en feature/catalogo-visibilidad-og sobre el head 4b6457b verificado abierto, conservando las mejoras de visibilidad/stock/feed/OG y sin #45. Se reutilizan avisos_llegada, avisosPendientes, Esperan y TarjetaYaLlego; no hay SQL ni cambios de producción.

Inicio y Catálogo comparten una lectura de espera; lib/avisos.ts cuenta personas normalizadas y productos distintos sin perder solicitudes por variante. «En espera» incluye ocultos/repuestos, combina búsqueda, conserva selección al resolver el último aviso y nunca da una lectura fallida por cero. Lista accesible desde tarjeta (acción independiente), vista previa (interna, conserva propuesta/scroll/foco) e Inicio (productos → lista). Stock confirmado y variante correcta antes de Avisar. Reposición no marca; volver de WhatsApp no prueba envío. Likes de lectura vuelven dentro de la foto abajo a la derecha, con cifra debajo, incluido cero y dígitos largos. No cambia feed ni bolsa.

Resultados, fixtures y límites se registran en docs/validacion-espera-catalogo.md y docs/handoffs/espera-catalogo.md. Safari/iPhone físico, WhatsApp nativo y escrituras de tienda real requieren validación de Lewis. No modificar avisos reales para probar ni fusionar/publicar sin autorización. Movimiento y teclado siguen sus reglas, sin transiciones nuevas.

### Pulido autorizado de la cifra de likes del panel

Parte de main `8dded0d` (#47 fusionado), sin #45. Solo la cifra pierde la pastilla: texto Papel con sombra Bosque, dentro de la foto bajo el círculo sin cambiar su geometría. Conserva cero, cifras largas y nombre accesible; no cambia contratos, datos, Supabase ni controles. Publicación squash autorizada por Lewis tras validar. Resultados y límites: `docs/handoffs/catalogo-likes-sin-pildora.md`.


### Selección de agotados, historial común y píldora de likes

Esta implementación parte del main `b46d5ecd` (#48 fusionado) en su propia rama; el checkout `feature/catalogo-react` con cambios pendientes quedó intacto. PR #45 sigue fuera. «Ocultarlos» abre selección interna; comienza vacía, búsqueda/select all se limita a resultados, y la elegibilidad se relee por producto y tienda antes de ocultar solo `activo`. Errores parciales dejan lista de pendientes para reintento individualizado. Se preservan inventario, historial y avisos. Historial manual ahora usa `ListaAgrupada` / `FilaLista`, motivo, cantidad, fecha y actor; la píldora del panel es una cápsula única corazón+cifra. Sin SQL. PR #49 abierto (HEAD inicial `3a0f58cb7f5352f28d433050b69cb80de9855666`); preview READY: `https://deslizapp-p0bl3h2dw-onedayone.vercel.app`, alias `https://deslizapp-app-git-fix-catalogo-agotados-visibles-onedayone.vercel.app`. Véase `docs/handoffs/catalogo-agotados-visibles.md` para pruebas, límites y entrega.

## Video apagado por ahora — Coding (Claude), 2026-10-07

Rama `fix/bloquear-video`. Decisión de Lewis: no se suben videos (almacenamiento y salida de datos del plan gratis). **Pantalla:** `VIDEO_PERMITIDO = false` en `lib/config.ts`; la ficha no ofrece video (el selector acepta solo `image/*`) y un video elegido se ignora. Los videos ya guardados se ven, se mueven y se quitan igual; el código del video sigue entero. **Base:** migración `20261007161952_bucket_productos_solo_imagenes` (bucket `productos` solo `image/jpeg`, `image/png`, `image/webp`; sin `drop`; no toca archivos ya subidos). **Para reabrirlo:** poner `VIDEO_PERMITIDO = true` y aplicar una migración nueva que restaure `['image/jpeg','image/png','image/webp','video/mp4','video/webm','video/quicktime']` en `allowed_mime_types` de `productos` (no editar la aplicada). Prueba: `tests/video-permitido.test.mjs`.

## Regla permanente: gestos de las hojas del catálogo del cliente
- Toda hoja del catálogo del comprador va dentro de `PanelCatalogo` (`components/tienda/dialogo.tsx`). El cuerpo se gestiona con **touch events no pasivos** y la lógica pura de `lib/gesto-hoja.ts`: a media altura, deslizar arriba **expande**; expandida, el contenido hace scroll; deslizar abajo con el cuerpo en `scrollTop = 0` arrastra (más de 90 px cierra, o reduce si estaba expandida); con el cuerpo scrolleado hace scroll. Los gestos más horizontales que verticales se ignoran (carruseles).
- El asa y la cabecera (`.grab`, `.shead`, `.wahead`, `.wagrab`) siguen con pointer events y `touch-action: none`; el resto de la hoja es `touch-action: pan-y`.
- El touchmove que decide "scroll" o "ignorar" **nunca se cancela** (`debeCancelar` en `lib/gesto-hoja.ts`): cancelarlo en iOS puede bloquear el scroll nativo de todo el gesto.
- Expandida, el contenido hace scroll **desde el mismo gesto que expandió** (el JS lo guía con el dedo en cuanto el cuerpo puede desplazarse) y el contenedor de scroll se busca al decidir el gesto, no solo al tocar. Si Safari no inicia el scroll nativo (el dedo se movió más de 24 px y `scrollTop` no cambió), el gesto lo guía el JS. El cuerpo de una hoja `.full` es `flex: 1 1 0; min-height: 0; overflow-y: auto`.
- Con un campo enfocado dentro de la hoja, el gesto del cuerpo no actúa (no se anima ni se pierde el teclado). Prueba: `npm run probar:hojas-gestos` (`scripts/probar-hojas-gestos.mjs`) y `tests/gesto-hoja.test.mjs`.
