-- Equipo y permisos (docs/prompts/colaboradores-e-invitaciones.md §3.1). Parte 3: invitar colaboradores por ENLACE.
-- El enlace sirve UNA vez (se consume al abrirlo) y el dueño aprueba a quien lo abrió. El código se guarda SOLO como hash
-- (SHA-256); el código en claro se devuelve una vez al crearlo y nunca se guarda. Todo pasa por funciones; nadie escribe la tabla.
-- La tabla `invitaciones` (por correo) se conserva aparte. Ningún dato de tiendas va aquí.

create table public.enlaces_invitacion (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('colaborador', 'tienda_nueva')),
  tienda_id uuid references public.tiendas (id) on delete cascade,
  nivel text check (nivel in ('ayudante', 'editor', 'administrador')),
  nota text check (nota is null or char_length(nota) between 1 and 40),
  creado_por uuid not null references auth.users (id) on delete cascade,
  creado_en timestamptz not null default now(),
  vence_en timestamptz not null default now() + interval '7 days',
  codigo_hash text not null unique check (codigo_hash ~ '^[0-9a-f]{64}$'),
  estado text not null default 'activo'
    check (estado in ('activo', 'esperando', 'aprobado', 'rechazado', 'cancelado', 'vencido', 'usado')),
  reclamado_por uuid references auth.users (id) on delete set null,
  reclamado_en timestamptz,
  correo_visto text check (correo_visto is null or char_length(correo_visto) <= 320),
  nombre_visto text check (nombre_visto is null or char_length(nombre_visto) <= 120),
  decidido_por uuid references auth.users (id) on delete set null,
  decidido_en timestamptz,
  tienda_creada_id uuid references public.tiendas (id) on delete set null,
  constraint enlaces_tipo_coherente check (
    (tipo = 'colaborador' and tienda_id is not null and nivel is not null and tienda_creada_id is null)
    or (tipo = 'tienda_nueva' and tienda_id is null and nivel is null))
);
comment on table public.enlaces_invitacion is
  'Enlaces de un solo uso: colaborador (lo crea el dueño, aprueba el dueño) o tienda_nueva (lo crea un admin). Solo el hash del código.';
create index enlaces_invitacion_tienda on public.enlaces_invitacion (tienda_id, estado);
create index enlaces_invitacion_reclamado on public.enlaces_invitacion (reclamado_por) where reclamado_por is not null;

-- RLS: anon nada. El dueño ve los de sus tiendas; los de tienda nueva, solo los admins. Nadie ve el hash ni quién lo creó.
alter table public.enlaces_invitacion enable row level security;
revoke all on public.enlaces_invitacion from public, anon, authenticated;
grant select (id, tipo, tienda_id, nivel, nota, creado_en, vence_en, estado, reclamado_en, correo_visto, nombre_visto, decidido_en, tienda_creada_id)
  on public.enlaces_invitacion to authenticated;
create policy enlaces_dueno_ver on public.enlaces_invitacion for select to authenticated
  using (tipo = 'colaborador' and tienda_id in (select public.mis_tiendas_con_permiso('equipo')));
create policy enlaces_admin_ver on public.enlaces_invitacion for select to authenticated
  using (tipo = 'tienda_nueva' and (select public.soy_admin()));

-- ─── Apoyo: estado efectivo y código nuevo ─────────────────────────────────────────────────────────────────────────────
-- Un enlace activo vence a los 7 días de creado; una solicitud sin decidir, a los 7 días de abierta.
create function public.estado_enlace(p_estado text, p_vence_en timestamptz, p_reclamado_en timestamptz) returns text
language sql stable set search_path = ''
as $$
  select case
    when p_estado = 'activo' and p_vence_en <= now() then 'vencido'
    when p_estado = 'esperando' and p_reclamado_en <= now() - interval '7 days' then 'vencido'
    else p_estado end
$$;
revoke execute on function public.estado_enlace(text, timestamptz, timestamptz) from public, anon;
grant execute on function public.estado_enlace(text, timestamptz, timestamptz) to authenticated;

-- 256 bits aleatorios (dos gen_random_uuid, que usan el generador fuerte de Postgres; 244 bits de azar real) en base64url.
create function public.codigo_enlace_nuevo() returns text
language sql volatile set search_path = ''
as $$
  select rtrim(translate(encode(uuid_send(gen_random_uuid()) || uuid_send(gen_random_uuid()), 'base64'), '+/', '-_'), '=')
$$;
revoke execute on function public.codigo_enlace_nuevo() from public, anon, authenticated;

create function public.hash_enlace(p_codigo text) returns text
language sql immutable set search_path = ''
as $$ select encode(sha256(convert_to(coalesce(p_codigo, ''), 'UTF8')), 'hex') $$;
revoke execute on function public.hash_enlace(text) from public, anon, authenticated;

