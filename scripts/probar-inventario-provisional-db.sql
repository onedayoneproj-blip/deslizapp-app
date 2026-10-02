-- Ejecutar solo después del replay completo y de probar-inventario-db.sql, en una copia desechable.
do $$ begin
 if current_database()<>'replay_provisional' then raise exception 'Solo replay_provisional';end if;
end $$;
set role authenticated;
set request.jwt.claim.sub='11111111-1111-4111-8111-111111111111';
select stock from public.guardar_producto_inventario('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','cccccccc-cccc-4ccc-8ccc-cccccccccccc','{"nombre":"Ficha guardada"}',1,4,'reposicion',null,'10000000-0000-4000-8000-000000000001',false);
do $$ begin
 if (select stock from productos where id='cccccccc-cccc-4ccc-8ccc-cccccccccccc')<>4 or (select nombre from productos where id='cccccccc-cccc-4ccc-8ccc-cccccccccccc')<>'Ficha guardada' then raise exception 'Guardado incompleto';end if;
 if (select count(*) from ajustes_inventario)<>3 then raise exception 'Más de un ajuste';end if;
 -- Repetir un ID confirmado es inocuo.
 perform public.guardar_producto_inventario('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','cccccccc-cccc-4ccc-8ccc-cccccccccccc','{}',1,4,'reposicion',null,'10000000-0000-4000-8000-000000000001',false);
 if (select count(*) from ajustes_inventario)<>3 then raise exception 'Duplicó ajuste';end if;
 -- El mismo valor inicial usado por otra sesión no puede reemplazar el actual.
 begin perform public.guardar_producto_inventario('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','cccccccc-cccc-4ccc-8ccc-cccccccccccc','{"nombre":"No guardar"}',1,2,'reposicion',null,'10000000-0000-4000-8000-000000000002',false);raise exception 'Aceptó base antigua';exception when sqlstate 'P0001' then if SQLERRM<>'stock_base_cambio' then raise;end if;end;
 begin perform public.guardar_producto_inventario('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','cccccccc-cccc-4ccc-8ccc-cccccccccccc','{"nombre":"No guardar"}',4,3,'otro',null,'10000000-0000-4000-8000-000000000003',false);raise exception 'Aceptó otro sin nota';exception when invalid_parameter_value then null;end;
 begin perform public.guardar_producto_inventario('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','cccccccc-cccc-4ccc-8ccc-cccccccccccc','{"nombre":null}',4,5,'reposicion',null,'10000000-0000-4000-8000-000000000004',false);raise exception 'Aceptó ficha inválida';exception when not_null_violation then null;end;
 begin perform public.guardar_producto_inventario('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','dddddddd-dddd-4ddd-8ddd-dddddddddddd','{}',6,7,'reposicion',null,'10000000-0000-4000-8000-000000000005',false);raise exception 'Aceptó otra tienda';exception when insufficient_privilege then null;end;
 begin perform public.guardar_producto_inventario('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee','{}',0,1,'reposicion',null,'10000000-0000-4000-8000-000000000006',false);raise exception 'Aceptó stock null';exception when sqlstate 'P0001' then if SQLERRM<>'stock_sin_control' then raise;end if;end;
 begin perform public.guardar_producto_inventario('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','cccccccc-cccc-4ccc-8ccc-cccccccccccc','{"stock":100}',null,null,null,null,null,false);raise exception 'Aceptó stock directo';exception when invalid_parameter_value then null;end;
 if has_function_privilege('anon','public.guardar_producto_inventario(uuid,uuid,jsonb,integer,integer,text,text,uuid,boolean)','EXECUTE') then raise exception 'RPC pública';end if;
 if (select nombre from productos where id='cccccccc-cccc-4ccc-8ccc-cccccccccccc')<>'Ficha guardada' or (select stock from productos where id='cccccccc-cccc-4ccc-8ccc-cccccccccccc')<>4 or (select count(*) from ajustes_inventario)<>3 then raise exception 'Error dejó cambios parciales';end if;
end $$;
select stock from public.guardar_producto_inventario('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','cccccccc-cccc-4ccc-8ccc-cccccccccccc','{"precio":120}',null,null,null,null,null,false);
do $$ begin if (select count(*) from ajustes_inventario)<>3 then raise exception 'Ficha sola generó ajuste';end if;end $$;
select stock from public.guardar_producto_inventario('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','cccccccc-cccc-4ccc-8ccc-cccccccccccc','{}',4,0,'otro',' Conteo verificado ','10000000-0000-4000-8000-000000000007',false);
do $$ begin
 if (select nota from ajustes_inventario where id='10000000-0000-4000-8000-000000000007')<>'Conteo verificado' then raise exception 'Nota no guardada';end if;
 if (select count(*) from pedidos)<>1 then raise exception 'Ajuste generó pedido';end if;
end $$;
reset role;
create function public.prueba_guardado_falla() returns trigger language plpgsql as $$ begin raise exception 'fallo_de_historial';end $$;
create trigger prueba_guardado_falla before insert on ajustes_inventario for each row execute function public.prueba_guardado_falla();
set role authenticated;
do $$ declare v_creditos integer;begin
 select creditos_retoque into v_creditos from tiendas where id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
 begin perform public.guardar_producto_inventario('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','cccccccc-cccc-4ccc-8ccc-cccccccccccc','{"nombre":"No guardar"}',0,2,'reposicion',null,'10000000-0000-4000-8000-000000000008',true);raise exception 'No falló';exception when sqlstate 'P0001' then if SQLERRM<>'fallo_de_historial' then raise;end if;end;
 if (select stock from productos where id='cccccccc-cccc-4ccc-8ccc-cccccccccccc')<>0 or (select nombre from productos where id='cccccccc-cccc-4ccc-8ccc-cccccccccccc')<>'Ficha guardada' then raise exception 'Rollback incompleto';end if;
 if (select creditos_retoque from tiendas where id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')<>v_creditos then raise exception 'Créditos no revertidos';end if;
end $$;
reset role;
drop trigger prueba_guardado_falla on ajustes_inventario;
drop function public.prueba_guardado_falla();
