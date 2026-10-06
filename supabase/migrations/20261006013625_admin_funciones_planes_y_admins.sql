-- Admin de Deslizapp, parte 1 (docs/13-admin.md §3, §8, §9 y docs/prompts/admin-1-base.md §3): planes, estado y dueño de
-- una tienda, funciones nuevas, salud, registro y quién entra al admin. Mismas reglas que admin_funciones.

-- ─── Planes (docs/13 §9) ────────────────────────────────────────────────────────────────────────────────────────────

-- Crea o edita un plan. Un plan no se borra: se deja de ofrecer. Si cambia el límite, lo toman las tiendas de ese plan
-- (salvo `custom`, que no tiene límite propio). El precio nuevo aplica desde el próximo pago: no se recalcula nada.
create function public.admin_guardar_plan(p_id text, p_nombre text, p_precio_mensual integer, p_limite_productos integer,
  p_creditos_mensuales integer, p_se_ofrece boolean, p_orden integer default 0, p_destacado boolean default false) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare v_antes public.planes; v public.planes; v_n integer := 0;
begin
  if not public.soy_admin() then raise exception 'no_admin' using errcode = '42501'; end if;
  if p_id is null or p_id !~ '^[a-z0-9_]{1,30}$' then raise exception 'plan_invalido' using errcode = '22023'; end if;
  if p_nombre is null or char_length(btrim(p_nombre)) not between 1 and 40 then raise exception 'nombre_invalido' using errcode = '22023'; end if;
  if p_precio_mensual is not null and p_precio_mensual < 0 then raise exception 'precio_invalido' using errcode = '22023'; end if;
  if p_creditos_mensuales is null or p_creditos_mensuales < 0 then raise exception 'creditos_invalidos' using errcode = '22023'; end if;
  if p_id = 'custom' and p_limite_productos is not null then raise exception 'limite_invalido' using errcode = '22023'; end if;
  if p_id <> 'custom' and (p_limite_productos is null or p_limite_productos <= 0) then raise exception 'limite_invalido' using errcode = '22023'; end if;
  select * into v_antes from public.planes where id = p_id for update;
  insert into public.planes (id, nombre, precio_mensual, limite_productos, creditos_mensuales, se_ofrece, orden, destacado)
  values (p_id, btrim(p_nombre), p_precio_mensual, p_limite_productos, p_creditos_mensuales, coalesce(p_se_ofrece, true),
    coalesce(p_orden, 0), coalesce(p_destacado, false))
  on conflict (id) do update set nombre = excluded.nombre, precio_mensual = excluded.precio_mensual,
    limite_productos = excluded.limite_productos, creditos_mensuales = excluded.creditos_mensuales,
    se_ofrece = excluded.se_ofrece, orden = excluded.orden, destacado = excluded.destacado
  returning * into v;
  if v_antes.id is not null and p_id <> 'custom' then
    update public.tiendas set limite_productos = v.limite_productos, creditos_retoque_mensuales = v.creditos_mensuales
    where plan = p_id and (limite_productos is distinct from v.limite_productos or creditos_retoque_mensuales is distinct from v.creditos_mensuales);
    get diagnostics v_n = row_count;
  end if;
  perform public.anotar_admin(null, 'guardar_plan', jsonb_build_object('plan', p_id, 'antes', to_jsonb(v_antes), 'despues', to_jsonb(v),
    'tiendas_actualizadas', v_n));
  return to_jsonb(v);
end $$;

-- Los planes (con cuántas tiendas tiene cada uno) y los precios de lo demás.
create function public.admin_planes() returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not public.soy_admin() then raise exception 'no_admin' using errcode = '42501'; end if;
  return jsonb_build_object(
    'planes', coalesce((select jsonb_agg(to_jsonb(p) || jsonb_build_object('tiendas',
        (select count(*) from public.tiendas t where t.plan = p.id and t.estado <> 'eliminada')) order by p.orden, p.id)
      from public.planes p), '[]'::jsonb),
    'precios_extra', coalesce((select jsonb_agg(to_jsonb(x) order by x.orden, x.clave) from public.precios_extra x), '[]'::jsonb));
end $$;

