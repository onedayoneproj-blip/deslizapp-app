-- Equipo y permisos (docs/prompts/colaboradores-e-invitaciones.md §2). Parte 1: niveles, grupos y políticas RESTRICTIVAS.
-- Dueño (`rol = 'dueno'`): todo, como hoy. Colaborador (`rol = 'staff'`): lo que permita su `nivel`.
-- Las políticas permisivas existentes y las `ver_como_no_escribe_*` no se tocan: estas se SUMAN (AND). Las lecturas siguen
-- abiertas a todo miembro. Ningún dato de tiendas va aquí (hoy no hay ningún `staff` en la base real).

-- ─── Nivel de cada colaborador ───────────────────────────────────────────────────────────────────────────────────────────
-- Por defecto el más bajo. Para un dueño no se usa. Solo lo cambia el dueño, con una función (parte 3).
alter table public.miembros add column nivel text not null default 'ayudante'
  constraint miembros_nivel_valido check (nivel in ('ayudante', 'editor', 'administrador'));
alter table public.invitaciones add column nivel text not null default 'ayudante'
  constraint invitaciones_nivel_valido check (nivel in ('ayudante', 'editor', 'administrador'));
-- Nadie escribe `miembros` ni `invitaciones` directo (ya no había política de escritura; ahora tampoco hay permiso): todo pasa por
-- funciones. Así un miembro nunca se sube el nivel a sí mismo.
revoke insert, update, delete on public.miembros from anon, authenticated;
revoke insert, update, delete on public.invitaciones from anon, authenticated;

-- ─── El mapa nivel → grupos: UN solo lugar ───────────────────────────────────────────────────────────────────────────────
-- ventas: pedidos, despacho, abonos, clientes, promos, solicitudes y avisos del catálogo.
-- catalogo: productos, variantes, medios, inventario y reposición, personalización y publicación del catálogo, logo.
-- creditos: todo lo que gasta o reserva créditos (pedir_retoque, gastar_creditos).
-- marca: Mi marca (marca_tienda, marca_referencias, bucket marca-referencias).
-- compras: reservado para pagar plan o créditos desde la tienda (hoy no hay funciones).
-- equipo: invitar, aprobar, cambiar nivel, quitar, cancelar enlaces → SOLO el dueño, nunca un colaborador.
create function public.nivel_tiene_grupo(p_nivel text, p_grupo text) returns boolean
language sql immutable set search_path = ''
as $$
  select case p_grupo
    when 'ventas'   then p_nivel in ('ayudante', 'editor', 'administrador')
    when 'catalogo' then p_nivel in ('editor', 'administrador')
    when 'creditos' then p_nivel = 'administrador'
    when 'marca'    then p_nivel = 'administrador'
    when 'compras'  then p_nivel = 'administrador'
    else false
  end
$$;
comment on function public.nivel_tiene_grupo(text, text) is
  'Mapa nivel de colaborador → grupo de permiso (único lugar). El grupo equipo nunca es de un colaborador: es del dueño.';
revoke execute on function public.nivel_tiene_grupo(text, text) from public, anon;
grant execute on function public.nivel_tiene_grupo(text, text) to authenticated;

-- Tiendas (no eliminadas) donde quien llama tiene el grupo: el dueño todos; el colaborador según su nivel.
-- En las políticas se usa como `tienda_id in (select ...)`: Postgres la calcula una vez por consulta, no por fila.
create function public.mis_tiendas_con_permiso(p_grupo text) returns setof uuid
language sql stable security definer set search_path = ''
as $$
  select m.tienda_id from public.miembros m join public.tiendas t on t.id = m.tienda_id
  where m.usuario_id = (select auth.uid()) and t.estado <> 'eliminada'
    and (m.rol = 'dueno' or public.nivel_tiene_grupo(m.nivel, p_grupo))
$$;
revoke execute on function public.mis_tiendas_con_permiso(text) from public, anon;
grant execute on function public.mis_tiendas_con_permiso(text) to authenticated;

create function public.tengo_permiso(p_tienda_id uuid, p_grupo text) returns boolean
language sql stable security definer set search_path = ''
as $$
  select p_tienda_id is not null and p_tienda_id in (select public.mis_tiendas_con_permiso(p_grupo))
$$;
comment on function public.tengo_permiso(uuid, text) is
  'Cierto si quien llama es dueño de la tienda o colaborador con un nivel que incluye el grupo (ventas, catalogo, creditos, marca, compras, equipo).';
revoke execute on function public.tengo_permiso(uuid, text) from public, anon;
grant execute on function public.tengo_permiso(uuid, text) to authenticated;

-- REGLA PERMANENTE (también en HANDOFF.md): toda función nueva que ESCRIBA datos de una tienda declara su grupo y empieza con
-- `perform public.exigir_no_viendo(<tienda>); perform public.exigir_permiso(<tienda>, '<grupo>');`.
-- Lanza `sin_permiso` (42501) si quien llama ES miembro de esa tienda pero su nivel no incluye el grupo. Si no es miembro (o la
-- tienda es nula porque la fila no existe) no hace nada: la comprobación de pertenencia que ya tiene cada función decide, con su
-- propio error. Por eso una función NUEVA comprueba también la pertenencia (o usa `tengo_permiso`).
create function public.exigir_permiso(p_tienda_id uuid, p_grupo text) returns void
language plpgsql stable security definer set search_path = ''
as $$
begin
  if p_grupo not in ('ventas', 'catalogo', 'creditos', 'marca', 'compras', 'equipo') then
    raise exception 'grupo_invalido' using errcode = '22023';
  end if;
  if p_tienda_id is not null and p_tienda_id in (select public.mis_tiendas_con_eliminadas())
     and not public.tengo_permiso(p_tienda_id, p_grupo) then
    raise exception 'sin_permiso' using errcode = '42501', hint = 'Esto lo hace quien administra la tienda.';
  end if;
