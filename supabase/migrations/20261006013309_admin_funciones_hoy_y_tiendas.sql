-- Admin de Deslizapp, parte 1 (docs/13-admin.md §3, §4 y §6): Hoy, Tiendas, la ficha y «Ver como». Mismas reglas que
-- admin_funciones: security definer, soy_admin() primero (no_admin, 42501), solo para authenticated, y su fila en
-- registro_admin si cambian algo.

-- ─── Hoy ────────────────────────────────────────────────────────────────────────────────────────────────────────────

-- Los 4 números de Hoy y la tarjeta de Cobros.
create function public.admin_resumen_mes() returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_hoy date := public.hoy_rd();
  v_inicio timestamptz := (date_trunc('month', v_hoy)::date)::timestamp at time zone 'America/Santo_Domingo';
  v jsonb;
begin
  if not public.soy_admin() then raise exception 'no_admin' using errcode = '42501'; end if;
  with t as (
    select x.*, public.estado_cobro(x.estado, x.prueba_hasta, x.pagado_hasta, x.dias_gracia, v_hoy) as cobro, p.precio_mensual
    from public.tiendas x join public.planes p on p.id = x.plan where x.estado <> 'eliminada'
  )
  select jsonb_build_object(
    'mes', date_trunc('month', v_hoy)::date,
    'tiendas_activas', (select count(*) from t where estado = 'activa'),
    'en_prueba', (select count(*) from t where estado = 'en_prueba'),
    'cobrado_mes', (select coalesce(sum(monto), 0) from public.pagos where creado_en >= v_inicio),
    'esperado_mes', (select coalesce(sum(precio_mensual), 0) from t where estado = 'activa'),
    'por_cobrar', (select coalesce(sum(precio_mensual), 0) from t where estado = 'activa' and cobro in ('en_gracia', 'vencida')),
    'por_cobrar_tiendas', (select count(*) from t where estado = 'activa' and cobro in ('en_gracia', 'vencida')),
    'creditos_vendidos_monto', (select coalesce(sum(monto), 0) from public.pagos where concepto = 'creditos' and creado_en >= v_inicio),
    'creditos_vendidos', (select coalesce(sum(p.creditos), 0) from public.pagos p where p.concepto = 'creditos' and p.anula_a is null
      and p.creado_en >= v_inicio and not exists (select 1 from public.pagos a where a.anula_a = p.id))
  ) into v;
  return v;
end $$;

-- Lo que pide atención hoy, sin lo que este admin pospuso, del más urgente al más viejo.
create function public.admin_hoy()
returns table (clave text, regla text, categoria text, prioridad integer, tienda_id uuid, tienda_nombre text, tienda_whatsapp text,
  vendedora text, datos jsonb, accion text, desde timestamptz)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not public.soy_admin() then raise exception 'no_admin' using errcode = '42501'; end if;
  return query
  select a.clave, a.regla, a.categoria, a.prioridad, a.tienda_id, t.nombre, t.whatsapp, t.nombre_vendedora, a.datos, a.accion, a.desde
  from public.asuntos_admin() a
  left join public.tiendas t on t.id = a.tienda_id
  where not exists (select 1 from public.admin_pospuestos p where p.admin_id = (select auth.uid()) and p.clave = a.clave and p.hasta > now())
  order by a.prioridad, a.desde, a.clave;
end $$;

-- «Mañana»: esconde ese asunto N horas para este admin.
create function public.admin_posponer(p_clave text, p_horas integer default 24) returns timestamptz
language plpgsql security definer set search_path = ''
as $$
declare v_hasta timestamptz;
begin
  if not public.soy_admin() then raise exception 'no_admin' using errcode = '42501'; end if;
  if p_clave is null or char_length(p_clave) not between 1 and 200 then raise exception 'clave_invalida' using errcode = '22023'; end if;
  if p_horas is null or p_horas not between 1 and 168 then raise exception 'horas_invalidas' using errcode = '22023'; end if;
  v_hasta := now() + make_interval(hours => p_horas);
  insert into public.admin_pospuestos (admin_id, clave, hasta) values ((select auth.uid()), p_clave, v_hasta)
  on conflict (admin_id, clave) do update set hasta = excluded.hasta;
  perform public.anotar_admin(null, 'posponer', jsonb_build_object('clave', p_clave, 'hasta', v_hasta));
  return v_hasta;
