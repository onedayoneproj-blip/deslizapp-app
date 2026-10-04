begin;
do $$ begin
 if not public.opiniones_validas('[]') then raise exception 'vacío'; end if;
 if public.opiniones_validas('{}') or public.opiniones_validas('[{"usuario":"X"}]') then raise exception 'estructura'; end if;
 if not public.opiniones_validas('[{"usuario":"Ana","fuente":"Sitio","url":"https://example.com/opinion","texto":"Bien","estrellas":null,"traducida":false}]') then raise exception 'válida'; end if;
 if public.opiniones_validas('[{"usuario":"Ana","fuente":"Sitio","url":"javascript:alert(1)","texto":"Bien","estrellas":5,"traducida":false}]') then raise exception 'URL'; end if;
 if public.opiniones_validas('[{"usuario":"Ana","fuente":"Sitio","url":"https://example.com","texto":"Bien","estrellas":6,"traducida":false}]') then raise exception 'estrellas'; end if;
 if public.opiniones_validas(jsonb_build_array(jsonb_build_object('usuario','Ana','fuente','Sitio','url','https://example.com','texto',repeat('a',601),'estrellas',1,'traducida',false))) then raise exception 'texto largo'; end if;
 if public.opiniones_validas((select jsonb_agg(jsonb_build_object('usuario','Ana','fuente','Sitio','url','https://example.com','texto','Bien','estrellas',1,'traducida',false)) from generate_series(1,21))) then raise exception 'limite opiniones'; end if;
 if public.opiniones_validas('[{"usuario":"Ana","fuente":"Sitio","url":"https://example.com","texto":"Bien","estrellas":1.5,"traducida":false}]') then raise exception 'estrellas decimales'; end if;
 if public.opiniones_validas('[{"usuario":"Ana","fuente":"Sitio","url":"https://example.com","texto":"Bien","estrellas":5,"traducida":"false"}]') then raise exception 'traducida'; end if;

end $$;
insert into public.tiendas(id,nombre,slug,plan,estado,catalogo_estado) values
 ('10000000-0000-4000-8000-000000000001','Tienda prueba','replay-publico','p20','activa','publicado'),
 ('10000000-0000-4000-8000-000000000002','Privada','replay-privado','p20','activa','sin');
insert into public.productos(tienda_id,nombre,precio,stock,orden,activo) values
 ('10000000-0000-4000-8000-000000000001','Primero',100,20,null,true),
 ('10000000-0000-4000-8000-000000000001','Segundo',100,1,1,true),
 ('10000000-0000-4000-8000-000000000001','Oculto',100,1,0,false),
 ('10000000-0000-4000-8000-000000000002','Ajeno',100,1,null,true);
set local role anon;
do $$ declare c jsonb; begin
 c := public.catalogo_publico('replay-publico');
 if jsonb_array_length(c->'productos')<>2 or c#>>'{productos,0,nombre}'<>'Primero' then raise exception 'orden/aislamiento'; end if;
 if c#>'{tienda,ventas}'<>'null'::jsonb then raise exception 'ventas menores que diez'; end if;
 if c#>'{productos,0,quedan}'<>'null'::jsonb or c#>>'{productos,1,quedan}'<>'1' then raise exception 'stock privado'; end if;
 if not (c->'tienda' ?& array['desde','ventas']) or not (c#>'{productos,0}' ?& array['orden','opiniones']) then raise exception 'contrato'; end if;
 begin perform public.catalogo_publico('replay-privado'); raise exception 'expuso privada'; exception when no_data_found then null; end;
end $$;
rollback;
select 'Pasó: replay completo, opiniones, orden, aislamiento y RPC anon.' as resultado;
