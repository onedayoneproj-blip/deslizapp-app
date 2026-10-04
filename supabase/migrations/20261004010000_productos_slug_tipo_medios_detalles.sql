-- Catálogo conectado, migración 1 de 4 (docs/12-catalogo-conectado.md §1, §3, §4, §5, §8).
-- Productos: slug, tipo (producto o servicio), medios (fotos y videos), por encargo, detalles por rubro y forma de las opciones.
-- Compatible con la app de hoy: `fotos` y `foto_retocada` siguen funcionando y se mantienen en sincronía con `medios`.

-- ---------------------------------------------------------------------------------------------------------------------
-- Slug: corto, único por tienda
-- ---------------------------------------------------------------------------------------------------------------------

-- "Lattafa Asad Bourbon" → "lattafa-asad-bourbon". Minúsculas, sin tildes, espacios y símbolos a guiones, hasta 40.
create function public.slug_desde_texto(p_texto text)
returns text
language sql
immutable
set search_path = ''
as $$
  select coalesce(nullif(
    trim(both '-' from left(
      trim(both '-' from regexp_replace(
        translate(lower(coalesce(p_texto, '')), 'áàâäãéèêëíìîïóòôöõúùûüñç', 'aaaaaeeeeiiiiooooouuuunc'),
        '[^a-z0-9]+', '-', 'g')),
      40)),
    ''), 'producto')
$$;

-- El primer slug libre de la tienda a partir de una base: "parade", "parade-2", "parade-3"… (siempre ≤ 40).
create function public.slug_libre(p_tienda_id uuid, p_base text, p_excepto uuid default null)
returns text
language plpgsql
stable
set search_path = ''
as $$
declare
  v_base text := public.slug_desde_texto(p_base);
  v_slug text := v_base;
  v_n integer := 1;
begin
  while exists (
    select 1 from public.productos p
    where p.tienda_id = p_tienda_id and p.slug = v_slug and p.id is distinct from p_excepto
  ) loop
    v_n := v_n + 1;
    v_slug := trim(both '-' from left(v_base, 40 - char_length('-' || v_n))) || '-' || v_n;
  end loop;
  return v_slug;
end
$$;

alter table public.productos add column slug text;

-- Los productos que ya existen reciben su slug sin tocar `actualizado_en`
alter table public.productos disable trigger productos_actualizado;
do $$
declare
  r record;
begin
  for r in select id, tienda_id, nombre from public.productos order by tienda_id, creado_en, id loop
    update public.productos set slug = public.slug_libre(r.tienda_id, r.nombre, r.id) where id = r.id;
  end loop;
end
$$;

alter table public.productos
  alter column slug set not null,
  add constraint productos_slug_formato check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) between 1 and 40),
  add constraint productos_tienda_slug_unico unique (tienda_id, slug);

-- Un producto nuevo sin slug (la app de hoy no lo manda) recibe uno a partir de su nombre
create function public.productos_poner_slug()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.slug is null or btrim(new.slug) = '' then
    new.slug := public.slug_libre(new.tienda_id, new.nombre, new.id);
  end if;
  return new;
end
$$;
create trigger productos_slug before insert on public.productos
  for each row execute function public.productos_poner_slug();

-- ---------------------------------------------------------------------------------------------------------------------
-- Tipo y por encargo
-- ---------------------------------------------------------------------------------------------------------------------

alter table public.productos
  add column tipo text not null default 'producto' check (tipo in ('producto', 'servicio')),
  add column por_encargo boolean not null default false,
  add column encargo_texto text check (encargo_texto is null or char_length(encargo_texto) between 1 and 40);

-- Un servicio no lleva stock ni se pide por encargo (las variantes las revisa la migración 2)
alter table public.productos
  add constraint productos_servicio_sin_stock check (tipo = 'producto' or (stock is null and not por_encargo));

-- ---------------------------------------------------------------------------------------------------------------------
-- Medios: fotos y videos, en orden
-- ---------------------------------------------------------------------------------------------------------------------

