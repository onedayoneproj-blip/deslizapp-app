-- Ver como: que la BASE impida escribir mientras un admin mira una tienda. Parte 3 de 4: las RPC de pedidos, clientes, abonos,
-- solicitudes del catálogo, avisos y envíos de «Tu próxima jugada» que puede llamar un miembro (security definer).
-- Misma técnica y mismas garantías que la parte 2: se vuelve a crear cada función con su cuerpo, firma, permisos y search_path,
-- más `perform public.exigir_no_viendo(<su tienda>)` justo después de su `begin` principal; las que no traen `p_tienda_id`
-- resuelven la tienda por su registro (cliente, pedido, abono, solicitud o aviso). Auditoría: docs/handoffs/ver-como-bloqueo-auditoria.md.
do $$
declare
  f record;
  def text;
  nuevo text;
begin
  for f in select * from (values
    ('public.borrar_cliente(uuid,boolean)',
       'perform public.exigir_no_viendo((select c.tienda_id from public.clientes c where c.id = p_cliente_id));'),
    ('public.crear_codigo_cliente(uuid,uuid,integer,integer,text)',
       'perform public.exigir_no_viendo(p_tienda_id);'),
    ('public.deshacer_despacho(uuid)',
       'perform public.exigir_no_viendo((select p.tienda_id from public.pedidos p where p.id = p_pedido_id));'),
    ('public.despachar_pedido(uuid)',
       'perform public.exigir_no_viendo((select p.tienda_id from public.pedidos p where p.id = p_pedido_id));'),
    ('public.editar_abono(uuid,integer,text,timestamp with time zone,text)',
       'perform public.exigir_no_viendo((select a.tienda_id from public.abonos a where a.id = p_abono_id));'),
    ('public.editar_pedido(uuid,uuid,jsonb,text,timestamp with time zone,boolean,boolean)',
       'perform public.exigir_no_viendo((select p.tienda_id from public.pedidos p where p.id = p_pedido_id));'),
    ('public.eliminar_abono(uuid)',
       'perform public.exigir_no_viendo((select a.tienda_id from public.abonos a where a.id = p_abono_id));'),
    ('public.eliminar_pedido(uuid)',
       'perform public.exigir_no_viendo((select p.tienda_id from public.pedidos p where p.id = p_pedido_id));'),
    ('public.registrar_abono(uuid,uuid,integer,text,timestamp with time zone,text,uuid)',
       'perform public.exigir_no_viendo(p_tienda_id);'),
    ('public.registrar_envio_jugada(uuid,uuid,text,text,uuid,uuid[])',
       'perform public.exigir_no_viendo(p_tienda_id);'),
    ('public.registrar_solicitud(uuid,uuid,jsonb,uuid[],uuid[])',
       'perform public.exigir_no_viendo((select s.tienda_id from public.solicitudes_pedido s where s.id = p_solicitud_id));'),
    ('public.descartar_solicitud(uuid)',
       'perform public.exigir_no_viendo((select s.tienda_id from public.solicitudes_pedido s where s.id = p_solicitud_id));'),
    ('public.registrar_venta_pasada(uuid,uuid,timestamp with time zone,jsonb,text,boolean)',
       'perform public.exigir_no_viendo(p_tienda_id);'),
    -- Recibe varios avisos: basta que uno sea de una tienda que se está mirando (la que se mira, si hay, es la que se devuelve).
    ('public.marcar_avisado(uuid[])',
       'perform public.exigir_no_viendo((select a.tienda_id from public.avisos_llegada a where a.id = any(coalesce(p_aviso_ids, ''{}'')) and a.tienda_id in (select public.tiendas_que_miro()) limit 1));')
  ) v(firma, linea) loop
    def := pg_get_functiondef(f.firma::regprocedure);
    if position('exigir_no_viendo' in def) > 0 then continue; end if;
    nuevo := regexp_replace(def, '(\n[ \t]*begin[ \t]*\n)', '\1  ' || f.linea || E'\n', 'i');
    if nuevo = def then raise exception 'No se encontró el begin principal de %', f.firma; end if;
    execute nuevo;
  end loop;
end $$;
