-- Catálogo conectado: índices para las llaves de variantes que señaló el linter de Supabase (unindexed_foreign_keys).
create index if not exists producto_variantes_producto_tienda_idx on public.producto_variantes (producto_id, tienda_id);
create index if not exists ajustes_inventario_variante_idx on public.ajustes_inventario (variante_id);
create index if not exists avisos_llegada_variante_idx on public.avisos_llegada (variante_id);
