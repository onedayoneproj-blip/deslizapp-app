-- Publicar mi catálogo (migración *_publicar_catalogo). Replay desechable; NO ejecutar en producción.
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
-- El replay no trae las extensiones de Supabase; crear_solicitud_pedido usa extensions.gen_random_bytes.
create schema if not exists extensions; create extension if not exists pgcrypto schema extensions;
grant usage on schema extensions to anon, authenticated;

insert into auth.users(id,email,raw_app_meta_data,email_confirmed_at) values
 ('ad100000-0000-4000-8000-00000000000d','duena@prueba.invalid','{"provider":"google"}',now()),
 ('ad100000-0000-4000-8000-00000000000a','ayudante@prueba.invalid','{"provider":"google"}',now()),
 ('ad100000-0000-4000-8000-00000000000e','editor@prueba.invalid','{"provider":"google"}',now()),
 ('ad100000-0000-4000-8000-00000000000c','administra@prueba.invalid','{"provider":"google"}',now()),
 ('ad100000-0000-4000-8000-00000000000f','extrano@prueba.invalid','{"provider":"google"}',now()),
 ('ad100000-0000-4000-8000-00000000000b','admin-duena@prueba.invalid','{"provider":"google"}',now());
insert into public.admins(usuario_id,email) values ('ad100000-0000-4000-8000-00000000000b','admin-duena@prueba.invalid');
insert into public.tiendas(id,nombre,slug,estado,catalogo_estado,rubro,whatsapp) values
 ('ae100000-0000-4000-8000-000000000001','Publica fixture','publica-fixture','en_prueba','sin','ropa','18095550100'),
 ('ae100000-0000-4000-8000-000000000002','Publica V fixture','publica-v-fixture','en_prueba','sin','ropa','18095550101'),
 ('ae100000-0000-4000-8000-000000000003','Publica activa fixture','publica-activa-fixture','activa','publicado','ropa','18095550102');
insert into public.miembros(usuario_id,tienda_id,rol,nivel) values
 ('ad100000-0000-4000-8000-00000000000d','ae100000-0000-4000-8000-000000000001','dueno','ayudante'),
 ('ad100000-0000-4000-8000-00000000000a','ae100000-0000-4000-8000-000000000001','staff','ayudante'),
 ('ad100000-0000-4000-8000-00000000000e','ae100000-0000-4000-8000-000000000001','staff','editor'),
 ('ad100000-0000-4000-8000-00000000000c','ae100000-0000-4000-8000-000000000001','staff','administrador'),
 ('ad100000-0000-4000-8000-00000000000b','ae100000-0000-4000-8000-000000000002','dueno','ayudante');
-- Tienda 1: dos productos con foto, uno sin foto, uno oculto con foto, uno eliminado con foto => solo 2 cuentan.
insert into public.productos(id,tienda_id,nombre,precio,stock,activo,eliminado_en,medios) values
 ('af100000-0000-4000-8000-000000000001','ae100000-0000-4000-8000-000000000001','Con foto 1',1000,5,true,null,'[{"url":"https://deslizapp-app.vercel.app/ensayo/1.jpg","tipo":"foto","retocada":false}]'),
 ('af100000-0000-4000-8000-000000000002','ae100000-0000-4000-8000-000000000001','Con foto 2',1000,5,true,null,'[{"url":"https://deslizapp-app.vercel.app/ensayo/2.jpg","tipo":"foto","retocada":false},{"url":"https://deslizapp-app.vercel.app/ensayo/2.mp4","tipo":"video"}]'),
 ('af100000-0000-4000-8000-000000000003','ae100000-0000-4000-8000-000000000001','Sin foto',1000,5,true,null,'[]'),
 ('af100000-0000-4000-8000-000000000004','ae100000-0000-4000-8000-000000000001','Oculto',1000,5,false,null,'[{"url":"https://deslizapp-app.vercel.app/ensayo/4.jpg","tipo":"foto","retocada":false}]'),
 ('af100000-0000-4000-8000-000000000005','ae100000-0000-4000-8000-000000000001','Solo video',1000,5,true,null,'[{"url":"https://deslizapp-app.vercel.app/ensayo/5.mp4","tipo":"video"}]'),
 ('af100000-0000-4000-8000-000000000006','ae100000-0000-4000-8000-000000000001','Agotado con foto',1000,0,true,null,'[{"url":"https://deslizapp-app.vercel.app/ensayo/6.jpg","tipo":"foto","retocada":false}]');
