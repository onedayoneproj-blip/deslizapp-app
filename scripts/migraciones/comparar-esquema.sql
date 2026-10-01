-- Consulta de lectura: objetos de Deslizapp; excluye objetos administrados de Supabase.
-- Incluye las políticas de fotos y el disparador de alta en auth.users.
with objetos as (
  select 'relacion' as clase, c.relname as clave,
    jsonb_build_object('tipo', c.relkind, 'rls', c.relrowsecurity,
      'rls_forzado', c.relforcerowsecurity, 'opciones', c.reloptions,
      'vista', case when c.relkind = 'v' then pg_get_viewdef(c.oid, true) end) as definicion
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind in ('r','v')
  union all
  select 'columna', c.relname || '.' || a.attname,
    jsonb_build_object('orden', a.attnum, 'tipo', format_type(a.atttypid, a.atttypmod),
      'no_nulo', a.attnotnull, 'defecto', pg_get_expr(d.adbin, d.adrelid),
      'identidad', a.attidentity, 'generada', a.attgenerated)
  from pg_attribute a join pg_class c on c.oid = a.attrelid
    join pg_namespace n on n.oid = c.relnamespace
    left join pg_attrdef d on d.adrelid = a.attrelid and d.adnum = a.attnum
  where n.nspname = 'public' and c.relkind in ('r','v') and a.attnum > 0 and not a.attisdropped
  union all
  select 'restriccion', c.relname || '.' || k.conname,
    jsonb_build_object('sql', pg_get_constraintdef(k.oid, true),
      'diferible', k.condeferrable, 'diferida', k.condeferred, 'validada', k.convalidated)
  from pg_constraint k join pg_class c on c.oid = k.conrelid
    join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public'
  union all
  select 'indice', ci.relname, jsonb_build_object('sql', pg_get_indexdef(i.indexrelid),
    'valido', i.indisvalid, 'listo', i.indisready)
  from pg_index i join pg_class c on c.oid = i.indrelid
    join pg_class ci on ci.oid = i.indexrelid
    join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public'
  union all
  select 'politica', schemaname || '.' || tablename || '.' || policyname,
    jsonb_build_object('tipo', permissive, 'roles', roles, 'comando', cmd,
      'using', qual, 'check', with_check)
  from pg_policies where schemaname = 'public'
    or (schemaname = 'storage' and policyname like 'fotos_%')
  union all
  select 'disparador', n.nspname || '.' || c.relname || '.' || t.tgname,
    jsonb_build_object('sql', pg_get_triggerdef(t.oid, true), 'habilitado', t.tgenabled)
  from pg_trigger t join pg_class c on c.oid = t.tgrelid
    join pg_namespace n on n.oid = c.relnamespace
  where not t.tgisinternal and (n.nspname = 'public'
    or (n.nspname = 'auth' and t.tgname = 'auth_aplicar_invitacion'))
  union all
  select 'funcion', p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')',
    jsonb_build_object('resultado', pg_get_function_result(p.oid), 'lenguaje', l.lanname,
      'cuerpo', p.prosrc, 'seguridad_definidor', p.prosecdef, 'volatilidad', p.provolatile,
      'estricta', p.proisstrict, 'configuracion', p.proconfig,
      'argumentos', pg_get_function_arguments(p.oid))
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    join pg_language l on l.oid = p.prolang where n.nspname = 'public'
)
select coalesce(jsonb_agg(jsonb_build_object('clase', clase, 'clave', clave,
  'definicion', definicion) order by clase, clave), '[]'::jsonb) as esquema from objetos;
