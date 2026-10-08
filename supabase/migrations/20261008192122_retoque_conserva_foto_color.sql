-- Entregar un retoque ya no borra la foto de un color (fallo encontrado en el PR #84).
-- `admin_retoque_entregar` cambiaba `medios` ANTES de marcar el trabajo «entregado». El trigger `productos_z_fotos_por_valor`
-- (limpieza de `fotos_por_valor`) busca la versión retocada de una foto que salió de `medios` en `trabajos_retoque` con
-- estado «entregado»; como el trabajo seguía «pendiente», no la encontraba y la entrada del color se borraba.
-- Ahora se marca el trabajo primero y después se reemplaza la foto: el color pasa a apuntar a la retocada. Si la foto no estaba
-- asignada a un color, nada cambia. Todo sigue en la misma transacción (un error deshace las dos cosas), y la url sigue pasando
-- por `medio_url_valida` y por la restricción `productos_medios_hosts_propios`.
-- Misma firma: reemplazo exacto sobre la definición vigente (sin `drop function`). Ningún dato de tiendas va aquí.

do $$
declare
  def text;
  nuevo text;
  v_productos constant text :=
    E'  update public.productos set medios = (\n'
    || E'    select jsonb_agg(case when e ->> \'tipo\' = \'foto\' and e ->> \'url\' = v.medio_url_original\n'
    || E'                          then jsonb_build_object(\'tipo\', \'foto\', \'url\', p_url_retocada, \'retocada\', true) else e end order by n)\n'
    || E'    from jsonb_array_elements(v_medios) with ordinality as x(e, n))\n'
    || E'  where id = v.producto_id;\n';
  v_trabajo constant text :=
    E'  update public.trabajos_retoque set estado = \'entregado\', medio_url_retocado = p_url_retocada,\n'
    || E'    atendido_por = (select auth.uid()), atendido_en = now()\n'
    || E'  where id = p_trabajo_id returning * into v;\n';
begin
  def := pg_get_functiondef('public.admin_retoque_entregar(uuid, text)'::regprocedure);
  if position(v_productos || v_trabajo in def) = 0 then
    raise exception 'No se encontró el orden esperado en admin_retoque_entregar';
  end if;
  nuevo := replace(def, v_productos || v_trabajo,
    E'  -- Primero el trabajo «entregado»: así la limpieza de fotos_por_valor encuentra la retocada y el color la sigue.\n'
    || v_trabajo || v_productos);
  execute nuevo;
end $$;
