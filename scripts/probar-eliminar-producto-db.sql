-- Solo replay desechable. Autorización real por auth.uid/miembros; cada escenario revierte sus filas.
begin;
do $$ begin if current_database()<>'replay_provisional' then raise exception 'Solo replay_provisional'; end if; end $$;
insert into auth.users(id,email) values ('20000000-0000-4000-8000-000000000001','panel@prueba.invalid'),('20000000-0000-4000-8000-000000000002','otra@prueba.invalid');
insert into public.tiendas(id,nombre,slug,estado,catalogo_estado) values ('10000000-0000-4000-8000-000000000001','Panel prueba','panel-prueba','activa','publicado'),('10000000-0000-4000-8000-000000000002','Otra','panel-otra','activa','publicado');
insert into public.miembros(usuario_id,tienda_id) values ('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001'),('20000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000002');
insert into public.productos(id,tienda_id,nombre,precio,stock,opciones) values ('30000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','Camisa prueba',1000,0,'[{"nombre":"Talla","valores":["S","M"]}]'),('30000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001','Sin control',500,null,'[]');
insert into public.producto_variantes(id,tienda_id,producto_id,valores,stock,activa,orden) values ('40000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','{"Talla":"S"}',0,true,0),('40000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','{"Talla":"M"}',3,true,1);
insert into public.clientes(id,tienda_id,nombre,telefono) values ('60000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','Existente','+18095550142');
insert into public.pedidos(id,tienda_id,cliente_id,estado,total,pago_modo) values ('70000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','60000000-0000-4000-8000-000000000001','por_despachar',1500,'credito');
insert into public.pedido_items(pedido_id,producto_id,variante_id,nombre_producto,cantidad,precio_unitario) values
 ('70000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000002','Nombre histórico M',1,1000),
 ('70000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000002',null,'Sin control histórico',1,500);
insert into public.abonos(tienda_id,pedido_id,monto,metodo) values ('10000000-0000-4000-8000-000000000001','70000000-0000-4000-8000-000000000001',200,'efectivo');
select set_config('request.jwt.claim.sub','20000000-0000-4000-8000-000000000002',true);
set local role authenticated;
do $$ begin
 begin perform public.eliminar_producto('10000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001'); raise exception 'aceptó ajeno'; exception when raise_exception then if sqlerrm<>'sin_acceso' then raise; end if; end;
end $$;
reset role;
select set_config('request.jwt.claim.sub','20000000-0000-4000-8000-000000000001',true);
set local role authenticated;
do $$ declare r jsonb; begin
 r:=public.revisar_eliminacion_producto('10000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001');
 if (r->>'pedidosPendientes')::integer<>1 then raise exception 'pendientes'; end if;
 begin perform public.eliminar_producto('10000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001'); raise exception 'aceptó pendiente'; exception when raise_exception then if sqlerrm<>'producto_con_pendientes' then raise; end if; end;
 perform public.ajustar_stock('10000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001',1,'reposicion',null,'40000000-0000-4000-8000-000000000002');
 perform public.despachar_pedido('70000000-0000-4000-8000-000000000001');
end $$;
reset role;
insert into public.avisos_llegada(tienda_id,producto_id,variante_id,telefono,dispositivo) values ('10000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000002','18095550142','fixture');
set local role authenticated;
do $$ begin
 begin perform public.eliminar_producto('10000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001'); raise exception 'aceptó espera'; exception when raise_exception then if sqlerrm<>'producto_con_pendientes' then raise; end if; end;
end $$;
reset role;
update public.avisos_llegada set avisado_en=now();
insert into public.solicitudes_pedido(tienda_id,codigo,items,total,dispositivo) values ('10000000-0000-4000-8000-000000000001','PRUEBAAA23','[{"producto_id":"30000000-0000-4000-8000-000000000001","nombre":"Camisa","cantidad":1,"precio_unitario":1000}]',1000,'fixture');
set local role authenticated;
do $$ begin
 begin perform public.eliminar_producto('10000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001'); raise exception 'aceptó solicitud'; exception when raise_exception then if sqlerrm<>'producto_con_pendientes' then raise; end if; end;
