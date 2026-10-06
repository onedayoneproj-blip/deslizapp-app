-- Admin de Deslizapp, parte 1 (docs/13-admin.md §1, §5 y §6): quién entra, planes, columnas de cobro y actividad,
-- registro, pospuestos, funciones por tienda y «Ver como» (solo lectura).
-- Los datos reales (el primer admin, el pagado_hasta de una tienda) NO van aquí: scripts/sql/admin-primer-admin.sql.

-- ─── Quién entra al admin ───────────────────────────────────────────────────────────────────────────────────────────
create table public.admins (
  usuario_id uuid primary key references auth.users (id) on delete cascade,
  email text not null check (char_length(email) between 3 and 320),
  nombre text not null default '' check (char_length(nombre) <= 80),
  creado_en timestamptz not null default now(),
  creado_por uuid references auth.users (id) on delete set null
);
create index admins_creado_por_idx on public.admins (creado_por);

-- ¿La sesión actual es de un admin? La usan todas las admin_* y las políticas.
create function public.soy_admin() returns boolean
language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.admins where usuario_id = (select auth.uid())) $$;

alter table public.admins enable row level security;
revoke all on public.admins from anon, authenticated;
grant select on public.admins to authenticated;
create policy admins_ver on public.admins for select to authenticated using ((select public.soy_admin()));

-- ─── Planes (configuración del producto; Básico y Pro los crea Lewis desde el admin) ──────────────────────────────
create table public.planes (
  id text primary key check (id ~ '^[a-z0-9_]{1,30}$'),
  nombre text not null check (char_length(nombre) between 1 and 40),
  precio_mensual integer check (precio_mensual is null or precio_mensual >= 0),
  limite_productos integer check (limite_productos is null or limite_productos > 0),
  creditos_mensuales integer not null default 100 check (creditos_mensuales >= 0),
  se_ofrece boolean not null default true,
  orden integer not null default 0,
  destacado boolean not null default false,
  creado_en timestamptz not null default now()
);
insert into public.planes (id, nombre, precio_mensual, limite_productos, creditos_mensuales, se_ofrece, orden) values
  ('p20', 'Plan 20', null, 20, 100, true, 1),
  ('p60', 'Plan 60', null, 60, 100, true, 2),
  ('p100', 'Plan 100', null, 100, 100, true, 3),
  ('custom', 'Plan a medida', null, null, 100, false, 4);

alter table public.planes enable row level security;
revoke all on public.planes from anon, authenticated;
grant select on public.planes to authenticated;
create policy planes_ver on public.planes for select to authenticated using (true);

-- tiendas.plan pasa de una lista fija a una referencia. limite_productos sigue siendo el límite efectivo.
alter table public.tiendas drop constraint tiendas_plan_check;
alter table public.tiendas add constraint tiendas_plan_fkey foreign key (plan) references public.planes (id) on update cascade;
create index tiendas_plan_idx on public.tiendas (plan);

-- Precios de lo demás: instalación, marca propia y paquetes de créditos (`creditos` solo en los paquetes).
create table public.precios_extra (
  clave text primary key check (clave ~ '^[a-z0-9_]{1,40}$'),
  nombre text not null check (char_length(nombre) between 1 and 60),
  precio integer not null check (precio >= 0),
  creditos integer check (creditos is null or creditos > 0),
  orden integer not null default 0,
  creado_en timestamptz not null default now()
);
alter table public.precios_extra enable row level security;
revoke all on public.precios_extra from anon, authenticated;
grant select on public.precios_extra to authenticated;
create policy precios_extra_ver on public.precios_extra for select to authenticated using (true);

-- ─── Cobro, prueba y actividad ──────────────────────────────────────────────────────────────────────────────────────
alter table public.tiendas
  add column pagado_hasta date,
  add column dias_gracia integer not null default 5 check (dias_gracia between 0 and 60),
  add column prueba_hasta date,
  add column catalogo_paso_en timestamptz,
  add column ultima_actividad_en timestamptz;
alter table public.miembros add column ultima_entrada_en timestamptz;

-- Cuánto lleva cada paso del catálogo: lo pone la base en cada cambio de estado o de paso, venga de donde venga.
create function public.tiendas_marcar_paso_catalogo() returns trigger
language plpgsql set search_path = ''
as $$
begin
  if tg_op = 'INSERT' or new.catalogo_estado is distinct from old.catalogo_estado or new.catalogo_paso is distinct from old.catalogo_paso then
    new.catalogo_paso_en := now();
  end if;
  return new;
end $$;
revoke execute on function public.tiendas_marcar_paso_catalogo() from public, anon, authenticated;
create trigger tiendas_paso_catalogo before insert or update of catalogo_estado, catalogo_paso on public.tiendas
  for each row execute function public.tiendas_marcar_paso_catalogo();