end $$;

-- ─── Tiendas y ficha ────────────────────────────────────────────────────────────────────────────────────────────────

-- Lista con filtro y búsqueda (nombre, WhatsApp o correo de un miembro), ya ordenada: primero las que tienen algo en Hoy,
-- luego por salud y luego por nombre. Devuelve {tiendas: [...], conteos: {...}} (los conteos, con la búsqueda aplicada).
create function public.admin_tiendas(p_filtro text default 'todas', p_busqueda text default null) returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_hoy date := public.hoy_rd();
  v_q text := lower(btrim(coalesce(p_busqueda, '')));
  v_digitos text := regexp_replace(coalesce(p_busqueda, ''), '[^0-9]', '', 'g');
  v jsonb;
begin
  if not public.soy_admin() then raise exception 'no_admin' using errcode = '42501'; end if;
  if coalesce(p_filtro, 'todas') not in ('todas', 'activas', 'en_prueba', 'atrasadas', 'pausadas') then
    raise exception 'filtro_invalido' using errcode = '22023';
  end if;
  with s as (select * from public.salud_tiendas()),
  pos as (select p.clave from public.admin_pospuestos p where p.admin_id = (select auth.uid()) and p.hasta > now()),
  hoy as (select distinct a.tienda_id from public.asuntos_admin() a where a.tienda_id is not null and a.clave not in (select clave from pos)),
  base as (
    select t.*, pl.nombre as plan_nombre, pl.precio_mensual, s.salud, s.motivo,
      public.estado_cobro(t.estado, t.prueba_hasta, t.pagado_hasta, t.dias_gracia, v_hoy) as cobro,
      exists (select 1 from hoy where hoy.tienda_id = t.id) as en_hoy
    from public.tiendas t
    join public.planes pl on pl.id = t.plan
    join s on s.tienda_id = t.id
    where t.estado <> 'eliminada'
      and (v_q = '' or position(v_q in lower(t.nombre)) > 0
        or (char_length(v_digitos) >= 3 and position(v_digitos in coalesce(t.whatsapp, '')) > 0)
        or exists (select 1 from public.miembros m join auth.users u on u.id = m.usuario_id
                   where m.tienda_id = t.id and position(v_q in lower(coalesce(u.email, ''))) > 0))
  ),
  filtrada as (
    select * from base where case coalesce(p_filtro, 'todas')
      when 'activas' then estado = 'activa'
      when 'en_prueba' then estado = 'en_prueba'
      when 'atrasadas' then cobro in ('en_gracia', 'vencida')
      when 'pausadas' then estado = 'pausada'
      else true end
  )
  select jsonb_build_object(
    'tiendas', coalesce((select jsonb_agg(jsonb_build_object(
        'id', f.id, 'slug', f.slug, 'nombre', f.nombre, 'logo_url', f.logo_url, 'foto_perfil_url', f.foto_perfil_url,
        'rubro', f.rubro, 'estado', f.estado, 'plan', f.plan, 'plan_nombre', f.plan_nombre, 'estado_cobro', f.cobro,
        'precio_mensual', f.precio_mensual, 'pagado_hasta', f.pagado_hasta, 'prueba_hasta', f.prueba_hasta, 'dias_gracia', f.dias_gracia,
        'whatsapp', f.whatsapp, 'vendedora', f.nombre_vendedora, 'creditos', f.creditos_retoque,
        'catalogo_estado', f.catalogo_estado, 'catalogo_paso', f.catalogo_paso, 'catalogo_paso_en', f.catalogo_paso_en,
        'catalogo_notas_cambios', f.catalogo_notas_cambios, 'url_catalogo', f.url_catalogo,
        'salud', f.salud, 'motivo', f.motivo, 'en_hoy', f.en_hoy)
      order by f.en_hoy desc,
        array_position(array['te_necesita', 'esperando_equipo', 'se_enfria', 'viva', 'quieta'], f.salud),
        lower(f.nombre), f.id)
      from filtrada f), '[]'::jsonb),
    'conteos', jsonb_build_object(
      'todas', (select count(*) from base),
      'activas', (select count(*) from base where estado = 'activa'),
      'en_prueba', (select count(*) from base where estado = 'en_prueba'),
      'atrasadas', (select count(*) from base where cobro in ('en_gracia', 'vencida')),
      'pausadas', (select count(*) from base where estado = 'pausada'))
  ) into v;
  return v;
