-- ============================================================================
-- Migración 004 — Inventario y costos
--
-- Ejecutar en: Supabase Dashboard > SQL Editor (proyecto wzumookgpqhoanqeyjkg).
-- Requiere haber corrido antes 003_insumos.sql. Es idempotente.
--
-- Idea central: los insumos de content_presets YA son las cosas que ella
-- compra ("Chocolates Ferrero Rocher", "Vaso vinero"). No hace falta una tabla
-- paralela de artículos; basta con registrarles las compras.
--
-- Cada compra se anota como cantidad + precio TOTAL pagado, que es como llega
-- la información real (una factura dice "$18 por 24 chocolates", no el unitario).
-- El costo por unidad lo calcula la base, así no hay divisiones a mano ni
-- errores de redondeo capturados como dato.
--
-- Comprar a mayoreo y al detalle cambia el unitario del mismo artículo, por eso
-- el costo que se usa para valorar es el PROMEDIO PONDERADO de lo comprado:
-- total invertido / total de unidades. Es el criterio contable correcto cuando
-- el mismo insumo entra a precios distintos.
-- ============================================================================

do $$
begin
  if to_regclass('public.content_presets') is null then
    raise exception
      'Falta public.content_presets. Ejecuta primero supabase/migrations/003_insumos.sql.';
  end if;
end
$$;


-- ---------------------------------------------------------------------------
-- Unidad de medida del insumo. "3 chocolates" y "2 libras de uva" no se
-- cuentan igual, y sin esto el inventario mezclaría peras con manzanas.
-- ---------------------------------------------------------------------------
alter table public.content_presets
  add column if not exists unit text not null default 'unidad';


-- ---------------------------------------------------------------------------
-- Compras. Una fila por cada vez que repone un insumo.
-- ---------------------------------------------------------------------------
create table if not exists public.inventory_purchases (
  id            uuid primary key default gen_random_uuid(),
  item_id       uuid not null references public.content_presets (id) on delete cascade,

  quantity      numeric(12, 3) not null,
  total_cost    numeric(12, 2) not null,

  -- Calculado por la base a partir de lo que sí se conoce con certeza.
  unit_cost     numeric(12, 4)
                generated always as (total_cost / nullif(quantity, 0)) stored,

  purchase_type text not null default 'individual',
  supplier      text,
  purchased_at  date not null default current_date,
  notes         text,
  created_at    timestamptz not null default now(),

  constraint inventory_purchases_quantity_positive check (quantity > 0),
  constraint inventory_purchases_cost_non_negative check (total_cost >= 0),
  constraint inventory_purchases_type_valid
    check (purchase_type in ('mayoreo', 'individual'))
);

create index if not exists inventory_purchases_item_idx
  on public.inventory_purchases (item_id, purchased_at desc);


-- ---------------------------------------------------------------------------
-- Enlace insumo <-> contenido de producto.
--
-- Hasta ahora el contenido de un regalo era texto libre. Sin este enlace no se
-- puede saber cuánto cuesta armar una caja: "3 chocolates Ferrero" sería una
-- cadena sin precio detrás.
--
-- Se deja NULL a propósito para los ítems escritos a mano: no todo lo que
-- entra en una caja está en la biblioteca, y obligar a que lo esté frenaría la
-- carga. Esos ítems simplemente no suman al costo.
-- ---------------------------------------------------------------------------
alter table public.product_contents
  add column if not exists preset_id uuid
    references public.content_presets (id) on delete set null;

create index if not exists product_contents_preset_idx
  on public.product_contents (preset_id);

-- Enlaza de una vez lo ya cargado, comparando por nombre sin distinguir
-- mayúsculas ni espacios sobrantes.
update public.product_contents pc
set preset_id = cp.id
from public.content_presets cp
where pc.preset_id is null
  and lower(btrim(pc.label)) = lower(btrim(cp.label));


-- ---------------------------------------------------------------------------
-- Costo por insumo: promedio ponderado sobre todo lo comprado.
-- ---------------------------------------------------------------------------
create or replace view public.inventory_status as
select
  cp.id,
  cp.label,
  cp.category,
  cp.unit,
  cp.is_active,
  coalesce(sum(p.quantity), 0)                    as total_quantity,
  coalesce(sum(p.total_cost), 0)                  as total_invested,
  case
    when sum(p.quantity) > 0 then sum(p.total_cost) / sum(p.quantity)
    else null
  end                                             as avg_unit_cost,
  count(p.id)                                     as purchase_count,
  max(p.purchased_at)                             as last_purchase_at
from public.content_presets cp
left join public.inventory_purchases p on p.item_id = cp.id
group by cp.id, cp.label, cp.category, cp.unit, cp.is_active;


-- ---------------------------------------------------------------------------
-- Costo y margen por producto.
--
-- Solo suma los ítems enlazados a un insumo con compras registradas. Por eso
-- se expone `costed_items` junto a `total_items`: un costo de $12 significa
-- una cosa si cubre 3 de 3 ítems y otra muy distinta si cubre 1 de 6, y sin
-- ese dato el margen se leería como exacto cuando está incompleto.
-- ---------------------------------------------------------------------------
create or replace view public.product_costs as
select
  pr.id                                            as product_id,
  pr.name,
  pr.price_usd,
  count(pc.id)                                     as total_items,
  count(inv.avg_unit_cost)                         as costed_items,
  coalesce(sum(pc.quantity * inv.avg_unit_cost), 0) as estimated_cost,
  pr.price_usd - coalesce(sum(pc.quantity * inv.avg_unit_cost), 0) as estimated_margin
from public.products pr
left join public.product_contents pc on pc.product_id = pr.id
left join public.inventory_status inv on inv.id = pc.preset_id
group by pr.id, pr.name, pr.price_usd;


-- ---------------------------------------------------------------------------
-- RLS. Los costos son información interna: a diferencia del catálogo, aquí no
-- hay política de lectura pública. Solo la secret key del panel los ve.
-- ---------------------------------------------------------------------------
alter table public.inventory_purchases enable row level security;

-- Las vistas heredan el RLS de sus tablas base en Postgres 15+, pero
-- content_presets sí es legible por anon. Se revoca el acceso a las vistas de
-- costo para que la llave pública no pueda consultarlas.
revoke all on public.inventory_status from anon, authenticated;
revoke all on public.product_costs from anon, authenticated;
