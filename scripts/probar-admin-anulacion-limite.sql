-- Ensayo de la propuesta, en la misma base desechable. Revierte función y filas.
begin;
do $$ begin if current_database()<>'replay_provisional' then raise exception 'Solo replay_provisional'; end if; end $$;
insert into auth.users(id,email) values('ae000000-0000-4000-8000-000000000001','limite@prueba.invalid');
insert into public.admins(usuario_id,email) values('ae000000-0000-4000-8000-000000000001','limite@prueba.invalid');
insert into public.tiendas(id,nombre,slug,estado) values('ae000000-0000-4000-8000-000000000002','Anulación fixture','anulacion-fixture','activa');
select set_config('request.jwt.claim.sub','ae000000-0000-4000-8000-000000000001',true);
-- Función temporal del test: misma secuencia antes y después.
create function pg_temp.probar_anulaciones(esperar_error boolean) returns void language plpgsql as $$
declare a uuid;b uuid;v date;begin
 a:=(public.admin_registrar_pago('ae000000-0000-4000-8000-000000000002','mensualidad',1000,'efectivo')->'pago'->>'id')::uuid;
 b:=(public.admin_registrar_pago('ae000000-0000-4000-8000-000000000002','mensualidad',1000,'efectivo')->'pago'->>'id')::uuid;
 perform public.admin_anular_pago(a,'error A');
 v:=(public.admin_anular_pago(b,'error B')->>'pagado_hasta')::date;
 if esperar_error then
  if v is null then raise exception 'No reprodujo limitación';end if;
  raise notice 'LIMITACION REPRODUCIDA: ningún pago mensual vigente, pagado_hasta=%',v;
 elsif v is not null then raise exception 'No corrigió anulación A después B: %',v;
 end if;
end $$;
set local role authenticated;
savepoint original;
select pg_temp.probar_anulaciones(true);
rollback to savepoint original;
reset role;
\i /tmp/admin-anular-pago-propuesta.sql
set local role authenticated;
select pg_temp.probar_anulaciones(false);
reset role;
rollback;
\echo 'Anulación: limitación aplicada reproducida; propuesta corrige A→B y revierte su DDL al terminar.'
