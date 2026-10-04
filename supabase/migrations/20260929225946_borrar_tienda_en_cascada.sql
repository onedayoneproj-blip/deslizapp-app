-- Borrar una tienda debe poder arrastrar sus productos y pedidos (paso 1 de 2, como se aplicó en producción).
-- Este es el SQL exacto que guardó Supabase en su historial; el paso 2 (20260929225958) lo deja diferido.
alter table public.pedido_items drop constraint pedido_items_producto_id_fkey;
alter table public.pedido_items add constraint pedido_items_producto_id_fkey
  foreign key (producto_id) references public.productos (id) on delete no action;
