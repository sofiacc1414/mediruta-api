-- HU-01 (corrección) — no todos los domiciliarios son pacientes: el alta
-- automática de PACIENTE al registrarse como DOMICILIARIO pasa a ser
-- opcional (antes era incondicional). Y en la otra dirección, una cuenta
-- ya existente (de cualquier rol) puede pedir el rol que le falta desde
-- su perfil, sin pasar por un registro nuevo (que además chocaría con el
-- UNIQUE de correo).
--
-- app.registrar_usuario cambia de firma (nuevo parámetro con default,
-- CREATE OR REPLACE lo permite sin DROP porque solo agrega al final con
-- valor por defecto — no cambia los que ya existían).

create or replace function app.registrar_usuario(
  p_correo text,
  p_password_hash text,
  p_tipo_registro text,
  p_alta_paciente boolean default true
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_correo text;
  v_password_hash text;
  v_tipo text;
  v_usuario_id uuid;
  v_rol_paciente_id uuid;
  v_rol_domiciliario_id uuid;
begin
  v_correo := lower(btrim(p_correo));
  v_password_hash := btrim(p_password_hash);
  v_tipo := upper(btrim(coalesce(p_tipo_registro, '')));

  if v_correo is null or length(v_correo) = 0 then
    raise exception 'correo inválido'
      using errcode = '22023';
  end if;

  if v_password_hash is null or length(v_password_hash) = 0 then
    raise exception 'password_hash inválido'
      using errcode = '22023';
  end if;

  if v_tipo is distinct from 'PACIENTE' and v_tipo is distinct from 'DOMICILIARIO' then
    raise exception 'tipo de registro inválido'
      using errcode = '22023';
  end if;

  insert into public.usuarios (correo, password_hash, estado_cuenta)
  values (v_correo, v_password_hash, 'activa')
  returning id into v_usuario_id;

  select r.id
  into v_rol_paciente_id
  from public.roles as r
  where r.codigo = 'PACIENTE';

  if not found then
    raise exception 'rol PACIENTE no encontrado en el catálogo'
      using errcode = '22023';
  end if;

  -- Si el registro es como PACIENTE, siempre se otorga (es el propio rol
  -- elegido, p_alta_paciente no aplica acá). Si es como DOMICILIARIO,
  -- ahora es opcional: p_alta_paciente decide si también recibe PACIENTE.
  if v_tipo = 'PACIENTE' or p_alta_paciente then
    insert into public.usuario_roles (usuario_id, rol_id, estado)
    values (v_usuario_id, v_rol_paciente_id, 'habilitado');
  end if;

  if v_tipo = 'DOMICILIARIO' then
    select r.id
    into v_rol_domiciliario_id
    from public.roles as r
    where r.codigo = 'DOMICILIARIO';

    if not found then
      raise exception 'rol DOMICILIARIO no encontrado en el catálogo'
        using errcode = '22023';
    end if;

    insert into public.usuario_roles (usuario_id, rol_id, estado)
    values (v_usuario_id, v_rol_domiciliario_id, 'pendiente_validacion');
  end if;

  return v_usuario_id;
end;
$$;

revoke all on function app.registrar_usuario(text, text, text, boolean) from public;
revoke all on function app.registrar_usuario(text, text, text, boolean) from anon;
revoke all on function app.registrar_usuario(text, text, text, boolean) from authenticated;
grant execute on function app.registrar_usuario(text, text, text, boolean) to mediruta_app;

-- Agrega el rol PACIENTE a una cuenta que todavía no lo tiene — sin
-- validación, mismo criterio que el registro directo como PACIENTE (el
-- perfil paciente en sí se completa después, HU-02).
create or replace function app.solicitar_rol_paciente(
  p_usuario_id uuid
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_rol_id uuid;
  v_ya_lo_tenia boolean;
begin
  if p_usuario_id is null then
    raise exception 'parámetro inválido' using errcode = '22023';
  end if;

  select r.id
  into v_rol_id
  from public.roles as r
  where r.codigo = 'PACIENTE';

  select exists (
    select 1 from public.usuario_roles
    where usuario_id = p_usuario_id and rol_id = v_rol_id
  )
  into v_ya_lo_tenia;

  if v_ya_lo_tenia then
    return 'ya_lo_tenia';
  end if;

  insert into public.usuario_roles (usuario_id, rol_id, estado)
  values (p_usuario_id, v_rol_id, 'habilitado');

  return 'agregado';
end;
$$;

-- Agrega el rol DOMICILIARIO a una cuenta que todavía no lo tiene, en
-- pendiente_validacion — mismo estado inicial que el registro directo
-- como DOMICILIARIO. De ahí en más usa el flujo ya existente de HU-02
-- (completar perfil/documentos) y HU-08 (aprobación del admin) sin
-- cambios: ambos solo exigen que la fila en usuario_roles exista, no
-- que esté habilitada.
create or replace function app.solicitar_rol_domiciliario(
  p_usuario_id uuid
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_rol_id uuid;
  v_ya_lo_tenia boolean;
begin
  if p_usuario_id is null then
    raise exception 'parámetro inválido' using errcode = '22023';
  end if;

  select r.id
  into v_rol_id
  from public.roles as r
  where r.codigo = 'DOMICILIARIO';

  select exists (
    select 1 from public.usuario_roles
    where usuario_id = p_usuario_id and rol_id = v_rol_id
  )
  into v_ya_lo_tenia;

  if v_ya_lo_tenia then
    return 'ya_lo_tenia';
  end if;

  insert into public.usuario_roles (usuario_id, rol_id, estado)
  values (p_usuario_id, v_rol_id, 'pendiente_validacion');

  return 'agregado';
end;
$$;

revoke all on function app.solicitar_rol_paciente(uuid) from public;
revoke all on function app.solicitar_rol_paciente(uuid) from anon;
revoke all on function app.solicitar_rol_paciente(uuid) from authenticated;
grant execute on function app.solicitar_rol_paciente(uuid) to mediruta_app;

revoke all on function app.solicitar_rol_domiciliario(uuid) from public;
revoke all on function app.solicitar_rol_domiciliario(uuid) from anon;
revoke all on function app.solicitar_rol_domiciliario(uuid) from authenticated;
grant execute on function app.solicitar_rol_domiciliario(uuid) to mediruta_app;
