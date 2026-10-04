-- Verificación del catálogo conectado (docs/prompts/catalogo-base.md §7). Todo corre dentro de begin … rollback: no deja nada.
-- Se corre en el proyecto después de aplicar cada migración (la sección de cada una y las anteriores).
-- Simula la sesión de la dueña de Esencias Michel donde hace falta. Cada caso falla con assert o raise exception.
--
--   Migración 1: casos 1 a 3 · Migración 2: casos 4 a 6 · Migraciones 3 y 4: casos 7 a 11.

begin;

-- La sesión se simula en cada caso con set_config + `set local role` (y `reset role` para volver):
--   dueña de Esencias Michel: sub 6ea52b2c-3233-41b7-8097-4fce8e31b222.

-- =====================================================================================================================
-- Migración 1
-- =====================================================================================================================

-- Caso 1. Slugs: todos los productos tienen uno, únicos por tienda; uno nuevo sin slug recibe uno.
do $$
declare
  t uuid := '0753d2a7-469e-43a5-9fc7-51336720db83';
  v_slug text;
begin
  assert not exists (select 1 from public.productos where slug is null or slug = ''), 'caso 1: producto sin slug';
  assert (select count(*) = count(distinct (tienda_id, slug)) from public.productos), 'caso 1: slug repetido';
  perform set_config('request.jwt.claims', '{"sub":"6ea52b2c-3233-41b7-8097-4fce8e31b222","role":"authenticated"}', true);
  perform set_config('request.jwt.claim.sub', '6ea52b2c-3233-41b7-8097-4fce8e31b222', true);
  execute 'set local role authenticated';
  insert into public.productos (tienda_id, nombre, precio) values (t, 'Kiara Pink', 900) returning slug into v_slug;
  assert v_slug ~ '^kiara-pink(-[0-9]+)?$' and v_slug <> (select slug from public.productos where tienda_id = t and nombre = 'Kiara Pink' and precio = 1100),
    'caso 1: slug nuevo ' || v_slug;
  insert into public.productos (tienda_id, nombre, precio) values (t, 'Ñandú Árabe  & Co.', 900) returning slug into v_slug;
  assert v_slug = 'nandu-arabe-co', 'caso 1: slug sin tildes ' || v_slug;
  execute 'reset role';
  raise notice 'caso 1 ok';
end $$;

-- Caso 2. Medios: cambiar fotos actualiza medios y conserva un video; cambiar medios actualiza fotos y foto_retocada;
-- 3 videos o 11 elementos fallan.
do $$
declare
  t uuid := '0753d2a7-469e-43a5-9fc7-51336720db83';
  v_id uuid;
  v_p public.productos;
begin
  perform set_config('request.jwt.claims', '{"sub":"6ea52b2c-3233-41b7-8097-4fce8e31b222","role":"authenticated"}', true);
  perform set_config('request.jwt.claim.sub', '6ea52b2c-3233-41b7-8097-4fce8e31b222', true);
  execute 'set local role authenticated';
  insert into public.productos (tienda_id, nombre, precio, fotos, foto_retocada) values (t, 'Prueba medios', 1000, array['https://x/a.jpg'], true)
    returning * into v_p;
  v_id := v_p.id;
  assert v_p.medios = '[{"tipo":"foto","url":"https://x/a.jpg","retocada":true}]'::jsonb, 'caso 2: medios desde fotos ' || v_p.medios;
  -- medios → fotos
  update public.productos set medios = '[{"tipo":"foto","url":"https://x/b.jpg","retocada":false},{"tipo":"video","url":"https://x/v.mp4","portada":"https://x/v.jpg","duracion_s":12}]'
    where id = v_id returning * into v_p;
  assert v_p.fotos = array['https://x/b.jpg'] and v_p.foto_retocada = false, 'caso 2: fotos desde medios';
  -- fotos → medios, el video se queda en su lugar
  update public.productos set fotos = array['https://x/c.jpg', 'https://x/d.jpg'], foto_retocada = true where id = v_id returning * into v_p;
  assert v_p.medios = '[{"tipo":"foto","url":"https://x/c.jpg","retocada":true},{"tipo":"video","url":"https://x/v.mp4","portada":"https://x/v.jpg","duracion_s":12},{"tipo":"foto","url":"https://x/d.jpg","retocada":false}]'::jsonb,
    'caso 2: video conservado ' || v_p.medios;
  -- con una sola foto, el video que estaba en la posición 2 queda al final
  update public.productos set fotos = array['https://x/c.jpg'] where id = v_id returning * into v_p;
  assert jsonb_array_length(v_p.medios) = 2 and v_p.medios->1->>'tipo' = 'video', 'caso 2: video al final ' || v_p.medios;
  begin
    update public.productos set medios = '[{"tipo":"video","url":"u1","duracion_s":5},{"tipo":"video","url":"u2","duracion_s":5},{"tipo":"video","url":"u3","duracion_s":5}]' where id = v_id;
    raise exception 'caso 2: 3 videos no fallaron';
  exception when check_violation then null;
  end;
  begin
    update public.productos set medios = (select jsonb_agg(jsonb_build_object('tipo', 'foto', 'url', 'u' || g, 'retocada', false)) from generate_series(1, 11) g) where id = v_id;
    raise exception 'caso 2: 11 elementos no fallaron';
  exception when check_violation then null;
  end;
  begin
    update public.productos set medios = '[{"tipo":"video","url":"u1","duracion_s":31}]' where id = v_id;
    raise exception 'caso 2: video de 31 s no falló';
  exception when check_violation then null;
  end;
  execute 'reset role';
  raise notice 'caso 2 ok';
