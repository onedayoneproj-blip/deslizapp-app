-- Ver como: la BASE bloquea las escrituras mientras dura la sesión (docs/prompts/ver-como-bloqueo-en-la-base.md).
-- Exclusivamente replay desechable; NO ejecutar en producción.
-- U1 = admin y dueño de A y staff de B (el caso de Lewis); U2 = admin que NO es miembro de A; U3 = dueño común de A (no admin).
begin;
do $$ begin if current_database()<>'replay_provisional' then raise exception 'Solo replay_provisional'; end if; end $$;
create function pg_temp.comprobar(ok boolean, mensaje text) returns void language plpgsql as $$ begin if ok is distinct from true then raise exception '%',mensaje; end if; end $$;
create function pg_temp.rechaza(q text, estado text, trozo text default '') returns void language plpgsql as $$ begin
  begin execute q; exception when others then
    if sqlstate=estado and position(trozo in sqlerrm)>0 then return; end if;
    raise exception 'Error inesperado % / % para %',sqlstate,sqlerrm,q;
  end; raise exception 'Aceptó operación prohibida: %',q;
end $$;
-- Un update o delete que una política restrictiva filtra no falla: toca 0 filas. Otro que se permite toca 1.
create function pg_temp.toca(q text, cuantas int) returns void language plpgsql as $$ declare n int; begin
  execute q; get diagnostics n = row_count;
  if n <> cuantas then raise exception 'Tocó % filas (esperadas %): %',n,cuantas,q; end if;
end $$;
grant execute on function pg_temp.comprobar(boolean,text) to authenticated, anon;
grant execute on function pg_temp.rechaza(text,text,text) to authenticated, anon;
grant execute on function pg_temp.toca(text,int) to authenticated, anon;

insert into auth.users(id,email,raw_app_meta_data,email_confirmed_at) values
 ('cd000000-0000-4000-8000-000000000001','u1-admin-duena@prueba.invalid','{"provider":"google"}',now()),
 ('cd000000-0000-4000-8000-000000000002','u2-admin-ajeno@prueba.invalid','{"provider":"google"}',now()),
 ('cd000000-0000-4000-8000-000000000003','u3-duena-comun@prueba.invalid','{"provider":"google"}',now()),
 ('cd000000-0000-4000-8000-000000000004','u4-staff-comun@prueba.invalid','{"provider":"google"}',now());
insert into public.admins(usuario_id,email) values
 ('cd000000-0000-4000-8000-000000000001','u1-admin-duena@prueba.invalid'),
 ('cd000000-0000-4000-8000-000000000002','u2-admin-ajeno@prueba.invalid');
insert into public.tiendas(id,nombre,slug,estado,creditos_retoque) values
 ('ce000000-0000-4000-8000-00000000000a','Ver como A fixture','ver-como-a-fixture','activa',50),
 ('ce000000-0000-4000-8000-00000000000b','Ver como B fixture','ver-como-b-fixture','activa',50);
-- Los colaboradores con nivel Administrador (todo menos el equipo): esta prueba es de Ver como, no de niveles (probar-permisos-db.sql).
insert into public.miembros(usuario_id,tienda_id,rol,nivel) values
 ('cd000000-0000-4000-8000-000000000001','ce000000-0000-4000-8000-00000000000a','dueno','ayudante'),
 ('cd000000-0000-4000-8000-000000000001','ce000000-0000-4000-8000-00000000000b','staff','administrador'),
 ('cd000000-0000-4000-8000-000000000003','ce000000-0000-4000-8000-00000000000a','dueno','ayudante'),
 ('cd000000-0000-4000-8000-000000000004','ce000000-0000-4000-8000-00000000000a','staff','administrador');

