-- Planes de la página pública: límites de tiendas y personas, precio anual y «Ideal para…».
-- a_medida separa «plan a medida» (hace falta número por tienda) de «sin límite» (null en limite_productos).
alter table public.planes
  add column limite_tiendas integer check (limite_tiendas is null or limite_tiendas > 0),
  add column limite_personas integer check (limite_personas is null or limite_personas > 0),
  add column precio_anual integer check (precio_anual is null or precio_anual >= 0),
  add column ideal_para text check (ideal_para is null or char_length(ideal_para) <= 140),
  add column a_medida boolean not null default false;
update public.planes set a_medida = true where id = 'custom';

insert into public.planes (id, nombre, precio_mensual, precio_anual, limite_productos, limite_tiendas, limite_personas, creditos_mensuales, se_ofrece, orden, destacado, ideal_para) values
  ('inicial', 'Inicial', 499, 4990, 30, 1, 1, 100, true, 1, false, 'Ideal para empezar a vender con tu primer catálogo.'),
  ('negocio', 'Negocio', 999, 9990, 150, 3, 5, 100, true, 2, true, 'Ideal para tiendas que ya venden seguido y trabajan en equipo.'),
  ('pro', 'Pro', 1499, 14990, null, null, null, 100, true, 3, false, 'Ideal para varias tiendas y catálogos grandes, sin topes.');

update public.planes set se_ofrece = false, orden = orden + 10 where id in ('p20', 'p60', 'p100');
update public.planes set orden = 14 where id = 'custom';

-- La página lee los planes que se ofrecen sin iniciar sesión (solo lo público).
create policy planes_publicos on public.planes for select to anon using (se_ofrece);
grant select (id, nombre, precio_mensual, precio_anual, limite_productos, limite_tiendas, limite_personas, se_ofrece, orden, destacado, ideal_para) on public.planes to anon;
