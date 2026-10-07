-- Equipo y permisos (docs/prompts/colaboradores-e-invitaciones.md §2 y §7): cada nivel puede y no puede lo que dice la tabla,
-- por TABLA, por RPC y por ARCHIVOS; el extraño no ve ni escribe nada. Exclusivamente replay desechable; NO ejecutar en producción.
-- D = dueña; A = Ayudante; E = Editor; X = Administrador; Z = extraño (cuenta de Google sin la tienda).
begin;
do $$ begin if current_database()<>'replay_provisional' then raise exception 'Solo replay_provisional'; end if; end $$;
create function pg_temp.comprobar(ok boolean, mensaje text) returns void language plpgsql as $$ begin if ok is distinct from true then raise exception '%',mensaje; end if; end $$;
create function pg_temp.rechaza(q text, estado text, trozo text default '') returns void language plpgsql as $$ begin
  begin execute q; exception when others then
    if sqlstate=estado and position(trozo in sqlerrm)>0 then return; end if;
    raise exception 'Error inesperado % / % para %',sqlstate,sqlerrm,q;
  end; raise exception 'Aceptó operación prohibida: %',q;
end $$;
create function pg_temp.toca(q text, cuantas int) returns void language plpgsql as $$ declare n int; begin
  execute q; get diagnostics n = row_count;
  if n <> cuantas then raise exception 'Tocó % filas (esperadas %): %',n,cuantas,q; end if;
