-- La invitación solo se aplica a cuentas que entraron con Google y con correo verificado. Evita que alguien
-- se registre con correo y contraseña usando el email de otra persona y "reclame" su tienda.
create or replace function public.aplicar_invitacion()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.invitaciones;
begin
  if coalesce(new.raw_app_meta_data ->> 'provider', '') <> 'google' or new.email_confirmed_at is null then
    return new;
  end if;
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
