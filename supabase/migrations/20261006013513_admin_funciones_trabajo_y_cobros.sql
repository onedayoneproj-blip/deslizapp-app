-- Admin de Deslizapp, parte 1 (docs/13-admin.md §3, §7, §8 y docs/prompts/admin-1-base.md §3): trabajo (catálogos,
-- personalización y retoque) y cobros. Mismas reglas que admin_funciones: security definer, soy_admin() primero
-- (no_admin, 42501), solo para authenticated, y su fila en registro_admin si cambian algo.

-- ─── Trabajo: catálogos y personalización ───────────────────────────────────────────────────────────────────────────

-- empezar (solicitado → generando 1), siguiente (paso + 1, hasta 3), a_revisar (generando 3 o cambios → revisar).
-- a_revisar exige el enlace del catálogo (la tienda no puede publicar sin él); p_url_catalogo lo pone si falta.
create function public.admin_catalogo_avanzar(p_tienda_id uuid, p_accion text, p_url_catalogo text default null) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare v public.tiendas; v_antes text; v_paso_antes smallint;
begin
  if not public.soy_admin() then raise exception 'no_admin' using errcode = '42501'; end if;
  select * into v from public.tiendas where id = p_tienda_id for update;
  if not found or v.estado = 'eliminada' then raise exception 'tienda_no_encontrada' using errcode = 'P0002'; end if;
  v_antes := v.catalogo_estado; v_paso_antes := v.catalogo_paso;
  if p_accion = 'empezar' and v.catalogo_estado = 'solicitado' then
    update public.tiendas set catalogo_estado = 'generando', catalogo_paso = 1 where id = p_tienda_id returning * into v;
  elsif p_accion = 'siguiente' and v.catalogo_estado = 'generando' and coalesce(v.catalogo_paso, 1) < 3 then
    update public.tiendas set catalogo_paso = coalesce(v.catalogo_paso, 1) + 1 where id = p_tienda_id returning * into v;
  elsif p_accion = 'a_revisar' and ((v.catalogo_estado = 'generando' and v.catalogo_paso = 3) or v.catalogo_estado = 'cambios') then
    if p_url_catalogo is not null and (p_url_catalogo !~ '^https://[^[:space:]]+$' or char_length(p_url_catalogo) > 2048) then
      raise exception 'enlace_invalido' using errcode = '22023';
    end if;
    if coalesce(p_url_catalogo, v.url_catalogo) is null then raise exception 'catalogo_sin_enlace' using errcode = 'P0001'; end if;
    update public.tiendas set catalogo_estado = 'revisar', catalogo_paso = null, url_catalogo = coalesce(p_url_catalogo, url_catalogo)
    where id = p_tienda_id returning * into v;
  elsif p_accion not in ('empezar', 'siguiente', 'a_revisar') then
    raise exception 'accion_invalida' using errcode = '22023';
  else
    raise exception 'catalogo_estado_invalido' using errcode = 'P0001';
  end if;
  perform public.anotar_admin(p_tienda_id, 'catalogo_avanzar', jsonb_build_object('accion', p_accion,
    'de', jsonb_build_object('estado', v_antes, 'paso', v_paso_antes), 'a', jsonb_build_object('estado', v.catalogo_estado, 'paso', v.catalogo_paso)));
  return jsonb_build_object('catalogo_estado', v.catalogo_estado, 'catalogo_paso', v.catalogo_paso, 'catalogo_paso_en', v.catalogo_paso_en,
    'url_catalogo', v.url_catalogo);
end $$;

