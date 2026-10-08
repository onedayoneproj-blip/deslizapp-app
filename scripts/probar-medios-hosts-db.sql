-- Fotos y videos solo de direcciones propias (migración *_medios_solo_hosts_propios). Replay desechable; NO ejecutar en producción.
-- D = dueña de la tienda 1; la tienda 2 es otra tienda (su carpeta no vale para la 1).
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
 ('c1000000-0000-4000-8000-00000000000d','duena-medios@prueba.invalid','{"provider":"google"}',now()),
 ('c1000000-0000-4000-8000-00000000000b','admin-medios@prueba.invalid','{"provider":"google"}',now());
insert into public.admins(usuario_id,email) values ('c1000000-0000-4000-8000-00000000000b','admin-medios@prueba.invalid');
insert into public.tiendas(id,nombre,slug,estado,catalogo_estado,creditos_retoque) values
 ('c2000000-0000-4000-8000-000000000001','Medios fixture','medios-fixture','activa','publicado',0),
 ('c2000000-0000-4000-8000-000000000002','Medios otra fixture','medios-otra-fixture','activa','publicado',0);
insert into public.miembros(usuario_id,tienda_id,rol,nivel) values
 ('c1000000-0000-4000-8000-00000000000d','c2000000-0000-4000-8000-000000000001','dueno','ayudante');
insert into public.movimientos_creditos(tienda_id,cantidad,tipo,motivo) values ('c2000000-0000-4000-8000-000000000001',10,'ajuste','fixture');
insert into public.productos(id,tienda_id,nombre,precio,stock,opciones,medios) values
 ('c3000000-0000-4000-8000-000000000001','c2000000-0000-4000-8000-000000000001','Con fotos',1000,3,'[{"nombre":"Color","valores":["Negro"]}]',
  '[{"tipo":"foto","url":"https://euihaeyfdlpvmbtfzvnt.supabase.co/storage/v1/object/public/productos/c2000000-0000-4000-8000-000000000001/a.webp","retocada":false},{"tipo":"foto","url":"https://deslizapp-app.vercel.app/catalogos/esencias-michel/fotos/she.webp","retocada":false},{"tipo":"video","url":"https://euihaeyfdlpvmbtfzvnt.supabase.co/storage/v1/object/public/productos/c2000000-0000-4000-8000-000000000001/v.mp4","portada":"https://euihaeyfdlpvmbtfzvnt.supabase.co/storage/v1/object/public/productos/c2000000-0000-4000-8000-000000000001/p.webp","duracion_s":5}]');

-- ═══ 0. Estructura ═══
select pg_temp.comprobar((select count(*) from pg_constraint where conname in ('productos_medios_hosts_propios','tiendas_logo_url_propia','tiendas_foto_perfil_url_propia'))=3,'las tres restricciones existen');
select pg_temp.comprobar((select count(*) from pg_constraint where conname='productos_medios_validos')=1,'la restricción de forma sigue');
select pg_temp.comprobar(not has_function_privilege('anon','public.medio_url_valida(text,uuid)','EXECUTE'),'anon no ejecuta medio_url_valida');

-- ═══ 1. La regla ═══
do $$ declare t uuid := 'c2000000-0000-4000-8000-000000000001'; ok text; malo text; begin
  foreach ok in array array[
    'https://euihaeyfdlpvmbtfzvnt.supabase.co/storage/v1/object/public/productos/'||t||'/a.webp',
    'https://euihaeyfdlpvmbtfzvnt.supabase.co/storage/v1/object/public/productos/'||t||'/logo/l.webp',
    'https://euihaeyfdlpvmbtfzvnt.supabase.co/storage/v1/object/public/retoques/'||t||'/trabajo-1.jpg',
    'https://deslizapp-app.vercel.app/catalogos/esencias-michel/fotos/she.webp',
    'https://deslizapp-app.vercel.app/ensayo/producto-uno.svg'] loop
    perform pg_temp.comprobar(public.medio_url_valida(ok, t), 'debía valer: '||ok);
  end loop;
  foreach malo in array array[
    'https://ejemplo.invalid/a.webp',
    'http://euihaeyfdlpvmbtfzvnt.supabase.co/storage/v1/object/public/productos/'||t||'/a.webp',
    'https://otro.supabase.co/storage/v1/object/public/productos/'||t||'/a.webp',
    'https://euihaeyfdlpvmbtfzvnt.supabase.co.malo.example/storage/v1/object/public/productos/'||t||'/a.webp',
    'https://euihaeyfdlpvmbtfzvnt.supabase.co/storage/v1/object/public/productos/c2000000-0000-4000-8000-000000000002/a.webp',
    'https://euihaeyfdlpvmbtfzvnt.supabase.co/storage/v1/object/public/retoques/c2000000-0000-4000-8000-000000000002/a.webp',
    'https://euihaeyfdlpvmbtfzvnt.supabase.co/storage/v1/object/public/comprobantes/'||t||'/a.webp',
    'https://euihaeyfdlpvmbtfzvnt.supabase.co/storage/v1/object/public/marca-referencias/'||t||'/a.webp',
    'https://euihaeyfdlpvmbtfzvnt.supabase.co/storage/v1/object/public/productos/'||t||'/../c2000000-0000-4000-8000-000000000002/a.webp',
    'https://euihaeyfdlpvmbtfzvnt.supabase.co/storage/v1/object/public/productos/'||t||'/a.webp?x=1',
    'https://euihaeyfdlpvmbtfzvnt.supabase.co/storage/v1/object/public/productos/'||t||'/a%2e.webp',
    'https://euihaeyfdlpvmbtfzvnt.supabase.co/storage/v1/object/public/productos/'||t||'/a b.webp',
    'https://deslizapp-app.vercel.app/tienda/esencias-michel',
    'https://deslizapp-app.vercel.app.malo.example/ensayo/a.svg',
    'https://deslizapp-app.vercel.app/ensayo/../api/x',
    'https://deslizapp-app.vercel.app/ensayo/'||repeat('a', 2048),
    ''] loop
    perform pg_temp.comprobar(not public.medio_url_valida(malo, t), 'debía rechazarse: '||left(malo, 120));
  end loop;
  perform pg_temp.comprobar(not public.medio_url_valida(null, t) and not public.medio_url_valida('https://deslizapp-app.vercel.app/ensayo/a.svg', null),'nulos no valen');