end $$;

-- Caso 3. Detalles: válidos pasan; llave de otro rubro, tipo malo o valor no permitido fallan.
do $$
declare
  t uuid := '0753d2a7-469e-43a5-9fc7-51336720db83';
  v_id uuid;
begin
  perform set_config('request.jwt.claims', '{"sub":"6ea52b2c-3233-41b7-8097-4fce8e31b222","role":"authenticated"}', true);
  perform set_config('request.jwt.claim.sub', '6ea52b2c-3233-41b7-8097-4fce8e31b222', true);
  execute 'set local role authenticated';
  insert into public.productos (tienda_id, nombre, precio, detalles) values (t, 'Prueba detalles', 1000,
    '{"marca":"Lattafa","para":"ella","tamano_ml":100,"concentracion":"edp","familia":"Floral","ocasiones":["Día","Noche"],"notas_salida":["Higo"],"descripcion":"Rico"}')
    returning id into v_id;
  begin
    update public.productos set detalles = '{"corte":"Recto"}' where id = v_id;
    raise exception 'caso 3: llave de otro rubro no falló';
  exception when sqlstate '22023' then null;
  end;
  begin
    update public.productos set detalles = '{"tamano_ml":"100"}' where id = v_id;
    raise exception 'caso 3: tipo malo no falló';
  exception when sqlstate '22023' then null;
  end;
  begin
    update public.productos set detalles = '{"para":"hombre"}' where id = v_id;
    raise exception 'caso 3: valor no permitido no falló';
  exception when sqlstate '22023' then null;
  end;
  begin
    update public.productos set detalles = '{"ocasiones":["Playa"]}' where id = v_id;
    raise exception 'caso 3: ocasión no permitida no falló';
  exception when sqlstate '22023' then null;
  end;
  begin
    update public.productos set opciones = '[{"nombre":"Talla","valores":["S","S"]}]' where id = v_id;
    raise exception 'caso 3: opciones repetidas no fallaron';
  exception when check_violation then null;
  end;
  -- Un servicio suma duracion_min; en un producto, duracion_min no vale
  update public.productos set tipo = 'servicio', detalles = '{"duracion_min":45,"descripcion":"Asesoría"}' where id = v_id;
  begin
    update public.productos set tipo = 'producto', detalles = '{"duracion_min":45}' where id = v_id;
    raise exception 'caso 3: duracion_min en producto no falló';
  exception when sqlstate '22023' then null;
  end;
  execute 'reset role';
  -- Un servicio no lleva stock (el stock solo lo cambian las funciones de inventario; aquí, como postgres)
  begin
    update public.productos set stock = 3 where id = v_id;
    raise exception 'caso 3: servicio con stock no falló';
  exception when check_violation then null;
  end;
  raise notice 'caso 3 ok';
end $$;

-- FIN_MIGRACION_1

-- =====================================================================================================================
-- Migración 2
-- =====================================================================================================================

-- Caso 4. Variantes: guardar_variantes crea 4 (2 × 2); la suma queda en productos.stock; ajustar_stock sin variante falla
-- con usar_variante; con variante ajusta y registra el ajuste.
do $$
declare
  t uuid := '0753d2a7-469e-43a5-9fc7-51336720db83';
  v_id uuid;
  v_var uuid;
  v_n integer;
  v_p public.productos;
