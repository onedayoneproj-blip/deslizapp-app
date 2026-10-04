-- Paso 2 de 2: la comprobación "un producto usado en un pedido no se borra suelto" se hace al final de la transacción
-- (diferida), así borrar una tienda arrastra sus productos y pedidos. SQL exacto del historial de Supabase.
alter table public.pedido_items drop constraint pedido_items_producto_id_fkey;
alter table public.pedido_items add constraint pedido_items_producto_id_fkey
  foreign key (producto_id) references public.productos (id) on delete no action deferrable initially deferred;