end $$;

-- ═══ 2. La restricción (cualquier camino que escriba la fila) ═══
select pg_temp.rechaza($q$update public.productos set medios='[{"tipo":"foto","url":"https://ejemplo.invalid/a.webp","retocada":false}]' where id='c3000000-0000-4000-8000-000000000001'$q$,'23514','productos_medios_hosts_propios');
select pg_temp.rechaza($q$update public.productos set medios='[{"tipo":"foto","url":"https://euihaeyfdlpvmbtfzvnt.supabase.co/storage/v1/object/public/productos/c2000000-0000-4000-8000-000000000002/a.webp","retocada":false}]' where id='c3000000-0000-4000-8000-000000000001'$q$,'23514','productos_medios_hosts_propios');
select pg_temp.rechaza($q$update public.productos set medios='[{"tipo":"video","url":"https://deslizapp-app.vercel.app/ensayo/v.mp4","portada":"https://ejemplo.invalid/p.webp","duracion_s":5}]' where id='c3000000-0000-4000-8000-000000000001'$q$,'23514','productos_medios_hosts_propios');
-- El arreglo viejo `fotos` rehace `medios` (trigger) y la restricción lo alcanza.
select pg_temp.rechaza($q$update public.productos set fotos=array['https://ejemplo.invalid/a.webp'] where id='c3000000-0000-4000-8000-000000000001'$q$,'23514','productos_medios_hosts_propios');
select pg_temp.rechaza($q$insert into public.productos(tienda_id,nombre,precio,medios) values('c2000000-0000-4000-8000-000000000001','Ajeno',1,'[{"tipo":"foto","url":"https://ejemplo.invalid/a.webp","retocada":false}]')$q$,'23514','productos_medios_hosts_propios');
-- Un producto sin fotos y uno con direcciones propias siguen entrando.
insert into public.productos(tienda_id,nombre,precio) values('c2000000-0000-4000-8000-000000000001','Sin fotos',1);
select pg_temp.comprobar((select count(*) from public.productos where tienda_id='c2000000-0000-4000-8000-000000000001')=2,'sin fotos entra');

-- Logo y foto de perfil de la tienda
select pg_temp.rechaza($q$update public.tiendas set logo_url='https://ejemplo.invalid/l.png' where id='c2000000-0000-4000-8000-000000000001'$q$,'23514','tiendas_logo_url_propia');
select pg_temp.rechaza($q$update public.tiendas set logo_url='https://euihaeyfdlpvmbtfzvnt.supabase.co/storage/v1/object/public/productos/c2000000-0000-4000-8000-000000000002/logo/l.webp' where id='c2000000-0000-4000-8000-000000000001'$q$,'23514','tiendas_logo_url_propia');
select pg_temp.rechaza($q$update public.tiendas set foto_perfil_url='https://lh3.googleusercontent.com/a/x' where id='c2000000-0000-4000-8000-000000000001'$q$,'23514','tiendas_foto_perfil_url_propia');
update public.tiendas set logo_url='https://euihaeyfdlpvmbtfzvnt.supabase.co/storage/v1/object/public/productos/c2000000-0000-4000-8000-000000000001/logo/l.webp', foto_perfil_url=null where id='c2000000-0000-4000-8000-000000000001';

