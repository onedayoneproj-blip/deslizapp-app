-- Solo para el replay desechable llamado replay_final. Nunca ejecutar en producción.
-- Requiere la cadena completa de supabase/migrations y fixtures mínimos de Auth/Storage.
-- La concurrencia se comprueba aparte con dos conexiones a esta misma base desechable.
do $$ begin
  if current_database() <> 'replay_final' then raise exception 'Solo se permite la base desechable replay_final'; end if;
end $$;
insert into auth.users(id,email) values
 ('11111111-1111-4111-8111-111111111111','inventario-uno@example.invalid'),
 ('22222222-2222-4222-8222-222222222222','inventario-dos@example.invalid');
insert into public.tiendas(id,slug,nombre) values
 ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','inventario-test-uno','Prueba uno'),
 ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','inventario-test-dos','Prueba dos');
insert into public.usuarios(id,tienda_id,email,nombre) values
 ('11111111-1111-4111-8111-111111111111','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','inventario-uno@example.invalid','Uno'),
 ('22222222-2222-4222-8222-222222222222','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','inventario-dos@example.invalid','Dos');
insert into public.miembros(usuario_id,tienda_id,rol) values
 ('11111111-1111-4111-8111-111111111111','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','dueno'),
 ('22222222-2222-4222-8222-222222222222','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','dueno');
insert into public.productos(id,tienda_id,nombre,precio,stock) values
 ('cccccccc-cccc-4ccc-8ccc-cccccccccccc','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','Controlado',100,1),
 ('dddddddd-dddd-4ddd-8ddd-dddddddddddd','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','Otra tienda',100,5),
 ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','Sin control',100,null);
set role authenticated;
set request.jwt.claim.sub='22222222-2222-4222-8222-222222222222';
select stock from public.ajustar_stock('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','dddddddd-dddd-4ddd-8ddd-dddddddddddd',1,'reposicion');
set request.jwt.claim.sub='11111111-1111-4111-8111-111111111111';
select stock from public.ajustar_stock('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','cccccccc-cccc-4ccc-8ccc-cccccccccccc',1,'reposicion');
select stock from public.ajustar_stock('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','cccccccc-cccc-4ccc-8ccc-cccccccccccc',-1,'dano');
do $$ begin
  if (select count(*) from public.ajustes_inventario) <> 2 then raise exception 'RLS no aisla registros';end if;
  if exists(select 1 from public.ajustes_inventario where tienda_id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb') then raise exception 'RLS expone otra tienda';end if;
  begin perform public.ajustar_stock('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','dddddddd-dddd-4ddd-8ddd-dddddddddddd',1,'reposicion');raise exception 'Aceptó otra tienda';exception when insufficient_privilege then null;end;
  begin perform public.ajustar_stock('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','cccccccc-cccc-4ccc-8ccc-cccccccccccc',-99,'perdida');raise exception 'Aceptó negativo';exception when sqlstate 'P0001' then if SQLERRM <> 'stock_negativo' then raise;end if;end;
  begin perform public.ajustar_stock('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',1,'reposicion');raise exception 'Aceptó stock null';exception when sqlstate 'P0001' then if SQLERRM <> 'stock_sin_control' then raise;end if;end;
  begin update public.productos set stock=100 where id='cccccccc-cccc-4ccc-8ccc-cccccccccccc';raise exception 'Aceptó stock directo';exception when insufficient_privilege then null;end;
  if has_table_privilege('authenticated','public.ajustes_inventario','INSERT') or has_table_privilege('authenticated','public.ajustes_inventario','UPDATE') then raise exception 'Historial escribible directamente';end if;
  if has_function_privilege('anon','public.ajustar_stock(uuid,uuid,integer,text,text)','EXECUTE') then raise exception 'RPC pública';end if;
end $$;
reset role;
insert into public.pedidos(id,tienda_id,estado) values ('ffffffff-ffff-4fff-8fff-ffffffffffff','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','por_despachar');
insert into public.pedido_items(pedido_id,producto_id,nombre_producto,cantidad,precio_unitario) values ('ffffffff-ffff-4fff-8fff-ffffffffffff','cccccccc-cccc-4ccc-8ccc-cccccccccccc','Controlado',1,100);
set role authenticated;
select estado from public.despachar_pedido('ffffffff-ffff-4fff-8fff-ffffffffffff');
do $$ begin
  if (select stock from public.productos where id='cccccccc-cccc-4ccc-8ccc-cccccccccccc') <> 0 then raise exception 'Despacho descuenta mal';end if;
  begin perform public.despachar_pedido('ffffffff-ffff-4fff-8fff-ffffffffffff');raise exception 'Aceptó doble despacho';exception when sqlstate 'P0001' then if SQLERRM <> 'pedido_no_despachable' then raise;end if;end;
end $$;
select estado from public.deshacer_despacho('ffffffff-ffff-4fff-8fff-ffffffffffff');
do $$ begin
  if (select stock from public.productos where id='cccccccc-cccc-4ccc-8ccc-cccccccccccc') <> 1 then raise exception 'Devolución incorrecta';end if;
  if (select count(*) from public.ajustes_inventario) <> 2 then raise exception 'Pedido crea ajuste manual';end if;
end $$;
reset role;
create function public.inventario_test_fallo() returns trigger language plpgsql as $$ begin raise exception 'fallo_registro_de_prueba';end $$;
create trigger inventario_test_fallo before insert on public.ajustes_inventario for each row execute function public.inventario_test_fallo();
set role authenticated;
do $$ begin
  begin perform public.ajustar_stock('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','cccccccc-cccc-4ccc-8ccc-cccccccccccc',1,'reposicion');raise exception 'No falló el registro';exception when sqlstate 'P0001' then if SQLERRM <> 'fallo_registro_de_prueba' then raise;end if;end;
  if (select stock from public.productos where id='cccccccc-cccc-4ccc-8ccc-cccccccccccc') <> 1 or (select count(*) from public.ajustes_inventario) <> 2 then raise exception 'Rollback incompleto';end if;
end $$;
reset role;
drop trigger inventario_test_fallo on public.ajustes_inventario;
drop function public.inventario_test_fallo();