end $$;

-- Todo lo de la ficha de una tienda (docs/13 §3.2).
create function public.admin_tienda(p_tienda_id uuid) returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_hoy date := public.hoy_rd();
  v_t public.tiendas;
  v_desde timestamptz := now() - interval '30 days';
  v_bytes bigint;
  v jsonb;
begin
  if not public.soy_admin() then raise exception 'no_admin' using errcode = '42501'; end if;
  select * into v_t from public.tiendas where id = p_tienda_id;
  if not found then raise exception 'tienda_no_encontrada' using errcode = 'P0002'; end if;
  select coalesce(sum((o.metadata ->> 'size')::bigint), 0) into v_bytes from storage.objects o
  where o.bucket_id in ('productos', 'retoques') and split_part(o.name, '/', 1) = p_tienda_id::text;

  select jsonb_build_object(
    'tienda', jsonb_build_object(
      'id', v_t.id, 'slug', v_t.slug, 'nombre', v_t.nombre, 'rubro', v_t.rubro, 'vendedora', v_t.nombre_vendedora,
      'whatsapp', v_t.whatsapp, 'instagram', v_t.instagram, 'logo_url', v_t.logo_url, 'foto_perfil_url', v_t.foto_perfil_url,
      'creado_en', v_t.creado_en, 'activada_en', v_t.activada_en, 'estado', v_t.estado, 'url_catalogo', v_t.url_catalogo,
      'ultima_actividad_en', v_t.ultima_actividad_en),
    'cuenta', jsonb_build_object(
      'plan', v_t.plan, 'plan_nombre', pl.nombre, 'precio_mensual', pl.precio_mensual, 'limite_productos', v_t.limite_productos,
      'pagado_hasta', v_t.pagado_hasta, 'prueba_hasta', v_t.prueba_hasta, 'dias_gracia', v_t.dias_gracia,
      'estado_cobro', public.estado_cobro(v_t.estado, v_t.prueba_hasta, v_t.pagado_hasta, v_t.dias_gracia, v_hoy),
      'ultimo_pago', (select to_jsonb(p) from public.pagos p where p.tienda_id = p_tienda_id and p.anula_a is null
                      and not exists (select 1 from public.pagos a where a.anula_a = p.id) order by p.numero desc limit 1),
      'pagos', coalesce((select jsonb_agg(to_jsonb(p) order by p.numero desc) from
                 (select * from public.pagos where tienda_id = p_tienda_id order by numero desc limit 50) p), '[]'::jsonb)),
    'treinta_dias', jsonb_build_object(
      'productos_visibles', (select count(*) from public.productos where tienda_id = p_tienda_id and activo and eliminado_en is null),
      'productos', (select count(*) from public.productos where tienda_id = p_tienda_id and eliminado_en is null),
      'limite_productos', v_t.limite_productos,
      'aaahs', (select count(*) from public.eventos_aaah where tienda_id = p_tienda_id and creado_en >= v_desde),
      'pedidos', (select count(*) from public.pedidos where tienda_id = p_tienda_id and creado_en >= v_desde and estado <> 'cancelado'),
      'solicitudes_sin_registrar', (select count(*) from public.solicitudes_pedido where tienda_id = p_tienda_id
        and registrada_en is null and descartada_en is null and vence_en > now()),
      'creditos', v_t.creditos_retoque,
      'creditos_reservados', public.creditos_reservados(p_tienda_id),
      'creditos_usados', (select coalesce(-sum(cantidad), 0) from public.movimientos_creditos
        where tienda_id = p_tienda_id and tipo = 'retoque' and creado_en >= v_desde),
      'almacenamiento_bytes', v_bytes),
    'catalogo', jsonb_build_object(
      'estado', v_t.catalogo_estado, 'paso', v_t.catalogo_paso, 'paso_en', v_t.catalogo_paso_en,
      'notas_cambios', v_t.catalogo_notas_cambios, 'solicitado_en', v_t.catalogo_solicitado_en,
      'publicado_en', v_t.catalogo_publicado_en, 'url', v_t.url_catalogo),
    'equipo', coalesce((select jsonb_agg(jsonb_build_object(
        'usuario_id', m.usuario_id, 'email', u.email, 'nombre', coalesce(us.nombre, ''), 'rol', m.rol,
        'ultima_entrada_en', m.ultima_entrada_en, 'creado_en', m.creado_en) order by m.rol, m.creado_en)
      from public.miembros m left join auth.users u on u.id = m.usuario_id left join public.usuarios us on us.id = m.usuario_id
      where m.tienda_id = p_tienda_id), '[]'::jsonb),
    'eventos', coalesce((select jsonb_agg(e order by e.en desc) from (
        (select 'admin' as tipo, r.creado_en as en, jsonb_build_object('accion', r.accion, 'detalle', r.detalle) as datos
         from public.registro_admin r where r.tienda_id = p_tienda_id order by r.creado_en desc limit 15)
        union all
        (select 'pedido', p.creado_en, jsonb_build_object('numero', p.numero, 'origen', p.origen, 'total', p.total, 'estado', p.estado)
         from public.pedidos p where p.tienda_id = p_tienda_id order by p.creado_en desc limit 15)
        union all
        (select 'pago', p.creado_en, jsonb_build_object('concepto', p.concepto, 'monto', p.monto, 'anulacion', p.anula_a is not null)
         from public.pagos p where p.tienda_id = p_tienda_id order by p.creado_en desc limit 15)
        union all
        (select 'retoque', tr.creado_en, jsonb_build_object('estado', tr.estado, 'producto_id', tr.producto_id)
         from public.trabajos_retoque tr where tr.tienda_id = p_tienda_id order by tr.creado_en desc limit 15)
        order by en desc limit 15) e), '[]'::jsonb),
    'asuntos', coalesce((select jsonb_agg(to_jsonb(a) order by a.prioridad, a.desde)
      from public.asuntos_admin() a where a.tienda_id = p_tienda_id), '[]'::jsonb),
    'salud', (select jsonb_build_object('salud', s.salud, 'motivo', s.motivo) from public.salud_tiendas() s where s.tienda_id = p_tienda_id),
    'funciones', coalesce((select jsonb_object_agg(f.funcion, f.encendida) from public.funciones_tienda f where f.tienda_id = p_tienda_id), '{}'::jsonb)
  ) into v
  from public.planes pl where pl.id = v_t.plan;
  return v;
