alter table public.promos
  add column if not exists limite_usos integer check (limite_usos is null or limite_usos >= 1),
  add column if not exists pausada boolean not null default false;
comment on column public.promos.limite_usos is 'Máximo de pedidos (no cancelados) que pueden usar el código. NULL = sin límite.';
comment on column public.promos.pausada is 'Pausa manual: la promo deja de aplicarse sin perder su historial.';
