-- ============================================================================
-- Migración 008 — Cantidades enteras
--
-- Ejecutar en: Supabase Dashboard > SQL Editor.
-- Requiere haber corrido antes 004_inventario.sql. Es idempotente.
--
-- Por qué: el formulario de carga por lote tenía el campo de cantidad como
-- <input type="number" step="0.001">. Usando las flechitas del spinner (o las
-- teclas ↑↓) el valor avanzaba de milésima en milésima, así que quedaron
-- guardadas cantidades como 19.999, 9.998, 2.999 y 0.998 donde debía haber
-- 20, 10, 3 y 1. No fue nadie escribiendo decimales a mano: fue el control.
--
-- Esto corrige lo ya guardado. El arreglo del formulario va en el código
-- (step="1" y validación entera en las server actions); sin él, la misma
-- basura vuelve a entrar mañana.
--
-- Solo se toca `quantity`. `total_cost` queda igual porque ESE dato sí es
-- correcto: es lo que dice la factura. Al corregir la cantidad, unit_cost se
-- recalcula solo (es una columna generada) y el promedio ponderado del insumo
-- se acomoda sin intervención.
--
-- No se agrega un CHECK de "entero" a propósito: si algún día entra un insumo
-- que se compra por peso ("2.5 libras de uva"), la columna debe poder
-- guardarlo. La regla de que las unidades son enteras vive en la UI, que es
-- donde se puede relajar por tipo de insumo.
-- ============================================================================

do $$
begin
  if to_regclass('public.inventory_purchases') is null then
    raise exception
      'Falta public.inventory_purchases. Ejecuta primero supabase/migrations/004_inventario.sql.';
  end if;
end
$$;


-- greatest(..., 1) protege el check inventory_purchases_quantity_positive:
-- una cantidad de 0.4 redondearía a 0 y la fila sería rechazada.
update public.inventory_purchases
set quantity = greatest(round(quantity), 1)
where quantity <> round(quantity)
   or quantity = 0;


-- Cuántas quedaron mal, por si hace falta revisar a mano. Debe dar 0 filas.
do $$
declare
  pendientes bigint;
begin
  select count(*) into pendientes
  from public.inventory_purchases
  where quantity <> round(quantity);

  raise notice 'Compras con cantidad decimal restantes: %', pendientes;
end
$$;