end $$;

-- ─── Ver como (docs/13 §6) ──────────────────────────────────────────────────────────────────────────────────────────

-- Abre una sesión de N minutos (cierra las otras abiertas de este admin) y la anota. Devuelve {id, tienda_id, vence_en}.
create function public.admin_ver_como_iniciar(p_tienda_id uuid) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare v public.sesiones_ver_como;
begin
  if not public.soy_admin() then raise exception 'no_admin' using errcode = '42501'; end if;
  if not exists (select 1 from public.tiendas where id = p_tienda_id and estado <> 'eliminada') then
    raise exception 'tienda_no_encontrada' using errcode = 'P0002';
  end if;
  update public.sesiones_ver_como set fin = now() where admin_id = (select auth.uid()) and fin is null;
  insert into public.sesiones_ver_como (admin_id, tienda_id, vence_en)
  values ((select auth.uid()), p_tienda_id, now() + make_interval(mins => public.regla_admin('ver_como_minutos')))
  returning * into v;
  perform public.anotar_admin(p_tienda_id, 'ver_como_iniciar', jsonb_build_object('sesion_id', v.id, 'vence_en', v.vence_en));
  return jsonb_build_object('id', v.id, 'tienda_id', v.tienda_id, 'vence_en', v.vence_en);
end $$;

-- Cierra la sesión. Devuelve si estaba abierta.
create function public.admin_ver_como_terminar(p_sesion_id uuid) returns boolean
language plpgsql security definer set search_path = ''
as $$
declare v public.sesiones_ver_como;
begin
  if not public.soy_admin() then raise exception 'no_admin' using errcode = '42501'; end if;
  update public.sesiones_ver_como set fin = now()
  where id = p_sesion_id and admin_id = (select auth.uid()) and fin is null returning * into v;
  if not found then return false; end if;
  perform public.anotar_admin(v.tienda_id, 'ver_como_terminar', jsonb_build_object('sesion_id', v.id));
  return true;
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