-- Merge en personalizacion (tema, mensajes, secciones; un null borra una clave) y, por producto, orden y opiniones.
-- p_cambios: {tema?, mensajes?, secciones?, productos?: [{id, orden?, opiniones?}]}. Valida igual que la base.
create function public.admin_guardar_personalizacion(p_tienda_id uuid, p_cambios jsonb) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare v public.tiendas; v_nueva jsonb; e jsonb; v_n integer;
begin
  if not public.soy_admin() then raise exception 'no_admin' using errcode = '42501'; end if;
  if p_cambios is null or jsonb_typeof(p_cambios) <> 'object'
    or exists (select 1 from jsonb_object_keys(p_cambios) k where k not in ('tema', 'mensajes', 'secciones', 'productos')) then
    raise exception 'personalizacion_invalida' using errcode = '22023';
  end if;
  select * into v from public.tiendas where id = p_tienda_id for update;
  if not found or v.estado = 'eliminada' then raise exception 'tienda_no_encontrada' using errcode = 'P0002'; end if;
  v_nueva := public.jsonb_mezclar(v.personalizacion, p_cambios - 'productos');
  if not public.personalizacion_valida(v_nueva) then raise exception 'personalizacion_invalida' using errcode = '22023'; end if;
  if v_nueva is distinct from v.personalizacion then
    update public.tiendas set personalizacion = v_nueva where id = p_tienda_id;
  end if;
  if p_cambios ? 'productos' then
    if jsonb_typeof(p_cambios -> 'productos') <> 'array' or jsonb_array_length(p_cambios -> 'productos') > 500 then
      raise exception 'personalizacion_invalida' using errcode = '22023';
    end if;
    for e in select value from jsonb_array_elements(p_cambios -> 'productos') loop
      if jsonb_typeof(e) <> 'object' or exists (select 1 from jsonb_object_keys(e) k where k not in ('id', 'orden', 'opiniones'))
        or jsonb_typeof(e -> 'id') <> 'string' or e ->> 'id' !~ '^[0-9a-f-]{36}$'
        or (e ? 'orden' and not (jsonb_typeof(e -> 'orden') = 'null'
              or (jsonb_typeof(e -> 'orden') = 'number' and e ->> 'orden' ~ '^[0-9]{1,4}$')))
        or (e ? 'opiniones' and not public.opiniones_validas(e -> 'opiniones')) then
        raise exception 'personalizacion_invalida' using errcode = '22023';
      end if;
      update public.productos set
        orden = case when e ? 'orden' then (e ->> 'orden')::integer else orden end,
        opiniones = case when e ? 'opiniones' then e -> 'opiniones' else opiniones end
      where id = (e ->> 'id')::uuid and tienda_id = p_tienda_id and eliminado_en is null;
      get diagnostics v_n = row_count;
      if v_n = 0 then raise exception 'producto_no_encontrado' using errcode = 'P0002'; end if;
    end loop;
  end if;
  perform public.anotar_admin(p_tienda_id, 'guardar_personalizacion', jsonb_build_object(
    'claves', (select coalesce(jsonb_agg(k), '[]'::jsonb) from jsonb_object_keys(p_cambios - 'productos') k),
    'productos', coalesce(jsonb_array_length(p_cambios -> 'productos'), 0)));
  return v_nueva;
end $$;

-- ─── Trabajo: retoque (docs/13 §7) ──────────────────────────────────────────────────────────────────────────────────

-- Entregar: reemplaza la foto en productos.medios (retocada: true), cobra lo reservado y lo anota.
create function public.admin_retoque_entregar(p_trabajo_id uuid, p_url_retocada text) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare v public.trabajos_retoque; v_medios jsonb; v_n integer;
begin
  if not public.soy_admin() then raise exception 'no_admin' using errcode = '42501'; end if;
  if p_url_retocada is null or p_url_retocada !~ '^https://[^[:space:]]+$' or char_length(p_url_retocada) > 2048 then raise exception 'enlace_invalido' using errcode = '22023'; end if;
  select * into v from public.trabajos_retoque where id = p_trabajo_id for update;
  if not found then raise exception 'trabajo_no_encontrado' using errcode = 'P0002'; end if;
  if v.estado <> 'pendiente' then raise exception 'trabajo_no_pendiente' using errcode = 'P0001'; end if;
  select medios into v_medios from public.productos where id = v.producto_id and tienda_id = v.tienda_id and eliminado_en is null for update;
  if not found then raise exception 'producto_no_encontrado' using errcode = 'P0002'; end if;
  select count(*) into v_n from jsonb_array_elements(v_medios) e where e ->> 'tipo' = 'foto' and e ->> 'url' = v.medio_url_original;
  if v_n = 0 then raise exception 'foto_no_encontrada' using errcode = 'P0002'; end if;
  update public.productos set medios = (
    select jsonb_agg(case when e ->> 'tipo' = 'foto' and e ->> 'url' = v.medio_url_original
                          then jsonb_build_object('tipo', 'foto', 'url', p_url_retocada, 'retocada', true) else e end order by n)
    from jsonb_array_elements(v_medios) with ordinality as x(e, n))
  where id = v.producto_id;
  update public.trabajos_retoque set estado = 'entregado', medio_url_retocado = p_url_retocada,
    atendido_por = (select auth.uid()), atendido_en = now()
  where id = p_trabajo_id returning * into v;
  insert into public.movimientos_creditos (tienda_id, cantidad, tipo, motivo, trabajo_id, creado_por)
  values (v.tienda_id, -v.creditos, 'retoque', 'foto retocada por el equipo', v.id, (select auth.uid()));
  perform public.anotar_admin(v.tienda_id, 'retoque_entregar', jsonb_build_object('trabajo_id', v.id, 'producto_id', v.producto_id, 'creditos', v.creditos));
  return to_jsonb(v);
