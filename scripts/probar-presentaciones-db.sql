-- Presentaciones, parte 1: la foto por color (migración *_presentaciones_fotos_por_valor). Replay desechable; NO ejecutar en producción.
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
insert into public.tiendas(id,nombre,slug,estado,catalogo_estado) values
 ('ae000000-0000-4000-8000-000000000001','Presentaciones fixture','presentaciones-fixture','activa','publicado'),
 ('ae000000-0000-4000-8000-000000000002','Presentaciones V fixture','presentaciones-v-fixture','activa','publicado');
insert into public.miembros(usuario_id,tienda_id,rol,nivel) values
 ('ad000000-0000-4000-8000-00000000000d','ae000000-0000-4000-8000-000000000001','dueno','ayudante'),
 ('ad000000-0000-4000-8000-00000000000a','ae000000-0000-4000-8000-000000000001','staff','ayudante'),
 ('ad000000-0000-4000-8000-00000000000e','ae000000-0000-4000-8000-000000000001','staff','editor'),
 ('ad000000-0000-4000-8000-00000000000c','ae000000-0000-4000-8000-000000000001','staff','administrador'),
 ('ad000000-0000-4000-8000-00000000000b','ae000000-0000-4000-8000-000000000002','dueno','ayudante');
insert into public.productos(id,tienda_id,nombre,precio,stock,opciones,medios) values
 ('af000000-0000-4000-8000-000000000001','ae000000-0000-4000-8000-000000000001','Camisa',1850,0,
  '[{"nombre":"Talla","valores":["S","M"]},{"nombre":"Color","valores":["Negro","Arena"]}]',
  '[{"tipo":"foto","url":"https://deslizapp-app.vercel.app/ensayo/1.webp","retocada":false},{"tipo":"foto","url":"https://deslizapp-app.vercel.app/ensayo/2.webp","retocada":false},{"tipo":"video","url":"https://deslizapp-app.vercel.app/ensayo/v.mp4","portada":null,"duracion_s":5}]'),
 ('af000000-0000-4000-8000-000000000002','ae000000-0000-4000-8000-000000000002','Camisa V',1850,0,
  '[{"nombre":"Color","valores":["Negro"]}]','[{"tipo":"foto","url":"https://deslizapp-app.vercel.app/ensayo/v1.webp","retocada":false}]');

-- ═══ 0. Estructura ═══
select pg_temp.comprobar((select count(*) from information_schema.columns where table_name='productos' and column_name='fotos_por_valor' and is_nullable='NO')=1,'columna fotos_por_valor not null');
select pg_temp.comprobar((select fotos_por_valor from public.productos where id='af000000-0000-4000-8000-000000000001')='{}'::jsonb,'un producto existente parte en {}');
select pg_temp.comprobar(not has_function_privilege('anon','public.guardar_foto_valor(uuid,uuid,text,text,text)','EXECUTE')
  and has_function_privilege('authenticated','public.guardar_foto_valor(uuid,uuid,text,text,text)','EXECUTE'),'guardar_foto_valor: anon no, authenticated sí');
select pg_temp.comprobar(not has_column_privilege('authenticated','public.productos','fotos_por_valor','UPDATE'),'nadie escribe la columna directo');
select pg_temp.comprobar(not has_function_privilege('authenticated','public.productos_limpiar_fotos_por_valor()','EXECUTE'),'el trigger no se llama a mano');
select pg_temp.comprobar((select pg_get_functiondef('public.catalogo_publico(text)'::regprocedure) like '%''fotos_por_valor'', p.fotos_por_valor%'),'catalogo_publico la devuelve');

-- ═══ 1. Permisos por nivel ═══
set local role authenticated;
select pg_temp.como('ad000000-0000-4000-8000-00000000000a');
select pg_temp.rechaza($q$select public.guardar_foto_valor('ae000000-0000-4000-8000-000000000001','af000000-0000-4000-8000-000000000001','Color','Negro','https://deslizapp-app.vercel.app/ensayo/1.webp')$q$,'42501','sin_permiso');
select pg_temp.como('ad000000-0000-4000-8000-00000000000f');
select pg_temp.rechaza($q$select public.guardar_foto_valor('ae000000-0000-4000-8000-000000000001','af000000-0000-4000-8000-000000000001','Color','Negro','https://deslizapp-app.vercel.app/ensayo/1.webp')$q$,'42501','variantes_sin_permiso');
select pg_temp.rechaza($q$update public.productos set fotos_por_valor='{"Color":{"Negro":"https://deslizapp-app.vercel.app/ensayo/1.webp"}}' where id='af000000-0000-4000-8000-000000000001'$q$,'42501','');
reset role;
select pg_temp.comprobar((select fotos_por_valor from public.productos where id='af000000-0000-4000-8000-000000000001')='{}'::jsonb,'Ayudante y extraño no cambiaron nada');

