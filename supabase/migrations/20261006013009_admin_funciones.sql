-- Admin de Deslizapp, parte 1 (docs/13-admin.md §3, §4, §6–§9 y docs/prompts/admin-1-base.md §3): las funciones.
-- Todas las admin_* son security definer, empiezan comprobando soy_admin() (error no_admin, 42501), se dan solo a
-- authenticated y, si cambian algo, anotan su fila en registro_admin en la misma transacción.
-- Los textos de Hoy los arma el cliente con la voz de la marca (docs/11): aquí solo van la regla y sus datos.

-- ─── Piezas internas (no se dan a nadie) ────────────────────────────────────────────────────────────────────────────

-- Estado de cobro (docs/13 §8). Se calcula, nunca se guarda. Igual que estadoCobro() en lib/admin/reglas.ts.
create function public.estado_cobro(p_estado text, p_prueba_hasta date, p_pagado_hasta date, p_dias_gracia integer, p_hoy date)
returns text language sql immutable set search_path = ''
as $$
  select case
    when p_estado = 'en_prueba' and (p_prueba_hasta is null or p_prueba_hasta >= p_hoy) then 'en_prueba'
    when p_pagado_hasta is null then 'sin_plan'
    when p_pagado_hasta > p_hoy + public.regla_admin('vence_pronto_dias') then 'al_dia'
    when p_pagado_hasta >= p_hoy then 'vence_pronto'
    when p_hoy - p_pagado_hasta <= p_dias_gracia then 'en_gracia'
    else 'vencida'
  end
$$;
revoke execute on function public.estado_cobro(text, date, date, integer, date) from public, anon;
grant execute on function public.estado_cobro(text, date, date, integer, date) to authenticated;

-- Bytes usados en Storage y en la base. plpgsql para no atarse a las columnas de storage.objects al crear la función.
create function public.uso_plataforma() returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare v_storage bigint;
begin
  select coalesce(sum((metadata ->> 'size')::bigint), 0) into v_storage from storage.objects;
  return jsonb_build_object('almacenamiento_bytes', v_storage, 'base_bytes', pg_database_size(current_database()));
end $$;
revoke execute on function public.uso_plataforma() from public, anon, authenticated;

-- Todos los asuntos de Hoy (docs/13 §4.1), sin mirar los pospuestos. p_ahora existe para las pruebas.
-- Solo tiendas activas o en prueba: una pausada o eliminada no pide nada.
create function public.asuntos_admin(p_ahora timestamptz default now(), p_uso jsonb default null)
returns table (clave text, regla text, categoria text, prioridad integer, tienda_id uuid, datos jsonb, accion text, desde timestamptz)
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_hoy date := (p_ahora at time zone 'America/Santo_Domingo')::date;
  v_uso jsonb := coalesce(p_uso, public.uso_plataforma());
  v_alm numeric := (v_uso ->> 'almacenamiento_bytes')::numeric / (public.regla_admin('almacenamiento_limite_mb')::numeric * 1048576) * 100;
  v_base numeric := (v_uso ->> 'base_bytes')::numeric / (public.regla_admin('base_limite_mb')::numeric * 1048576) * 100;