-- Punto de partida con lo que la base ya sabe (no se inventa nada).
update public.tiendas set catalogo_paso_en = coalesce(catalogo_publicado_en, catalogo_solicitado_en, creado_en)
where catalogo_estado <> 'sin';
update public.tiendas t set ultima_actividad_en = greatest(
  t.creado_en, t.activada_en,
  (select max(creado_en) from public.pedidos where tienda_id = t.id),
  (select max(actualizado_en) from public.productos where tienda_id = t.id),
  (select max(creado_en) from public.ajustes_inventario where tienda_id = t.id),
  (select max(creado_en) from public.abonos where tienda_id = t.id));

-- ─── Registro del admin: solo se inserta ────────────────────────────────────────────────────────────────────────────
-- Sin llaves foráneas a propósito: el registro sobrevive aunque se borre la tienda o la persona.
create table public.registro_admin (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid,
  tienda_id uuid,
  accion text not null check (accion ~ '^[a-z_]{1,40}$'),
  detalle jsonb not null default '{}'::jsonb check (jsonb_typeof(detalle) = 'object'),
  creado_en timestamptz not null default now()
);
create index registro_admin_fecha_idx on public.registro_admin (creado_en desc);
create index registro_admin_tienda_idx on public.registro_admin (tienda_id, creado_en desc);

create function public.no_se_cambia() returns trigger
language plpgsql set search_path = ''
as $$ begin raise exception 'registro_inmutable' using errcode = '42501'; end $$;
revoke execute on function public.no_se_cambia() from public, anon, authenticated;
create trigger registro_admin_inmutable before update or delete on public.registro_admin
  for each row execute function public.no_se_cambia();
create trigger registro_admin_sin_truncate before truncate on public.registro_admin
  for each statement execute function public.no_se_cambia();

alter table public.registro_admin enable row level security;
revoke all on public.registro_admin from anon, authenticated, service_role;
grant select on public.registro_admin to authenticated;
grant select, insert on public.registro_admin to service_role;
create policy registro_admin_ver on public.registro_admin for select to authenticated using ((select public.soy_admin()));

-- Uso interno de las admin_*: anota quién hizo qué. No se da a nadie.
create function public.anotar_admin(p_tienda_id uuid, p_accion text, p_detalle jsonb default '{}'::jsonb) returns void
language sql security definer set search_path = ''
as $$
  insert into public.registro_admin (admin_id, tienda_id, accion, detalle)
  values ((select auth.uid()), p_tienda_id, p_accion, coalesce(p_detalle, '{}'::jsonb))
$$;
revoke execute on function public.anotar_admin(uuid, text, jsonb) from public, anon, authenticated;

-- ─── «Mañana» en Hoy ────────────────────────────────────────────────────────────────────────────────────────────────
create table public.admin_pospuestos (
  admin_id uuid not null references auth.users (id) on delete cascade,
  clave text not null check (char_length(clave) between 1 and 200),
  hasta timestamptz not null,
  primary key (admin_id, clave)
);
alter table public.admin_pospuestos enable row level security;
revoke all on public.admin_pospuestos from anon, authenticated;

-- ─── Funciones nuevas por tienda ────────────────────────────────────────────────────────────────────────────────────
create table public.funciones_tienda (
  tienda_id uuid not null references public.tiendas (id) on delete cascade,
  funcion text not null check (funcion ~ '^[A-Za-z][A-Za-z0-9_]{0,39}$'),
  encendida boolean not null,
  creado_por uuid references auth.users (id) on delete set null,
  creado_en timestamptz not null default now(),
  primary key (tienda_id, funcion)
);
create index funciones_tienda_creado_por_idx on public.funciones_tienda (creado_por);

-- ─── «Ver como» (docs/13 §6): sesiones de 30 minutos, solo lectura ─────────────────────────────────────────────────
create table public.sesiones_ver_como (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references auth.users (id) on delete cascade,
  tienda_id uuid not null references public.tiendas (id) on delete cascade,
  inicio timestamptz not null default now(),
  fin timestamptz,
  vence_en timestamptz not null,
  check (vence_en > inicio),
  check (fin is null or fin >= inicio)
);
create index sesiones_ver_como_abiertas_idx on public.sesiones_ver_como (admin_id, tienda_id) where fin is null;
create index sesiones_ver_como_tienda_idx on public.sesiones_ver_como (tienda_id);
alter table public.sesiones_ver_como enable row level security;
revoke all on public.sesiones_ver_como from anon, authenticated;

-- Las tiendas que el admin actual está mirando ahora (sesión abierta y sin vencer). Conjunto, como mis_tiendas(), para
-- que las políticas lo evalúen una vez por consulta y no fila por fila.
create function public.tiendas_que_miro() returns setof uuid
language sql stable security definer set search_path = ''
as $$
  select s.tienda_id from public.sesiones_ver_como s
  where s.admin_id = (select auth.uid()) and s.fin is null and s.vence_en > now()
    and exists (select 1 from public.admins a where a.usuario_id = (select auth.uid()))
$$;

-- ¿El admin actual tiene una sesión vigente de «Ver como» para esta tienda?
create function public.admin_viendo(p_tienda_id uuid) returns boolean
language sql stable security definer set search_path = ''
as $$ select p_tienda_id in (select public.tiendas_que_miro()) $$;

