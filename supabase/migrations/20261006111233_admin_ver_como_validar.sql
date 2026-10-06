-- Guardia exacta para el modo Solo mirar de la parte 2.
-- Requiere una función porque authenticated no tiene lectura directa de sesiones_ver_como.
-- Esta migración es aditiva y queda pendiente de coordinación/aplicación en Supabase.
create function public.admin_ver_como_validar(p_sesion_id uuid) returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  v jsonb;
begin
  if not public.soy_admin() then raise exception 'no_admin' using errcode = '42501'; end if;
  select jsonb_build_object('id',s.id,'tienda_id',s.tienda_id,'vence_en',s.vence_en,'tienda_nombre',t.nombre) into v
  from public.sesiones_ver_como s
  join public.tiendas t on t.id = s.tienda_id
  where s.id = p_sesion_id
    and s.admin_id = (select auth.uid())
    and s.fin is null
    and s.vence_en > now()
    and t.estado <> 'eliminada';
  if not found then return null; end if;
  return v;
end $$;
revoke all on function public.admin_ver_como_validar(uuid) from public, anon;
grant execute on function public.admin_ver_como_validar(uuid) to authenticated;

-- Detecta Ver como activo en otras pestañas y evita que perder/manipular la cookie
-- monte el panel normal en una cuenta que también es dueña.
create function public.admin_ver_como_actual() returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare v jsonb;
begin
  if not public.soy_admin() then raise exception 'no_admin' using errcode = '42501'; end if;
  select jsonb_build_object('id',s.id,'tienda_id',s.tienda_id,'vence_en',s.vence_en,'tienda_nombre',t.nombre) into v
  from public.sesiones_ver_como s join public.tiendas t on t.id=s.tienda_id
  where s.admin_id=(select auth.uid()) and s.fin is null and s.vence_en>now() and t.estado<>'eliminada'
  order by s.inicio desc limit 1;
  if not found then return null; end if;
  return v;
end $$;
revoke all on function public.admin_ver_como_actual() from public, anon;
grant execute on function public.admin_ver_como_actual() to authenticated;
