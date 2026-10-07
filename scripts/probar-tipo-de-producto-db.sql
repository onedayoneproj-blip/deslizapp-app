-- Tipo de producto (migración *_tipo_de_producto). Replay desechable; NO ejecutar en producción.
-- D = dueña; A = Ayudante; E = Editor; X = Administrador; Z = extraño; V = dueña que además es admin (Ver como).
begin;
do $$ begin if current_database()<>'replay_provisional' then raise exception 'Solo replay_provisional'; end if; end $$;
create function pg_temp.comprobar(ok boolean, mensaje text) returns void language plpgsql as $$ begin if ok is distinct from true then raise exception '%',mensaje; end if; end $$;
create function pg_temp.rechaza(q text, estado text, trozo text default '') returns void language plpgsql as $$ begin
  begin execute q; exception when others then
    if sqlstate=estado and position(trozo in sqlerrm)>0 then return; end if;
    raise exception 'Error inesperado % / % para %',sqlstate,sqlerrm,q;
  end; raise exception 'Aceptó operación prohibida: %',q;
end $$;
create function pg_temp.como(u uuid) returns void language plpgsql as $$ begin
  perform set_config('request.jwt.claim.sub', u::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', u)::text, true);
end $$;
grant execute on all functions in schema pg_temp to authenticated, anon;

insert into auth.users(id,email,raw_app_meta_data,email_confirmed_at) values
 ('ad000000-0000-4000-8000-00000000000d','duena@prueba.invalid','{"provider":"google"}',now()),
 ('ad000000-0000-4000-8000-00000000000a','ayudante@prueba.invalid','{"provider":"google"}',now()),
 ('ad000000-0000-4000-8000-00000000000e','editor@prueba.invalid','{"provider":"google"}',now()),
 ('ad000000-0000-4000-8000-00000000000c','administra@prueba.invalid','{"provider":"google"}',now()),
 ('ad000000-0000-4000-8000-00000000000f','extrano@prueba.invalid','{"provider":"google"}',now()),
 ('ad000000-0000-4000-8000-00000000000b','admin-duena@prueba.invalid','{"provider":"google"}',now());
insert into public.admins(usuario_id,email) values ('ad000000-0000-4000-8000-00000000000b','admin-duena@prueba.invalid');
insert into public.tiendas(id,nombre,slug,estado,catalogo_estado,rubro) values
 ('ae000000-0000-4000-8000-000000000001','Tipo fixture','tipo-fixture','activa','publicado','ropa'),
 ('ae000000-0000-4000-8000-000000000002','Tipo V fixture','tipo-v-fixture','activa','publicado','ropa');
insert into public.miembros(usuario_id,tienda_id,rol,nivel) values
 ('ad000000-0000-4000-8000-00000000000d','ae000000-0000-4000-8000-000000000001','dueno','ayudante'),
 ('ad000000-0000-4000-8000-00000000000a','ae000000-0000-4000-8000-000000000001','staff','ayudante'),
 ('ad000000-0000-4000-8000-00000000000e','ae000000-0000-4000-8000-000000000001','staff','editor'),
 ('ad000000-0000-4000-8000-00000000000c','ae000000-0000-4000-8000-000000000001','staff','administrador'),
 ('ad000000-0000-4000-8000-00000000000b','ae000000-0000-4000-8000-000000000002','dueno','ayudante');
insert into public.productos(id,tienda_id,nombre,precio,stock) values
 ('af000000-0000-4000-8000-000000000001','ae000000-0000-4000-8000-000000000001','Camisa',1850,1),
 ('af000000-0000-4000-8000-000000000002','ae000000-0000-4000-8000-000000000002','Camisa V',1850,1);

-- ═══ 0. Estructura y datos existentes ═══
select pg_temp.comprobar((select rubros from public.tiendas where id='ae000000-0000-4000-8000-000000000001')='{ropa}','una tienda sin rubros explícitos vende solo su principal (trigger tiendas_a_rubros)');
select pg_temp.comprobar((select rubro from public.productos where id='af000000-0000-4000-8000-000000000001') is null,'un producto sin tipo propio sigue al principal (null)');
select pg_temp.comprobar(not has_function_privilege('anon','public.guardar_rubros_tienda(uuid,text[])','EXECUTE')
  and has_function_privilege('authenticated','public.guardar_rubros_tienda(uuid,text[])','EXECUTE'),'guardar_rubros_tienda: anon no, authenticated sí');
select pg_temp.comprobar((select pg_get_functiondef('public.catalogo_publico(text)'::regprocedure) like '%''rubros'', to_jsonb(v_tienda.rubros)%'),'catalogo_publico devuelve los rubros');
select pg_temp.rechaza($q$insert into public.tiendas(nombre,slug,rubro,rubros) values ('X','x-tipo-malo','ropa','{zapatos,ropa}')$q$,'23514','tiendas_rubros_check');
select pg_temp.rechaza($q$update public.productos set rubro='zapatos' where id='af000000-0000-4000-8000-000000000001'$q$,'22023','rubro_invalido');
-- El principal siempre está dentro: cambiar solo el principal lo antepone.
update public.tiendas set rubro='perfumes' where id='ae000000-0000-4000-8000-000000000001';
select pg_temp.comprobar((select rubros from public.tiendas where id='ae000000-0000-4000-8000-000000000001')='{perfumes,ropa}','cambiar el principal lo antepone a los rubros');
update public.tiendas set rubro='ropa', rubros='{ropa}' where id='ae000000-0000-4000-8000-000000000001';

-- ═══ 1. Permisos por nivel ═══
set local role authenticated;
select pg_temp.como('ad000000-0000-4000-8000-00000000000a');
select pg_temp.rechaza($q$select public.guardar_rubros_tienda('ae000000-0000-4000-8000-000000000001','{ropa,accesorios}')$q$,'42501','sin_permiso');
select pg_temp.como('ad000000-0000-4000-8000-00000000000f');
select pg_temp.rechaza($q$select public.guardar_rubros_tienda('ae000000-0000-4000-8000-000000000001','{ropa,accesorios}')$q$,'42501','sin_permiso');
select pg_temp.como('ad000000-0000-4000-8000-00000000000e');
select pg_temp.comprobar((select rubros from public.guardar_rubros_tienda('ae000000-0000-4000-8000-000000000001','{ropa,accesorios,ropa}'))='{ropa,accesorios}','el Editor guarda «Lo que vendes» (sin repetidos)');
select pg_temp.comprobar((select rubro||':'||rubros::text from public.guardar_rubros_tienda('ae000000-0000-4000-8000-000000000001','{accesorios,ropa}'))='accesorios:{accesorios,ropa}','el primero pasa a ser el principal');
select pg_temp.como('ad000000-0000-4000-8000-00000000000c');
select public.guardar_rubros_tienda('ae000000-0000-4000-8000-000000000001','{ropa,accesorios}');
select pg_temp.rechaza($q$select public.guardar_rubros_tienda('ae000000-0000-4000-8000-000000000001','{}')$q$,'22023','rubros_invalidos');
select pg_temp.rechaza($q$select public.guardar_rubros_tienda('ae000000-0000-4000-8000-000000000001','{zapatos}')$q$,'23514','tiendas_rubro_check');
reset role;

-- ═══ 2. El tipo de un producto: crear, guardar, validar ═══
set local role authenticated;
select pg_temp.como('ad000000-0000-4000-8000-00000000000a');
select pg_temp.rechaza($q$select public.crear_producto('ae000000-0000-4000-8000-000000000001','{"nombre":"Cinturón","precio":900,"stock":3,"rubro":"accesorios"}')$q$,'42501','sin_permiso');
select pg_temp.rechaza($q$select public.guardar_producto_inventario('ae000000-0000-4000-8000-000000000001','af000000-0000-4000-8000-000000000001','{"rubro":"accesorios"}',null,null,null,null,null,false)$q$,'42501','sin_permiso');
select pg_temp.como('ad000000-0000-4000-8000-00000000000e');
select pg_temp.comprobar((select rubro from public.crear_producto('ae000000-0000-4000-8000-000000000001','{"nombre":"Cinturón","precio":900,"stock":3,"rubro":"accesorios"}'))='accesorios','crear_producto guarda el tipo');
select pg_temp.comprobar((select rubro from public.crear_producto('ae000000-0000-4000-8000-000000000001','{"nombre":"Blusa","precio":900,"stock":3}')) is null,'sin tipo, queda null (el principal)');
select pg_temp.rechaza($q$select public.crear_producto('ae000000-0000-4000-8000-000000000001','{"nombre":"Taza","precio":900,"stock":3,"rubro":"hogar"}')$q$,'22023','rubro_invalido');
select pg_temp.comprobar((select rubro from public.guardar_producto_inventario('ae000000-0000-4000-8000-000000000001','af000000-0000-4000-8000-000000000001','{"rubro":"accesorios"}',null,null,null,null,null,false))='accesorios','guardar_producto_inventario cambia el tipo');
select pg_temp.rechaza($q$select public.guardar_producto_inventario('ae000000-0000-4000-8000-000000000001','af000000-0000-4000-8000-000000000001','{"rubro":"hogar"}',null,null,null,null,null,false)$q$,'22023','rubro_invalido');
select pg_temp.comprobar((select rubro from public.guardar_producto_inventario('ae000000-0000-4000-8000-000000000001','af000000-0000-4000-8000-000000000001','{"nombre":"Camisa 2"}',null,null,null,null,null,false))='accesorios','guardar otra cosa no toca el tipo');
select pg_temp.comprobar((select rubro from public.guardar_producto_inventario('ae000000-0000-4000-8000-000000000001','af000000-0000-4000-8000-000000000001','{"rubro":null}',null,null,null,null,null,false)) is null,'rubro null vuelve al principal');
reset role;

-- ═══ 3. Quitar un rubro en uso no se puede ═══
update public.productos set rubro='accesorios' where id='af000000-0000-4000-8000-000000000001';
set local role authenticated;
select pg_temp.como('ad000000-0000-4000-8000-00000000000c');
select pg_temp.rechaza($q$select public.guardar_rubros_tienda('ae000000-0000-4000-8000-000000000001','{ropa}')$q$,'22023','rubro_en_uso');
reset role;
select pg_temp.comprobar((select rubros from public.tiendas where id='ae000000-0000-4000-8000-000000000001')='{ropa,accesorios}','no cambió nada al rechazar');
-- Un producto retirado (eliminado) ya no bloquea.
update public.productos set eliminado_en=now(), activo=false where tienda_id='ae000000-0000-4000-8000-000000000001' and rubro='accesorios';
set local role authenticated;
select pg_temp.como('ad000000-0000-4000-8000-00000000000c');
select pg_temp.comprobar((select rubros from public.guardar_rubros_tienda('ae000000-0000-4000-8000-000000000001','{ropa}'))='{ropa}','sin productos vigentes del tipo, se puede quitar');
reset role;

-- ═══ 4. Lectura pública ═══
update public.tiendas set rubros='{ropa,accesorios}' where id='ae000000-0000-4000-8000-000000000001';
insert into public.productos(id,tienda_id,nombre,precio,stock,rubro) values ('af000000-0000-4000-8000-000000000003','ae000000-0000-4000-8000-000000000001','Camisa 2',1850,1,'accesorios');
select pg_temp.comprobar((public.catalogo_publico('tipo-fixture')->'tienda'->'rubros')='["ropa","accesorios"]'::jsonb,'catalogo_publico: rubros de la tienda');
select pg_temp.comprobar((select p->>'rubro' from jsonb_array_elements(public.catalogo_publico('tipo-fixture')->'productos') p where p->>'nombre'='Camisa 2')='accesorios','catalogo_publico: tipo del producto');
update public.productos set rubro=null where id='af000000-0000-4000-8000-000000000003';
select pg_temp.comprobar((select p->>'rubro' from jsonb_array_elements(public.catalogo_publico('tipo-fixture')->'productos') p where p->>'nombre'='Camisa 2')='ropa','catalogo_publico: sin tipo propio sale el principal');

-- ═══ 5. Ver como: no escribe ═══
set local role authenticated;
select pg_temp.como('ad000000-0000-4000-8000-00000000000b');
select pg_temp.comprobar((select (public.admin_ver_como_iniciar('ae000000-0000-4000-8000-000000000002')->>'id') is not null),'abre Ver como sobre su propia tienda');
select pg_temp.rechaza($q$select public.guardar_rubros_tienda('ae000000-0000-4000-8000-000000000002','{ropa,hogar}')$q$,'42501','solo_mirar');
select pg_temp.rechaza($q$select public.guardar_producto_inventario('ae000000-0000-4000-8000-000000000002','af000000-0000-4000-8000-000000000002','{"rubro":"ropa"}',null,null,null,null,null,false)$q$,'42501','solo_mirar');
reset role;
select pg_temp.comprobar((select rubros from public.tiendas where id='ae000000-0000-4000-8000-000000000002')='{ropa}','Ver como no escribió nada');
rollback;
