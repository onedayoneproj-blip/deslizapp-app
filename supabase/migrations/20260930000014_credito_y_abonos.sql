-- Ventas a crédito y abonos.
-- Un pedido es 'contado' (se cobró completo) o 'credito' (se paga en abonos). La deuda de un pedido a crédito es
-- total − suma de sus abonos. Los pedidos cancelados no generan deuda. Los abonos solo se crean y borran por funciones.

alter table public.pedidos
  add column pago_modo text not null default 'contado' check (pago_modo in ('contado', 'credito')),
  add column pago_fecha_acordada date;

create table public.abonos (
  id uuid primary key default gen_random_uuid(),
  tienda_id uuid not null references public.tiendas (id) on delete cascade,
  pedido_id uuid not null references public.pedidos (id) on delete cascade,
  monto integer not null check (monto > 0),
  metodo text not null check (metodo in ('efectivo', 'transferencia', 'otro')),
  fecha timestamptz not null default now(),
  nota text check (nota is null or char_length(nota) <= 200),
  creado_en timestamptz not null default now(),
  creado_por uuid default auth.uid()
);
create index abonos_pedido_idx on public.abonos (pedido_id);
create index abonos_tienda_fecha_idx on public.abonos (tienda_id, fecha);

alter table public.abonos enable row level security;
revoke all on public.abonos from anon, authenticated;
grant select on public.abonos to authenticated;
create policy abonos_de_mis_tiendas on public.abonos
  for select to authenticated
  using (tienda_id in (select public.mis_tiendas()));

-- Saldo de cada pedido (respeta el RLS de quien consulta).
create view public.pedidos_saldo with (security_invoker = true) as
select
  p.id as pedido_id,
  p.tienda_id,
  p.cliente_id,
  p.pago_modo,
  p.total,
  case when p.pago_modo = 'contado' then p.total else coalesce(a.pagado, 0) end as pagado,
  case when p.pago_modo = 'credito' and p.estado <> 'cancelado' then greatest(p.total - coalesce(a.pagado, 0), 0) else 0 end as saldo,
  a.ultimo_abono
from public.pedidos p
left join (select pedido_id, sum(monto)::integer as pagado, max(fecha) as ultimo_abono from public.abonos group by pedido_id) a
  on a.pedido_id = p.id;
revoke all on public.pedidos_saldo from anon, authenticated;
grant select on public.pedidos_saldo to authenticated;

-- Registrar un abono. Con p_pedido_id va a ese pedido; sin él se reparte entre los pedidos a crédito del cliente
-- con saldo, del más viejo al más nuevo. Devuelve los abonos creados.
create function public.registrar_abono(
  p_tienda_id uuid,
  p_cliente_id uuid,
  p_monto integer,
  p_metodo text,
  p_fecha timestamptz default now(),
  p_nota text default null,
  p_pedido_id uuid default null
)
returns setof public.abonos
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_resto integer := p_monto;
  v_deuda integer;
  v_nota text := nullif(btrim(coalesce(p_nota, '')), '');
  r record;
  v_aplicar integer;
  v_abono public.abonos;
begin
  if p_tienda_id is null or p_tienda_id not in (select public.mis_tiendas()) then
    raise exception 'tienda_no_encontrada' using errcode = 'P0002';
  end if;
  if p_monto is null or p_monto <= 0 then raise exception 'monto_invalido' using errcode = 'P0001'; end if;
  if p_metodo is null or p_metodo not in ('efectivo', 'transferencia', 'otro') then raise exception 'metodo_invalido' using errcode = 'P0001'; end if;
  if v_nota is not null and char_length(v_nota) > 200 then raise exception 'nota_invalida' using errcode = 'P0001'; end if;
  if p_fecha is null or p_fecha > now() + interval '1 day' then raise exception 'fecha_invalida' using errcode = 'P0001'; end if;

  if p_pedido_id is not null then
    perform 1 from public.pedidos where id = p_pedido_id and tienda_id = p_tienda_id for update;
    if not found then raise exception 'pedido_no_encontrado' using errcode = 'P0002'; end if;
  else
    perform 1 from public.clientes where id = p_cliente_id and tienda_id = p_tienda_id;
    if not found then raise exception 'cliente_no_encontrado' using errcode = 'P0002'; end if;
    perform 1 from public.pedidos where tienda_id = p_tienda_id and cliente_id = p_cliente_id and pago_modo = 'credito' order by id for update;
  end if;

  select coalesce(sum(s.saldo), 0) into v_deuda
  from public.pedidos_saldo s
  where s.tienda_id = p_tienda_id
    and (case when p_pedido_id is not null then s.pedido_id = p_pedido_id else s.cliente_id = p_cliente_id end);
  if v_deuda = 0 then raise exception 'sin_deuda' using errcode = 'P0001'; end if;
  if p_monto > v_deuda then raise exception 'monto_mayor_que_deuda: %', v_deuda using errcode = 'P0001'; end if;

  for r in
    select s.pedido_id, s.saldo
    from public.pedidos_saldo s join public.pedidos p on p.id = s.pedido_id
    where s.tienda_id = p_tienda_id and s.saldo > 0
      and (case when p_pedido_id is not null then s.pedido_id = p_pedido_id else s.cliente_id = p_cliente_id end)
    order by p.creado_en, p.numero
  loop
    exit when v_resto <= 0;
    v_aplicar := least(v_resto, r.saldo);
    insert into public.abonos (tienda_id, pedido_id, monto, metodo, fecha, nota)
    values (p_tienda_id, r.pedido_id, v_aplicar, p_metodo, p_fecha, v_nota)
    returning * into v_abono;
    v_resto := v_resto - v_aplicar;
    return next v_abono;
  end loop;
  return;
end
$$;

-- Borrar un abono registrado por error.
create function public.eliminar_abono(p_abono_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.abonos where id = p_abono_id and tienda_id in (select public.mis_tiendas());
  if not found then raise exception 'abono_no_encontrado' using errcode = 'P0002'; end if;
end
$$;

-- No se puede pasar a 'contado' un pedido que ya tiene abonos (primero se borran los abonos).
create function public.revisar_pago_modo()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.pago_modo = 'contado' and old.pago_modo = 'credito'
     and exists (select 1 from public.abonos where pedido_id = new.id) then
    raise exception 'pedido_con_abonos' using errcode = 'P0001';
  end if;
  if new.pago_modo = 'contado' then new.pago_fecha_acordada := null; end if;
  return new;
end
$$;
create trigger pedidos_pago_modo
  before update of pago_modo, pago_fecha_acordada on public.pedidos
  for each row execute function public.revisar_pago_modo();

revoke all on function public.registrar_abono(uuid, uuid, integer, text, timestamptz, text, uuid) from public, anon;
revoke all on function public.eliminar_abono(uuid) from public, anon;
grant execute on function public.registrar_abono(uuid, uuid, integer, text, timestamptz, text, uuid) to authenticated;
grant execute on function public.eliminar_abono(uuid) to authenticated;
