-- Admin, parte 3 (Trabajo y retoque real). Exclusivamente replay desechable; NO ejecutar en producción.
-- Ciclo con las RPC aplicadas: la tienda pide (reserva), el admin entrega (cobra una vez) o devuelve (libera), sin doble
-- envío, sin sustituir una foto que ya no está, y la lectura admin_productos_tienda solo para admins.
begin;
do $$ begin if current_database()<>'replay_provisional' then raise exception 'Solo replay_provisional'; end if; end $$;
create function pg_temp.comprobar(ok boolean, mensaje text) returns void language plpgsql as $$ begin if ok is distinct from true then raise exception '%',mensaje; end if; end $$;
create function pg_temp.rechaza(q text, mensaje text) returns void language plpgsql as $$ begin
  begin execute q; exception when others then
    if sqlerrm=mensaje then return; end if;
    raise exception 'Error inesperado % / % para %',sqlstate,sqlerrm,q;
  end; raise exception 'Aceptó operación prohibida: %',q;
end $$;
grant execute on function pg_temp.comprobar(boolean,text) to authenticated;
grant execute on function pg_temp.rechaza(text,text) to authenticated;
insert into auth.users(id,email,raw_app_meta_data,email_confirmed_at) values
 ('ba000000-0000-4000-8000-000000000001','admin3@prueba.invalid','{"provider":"google"}',now()),
 ('ba000000-0000-4000-8000-000000000002','duena3@prueba.invalid','{"provider":"google"}',now()),
 ('ba000000-0000-4000-8000-000000000003','otra3@prueba.invalid','{"provider":"google"}',now());
insert into public.admins(usuario_id,email) values ('ba000000-0000-4000-8000-000000000001','admin3@prueba.invalid');
insert into public.tiendas(id,nombre,slug,estado,creditos_retoque) values
 ('bb000000-0000-4000-8000-000000000001','Taller fixture','taller-fixture','activa',0),
 ('bb000000-0000-4000-8000-000000000002','Otra fixture','otra-fixture','activa',0);
insert into public.miembros(usuario_id,tienda_id,rol) values
 ('ba000000-0000-4000-8000-000000000002','bb000000-0000-4000-8000-000000000001','dueno'),
 ('ba000000-0000-4000-8000-000000000003','bb000000-0000-4000-8000-000000000002','dueno');
insert into public.movimientos_creditos(tienda_id,cantidad,tipo,motivo) values ('bb000000-0000-4000-8000-000000000001',12,'ajuste','fixture');
insert into public.productos(id,tienda_id,nombre,precio,stock,orden,medios) values
 ('bc000000-0000-4000-8000-000000000001','bb000000-0000-4000-8000-000000000001','Uno',100,2,2,'[{"tipo":"foto","url":"https://example.invalid/a.jpg","retocada":false},{"tipo":"foto","url":"https://example.invalid/b.jpg","retocada":false}]'),
 ('bc000000-0000-4000-8000-000000000002','bb000000-0000-4000-8000-000000000001','Dos',100,2,null,'[{"tipo":"foto","url":"https://example.invalid/c.jpg","retocada":false}]'),
 ('bc000000-0000-4000-8000-000000000003','bb000000-0000-4000-8000-000000000001','Tres',100,2,1,'[{"tipo":"foto","url":"https://example.invalid/d.jpg","retocada":false}]');

-- 1. admin_productos_tienda: solo admins, sin retirados, en el orden del catálogo público.
select set_config('request.jwt.claim.sub','ba000000-0000-4000-8000-000000000002',true);
set local role authenticated;
select pg_temp.rechaza($q$select public.admin_productos_tienda('bb000000-0000-4000-8000-000000000001')$q$,'no_admin');
reset role;
select pg_temp.comprobar(not has_function_privilege('anon','public.admin_productos_tienda(uuid)','EXECUTE'),'anon ejecuta admin_productos_tienda');
update public.productos set eliminado_en=now(), activo=false where id='bc000000-0000-4000-8000-000000000003';
select set_config('request.jwt.claim.sub','ba000000-0000-4000-8000-000000000001',true);
set local role authenticated;
do $$ declare r jsonb := public.admin_productos_tienda('bb000000-0000-4000-8000-000000000001'); begin
 perform pg_temp.comprobar(jsonb_array_length(r)=2,'cuenta sin retirados');
 perform pg_temp.comprobar(r->0->>'nombre'='Dos' and r->1->>'nombre'='Uno','orden: sin orden primero, como el catálogo');
 perform pg_temp.comprobar(r->1->'medios'->0->>'url'='https://example.invalid/a.jpg','medios');
 perform pg_temp.rechaza($q$select public.admin_productos_tienda('bb000000-0000-4000-8000-0000000000ff')$q$,'tienda_no_encontrada');
 -- El admin sin «Ver como» sigue sin leer productos directo (la RPC no abre la tabla).
 perform pg_temp.comprobar((select count(*) from public.productos where tienda_id='bb000000-0000-4000-8000-000000000001')=0,'lectura directa sin Ver como');