begin
  perform set_config('request.jwt.claims', '{"sub":"6ea52b2c-3233-41b7-8097-4fce8e31b222","role":"authenticated"}', true);
  perform set_config('request.jwt.claim.sub', '6ea52b2c-3233-41b7-8097-4fce8e31b222', true);
  execute 'set local role authenticated';
  insert into public.productos (tienda_id, nombre, precio, stock) values (t, 'Prueba variantes', 1000, 0) returning id into v_id;
  select count(*) into v_n from public.guardar_variantes(t, v_id,
    '[{"nombre":"Talla","valores":["S","M"]},{"nombre":"Color","valores":["Negro","Arena"]}]',
    '[{"valores":{"Talla":"S","Color":"Negro"},"stock":1},{"valores":{"Talla":"S","Color":"Arena"},"stock":2},
      {"valores":{"Talla":"M","Color":"Negro"},"stock":3},{"valores":{"Talla":"M","Color":"Arena"},"stock":0,"precio":1200}]');
  assert v_n = 4, 'caso 4: no creó 4 variantes';
  assert (select stock from public.productos where id = v_id) = 6, 'caso 4: la suma no quedó en el producto';
  assert (select count(*) from public.ajustes_inventario where producto_id = v_id and variante_id is not null) = 3, 'caso 4: ajustes de las variantes';
  begin
    perform public.ajustar_stock(t, v_id, 1, 'reposicion', null);
    raise exception 'caso 4: ajustar_stock sin variante no falló';
  exception when sqlstate '22023' then
    assert sqlerrm = 'usar_variante', 'caso 4: error ' || sqlerrm;
  end;
  select id into v_var from public.producto_variantes where producto_id = v_id and valores = '{"Talla":"M","Color":"Arena"}';
  v_p := public.ajustar_stock(t, v_id, 5, 'reposicion', 'llegó', v_var);
  assert v_p.stock = 11, 'caso 4: suma tras ajustar ' || v_p.stock;
  assert exists (select 1 from public.ajustes_inventario where variante_id = v_var and variacion = 5 and stock_anterior = 0 and stock_nuevo = 5),
    'caso 4: no registró el ajuste de la variante';
  -- Volver a guardar con las mismas variantes conserva los id; quitar una sin pedidos la quita
  perform public.guardar_variantes(t, v_id,
    '[{"nombre":"Talla","valores":["S","M"]},{"nombre":"Color","valores":["Negro","Arena"]}]',
    '[{"valores":{"Talla":"S","Color":"Negro"},"stock":1},{"valores":{"Talla":"M","Color":"Arena"},"stock":5}]');
  assert (select count(*) from public.producto_variantes where producto_id = v_id) = 2, 'caso 4: no quitó las variantes';
  assert exists (select 1 from public.producto_variantes where id = v_var), 'caso 4: no conservó el id';
  assert (select stock from public.productos where id = v_id) = 6, 'caso 4: suma tras guardar';
  -- Sin opciones, vuelve a stock simple con la última suma
  perform public.guardar_variantes(t, v_id, '[]', '[]');
  assert (select count(*) from public.producto_variantes where producto_id = v_id) = 0 and (select stock from public.productos where id = v_id) = 6,
    'caso 4: no volvió a stock simple';
  perform public.ajustar_stock(t, v_id, -1, 'dano', null);
  execute 'reset role';
  raise notice 'caso 4 ok';
end $$;

-- Caso 5. Pedido con variante: despachar baja la variante, deshacer la devuelve, sin stock falla nombrando la variante;
-- un item por encargo no toca el stock.
do $$
declare
  t uuid := '0753d2a7-469e-43a5-9fc7-51336720db83';
  v_id uuid;
  v_s uuid;
  v_m uuid;
  v_pedido uuid;
  v_pedido2 uuid;
