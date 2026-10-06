-- Mi marca: las dos funciones de apoyo no son para llamarlas desde la API.
-- Supabase da EXECUTE a anon y authenticated por privilegios por defecto del esquema: se quitan junto con PUBLIC.
-- marca_palabras_validas la evalúa el CHECK de marca_tienda con los permisos de quien escribe: authenticated la conserva
-- (sin ella, guardar las palabras falla con «permission denied»). Es una función pura sin acceso a tablas.
revoke execute on function public.marca_palabras_validas(text[]) from public, anon;
grant execute on function public.marca_palabras_validas(text[]) to authenticated;
-- El trigger se dispara sin comprobar EXECUTE: nadie la necesita.
revoke execute on function public.marca_referencias_limite() from public, anon, authenticated;
