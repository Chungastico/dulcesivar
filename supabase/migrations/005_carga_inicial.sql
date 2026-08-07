-- ============================================================================
-- Migración 005 — Tipo de compra "inicial"
--
-- Ejecutar en: Supabase Dashboard > SQL Editor (proyecto wzumookgpqhoanqeyjkg).
-- Requiere haber corrido antes 004_inventario.sql. Es idempotente.
--
-- Por qué: cargar el stock que ya se tiene al empezar a usar el sistema no es
-- una "compra" en el sentido de mayoreo/individual — es un conteo de partida.
-- Se modela como su propio tipo, no como una tabla aparte, para que siga
-- sumando al costo promedio del insumo igual que cualquier otra entrada, pero
-- se pueda distinguir en reportes futuros (y no se confunda con una compra real
-- a un proveedor).
-- ============================================================================

do $$
begin
  if to_regclass('public.inventory_purchases') is null then
    raise exception
      'Falta public.inventory_purchases. Ejecuta primero supabase/migrations/004_inventario.sql.';
  end if;
end
$$;

alter table public.inventory_purchases
  drop constraint if exists inventory_purchases_type_valid;

alter table public.inventory_purchases
  add constraint inventory_purchases_type_valid
    check (purchase_type in ('mayoreo', 'individual', 'inicial'));
