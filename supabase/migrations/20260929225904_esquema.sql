-- Deslizapp — esquema base (docs/03-modelo-de-datos.md es el contrato).
-- Moneda: pesos dominicanos enteros. Fechas: timestamptz (UTC); se muestran en hora de Santo Domingo.
-- Toda tabla de una tienda lleva tienda_id (aislamiento multi-tenant). Las claves compuestas (id, tienda_id)
-- impiden que una fila apunte a algo de OTRA tienda.

create table public.tiendas (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  nombre text not null check (char_length(nombre) between 1 and 80),
  logo_url text,
  marca_color_principal text not null default '#2E2A27' check (marca_color_principal ~ '^#[0-9A-Fa-f]{6}$'),
  marca_color_acento text not null default '#E2B77A' check (marca_color_acento ~ '^#[0-9A-Fa-f]{6}$'),
  marca_estilo text not null default 'elegante' check (marca_estilo in ('elegante', 'moderna', 'divertida', 'clasica')),
  url_catalogo text check (url_catalogo is null or url_catalogo ~ '^https://'),
  plan text not null default 'p20' check (plan in ('p20', 'p60', 'p100', 'custom')),
  limite_productos integer not null default 20 check (limite_productos > 0),
  creditos_retoque integer not null default 100 check (creditos_retoque >= 0),
  creditos_retoque_mensuales integer not null default 100 check (creditos_retoque_mensuales >= 0),
  creado_en timestamptz not null default now()
);

-- Una persona (auth.users) pertenece a una tienda. Se crea a mano (o desde /admin), nunca desde la app.
create table public.usuarios (
  id uuid primary key references auth.users (id) on delete cascade,
  tienda_id uuid not null references public.tiendas (id) on delete cascade,
  email text not null,
  nombre text not null default '',
  rol text not null default 'dueno' check (rol in ('dueno', 'staff'))
);

create table public.productos (
  id uuid primary key default gen_random_uuid(),
  tienda_id uuid not null references public.tiendas (id) on delete cascade,
  nombre text not null check (char_length(nombre) between 1 and 120),
  precio integer not null check (precio >= 0),
  fotos text[] not null default '{}',
  foto_retocada boolean not null default false,
  categoria text,
  activo boolean not null default true,
  destacado boolean not null default false,
  stock integer check (stock is null or stock >= 0), -- null = no controla stock
  likes integer not null default 0 check (likes >= 0),
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  unique (id, tienda_id)
);

create table public.clientes (
  id uuid primary key default gen_random_uuid(),
  tienda_id uuid not null references public.tiendas (id) on delete cascade,
  nombre text not null check (char_length(nombre) between 1 and 120),
  telefono text,
  origen text not null default 'manual' check (origen in ('catalogo', 'manual')),
  primer_pedido_en timestamptz not null default now(),
  nota text check (nota is null or char_length(nota) <= 200),
  pedidos_count integer not null default 0 check (pedidos_count >= 0), -- lo mantiene un trigger (pedidos no cancelados)
  unique (id, tienda_id)
);
-- Un mismo teléfono no se repite dentro de una tienda (la app lo guarda ya normalizado).
create unique index clientes_telefono_unico on public.clientes (tienda_id, telefono) where telefono is not null;

create table public.pedidos (
  id uuid primary key default gen_random_uuid(),
  tienda_id uuid not null references public.tiendas (id) on delete cascade,
  numero integer not null, -- lo asigna un trigger por tienda (1001, 1002…) si no se envía
  cliente_id uuid,
  origen text not null default 'manual' check (origen in ('catalogo', 'manual')),
  estado text not null default 'nuevo' check (estado in ('nuevo', 'por_despachar', 'despachado', 'cancelado')),
  total integer not null default 0 check (total >= 0),
  codigo_promo text,
  creado_en timestamptz not null default now(),
  despachado_en timestamptz,
  unique (tienda_id, numero),
  unique (id, tienda_id),
  foreign key (cliente_id, tienda_id) references public.clientes (id, tienda_id),
  check (estado <> 'despachado' or despachado_en is not null)
);

create table public.pedido_items (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null references public.pedidos (id) on delete cascade,
  producto_id uuid not null references public.productos (id) on delete restrict,
  nombre_producto text not null,
  cantidad integer not null check (cantidad > 0),
  precio_unitario integer not null check (precio_unitario >= 0)
);

create table public.promos (
  id uuid primary key default gen_random_uuid(),
  tienda_id uuid not null references public.tiendas (id) on delete cascade,
  tipo text not null check (tipo in ('codigo', 'coleccion', 'producto')),
  nombre text not null,
  valor_porcentaje integer not null check (valor_porcentaje between 1 and 90), -- solo porcentaje
  codigo text check (codigo is null or codigo = upper(codigo)),
  coleccion text,
  producto_id uuid,
  fecha_inicio timestamptz not null default now(),
  fecha_fin timestamptz,
  estado text not null default 'activa' check (estado in ('activa', 'programada', 'terminada')),
  foreign key (producto_id, tienda_id) references public.productos (id, tienda_id) on delete cascade,
  check (fecha_fin is null or fecha_fin >= fecha_inicio),
  check (
    (tipo = 'codigo' and codigo is not null and coleccion is null and producto_id is null)
    or (tipo = 'coleccion' and coleccion is not null and codigo is null and producto_id is null)
    or (tipo = 'producto' and producto_id is not null and codigo is null and coleccion is null)
  )
);
-- Un código no se repite entre promos vigentes de la misma tienda.
create unique index promos_codigo_vigente on public.promos (tienda_id, codigo) where codigo is not null and estado <> 'terminada';

create table public.eventos_aaah (
  id uuid primary key default gen_random_uuid(),
  tienda_id uuid not null references public.tiendas (id) on delete cascade,
  producto_id uuid not null,
  creado_en timestamptz not null default now(),
  foreign key (producto_id, tienda_id) references public.productos (id, tienda_id) on delete cascade
);

-- Índices de llaves foráneas y de las consultas del panel.
create index usuarios_tienda_idx on public.usuarios (tienda_id);
create index productos_tienda_idx on public.productos (tienda_id);
create index clientes_tienda_idx on public.clientes (tienda_id);
create index pedidos_tienda_fecha_idx on public.pedidos (tienda_id, creado_en desc);
create index pedidos_cliente_idx on public.pedidos (cliente_id, tienda_id);
create index pedido_items_pedido_idx on public.pedido_items (pedido_id);
create index pedido_items_producto_idx on public.pedido_items (producto_id);
create index promos_tienda_estado_idx on public.promos (tienda_id, estado);
create index promos_producto_idx on public.promos (producto_id, tienda_id);
create index eventos_aaah_tienda_fecha_idx on public.eventos_aaah (tienda_id, creado_en desc);
create index eventos_aaah_producto_idx on public.eventos_aaah (producto_id, tienda_id);
