-- Exclusivamente replay desechable; NO ejecutar en producción.
begin;
do $$ begin if current_database()<>'replay_provisional' then raise exception 'Solo replay_provisional'; end if; end $$;
create function pg_temp.comprobar(ok boolean, mensaje text) returns void language plpgsql as $$ begin if ok is distinct from true then raise exception '%',mensaje; end if; end $$;
create function pg_temp.rechaza(q text, codigo text, mensaje text default null) returns void language plpgsql as $$ begin
  begin execute q; exception when others then
    if sqlstate=codigo and (mensaje is null or sqlerrm=mensaje) then return; end if;
    raise exception 'Error inesperado % / % para %',sqlstate,sqlerrm,q;
  end; raise exception 'Aceptó operación prohibida: %',q;
end $$;
insert into auth.users(id,email,raw_app_meta_data,email_confirmed_at) values
 ('aa000000-0000-4000-8000-000000000001','admin@prueba.invalid','{"provider":"google"}',now()),
 ('aa000000-0000-4000-8000-000000000002','dueno@prueba.invalid','{"provider":"google"}',now()),
 ('aa000000-0000-4000-8000-000000000003','normal@prueba.invalid','{"provider":"google"}',now());
insert into public.admins(usuario_id,email) values
 ('aa000000-0000-4000-8000-000000000001','admin@prueba.invalid'),('aa000000-0000-4000-8000-000000000002','dueno@prueba.invalid');
insert into public.tiendas(id,nombre,slug,estado,creditos_retoque,catalogo_estado,url_catalogo) values
 ('ab000000-0000-4000-8000-000000000001','Admin fixture','admin-fixture','activa',0,'solicitado','https://example.invalid/catalogo');
insert into public.miembros(usuario_id,tienda_id,rol) values ('aa000000-0000-4000-8000-000000000002','ab000000-0000-4000-8000-000000000001','dueno');
insert into public.usuarios(id,tienda_id,email,rol) values ('aa000000-0000-4000-8000-000000000002','ab000000-0000-4000-8000-000000000001','dueno@prueba.invalid','dueno');
insert into public.productos(id,tienda_id,nombre,precio,stock,medios) values
 ('ac000000-0000-4000-8000-000000000001','ab000000-0000-4000-8000-000000000001','Foto',100,2,'[{"tipo":"foto","url":"https://example.invalid/original.jpg"},{"tipo":"foto","url":"https://example.invalid/otra.jpg"}]');
insert into public.movimientos_creditos(tienda_id,cantidad,tipo,motivo) values ('ab000000-0000-4000-8000-000000000001',10,'ajuste','fixture');
-- Verificación estructural completa de admin RPC y RLS, incluida baja lógica.
do $$ declare f record; begin
 for f in select p.oid,p.oid::regprocedure as firma,p.prosecdef,p.proconfig,pg_get_functiondef(p.oid) as cuerpo from pg_proc p where p.pronamespace='public'::regnamespace and p.proname like 'admin\_%' and p.proname<>'admin_viendo' loop
  perform pg_temp.comprobar(f.prosecdef and f.proconfig @> array['search_path=""'], 'definer/search_path '||f.firma);
  perform pg_temp.comprobar(position('if not public.soy_admin() then' in f.cuerpo)>0,'guard '||f.firma);
  perform pg_temp.comprobar(not has_function_privilege('anon',f.oid,'EXECUTE') and has_function_privilege('authenticated',f.oid,'EXECUTE'),'ACL '||f.firma);
 end loop;
 perform pg_temp.comprobar(not exists(select 1 from pg_class where relnamespace='public'::regnamespace and relname in ('admins','planes','precios_extra','pagos','movimientos_creditos','trabajos_retoque','registro_admin','admin_pospuestos','funciones_tienda','sesiones_ver_como') and not relrowsecurity),'RLS');