-- ─── Dueño: crear un enlace de colaborador (devuelve el código UNA vez) ────────────────────────────────────────────────
create function public.crear_enlace_colaborador(p_tienda_id uuid, p_nivel text default 'ayudante', p_nota text default null)
returns text language plpgsql security definer set search_path = ''
as $$
declare v_codigo text; v_nota text := nullif(btrim(coalesce(p_nota, '')), ''); v_nivel text := coalesce(p_nivel, 'ayudante');
begin
  perform public.exigir_no_viendo(p_tienda_id);
  perform public.exigir_permiso(p_tienda_id, 'equipo');
  if p_tienda_id is null or p_tienda_id not in (select public.mis_tiendas()) or not public.soy_dueno(p_tienda_id) then
    raise exception 'solo_dueno' using errcode = '42501';
  end if;
  if v_nivel not in ('ayudante', 'editor', 'administrador') then raise exception 'nivel_invalido' using errcode = '22023'; end if;
  if char_length(v_nota) > 40 then raise exception 'nota_invalida' using errcode = '22023'; end if;
  if not public.puede_sumar_colaborador(p_tienda_id) then raise exception 'limite_colaboradores' using errcode = 'P0001'; end if;
  if (select count(*) from public.enlaces_invitacion where tienda_id = p_tienda_id and estado = 'activo' and vence_en > now()) >= 20 then
    raise exception 'demasiados_enlaces' using errcode = 'P0001';
  end if;
  v_codigo := public.codigo_enlace_nuevo();
  insert into public.enlaces_invitacion (tipo, tienda_id, nivel, nota, creado_por, codigo_hash)
  values ('colaborador', p_tienda_id, v_nivel, v_nota, (select auth.uid()), public.hash_enlace(v_codigo));
  return v_codigo;
end $$;
revoke execute on function public.crear_enlace_colaborador(uuid, text, text) from public, anon;
grant execute on function public.crear_enlace_colaborador(uuid, text, text) to authenticated;

-- ─── Quien abre el enlace: lo reclama (se consume) ────────────────────────────────────────────────────────────────────
-- Solo cuentas de Google con correo verificado. Cualquier fallo devuelve el MISMO error (`enlace_no_valido`): no se revela si
-- venció, si ya se usó o si no existe. Si quien lo reclamó vuelve a abrirlo, ve su propio estado. Colaborador: queda
-- `esperando` (todavía NO es miembro). Tienda nueva: queda `aprobado` (es de un admin; no aprueba nadie más).
create function public.reclamar_enlace(p_codigo text)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare v_uid uuid := (select auth.uid()); u record; e public.enlaces_invitacion;
begin
  if v_uid is null then raise exception 'sin_sesion' using errcode = '42501'; end if;
  select id, lower(email) as email, left(coalesce(raw_user_meta_data ->> 'full_name', raw_user_meta_data ->> 'name', ''), 120) as nombre
  into u from auth.users
  where id = v_uid and raw_app_meta_data ->> 'provider' = 'google' and email_confirmed_at is not null;
  if not found then raise exception 'enlace_no_valido' using errcode = 'P0001'; end if;
  if p_codigo is null or p_codigo !~ '^[A-Za-z0-9_-]{30,60}$' then raise exception 'enlace_no_valido' using errcode = 'P0001'; end if;
  select * into e from public.enlaces_invitacion where codigo_hash = public.hash_enlace(p_codigo) for update;
  if not found then raise exception 'enlace_no_valido' using errcode = 'P0001'; end if;
  if e.reclamado_por = v_uid then
    return jsonb_build_object('id', e.id, 'tipo', e.tipo, 'estado', public.estado_enlace(e.estado, e.vence_en, e.reclamado_en),
      'tienda_nombre', (select nombre from public.tiendas where id = coalesce(e.tienda_id, e.tienda_creada_id)));
  end if;
  if public.estado_enlace(e.estado, e.vence_en, e.reclamado_en) <> 'activo' or e.creado_por = v_uid then
    raise exception 'enlace_no_valido' using errcode = 'P0001';
  end if;
  if e.tipo = 'colaborador' then
    perform public.exigir_no_viendo(e.tienda_id);
    if exists (select 1 from public.miembros where tienda_id = e.tienda_id and usuario_id = v_uid)
       or not exists (select 1 from public.tiendas where id = e.tienda_id and estado <> 'eliminada') then
      raise exception 'enlace_no_valido' using errcode = 'P0001';
    end if;
    update public.enlaces_invitacion set estado = 'esperando', reclamado_por = v_uid, reclamado_en = now(),
      correo_visto = left(u.email, 320), nombre_visto = nullif(u.nombre, '')
    where id = e.id returning * into e;
  else
    update public.enlaces_invitacion set estado = 'aprobado', reclamado_por = v_uid, reclamado_en = now(),
      correo_visto = left(u.email, 320), nombre_visto = nullif(u.nombre, ''), decidido_por = e.creado_por, decidido_en = now()
    where id = e.id returning * into e;
  end if;
  return jsonb_build_object('id', e.id, 'tipo', e.tipo, 'estado', e.estado,
    'tienda_nombre', (select nombre from public.tiendas where id = e.tienda_id));