-- Cambia el plan de una tienda. `custom` pide el límite pactado; los demás toman el del plan. No oculta productos:
-- devuelve cuántos visibles sobran para que el admin le avise.
create function public.admin_cambiar_plan(p_tienda_id uuid, p_plan_id text, p_limite integer default null) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare v_t public.tiendas; v_plan public.planes; v_antes text; v_limite integer; v_visibles integer;
begin
  if not public.soy_admin() then raise exception 'no_admin' using errcode = '42501'; end if;
  select * into v_plan from public.planes where id = p_plan_id;
  if not found then raise exception 'plan_no_encontrado' using errcode = 'P0002'; end if;
  if v_plan.limite_productos is null then
    if p_limite is null or p_limite <= 0 then raise exception 'limite_invalido' using errcode = '22023'; end if;
    v_limite := p_limite;
  else
    if p_limite is not null then raise exception 'limite_invalido' using errcode = '22023'; end if;
    v_limite := v_plan.limite_productos;
  end if;
  select * into v_t from public.tiendas where id = p_tienda_id for update;
  if not found or v_t.estado = 'eliminada' then raise exception 'tienda_no_encontrada' using errcode = 'P0002'; end if;
  v_antes := v_t.plan;
  update public.tiendas set plan = p_plan_id, limite_productos = v_limite,
    creditos_retoque_mensuales = case when p_plan_id = 'custom' then creditos_retoque_mensuales else v_plan.creditos_mensuales end
  where id = p_tienda_id returning * into v_t;
  select count(*) into v_visibles from public.productos where tienda_id = p_tienda_id and activo and eliminado_en is null;
  perform public.anotar_admin(p_tienda_id, 'cambiar_plan', jsonb_build_object('de', v_antes, 'a', p_plan_id, 'limite', v_limite));
  return jsonb_build_object('plan', v_t.plan, 'limite_productos', v_t.limite_productos, 'visibles', v_visibles,
    'sobran', greatest(v_visibles - v_limite, 0));
end $$;

-- Precios de lo demás (instalación, marca propia, paquetes de créditos).
create function public.admin_guardar_precio_extra(p_clave text, p_nombre text, p_precio integer, p_creditos integer default null,
  p_orden integer default 0) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare v_antes public.precios_extra; v public.precios_extra;
begin
  if not public.soy_admin() then raise exception 'no_admin' using errcode = '42501'; end if;
  if p_clave is null or p_clave !~ '^[a-z0-9_]{1,40}$' then raise exception 'clave_invalida' using errcode = '22023'; end if;
  if p_nombre is null or char_length(btrim(p_nombre)) not between 1 and 60 then raise exception 'nombre_invalido' using errcode = '22023'; end if;
  if p_precio is null or p_precio < 0 then raise exception 'precio_invalido' using errcode = '22023'; end if;
  if p_creditos is not null and p_creditos <= 0 then raise exception 'creditos_invalidos' using errcode = '22023'; end if;
  select * into v_antes from public.precios_extra where clave = p_clave;
  insert into public.precios_extra (clave, nombre, precio, creditos, orden) values (p_clave, btrim(p_nombre), p_precio, p_creditos, coalesce(p_orden, 0))
  on conflict (clave) do update set nombre = excluded.nombre, precio = excluded.precio, creditos = excluded.creditos, orden = excluded.orden
  returning * into v;
  perform public.anotar_admin(null, 'guardar_precio_extra', jsonb_build_object('clave', p_clave, 'antes', to_jsonb(v_antes), 'despues', to_jsonb(v)));
  return to_jsonb(v);
end $$;

-- ─── Estado, dueño y funciones de una tienda ────────────────────────────────────────────────────────────────────────

-- pausar (activa o en prueba → pausada), reactivar (pausada → activa, o en prueba si nunca se activó),
-- prueba (pone o cambia prueba_hasta = p_fecha, ≥ hoy; solo en prueba).
create function public.admin_cambiar_estado_tienda(p_tienda_id uuid, p_accion text, p_fecha date default null) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare v public.tiendas; v_antes text; v_prueba_antes date;
begin
  if not public.soy_admin() then raise exception 'no_admin' using errcode = '42501'; end if;
  if p_accion is null or p_accion not in ('pausar', 'reactivar', 'prueba') then raise exception 'accion_invalida' using errcode = '22023'; end if;
  select * into v from public.tiendas where id = p_tienda_id for update;
  if not found or v.estado = 'eliminada' then raise exception 'tienda_no_encontrada' using errcode = 'P0002'; end if;
  v_antes := v.estado; v_prueba_antes := v.prueba_hasta;
  if p_accion = 'pausar' and v.estado in ('activa', 'en_prueba') then
    update public.tiendas set estado = 'pausada' where id = p_tienda_id returning * into v;
  elsif p_accion = 'reactivar' and v.estado = 'pausada' then
    update public.tiendas set estado = case when activada_en is not null then 'activa' else 'en_prueba' end
    where id = p_tienda_id returning * into v;
  elsif p_accion = 'prueba' and v.estado = 'en_prueba' then
    if p_fecha is null or p_fecha < public.hoy_rd() then raise exception 'fecha_invalida' using errcode = '22023'; end if;
    update public.tiendas set prueba_hasta = p_fecha where id = p_tienda_id returning * into v;
  else
    raise exception 'cambio_no_permitido' using errcode = 'P0001';
  end if;
  perform public.anotar_admin(p_tienda_id, 'cambiar_estado_tienda', jsonb_build_object('accion', p_accion, 'de', v_antes, 'a', v.estado,
    'prueba_antes', v_prueba_antes, 'prueba_hasta', v.prueba_hasta));
  return jsonb_build_object('estado', v.estado, 'prueba_hasta', v.prueba_hasta, 'activada_en', v.activada_en);