end $$;
-- Usuario normal y anon: invocar realmente cada admin RPC con argumentos tipados.
select set_config('request.jwt.claim.sub','aa000000-0000-4000-8000-000000000003',true);
set local role authenticated;
do $$ declare f record; q text; begin
 for f in select p.proname,p.proargtypes from pg_proc p where p.pronamespace='public'::regnamespace and p.proname like 'admin\_%' and p.proname<>'admin_viendo' loop
  select 'select public.'||quote_ident(f.proname)||'('||coalesce(string_agg('null::'||x::regtype,','),'')||')' into q from unnest(f.proargtypes::oid[]) x;
  perform pg_temp.rechaza(q,'42501','no_admin');
 end loop;
end $$;
set local role anon;
do $$ declare f record; q text; begin
 for f in select p.proname,p.proargtypes from pg_proc p where p.pronamespace='public'::regnamespace and p.proname like 'admin\_%' loop
  select 'select public.'||quote_ident(f.proname)||'('||coalesce(string_agg('null::'||x::regtype,','),'')||')' into q from unnest(f.proargtypes::oid[]) x;
  perform pg_temp.rechaza(q,'42501');
 end loop;
end $$;
reset role;
select set_config('request.jwt.claim.sub','aa000000-0000-4000-8000-000000000001',true);
set local role authenticated;
select pg_temp.comprobar(not exists(select 1 from public.productos where id='ac000000-0000-4000-8000-000000000001'),'admin sin sesión no lee');
select public.admin_ver_como_iniciar('ab000000-0000-4000-8000-000000000001');
do $$ declare v jsonb; id uuid; ajena jsonb; begin
 v:=public.admin_ver_como_actual(); id:=(v->>'id')::uuid;
 perform pg_temp.comprobar(v->>'tienda_id'='ab000000-0000-4000-8000-000000000001','actual devuelve la tienda autorizada');
 perform pg_temp.comprobar(public.admin_ver_como_validar(id)->>'id'=id::text,'valida el ID propio y vigente');
 ajena:=public.admin_ver_como_validar('ab000000-0000-4000-8000-000000000099');
 perform pg_temp.comprobar(ajena is null,'ID arbitrario no concede acceso');
