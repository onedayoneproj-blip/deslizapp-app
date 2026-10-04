-- Seguridad: cada persona solo ve y edita lo de SU tienda. Sin sesión (anon) no se ve nada; el catálogo
-- público leerá por una vía aparte (fase 5). service_role (servidor / administración) se salta el RLS.

alter table public.tiendas enable row level security;
alter table public.usuarios enable row level security;
alter table public.productos enable row level security;
alter table public.clientes enable row level security;
alter table public.pedidos enable row level security;
alter table public.pedido_items enable row level security;
alter table public.promos enable row level security;
alter table public.eventos_aaah enable row level security;

-- Permisos de tabla: se parte de cero y se da solo lo necesario.
revoke all on all tables in schema public from anon, authenticated;

grant select, insert, update, delete on
  public.productos, public.clientes, public.pedidos, public.pedido_items, public.promos
  to authenticated;
grant select on public.usuarios, public.eventos_aaah to authenticated;
-- La tienda solo edita su nombre y su marca. Plan, límite y créditos los cambia Deslizapp (o las funciones).
grant select on public.tiendas to authenticated;
grant update (nombre, logo_url, marca_color_principal, marca_color_acento, marca_estilo, url_catalogo)
  on public.tiendas to authenticated;

create policy tiendas_ver on public.tiendas
  for select to authenticated
  using (id = (select public.mi_tienda_id()));
create policy tiendas_editar_marca on public.tiendas
  for update to authenticated
  using (id = (select public.mi_tienda_id()))
  with check (id = (select public.mi_tienda_id()));

create policy usuarios_ver on public.usuarios
  for select to authenticated
  using (tienda_id = (select public.mi_tienda_id()));

create policy productos_de_mi_tienda on public.productos
  for all to authenticated
  using (tienda_id = (select public.mi_tienda_id()))
  with check (tienda_id = (select public.mi_tienda_id()));

create policy clientes_de_mi_tienda on public.clientes
  for all to authenticated
  using (tienda_id = (select public.mi_tienda_id()))
  with check (tienda_id = (select public.mi_tienda_id()));

create policy pedidos_de_mi_tienda on public.pedidos
  for all to authenticated
  using (tienda_id = (select public.mi_tienda_id()))
  with check (tienda_id = (select public.mi_tienda_id()));

create policy pedido_items_de_mi_tienda on public.pedido_items
  for all to authenticated
  using (exists (
    select 1 from public.pedidos p
    where p.id = pedido_items.pedido_id and p.tienda_id = (select public.mi_tienda_id())
  ))
  with check (exists (
    select 1 from public.pedidos p
    where p.id = pedido_items.pedido_id and p.tienda_id = (select public.mi_tienda_id())
  ));

create policy promos_de_mi_tienda on public.promos
  for all to authenticated
  using (tienda_id = (select public.mi_tienda_id()))
  with check (tienda_id = (select public.mi_tienda_id()));

create policy aaah_de_mi_tienda on public.eventos_aaah
  for select to authenticated
  using (tienda_id = (select public.mi_tienda_id()));
