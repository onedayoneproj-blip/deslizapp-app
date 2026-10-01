-- Primer ajuste histórico aplicado en producción. El ajuste siguiente difiere la comprobación.
alter table public.pedido_items drop constraint pedido_items_producto_id_fkey;
alter table public.pedido_items add constraint pedido_items_producto_id_fkey
  foreign key (producto_id) references public.productos (id) on delete no action;
