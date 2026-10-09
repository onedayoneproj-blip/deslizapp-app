-- Onboarding, parte 1 (docs/17-onboarding.md, docs/prompts/onboarding-1-historias-y-datos.md).
--
-- 1. tiendas.onboarding: lo visto/hecho del onboarding, en la base (no en el teléfono). Claves con timestamp ISO:
--    intro_vista_en, colores_elegidos_en, pantalla_inicio_en, equipo_omitido_en, checklist_cerrado_en.
--    Las tiendas que ya existen quedan con todo visto, menos la Tienda de ensayo (para probar) y Soft Era (es nueva).
-- 2. slug_tienda_libre: el cálculo del slug, una sola vez. Lo usan crear_tienda_para (misma firma) y vista_slug (vista previa del
--    capítulo 1: lo que devuelve la base, no una copia del algoritmo en la app).
-- 3. crear_mi_tienda_completa: crea la tienda de un enlace con nombre, rubros, WhatsApp y nombre de la vendedora en una sola
--    transacción. crear_mi_tienda sigue existiendo sin cambios.
-- 4. marcar_onboarding: el dueño marca una clave de la lista (no borra ninguna; si ya estaba, conserva la primera fecha).
-- 5. publicar_mi_catalogo: el mínimo sube de 3 a 5 productos con foto (lib/config.ts: PRODUCTOS_MINIMOS_PARA_PUBLICAR).

-- ─── 1. La columna y el relleno ──────────────────────────────────────────────────────────────────────────────────────────
alter table public.tiendas add column onboarding jsonb not null default '{}'::jsonb;
alter table public.tiendas add constraint tiendas_onboarding_check check (jsonb_typeof(onboarding) = 'object');

update public.tiendas
set onboarding = jsonb_build_object('checklist_cerrado_en', now(), 'intro_vista_en', now())
where slug not in ('tienda-de-ensayo', 'soft-era');

-- ─── 2. El slug, una sola vez ────────────────────────────────────────────────────────────────────────────────────────────
-- Interna (sin acceso para la API). Mismo cálculo que tenía crear_tienda_para: sin tildes, minúsculas, guiones, 50 letras,
-- y -2, -3… si ya existe.
create function public.slug_tienda_libre(p_nombre text)
returns text language plpgsql stable security definer set search_path = ''
as $$
declare v_base text; v_slug text; v_n int := 1;
begin
  v_base := lower(translate(btrim(coalesce(p_nombre, '')), 'ÁÉÍÓÚÜÑáéíóúüñ', 'AEIOUUNaeiouun'));
  v_base := btrim(regexp_replace(v_base, '[^a-z0-9]+', '-', 'g'), '-');
  if v_base = '' then v_base := 'tienda'; end if;
  v_base := btrim(left(v_base, 50), '-');
  v_slug := v_base;
  while exists (select 1 from public.tiendas where slug = v_slug) loop
    v_n := v_n + 1; v_slug := v_base || '-' || v_n;
  end loop;
  return v_slug;
end $$;
revoke execute on function public.slug_tienda_libre(text) from public, anon, authenticated;

-- Misma firma y mismo comportamiento; el slug sale de slug_tienda_libre.
create or replace function public.crear_tienda_para(p_uid uuid, p_nombre text, p_rubro text default 'general')
returns public.tiendas language plpgsql security definer set search_path = ''
as $$
declare
  v_nombre text := btrim(coalesce(p_nombre, ''));
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
  insert into public.tiendas (slug, nombre, rubro) values (public.slug_tienda_libre(v_nombre), v_nombre, p_rubro) returning * into v_tienda;
  insert into public.miembros (usuario_id, tienda_id, rol) values (p_uid, v_tienda.id, 'dueno');
  select email into v_email from auth.users where id = p_uid;
  insert into public.usuarios (id, tienda_id, email, rol) values (p_uid, v_tienda.id, lower(coalesce(v_email, '')), 'dueno')
  on conflict (id) do update set tienda_id = coalesce(public.usuarios.tienda_id, excluded.tienda_id);
  return v_tienda;
end $$;
revoke execute on function public.crear_tienda_para(uuid, text, text) from public, anon, authenticated;

-- Vista previa del enlace («Así nace tu enlace»): solo lectura. Nombre vacío o de más de 80 letras: null.
create function public.vista_slug(p_nombre text)
returns text language plpgsql stable security definer set search_path = ''
as $$
declare v_nombre text := btrim(coalesce(p_nombre, ''));
begin
  if (select auth.uid()) is null then raise exception 'sin_sesion' using errcode = '42501'; end if;
  if char_length(v_nombre) not between 1 and 80 then return null; end if;
  return public.slug_tienda_libre(v_nombre);
end $$;
revoke execute on function public.vista_slug(text) from public, anon;
grant execute on function public.vista_slug(text) to authenticated;

-- ─── 3. Crear la tienda con todo junto ───────────────────────────────────────────────────────────────────────────────────
-- Mismas comprobaciones del enlace que crear_mi_tienda. Rubros: 1 a 7 de la lista, sin repetir; el primero es el principal.
-- WhatsApp: solo dígitos (la app ya lo normalizó). Nombre de la vendedora: 1 a 40.
create function public.crear_mi_tienda_completa(
  p_enlace_id uuid, p_nombre text, p_rubros text[], p_whatsapp text, p_nombre_vendedora text
)
returns public.tiendas language plpgsql security definer set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid()); e public.enlaces_invitacion; v public.tiendas;
  v_vendedora text := btrim(coalesce(p_nombre_vendedora, ''));
  v_whatsapp text := btrim(coalesce(p_whatsapp, ''));
