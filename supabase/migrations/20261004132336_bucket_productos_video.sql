-- Catálogo conectado, parte 2: el bucket de productos acepta video (hasta 30 s, comprimido en el teléfono) además de fotos.
-- Las fotos siguen pasando por reducirFoto / comprimirParaSubir, así que no crecen. 15 MB = 15728640 bytes.
update storage.buckets
set file_size_limit = 15728640,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm', 'video/quicktime']
where id = 'productos';