begin
  perform set_config('request.jwt.claims', '{"sub":"6ea52b2c-3233-41b7-8097-4fce8e31b222","role":"authenticated"}', true);
  perform set_config('request.jwt.claim.sub', '6ea52b2c-3233-41b7-8097-4fce8e31b222', true);
  execute 'set local role authenticated';
  insert into public.productos (tienda_id, nombre, precio, stock) values (t, 'Camisa de lino', 1500, 0) returning id into v_id;
  perform public.guardar_variantes(t, v_id, '[{"nombre":"Talla","valores":["M","L"]},{"nombre":"Color","valores":["Arena"]}]',
    '[{"valores":{"Talla":"M","Color":"Arena"},"stock":2},{"valores":{"Talla":"L","Color":"Arena"},"stock":0}]');
  select id into v_s from public.producto_variantes where producto_id = v_id and valores->>'Talla' = 'M';
  select id into v_m from public.producto_variantes where producto_id = v_id and valores->>'Talla' = 'L';
  -- Un producto con variantes no entra sin variante
  insert into public.pedidos (tienda_id, origen, estado, total) values (t, 'manual', 'por_despachar', 3000) returning id into v_pedido;
  begin
    insert into public.pedido_items (pedido_id, producto_id, nombre_producto, cantidad, precio_unitario) values (v_pedido, v_id, 'Camisa de lino', 1, 1500);
    raise exception 'caso 5: entró sin variante';
  exception when sqlstate '22023' then null;
  end;
  insert into public.pedido_items (pedido_id, producto_id, variante_id, nombre_producto, cantidad, precio_unitario) values (v_pedido, v_id, v_s, 'Camisa de lino', 2, 1500);
  assert (select variante_texto from public.pedido_items where pedido_id = v_pedido) = 'M · Arena', 'caso 5: variante_texto';
  perform public.despachar_pedido(v_pedido);
  assert (select stock from public.producto_variantes where id = v_s) = 0 and (select stock from public.productos where id = v_id) = 0, 'caso 5: despachar no bajó la variante';
  perform public.deshacer_despacho(v_pedido);
  assert (select stock from public.producto_variantes where id = v_s) = 2 and (select stock from public.productos where id = v_id) = 2, 'caso 5: deshacer no la devolvió';
  -- Sin stock: nombra la variante
  insert into public.pedidos (tienda_id, origen, estado, total) values (t, 'manual', 'por_despachar', 1500) returning id into v_pedido2;
  insert into public.pedido_items (pedido_id, producto_id, variante_id, nombre_producto, cantidad, precio_unitario) values (v_pedido2, v_id, v_m, 'Camisa de lino', 1, 1500);
  begin
    perform public.despachar_pedido(v_pedido2);
    raise exception 'caso 5: despachó sin stock';
  exception when sqlstate 'P0001' then
    assert sqlerrm = 'stock_insuficiente: Camisa de lino · L · Arena', 'caso 5: error ' || sqlerrm;
  end;
  -- Por encargo: no toca el stock
  update public.pedido_items set por_encargo = true where pedido_id = v_pedido2;
  perform public.despachar_pedido(v_pedido2);
  assert (select stock from public.producto_variantes where id = v_m) = 0, 'caso 5: el encargo tocó el stock';
  perform public.deshacer_despacho(v_pedido2);
  assert (select stock from public.producto_variantes where id = v_m) = 0, 'caso 5: deshacer el encargo tocó el stock';
  execute 'reset role';
  raise notice 'caso 5 ok';
end $$;

-- Caso 6. Lo de hoy sigue igual: un pedido sin variantes se despacha y deshace como antes; ajustar_stock con los 5 argumentos
-- de hoy funciona; reponer_stock y registrar_venta_pasada con los argumentos de hoy también.
do $$
declare
  t uuid := '0753d2a7-469e-43a5-9fc7-51336720db83';
  v_id uuid;
  v_pedido uuid;
  v_p public.productos;
  v_venta public.pedidos;
begin
  perform set_config('request.jwt.claims', '{"sub":"6ea52b2c-3233-41b7-8097-4fce8e31b222","role":"authenticated"}', true);
  perform set_config('request.jwt.claim.sub', '6ea52b2c-3233-41b7-8097-4fce8e31b222', true);
  execute 'set local role authenticated';
  insert into public.productos (tienda_id, nombre, precio, stock) values (t, 'Prueba simple', 800, 3) returning id into v_id;
  insert into public.pedidos (tienda_id, origen, estado, total) values (t, 'manual', 'por_despachar', 1600) returning id into v_pedido;
  insert into public.pedido_items (pedido_id, producto_id, nombre_producto, cantidad, precio_unitario) values (v_pedido, v_id, 'Prueba simple', 2, 800);
  perform public.despachar_pedido(v_pedido);
  assert (select stock from public.productos where id = v_id) = 1, 'caso 6: despachar';
  perform public.deshacer_despacho(v_pedido);
  assert (select stock from public.productos where id = v_id) = 3, 'caso 6: deshacer';
  v_p := public.ajustar_stock(t, v_id, -1, 'dano', null);
  assert v_p.stock = 2, 'caso 6: ajustar_stock con 5 argumentos';
  perform public.reponer_stock(t, jsonb_build_array(jsonb_build_object('producto_id', v_id, 'cantidad', 4)), null);
  assert (select stock from public.productos where id = v_id) = 6, 'caso 6: reponer_stock';
  v_venta := public.registrar_venta_pasada(t, null, now() - interval '1 day',
    jsonb_build_array(jsonb_build_object('producto_id', v_id, 'cantidad', 1, 'precio_unitario', 700)), null, true);
  assert v_venta.total = 700 and (select stock from public.productos where id = v_id) = 5, 'caso 6: registrar_venta_pasada';
  perform public.editar_pedido(v_pedido, null, jsonb_build_array(jsonb_build_object('producto_id', v_id, 'cantidad', 3, 'precio_unitario', 800)));
  assert (select total from public.pedidos where id = v_pedido) = 2400 and (select count(*) from public.pedido_items where pedido_id = v_pedido) = 1,
    'caso 6: editar_pedido';
  execute 'reset role';
  raise notice 'caso 6 ok';
end $$;

-- FIN_MIGRACION_2

-- =====================================================================================================================
-- Migraciones 3 y 4
-- =====================================================================================================================

