-- ============================================================================
-- Migración 003 — Biblioteca de insumos
--
-- Ejecutar en: Supabase Dashboard > SQL Editor (proyecto wzumookgpqhoanqeyjkg).
-- Es idempotente.
--
-- Por qué: los ítems de las cajas se repiten casi siempre. "1 Vaso vinero
-- personalizado a láser" y "3 chocolates Ferrero" aparecen en decenas de
-- productos; son los mismos artículos en distintas presentaciones. Escribirlos
-- a mano cada vez es lento y genera variantes ("Ferrero", "ferrero", "Chocolate
-- Ferrero") que después ensucian cualquier búsqueda o conteo.
--
-- Con esta tabla, el formulario ofrece autocompletado y la escritura libre
-- queda solo para lo excepcional.
-- ============================================================================

do $$
begin
  if to_regclass('public.products') is null then
    raise exception
      'Falta la tabla public.products. Confirma que estás en el proyecto correcto.';
  end if;
end
$$;


create table if not exists public.content_presets (
  id          uuid primary key default gen_random_uuid(),
  label       text not null unique,
  -- Agrupador para que la lista sea navegable, no un muro de 60 opciones.
  category    text not null default 'Otros',
  sort_order  int not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

drop trigger if exists content_presets_set_updated_at on public.content_presets;
create trigger content_presets_set_updated_at
  before update on public.content_presets
  for each row execute function public.set_updated_at();

create index if not exists content_presets_category_idx
  on public.content_presets (category, sort_order);

alter table public.content_presets enable row level security;

drop policy if exists "insumos activos visibles" on public.content_presets;
create policy "insumos activos visibles"
  on public.content_presets for select to anon, authenticated
  using (is_active);


-- ---------------------------------------------------------------------------
-- Semilla tomada de las páginas "Agrega detalles Personalizados" y de los
-- ítems que más se repiten en las cajas ya publicadas.
-- ---------------------------------------------------------------------------
insert into public.content_presets (label, category, sort_order) values
  -- Vasos, tazas y termos
  ('Vaso 30 onz personalizado a láser',              'Vasos y tazas',  1),
  ('Taza 14 onz personalizada',                      'Vasos y tazas',  2),
  ('Vaso vinero 12 onz personalizado a láser',       'Vasos y tazas',  3),
  ('Vaso doble pared 30 onz',                        'Vasos y tazas',  4),
  ('Termo Stanley style 40 onz',                     'Vasos y tazas',  5),
  ('Botella de acero matte 500 ml',                  'Vasos y tazas',  6),
  ('Vaso acero tipo Yeti 20 onz',                    'Vasos y tazas',  7),
  ('Vaso acero doble capa 350 ml',                   'Vasos y tazas',  8),
  ('Vaso skinny 600 ml',                             'Vasos y tazas',  9),
  ('Botella acero lechera 500 ml',                   'Vasos y tazas', 10),
  ('Taza con agarradero de corazón',                 'Vasos y tazas', 11),
  ('Taza cerámica blanca',                           'Vasos y tazas', 12),
  ('Squeeze 600 ml',                                 'Vasos y tazas', 13),
  ('Taza transparente',                              'Vasos y tazas', 14),
  ('Taza con cuchara',                               'Vasos y tazas', 15),
  ('Jarra transparente 16 onz',                      'Vasos y tazas', 16),
  ('Vaso transparente con tapadera de madera',       'Vasos y tazas', 17),

  -- Accesorios personalizables
  ('Libreta ecológica con lapicero',                 'Accesorios',     1),
  ('Libreta de cuerina con base para bolígrafo',     'Accesorios',     2),
  ('Estuche metálico con bolígrafo',                 'Accesorios',     3),
  ('Bolígrafo puntero cuerpo de madera',             'Accesorios',     4),
  ('Bolígrafo puntero acabado metálico',             'Accesorios',     5),
  ('Bolígrafo puntero con clip doble función',       'Accesorios',     6),
  ('Set de bolígrafo y portaminas de madera',        'Accesorios',     7),
  ('Llavero metálico diseño rectángulo',             'Accesorios',     8),
  ('Llavero metálico diseño circular',               'Accesorios',     9),
  ('Llavero de acero personalizado a láser',         'Accesorios',    10),
  ('Destapador metálico',                            'Accesorios',    11),
  ('Destapador de madera',                           'Accesorios',    12),
  ('Destapador magnético',                           'Accesorios',    13),
  ('Destapador y sacacorchos',                       'Accesorios',    14),
  ('Portavasos y destapador',                        'Accesorios',    15),
  ('Soporte para celular y tablet',                  'Accesorios',    16),
  ('Joyero personalizado',                           'Accesorios',    17),
  ('Placa estilo militar',                           'Accesorios',    18),
  ('Placa para mascota',                             'Accesorios',    19),

  -- Flores y globos
  ('Rosas',                                          'Flores y globos', 1),
  ('Girasoles',                                      'Flores y globos', 2),
  ('Gerberas',                                       'Flores y globos', 3),
  ('Ramo de flores',                                 'Flores y globos', 4),
  ('Globo personalizado',                            'Flores y globos', 5),
  ('Globo burbuja personalizado',                    'Flores y globos', 6),
  ('Globos con helio',                               'Flores y globos', 7),
  ('Globos con helio personalizados (letras/números)','Flores y globos', 8),
  ('Arco de globos',                                 'Flores y globos', 9),

  -- Comestibles
  ('Chocolates Ferrero Rocher',                      'Comestibles',    1),
  ('Caja de 8 chocolates Ferrero',                   'Comestibles',    2),
  ('Barra de chocolate Hershey',                     'Comestibles',    3),
  ('Bote de semillas mixtas',                        'Comestibles',    4),
  ('Bolsa de pistachos',                             'Comestibles',    5),
  ('Bolsa de marañón',                               'Comestibles',    6),
  ('Café exótico',                                   'Comestibles',    7),
  ('Mini botella de vino Santa Helena',              'Comestibles',    8),
  ('Cervezas Corona o Heineken',                     'Comestibles',    9),
  ('Mini pastel con vela y topper personalizado',    'Comestibles',   10),
  ('Pastel personalizado (pedir 3 días antes)',      'Comestibles',   11),
  ('Postre tres leches',                             'Comestibles',   12),
  ('Muffin',                                         'Comestibles',   13),
  ('Jugo natural',                                   'Comestibles',   14),
  ('Frutas de temporada',                            'Comestibles',   15),

  -- Peluches y decoración
  ('Peluche pequeño (diseño varía)',                 'Peluches y deco', 1),
  ('Peluche mediano (diseño varía)',                 'Peluches y deco', 2),
  ('Vela decorativa',                                'Peluches y deco', 3),
  ('Marco con foto personalizado',                   'Peluches y deco', 4),
  ('Marco con foto y caballete de madera',           'Peluches y deco', 5),
  ('Tronco de madera grabado',                       'Peluches y deco', 6),
  ('Corazón de madera con base',                     'Peluches y deco', 7),
  ('Impresión en 3D',                                'Peluches y deco', 8),

  -- Empaque (casi siempre presente)
  ('Caja de madera personalizada',                   'Empaque',        1),
  ('Caja kraft decorada',                            'Empaque',        2),
  ('Caja cilindro decorada',                         'Empaque',        3),
  ('Caja negra con tapadera transparente',           'Empaque',        4),
  ('Bolsa decorada',                                 'Empaque',        5),
  ('Tarjeta personalizada',                          'Empaque',        6)
on conflict (label) do nothing;
