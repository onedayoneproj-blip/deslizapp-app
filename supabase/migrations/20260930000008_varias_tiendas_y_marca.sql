-- Fases B y C: una cuenta puede tener VARIAS tiendas (tabla miembros), cada tienda tiene estado
-- (en prueba → activa → pausada / eliminada), rubro, datos de contacto y personalización del catálogo.
-- Compatible con la app actual: `usuarios` se queda como perfil (+ tienda por defecto) y las funciones viejas siguen.

-- ---------------------------------------------------------------------------
-- 1. Tienda: estado, rubro, contacto y personalización
-- ---------------------------------------------------------------------------
alter table public.tiendas
  add column estado text not null default 'en_prueba'
    check (estado in ('en_prueba', 'activa', 'pausada', 'eliminada')),
  add column activada_en timestamptz,   -- primera vez que Deslizapp la activó (pagó)
  add column eliminada_en timestamptz,  -- se borra de verdad 30 días después
  add column rubro text not null default 'general'
    check (rubro in ('perfumes', 'ropa', 'accesorios', 'belleza', 'comida', 'hogar', 'general')),
  add column whatsapp text check (whatsapp is null or whatsapp ~ '^[0-9]{10,15}$'),  -- solo dígitos, con código de país (1809…)
  add column instagram text check (instagram is null or instagram ~ '^[A-Za-z0-9._]{1,30}$'),  -- sin @
  add column foto_perfil_url text,
  add column descripcion text check (descripcion is null or char_length(descripcion) <= 160),
  add column nombre_vendedora text check (nombre_vendedora is null or char_length(nombre_vendedora) between 1 and 40),
  -- Textos y secciones del catálogo (ver docs: mensajes al agregar, saludo de WhatsApp, agotado, secciones visibles…).
  add column personalizacion jsonb not null default '{}'::jsonb check (jsonb_typeof(personalizacion) = 'object'),
  add constraint tiendas_eliminada_coherente check ((estado = 'eliminada') = (eliminada_en is not null));

-- Las tiendas que ya existían venían funcionando: quedan activas.
update public.tiendas set estado = 'activa', activada_en = now() where estado = 'en_prueba';

-- ---------------------------------------------------------------------------
-- 2. Productos: detalles según el rubro y opciones al comprar (talla, sabor…)
-- ---------------------------------------------------------------------------
alter table public.productos
  add column detalles jsonb not null default '{}'::jsonb check (jsonb_typeof(detalles) = 'object'),
  -- [{"nombre":"Talla","valores":["S","M","L"]}]
  add column opciones jsonb not null default '[]'::jsonb check (jsonb_typeof(opciones) = 'array');

-- ---------------------------------------------------------------------------
-- 3. Miembros: quién entra a qué tienda y con qué rol
-- ---------------------------------------------------------------------------
create table public.miembros (
  usuario_id uuid not null references auth.users (id) on delete cascade,
  tienda_id uuid not null references public.tiendas (id) on delete cascade,
  rol text not null default 'staff' check (rol in ('dueno', 'staff')),
  creado_en timestamptz not null default now(),
  primary key (usuario_id, tienda_id)
);
create index miembros_tienda_idx on public.miembros (tienda_id);
insert into public.miembros (usuario_id, tienda_id, rol) select id, tienda_id, rol from public.usuarios;

-- `usuarios` pasa a ser el perfil; tienda_id = tienda por defecto (puede no tener ninguna todavía).
alter table public.usuarios alter column tienda_id drop not null;

-- Invitaciones: una persona puede estar invitada a varias tiendas.
alter table public.invitaciones drop constraint invitaciones_pkey;
alter table public.invitaciones add primary key (email, tienda_id);

-- ---------------------------------------------------------------------------
-- 4. Funciones de acceso
-- ---------------------------------------------------------------------------
-- Tiendas de la persona con sesión (sin las eliminadas).
create function public.mis_tiendas()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select m.tienda_id
  from public.miembros m
  join public.tiendas t on t.id = m.tienda_id
  where m.usuario_id = (select auth.uid()) and t.estado <> 'eliminada'
$$;

-- Incluye las eliminadas (para poder recuperarlas en los 30 días).
create function public.mis_tiendas_con_eliminadas()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select tienda_id from public.miembros where usuario_id = (select auth.uid())
$$;

create function public.soy_dueno(p_tienda_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.miembros
    where usuario_id = (select auth.uid()) and tienda_id = p_tienda_id and rol = 'dueno'
  )
$$;

