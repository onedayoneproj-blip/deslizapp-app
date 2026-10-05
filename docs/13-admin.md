# 13 · Admin de Deslizapp

El panel desde el que Lewis (y quien él diga) administra todas las tiendas: lo que pide atención hoy, cada tienda, el trabajo que el equipo hace a mano, los cobros y los planes. Diseño aprobado para implementar el 5 oct 2026: `referencias/admin/` (léelo primero). Reemplaza la parte de «Zona /admin» de `docs/07-fase-2-cuentas-y-cobros.md`; lo demás de docs/07 (cobros manuales, créditos por movimientos) se mantiene y se concreta aquí.

## 0. Decisiones de Lewis (5 oct 2026)

- **Teléfono primero.** Mismo estilo y componentes que la app de las tiendas. En computadora son las mismas pantallas, más anchas.
- **Las tiendas entran solo por link de Deslizapp.** No hay registro abierto. Las invitaciones viven en el admin, pero se construyen con el onboarding (parte 5), que todavía está en diseño.
- **Planes sin decidir:** se crean y editan desde el admin; ningún precio ni límite queda fijo en el código.
- **El retoque de fotos y el armado de catálogos los hace el equipo a mano**, por ahora. El admin es su cola de trabajo.
- **«Ver como la tienda»: solo mirar**, y cada vez queda anotado.
- **Eficiente e inteligente:** el admin le dice a Lewis qué hacer (pestaña Hoy), en vez de obligarlo a revisar tienda por tienda.

## 1. Dónde vive y quién entra

- Ruta **`/admin`** en la misma app y el mismo proyecto de Supabase. Layout propio (`app/admin/layout.tsx`), fuera de `(dashboard)`. La app de las tiendas **nunca** enlaza al admin.
- Entra solo quien está en la tabla **`admins`**. Se comprueba en el servidor (layout y cada acción) **y** en la base (cada función `admin_*` verifica `soy_admin()`). Un no-admin que abre `/admin` ve un 404, no un «no tienes permiso».
- El primer admin (Lewis) se carga a mano con un SQL que corre una sola vez, no en una migración (AGENTS.md: los datos reales no van en migraciones). Lewis da el correo.
- Sesión: la misma de Google. Un admin puede ser también dueño de una tienda; son dos sombreros distintos y no se mezclan los permisos.

## 2. Navegación

Barra inferior de 5 pestañas, igual a la de la app (cápsula, selector rosa):

| Pestaña | Qué tiene |
|---|---|
| **Hoy** | Lista de asuntos priorizados (§4). Arriba, 4 números del mes. |
| **Tiendas** | Lista con búsqueda y filtros → ficha de cada tienda → «Ver como». |
| **Trabajo** | Segmento Catálogos · Fotos. Desde un catálogo: Personalizar. |
| **Cobros** | Lo cobrado y lo pendiente → Registrar pago. |
| **Más** | Invitaciones (parte 5), Planes, Funciones nuevas, Novedades, Salud, Registro, Quién entra al admin. |

## 3. Pantallas

Los textos y la jerarquía son los de los tableros. Lo que sigue es lo que los tableros no dicen.

### 3.1 Hoy (`referencias/admin/Hoy`)
- Saludo con la hora de Santo Domingo y una línea: «N cosas te esperan. M son de plata.» Sin pendientes: estado vacío con la voz de la marca («Todo al día. Disfruta el silencio. Dura poco.»).
- 4 números: tiendas activas, en prueba, cobrado en el mes, por cobrar (con cuántas tiendas). El de por cobrar va en el tono de atención cuando es mayor que cero.
- «Lo que pide tu mano»: tarjetas de §4, ordenadas por prioridad y luego por antigüedad. Cada una: ícono por categoría, título con el nombre de la tienda, motivo con el dato, **una** acción principal y una secundaria («Mañana» la esconde 24 h; en pagos la secundaria es «Ya pagó», que abre Registrar pago).
- Tocar la tarjeta (fuera de los botones) abre la ficha de esa tienda.
- Se vuelve a leer al volver a la pestaña y al recuperar el foco; no hay tiempo real.