end $$;

-- La cola de fotos (Trabajo › Fotos): por defecto las pendientes, de la más vieja a la más nueva, con tienda y producto.
create function public.admin_trabajos_retoque(p_estado text default 'pendiente') returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not public.soy_admin() then raise exception 'no_admin' using errcode = '42501'; end if;
  if coalesce(p_estado, '') not in ('pendiente', 'entregado', 'devuelto') then raise exception 'estado_invalido' using errcode = '22023'; end if;
  return coalesce((select jsonb_agg(to_jsonb(tr) || jsonb_build_object('tienda_nombre', t.nombre, 'tienda_whatsapp', t.whatsapp,
      'vendedora', t.nombre_vendedora, 'producto_nombre', p.nombre) order by tr.creado_en, tr.id)
    from (select * from public.trabajos_retoque x where x.estado = p_estado
          order by case when p_estado = 'pendiente' then x.creado_en end, x.atendido_en desc nulls last limit 200) tr
    join public.tiendas t on t.id = tr.tienda_id
    join public.productos p on p.id = tr.producto_id), '[]'::jsonb);
end $$;

-- Devolver: con un motivo corto; libera la reserva y no cobra.
create function public.admin_retoque_devolver(p_trabajo_id uuid, p_motivo text) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare v public.trabajos_retoque; v_motivo text := nullif(btrim(coalesce(p_motivo, '')), '');
begin
  if not public.soy_admin() then raise exception 'no_admin' using errcode = '42501'; end if;
  if v_motivo is null or char_length(v_motivo) > 200 then raise exception 'motivo_invalido' using errcode = '22023'; end if;
  select * into v from public.trabajos_retoque where id = p_trabajo_id for update;
  if not found then raise exception 'trabajo_no_encontrado' using errcode = 'P0002'; end if;
  if v.estado <> 'pendiente' then raise exception 'trabajo_no_pendiente' using errcode = 'P0001'; end if;
  update public.trabajos_retoque set estado = 'devuelto', motivo_devolucion = v_motivo, atendido_por = (select auth.uid()), atendido_en = now()
  where id = p_trabajo_id returning * into v;
  perform public.anotar_admin(v.tienda_id, 'retoque_devolver', jsonb_build_object('trabajo_id', v.id, 'motivo', v_motivo));
  return to_jsonb(v);
end $$;

-- ─── Cobros (docs/13 §8) ────────────────────────────────────────────────────────────────────────────────────────────

-- Registra un pago. Mensualidad: suma p_meses (1 por defecto) a max(pagado_hasta, hoy) y, si la tienda estaba en
-- prueba, la activa. Créditos: suma un movimiento `compra` con p_creditos. Devuelve {pago, pagado_hasta, creditos}.
create function public.admin_registrar_pago(p_tienda_id uuid, p_concepto text, p_monto integer, p_metodo text,
  p_referencia text default null, p_comprobante_url text default null, p_nota text default null,
  p_meses integer default null, p_creditos integer default null) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_t public.tiendas;
  v_pago public.pagos;
  v_hoy date := public.hoy_rd();
  v_meses integer;
  v_hasta date;
