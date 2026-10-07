-- Ver como: que la BASE impida escribir mientras un admin mira una tienda. Parte 2 de 4: las RPC de producto, inventario,
-- retoque y créditos que puede llamar un miembro (security definer: saltan RLS, así que las políticas de la parte 1 no las frenan).
-- Cada una pasa a empezar con `perform public.exigir_no_viendo(<su tienda>)`. Se edita lo mínimo: se vuelve a crear la función con
-- su MISMO cuerpo, firma, permisos y search_path, más esa línea justo después de su `begin` principal (si una función no tiene
-- `begin` donde se espera, la migración falla en vez de dejarla sin cubrir). Las que ya la traen se saltan (se puede repetir).
-- La auditoría completa está en docs/handoffs/ver-como-bloqueo-auditoria.md.
-- Cubiertas por delegación y sin edición: gastar_creditos(integer), que solo llama a gastar_creditos(uuid, integer).
do $$
declare
  f record;
  def text;
  nuevo text;
begin
  for f in select * from (values
    ('public.ajustar_stock(uuid,uuid,integer,text,text,uuid)',                              'perform public.exigir_no_viendo(p_tienda_id);'),
    ('public.crear_producto(uuid,jsonb,integer,jsonb,jsonb)',                                'perform public.exigir_no_viendo(p_tienda_id);'),
    ('public.eliminar_producto(uuid,uuid)',                                                  'perform public.exigir_no_viendo(p_tienda_id);'),
    ('public.guardar_producto_inventario(uuid,uuid,jsonb,integer,integer,text,text,uuid,boolean)', 'perform public.exigir_no_viendo(p_tienda_id);'),
    ('public.guardar_variantes(uuid,uuid,jsonb,jsonb)',                                      'perform public.exigir_no_viendo(p_tienda_id);'),
    ('public.reponer_stock(uuid,jsonb,text)',                                                'perform public.exigir_no_viendo(p_tienda_id);'),
    ('public.gastar_creditos(uuid,integer)',                                                 'perform public.exigir_no_viendo(p_tienda_id);'),
    ('public.pedir_retoque(uuid,text)',                                                      'perform public.exigir_no_viendo((select p.tienda_id from public.productos p where p.id = p_producto_id));')
  ) v(firma, linea) loop
    def := pg_get_functiondef(f.firma::regprocedure);
    if position('exigir_no_viendo' in def) > 0 then continue; end if;
    -- Solo la primera coincidencia (sin la bandera g): el `begin` que abre el cuerpo.
    nuevo := regexp_replace(def, '(\n[ \t]*begin[ \t]*\n)', '\1  ' || f.linea || E'\n', 'i');
    if nuevo = def then raise exception 'No se encontró el begin principal de %', f.firma; end if;
    execute nuevo;
  end loop;
end $$;