### 3.2 Tiendas y ficha (`Tiendas`, `Tienda`)
- Búsqueda por nombre de la tienda, WhatsApp o correo de cualquier miembro.
- Filtros: Todas, Activas, En prueba, Atrasadas, Pausadas (con conteo; un filtro en 0 no se muestra).
- Orden por defecto: primero las que tienen algo en Hoy, luego por salud (§4.3), luego por nombre.
- Cada fila: avatar o logo, nombre, etiqueta de estado, punto de salud y una línea con el motivo más importante.
- Ficha:
  - Cabecera (logo, nombre, rubro y vendedora, fecha de alta, estado y plan).
  - 3 accesos rápidos: Ver como, Escribirle (WhatsApp de la tienda), Su catálogo.
  - Tarjetas: Cuenta (precio, plan, vencimiento, último pago, historial de pagos al tocar), Cómo le va (30 días: productos visibles/límite, aaahs, pedidos, solicitudes sin registrar, créditos, MB en almacenamiento), Catálogo (estado y accesos), Equipo (miembros con su última entrada), Lo último (eventos de la tienda).
  - Al final, en una lista aparte: Ajustar créditos, Pasar la tienda a otro dueño, Pausar o Reactivar. Todas piden confirmación y quedan en el registro.

### 3.3 Ver como (`VerComo`)
Ver §6.

### 3.4 Trabajo: catálogos (`Trabajo`)
Agrupa por `catalogo_estado`:
- **Por empezar:** `solicitado`. Botón «Empezar», que pasa a `generando` en el paso 1.
- **Armando:** `generando`, con los 3 pasos (Fotos, Portada, Detalles) igual que los ve la tienda. Botón «Pasar a {siguiente}». En el paso 3 dice «Mandar a revisar» y pasa a `revisar`.
- **Pidió cambios:** `cambios`, con la nota de la tienda (`catalogo_notas_cambios`). Botones «Personalizar» y «Mandar a revisar».
- **Esperando su sí:** `revisar`, con cuántos días lleva. Botón «Recordarle» (WhatsApp).
- **Publicar** lo sigue haciendo la tienda (`publicar_catalogo`, que ya existe). El admin no publica.

Cada paso queda en el registro, y la tienda lo ve en su app como hoy (ya se refresca cada minuto en esos estados).

### 3.5 Trabajo: fotos (`Fotos`)
Ver §7.

### 3.6 Personalizar el catálogo de una tienda (`Personalizar`)
Lo que hoy se hace con SQL, en pantallas:
- **Marca:** `personalizacion.tema` (colores, letra de títulos, cabecera).
- **Frases:** `personalizacion.mensajes` (botón de comprar, saludo y cierre de WhatsApp, frases al agregar, frase del sello de agotado, texto del chat).
- **Secciones:** `personalizacion.secciones`, con interruptores, y «Pronto» para opiniones.
- **Productos:** orden (`productos.orden`, arrastrando) y opiniones de internet (`productos.opiniones`).

Arriba, una vista previa de la cabecera. «Ver como lo verá un cliente» abre `/tienda/{slug}`.

Se guarda con una función que valida igual que la base: `opiniones_validas` y las reglas del tema de `docs/prompts/catalogo-react.md` §5. Es un merge: no borra claves que el admin no tocó.

### 3.7 Cobros y Registrar pago (`Cobros`, `RegistrarPago`)
Ver §8.

### 3.8 Planes (`Planes`)
Ver §9.

### 3.9 Más, Salud y Registro (`Mas`, `Salud`, `Registro`)
- **Funciones nuevas:** encender una función que está en preparación (hoy solo `proximaJugada`) para tiendas elegidas, antes de soltarla para todas.
- **Novedades:** la versión publicada (`lib/novedades.ts`). Quién la vio queda para después (§11).
- **Salud:**
  - Tamaño de fotos y videos (`storage.objects`) y de la base (`pg_database_size`), contra los límites del plan gratis, con su barra.
  - Lo que más pesa, por tienda y el archivo más grande.
  - Actividad del día: aaahs, solicitudes y pedidos registrados.
  - «Datos servidos» no se puede leer desde la base: se muestra el enlace al uso del proyecto en Supabase, sin inventar el número.
- **Registro:** filas de `registro_admin` y de los eventos de tienda relevantes, con filtros (Todo, Plata, Ver como, Planes, Catálogos). Nada se borra.
- **Quién entra al admin:** la lista de `admins`. Agregar a alguien es por correo de Google y queda en el registro.

## 4. «Hoy»: las reglas

