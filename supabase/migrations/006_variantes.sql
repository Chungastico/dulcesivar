-- ============================================================================
-- Migración 006 — Variantes de insumo (color, etc.)
--
-- Ejecutar en: Supabase Dashboard > SQL Editor (proyecto wzumookgpqhoanqeyjkg).
-- Requiere haber corrido antes 004_inventario.sql. Es idempotente.
--
-- Por qué: "Taza 14 onz personalizada" hoy es una sola fila con un solo stock.
-- En la realidad ella tiene 12 negras y 5 blancas, compradas por separado y a
-- veces a precios distintos. Sin esto, registrar "24 tazas" no dice de qué
-- color, y no hay forma de saber cuándo se acabó un color específico.
--
-- Diseño: las variantes cuelgan del insumo (content_presets), no lo
-- reemplazan. La mayoría de insumos (chocolates, cajas) no tienen variantes y
-- siguen funcionando exactamente igual que antes. Cuando SÍ las tiene, cada
-- compra puede además indicar el color; el insumo base sigue acumulando el
-- costo promedio combinado de todos sus colores, así que el margen por regalo
-- (product_costs) no cambia en absoluto con esta migración.
-- ============================================================================

do $$
begin
  if to_regclass('public.inventory_purchases') is null then
    raise exception
      'Falta public.inventory_purchases. Ejecuta primero supabase/migrations/004_inventario.sql.';
  end if;
end
$$;


create table if not exists public.content_preset_variants (
  id          uuid primary key default gen_random_uuid(),
  preset_id   uuid not null references public.content_presets (id) on delete cascade,
  name        text not null,
  sort_order  int not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  -- "Negro" no se repite dos veces dentro del mismo insumo, pero sí puede
  -- existir "Negro" en dos insumos distintos sin chocar.
  unique (preset_id, name)
);

drop trigger if exists content_preset_variants_set_updated_at on public.content_preset_variants;
create trigger content_preset_variants_set_updated_at
  before update on public.content_preset_variants
  for each row execute function public.set_updated_at();

create index if not exists content_preset_variants_preset_idx
  on public.content_preset_variants (preset_id, sort_order);

alter table public.content_preset_variants enable row level security;

drop policy if exists "variantes activas visibles" on public.content_preset_variants;
create policy "variantes activas visibles"
  on public.content_preset_variants for select
  to anon, authenticated
  using (is_active);


-- ---------------------------------------------------------------------------
-- La compra puede indicar el color. Sigue exigiendo item_id (el insumo base
-- nunca deja de saberse), y variant_id es opcional: los insumos sin colores
-- simplemente nunca lo usan.
-- ---------------------------------------------------------------------------
alter table public.inventory_purchases
  add column if not exists variant_id uuid
    references public.content_preset_variants (id) on delete set null;

create index if not exists inventory_purchases_variant_idx
  on public.inventory_purchases (variant_id, purchased_at desc);

-- Impide guardar "Vaso vinero" con el color "Negro" de la taza: el color
-- tiene que pertenecer al mismo insumo que la compra. Un check normal no
-- puede mirar otra tabla, así que se hace con un trigger.
create or replace function public.check_purchase_variant_matches_item()
returns trigger
language plpgsql
as $$
begin
  if new.variant_id is not null then
    if not exists (
      select 1 from public.content_preset_variants v
      where v.id = new.variant_id and v.preset_id = new.item_id
    ) then
      raise exception 'Ese color no pertenece a este insumo.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists inventory_purchases_variant_check on public.inventory_purchases;
create trigger inventory_purchases_variant_check
  before insert or update on public.inventory_purchases
  for each row execute function public.check_purchase_variant_matches_item();


-- ---------------------------------------------------------------------------
-- Costo y stock por color. Mismo criterio de promedio ponderado que
-- inventory_status, pero agrupado por variante en vez de por insumo entero.
-- ---------------------------------------------------------------------------
create or replace view public.inventory_variant_status as
select
  v.id,
  v.preset_id,
  cp.label                                         as item_label,
  cp.unit,
  v.name                                            as variant_name,
  v.sort_order,
  v.is_active,
  coalesce(sum(p.quantity), 0)                      as total_quantity,
  coalesce(sum(p.total_cost), 0)                    as total_invested,
  case
    when sum(p.quantity) > 0 then sum(p.total_cost) / sum(p.quantity)
    else null
  end                                                as avg_unit_cost,
  count(p.id)                                        as purchase_count,
  max(p.purchased_at)                                as last_purchase_at
from public.content_preset_variants v
join public.content_presets cp on cp.id = v.preset_id
left join public.inventory_purchases p on p.variant_id = v.id
group by v.id, v.preset_id, cp.label, cp.unit, v.name, v.sort_order, v.is_active;

-- Igual que inventory_status y product_costs: información de costos, no es
-- para la llave pública.
revoke all on public.inventory_variant_status from anon, authenticated;
