-- Chat en tiempo real Paciente↔Domiciliario por pedido, con auditoría
-- de solo-lectura para el Admin.
--
-- Sin columna de "estado" ni cron: se deriva al vuelo comparando
-- `solicitudes.estado`/`actualizado_en` contra `now()` en cada función
-- de lectura/envío — el proyecto no tiene cron/scheduler en ningún
-- lado, y `entregado`/`cancelada` son estados terminales (no hay
-- transición posterior que vuelva a tocar `actualizado_en`), así que
-- ese timestamp ya sirve como "cuándo finalizó" sin agregar una
-- columna nueva a `solicitudes` ni tocar `entregar_pedido`/
-- `cancelar_solicitud`.
--
-- Ventana de chat activo: desde que el pedido tiene domiciliario
-- asignado (`domiciliario_id is not null`, estado ya no es
-- 'en_asignacion') hasta 30 minutos después de `entregado`/`cancelada`.

create table public.chats (
  id uuid primary key default gen_random_uuid(),
  solicitud_id uuid not null unique
    references public.solicitudes (id) on delete cascade,
  paciente_id uuid not null
    references public.usuarios (id) on delete cascade,
  domiciliario_id uuid not null
    references public.usuarios (id) on delete cascade,
  creado_en timestamptz not null default now()
);

create table public.chat_mensajes (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid not null
    references public.chats (id) on delete cascade,
  remitente_id uuid not null
    references public.usuarios (id) on delete cascade,
  rol_remitente text not null,
  contenido text not null,
  creado_en timestamptz not null default now(),
  leido_en timestamptz,
  constraint chat_mensajes_rol_remitente_check check (
    rol_remitente in ('PACIENTE', 'DOMICILIARIO')
  ),
  constraint chat_mensajes_contenido_len_check check (
    char_length(contenido) between 1 and 2000
  )
);

create index chat_mensajes_chat_creado_idx
  on public.chat_mensajes (chat_id, creado_en desc);

alter table public.chats enable row level security;
alter table public.chats force row level security;
revoke all on table public.chats from anon;
revoke all on table public.chats from authenticated;

alter table public.chat_mensajes enable row level security;
alter table public.chat_mensajes force row level security;
revoke all on table public.chat_mensajes from anon;
revoke all on table public.chat_mensajes from authenticated;

