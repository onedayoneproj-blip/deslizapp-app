-- Mi marca para el retoque. Exclusivamente replay desechable; NO ejecutar en producción.
-- Las dos tablas y el bucket privado: cada tienda lee y escribe solo lo suyo, el admin solo lee, Ver como solo lee la tienda
-- que mira, anon no ve nada y la base impone el tope de 6 fotos de referencia y las reglas de las palabras.
begin;
do $$ begin if current_database()<>'replay_provisional' then raise exception 'Solo replay_provisional'; end if; end $$;
create function pg_temp.comprobar(ok boolean, mensaje text) returns void language plpgsql as $$ begin if ok is distinct from true then raise exception '%',mensaje; end if; end $$;
-- Rechaza con un SQLSTATE concreto (y, si se pide, un texto dentro del mensaje).
create function pg_temp.rechaza(q text, estado text, trozo text default '') returns void language plpgsql as $$ begin
  begin execute q; exception when others then
    if sqlstate=estado and position(trozo in sqlerrm)>0 then return; end if;
    raise exception 'Error inesperado % / % para %',sqlstate,sqlerrm,q;
  end; raise exception 'Aceptó operación prohibida: %',q;
end $$;
grant execute on function pg_temp.comprobar(boolean,text) to authenticated, anon;
grant execute on function pg_temp.rechaza(text,text,text) to authenticated, anon;

insert into auth.users(id,email,raw_app_meta_data,email_confirmed_at) values
 ('ca000000-0000-4000-8000-000000000001','admin-marca@prueba.invalid','{"provider":"google"}',now()),
 ('ca000000-0000-4000-8000-000000000002','duena-a@prueba.invalid','{"provider":"google"}',now()),
 ('ca000000-0000-4000-8000-000000000003','duena-b@prueba.invalid','{"provider":"google"}',now()),
 ('ca000000-0000-4000-8000-000000000004','mira-marca@prueba.invalid','{"provider":"google"}',now());
insert into public.admins(usuario_id,email) values
 ('ca000000-0000-4000-8000-000000000001','admin-marca@prueba.invalid'),
 ('ca000000-0000-4000-8000-000000000004','mira-marca@prueba.invalid');
insert into public.tiendas(id,nombre,slug,estado,creditos_retoque) values
 ('cb000000-0000-4000-8000-000000000001','Marca A fixture','marca-a-fixture','activa',0),
 ('cb000000-0000-4000-8000-000000000002','Marca B fixture','marca-b-fixture','activa',0);
insert into public.miembros(usuario_id,tienda_id,rol) values
 ('ca000000-0000-4000-8000-000000000002','cb000000-0000-4000-8000-000000000001','dueno'),
 ('ca000000-0000-4000-8000-000000000003','cb000000-0000-4000-8000-000000000002','dueno');

-- 0. Estructura: RLS activa, bucket privado, anon sin nada.
select pg_temp.comprobar((select count(*) from pg_class where relnamespace='public'::regnamespace and relname in ('marca_tienda','marca_referencias') and relrowsecurity)=2,'RLS en las dos tablas');
select pg_temp.comprobar((select not public and file_size_limit=5242880 and allowed_mime_types=array['image/jpeg','image/png','image/webp'] from storage.buckets where id='marca-referencias'),'bucket privado, 5 MB, solo imágenes');
select pg_temp.comprobar(not has_table_privilege('anon','public.marca_tienda','SELECT') and not has_table_privilege('anon','public.marca_referencias','SELECT'),'anon lee');
select pg_temp.comprobar(not has_table_privilege('anon','public.marca_tienda','INSERT') and not has_table_privilege('anon','public.marca_referencias','INSERT'),'anon escribe');
select pg_temp.comprobar(not has_column_privilege('authenticated','public.marca_referencias','tienda_id','UPDATE') and has_column_privilege('authenticated','public.marca_referencias','orden','UPDATE'),'permisos por columna de las referencias');
select pg_temp.comprobar(not has_column_privilege('authenticated','public.marca_tienda','tienda_id','UPDATE') and has_column_privilege('authenticated','public.marca_tienda','palabras','UPDATE'),'permisos por columna de la marca');