-- {"tipo":"foto","url":…,"retocada":bool} o {"tipo":"video","url":…,"portada":…,"duracion_s":1..30}. Hasta 10 y hasta 2 videos.
create function public.medios_validos(p_medios jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select jsonb_typeof(p_medios) = 'array'
    and jsonb_array_length(p_medios) <= 10
    and (select count(*) from jsonb_array_elements(p_medios) e where e->>'tipo' = 'video') <= 2
    and not exists (
      select 1 from jsonb_array_elements(p_medios) e
      where not (
        jsonb_typeof(e) = 'object'
        and jsonb_typeof(e->'url') = 'string'
        and char_length(e->>'url') between 1 and 2048
        and (
          (e->>'tipo' = 'foto'
            and jsonb_typeof(e->'retocada') = 'boolean'
            and not exists (select 1 from jsonb_object_keys(e) k where k not in ('tipo', 'url', 'retocada')))
          or
          (e->>'tipo' = 'video'
            and jsonb_typeof(e->'duracion_s') = 'number'
            and (e->>'duracion_s')::numeric between 1 and 30
            and (e->>'duracion_s')::numeric = trunc((e->>'duracion_s')::numeric)
            and (e->'portada' is null or jsonb_typeof(e->'portada') = 'null'
                 or (jsonb_typeof(e->'portada') = 'string' and char_length(e->>'portada') between 1 and 2048))
            and not exists (select 1 from jsonb_object_keys(e) k where k not in ('tipo', 'url', 'portada', 'duracion_s')))
        )
      )
    )
$$;

alter table public.productos add column medios jsonb not null default '[]'::jsonb;

-- Medios desde las fotos de hoy: la primera lleva `foto_retocada`
update public.productos p
set medios = coalesce((
  select jsonb_agg(jsonb_build_object('tipo', 'foto', 'url', f.url, 'retocada', f.n = 1 and p.foto_retocada) order by f.n)
  from unnest(p.fotos) with ordinality as f(url, n)
), '[]'::jsonb);
alter table public.productos enable trigger productos_actualizado;

alter table public.productos add constraint productos_medios_validos check (public.medios_validos(medios));

-- Sincronía mientras la app use `fotos`:
--   * cambió `medios` → `fotos` = las fotos de `medios` en orden y `foto_retocada` = la de la primera foto;
--   * cambió `fotos` (o `foto_retocada`) y no `medios` → se rehacen las fotos de `medios` y los videos se quedan donde estaban
--     (o al final, si ya no caben ahí).
create function public.productos_sincronizar_medios()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_desde_medios boolean;
  v_videos jsonb[];
  v_fotos text[];
  v_total integer;
  v_res jsonb := '[]'::jsonb;
  v_iv integer := 1;
  v_if integer := 1;
  v_pos integer[];
  v_previa jsonb;
  k integer;
begin
  if tg_op = 'INSERT' then
    v_desde_medios := new.medios is not null and new.medios <> '[]'::jsonb;
  else
    v_desde_medios := new.medios is distinct from old.medios;
    if not v_desde_medios and new.fotos is not distinct from old.fotos and new.foto_retocada is not distinct from old.foto_retocada then
      return new;
    end if;
  end if;

  if v_desde_medios then
    new.fotos := coalesce((
      select array_agg(e.v->>'url' order by e.n) from jsonb_array_elements(new.medios) with ordinality as e(v, n)
      where e.v->>'tipo' = 'foto'
    ), '{}');
    new.foto_retocada := coalesce((
      select (e.v->>'retocada')::boolean from jsonb_array_elements(new.medios) with ordinality as e(v, n)
      where e.v->>'tipo' = 'foto' order by e.n limit 1
    ), false);
    return new;
  end if;

  -- Desde `fotos`: los videos de antes, con su posición
  v_fotos := coalesce(new.fotos, '{}');
  if tg_op = 'UPDATE' then
    select coalesce(array_agg(e.v order by e.n), '{}'), coalesce(array_agg((e.n - 1)::integer order by e.n), '{}')
      into v_videos, v_pos
    from jsonb_array_elements(coalesce(old.medios, '[]'::jsonb)) with ordinality as e(v, n)
    where e.v->>'tipo' = 'video';
  else
    v_videos := '{}';
    v_pos := '{}';
  end if;
  v_total := coalesce(array_length(v_fotos, 1), 0) + coalesce(array_length(v_videos, 1), 0);
  for k in 0 .. v_total - 1 loop
    if v_iv <= coalesce(array_length(v_videos, 1), 0)
       and (v_pos[v_iv] <= k or v_if > coalesce(array_length(v_fotos, 1), 0)) then
      v_res := v_res || jsonb_build_array(v_videos[v_iv]);
      v_iv := v_iv + 1;
    else
      -- Una foto que ya estaba conserva su "retocada"; la primera sigue a `foto_retocada`
      if v_if = 1 then
        v_res := v_res || jsonb_build_array(jsonb_build_object('tipo', 'foto', 'url', v_fotos[v_if], 'retocada', coalesce(new.foto_retocada, false)));
      else
        select e.v into v_previa from jsonb_array_elements(coalesce(case when tg_op = 'UPDATE' then old.medios end, '[]'::jsonb)) e(v)
        where e.v->>'tipo' = 'foto' and e.v->>'url' = v_fotos[v_if] limit 1;
        v_res := v_res || jsonb_build_array(jsonb_build_object('tipo', 'foto', 'url', v_fotos[v_if],
          'retocada', coalesce((v_previa->>'retocada')::boolean, false)));
      end if;
      v_if := v_if + 1;
    end if;
  end loop;
  new.medios := v_res;
  return new;
end
$$;
create trigger productos_medios before insert or update on public.productos
  for each row execute function public.productos_sincronizar_medios();

-- ---------------------------------------------------------------------------------------------------------------------
-- Detalles por rubro (la misma lista que lib/rubros.ts; tests/rubros.test.mjs compara las dos)
-- ---------------------------------------------------------------------------------------------------------------------

-- Los campos de cada rubro: "texto" | "numero" | "lista" | {"elegir": [...]} | {"lista": [...]} (lista con valores permitidos).
-- CAMPOS_RUBRO_INICIO
create function public.campos_de_rubro(p_rubro text)
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select ('{
    "perfumes": {
      "marca": "texto",
      "para": {"elegir": ["ella", "el", "unisex"]},
      "tamano_ml": "numero",
      "concentracion": {"elegir": ["edp", "edt", "parfum", "extrait", "colonia"]},
      "familia": "texto",
      "ocasiones": {"lista": ["Día", "Oficina", "Universidad", "Verano", "Primavera y verano", "Salidas casuales", "Noche", "Citas", "Cenas", "Fiestas", "Noches casuales", "Ocasiones especiales", "Todo el año", "Regalo"]},
      "notas_salida": "lista",
      "notas_corazon": "lista",
      "notas_fondo": "lista"
    },
    "ropa": {
      "material": "texto",
      "corte": "texto",
      "cuidado": "texto",
      "para": {"elegir": ["ella", "el", "unisex", "ninos"]}
    },
    "accesorios": {
      "material": "texto",
      "medidas": "texto",
      "para": {"elegir": ["ella", "el", "unisex"]}
    },
    "belleza": {
      "contenido": "texto",
      "tipo_piel": "texto",
      "ingredientes": "lista",
      "modo_uso": "texto"
    },
    "comida": {
      "porcion": "texto",
      "ingredientes": "lista",
      "conservacion": "texto",
      "anticipacion": "texto"
    },
    "hogar": {
      "medidas": "texto",
      "material": "texto",
      "cuidado": "texto"
    },
    "general": {
      "marca": "texto",
      "tamano": "texto"
    }
  }'::jsonb) -> p_rubro
$$;
-- CAMPOS_RUBRO_FIN

-- ¿Son válidos estos detalles para el rubro? Todas las llaves son opcionales; `descripcion` (≤ 600) vale en todos.
create function public.detalles_validos(p_rubro text, p_detalles jsonb)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_campos jsonb := public.campos_de_rubro(p_rubro);
  v_llave text;
  v_valor jsonb;
  v_tipo jsonb;
  v_permitidos jsonb;
  v_n numeric;
begin
  if p_detalles is null or jsonb_typeof(p_detalles) <> 'object' or v_campos is null then
    return false;
  end if;
  for v_llave, v_valor in select * from jsonb_each(p_detalles) loop
    if v_llave = 'descripcion' then
      if jsonb_typeof(v_valor) <> 'string' or char_length(v_valor #>> '{}') not between 1 and 600 then return false; end if;
      continue;
    end if;
    v_tipo := v_campos -> v_llave;
    if v_tipo is null then return false; end if;
    if v_tipo = '"texto"'::jsonb then
      if jsonb_typeof(v_valor) <> 'string' or char_length(v_valor #>> '{}') not between 1 and 120 then return false; end if;
    elsif v_tipo = '"numero"'::jsonb then
      if jsonb_typeof(v_valor) <> 'number' then return false; end if;
      v_n := (v_valor #>> '{}')::numeric;
      if v_n <= 0 or v_n <> trunc(v_n) or v_n > 2147483647 then return false; end if;
    elsif v_tipo = '"lista"'::jsonb or v_tipo ? 'lista' then
      v_permitidos := v_tipo -> 'lista';
      if jsonb_typeof(v_valor) <> 'array' or jsonb_array_length(v_valor) not between 1 and 12 then return false; end if;
      if exists (
        select 1 from jsonb_array_elements(v_valor) e
        where jsonb_typeof(e) <> 'string' or char_length(e #>> '{}') not between 1 and 40
           or (v_permitidos is not null and not (v_permitidos @> jsonb_build_array(e)))
      ) then return false; end if;
    elsif v_tipo ? 'elegir' then
      if jsonb_typeof(v_valor) <> 'string' or not ((v_tipo -> 'elegir') @> jsonb_build_array(v_valor)) then return false; end if;
    else
      return false;
    end if;
  end loop;
  return true;
end
$$;

-- Se valida al crear y al editar los detalles (o el tipo) de un producto, con el rubro de su tienda. Un servicio suma `duracion_min`.
create function public.productos_validar_detalles()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_rubro text;
  v_detalles jsonb := new.detalles;
  v_duracion jsonb;
begin
  if tg_op = 'UPDATE' and new.detalles is not distinct from old.detalles and new.tipo is not distinct from old.tipo then
    return new;
  end if;
  select t.rubro into v_rubro from public.tiendas t where t.id = new.tienda_id;
  if new.tipo = 'servicio' and v_detalles ? 'duracion_min' then
    v_duracion := v_detalles -> 'duracion_min';
    if jsonb_typeof(v_duracion) <> 'number' or (v_duracion #>> '{}')::numeric <= 0
       or (v_duracion #>> '{}')::numeric <> trunc((v_duracion #>> '{}')::numeric)
       or (v_duracion #>> '{}')::numeric > 2147483647 then
      raise exception 'detalles_invalidos' using errcode = '22023';
    end if;
    v_detalles := v_detalles - 'duracion_min';
  end if;
  if not public.detalles_validos(v_rubro, v_detalles) then
    raise exception 'detalles_invalidos' using errcode = '22023';
  end if;
  return new;
end
$$;
create trigger productos_detalles before insert or update on public.productos
  for each row execute function public.productos_validar_detalles();

-- ---------------------------------------------------------------------------------------------------------------------
-- Opciones: la lista de ejes (máximo 2, de 1 a 12 valores únicos por eje)
-- ---------------------------------------------------------------------------------------------------------------------

create function public.opciones_validas(p_opciones jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select jsonb_typeof(p_opciones) = 'array'
    and jsonb_array_length(p_opciones) <= 2
    and not exists (
      select 1 from jsonb_array_elements(p_opciones) e
      where not (
        jsonb_typeof(e) = 'object'
        and jsonb_typeof(e->'nombre') = 'string'
        and char_length(e->>'nombre') between 1 and 20
        and jsonb_typeof(e->'valores') = 'array'
        and jsonb_array_length(e->'valores') between 1 and 12
        and not exists (select 1 from jsonb_object_keys(e) k where k not in ('nombre', 'valores'))
        and not exists (
          select 1 from jsonb_array_elements(e->'valores') v
          where jsonb_typeof(v) <> 'string' or char_length(v #>> '{}') not between 1 and 20
        )
        and (select count(distinct v #>> '{}') from jsonb_array_elements(e->'valores') v) = jsonb_array_length(e->'valores')
      )
    )
    and (select count(distinct e->>'nombre') from jsonb_array_elements(p_opciones) e) = jsonb_array_length(p_opciones)
$$;

alter table public.productos add constraint productos_opciones_validas check (public.opciones_validas(opciones));

-- La app edita las columnas nuevas (el stock sigue cambiando solo por las funciones de inventario)
grant update (slug, tipo, medios, por_encargo, encargo_texto) on public.productos to authenticated;

-- Las funciones auxiliares no se llaman desde la app
revoke all on function public.slug_desde_texto(text) from public, anon;
revoke all on function public.slug_libre(uuid, text, uuid) from public, anon;
revoke all on function public.productos_poner_slug() from public, anon, authenticated;
revoke all on function public.productos_sincronizar_medios() from public, anon, authenticated;
revoke all on function public.productos_validar_detalles() from public, anon, authenticated;
revoke all on function public.medios_validos(jsonb) from public, anon;
revoke all on function public.campos_de_rubro(text) from public, anon;
revoke all on function public.detalles_validos(text, jsonb) from public, anon;
revoke all on function public.opciones_validas(jsonb) from public, anon;
grant execute on function public.slug_desde_texto(text) to authenticated;
-- La usa el trigger del slug con los permisos de quien guarda el producto
grant execute on function public.slug_libre(uuid, text, uuid) to authenticated;
grant execute on function public.medios_validos(jsonb) to authenticated;
grant execute on function public.campos_de_rubro(text) to authenticated;
grant execute on function public.detalles_validos(text, jsonb) to authenticated;
grant execute on function public.opciones_validas(jsonb) to authenticated;