end $$;
reset role;
update public.solicitudes_pedido set descartada_en=now();
set local role authenticated;
do $$ declare cantidad integer; begin
 perform public.eliminar_producto('10000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001');
 perform public.eliminar_producto('10000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001');
 if (select eliminado_en is null or activo from public.productos where id='30000000-0000-4000-8000-000000000001') then raise exception 'no retiró'; end if;
 if (select count(*) from public.pedido_items where pedido_id='70000000-0000-4000-8000-000000000001')<>2 then raise exception 'perdió items'; end if;
 if (select sum(monto) from public.abonos where pedido_id='70000000-0000-4000-8000-000000000001')<>200 then raise exception 'perdió pagos'; end if;
 if (select saldo from public.pedidos_saldo where pedido_id='70000000-0000-4000-8000-000000000001')<>1300 then raise exception 'cambió saldo'; end if;
 if (select total from public.pedidos where id='70000000-0000-4000-8000-000000000001')<>1500 then raise exception 'cambió total'; end if;
 if (select nombre_producto from public.pedido_items where producto_id='30000000-0000-4000-8000-000000000001')<>'Nombre histórico M' then raise exception 'perdió snapshot'; end if;
 if (select count(*) from public.ajustes_inventario where producto_id='30000000-0000-4000-8000-000000000001')<>1 then raise exception 'perdió ajustes'; end if;
 select stock into cantidad from public.producto_variantes where id='40000000-0000-4000-8000-000000000002';
 perform public.deshacer_despacho('70000000-0000-4000-8000-000000000001');
 if (select stock from public.producto_variantes where id='40000000-0000-4000-8000-000000000002')<>cantidad+1 then raise exception 'devolución'; end if;
 perform public.despachar_pedido('70000000-0000-4000-8000-000000000001');
 if (select stock from public.producto_variantes where id='40000000-0000-4000-8000-000000000002')<>cantidad then raise exception 'despacho'; end if;
 begin update public.productos set activo=true where id='30000000-0000-4000-8000-000000000001'; raise exception 'reactivó'; exception when raise_exception then if sqlerrm<>'producto_eliminado' then raise; end if; end;
 begin delete from public.productos where id='30000000-0000-4000-8000-000000000002'; raise exception 'borró físico'; exception when insufficient_privilege then null; end;
 begin perform public.ajustar_stock('10000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001',1,'reposicion',null,'40000000-0000-4000-8000-000000000002'); raise exception 'ajustó eliminado'; exception when raise_exception then if sqlerrm<>'producto_eliminado_o_ajeno' then raise; end if; end;
 if (select stock from public.producto_variantes where id='40000000-0000-4000-8000-000000000002')<>cantidad then raise exception 'stock parcial'; end if;
end $$;
reset role;
-- Escritura tardía también bloqueada; simula RPC pública con permisos de servidor.
do $$ begin
 begin insert into public.avisos_llegada(tienda_id,producto_id,telefono,dispositivo) values ('10000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','18095550143','fixture'); raise exception 'aviso tardío'; exception when raise_exception then if sqlerrm<>'producto_eliminado_o_ajeno' then raise; end if; end;
end $$;
set local role anon;
do $$ begin
 begin perform public.eliminar_producto('10000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001'); raise exception 'anon'; exception when insufficient_privilege then null; end;
 if exists(select 1 from jsonb_array_elements(public.catalogo_publico('panel-prueba')->'productos') x where x->>'nombre'='Camisa prueba') then raise exception 'público expuesto'; end if;
end $$;
reset role;
rollback;
select 'Pasó: eliminación lógica, tenant, pendientes, snapshots, ajustes, rollback, despacho/devolución y catálogo público.' as resultado;