end $$;

-- Pasa la tienda a otro dueño por su correo de Google (ya tiene que haber entrado una vez). Como transferir_tienda: el
-- nuevo queda de dueño y los dueños de antes pasan a staff; si no era miembro, se suma.
create function public.admin_transferir_tienda(p_tienda_id uuid, p_email_nuevo_dueno text) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare v_email text := lower(btrim(coalesce(p_email_nuevo_dueno, ''))); v_uid uuid; v_antes uuid[];
begin
  if not public.soy_admin() then raise exception 'no_admin' using errcode = '42501'; end if;
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'correo_invalido' using errcode = '22023'; end if;
  perform 1 from public.tiendas where id = p_tienda_id and estado <> 'eliminada' for update;
  if not found then raise exception 'tienda_no_encontrada' using errcode = 'P0002'; end if;
  select id into v_uid from auth.users
  where lower(email) = v_email and raw_app_meta_data ->> 'provider' = 'google' and email_confirmed_at is not null;
  if v_uid is null then raise exception 'usuario_no_encontrado' using errcode = 'P0002'; end if;
  select coalesce(array_agg(usuario_id order by usuario_id), '{}') into v_antes from public.miembros
  where tienda_id = p_tienda_id and rol = 'dueno' and usuario_id <> v_uid;
  insert into public.miembros (usuario_id, tienda_id, rol) values (v_uid, p_tienda_id, 'dueno')
  on conflict (usuario_id, tienda_id) do update set rol = 'dueno';
  update public.miembros set rol = 'staff' where tienda_id = p_tienda_id and rol = 'dueno' and usuario_id <> v_uid;
  insert into public.usuarios (id, tienda_id, email, rol) values (v_uid, p_tienda_id, v_email, 'dueno')
  on conflict (id) do update set tienda_id = coalesce(public.usuarios.tienda_id, excluded.tienda_id);
  perform public.anotar_admin(p_tienda_id, 'transferir_tienda', jsonb_build_object('nuevo_dueno', v_uid, 'duenos_antes', to_jsonb(v_antes)));
  return jsonb_build_object('nuevo_dueno', v_uid, 'duenos_antes', to_jsonb(v_antes));
end $$;

-- Enciende o apaga una función nueva para una tienda.
create function public.admin_funcion_tienda(p_tienda_id uuid, p_funcion text, p_encendida boolean) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare v public.funciones_tienda;
begin
  if not public.soy_admin() then raise exception 'no_admin' using errcode = '42501'; end if;
  if p_funcion is null or p_funcion !~ '^[A-Za-z][A-Za-z0-9_]{0,39}$' or p_encendida is null then raise exception 'funcion_invalida' using errcode = '22023'; end if;
  if not exists (select 1 from public.tiendas where id = p_tienda_id and estado <> 'eliminada') then
    raise exception 'tienda_no_encontrada' using errcode = 'P0002';
  end if;
  insert into public.funciones_tienda (tienda_id, funcion, encendida, creado_por) values (p_tienda_id, p_funcion, p_encendida, (select auth.uid()))
  on conflict (tienda_id, funcion) do update set encendida = excluded.encendida, creado_por = excluded.creado_por, creado_en = now()
  returning * into v;
  perform public.anotar_admin(p_tienda_id, 'funcion_tienda', jsonb_build_object('funcion', p_funcion, 'encendida', p_encendida));
  return to_jsonb(v);
end $$;

-- ─── Salud y registro ───────────────────────────────────────────────────────────────────────────────────────────────