-- Una fila de cada tabla con escritura para miembros, en cada tienda (ids derivados de la tienda y un sufijo).
create function pg_temp.id(t uuid, k text) returns uuid language sql immutable as $$ select md5(t::text||k)::uuid $$;
create function pg_temp.sembrar(t uuid) returns void language plpgsql as $$ begin
  insert into public.productos(id,tienda_id,nombre,precio,stock,opciones,medios) values (pg_temp.id(t,'producto'),t,'Producto fixture',1000,0,'[{"nombre":"Talla","valores":["S","M"]}]',
    '[{"tipo":"foto","url":"https://deslizapp-app.vercel.app/ensayo/a.webp","retocada":false}]');
  insert into public.producto_variantes(id,tienda_id,producto_id,valores,stock,activa,orden) values (pg_temp.id(t,'variante'),t,pg_temp.id(t,'producto'),'{"Talla":"S"}',0,true,0);
  insert into public.clientes(id,tienda_id,nombre,telefono) values (pg_temp.id(t,'cliente'),t,'Cliente fixture','+1809555'||substr(md5(t::text),1,4)::text);
  insert into public.pedidos(id,tienda_id,cliente_id,estado,total,pago_modo) values (pg_temp.id(t,'pedido'),t,pg_temp.id(t,'cliente'),'por_despachar',1000,'contado');
  insert into public.pedido_items(id,pedido_id,producto_id,variante_id,variante_texto,nombre_producto,cantidad,precio_unitario) values (pg_temp.id(t,'item'),pg_temp.id(t,'pedido'),pg_temp.id(t,'producto'),pg_temp.id(t,'variante'),'S','Producto fixture',1,1000);
  insert into public.promos(id,tienda_id,tipo,coleccion,nombre,valor_porcentaje,fecha_inicio,fecha_fin,estado) values (pg_temp.id(t,'promo'),t,'coleccion','Fixture','Promo fixture',10,now(),now()+interval '5 days','activa');
  insert into public.pedidos(id,tienda_id,cliente_id,estado,total,pago_modo) values (pg_temp.id(t,'pedidoc'),t,pg_temp.id(t,'cliente'),'por_despachar',1000,'credito');
  insert into public.abonos(id,tienda_id,pedido_id,monto,metodo) values (pg_temp.id(t,'abono'),t,pg_temp.id(t,'pedidoc'),100,'efectivo');
  insert into public.solicitudes_pedido(id,tienda_id,codigo,items,total,dispositivo) values (pg_temp.id(t,'solicitud'),t,
    case when t='ce000000-0000-4000-8000-00000000000a' then 'PRUEBAAA23' else 'PRUEBAAB23' end,
    jsonb_build_array(jsonb_build_object('producto_id',pg_temp.id(t,'producto'),'variante_id',pg_temp.id(t,'variante'),'nombre','Producto fixture','cantidad',1,'precio_unitario',1000)),1000,'fixture');
  insert into public.avisos_llegada(id,tienda_id,producto_id,variante_id,telefono,dispositivo) values (pg_temp.id(t,'aviso'),t,pg_temp.id(t,'producto'),pg_temp.id(t,'variante'),case when t='ce000000-0000-4000-8000-00000000000a' then '18095550101' else '18095550102' end,'fixture');
  insert into public.marca_tienda(tienda_id,palabras) values (t,array['uno','dos','tres']);
  insert into public.marca_referencias(id,tienda_id,ruta,orden) values (pg_temp.id(t,'ref'),t,t::text||'/r.jpg',0);
end $$;
select pg_temp.sembrar('ce000000-0000-4000-8000-00000000000a');
select pg_temp.sembrar('ce000000-0000-4000-8000-00000000000b');

