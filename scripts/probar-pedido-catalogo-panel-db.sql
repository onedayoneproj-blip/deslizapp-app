-- Solo replay desechable. Autorización real por auth.uid/miembros; cada escenario revierte sus filas.
begin;
do $$ begin if current_database()<>'replay_provisional' then raise exception 'Solo replay_provisional'; end if; end $$;
insert into auth.users(id,email) values ('20000000-0000-4000-8000-000000000001','panel@prueba.invalid'),('20000000-0000-4000-8000-000000000002','otra@prueba.invalid');
insert into public.tiendas(id,nombre,slug,estado,catalogo_estado) values ('10000000-0000-4000-8000-000000000001','Panel prueba','panel-prueba','activa','publicado'),('10000000-0000-4000-8000-000000000002','Otra','panel-otra','activa','publicado');
insert into public.miembros(usuario_id,tienda_id) values ('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001'),('20000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000002');
insert into public.productos(id,tienda_id,nombre,precio,stock,opciones) values ('30000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','Camisa prueba',1000,0,'[{"nombre":"Talla","valores":["S","M"]}]'),('30000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001','Sin control',500,null,'[]');
insert into public.producto_variantes(id,tienda_id,producto_id,valores,stock,activa,orden) values ('40000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','{"Talla":"S"}',0,true,0),('40000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','{"Talla":"M"}',3,true,1);
insert into public.clientes(id,tienda_id,nombre,telefono) values ('60000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','Existente','+18095550142');
insert into public.solicitudes_pedido(id,tienda_id,codigo,items,descuento,total,dispositivo) values ('50000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','PRUEBAAA23','[{"producto_id":"30000000-0000-4000-8000-000000000001","variante_id":"40000000-0000-4000-8000-000000000001","nombre":"Camisa prueba","cantidad":1,"precio_unitario":1000,"por_encargo":false},{"producto_id":"30000000-0000-4000-8000-000000000001","variante_id":"40000000-0000-4000-8000-000000000002","nombre":"Camisa prueba","cantidad":2,"precio_unitario":1000,"por_encargo":false}]',300,2700,'replay-panel');
select set_config('request.jwt.claim.sub','20000000-0000-4000-8000-000000000002',true);
set local role authenticated;
do $$ begin
 if exists(select 1 from public.solicitudes_pedido where codigo='PRUEBAAA23') then raise exception 'RLS expuso otra tienda'; end if;
 begin perform public.registrar_solicitud('50000000-0000-4000-8000-000000000001','60000000-0000-4000-8000-000000000001',null,'{}','{}'); raise exception 'registró ajena'; exception when no_data_found then null; end;
 begin perform public.descartar_solicitud('50000000-0000-4000-8000-000000000001'); raise exception 'descartó ajena'; exception when no_data_found then null; end;
end $$;
reset role;
select set_config('request.jwt.claim.sub','',true);
set local role anon;
do $$ declare v jsonb; begin
 v:=public.ver_solicitud('PRUEBAAA23');
 if v->>'id' is not null or (v->>'es_mi_tienda')::boolean or v ?| array['pedido_id','cliente','telefono','nota'] then raise exception 'privacidad'; end if;
 begin perform public.registrar_solicitud('50000000-0000-4000-8000-000000000001','60000000-0000-4000-8000-000000000001',null,'{}','{}'); raise exception 'registró anon'; exception when insufficient_privilege then null; end;
end $$;
reset role;
select set_config('request.jwt.claim.sub','20000000-0000-4000-8000-000000000001',true);
set local role authenticated;
do $$ declare p public.pedidos; v jsonb; begin
 begin perform public.registrar_solicitud('50000000-0000-4000-8000-000000000001',null,'{"nombre":"Nueva","telefono":"8095550199"}','{}','{}'); raise exception 'aceptó agotado'; exception when raise_exception then if sqlerrm<>'disponibilidad_cambio' then raise; end if; end;
 if exists(select 1 from public.clientes where nombre='Nueva') then raise exception 'cliente parcial'; end if;
 begin perform public.registrar_solicitud('50000000-0000-4000-8000-000000000001','60000000-0000-4000-8000-000000000001',null,array['40000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000002']::uuid[],'{}'); raise exception 'aceptó vacío'; exception when raise_exception then if sqlerrm<>'pedido_vacio' then raise; end if; end;
 begin perform public.registrar_solicitud('50000000-0000-4000-8000-000000000001',null,'{"nombre":"Otra Ana","telefono":"8095550142"}',array['40000000-0000-4000-8000-000000000001']::uuid[],'{}'); raise exception 'aceptó duplicado'; exception when unique_violation then null; end;
 p:=public.registrar_solicitud('50000000-0000-4000-8000-000000000001',null,'{"nombre":"Nueva","telefono":"8095550199","nota":"Nota real del borrador"}',array['40000000-0000-4000-8000-000000000001']::uuid[],'{}');
 if p.estado<>'nuevo' or p.origen<>'catalogo' or p.total<>1800 then raise exception 'pedido/total'; end if;
 if (select stock from public.producto_variantes where id='40000000-0000-4000-8000-000000000002')<>3 then raise exception 'descontó al registrar'; end if;
 if (select nota from public.clientes where id=p.cliente_id)<>'Nota real del borrador' then raise exception 'perdió nota'; end if;
 v:=public.ver_solicitud('PRUEBAAA23');
 if v->>'estado'<>'confirmado' or (v->>'total')::integer<>1800 or jsonb_array_length(v->'items')<>1 or v#>>'{items,0,variante_id}'<>'40000000-0000-4000-8000-000000000002' then raise exception 'público final'; end if;
 begin perform public.registrar_solicitud('50000000-0000-4000-8000-000000000001','60000000-0000-4000-8000-000000000001',null,'{}','{}'); raise exception 'duplicó'; exception when raise_exception then if sqlerrm<>'solicitud_no_registrable' then raise; end if; end;
 update public.pedidos set estado='por_despachar' where id=p.id;
 perform public.despachar_pedido(p.id);
 if (select stock from public.producto_variantes where id='40000000-0000-4000-8000-000000000002')<>1 or public.ver_solicitud('PRUEBAAA23')->>'estado'<>'despachado' then raise exception 'despacho'; end if;
 perform public.deshacer_despacho(p.id);
 if (select stock from public.producto_variantes where id='40000000-0000-4000-8000-000000000002')<>3 then raise exception 'devolución'; end if;
end $$;
reset role;
-- Registrada no vence; prueba independiente del reloj del navegador.
update public.solicitudes_pedido set vence_en=now()-interval '8 days' where codigo='PRUEBAAA23';
set local role anon;
do $$ begin if public.ver_solicitud('PRUEBAAA23')->>'estado'<>'confirmado' then raise exception 'venció registrada'; end if; end $$;
reset role;
rollback;
select 'Pasó: RLS, anon, agotado, vacío, duplicado, atomicidad, total, nota, estados y stock por variante.' as resultado;
