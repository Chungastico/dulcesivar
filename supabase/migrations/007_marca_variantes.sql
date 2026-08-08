-- ============================================================================
-- Migración 007 — Marcar qué insumos vienen en colores
--
-- Ejecutar en: Supabase Dashboard > SQL Editor (proyecto wzumookgpqhoanqeyjkg).
-- Requiere haber corrido antes 006_variantes.sql. Es idempotente.
--
-- Por qué: hasta ahora "¿este insumo tiene colores?" se adivinaba mirando si
-- ya existían filas en content_preset_variants, y por eso el "+ agregar
-- color" aparecía repetido en las 15 filas de "Vasos y tazas" por igual,
-- incluso en las que nunca van a tener uno (una jarra transparente, un
-- squeeze). Con has_variants la clienta lo dice una vez por insumo, desde una
-- casilla, y el resto de las pantallas (compra, carga por lote) solo ofrecen
-- colores donde ella marcó que corresponde.
-- ============================================================================

do $$
begin
  if to_regclass('public.content_preset_variants') is null then
    raise exception
      'Falta public.content_preset_variants. Ejecuta primero supabase/migrations/006_variantes.sql.';
  end if;
end
$$;

alter table public.content_presets
  add column if not exists has_variants boolean not null default false;

-- Los insumos que YA tienen colores cargados (del flujo anterior, antes de
-- que existiera esta casilla) se marcan solos: no tiene sentido que ella
-- tenga que volver a decir algo que el sistema ya sabe por los datos.
update public.content_presets cp
set has_variants = true
where not cp.has_variants
  and exists (
    select 1 from public.content_preset_variants v
    where v.preset_id = cp.id and v.is_active
  );

-- inventory_status gana la columna: el panel la necesita en cada pantalla que
-- ya trae esta vista (compra, carga por lote, costo por insumo), y sin esto
-- tocaría una consulta aparte solo para saber qué insumos la llevan.
create or replace view public.inventory_status as
select
  cp.id,
  cp.label,
  cp.category,
  cp.unit,
  cp.has_variants,
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
group by cp.id, cp.label, cp.category, cp.unit, cp.has_variants, cp.is_active;
