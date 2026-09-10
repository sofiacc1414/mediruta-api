-- Recalibra los valores por defecto del domicilio: el copago y el
-- domicilio son dos cosas separadas que se suman (no un total fijo de
-- 25-30k) — el domicilio en sí debe rondar 25-30k ya desde distancias
-- cortas (2-5 km), no recién a los 15-20 km. Con los valores
-- anteriores (base 7000, km 800, min 150) un domicilio de 2.6 km daba
-- ~11.700, muy por debajo de lo esperado.
--
-- Recalculado para que domicilio(2-5 km) caiga en ese rango:
--   domicilio(2 km)  = 20000 + 1200×2 + 200×16 ≈ 25.600
--   domicilio(3 km)  = 20000 + 1200×3 + 200×19 ≈ 27.400
--   domicilio(5 km)  = 20000 + 1200×5 + 200×25 ≈ 31.000
-- (tiempo = 10 + (km/20)×60, sin cambios en tiempo_base_farmacia_min
-- ni velocidad_promedio_kmh — solo se tocan las tarifas monetarias).
--
-- tarifa_por_km_excedente sube en la misma proporción que
-- tarifa_por_km (×1.5 igual que antes) para seguir penalizando un
-- domicilio largo más que el tramo normal.
--
-- Solo actualiza el default de la columna (para que una base nueva
-- arranque ya calibrada) y la fila única de configuración ya
-- existente — no toca nada más del esquema.

alter table public.configuracion_admin
  alter column tarifa_base_domicilio set default 20000;

alter table public.configuracion_admin
  alter column tarifa_por_km set default 1200;

alter table public.configuracion_admin
  alter column tarifa_por_minuto set default 200;

alter table public.configuracion_admin
  alter column tarifa_por_km_excedente set default 2400;

update public.configuracion_admin
set
  tarifa_base_domicilio = 20000,
  tarifa_por_km = 1200,
  tarifa_por_minuto = 200,
  tarifa_por_km_excedente = 2400
where id = 1;