-- 1. La dueña de A escribe y lee lo suyo.
select set_config('request.jwt.claim.sub','ca000000-0000-4000-8000-000000000002',true);
set local role authenticated;
insert into public.marca_tienda(tienda_id,palabras,evita) values ('cb000000-0000-4000-8000-000000000001',array['elegante','cálida','femenina'],'Nada de fondo blanco');
select pg_temp.comprobar((select palabras=array['elegante','cálida','femenina'] from public.marca_tienda where tienda_id='cb000000-0000-4000-8000-000000000001'),'lee su marca');
update public.marca_tienda set palabras=array['elegante','cálida'], evita=null where tienda_id='cb000000-0000-4000-8000-000000000001';
select pg_temp.comprobar((select palabras=array['elegante','cálida'] and evita is null from public.marca_tienda where tienda_id='cb000000-0000-4000-8000-000000000001'),'cambia su marca');
-- Las reglas de las palabras y de lo que evita las impone la tabla.
select pg_temp.rechaza($q$update public.marca_tienda set palabras=array['a','b','c','d'] where tienda_id='cb000000-0000-4000-8000-000000000001'$q$,'23514','marca_tienda_palabras_check');
select pg_temp.rechaza($q$update public.marca_tienda set palabras=array[repeat('x',25)] where tienda_id='cb000000-0000-4000-8000-000000000001'$q$,'23514','marca_tienda_palabras_check');
select pg_temp.rechaza($q$update public.marca_tienda set palabras=array[''] where tienda_id='cb000000-0000-4000-8000-000000000001'$q$,'23514','marca_tienda_palabras_check');
select pg_temp.rechaza($q$update public.marca_tienda set palabras=array[' sola'] where tienda_id='cb000000-0000-4000-8000-000000000001'$q$,'23514','marca_tienda_palabras_check');
select pg_temp.rechaza($q$update public.marca_tienda set palabras=array['ok',null] where tienda_id='cb000000-0000-4000-8000-000000000001'$q$,'23514','marca_tienda_palabras_check');
select pg_temp.rechaza($q$update public.marca_tienda set evita=repeat('x',161) where tienda_id='cb000000-0000-4000-8000-000000000001'$q$,'23514','marca_tienda_evita_check');
-- No puede escribir en la tienda B, ni mudar su fila a otra tienda.
select pg_temp.rechaza($q$insert into public.marca_tienda(tienda_id,palabras) values ('cb000000-0000-4000-8000-000000000002',array['a'])$q$,'42501','row-level security');
select pg_temp.rechaza($q$update public.marca_tienda set tienda_id='cb000000-0000-4000-8000-000000000002' where tienda_id='cb000000-0000-4000-8000-000000000001'$q$,'42501','permission denied');
select pg_temp.rechaza($q$insert into public.marca_referencias(tienda_id,ruta) values ('cb000000-0000-4000-8000-000000000002','cb000000-0000-4000-8000-000000000002/a.jpg')$q$,'42501','row-level security');
-- La ruta tiene que estar en la carpeta de su propia tienda.
select pg_temp.rechaza($q$insert into public.marca_referencias(tienda_id,ruta) values ('cb000000-0000-4000-8000-000000000001','cb000000-0000-4000-8000-000000000002/a.jpg')$q$,'23514','marca_referencias_ruta_check');
select pg_temp.rechaza($q$insert into public.marca_referencias(tienda_id,ruta) values ('cb000000-0000-4000-8000-000000000001','cb000000-0000-4000-8000-000000000001/../x.jpg')$q$,'23514','marca_referencias_ruta_check');
-- Hasta 6 referencias; la séptima la rechaza la base.
insert into public.marca_referencias(tienda_id,ruta,orden) select 'cb000000-0000-4000-8000-000000000001','cb000000-0000-4000-8000-000000000001/r'||g||'.jpg',g from generate_series(1,6) g;
select pg_temp.comprobar((select count(*) from public.marca_referencias where tienda_id='cb000000-0000-4000-8000-000000000001')=6,'seis referencias');
select pg_temp.rechaza($q$insert into public.marca_referencias(tienda_id,ruta,orden) values ('cb000000-0000-4000-8000-000000000001','cb000000-0000-4000-8000-000000000001/r7.jpg',7)$q$,'23514','marca_referencias_limite');
select pg_temp.rechaza($q$insert into public.marca_referencias(tienda_id,ruta,orden) values ('cb000000-0000-4000-8000-000000000001','cb000000-0000-4000-8000-000000000001/r1.jpg',9)$q$,'23514','marca_referencias_limite');
-- Quita una y ya cabe otra; puede reordenar.
delete from public.marca_referencias where tienda_id='cb000000-0000-4000-8000-000000000001' and ruta='cb000000-0000-4000-8000-000000000001/r6.jpg';
insert into public.marca_referencias(tienda_id,ruta,orden) values ('cb000000-0000-4000-8000-000000000001','cb000000-0000-4000-8000-000000000001/r7.jpg',7);
update public.marca_referencias set orden=0 where ruta='cb000000-0000-4000-8000-000000000001/r7.jpg';
select pg_temp.comprobar((select orden=0 from public.marca_referencias where ruta='cb000000-0000-4000-8000-000000000001/r7.jpg'),'reordena');
select pg_temp.rechaza($q$update public.marca_referencias set tienda_id='cb000000-0000-4000-8000-000000000002',ruta='cb000000-0000-4000-8000-000000000002/r7.jpg' where ruta='cb000000-0000-4000-8000-000000000001/r7.jpg'$q$,'42501','permission denied');
reset role;