update public.productos set eliminado_en=now(), activo=false where id='af100000-0000-4000-8000-000000000004';
insert into public.productos(id,tienda_id,nombre,precio,stock,medios) values
 ('af100000-0000-4000-8000-000000000007','ae100000-0000-4000-8000-000000000002','V1',1000,5,'[{"url":"https://deslizapp-app.vercel.app/ensayo/v1.jpg","tipo":"foto","retocada":false}]'),
 ('af100000-0000-4000-8000-000000000008','ae100000-0000-4000-8000-000000000002','V2',1000,5,'[{"url":"https://deslizapp-app.vercel.app/ensayo/v2.jpg","tipo":"foto","retocada":false}]'),
 ('af100000-0000-4000-8000-000000000009','ae100000-0000-4000-8000-000000000002','V3',1000,5,'[{"url":"https://deslizapp-app.vercel.app/ensayo/v3.jpg","tipo":"foto","retocada":false}]');

-- ═══ 0. Estructura y permisos de ejecución ═══
select pg_temp.comprobar(not has_function_privilege('anon','public.publicar_mi_catalogo(uuid)','EXECUTE')
  and has_function_privilege('authenticated','public.publicar_mi_catalogo(uuid)','EXECUTE'),'publicar_mi_catalogo: anon no, authenticated sí');
select pg_temp.comprobar(not has_function_privilege('anon','public.despublicar_mi_catalogo(uuid)','EXECUTE')
  and has_function_privilege('authenticated','public.despublicar_mi_catalogo(uuid)','EXECUTE'),'despublicar_mi_catalogo: anon no, authenticated sí');
select pg_temp.comprobar(not has_function_privilege('anon','public.productos_para_publicar(uuid)','EXECUTE')
  and not has_function_privilege('authenticated','public.productos_para_publicar(uuid)','EXECUTE'),'productos_para_publicar es interna: nadie la llama desde fuera');
select pg_temp.comprobar(not has_function_privilege('anon','public.tienda_publica(text)','EXECUTE'),'tienda_publica sigue sin ejecutarse por anon');
select pg_temp.comprobar((select count(*) from pg_proc where proname in ('publicar_mi_catalogo','despublicar_mi_catalogo') and prosecdef and proconfig::text like '%search_path=%')=2,'security definer con search_path vacío');
-- Lo mínimo: 2 productos cuentan (sin foto, solo video, oculto y eliminado no).
select pg_temp.comprobar(public.productos_para_publicar('ae100000-0000-4000-8000-000000000001')=3,'cuentan los visibles con foto (incluye el agotado)');
update public.productos set activo=false where id='af100000-0000-4000-8000-000000000006';
select pg_temp.comprobar(public.productos_para_publicar('ae100000-0000-4000-8000-000000000001')=2,'ocultar uno baja la cuenta');

-- ═══ 1. Quién puede publicar ═══
set local role authenticated;
select pg_temp.como('ad100000-0000-4000-8000-00000000000a');
select pg_temp.rechaza($q$select public.publicar_mi_catalogo('ae100000-0000-4000-8000-000000000001')$q$,'42501','sin_permiso');
select pg_temp.rechaza($q$select public.despublicar_mi_catalogo('ae100000-0000-4000-8000-000000000001')$q$,'42501','sin_permiso');
select pg_temp.como('ad100000-0000-4000-8000-00000000000e');
select pg_temp.rechaza($q$select public.publicar_mi_catalogo('ae100000-0000-4000-8000-000000000001')$q$,'42501','sin_permiso');
select pg_temp.como('ad100000-0000-4000-8000-00000000000c');
select pg_temp.rechaza($q$select public.publicar_mi_catalogo('ae100000-0000-4000-8000-000000000001')$q$,'42501','sin_permiso');
select pg_temp.rechaza($q$select public.despublicar_mi_catalogo('ae100000-0000-4000-8000-000000000001')$q$,'42501','sin_permiso');
select pg_temp.como('ad100000-0000-4000-8000-00000000000f');
select pg_temp.rechaza($q$select public.publicar_mi_catalogo('ae100000-0000-4000-8000-000000000001')$q$,'P0002','tienda_no_encontrada');
select pg_temp.rechaza($q$select public.despublicar_mi_catalogo('ae100000-0000-4000-8000-000000000001')$q$,'P0002','tienda_no_encontrada');
-- La tienda de otra persona no se toca (la dueña de la 1 no es de la 2).
select pg_temp.como('ad100000-0000-4000-8000-00000000000d');
select pg_temp.rechaza($q$select public.publicar_mi_catalogo('ae100000-0000-4000-8000-000000000002')$q$,'P0002','tienda_no_encontrada');
select pg_temp.rechaza($q$select public.publicar_mi_catalogo(null)$q$,'P0002','tienda_no_encontrada');
reset role;
select pg_temp.comprobar((select catalogo_estado from public.tiendas where id='ae100000-0000-4000-8000-000000000001')='sin','ningún rechazo cambió nada');