-- Tamaño de Storage (total, por bucket y por tienda), el archivo más grande, la base y la actividad de hoy.
-- «Datos servidos» no se puede leer desde la base: no está aquí.
create function public.admin_salud() returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_inicio timestamptz := public.hoy_rd()::timestamp at time zone 'America/Santo_Domingo';
  v_uso jsonb := public.uso_plataforma();
  v jsonb;
begin
  if not public.soy_admin() then raise exception 'no_admin' using errcode = '42501'; end if;
  with o as (select bucket_id, name, coalesce((metadata ->> 'size')::bigint, 0) as bytes from storage.objects)
  select jsonb_build_object(
    'almacenamiento', jsonb_build_object(
      'bytes', (v_uso ->> 'almacenamiento_bytes')::bigint,
      'limite_bytes', public.regla_admin('almacenamiento_limite_mb')::bigint * 1048576,
      'por_bucket', coalesce((select jsonb_object_agg(b.bucket_id, b.bytes) from (select bucket_id, sum(bytes) as bytes from o group by bucket_id) b), '{}'::jsonb)),
    'base', jsonb_build_object('bytes', (v_uso ->> 'base_bytes')::bigint, 'limite_bytes', public.regla_admin('base_limite_mb')::bigint * 1048576),
    'por_tienda', coalesce((select jsonb_agg(jsonb_build_object('tienda_id', t.id, 'nombre', t.nombre, 'bytes', x.bytes, 'archivos', x.archivos) order by x.bytes desc)
      from (select split_part(name, '/', 1) as carpeta, sum(bytes) as bytes, count(*) as archivos from o
            where bucket_id in ('productos', 'retoques') group by 1 order by 2 desc limit 10) x
      join public.tiendas t on t.id::text = x.carpeta), '[]'::jsonb),
    'archivo_mas_grande', (select jsonb_build_object('bucket', o.bucket_id, 'nombre', o.name, 'bytes', o.bytes,
        'tienda_id', (select t.id from public.tiendas t where t.id::text = split_part(o.name, '/', 1)))
      from o order by o.bytes desc limit 1),
    'hoy', jsonb_build_object(
      'aaahs', (select count(*) from public.eventos_aaah where creado_en >= v_inicio),
      'solicitudes', (select count(*) from public.solicitudes_pedido where creada_en >= v_inicio),
      'pedidos', (select count(*) from public.pedidos where creado_en >= v_inicio))
  ) into v;
  return v;
end $$;

-- Registro, de 50 en 50, del más nuevo al más viejo. Filtros: todo, plata, ver_como, planes, catalogos.
-- Devuelve {filas, siguiente} (siguiente = el p_antes_de de la página que sigue, o null).
create function public.admin_registro(p_filtro text default 'todo', p_antes_de timestamptz default null) returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare v_acciones text[]; v_filas jsonb; v_n integer;
begin
  if not public.soy_admin() then raise exception 'no_admin' using errcode = '42501'; end if;
  v_acciones := case coalesce(p_filtro, 'todo')
    when 'todo' then null
    when 'plata' then array['registrar_pago', 'anular_pago', 'ajustar_creditos', 'recarga_mensual']
    when 'ver_como' then array['ver_como_iniciar', 'ver_como_terminar']
    when 'planes' then array['guardar_plan', 'cambiar_plan', 'guardar_precio_extra']
    when 'catalogos' then array['catalogo_avanzar', 'guardar_personalizacion', 'retoque_entregar', 'retoque_devolver']
  end;
  if coalesce(p_filtro, 'todo') not in ('todo', 'plata', 'ver_como', 'planes', 'catalogos') then
    raise exception 'filtro_invalido' using errcode = '22023';
  end if;
  select coalesce(jsonb_agg(jsonb_build_object('id', r.id, 'creado_en', r.creado_en, 'accion', r.accion, 'detalle', r.detalle,
      'tienda_id', r.tienda_id, 'tienda_nombre', t.nombre, 'admin_id', r.admin_id, 'admin_email', a.email) order by r.creado_en desc, r.id), '[]'::jsonb),
    count(*)
  into v_filas, v_n
  from (select * from public.registro_admin x
        where (v_acciones is null or x.accion = any (v_acciones)) and (p_antes_de is null or x.creado_en < p_antes_de)
        order by x.creado_en desc, x.id limit 50) r
  left join public.tiendas t on t.id = r.tienda_id
  left join public.admins a on a.usuario_id = r.admin_id;
  return jsonb_build_object('filas', v_filas, 'siguiente', case when v_n = 50 then (v_filas -> 49 ->> 'creado_en')::timestamptz end);
end $$;

