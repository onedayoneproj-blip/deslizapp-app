-- Fixtures mínimos de Auth/Storage para PostgreSQL limpio, NO equivalen a un proyecto Supabase completo.
do $$ begin if current_database()<>'replay_provisional' then raise exception 'Solo replay_provisional';end if;end $$;
create role anon; create role authenticated; create role service_role bypassrls;
create schema auth; create schema storage;
create table auth.users(id uuid primary key,email text,raw_app_meta_data jsonb default '{}'::jsonb,email_confirmed_at timestamptz,raw_user_meta_data jsonb default '{}'::jsonb);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
create table storage.buckets(id text primary key,name text not null,public boolean default false,file_size_limit bigint,allowed_mime_types text[]);
create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);
create function storage.foldername(name text) returns text[] language sql immutable as $$ select (string_to_array(name,'/'))[1:array_length(string_to_array(name,'/'),1)-1] $$;