-- Compatibilidad: la tienda por defecto (la que usa la app de hoy) si todavía es suya.
create or replace function public.mi_tienda_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select u.tienda_id from public.usuarios u
  where u.id = (select auth.uid())
    and u.tienda_id in (select public.mis_tiendas())
$$;

-- ---------------------------------------------------------------------------
-- 5. Políticas: por membresía en lugar de "una sola tienda"
-- ---------------------------------------------------------------------------
drop policy tiendas_ver on public.tiendas;
drop policy tiendas_editar_marca on public.tiendas;
drop policy usuarios_ver on public.usuarios;
drop policy productos_de_mi_tienda on public.productos;
drop policy clientes_de_mi_tienda on public.clientes;
drop policy pedidos_de_mi_tienda on public.pedidos;
drop policy pedido_items_de_mi_tienda on public.pedido_items;
drop policy promos_de_mi_tienda on public.promos;
drop policy aaah_de_mi_tienda on public.eventos_aaah;

create policy tiendas_ver on public.tiendas
  for select to authenticated
  using (id in (select public.mis_tiendas_con_eliminadas()));
create policy tiendas_editar_marca on public.tiendas
  for update to authenticated
  using (id in (select public.mis_tiendas()))
  with check (id in (select public.mis_tiendas()));

-- Tu perfil y los perfiles de quienes comparten tienda contigo.
create policy usuarios_ver on public.usuarios
  for select to authenticated
  using (
    id = (select auth.uid())
    or id in (select m.usuario_id from public.miembros m where m.tienda_id in (select public.mis_tiendas()))
  );
-- Solo puedes cambiar tu tienda por defecto (y a una tuya).
grant update (tienda_id) on public.usuarios to authenticated;
create policy usuarios_elegir_tienda on public.usuarios
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()) and (tienda_id is null or tienda_id in (select public.mis_tiendas())));

grant select on public.miembros to authenticated;
alter table public.miembros enable row level security;
create policy miembros_ver on public.miembros
  for select to authenticated
  using (tienda_id in (select public.mis_tiendas_con_eliminadas()));

create policy productos_de_mis_tiendas on public.productos
  for all to authenticated
  using (tienda_id in (select public.mis_tiendas()))
  with check (tienda_id in (select public.mis_tiendas()));
create policy clientes_de_mis_tiendas on public.clientes
  for all to authenticated
  using (tienda_id in (select public.mis_tiendas()))
  with check (tienda_id in (select public.mis_tiendas()));
create policy pedidos_de_mis_tiendas on public.pedidos
  for all to authenticated
  using (tienda_id in (select public.mis_tiendas()))
  with check (tienda_id in (select public.mis_tiendas()));
create policy pedido_items_de_mis_tiendas on public.pedido_items
  for all to authenticated
  using (exists (select 1 from public.pedidos p where p.id = pedido_items.pedido_id and p.tienda_id in (select public.mis_tiendas())))
  with check (exists (select 1 from public.pedidos p where p.id = pedido_items.pedido_id and p.tienda_id in (select public.mis_tiendas())));
create policy promos_de_mis_tiendas on public.promos
  for all to authenticated
  using (tienda_id in (select public.mis_tiendas()))
  with check (tienda_id in (select public.mis_tiendas()));
create policy aaah_de_mis_tiendas on public.eventos_aaah
  for select to authenticated
  using (tienda_id in (select public.mis_tiendas()));

-- La tienda edita su marca y personalización. Estado, plan, límites y créditos: solo por funciones / Deslizapp.
grant update (whatsapp, instagram, foto_perfil_url, descripcion, nombre_vendedora, personalizacion)
  on public.tiendas to authenticated;

-- Fotos: carpeta de cualquiera de tus tiendas.
drop policy fotos_ver_mi_tienda on storage.objects;
drop policy fotos_subir_mi_tienda on storage.objects;
drop policy fotos_cambiar_mi_tienda on storage.objects;
drop policy fotos_borrar_mi_tienda on storage.objects;
create policy fotos_ver_mis_tiendas on storage.objects
  for select to authenticated
  using (bucket_id = 'productos' and (storage.foldername(name))[1] in (select t::text from public.mis_tiendas() t));
create policy fotos_subir_mis_tiendas on storage.objects
  for insert to authenticated
  with check (bucket_id = 'productos' and (storage.foldername(name))[1] in (select t::text from public.mis_tiendas() t));
create policy fotos_cambiar_mis_tiendas on storage.objects
  for update to authenticated
  using (bucket_id = 'productos' and (storage.foldername(name))[1] in (select t::text from public.mis_tiendas() t))
  with check (bucket_id = 'productos' and (storage.foldername(name))[1] in (select t::text from public.mis_tiendas() t));
