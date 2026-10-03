-- Tu próxima jugada: escribirle a un cliente con un saludo, un código o productos.
-- 1) Códigos solo para un cliente: promos.cliente_id (solo tipo 'codigo'). La app solo lo acepta en pedidos de ese cliente.
-- 2) crear_codigo_cliente: crea un código de un solo uso para un cliente. La app lo propone ya hecho (LUISAN10, 10 %, 14 días)
--    y la persona puede cambiar el código, el porcentaje y los días antes de enviarlo; se crea al enviar.
-- 3) jugada_envios + registrar_envio_jugada: guarda cada vez que se abre WhatsApp desde una jugada
--    (para "Le escribiste hace 3 días" y para medir si el código se usó).

-- 1) Código ligado a un cliente
alter table public.promos
  add column if not exists cliente_id uuid references public.clientes(id) on delete cascade;

alter table public.promos
  drop constraint if exists promos_cliente_solo_codigo;
alter table public.promos
  add constraint promos_cliente_solo_codigo check (cliente_id is null or tipo = 'codigo');

create index if not exists promos_cliente_idx on public.promos (cliente_id) where cliente_id is not null;

comment on column public.promos.cliente_id is
  'Si no es NULL, el código solo vale en pedidos de ese cliente (código personal creado desde Tu próxima jugada).';

-- 2) Crear un código personal
create or replace function public.crear_codigo_cliente(
  p_tienda_id uuid,
  p_cliente_id uuid,
  p_porcentaje integer,
  p_dias integer default 14,
  p_codigo text default null
)
returns public.promos
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_cliente public.clientes;
  v_base text;
  v_codigo text;
  v_intentos integer := 0;
  v_fin timestamptz;
  v_promo public.promos;
begin
  if (select auth.uid()) is null then
    raise exception 'codigo_sin_sesion' using errcode = '42501';
  end if;
  if p_tienda_id is null or not exists (select 1 where p_tienda_id in (select public.mis_tiendas())) then
    raise exception 'codigo_sin_permiso' using errcode = '42501';
  end if;
  if p_porcentaje is null or p_porcentaje < 1 or p_porcentaje > 90 then
    raise exception 'codigo_porcentaje_invalido' using errcode = '22023';
  end if;
  if p_dias is null or p_dias < 1 or p_dias > 90 then
    raise exception 'codigo_dias_invalidos' using errcode = '22023';
  end if;

  select * into v_cliente from public.clientes c where c.id = p_cliente_id and c.tienda_id = p_tienda_id;
  if not found then
    raise exception 'codigo_cliente_no_encontrado' using errcode = 'P0002';
  end if;

  -- Base legible: primera palabra del nombre, sin tildes ni símbolos, en mayúsculas, hasta 6 letras.
  v_base := upper(translate(split_part(btrim(v_cliente.nombre), ' ', 1),
    'áéíóúüñÁÉÍÓÚÜÑàèìòùÀÈÌÒÙ', 'aeiouunAEIOUUNaeiouAEIOU'));
  v_base := left(regexp_replace(v_base, '[^A-Z]', '', 'g'), 6);
  if v_base = '' then
    v_base := 'CLIENTE';
  end if;

  -- Código escrito por la persona: se respeta tal cual (mayúsculas), y si ya está en uso se avisa.
  if nullif(btrim(p_codigo), '') is not null then
    v_codigo := upper(btrim(p_codigo));
    if v_codigo !~ '^[A-Z0-9]{3,15}$' then
      raise exception 'codigo_formato_invalido' using errcode = '22023';
    end if;
    if exists (select 1 from public.promos p where p.tienda_id = p_tienda_id and p.codigo = v_codigo and p.estado <> 'terminada') then
      raise exception 'codigo_en_uso' using errcode = '23505';
    end if;
  else
  v_codigo := v_base || p_porcentaje::text;
  while exists (
    select 1 from public.promos p
    where p.tienda_id = p_tienda_id and p.codigo = v_codigo and p.estado <> 'terminada'
  ) loop
    v_intentos := v_intentos + 1;
    if v_intentos > 30 then
      raise exception 'codigo_sin_nombre_libre' using errcode = 'P0001';
    end if;
    v_codigo := v_base || p_porcentaje::text || (10 + floor(random() * 90))::integer::text;
  end loop;
  end if;

  -- Vence al final del día (hora de Santo Domingo), p_dias días después de hoy.
  v_fin := ((date_trunc('day', now() at time zone 'America/Santo_Domingo') + make_interval(days => p_dias + 1))
            - interval '1 millisecond') at time zone 'America/Santo_Domingo';

  insert into public.promos (tienda_id, tipo, nombre, valor_porcentaje, codigo, fecha_inicio, fecha_fin, estado, limite_usos, pausada, cliente_id)
  values (p_tienda_id, 'codigo', 'Para ' || btrim(v_cliente.nombre), p_porcentaje, v_codigo, now(), v_fin, 'activa', 1, false, p_cliente_id)
  returning * into v_promo;

  return v_promo;
