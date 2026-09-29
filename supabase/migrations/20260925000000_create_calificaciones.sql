-- HU-18 — calificación del servicio tras la entrega.
-- El retiro no borra la fila: conserva pedido, paciente y fechas
-- para auditoría y deja puntuación y comentario en null.

create table public.calificaciones (
  id uuid primary key default gen_random_uuid(),
  solicitud_id uuid not null
    references public.solicitudes (id) on delete restrict,
  paciente_id uuid not null
    references public.usuarios (id) on delete restrict,
  puntuacion smallint,
  comentario text,
  estado text not null default 'activa',
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  retirado_en timestamptz,
  constraint calificaciones_estado_check check (estado in ('activa', 'retirada')),
  constraint calificaciones_puntuacion_check check (
    (estado = 'activa' and puntuacion between 1 and 5)
    or (estado = 'retirada' and puntuacion is null)
  ),
  constraint calificaciones_comentario_len_check check (
    comentario is null or char_length(comentario) <= 300
  )
);

create unique index calificaciones_una_activa_por_pedido_idx
  on public.calificaciones (solicitud_id)
  where estado = 'activa';

create index calificaciones_paciente_idx
  on public.calificaciones (paciente_id, creado_en desc);

alter table public.calificaciones enable row level security;
alter table public.calificaciones force row level security;

revoke all on table public.calificaciones from public;
revoke all on table public.calificaciones from anon;
revoke all on table public.calificaciones from authenticated;

create policy paciente_lee_sus_calificaciones
  on public.calificaciones
  for select
  to mediruta_app
  using (paciente_id = app.current_user_id());

grant select on table public.calificaciones to mediruta_app;