create policy fotos_borrar_mis_tiendas on storage.objects
  for delete to authenticated
  using (bucket_id = 'productos' and (storage.foldername(name))[1] in (select t::text from public.mis_tiendas() t));

-- ---------------------------------------------------------------------------
-- 6. Reglas de negocio con varias tiendas
-- ---------------------------------------------------------------------------
create or replace function public.despachar_pedido(p_pedido_id uuid)
returns public.pedidos
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_pedido public.pedidos;
  v_falta text;
begin
  select * into v_pedido
  from public.pedidos
  where id = p_pedido_id and tienda_id in (select public.mis_tiendas())
  for update;
  if not found then
    raise exception 'pedido_no_encontrado' using errcode = 'P0002';
  end if;
  if v_pedido.estado <> 'por_despachar' then
    raise exception 'pedido_no_despachable' using errcode = 'P0001';
  end if;

  perform 1 from public.productos
  where id in (select producto_id from public.pedido_items where pedido_id = p_pedido_id)
  order by id
  for update;

  select pr.nombre into v_falta
  from (select producto_id, sum(cantidad) as cant from public.pedido_items where pedido_id = p_pedido_id group by producto_id) i
  join public.productos pr on pr.id = i.producto_id
  where pr.stock is not null and pr.stock < i.cant
  limit 1;
  if v_falta is not null then
    raise exception 'stock_insuficiente: %', v_falta using errcode = 'P0001';
  end if;

  update public.productos pr
  set stock = pr.stock - i.cant
  from (select producto_id, sum(cantidad) as cant from public.pedido_items where pedido_id = p_pedido_id group by producto_id) i
  where pr.id = i.producto_id and pr.stock is not null;

  update public.pedidos set estado = 'despachado', despachado_en = now()
  where id = p_pedido_id
  returning * into v_pedido;
  return v_pedido;
end
$$;

-- Créditos de una tienda concreta (la versión vieja, sin tienda, sigue usando la tienda por defecto).
create function public.gastar_creditos(p_tienda_id uuid, p_cantidad integer)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_saldo integer;
begin
  if p_cantidad is null or p_cantidad <= 0 then
    raise exception 'cantidad_invalida' using errcode = '22023';
  end if;
  if p_tienda_id is null or p_tienda_id not in (select public.mis_tiendas()) then
    raise exception 'tienda_no_encontrada' using errcode = 'P0002';
  end if;
  update public.tiendas set creditos_retoque = creditos_retoque - p_cantidad
  where id = p_tienda_id and creditos_retoque >= p_cantidad
  returning creditos_retoque into v_saldo;
  if not found then
    raise exception 'creditos_insuficientes' using errcode = 'P0001';
  end if;
  return v_saldo;
end
$$;

-- Crear tienda: queda "en prueba" (Deslizapp la activa al pagar). Máximo 3 tiendas en prueba por persona.
-- Errores: nombre_invalido, rubro_invalido, demasiadas_tiendas_en_prueba.
create function public.crear_tienda(p_nombre text, p_rubro text default 'general')
returns public.tiendas
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_nombre text := btrim(coalesce(p_nombre, ''));
  v_base text;
  v_slug text;
  v_n int := 1;
  v_tienda public.tiendas;
  v_email text;
begin
  if v_uid is null then
    raise exception 'sin_sesion' using errcode = '42501';
  end if;
  if char_length(v_nombre) not between 1 and 80 then
    raise exception 'nombre_invalido' using errcode = '22023';
  end if;
  if p_rubro is null or p_rubro not in ('perfumes', 'ropa', 'accesorios', 'belleza', 'comida', 'hogar', 'general') then
    raise exception 'rubro_invalido' using errcode = '22023';
  end if;
  if (select count(*) from public.miembros m join public.tiendas t on t.id = m.tienda_id
      where m.usuario_id = v_uid and m.rol = 'dueno' and t.estado = 'en_prueba') >= 3 then
    raise exception 'demasiadas_tiendas_en_prueba' using errcode = 'P0001';
  end if;

  -- Dirección corta a partir del nombre: "Dulces de Ana" → dulces-de-ana (-2, -3… si ya existe).
  v_base := lower(translate(v_nombre, 'ÁÉÍÓÚÜÑáéíóúüñ', 'AEIOUUNaeiouun'));
  v_base := btrim(regexp_replace(v_base, '[^a-z0-9]+', '-', 'g'), '-');
  if v_base = '' then v_base := 'tienda'; end if;
  v_base := left(v_base, 50);
  v_slug := v_base;
  while exists (select 1 from public.tiendas where slug = v_slug) loop
    v_n := v_n + 1;
    v_slug := v_base || '-' || v_n;
  end loop;

  insert into public.tiendas (slug, nombre, rubro) values (v_slug, v_nombre, p_rubro) returning * into v_tienda;
  insert into public.miembros (usuario_id, tienda_id, rol) values (v_uid, v_tienda.id, 'dueno');

  select email into v_email from auth.users where id = v_uid;
  insert into public.usuarios (id, tienda_id, email, rol)
  values (v_uid, v_tienda.id, lower(coalesce(v_email, '')), 'dueno')
  on conflict (id) do update set tienda_id = coalesce(public.usuarios.tienda_id, excluded.tienda_id);

  return v_tienda;
