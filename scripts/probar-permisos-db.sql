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
 ('dd000000-0000-4000-8000-00000000000f','extrano@prueba.invalid','{"provider":"google"}','{"full_name":"Extraño"}',now());
insert into public.tiendas(id,nombre,slug,estado,creditos_retoque) values ('de000000-0000-4000-8000-000000000001','Permisos fixture','permisos-fixture','activa',0);
insert into public.movimientos_creditos(tienda_id,cantidad,tipo,motivo) values ('de000000-0000-4000-8000-000000000001',20,'ajuste','fixture');
insert into public.miembros(usuario_id,tienda_id,rol,nivel) values
 ('dd000000-0000-4000-8000-00000000000d','de000000-0000-4000-8000-000000000001','dueno','ayudante'),
 ('dd000000-0000-4000-8000-00000000000a','de000000-0000-4000-8000-000000000001','staff','ayudante'),
 ('dd000000-0000-4000-8000-00000000000e','de000000-0000-4000-8000-000000000001','staff','editor'),
 ('dd000000-0000-4000-8000-00000000000c','de000000-0000-4000-8000-000000000001','staff','administrador');
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

-- @@RPC@@

rollback;
select 'Pasó: cada nivel escribe solo lo suyo en tablas y archivos; el extraño no ve nada; Ver como y permisos conviven.';
