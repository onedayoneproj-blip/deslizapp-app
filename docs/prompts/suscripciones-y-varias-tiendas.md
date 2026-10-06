# Suscripciones del titular y varias tiendas (rama `feat/suscripciones`)

> **Modelo:** en Claude Code, **Opus 5.5**; en Codex, el modelo top con razonamiento alto. Toca la base de datos, el dinero (cobros, créditos) y datos de tiendas reales; es un cambio de seguridad y de integridad, no un ajuste de pantalla. **Deja el PR abierto con la preview** (caso de precaución de `docs/00`: dinero y datos reales) y espera a que Lewis pruebe; no hagas merge.

> **Orden:** va **después** de `docs/prompts/admin-4-cobros.md` y de `docs/prompts/selector-de-tiendas.md`. Si no están en `main`, no empieces. `docs/prompts/suscripcion-tienda.md` (avisos de pago de la tienda) **no se ha construido**: Planning lo adaptará a suscripciones cuando este PR esté fusionado; no lo tomes.

## 0. Antes de empezar

Lee `docs/00-contexto-del-proyecto.md` (reglas de migraciones, «Dos Coding en paralelo», cierre de PR), `AGENTS.md`, `HANDOFF.md`, `docs/03-modelo-de-datos.md`, `docs/13-admin.md`, `docs/14-precios-y-lanzamiento.md` y `docs/05-arquitectura.md`. Tu puesto es **Coding**. Lee la última versión de **todas** las migraciones y funciones que tocan el plan, los límites, los créditos y el estado de cobro de una tienda. No adivines nombres: míralos en la base (`list_tables`, `pg_proc`, `pg_policies`).

## 1. Qué decidió Lewis (6 oct 2026)

1. **La suscripción es de una persona, el titular**, no de una tienda. Una persona puede tener **más de una suscripción** (por ejemplo, una por tienda que paga por separado).
2. Las **tiendas cuelgan de una suscripción**. Crear otra tienda no se cobra aparte: va incluida, siempre que el plan lo permita.
3. Una suscripción tiene **tres límites que se personalizan**: tiendas, colaboradores y productos. Todos son un número editable **por plan** (en Más › Planes) y **por suscripción** si es «a medida». **«Sin límite» se guarda como vacío (null), no como un número grande.** Hoy `limite_productos` null significa «plan a medida, hace falta número»: hay que separar los dos significados (por ejemplo, una columna `a_medida` en el plan) sin romper nada. Esta migración reemplaza el 100,000 que se puso a mano (ver §7) por «sin límite».
4. **Productos, colaboradores y créditos de retoque se comparten** entre todas las tiendas de una misma suscripción: un solo balance. (Los créditos compartidos son una propuesta de Planning que Lewis no ha desmentido; si dudas, dilo en el PR.)
5. El **estado de cobro, la prueba, el «pagada hasta» y la pausa** son de la suscripción; todas sus tiendas los heredan. Si no paga, se pausan todas.
6. **Colaboradores** = personas distintas del titular con acceso a alguna tienda de la suscripción. Propón la regla exacta (por ejemplo, contar `miembros` distintos excluyendo al titular) y déjala en una sola función. Hoy no existe ningún límite de colaboradores.

## 2. Diseño de datos