end $$;
revoke execute on function public.reclamar_enlace(text) from public, anon;
grant execute on function public.reclamar_enlace(text) to authenticated;

-- Lo que esta cuenta abrió y sigue pendiente o recién resuelto (para «Esperando que te aprueben» y «Crea tu tienda»).
create function public.mis_solicitudes() returns jsonb
language sql stable security definer set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', e.id, 'tipo', e.tipo, 'estado', public.estado_enlace(e.estado, e.vence_en, e.reclamado_en),
    'tienda_nombre', t.nombre, 'reclamado_en', e.reclamado_en, 'tienda_creada', e.tienda_creada_id is not null
  ) order by e.reclamado_en desc), '[]'::jsonb)
  from public.enlaces_invitacion e left join public.tiendas t on t.id = e.tienda_id
  where e.reclamado_por = (select auth.uid()) and e.reclamado_en > now() - interval '30 days'
    and e.estado in ('esperando', 'aprobado', 'rechazado')
$$;
revoke execute on function public.mis_solicitudes() from public, anon;
grant execute on function public.mis_solicitudes() to authenticated;

-- ─── Dueño: aprobar, rechazar, cancelar, cambiar nivel ────────────────────────────────────────────────────────────────
create function public.aprobar_miembro(p_enlace_id uuid, p_nivel text default null)
returns void language plpgsql security definer set search_path = ''
as $$
declare e public.enlaces_invitacion; v_nivel text;
begin
  select * into e from public.enlaces_invitacion where id = p_enlace_id and tipo = 'colaborador' for update;
  perform public.exigir_no_viendo(e.tienda_id);
  perform public.exigir_permiso(e.tienda_id, 'equipo');
  if e.id is null or e.tienda_id not in (select public.mis_tiendas()) or not public.soy_dueno(e.tienda_id) then
    raise exception 'solo_dueno' using errcode = '42501';
  end if;
  if public.estado_enlace(e.estado, e.vence_en, e.reclamado_en) <> 'esperando' then raise exception 'solicitud_no_valida' using errcode = 'P0001'; end if;
  v_nivel := coalesce(p_nivel, e.nivel);
  if v_nivel not in ('ayudante', 'editor', 'administrador') then raise exception 'nivel_invalido' using errcode = '22023'; end if;
  if not public.puede_sumar_colaborador(e.tienda_id) then raise exception 'limite_colaboradores' using errcode = 'P0001'; end if;
  insert into public.miembros (usuario_id, tienda_id, rol, nivel) values (e.reclamado_por, e.tienda_id, 'staff', v_nivel)
  on conflict (usuario_id, tienda_id) do nothing;
  insert into public.usuarios (id, tienda_id, email, nombre, rol)
  values (e.reclamado_por, e.tienda_id, coalesce(e.correo_visto, ''), coalesce(e.nombre_visto, ''), 'staff')
  on conflict (id) do update set tienda_id = coalesce(public.usuarios.tienda_id, excluded.tienda_id);
  update public.enlaces_invitacion set estado = 'aprobado', nivel = v_nivel, decidido_por = (select auth.uid()), decidido_en = now()
  where id = e.id;
end $$;
revoke execute on function public.aprobar_miembro(uuid, text) from public, anon;
grant execute on function public.aprobar_miembro(uuid, text) to authenticated;

create function public.rechazar_miembro(p_enlace_id uuid)
returns void language plpgsql security definer set search_path = ''
as $$
declare e public.enlaces_invitacion;
begin
  select * into e from public.enlaces_invitacion where id = p_enlace_id and tipo = 'colaborador' for update;
  perform public.exigir_no_viendo(e.tienda_id);
  perform public.exigir_permiso(e.tienda_id, 'equipo');
  if e.id is null or e.tienda_id not in (select public.mis_tiendas()) or not public.soy_dueno(e.tienda_id) then
    raise exception 'solo_dueno' using errcode = '42501';
  end if;
  if public.estado_enlace(e.estado, e.vence_en, e.reclamado_en) <> 'esperando' then raise exception 'solicitud_no_valida' using errcode = 'P0001'; end if;
  update public.enlaces_invitacion set estado = 'rechazado', decidido_por = (select auth.uid()), decidido_en = now() where id = e.id;
end $$;
revoke execute on function public.rechazar_miembro(uuid) from public, anon;
grant execute on function public.rechazar_miembro(uuid) to authenticated;