-- ═══ Las RPC security definer que escriben (saltan RLS): cada una con su llamada de ejemplo; {T} = la tienda ═══
-- Con sesión de Ver como sobre A: en A TODAS lanzan solo_mirar (42501); en B (la otra tienda de U1) NINGUNA lo hace (puede fallar por
-- otra razón, pero no por Ver como). Sin sesión, o con ella terminada o vencida: ninguna lo lanza.
create temp table rpc_casos(grupo int, nombre text, q text);
grant select on rpc_casos to authenticated;
create function pg_temp.probar_rpc(bloqueada_en_a boolean) returns void language plpgsql as $$
declare c record; a uuid := 'ce000000-0000-4000-8000-00000000000a'; b uuid := 'ce000000-0000-4000-8000-00000000000b'; n int := 0;
begin
  for c in select * from rpc_casos order by grupo, nombre loop
    n := n + 1;
    begin
      execute replace(c.q, '{T}', a::text);
      if bloqueada_en_a then raise exception 'NO_BLOQUEO %', c.nombre; end if;
    exception when others then
      if sqlerrm like 'NO_BLOQUEO %' then raise; end if;
      if bloqueada_en_a and not (sqlstate = '42501' and sqlerrm = 'solo_mirar') then
        raise exception 'En A, % lanzó % / % (se esperaba solo_mirar)', c.nombre, sqlstate, sqlerrm; end if;
      if not bloqueada_en_a and sqlerrm = 'solo_mirar' then raise exception 'En A, % lanzó solo_mirar sin sesión vigente', c.nombre; end if;
    end;
    begin
      execute replace(c.q, '{T}', b::text);
    exception when others then
      if sqlerrm = 'solo_mirar' then raise exception 'En B, % lanzó solo_mirar (B no se mira)', c.nombre; end if;
    end;
  end loop;
  if n = 0 then raise exception 'No hay casos de RPC'; end if;
end $$;
grant execute on function pg_temp.probar_rpc(boolean) to authenticated;
-- Grupo 2: producto, inventario, retoque y créditos.
insert into rpc_casos(grupo, nombre, q) values
 (2,'ajustar_stock',$q$select public.ajustar_stock('{T}'::uuid, pg_temp.id('{T}','producto'), 1, 'reposicion', null, null)$q$),
 (2,'crear_producto',$q$select public.crear_producto('{T}'::uuid, '{"nombre":"RPC","precio":10}'::jsonb, 0, '[]'::jsonb, '[]'::jsonb)$q$),
 (2,'eliminar_producto',$q$select public.eliminar_producto('{T}'::uuid, pg_temp.id('{T}','producto'))$q$),
 (2,'guardar_producto_inventario',$q$select public.guardar_producto_inventario('{T}'::uuid, pg_temp.id('{T}','producto'), '{"nombre":"Y"}'::jsonb, 0, 0, null, null, null, false)$q$),
 (2,'guardar_variantes',$q$select public.guardar_variantes('{T}'::uuid, pg_temp.id('{T}','producto'), '[{"nombre":"Talla","valores":["S","M"]}]'::jsonb, '[]'::jsonb)$q$),
 (2,'reponer_stock',$q$select public.reponer_stock('{T}'::uuid, jsonb_build_array(jsonb_build_object('producto_id', pg_temp.id('{T}','producto'), 'variante_id', pg_temp.id('{T}','variante'), 'cantidad', 1)), null)$q$),
 (2,'pedir_retoque',$q$select public.pedir_retoque(pg_temp.id('{T}','producto'), 'https://deslizapp-app.vercel.app/ensayo/a.webp')$q$),
 (2,'gastar_creditos',$q$select public.gastar_creditos('{T}'::uuid, 1)$q$);