-- Caso 7. catalogo_publico('esencias-michel') como anon: solo visibles, sin stock mayor que 3, disponibilidad correcta
-- (Oxana agotado, Mayar quedan 1), con detalles y slugs del HTML. Y precio_con_promo con los casos de tests/casos-precio-promo.json.
do $$
declare
  c jsonb;
  v_productos jsonb;
  v_mayar jsonb;
  v_oxana jsonb;
begin
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  perform set_config('request.jwt.claim.sub', '', true);
  execute 'set local role anon';
  c := public.catalogo_publico('esencias-michel');
  execute 'reset role';
  v_productos := c -> 'productos';
  assert c -> 'tienda' ->> 'slug' = 'esencias-michel', 'caso 7: tienda';
  assert jsonb_array_length(v_productos) = (select count(*) from public.productos p join public.tiendas t on t.id = p.tienda_id where t.slug = 'esencias-michel' and p.activo),
    'caso 7: no trae solo los visibles';
  assert not exists (select 1 from jsonb_array_elements(v_productos) e where e ? 'stock' or (e ->> 'quedan')::integer > 3), 'caso 7: stock exacto';
  assert not exists (select 1 from jsonb_array_elements(v_productos) e where e ->> 'slug' = 'mirsaal-valentine'), 'caso 7: trajo uno oculto';
  select e into v_mayar from jsonb_array_elements(v_productos) e where e ->> 'slug' = 'mayar';
  select e into v_oxana from jsonb_array_elements(v_productos) e where e ->> 'slug' = 'oxana';
  assert v_oxana ->> 'disponibilidad' = 'agotado', 'caso 7: Oxana ' || coalesce(v_oxana::text, 'no está');
  assert v_mayar ->> 'disponibilidad' = 'quedan' and (v_mayar ->> 'quedan')::integer = 1, 'caso 7: Mayar ' || coalesce(v_mayar::text, 'no está');
  assert v_mayar -> 'detalles' ->> 'marca' = 'Lattafa' and v_mayar -> 'detalles' ->> 'para' = 'ella'
    and (v_mayar -> 'detalles' ->> 'tamano_ml')::integer = 100 and v_mayar -> 'detalles' -> 'ocasiones' ? 'Día', 'caso 7: detalles de Mayar';
  assert (select count(*) from jsonb_array_elements(v_productos) e
          where e ->> 'slug' in ('mayar', 'zakat', 'majestic', 'parade', 'urbantoy', 'she', 'oxana', 'wildflower', 'kiara',
                                  'asad-bourbon', 'pistache-absolu', 'yara-rosa', 'delilah')) = 13, 'caso 7: slugs del HTML';
  raise notice 'caso 7 ok';
end $$;

-- CASOS_PRECIO_INICIO
do $casos_precio$
declare
  t uuid := '0753d2a7-469e-43a5-9fc7-51336720db83';
  v_casos jsonb := $casos$[{"caso": "vigente de producto", "precio": 1000, "categoria": "Dulces", "promos": [{"tipo": "producto", "porcentaje": 20, "inicioDias": -5, "finDias": 5}], "esperado": 800}, {"caso": "programada", "precio": 1000, "categoria": "Dulces", "promos": [{"tipo": "producto", "porcentaje": 20, "inicioDias": 2, "finDias": null}], "esperado": 1000}, {"caso": "terminada por fecha", "precio": 1000, "categoria": "Dulces", "promos": [{"tipo": "producto", "porcentaje": 20, "inicioDias": -10, "finDias": -1}], "esperado": 1000}, {"caso": "terminada a mano", "precio": 1000, "categoria": "Dulces", "promos": [{"tipo": "producto", "porcentaje": 20, "inicioDias": -10, "finDias": null, "estado": "terminada"}], "esperado": 1000}, {"caso": "pausada", "precio": 1000, "categoria": "Dulces", "promos": [{"tipo": "producto", "porcentaje": 20, "inicioDias": -10, "finDias": null, "pausada": true}], "esperado": 1000}, {"caso": "dos a la vez: gana la mayor", "precio": 1000, "categoria": "Dulces", "promos": [{"tipo": "producto", "porcentaje": 10, "inicioDias": -3, "finDias": null}, {"tipo": "coleccion", "coleccion": "Dulces", "porcentaje": 25, "inicioDias": -3, "finDias": null}], "esperado": 750}, {"caso": "colección, redondeo al peso", "precio": 1250, "categoria": "Florales", "promos": [{"tipo": "coleccion", "coleccion": "Florales", "porcentaje": 15, "inicioDias": -1, "finDias": 30}], "esperado": 1062}, {"caso": "colección de otra categoría", "precio": 1250, "categoria": "Florales", "promos": [{"tipo": "coleccion", "coleccion": "Dulces", "porcentaje": 15, "inicioDias": -1, "finDias": null}], "esperado": 1250}, {"caso": "promo de otro producto", "precio": 900, "categoria": "Dulces", "promos": [{"tipo": "producto", "otroProducto": true, "porcentaje": 30, "inicioDias": -1, "finDias": null}], "esperado": 900}, {"caso": "un código no cambia el precio", "precio": 900, "categoria": "Dulces", "promos": [{"tipo": "codigo", "codigo": "LUNA20", "porcentaje": 20, "inicioDias": -1, "finDias": null}], "esperado": 900}]$casos$;
  c jsonb;
  pr jsonb;
  v_id uuid;
  v_otro uuid;
  v_precio integer;
