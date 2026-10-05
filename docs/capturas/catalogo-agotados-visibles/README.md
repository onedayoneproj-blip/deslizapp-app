# Capturas de validación — Catálogo

Capturas de Chromium con datos demo/fixtures locales; no contienen productos de Lewis ni escrituras en Supabase.

- `seleccion-390-claro.jpg`: selector, alcance de búsqueda y acción final.
- `likes-390-claro.jpg`: corazón y cifra juntos, dentro de la foto.
- `historial-lista-390.jpg`: historial con lista común.

La ejecución automatizada también comprueba 360/390/430 px, ambos temas, cero y cifras largas. Repetición local:

```sh
mkdir -p /tmp/agota-y-likes
URL=http://localhost:3352 node scripts/probar-agotados-y-likes.mjs
CAPTURAS=/tmp/agota-y-likes URL=http://localhost:3352 node scripts/probar-historial-ajustes-lista.mjs
```