- **Tabla `suscripciones`:** `id`, `titular_id` (→ `auth.users`, no se borra mientras tenga suscripciones), `plan` (→ `planes`), `estado` (`en_prueba`, `activa`, `pausada`), `prueba_hasta`, los tres límites con su valor propio cuando es a medida, `creditos_retoque`, `creditos_retoque_mensuales`, y lo demás que hoy vive en `tiendas` por razones de cobro. **Primero haz una auditoría** (§3) y decide con ella qué sube y qué se queda.
- **`tiendas.suscripcion_id`** (not null después del relleno). La tienda conserva lo suyo: nombre, slug, publicada, `eliminada`, etc. Una tienda eliminada sigue siendo eliminada aunque su suscripción esté activa; una suscripción pausada pausa sus tiendas sin tocar cada fila (estado efectivo en una sola función, no copiado).
- **`pagos`:** agrega `suscripcion_id` (relleno con la de su tienda). Los pagos son inmutables y la historia no se reescribe; `tienda_id` queda para saber de dónde vino. El libro de créditos (movimientos) lleva `suscripcion_id` y conserva la tienda que lo usó.
- **Relleno 1 a 1:** cada tienda existente recibe **su propia suscripción** con **exactamente** sus valores de hoy (plan, límites, créditos, estado, prueba, pagos). El titular de cada una es el `dueno` de esa tienda; si hay varios, el que se unió primero. **Después de la migración**, Lewis (o tú con su permiso, por SQL de datos, **no** en la migración) ajusta los titulares reales (§7).
- **Políticas (RLS):** el titular lee y, si es lo que ya hacen hoy los dueños, actualiza lo suyo; **un colaborador ve el plan y los límites de la suscripción de su tienda, pero no los pagos, ni el correo de pago, ni nada de cobro** (si hace falta, por una función `security definer` que devuelva solo lo permitido). Los admins (`soy_admin()`) leen y escriben por las funciones `admin_*`, que registran en `registro_admin`. Ver como (`admin_viendo`): solo lectura de lo que ya se lee. Anon: nada. Ninguna función de cobro queda abierta a un usuario normal.
- **Funciones:**
  - `crear_tienda(p_nombre, p_rubro, p_suscripcion_id default null)` para el titular: comprueba **en la base** el límite de tiendas (con una suscripción llena, error claro), crea la tienda (slug único), agrega al titular como `dueno`, y devuelve su `id`. Sin suscripción dada, usa la que tenga espacio; si el titular tiene varias y hay duda, error que pida elegir.
  - `admin_crear_suscripcion(titular, plan, …)`, `admin_mover_tienda(p_tienda, p_suscripcion)` (con comprobación de límites antes) y el resto de `admin_*` de cobro actuales, adaptados: `admin_registrar_pago`, `admin_anular_pago`, `admin_cambiar_plan`, `admin_ajustar_creditos`, `admin_recarga_mensual`, `admin_hoy` y lo que audites. Cada una opera sobre la suscripción de la tienda dada, con las mismas reglas de hoy.
  - Las reglas de **límite de productos** y **créditos de retoque** (`pedir_retoque`, entregar, devolver, y cualquier trigger) pasan a mirar la suscripción: productos activos de todas sus tiendas; saldo único. **Idempotentes y sin carreras** (dos retoques a la vez no pueden gastar el mismo crédito: bloquea la fila de la suscripción).

## 3. Auditoría (primer entregable, antes de escribir SQL de cambio)

Haz una **tabla** en `docs/handoffs/suscripciones-auditoria.md` con cada columna, función, trigger, política, vista y script que lea o escriba `plan`, `limite_productos`, `creditos_retoque*`, `estado`, `prueba_hasta` y el estado de cobro de una tienda (incluidas `catalogo_publico`, `tienda_publica`, `pedir_retoque` y sus pares, los triggers de saldo, `estado_cobro`, todo `admin_*`, `lib/data/*`, `lib/admin/*`, `components/*`), con qué hace cada una y qué hay que cambiar. Decide el diseño con esa tabla. Si el cambio es mayor de lo que este prompt supone (por ejemplo, un cambio de contrato público), **para y dilo a Lewis antes de seguir.**

## 4. Migraciones

Reglas de `docs/00`: `list_migrations` antes; **pregunta a Lewis antes de aplicar** en la base compartida; ensaya cada una con `BEGIN; … ROLLBACK;` en la base real; archivo con la versión que Supabase le puso; `npm run revisar:migraciones` en cero; **una migración a la vez**, con Michel y su catálogo comprobados entre una y otra. Mejor en dos: (1) **aditiva** (tablas, columnas, relleno, funciones nuevas, sin romper lo viejo) y (2) **el cambio** (funciones y políticas que pasan a leer la suscripción). Si algo sale mal entre las dos, la tienda real sigue funcionando. Corre `get_advisors` (seguridad y rendimiento) después de cada una y arregla lo que salga de tus objetos. **Ningún dato real de tiendas ni de personas va en una migración.**

## 5. La app