begin
  for c in select * from jsonb_array_elements(v_casos) loop
    insert into public.productos (tienda_id, nombre, precio, categoria, activo) values (t, 'Precio ' || (c ->> 'caso'), (c ->> 'precio')::integer, c ->> 'categoria', false)
      returning id into v_id;
    insert into public.productos (tienda_id, nombre, precio, categoria, activo) values (t, 'Otro ' || (c ->> 'caso'), 1, 'Nada', false) returning id into v_otro;
    for pr in select * from jsonb_array_elements(c -> 'promos') loop
      insert into public.promos (tienda_id, tipo, nombre, valor_porcentaje, codigo, coleccion, producto_id, fecha_inicio, fecha_fin, estado, pausada)
      values (t, pr ->> 'tipo', 'Prueba ' || (c ->> 'caso'), (pr ->> 'porcentaje')::integer,
        case when pr ->> 'tipo' = 'codigo' then (pr ->> 'codigo') || upper(substr(md5(random()::text), 1, 4)) end,
        case when pr ->> 'tipo' = 'coleccion' then pr ->> 'coleccion' end,
        case when pr ->> 'tipo' = 'producto' then (case when (pr ->> 'otroProducto')::boolean then v_otro else v_id end) end,
        now() + make_interval(days => (pr ->> 'inicioDias')::integer),
        case when pr ->> 'finDias' is null then null else now() + make_interval(days => (pr ->> 'finDias')::integer) end,
        coalesce(pr ->> 'estado', 'activa'), coalesce((pr ->> 'pausada')::boolean, false));
    end loop;
    v_precio := public.precio_con_promo(v_id, (c ->> 'precio')::integer, now());
    assert v_precio = (c ->> 'esperado')::integer, format('caso 7 (precio): %s dio %s', c ->> 'caso', v_precio);
    -- Cada caso aparte: sus promos de colección no deben tocar al siguiente
    update public.promos set estado = 'terminada', fecha_fin = now() - interval '1 day' where nombre = 'Prueba ' || (c ->> 'caso') and tienda_id = t
      and fecha_inicio <= now() - interval '1 day';
    update public.promos set pausada = true where nombre = 'Prueba ' || (c ->> 'caso') and tienda_id = t;
  end loop;
  raise notice 'caso 7 (precios) ok';
end $casos_precio$;
-- CASOS_PRECIO_FIN

-- Caso 8. Solicitud como anon: se crea y cobra lo que dice la base; rechaza un agotado, un código con cliente_id y el límite por
-- dispositivo; ver_solicitud dice enviado; registrar_solicitud con un cliente nuevo crea pedido y cliente y pasa a confirmado;
-- quitar todos → pedido_vacio.
do $$
declare
  t uuid := '0753d2a7-469e-43a5-9fc7-51336720db83';
  v_mayar public.productos;
  v_oxana uuid;
  r jsonb;
  v_codigo text;
  v_solicitud uuid;
  v_cliente uuid;
  v_pedido public.pedidos;
  i integer;
  v_esperado integer;