-- Grupo 3: pedidos, clientes, abonos, solicitudes, avisos y envíos.
insert into rpc_casos(grupo, nombre, q) values
 (3,'borrar_cliente',$q$select public.borrar_cliente(pg_temp.id('{T}','cliente'), false)$q$),
 (3,'crear_codigo_cliente',$q$select public.crear_codigo_cliente('{T}'::uuid, pg_temp.id('{T}','cliente'), 10, 5, null)$q$),
 (3,'deshacer_despacho',$q$select public.deshacer_despacho(pg_temp.id('{T}','pedido'))$q$),
 (3,'despachar_pedido',$q$select public.despachar_pedido(pg_temp.id('{T}','pedido'))$q$),
 (3,'editar_abono',$q$select public.editar_abono(pg_temp.id('{T}','abono'), 50, 'efectivo', now(), null)$q$),
 (3,'editar_pedido',$q$select public.editar_pedido(pg_temp.id('{T}','pedido'), null, jsonb_build_array(jsonb_build_object('producto_id', pg_temp.id('{T}','producto'), 'variante_id', pg_temp.id('{T}','variante'), 'cantidad', 1)), null, null, false, false)$q$),
 (3,'eliminar_abono',$q$select public.eliminar_abono(pg_temp.id('{T}','abono'))$q$),
 (3,'eliminar_pedido',$q$select public.eliminar_pedido(pg_temp.id('{T}','pedido'))$q$),
 (3,'registrar_abono',$q$select public.registrar_abono('{T}'::uuid, pg_temp.id('{T}','cliente'), 10, 'efectivo', now(), null, null)$q$),
 (3,'registrar_envio_jugada',$q$select public.registrar_envio_jugada('{T}'::uuid, pg_temp.id('{T}','cliente'), 'x', 'codigo', null, '{}')$q$),
 (3,'registrar_solicitud',$q$select public.registrar_solicitud(pg_temp.id('{T}','solicitud'), null, null, '{}', '{}')$q$),
 (3,'descartar_solicitud',$q$select public.descartar_solicitud(pg_temp.id('{T}','solicitud'))$q$),
 (3,'registrar_venta_pasada',$q$select public.registrar_venta_pasada('{T}'::uuid, null, now() - interval '1 day', jsonb_build_array(jsonb_build_object('producto_id', pg_temp.id('{T}','producto'), 'variante_id', pg_temp.id('{T}','variante'), 'cantidad', 1)), null, false)$q$),
 (3,'marcar_avisado',$q$select public.marcar_avisado(array[pg_temp.id('{T}','aviso')])$q$);
-- Grupo 4: la tienda misma y su equipo.
insert into rpc_casos(grupo, nombre, q) values
 (4,'cambiar_estado_tienda',$q$select public.cambiar_estado_tienda('{T}'::uuid, 'pausar')$q$),
 (4,'pedir_cambios_catalogo',$q$select public.pedir_cambios_catalogo('{T}'::uuid, 'Cambios de prueba')$q$),
 (4,'publicar_catalogo',$q$select public.publicar_catalogo('{T}'::uuid)$q$),
 (4,'solicitar_catalogo',$q$select public.solicitar_catalogo('{T}'::uuid)$q$),
 (4,'invitar_a_tienda',$q$select public.invitar_a_tienda('{T}'::uuid, 'nadie@ejemplo.invalid', 'staff')$q$),
 (4,'quitar_de_tienda',$q$select public.quitar_de_tienda('{T}'::uuid, 'cd000000-0000-4000-8000-000000000004')$q$),
 (4,'transferir_tienda',$q$select public.transferir_tienda('{T}'::uuid, 'cd000000-0000-4000-8000-000000000004')$q$);

-- ═══ 0. La función de apoyo y los permisos ═══
select pg_temp.comprobar(not has_function_privilege('anon','public.exigir_no_viendo(uuid)','EXECUTE') and has_function_privilege('authenticated','public.exigir_no_viendo(uuid)','EXECUTE'),'exigir_no_viendo: sin EXECUTE para anon');
select pg_temp.comprobar((select prosrc ~ 'solo_mirar' and proconfig::text like '%search_path=%' from pg_proc where oid='public.exigir_no_viendo(uuid)'::regprocedure),'exigir_no_viendo con search_path fijo');
select pg_temp.comprobar((select count(*) from pg_policies where policyname like 'ver_como_no_escribe_%' and permissive='RESTRICTIVE')=3*9+3,'27 políticas de tablas + 3 de archivos, todas restrictivas');
select pg_temp.comprobar((select count(*) from pg_policies where policyname like 'ver_como_no_escribe_%' and permissive<>'RESTRICTIVE')=0,'ninguna política nueva es permisiva');