Una función `admin_hoy()` calcula los asuntos en la base (una sola consulta para la pantalla) y devuelve: `clave` (estable, para posponer), `categoria`, `prioridad`, `tienda_id`, `titulo`, `motivo`, `accion` (tipo + datos) y `desde` (para ordenar). Los textos se arman en el cliente con la voz de la marca (docs/11), no en SQL.

### 4.1 Asuntos (umbrales iniciales, constantes en un solo archivo)

| Prioridad | Categoría | Condición | Acción principal |
|---|---|---|---|
| 1 | Plata | Pago vencido, dentro o fuera de los días de gracia | Escribirle · «Ya pagó» |
| 1 | Plata | Prueba que termina en ≤ 3 días sin plan elegido | Escribirle |
| 2 | Plata | Vence en ≤ 3 días | Recordarle |
| 3 | Clientes | Solicitudes del catálogo sin registrar con más de 24 h | Avisarle |
| 3 | Clientes | Catálogo `solicitado` hace más de 2 días, o `cambios` hace más de 1 día | Empezar · Ver cambios |
| 4 | Se enfría | En prueba, ≥ 3 días y 0 productos | Darle un empujón |
| 4 | Se enfría | Activa sin entrar en 7 días | Escribirle |
| 4 | Se enfría | Catálogo publicado y 0 pedidos en 14 días | Escribirle |
| 5 | Trabajo | Fotos por retocar (un asunto con el total y la más vieja) | Retocar |
| 5 | Trabajo | Catálogo en `generando` sin avanzar en 2 días | Seguir |
| 6 | Plataforma | Almacenamiento o base por encima del 70 % | Ver salud |

### 4.2 Posponer y resolver
- «Mañana» guarda `(admin_id, clave, hasta = ahora + 24 h)` en `admin_pospuestos`. La clave combina regla, tienda y la fecha o el dato que la disparó, así un problema nuevo de la misma tienda vuelve a salir.
- Un asunto desaparece solo cuando su condición deja de cumplirse. No hay «Hecho» manual que oculte un problema que sigue vivo.

### 4.3 Salud de una tienda (el punto de color)
- **Te necesita:** tiene un asunto de prioridad 1 a 3.
- **Esperando al equipo:** catálogo en `solicitado`, `generando` o `cambios`, o fotos por retocar.
- **Se enfría:** cumple una regla de la categoría «Se enfría».
- **Viva:** pedidos o aaahs en 7 días y alguien entró en 7 días.
- Si cumple varias, gana la primera de esta lista.

## 5. Datos nuevos

Todo con RLS encendido, sin acceso para `anon`. Lectura para miembros de la tienda donde haga falta (créditos, pagos propios, trabajos de retoque propios). Escritura solo por funciones `security definer` que comprueban `soy_admin()` o la membresía.

| Tabla / columna | Para qué |
|---|---|
| `admins (usuario_id pk → auth.users, email, nombre, creado_en, creado_por)` | Quién entra. Función `soy_admin()`. |
| `planes (id text pk, nombre, precio_mensual int null, limite_productos int null, creditos_mensuales int, se_ofrece bool, orden, destacado bool, creado_en)` | Reemplaza `LIMITE_PRODUCTOS_POR_PLAN`, `NOMBRE_PLAN` y `CREDITOS_RETOQUE_MENSUALES`. La migración crea `p20`, `p60`, `p100` y `custom` con sus límites actuales y precio null. Básico y Pro los crea Lewis desde el admin. |
| `tiendas.plan` → referencia `planes.id` | Quitar el `check` fijo; `limite_productos` sigue siendo el límite efectivo (el del plan, o el pactado si es `custom`). |
| `precios_extra (clave pk, nombre, precio int)` | Instalación, marca propia y paquetes de créditos. |
| `tiendas.pagado_hasta date`, `tiendas.dias_gracia int default 5`, `tiendas.prueba_hasta date` | Estado de cobro calculado (§8). |
| `pagos (id, tienda_id, concepto: mensualidad\|creditos\|instalacion\|otro, monto, metodo: transferencia\|deposito\|efectivo, referencia, comprobante_url, cubre_hasta date null, nota, registrado_por, creado_en)` | Pagos manuales. Inmutables: un error se corrige con un pago de anulación que referencia al otro. |
| `movimientos_creditos (id, tienda_id, cantidad ±, tipo: recarga_mensual\|compra\|retoque\|devolucion\|ajuste, motivo, pago_id, trabajo_id, creado_por, creado_en)` | El saldo es la suma. `tiendas.creditos_retoque` queda como copia, mantenida por trigger. |
| `trabajos_retoque (id, tienda_id, producto_id, medio_url_original, medio_url_retocado, estado: pendiente\|entregado\|devuelto, motivo_devolucion, creditos, pedido_por, atendido_por, creado_en, atendido_en)` | Cola de fotos (§7). |
| `tiendas.catalogo_*` (ya existe) + `catalogo_paso_en timestamptz` | Saber cuánto lleva cada paso. |
| `tiendas.ultima_actividad_en`, `miembros.ultima_entrada_en` | «Se enfría». Se actualiza con `marcar_actividad()`, que el panel llama al abrir y como mucho cada 10 minutos. |
| `registro_admin (id, admin_id, tienda_id null, accion, detalle jsonb, creado_en)` | Solo insertar; sin update ni delete para nadie. |
| `admin_pospuestos (admin_id, clave, hasta)` | «Mañana» en Hoy. |
| `funciones_tienda (tienda_id, funcion, encendida, creado_por, creado_en)` | Funciones nuevas por tienda. |
| `sesiones_ver_como (id, admin_id, tienda_id, inicio, fin, vence_en)` | §6. |

