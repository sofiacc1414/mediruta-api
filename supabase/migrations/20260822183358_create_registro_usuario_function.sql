-- Alta pública atómica de identidad + roles (HU-01).
-- Ver context.md, Parte B, sección 4.1 — Modelo multirrol.
--
-- SECURITY DEFINER: mediruta_app no tiene INSERT directo en usuarios/usuario_roles.
-- search_path vacío + nombres calificados. Sin SQL dinámico.
-- Solo PACIENTE o DOMICILIARIO. Nunca ADMINISTRADOR ni ROOT.
-- Correo duplicado: UNIQUE de public.usuarios.correo (23505); no hay SELECT previo.
-- EXECUTE solo para mediruta_app. App/Web no llaman esta función.

create or replace function app.registrar_usuario(
  p_correo text,
  p_password_hash text,
  p_tipo_registro text
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

  insert into public.usuario_roles (usuario_id, rol_id, estado)
  values (v_usuario_id, v_rol_paciente_id, 'habilitado');

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

revoke all on function app.registrar_usuario(text, text, text) from public;
revoke all on function app.registrar_usuario(text, text, text) from anon;
revoke all on function app.registrar_usuario(text, text, text) from authenticated;

grant execute on function app.registrar_usuario(text, text, text)
to mediruta_app;
