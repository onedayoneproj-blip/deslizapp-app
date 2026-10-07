-- Ver como: que la BASE impida escribir mientras un admin mira una tienda. Parte 4 de 4: las RPC de la tienda misma (estado,
-- catálogo en línea) y de su equipo (invitar, quitar, transferir) que puede llamar un miembro (security definer), y marcar_actividad.
-- Misma técnica y garantías que las partes 2 y 3. Auditoría: docs/handoffs/ver-como-bloqueo-auditoria.md.
-- Caso aparte, marcar_actividad: la llama el panel de la tienda cada vez que se abre y anota «última entrada» de la cuenta y
-- «última actividad» de la tienda, que alimentan la salud de la tienda en el admin. Mirar una tienda no es usarla, así que durante
-- Ver como NO escribe (devuelve false, que la app ya trata como «nada que anotar») en vez de lanzar un error en cada apertura.
-- Fuera de esta lista, a propósito: crear_tienda (la cuenta crea una tienda NUEVA para sí; no escribe en la que mira) y las
-- funciones públicas del comprador (crear_solicitud_pedido, pedir_aviso, registrar_aaah), que no usan la sesión del admin.
do $$
declare
  f record;
  def text;
  nuevo text;
begin
  for f in select * from (values
    ('public.cambiar_estado_tienda(uuid,text)',      'perform public.exigir_no_viendo(p_tienda_id);'),
    ('public.pedir_cambios_catalogo(uuid,text)',     'perform public.exigir_no_viendo(p_tienda_id);'),
    ('public.publicar_catalogo(uuid)',               'perform public.exigir_no_viendo(p_tienda_id);'),
    ('public.solicitar_catalogo(uuid)',              'perform public.exigir_no_viendo(p_tienda_id);'),
    ('public.invitar_a_tienda(uuid,text,text)',      'perform public.exigir_no_viendo(p_tienda_id);'),
    ('public.quitar_de_tienda(uuid,uuid)',           'perform public.exigir_no_viendo(p_tienda_id);'),
    ('public.transferir_tienda(uuid,uuid)',          'perform public.exigir_no_viendo(p_tienda_id);'),
    ('public.marcar_actividad(uuid)',                'if p_tienda_id in (select public.tiendas_que_miro()) then return false; end if;')
  ) v(firma, linea) loop
    def := pg_get_functiondef(f.firma::regprocedure);
    if position('exigir_no_viendo' in def) > 0 or position('tiendas_que_miro' in def) > 0 then continue; end if;
    nuevo := regexp_replace(def, '(\n[ \t]*begin[ \t]*\n)', '\1  ' || f.linea || E'\n', 'i');
    if nuevo = def then raise exception 'No se encontró el begin principal de %', f.firma; end if;
    execute nuevo;
  end loop;
end $$;
