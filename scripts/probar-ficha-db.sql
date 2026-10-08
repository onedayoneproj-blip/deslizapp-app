-- Ficha técnica (migración *_ficha_tecnica). Replay desechable; NO ejecutar en producción.
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
 ('bd000000-0000-4000-8000-00000000000d','duena@prueba.invalid','{"provider":"google"}',now()),
 ('bd000000-0000-4000-8000-00000000000a','ayudante@prueba.invalid','{"provider":"google"}',now()),
 ('bd000000-0000-4000-8000-00000000000e','editor@prueba.invalid','{"provider":"google"}',now()),
 ('bd000000-0000-4000-8000-00000000000c','administra@prueba.invalid','{"provider":"google"}',now()),
 ('bd000000-0000-4000-8000-00000000000f','extrano@prueba.invalid','{"provider":"google"}',now()),
 ('bd000000-0000-4000-8000-00000000000b','admin-duena@prueba.invalid','{"provider":"google"}',now());
insert into public.admins(usuario_id,email) values ('bd000000-0000-4000-8000-00000000000b','admin-duena@prueba.invalid');
insert into public.tiendas(id,nombre,slug,estado,catalogo_estado) values
 ('be000000-0000-4000-8000-000000000001','Ficha fixture','ficha-fixture','activa','publicado'),
 ('be000000-0000-4000-8000-000000000002','Ficha V fixture','ficha-v-fixture','activa','publicado'),
 ('be000000-0000-4000-8000-000000000003','Ficha ajena fixture','ficha-ajena-fixture','activa','publicado');
insert into public.miembros(usuario_id,tienda_id,rol,nivel) values
 ('bd000000-0000-4000-8000-00000000000d','be000000-0000-4000-8000-000000000001','dueno','ayudante'),
 ('bd000000-0000-4000-8000-00000000000a','be000000-0000-4000-8000-000000000001','staff','ayudante'),
 ('bd000000-0000-4000-8000-00000000000e','be000000-0000-4000-8000-000000000001','staff','editor'),
 ('bd000000-0000-4000-8000-00000000000c','be000000-0000-4000-8000-000000000001','staff','administrador'),
 ('bd000000-0000-4000-8000-00000000000b','be000000-0000-4000-8000-000000000002','dueno','ayudante');
insert into public.productos(id,tienda_id,nombre,precio,stock,medios) values
 ('bf000000-0000-4000-8000-000000000001','be000000-0000-4000-8000-000000000001','Con ficha',1850,3,'[{"tipo":"foto","url":"https://ejemplo.invalid/1.webp","retocada":false}]'),
 ('bf000000-0000-4000-8000-000000000002','be000000-0000-4000-8000-000000000002','Producto V',1850,3,'[{"tipo":"foto","url":"https://ejemplo.invalid/v1.webp","retocada":false}]'),
 ('bf000000-0000-4000-8000-000000000003','be000000-0000-4000-8000-000000000003','Producto ajeno',1850,3,'[{"tipo":"foto","url":"https://ejemplo.invalid/a1.webp","retocada":false}]'),
 ('bf000000-0000-4000-8000-000000000004','be000000-0000-4000-8000-000000000001','Producto eliminado',1850,0,'[{"tipo":"foto","url":"https://ejemplo.invalid/e1.webp","retocada":false}]');

-- ═══ 0. Estructura ═══
select pg_temp.comprobar((select count(*) from information_schema.columns where table_name='productos' and column_name='ficha_url' and is_nullable='YES')=1,'columna ficha_url nullable');
select pg_temp.comprobar((select ficha_url from public.productos where id='bf000000-0000-4000-8000-000000000001') is null,'un producto existente parte sin ficha');
select pg_temp.comprobar(not has_function_privilege('anon','public.guardar_ficha_producto(uuid,uuid,text)','EXECUTE')
  and has_function_privilege('authenticated','public.guardar_ficha_producto(uuid,uuid,text)','EXECUTE'),'guardar_ficha_producto: anon no, authenticated sí');
select pg_temp.comprobar(not has_column_privilege('authenticated','public.productos','ficha_url','UPDATE'),'nadie escribe la columna directo');
select pg_temp.comprobar((select pg_get_functiondef('public.catalogo_publico(text)'::regprocedure) like '%''ficha_url'', p.ficha_url%'),'catalogo_publico la devuelve');

-- ═══ 1. La restricción: solo el Storage de Deslizapp, carpeta de la tienda ═══
select pg_temp.rechaza($q$update public.productos set ficha_url='http://x.supabase.co/storage/v1/object/public/productos/be000000-0000-4000-8000-000000000001/a.webp' where id='bf000000-0000-4000-8000-000000000001'$q$,'23514','productos_ficha_url_valida');
select pg_temp.rechaza($q$update public.productos set ficha_url='https://ejemplo.invalid/a.webp' where id='bf000000-0000-4000-8000-000000000001'$q$,'23514','productos_ficha_url_valida');
select pg_temp.rechaza($q$update public.productos set ficha_url='https://x.supabase.co/storage/v1/object/public/productos/be000000-0000-4000-8000-000000000003/a.webp' where id='bf000000-0000-4000-8000-000000000001'$q$,'23514','productos_ficha_url_valida');
select pg_temp.rechaza($q$update public.productos set ficha_url='https://x.supabase.co/storage/v1/object/public/productos/be000000-0000-4000-8000-000000000001/../x.webp' where id='bf000000-0000-4000-8000-000000000001'$q$,'23514','productos_ficha_url_valida');
select pg_temp.rechaza($q$update public.productos set ficha_url='https://x.supabase.co/storage/v1/object/public/productos/be000000-0000-4000-8000-000000000001/a b.webp' where id='bf000000-0000-4000-8000-000000000001'$q$,'23514','productos_ficha_url_valida');

