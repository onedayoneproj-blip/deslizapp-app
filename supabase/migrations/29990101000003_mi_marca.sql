-- Mi marca para el retoque: las 3 palabras de la marca, lo que no quiere y de 3 a 6 fotos de referencia por tienda.
-- El logo (tiendas.logo_url) y el Instagram (tiendas.instagram) ya existen y se reutilizan.
-- NOMBRE PROVISIONAL: el archivo definitivo lleva la versión que Supabase le ponga al aplicarla (AGENTS.md).
-- Ningún dato real de tiendas va aquí.

-- ─── Palabras de la marca: hasta 3, de 1 a 24 caracteres, sin espacios de sobra ─────────────────────────────────────
create function public.marca_palabras_validas(p_palabras text[]) returns boolean
language sql immutable set search_path = ''
as $$
  select p_palabras is not null
    and coalesce(array_ndims(p_palabras), 1) = 1
    and cardinality(p_palabras) <= 3
    and not exists (select 1 from unnest(p_palabras) p where p is null or p <> btrim(p) or char_length(p) not between 1 and 24)
$$;

create table public.marca_tienda (
  tienda_id uuid primary key references public.tiendas (id) on delete cascade,
  palabras text[] not null default '{}' constraint marca_tienda_palabras_check check (public.marca_palabras_validas(palabras)),
  evita text constraint marca_tienda_evita_check check (evita is null or (char_length(evita) between 1 and 160 and evita = btrim(evita))),
  actualizado_en timestamptz not null default now()
);
create trigger marca_tienda_actualizado before insert or update on public.marca_tienda
  for each row execute function public.tocar_actualizado_en();

-- ─── Fotos de referencia: máximo 6 por tienda (lo comprueba la base, no solo la app) ───────────────────────────────
create table public.marca_referencias (
  id uuid primary key default gen_random_uuid(),
  tienda_id uuid not null references public.tiendas (id) on delete cascade,
  -- Ruta en el bucket marca-referencias: siempre dentro de la carpeta de la propia tienda.
  ruta text not null constraint marca_referencias_ruta_check check (char_length(ruta) between 3 and 300 and ruta like tienda_id::text || '/%' and ruta !~ '(^|/)\.\.(/|$)'),
  orden integer not null default 0 check (orden >= 0),
  creado_en timestamptz not null default now(),
  unique (tienda_id, ruta)
);
create index marca_referencias_tienda_idx on public.marca_referencias (tienda_id, orden, creado_en);

-- Serializa los altas de una misma tienda (advisory lock por tienda) y cuenta después: dos pedidos a la vez no pasan de 6.
create function public.marca_referencias_limite() returns trigger
language plpgsql set search_path = ''
as $$
begin
  perform pg_advisory_xact_lock(hashtextextended('marca_referencias:' || new.tienda_id::text, 0));
  if (select count(*) from public.marca_referencias where tienda_id = new.tienda_id) >= 6 then
    raise exception 'marca_referencias_limite' using errcode = '23514', hint = 'Hasta 6 fotos de referencia por tienda.';
  end if;
  return new;
end $$;
create trigger marca_referencias_limite before insert on public.marca_referencias
  for each row execute function public.marca_referencias_limite();

-- ─── Permisos y RLS ─────────────────────────────────────────────────────────────────────────────────────────────────
-- Miembros de la tienda: leer, crear, cambiar y borrar lo suyo. Admins: solo leer. Ver como: solo leer la que se mira.
-- anon: nada. Los permisos de columnas dejan cambiar solo lo que la app edita (la tienda de una fila no se muda).
alter table public.marca_tienda enable row level security;
alter table public.marca_referencias enable row level security;
revoke all on public.marca_tienda from anon, authenticated;
revoke all on public.marca_referencias from anon, authenticated;
grant select, insert, delete on public.marca_tienda to authenticated;
grant update (palabras, evita) on public.marca_tienda to authenticated;
grant select, insert, delete on public.marca_referencias to authenticated;
grant update (orden) on public.marca_referencias to authenticated;

create policy marca_tienda_ver on public.marca_tienda for select to authenticated
  using (tienda_id in (select public.mis_tiendas()) or tienda_id in (select public.tiendas_que_miro()) or (select public.soy_admin()));
create policy marca_tienda_crear on public.marca_tienda for insert to authenticated
  with check (tienda_id in (select public.mis_tiendas()));
create policy marca_tienda_cambiar on public.marca_tienda for update to authenticated
  using (tienda_id in (select public.mis_tiendas())) with check (tienda_id in (select public.mis_tiendas()));
create policy marca_tienda_borrar on public.marca_tienda for delete to authenticated
  using (tienda_id in (select public.mis_tiendas()));

create policy marca_referencias_ver on public.marca_referencias for select to authenticated
  using (tienda_id in (select public.mis_tiendas()) or tienda_id in (select public.tiendas_que_miro()) or (select public.soy_admin()));
create policy marca_referencias_crear on public.marca_referencias for insert to authenticated
  with check (tienda_id in (select public.mis_tiendas()));
create policy marca_referencias_cambiar on public.marca_referencias for update to authenticated
  using (tienda_id in (select public.mis_tiendas())) with check (tienda_id in (select public.mis_tiendas()));
create policy marca_referencias_borrar on public.marca_referencias for delete to authenticated
  using (tienda_id in (select public.mis_tiendas()));

-- ─── Bucket PRIVADO: las referencias son de uso interno, no del catálogo. Ruta <tienda_id>/<archivo> ──────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('marca-referencias', 'marca-referencias', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy marca_ref_ver on storage.objects for select to authenticated
  using (bucket_id = 'marca-referencias' and (
    (storage.foldername(name))[1] in (select t::text from public.mis_tiendas() t)
    or (storage.foldername(name))[1] in (select t::text from public.tiendas_que_miro() t)
    or (select public.soy_admin())));
create policy marca_ref_subir on storage.objects for insert to authenticated
  with check (bucket_id = 'marca-referencias' and (storage.foldername(name))[1] in (select t::text from public.mis_tiendas() t));
create policy marca_ref_cambiar on storage.objects for update to authenticated
  using (bucket_id = 'marca-referencias' and (storage.foldername(name))[1] in (select t::text from public.mis_tiendas() t))
  with check (bucket_id = 'marca-referencias' and (storage.foldername(name))[1] in (select t::text from public.mis_tiendas() t));
create policy marca_ref_borrar on storage.objects for delete to authenticated
  using (bucket_id = 'marca-referencias' and (storage.foldername(name))[1] in (select t::text from public.mis_tiendas() t));
