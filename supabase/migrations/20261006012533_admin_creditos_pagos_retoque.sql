-- Admin de Deslizapp, parte 1 (docs/13-admin.md §5, §7 y §8): las reglas en un solo lugar, créditos por movimientos,
-- pagos manuales inmutables y la cola real de retoque (los créditos se reservan al pedir y se cobran al entregar).

-- ─── Las reglas del admin (umbrales de Hoy, salud, cobros y retoque) ────────────────────────────────────────────────
-- Una sola fuente en la base. lib/admin/reglas.ts tiene la misma lista; tests/admin-reglas.test.mjs las compara.
-- REGLAS_ADMIN_INICIO
create function public.reglas_admin() returns jsonb
language sql immutable set search_path = ''
as $$ select ('{
  "vence_pronto_dias": 3,
  "prueba_termina_dias": 3,
  "solicitudes_sin_registrar_horas": 24,
  "catalogo_solicitado_dias": 2,
  "catalogo_cambios_dias": 1,
  "catalogo_generando_dias": 2,
  "prueba_sin_productos_dias": 3,
  "sin_entrar_dias": 7,
  "sin_pedidos_dias": 14,
  "viva_dias": 7,
  "plataforma_porcentaje": 70,
  "almacenamiento_limite_mb": 1024,
  "base_limite_mb": 500,
  "posponer_horas": 24,
  "marcar_actividad_minutos": 10,
  "ver_como_minutos": 30,
  "creditos_por_retoque": 5
}')::jsonb $$;
-- REGLAS_ADMIN_FIN
revoke execute on function public.reglas_admin() from public, anon;
grant execute on function public.reglas_admin() to authenticated;

-- Un umbral de reglas_admin() como entero.
create function public.regla_admin(p_clave text) returns integer
language sql immutable set search_path = ''
as $$ select (public.reglas_admin() ->> p_clave)::integer $$;
revoke execute on function public.regla_admin(text) from public, anon;
grant execute on function public.regla_admin(text) to authenticated;

-- El día de hoy en Santo Domingo (las fechas de cobro son días, no instantes).
create function public.hoy_rd() returns date
language sql stable set search_path = ''
as $$ select (now() at time zone 'America/Santo_Domingo')::date $$;
revoke execute on function public.hoy_rd() from public, anon;
grant execute on function public.hoy_rd() to authenticated;

-- ─── Pagos manuales (docs/13 §8). Inmutables: un error se corrige con un pago de anulación ──────────────────────────
create table public.pagos (
  id uuid primary key default gen_random_uuid(),
  -- Orden de registro (y número del recibo): no depende del reloj.
  numero bigint generated always as identity unique,
  tienda_id uuid not null references public.tiendas (id) on delete restrict,
  concepto text not null check (concepto in ('mensualidad', 'creditos', 'instalacion', 'otro')),
  monto integer not null,
  metodo text not null check (metodo in ('transferencia', 'deposito', 'efectivo')),
  referencia text check (referencia is null or char_length(referencia) between 1 and 80),
  -- Ruta dentro del bucket privado `comprobantes` (<tienda_id>/<archivo>), nunca una URL pública.
  comprobante_url text check (comprobante_url is null or comprobante_url ~ '^[0-9a-f-]{36}/[A-Za-z0-9._-]{1,120}$'),
  meses integer check (meses is null or meses between 1 and 12),
  creditos integer check (creditos is null or creditos > 0),
  cubre_hasta date,
  -- pagado_hasta de la tienda justo antes de este pago: con eso se recalcula al anular.
  pagado_hasta_anterior date,
  anula_a uuid unique references public.pagos (id),
  nota text check (nota is null or char_length(nota) between 1 and 300),
  registrado_por uuid default auth.uid(),
  creado_en timestamptz not null default now(),
  check ((anula_a is null and monto >= 0) or (anula_a is not null and monto <= 0)),
  check ((concepto = 'mensualidad') = (meses is not null) or anula_a is not null),
  check (concepto = 'creditos' or creditos is null)
);
create index pagos_tienda_fecha_idx on public.pagos (tienda_id, creado_en desc);
create index pagos_fecha_idx on public.pagos (creado_en desc);

create trigger pagos_inmutables before update or delete on public.pagos
  for each row execute function public.no_se_cambia();
create trigger pagos_sin_truncate before truncate on public.pagos
  for each statement execute function public.no_se_cambia();

alter table public.pagos enable row level security;
revoke all on public.pagos from anon, authenticated, service_role;
grant select on public.pagos to authenticated;
grant select, insert on public.pagos to service_role;
create policy pagos_ver on public.pagos for select to authenticated
  using (tienda_id in (select public.mis_tiendas()) or (select public.soy_admin()));