-- ═══ 1. Sin sesión de Ver como: U1 escribe en A y en B como siempre ═══
select set_config('request.jwt.claim.sub','cd000000-0000-4000-8000-000000000001',true);
set local role authenticated;
select pg_temp.toca($q$update public.productos set nombre='Sin sesión A' where id=pg_temp.id('ce000000-0000-4000-8000-00000000000a','producto')$q$,1);
select pg_temp.toca($q$update public.productos set nombre='Sin sesión B' where id=pg_temp.id('ce000000-0000-4000-8000-00000000000b','producto')$q$,1);
select pg_temp.toca($q$update public.tiendas set nombre='Ver como A fixture' where id='ce000000-0000-4000-8000-00000000000a'$q$,1);
select pg_temp.toca($q$update public.clientes set nombre='Cambió' where id=pg_temp.id('ce000000-0000-4000-8000-00000000000a','cliente')$q$,1);
insert into public.promos(tienda_id,tipo,coleccion,nombre,valor_porcentaje,fecha_inicio,fecha_fin,estado) values ('ce000000-0000-4000-8000-00000000000a','coleccion','Fixture','Otra',5,now(),now()+interval '2 days','activa');
insert into storage.objects(bucket_id,name) values ('productos','ce000000-0000-4000-8000-00000000000a/sin-sesion.png'),('marca-referencias','ce000000-0000-4000-8000-00000000000a/sin-sesion.jpg');
delete from storage.objects where name like '%sin-sesion%';
reset role;

-- ═══ 2. Sesión de Ver como sobre A (la abre U1 con la RPC real) ═══
select set_config('request.jwt.claim.sub','cd000000-0000-4000-8000-000000000001',true);
set local role authenticated;
select pg_temp.comprobar((select (public.admin_ver_como_iniciar('ce000000-0000-4000-8000-00000000000a')->>'id') is not null),'U1 abre Ver como sobre A');
select pg_temp.comprobar(public.admin_viendo('ce000000-0000-4000-8000-00000000000a'),'admin_viendo(A)');
-- Lecturas de A: funcionan.
select pg_temp.comprobar((select count(*) from public.productos where tienda_id='ce000000-0000-4000-8000-00000000000a')=1,'lee los productos de A');
select pg_temp.comprobar((select count(*) from public.pedidos where tienda_id='ce000000-0000-4000-8000-00000000000a')=2 and (select count(*) from public.pedido_items where pedido_id=pg_temp.id('ce000000-0000-4000-8000-00000000000a','pedido'))=1,'lee pedidos e items de A');
select pg_temp.comprobar((select count(*) from public.marca_tienda where tienda_id='ce000000-0000-4000-8000-00000000000a')=1,'lee la marca de A');
-- La función de apoyo.
select pg_temp.rechaza($q$select public.exigir_no_viendo('ce000000-0000-4000-8000-00000000000a')$q$,'42501','solo_mirar');
select public.exigir_no_viendo('ce000000-0000-4000-8000-00000000000b');
select public.exigir_no_viendo(null);

