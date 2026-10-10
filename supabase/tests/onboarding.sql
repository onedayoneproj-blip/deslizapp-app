-- Verificación del onboarding, parte 1 (docs/17-onboarding.md). Todo corre dentro de begin … rollback: no deja nada.
-- Se corre tal cual contra la base (migraciones 20261009232614 y 20261009232947 aplicadas).
-- Crea una cuenta y un enlace de tienda nueva de mentira (solo dentro de la transacción). Cada caso falla con assert.

begin;

-- Cuenta de prueba y un enlace de tienda nueva ya reclamado y aprobado.
insert into auth.users (id, email, aud, role)
values ('00000000-0000-4000-8000-0000000000a1', 'onboarding-prueba@example.com', 'authenticated', 'authenticated');
insert into public.enlaces_invitacion (id, tipo, creado_por, codigo_hash, estado, reclamado_por, reclamado_en)
values ('00000000-0000-4000-8000-0000000000e1', 'tienda_nueva', '00000000-0000-4000-8000-0000000000a1', encode(sha256('prueba-onboarding'), 'hex'),
        'aprobado', '00000000-0000-4000-8000-0000000000a1', now());

-- Caso 1. Relleno: las tiendas de antes lo tienen visto; la de ensayo y Soft Era quedan vacías.
do $$
begin
  assert not exists (select 1 from public.tiendas where jsonb_typeof(onboarding) <> 'object'), 'caso 1: onboarding no es objeto';
  assert not exists (select 1 from public.tiendas where slug in ('tienda-de-ensayo', 'soft-era') and onboarding <> '{}'::jsonb),
    'caso 1: ensayo o soft-era con marcas';
  assert not exists (select 1 from public.tiendas where slug not in ('tienda-de-ensayo', 'soft-era')
    and not (onboarding ? 'checklist_cerrado_en' and onboarding ? 'intro_vista_en')), 'caso 1: tienda vieja sin marcas';
  raise notice 'caso 1 ok';
end $$;

-- Caso 2. vista_slug: igual al de crear_tienda_para, con -2 si ya existe; nulo si el nombre no sirve; anon no puede.
do $$
declare v text;
begin
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000a1","role":"authenticated"}', true);
  execute 'set local role authenticated';
  assert public.vista_slug('Ñandú Árabe  & Co.') = 'nandu-arabe-co', 'caso 2: sin tildes';
  assert public.vista_slug('Esencias Michel') = 'esencias-michel-2', 'caso 2: ya existe → -2';
  assert public.vista_slug('   ') is null, 'caso 2: vacío';
  assert public.vista_slug(repeat('a', 81)) is null, 'caso 2: largo';
  assert public.vista_slug('!!!') = 'tienda', 'caso 2: sin letras';
  v := public.vista_slug(repeat('abcd ', 16));
  assert v !~ '-$' and char_length(v) <= 50, 'caso 2: corte limpio ' || v;
  execute 'reset role';
  execute 'set local role anon';
  begin
    perform public.vista_slug('x');
    assert false, 'caso 2: anon pudo';
  exception when insufficient_privilege then null;
  end;
  execute 'reset role';
  raise notice 'caso 2 ok';
end $$;