-- El Paciente/Domiciliario entra al chat de su pedido — crea la fila
-- `chats` la primera vez (idempotente vía el unique de solicitud_id).
-- Valida que el pedido ya tenga domiciliario asignado (si no, no hay
-- con quién chatear todavía) y que p_usuario_id sea el paciente o el
-- domiciliario de esa solicitud.
create or replace function app.obtener_o_crear_chat_pedido(
  p_usuario_id uuid,
  p_solicitud_id uuid
)
returns table (
  resultado text,
  chat_id uuid,
  solo_lectura boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_solicitud record;
  v_chat_id uuid;
begin
  if p_usuario_id is null
     or p_usuario_id is distinct from app.current_user_id() then
    return query select 'no_autorizado', null::uuid, null::boolean;
    return;
  end if;

  select s.paciente_id, s.domiciliario_id, s.estado, s.actualizado_en
  into v_solicitud
  from public.solicitudes s
  where s.id = p_solicitud_id;

  if not found then
    return query select 'pedido_no_encontrado', null::uuid, null::boolean;
    return;
  end if;

  if v_solicitud.paciente_id is distinct from p_usuario_id
     and v_solicitud.domiciliario_id is distinct from p_usuario_id then
    return query select 'no_autorizado', null::uuid, null::boolean;
    return;
  end if;

  if v_solicitud.domiciliario_id is null then
    return query select 'sin_domiciliario_asignado', null::uuid, null::boolean;
    return;
  end if;

  insert into public.chats (solicitud_id, paciente_id, domiciliario_id)
  values (p_solicitud_id, v_solicitud.paciente_id, v_solicitud.domiciliario_id)
  on conflict (solicitud_id) do nothing;

  select c.id into v_chat_id
  from public.chats c
  where c.solicitud_id = p_solicitud_id;

  return query
  select
    'ok',
    v_chat_id,
    (
      v_solicitud.estado in ('entregado', 'cancelada')
      and v_solicitud.actualizado_en + interval '30 minutes' < now()
    );
end;
$$;

create or replace function app.enviar_mensaje_chat(
  p_usuario_id uuid,
  p_chat_id uuid,
  p_contenido text
)
returns table (
  resultado text,
  id uuid,
  chat_id uuid,
  remitente_id uuid,
  rol_remitente text,
  contenido text,
  creado_en timestamptz,
  destinatario_id uuid,
  solicitud_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_chat record;
  v_solicitud record;
  v_rol text;
  v_destinatario uuid;
  v_mensaje record;
begin
  if p_usuario_id is null
     or p_usuario_id is distinct from app.current_user_id() then
    return query select 'no_autorizado', null::uuid, null::uuid, null::uuid, null::text, null::text, null::timestamptz, null::uuid, null::uuid;
    return;
  end if;

  if p_contenido is null or char_length(btrim(p_contenido)) = 0 then
    return query select 'contenido_vacio', null::uuid, null::uuid, null::uuid, null::text, null::text, null::timestamptz, null::uuid, null::uuid;
    return;
  end if;

  select c.paciente_id, c.domiciliario_id, c.solicitud_id
  into v_chat
  from public.chats c
  where c.id = p_chat_id;

  if not found then
    return query select 'chat_no_encontrado', null::uuid, null::uuid, null::uuid, null::text, null::text, null::timestamptz, null::uuid, null::uuid;
    return;
  end if;

  if v_chat.paciente_id = p_usuario_id then
    v_rol := 'PACIENTE';
    v_destinatario := v_chat.domiciliario_id;
  elsif v_chat.domiciliario_id = p_usuario_id then
    v_rol := 'DOMICILIARIO';
    v_destinatario := v_chat.paciente_id;
  else
    return query select 'no_autorizado', null::uuid, null::uuid, null::uuid, null::text, null::text, null::timestamptz, null::uuid, null::uuid;
    return;
  end if;

  select s.estado, s.actualizado_en into v_solicitud
  from public.solicitudes s
  where s.id = v_chat.solicitud_id;

  if v_solicitud.estado in ('entregado', 'cancelada')
     and v_solicitud.actualizado_en + interval '30 minutes' < now() then
    return query select 'chat_solo_lectura', null::uuid, null::uuid, null::uuid, null::text, null::text, null::timestamptz, null::uuid, null::uuid;
    return;
  end if;

  insert into public.chat_mensajes (chat_id, remitente_id, rol_remitente, contenido)
  values (p_chat_id, p_usuario_id, v_rol, btrim(p_contenido))
  returning chat_mensajes.id, chat_mensajes.chat_id, chat_mensajes.remitente_id,
    chat_mensajes.rol_remitente, chat_mensajes.contenido, chat_mensajes.creado_en
  into v_mensaje;

  return query
  select 'ok', v_mensaje.id, v_mensaje.chat_id, v_mensaje.remitente_id,
    v_mensaje.rol_remitente, v_mensaje.contenido, v_mensaje.creado_en, v_destinatario,
    v_chat.solicitud_id;
end;
$$;

create or replace function app.listar_mensajes_chat(
  p_usuario_id uuid,
  p_chat_id uuid
)
returns table (
  id uuid,
  remitente_id uuid,
  rol_remitente text,
  contenido text,
  creado_en timestamptz,
  leido_en timestamptz
)
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_chat record;
begin
  if p_usuario_id is null
     or p_usuario_id is distinct from app.current_user_id() then
    return;
  end if;

  select c.paciente_id, c.domiciliario_id into v_chat
  from public.chats c
  where c.id = p_chat_id;

  if not found
     or (v_chat.paciente_id is distinct from p_usuario_id
         and v_chat.domiciliario_id is distinct from p_usuario_id) then
    return;
  end if;

  return query
  select m.id, m.remitente_id, m.rol_remitente, m.contenido, m.creado_en, m.leido_en
  from public.chat_mensajes m
  where m.chat_id = p_chat_id
  order by m.creado_en asc;
end;
$$;

create or replace function app.marcar_mensajes_leidos_chat(
  p_usuario_id uuid,
  p_chat_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_chat record;
begin
  if p_usuario_id is null
     or p_usuario_id is distinct from app.current_user_id() then
    return;
  end if;

  select c.paciente_id, c.domiciliario_id into v_chat
  from public.chats c
  where c.id = p_chat_id;

  if not found
     or (v_chat.paciente_id is distinct from p_usuario_id
         and v_chat.domiciliario_id is distinct from p_usuario_id) then
    return;
  end if;

  update public.chat_mensajes
  set leido_en = now()
  where chat_id = p_chat_id
    and remitente_id <> p_usuario_id
    and leido_en is null;
end;
$$;

-- Auditoría del Admin — sin restricción de ownership (gateada por rol
-- desde Nest, mismo criterio que app.listar_pedidos_admin).
create or replace function app.listar_mensajes_chat_admin(
  p_solicitud_id uuid
)
returns table (
  id uuid,
  chat_id uuid,
  remitente_id uuid,
  rol_remitente text,
  contenido text,
  creado_en timestamptz,
  leido_en timestamptz
)
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  return query
  select m.id, m.chat_id, m.remitente_id, m.rol_remitente, m.contenido, m.creado_en, m.leido_en
  from public.chat_mensajes m
  join public.chats c on c.id = m.chat_id
  where c.solicitud_id = p_solicitud_id
  order by m.creado_en asc;
end;
$$;

revoke all on function app.obtener_o_crear_chat_pedido(uuid, uuid) from public;
revoke all on function app.obtener_o_crear_chat_pedido(uuid, uuid) from anon;
revoke all on function app.obtener_o_crear_chat_pedido(uuid, uuid) from authenticated;
grant execute on function app.obtener_o_crear_chat_pedido(uuid, uuid) to mediruta_app;

revoke all on function app.enviar_mensaje_chat(uuid, uuid, text) from public;
revoke all on function app.enviar_mensaje_chat(uuid, uuid, text) from anon;
revoke all on function app.enviar_mensaje_chat(uuid, uuid, text) from authenticated;
grant execute on function app.enviar_mensaje_chat(uuid, uuid, text) to mediruta_app;

revoke all on function app.listar_mensajes_chat(uuid, uuid) from public;
revoke all on function app.listar_mensajes_chat(uuid, uuid) from anon;
revoke all on function app.listar_mensajes_chat(uuid, uuid) from authenticated;
grant execute on function app.listar_mensajes_chat(uuid, uuid) to mediruta_app;

revoke all on function app.marcar_mensajes_leidos_chat(uuid, uuid) from public;
revoke all on function app.marcar_mensajes_leidos_chat(uuid, uuid) from anon;
revoke all on function app.marcar_mensajes_leidos_chat(uuid, uuid) from authenticated;
grant execute on function app.marcar_mensajes_leidos_chat(uuid, uuid) to mediruta_app;

revoke all on function app.listar_mensajes_chat_admin(uuid) from public;
revoke all on function app.listar_mensajes_chat_admin(uuid) from anon;
revoke all on function app.listar_mensajes_chat_admin(uuid) from authenticated;
grant execute on function app.listar_mensajes_chat_admin(uuid) to mediruta_app;

-- Nuevo tipo de notificación push para un mensaje de chat nuevo.
alter table public.notificaciones drop constraint notificaciones_tipo_check;
alter table public.notificaciones add constraint notificaciones_tipo_check check (
  tipo in ('cambio_estado', 'asignacion', 'validacion_cuenta', 'mensaje_chat')
);
