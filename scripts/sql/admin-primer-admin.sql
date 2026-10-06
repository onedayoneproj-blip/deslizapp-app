-- Solo para una instalación nueva SIN admins. NO correr en Deslizapp actual: Lewis ya está activo.
-- psql: -v admin_email='correo de Google' -f scripts/sql/admin-primer-admin.sql
-- No escribir el correo en este archivo ni en una migración.
begin;
select set_config('deslizapp.primer_admin_email', lower(trim(:'admin_email')), true);
do $$ declare u auth.users; begin
 if exists(select 1 from public.admins where quitado_en is null) then raise exception 'ya_hay_admin'; end if;
 select * into u from auth.users where lower(email)=current_setting('deslizapp.primer_admin_email') and raw_app_meta_data->>'provider'='google' and email_confirmed_at is not null;
 if not found then raise exception 'usuario_google_no_encontrado'; end if;
 insert into public.admins(usuario_id,email,nombre) values(u.id,u.email,left(coalesce(u.raw_user_meta_data->>'full_name',''),80));
end $$;
commit;