end $$;
comment on function public.exigir_permiso(uuid, text) is
  'Va al inicio de toda función que escriba datos de una tienda: lanza sin_permiso (42501) si quien llama es miembro sin ese grupo.';
revoke execute on function public.exigir_permiso(uuid, text) from public, anon;
grant execute on function public.exigir_permiso(uuid, text) to authenticated;

-- Gancho del límite de colaboradores: hoy siempre sí. La parte de suscripciones pone aquí la regla real. TODO camino que sume un
-- miembro (aprobar un enlace, invitar por correo) lo llama.
create function public.puede_sumar_colaborador(p_tienda_id uuid) returns boolean
language sql stable security definer set search_path = ''
as $$ select p_tienda_id is not null $$;
revoke execute on function public.puede_sumar_colaborador(uuid) from public, anon;
grant execute on function public.puede_sumar_colaborador(uuid) to authenticated;

-- ─── Tablas: una política restrictiva por orden (insert, update, delete) ─────────────────────────────────────────────────
do $$
declare
  t record;
  ordenes text[] := array['insert', 'update', 'delete'];
  o text;
  puede text;
begin
  for t in select * from (values
    ('clientes', 'tienda_id', 'ventas'), ('pedidos', 'tienda_id', 'ventas'), ('promos', 'tienda_id', 'ventas'),
    ('productos', 'tienda_id', 'catalogo'), ('producto_variantes', 'tienda_id', 'catalogo'), ('tiendas', 'id', 'catalogo'),
    ('marca_tienda', 'tienda_id', 'marca'), ('marca_referencias', 'tienda_id', 'marca')
  ) v(tabla, col, grupo) loop
    puede := format('%I in (select public.mis_tiendas_con_permiso(%L))', t.col, t.grupo);
    foreach o in array ordenes loop
      execute format('create policy %I on public.%I as restrictive for %s to authenticated %s',
        'permiso_' || t.grupo || '_' || t.tabla || '_' || o, t.tabla, o,
        case o when 'insert' then format('with check (%s)', puede)
               when 'update' then format('using (%s) with check (%s)', puede, puede)
               else format('using (%s)', puede) end);
    end loop;
  end loop;
  -- pedido_items: la tienda es la de su pedido.
  puede := 'exists (select 1 from public.pedidos p where p.id = pedido_id and p.tienda_id in (select public.mis_tiendas_con_permiso(''ventas'')))';
  foreach o in array ordenes loop
    execute format('create policy %I on public.pedido_items as restrictive for %s to authenticated %s',
      'permiso_ventas_pedido_items_' || o, o,
      case o when 'insert' then format('with check (%s)', puede)
             when 'update' then format('using (%s) with check (%s)', puede, puede)
             else format('using (%s)', puede) end);
  end loop;
end $$;

-- ─── Storage: `productos` (fotos, videos y logo) → catalogo; `marca-referencias` → marca ─────────────────────────────────
-- Acotada a esos dos buckets: `comprobantes` y `retoques` (del admin) no cambian. Cada subconsulta es fija (una vez por consulta).
create policy permiso_archivos_insert on storage.objects as restrictive for insert to authenticated
  with check (bucket_id not in ('productos', 'marca-referencias')
    or (bucket_id = 'productos' and (storage.foldername(name))[1] in (select t::text from public.mis_tiendas_con_permiso('catalogo') t))
    or (bucket_id = 'marca-referencias' and (storage.foldername(name))[1] in (select t::text from public.mis_tiendas_con_permiso('marca') t)));
create policy permiso_archivos_update on storage.objects as restrictive for update to authenticated
  using (bucket_id not in ('productos', 'marca-referencias')
    or (bucket_id = 'productos' and (storage.foldername(name))[1] in (select t::text from public.mis_tiendas_con_permiso('catalogo') t))
    or (bucket_id = 'marca-referencias' and (storage.foldername(name))[1] in (select t::text from public.mis_tiendas_con_permiso('marca') t)))
  with check (bucket_id not in ('productos', 'marca-referencias')
    or (bucket_id = 'productos' and (storage.foldername(name))[1] in (select t::text from public.mis_tiendas_con_permiso('catalogo') t))
    or (bucket_id = 'marca-referencias' and (storage.foldername(name))[1] in (select t::text from public.mis_tiendas_con_permiso('marca') t)));
create policy permiso_archivos_delete on storage.objects as restrictive for delete to authenticated
  using (bucket_id not in ('productos', 'marca-referencias')
    or (bucket_id = 'productos' and (storage.foldername(name))[1] in (select t::text from public.mis_tiendas_con_permiso('catalogo') t))
    or (bucket_id = 'marca-referencias' and (storage.foldername(name))[1] in (select t::text from public.mis_tiendas_con_permiso('marca') t)));
