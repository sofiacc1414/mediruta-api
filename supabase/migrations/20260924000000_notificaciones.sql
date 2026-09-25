-- HU-13 — notificaciones de cambios relevantes.
-- El usuario solo lee y marca las suyas. El alta la hace la API como
-- proceso interno (rol de conexión), no el cliente: así un paciente no
-- puede insertar una notificación a nombre de otro.

create table public.notificaciones (
  id uuid primary key default gen_random_uuid(),
  destinatario_id uuid not null
    references public.usuarios (id) on delete cascade,
  tipo text not null,
  titulo text not null,
  mensaje text not null,
  referencia_tipo text not null,
  referencia_id uuid,
  clave_evento text not null,
  leida boolean not null default false,
  creado_en timestamptz not null default now(),
  constraint notificaciones_tipo_check check (
    tipo in ('cambio_estado', 'asignacion', 'validacion_cuenta')
  ),
  constraint notificaciones_referencia_tipo_check check (
    referencia_tipo in ('pedido', 'cuenta')
  ),
  constraint notificaciones_titulo_len_check check (
    char_length(titulo) between 1 and 80
  ),
  constraint notificaciones_mensaje_len_check check (
    char_length(mensaje) between 1 and 180
  ),
  constraint notificaciones_clave_no_vacia_check check (
    char_length(btrim(clave_evento)) > 0
  )
);

create unique index notificaciones_sin_duplicar_idx
  on public.notificaciones (destinatario_id, tipo, clave_evento);

create index notificaciones_destinatario_idx
  on public.notificaciones (destinatario_id, creado_en desc);

alter table public.notificaciones enable row level security;
alter table public.notificaciones force row level security;

revoke all on table public.notificaciones from anon;
revoke all on table public.notificaciones from authenticated;

create policy notificaciones_solo_propias
  on public.notificaciones
  for select
  to mediruta_app
  using (destinatario_id = app.current_user_id());

-- Tokens de push. Vacía si no hay proveedor configurado. Misma regla:
-- cada usuario solo ve los suyos.
create table public.dispositivo_push (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null
    references public.usuarios (id) on delete cascade,
  token text not null,
  plataforma text not null default 'android',
  creado_en timestamptz not null default now(),
  constraint dispositivo_push_token_no_vacio_check check (
    char_length(btrim(token)) > 0
  ),
  constraint dispositivo_push_token_unico unique (token)
);

alter table public.dispositivo_push enable row level security;
alter table public.dispositivo_push force row level security;

revoke all on table public.dispositivo_push from anon;
revoke all on table public.dispositivo_push from authenticated;

create policy dispositivo_push_solo_propio
  on public.dispositivo_push
  for all
  to mediruta_app
  using (usuario_id = app.current_user_id())
  with check (usuario_id = app.current_user_id());

grant select, insert, update, delete on table public.dispositivo_push to mediruta_app;

-- Lectura y marcado: el id del JWT tiene que coincidir con el destinatario.
create or replace function app.listar_notificaciones(p_usuario_id uuid)
returns table (
  id uuid,
  tipo text,
  titulo text,
  mensaje text,
  referencia_tipo text,
  referencia_id uuid,
  leida boolean,
  creado_en timestamptz
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
    n.id,
    n.tipo,
    n.titulo,
    n.mensaje,
    n.referencia_tipo,
    n.referencia_id,
    n.leida,
    n.creado_en
  from public.notificaciones n
  where n.destinatario_id = p_usuario_id
  order by n.creado_en desc
  limit 50;
end;
$$;

create or replace function app.marcar_notificacion_leida(
  p_usuario_id uuid,
  p_notificacion_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actualizada int;
begin
  if p_usuario_id is null
     or p_usuario_id is distinct from app.current_user_id() then
    return false;
  end if;

  update public.notificaciones
  set leida = true
  where id = p_notificacion_id
    and destinatario_id = p_usuario_id;

  get diagnostics v_actualizada = row_count;
  return v_actualizada > 0;
end;
$$;

create or replace function app.registrar_dispositivo_push(
  p_usuario_id uuid,
  p_token text,
  p_plataforma text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_usuario_id is null
     or p_usuario_id is distinct from app.current_user_id()
     or p_token is null
     or char_length(btrim(p_token)) = 0 then
    return;
  end if;

  insert into public.dispositivo_push (usuario_id, token, plataforma)
  values (p_usuario_id, btrim(p_token), coalesce(nullif(btrim(p_plataforma), ''), 'android'))
  on conflict (token) do update
    set usuario_id = excluded.usuario_id,
        plataforma = excluded.plataforma;
end;
$$;

grant execute on function app.listar_notificaciones(uuid) to mediruta_app;
grant execute on function app.marcar_notificacion_leida(uuid, uuid) to mediruta_app;
grant execute on function app.registrar_dispositivo_push(uuid, text, text) to mediruta_app;
