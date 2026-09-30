-- Fotos de productos: bucket público de lectura (URL directa para el catálogo), 5 MB, solo imágenes.
-- Cada tienda sube/borra únicamente dentro de su carpeta: productos/<tienda_id>/<archivo>.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('productos', 'productos', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

create policy fotos_ver_mi_tienda on storage.objects
  for select to authenticated
  using (bucket_id = 'productos' and (storage.foldername(name))[1] = (select public.mi_tienda_id())::text);
create policy fotos_subir_mi_tienda on storage.objects
  for insert to authenticated
  with check (bucket_id = 'productos' and (storage.foldername(name))[1] = (select public.mi_tienda_id())::text);
create policy fotos_cambiar_mi_tienda on storage.objects
  for update to authenticated
  using (bucket_id = 'productos' and (storage.foldername(name))[1] = (select public.mi_tienda_id())::text)
  with check (bucket_id = 'productos' and (storage.foldername(name))[1] = (select public.mi_tienda_id())::text);
create policy fotos_borrar_mi_tienda on storage.objects
  for delete to authenticated
  using (bucket_id = 'productos' and (storage.foldername(name))[1] = (select public.mi_tienda_id())::text);
