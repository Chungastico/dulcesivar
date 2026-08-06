-- ============================================================================
-- Migración 002 — De "líneas de regalo" a taxonomía de N ejes
--
-- Ejecutar en: Supabase Dashboard > SQL Editor. Es idempotente.
--
-- Por qué: el catálogo no se clasifica por un solo criterio. Una misma
-- "Morning Box" puede ser de cumpleaños O de aniversario, ser para mamá, de
-- tamaño mediano y llevar globos. Son ejes independientes que se combinan.
--
-- En vez de una tabla por eje (que obligaría a migrar la base cada vez que
-- aparece un criterio nuevo), los ejes son datos: se crean desde el panel.
--
--   attribute_groups  -> el eje      ("Ocasión", "Tipo de caja")
--   attribute_values  -> sus valores ("Bodas", "Morning Box")
--   product_attributes-> qué valores tiene cada producto
--
-- El slug del eje es el nombre del parámetro en la URL, así el filtro queda
-- compartible tal cual:  /catalogo?ocasion=bodas&tipo-caja=morning-box
-- ============================================================================

create table if not exists public.attribute_groups (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  name        text not null,
  description text,
  sort_order  int not null default 0,
  is_active   boolean not null default true,
  -- Un eje puede existir para uso interno sin aparecer en los filtros
  -- públicos (ej. "costo de proveedor" en el futuro).
  show_in_filters boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  constraint attribute_groups_slug_format
    check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);

drop trigger if exists attribute_groups_set_updated_at on public.attribute_groups;
create trigger attribute_groups_set_updated_at
  before update on public.attribute_groups
  for each row execute function public.set_updated_at();


create table if not exists public.attribute_values (
  id         uuid primary key default gen_random_uuid(),
  group_id   uuid not null references public.attribute_groups (id) on delete cascade,
  slug       text not null,
  name       text not null,
  sort_order int not null default 0,
  is_active  boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- El slug solo debe ser único dentro de su eje: "mini" puede existir en
  -- "tamaño" y en otro eje sin chocar.
  unique (group_id, slug),
  constraint attribute_values_slug_format
    check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);

drop trigger if exists attribute_values_set_updated_at on public.attribute_values;
create trigger attribute_values_set_updated_at
  before update on public.attribute_values
  for each row execute function public.set_updated_at();

create index if not exists attribute_values_group_idx
  on public.attribute_values (group_id, sort_order);


create table if not exists public.product_attributes (
  product_id uuid not null references public.products (id) on delete cascade,
  value_id   uuid not null references public.attribute_values (id) on delete cascade,
  primary key (product_id, value_id)
);

create index if not exists product_attributes_value_idx
  on public.product_attributes (value_id);


-- ---------------------------------------------------------------------------
-- Migrar las líneas existentes al eje "Ocasión", sin perder nada.
-- ---------------------------------------------------------------------------
insert into public.attribute_groups (slug, name, description, sort_order)
values ('ocasion', 'Ocasión', 'El motivo del regalo.', 1)
on conflict (slug) do nothing;

insert into public.attribute_values (group_id, slug, name, sort_order, is_active)
select g.id, l.slug, l.name, l.sort_order, l.is_active
from public.product_lines l
cross join (select id from public.attribute_groups where slug = 'ocasion') g
on conflict (group_id, slug) do nothing;

insert into public.product_attributes (product_id, value_id)
select m.product_id, v.id
from public.product_line_map m
join public.product_lines l on l.id = m.line_id
join public.attribute_groups g on g.slug = 'ocasion'
join public.attribute_values v on v.group_id = g.id and v.slug = l.slug
on conflict do nothing;


-- ---------------------------------------------------------------------------
-- Los demás ejes, precargados con las categorías reales del catálogo actual.
-- Son un punto de partida, no una jaula: todo se edita desde el panel.
-- ---------------------------------------------------------------------------
insert into public.attribute_groups (slug, name, description, sort_order) values
  ('tipo-caja',      'Tipo de caja',       'La presentación del regalo.',      2),
  ('destinatario',   'Destinatario',       'Para quién es.',                   3),
  ('tamano',         'Tamaño',             'Rango del detalle.',               4),
  ('contenido',      'Contenido especial', 'Qué lleva de particular.',         5),
  ('personalizacion','Personalización',    'Cuánto se puede personalizar.',    6)
on conflict (slug) do nothing;

