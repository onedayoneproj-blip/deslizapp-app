-- Ver como: que la BASE impida escribir mientras un admin mira una tienda (docs/prompts/ver-como-bloqueo-en-la-base.md).
-- Parte 1 de 4: la función de apoyo, las políticas RESTRICTIVAS de las tablas con escritura para miembros y las de Storage.
-- (Partes 2 a 4: las RPC security definer, que saltan RLS, llaman a exigir_no_viendo al inicio.)
-- Las políticas permisivas existentes no se tocan ni se reducen. Ningún dato de tiendas va aquí.

-- ─── La función de apoyo ─────────────────────────────────────────────────────────────────────────────────────────────
-- REGLA PERMANENTE (también en HANDOFF.md y docs/13 §6): toda función nueva que ESCRIBA datos de una tienda y la pueda llamar un
-- miembro (security definer o no) debe empezar con `perform public.exigir_no_viendo(<la tienda que escribe>);`, y toda tabla nueva
-- de la tienda con escritura para miembros lleva sus políticas restrictivas `ver_como_no_escribe_*` (ver más abajo). Las funciones
-- `admin_*` y las de uso público del comprador NO la llaman: no son «escribir como la tienda».
-- Lanza `solo_mirar` (42501) si la cuenta que llama tiene una sesión de Ver como VIGENTE (sin fin y sin vencer) sobre esa tienda.
-- Con tienda nula, o de otra tienda, o sin sesión, no hace nada. Al terminar o vencer la sesión, todo vuelve solo.
create function public.exigir_no_viendo(p_tienda_id uuid) returns void
language plpgsql stable set search_path = ''
as $$
begin
  if p_tienda_id is not null and p_tienda_id in (select public.tiendas_que_miro()) then
    raise exception 'solo_mirar' using errcode = '42501',
      hint = 'Estás mirando esta tienda; aquí no se cambia nada. Sal de Ver como para editar.';
  end if;
end $$;
comment on function public.exigir_no_viendo(uuid) is
  'Ver como es solo mirar: lanza solo_mirar (42501) si quien llama tiene una sesión de Ver como vigente sobre p_tienda_id. Va al inicio de toda función que escriba datos de una tienda (no en admin_* ni en las públicas del comprador).';
revoke execute on function public.exigir_no_viendo(uuid) from public, anon;
grant execute on function public.exigir_no_viendo(uuid) to authenticated;

-- ─── Tablas con escritura para miembros: una política restrictiva por orden (insert, update, delete) ─────────────────
-- Restrictiva = se suma (AND) a las permisivas. Una por orden, porque una restrictiva FOR ALL también filtraría los select.
-- `miro` es la condición «esta fila es de una tienda que esta cuenta está mirando». Las tablas que cuelgan de otra
-- (pedido_items) lo resuelven por su relación; el primer `exists` se evalúa una vez por consulta y, si no hay Ver como (lo normal),
-- corta antes de tocar `pedidos`.
do $$
declare
  t record;
  ordenes text[] := array['insert', 'update', 'delete'];
  o text;
  miro text;
begin
  for t in select * from (values
    ('clientes', 'tienda_id'), ('marca_referencias', 'tienda_id'), ('marca_tienda', 'tienda_id'),
    ('pedidos', 'tienda_id'), ('producto_variantes', 'tienda_id'), ('productos', 'tienda_id'),
    ('promos', 'tienda_id'), ('tiendas', 'id')
  ) v(tabla, col) loop
    miro := format('%I in (select public.tiendas_que_miro())', t.col);
    foreach o in array ordenes loop
      execute format('create policy %I on public.%I as restrictive for %s to authenticated %s',
        'ver_como_no_escribe_' || t.tabla || '_' || o, t.tabla, o,
        case o when 'insert' then format('with check (not (%s))', miro)
               when 'update' then format('using (not (%s)) with check (not (%s))', miro, miro)
               else format('using (not (%s))', miro) end);
    end loop;
  end loop;

  -- pedido_items: la tienda es la de su pedido.
  miro := 'exists (select 1 from public.tiendas_que_miro()) and exists (select 1 from public.pedidos p where p.id = pedido_id and p.tienda_id in (select public.tiendas_que_miro()))';
  foreach o in array ordenes loop
    execute format('create policy %I on public.pedido_items as restrictive for %s to authenticated %s',
      'ver_como_no_escribe_pedido_items_' || o, o,
      case o when 'insert' then format('with check (not (%s))', miro)
             when 'update' then format('using (not (%s)) with check (not (%s))', miro, miro)
             else format('using (not (%s))', miro) end);
  end loop;
end $$;

-- ─── Storage: los buckets de la tienda (carpeta = id de la tienda) ───────────────────────────────────────────────────
-- `productos` (fotos, videos y logo) y `marca-referencias`. `comprobantes` y `retoques` son solo del admin (no son «escribir como
-- la tienda») y no se tocan. La condición está acotada a esos dos buckets para no afectar a ningún otro.
create policy ver_como_no_escribe_archivos_insert on storage.objects as restrictive for insert to authenticated
  with check (bucket_id not in ('productos', 'marca-referencias') or (storage.foldername(name))[1] not in (select t::text from public.tiendas_que_miro() t));
create policy ver_como_no_escribe_archivos_update on storage.objects as restrictive for update to authenticated
  using (bucket_id not in ('productos', 'marca-referencias') or (storage.foldername(name))[1] not in (select t::text from public.tiendas_que_miro() t))
  with check (bucket_id not in ('productos', 'marca-referencias') or (storage.foldername(name))[1] not in (select t::text from public.tiendas_que_miro() t));
create policy ver_como_no_escribe_archivos_delete on storage.objects as restrictive for delete to authenticated
  using (bucket_id not in ('productos', 'marca-referencias') or (storage.foldername(name))[1] not in (select t::text from public.tiendas_que_miro() t));
