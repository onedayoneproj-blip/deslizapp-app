-- Admin: el Círculo de una tienda (el de su titular) o null. Solo lectura, solo admin.
create function public.admin_circulo_tienda(p_tienda_id uuid) returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare v jsonb;
begin
  if not public.soy_admin() then raise exception 'no_admin' using errcode = '42501'; end if;
  select jsonb_build_object('desde', c.desde, 'descuento_hasta', c.descuento_hasta) into v
  from public.circulo c where c.usuario_id = public.titular_de_tienda(p_tienda_id);
  return v;
end $$;
revoke execute on function public.admin_circulo_tienda(uuid) from public, anon;
grant execute on function public.admin_circulo_tienda(uuid) to authenticated;