end $$;
select pg_temp.comprobar(exists(select 1 from public.productos where id='ac000000-0000-4000-8000-000000000001'),'admin con sesión lee');
select pg_temp.rechaza($q$insert into public.productos(tienda_id,nombre,precio) values('ab000000-0000-4000-8000-000000000001','No',100)$q$,'42501');
do $$ declare n integer; begin update public.productos set nombre='No' where id='ac000000-0000-4000-8000-000000000001';get diagnostics n=row_count;perform pg_temp.comprobar(n=0,'admin ajeno update sin filas');end $$;
-- Un admin que solo mira (no es miembro): antes decía tienda_no_encontrada; ahora la base lo dice con más claridad (solo_mirar).
select pg_temp.rechaza($q$select public.gastar_creditos('ab000000-0000-4000-8000-000000000001',1)$q$,'42501','solo_mirar');
do $$ declare v jsonb; begin v:=public.admin_ver_como_actual(); perform public.admin_ver_como_terminar((v->>'id')::uuid); perform pg_temp.comprobar(public.admin_ver_como_actual() is null,'salida retira sesión activa'); perform pg_temp.comprobar(public.admin_ver_como_validar((v->>'id')::uuid) is null,'sesión cerrada ya no valida'); end $$;
reset role;
update public.sesiones_ver_como set inicio=now()-interval '31 minutes',vence_en=now()-interval '1 minute' where admin_id='aa000000-0000-4000-8000-000000000001' and fin is null;
set local role authenticated;
select pg_temp.comprobar(not exists(select 1 from public.productos where id='ac000000-0000-4000-8000-000000000001'),'vencida pierde lectura');
select public.admin_ver_como_iniciar('ab000000-0000-4000-8000-000000000001');
select public.admin_quitar_admin('aa000000-0000-4000-8000-000000000001');
select pg_temp.comprobar(not public.soy_admin() and not public.admin_viendo('ab000000-0000-4000-8000-000000000001'),'retirado pierde soy_admin y sesión');
select pg_temp.comprobar(not exists(select 1 from public.productos where id='ac000000-0000-4000-8000-000000000001'),'retirado no lee');
select pg_temp.rechaza('select public.admin_admins()','42501','no_admin');
reset role;
select pg_temp.comprobar((select quitado_en is not null from public.admins where usuario_id='aa000000-0000-4000-8000-000000000001'),'baja lógica conserva fila');
select set_config('request.jwt.claim.sub','aa000000-0000-4000-8000-000000000002',true);
set local role authenticated;
select pg_temp.rechaza($q$select public.admin_quitar_admin('aa000000-0000-4000-8000-000000000002')$q$,'P0001','ultimo_admin');
-- Cuenta admin/dueño como Lewis: mientras mira, la BASE le quita la escritura de esa tienda (fix/ver-como-bloqueo; el detalle en
-- probar-ver-como-bloqueo-db.sql). Al terminar la sesión recupera los permisos del dueño y el resto de esta prueba sigue igual.
select public.admin_ver_como_iniciar('ab000000-0000-4000-8000-000000000001');
update public.productos set nombre='Foto dueño' where id='ac000000-0000-4000-8000-000000000001';
select pg_temp.comprobar((select nombre<>'Foto dueño' from public.productos where id='ac000000-0000-4000-8000-000000000001'),'Ver como bloquea al dueño admin en la base');
select public.admin_ver_como_terminar((public.admin_ver_como_actual()->>'id')::uuid);
update public.productos set nombre='Foto dueño' where id='ac000000-0000-4000-8000-000000000001';
select pg_temp.comprobar((select nombre='Foto dueño' from public.productos where id='ac000000-0000-4000-8000-000000000001'),'al terminar Ver como el dueño vuelve a escribir');
-- Retoque reserva/cobra/devuelve y legacy firmas de gastar_creditos.
do $$ declare tr jsonb; v integer; begin
 tr:=public.pedir_retoque('ac000000-0000-4000-8000-000000000001','https://example.invalid/original.jpg');
 perform pg_temp.comprobar((select coalesce(sum(creditos),0) from public.trabajos_retoque where tienda_id='ab000000-0000-4000-8000-000000000001' and estado='pendiente')=5,'reserva');
 perform pg_temp.rechaza($q$select public.pedir_retoque('ac000000-0000-4000-8000-000000000001','https://example.invalid/original.jpg')$q$,'P0001','retoque_pendiente');
 perform public.gastar_creditos('ab000000-0000-4000-8000-000000000001',5);
 perform pg_temp.rechaza($q$select public.pedir_retoque('ac000000-0000-4000-8000-000000000001','https://example.invalid/otra.jpg')$q$,'P0001','creditos_insuficientes');
 perform public.admin_retoque_devolver((tr->>'id')::uuid,'foto borrosa');
 perform pg_temp.comprobar((select coalesce(sum(creditos),0) from public.trabajos_retoque where tienda_id='ab000000-0000-4000-8000-000000000001' and estado='pendiente')=0,'devuelve reserva');
 perform pg_temp.comprobar((select creditos_retoque=5 from public.tiendas where id='ab000000-0000-4000-8000-000000000001'),'no cobra devolución');
 tr:=public.pedir_retoque('ac000000-0000-4000-8000-000000000001','https://example.invalid/original.jpg');
 perform public.admin_retoque_entregar((tr->>'id')::uuid,'https://example.invalid/retocada.jpg');
 perform pg_temp.comprobar((select creditos_retoque=0 from public.tiendas where id='ab000000-0000-4000-8000-000000000001'),'cobra entrega');
 perform public.admin_ajustar_creditos('ab000000-0000-4000-8000-000000000001',5,'fixture');
 v:=public.gastar_creditos(1);perform pg_temp.comprobar(v=4,'firma legacy');
 perform pg_temp.comprobar((select creditos_retoque=(select sum(cantidad) from public.movimientos_creditos where tienda_id=t.id) from public.tiendas t where id='ab000000-0000-4000-8000-000000000001'),'saldo suma');