begin
  return query
  with t as (
    select x.*, public.estado_cobro(x.estado, x.prueba_hasta, x.pagado_hasta, x.dias_gracia, v_hoy) as cobro
    from public.tiendas x where x.estado in ('activa', 'en_prueba')
  )
  -- 1 · Plata: pago vencido (en gracia o fuera)
  select 'pago_vencido:' || t.id || ':' || t.pagado_hasta, 'pago_vencido', 'plata', 1, t.id,
    jsonb_build_object('pagado_hasta', t.pagado_hasta, 'dias_vencida', v_hoy - t.pagado_hasta, 'dias_gracia', t.dias_gracia,
      'en_gracia', t.cobro = 'en_gracia'),
    'escribir', ((t.pagado_hasta + 1)::timestamp at time zone 'America/Santo_Domingo')
  from t where t.cobro in ('en_gracia', 'vencida')
  union all
  -- 1 · Plata: la prueba termina en ≤ N días (o ya terminó) y nunca pagó
  select 'prueba_termina:' || t.id || ':' || t.prueba_hasta, 'prueba_termina', 'plata', 1, t.id,
    jsonb_build_object('prueba_hasta', t.prueba_hasta, 'dias', t.prueba_hasta - v_hoy),
    'escribir', ((t.prueba_hasta - public.regla_admin('prueba_termina_dias'))::timestamp at time zone 'America/Santo_Domingo')
  from t where t.estado = 'en_prueba' and t.pagado_hasta is null and t.prueba_hasta is not null
    and t.prueba_hasta <= v_hoy + public.regla_admin('prueba_termina_dias')
  union all
  -- 2 · Plata: vence en ≤ N días
  select 'vence_pronto:' || t.id || ':' || t.pagado_hasta, 'vence_pronto', 'plata', 2, t.id,
    jsonb_build_object('pagado_hasta', t.pagado_hasta, 'dias', t.pagado_hasta - v_hoy),
    'recordar', ((t.pagado_hasta - public.regla_admin('vence_pronto_dias'))::timestamp at time zone 'America/Santo_Domingo')
  from t where t.cobro = 'vence_pronto'
  union all
  -- 3 · Clientes: solicitudes del catálogo sin registrar con más de N horas
  select 'solicitudes:' || t.id || ':' || (s.mas_vieja at time zone 'America/Santo_Domingo')::date, 'solicitudes', 'clientes', 3, t.id,
    jsonb_build_object('cantidad', s.n, 'mas_vieja', s.mas_vieja), 'avisar', s.mas_vieja
  from t cross join lateral (
    select count(*)::integer as n, min(sp.creada_en) as mas_vieja from public.solicitudes_pedido sp
    where sp.tienda_id = t.id and sp.registrada_en is null and sp.descartada_en is null and sp.vence_en > p_ahora
      and sp.creada_en < p_ahora - make_interval(hours => public.regla_admin('solicitudes_sin_registrar_horas'))
  ) s where s.n > 0
  union all
  -- 3 · Clientes: catálogo pedido hace más de N días sin empezar
  select 'catalogo_solicitado:' || t.id || ':' || (t.catalogo_paso_en at time zone 'America/Santo_Domingo')::date, 'catalogo_solicitado', 'clientes', 3, t.id,
    jsonb_build_object('desde', t.catalogo_paso_en), 'empezar', t.catalogo_paso_en
  from t where t.catalogo_estado = 'solicitado'
    and t.catalogo_paso_en < p_ahora - make_interval(days => public.regla_admin('catalogo_solicitado_dias'))
  union all
  -- 3 · Clientes: pidió cambios hace más de N días
  select 'catalogo_cambios:' || t.id || ':' || (t.catalogo_paso_en at time zone 'America/Santo_Domingo')::date, 'catalogo_cambios', 'clientes', 3, t.id,
    jsonb_build_object('desde', t.catalogo_paso_en, 'notas', t.catalogo_notas_cambios), 'ver_cambios', t.catalogo_paso_en
  from t where t.catalogo_estado = 'cambios'
    and t.catalogo_paso_en < p_ahora - make_interval(days => public.regla_admin('catalogo_cambios_dias'))
  union all
  -- 4 · Se enfría: en prueba hace N días y sin productos
  select 'prueba_sin_productos:' || t.id, 'prueba_sin_productos', 'se_enfria', 4, t.id,
    jsonb_build_object('dias', v_hoy - (t.creado_en at time zone 'America/Santo_Domingo')::date), 'empujon', t.creado_en
  from t where t.estado = 'en_prueba'
    and t.creado_en < p_ahora - make_interval(days => public.regla_admin('prueba_sin_productos_dias'))
    and not exists (select 1 from public.productos p where p.tienda_id = t.id and p.eliminado_en is null)
  union all
  -- 4 · Se enfría: activa y nadie entra hace N días
  select 'sin_entrar:' || t.id || ':' || (coalesce(t.ultima_actividad_en, t.creado_en) at time zone 'America/Santo_Domingo')::date,
    'sin_entrar', 'se_enfria', 4, t.id,
    jsonb_build_object('ultima_actividad', coalesce(t.ultima_actividad_en, t.creado_en),
      'dias', v_hoy - (coalesce(t.ultima_actividad_en, t.creado_en) at time zone 'America/Santo_Domingo')::date),
    'escribir', coalesce(t.ultima_actividad_en, t.creado_en)
  from t where t.estado = 'activa'
    and coalesce(t.ultima_actividad_en, t.creado_en) < p_ahora - make_interval(days => public.regla_admin('sin_entrar_dias'))
  union all
  -- 4 · Se enfría: catálogo publicado y 0 pedidos (ni solicitudes) en N días
  select 'sin_pedidos:' || t.id || ':' || (u.ultimo at time zone 'America/Santo_Domingo')::date, 'sin_pedidos', 'se_enfria', 4, t.id,
    jsonb_build_object('ultimo', u.ultimo, 'dias', v_hoy - (u.ultimo at time zone 'America/Santo_Domingo')::date), 'escribir', u.ultimo
  from t cross join lateral (
    select greatest(coalesce(t.catalogo_publicado_en, t.catalogo_paso_en, t.creado_en),
      (select max(p.creado_en) from public.pedidos p where p.tienda_id = t.id),
      (select max(sp.creada_en) from public.solicitudes_pedido sp where sp.tienda_id = t.id)) as ultimo
  ) u
  where t.estado = 'activa' and t.catalogo_estado = 'publicado'
    and u.ultimo < p_ahora - make_interval(days => public.regla_admin('sin_pedidos_dias'))
  union all
  -- 5 · Trabajo: fotos por retocar (un solo asunto con el total y la más vieja)
  select 'fotos:' || (f.mas_vieja at time zone 'America/Santo_Domingo')::date, 'fotos', 'trabajo', 5, null::uuid,
    jsonb_build_object('total', f.n, 'tiendas', f.tiendas, 'mas_vieja', f.mas_vieja, 'tienda_mas_vieja', f.tienda_mas_vieja),
    'retocar', f.mas_vieja
  from (
    select count(*)::integer as n, count(distinct tr.tienda_id)::integer as tiendas, min(tr.creado_en) as mas_vieja,
      (array_agg(tr.tienda_id order by tr.creado_en, tr.id))[1] as tienda_mas_vieja
    from public.trabajos_retoque tr where tr.estado = 'pendiente'
  ) f where f.n > 0
  union all
  -- 5 · Trabajo: catálogo armándose sin avanzar en N días
  select 'catalogo_generando:' || t.id || ':' || coalesce(t.catalogo_paso, 1) || ':' || (t.catalogo_paso_en at time zone 'America/Santo_Domingo')::date,
    'catalogo_generando', 'trabajo', 5, t.id,
    jsonb_build_object('paso', coalesce(t.catalogo_paso, 1), 'desde', t.catalogo_paso_en), 'seguir', t.catalogo_paso_en
  from t where t.catalogo_estado = 'generando'
    and t.catalogo_paso_en < p_ahora - make_interval(days => public.regla_admin('catalogo_generando_dias'))
  union all
  -- 6 · Plataforma: almacenamiento o base por encima del N %
  select 'plataforma:' || m.metrica || ':' || (floor(m.pct / 10) * 10)::integer, 'plataforma', 'plataforma', 6, null::uuid,
    jsonb_build_object('metrica', m.metrica, 'porcentaje', round(m.pct)::integer), 'ver_salud', p_ahora
  from (values ('almacenamiento', v_alm), ('base', v_base)) as m(metrica, pct)
  where m.pct > public.regla_admin('plataforma_porcentaje');