-- ═══ 3. Las funciones de guardado, como la dueña ═══
set local role authenticated;
select pg_temp.como('c1000000-0000-4000-8000-00000000000d');
select pg_temp.rechaza($q$select public.crear_producto('c2000000-0000-4000-8000-000000000001','{"nombre":"Nuevo","precio":5,"medios":[{"tipo":"foto","url":"https://ejemplo.invalid/n.webp","retocada":false}]}'::jsonb)$q$,'23514','productos_medios_hosts_propios');
select pg_temp.rechaza($q$select public.crear_producto('c2000000-0000-4000-8000-000000000001','{"nombre":"Nuevo","precio":5,"medios":[{"tipo":"foto","url":"https://euihaeyfdlpvmbtfzvnt.supabase.co/storage/v1/object/public/productos/c2000000-0000-4000-8000-000000000002/n.webp","retocada":false}]}'::jsonb)$q$,'23514','productos_medios_hosts_propios');
select pg_temp.comprobar((select (public.crear_producto('c2000000-0000-4000-8000-000000000001','{"nombre":"Nuevo","precio":5,"medios":[{"tipo":"foto","url":"https://euihaeyfdlpvmbtfzvnt.supabase.co/storage/v1/object/public/productos/c2000000-0000-4000-8000-000000000001/n.webp","retocada":false}]}'::jsonb)).nombre)='Nuevo','crear_producto con foto propia');
select pg_temp.rechaza($q$select public.guardar_producto_inventario('c2000000-0000-4000-8000-000000000001','c3000000-0000-4000-8000-000000000001','{"medios":[{"tipo":"foto","url":"https://ejemplo.invalid/n.webp","retocada":false}]}'::jsonb,null,null,null,null,null,false)$q$,'23514','productos_medios_hosts_propios');
-- Ordenar y quitar fotos sigue funcionando.
select pg_temp.comprobar((select jsonb_array_length((public.guardar_producto_inventario('c2000000-0000-4000-8000-000000000001','c3000000-0000-4000-8000-000000000001',
  '{"medios":[{"tipo":"foto","url":"https://deslizapp-app.vercel.app/catalogos/esencias-michel/fotos/she.webp","retocada":false},{"tipo":"foto","url":"https://euihaeyfdlpvmbtfzvnt.supabase.co/storage/v1/object/public/productos/c2000000-0000-4000-8000-000000000001/a.webp","retocada":false}]}'::jsonb,
  null,null,null,null,null,false)).medios))=2,'reordenar y quitar el video');
-- Foto de un color
select pg_temp.rechaza($q$select public.guardar_foto_valor('c2000000-0000-4000-8000-000000000001','c3000000-0000-4000-8000-000000000001','Color','Negro','https://ejemplo.invalid/a.webp')$q$,'22023','foto_valor_invalida');
select pg_temp.comprobar(public.guardar_foto_valor('c2000000-0000-4000-8000-000000000001','c3000000-0000-4000-8000-000000000001','Color','Negro',
  'https://euihaeyfdlpvmbtfzvnt.supabase.co/storage/v1/object/public/productos/c2000000-0000-4000-8000-000000000001/a.webp') ? 'Color','foto del color propia');
-- Retoque: pedirlo
select set_config('medios_test.trabajo',(public.pedir_retoque('c3000000-0000-4000-8000-000000000001',
  'https://euihaeyfdlpvmbtfzvnt.supabase.co/storage/v1/object/public/productos/c2000000-0000-4000-8000-000000000001/a.webp')->>'id'),true);
reset role;

-- ═══ 4. Entrega de un retoque (admin) ═══
set local role authenticated;
select pg_temp.como('c1000000-0000-4000-8000-00000000000b');
select pg_temp.rechaza(format('select public.admin_retoque_entregar(%L,%L)',current_setting('medios_test.trabajo'),'https://ejemplo.invalid/r.webp'),'22023','enlace_invalido');
select pg_temp.rechaza(format('select public.admin_retoque_entregar(%L,%L)',current_setting('medios_test.trabajo'),
  'https://euihaeyfdlpvmbtfzvnt.supabase.co/storage/v1/object/public/retoques/c2000000-0000-4000-8000-000000000002/r.webp'),'22023','enlace_invalido');
select public.admin_retoque_entregar(current_setting('medios_test.trabajo')::uuid,
  'https://euihaeyfdlpvmbtfzvnt.supabase.co/storage/v1/object/public/retoques/c2000000-0000-4000-8000-000000000001/r.webp');
reset role;
select pg_temp.comprobar((select medios->1->>'url' from public.productos where id='c3000000-0000-4000-8000-000000000001') like '%/retoques/c2000000-0000-4000-8000-000000000001/r.webp','la retocada entra en medios');
-- (La foto del color NO sigue a la retocada en este camino: fallo previo anotado en HANDOFF, fuera de este PR.)
select 'Pasó: medios solo de direcciones propias (regla, restricción, guardado, color, retoque, logo).';
rollback;
