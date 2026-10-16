-- Círculo Deslizapp (docs/14): va con la persona (el titular), no con la tienda. Cuando existan las suscripciones, esta tabla
-- se reemplaza por una marca en la suscripción. Sin datos reales aquí: Lewis marca a las tiendas desde el admin.
create table public.circulo (
  usuario_id uuid primary key references auth.users (id) on delete cascade,
  desde date not null default current_date,
  descuento_hasta date,
  creado_en timestamptz not null default now()
);
alter table public.circulo enable row level security;
revoke all on public.circulo from anon, authenticated;
grant select on public.circulo to authenticated;
create policy circulo_ver on public.circulo for select to authenticated
  using (usuario_id = (select auth.uid()) or (select public.soy_admin()));

-- El titular de una tienda = su dueño que se unió primero.
create function public.titular_de_tienda(p_tienda_id uuid) returns uuid
language sql stable security definer set search_path = ''
as $$ select usuario_id from public.miembros where tienda_id = p_tienda_id and rol = 'dueno' order by creado_en, usuario_id limit 1 $$;
revoke execute on function public.titular_de_tienda(uuid) from public, anon, authenticated;

-- Lo que ve el panel: el Círculo de cada tienda mía (el de su titular), sin exponer nada más de la tabla.
create function public.circulo_de_mis_tiendas() returns table (tienda_id uuid, desde date, descuento_hasta date)
language sql stable security definer set search_path = ''
as $$
  select t, c.desde, c.descuento_hasta
  from (select public.mis_tiendas() as t) m
  join public.circulo c on c.usuario_id = public.titular_de_tienda(m.t)
$$;
revoke execute on function public.circulo_de_mis_tiendas() from public, anon;
grant execute on function public.circulo_de_mis_tiendas() to authenticated;

-- Admin: marcar / desmarcar al titular de una tienda; p_descuento_hasta null = sin descuento (el aro se queda).
create function public.admin_marcar_circulo(p_tienda_id uuid, p_marcar boolean, p_descuento_hasta date default null) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare v_titular uuid;
begin
  if not public.soy_admin() then raise exception 'no_admin' using errcode = '42501'; end if;
  v_titular := public.titular_de_tienda(p_tienda_id);
  if v_titular is null then raise exception 'tienda_no_encontrada' using errcode = 'P0002'; end if;
  if p_marcar then
    insert into public.circulo (usuario_id, descuento_hasta) values (v_titular, p_descuento_hasta)
    on conflict (usuario_id) do update set descuento_hasta = excluded.descuento_hasta;
  else
    delete from public.circulo where usuario_id = v_titular;
  end if;
  perform public.anotar_admin(p_tienda_id, case when p_marcar then 'circulo_marcar' else 'circulo_quitar' end,
    jsonb_build_object('descuento_hasta', p_descuento_hasta));
  return jsonb_build_object('circulo', p_marcar, 'descuento_hasta', p_descuento_hasta);
end $$;
revoke execute on function public.admin_marcar_circulo(uuid, boolean, date) from public, anon;
grant execute on function public.admin_marcar_circulo(uuid, boolean, date) to authenticated;
