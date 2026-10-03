-- Editar un abono registrado: monto, método, fecha y nota. El abono sigue en el mismo pedido.
-- El nuevo monto no puede pasar de lo que el pedido debía antes de este abono (saldo actual + monto viejo).
create function public.editar_abono(
  p_abono_id uuid,
  p_monto integer,
  p_metodo text,
  p_fecha timestamptz,
  p_nota text default null
)
returns public.abonos
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_abono public.abonos;
  v_saldo integer;
  v_nota text := nullif(btrim(coalesce(p_nota, '')), '');
begin
  select * into v_abono from public.abonos
  where id = p_abono_id and tienda_id in (select public.mis_tiendas());
  if not found then raise exception 'abono_no_encontrado' using errcode = 'P0002'; end if;

  if p_monto is null or p_monto <= 0 then raise exception 'monto_invalido' using errcode = 'P0001'; end if;
  if p_metodo is null or p_metodo not in ('efectivo', 'transferencia', 'otro') then raise exception 'metodo_invalido' using errcode = 'P0001'; end if;
  if v_nota is not null and char_length(v_nota) > 200 then raise exception 'nota_invalida' using errcode = 'P0001'; end if;
  if p_fecha is null or p_fecha > now() + interval '1 day' then raise exception 'fecha_invalida' using errcode = 'P0001'; end if;

  -- Bloquea el pedido para que dos cambios a la vez no dejen la deuda en negativo.
  perform 1 from public.pedidos where id = v_abono.pedido_id for update;
  select s.saldo into v_saldo from public.pedidos_saldo s where s.pedido_id = v_abono.pedido_id;
  if p_monto > coalesce(v_saldo, 0) + v_abono.monto then
    raise exception 'monto_mayor_que_deuda: %', coalesce(v_saldo, 0) + v_abono.monto using errcode = 'P0001';
  end if;

  update public.abonos
     set monto = p_monto, metodo = p_metodo, fecha = p_fecha, nota = v_nota
   where id = p_abono_id
  returning * into v_abono;
  return v_abono;
end
$$;

revoke all on function public.editar_abono(uuid, integer, text, timestamptz, text) from public, anon;
grant execute on function public.editar_abono(uuid, integer, text, timestamptz, text) to authenticated;