end
$$;

revoke all on function public.crear_codigo_cliente(uuid, uuid, integer, integer, text) from public, anon;
grant execute on function public.crear_codigo_cliente(uuid, uuid, integer, integer, text) to authenticated;

-- 3) Registro de lo enviado desde una jugada
create table if not exists public.jugada_envios (
  id uuid primary key default gen_random_uuid(),
  tienda_id uuid not null references public.tiendas(id) on delete cascade,
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  jugada text not null check (jugada in ('volver', 'segundo', 'gracias', 'primer')),
  tipo text not null check (tipo in ('saludo', 'codigo', 'productos')),
  promo_id uuid references public.promos(id) on delete set null,
  producto_ids uuid[] not null default '{}',
  enviado_en timestamptz not null default now(),
  constraint jugada_envios_promo_solo_codigo check (promo_id is null or tipo = 'codigo'),
  constraint jugada_envios_productos check (
    (tipo = 'productos' and cardinality(producto_ids) between 1 and 3)
    or (tipo <> 'productos' and cardinality(producto_ids) = 0)
  )
);

create index if not exists jugada_envios_cliente_idx on public.jugada_envios (tienda_id, cliente_id, enviado_en desc);

alter table public.jugada_envios enable row level security;

drop policy if exists jugada_envios_leer on public.jugada_envios;
create policy jugada_envios_leer on public.jugada_envios
  for select to authenticated
  using (tienda_id in (select public.mis_tiendas()));
-- Sin políticas de insert/update/delete: solo se escribe con registrar_envio_jugada.

comment on table public.jugada_envios is
  'Cada vez que se abre WhatsApp desde Tu próxima jugada: a quién, qué jugada y con qué (saludo, código o productos).';

create or replace function public.registrar_envio_jugada(
  p_tienda_id uuid,
  p_cliente_id uuid,
  p_jugada text,
  p_tipo text,
  p_promo_id uuid default null,
  p_producto_ids uuid[] default '{}'
)
returns public.jugada_envios
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_envio public.jugada_envios;
  v_ids uuid[] := coalesce(p_producto_ids, '{}');
begin
  if (select auth.uid()) is null then
    raise exception 'envio_sin_sesion' using errcode = '42501';
  end if;
  if p_tienda_id is null or not exists (select 1 where p_tienda_id in (select public.mis_tiendas())) then
    raise exception 'envio_sin_permiso' using errcode = '42501';
  end if;
  if not exists (select 1 from public.clientes c where c.id = p_cliente_id and c.tienda_id = p_tienda_id) then
    raise exception 'envio_cliente_no_encontrado' using errcode = 'P0002';
  end if;
  if p_tipo = 'codigo' and (p_promo_id is null or not exists (
    select 1 from public.promos p
    where p.id = p_promo_id and p.tienda_id = p_tienda_id and p.tipo = 'codigo'
      and (p.cliente_id is null or p.cliente_id = p_cliente_id)
  )) then
    raise exception 'envio_codigo_invalido' using errcode = '22023';
  end if;
  if p_tipo <> 'codigo' and p_promo_id is not null then
    raise exception 'envio_codigo_invalido' using errcode = '22023';
  end if;
  if p_tipo = 'productos' and (
    cardinality(v_ids) not between 1 and 3
    or (select count(distinct x) from unnest(v_ids) x) <> cardinality(v_ids)
    or (select count(*) from public.productos pr where pr.id = any(v_ids) and pr.tienda_id = p_tienda_id) <> cardinality(v_ids)
  ) then
    raise exception 'envio_productos_invalidos' using errcode = '22023';
  end if;

  insert into public.jugada_envios (tienda_id, cliente_id, jugada, tipo, promo_id, producto_ids)
  values (p_tienda_id, p_cliente_id, p_jugada, p_tipo, p_promo_id, case when p_tipo = 'productos' then v_ids else '{}' end)
  returning * into v_envio;

  return v_envio;
end
$$;

revoke all on function public.registrar_envio_jugada(uuid, uuid, text, text, uuid, uuid[]) from public, anon;
grant execute on function public.registrar_envio_jugada(uuid, uuid, text, text, uuid, uuid[]) to authenticated;