begin
  if not public.soy_admin() then raise exception 'no_admin' using errcode = '42501'; end if;
  if p_concepto is null or p_concepto not in ('mensualidad', 'creditos', 'instalacion', 'otro') then raise exception 'concepto_invalido' using errcode = '22023'; end if;
  if p_metodo is null or p_metodo not in ('transferencia', 'deposito', 'efectivo') then raise exception 'metodo_invalido' using errcode = '22023'; end if;
  if p_monto is null or p_monto < 0 then raise exception 'monto_invalido' using errcode = '22023'; end if;
  if p_concepto = 'mensualidad' then
    v_meses := coalesce(p_meses, 1);
    if v_meses not between 1 and 12 then raise exception 'meses_invalidos' using errcode = '22023'; end if;
  elsif p_meses is not null then raise exception 'meses_invalidos' using errcode = '22023';
  end if;
  if p_concepto = 'creditos' then
    if p_creditos is null or p_creditos <= 0 then raise exception 'creditos_invalidos' using errcode = '22023'; end if;
  elsif p_creditos is not null then raise exception 'creditos_invalidos' using errcode = '22023';
  end if;
  if p_comprobante_url is not null and split_part(p_comprobante_url, '/', 1) <> p_tienda_id::text then
    raise exception 'comprobante_invalido' using errcode = '22023';
  end if;
  select * into v_t from public.tiendas where id = p_tienda_id for update;
  if not found or v_t.estado = 'eliminada' then raise exception 'tienda_no_encontrada' using errcode = 'P0002'; end if;
  if p_concepto = 'mensualidad' then
    v_hasta := (greatest(coalesce(v_t.pagado_hasta, v_hoy), v_hoy) + make_interval(months => v_meses))::date;
  end if;
  insert into public.pagos (tienda_id, concepto, monto, metodo, referencia, comprobante_url, meses, creditos, cubre_hasta,
    pagado_hasta_anterior, nota)
  values (p_tienda_id, p_concepto, p_monto, p_metodo, nullif(btrim(p_referencia), ''), p_comprobante_url, v_meses, p_creditos,
    v_hasta, v_t.pagado_hasta, nullif(btrim(p_nota), ''))
  returning * into v_pago;
  if p_concepto = 'mensualidad' then
    update public.tiendas set pagado_hasta = v_hasta,
      estado = case when estado = 'en_prueba' then 'activa' else estado end,
      activada_en = case when estado = 'en_prueba' then coalesce(activada_en, now()) else activada_en end
    where id = p_tienda_id returning * into v_t;
  elsif p_concepto = 'creditos' then
    insert into public.movimientos_creditos (tienda_id, cantidad, tipo, motivo, pago_id, creado_por)
    values (p_tienda_id, p_creditos, 'compra', 'créditos comprados', v_pago.id, (select auth.uid()));
    select * into v_t from public.tiendas where id = p_tienda_id;
  end if;
  perform public.anotar_admin(p_tienda_id, 'registrar_pago', jsonb_build_object('pago_id', v_pago.id, 'concepto', p_concepto,
    'monto', p_monto, 'pagado_hasta', v_t.pagado_hasta));
  return jsonb_build_object('pago', to_jsonb(v_pago), 'pagado_hasta', v_t.pagado_hasta, 'creditos', v_t.creditos_retoque, 'estado', v_t.estado);
end $$;

-- Anula un pago con otro de signo contrario que lo referencia. Mensualidad: recalcula pagado_hasta desde lo que había
-- antes de ese pago, volviendo a aplicar las mensualidades vigentes que vinieron después. Créditos: los quita (si ya se
-- usaron, no se puede: creditos_ya_usados).
create function public.admin_anular_pago(p_pago_id uuid, p_motivo text) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_pago public.pagos;
  v_anula public.pagos;
  v_motivo text := nullif(btrim(coalesce(p_motivo, '')), '');
  v_hasta date;
  v_dia date;
  q public.pagos;
  v_t public.tiendas;
begin
  if not public.soy_admin() then raise exception 'no_admin' using errcode = '42501'; end if;
  if v_motivo is null or char_length(v_motivo) > 300 then raise exception 'motivo_invalido' using errcode = '22023'; end if;
  select * into v_pago from public.pagos where id = p_pago_id;
  if not found then raise exception 'pago_no_encontrado' using errcode = 'P0002'; end if;
  perform 1 from public.tiendas where id = v_pago.tienda_id for update;
  if v_pago.anula_a is not null or exists (select 1 from public.pagos where anula_a = p_pago_id) then
    raise exception 'pago_ya_anulado' using errcode = 'P0001';
  end if;
  insert into public.pagos (tienda_id, concepto, monto, metodo, anula_a, nota)
  values (v_pago.tienda_id, v_pago.concepto, -v_pago.monto, v_pago.metodo, v_pago.id, v_motivo)
  returning * into v_anula;
  if v_pago.concepto = 'mensualidad' then
    v_hasta := v_pago.pagado_hasta_anterior;
    for q in select * from public.pagos x where x.tienda_id = v_pago.tienda_id and x.concepto = 'mensualidad' and x.anula_a is null
      and x.numero > v_pago.numero and not exists (select 1 from public.pagos a where a.anula_a = x.id)
      order by x.numero loop
      v_dia := (q.creado_en at time zone 'America/Santo_Domingo')::date;
      v_hasta := (greatest(coalesce(v_hasta, v_dia), v_dia) + make_interval(months => q.meses))::date;
    end loop;
    update public.tiendas set pagado_hasta = v_hasta where id = v_pago.tienda_id;
  elsif v_pago.concepto = 'creditos' then
    if (select creditos_retoque from public.tiendas where id = v_pago.tienda_id) - public.creditos_reservados(v_pago.tienda_id) < v_pago.creditos then
      raise exception 'creditos_ya_usados' using errcode = 'P0001';
    end if;
    insert into public.movimientos_creditos (tienda_id, cantidad, tipo, motivo, pago_id, creado_por)
    values (v_pago.tienda_id, -v_pago.creditos, 'ajuste', 'anulación de pago', v_anula.id, (select auth.uid()));
  end if;
  select * into v_t from public.tiendas where id = v_pago.tienda_id;
  perform public.anotar_admin(v_pago.tienda_id, 'anular_pago', jsonb_build_object('pago_id', v_pago.id, 'anulacion_id', v_anula.id,
    'motivo', v_motivo, 'pagado_hasta', v_t.pagado_hasta));
  return jsonb_build_object('anulacion', to_jsonb(v_anula), 'pagado_hasta', v_t.pagado_hasta, 'creditos', v_t.creditos_retoque);
