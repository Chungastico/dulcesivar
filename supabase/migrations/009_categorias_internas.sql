-- ============================================================================
-- Migración 009 — Categorías internas y desglose de costo
--
-- Ejecutar en: Supabase Dashboard > SQL Editor (proyecto wzumookgpqhoanqeyjkg).
-- Requiere haber corrido antes 004_inventario.sql. Es idempotente.
--
-- "Categorías internas" son datos que ella llena al crear/editar un regalo
-- pero que no aparecen en el catálogo público: si lleva grabado láser, cuánta
-- mano de obra implica y cuánto le cuestan los materiales de decoración
-- (moños, cajas, papel...) que no están en la biblioteca de insumos.
--
-- La mano de obra no se anota en dólares porque varía con el precio: se
-- clasifica como "pequeña" (10%) o "grande" (15%) y el % se aplica sobre el
-- precio de venta. El grabado láser queda como bandera informativa; no tiene
-- un costo fijo asociado todavía, por eso no entra en la suma.
-- ============================================================================

do $$
begin
  if to_regclass('public.products') is null then
    raise exception 'Falta public.products. Ejecuta primero supabase/schema.sql.';
  end if;
end
$$;

alter table public.products
  add column if not exists has_laser_engraving boolean not null default false;

alter table public.products
  add column if not exists labor_size text not null default 'pequena';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'products_labor_size_valid'
  ) then
    alter table public.products
      add constraint products_labor_size_valid
        check (labor_size in ('pequena', 'grande'));
  end if;
end
$$;

alter table public.products
  add column if not exists decor_materials_cost numeric(10, 2) not null default 0;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'products_decor_materials_cost_non_negative'
  ) then
    alter table public.products
      add constraint products_decor_materials_cost_non_negative
        check (decor_materials_cost >= 0);
  end if;
end
$$;


-- ---------------------------------------------------------------------------
-- Costo y margen por producto, ahora con el desglose de las tres fuentes de
-- costo: insumos (lo que ya calculaba la vista anterior), mano de obra
-- (% del precio según labor_size) y materiales de decoración (dato directo
-- del producto). El costo total es la suma de las tres, y el margen se
-- calcula sobre ese total — antes solo restaba insumos.
--
-- Se elimina y se vuelve a crear en vez de CREATE OR REPLACE: la vista
-- anterior tenía "estimated_cost" en la posición donde ahora va
-- "supplies_cost", y Postgres no permite renombrar ni reordenar columnas de
-- una vista existente con REPLACE, solo agregar columnas al final.
-- ---------------------------------------------------------------------------
drop view if exists public.product_costs;

create view public.product_costs as
select
  pr.id                                             as product_id,
  pr.name,
  pr.price_usd,
  count(pc.id)                                      as total_items,
  count(inv.avg_unit_cost)                          as costed_items,
  coalesce(sum(pc.quantity * inv.avg_unit_cost), 0)  as supplies_cost,
  round(
    coalesce(pr.price_usd, 0)
    * case pr.labor_size when 'grande' then 0.15 else 0.10 end,
    2
  )                                                  as labor_cost,
  pr.decor_materials_cost                            as decor_cost,
  coalesce(sum(pc.quantity * inv.avg_unit_cost), 0)
    + round(
        coalesce(pr.price_usd, 0)
        * case pr.labor_size when 'grande' then 0.15 else 0.10 end,
        2
      )
    + pr.decor_materials_cost                        as estimated_cost,
  pr.price_usd - (
    coalesce(sum(pc.quantity * inv.avg_unit_cost), 0)
    + round(
        coalesce(pr.price_usd, 0)
        * case pr.labor_size when 'grande' then 0.15 else 0.10 end,
        2
      )
    + pr.decor_materials_cost
  )                                                  as estimated_margin
from public.products pr
left join public.product_contents pc on pc.product_id = pr.id
left join public.inventory_status inv on inv.id = pc.preset_id
group by pr.id, pr.name, pr.price_usd, pr.labor_size, pr.decor_materials_cost;

revoke all on public.product_costs from anon, authenticated;
