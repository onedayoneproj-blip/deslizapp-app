-- Invitaciones: al entrar por primera vez con Google, si el correo está invitado, la persona queda
-- enlazada a su tienda automáticamente. Solo administración escribe aquí (sin permisos para la app).
create table public.invitaciones (
  email text primary key check (email = lower(email)),
  tienda_id uuid not null references public.tiendas (id) on delete cascade,
  rol text not null default 'staff' check (rol in ('dueno', 'staff')),
  creado_en timestamptz not null default now()
);
alter table public.invitaciones enable row level security;
revoke all on public.invitaciones from anon, authenticated;

create function public.aplicar_invitacion()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.invitaciones;
begin
  select * into v from public.invitaciones where email = lower(new.email);
  if found then
    insert into public.usuarios (id, tienda_id, email, nombre, rol)
    values (new.id, v.tienda_id, lower(new.email),
            coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', ''), v.rol)
    on conflict (id) do nothing;
  end if;
  return new;
end
$$;
revoke execute on function public.aplicar_invitacion() from public, anon, authenticated;
create trigger auth_aplicar_invitacion
  after insert on auth.users
  for each row execute function public.aplicar_invitacion();

-- (Los datos de tiendas e invitaciones reales no van en el repositorio: se crean en la base.)
