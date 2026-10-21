-- Módulo 2 (Chatbot) — catálogo de farmacias aliadas por EPS. A
-- diferencia de niveles_copago (regulado por el Gobierno, casi no
-- cambia), esta tabla SÍ cambia seguido en la vida real (una EPS puede
-- cambiar de gestor farmacéutico de un mes a otro) — por eso queda
-- editable desde el panel admin en vez de fija en código.
create table public.farmacias_aliadas_eps (
  id uuid primary key default gen_random_uuid(),
  eps text not null,
  nombre_farmacia text not null,
  ciudad text not null,
  departamento text,
  direccion text,
  telefono text,
  activo boolean not null default true,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

create index farmacias_aliadas_eps_eps_idx on public.farmacias_aliadas_eps (eps) where activo;

alter table public.farmacias_aliadas_eps enable row level security;
alter table public.farmacias_aliadas_eps force row level security;

create policy "usuario_autenticado_lee_farmacias_aliadas_eps"
  on public.farmacias_aliadas_eps for select
  using (app.current_user_id() is not null);

revoke all on table public.farmacias_aliadas_eps from anon;
revoke all on table public.farmacias_aliadas_eps from authenticated;

-- Lectura pública (cualquier usuario autenticado) — la usa el chatbot
-- para responder "¿cuáles son las farmacias de mi EPS?". Solo trae
-- activas; el admin sí ve inactivas en su propio listado.
create function app.listar_farmacias_aliadas_por_eps(p_usuario_id uuid, p_eps text)
returns table (
  id uuid,
  eps text,
  nombre_farmacia text,
  ciudad text,
  departamento text,
  direccion text,
  telefono text
)
language sql
security definer
set search_path = ''
stable
as $$
  select f.id, f.eps, f.nombre_farmacia, f.ciudad, f.departamento, f.direccion, f.telefono
  from public.farmacias_aliadas_eps f
  where app.current_user_id() is not null
    and p_usuario_id is not null
    and f.activo
    and lower(btrim(f.eps)) = lower(btrim(p_eps))
  order by f.ciudad asc, f.nombre_farmacia asc;
$$;
revoke all on function app.listar_farmacias_aliadas_por_eps(uuid, text) from public, anon, authenticated;
grant execute on function app.listar_farmacias_aliadas_por_eps(uuid, text) to mediruta_app;

-- Admin: CRUD completo (incluye inactivas).
create function app.listar_farmacias_aliadas_admin(p_admin_id uuid)
returns table (
  id uuid,
  eps text,
  nombre_farmacia text,
  ciudad text,
  departamento text,
  direccion text,
  telefono text,
  activo boolean
)
language sql
security definer
set search_path = ''
stable
as $$
  select f.id, f.eps, f.nombre_farmacia, f.ciudad, f.departamento, f.direccion, f.telefono, f.activo
  from public.farmacias_aliadas_eps f
  where (
    app.usuario_tiene_rol_habilitado(p_admin_id, 'ADMINISTRADOR')
    or app.usuario_tiene_rol_habilitado(p_admin_id, 'ROOT')
  )
  order by f.eps asc, f.ciudad asc, f.nombre_farmacia asc;
$$;
revoke all on function app.listar_farmacias_aliadas_admin(uuid) from public, anon, authenticated;
grant execute on function app.listar_farmacias_aliadas_admin(uuid) to mediruta_app;

create function app.guardar_farmacia_aliada_admin(
  p_admin_id uuid,
  p_id uuid,
  p_eps text,
  p_nombre_farmacia text,
  p_ciudad text,
  p_departamento text,
  p_direccion text,
  p_telefono text,
  p_activo boolean
)
returns table (resultado text, id uuid)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if p_admin_id is null then
    raise exception 'parámetro inválido' using errcode = '22023';
  end if;

  if not (
    app.usuario_tiene_rol_habilitado(p_admin_id, 'ADMINISTRADOR')
    or app.usuario_tiene_rol_habilitado(p_admin_id, 'ROOT')
  ) then
    return query select 'no_autorizado'::text, null::uuid;
    return;
  end if;

  if p_eps is null or length(btrim(p_eps)) = 0
     or p_nombre_farmacia is null or length(btrim(p_nombre_farmacia)) = 0
     or p_ciudad is null or length(btrim(p_ciudad)) = 0 then
    return query select 'invalido'::text, null::uuid;
    return;
  end if;

  if p_id is null then
    insert into public.farmacias_aliadas_eps
      (eps, nombre_farmacia, ciudad, departamento, direccion, telefono, activo)
    values (
      btrim(p_eps), btrim(p_nombre_farmacia), btrim(p_ciudad),
      nullif(btrim(coalesce(p_departamento, '')), ''),
      nullif(btrim(coalesce(p_direccion, '')), ''),
      nullif(btrim(coalesce(p_telefono, '')), ''),
      coalesce(p_activo, true)
    )
    returning farmacias_aliadas_eps.id into v_id;
  else
    update public.farmacias_aliadas_eps
    set eps = btrim(p_eps),
      nombre_farmacia = btrim(p_nombre_farmacia),
      ciudad = btrim(p_ciudad),
      departamento = nullif(btrim(coalesce(p_departamento, '')), ''),
      direccion = nullif(btrim(coalesce(p_direccion, '')), ''),
      telefono = nullif(btrim(coalesce(p_telefono, '')), ''),
      activo = coalesce(p_activo, farmacias_aliadas_eps.activo),
      actualizado_en = now()
    where farmacias_aliadas_eps.id = p_id
    returning farmacias_aliadas_eps.id into v_id;

    if v_id is null then
      return query select 'no_encontrado'::text, null::uuid;
      return;
    end if;
  end if;

  return query select 'guardado'::text, v_id;
end;
$$;
revoke all on function app.guardar_farmacia_aliada_admin(uuid, uuid, text, text, text, text, text, text, boolean) from public, anon, authenticated;
grant execute on function app.guardar_farmacia_aliada_admin(uuid, uuid, text, text, text, text, text, text, boolean) to mediruta_app;

create function app.eliminar_farmacia_aliada_admin(p_admin_id uuid, p_id uuid)
returns table (resultado text)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_admin_id is null or p_id is null then
    raise exception 'parámetro inválido' using errcode = '22023';
  end if;

  if not (
    app.usuario_tiene_rol_habilitado(p_admin_id, 'ADMINISTRADOR')
    or app.usuario_tiene_rol_habilitado(p_admin_id, 'ROOT')
  ) then
    return query select 'no_autorizado'::text;
    return;
  end if;

  delete from public.farmacias_aliadas_eps where farmacias_aliadas_eps.id = p_id;
  if not found then
    return query select 'no_encontrado'::text;
    return;
  end if;

  return query select 'eliminado'::text;
end;
$$;
revoke all on function app.eliminar_farmacia_aliada_admin(uuid, uuid) from public, anon, authenticated;
grant execute on function app.eliminar_farmacia_aliada_admin(uuid, uuid) to mediruta_app;

-- Datos de ejemplo para arrancar — el admin los reemplaza/ajusta desde
-- el panel según la red de farmacias real de cada EPS (dato que
-- cambia seguido, ver comentario de la tabla arriba).
insert into public.farmacias_aliadas_eps (eps, nombre_farmacia, ciudad, departamento) values
  ('Nueva EPS', 'Cafam', 'Bogotá', 'Cundinamarca'),
  ('Nueva EPS', 'Audifarma', 'Medellín', 'Antioquia'),
  ('Sura', 'Droguerías Sura', 'Medellín', 'Antioquia'),
  ('Sanitas', 'Cruz Verde', 'Bogotá', 'Cundinamarca'),
  ('Compensar', 'Farmacia Compensar', 'Bogotá', 'Cundinamarca'),
  ('Salud Total', 'Farmatodo', 'Medellín', 'Antioquia'),
  ('Famisanar', 'Colsubsidio', 'Bogotá', 'Cundinamarca');