end $$;

-- Suma o resta créditos con un motivo. El saldo libre (sin lo reservado) nunca baja de 0. Devuelve el saldo nuevo.
create function public.admin_ajustar_creditos(p_tienda_id uuid, p_cantidad integer, p_motivo text) returns integer
language plpgsql security definer set search_path = ''
as $$
declare v_motivo text := nullif(btrim(coalesce(p_motivo, '')), ''); v_saldo integer;
begin
  if not public.soy_admin() then raise exception 'no_admin' using errcode = '42501'; end if;
  if p_cantidad is null or p_cantidad = 0 or abs(p_cantidad) > 100000 then raise exception 'cantidad_invalida' using errcode = '22023'; end if;
  if v_motivo is null or char_length(v_motivo) > 200 then raise exception 'motivo_invalido' using errcode = '22023'; end if;
  select creditos_retoque into v_saldo from public.tiendas where id = p_tienda_id for update;
  if not found then raise exception 'tienda_no_encontrada' using errcode = 'P0002'; end if;
  if v_saldo - public.creditos_reservados(p_tienda_id) + p_cantidad < 0 then raise exception 'creditos_insuficientes' using errcode = 'P0001'; end if;
  insert into public.movimientos_creditos (tienda_id, cantidad, tipo, motivo, creado_por)
  values (p_tienda_id, p_cantidad, 'ajuste', v_motivo, (select auth.uid()));
  select creditos_retoque into v_saldo from public.tiendas where id = p_tienda_id;
  perform public.anotar_admin(p_tienda_id, 'ajustar_creditos', jsonb_build_object('cantidad', p_cantidad, 'motivo', v_motivo, 'saldo', v_saldo));
  return v_saldo;
end $$;

-- Recarga del mes: los créditos mensuales del plan (en `custom`, los de la tienda), una vez por mes y por tienda.
-- Sin p_tienda_id, todas las activas y en prueba. Idempotente: repetirla en el mismo mes no suma. Devuelve cuántas recargó.
create function public.admin_recarga_mensual(p_tienda_id uuid default null) returns integer
language plpgsql security definer set search_path = ''
as $$
declare v_periodo date := date_trunc('month', public.hoy_rd())::date; v_n integer;
begin
  if not public.soy_admin() then raise exception 'no_admin' using errcode = '42501'; end if;
  if p_tienda_id is not null and not exists (select 1 from public.tiendas where id = p_tienda_id and estado in ('activa', 'en_prueba')) then
    raise exception 'tienda_no_encontrada' using errcode = 'P0002';
  end if;
  insert into public.movimientos_creditos (tienda_id, cantidad, tipo, motivo, periodo, creado_por)
  select t.id, case when t.plan = 'custom' then t.creditos_retoque_mensuales else pl.creditos_mensuales end,
    'recarga_mensual', 'recarga del mes', v_periodo, (select auth.uid())
  from public.tiendas t join public.planes pl on pl.id = t.plan
  where t.estado in ('activa', 'en_prueba') and (p_tienda_id is null or t.id = p_tienda_id)
    and case when t.plan = 'custom' then t.creditos_retoque_mensuales else pl.creditos_mensuales end > 0
  order by t.id
  on conflict (tienda_id, periodo) where tipo = 'recarga_mensual' do nothing;
  get diagnostics v_n = row_count;
  perform public.anotar_admin(p_tienda_id, 'recarga_mensual', jsonb_build_object('periodo', v_periodo, 'recargadas', v_n));
  return v_n;
end $$;

-- ─── Permisos: las admin_* solo para authenticated (y adentro, solo para admins) ────────────────────────────────────
do $$
declare f record;
begin
  for f in select p.oid::regprocedure as firma from pg_proc p
           where p.pronamespace = 'public'::regnamespace and p.proname like 'admin\_%' and p.proname <> 'admin_viendo' loop
    execute format('revoke execute on function %s from public, anon', f.firma);
    execute format('grant execute on function %s to authenticated', f.firma);
  end loop;
end $$;