-- Escrituras en A: TODAS bloqueadas (insert falla con 42501; update y delete no tocan ninguna fila).
-- productos
select pg_temp.rechaza($q$insert into public.productos(tienda_id,nombre,precio,stock) values ('ce000000-0000-4000-8000-00000000000a','Nuevo',1,1)$q$,'42501','row-level security');
select pg_temp.toca($q$update public.productos set nombre='Cambiado' where tienda_id='ce000000-0000-4000-8000-00000000000a'$q$,0);
-- (productos y producto_variantes no tienen DELETE para la cuenta: se retiran con la RPC eliminar_producto.)
-- producto_variantes
select pg_temp.rechaza($q$insert into public.producto_variantes(tienda_id,producto_id,valores,stock,activa,orden) values ('ce000000-0000-4000-8000-00000000000a',pg_temp.id('ce000000-0000-4000-8000-00000000000a','producto'),'{"Talla":"M"}',0,true,1)$q$,'42501','row-level security');
select pg_temp.toca($q$update public.producto_variantes set orden=5 where tienda_id='ce000000-0000-4000-8000-00000000000a'$q$,0);
-- clientes
select pg_temp.rechaza($q$insert into public.clientes(tienda_id,nombre,telefono) values ('ce000000-0000-4000-8000-00000000000a','Otro','+18095550999')$q$,'42501','row-level security');
select pg_temp.toca($q$update public.clientes set nombre='Cambiado' where tienda_id='ce000000-0000-4000-8000-00000000000a'$q$,0);
select pg_temp.toca($q$delete from public.clientes where tienda_id='ce000000-0000-4000-8000-00000000000a'$q$,0);
-- pedidos y pedido_items
select pg_temp.rechaza($q$insert into public.pedidos(tienda_id,estado,total,pago_modo) values ('ce000000-0000-4000-8000-00000000000a','por_despachar',1,'contado')$q$,'42501','row-level security');
select pg_temp.toca($q$update public.pedidos set total=5 where tienda_id='ce000000-0000-4000-8000-00000000000a'$q$,0);
select pg_temp.toca($q$delete from public.pedidos where tienda_id='ce000000-0000-4000-8000-00000000000a'$q$,0);
select pg_temp.rechaza($q$insert into public.pedido_items(pedido_id,producto_id,variante_id,variante_texto,nombre_producto,cantidad,precio_unitario) values (pg_temp.id('ce000000-0000-4000-8000-00000000000a','pedido'),pg_temp.id('ce000000-0000-4000-8000-00000000000a','producto'),pg_temp.id('ce000000-0000-4000-8000-00000000000a','variante'),'S','X',1,1)$q$,'42501','row-level security');
select pg_temp.toca($q$update public.pedido_items set cantidad=7 where pedido_id=pg_temp.id('ce000000-0000-4000-8000-00000000000a','pedido')$q$,0);
select pg_temp.toca($q$delete from public.pedido_items where pedido_id=pg_temp.id('ce000000-0000-4000-8000-00000000000a','pedido')$q$,0);
-- promos
select pg_temp.rechaza($q$insert into public.promos(tienda_id,tipo,coleccion,nombre,valor_porcentaje,fecha_inicio,fecha_fin,estado) values ('ce000000-0000-4000-8000-00000000000a','coleccion','Fixture','Nueva',5,now(),now()+interval '2 days','activa')$q$,'42501','row-level security');
select pg_temp.toca($q$update public.promos set nombre='Cambiada' where tienda_id='ce000000-0000-4000-8000-00000000000a'$q$,0);
select pg_temp.toca($q$delete from public.promos where tienda_id='ce000000-0000-4000-8000-00000000000a'$q$,0);
-- tiendas
select pg_temp.toca($q$update public.tiendas set nombre='Cambiada', logo_url='https://deslizapp-app.vercel.app/ensayo/l.png' where id='ce000000-0000-4000-8000-00000000000a'$q$,0);
-- Mi marca (marca_tienda y marca_referencias)
select pg_temp.toca($q$update public.marca_tienda set palabras=array['a','b','c'] where tienda_id='ce000000-0000-4000-8000-00000000000a'$q$,0);
select pg_temp.toca($q$delete from public.marca_tienda where tienda_id='ce000000-0000-4000-8000-00000000000a'$q$,0);
select pg_temp.toca($q$update public.marca_referencias set orden=3 where tienda_id='ce000000-0000-4000-8000-00000000000a'$q$,0);
select pg_temp.toca($q$delete from public.marca_referencias where tienda_id='ce000000-0000-4000-8000-00000000000a'$q$,0);
select pg_temp.rechaza($q$insert into public.marca_referencias(tienda_id,ruta,orden) values ('ce000000-0000-4000-8000-00000000000a','ce000000-0000-4000-8000-00000000000a/n.jpg',1)$q$,'42501','row-level security');
-- Archivos: fotos/videos/logo (productos) y referencias (marca-referencias) de A no se suben ni se cambian ni se borran.
select pg_temp.rechaza($q$insert into storage.objects(bucket_id,name) values ('productos','ce000000-0000-4000-8000-00000000000a/foto.png')$q$,'42501','row-level security');
select pg_temp.rechaza($q$insert into storage.objects(bucket_id,name) values ('productos','ce000000-0000-4000-8000-00000000000a/logo/l.webp')$q$,'42501','row-level security');
select pg_temp.rechaza($q$insert into storage.objects(bucket_id,name) values ('marca-referencias','ce000000-0000-4000-8000-00000000000a/r2.jpg')$q$,'42501','row-level security');
select pg_temp.toca($q$update storage.objects set name=name where bucket_id in ('productos','marca-referencias') and name like 'ce000000-0000-4000-8000-00000000000a/%'$q$,0);
select pg_temp.toca($q$delete from storage.objects where bucket_id in ('productos','marca-referencias') and name like 'ce000000-0000-4000-8000-00000000000a/%'$q$,0);