end $$;
create function pg_temp.id(k text) returns uuid language sql immutable as $$ select md5('permisos'||k)::uuid $$;
create function pg_temp.como(u uuid) returns void language plpgsql as $$ begin
  perform set_config('request.jwt.claim.sub', u::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', u)::text, true);
end $$;
grant execute on all functions in schema pg_temp to authenticated, anon;

insert into auth.users(id,email,raw_app_meta_data,raw_user_meta_data,email_confirmed_at) values
 ('dd000000-0000-4000-8000-00000000000d','duena@prueba.invalid','{"provider":"google"}','{"full_name":"Dueña"}',now()),
 ('dd000000-0000-4000-8000-00000000000a','ayudante@prueba.invalid','{"provider":"google"}','{"full_name":"Ayudante"}',now()),
 ('dd000000-0000-4000-8000-00000000000e','editor@prueba.invalid','{"provider":"google"}','{"full_name":"Editor"}',now()),
 ('dd000000-0000-4000-8000-00000000000c','administra@prueba.invalid','{"provider":"google"}','{"full_name":"Administra"}',now()),
 ('dd000000-0000-4000-8000-00000000000f','extrano@prueba.invalid','{"provider":"google"}','{"full_name":"Extraño"}',now()),
 ('dd000000-0000-4000-8000-00000000000b','otra-ayudante@prueba.invalid','{"provider":"google"}','{"full_name":"Otra"}',now());
insert into public.tiendas(id,nombre,slug,estado,creditos_retoque) values ('de000000-0000-4000-8000-000000000001','Permisos fixture','permisos-fixture','activa',0);
insert into public.movimientos_creditos(tienda_id,cantidad,tipo,motivo) values ('de000000-0000-4000-8000-000000000001',20,'ajuste','fixture');
insert into public.miembros(usuario_id,tienda_id,rol,nivel) values
 ('dd000000-0000-4000-8000-00000000000d','de000000-0000-4000-8000-000000000001','dueno','ayudante'),
 ('dd000000-0000-4000-8000-00000000000a','de000000-0000-4000-8000-000000000001','staff','ayudante'),
 ('dd000000-0000-4000-8000-00000000000e','de000000-0000-4000-8000-000000000001','staff','editor'),
 ('dd000000-0000-4000-8000-00000000000c','de000000-0000-4000-8000-000000000001','staff','administrador'),
 ('dd000000-0000-4000-8000-00000000000b','de000000-0000-4000-8000-000000000001','staff','ayudante');
-- Una fila de cada tabla con escritura para miembros.
insert into public.productos(id,tienda_id,nombre,precio,stock,opciones,medios) values (pg_temp.id('producto'),'de000000-0000-4000-8000-000000000001','Producto',1000,5,'[{"nombre":"Talla","valores":["S","M"]}]',
  '[{"tipo":"foto","url":"https://ejemplo.invalid/a.webp","retocada":false}]');
insert into public.producto_variantes(id,tienda_id,producto_id,valores,stock,activa,orden) values (pg_temp.id('variante'),'de000000-0000-4000-8000-000000000001',pg_temp.id('producto'),'{"Talla":"S"}',5,true,0);
insert into public.clientes(id,tienda_id,nombre,telefono) values (pg_temp.id('cliente'),'de000000-0000-4000-8000-000000000001','Cliente','+18095557001');
insert into public.pedidos(id,tienda_id,cliente_id,estado,total,pago_modo) values (pg_temp.id('pedido'),'de000000-0000-4000-8000-000000000001',pg_temp.id('cliente'),'por_despachar',1000,'contado');
insert into public.pedido_items(id,pedido_id,producto_id,variante_id,variante_texto,nombre_producto,cantidad,precio_unitario) values (pg_temp.id('item'),pg_temp.id('pedido'),pg_temp.id('producto'),pg_temp.id('variante'),'S','Producto',1,1000);
insert into public.promos(id,tienda_id,tipo,coleccion,nombre,valor_porcentaje,fecha_inicio,fecha_fin,estado) values (pg_temp.id('promo'),'de000000-0000-4000-8000-000000000001','coleccion','Fixture','Promo',10,now(),now()+interval '5 days','activa');
insert into public.marca_tienda(tienda_id,palabras) values ('de000000-0000-4000-8000-000000000001',array['uno','dos','tres']);
insert into public.marca_referencias(id,tienda_id,ruta,orden) values (pg_temp.id('ref'),'de000000-0000-4000-8000-000000000001','de000000-0000-4000-8000-000000000001/r.jpg',0);

-- ═══ 0. Estructura ═══
select pg_temp.comprobar((select count(*) from pg_policies where policyname like 'permiso\_%' and permissive='RESTRICTIVE')=3*9+3,'27 políticas de tablas + 3 de archivos, todas restrictivas');
select pg_temp.comprobar((select count(*) from pg_policies where policyname like 'ver_como_no_escribe_%')=30,'las de Ver como siguen todas');
select pg_temp.comprobar(not has_table_privilege('authenticated','public.miembros','UPDATE') and not has_table_privilege('authenticated','public.miembros','INSERT')
  and not has_column_privilege('authenticated','public.miembros','nivel','UPDATE'),'nadie escribe miembros (ni nivel) directo');
select pg_temp.comprobar(not has_function_privilege('anon','public.tengo_permiso(uuid,text)','EXECUTE') and not has_function_privilege('anon','public.exigir_permiso(uuid,text)','EXECUTE')
  and not has_function_privilege('anon','public.puede_sumar_colaborador(uuid)','EXECUTE'),'anon sin funciones de permiso');
select pg_temp.comprobar(public.nivel_tiene_grupo('ayudante','ventas') and not public.nivel_tiene_grupo('ayudante','catalogo')
  and public.nivel_tiene_grupo('editor','catalogo') and not public.nivel_tiene_grupo('editor','creditos') and not public.nivel_tiene_grupo('editor','marca')
  and public.nivel_tiene_grupo('administrador','creditos') and public.nivel_tiene_grupo('administrador','marca') and public.nivel_tiene_grupo('administrador','compras')
  and not public.nivel_tiene_grupo('administrador','equipo'),'mapa nivel → grupo');

-- ═══ 1. Tablas, por nivel. Cada caso: (grupo, escritura que debe tocar 1 fila si tiene el grupo y 0 si no) ═══
create temp table casos_tabla(grupo text, q text);
grant select on casos_tabla to authenticated;
insert into casos_tabla values
 ('ventas',  $q$update public.clientes set nota='x' where id=pg_temp.id('cliente')$q$),
 ('ventas',  $q$update public.pedidos set total=1000 where id=pg_temp.id('pedido')$q$),
 ('ventas',  $q$update public.pedido_items set cantidad=1 where id=pg_temp.id('item')$q$),
 ('ventas',  $q$update public.promos set nombre='Promo' where id=pg_temp.id('promo')$q$),
 ('catalogo',$q$update public.productos set nombre='Producto' where id=pg_temp.id('producto')$q$),
 ('catalogo',$q$update public.producto_variantes set orden=0 where id=pg_temp.id('variante')$q$),
 ('catalogo',$q$update public.tiendas set nombre='Permisos fixture' where id='de000000-0000-4000-8000-000000000001'$q$),
 ('marca',   $q$update public.marca_tienda set palabras=array['uno','dos','tres'] where tienda_id='de000000-0000-4000-8000-000000000001'$q$),
 ('marca',   $q$update public.marca_referencias set orden=0 where id=pg_temp.id('ref')$q$);
create function pg_temp.probar_tablas(u uuid, nivel text) returns void language plpgsql as $$
declare c record;
begin
  perform pg_temp.como(u);
  for c in select * from casos_tabla loop
    perform pg_temp.toca(c.q, case when nivel='dueno' or public.nivel_tiene_grupo(nivel, c.grupo) then 1 else 0 end);
  end loop;
end $$;
grant execute on function pg_temp.probar_tablas(uuid,text) to authenticated;
set local role authenticated;
select pg_temp.probar_tablas('dd000000-0000-4000-8000-00000000000d','dueno');
select pg_temp.probar_tablas('dd000000-0000-4000-8000-00000000000a','ayudante');
select pg_temp.probar_tablas('dd000000-0000-4000-8000-00000000000e','editor');
select pg_temp.probar_tablas('dd000000-0000-4000-8000-00000000000c','administrador');
-- Insertar: el Ayudante crea un cliente y una promo, pero no un producto ni la marca.
select pg_temp.como('dd000000-0000-4000-8000-00000000000a');
insert into public.clientes(tienda_id,nombre,telefono) values ('de000000-0000-4000-8000-000000000001','Nuevo','+18095557002');
select pg_temp.rechaza($q$insert into public.productos(tienda_id,nombre,precio,stock) values ('de000000-0000-4000-8000-000000000001','Nuevo',1,1)$q$,'42501','row-level security');
select pg_temp.rechaza($q$insert into public.marca_referencias(tienda_id,ruta,orden) values ('de000000-0000-4000-8000-000000000001','de000000-0000-4000-8000-000000000001/x.jpg',1)$q$,'42501','row-level security');
select pg_temp.toca($q$delete from public.marca_referencias where id=pg_temp.id('ref')$q$,0);
-- Las lecturas siguen abiertas a todo miembro (un Ayudante ve productos para armar un pedido).
select pg_temp.comprobar((select count(*) from public.productos where tienda_id='de000000-0000-4000-8000-000000000001')=1
  and (select count(*) from public.marca_tienda where tienda_id='de000000-0000-4000-8000-000000000001')=1,'el Ayudante lee productos y la marca');
-- El Editor crea un producto; no la marca.
select pg_temp.como('dd000000-0000-4000-8000-00000000000e');
insert into public.productos(tienda_id,nombre,precio,stock) values ('de000000-0000-4000-8000-000000000001','Del editor',1,1);
select pg_temp.rechaza($q$insert into public.marca_referencias(tienda_id,ruta,orden) values ('de000000-0000-4000-8000-000000000001','de000000-0000-4000-8000-000000000001/x.jpg',1)$q$,'42501','row-level security');
-- El extraño no ve ni escribe nada.
select pg_temp.como('dd000000-0000-4000-8000-00000000000f');
select pg_temp.comprobar((select count(*) from public.productos where tienda_id='de000000-0000-4000-8000-000000000001')=0
  and (select count(*) from public.clientes where tienda_id='de000000-0000-4000-8000-000000000001')=0
  and (select count(*) from public.miembros where tienda_id='de000000-0000-4000-8000-000000000001')=0,'el extraño no ve nada');
select pg_temp.toca($q$update public.clientes set nota='x' where tienda_id='de000000-0000-4000-8000-000000000001'$q$,0);
select pg_temp.rechaza($q$insert into public.clientes(tienda_id,nombre,telefono) values ('de000000-0000-4000-8000-000000000001','X','+18095557003')$q$,'42501','row-level security');
-- Nadie se sube el nivel ni se cambia el rol (tampoco la dueña, directo: se hace con funciones).
select pg_temp.como('dd000000-0000-4000-8000-00000000000a');
select pg_temp.rechaza($q$update public.miembros set nivel='administrador' where usuario_id='dd000000-0000-4000-8000-00000000000a'$q$,'42501','permission denied');
select pg_temp.rechaza($q$insert into public.miembros(usuario_id,tienda_id,rol) values ('dd000000-0000-4000-8000-00000000000f','de000000-0000-4000-8000-000000000001','dueno')$q$,'42501','permission denied');
select pg_temp.como('dd000000-0000-4000-8000-00000000000d');
select pg_temp.rechaza($q$update public.miembros set nivel='editor' where usuario_id='dd000000-0000-4000-8000-00000000000a'$q$,'42501','permission denied');
select pg_temp.comprobar(public.tengo_permiso('de000000-0000-4000-8000-000000000001','equipo'),'la dueña tiene equipo');
select pg_temp.como('dd000000-0000-4000-8000-00000000000c');
select pg_temp.comprobar(not public.tengo_permiso('de000000-0000-4000-8000-000000000001','equipo'),'el Administrador NO tiene equipo');
select pg_temp.rechaza($q$select public.exigir_permiso('de000000-0000-4000-8000-000000000001','equipo')$q$,'42501','sin_permiso');
select public.exigir_permiso('de000000-0000-4000-8000-000000000001','creditos');
select pg_temp.como('dd000000-0000-4000-8000-00000000000f');
select public.exigir_permiso('de000000-0000-4000-8000-000000000001','ventas'); -- no es miembro: decide la función (no lanza sin_permiso)
select pg_temp.comprobar(not public.tengo_permiso('de000000-0000-4000-8000-000000000001','ventas'),'el extraño no tiene permiso');
reset role;

-- ═══ 2. Archivos: productos → catalogo; marca-referencias → marca ═══
create function pg_temp.probar_archivos(u uuid, nivel text) returns void language plpgsql as $$
declare g text; b text; puede boolean;
begin
  perform pg_temp.como(u);
  foreach b in array array['productos','marca-referencias'] loop
    g := case b when 'productos' then 'catalogo' else 'marca' end;
    puede := nivel='dueno' or public.nivel_tiene_grupo(nivel, g);
    begin
      insert into storage.objects(bucket_id,name) values (b,'de000000-0000-4000-8000-000000000001/'||nivel||'.jpg');
      if not puede then raise exception 'NO_FRENO % subió a %', nivel, b; end if;
    exception when insufficient_privilege then
      if puede then raise exception '% no pudo subir a %', nivel, b; end if;
    end;
  end loop;
end $$;
grant execute on function pg_temp.probar_archivos(uuid,text) to authenticated;
insert into storage.objects(bucket_id,name) values ('productos','de000000-0000-4000-8000-000000000001/previo.jpg'),('marca-referencias','de000000-0000-4000-8000-000000000001/previo.jpg');
set local role authenticated;
select pg_temp.probar_archivos('dd000000-0000-4000-8000-00000000000d','dueno');
select pg_temp.probar_archivos('dd000000-0000-4000-8000-00000000000a','ayudante');
select pg_temp.probar_archivos('dd000000-0000-4000-8000-00000000000e','editor');
select pg_temp.probar_archivos('dd000000-0000-4000-8000-00000000000c','administrador');
select pg_temp.como('dd000000-0000-4000-8000-00000000000a');
select pg_temp.toca($q$delete from storage.objects where name='de000000-0000-4000-8000-000000000001/previo.jpg'$q$,0);
select pg_temp.como('dd000000-0000-4000-8000-00000000000e');
select pg_temp.toca($q$delete from storage.objects where name='de000000-0000-4000-8000-000000000001/previo.jpg'$q$,1); -- borra la de productos, no la de la marca
select pg_temp.como('dd000000-0000-4000-8000-00000000000c');
select pg_temp.toca($q$delete from storage.objects where name='de000000-0000-4000-8000-000000000001/previo.jpg'$q$,1);
reset role;

-- ═══ 3. Con Ver como abierto sobre su propia tienda, un admin que además es Administrador de ella no escribe ═══
insert into public.admins(usuario_id,email) values ('dd000000-0000-4000-8000-00000000000c','administra@prueba.invalid');
set local role authenticated;
select pg_temp.como('dd000000-0000-4000-8000-00000000000c');
select pg_temp.comprobar((public.admin_ver_como_iniciar('de000000-0000-4000-8000-000000000001')->>'id') is not null,'abre Ver como');
select pg_temp.toca($q$update public.productos set nombre='No' where id=pg_temp.id('producto')$q$,0);
select pg_temp.toca($q$update public.clientes set nota='No' where id=pg_temp.id('cliente')$q$,0);
select pg_temp.comprobar((select count(*) from public.productos where tienda_id='de000000-0000-4000-8000-000000000001')=2,'mientras mira, lee');
select public.admin_ver_como_terminar((public.admin_ver_como_actual()->>'id')::uuid);
select pg_temp.toca($q$update public.productos set nombre='Producto' where id=pg_temp.id('producto')$q$,1);
reset role;

-- ═══ 4. RPC security definer: con cada nivel, `sin_permiso` si no tiene el grupo y NUNCA si lo tiene ═══
-- Cada llamada se deshace al terminar (se lanza OK_DESHACER), así ninguna cambia lo que ve la siguiente.
create temp table rpc_casos(grupo text, nombre text, q text);
grant select on rpc_casos to authenticated;
insert into rpc_casos values
 ('ventas','borrar_cliente',$q$select public.borrar_cliente(pg_temp.id('cliente'), false)$q$),
 ('ventas','crear_codigo_cliente',$q$select public.crear_codigo_cliente('de000000-0000-4000-8000-000000000001'::uuid, pg_temp.id('cliente'), 10, 5, null)$q$),
 ('ventas','despachar_pedido',$q$select public.despachar_pedido(pg_temp.id('pedido'))$q$),
 ('ventas','deshacer_despacho',$q$select public.deshacer_despacho(pg_temp.id('pedido'))$q$),
 ('ventas','editar_pedido',$q$select public.editar_pedido(pg_temp.id('pedido'), null, jsonb_build_array(jsonb_build_object('producto_id', pg_temp.id('producto'), 'variante_id', pg_temp.id('variante'), 'cantidad', 1)), null, null, false, false)$q$),
 ('ventas','eliminar_pedido',$q$select public.eliminar_pedido(pg_temp.id('pedido'))$q$),
 ('ventas','registrar_abono',$q$select public.registrar_abono('de000000-0000-4000-8000-000000000001'::uuid, pg_temp.id('cliente'), 10, 'efectivo', now(), null, null)$q$),
 ('ventas','registrar_envio_jugada',$q$select public.registrar_envio_jugada('de000000-0000-4000-8000-000000000001'::uuid, pg_temp.id('cliente'), 'x', 'codigo', null, '{}')$q$),
 ('ventas','registrar_venta_pasada',$q$select public.registrar_venta_pasada('de000000-0000-4000-8000-000000000001'::uuid, null, now() - interval '1 day', jsonb_build_array(jsonb_build_object('producto_id', pg_temp.id('producto'), 'variante_id', pg_temp.id('variante'), 'cantidad', 1)), null, false)$q$),
 ('catalogo','ajustar_stock',$q$select public.ajustar_stock('de000000-0000-4000-8000-000000000001'::uuid, pg_temp.id('producto'), 1, 'reposicion', null, null)$q$),
 ('catalogo','crear_producto',$q$select public.crear_producto('de000000-0000-4000-8000-000000000001'::uuid, '{"nombre":"RPC","precio":10}'::jsonb, 0, '[]'::jsonb, '[]'::jsonb)$q$),
 ('catalogo','eliminar_producto',$q$select public.eliminar_producto('de000000-0000-4000-8000-000000000001'::uuid, pg_temp.id('producto'))$q$),
 ('catalogo','guardar_producto_inventario',$q$select public.guardar_producto_inventario('de000000-0000-4000-8000-000000000001'::uuid, pg_temp.id('producto'), '{"nombre":"Y"}'::jsonb, 0, 0, null, null, null, false)$q$),
 ('catalogo','guardar_variantes',$q$select public.guardar_variantes('de000000-0000-4000-8000-000000000001'::uuid, pg_temp.id('producto'), '[{"nombre":"Talla","valores":["S","M"]}]'::jsonb, '[]'::jsonb)$q$),
 ('catalogo','reponer_stock',$q$select public.reponer_stock('de000000-0000-4000-8000-000000000001'::uuid, jsonb_build_array(jsonb_build_object('producto_id', pg_temp.id('producto'), 'variante_id', pg_temp.id('variante'), 'cantidad', 1)), null)$q$),
 ('catalogo','publicar_catalogo',$q$select public.publicar_catalogo('de000000-0000-4000-8000-000000000001'::uuid)$q$),
 ('catalogo','solicitar_catalogo',$q$select public.solicitar_catalogo('de000000-0000-4000-8000-000000000001'::uuid)$q$),
 ('catalogo','pedir_cambios_catalogo',$q$select public.pedir_cambios_catalogo('de000000-0000-4000-8000-000000000001'::uuid, 'Cambios de prueba')$q$),
 ('creditos','gastar_creditos',$q$select public.gastar_creditos('de000000-0000-4000-8000-000000000001'::uuid, 1)$q$),
 ('creditos','pedir_retoque',$q$select public.pedir_retoque(pg_temp.id('producto'), 'https://ejemplo.invalid/a.webp')$q$),
 ('equipo','cambiar_estado_tienda',$q$select public.cambiar_estado_tienda('de000000-0000-4000-8000-000000000001'::uuid, 'pausar')$q$),
 ('equipo','invitar_por_correo',$q$select public.invitar_por_correo('de000000-0000-4000-8000-000000000001'::uuid, 'nadie@ejemplo.invalid', 'editor')$q$),
 ('equipo','invitar_a_tienda',$q$select public.invitar_a_tienda('de000000-0000-4000-8000-000000000001'::uuid, 'nadie2@ejemplo.invalid', 'staff')$q$),
 ('equipo','transferir_tienda',$q$select public.transferir_tienda('de000000-0000-4000-8000-000000000001'::uuid, 'dd000000-0000-4000-8000-00000000000a')$q$),
 ('equipo','quitar_otro',$q$select public.quitar_de_tienda('de000000-0000-4000-8000-000000000001'::uuid, 'dd000000-0000-4000-8000-00000000000b')$q$);
create function pg_temp.probar_rpc(u uuid, nivel text) returns void language plpgsql as $$
declare c record; puede boolean; n int := 0;
begin
  perform pg_temp.como(u);
  for c in select * from rpc_casos loop
    n := n + 1;
    puede := nivel = 'dueno' or (c.grupo <> 'equipo' and public.nivel_tiene_grupo(nivel, c.grupo));
    begin
      execute c.q;
      raise exception 'OK_DESHACER';
    exception when others then
      if sqlerrm = 'OK_DESHACER' then
        if not puede then raise exception '% (%) pudo %', nivel, c.grupo, c.nombre; end if;
      elsif sqlerrm = 'sin_permiso' then
        if puede then raise exception '% recibió sin_permiso en % (debía poder)', nivel, c.nombre; end if;
      elsif not puede and not (c.grupo = 'equipo' and sqlerrm = 'solo_dueno') then
        raise exception '% en % lanzó % / % (se esperaba sin_permiso)', nivel, c.nombre, sqlstate, sqlerrm;
      end if;
    end;
  end loop;
  if n < 20 then raise exception 'Faltan casos de RPC'; end if;
end $$;
grant execute on function pg_temp.probar_rpc(uuid,text) to authenticated;
set local role authenticated;
select pg_temp.probar_rpc('dd000000-0000-4000-8000-00000000000d','dueno');
select pg_temp.probar_rpc('dd000000-0000-4000-8000-00000000000a','ayudante');
select pg_temp.probar_rpc('dd000000-0000-4000-8000-00000000000e','editor');
select pg_temp.probar_rpc('dd000000-0000-4000-8000-00000000000c','administrador');
-- El extraño: ninguna RPC le sirve (cada una falla con su propio error de pertenencia).
select pg_temp.como('dd000000-0000-4000-8000-00000000000f');
select pg_temp.rechaza($q$select public.crear_producto('de000000-0000-4000-8000-000000000001'::uuid, '{"nombre":"RPC","precio":10}'::jsonb, 0, '[]'::jsonb, '[]'::jsonb)$q$,'42501');
select pg_temp.rechaza($q$select public.gastar_creditos('de000000-0000-4000-8000-000000000001'::uuid, 1)$q$,'P0002');
-- Salir: un colaborador sale él mismo; un dueño no quita a otro dueño (solo transferir); la última dueña no sale.
select pg_temp.como('dd000000-0000-4000-8000-00000000000a');
select public.quitar_de_tienda('de000000-0000-4000-8000-000000000001','dd000000-0000-4000-8000-00000000000a');
select pg_temp.comprobar((select count(*) from public.productos where tienda_id='de000000-0000-4000-8000-000000000001')=0,'tras salir, el Ayudante ya no lee la tienda');
reset role;
insert into public.miembros(usuario_id,tienda_id,rol) values ('dd000000-0000-4000-8000-00000000000f','de000000-0000-4000-8000-000000000001','dueno');
set local role authenticated;
select pg_temp.como('dd000000-0000-4000-8000-00000000000d');
select pg_temp.rechaza($q$select public.quitar_de_tienda('de000000-0000-4000-8000-000000000001','dd000000-0000-4000-8000-00000000000f')$q$,'42501','no_se_quita_dueno');
select public.quitar_de_tienda('de000000-0000-4000-8000-000000000001','dd000000-0000-4000-8000-00000000000e');
select pg_temp.comprobar((select count(*) from public.miembros where tienda_id='de000000-0000-4000-8000-000000000001' and usuario_id='dd000000-0000-4000-8000-00000000000e')=0,'la dueña quita al Editor');
-- Transferir: la que deja de ser dueña queda Administradora.
select public.transferir_tienda('de000000-0000-4000-8000-000000000001','dd000000-0000-4000-8000-00000000000c');
select pg_temp.comprobar((select rol||'/'||nivel from public.miembros where tienda_id='de000000-0000-4000-8000-000000000001' and usuario_id='dd000000-0000-4000-8000-00000000000d')='staff/administrador','al transferir, la exdueña queda Administradora');
reset role;
-- Invitar por correo guarda el nivel (y lo aplica al entrar con Google).
select pg_temp.como('dd000000-0000-4000-8000-00000000000c');
set local role authenticated;
select public.invitar_por_correo('de000000-0000-4000-8000-000000000001','nueva@prueba.invalid','editor');
reset role;
select pg_temp.comprobar((select nivel from public.invitaciones where email='nueva@prueba.invalid')='editor','la invitación guarda el nivel');
insert into auth.users(id,email,raw_app_meta_data,email_confirmed_at) values ('dd000000-0000-4000-8000-000000000010','nueva@prueba.invalid','{"provider":"google"}',now());
select pg_temp.comprobar((select rol||'/'||nivel from public.miembros where usuario_id='dd000000-0000-4000-8000-000000000010')='staff/editor','al entrar con Google queda Editor');

-- ═══ 5. Enlaces de colaborador: un solo uso, la dueña aprueba ═══
-- Nueva tienda limpia para no arrastrar lo anterior: dueña D2, Administrador X2 (colaborador), y cuentas que abren enlaces.
reset role;
insert into auth.users(id,email,raw_app_meta_data,raw_user_meta_data,email_confirmed_at) values
 ('dd000000-0000-4000-8000-000000000021','duena2@prueba.invalid','{"provider":"google"}','{"full_name":"Dueña Dos"}',now()),
 ('dd000000-0000-4000-8000-000000000022','admin2@prueba.invalid','{"provider":"google"}','{"full_name":"Admin Dos"}',now()),
 ('dd000000-0000-4000-8000-000000000023','abre1@prueba.invalid','{"provider":"google"}','{"full_name":"Ana Abre"}',now()),
 ('dd000000-0000-4000-8000-000000000024','abre2@prueba.invalid','{"provider":"google"}','{"full_name":"Beto Abre"}',now()),
 ('dd000000-0000-4000-8000-000000000025','sin-google@prueba.invalid','{"provider":"email"}','{}',now());
insert into public.tiendas(id,nombre,slug,estado) values ('de000000-0000-4000-8000-000000000002','Enlaces fixture','enlaces-fixture','activa');
insert into public.miembros(usuario_id,tienda_id,rol,nivel) values
 ('dd000000-0000-4000-8000-000000000021','de000000-0000-4000-8000-000000000002','dueno','ayudante'),
 ('dd000000-0000-4000-8000-000000000022','de000000-0000-4000-8000-000000000002','staff','administrador');
create temp table codigos(k text primary key, c text);
grant all on codigos to authenticated;
select pg_temp.comprobar(not has_table_privilege('anon','public.enlaces_invitacion','SELECT') and not has_column_privilege('authenticated','public.enlaces_invitacion','codigo_hash','SELECT')
  and not has_table_privilege('authenticated','public.enlaces_invitacion','INSERT') and not has_table_privilege('authenticated','public.enlaces_invitacion','UPDATE'),
  'enlaces: anon nada; nadie lee el hash ni escribe la tabla');
select pg_temp.comprobar(not has_function_privilege('anon','public.reclamar_enlace(text)','EXECUTE') and not has_function_privilege('authenticated','public.codigo_enlace_nuevo()','EXECUTE')
  and not has_function_privilege('authenticated','public.hash_enlace(text)','EXECUTE'),'funciones de enlace sin anon; el código y el hash no se piden por la API');
set local role authenticated;
-- Un colaborador (ni siquiera Administrador) crea enlaces, aprueba ni ve el equipo.
select pg_temp.como('dd000000-0000-4000-8000-000000000022');
select pg_temp.rechaza($q$select public.crear_enlace_colaborador('de000000-0000-4000-8000-000000000002','editor',null)$q$,'42501','sin_permiso');
select pg_temp.rechaza($q$select public.equipo_de_tienda('de000000-0000-4000-8000-000000000002')$q$,'42501','solo_dueno');
select pg_temp.rechaza($q$select public.cambiar_nivel('de000000-0000-4000-8000-000000000002','dd000000-0000-4000-8000-000000000022','administrador')$q$,'42501','sin_permiso');
-- La dueña crea tres enlaces: el código vuelve una vez y solo queda su hash.
select pg_temp.como('dd000000-0000-4000-8000-000000000021');
insert into codigos values ('a', public.crear_enlace_colaborador('de000000-0000-4000-8000-000000000002','editor','Para Ana')),
  ('b', public.crear_enlace_colaborador('de000000-0000-4000-8000-000000000002',null,null)),
  ('c', public.crear_enlace_colaborador('de000000-0000-4000-8000-000000000002','ayudante',null));
select pg_temp.comprobar((select count(*) from codigos where c ~ '^[A-Za-z0-9_-]{43}$')=3,'códigos base64url de 256 bits');
select pg_temp.rechaza($q$select public.crear_enlace_colaborador('de000000-0000-4000-8000-000000000002','jefe',null)$q$,'22023','nivel_invalido');
select pg_temp.rechaza($q$select public.crear_enlace_colaborador('de000000-0000-4000-8000-000000000002','editor',repeat('x',41))$q$,'22023','nota_invalida');
select pg_temp.comprobar((select count(*) from public.enlaces_invitacion where tienda_id='de000000-0000-4000-8000-000000000002')=3,'la dueña ve sus enlaces');
select pg_temp.comprobar(jsonb_array_length(public.equipo_de_tienda('de000000-0000-4000-8000-000000000002')->'enlaces')=3,'equipo_de_tienda lista los activos');
reset role;
select pg_temp.comprobar((select count(*) from public.enlaces_invitacion e join codigos k on e.codigo_hash=encode(sha256(convert_to(k.c,'UTF8')),'hex'))=3
  and not exists (select 1 from public.enlaces_invitacion e join codigos k on e.codigo_hash=k.c),'se guarda el SHA-256, nunca el código');
set local role authenticated;
-- La dueña no se reclama su propio enlace; una cuenta sin Google tampoco; un código inventado da el mismo error.
select pg_temp.rechaza($q$select public.reclamar_enlace((select c from codigos where k='a'))$q$,'P0001','enlace_no_valido');
select pg_temp.como('dd000000-0000-4000-8000-000000000025');
select pg_temp.rechaza($q$select public.reclamar_enlace((select c from codigos where k='a'))$q$,'P0001','enlace_no_valido');
select pg_temp.como('dd000000-0000-4000-8000-000000000023');
select pg_temp.rechaza($q$select public.reclamar_enlace('esto-no-es-un-codigo-valido-de-nada-1234567')$q$,'P0001','enlace_no_valido');
-- Ana abre el enlace a: queda esperando, NO es miembro y no lee nada de la tienda.
select pg_temp.comprobar((select public.reclamar_enlace((select c from codigos where k='a'))->>'estado')='esperando','Ana queda esperando');
select pg_temp.comprobar((select public.reclamar_enlace((select c from codigos where k='a'))->>'estado')='esperando','si Ana lo vuelve a abrir, ve su estado');
select pg_temp.comprobar((select count(*) from public.miembros where tienda_id='de000000-0000-4000-8000-000000000002')=0
  and (select count(*) from public.tiendas where id='de000000-0000-4000-8000-000000000002')=0
  and (select count(*) from public.enlaces_invitacion)=0,'sin aprobar no es miembro ni lee la tienda ni los enlaces');
select pg_temp.comprobar((select public.mis_solicitudes()->0->>'estado')='esperando' and (select public.mis_solicitudes()->0->>'tienda_nombre')='Enlaces fixture','Ana ve «esperando» con el nombre de la tienda');
-- Beto intenta el mismo enlace: ya no sirve.
select pg_temp.como('dd000000-0000-4000-8000-000000000024');
select pg_temp.rechaza($q$select public.reclamar_enlace((select c from codigos where k='a'))$q$,'P0001','enlace_no_valido');
-- El Administrador no aprueba; la dueña sí, cambiando el nivel a Administrador.
select pg_temp.como('dd000000-0000-4000-8000-000000000022');
select pg_temp.rechaza($q$select public.aprobar_miembro((select id from public.enlaces_invitacion where nota='Para Ana'),'administrador')$q$,'42501');
select pg_temp.como('dd000000-0000-4000-8000-000000000021');
select pg_temp.comprobar(jsonb_array_length(public.equipo_de_tienda('de000000-0000-4000-8000-000000000002')->'solicitudes')=1
  and (public.equipo_de_tienda('de000000-0000-4000-8000-000000000002')->'solicitudes'->0->>'email')='abre1@prueba.invalid','la dueña ve la solicitud con el correo de Google');
select public.aprobar_miembro((select id from public.enlaces_invitacion where nota='Para Ana'),'administrador');
select pg_temp.rechaza($q$select public.aprobar_miembro((select id from public.enlaces_invitacion where nota='Para Ana'),'editor')$q$,'P0001','solicitud_no_valida');
select pg_temp.comprobar((select rol||'/'||nivel from public.miembros where usuario_id='dd000000-0000-4000-8000-000000000023' and tienda_id='de000000-0000-4000-8000-000000000002')='staff/administrador','aprobada con el nivel elegido');
select pg_temp.como('dd000000-0000-4000-8000-000000000023');
select pg_temp.comprobar((select count(*) from public.tiendas where id='de000000-0000-4000-8000-000000000002')=1
  and (select tienda_id from public.usuarios where id='dd000000-0000-4000-8000-000000000023')='de000000-0000-4000-8000-000000000002','aprobada, Ana entra a la tienda');
select pg_temp.comprobar((select count(*) from public.enlaces_invitacion)=0,'Ana (Administradora) no lee los enlaces');
-- Beto abre b y la dueña lo rechaza: no es miembro.
select pg_temp.como('dd000000-0000-4000-8000-000000000024');
select public.reclamar_enlace((select c from codigos where k='b'));
select pg_temp.como('dd000000-0000-4000-8000-000000000021');
select public.rechazar_miembro((select e.id from public.enlaces_invitacion e where e.estado='esperando'));
select pg_temp.comprobar((select count(*) from public.miembros where usuario_id='dd000000-0000-4000-8000-000000000024')=0,'rechazado no es miembro');
-- c: cancelado no sirve.
select public.cancelar_enlace((select e.id from public.enlaces_invitacion e where e.estado='activo' and e.nivel='ayudante' limit 1));
select pg_temp.como('dd000000-0000-4000-8000-000000000024');
select pg_temp.rechaza($q$select public.reclamar_enlace((select c from codigos where k='c'))$q$,'P0001','enlace_no_valido');
-- Vencimiento (reloj simulado): un enlace de 8 días ya no sirve; una solicitud de 8 días ya no se aprueba.
select pg_temp.como('dd000000-0000-4000-8000-000000000021');
insert into codigos values ('d', public.crear_enlace_colaborador('de000000-0000-4000-8000-000000000002','editor','Viejo')),
  ('e', public.crear_enlace_colaborador('de000000-0000-4000-8000-000000000002','editor','Solicitud vieja'));
reset role;
update public.enlaces_invitacion set creado_en=now()-interval '8 days', vence_en=now()-interval '1 day' where nota='Viejo';
set local role authenticated;
select pg_temp.como('dd000000-0000-4000-8000-000000000024');
select pg_temp.rechaza($q$select public.reclamar_enlace((select c from codigos where k='d'))$q$,'P0001','enlace_no_valido');
select public.reclamar_enlace((select c from codigos where k='e'));
reset role;
update public.enlaces_invitacion set reclamado_en=now()-interval '8 days' where nota='Solicitud vieja';
set local role authenticated;
select pg_temp.como('dd000000-0000-4000-8000-000000000021');
select pg_temp.rechaza($q$select public.aprobar_miembro((select id from public.enlaces_invitacion where nota='Solicitud vieja'),null)$q$,'P0001','solicitud_no_valida');
-- Cambiar nivel: solo la dueña, y solo a colaboradores.
select public.cambiar_nivel('de000000-0000-4000-8000-000000000002','dd000000-0000-4000-8000-000000000023','ayudante');
select pg_temp.comprobar((select nivel from public.miembros where usuario_id='dd000000-0000-4000-8000-000000000023')='ayudante','la dueña baja a Ana a Ayudante');
select pg_temp.rechaza($q$select public.cambiar_nivel('de000000-0000-4000-8000-000000000002','dd000000-0000-4000-8000-000000000021','editor')$q$,'P0002','no_es_colaborador');
-- Con Ver como abierto sobre su tienda, un admin que además es dueño no crea enlaces ni aprueba.
reset role;
insert into public.admins(usuario_id,email) values ('dd000000-0000-4000-8000-000000000021','duena2@prueba.invalid');
set local role authenticated;
select pg_temp.como('dd000000-0000-4000-8000-000000000021');
select public.admin_ver_como_iniciar('de000000-0000-4000-8000-000000000002');
select pg_temp.rechaza($q$select public.crear_enlace_colaborador('de000000-0000-4000-8000-000000000002','editor',null)$q$,'42501','solo_mirar');
select pg_temp.rechaza($q$select public.cambiar_nivel('de000000-0000-4000-8000-000000000002','dd000000-0000-4000-8000-000000000023','editor')$q$,'42501','solo_mirar');
select public.admin_ver_como_terminar((public.admin_ver_como_actual()->>'id')::uuid);
-- El gancho del límite se llama al aprobar y al invitar por correo.
reset role;
select pg_temp.comprobar((select prosrc ~ 'puede_sumar_colaborador' from pg_proc where oid='public.aprobar_miembro(uuid,text)'::regprocedure)
  and (select prosrc ~ 'puede_sumar_colaborador' from pg_proc where oid='public.invitar_por_correo(uuid,text,text,text)'::regprocedure)
  and (select prosrc ~ 'puede_sumar_colaborador' from pg_proc where oid='public.crear_enlace_colaborador(uuid,text,text)'::regprocedure),'puede_sumar_colaborador en aprobar, invitar y crear enlace');

-- ═══ 6. Tienda nueva: solo con enlace de un admin ═══
select pg_temp.comprobar(not has_function_privilege('authenticated','public.crear_tienda(text,text)','EXECUTE')
  and not has_function_privilege('authenticated','public.crear_tienda_para(uuid,text,text)','EXECUTE'),'crear_tienda ya no es ejecutable por una cuenta común');
insert into auth.users(id,email,raw_app_meta_data,raw_user_meta_data,email_confirmed_at) values
 ('dd000000-0000-4000-8000-000000000031','admin-lewis@prueba.invalid','{"provider":"google"}','{}',now()),
 ('dd000000-0000-4000-8000-000000000032','nueva-tienda@prueba.invalid','{"provider":"google"}','{"full_name":"Nueva"}',now()),
 ('dd000000-0000-4000-8000-000000000033','otra-nueva@prueba.invalid','{"provider":"google"}','{}',now());
insert into public.admins(usuario_id,email) values ('dd000000-0000-4000-8000-000000000031','admin-lewis@prueba.invalid');
set local role authenticated;
select pg_temp.como('dd000000-0000-4000-8000-000000000032');
select pg_temp.rechaza($q$select public.crear_tienda('Sin enlace','ropa')$q$,'42501','permission denied');
select pg_temp.rechaza($q$select public.admin_crear_enlace_tienda_nueva('x')$q$,'42501','no_admin');
select pg_temp.como('dd000000-0000-4000-8000-000000000031');
insert into codigos values ('t1', public.admin_crear_enlace_tienda_nueva('Para Nueva')), ('t2', public.admin_crear_enlace_tienda_nueva(null)),
  ('t3', public.admin_crear_enlace_tienda_nueva('Cancelar'));
select pg_temp.comprobar(jsonb_array_length(public.admin_enlaces_tienda_nueva())=3,'el admin lista sus enlaces de tienda nueva');
select pg_temp.comprobar((select count(*) from public.enlaces_invitacion where tipo='tienda_nueva')=3,'el admin los ve en la tabla');
select public.admin_cancelar_enlace_tienda((select id from public.enlaces_invitacion where nota='Cancelar'));
reset role;
select pg_temp.comprobar((select count(*) from public.registro_admin where accion='enlace_tienda_nueva')=3
  and not exists (select 1 from public.registro_admin r join codigos k on r.detalle::text like '%'||k.c||'%'),'el registro anota el enlace, nunca el código');
set local role authenticated;
-- Quien abre t1 queda aprobada al instante (no aprueba nadie más) y crea su tienda.
select pg_temp.como('dd000000-0000-4000-8000-000000000032');
select pg_temp.comprobar((select public.reclamar_enlace((select c from codigos where k='t1'))->>'estado')='aprobado','tienda nueva: aprobada al abrir');
select pg_temp.comprobar((select count(*) from public.enlaces_invitacion)=0,'una cuenta común no lee enlaces de tienda nueva');
select pg_temp.rechaza($q$select public.crear_mi_tienda((select (public.mis_solicitudes()->0->>'id')::uuid),'','ropa')$q$,'22023','nombre_invalido');
select pg_temp.comprobar((select (public.crear_mi_tienda((select (public.mis_solicitudes()->0->>'id')::uuid),'Mi Tienda Nueva','ropa')).estado)='en_prueba','crea su tienda en prueba');
select pg_temp.comprobar((select rol from public.miembros m join public.tiendas t on t.id=m.tienda_id where t.nombre='Mi Tienda Nueva')='dueno'
  and (select t.nombre from public.usuarios u join public.tiendas t on t.id=u.tienda_id where u.id='dd000000-0000-4000-8000-000000000032')='Mi Tienda Nueva','es su dueña y su tienda activa');
select pg_temp.rechaza($q$select public.crear_mi_tienda((select e.id from public.enlaces_invitacion e limit 1),'Otra más','ropa')$q$,'P0001','enlace_no_valido');
reset role;
select pg_temp.comprobar((select estado from public.enlaces_invitacion where nota='Para Nueva')='usado','el enlace queda usado');
set local role authenticated;
-- Otra cuenta no puede usar el enlace de otra ni el cancelado.
select pg_temp.como('dd000000-0000-4000-8000-000000000033');
select pg_temp.rechaza($q$select public.reclamar_enlace((select c from codigos where k='t1'))$q$,'P0001','enlace_no_valido');
select pg_temp.rechaza($q$select public.reclamar_enlace((select c from codigos where k='t3'))$q$,'P0001','enlace_no_valido');
select pg_temp.rechaza($q$select public.crear_mi_tienda((select id from public.enlaces_invitacion where nota='Para Nueva'),'Robada','ropa')$q$,'P0001','enlace_no_valido');
-- El tope de 3 tiendas en prueba se mantiene.
reset role;
insert into public.tiendas(id,nombre,slug,estado) values
 ('de000000-0000-4000-8000-0000000000e1','Prueba uno','prueba-uno-fx','en_prueba'),('de000000-0000-4000-8000-0000000000e2','Prueba dos','prueba-dos-fx','en_prueba'),
 ('de000000-0000-4000-8000-0000000000e3','Prueba tres','prueba-tres-fx','en_prueba');
insert into public.miembros(usuario_id,tienda_id,rol) select 'dd000000-0000-4000-8000-000000000033', id, 'dueno' from public.tiendas where slug like 'prueba-%-fx';
set local role authenticated;
select pg_temp.como('dd000000-0000-4000-8000-000000000033');
select public.reclamar_enlace((select c from codigos where k='t2'));
select pg_temp.rechaza($q$select public.crear_mi_tienda((select (public.mis_solicitudes()->0->>'id')::uuid),'Cuarta','ropa')$q$,'P0001','demasiadas_tiendas_en_prueba');
reset role;

rollback;
select 'Pasó: cada nivel escribe solo lo suyo en tablas y archivos; el extraño no ve nada; Ver como y permisos conviven.';