set local role authenticated;
select pg_temp.como('ad000000-0000-4000-8000-00000000000e');
select pg_temp.comprobar(public.guardar_foto_valor('ae000000-0000-4000-8000-000000000001','af000000-0000-4000-8000-000000000001','Color','Negro','https://deslizapp-app.vercel.app/ensayo/1.webp')=
  '{"Color":{"Negro":"https://deslizapp-app.vercel.app/ensayo/1.webp"}}'::jsonb,'el Editor guarda la foto de Negro');
select pg_temp.como('ad000000-0000-4000-8000-00000000000c');
select public.guardar_foto_valor('ae000000-0000-4000-8000-000000000001','af000000-0000-4000-8000-000000000001','Color','Arena','https://deslizapp-app.vercel.app/ensayo/2.webp');
select pg_temp.como('ad000000-0000-4000-8000-00000000000d');
select pg_temp.comprobar((select fotos_por_valor from public.productos where id='af000000-0000-4000-8000-000000000001')=
  '{"Color":{"Negro":"https://deslizapp-app.vercel.app/ensayo/1.webp","Arena":"https://deslizapp-app.vercel.app/ensayo/2.webp"}}'::jsonb,'la dueña lo lee (y Arena quedó)');

-- ═══ 2. Validación: eje, valor y url tienen que existir ═══
select pg_temp.rechaza($q$select public.guardar_foto_valor('ae000000-0000-4000-8000-000000000001','af000000-0000-4000-8000-000000000001','Color','Rojo','https://deslizapp-app.vercel.app/ensayo/1.webp')$q$,'22023','foto_valor_invalida');
select pg_temp.rechaza($q$select public.guardar_foto_valor('ae000000-0000-4000-8000-000000000001','af000000-0000-4000-8000-000000000001','Tono','Negro','https://deslizapp-app.vercel.app/ensayo/1.webp')$q$,'22023','foto_valor_invalida');
select pg_temp.rechaza($q$select public.guardar_foto_valor('ae000000-0000-4000-8000-000000000001','af000000-0000-4000-8000-000000000001','Color','Negro','https://deslizapp-app.vercel.app/ensayo/otra.webp')$q$,'22023','foto_valor_invalida');
select pg_temp.rechaza($q$select public.guardar_foto_valor('ae000000-0000-4000-8000-000000000001','af000000-0000-4000-8000-000000000001','Color','Negro','https://deslizapp-app.vercel.app/ensayo/v.mp4')$q$,'22023','foto_valor_invalida');
select pg_temp.rechaza($q$select public.guardar_foto_valor('ae000000-0000-4000-8000-000000000001','af000000-0000-4000-8000-000000000009','Color','Negro','https://deslizapp-app.vercel.app/ensayo/1.webp')$q$,'P0002','ajuste_producto_no_encontrado');
-- Un producto de otra tienda no se toca con la tienda propia.
select pg_temp.rechaza($q$select public.guardar_foto_valor('ae000000-0000-4000-8000-000000000001','af000000-0000-4000-8000-000000000002','Color','Negro','https://deslizapp-app.vercel.app/ensayo/v1.webp')$q$,'P0002','');
reset role;

-- ═══ 3. Limpieza: al quitar la foto de medios, al quitar el valor o el eje de opciones ═══
update public.productos set medios='[{"tipo":"foto","url":"https://deslizapp-app.vercel.app/ensayo/1.webp","retocada":false}]' where id='af000000-0000-4000-8000-000000000001';
select pg_temp.comprobar((select fotos_por_valor from public.productos where id='af000000-0000-4000-8000-000000000001')=
  '{"Color":{"Negro":"https://deslizapp-app.vercel.app/ensayo/1.webp"}}'::jsonb,'sin la foto 2 en medios, Arena sale del mapa');