-- 2. La dueña de B no ve ni toca lo de A (aislamiento entre tiendas).
select set_config('request.jwt.claim.sub','ca000000-0000-4000-8000-000000000003',true);
set local role authenticated;
select pg_temp.comprobar((select count(*) from public.marca_tienda)=0 and (select count(*) from public.marca_referencias)=0,'otra tienda ve la marca de A');
update public.marca_tienda set palabras=array['robada'];
delete from public.marca_referencias;
delete from public.marca_tienda;
reset role;
select pg_temp.comprobar((select palabras=array['elegante','cálida'] from public.marca_tienda where tienda_id='cb000000-0000-4000-8000-000000000001') and (select count(*) from public.marca_referencias where tienda_id='cb000000-0000-4000-8000-000000000001')=6,'otra tienda cambió o borró lo de A');

-- 3. El admin lee todo y no escribe nada.
select set_config('request.jwt.claim.sub','ca000000-0000-4000-8000-000000000001',true);
set local role authenticated;
select pg_temp.comprobar((select count(*) from public.marca_tienda)=1 and (select count(*) from public.marca_referencias)=6,'el admin lee todo');
select pg_temp.rechaza($q$insert into public.marca_tienda(tienda_id,palabras) values ('cb000000-0000-4000-8000-000000000002',array['a'])$q$,'42501','row-level security');
-- (En A, con 6, el tope salta antes que RLS —un BEFORE va primero—; en B, vacía, la que rechaza es la política.)
select pg_temp.rechaza($q$insert into public.marca_referencias(tienda_id,ruta) values ('cb000000-0000-4000-8000-000000000002','cb000000-0000-4000-8000-000000000002/admin.jpg')$q$,'42501','row-level security');
select pg_temp.rechaza($q$insert into public.marca_referencias(tienda_id,ruta) values ('cb000000-0000-4000-8000-000000000001','cb000000-0000-4000-8000-000000000001/admin.jpg')$q$,'23514','marca_referencias_limite');
update public.marca_tienda set palabras=array['admin'];
update public.marca_referencias set orden=99;
delete from public.marca_referencias;
delete from public.marca_tienda;
reset role;
select pg_temp.comprobar((select palabras=array['elegante','cálida'] from public.marca_tienda) and (select count(*) from public.marca_referencias where orden=99)=0 and (select count(*) from public.marca_referencias)=6,'el admin escribió');

-- 4. Ver como: el admin que mira una tienda la lee (como todo admin) y NO escribe nada, ni siquiera con la sesión abierta.
insert into public.sesiones_ver_como(admin_id,tienda_id,vence_en) values ('ca000000-0000-4000-8000-000000000004','cb000000-0000-4000-8000-000000000001',now()+interval '10 minutes');
select set_config('request.jwt.claim.sub','ca000000-0000-4000-8000-000000000004',true);
set local role authenticated;
select pg_temp.comprobar((select count(*) from public.marca_referencias where tienda_id='cb000000-0000-4000-8000-000000000001')=6,'Ver como lee la marca');
update public.marca_tienda set palabras=array['vercomo'] where tienda_id='cb000000-0000-4000-8000-000000000001';
delete from public.marca_referencias where tienda_id='cb000000-0000-4000-8000-000000000001';
reset role;
select pg_temp.comprobar((select palabras=array['elegante','cálida'] from public.marca_tienda) and (select count(*) from public.marca_referencias)=6,'Ver como escribió');

