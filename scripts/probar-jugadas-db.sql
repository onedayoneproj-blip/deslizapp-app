-- Prueba de la migración 20261003200000_jugadas_codigos_y_envios (crear_codigo_cliente y registrar_envio_jugada).
-- Se puede correr en producción: TODO termina en una excepción final ("RESULTADO …"), así que nada queda guardado.
-- Simula la sesión de la dueña de Esencias Michel. Resultado esperado (3 de oct de 2026):
--   1) LEWIS10 · 2) LEWIS10xx · 3) codigo_en_uso · 4) codigo_formato_invalido · 5) VERANO15 · 6, 7, 9) ok ·
--   8) envio_productos_invalidos · 10) envio_cliente_no_encontrado · 11) codigo_cliente_no_encontrado ·
--   12, 13) permission denied · 14) anon lee 0 envíos.
do $$
declare
  t uuid := '0753d2a7-469e-43a5-9fc7-51336720db83';   -- Esencias Michel
  c uuid := 'd8ca99ad-d9c4-4c00-a834-6a457d76b715';   -- cliente "Lewis Bautista"
  r text := '';
  p1 public.promos; p2 public.promos;
  e public.jugada_envios;
begin
  perform set_config('request.jwt.claims', json_build_object('sub','6ea52b2c-3233-41b7-8097-4fce8e31b222','role','authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', '6ea52b2c-3233-41b7-8097-4fce8e31b222', true);
  execute 'set local role authenticated';

  p1 := public.crear_codigo_cliente(t, c, 10);
  r := r || '1) ' || p1.codigo || ' | ';
  p2 := public.crear_codigo_cliente(t, c, 10);
  r := r || '2) ' || p2.codigo || ' | ';
  begin perform public.crear_codigo_cliente(t, c, 10, 14, p1.codigo); r := r || '3) SIN ERROR | ';
  exception when others then r := r || '3) ' || sqlerrm || ' | '; end;
  begin perform public.crear_codigo_cliente(t, c, 10, 14, 'ab'); r := r || '4) SIN ERROR | ';
  exception when others then r := r || '4) ' || sqlerrm || ' | '; end;
  begin p2 := public.crear_codigo_cliente(t, c, 15, 7, 'verano15'); r := r || '5) ' || p2.codigo || ' | ';
  exception when others then r := r || '5) ' || sqlerrm || ' | '; end;
  begin e := public.registrar_envio_jugada(t, c, 'segundo', 'saludo'); r := r || '6) ok | ';
  exception when others then r := r || '6) ' || sqlerrm || ' | '; end;
  begin e := public.registrar_envio_jugada(t, c, 'segundo', 'codigo', p1.id); r := r || '7) ok | ';
  exception when others then r := r || '7) ' || sqlerrm || ' | '; end;
  begin
    perform public.registrar_envio_jugada(t, c, 'segundo', 'productos', null, (select array_agg(id) from (select id from public.productos where tienda_id = t limit 4) x));
    r := r || '8) SIN ERROR | ';
  exception when others then r := r || '8) ' || sqlerrm || ' | '; end;
  begin
    perform public.registrar_envio_jugada(t, c, 'segundo', 'productos', null, (select array_agg(id) from (select id from public.productos where tienda_id = t limit 3) x));
    r := r || '9) ok | ';
  exception when others then r := r || '9) ' || sqlerrm || ' | '; end;
  begin perform public.registrar_envio_jugada(t, gen_random_uuid(), 'segundo', 'saludo'); r := r || '10) SIN ERROR | ';
  exception when others then r := r || '10) ' || sqlerrm || ' | '; end;
  begin perform public.crear_codigo_cliente(t, gen_random_uuid(), 10); r := r || '11) SIN ERROR | ';
  exception when others then r := r || '11) ' || sqlerrm || ' | '; end;

  execute 'set local role anon';
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  perform set_config('request.jwt.claim.sub', '', true);
  begin perform public.crear_codigo_cliente(t, c, 10); r := r || '12) SIN ERROR | ';
  exception when others then r := r || '12) ' || sqlerrm || ' | '; end;
  begin perform public.registrar_envio_jugada(t, c, 'segundo', 'saludo'); r := r || '13) SIN ERROR | ';
  exception when others then r := r || '13) ' || sqlerrm || ' | '; end;
  r := r || '14) anon lee ' || (select count(*) from public.jugada_envios) || ' envíos';

  raise exception 'RESULTADO (se deshace todo): %', r;
end $$;
