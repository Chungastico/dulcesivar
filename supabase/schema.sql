-- ============================================================================
-- DulcesSivar — Esquema Fase 1 (catálogo)
--
-- Ejecutar en: Supabase Dashboard > SQL Editor > New query > pegar > Run.
-- Es idempotente: se puede volver a correr sin romper nada.
--
-- Modelo de permisos:
--   - El catálogo público lee con la publishable key => RLS solo deja ver
--     los registros activos.
--   - El panel admin escribe con la secret key => ignora RLS por completo.
--     Por eso NO existen políticas de INSERT/UPDATE/DELETE aquí: nadie que
--     use la llave pública puede escribir, por diseño.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Utilidad: mantener updated_at al día
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;


-- ---------------------------------------------------------------------------
-- Líneas de regalo: bodas, aniversario, San Valentín, graduación, ...
-- El `slug` es lo que viaja en la URL compartible: /catalogo?linea=bodas
-- ---------------------------------------------------------------------------
create table if not exists public.product_lines (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  name        text not null,
  description text,
  sort_order  int not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  constraint product_lines_slug_format
    check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);

drop trigger if exists product_lines_set_updated_at on public.product_lines;
create trigger product_lines_set_updated_at
  before update on public.product_lines
  for each row execute function public.set_updated_at();


-- ---------------------------------------------------------------------------
-- Productos (los regalos)
-- ---------------------------------------------------------------------------
create table if not exists public.products (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  name        text not null,
  description text,
  price_usd   numeric(10, 2),
  is_active   boolean not null default true,
  is_featured boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  constraint products_slug_format
    check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint products_price_non_negative
    check (price_usd is null or price_usd >= 0)
);

drop trigger if exists products_set_updated_at on public.products;
create trigger products_set_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

create index if not exists products_active_idx
  on public.products (is_active, created_at desc);


-- ---------------------------------------------------------------------------
-- Qué incluye cada regalo.
-- Tabla propia (en vez de un array de texto) para que la Fase 2 solo tenga
-- que agregar una FK a inventario, sin migrar datos.
-- ---------------------------------------------------------------------------
create table if not exists public.product_contents (
  id         uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  label      text not null,
  quantity   int not null default 1,
  sort_order int not null default 0,

  constraint product_contents_quantity_positive check (quantity > 0)
);

create index if not exists product_contents_product_idx
  on public.product_contents (product_id, sort_order);


-- ---------------------------------------------------------------------------
-- Imágenes. Solo guardamos la ruta dentro del bucket; la URL pública se
-- construye en la app.
-- ---------------------------------------------------------------------------
create table if not exists public.product_images (
  id           uuid primary key default gen_random_uuid(),
  product_id   uuid not null references public.products (id) on delete cascade,
  storage_path text not null,
  alt_text     text,
  sort_order   int not null default 0,
  is_cover     boolean not null default false,
  created_at   timestamptz not null default now()
);

create index if not exists product_images_product_idx
  on public.product_images (product_id, sort_order);

-- Como máximo una portada por producto.
create unique index if not exists product_images_one_cover_idx
  on public.product_images (product_id)
  where is_cover;


-- ---------------------------------------------------------------------------
-- Un producto puede pertenecer a varias líneas
-- (ej. un mismo arreglo sirve para "bodas" y "aniversario").
-- ---------------------------------------------------------------------------
create table if not exists public.product_line_map (
  product_id uuid not null references public.products (id) on delete cascade,
  line_id    uuid not null references public.product_lines (id) on delete cascade,
  primary key (product_id, line_id)
);

create index if not exists product_line_map_line_idx
  on public.product_line_map (line_id);


-- ============================================================================
-- Row Level Security
-- Sin políticas de escritura => la llave pública es de solo lectura.
-- ============================================================================
alter table public.product_lines     enable row level security;
alter table public.products          enable row level security;
alter table public.product_contents  enable row level security;
alter table public.product_images    enable row level security;
alter table public.product_line_map  enable row level security;

drop policy if exists "lineas activas visibles" on public.product_lines;
create policy "lineas activas visibles"
  on public.product_lines for select
  to anon, authenticated
  using (is_active);

drop policy if exists "productos activos visibles" on public.products;
create policy "productos activos visibles"
  on public.products for select
  to anon, authenticated
  using (is_active);

-- Las tablas hijas solo son visibles si su producto lo es.
drop policy if exists "contenido de productos activos" on public.product_contents;
create policy "contenido de productos activos"
  on public.product_contents for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.products p
      where p.id = product_id and p.is_active
    )
  );

drop policy if exists "imagenes de productos activos" on public.product_images;
create policy "imagenes de productos activos"
  on public.product_images for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.products p
      where p.id = product_id and p.is_active
    )
  );

drop policy if exists "relacion linea-producto visible" on public.product_line_map;
create policy "relacion linea-producto visible"
  on public.product_line_map for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.products p
      where p.id = product_id and p.is_active
    )
  );


-- ============================================================================
-- Storage: bucket público de imágenes de producto.
-- Público para lectura (las fotos se ven en el catálogo sin login);
-- la escritura ocurre solo con la secret key desde el panel admin.
-- ============================================================================
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do update set public = true;

drop policy if exists "imagenes de producto son publicas" on storage.objects;
create policy "imagenes de producto son publicas"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'product-images');


-- ============================================================================
-- Datos iniciales: las líneas de regalo con las que arranca el catálogo.
-- Editables después desde el panel admin.
-- ============================================================================
insert into public.product_lines (slug, name, description, sort_order) values
  ('bodas',        'Regalos para Bodas',        'Detalles para novios y celebraciones de boda.', 1),
  ('aniversario',  'Regalos de Aniversario',    'Para celebrar cada año juntos.',                2),
  ('san-valentin', 'San Valentín',              'Regalos para el 14 de febrero.',                3),
  ('cumpleanos',   'Cumpleaños',                'Sorpresas dulces para cumpleaños.',             4),
  ('graduacion',   'Graduación',                'Para celebrar un logro académico.',             5),
  ('dia-madre',    'Día de la Madre',           'Detalles para mamá.',                           6)
on conflict (slug) do nothing;