## 6. «Ver como» (solo mirar)

- `admin_ver_como_iniciar(tienda_id)` crea una sesión de 30 minutos, la anota en el registro y devuelve su id. `admin_ver_como_terminar(id)` la cierra.
- **Lectura:** las políticas de lectura (`select`) de las tablas de la tienda suman `or public.admin_viendo(tienda_id)`, que es cierto solo si el admin actual tiene una sesión vigente para esa tienda. **Las de escritura no cambian:** el admin no es miembro, así que la base rechaza cualquier cambio aunque el cliente se equivoque.
- **En la app:** se reutilizan las pantallas del panel; no se duplican. La capa de datos entra en modo `soloMirar`: `getTiendas()` devuelve esa tienda, cada función de escritura lanza un error `SoloMirar` sin llamar a la base, y los botones de acción se ven apagados. Un toque en uno muestra «Aquí solo se mira. Para cambiar algo, escríbele a {vendedora}.».
- Arriba, siempre, la franja verde del tablero con «Salir». Al vencer los 30 minutos vuelve a la ficha.
- No se ven: datos de otras tiendas, el correo de Google de los miembros fuera de Equipo, ni el modo demo.

## 7. Retoque real

Hoy el retoque es una demo (`RETOQUE_REAL = false`, `gastar_creditos` cobra al instante). Pasa a ser así:

1. **Tienda (panel, ficha de medios):** «Retocar» en una foto crea un `trabajo_retoque` pendiente si el saldo alcanza (los créditos se **reservan**, no se cobran). La miniatura muestra «En el taller» y un anillo. No se puede pedir dos veces la misma foto.
2. **Admin (Trabajo › Fotos):**
   - Agrupado por tienda, de la más vieja a la más nueva.
   - Abrir una foto muestra antes y después; «Bajar original» descarga la original.
   - «Subir la retocada»: la foto pasa por el mismo `reducirFoto` que el panel.
   - **Entregar:** reemplaza esa foto en `productos.medios` (con `retocada: true`), guarda la original en el trabajo, cobra los créditos (`movimientos_creditos` tipo `retoque`) y queda en el registro.
   - **Devolver:** pide un motivo corto, libera la reserva y no cobra.
3. **Tienda:** la foto aparece retocada con un aviso corto («Tu foto salió del taller.»). Si fue devuelta, sale el motivo y la opción de subir otra.
4. `RETOQUE_REAL` pasa a `true` y desaparece la etiqueta «Demo». La recarga mensual de créditos se registra como movimiento `recarga_mensual` (una función que el admin ejecuta o una tarea programada; ver §11).

## 8. Cobros

- **Estado de cobro** (calculado, nunca guardado):
  - `en_prueba`: tienda en prueba con `prueba_hasta` ≥ hoy.
  - `al_dia`: `pagado_hasta` ≥ hoy + 4.
  - `vence_pronto`: `pagado_hasta` entre hoy y hoy + 3.
  - `en_gracia`: vencido hace ≤ `dias_gracia`.
  - `vencida`: vencido hace más de `dias_gracia`.
  - `sin_plan`: nunca pagó y no está en prueba.