update public.productos set opciones='[{"nombre":"Talla","valores":["S","M"]},{"nombre":"Color","valores":["Arena"]}]' where id='af000000-0000-4000-8000-000000000001';
select pg_temp.comprobar((select fotos_por_valor from public.productos where id='af000000-0000-4000-8000-000000000001')='{}'::jsonb,'sin el valor Negro en opciones, sale del mapa y el eje vacío también');
-- Camino real: guardar_variantes cambia las opciones y el mapa se limpia solo.
update public.productos set opciones='[{"nombre":"Color","valores":["Negro","Arena"]}]', fotos_por_valor='{}' where id='af000000-0000-4000-8000-000000000001';
set local role authenticated;
select pg_temp.como('ad000000-0000-4000-8000-00000000000e');
select public.guardar_foto_valor('ae000000-0000-4000-8000-000000000001','af000000-0000-4000-8000-000000000001','Color','Negro','https://deslizapp-app.vercel.app/ensayo/1.webp');
select count(*) from public.guardar_variantes('ae000000-0000-4000-8000-000000000001','af000000-0000-4000-8000-000000000001','[{"nombre":"Talla","valores":["S"]}]','[{"valores":{"Talla":"S"},"stock":2,"precio":null}]');
reset role;
select pg_temp.comprobar((select fotos_por_valor from public.productos where id='af000000-0000-4000-8000-000000000001')='{}'::jsonb,'guardar_variantes sin el eje Color limpia el mapa');
-- Quitar con url nula.
update public.productos set opciones='[{"nombre":"Color","valores":["Negro","Arena"]}]' where id='af000000-0000-4000-8000-000000000001';
set local role authenticated;
select pg_temp.como('ad000000-0000-4000-8000-00000000000e');
select public.guardar_foto_valor('ae000000-0000-4000-8000-000000000001','af000000-0000-4000-8000-000000000001','Color','Negro','https://deslizapp-app.vercel.app/ensayo/1.webp');
select pg_temp.comprobar(public.guardar_foto_valor('ae000000-0000-4000-8000-000000000001','af000000-0000-4000-8000-000000000001','Color','Negro',null)='{}'::jsonb,'url nula la quita y el eje vacío desaparece');
reset role;
-- Una escritura directa con basura (insert: la tabla permite insertar) se limpia.
insert into public.productos(id,tienda_id,nombre,precio,stock,fotos_por_valor) values
 ('af000000-0000-4000-8000-000000000003','ae000000-0000-4000-8000-000000000001','Basura',1,1,'{"Color":{"Rojo":"https://x.invalid/a"}}');
select pg_temp.comprobar((select fotos_por_valor from public.productos where id='af000000-0000-4000-8000-000000000003')='{}'::jsonb,'una entrada inválida al insertar se limpia');
-- La foto retocada: la entrada sigue a la foto nueva.
update public.productos set opciones='[{"nombre":"Color","valores":["Negro"]}]', medios='[{"tipo":"foto","url":"https://deslizapp-app.vercel.app/ensayo/1.webp","retocada":false}]', fotos_por_valor='{"Color":{"Negro":"https://deslizapp-app.vercel.app/ensayo/1.webp"}}' where id='af000000-0000-4000-8000-000000000001';
select pg_temp.comprobar((select fotos_por_valor from public.productos where id='af000000-0000-4000-8000-000000000001')<>'{}'::jsonb,'preparada la foto de Negro');
insert into public.trabajos_retoque(id,tienda_id,producto_id,medio_url_original,medio_url_retocado,estado,creditos,atendido_en)
 values ('b0000000-0000-4000-8000-000000000001','ae000000-0000-4000-8000-000000000001','af000000-0000-4000-8000-000000000001','https://deslizapp-app.vercel.app/ensayo/1.webp','https://deslizapp-app.vercel.app/ensayo/1-retocada.webp','entregado',1,now());
update public.productos set medios='[{"tipo":"foto","url":"https://deslizapp-app.vercel.app/ensayo/1-retocada.webp","retocada":true}]' where id='af000000-0000-4000-8000-000000000001';
select pg_temp.comprobar((select fotos_por_valor from public.productos where id='af000000-0000-4000-8000-000000000001')='{"Color":{"Negro":"https://deslizapp-app.vercel.app/ensayo/1-retocada.webp"}}'::jsonb,'tras el retoque la foto del color es la retocada');

-- ═══ 4. Lectura pública ═══
select pg_temp.comprobar((select (p->'fotos_por_valor') from jsonb_array_elements(public.catalogo_publico('presentaciones-fixture')->'productos') p where p->>'nombre'='Camisa')
  ='{"Color":{"Negro":"https://deslizapp-app.vercel.app/ensayo/1-retocada.webp"}}'::jsonb,'catalogo_publico devuelve el mapa');
select pg_temp.comprobar((select count(*) from jsonb_array_elements(public.catalogo_publico('presentaciones-fixture')->'productos') p where p ? 'variantes' and p ? 'opciones')>=1,'catalogo_publico sigue igual en lo demás');

-- ═══ 5. Ver como: no escribe ═══
set local role authenticated;
select pg_temp.como('ad000000-0000-4000-8000-00000000000b');
select pg_temp.comprobar((select (public.admin_ver_como_iniciar('ae000000-0000-4000-8000-000000000002')->>'id') is not null),'abre Ver como sobre su propia tienda');
select pg_temp.rechaza($q$select public.guardar_foto_valor('ae000000-0000-4000-8000-000000000002','af000000-0000-4000-8000-000000000002','Color','Negro','https://deslizapp-app.vercel.app/ensayo/v1.webp')$q$,'42501','solo_mirar');
reset role;
select pg_temp.comprobar((select fotos_por_valor from public.productos where id='af000000-0000-4000-8000-000000000002')='{}'::jsonb,'Ver como no escribió nada');
rollback;