-- Ocasiones que faltaban: las vi en el catálogo pero no estaban en las líneas.
insert into public.attribute_values (group_id, slug, name, sort_order)
select g.id, v.slug, v.name, v.sort_order
from (values
  ('dia-padre',       'Día del Padre',      7),
  ('bienvenida-baby', 'Bienvenida Baby',    8),
  ('agradecimiento',  'Agradecimiento',     9),
  ('bienvenida',      'Bienvenida / Nuevo ingreso', 10)
) as v(slug, name, sort_order)
cross join (select id from public.attribute_groups where slug = 'ocasion') g
on conflict (group_id, slug) do nothing;

insert into public.attribute_values (group_id, slug, name, sort_order)
select g.id, v.slug, v.name, v.sort_order
from (values
  -- Tomados tal cual de los títulos de tus páginas de catálogo.
  ('tipo-caja',       'box',                 'Box',                          1),
  ('tipo-caja',       'morning-box',         'Morning Box',                  2),
  ('tipo-caja',       'box-personalizada',   'Box Personalizada',            3),
  ('tipo-caja',       'box-aniversario',     'Box Aniversario',              4),
  ('tipo-caja',       'box-taza-vasos',      'Box Taza y Vasos',             5),
  ('tipo-caja',       'box-bienvenida-baby', 'Box Bienvenida Baby',          6),
  ('tipo-caja',       'arreglo-globos',      'Arreglo con globos',           7),
  -- La página "Agrega detalles personalizados" son artículos sueltos que se
  -- suman a una caja, no cajas en sí. Van como un tipo aparte para poder
  -- listarlos sin mezclarlos con los regalos armados.
  ('tipo-caja',       'complemento',         'Complemento personalizable',   8),

  ('destinatario',    'mama',                'Mamá',                         1),
  ('destinatario',    'papa',                'Papá',                         2),
  ('destinatario',    'pareja',              'Pareja',                       3),
  ('destinatario',    'abuelos',             'Abuelos',                      4),
  ('destinatario',    'amigos',              'Amigos',                       5),
  ('destinatario',    'bebe',                'Bebé',                         6),
  ('destinatario',    'ninos',               'Niños',                        7),
  ('destinatario',    'profesional',         'Profesional / Doctor',         8),
  ('destinatario',    'companero-trabajo',   'Compañero de trabajo',         9),

  ('tamano',          'mini',                'Mini',                         1),
  ('tamano',          'mediano',             'Mediano',                      2),
  ('tamano',          'grande',              'Grande',                       3),

  ('contenido',       'con-flores',          'Con flores',                   1),
  ('contenido',       'con-globos',          'Con globos',                   2),
  ('contenido',       'con-peluche',         'Con peluche',                  3),
  ('contenido',       'con-chocolates',      'Con chocolates',               4),
  ('contenido',       'con-pastel',          'Con pastel',                   5),
  ('contenido',       'con-licor',           'Con licor / vino',             6),
  ('contenido',       'sin-licor',           'Sin licor',                    7),
  ('contenido',       'con-frutas',          'Con frutas',                   8),
  ('contenido',       'grabado-laser',       'Grabado a láser',              9),
  ('contenido',       'con-vaso',            'Con vaso o taza',             10),
  ('contenido',       'con-semillas',        'Con semillas / snacks',       11),

  ('personalizacion', 'total',               'Totalmente personalizable',    1),
  ('personalizacion', 'parcial',             'Parcialmente personalizable',  2),
  ('personalizacion', 'fijo',                'Sin personalización',          3)
) as v(group_slug, slug, name, sort_order)
join public.attribute_groups g on g.slug = v.group_slug
on conflict (group_id, slug) do nothing;


-- ---------------------------------------------------------------------------
-- RLS: mismas reglas que el resto — lectura pública de lo activo, escritura
-- solo con la secret key.
-- ---------------------------------------------------------------------------
alter table public.attribute_groups   enable row level security;
alter table public.attribute_values   enable row level security;
alter table public.product_attributes enable row level security;

drop policy if exists "ejes activos visibles" on public.attribute_groups;
create policy "ejes activos visibles"
  on public.attribute_groups for select to anon, authenticated
  using (is_active);

drop policy if exists "valores activos visibles" on public.attribute_values;
create policy "valores activos visibles"
  on public.attribute_values for select to anon, authenticated
  using (
    is_active and exists (
      select 1 from public.attribute_groups g
      where g.id = group_id and g.is_active
    )
  );

drop policy if exists "atributos de productos activos" on public.product_attributes;
create policy "atributos de productos activos"
  on public.product_attributes for select to anon, authenticated
  using (
    exists (select 1 from public.products p where p.id = product_id and p.is_active)
  );


-- ---------------------------------------------------------------------------
-- Ya migradas, las tablas viejas sobran.
-- ---------------------------------------------------------------------------
drop table if exists public.product_line_map;
drop table if exists public.product_lines;