- **Menú de tiendas** (`referencias/selector-tiendas/`, el PR del selector ya lo dejó listo): añade la fila **«Crear otra tienda»** debajo de las tiendas. Con espacio en la suscripción: activa, con «Incluida en tu plan». Sin espacio: con candado, «Varias tiendas es del plan [Pro]» (usa el texto que corresponda según el motivo: límite de tiendas) y «Ver planes». La hoja de crear es `CrearTienda` (nombre y «¿Qué vendes?»; los rubros son los de `tiendas.rubro`). Al crearla, la persona queda en ella.
- **Tu plan** (`hoja-plan`) y los avisos de límite (catálogo lleno, créditos, colaboradores) muestran **lo del grupo**: «27 de 50 entre tus 3 tiendas», no solo lo de una. El encabezado y los créditos del panel muestran el balance de la suscripción.
- Si el titular tiene **varias suscripciones**, cada tienda dice cuál es la suya solo donde haga falta (Tu plan).
- **Colaboradores:** hoy no hay pantalla de invitaciones (parte 5 del admin). Deja el límite y la función de conteo listos y comprobados; no construyas invitaciones.
- **Demo:** datos locales con una o dos suscripciones; sin Supabase.

## 6. Admin

- **Cobros** muestra **suscripciones**: cada una con su titular, su plan, su estado de cobro y **sus tiendas debajo**. Registrar pago, anular, cambiar plan, ajustar créditos y recarga mensual operan sobre la suscripción. La ficha de una tienda enlaza a su suscripción y dice qué otras tiendas tiene.
- **Planes** (Más › Planes): además del precio, productos y créditos, **«Tiendas» y «Colaboradores»** (vacío = sin límite, que se muestra «Sin límite»). La ficha de una suscripción «a medida» permite poner los tres límites propios.
- **Crear suscripción** (para el caso de la tienda de ensayo, o un cliente con dos negocios): elegir titular (buscar por correo entre `usuarios`), plan y, si aplica, límites a medida.
- **Mover una tienda** de una suscripción a otra, con comprobación previa de límites y de que el titular de destino sea de la tienda o se agregue como dueño (decide y documenta qué haces con los dueños).
- Lo del admin de las partes 1 a 4 (Hoy, Tiendas, Trabajo, el cálculo del estado de cobro) sigue dando los mismos resultados para las tiendas que ya existen. Ver como sigue en solo mirar.

## 7. Datos reales (no van en migraciones; los hace Lewis con tu ayuda, después de verificar)

Hoy hay dos tiendas reales: Esencias Michel (dueños: Lewis Bautista y Michel Guerrero) y la Tienda de ensayo (dueño: Lewis). Su plan quedó en «Plan a medida» con límite de productos 100,000 (puesto a mano el 6 oct; reemplázalo por «sin límite»). La decisión de Lewis:

- **Esencias Michel:** suscripción **sin límite** (tiendas, colaboradores y productos) con **Michel Guerrero como titular** (quien paga). Lewis sigue siendo dueño de la tienda, pero no el titular. Así, si Michel abre otra tienda, no tiene tope.
- **Tienda de ensayo:** suscripción propia, **sin límite**, con **Lewis como titular**, para que no gaste los créditos de Michel ni cuente en su límite. Sus 20 créditos de prueba los pone Lewis con el ajuste del admin.
- Los créditos de Esencias Michel (95) y su historial **no se pierden ni se duplican**. Compruébalo con una consulta antes y después.

## 8. Pruebas y cierre

- **Pruebas de la base**, con dos usuarios de prueba (no con cuentas reales): el titular ve lo suyo; un colaborador ve plan y límites pero no pagos; alguien de otra tienda no ve nada; `crear_tienda` respeta el límite (con n, n+1 y sin límite); mover una tienda con límites; dos retoques simultáneos no gastan más créditos de los que hay; productos y colaboradores se cuentan por suscripción; una suscripción pausada pausa todas sus tiendas; una tienda eliminada sigue eliminada.
- **Equivalencia**: para las tiendas ya existentes, plan, límites, créditos, estado de cobro y catálogo público dan **los mismos resultados** antes y después (compara con una consulta, no a ojo). Los scripts del admin (`probar-admin-*`), del catálogo y del panel pasan.
- `tsc`, tests, lint y build sin errores nuevos; `npm run revisar:migraciones` en cero; el replay de la base de datos del repo.
- Actualiza `docs/03-modelo-de-datos.md`, `docs/13-admin.md` y `docs/14-precios-y-lanzamiento.md` con el modelo de suscripciones (Planning ya anotó la decisión en docs/14 §2; ajusta lo que difiera) y la novedad del panel con el siguiente número.
- **Deja el PR abierto con la preview.** Resumen en español, corto: qué cambió, la tabla de la auditoría, qué se probó, qué debe probar Lewis (crear una tienda con Pro/sin límite; ver los límites; Ver como), y los pasos de §7 que quedan para hacer con él.