end $$;
reset role;

-- 2. La tienda pide: reserva (no cobra), no repite la misma foto, y el saldo libre manda.
select set_config('request.jwt.claim.sub','ba000000-0000-4000-8000-000000000002',true);
set local role authenticated;
do $$ declare t jsonb; begin
 t := public.pedir_retoque('bc000000-0000-4000-8000-000000000001','https://example.invalid/a.jpg');
 perform pg_temp.comprobar(t->>'estado'='pendiente' and (t->>'creditos')::int=5,'trabajo pendiente');
 perform pg_temp.comprobar((select creditos_retoque from public.tiendas where id='bb000000-0000-4000-8000-000000000001')=12,'pedir no cobra');
 perform pg_temp.rechaza($q$select public.pedir_retoque('bc000000-0000-4000-8000-000000000001','https://example.invalid/a.jpg')$q$,'retoque_pendiente');
 perform public.pedir_retoque('bc000000-0000-4000-8000-000000000001','https://example.invalid/b.jpg');
 -- 12 - 10 reservados = 2 libres: la tercera no entra.
 perform pg_temp.rechaza($q$select public.pedir_retoque('bc000000-0000-4000-8000-000000000002','https://example.invalid/c.jpg')$q$,'creditos_insuficientes');
 perform pg_temp.rechaza($q$select public.pedir_retoque('bc000000-0000-4000-8000-000000000001','https://example.invalid/no-esta.jpg')$q$,'foto_no_encontrada');
 perform pg_temp.comprobar((select count(*) from public.trabajos_retoque)=2,'la dueña ve sus 2 trabajos');
end $$;
reset role;
-- Otra tienda no pide sobre productos ajenos ni ve sus trabajos.
select set_config('request.jwt.claim.sub','ba000000-0000-4000-8000-000000000003',true);
set local role authenticated;
select pg_temp.rechaza($q$select public.pedir_retoque('bc000000-0000-4000-8000-000000000001','https://example.invalid/a.jpg')$q$,'producto_no_encontrado');
select pg_temp.comprobar((select count(*) from public.trabajos_retoque)=0,'otra tienda no ve trabajos ajenos');
reset role;

-- 3. Entregar cobra una sola vez; el doble envío falla sin cobrar de nuevo ni cambiar la foto. Devolver libera y no cobra.
select set_config('request.jwt.claim.sub','ba000000-0000-4000-8000-000000000001',true);
set local role authenticated;
do $$ declare a uuid; b uuid; begin
 select (x->>'id')::uuid into a from jsonb_array_elements(public.admin_trabajos_retoque('pendiente')) x where x->>'medio_url_original'='https://example.invalid/a.jpg';
 select (x->>'id')::uuid into b from jsonb_array_elements(public.admin_trabajos_retoque('pendiente')) x where x->>'medio_url_original'='https://example.invalid/b.jpg';
 perform pg_temp.rechaza(format('select public.admin_retoque_entregar(%L,%L)',a,'http://inseguro.invalid/x.webp'),'enlace_invalido');
 perform public.admin_retoque_entregar(a,'https://example.invalid/retoques/a-1.webp');
 perform pg_temp.rechaza(format('select public.admin_retoque_entregar(%L,%L)',a,'https://example.invalid/retoques/a-2.webp'),'trabajo_no_pendiente');
 perform pg_temp.rechaza(format('select public.admin_retoque_devolver(%L,%L)',a,'tarde'),'trabajo_no_pendiente');
 perform public.admin_retoque_devolver(b,'La foto está muy oscura');
