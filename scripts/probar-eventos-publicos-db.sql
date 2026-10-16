-- Prueba de registrar_evento_publico y admin_eventos_publicos (docs/18-medicion.md). Corre sobre el replay completo
-- (scripts/probar-admin-replay.sh) o sobre una base con soy_admin() de pega; todo en una transacción que se deshace.
begin;
do $$
declare ok boolean; n int; r record; v_pub text;
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

  -- Textos largos: paso y slug fuera de forma o de largo se descartan; origen raro → otro; ruta que no encaja → otra.
  perform public.registrar_evento_publico('catalogo_visto', '/tienda/' || repeat('a', 500), 'facebook', repeat('p', 41), repeat('s', 61));
  select * into r from public.eventos_publicos order by id desc limit 1;
  if r.ruta <> 'otra' then raise exception 'ruta larga aceptada: %', r.ruta; end if;
  if r.origen <> 'otro' or r.paso is not null or r.tienda_slug is not null then raise exception 'textos largos aceptados: %', r; end if;
  perform public.registrar_evento_publico('conoce_paso', '/conoce', 'directo', 'tienda', 'no-existe-esta-tienda');
  select * into r from public.eventos_publicos order by id desc limit 1;
  if r.paso <> 'tienda' or r.tienda_slug is not null then raise exception 'paso mal o slug inexistente guardado: %', r; end if;

  -- Ruta: lista blanca, minúsculas, sin barra final ni consulta; el código de pedido no se guarda; una tienda inexistente se colapsa.
  perform public.registrar_evento_publico('inicio_visto', '/Conoce/?utm_source=x#y');
  select * into r from public.eventos_publicos order by id desc limit 1;
  if r.ruta <> '/conoce' then raise exception 'ruta no normalizada: %', r.ruta; end if;
  perform public.registrar_evento_publico('inicio_visto', '/admin/algo');
  select * into r from public.eventos_publicos order by id desc limit 1;
  if r.ruta <> 'otra' then raise exception 'ruta fuera de la lista guardada: %', r.ruta; end if;
  perform public.registrar_evento_publico('catalogo_visto', '/pedido/ABC123?x=1');
  select * into r from public.eventos_publicos order by id desc limit 1;
  if r.ruta <> '/pedido/*' then raise exception 'guardó el código de pedido: %', r.ruta; end if;
  perform public.registrar_evento_publico('catalogo_visto', '/tienda/no-existe-esta-tienda', 'directo', null, 'no-existe-esta-tienda');
  select * into r from public.eventos_publicos order by id desc limit 1;
  if r.ruta <> '/tienda/*' or r.tienda_slug is not null then raise exception 'tienda inexistente guardada: %', r; end if;

  -- Una tienda con catálogo publicado sí se guarda (si el replay trae alguna).
  select t.slug into v_pub from public.tiendas t where t.estado in ('activa', 'en_prueba') and t.catalogo_estado = 'publicado' limit 1;
  if v_pub is not null then
    perform public.registrar_evento_publico('catalogo_visto', '/Tienda/' || upper(v_pub), 'instagram', null, upper(v_pub));
    select * into r from public.eventos_publicos order by id desc limit 1;
    if r.ruta <> '/tienda/' || v_pub or r.tienda_slug <> v_pub then raise exception 'tienda publicada mal guardada: %', r; end if;
  else
    raise notice 'sin tienda publicada en esta base: no se probó el caso positivo del slug';
  end if;

  -- Ritmo por evento: 120 por minuto (conoce_paso, 600). Un evento agotado no afecta a los demás.
  for i in 1..120 loop
    if not public.registrar_evento_publico('cta_demo', '/') then raise exception 'cortó antes de los 120 (%)', i; end if;
  end loop;
  if public.registrar_evento_publico('cta_demo', '/') then raise exception 'no limitó cta_demo a 120'; end if;
  -- El contador sigue sumando aunque se pase del tope, y lo que se pasa no se inserta.
  perform public.registrar_evento_publico('cta_demo', '/');
  perform public.registrar_evento_publico('cta_demo', '/');
  select total into n from public.eventos_publicos_ritmo where evento = 'cta_demo' order by minuto desc limit 1;
  if n <> 123 then raise exception 'el contador dejó de sumar tras el tope: %', n; end if;
  select count(*) into n from public.eventos_publicos where evento = 'cta_demo';
  if n <> 120 then raise exception 'se insertaron eventos pasados del tope: %', n; end if;
  if not public.registrar_evento_publico('cta_quiero_vender', '/') then raise exception 'cta_demo agotó el cupo de otro evento'; end if;
  for i in 1..599 loop
    if not public.registrar_evento_publico('conoce_paso', '/conoce', 'directo', 'hola') then raise exception 'conoce_paso cortó antes de los 600 (%)', i; end if;
  end loop;
  if public.registrar_evento_publico('conoce_paso', '/conoce', 'directo', 'hola') then raise exception 'no limitó conoce_paso a 600'; end if;

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
  begin perform public.admin_eventos_descartados(); raise exception 'anon llamó a descartados';
  exception when insufficient_privilege then null; end;
  begin perform public.tope_evento_publico('cta_demo'); raise exception 'anon llamó a tope';
  exception when insufficient_privilege then null; end;
  begin perform public.purgar_eventos_publicos(); raise exception 'anon llamó a purgar';
  exception when insufficient_privilege then null; end;
  begin perform 1 from public.eventos_publicos_ritmo limit 1; raise exception 'anon leyó los contadores';
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
  begin perform * from public.admin_eventos_descartados(); raise exception 'un no-admin leyó los descartados';
  exception when sqlstate '42501' then null; end;
  begin perform public.purgar_eventos_publicos(); raise exception 'un no-admin purgó';
  exception when sqlstate '42501' then null; end;
end $$;
reset role;
rollback;
select 'eventos_publicos: ok' as resultado;
