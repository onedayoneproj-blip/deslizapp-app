-- Equipo y permisos (docs/prompts/colaboradores-e-invitaciones.md §2.3 y §2.7). Parte 2: las RPC security definer (saltan RLS).
-- Cada función que escribe y puede llamar un miembro pasa a exigir su grupo justo después de `exigir_no_viendo` (que ya tienen
-- todas desde #59). Se edita lo mínimo: se vuelve a crear la función con su misma definición (firma, permisos y search_path) más
-- esa línea. La tienda es la misma expresión que ya usa su `exigir_no_viendo`. Auditoría: docs/handoffs/permisos-auditoria.md.
do $$
declare
  f record;
  def text;
  nuevo text;
  linea text;
begin
  for f in select * from (values
    -- ventas: pedidos, despacho, abonos, clientes, promos, solicitudes y avisos del catálogo (Ayudante en adelante).
    ('public.borrar_cliente(uuid,boolean)', 'ventas'),
    ('public.crear_codigo_cliente(uuid,uuid,integer,integer,text)', 'ventas'),
    ('public.deshacer_despacho(uuid)', 'ventas'),
    ('public.despachar_pedido(uuid)', 'ventas'),
    ('public.editar_abono(uuid,integer,text,timestamp with time zone,text)', 'ventas'),
    ('public.editar_pedido(uuid,uuid,jsonb,text,timestamp with time zone,boolean,boolean)', 'ventas'),
    ('public.eliminar_abono(uuid)', 'ventas'),
    ('public.eliminar_pedido(uuid)', 'ventas'),
    ('public.registrar_abono(uuid,uuid,integer,text,timestamp with time zone,text,uuid)', 'ventas'),
    ('public.registrar_envio_jugada(uuid,uuid,text,text,uuid,uuid[])', 'ventas'),
    ('public.registrar_solicitud(uuid,uuid,jsonb,uuid[],uuid[])', 'ventas'),
    ('public.descartar_solicitud(uuid)', 'ventas'),
    ('public.registrar_venta_pasada(uuid,uuid,timestamp with time zone,jsonb,text,boolean)', 'ventas'),
    -- catalogo: productos, variantes, inventario y reposición, publicación del catálogo (Editor en adelante).
    ('public.ajustar_stock(uuid,uuid,integer,text,text,uuid)', 'catalogo'),
    ('public.crear_producto(uuid,jsonb,integer,jsonb,jsonb)', 'catalogo'),
    ('public.eliminar_producto(uuid,uuid)', 'catalogo'),
    ('public.guardar_producto_inventario(uuid,uuid,jsonb,integer,integer,text,text,uuid,boolean)', 'catalogo'),
    ('public.guardar_variantes(uuid,uuid,jsonb,jsonb)', 'catalogo'),
    ('public.reponer_stock(uuid,jsonb,text)', 'catalogo'),
    ('public.publicar_catalogo(uuid)', 'catalogo'),
    ('public.solicitar_catalogo(uuid)', 'catalogo'),
    ('public.pedir_cambios_catalogo(uuid,text)', 'catalogo'),
    -- creditos: lo que gasta o reserva créditos (solo Administrador).
    ('public.gastar_creditos(uuid,integer)', 'creditos'),
    ('public.pedir_retoque(uuid,text)', 'creditos'),
    -- equipo: solo el dueño (ya lo exigían con soy_dueno; queda declarado igual que las demás).
    ('public.cambiar_estado_tienda(uuid,text)', 'equipo'),
    ('public.transferir_tienda(uuid,uuid)', 'equipo')
  ) v(firma, grupo) loop
    def := pg_get_functiondef(f.firma::regprocedure);
    if position('exigir_permiso' in def) > 0 then continue; end if;
    linea := substring(def from 'perform public\.exigir_no_viendo\(([^\n]*)\);');
    if linea is null then raise exception 'No se encontró exigir_no_viendo en %', f.firma; end if;
    nuevo := regexp_replace(def, '(perform public\.exigir_no_viendo\([^\n]*\);)',
      '\1' || E'\n  ' || 'perform public.exigir_permiso(' || replace(linea, '\', '\\') || ', ''' || f.grupo || ''');');
    if nuevo = def then raise exception 'No se pudo insertar exigir_permiso en %', f.firma; end if;
    execute nuevo;
  end loop;
end $$;

-- marcar_avisado («Ya llegó», avisos del catálogo → ventas): su `exigir_no_viendo` solo resuelve la tienda que se mira; aquí la
-- tienda es la de cualquier aviso de la lista en la que quien llama no tenga ventas.
do $$
declare def text; nuevo text;
begin
  def := pg_get_functiondef('public.marcar_avisado(uuid[])'::regprocedure);
  if position('exigir_permiso' in def) = 0 then
    nuevo := regexp_replace(def, '(perform public\.exigir_no_viendo\([^\n]*\);)',
      '\1' || E'\n  ' || 'perform public.exigir_permiso((select a.tienda_id from public.avisos_llegada a where a.id = any(coalesce(p_aviso_ids, ''{}'')) and not public.tengo_permiso(a.tienda_id, ''ventas'') limit 1), ''ventas'');');
    if nuevo = def then raise exception 'No se pudo insertar exigir_permiso en marcar_avisado'; end if;
    execute nuevo;
  end if;
end $$;

-- ─── Quitar y salir (§2.7) ──────────────────────────────────────────────────────────────────────────────────────────────
-- Un colaborador puede salir él mismo; quitar a OTRO es solo del dueño; a un dueño que no sea uno mismo no lo quita nadie (para eso
-- está transferir_tienda). Sigue impidiendo quitar a la última dueña. La cuenta queda con otra tienda suya o sin tienda.
-- Se edita la definición vigente con dos reemplazos exactos (si no los encuentra, falla).
do $$
declare def text; nuevo text;
  antes1 text := $t$  if p_usuario_id <> v_uid and not public\.soy_dueno\(p_tienda_id\) then\s+raise exception 'solo_dueno' using errcode = '42501';\s+end if;$t$;
  ahora1 text := $t$  if p_usuario_id is distinct from v_uid then
    perform public.exigir_permiso(p_tienda_id, 'equipo');
    if not public.soy_dueno(p_tienda_id) then raise exception 'solo_dueno' using errcode = '42501'; end if;
    if exists (select 1 from public.miembros where tienda_id = p_tienda_id and usuario_id = p_usuario_id and rol = 'dueno') then
      raise exception 'no_se_quita_dueno' using errcode = '42501';
    end if;
  end if;$t$;
  antes2 text := $t$  update public.usuarios set tienda_id = null where id = p_usuario_id and tienda_id = p_tienda_id;$t$;
  ahora2 text := $t$  update public.usuarios u set tienda_id = (
    select m.tienda_id from public.miembros m join public.tiendas t on t.id = m.tienda_id
    where m.usuario_id = p_usuario_id and t.estado <> 'eliminada' order by m.creado_en limit 1)
  where u.id = p_usuario_id and u.tienda_id = p_tienda_id;$t$;
begin
  def := pg_get_functiondef('public.quitar_de_tienda(uuid,uuid)'::regprocedure);
  -- antes1 es una expresión regular (la vigente puede tener otros saltos de línea); antes2 es texto exacto.
  if def !~ antes1 or position(antes2 in def) = 0 then raise exception 'quitar_de_tienda no es la esperada'; end if;
  nuevo := replace(regexp_replace(def, antes1, ahora1), antes2, ahora2);
  execute nuevo;
end $$;

-- ─── Una dueña que deja de serlo (transferir_tienda o admin_transferir_tienda) queda como colaboradora Administradora ─────
-- Conserva lo que podía hacer, menos el equipo. Un trigger, para no reescribir las dos funciones de transferir.
create function public.miembros_nivel_al_dejar_de_ser_duena() returns trigger
language plpgsql set search_path = ''
as $$
begin
  if old.rol = 'dueno' and new.rol = 'staff' then new.nivel := 'administrador'; end if;
  return new;
end $$;
revoke execute on function public.miembros_nivel_al_dejar_de_ser_duena() from public, anon, authenticated;
create trigger miembros_nivel_al_dejar_de_ser_duena before update of rol on public.miembros
  for each row execute function public.miembros_nivel_al_dejar_de_ser_duena();

-- ─── Invitar por correo, ahora con nivel (no pide aprobación: el dueño ya escribió quién) ─────────────────────────────────
-- `invitar_por_correo` es la que usa la app (colaborador con nivel). `invitar_a_tienda` conserva su firma (rol dueño o staff) y
-- delega en la misma lógica; un staff invitado así entra como Ayudante.
create function public.invitar_por_correo(p_tienda_id uuid, p_email text, p_nivel text default 'ayudante', p_rol text default 'staff')
returns void language plpgsql security definer set search_path = ''
as $$
declare v_email text := lower(btrim(coalesce(p_email, ''))); v_uid uuid;
begin
  perform public.exigir_no_viendo(p_tienda_id);
  perform public.exigir_permiso(p_tienda_id, 'equipo');
  if p_tienda_id is null or p_tienda_id not in (select public.mis_tiendas()) or not public.soy_dueno(p_tienda_id) then
    raise exception 'solo_dueno' using errcode = '42501';
  end if;
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'correo_invalido' using errcode = '22023'; end if;
  if p_rol not in ('dueno', 'staff') then raise exception 'rol_invalido' using errcode = '22023'; end if;
  if p_nivel is null or p_nivel not in ('ayudante', 'editor', 'administrador') then raise exception 'nivel_invalido' using errcode = '22023'; end if;
  if not public.puede_sumar_colaborador(p_tienda_id) then raise exception 'limite_colaboradores' using errcode = 'P0001'; end if;
  select id into v_uid from auth.users
  where lower(email) = v_email and raw_app_meta_data ->> 'provider' = 'google' and email_confirmed_at is not null;
  if v_uid is not null then
    insert into public.miembros (usuario_id, tienda_id, rol, nivel) values (v_uid, p_tienda_id, p_rol, p_nivel)
    on conflict (usuario_id, tienda_id) do nothing;
    insert into public.usuarios (id, tienda_id, email, rol) values (v_uid, p_tienda_id, v_email, p_rol)
    on conflict (id) do update set tienda_id = coalesce(public.usuarios.tienda_id, excluded.tienda_id);
  else
    insert into public.invitaciones (email, tienda_id, rol, nivel) values (v_email, p_tienda_id, p_rol, p_nivel)
    on conflict (email, tienda_id) do update set rol = excluded.rol, nivel = excluded.nivel;
  end if;
end $$;
revoke execute on function public.invitar_por_correo(uuid, text, text, text) from public, anon;
grant execute on function public.invitar_por_correo(uuid, text, text, text) to authenticated;

create or replace function public.invitar_a_tienda(p_tienda_id uuid, p_email text, p_rol text default 'staff')
returns void language plpgsql security definer set search_path = ''
as $$
begin
  perform public.exigir_no_viendo(p_tienda_id);
  perform public.exigir_permiso(p_tienda_id, 'equipo');
  perform public.invitar_por_correo(p_tienda_id, p_email, 'ayudante', p_rol);
end $$;

-- Al entrar con Google por primera vez, la invitación por correo se aplica con su nivel (un reemplazo exacto en la vigente).
do $$
declare def text;
  antes text := $t$insert into public.miembros (usuario_id, tienda_id, rol) values (new.id, v.tienda_id, v.rol)$t$;
  ahora text := $t$insert into public.miembros (usuario_id, tienda_id, rol, nivel) values (new.id, v.tienda_id, v.rol, v.nivel)$t$;
begin
  def := pg_get_functiondef('public.aplicar_invitacion()'::regprocedure);
  if position(antes in def) = 0 then raise exception 'aplicar_invitacion no es la esperada'; end if;
  execute replace(def, antes, ahora);
end $$;
