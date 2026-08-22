-- Rol PostgreSQL interno para que la API opere con mínimo privilegio (HU-01).
-- Ver context.md, Parte B, secciones 4.1 y 8.
--
-- mediruta_app NO es un rol funcional (PACIENTE, DOMICILIARIO, ADMINISTRADOR, ROOT).
-- La API se conecta como postgres y, en cada transacción:
--   SET LOCAL ROLE mediruta_app;
--   set_config('app.current_user_id', ...);
-- CREATE ROLE aplica por defecto NOSUPERUSER, NOCREATEDB, NOCREATEROLE,
-- NOLOGIN, NOREPLICATION y NOBYPASSRLS. NOINHERIT se fija explícitamente.
-- No se usa ALTER ROLE sobre SUPERUSER / REPLICATION / BYPASSRLS
-- (el rol de migraciones de Supabase no es superusuario real).
-- Tras crear/ajustar, se verifica que no haya atributos peligrosos.
-- Roles de cluster son globales: CREATE ROLE debe ser idempotente (db reset).

do $$
begin
  if not exists (
    select 1
    from pg_roles
    where rolname = 'mediruta_app'
  ) then
    create role mediruta_app
      nologin
      noinherit;
  else
    alter role mediruta_app
      nologin
      noinherit;
  end if;
end
$$;

do $$
declare
  atributos record;
begin
  select
    rolsuper,
    rolcreatedb,
    rolcreaterole,
    rolcanlogin,
    rolreplication,
    rolbypassrls
  into atributos
  from pg_roles
  where rolname = 'mediruta_app';

  if atributos.rolsuper
     or atributos.rolcreatedb
     or atributos.rolcreaterole
     or atributos.rolcanlogin
     or atributos.rolreplication
     or atributos.rolbypassrls then
    raise exception 'mediruta_app tiene atributos PostgreSQL no permitidos';
  end if;
end
$$;

-- postgres puede asumir mediruta_app. Nunca al revés.
grant mediruta_app to postgres
  with inherit false, set true;

grant usage on schema public to mediruta_app;
grant usage on schema app to mediruta_app;

grant execute on function app.current_user_id() to mediruta_app;

grant select on table public.roles to mediruta_app;

grant select (
  id,
  correo,
  estado_cuenta,
  creado_en,
  actualizado_en
) on table public.usuarios to mediruta_app;

grant select on table public.usuario_roles to mediruta_app;

-- Sin GRANT sobre public.sesiones ni public.recuperaciones_contrasena.
-- Sin GRANT INSERT/UPDATE/DELETE sobre usuarios ni usuario_roles.
-- Sin GRANT SELECT sobre usuarios.password_hash.