-- ─── Trabajos de retoque (docs/13 §7) ───────────────────────────────────────────────────────────────────────────────
create table public.trabajos_retoque (
  id uuid primary key default gen_random_uuid(),
  tienda_id uuid not null references public.tiendas (id) on delete cascade,
  producto_id uuid not null,
  medio_url_original text not null check (char_length(medio_url_original) between 1 and 2048),
  medio_url_retocado text check (medio_url_retocado is null or (medio_url_retocado ~ '^https://[^[:space:]]+$' and char_length(medio_url_retocado) <= 2048)),
  estado text not null default 'pendiente' check (estado in ('pendiente', 'entregado', 'devuelto')),
  motivo_devolucion text check (motivo_devolucion is null or char_length(motivo_devolucion) between 1 and 200),
  creditos integer not null check (creditos > 0),
  pedido_por uuid default auth.uid(),
  atendido_por uuid,
  creado_en timestamptz not null default now(),
  atendido_en timestamptz,
  foreign key (producto_id, tienda_id) references public.productos (id, tienda_id) on delete cascade,
  check ((estado = 'entregado') = (medio_url_retocado is not null)),
  check ((estado = 'devuelto') = (motivo_devolucion is not null)),
  check ((estado = 'pendiente') = (atendido_en is null))
);
-- Una foto no se pide dos veces mientras espera.
create unique index trabajos_retoque_un_pendiente on public.trabajos_retoque (producto_id, medio_url_original) where estado = 'pendiente';
create index trabajos_retoque_tienda_idx on public.trabajos_retoque (tienda_id, estado, creado_en);
create index trabajos_retoque_producto_idx on public.trabajos_retoque (producto_id, tienda_id);
create index trabajos_retoque_cola_idx on public.trabajos_retoque (creado_en) where estado = 'pendiente';

alter table public.trabajos_retoque enable row level security;
revoke all on public.trabajos_retoque from anon, authenticated;
grant select on public.trabajos_retoque to authenticated;
create policy trabajos_retoque_ver on public.trabajos_retoque for select to authenticated
  using (tienda_id in (select public.mis_tiendas()) or tienda_id in (select public.tiendas_que_miro()) or (select public.soy_admin()));

-- ─── Créditos por movimientos. El saldo es la suma; tiendas.creditos_retoque es su copia ────────────────────────────
create table public.movimientos_creditos (
  id uuid primary key default gen_random_uuid(),
  tienda_id uuid not null references public.tiendas (id) on delete cascade,
  cantidad integer not null check (cantidad <> 0),
  tipo text not null check (tipo in ('recarga_mensual', 'compra', 'retoque', 'devolucion', 'ajuste')),
  motivo text check (motivo is null or char_length(motivo) between 1 and 200),
  pago_id uuid references public.pagos (id),
  trabajo_id uuid references public.trabajos_retoque (id) on delete set null,
  -- Mes que cubre una recarga mensual (día 1): una por tienda y por mes.
  periodo date check (periodo is null or extract(day from periodo) = 1),
  creado_por uuid default auth.uid(),
  creado_en timestamptz not null default now(),
  check ((tipo = 'recarga_mensual') = (periodo is not null))
);
create unique index movimientos_creditos_recarga_unica on public.movimientos_creditos (tienda_id, periodo) where tipo = 'recarga_mensual';
create index movimientos_creditos_tienda_idx on public.movimientos_creditos (tienda_id, creado_en desc);
create index movimientos_creditos_pago_idx on public.movimientos_creditos (pago_id);
create index movimientos_creditos_trabajo_idx on public.movimientos_creditos (trabajo_id);

alter table public.movimientos_creditos enable row level security;
revoke all on public.movimientos_creditos from anon, authenticated;
grant select on public.movimientos_creditos to authenticated;
create policy movimientos_creditos_ver on public.movimientos_creditos for select to authenticated
  using (tienda_id in (select public.mis_tiendas()) or tienda_id in (select public.tiendas_que_miro()) or (select public.soy_admin()));

-- Saldo inicial: un movimiento por tienda con lo que tiene hoy, ANTES del trigger para no contarlo dos veces.
insert into public.movimientos_creditos (tienda_id, cantidad, tipo, motivo, creado_por)
select id, creditos_retoque, 'ajuste', 'saldo al empezar el registro', null from public.tiendas where creditos_retoque > 0;

-- Cada movimiento recalcula la copia como la suma. Primero bloquea la tienda: así dos movimientos a la vez no se pisan
-- (la suma se lee después del bloqueo, ya con lo que el otro dejó). El check creditos_retoque >= 0 impide saldos negativos.
create function public.movimientos_creditos_saldo() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  perform 1 from public.tiendas where id = new.tienda_id for update;
  update public.tiendas
  set creditos_retoque = (select coalesce(sum(cantidad), 0) from public.movimientos_creditos where tienda_id = new.tienda_id)
  where id = new.tienda_id;
  return null;
end $$;
revoke execute on function public.movimientos_creditos_saldo() from public, anon, authenticated;
create trigger movimientos_creditos_saldo after insert on public.movimientos_creditos
  for each row execute function public.movimientos_creditos_saldo();

