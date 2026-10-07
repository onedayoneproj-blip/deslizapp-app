-- Equipo y permisos (docs/prompts/colaboradores-e-invitaciones.md §3.2). Parte 4: abrir una tienda nueva solo con enlace de Deslizapp.
-- Un admin crea el enlace (Más › Invitaciones); quien lo abre con Google queda aprobado y crea su tienda con `crear_mi_tienda`.
-- Decisión de Planning: `crear_tienda` deja de ser ejecutable por `authenticated` (cualquier cuenta podía llamarla por la API); su
-- lógica vive en `crear_tienda_para`, sin acceso para la API, y la usan `crear_tienda` y `crear_mi_tienda`. Si Lewis quiere abrir
-- el registro más adelante, se vuelve a dar el permiso. Ningún dato de tiendas va aquí.

-- ─── La lógica de crear una tienda, una sola vez (misma que crear_tienda: slug, en_prueba, tope de 3 en prueba) ─────────
create function public.crear_tienda_para(p_uid uuid, p_nombre text, p_rubro text default 'general')
returns public.tiendas language plpgsql security definer set search_path = ''
as $$
declare
  v_nombre text := btrim(coalesce(p_nombre, ''));
  v_base text; v_slug text; v_n int := 1;
  v_tienda public.tiendas; v_email text;
begin
  if p_uid is null then raise exception 'sin_sesion' using errcode = '42501'; end if;
  if char_length(v_nombre) not between 1 and 80 then raise exception 'nombre_invalido' using errcode = '22023'; end if;
  if p_rubro is null or p_rubro not in ('perfumes', 'ropa', 'accesorios', 'belleza', 'comida', 'hogar', 'general') then
    raise exception 'rubro_invalido' using errcode = '22023';
  end if;
  if (select count(*) from public.miembros m join public.tiendas t on t.id = m.tienda_id
      where m.usuario_id = p_uid and m.rol = 'dueno' and t.estado = 'en_prueba') >= 3 then
    raise exception 'demasiadas_tiendas_en_prueba' using errcode = 'P0001';
  end if;
  v_base := lower(translate(v_nombre, 'ÁÉÍÓÚÜÑáéíóúüñ', 'AEIOUUNaeiouun'));
  v_base := btrim(regexp_replace(v_base, '[^a-z0-9]+', '-', 'g'), '-');
  if v_base = '' then v_base := 'tienda'; end if;
  v_base := left(v_base, 50);
  v_slug := v_base;
  while exists (select 1 from public.tiendas where slug = v_slug) loop
    v_n := v_n + 1; v_slug := v_base || '-' || v_n;
  end loop;
  insert into public.tiendas (slug, nombre, rubro) values (v_slug, v_nombre, p_rubro) returning * into v_tienda;
  insert into public.miembros (usuario_id, tienda_id, rol) values (p_uid, v_tienda.id, 'dueno');
  select email into v_email from auth.users where id = p_uid;
  insert into public.usuarios (id, tienda_id, email, rol) values (p_uid, v_tienda.id, lower(coalesce(v_email, '')), 'dueno')
  on conflict (id) do update set tienda_id = coalesce(public.usuarios.tienda_id, excluded.tienda_id);
  return v_tienda;
end $$;
revoke execute on function public.crear_tienda_para(uuid, text, text) from public, anon, authenticated;

create or replace function public.crear_tienda(p_nombre text, p_rubro text default 'general')
returns public.tiendas language plpgsql security definer set search_path = ''
as $$
begin
  return public.crear_tienda_para((select auth.uid()), p_nombre, p_rubro);
end $$;
revoke execute on function public.crear_tienda(text, text) from public, anon, authenticated;

-- ─── Admin: enlaces de tienda nueva ─────────────────────────────────────────────────────────────────────────────────────
-- El registro del admin anota el enlace (id y nota), NUNCA el código.
create function public.admin_crear_enlace_tienda_nueva(p_nota text default null)
returns text language plpgsql security definer set search_path = ''
as $$
declare v_codigo text; v_nota text := nullif(btrim(coalesce(p_nota, '')), ''); v_id uuid;
begin
  if not public.soy_admin() then raise exception 'no_admin' using errcode = '42501'; end if;
  if char_length(v_nota) > 40 then raise exception 'nota_invalida' using errcode = '22023'; end if;
  v_codigo := public.codigo_enlace_nuevo();
  insert into public.enlaces_invitacion (tipo, nota, creado_por, codigo_hash)
  values ('tienda_nueva', v_nota, (select auth.uid()), public.hash_enlace(v_codigo)) returning id into v_id;
  perform public.anotar_admin(null, 'enlace_tienda_nueva', jsonb_build_object('enlace_id', v_id, 'nota', v_nota));
  return v_codigo;