- **Pantalla Cobros:**
  - Cobrado en el mes contra lo esperado (la suma de los precios de las tiendas activas). Por cobrar y créditos vendidos.
  - Secciones: Atrasadas (`en_gracia` y `vencida`), Vencen esta semana, Al día (plegado, con la próxima fecha), En prueba (plegado, con la que termina antes).
- **Registrar pago:**
  - Concepto (Mensualidad, Créditos, Instalación).
  - Monto, que se llena con el precio del plan (o del paquete) y se puede cambiar.
  - Método, referencia opcional y foto del comprobante (bucket privado `comprobantes`, solo admin).
  - Una línea que calcula «Queda pagada hasta…»: una mensualidad suma un mes a `max(pagado_hasta, hoy)`.
  - Interruptor «Mandarle el recibo»: abre WhatsApp con el mensaje y la imagen del recibo, que se genera como los recibos de pedidos.
  - Comprar créditos suma el movimiento `compra` con el `pago_id`.
- **Pausar por falta de pago no es automático** en esta versión. Hoy lo sugiere cuando una tienda está `vencida`, y Lewis decide desde la ficha (`cambiar_estado_tienda` en versión admin).

## 9. Planes

- `admin_guardar_plan` crea y edita. Un plan con tiendas no se borra: se deja de ofrecer (`se_ofrece = false`) y quien lo tiene lo conserva.
- Cambiar el precio aplica desde el próximo cobro: el pago siguiente toma el precio nuevo. No se recalcula nada pasado.
- Cambiar el plan de una tienda (`admin_cambiar_plan`) actualiza `limite_productos` (salvo `custom`, que lo pide), queda en el registro y respeta la regla de productos visibles (si baja de límite, no oculta nada por su cuenta: avisa cuántos sobran).
- **La app de las tiendas lee los planes de la base:** encabezado, menú, hoja «Tu plan», Inicio e inventario dejan de usar `NOMBRE_PLAN` y `LIMITE_PRODUCTOS_POR_PLAN`. La historia «Cómo funciona» del catálogo React y su hoja de planes también.

## 10. Mensajes de WhatsApp del admin

Plantillas en un solo archivo (`lib/admin/mensajes.ts`), con la voz de docs/11 (cálida, corta, nombre primero, sin culpar). Se abren con el texto listo; nada se envía solo. Cuáles:
- recordar pago, pago vencido y fin de prueba;
- empujón a una tienda en prueba;
- avisar de pedidos sin registrar;
- recordar que revise su catálogo;
- recibo de pago.

Ejemplo de tono: «¡Hola, Michel! Tu plan vence el jueves. Si ya pagaste, mándame la captura y te lo dejo al día.».

## 11. Lo que queda para después

- **Invitaciones y onboarding** (parte 5): dependen del diseño del onboarding (lienzo «Onboarding de Deslizapp», aún sin elegir opción). Mientras tanto, en Más › Invitaciones va «Próximamente».
- **Recarga mensual automática de créditos y cobro recurrente:** primero manual desde el admin; una tarea programada más adelante.
- **Quién vio las novedades.**
- **Errores de la app en Salud:** hoy no hay registro de errores. Cuando lo haya, se suma.
- **Verificación de Instagram** (docs/07): sigue decidida, no entra en esta versión.
- **Notificaciones al teléfono del admin.**

## 12. Orden de trabajo

Cada parte es un PR. Las partes 2, 3 y 4 dependen de la 1. Entre ellas son independientes, pero conviene hacerlas en orden, porque Hoy usa datos de las tres.

1. **Base y capa de datos** (`docs/prompts/admin-1-base.md`): tablas, funciones, seguridad, `soy_admin`, `admin_viendo`, tipos, demo y pruebas. Sin pantallas.
2. **Hoy, Tiendas, ficha y Ver como** (`admin-2-tiendas.md`): el armazón `/admin` con su barra, y el modo solo mirar en la capa de datos.
3. **Trabajo: catálogos, fotos (retoque real) y Personalizar** (`admin-3-trabajo.md`): incluye el cambio del retoque en el panel de la tienda.
4. **Cobros, Planes, Más, Salud y Registro** (`admin-4-cobros.md`): incluye que la app de las tiendas lea los planes de la base.
5. **Invitaciones** (con el onboarding; sin prompt todavía).