end $$;
revoke execute on function public.asuntos_admin(timestamptz, jsonb) from public, anon, authenticated;

-- Salud de cada tienda (docs/13 §4.3) y su asunto más importante. Gana la primera que se cumpla.
create function public.salud_tiendas(p_ahora timestamptz default now())
returns table (tienda_id uuid, salud text, motivo jsonb)
language sql stable security definer set search_path = ''
as $$
  with a as (select * from public.asuntos_admin(p_ahora) where tienda_id is not null)
  select t.id,
    case
      when exists (select 1 from a where a.tienda_id = t.id and a.prioridad <= 3) then 'te_necesita'
      when t.catalogo_estado in ('solicitado', 'generando', 'cambios')
        or exists (select 1 from public.trabajos_retoque tr where tr.tienda_id = t.id and tr.estado = 'pendiente') then 'esperando_equipo'
      when exists (select 1 from a where a.tienda_id = t.id and a.categoria = 'se_enfria') then 'se_enfria'
      when t.ultima_actividad_en >= p_ahora - make_interval(days => public.regla_admin('viva_dias'))
        and (exists (select 1 from public.pedidos p where p.tienda_id = t.id and p.creado_en >= p_ahora - make_interval(days => public.regla_admin('viva_dias')))
          or exists (select 1 from public.eventos_aaah e where e.tienda_id = t.id and e.creado_en >= p_ahora - make_interval(days => public.regla_admin('viva_dias'))))
        then 'viva'
      else 'quieta'
    end,
    (select jsonb_build_object('regla', a.regla, 'clave', a.clave, 'datos', a.datos) from a where a.tienda_id = t.id order by a.prioridad, a.desde, a.clave limit 1)
  from public.tiendas t