end
$$;

-- Pausar / reactivar / eliminar / recuperar. Solo la dueña. "Activar" (en prueba → activa) lo hace Deslizapp.
-- p_accion: 'pausar' | 'reactivar' | 'eliminar' | 'recuperar'.
-- Errores: tienda_no_encontrada, solo_dueno, accion_invalida, cambio_no_permitido.
create function public.cambiar_estado_tienda(p_tienda_id uuid, p_accion text)
returns public.tiendas
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.tiendas;
begin
  select * into v from public.tiendas
  where id = p_tienda_id and id in (select public.mis_tiendas_con_eliminadas())
  for update;
  if not found then
    raise exception 'tienda_no_encontrada' using errcode = 'P0002';
  end if;
  if not public.soy_dueno(p_tienda_id) then
    raise exception 'solo_dueno' using errcode = '42501';
  end if;

  if p_accion = 'pausar' and v.estado = 'activa' then
    update public.tiendas set estado = 'pausada' where id = p_tienda_id returning * into v;
  elsif p_accion = 'reactivar' and v.estado = 'pausada' then
    update public.tiendas set estado = 'activa' where id = p_tienda_id returning * into v;
  elsif p_accion = 'eliminar' and v.estado <> 'eliminada' then
    update public.tiendas set estado = 'eliminada', eliminada_en = now() where id = p_tienda_id returning * into v;
  elsif p_accion = 'recuperar' and v.estado = 'eliminada' and v.eliminada_en > now() - interval '30 days' then
    -- Vuelve pausada si ya había sido activada (la dueña decide cuándo reabrir); si no, a prueba.
    update public.tiendas
    set estado = case when activada_en is not null then 'pausada' else 'en_prueba' end, eliminada_en = null
    where id = p_tienda_id returning * into v;
  elsif p_accion not in ('pausar', 'reactivar', 'eliminar', 'recuperar') then
    raise exception 'accion_invalida' using errcode = '22023';
  else
    raise exception 'cambio_no_permitido' using errcode = 'P0001';
  end if;
  return v;
end
$$;

-- Invitar a alguien a una tienda (solo la dueña). Si ya tiene cuenta, entra de una vez; si no, al entrar con Google.
-- Errores: solo_dueno, correo_invalido, rol_invalido.
create function public.invitar_a_tienda(p_tienda_id uuid, p_email text, p_rol text default 'staff')
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_uid uuid;
begin
  if p_tienda_id is null or p_tienda_id not in (select public.mis_tiendas()) or not public.soy_dueno(p_tienda_id) then
    raise exception 'solo_dueno' using errcode = '42501';
  end if;
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'correo_invalido' using errcode = '22023';
  end if;
  if p_rol not in ('dueno', 'staff') then
    raise exception 'rol_invalido' using errcode = '22023';
  end if;

  select id into v_uid from auth.users
  where lower(email) = v_email and raw_app_meta_data ->> 'provider' = 'google' and email_confirmed_at is not null;
  if v_uid is not null then
    insert into public.miembros (usuario_id, tienda_id, rol) values (v_uid, p_tienda_id, p_rol)
    on conflict (usuario_id, tienda_id) do nothing;
    insert into public.usuarios (id, tienda_id, email, rol) values (v_uid, p_tienda_id, v_email, p_rol)
    on conflict (id) do update set tienda_id = coalesce(public.usuarios.tienda_id, excluded.tienda_id);
  else
    insert into public.invitaciones (email, tienda_id, rol) values (v_email, p_tienda_id, p_rol)
    on conflict (email, tienda_id) do update set rol = excluded.rol;
  end if;
end
$$;

