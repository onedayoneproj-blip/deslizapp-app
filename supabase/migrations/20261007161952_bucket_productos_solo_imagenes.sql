-- Decisión de negocio (7 oct 2026): por ahora no se suben videos (cuida el almacenamiento y la salida de datos del plan gratis).
-- El bucket `productos` acepta solo imágenes. No toca archivos ya subidos ni su lectura pública; el límite de tamaño no cambia.
-- Para reabrir el video: otra migración que restaure ['image/jpeg','image/png','image/webp','video/mp4','video/webm','video/quicktime'].
update storage.buckets
set allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
where id = 'productos';