create function public.cancelar_enlace(p_enlace_id uuid)
returns void language plpgsql security definer set search_path = ''
as $$
declare e public.enlaces_invitacion;
begin
  select * into e from public.enlaces_invitacion where id = p_enlace_id and tipo = 'colaborador' for update;
  perform public.exigir_no_viendo(e.tienda_id);
  perform public.exigir_permiso(e.tienda_id, 'equipo');
  if e.id is null or e.tienda_id not in (select public.mis_tiendas()) or not public.soy_dueno(e.tienda_id) then
    raise exception 'solo_dueno' using errcode = '42501';
  end if;
  if public.estado_enlace(e.estado, e.vence_en, e.reclamado_en) <> 'activo' then raise exception 'enlace_no_valido' using errcode = 'P0001'; end if;
  update public.enlaces_invitacion set estado = 'cancelado', decidido_por = (select auth.uid()), decidido_en = now() where id = e.id;
end $$;
revoke execute on function public.cancelar_enlace(uuid) from public, anon;
grant execute on function public.cancelar_enlace(uuid) to authenticated;

create function public.cambiar_nivel(p_tienda_id uuid, p_usuario_id uuid, p_nivel text)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  perform public.exigir_no_viendo(p_tienda_id);
  perform public.exigir_permiso(p_tienda_id, 'equipo');
  if p_tienda_id is null or p_tienda_id not in (select public.mis_tiendas()) or not public.soy_dueno(p_tienda_id) then
    raise exception 'solo_dueno' using errcode = '42501';
  end if;
  if p_nivel is null or p_nivel not in ('ayudante', 'editor', 'administrador') then raise exception 'nivel_invalido' using errcode = '22023'; end if;
  update public.miembros set nivel = p_nivel where tienda_id = p_tienda_id and usuario_id = p_usuario_id and rol = 'staff';
  if not found then raise exception 'no_es_colaborador' using errcode = 'P0002'; end if;
end $$;
revoke execute on function public.cambiar_nivel(uuid, uuid, text) from public, anon;
grant execute on function public.cambiar_nivel(uuid, uuid, text) to authenticated;

-- ─── Dueño: «Tu equipo» en una sola lectura ──────────────────────────────────────────────────────────────────────────
-- Miembros (con nombre y correo de Google), solicitudes que esperan su visto bueno y enlaces activos (sin código ni hash).
create function public.equipo_de_tienda(p_tienda_id uuid) returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
begin
  if p_tienda_id is null or p_tienda_id not in (select public.mis_tiendas()) or not public.soy_dueno(p_tienda_id) then
    raise exception 'solo_dueno' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'miembros', (select coalesce(jsonb_agg(jsonb_build_object(
        'usuario_id', m.usuario_id, 'rol', m.rol, 'nivel', m.nivel, 'desde', m.creado_en,
        'nombre', coalesce(nullif(us.nombre, ''), u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name', ''),
        'email', coalesce(u.email, us.email, ''), 'foto', u.raw_user_meta_data ->> 'avatar_url',
        'soy_yo', m.usuario_id = (select auth.uid())
      ) order by (m.rol = 'dueno') desc, m.creado_en), '[]'::jsonb)
      from public.miembros m left join auth.users u on u.id = m.usuario_id left join public.usuarios us on us.id = m.usuario_id
      where m.tienda_id = p_tienda_id),
    'solicitudes', (select coalesce(jsonb_agg(jsonb_build_object(
        'id', e.id, 'nivel', e.nivel, 'nota', e.nota, 'nombre', coalesce(e.nombre_visto, ''), 'email', coalesce(e.correo_visto, ''),
        'reclamado_en', e.reclamado_en) order by e.reclamado_en), '[]'::jsonb)
      from public.enlaces_invitacion e
      where e.tienda_id = p_tienda_id and public.estado_enlace(e.estado, e.vence_en, e.reclamado_en) = 'esperando'),
    'enlaces', (select coalesce(jsonb_agg(jsonb_build_object(
        'id', e.id, 'nivel', e.nivel, 'nota', e.nota, 'creado_en', e.creado_en, 'vence_en', e.vence_en) order by e.creado_en desc), '[]'::jsonb)
      from public.enlaces_invitacion e
      where e.tienda_id = p_tienda_id and public.estado_enlace(e.estado, e.vence_en, e.reclamado_en) = 'activo'),
    'invitaciones', (select coalesce(jsonb_agg(jsonb_build_object('email', i.email, 'nivel', i.nivel, 'rol', i.rol, 'creado_en', i.creado_en)
        order by i.creado_en), '[]'::jsonb)
      from public.invitaciones i where i.tienda_id = p_tienda_id)
  );
end $$;
revoke execute on function public.equipo_de_tienda(uuid) from public, anon;
grant execute on function public.equipo_de_tienda(uuid) to authenticated;