-- Una tienda nueva nace con su saldo (el default de la columna) como la recarga de su primer mes.
create function public.tiendas_saldo_inicial() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.creditos_retoque > 0 then
    insert into public.movimientos_creditos (tienda_id, cantidad, tipo, motivo, periodo)
    values (new.id, new.creditos_retoque, 'recarga_mensual', 'saldo inicial de la tienda', date_trunc('month', public.hoy_rd())::date);
  end if;
  return null;
end $$;
revoke execute on function public.tiendas_saldo_inicial() from public, anon, authenticated;
create trigger tiendas_saldo_inicial after insert on public.tiendas
  for each row execute function public.tiendas_saldo_inicial();

-- Créditos reservados: los de los retoques que esperan al equipo.
create function public.creditos_reservados(p_tienda_id uuid) returns integer
language sql stable security definer set search_path = ''
as $$ select coalesce(sum(creditos), 0)::integer from public.trabajos_retoque where tienda_id = p_tienda_id and estado = 'pendiente' $$;
revoke execute on function public.creditos_reservados(uuid) from public, anon, authenticated;

-- gastar_creditos (las dos firmas) sigue igual por fuera; ahora anota un movimiento y respeta lo reservado.
create or replace function public.gastar_creditos(p_tienda_id uuid, p_cantidad integer) returns integer
language plpgsql security definer set search_path = ''
as $$
declare v_saldo integer;
begin
  if p_cantidad is null or p_cantidad <= 0 then raise exception 'cantidad_invalida' using errcode = '22023'; end if;
  if p_tienda_id is null or p_tienda_id not in (select public.mis_tiendas()) then
    raise exception 'tienda_no_encontrada' using errcode = 'P0002';
  end if;
  select creditos_retoque into v_saldo from public.tiendas where id = p_tienda_id for update;
  if v_saldo - public.creditos_reservados(p_tienda_id) < p_cantidad then
    raise exception 'creditos_insuficientes' using errcode = 'P0001';
  end if;
  insert into public.movimientos_creditos (tienda_id, cantidad, tipo, motivo)
  values (p_tienda_id, -p_cantidad, 'retoque', 'retoque al guardar el producto');
  select creditos_retoque into v_saldo from public.tiendas where id = p_tienda_id;
  return v_saldo;
end $$;

create or replace function public.gastar_creditos(p_cantidad integer) returns integer
language plpgsql security definer set search_path = ''
as $$
declare v_tienda uuid := public.mi_tienda_id();
begin
  if p_cantidad is null or p_cantidad <= 0 then raise exception 'cantidad_invalida' using errcode = '22023'; end if;
  if v_tienda is null then raise exception 'creditos_insuficientes' using errcode = 'P0001'; end if;
  return public.gastar_creditos(v_tienda, p_cantidad);
end $$;

-- ─── Retoque: la tienda lo pide (reserva) ───────────────────────────────────────────────────────────────────────────
-- Errores: producto_no_encontrado, foto_no_encontrada, foto_ya_retocada, retoque_pendiente, creditos_insuficientes.
create function public.pedir_retoque(p_producto_id uuid, p_medio_url text) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_producto public.productos;
  v_saldo integer;
  v_costo integer := public.regla_admin('creditos_por_retoque');
  v_trabajo public.trabajos_retoque;
begin
  select * into v_producto from public.productos
  where id = p_producto_id and eliminado_en is null and tienda_id in (select public.mis_tiendas());
  if not found then raise exception 'producto_no_encontrado' using errcode = 'P0002'; end if;
  if not exists (select 1 from jsonb_array_elements(v_producto.medios) e where e->>'tipo' = 'foto' and e->>'url' = p_medio_url) then
    raise exception 'foto_no_encontrada' using errcode = 'P0002';
  end if;
  if exists (select 1 from jsonb_array_elements(v_producto.medios) e
             where e->>'tipo' = 'foto' and e->>'url' = p_medio_url and (e->>'retocada')::boolean) then
    raise exception 'foto_ya_retocada' using errcode = 'P0001';
  end if;
  select creditos_retoque into v_saldo from public.tiendas where id = v_producto.tienda_id for update;
  if exists (select 1 from public.trabajos_retoque where producto_id = p_producto_id and medio_url_original = p_medio_url and estado = 'pendiente') then
    raise exception 'retoque_pendiente' using errcode = 'P0001';
  end if;
  if v_saldo - public.creditos_reservados(v_producto.tienda_id) < v_costo then
    raise exception 'creditos_insuficientes' using errcode = 'P0001';
  end if;
  insert into public.trabajos_retoque (tienda_id, producto_id, medio_url_original, creditos)
  values (v_producto.tienda_id, p_producto_id, p_medio_url, v_costo) returning * into v_trabajo;
  return to_jsonb(v_trabajo);
end $$;
revoke execute on function public.pedir_retoque(uuid, text) from public, anon;
grant execute on function public.pedir_retoque(uuid, text) to authenticated;
