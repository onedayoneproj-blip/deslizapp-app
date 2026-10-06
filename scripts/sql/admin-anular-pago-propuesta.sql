-- Ensayo desechable del contrato corregido. La migración de producción se genera con CLI.
do $$ begin if current_database()<>'replay_provisional' then raise exception 'Solo replay_provisional'; end if; end $$;
create or replace function public.admin_anular_pago(p_pago_id uuid, p_motivo text) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_pago public.pagos;
  v_anula public.pagos;
  v_motivo text := nullif(btrim(coalesce(p_motivo, '')), '');
  v_hasta date;
  v_antes date;
  v_dia date;
  q public.pagos;
  v_t public.tiendas;
begin
  if not public.soy_admin() then raise exception 'no_admin' using errcode = '42501'; end if;
  if v_motivo is null or char_length(v_motivo) > 300 then raise exception 'motivo_invalido' using errcode = '22023'; end if;
  select * into v_pago from public.pagos where id = p_pago_id;
  if not found then raise exception 'pago_no_encontrado' using errcode = 'P0002'; end if;
  select * into v_t from public.tiendas where id = v_pago.tienda_id for update;
  if v_pago.anula_a is not null or exists (select 1 from public.pagos where anula_a = p_pago_id) then
    raise exception 'pago_ya_anulado' using errcode = 'P0001';
  end if;
  if v_pago.concepto = 'mensualidad' then
    -- La base anterior al PRIMER pago sobrevive a cualquier orden de anulaciones.
    select p.pagado_hasta_anterior into v_hasta from public.pagos p
    where p.tienda_id = v_pago.tienda_id and p.concepto = 'mensualidad' and p.anula_a is null
    order by p.numero limit 1;
    v_antes := v_hasta;
    for q in select * from public.pagos x where x.tienda_id = v_pago.tienda_id and x.concepto = 'mensualidad' and x.anula_a is null
      and not exists (select 1 from public.pagos a where a.anula_a = x.id)
      order by x.numero loop
      v_dia := (q.creado_en at time zone 'America/Santo_Domingo')::date;
      v_antes := (greatest(coalesce(v_antes, v_dia), v_dia) + make_interval(months => q.meses))::date;
      if q.id <> v_pago.id then
        v_hasta := (greatest(coalesce(v_hasta, v_dia), v_dia) + make_interval(months => q.meses))::date;
      end if;
    end loop;
    -- No borrar una cobertura posterior introducida por SQL privilegiado sin procedencia.
    -- No hay otra RPC que la modifique. Una discrepancia requiere conciliación explícita.
    if v_t.pagado_hasta is distinct from v_antes then
      raise exception 'cobertura_no_conciliada' using errcode = 'P0001';
    end if;
  end if;
  insert into public.pagos (tienda_id, concepto, monto, metodo, anula_a, nota)
  values (v_pago.tienda_id, v_pago.concepto, -v_pago.monto, v_pago.metodo, v_pago.id, v_motivo)
  returning * into v_anula;
  if v_pago.concepto = 'mensualidad' then
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