-- ═══ 2. Lo mínimo, publicar, repetir ═══
set local role authenticated;
select pg_temp.como('ad100000-0000-4000-8000-00000000000d');
select pg_temp.rechaza($q$select public.publicar_mi_catalogo('ae100000-0000-4000-8000-000000000001')$q$,'P0001','catalogo_incompleto');
reset role;
update public.productos set activo=true where id='af100000-0000-4000-8000-000000000006';
set local role authenticated;
select pg_temp.como('ad100000-0000-4000-8000-00000000000d');
select pg_temp.comprobar((select catalogo_estado||'|'||url_catalogo from public.publicar_mi_catalogo('ae100000-0000-4000-8000-000000000001'))='publicado|https://deslizapp-app.vercel.app/tienda/publica-fixture','publica con 3 y deja el enlace estándar');
reset role;
select pg_temp.comprobar((select catalogo_publicado_en is not null from public.tiendas where id='ae100000-0000-4000-8000-000000000001'),'guarda el primer momento publicado');
create temp table t_primera as select catalogo_publicado_en p from public.tiendas where id='ae100000-0000-4000-8000-000000000001';
grant select on t_primera to authenticated;
set local role authenticated;
select pg_temp.como('ad100000-0000-4000-8000-00000000000d');
select pg_temp.comprobar((select catalogo_estado from public.publicar_mi_catalogo('ae100000-0000-4000-8000-000000000001'))='publicado','publicar otra vez no es un error');
reset role;
select pg_temp.comprobar((select catalogo_publicado_en from public.tiendas where id='ae100000-0000-4000-8000-000000000001')=(select p from t_primera),'publicar otra vez no mueve la fecha');

-- ═══ 3. El comprador, en una tienda EN PRUEBA publicada ═══
set local role anon;
select pg_temp.comprobar((public.catalogo_publico('publica-fixture')->'tienda'->>'slug')='publica-fixture','el comprador ve el catálogo de una tienda en prueba');
select pg_temp.comprobar((public.catalogo_publico('publica-fixture')->'tienda'->>'indexable')='false','una tienda en prueba NO es indexable');
select pg_temp.comprobar(jsonb_array_length(public.catalogo_publico('publica-fixture')->'productos')=5,'ve sus productos visibles');
select pg_temp.comprobar((public.catalogo_publico('publica-activa-fixture')->'tienda'->>'indexable')='true','una tienda activa sí es indexable');
create temp table t_pedido(codigo text);
grant all on t_pedido to anon;
insert into t_pedido select (public.crear_solicitud_pedido('publica-fixture','[{"producto_id":"af100000-0000-4000-8000-000000000001","cantidad":1}]'::jsonb,null,'prueba-dispositivo')->>'codigo');
select pg_temp.comprobar((select count(*) from t_pedido where codigo is not null)=1,'el comprador hace un pedido');
select pg_temp.comprobar((public.ver_solicitud((select codigo from t_pedido))->'tienda'->>'slug')='publica-fixture','el comprador abre su pedido');
select pg_temp.comprobar(public.registrar_aaah('publica-fixture','con-foto-1','prueba-dispositivo',true) is not null,'el comprador da ♥');
select pg_temp.comprobar(public.pedir_aviso('publica-fixture','agotado-con-foto',null,'8095550123','Cliente','prueba-dispositivo') is not null,'el comprador pide «Avísame» (llega a la función)');
reset role;