end $$;
revoke execute on function public.admin_crear_enlace_tienda_nueva(text) from public, anon;
grant execute on function public.admin_crear_enlace_tienda_nueva(text) to authenticated;

create function public.admin_enlaces_tienda_nueva()
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
begin
  if not public.soy_admin() then raise exception 'no_admin' using errcode = '42501'; end if;
  return (select coalesce(jsonb_agg(jsonb_build_object(
      'id', e.id, 'nota', e.nota, 'estado', public.estado_enlace(e.estado, e.vence_en, e.reclamado_en),
      'creado_en', e.creado_en, 'vence_en', e.vence_en, 'reclamado_en', e.reclamado_en,
      'correo', e.correo_visto, 'nombre', e.nombre_visto, 'tienda_creada', t.nombre
    ) order by e.creado_en desc), '[]'::jsonb)
    from (select * from public.enlaces_invitacion where tipo = 'tienda_nueva' order by creado_en desc limit 50) e
    left join public.tiendas t on t.id = e.tienda_creada_id);
end $$;
revoke execute on function public.admin_enlaces_tienda_nueva() from public, anon;
grant execute on function public.admin_enlaces_tienda_nueva() to authenticated;

create function public.admin_cancelar_enlace_tienda(p_enlace_id uuid)
returns void language plpgsql security definer set search_path = ''
as $$
declare e public.enlaces_invitacion;
begin
  if not public.soy_admin() then raise exception 'no_admin' using errcode = '42501'; end if;
  select * into e from public.enlaces_invitacion where id = p_enlace_id and tipo = 'tienda_nueva' for update;
  if not found or public.estado_enlace(e.estado, e.vence_en, e.reclamado_en) <> 'activo' then
    raise exception 'enlace_no_valido' using errcode = 'P0001';
  end if;
  update public.enlaces_invitacion set estado = 'cancelado', decidido_por = (select auth.uid()), decidido_en = now() where id = e.id;
  perform public.anotar_admin(null, 'cancelar_enlace_tienda', jsonb_build_object('enlace_id', e.id));
end $$;
revoke execute on function public.admin_cancelar_enlace_tienda(uuid) from public, anon;
grant execute on function public.admin_cancelar_enlace_tienda(uuid) to authenticated;

-- ─── Quien abrió un enlace de tienda nueva: crea su tienda (una sola vez) ──────────────────────────────────────────────
-- Recibe el id del enlace (no el código: la app ya lo borró de la barra). Solo quien lo reclamó, con el enlace aprobado y sin
-- tienda creada. El enlace queda `usado`.
create function public.crear_mi_tienda(p_enlace_id uuid, p_nombre text, p_rubro text default 'general')
returns public.tiendas language plpgsql security definer set search_path = ''
as $$
declare v_uid uuid := (select auth.uid()); e public.enlaces_invitacion; v public.tiendas;
begin
  if v_uid is null then raise exception 'sin_sesion' using errcode = '42501'; end if;
  select * into e from public.enlaces_invitacion
  where id = p_enlace_id and tipo = 'tienda_nueva' and reclamado_por = v_uid for update;
  if not found or e.estado <> 'aprobado' or e.tienda_creada_id is not null then
    raise exception 'enlace_no_valido' using errcode = 'P0001';
  end if;
  v := public.crear_tienda_para(v_uid, p_nombre, p_rubro);
  update public.enlaces_invitacion set estado = 'usado', tienda_creada_id = v.id where id = e.id;
  update public.usuarios set tienda_id = v.id where id = v_uid;
  return v;
end $$;
revoke execute on function public.crear_mi_tienda(uuid, text, text) from public, anon;
grant execute on function public.crear_mi_tienda(uuid, text, text) to authenticated;
