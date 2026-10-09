-- Avatar del cliente: un emoji y un color de fondo de la marca (sin fotos de personas).
alter table public.clientes
  add column avatar_emoji text check (avatar_emoji is null or char_length(avatar_emoji) between 1 and 16),
  add column avatar_color text check (avatar_color is null or avatar_color in ('crema','rosa','dorado','menta','durazno'));
