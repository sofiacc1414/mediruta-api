-- HU-09 — geolocalización de los dos lados del pedido.
--
-- Paciente: departamento/ciudad de contexto para poder geocodificar tanto
-- la dirección de entrega (default de este mismo perfil, HU-03) como la
-- de farmacia de cada pedido (se tipea distinta cada vez, pero se asume
-- la misma ciudad del paciente — nadie pide un domicilio de una farmacia
-- de otra ciudad). Mismo patrón que `direccion`: nullable, con check de
-- no-vacío si se manda.
alter table public.perfil_paciente add column if not exists departamento text;
alter table public.perfil_paciente add column if not exists ciudad text;

alter table public.perfil_paciente add constraint
  perfil_paciente_departamento_no_vacio_check check (
    departamento is null or length(btrim(departamento)) > 0
  );
alter table public.perfil_paciente add constraint
  perfil_paciente_ciudad_no_vacia_check check (
    ciudad is null or length(btrim(ciudad)) > 0
  );

-- Domiciliario: acá NO se geocodifica una dirección de perfil — la
-- ubicación la manda el celular (GPS en vivo) al activar "Disponible".
-- `ubicacion` es una foto instantánea de ese momento, no tracking
-- continuo — se refresca cada vez que se prende "Disponible" o se abre
-- la pantalla de pedidos ya estando disponible.
alter table public.perfil_domiciliario add column if not exists
  disponible boolean not null default false;
alter table public.perfil_domiciliario add column if not exists
  ubicacion geography(Point, 4326);
alter table public.perfil_domiciliario add column if not exists
  ubicacion_actualizada_en timestamptz;
