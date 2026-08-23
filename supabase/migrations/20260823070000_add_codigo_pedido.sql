-- HU-03 (corrección) — "enviar solicitud" nunca generaba un código de
-- pedido: la solicitud solo tenía su `id` (uuid interno, no pensado
-- para mostrarse ni decirse en voz alta/por WhatsApp a un domiciliario
-- más adelante). Se genera recién al enviar (borrador ->
-- pendiente_revision) — mientras está en Borrador no es todavía un
-- "pedido", es una solicitud en progreso; por eso la columna es
-- nullable y solo se completa en ese momento, nunca en crear_solicitud.
--
-- Formato: secuencial con prefijo (MR-000001, MR-000002, ...),
-- consecutivo para toda la plataforma (no por paciente) — elegido por
-- ser el más fácil de leer/decir en voz alta y de ordenar.

create sequence if not exists public.solicitudes_codigo_pedido_seq as bigint start with 1;

-- Solo la usa app.enviar_solicitud (security definer, corre con los
-- privilegios del owner) — no se le da USAGE a mediruta_app: nadie
-- llama nextval() directo, siempre a través de la función.
revoke all on sequence public.solicitudes_codigo_pedido_seq from public;
revoke all on sequence public.solicitudes_codigo_pedido_seq from anon;
revoke all on sequence public.solicitudes_codigo_pedido_seq from authenticated;
revoke all on sequence public.solicitudes_codigo_pedido_seq from mediruta_app;

alter table public.solicitudes add column if not exists codigo_pedido text;

create unique index if not exists solicitudes_codigo_pedido_uk
  on public.solicitudes (codigo_pedido)
  where codigo_pedido is not null;

-- Postgres no permite cambiar las columnas de un RETURNS TABLE vía
-- CREATE OR REPLACE — DROP previo en las tres que ahora exponen
-- codigo_pedido (mismo criterio que en migraciones anteriores).
drop function if exists app.enviar_solicitud(uuid, uuid);
drop function if exists app.obtener_solicitud(uuid, uuid);
drop function if exists app.listar_solicitudes(uuid);

-- G05 — enviar a revisión. Ahora, al pasar a pendiente_revision, genera
-- y guarda el código de pedido — es el único momento en que se genera
-- (no en crear_solicitud: un Borrador todavía no es un pedido).
create or replace function app.enviar_solicitud(
  p_paciente_id uuid,
  p_solicitud_id uuid
)
returns table (
  resultado text,
  faltantes text[],
  codigo_pedido text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_solicitud record;
  v_faltantes text[];
  v_medicamentos_incompletos boolean;
  v_cantidad_medicamentos integer;
  v_codigo text;
begin
  if p_paciente_id is null or p_solicitud_id is null then
    raise exception 'parámetro inválido' using errcode = '22023';
  end if;

  select *
  into v_solicitud
  from public.solicitudes
  where id = p_solicitud_id
    and paciente_id = p_paciente_id
    and estado = 'borrador';

  if not found then
    return query select 'no_encontrada'::text, null::text[], null::text;
    return;
  end if;

  select count(*) into v_cantidad_medicamentos
  from public.solicitud_medicamentos
  where solicitud_id = p_solicitud_id;

  select exists (
    select 1
    from public.solicitud_medicamentos
    where solicitud_id = p_solicitud_id
      and (
        nombre is null or length(btrim(nombre)) = 0
        or concentracion is null or length(btrim(concentracion)) = 0
        or forma_farmaceutica is null or length(btrim(forma_farmaceutica)) = 0
        or cantidad is null or length(btrim(cantidad)) = 0
        or posologia is null or length(btrim(posologia)) = 0
      )
  )
  into v_medicamentos_incompletos;

  v_faltantes := array_remove(array[
    case when v_cantidad_medicamentos = 0 then 'Al menos un medicamento' end,
    case when v_cantidad_medicamentos > 0 and v_medicamentos_incompletos
      then 'Completar todos los campos de cada medicamento' end,
    case when v_solicitud.receta_path is null then 'Foto de la receta' end,
    case when v_solicitud.receta_fecha_vencimiento is null
      then 'Fecha de vencimiento de la receta' end,
    case when v_solicitud.receta_fecha_vencimiento is not null
      and v_solicitud.receta_fecha_vencimiento < current_date
      then 'La receta está vencida — sube una foto de una receta vigente' end,
    case when v_solicitud.direccion_entrega is null
      or length(btrim(v_solicitud.direccion_entrega)) = 0
      then 'Dirección de entrega' end
  ], null);

  if array_length(v_faltantes, 1) > 0 then
    return query select 'incompleta'::text, v_faltantes, null::text;
    return;
  end if;

  v_codigo := 'MR-' || lpad(nextval('public.solicitudes_codigo_pedido_seq')::text, 6, '0');

  update public.solicitudes
  set estado = 'pendiente_revision', enviado_en = now(), actualizado_en = now(),
    codigo_pedido = v_codigo
  where id = p_solicitud_id;

  insert into public.historial_solicitud (solicitud_id, estado)
  values (p_solicitud_id, 'pendiente_revision');

  return query select 'enviada'::text, array[]::text[], v_codigo;
end;
$$;

-- G02 — "Mis solicitudes". Nulo mientras esté en Borrador (todavía no
-- es un pedido).
create or replace function app.listar_solicitudes(p_paciente_id uuid)
returns table (
  id uuid,
  codigo_pedido text,
  estado text,
  creado_en timestamptz
)
language sql
security definer
set search_path = ''
stable
as $$
  select s.id, s.codigo_pedido, s.estado, s.creado_en
  from public.solicitudes s
  where s.paciente_id = p_paciente_id
  order by s.creado_en desc;
$$;

-- G03 — detalle.
create or replace function app.obtener_solicitud(
  p_paciente_id uuid,
  p_solicitud_id uuid
)
returns table (
  id uuid,
  codigo_pedido text,
  estado text,
  receta_path text,
  receta_fecha_vencimiento date,
  direccion_entrega text,
  creado_en timestamptz,
  enviado_en timestamptz,
  cancelado_en timestamptz,
  cedula_path text
)
language sql
security definer
set search_path = ''
stable
as $$
  select
    s.id, s.codigo_pedido, s.estado, s.receta_path, s.receta_fecha_vencimiento,
    s.direccion_entrega, s.creado_en, s.enviado_en, s.cancelado_en,
    pp.foto_cedula_path
  from public.solicitudes s
  left join public.perfil_paciente pp on pp.usuario_id = s.paciente_id
  where s.id = p_solicitud_id
    and s.paciente_id = p_paciente_id;
$$;

revoke all on function app.enviar_solicitud(uuid, uuid) from public;
revoke all on function app.enviar_solicitud(uuid, uuid) from anon;
revoke all on function app.enviar_solicitud(uuid, uuid) from authenticated;
grant execute on function app.enviar_solicitud(uuid, uuid) to mediruta_app;

revoke all on function app.listar_solicitudes(uuid) from public;
revoke all on function app.listar_solicitudes(uuid) from anon;
revoke all on function app.listar_solicitudes(uuid) from authenticated;
grant execute on function app.listar_solicitudes(uuid) to mediruta_app;

revoke all on function app.obtener_solicitud(uuid, uuid) from public;
revoke all on function app.obtener_solicitud(uuid, uuid) from anon;
revoke all on function app.obtener_solicitud(uuid, uuid) from authenticated;
grant execute on function app.obtener_solicitud(uuid, uuid) to mediruta_app;
