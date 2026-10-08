-- Guardado, fixtures ficticios, rollback íntegro. Nunca producción.
begin;
do $$ begin if current_database()<>'replay_provisional' then raise exception 'solo replay';end if;end $$;
create function pg_temp.ok(v boolean,m text) returns void language plpgsql as $$ begin if v is distinct from true then raise exception '%',m;end if;end $$;
create function pg_temp.rechaza(q text,m text) returns void language plpgsql as $$ begin
 begin execute q;exception when others then if sqlerrm=m then return;end if;raise;end;
 raise exception 'No rechazó %',m;end $$;
insert into auth.users(id,email) values('af000000-0000-4000-8000-000000000001','cobros@prueba.invalid'),('af000000-0000-4000-8000-000000000003','normal@prueba.invalid');
insert into public.admins(usuario_id,email) values('af000000-0000-4000-8000-000000000001','cobros@prueba.invalid');
insert into public.tiendas(id,nombre,slug,estado,creditos_retoque) values('af000000-0000-4000-8000-000000000002','Cobros fixture','cobros-fixture','activa',0),('af000000-0000-4000-8000-000000000004','Otra fixture','otra-cobros-fixture','activa',0);
insert into public.miembros(usuario_id,tienda_id,rol) values('af000000-0000-4000-8000-000000000001','af000000-0000-4000-8000-000000000002','dueno');
insert into public.productos(id,tienda_id,nombre,precio,medios) values('af000000-0000-4000-8000-000000000005','af000000-0000-4000-8000-000000000002','Foto fixture',100,'[{"tipo":"foto","url":"https://deslizapp-app.vercel.app/ensayo/foto.jpg"}]');
select set_config('request.jwt.claim.sub','af000000-0000-4000-8000-000000000001',true);
set local role authenticated;
select set_config('admin_test.pago',(public.admin_registrar_pago('af000000-0000-4000-8000-000000000002','mensualidad',1000,'efectivo',p_comprobante_url=>'af000000-0000-4000-8000-000000000002/fixture.pdf')->'pago'->>'id'),true);
reset role;
-- Cobertura externa posterior al primer pago: debe conservarla, rechazando la anulación.
update public.tiendas set pagado_hasta='2029-12-31' where id='af000000-0000-4000-8000-000000000002';
set local role authenticated;
select pg_temp.rechaza($q$select public.admin_anular_pago(current_setting('admin_test.pago')::uuid,'externa')$q$,'cobertura_no_conciliada');
-- Incluso si otro registro capturó esa cobertura externa, no se puede borrarla.
select public.admin_registrar_pago('af000000-0000-4000-8000-000000000002','mensualidad',1000,'efectivo');
select pg_temp.rechaza($q$select public.admin_anular_pago(current_setting('admin_test.pago')::uuid,'externa')$q$,'cobertura_no_conciliada');
reset role;
select pg_temp.ok((select count(*)=0 from public.pagos where anula_a is not null),'rechazo sin anulación parcial');
select pg_temp.ok((select pagado_hasta='2030-01-31' from public.tiendas where id='af000000-0000-4000-8000-000000000002'),'cobertura externa no borrada');
select pg_temp.ok((select pagado_hasta is null from public.tiendas where id='af000000-0000-4000-8000-000000000004'),'aislamiento');
-- Fallo forzado de auditoría: ninguna anulación ni cambio de cobertura se confirma.
update public.tiendas set pagado_hasta=(public.hoy_rd()+interval '2 months')::date where id='af000000-0000-4000-8000-000000000002';
-- Restaurar a la cobertura calculada del historial, no sumar 2 meses de una vez (fin de mes).
update public.tiendas set pagado_hasta=((public.hoy_rd()+interval '1 month')::date+interval '1 month')::date where id='af000000-0000-4000-8000-000000000002';
create function pg_temp.falla_auditoria() returns trigger language plpgsql as $$ begin raise exception 'fallo_auditoria_fixture';end $$;
create trigger admin_test_auditoria before insert on public.registro_admin for each row execute function pg_temp.falla_auditoria();
set local role authenticated;
select pg_temp.rechaza($q$select public.admin_anular_pago(current_setting('admin_test.pago')::uuid,'fallo')$q$,'fallo_auditoria_fixture');
reset role;
select pg_temp.ok((select count(*)=0 from public.pagos where anula_a is not null),'rollback anulación ante fallo');
drop trigger admin_test_auditoria on public.registro_admin;
set local role authenticated;
select set_config('admin_test.anulacion',public.admin_anular_pago(current_setting('admin_test.pago')::uuid,'anular')->'anulacion'->>'id',true);
select pg_temp.rechaza($q$select public.admin_anular_pago(current_setting('admin_test.pago')::uuid,'doble')$q$,'pago_ya_anulado');
select pg_temp.rechaza($q$select public.admin_anular_pago(current_setting('admin_test.anulacion')::uuid,'anulación')$q$,'pago_ya_anulado');
reset role;
select pg_temp.ok((select count(*)=1 from public.registro_admin where accion='anular_pago' and tienda_id='af000000-0000-4000-8000-000000000002'),'auditoría una vez');
select pg_temp.ok((select comprobante_url='af000000-0000-4000-8000-000000000002/fixture.pdf' from public.pagos where id=current_setting('admin_test.pago')::uuid),'comprobante intacto');
-- Créditos: compra de 10, reserva 5, reversión rechazada; liberar reserva permite anular.
set local role authenticated;
select set_config('admin_test.creditos',public.admin_registrar_pago('af000000-0000-4000-8000-000000000002','creditos',500,'efectivo',p_creditos=>10)->'pago'->>'id',true);
select set_config('admin_test.trabajo',public.pedir_retoque('af000000-0000-4000-8000-000000000005','https://deslizapp-app.vercel.app/ensayo/foto.jpg')->>'id',true);
select pg_temp.rechaza($q$select public.admin_anular_pago(current_setting('admin_test.creditos')::uuid,'reserva')$q$,'creditos_ya_usados');
select public.admin_retoque_devolver(current_setting('admin_test.trabajo')::uuid,'devolver fixture');
select public.admin_anular_pago(current_setting('admin_test.creditos')::uuid,'liberado');
reset role;
select pg_temp.ok((select creditos_retoque=0 from public.tiendas where id='af000000-0000-4000-8000-000000000002'),'saldo no negativo');
select pg_temp.ok((select count(*)=1 from public.pagos where anula_a=current_setting('admin_test.creditos')::uuid),'créditos: intento fallido revertido');
select set_config('request.jwt.claim.sub','af000000-0000-4000-8000-000000000003',true);
set local role authenticated;
select pg_temp.rechaza($q$select public.admin_anular_pago(current_setting('admin_test.pago')::uuid,'normal')$q$,'no_admin');
reset role;
update public.admins set quitado_en=now() where usuario_id='af000000-0000-4000-8000-000000000001';
select set_config('request.jwt.claim.sub','af000000-0000-4000-8000-000000000001',true);
set local role authenticated;
select pg_temp.rechaza($q$select public.admin_anular_pago(current_setting('admin_test.pago')::uuid,'retirado')$q$,'no_admin');
reset role;
rollback;
\echo 'Mensualidades SQL: cobertura externa protegida, rollback auditoría, inmutabilidad, aislamiento, autorización y regresión créditos/reservas OK'
