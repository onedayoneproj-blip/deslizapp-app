# Equipo, niveles de permiso e invitaciones por enlace (rama `feat/equipo-e-invitaciones`)

> **Modelo:** en Claude Code, **Opus 5.5**; en Codex, el modelo top con razonamiento alto. Es seguridad y permisos en la base compartida, con dinero (créditos) de por medio. **No hagas merge:** deja el PR abierto con su preview y las pruebas; Planning mergea cuando Lewis lo diga. Una migración a la vez; antes de aplicar cualquiera, `list_migrations` (Lewis trabaja con una sola sesión a la vez; no hace falta preguntarle).

> **Orden:** va después de que Mi marca (PR #57) esté en `main`. **Comparte funciones y políticas con `docs/prompts/ver-como-bloqueo-en-la-base.md`**: no corran a la vez; Lewis decide cuál va primero. Si ese ya está en `main`, tus funciones nuevas llaman su `exigir_no_viendo(...)` y tu auditoría lo tiene en cuenta; si no, déjalo anotado en el PR para que esa sesión las cubra. `docs/prompts/suscripciones-y-varias-tiendas.md` va **después** de este: tú solo dejas el gancho del límite de colaboradores (§3.6).

## 0. Antes de empezar

Lee `docs/00-contexto-del-proyecto.md` (reglas de migraciones, «Dos Coding en paralelo», cierre de PR), `AGENTS.md`, `HANDOFF.md`, `docs/03-modelo-de-datos.md`, `docs/13-admin.md` (§1, §6 y las partes de invitaciones), `docs/14-precios-y-lanzamiento.md` (sección «Permisos de colaboradores»), `docs/09-sistema-de-diseno.md`, `docs/11-voz-y-frases.md` y `docs/08-movimiento.md`. Tu puesto es **Coding**. Parte de `main` actualizado.

Mira, en la base real y en `supabase/migrations/` (la última versión de cada una): `miembros`, `invitaciones`, `usuarios`, `mis_tiendas()`, `soy_dueno()`, `crear_tienda`, `invitar_a_tienda`, `quitar_de_tienda`, `transferir_tienda`, `aplicar_invitacion` (con la variante «solo Google verificado»), `pedir_retoque`, `gastar_creditos` y todas las RPC `security definer` que escriben datos de una tienda. En la app: `lib/data/sesion.ts` (estado `sin-tienda`), `components/panel/menu-tienda.tsx`, `lib/cuenta.ts`, `lib/data/provider`, `lib/data/supabase.ts` y su demo, `lib/data/admin/*` y `app/admin/mas`.

## 1. Qué decidió Lewis (7 oct 2026)

1. **Hoy no hay pantalla** para invitar colaboradores ni para crear una tienda; una cuenta de Google nueva ve la pantalla «sin tienda» y no puede hacer nada. Hay que construirlo.
2. **Tres niveles de permiso** para colaboradores, que **elige el dueño** al invitar y puede cambiar después (por defecto, el más bajo):
   - **Ayudante:** pedidos, clientes, abonos, solicitudes del catálogo y promos.
   - **Editor:** lo del Ayudante, más productos, inventario y catálogo.
   - **Administrador:** lo del Editor, más créditos y retoque, compras y Mi marca.
3. **Invitar por enlace**, y el enlace **sirve una sola vez** (Lewis lo decidió así). Además **el dueño tiene que aprobar** a cada persona que entre por un enlace.
4. **El enlace para crear una tienda nueva va en este mismo PR**: lo genera Lewis desde el admin (Más › Invitaciones, que hoy dice «Muy pronto»). Mientras sea beta, solo se abre tienda con un enlace de Lewis.
5. **El dueño es quien decide.** Quitar gente, cambiar niveles, aprobar y cancelar enlaces es solo del dueño.

## 2. Niveles de permiso, exigidos en la base

**Dueño (`miembros.rol = 'dueno'`):** todo, como hoy. **Colaborador (`rol = 'staff'`):** nueva columna `miembros.nivel` con `'ayudante' | 'editor' | 'administrador'`, por defecto `'ayudante'`. `nivel` solo lo puede cambiar el dueño, mediante una función; un miembro nunca se sube el nivel a sí mismo (sin permiso de columna para `authenticated`).

**Grupos de permiso** (punto de partida: audita y corrige la tabla con lo que encuentres en la base real):

| Grupo | Qué cubre | Ayudante | Editor | Administrador |
|---|---|---|---|---|
| `ventas` | pedidos, despacho, abonos, clientes, promos, solicitudes y avisos del catálogo | sí | sí | sí |
| `catalogo` | productos, variantes, medios, inventario y reposición, «Ya llegó», personalización y publicación del catálogo | no | sí | sí |
| `creditos` | `pedir_retoque`, devolver, `gastar_creditos`, todo lo que gasta o reserva créditos | no | no | sí |
| `marca` | Mi marca (`marca_tienda`, `marca_referencias`, bucket `marca-referencias`) | no | no | sí |
| `compras` | reservado para pagar plan o créditos desde la tienda (hoy no hay funciones: deja la clave lista) | no | no | sí |
| `equipo` | invitar, aprobar, cambiar nivel, quitar, cancelar enlaces | solo dueño | solo dueño | solo dueño |

Reglas de diseño:
1. **Una sola función de apoyo**, p. ej. `public.tengo_permiso(p_tienda_id uuid, p_grupo text) returns boolean` (`security definer`, `stable`, `set search_path = ''`, sin ejecución para `anon`), y una `public.exigir_permiso(p_tienda_id uuid, p_grupo text)` que lanza `sin_permiso` (errcode `42501`). El mapa nivel → grupos vive en **un solo lugar** (una tabla pequeña o una función `grupos_del_nivel`), no repartido en cada política. Usa `(select ...)` en las políticas para que Postgres no la repita por fila.
2. **Tablas:** a cada tabla de la tienda con escritura para miembros, suma una política **`as restrictive`** para `insert`, `update` y `delete` que exija `tengo_permiso(tienda_id, '<grupo>')`. Las políticas permisivas existentes no se tocan: las lecturas (`select`) siguen abiertas a todo miembro (un Ayudante necesita ver productos para armar un pedido).
3. **RPC `security definer`** (saltan RLS): audita **cada** función de `public` que escribe y puede llamar un miembro, y pon `perform public.exigir_permiso(<tienda>, '<grupo>')` al inicio de la que corresponda. Guarda la tabla en `docs/handoffs/permisos-auditoria.md` (función, qué escribe, grupo, cómo resuelve la tienda, cuál quedó cubierta y cuál no hace falta, con el porqué). Edita lo mínimo con `create or replace`, respetando firma, permisos y `search_path`. Cuidado con los caminos que mezclan grupos: `despachar_pedido` escribe stock pero es `ventas` (un Ayudante despacha); `guardar_producto_inventario` es `catalogo`; `pedir_retoque` y `gastar_creditos` son `creditos`; no frenes a un Ayudante por un efecto secundario legítimo.
4. **Storage:** las políticas de escritura de los buckets de la tienda (`productos` → `catalogo`; `marca-referencias` → `marca`; logo → `catalogo`) usan el mismo grupo. Un colaborador sin permiso no sube ni borra.
5. **Lo que existe hoy sigue igual para los dueños.** Esencias Michel y la Tienda de ensayo tienen solo dueños (Lewis y Michel Guerrero): comprueba en la base real, con una consulta de solo lectura, si hay algún `staff`. **Si lo hubiera**, su nivel inicial sería `'administrador'` (conserva lo que puede hoy) y se lo dices a Lewis. No cambies nada de las tiendas reales.
6. **Gancho del límite de colaboradores:** una función `public.puede_sumar_colaborador(p_tienda_id uuid) returns boolean` que hoy devuelve `true` y que **todo camino que sume un miembro** (aprobar, invitar por correo) llama. La siguiente parte (suscripciones) pone ahí la regla real.
7. **Quitar y salir:** reutiliza `quitar_de_tienda` (ya impide quitar a la última dueña) y añade lo que falte: un colaborador puede **salir** él mismo («Salir de esta tienda»); nadie puede quitar a un dueño que no sea él mismo salvo con `transferir_tienda`. Quitar a alguien le deja la cuenta sin esa tienda (su `usuarios.tienda_id` pasa a otra tienda suya o a null, como ya hace).

## 3. Invitaciones por enlace (una sola tabla de códigos)

Tabla nueva, p. ej. `enlaces_invitacion` (mira que no choque con `invitaciones`, que es por correo y se conserva; añade `nivel` a esa si hace falta):
- `id`, `tipo` (`'colaborador'` o `'tienda_nueva'`), `tienda_id` (null si `tienda_nueva`), `nivel` (solo `colaborador`), `nota` (etiqueta opcional del dueño, «Para Ana», máx. 40), `creado_por`, `creado_en`, `vence_en` (**7 días**), `codigo_hash` (**solo el hash** del código; el código en claro se muestra una vez al crearlo y nunca se guarda), `estado`, `reclamado_por`, `reclamado_en`, `correo_visto`, `decidido_por`, `decidido_en`.
- Estados: `activo` → `esperando` (alguien lo abrió) → `aprobado` | `rechazado`; o `cancelado` | `vencido`. **Un enlace se consume al abrirlo**: el segundo que lo intente ve «Este enlace ya no sirve».
- RLS: `anon` nada. Un dueño ve solo los de sus tiendas; los de `tienda_nueva` solo los ven los admins. Nada se escribe directo: todo por funciones.

### 3.1 Colaborador (lo crea el dueño)
1. **Dueño → «Invitar por enlace»:** elige el nivel (y la nota). `crear_enlace_colaborador(p_tienda_id, p_nivel, p_nota)` (exige `equipo` y `puede_sumar_colaborador`) devuelve el código **una sola vez**. La app arma `…/unirse/<código>` y lo comparte con `navigator.share` o lo copia, con un texto en la voz de la marca por WhatsApp.
2. **La persona abre el enlace** (`/unirse/[codigo]`, ruta pública, `Referrer-Policy: no-referrer`, `noindex`). Si no tiene sesión, entra con Google (reutiliza el mecanismo de retorno validado que ya usa `/pedido/{codigo}`; el código viaja en el retorno, no en nada que se registre) y vuelve.
3. **`reclamar_enlace(p_codigo)`** (solo `authenticated`, solo cuentas Google con correo verificado, como `aplicar_invitacion`): comprueba el hash, que esté `activo` y no vencido, que la persona no sea ya miembro y que no sea quien lo creó; lo pasa a `esperando` guardando `reclamado_por` y `correo_visto`. **No la hace miembro todavía.** Cualquier fallo devuelve el mismo error genérico `enlace_no_valido` (no reveles si venció, se usó o no existe). Tras reclamar, la app borra el código de la barra de direcciones (`history.replaceState`).
4. **La persona ve «Esperando que te aprueben»** (con el nombre de la tienda) y, cuando el dueño apruebe, entra sola al panel.
5. **El dueño recibe la solicitud** en «Tu equipo» (con una marca en la fila del menú): nombre y correo de Google de quien entró, el nivel con el que se le invitó (puede cambiarlo antes de aprobar), «Aprobar» o «Rechazar». `aprobar_miembro(p_enlace_id, p_nivel)` exige `equipo` y `puede_sumar_colaborador`, crea el `miembros` (`rol 'staff'` + `nivel`) y la fila de `usuarios` si no tiene (`on conflict do update … coalesce` como `invitar_a_tienda`). Una solicitud sin decidir vence a los 7 días.
6. **El dueño puede cancelar** un enlace `activo` y **quitar** a cualquiera después.

### 3.2 Tienda nueva (lo crea Lewis, admin)
1. En Más › Invitaciones del admin: «Crear enlace de tienda» (nota opcional, p. ej. el nombre de la persona). `admin_crear_enlace_tienda_nueva(p_nota)` solo `soy_admin()`, registra en `registro_admin` (sin el código) y devuelve el código una vez. Lista de enlaces con estado, quién lo abrió y «Cancelar».
2. La persona abre `/unirse/<código>`, entra con Google y `reclamar_enlace` lo pasa a `esperando` **y, por ser de Lewis, no necesita aprobación del dueño de nadie**: queda `aprobado` y se le muestra «Crea tu tienda» (nombre y rubro, los mismos campos de `crear_tienda`).
3. `crear_mi_tienda(p_codigo, p_nombre, p_rubro)` comprueba que el enlace es suyo, de tipo `tienda_nueva`, aprobado y sin tienda creada, y crea la tienda reutilizando la lógica de `crear_tienda` (mismo slug, estado `en_prueba`, `miembros` dueño y `usuarios`). El enlace queda `usado`. Después entra al panel (el onboarding de historias llega aparte).
4. **Decisión de Planning:** quita el permiso de ejecución de `crear_tienda` a `authenticated` (hoy cualquier cuenta de Google podría llamarla por la API aunque la app no lo use); la lógica interna se sigue usando desde `crear_mi_tienda` y desde las funciones del admin. Si Lewis quiere abrirla a todos más adelante, se reabre. Dilo en el PR.

## 4. Pantallas (todo con `components/ui/` y los tokens; textos en la voz de `docs/11`)

1. **Menú de la tienda › «Tu equipo»** (solo dueño; los colaboradores no ven la fila, o la ven apagada con «Esto lo ve quien administra la tienda»). Una **hoja** (`Hoja`, `"grande"` si tiene campos de texto) con: miembros (nombre, correo, nivel con `GrupoOpciones`, «Quitar» con confirmación), **«Esperan tu visto bueno»** (arriba, si hay), enlaces activos con «Copiar», «Compartir» y «Cancelar», y dos botones: **«Invitar por enlace»** y **«Invitar por correo»** (usa `invitar_a_tienda`, ahora con `nivel`; invitar por correo **no pide aprobación**: el dueño ya escribió quién). Un colaborador ve «Salir de esta tienda».
2. **`/unirse/[codigo]`:** estados claros: sin sesión (botón «Entrar con Google»), reclamando, «Esperando que te aprueben», «Ya eres parte de {tienda}», «Este enlace ya no sirve. Pídele uno nuevo a quien te invitó.», «Crea tu tienda» y error de conexión con «Reintentar». Sin animar nada de lo que tenga un campo enfocado (reglas de teclado de `HANDOFF.md`).
3. **Pantalla `sin-tienda`** (estado de `lib/data/sesion.ts`): hoy es un callejón sin salida. Debe decir que Deslizapp es por invitación, explicar «si ya tienes un enlace, ábrelo», mostrar si hay una solicitud esperando aprobación, y ofrecer «Escríbenos» a `INSTAGRAM_DESLIZAPP` de `lib/config.ts` (`WHATSAPP_DESLIZAPP` está vacío).
4. **Lo que un colaborador no puede hacer se ve:** el interruptor y el botón «Retocar» (créditos), editar Mi marca, editar y crear productos (Ayudante) aparecen **deshabilitados con un porqué corto** («Esto lo hace quien administra la tienda»). La interfaz solo explica; **la base manda**: si falla `sin_permiso`, la app lo muestra con el mismo texto sin romper la pantalla. Un solo lugar (`usePermisos()` o similar) lee el nivel de la sesión.
5. **Admin › Más › Invitaciones:** reemplaza «Muy pronto» con la lista y «Crear enlace de tienda». Sin tocar el resto del admin.
6. **Demo y `/admin-demo`:** misma interfaz con datos de la demo (sin Supabase, sin enlaces reales); un par de colaboradores de ejemplo con distinto nivel. La demo no necesita `/unirse`.

## 5. Reglas de seguridad

- Códigos aleatorios de al menos 128 bits, `base64url`, generados en la base (`gen_random_bytes`), guardados **solo como hash** (SHA-256). Nunca en logs, nunca en `registro_admin`, nunca en una URL que no sea `/unirse/…`.
- `/unirse` usa `Referrer-Policy: no-referrer` y no carga recursos de terceros; no pongas el código en analíticas ni en mensajes de error.
- Todas las funciones nuevas: `security definer`, `set search_path = ''`, `revoke … from public, anon`, `grant … to authenticated` (las de admin con `soy_admin()` adentro). Mismo error genérico para no filtrar si un enlace existe.
- Aprobar, cambiar nivel, quitar y cancelar: solo dueño (`soy_dueno`), nunca un colaborador, ni siquiera Administrador.
- Ver como: toda función que escribe llama `exigir_no_viendo` si ya existe (ver arriba); y un admin que mira una tienda no aprueba ni invita.
- Un colaborador no puede leer los códigos ni los hashes de los enlaces; el dueño tampoco los vuelve a ver (solo estado).

## 6. Migraciones y datos

- Migraciones nuevas, pequeñas y una a la vez (nunca edites una aplicada); ensayo en `BEGIN; … ROLLBACK;` con `execute_sql` sobre la base real, luego replay (`probar:admin-db`), luego `apply_migration`; el archivo lleva la versión que asigne Supabase. `npm run revisar:migraciones` en cero, `get_advisors` sin nada nuevo.
- Antes de aplicar cada una: `list_migrations` (Lewis trabaja con una sola sesión a la vez; no hace falta preguntarle). Después de aplicar, comprueba que el panel y el catálogo de Esencias Michel siguen normales (solo lecturas).
- **Ningún dato real va en migraciones.** No crees invitaciones ni miembros reales para probar.

## 7. Pruebas

- **Replay y scripts de la base**, con usuarios de prueba (no cuentas reales): dueño, Ayudante, Editor, Administrador y un extraño.
  - Cada nivel puede y no puede lo que dice la tabla de §2, **por tabla, por RPC y por archivos**; el extraño no ve ni escribe nada.
  - Un colaborador no puede cambiarse el `nivel`, ni invitar, ni aprobar, ni leer enlaces.
  - Enlace: se consume al abrirlo; el segundo intento falla con `enlace_no_valido`; vence a los 7 días (reloj simulado); cancelado no sirve; un abridor sin aprobar **no** es miembro y no lee nada de la tienda; aprobado sí, con el nivel elegido; rechazado no.
  - Dos personas abriendo el mismo enlace a la vez: solo una lo reclama (prueba de concurrencia con dos conexiones, como la de Mi marca).
  - Tienda nueva: el enlace lleva a `crear_mi_tienda`; sin enlace, `crear_tienda` ya no es ejecutable por `authenticated`; el tope de 3 tiendas en prueba se mantiene.
  - `puede_sumar_colaborador` se llama en aprobar e invitar por correo.
  - Dos retoques simultáneos de un Administrador no gastan más créditos de los que hay (ya existía; que siga pasando) y un Editor no puede pedirlos.
  - Planes de consulta de las políticas restrictivas en `pedidos` y `productos`: sin costo visible para un miembro común.
- **Script de navegador `scripts/probar-equipo.mjs`** (demo): la hoja «Tu equipo», invitar por enlace, cambiar nivel, quitar, cancelar, y que cada nivel ve deshabilitado lo que no puede, con el texto correcto; teclado de iPhone en el campo de la nota y del correo (`npm run probar:teclado` con el campo nuevo).
- `tsc`, `npm test`, `npm run lint` (sin advertencias nuevas), `npm run build` y los `scripts/probar-*` que toquen lo cambiado (menú, hojas, producto, retoque, Mi marca, admin).
- Lo que no puedas probar (Google real con una segunda cuenta, Safari del iPhone, `/unirse` con una sesión real) **dilo claro en el PR** y deja los pasos para Lewis.

## 8. Cierre

- **PR abierto con su preview, sin merge.** En el PR: la tabla de la auditoría resumida, el mapa nivel → grupo, qué se probó y qué no, y qué debe probar Lewis: crear un enlace desde su tienda de ensayo, abrirlo con una **segunda cuenta de Google**, aprobar, ver que cada nivel hace y no hace lo que toca, y crear un enlace de tienda nueva desde el admin.
- Actualiza `docs/13` (Invitaciones), `docs/03` (modelo: `miembros.nivel`, `enlaces_invitacion`), `docs/04` (menú y pantallas), `docs/14` (sección «Permisos de colaboradores»: ya construido), «Dónde va el trabajo» en `docs/00`, `HANDOFF.md` y una novedad en `lib/novedades.ts` (número siguiente al de `main` al momento del merge).
- Deja escrita en `HANDOFF.md` la **regla permanente:** toda función o política nueva que escriba datos de una tienda declara su grupo de permiso y llama a `exigir_permiso`.
- Resume en español, corto: qué cambió, qué debe probar Lewis y cualquier decisión que tomaste que no estaba aquí.