begin
  if v_uid is null then raise exception 'sin_sesion' using errcode = '42501'; end if;
  select * into e from public.enlaces_invitacion
  where id = p_enlace_id and tipo = 'tienda_nueva' and reclamado_por = v_uid for update;
  if not found or e.estado <> 'aprobado' or e.tienda_creada_id is not null then
    raise exception 'enlace_no_valido' using errcode = 'P0001';
  end if;
  if p_rubros is null or cardinality(p_rubros) not between 1 and 7
    or array_position(p_rubros, null) is not null
    or not (p_rubros <@ array['perfumes', 'ropa', 'accesorios', 'belleza', 'comida', 'hogar', 'general']::text[])
    or (select count(distinct r) from unnest(p_rubros) r) <> cardinality(p_rubros) then
    raise exception 'rubros_invalidos' using errcode = '22023';
  end if;
  if v_whatsapp !~ '^[0-9]{10,15}$' then raise exception 'whatsapp_invalido' using errcode = '22023'; end if;
  if char_length(v_vendedora) not between 1 and 40 then raise exception 'nombre_vendedora_invalido' using errcode = '22023'; end if;

  v := public.crear_tienda_para(v_uid, p_nombre, p_rubros[1]);
  update public.tiendas
  set rubros = p_rubros, whatsapp = v_whatsapp, nombre_vendedora = v_vendedora,
      onboarding = onboarding || jsonb_build_object('intro_vista_en', now())
  where id = v.id returning * into v;
  update public.enlaces_invitacion set estado = 'usado', tienda_creada_id = v.id where id = e.id;
  update public.usuarios set tienda_id = v.id where id = v_uid;
  return v;
end $$;
revoke execute on function public.crear_mi_tienda_completa(uuid, text, text[], text, text) from public, anon;
grant execute on function public.crear_mi_tienda_completa(uuid, text, text[], text, text) to authenticated;

-- ─── 4. Marcar un paso del onboarding ────────────────────────────────────────────────────────────────────────────────────
create function public.marcar_onboarding(p_tienda_id uuid, p_clave text)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare v jsonb;
begin
  perform public.exigir_no_viendo(p_tienda_id);
  if (select auth.uid()) is null or p_tienda_id is null or not public.soy_dueno(p_tienda_id) then
    raise exception 'solo_dueno' using errcode = '42501', hint = 'Esto lo hace quien administra la tienda.';
  end if;
  if p_clave is null or p_clave not in
    ('intro_vista_en', 'colores_elegidos_en', 'pantalla_inicio_en', 'equipo_omitido_en', 'checklist_cerrado_en') then
    raise exception 'clave_invalida' using errcode = '22023';
  end if;
  update public.tiendas
  set onboarding = case when onboarding ? p_clave then onboarding else onboarding || jsonb_build_object(p_clave, now()) end
  where id = p_tienda_id and estado <> 'eliminada'
  returning onboarding into v;
  if not found then raise exception 'tienda_no_encontrada' using errcode = 'P0002'; end if;
  return v;
end $$;
revoke execute on function public.marcar_onboarding(uuid, text) from public, anon;
grant execute on function public.marcar_onboarding(uuid, text) to authenticated;

-- ─── 5. Publicar: mínimo de 5 ────────────────────────────────────────────────────────────────────────────────────────────
create or replace function public.publicar_mi_catalogo(p_tienda_id uuid)
returns public.tiendas
language plpgsql security definer set search_path = ''
as $$
declare
  -- Mínimo para publicar (lib/config.ts: PRODUCTOS_MINIMOS_PARA_PUBLICAR). Subió de 3 a 5 con el onboarding (docs/17).
  v_minimo constant integer := 5;
  -- Base de la dirección del catálogo (lib/config.ts: URL_BASE). Nunca una dirección escrita por el usuario.
  v_base constant text := 'https://deslizapp-app.vercel.app';
  v public.tiendas;
begin
  perform public.exigir_no_viendo(p_tienda_id);
  perform public.exigir_permiso(p_tienda_id, 'equipo');
  if p_tienda_id is null or p_tienda_id not in (select public.mis_tiendas_con_eliminadas()) then
    raise exception 'tienda_no_encontrada' using errcode = 'P0002';
  end if;
  if not public.soy_dueno(p_tienda_id) then
    raise exception 'solo_dueno' using errcode = '42501', hint = 'Esto lo hace quien administra la tienda.';
  end if;
  select * into v from public.tiendas where id = p_tienda_id for update;
  if not found or v.estado = 'eliminada' then raise exception 'tienda_no_encontrada' using errcode = 'P0002'; end if;
  if v.estado = 'pausada' then raise exception 'tienda_pausada' using errcode = 'P0001'; end if;
  -- Ya en línea: nada que hacer (un doble toque no es un error).
  if v.catalogo_estado = 'publicado' then return v; end if;
  -- Un catálogo que el equipo está armando o que espera revisión sigue su flujo; aquí no se pisa.
  if v.catalogo_estado <> 'sin' then raise exception 'catalogo_en_curso' using errcode = 'P0001'; end if;
  if public.productos_para_publicar(p_tienda_id) < v_minimo then
    raise exception 'catalogo_incompleto' using errcode = 'P0001';
  end if;
  update public.tiendas
  set catalogo_estado = 'publicado',
      catalogo_publicado_en = coalesce(catalogo_publicado_en, now()),
      catalogo_notas_cambios = null,
      url_catalogo = v_base || '/tienda/' || slug
  where id = p_tienda_id returning * into v;
  return v;
end
$$;
revoke execute on function public.publicar_mi_catalogo(uuid) from public, anon;
grant execute on function public.publicar_mi_catalogo(uuid) to authenticated;