-- ─── Quién entra al admin ───────────────────────────────────────────────────────────────────────────────────────────
-- Quitar a alguien no borra su fila: queda con quitado_en (y quién lo quitó), así se sabe quién tuvo acceso.
-- soy_admin() y tiendas_que_miro() solo cuentan a los que siguen.
alter table public.admins
  add column quitado_en timestamptz,
  add column quitado_por uuid references auth.users (id) on delete set null;
create index admins_quitado_por_idx on public.admins (quitado_por);

create or replace function public.soy_admin() returns boolean
language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.admins where usuario_id = (select auth.uid()) and quitado_en is null) $$;

create or replace function public.tiendas_que_miro() returns setof uuid
language sql stable security definer set search_path = ''
as $$
  select s.tienda_id from public.sesiones_ver_como s
  where s.admin_id = (select auth.uid()) and s.fin is null and s.vence_en > now()
    and exists (select 1 from public.admins a where a.usuario_id = (select auth.uid()) and a.quitado_en is null)
$$;

-- Los que entran hoy al admin.
create function public.admin_admins() returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not public.soy_admin() then raise exception 'no_admin' using errcode = '42501'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('usuario_id', a.usuario_id, 'email', a.email, 'nombre', a.nombre,
      'creado_en', a.creado_en, 'creado_por', a.creado_por, 'creado_por_email', c.email, 'soy_yo', a.usuario_id = (select auth.uid()))
    order by a.creado_en, a.usuario_id)
    from public.admins a left join public.admins c on c.usuario_id = a.creado_por
    where a.quitado_en is null), '[]'::jsonb);
end $$;

-- Suma a alguien por su correo de Google (ya tiene que haber entrado una vez a Deslizapp). Si lo habían quitado, vuelve.
create function public.admin_agregar_admin(p_email text) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare v_email text := lower(btrim(coalesce(p_email, ''))); v_uid uuid; v_nombre text; v public.admins;
begin
  if not public.soy_admin() then raise exception 'no_admin' using errcode = '42501'; end if;
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'correo_invalido' using errcode = '22023'; end if;
  select id, left(coalesce(raw_user_meta_data ->> 'full_name', raw_user_meta_data ->> 'name', ''), 80) into v_uid, v_nombre from auth.users
  where lower(email) = v_email and raw_app_meta_data ->> 'provider' = 'google' and email_confirmed_at is not null;
  if v_uid is null then raise exception 'usuario_no_encontrado' using errcode = 'P0002'; end if;
  if exists (select 1 from public.admins where usuario_id = v_uid and quitado_en is null) then raise exception 'ya_es_admin' using errcode = 'P0001'; end if;
  insert into public.admins (usuario_id, email, nombre, creado_por) values (v_uid, v_email, coalesce(v_nombre, ''), (select auth.uid()))
  on conflict (usuario_id) do update set email = excluded.email, nombre = excluded.nombre, creado_por = excluded.creado_por,
    creado_en = now(), quitado_en = null, quitado_por = null
  returning * into v;
  perform public.anotar_admin(null, 'agregar_admin', jsonb_build_object('usuario_id', v_uid, 'email', v_email));
  return to_jsonb(v);
end $$;

-- Quita a un admin (nunca al último que queda).
create function public.admin_quitar_admin(p_usuario_id uuid) returns void
language plpgsql security definer set search_path = ''
as $$
declare v public.admins;
begin
  if not public.soy_admin() then raise exception 'no_admin' using errcode = '42501'; end if;
  lock table public.admins in share row exclusive mode;
  select * into v from public.admins where usuario_id = p_usuario_id and quitado_en is null;
  if not found then raise exception 'admin_no_encontrado' using errcode = 'P0002'; end if;
  if (select count(*) from public.admins where quitado_en is null) <= 1 then raise exception 'ultimo_admin' using errcode = 'P0001'; end if;
  update public.admins set quitado_en = now(), quitado_por = (select auth.uid()) where usuario_id = p_usuario_id;
  perform public.anotar_admin(null, 'quitar_admin', jsonb_build_object('usuario_id', p_usuario_id, 'email', v.email));
end $$;

-- ─── Permisos: las admin_* solo para authenticated (y adentro, solo para admins) ────────────────────────────────────
do $$
declare f record;
begin
  for f in select p.oid::regprocedure as firma from pg_proc p
           where p.pronamespace = 'public'::regnamespace and p.proname like 'admin\_%' and p.proname <> 'admin_viendo' loop
    execute format('revoke execute on function %s from public, anon', f.firma);
    execute format('grant execute on function %s to authenticated', f.firma);
  end loop;
end $$;