-- B (la otra tienda de U1) sigue funcionando entera, tablas y archivos.
select pg_temp.toca($q$update public.productos set nombre='B sigue' where tienda_id='ce000000-0000-4000-8000-00000000000b'$q$,1);
select pg_temp.toca($q$update public.pedido_items set cantidad=3 where pedido_id=pg_temp.id('ce000000-0000-4000-8000-00000000000b','pedido')$q$,1);
select pg_temp.toca($q$update public.tiendas set nombre='Ver como B fixture' where id='ce000000-0000-4000-8000-00000000000b'$q$,1);
select pg_temp.toca($q$update public.marca_tienda set palabras=array['x','y','z'] where tienda_id='ce000000-0000-4000-8000-00000000000b'$q$,1);
insert into public.clientes(tienda_id,nombre,telefono) values ('ce000000-0000-4000-8000-00000000000b','En B','+18095550888');
insert into storage.objects(bucket_id,name) values ('productos','ce000000-0000-4000-8000-00000000000b/foto.png'),('marca-referencias','ce000000-0000-4000-8000-00000000000b/r2.jpg');
delete from storage.objects where name like 'ce000000-0000-4000-8000-00000000000b/%';
-- Los buckets solo del admin no cambian: el admin sube su comprobante aunque esté mirando A.
insert into storage.objects(bucket_id,name) values ('comprobantes','ce000000-0000-4000-8000-00000000000a/recibo.pdf');
delete from storage.objects where bucket_id='comprobantes';
select pg_temp.probar_rpc(true);
select pg_temp.comprobar(public.marcar_actividad('ce000000-0000-4000-8000-00000000000a') = false,'marcar_actividad durante Ver como devuelve false');
select pg_temp.comprobar((select count(*) from public.miembros where tienda_id='ce000000-0000-4000-8000-00000000000a' and usuario_id='cd000000-0000-4000-8000-000000000001' and ultima_entrada_en is not null)=0,'marcar_actividad durante Ver como no anota la entrada');
select pg_temp.comprobar(public.marcar_actividad('ce000000-0000-4000-8000-00000000000b') is not null,'marcar_actividad en la otra tienda (B) funciona');
reset role;
-- Ninguna fila de A cambió.
select pg_temp.comprobar((select nombre from public.productos where id=pg_temp.id('ce000000-0000-4000-8000-00000000000a','producto'))='Sin sesión A','el producto de A no cambió');
select pg_temp.comprobar((select count(*) from public.producto_variantes where tienda_id='ce000000-0000-4000-8000-00000000000a')=1 and (select count(*) from public.promos where tienda_id='ce000000-0000-4000-8000-00000000000a')=2,'variantes y promos de A intactas');

-- Otro miembro de A (U3, que no es admin) escribe en A mientras U1 la mira: la sesión es de U1, no de la tienda.
select set_config('request.jwt.claim.sub','cd000000-0000-4000-8000-000000000003',true);
set local role authenticated;
select pg_temp.toca($q$update public.productos set nombre='Lo cambia U3' where tienda_id='ce000000-0000-4000-8000-00000000000a'$q$,1);
insert into storage.objects(bucket_id,name) values ('productos','ce000000-0000-4000-8000-00000000000a/u3.png');
delete from storage.objects where name like '%/u3.png';
reset role;