-- 5. anon: nada.
set local role anon;
select pg_temp.rechaza($q$select count(*) from public.marca_tienda$q$,'42501','permission denied');
select pg_temp.rechaza($q$select count(*) from public.marca_referencias$q$,'42501','permission denied');
select pg_temp.rechaza($q$insert into public.marca_tienda(tienda_id,palabras) values ('cb000000-0000-4000-8000-000000000001',array['a'])$q$,'42501','permission denied');
reset role;

-- 6. Bucket: la dueña sube y lee en su carpeta; no en la ajena; el admin y Ver como solo leen; anon nada.
select set_config('request.jwt.claim.sub','ca000000-0000-4000-8000-000000000002',true);
set local role authenticated;
insert into storage.objects(bucket_id,name) values ('marca-referencias','cb000000-0000-4000-8000-000000000001/r1.jpg');
select pg_temp.rechaza($q$insert into storage.objects(bucket_id,name) values ('marca-referencias','cb000000-0000-4000-8000-000000000002/r1.jpg')$q$,'42501','row-level security');
select pg_temp.rechaza($q$insert into storage.objects(bucket_id,name) values ('marca-referencias','suelto.jpg')$q$,'42501','row-level security');
select pg_temp.comprobar((select count(*) from storage.objects where bucket_id='marca-referencias')=1,'lee su archivo');
reset role;
insert into storage.objects(bucket_id,name) values ('marca-referencias','cb000000-0000-4000-8000-000000000002/ajena.jpg');
select set_config('request.jwt.claim.sub','ca000000-0000-4000-8000-000000000002',true);
set local role authenticated;
select pg_temp.comprobar((select count(*) from storage.objects where bucket_id='marca-referencias')=1,'ve archivos de otra tienda');
delete from storage.objects where bucket_id='marca-referencias' and name like 'cb000000-0000-4000-8000-000000000002/%';
reset role;
select pg_temp.comprobar((select count(*) from storage.objects where name='cb000000-0000-4000-8000-000000000002/ajena.jpg')=1,'borró un archivo de otra tienda');
select set_config('request.jwt.claim.sub','ca000000-0000-4000-8000-000000000001',true);
set local role authenticated;
select pg_temp.comprobar((select count(*) from storage.objects where bucket_id='marca-referencias')=2,'el admin lee todos los archivos');
select pg_temp.rechaza($q$insert into storage.objects(bucket_id,name) values ('marca-referencias','cb000000-0000-4000-8000-000000000001/admin.jpg')$q$,'42501','row-level security');
delete from storage.objects where bucket_id='marca-referencias';
update storage.objects set name=name||'x' where bucket_id='marca-referencias';
reset role;
select pg_temp.comprobar((select count(*) from storage.objects where bucket_id='marca-referencias' and name not like '%x')=2,'el admin cambió archivos');
select set_config('request.jwt.claim.sub','ca000000-0000-4000-8000-000000000004',true);
set local role authenticated;
select pg_temp.comprobar((select count(*) from storage.objects where bucket_id='marca-referencias' and name like 'cb000000-0000-4000-8000-000000000001/%')=1,'Ver como lee el archivo de la tienda que mira');
select pg_temp.rechaza($q$insert into storage.objects(bucket_id,name) values ('marca-referencias','cb000000-0000-4000-8000-000000000001/vercomo.jpg')$q$,'42501','row-level security');
delete from storage.objects where bucket_id='marca-referencias';
reset role;
select pg_temp.comprobar((select count(*) from storage.objects where bucket_id='marca-referencias')=2,'Ver como borró archivos');
-- anon: ninguna de las políticas del bucket le aplica (en Supabase real anon tiene SELECT base y RLS le deja cero filas).
select pg_temp.comprobar((select count(*) from pg_policies where schemaname='storage' and tablename='objects' and policyname like 'marca_ref_%')=4,'cuatro políticas del bucket');
select pg_temp.comprobar((select bool_and(roles=array['authenticated']::name[]) from pg_policies where schemaname='storage' and tablename='objects' and policyname like 'marca_ref_%'),'una política del bucket alcanza a anon');

-- 7. Borrar la tienda se lleva su marca (cascada).
delete from public.tiendas where id='cb000000-0000-4000-8000-000000000001';
select pg_temp.comprobar((select count(*) from public.marca_tienda)=0 and (select count(*) from public.marca_referencias)=0,'la cascada no limpió');
rollback;
select 'Pasó: Mi marca (RLS por tienda, admin y Ver como solo leen, anon nada, tope de 6, reglas de palabras, bucket privado).' as resultado;