create or replace function app.listar_pedidos_calificacion(p_usuario_id uuid)
returns table (
  id uuid,
  codigo_pedido text,
  estado text,
  creado_en timestamptz,
  cantidad_medicamentos int,
  tiene_calificacion_activa boolean
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_usuario_id is null
     or p_usuario_id is distinct from app.current_user_id() then
    return;
  end if;

  return query
  select
    s.id,
    s.codigo_pedido,
    s.estado,
    s.creado_en,
    coalesce((
      select count(*)::int
      from public.solicitud_medicamentos m
      where m.solicitud_id = s.id
    ), 0) as cantidad_medicamentos,
    exists (
      select 1
      from public.calificaciones c
      where c.solicitud_id = s.id
        and c.paciente_id = p_usuario_id
        and c.estado = 'activa'
    ) as tiene_calificacion_activa
  from public.solicitudes s
  where s.paciente_id = p_usuario_id
    and s.estado <> 'borrador'
  order by s.creado_en desc;
end;
$$;

create or replace function app.obtener_calificacion(
  p_usuario_id uuid,
  p_solicitud_id uuid
)
returns table (
  resultado text,
  id uuid,
  solicitud_id uuid,
  puntuacion smallint,
  comentario text,
  estado text,
  creado_en timestamptz,
  actualizado_en timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_paciente uuid;
begin
  if p_usuario_id is null
     or p_usuario_id is distinct from app.current_user_id() then
    resultado := 'no_autorizado';
    return next;
    return;
  end if;

  select s.paciente_id into v_paciente
  from public.solicitudes s
  where s.id = p_solicitud_id;

  if v_paciente is null then
    resultado := 'pedido_no_encontrado';
    return next;
    return;
  end if;

  if v_paciente is distinct from p_usuario_id then
    resultado := 'pedido_ajeno';
    return next;
    return;
  end if;

  return query
  select
    'ok'::text,
    c.id,
    c.solicitud_id,
    c.puntuacion,
    c.comentario,
    c.estado,
    c.creado_en,
    c.actualizado_en
  from public.calificaciones c
  where c.solicitud_id = p_solicitud_id
    and c.paciente_id = p_usuario_id
    and c.estado = 'activa';

  if not found then
    resultado := 'sin_calificacion';
    return next;
  end if;
end;
$$;

create or replace function app.crear_calificacion(
  p_usuario_id uuid,
  p_solicitud_id uuid,
  p_puntuacion int,
  p_comentario text
)
returns table (
  resultado text,
  id uuid,
  solicitud_id uuid,
  puntuacion smallint,
  comentario text,
  estado text,
  creado_en timestamptz,
  actualizado_en timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_paciente uuid;
  v_estado text;
  v_comentario text;
begin
  if p_usuario_id is null
     or p_usuario_id is distinct from app.current_user_id() then
    resultado := 'no_autorizado';
    return next;
    return;
  end if;

  if p_puntuacion is null or p_puntuacion < 1 or p_puntuacion > 5 then
    resultado := 'puntuacion_invalida';
    return next;
    return;
  end if;

  v_comentario := nullif(btrim(coalesce(p_comentario, '')), '');
  if v_comentario is not null and char_length(v_comentario) > 300 then
    resultado := 'comentario_invalido';
    return next;
    return;
  end if;

  select s.paciente_id, s.estado
    into v_paciente, v_estado
  from public.solicitudes s
  where s.id = p_solicitud_id;

  if v_paciente is null then
    resultado := 'pedido_no_encontrado';
    return next;
    return;
  end if;

  if v_paciente is distinct from p_usuario_id then
    resultado := 'pedido_ajeno';
    return next;
    return;
  end if;

  if v_estado is distinct from 'entregado' then
    resultado := 'pedido_no_entregado';
    return next;
    return;
  end if;

  if exists (
    select 1 from public.calificaciones c
    where c.solicitud_id = p_solicitud_id
      and c.estado = 'activa'
  ) then
    resultado := 'calificacion_activa';
    return next;
    return;
  end if;

  return query
  insert into public.calificaciones (
    solicitud_id, paciente_id, puntuacion, comentario, estado
  ) values (
    p_solicitud_id, p_usuario_id, p_puntuacion, v_comentario, 'activa'
  )
  returning
    'ok'::text,
    calificaciones.id,
    calificaciones.solicitud_id,
    calificaciones.puntuacion,
    calificaciones.comentario,
    calificaciones.estado,
    calificaciones.creado_en,
    calificaciones.actualizado_en;
end;
$$;

create or replace function app.actualizar_calificacion(
  p_usuario_id uuid,
  p_solicitud_id uuid,
  p_puntuacion int,
  p_comentario text
)
returns table (
  resultado text,
  id uuid,
  solicitud_id uuid,
  puntuacion smallint,
  comentario text,
  estado text,
  creado_en timestamptz,
  actualizado_en timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_paciente uuid;
  v_comentario text;
begin
  if p_usuario_id is null
     or p_usuario_id is distinct from app.current_user_id() then
    resultado := 'no_autorizado';
    return next;
    return;
  end if;

  if p_puntuacion is null or p_puntuacion < 1 or p_puntuacion > 5 then
    resultado := 'puntuacion_invalida';
    return next;
    return;
  end if;

  v_comentario := nullif(btrim(coalesce(p_comentario, '')), '');
  if v_comentario is not null and char_length(v_comentario) > 300 then
    resultado := 'comentario_invalido';
    return next;
    return;
  end if;

  select s.paciente_id into v_paciente
  from public.solicitudes s
  where s.id = p_solicitud_id;

  if v_paciente is null then
    resultado := 'pedido_no_encontrado';
    return next;
    return;
  end if;

  if v_paciente is distinct from p_usuario_id then
    resultado := 'pedido_ajeno';
    return next;
    return;
  end if;

  return query
  update public.calificaciones c
  set puntuacion = p_puntuacion,
      comentario = v_comentario,
      actualizado_en = now()
  where c.solicitud_id = p_solicitud_id
    and c.paciente_id = p_usuario_id
    and c.estado = 'activa'
  returning
    'ok'::text,
    c.id,
    c.solicitud_id,
    c.puntuacion,
    c.comentario,
    c.estado,
    c.creado_en,
    c.actualizado_en;

  if not found then
    resultado := 'sin_calificacion';
    return next;
  end if;
end;
$$;

create or replace function app.retirar_calificacion(
  p_usuario_id uuid,
  p_solicitud_id uuid
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_paciente uuid;
  v_actualizada int;
begin
  if p_usuario_id is null
     or p_usuario_id is distinct from app.current_user_id() then
    return 'no_autorizado';
  end if;

  select s.paciente_id into v_paciente
  from public.solicitudes s
  where s.id = p_solicitud_id;

  if v_paciente is null then
    return 'pedido_no_encontrado';
  end if;

  if v_paciente is distinct from p_usuario_id then
    return 'pedido_ajeno';
  end if;

  update public.calificaciones
  set estado = 'retirada',
      puntuacion = null,
      comentario = null,
      retirado_en = now(),
      actualizado_en = now()
  where solicitud_id = p_solicitud_id
    and paciente_id = p_usuario_id
    and estado = 'activa';

  get diagnostics v_actualizada = row_count;
  if v_actualizada = 0 then
    return 'sin_calificacion';
  end if;

  return 'ok';
end;
$$;

revoke all on function app.listar_pedidos_calificacion(uuid) from public;
revoke all on function app.obtener_calificacion(uuid, uuid) from public;
revoke all on function app.crear_calificacion(uuid, uuid, int, text) from public;
revoke all on function app.actualizar_calificacion(uuid, uuid, int, text) from public;
revoke all on function app.retirar_calificacion(uuid, uuid) from public;

grant execute on function app.listar_pedidos_calificacion(uuid) to mediruta_app;
grant execute on function app.obtener_calificacion(uuid, uuid) to mediruta_app;
grant execute on function app.crear_calificacion(uuid, uuid, int, text) to mediruta_app;
grant execute on function app.actualizar_calificacion(uuid, uuid, int, text) to mediruta_app;
grant execute on function app.retirar_calificacion(uuid, uuid) to mediruta_app;