-- Caso 3. crear_mi_tienda_completa: valida y crea todo junto; el enlace queda usado y no sirve dos veces.
do $$
declare t public.tiendas; e public.enlaces_invitacion; previo text;
begin
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000a1","role":"authenticated"}', true);
  execute 'set local role authenticated';
  begin perform public.crear_mi_tienda_completa('00000000-0000-4000-8000-0000000000e1', 'Prueba', '{}', '8496503269', 'Ana');
    assert false, 'caso 3: sin rubros'; exception when sqlstate '22023' then null; end;
  begin perform public.crear_mi_tienda_completa('00000000-0000-4000-8000-0000000000e1', 'Prueba', '{ropa,ropa}', '8496503269', 'Ana');
    assert false, 'caso 3: rubro repetido'; exception when sqlstate '22023' then null; end;
  begin perform public.crear_mi_tienda_completa('00000000-0000-4000-8000-0000000000e1', 'Prueba', '{zapatos}', '8496503269', 'Ana');
    assert false, 'caso 3: rubro fuera de lista'; exception when sqlstate '22023' then null; end;
  begin perform public.crear_mi_tienda_completa('00000000-0000-4000-8000-0000000000e1', 'Prueba', '{ropa}', '849-650', 'Ana');
    assert false, 'caso 3: whatsapp'; exception when sqlstate '22023' then null; end;
  begin perform public.crear_mi_tienda_completa('00000000-0000-4000-8000-0000000000e1', 'Prueba', '{ropa}', '8496503269', '  ');
    assert false, 'caso 3: vendedora vacía'; exception when sqlstate '22023' then null; end;
  begin perform public.crear_mi_tienda_completa('00000000-0000-4000-8000-0000000000e1', 'Prueba', '{ropa}', '8496503269', repeat('a', 41));
    assert false, 'caso 3: vendedora larga'; exception when sqlstate '22023' then null; end;
  begin perform public.crear_mi_tienda_completa('00000000-0000-4000-8000-0000000000e1', ' ', '{ropa}', '8496503269', 'Ana');
    assert false, 'caso 3: nombre vacío'; exception when sqlstate '22023' then null; end;
  begin perform public.crear_mi_tienda_completa(gen_random_uuid(), 'Prueba', '{ropa}', '8496503269', 'Ana');
    assert false, 'caso 3: enlace ajeno'; exception when sqlstate 'P0001' then null; end;

  previo := public.vista_slug('Prueba Onboarding');
  t := public.crear_mi_tienda_completa('00000000-0000-4000-8000-0000000000e1', ' Prueba Onboarding ', '{perfumes,ropa,general}', '18496503269', ' Ana ');
  assert t.slug = previo, 'caso 3: slug distinto de la vista ' || t.slug || ' / ' || previo;
  assert t.nombre = 'Prueba Onboarding' and t.rubro = 'perfumes' and t.rubros = '{perfumes,ropa,general}'
    and t.whatsapp = '18496503269' and t.nombre_vendedora = 'Ana' and t.estado = 'en_prueba', 'caso 3: datos';
  assert t.onboarding ? 'intro_vista_en' and not (t.onboarding ? 'checklist_cerrado_en'), 'caso 3: onboarding ' || t.onboarding;
  execute 'reset role';
  select * into e from public.enlaces_invitacion where id = '00000000-0000-4000-8000-0000000000e1';
  assert e.estado = 'usado' and e.tienda_creada_id = t.id, 'caso 3: enlace';
  assert exists (select 1 from public.miembros where tienda_id = t.id and usuario_id = '00000000-0000-4000-8000-0000000000a1' and rol = 'dueno'), 'caso 3: dueño';
  assert (select tienda_id from public.usuarios where id = '00000000-0000-4000-8000-0000000000a1') = t.id, 'caso 3: usuarios';
  execute 'set local role authenticated';
  begin perform public.crear_mi_tienda_completa('00000000-0000-4000-8000-0000000000e1', 'Otra', '{ropa}', '8496503269', 'Ana');
    assert false, 'caso 3: enlace dos veces'; exception when sqlstate 'P0001' then null; end;
  execute 'reset role';
  raise notice 'caso 3 ok';
end $$;

-- Caso 4. marcar_onboarding: solo el dueño, solo claves de la lista, no borra ni cambia la primera fecha.
do $$
declare t uuid; o jsonb; o2 jsonb; ajena uuid := (select id from public.tiendas where slug = 'esencias-michel');
begin
  select tienda_creada_id into t from public.enlaces_invitacion where id = '00000000-0000-4000-8000-0000000000e1';
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000a1","role":"authenticated"}', true);
  execute 'set local role authenticated';
  o := public.marcar_onboarding(t, 'colores_elegidos_en');
  assert o ? 'colores_elegidos_en' and o ? 'intro_vista_en', 'caso 4: marca ' || o;
  o2 := public.marcar_onboarding(t, 'colores_elegidos_en');
  assert o2 = o, 'caso 4: segunda marca cambió la fecha';
  begin perform public.marcar_onboarding(t, 'otra_cosa'); assert false, 'caso 4: clave libre';
  exception when sqlstate '22023' then null; end;
  begin perform public.marcar_onboarding(ajena, 'intro_vista_en'); assert false, 'caso 4: tienda ajena';
  exception when insufficient_privilege then null; end;
  begin update public.tiendas set onboarding = '{}' where id = t; assert false, 'caso 4: update directo';
  exception when insufficient_privilege then null; end;
  execute 'reset role';
  raise notice 'caso 4 ok';
end $$;

-- Caso 5. publicar_mi_catalogo sin mínimo (20261009232947, decisión de Lewis): la tienda nueva publica con el catálogo vacío.
do $$
declare t uuid;
begin
  select tienda_creada_id into t from public.enlaces_invitacion where id = '00000000-0000-4000-8000-0000000000e1';
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000a1","role":"authenticated"}', true);
  execute 'set local role authenticated';
  assert (public.publicar_mi_catalogo(t)).catalogo_estado = 'publicado', 'caso 5: no publicó vacía';
  execute 'reset role';
  raise notice 'caso 5 ok';
end $$;

-- Caso 6. Permisos: las funciones nuevas no son de anon; slug_tienda_libre y crear_tienda_para no son de la API.
do $$
begin
  assert not has_function_privilege('anon', 'public.crear_mi_tienda_completa(uuid, text, text[], text, text)', 'execute'), 'caso 6: anon crear';
  assert not has_function_privilege('anon', 'public.marcar_onboarding(uuid, text)', 'execute'), 'caso 6: anon marcar';
  assert not has_function_privilege('anon', 'public.vista_slug(text)', 'execute'), 'caso 6: anon vista';
  assert not has_function_privilege('authenticated', 'public.slug_tienda_libre(text)', 'execute'), 'caso 6: slug_tienda_libre';
  assert not has_function_privilege('authenticated', 'public.crear_tienda_para(uuid, text, text)', 'execute'), 'caso 6: crear_tienda_para';
  assert has_function_privilege('authenticated', 'public.crear_mi_tienda(uuid, text, text)', 'execute'), 'caso 6: crear_mi_tienda sigue';
  raise notice 'caso 6 ok';
end $$;

rollback;
