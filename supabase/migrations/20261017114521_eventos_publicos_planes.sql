-- Medición: dos eventos nuevos (docs/18-medicion.md, docs/prompts/reel-final-ver-planes.md).
--  · catalogo_cta_planes: el toque en «Ver planes» del último reel del catálogo (sustituye a «Iniciar sesión» ahí).
--  · cta_planes: el toque en el enlace «Planes» de la cabecera de `/`.
-- No edita la migración anterior: redefine registrar_evento_publico con el mismo nombre y firma (los permisos se conservan) y la lista de
-- eventos con los dos nuevos. Lo demás es idéntico (límites por minuto, ruta en lista blanca, tienda con catálogo publicado).
-- `catalogo_cta_iniciar_sesion` se queda en la lista: los datos viejos lo usan.

create or replace function public.registrar_evento_publico(
  p_evento text, p_ruta text, p_origen text default 'otro', p_paso text default null, p_tienda_slug text default null
) returns boolean
language plpgsql security definer set search_path = ''
as $$
declare v_ruta text; v_origen text; v_paso text; v_slug text; v_total integer;
begin
  if p_evento is null or p_evento <> all (array[
    'inicio_visto', 'cta_iniciar_sesion', 'cta_como_funciona', 'cta_quiero_vender', 'cta_demo',
    'conoce_paso', 'conoce_final', 'conoce_cta_vender', 'conoce_cta_catalogo', 'conoce_cta_entrar', 'conoce_cta_otra_vez',
    'catalogo_visto', 'catalogo_reel_deslizapp',
    'catalogo_cta_iniciar_sesion', 'catalogo_cta_como_funciona', 'catalogo_cta_quiero_vender', 'catalogo_cta_demo',
    'catalogo_cta_planes', 'cta_planes'
  ]) then
    raise exception 'evento_invalido' using errcode = '22023';
  end if;

  -- Ritmo: 120 por minuto por cada evento (conoce_paso, 600: una sola visita completa manda hasta 18). El contador sigue sumando aunque
  -- se pase del tope (así se sabe cuántos se descartaron: admin_eventos_descartados); lo que se pasa no se inserta en eventos_publicos.
  insert into public.eventos_publicos_ritmo as r (minuto, evento, total)
  values (date_trunc('minute', now()), p_evento, 1)
  on conflict (minuto, evento) do update set total = r.total + 1
  returning r.total into v_total;
  if v_total > public.tope_evento_publico(p_evento) then
    return false;
  end if;

  -- Ruta: sin ?consulta ni #hash, sin barra final, en minúsculas y solo si encaja con una de las páginas públicas.
  v_ruta := regexp_replace(lower(split_part(split_part(coalesce(p_ruta, '/'), '?', 1), '#', 1)), '/+$', '');
  if v_ruta = '' then v_ruta := '/'; end if;
  v_ruta := case
    when v_ruta in ('/', '/conoce', '/privacidad', '/terminos') then v_ruta
    when v_ruta ~ '^/tienda/[a-z0-9-]{1,60}$' then v_ruta
    when v_ruta ~ '^/pedido/[^/]+$' then '/pedido/*'   -- el código de pedido no se guarda
    else 'otra'
  end;

  -- Tienda: solo si existe con catálogo publicado. Si no, el slug se descarta y la ruta de catálogo se colapsa a /tienda/*.
  v_slug := lower(btrim(coalesce(p_tienda_slug, '')));
  if v_slug !~ '^[a-z0-9-]{1,60}$'
     or not exists (select 1 from public.tiendas t where t.slug = v_slug and t.estado in ('activa', 'en_prueba') and t.catalogo_estado = 'publicado') then
    v_slug := null;
  end if;
  if v_ruta ~ '^/tienda/' and not exists (
    select 1 from public.tiendas t where t.slug = substr(v_ruta, 9) and t.estado in ('activa', 'en_prueba') and t.catalogo_estado = 'publicado'
  ) then
    v_ruta := '/tienda/*';
  end if;

  v_origen := case when p_origen in ('instagram', 'whatsapp', 'directo') then p_origen else 'otro' end;
  v_paso := case when p_paso ~ '^[a-z0-9_-]{1,40}$' then p_paso end;
  insert into public.eventos_publicos (evento, ruta, origen, paso, tienda_slug) values (p_evento, v_ruta, v_origen, v_paso, v_slug);
  return true;
end $$;
