-- Prueba de registrar_evento_publico y admin_eventos_publicos (docs/18-medicion.md). Corre sobre el replay completo
-- (scripts/probar-admin-replay.sh) o sobre una base con soy_admin() de pega; todo en una transacción que se deshace.
begin;
do $$
declare ok boolean; n int; r record;
begin
  -- Evento válido: se guarda, con la ruta limpia.
  ok := public.registrar_evento_publico('inicio_visto', '/?utm_source=instagram#x', 'instagram');
  if not ok then raise exception 'no guardó el evento válido'; end if;
  select * into r from public.eventos_publicos order by id desc limit 1;
  if r.ruta <> '/' or r.origen <> 'instagram' or r.paso is not null or r.tienda_slug is not null then raise exception 'fila rara: %', r; end if;

  -- Fuera de la lista: rechazado, y nada se guarda.
  begin
    perform public.registrar_evento_publico('borrar_todo', '/');
    raise exception 'aceptó un evento fuera de la lista';
  exception when sqlstate '22023' then null; end;
  begin
    perform public.registrar_evento_publico(null, '/');
    raise exception 'aceptó un evento nulo';
  exception when sqlstate '22023' then null; end;
  select count(*) into n from public.eventos_publicos where evento = 'borrar_todo';
  if n <> 0 then raise exception 'guardó el evento fuera de la lista'; end if;

  -- Textos largos: la ruta se recorta a 120; paso y slug fuera de forma o de largo se descartan; origen raro → otro.
  perform public.registrar_evento_publico('catalogo_visto', '/tienda/' || repeat('a', 500), 'facebook', repeat('p', 41), repeat('s', 61));
  select * into r from public.eventos_publicos order by id desc limit 1;
  if char_length(r.ruta) <> 120 then raise exception 'ruta sin recortar: %', char_length(r.ruta); end if;
  if r.origen <> 'otro' or r.paso is not null or r.tienda_slug is not null then raise exception 'textos largos aceptados: %', r; end if;
  perform public.registrar_evento_publico('conoce_paso', '/conoce', 'directo', 'tienda', 'esencias-michel');
  select * into r from public.eventos_publicos order by id desc limit 1;
  if r.paso <> 'tienda' or r.tienda_slug <> 'esencias-michel' then raise exception 'perdió paso o slug: %', r; end if;

  -- Un código de pedido no se guarda.
  perform public.registrar_evento_publico('catalogo_visto', '/pedido/ABC123?x=1');
  select * into r from public.eventos_publicos order by id desc limit 1;
  if r.ruta <> '/pedido/*' then raise exception 'guardó el código de pedido: %', r.ruta; end if;

  -- Ritmo: pasados 600 en el minuto, se descarta en silencio.
  insert into public.eventos_publicos (evento, ruta, origen) select 'inicio_visto', '/', 'directo' from generate_series(1, 600);
  ok := public.registrar_evento_publico('inicio_visto', '/');
  if ok then raise exception 'no limitó el ritmo'; end if;
end $$;

-- Permisos: anon y authenticated no leen ni escriben la tabla, pero anon sí puede llamar a registrar.
set local role anon;
do $$
begin
  begin perform 1 from public.eventos_publicos limit 1; raise exception 'anon leyó la tabla';
  exception when insufficient_privilege then null; end;
  begin insert into public.eventos_publicos (evento, ruta, origen) values ('inicio_visto', '/', 'directo'); raise exception 'anon insertó directo';
  exception when insufficient_privilege then null; end;
  begin perform public.admin_eventos_publicos(); raise exception 'anon llamó a la lectura de admin';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
set local role authenticated;
do $$
begin
  begin perform 1 from public.eventos_publicos limit 1; raise exception 'authenticated leyó la tabla';
  exception when insufficient_privilege then null; end;
  begin perform * from public.admin_eventos_publicos(); raise exception 'un no-admin leyó los conteos';
  exception when sqlstate '42501' then null; end;
end $$;
reset role;
rollback;
select 'eventos_publicos: ok' as resultado;