end $$;
-- Pagos: máximo(hoy, anterior), mes civil, anulación, compra y recarga idempotente.
do $$ declare p jsonb; a jsonb; anterior date; n integer; begin
 p:=public.admin_registrar_pago('ab000000-0000-4000-8000-000000000001','mensualidad',1000,'efectivo');
 perform pg_temp.comprobar((p->>'pagado_hasta')::date=(public.hoy_rd()+interval '1 month')::date,'mensualidad desde hoy');
 anterior:=(p->>'pagado_hasta')::date;
 a:=public.admin_registrar_pago('ab000000-0000-4000-8000-000000000001','mensualidad',1000,'transferencia');
 perform pg_temp.comprobar((a->>'pagado_hasta')::date=(anterior+interval '1 month')::date,'mensualidad desde futuro');
 perform public.admin_anular_pago((p->'pago'->>'id')::uuid,'error');
 perform pg_temp.comprobar((select pagado_hasta=anterior from public.tiendas where id='ab000000-0000-4000-8000-000000000001'),'anula anterior y reaplica posterior');
 perform public.admin_anular_pago((a->'pago'->>'id')::uuid,'error');
 p:=public.admin_registrar_pago('ab000000-0000-4000-8000-000000000001','creditos',500,'efectivo',p_creditos=>10);
 perform pg_temp.comprobar((p->>'creditos')::integer=14,'compra');
 perform public.admin_anular_pago((p->'pago'->>'id')::uuid,'error');
 n:=public.admin_recarga_mensual('ab000000-0000-4000-8000-000000000001');perform pg_temp.comprobar(n=1,'primera recarga');
 n:=public.admin_recarga_mensual('ab000000-0000-4000-8000-000000000001');perform pg_temp.comprobar(n=0,'idempotencia');
end $$;
select pg_temp.rechaza('update public.pagos set monto=0','42501');
select pg_temp.rechaza('delete from public.pagos','42501');
select pg_temp.rechaza('update public.registro_admin set accion=''no''','42501');
select pg_temp.rechaza('delete from public.registro_admin','42501');
select pg_temp.rechaza($q$select public.admin_catalogo_avanzar('ab000000-0000-4000-8000-000000000001','siguiente')$q$,'P0001','catalogo_estado_invalido');
select public.admin_catalogo_avanzar('ab000000-0000-4000-8000-000000000001','empezar');
select pg_temp.rechaza($q$select public.admin_catalogo_avanzar('ab000000-0000-4000-8000-000000000001','a_revisar')$q$,'P0001','catalogo_estado_invalido');
select public.admin_catalogo_avanzar('ab000000-0000-4000-8000-000000000001','siguiente');
select public.admin_catalogo_avanzar('ab000000-0000-4000-8000-000000000001','siguiente');
select public.admin_catalogo_avanzar('ab000000-0000-4000-8000-000000000001','a_revisar');
-- Hoy y posponer: la condición sigue existiendo, solo se oculta para el admin actual.
reset role;
update public.tiendas set pagado_hasta=public.hoy_rd()-1 where id='ab000000-0000-4000-8000-000000000001';
set local role authenticated;
do $$ declare v_clave text; begin
 select a.clave into v_clave from public.admin_hoy() a where regla='pago_vencido' and tienda_id='ab000000-0000-4000-8000-000000000001';
 perform pg_temp.comprobar(v_clave is not null,'Hoy vencido');perform public.admin_posponer(v_clave);
 perform pg_temp.comprobar(not exists(select 1 from public.admin_hoy() a where a.clave=v_clave),'posponer');
end $$;
reset role;
select pg_temp.comprobar((select count(*)>0 from public.registro_admin),'registro');
select pg_temp.rechaza('update public.pagos set monto=0','42501','registro_inmutable');
select pg_temp.rechaza('delete from public.registro_admin','42501','registro_inmutable');
set local role service_role;
select pg_temp.rechaza('update public.pagos set monto=0','42501');
select pg_temp.rechaza('delete from public.registro_admin','42501');
reset role;
rollback;
\echo 'Admin SQL: autorización, sesiones, retirados, inmutabilidad, créditos, retoque, pagos, recarga, catálogo y posponer OK'