-- ═══ 2. Permisos por nivel (grupo catalogo) ═══
set local role authenticated;
select pg_temp.como('bd000000-0000-4000-8000-00000000000a');
select pg_temp.rechaza($q$select public.guardar_ficha_producto('be000000-0000-4000-8000-000000000001','bf000000-0000-4000-8000-000000000001','https://x.supabase.co/storage/v1/object/public/productos/be000000-0000-4000-8000-000000000001/f.webp')$q$,'42501');
select pg_temp.como('bd000000-0000-4000-8000-00000000000e');
select pg_temp.comprobar(public.guardar_ficha_producto('be000000-0000-4000-8000-000000000001','bf000000-0000-4000-8000-000000000001','https://x.supabase.co/storage/v1/object/public/productos/be000000-0000-4000-8000-000000000001/f.webp') is not null,'el Editor guarda la ficha');
select pg_temp.como('bd000000-0000-4000-8000-00000000000c');
select pg_temp.comprobar(public.guardar_ficha_producto('be000000-0000-4000-8000-000000000001','bf000000-0000-4000-8000-000000000001','https://x.supabase.co/storage/v1/object/public/productos/be000000-0000-4000-8000-000000000001/g.webp') like '%/g.webp','el Administrador la cambia');
select pg_temp.como('bd000000-0000-4000-8000-00000000000d');
select pg_temp.comprobar(public.guardar_ficha_producto('be000000-0000-4000-8000-000000000001','bf000000-0000-4000-8000-000000000001','https://x.supabase.co/storage/v1/object/public/productos/be000000-0000-4000-8000-000000000001/h.webp') like '%/h.webp','la dueña guarda la ficha');
reset role;
select pg_temp.comprobar((select ficha_url from public.productos where id='bf000000-0000-4000-8000-000000000001') like '%/h.webp','quedó guardada la última');

-- ═══ 3. Tienda ajena, extraño, producto de otra tienda, url inválida ═══
set local role authenticated;
select pg_temp.como('bd000000-0000-4000-8000-00000000000f');
select pg_temp.rechaza($q$select public.guardar_ficha_producto('be000000-0000-4000-8000-000000000001','bf000000-0000-4000-8000-000000000001',null)$q$,'42501');
select pg_temp.como('bd000000-0000-4000-8000-00000000000c');
select pg_temp.rechaza($q$select public.guardar_ficha_producto('be000000-0000-4000-8000-000000000003','bf000000-0000-4000-8000-000000000003',null)$q$,'42501');
select pg_temp.rechaza($q$select public.guardar_ficha_producto('be000000-0000-4000-8000-000000000001','bf000000-0000-4000-8000-000000000003',null)$q$,'P0002');
select pg_temp.rechaza($q$select public.guardar_ficha_producto('be000000-0000-4000-8000-000000000001','bf000000-0000-4000-8000-000000000001','https://ejemplo.invalid/a.webp')$q$,'22023','ficha_invalida');
select pg_temp.rechaza($q$select public.guardar_ficha_producto('be000000-0000-4000-8000-000000000001','bf000000-0000-4000-8000-000000000001','https://x.supabase.co/storage/v1/object/public/productos/be000000-0000-4000-8000-000000000003/f.webp')$q$,'22023','ficha_invalida');
reset role;
select pg_temp.comprobar((select ficha_url from public.productos where id='bf000000-0000-4000-8000-000000000003') is null,'el producto ajeno no se tocó');

-- ═══ 4. Un producto eliminado no admite ficha; url nula la quita ═══
set local role authenticated;
select pg_temp.como('bd000000-0000-4000-8000-00000000000c');
select pg_temp.comprobar(public.guardar_ficha_producto('be000000-0000-4000-8000-000000000001','bf000000-0000-4000-8000-000000000001',null) is null,'url nula la quita');
reset role;
select pg_temp.comprobar((select ficha_url from public.productos where id='bf000000-0000-4000-8000-000000000001') is null,'sin ficha otra vez');
update public.productos set eliminado_en=now(), activo=false where id='bf000000-0000-4000-8000-000000000004';
set local role authenticated;
select pg_temp.como('bd000000-0000-4000-8000-00000000000c');
select pg_temp.rechaza($q$select public.guardar_ficha_producto('be000000-0000-4000-8000-000000000001','bf000000-0000-4000-8000-000000000004',null)$q$,'P0002');
reset role;

-- ═══ 5. Lectura pública ═══
update public.productos set ficha_url='https://x.supabase.co/storage/v1/object/public/productos/be000000-0000-4000-8000-000000000001/f.webp' where id='bf000000-0000-4000-8000-000000000001';
select pg_temp.comprobar((select p->>'ficha_url' from jsonb_array_elements(public.catalogo_publico('ficha-fixture')->'productos') p where p->>'nombre'='Con ficha') like '%/f.webp','catalogo_publico devuelve la ficha');
select pg_temp.comprobar((select count(*) from jsonb_array_elements(public.catalogo_publico('ficha-fixture')->'productos') p where p ? 'ficha_url' and p ? 'opciones' and p ? 'fotos_por_valor')>=1,'catalogo_publico sigue igual en lo demás');

-- ═══ 6. Ver como: no escribe ═══
set local role authenticated;
select pg_temp.como('bd000000-0000-4000-8000-00000000000b');
select pg_temp.comprobar((select (public.admin_ver_como_iniciar('be000000-0000-4000-8000-000000000002')->>'id') is not null),'abre Ver como sobre su propia tienda');
select pg_temp.rechaza($q$select public.guardar_ficha_producto('be000000-0000-4000-8000-000000000002','bf000000-0000-4000-8000-000000000002',null)$q$,'42501','solo_mirar');
reset role;
rollback;