-- ═══ 4. Despublicar y volver a publicar ═══
set local role authenticated;
select pg_temp.como('ad100000-0000-4000-8000-00000000000a');
select pg_temp.rechaza($q$select public.despublicar_mi_catalogo('ae100000-0000-4000-8000-000000000001')$q$,'42501','sin_permiso');
select pg_temp.como('ad100000-0000-4000-8000-00000000000d');
select pg_temp.comprobar((select catalogo_estado from public.despublicar_mi_catalogo('ae100000-0000-4000-8000-000000000001'))='sin','despublica');
select pg_temp.comprobar((select catalogo_estado from public.despublicar_mi_catalogo('ae100000-0000-4000-8000-000000000001'))='sin','despublicar otra vez no es un error');
reset role;
select pg_temp.comprobar((select url_catalogo is not null and catalogo_publicado_en=(select p from t_primera) from public.tiendas where id='ae100000-0000-4000-8000-000000000001'),'conserva el enlace y el primer momento publicado');
set local role anon;
select pg_temp.rechaza($q$select public.catalogo_publico('publica-fixture')$q$,'P0002','catalogo_no_disponible');
select pg_temp.rechaza($q$select public.crear_solicitud_pedido('publica-fixture','[{"producto_id":"af100000-0000-4000-8000-000000000001","cantidad":1}]'::jsonb,null,'prueba-dispositivo')$q$,'P0002','catalogo_no_disponible');
select pg_temp.rechaza($q$select public.registrar_aaah('publica-fixture','con-foto-1','prueba-dispositivo',true)$q$,'P0002','catalogo_no_disponible');
select pg_temp.rechaza($q$select public.ver_solicitud((select codigo from t_pedido))$q$,'P0002','catalogo_no_disponible');
reset role;
set local role authenticated;
select pg_temp.como('ad100000-0000-4000-8000-00000000000d');
select pg_temp.comprobar((select catalogo_estado from public.publicar_mi_catalogo('ae100000-0000-4000-8000-000000000001'))='publicado','vuelve a publicar sin perder nada');
reset role;
select pg_temp.comprobar((select catalogo_publicado_en from public.tiendas where id='ae100000-0000-4000-8000-000000000001')=(select p from t_primera),'volver a publicar conserva el primer momento');
set local role anon;
select pg_temp.comprobar((public.catalogo_publico('publica-fixture')->'tienda'->>'slug')='publica-fixture','el comprador lo vuelve a ver');
reset role;

-- ═══ 5. Pausada y eliminada no se ven; el flujo manual no se pisa ═══
update public.tiendas set estado='pausada' where id='ae100000-0000-4000-8000-000000000001';
set local role anon;
select pg_temp.rechaza($q$select public.catalogo_publico('publica-fixture')$q$,'P0002','catalogo_no_disponible');
reset role;
set local role authenticated;
select pg_temp.como('ad100000-0000-4000-8000-00000000000d');
select pg_temp.comprobar((select catalogo_estado from public.despublicar_mi_catalogo('ae100000-0000-4000-8000-000000000001'))='sin','una pausada se puede dejar de mostrar');
select pg_temp.rechaza($q$select public.publicar_mi_catalogo('ae100000-0000-4000-8000-000000000001')$q$,'P0001','tienda_pausada');
reset role;
update public.tiendas set estado='en_prueba' where id='ae100000-0000-4000-8000-000000000001';
update public.tiendas set catalogo_estado='solicitado' where id='ae100000-0000-4000-8000-000000000001';
set local role authenticated;
select pg_temp.como('ad100000-0000-4000-8000-00000000000d');
select pg_temp.rechaza($q$select public.publicar_mi_catalogo('ae100000-0000-4000-8000-000000000001')$q$,'P0001','catalogo_en_curso');
select pg_temp.rechaza($q$select public.despublicar_mi_catalogo('ae100000-0000-4000-8000-000000000001')$q$,'P0001','catalogo_estado_invalido');
reset role;
select pg_temp.comprobar((select catalogo_estado from public.tiendas where id='ae100000-0000-4000-8000-000000000001')='solicitado','un flujo manual en curso queda como estaba');
update public.tiendas set catalogo_estado='sin' where id='ae100000-0000-4000-8000-000000000001';
update public.tiendas set estado='eliminada', eliminada_en=now() where id='ae100000-0000-4000-8000-000000000001';
set local role authenticated;
select pg_temp.como('ad100000-0000-4000-8000-00000000000d');
-- Una tienda eliminada ya no cuenta como suya para los permisos (mis_tiendas_con_permiso): se rechaza antes de llegar a la función.
select pg_temp.rechaza($q$select public.publicar_mi_catalogo('ae100000-0000-4000-8000-000000000001')$q$,'42501','sin_permiso');
reset role;
-- Una activa publicada por el flujo manual sigue igual.
select pg_temp.comprobar((select catalogo_estado='publicado' from public.tiendas where id='ae100000-0000-4000-8000-000000000003'),'la tienda activa publicada no cambió');

-- ═══ 6. Ver como: no escribe ═══
set local role authenticated;
select pg_temp.como('ad100000-0000-4000-8000-00000000000b');
select pg_temp.comprobar((select (public.admin_ver_como_iniciar('ae100000-0000-4000-8000-000000000002')->>'id') is not null),'abre Ver como sobre su propia tienda');
select pg_temp.rechaza($q$select public.publicar_mi_catalogo('ae100000-0000-4000-8000-000000000002')$q$,'42501','solo_mirar');
reset role;
select pg_temp.comprobar((select catalogo_estado from public.tiendas where id='ae100000-0000-4000-8000-000000000002')='sin','Ver como no publicó nada');
rollback;