end $$;
reset role;
do $$ declare a uuid; m jsonb; begin
 select id into a from public.trabajos_retoque where medio_url_original='https://example.invalid/a.jpg';
 perform pg_temp.comprobar((select creditos_retoque from public.tiendas where id='bb000000-0000-4000-8000-000000000001')=7,'cobró una sola vez y devolver no cobró');
 perform pg_temp.comprobar((select count(*) from public.movimientos_creditos where trabajo_id=a)=1,'un solo movimiento');
 select medios into m from public.productos where id='bc000000-0000-4000-8000-000000000001';
 perform pg_temp.comprobar(m->0->>'url'='https://example.invalid/retoques/a-1.webp' and (m->0->>'retocada')::boolean,'foto entregada en su lugar');
 perform pg_temp.comprobar(m->1->>'url'='https://example.invalid/b.jpg','la otra foto no cambió');
 perform pg_temp.comprobar((select medio_url_original from public.trabajos_retoque where id=a)='https://example.invalid/a.jpg','conserva la original');
 perform pg_temp.comprobar((select motivo_devolucion from public.trabajos_retoque where medio_url_original='https://example.invalid/b.jpg')='La foto está muy oscura','motivo guardado');
end $$;

-- 4. La tienda cambió la foto mientras esperaba: no se sustituye otra foto ni se cobra.
select set_config('request.jwt.claim.sub','ba000000-0000-4000-8000-000000000002',true);
set local role authenticated;
select public.pedir_retoque('bc000000-0000-4000-8000-000000000002','https://example.invalid/c.jpg');
reset role;
update public.productos set medios='[{"tipo":"foto","url":"https://example.invalid/c-nueva.jpg","retocada":false}]' where id='bc000000-0000-4000-8000-000000000002';
select set_config('request.jwt.claim.sub','ba000000-0000-4000-8000-000000000001',true);
set local role authenticated;
do $$ declare c uuid; begin
 select (x->>'id')::uuid into c from jsonb_array_elements(public.admin_trabajos_retoque('pendiente')) x where x->>'medio_url_original'='https://example.invalid/c.jpg';
 perform pg_temp.rechaza(format('select public.admin_retoque_entregar(%L,%L)',c,'https://example.invalid/retoques/c-1.webp'),'foto_no_encontrada');
end $$;
reset role;
do $$ begin
 perform pg_temp.comprobar((select estado from public.trabajos_retoque where medio_url_original='https://example.invalid/c.jpg')='pendiente','sigue pendiente tras el rechazo');
 perform pg_temp.comprobar((select creditos_retoque from public.tiendas where id='bb000000-0000-4000-8000-000000000001')=7,'no cobró la foto cambiada');
 perform pg_temp.comprobar((select medios->0->>'url' from public.productos where id='bc000000-0000-4000-8000-000000000002')='https://example.invalid/c-nueva.jpg','no sustituyó la foto nueva');
end $$;
-- El admin la devuelve: la reserva se libera.
select set_config('request.jwt.claim.sub','ba000000-0000-4000-8000-000000000001',true);
set local role authenticated;
select public.admin_retoque_devolver((select (x->>'id')::uuid from jsonb_array_elements(public.admin_trabajos_retoque('pendiente')) x where x->>'medio_url_original'='https://example.invalid/c.jpg'),'Cambiaste la foto: pide la nueva');
reset role;

-- 5. Producto retirado mientras esperaba: tampoco se entrega.
select set_config('request.jwt.claim.sub','ba000000-0000-4000-8000-000000000002',true);
set local role authenticated;
select public.pedir_retoque('bc000000-0000-4000-8000-000000000001','https://example.invalid/b.jpg');
reset role;
update public.productos set eliminado_en=now(), activo=false where id='bc000000-0000-4000-8000-000000000001';
select set_config('request.jwt.claim.sub','ba000000-0000-4000-8000-000000000001',true);
do $$ declare b2 uuid; ok boolean := false; begin
 select id into b2 from public.trabajos_retoque where medio_url_original='https://example.invalid/b.jpg' and estado='pendiente';
 execute 'set local role authenticated';
 begin perform public.admin_retoque_entregar(b2,'https://example.invalid/retoques/b-1.webp'); exception when others then ok := sqlerrm='producto_no_encontrado'; end;
 execute 'reset role';
 perform pg_temp.comprobar(ok,'retirado: producto_no_encontrado');
 perform pg_temp.comprobar((select creditos_retoque from public.tiendas where id='bb000000-0000-4000-8000-000000000001')=7,'no cobró el retirado');
end $$;
select 'Pasó: admin_productos_tienda (solo admin, orden, sin retirados), reservar/entregar una vez/devolver, doble envío, foto cambiada y producto retirado sin sustitución ni cobro.' as resultado;
rollback;