begin
  select * into v_mayar from public.productos where tienda_id = t and slug = 'mayar';
  v_esperado := public.precio_con_promo(v_mayar.id, v_mayar.precio, now());
  select id into v_oxana from public.productos where tienda_id = t and slug = 'oxana';
  -- Un código personal (con cliente_id) no vale en el catálogo
  insert into public.clientes (tienda_id, nombre, origen) values (t, 'Prueba código', 'manual') returning id into v_cliente;
  insert into public.promos (tienda_id, tipo, nombre, valor_porcentaje, codigo, fecha_inicio, cliente_id)
  values (t, 'codigo', 'Solo para uno', 10, 'PRUEBAUNO', now() - interval '1 day', v_cliente);
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  perform set_config('request.jwt.claim.sub', '', true);
  execute 'set local role anon';
  r := public.crear_solicitud_pedido('esencias-michel',
    jsonb_build_array(jsonb_build_object('producto_id', v_mayar.id, 'cantidad', 1, 'precio_unitario', 1)), null, 'disp-prueba-8');
  v_codigo := r ->> 'codigo';
  assert v_codigo ~ '^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{10}$', 'caso 8: código ' || coalesce(v_codigo, 'null');
  assert (r ->> 'total')::integer = v_esperado, 'caso 8: cobró ' || (r ->> 'total');
  begin
    perform public.crear_solicitud_pedido('esencias-michel', jsonb_build_array(jsonb_build_object('producto_id', v_oxana, 'cantidad', 1)), null, 'disp-prueba-8');
    raise exception 'caso 8: aceptó un agotado';
  exception when sqlstate 'P0001' then
    assert sqlerrm like 'producto_no_disponible%', 'caso 8: error ' || sqlerrm;
  end;
  begin
    perform public.crear_solicitud_pedido('esencias-michel', jsonb_build_array(jsonb_build_object('producto_id', v_mayar.id, 'cantidad', 1)), 'pruebauno', 'disp-prueba-8');
    raise exception 'caso 8: aceptó un código con cliente_id';
  exception when sqlstate '22023' then
    assert sqlerrm = 'codigo_no_valido', 'caso 8: error ' || sqlerrm;
  end;
  r := public.ver_solicitud(v_codigo);
  assert r ->> 'estado' = 'enviado' and not (r ->> 'es_mi_tienda')::boolean and r ->> 'id' is null, 'caso 8: ver_solicitud ' || r::text;
  -- Límite: 10 por dispositivo por hora
  for i in 1 .. 9 loop
    perform public.crear_solicitud_pedido('esencias-michel', jsonb_build_array(jsonb_build_object('producto_id', v_mayar.id, 'cantidad', 1)), null, 'disp-prueba-8');
  end loop;
  begin
    perform public.crear_solicitud_pedido('esencias-michel', jsonb_build_array(jsonb_build_object('producto_id', v_mayar.id, 'cantidad', 1)), null, 'disp-prueba-8');
    raise exception 'caso 8: no aplicó el límite';
  exception when sqlstate '54000' then null;
  end;
  execute 'reset role';
  -- La tienda la registra con un cliente nuevo
  perform set_config('request.jwt.claims', '{"sub":"6ea52b2c-3233-41b7-8097-4fce8e31b222","role":"authenticated"}', true);
  perform set_config('request.jwt.claim.sub', '6ea52b2c-3233-41b7-8097-4fce8e31b222', true);
  execute 'set local role authenticated';
  select id into v_solicitud from public.solicitudes_pedido where codigo = v_codigo;
  assert v_solicitud is not null, 'caso 8: la tienda no ve su solicitud';
  v_pedido := public.registrar_solicitud(v_solicitud, null, '{"nombre":"Cliente del catálogo","telefono":"809-555-0199"}', null, null);
  assert v_pedido.origen = 'catalogo' and v_pedido.estado = 'nuevo' and v_pedido.cliente_id is not null, 'caso 8: pedido';
  assert exists (select 1 from public.clientes where id = v_pedido.cliente_id and origen = 'catalogo' and telefono = '+18095550199'), 'caso 8: cliente';
  r := public.ver_solicitud(v_codigo);
  assert r ->> 'estado' = 'confirmado' and (r ->> 'es_mi_tienda')::boolean, 'caso 8: confirmado ' || r::text;
  -- Quitar todos → pedido_vacio
  select id into v_solicitud from public.solicitudes_pedido where dispositivo = 'disp-prueba-8' and pedido_id is null limit 1;
  begin
    perform public.registrar_solicitud(v_solicitud, v_pedido.cliente_id, null, array[v_mayar.id], null);
    raise exception 'caso 8: registró un pedido vacío';
  exception when sqlstate 'P0001' then
    assert sqlerrm = 'pedido_vacio', 'caso 8: error ' || sqlerrm;
  end;
  execute 'reset role';
  raise notice 'caso 8 ok';
end $$;

-- Caso 9. Aaah: encender suma 1 a likes, apagar resta 1, repetir no duplica.
do $$
declare
  v_antes integer;
  v_n integer;
begin
  select likes into v_antes from public.productos p join public.tiendas t on t.id = p.tienda_id where t.slug = 'esencias-michel' and p.slug = 'mayar';
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  perform set_config('request.jwt.claim.sub', '', true);
  execute 'set local role anon';
  v_n := public.registrar_aaah('esencias-michel', 'mayar', 'disp-prueba-9', true);
  assert v_n = v_antes + 1, 'caso 9: no sumó';
  v_n := public.registrar_aaah('esencias-michel', 'mayar', 'disp-prueba-9', true);
  assert v_n = v_antes + 1, 'caso 9: duplicó';
  v_n := public.registrar_aaah('esencias-michel', 'mayar', 'disp-prueba-9', false);
  assert v_n = v_antes, 'caso 9: no restó';
  execute 'reset role';
  raise notice 'caso 9 ok';
end $$;