alter table public.funciones_tienda enable row level security;
revoke all on public.funciones_tienda from anon, authenticated;
grant select on public.funciones_tienda to authenticated;
create policy funciones_tienda_ver on public.funciones_tienda for select to authenticated
  using (tienda_id in (select public.mis_tiendas()) or tienda_id in (select public.tiendas_que_miro()) or (select public.soy_admin()));

-- ─── Lectura para «Ver como». Solo SELECT: las políticas de escritura quedan como estaban ────────────────────────────
-- Las de solo lectura suman tiendas_que_miro() (alter policy). Las FOR ALL no se tocan: se les suma una política aparte,
-- solo FOR SELECT, así el admin lee y ninguna escritura cambia.
alter policy tiendas_ver on public.tiendas
  using (id in (select public.mis_tiendas_con_eliminadas()) or id in (select public.tiendas_que_miro()));
alter policy miembros_ver on public.miembros
  using (tienda_id in (select public.mis_tiendas_con_eliminadas()) or tienda_id in (select public.tiendas_que_miro()));
alter policy abonos_de_mis_tiendas on public.abonos
  using (tienda_id in (select public.mis_tiendas()) or tienda_id in (select public.tiendas_que_miro()));
alter policy ajustes_inventario_de_mi_tienda on public.ajustes_inventario
  using (tienda_id in (select public.mis_tiendas()) or tienda_id in (select public.tiendas_que_miro()));
alter policy avisos_llegada_de_mis_tiendas on public.avisos_llegada
  using (tienda_id in (select public.mis_tiendas()) or tienda_id in (select public.tiendas_que_miro()));
alter policy aaah_de_mis_tiendas on public.eventos_aaah
  using (tienda_id in (select public.mis_tiendas()) or tienda_id in (select public.tiendas_que_miro()));
alter policy jugada_envios_leer on public.jugada_envios
  using (tienda_id in (select public.mis_tiendas()) or tienda_id in (select public.tiendas_que_miro()));
alter policy solicitudes_pedido_de_mis_tiendas on public.solicitudes_pedido
  using (tienda_id in (select public.mis_tiendas()) or tienda_id in (select public.tiendas_que_miro()));

create policy productos_ver_como on public.productos for select to authenticated
  using (tienda_id in (select public.tiendas_que_miro()));
create policy producto_variantes_ver_como on public.producto_variantes for select to authenticated
  using (tienda_id in (select public.tiendas_que_miro()));
create policy clientes_ver_como on public.clientes for select to authenticated
  using (tienda_id in (select public.tiendas_que_miro()));
create policy pedidos_ver_como on public.pedidos for select to authenticated
  using (tienda_id in (select public.tiendas_que_miro()));
create policy promos_ver_como on public.promos for select to authenticated
  using (tienda_id in (select public.tiendas_que_miro()));
create policy pedido_items_ver_como on public.pedido_items for select to authenticated
  using (exists (select 1 from public.pedidos p where p.id = pedido_items.pedido_id and p.tienda_id in (select public.tiendas_que_miro())));

-- ─── Buckets ────────────────────────────────────────────────────────────────────────────────────────────────────────
-- comprobantes: privado, solo admins (ruta <tienda_id>/<archivo>).
-- retoques: las fotos retocadas que entrega el equipo. Público para leer (el catálogo las muestra), y solo los admins
-- suben. Bucket aparte (y no una carpeta de `productos`) para no abrirle al admin las carpetas de las tiendas.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('comprobantes', 'comprobantes', false, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']),
  ('retoques', 'retoques', true, 15728640, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy comprobantes_admin_ver on storage.objects for select to authenticated
  using (bucket_id = 'comprobantes' and (select public.soy_admin()));
create policy comprobantes_admin_subir on storage.objects for insert to authenticated
  with check (bucket_id = 'comprobantes' and (select public.soy_admin()));
create policy comprobantes_admin_cambiar on storage.objects for update to authenticated
  using (bucket_id = 'comprobantes' and (select public.soy_admin()))
  with check (bucket_id = 'comprobantes' and (select public.soy_admin()));
create policy comprobantes_admin_borrar on storage.objects for delete to authenticated
  using (bucket_id = 'comprobantes' and (select public.soy_admin()));
create policy retoques_admin_subir on storage.objects for insert to authenticated
  with check (bucket_id = 'retoques' and (select public.soy_admin()));
create policy retoques_admin_cambiar on storage.objects for update to authenticated
  using (bucket_id = 'retoques' and (select public.soy_admin()))
  with check (bucket_id = 'retoques' and (select public.soy_admin()));

-- ─── Permisos de las funciones nuevas ───────────────────────────────────────────────────────────────────────────────
revoke execute on function public.soy_admin() from public, anon;
revoke execute on function public.tiendas_que_miro() from public, anon;
revoke execute on function public.admin_viendo(uuid) from public, anon;
grant execute on function public.soy_admin(), public.tiendas_que_miro(), public.admin_viendo(uuid) to authenticated;