$$;
revoke execute on function public.salud_tiendas(timestamptz) from public, anon, authenticated;

-- Mezcla b sobre a: los objetos se mezclan por clave (recursivo), un null borra la clave y lo demás reemplaza.
create function public.jsonb_mezclar(a jsonb, b jsonb) returns jsonb
language plpgsql immutable set search_path = ''
as $$
declare k text; v jsonb; r jsonb := coalesce(a, '{}'::jsonb);
begin
  if b is null or jsonb_typeof(b) <> 'object' then return b; end if;
  if jsonb_typeof(r) <> 'object' then r := '{}'::jsonb; end if;
  for k, v in select * from jsonb_each(b) loop
    if jsonb_typeof(v) = 'null' then r := r - k;
    elsif jsonb_typeof(v) = 'object' and jsonb_typeof(r -> k) = 'object' then r := jsonb_set(r, array[k], public.jsonb_mezclar(r -> k, v));
    else r := jsonb_set(r, array[k], v);
    end if;
  end loop;
  return r;
end $$;
revoke execute on function public.jsonb_mezclar(jsonb, jsonb) from public, anon, authenticated;

-- ¿El tema, los mensajes y las secciones de personalizacion son válidos? (docs/prompts/catalogo-react.md §5)
create function public.personalizacion_valida(p jsonb) returns boolean
language plpgsql immutable set search_path = ''
as $$
declare k text; v jsonb; e jsonb;
begin
  if p is null or jsonb_typeof(p) <> 'object' then return false; end if;
  -- tema: { colores: {nombre: #hex}, fuentes: {display, body}, cabecera: texto o SVG, tintes: {slug: {c: #hex, dark: bool}} }
  if p ? 'tema' then
    v := p -> 'tema';
    if jsonb_typeof(v) <> 'object' then return false; end if;
    if exists (select 1 from jsonb_object_keys(v) x where x not in ('colores', 'fuentes', 'cabecera', 'tintes')) then return false; end if;
    if v ? 'colores' then
      if jsonb_typeof(v -> 'colores') <> 'object' or (select count(*) from jsonb_object_keys(v -> 'colores')) > 30 then return false; end if;
      if exists (select 1 from jsonb_each(v -> 'colores') c
                 where c.key !~ '^[a-z0-9-]{1,30}$' or jsonb_typeof(c.value) <> 'string' or c.value #>> '{}' !~ '^#[0-9A-Fa-f]{6}$') then return false; end if;
    end if;
    if v ? 'fuentes' then
      if jsonb_typeof(v -> 'fuentes') <> 'object'
        or exists (select 1 from jsonb_object_keys(v -> 'fuentes') x where x not in ('display', 'body'))
        or not (v -> 'fuentes' ?& array['display', 'body']) then return false; end if;
      if exists (select 1 from jsonb_each(v -> 'fuentes') f
                 where jsonb_typeof(f.value) <> 'string' or f.value #>> '{}' !~ '^[A-Za-z0-9 ]{1,60}$') then return false; end if;
    end if;
    if v ? 'cabecera' and (jsonb_typeof(v -> 'cabecera') <> 'string' or char_length(v ->> 'cabecera') not between 1 and 60000) then return false; end if;
    if v ? 'tintes' then
      if jsonb_typeof(v -> 'tintes') <> 'object' or (select count(*) from jsonb_object_keys(v -> 'tintes')) > 300 then return false; end if;
      if exists (select 1 from jsonb_each(v -> 'tintes') x
                 where x.key !~ '^[a-z0-9]+(-[a-z0-9]+)*$' or char_length(x.key) > 80 or jsonb_typeof(x.value) <> 'object'
                   or exists (select 1 from jsonb_object_keys(x.value) y where y not in ('c', 'dark'))
                   or jsonb_typeof(x.value -> 'c') <> 'string' or x.value ->> 'c' !~ '^#[0-9A-Fa-f]{6}$'
                   or jsonb_typeof(x.value -> 'dark') <> 'boolean') then return false; end if;
    end if;
  end if;
  -- mensajes: { clave: texto (1–300) o lista de textos (1–20 de 1–200) }
  if p ? 'mensajes' then
    if jsonb_typeof(p -> 'mensajes') <> 'object' or (select count(*) from jsonb_object_keys(p -> 'mensajes')) > 30 then return false; end if;
    for k, v in select * from jsonb_each(p -> 'mensajes') loop
      if k !~ '^[a-z_]{1,40}$' then return false; end if;
      if jsonb_typeof(v) = 'string' then
        if char_length(v #>> '{}') not between 1 and 300 then return false; end if;
      elsif jsonb_typeof(v) = 'array' then
        if jsonb_array_length(v) not between 1 and 20 then return false; end if;
        for e in select value from jsonb_array_elements(v) loop
          if jsonb_typeof(e) <> 'string' or char_length(e #>> '{}') not between 1 and 200 then return false; end if;
        end loop;
      else return false;
      end if;
    end loop;
  end if;
  -- secciones: { clave: encendida }
  if p ? 'secciones' then
    if jsonb_typeof(p -> 'secciones') <> 'object' then return false; end if;
    if exists (select 1 from jsonb_each(p -> 'secciones') s where s.key !~ '^[a-z_]{1,40}$' or jsonb_typeof(s.value) <> 'boolean') then return false; end if;
  end if;
  return true;
end $$;
revoke execute on function public.personalizacion_valida(jsonb) from public, anon;
grant execute on function public.personalizacion_valida(jsonb) to authenticated;

-- ─── La tienda: actividad ───────────────────────────────────────────────────────────────────────────────────────────

-- (miembro) El panel lo llama al abrir. Marca la tienda y la persona como mucho cada N minutos. Devuelve si marcó.
create function public.marcar_actividad(p_tienda_id uuid) returns boolean
language plpgsql security definer set search_path = ''
as $$
declare v_corte timestamptz := now() - make_interval(mins => public.regla_admin('marcar_actividad_minutos')); v_n integer;
begin
  if p_tienda_id is null or p_tienda_id not in (select public.mis_tiendas()) then
    raise exception 'tienda_no_encontrada' using errcode = 'P0002';
  end if;
  update public.miembros set ultima_entrada_en = now()
  where usuario_id = (select auth.uid()) and tienda_id = p_tienda_id and (ultima_entrada_en is null or ultima_entrada_en < v_corte);
  get diagnostics v_n = row_count;
  update public.tiendas set ultima_actividad_en = now()
  where id = p_tienda_id and (ultima_actividad_en is null or ultima_actividad_en < v_corte);
  return v_n > 0;
end $$;
revoke execute on function public.marcar_actividad(uuid) from public, anon;
grant execute on function public.marcar_actividad(uuid) to authenticated;