-- Caso 10. Avísame: en un agotado se crea, en uno con stock falla, repetido no duplica, marcar_avisado lo cierra.
do $$
declare
  v_ids uuid[];
  v_n integer;
begin
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  perform set_config('request.jwt.claim.sub', '', true);
  execute 'set local role anon';
  perform public.pedir_aviso('esencias-michel', 'oxana', null, '809 555 0123', 'Ana', 'disp-prueba-10');
  perform public.pedir_aviso('esencias-michel', 'oxana', null, '+1 (809) 555-0123', null, 'disp-prueba-10');
  begin
    perform public.pedir_aviso('esencias-michel', 'mayar', null, '8095550123', null, 'disp-prueba-10');
    raise exception 'caso 10: aceptó uno con stock';
  exception when sqlstate 'P0001' then
    assert sqlerrm = 'aviso_no_disponible', 'caso 10: error ' || sqlerrm;
  end;
  begin
    perform public.pedir_aviso('esencias-michel', 'oxana', null, '555 0123', null, 'disp-prueba-10');
    raise exception 'caso 10: aceptó un teléfono malo';
  exception when sqlstate '22023' then null;
  end;
  execute 'reset role';
  select array_agg(id) into v_ids from public.avisos_llegada where dispositivo = 'disp-prueba-10';
  assert array_length(v_ids, 1) = 1, 'caso 10: duplicó el aviso';
  assert (select telefono from public.avisos_llegada where id = v_ids[1]) = '18095550123', 'caso 10: teléfono';
  perform set_config('request.jwt.claims', '{"sub":"6ea52b2c-3233-41b7-8097-4fce8e31b222","role":"authenticated"}', true);
  perform set_config('request.jwt.claim.sub', '6ea52b2c-3233-41b7-8097-4fce8e31b222', true);
  execute 'set local role authenticated';
  v_n := public.marcar_avisado(v_ids);
  assert v_n = 1 and (select avisado_en is not null from public.avisos_llegada where id = v_ids[1]), 'caso 10: marcar_avisado';
  execute 'reset role';
  raise notice 'caso 10 ok';
end $$;

-- Caso 11. Seguridad: anon no lee ninguna tabla nueva ni llama registrar_solicitud, guardar_variantes ni marcar_avisado;
-- un usuario que no es de la tienda tampoco puede.
do $$
declare
  t uuid := '0753d2a7-469e-43a5-9fc7-51336720db83';
  v_tabla text;
  v_solicitud uuid;
  v_aviso uuid;
  v_producto uuid;
  v_n integer;
begin
  select id into v_solicitud from public.solicitudes_pedido where tienda_id = t limit 1;
  select id into v_aviso from public.avisos_llegada where tienda_id = t limit 1;
  select id into v_producto from public.productos where tienda_id = t and slug = 'mayar';
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  perform set_config('request.jwt.claim.sub', '', true);
  execute 'set local role anon';
  foreach v_tabla in array array['producto_variantes', 'solicitudes_pedido', 'avisos_llegada'] loop
    begin
      execute format('select count(*) from public.%I', v_tabla) into v_n;
      raise exception 'caso 11: anon leyó %', v_tabla;
    exception when insufficient_privilege then null;
    end;
  end loop;
  begin
    perform public.registrar_solicitud(v_solicitud, null, '{"nombre":"X"}', null, null);
    raise exception 'caso 11: anon llamó registrar_solicitud';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.guardar_variantes(t, v_producto, '[]', '[]');
    raise exception 'caso 11: anon llamó guardar_variantes';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.marcar_avisado(array[v_aviso]);
    raise exception 'caso 11: anon llamó marcar_avisado';
  exception when insufficient_privilege then null;
  end;
  execute 'reset role';
  -- Otro usuario (no es de la tienda)
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000aa","role":"authenticated"}', true);
  perform set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-0000000000aa', true);
  execute 'set local role authenticated';
  assert (select count(*) from public.solicitudes_pedido) = 0 and (select count(*) from public.avisos_llegada) = 0
    and (select count(*) from public.producto_variantes) = 0, 'caso 11: otro usuario ve datos de la tienda';
  begin
    perform public.guardar_variantes(t, v_producto, '[]', '[]');
    raise exception 'caso 11: otro usuario llamó guardar_variantes';
  exception when sqlstate '42501' then null;
  end;
  begin
    perform public.registrar_solicitud(v_solicitud, null, '{"nombre":"X"}', null, null);
    raise exception 'caso 11: otro usuario registró la solicitud';
  exception when sqlstate 'P0002' then null;
  end;
  v_n := public.marcar_avisado(array[v_aviso]);
  assert v_n = 0, 'caso 11: otro usuario marcó un aviso';
  execute 'reset role';
  raise notice 'caso 11 ok';
end $$;

-- FIN_MIGRACION_4



rollback;