-- Pasar la tienda a otra persona que ya es miembro: ella queda dueña y quien la pasa queda como ayudante.
-- Errores: solo_dueno, no_es_miembro.
create function public.transferir_tienda(p_tienda_id uuid, p_usuario_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if p_tienda_id is null or p_tienda_id not in (select public.mis_tiendas()) or not public.soy_dueno(p_tienda_id) then
    raise exception 'solo_dueno' using errcode = '42501';
  end if;
  if p_usuario_id = v_uid or not exists (select 1 from public.miembros where tienda_id = p_tienda_id and usuario_id = p_usuario_id) then
    raise exception 'no_es_miembro' using errcode = 'P0002';
  end if;
  update public.miembros set rol = 'dueno' where tienda_id = p_tienda_id and usuario_id = p_usuario_id;
  update public.miembros set rol = 'staff' where tienda_id = p_tienda_id and usuario_id = v_uid;
end
$$;

-- Quitar a alguien (la dueña) o salirse uno mismo. La tienda nunca se queda sin dueña.
-- Errores: tienda_no_encontrada, solo_dueno, ultima_duena.
create function public.quitar_de_tienda(p_tienda_id uuid, p_usuario_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if p_tienda_id is null or p_tienda_id not in (select public.mis_tiendas_con_eliminadas()) then
    raise exception 'tienda_no_encontrada' using errcode = 'P0002';
  end if;
  if p_usuario_id <> v_uid and not public.soy_dueno(p_tienda_id) then
    raise exception 'solo_dueno' using errcode = '42501';
  end if;
  if exists (select 1 from public.miembros where tienda_id = p_tienda_id and usuario_id = p_usuario_id and rol = 'dueno')
     and (select count(*) from public.miembros where tienda_id = p_tienda_id and rol = 'dueno') = 1 then
    raise exception 'ultima_duena' using errcode = 'P0001';
  end if;
  delete from public.miembros where tienda_id = p_tienda_id and usuario_id = p_usuario_id;
  update public.usuarios set tienda_id = null where id = p_usuario_id and tienda_id = p_tienda_id;
end
$$;

-- Al entrar por primera vez con Google: aplica TODAS sus invitaciones.
create or replace function public.aplicar_invitacion()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v record;
  v_primera uuid;
begin
  if coalesce(new.raw_app_meta_data ->> 'provider', '') <> 'google' or new.email_confirmed_at is null then
    return new;
  end if;
  for v in select * from public.invitaciones where email = lower(new.email) order by creado_en loop
    insert into public.miembros (usuario_id, tienda_id, rol) values (new.id, v.tienda_id, v.rol)
    on conflict (usuario_id, tienda_id) do nothing;
    v_primera := coalesce(v_primera, v.tienda_id);
  end loop;
  if v_primera is not null then
    insert into public.usuarios (id, tienda_id, email, nombre, rol)
    values (new.id, v_primera, lower(new.email),
            coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', ''),
            (select rol from public.miembros where usuario_id = new.id and tienda_id = v_primera))
    on conflict (id) do nothing;
    delete from public.invitaciones where email = lower(new.email);
  end if;
  return new;
end
$$;

-- ---------------------------------------------------------------------------
-- 7. Permisos de ejecución
-- ---------------------------------------------------------------------------
revoke execute on function public.mis_tiendas() from public, anon;
revoke execute on function public.mis_tiendas_con_eliminadas() from public, anon;
revoke execute on function public.soy_dueno(uuid) from public, anon;
revoke execute on function public.gastar_creditos(uuid, integer) from public, anon;
revoke execute on function public.crear_tienda(text, text) from public, anon;
revoke execute on function public.cambiar_estado_tienda(uuid, text) from public, anon;
revoke execute on function public.invitar_a_tienda(uuid, text, text) from public, anon;
revoke execute on function public.transferir_tienda(uuid, uuid) from public, anon;
revoke execute on function public.quitar_de_tienda(uuid, uuid) from public, anon;
grant execute on function public.mis_tiendas() to authenticated;
grant execute on function public.mis_tiendas_con_eliminadas() to authenticated;
grant execute on function public.soy_dueno(uuid) to authenticated;
grant execute on function public.gastar_creditos(uuid, integer) to authenticated;
grant execute on function public.crear_tienda(text, text) to authenticated;
grant execute on function public.cambiar_estado_tienda(uuid, text) to authenticated;
grant execute on function public.invitar_a_tienda(uuid, text, text) to authenticated;
grant execute on function public.transferir_tienda(uuid, uuid) to authenticated;
grant execute on function public.quitar_de_tienda(uuid, uuid) to authenticated;
revoke execute on function public.aplicar_invitacion() from public, anon, authenticated;