-- U2 (admin, no miembro de A) mirando A: lee y no escribe, como hoy.
select set_config('request.jwt.claim.sub','cd000000-0000-4000-8000-000000000002',true);
set local role authenticated;
select pg_temp.comprobar((select (public.admin_ver_como_iniciar('ce000000-0000-4000-8000-00000000000a')->>'id') is not null),'U2 abre Ver como sobre A');
select pg_temp.comprobar((select count(*) from public.productos where tienda_id='ce000000-0000-4000-8000-00000000000a')=1,'U2 lee A');
select pg_temp.toca($q$update public.productos set nombre='U2' where tienda_id='ce000000-0000-4000-8000-00000000000a'$q$,0);
select pg_temp.rechaza($q$insert into public.clientes(tienda_id,nombre,telefono) values ('ce000000-0000-4000-8000-00000000000a','U2','+18095550777')$q$,'42501','row-level security');
reset role;

-- ═══ 3. Terminar la sesión: U1 vuelve a escribir en A; las admin_* nunca se bloquearon ═══
select set_config('request.jwt.claim.sub','cd000000-0000-4000-8000-000000000001',true);
set local role authenticated;
select pg_temp.comprobar((select public.admin_ver_como_terminar((public.admin_ver_como_actual()->>'id')::uuid))=true,'admin_ver_como_terminar funciona durante la sesión');
select pg_temp.toca($q$update public.productos set nombre='Terminada' where tienda_id='ce000000-0000-4000-8000-00000000000a'$q$,1);
insert into storage.objects(bucket_id,name) values ('productos','ce000000-0000-4000-8000-00000000000a/despues.png');
delete from storage.objects where name like '%/despues.png';
select public.exigir_no_viendo('ce000000-0000-4000-8000-00000000000a');
select pg_temp.probar_rpc(false);
select pg_temp.comprobar(public.marcar_actividad('ce000000-0000-4000-8000-00000000000a') = true,'con la sesión terminada marcar_actividad vuelve a anotar');
reset role;

-- ═══ 4. Sesión vencida: vuelve a escribir sin hacer nada ═══
select set_config('request.jwt.claim.sub','cd000000-0000-4000-8000-000000000001',true);
set local role authenticated;
select pg_temp.comprobar((select (public.admin_ver_como_iniciar('ce000000-0000-4000-8000-00000000000a')->>'id') is not null),'U1 abre otra sesión sobre A');
select pg_temp.toca($q$update public.productos set nombre='Bloqueada' where id=pg_temp.id('ce000000-0000-4000-8000-00000000000a','producto')$q$,0);
reset role;
update public.sesiones_ver_como set inicio = now() - interval '2 minutes', vence_en = now() - interval '1 minute' where admin_id='cd000000-0000-4000-8000-000000000001' and fin is null;
select set_config('request.jwt.claim.sub','cd000000-0000-4000-8000-000000000001',true);
set local role authenticated;
select pg_temp.toca($q$update public.productos set nombre='Vencida' where id=pg_temp.id('ce000000-0000-4000-8000-00000000000a','producto')$q$,1);
select pg_temp.probar_rpc(false);
reset role;
-- Un miembro común (U3) sin ninguna sesión: sin cambios.
select set_config('request.jwt.claim.sub','cd000000-0000-4000-8000-000000000003',true);
set local role authenticated;
select pg_temp.toca($q$update public.pedidos set total=1234 where id=pg_temp.id('ce000000-0000-4000-8000-00000000000a','pedido')$q$,1);
reset role;

-- (Las pruebas de las RPC security definer se suman al final de este archivo.)
rollback;
select 'Pasó: Ver como bloquea en la base las tablas y los archivos de la tienda que se mira, y solo esa.' as resultado;
