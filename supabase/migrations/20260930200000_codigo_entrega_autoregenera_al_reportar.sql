-- Bug real reportado: `app.regenerar_codigo_entrega_admin` tiraba
-- "column reference codigo_entrega is ambiguous" (500 en el panel
-- admin) — el parámetro de salida `codigo_entrega` de la función
-- colisiona con la columna `solicitudes.codigo_entrega` dentro del
-- chequeo de colisión. Se corrige calificando la tabla con alias.
--
-- Además, decisión de producto: el paciente ya no depende de que un
-- admin note la novedad y regenere a mano — `reportar_codigo_no_generado`
-- ahora regenera el código y lo reenvía por correo en el mismo paso,
-- autorresolviendo la novedad (queda igual en el historial para
-- auditoría, pero no aparece en la cola de "novedades abiertas" del
-- admin). `regenerar_codigo_entrega_admin`/`obtener_codigo_entrega_
-- para_correo_admin` quedan como fallback manual del admin, ahora sin
-- el bug.

-- `reportar_codigo_no_generado` cambia de forma de retorno (más
-- columnas) — `create or replace` no permite eso, hay que dropearla.
drop function if exists app.reportar_codigo_no_generado(uuid, uuid, text);

create or replace function app.regenerar_codigo_entrega_admin(
  p_admin_id uuid,
  p_solicitud_id uuid
)
returns table (resultado text, codigo_entrega text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_codigo_entrega text;
  v_charset text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  i integer;
begin
  if p_admin_id is null or p_solicitud_id is null then
    raise exception 'parámetro inválido' using errcode = '22023';
  end if;

  if not (
    app.usuario_tiene_rol_habilitado(p_admin_id, 'ADMINISTRADOR')
    or app.usuario_tiene_rol_habilitado(p_admin_id, 'ROOT')
  ) then
    return query select 'no_autorizado'::text, null::text;
    return;
  end if;

  if not exists (
    select 1 from public.solicitudes
    where id = p_solicitud_id
      and codigo_pedido is not null
      and estado not in ('entregado', 'cancelada')
  ) then
    return query select 'no_encontrado'::text, null::text;
    return;
  end if;

  loop
    v_codigo_entrega := '';
    for i in 1..6 loop
      v_codigo_entrega := v_codigo_entrega
        || substr(v_charset, 1 + floor(random() * length(v_charset))::int, 1);
    end loop;
    exit when not exists (
      select 1 from public.solicitudes s where s.codigo_entrega = v_codigo_entrega
    );
  end loop;

  update public.solicitudes
  set codigo_entrega = v_codigo_entrega, actualizado_en = now()
  where id = p_solicitud_id;

  return query select 'regenerado'::text, v_codigo_entrega;
end;
$$;

-- El paciente reporta que no ve su código: se regenera y se devuelven
-- los datos para reenviarlo por correo en el mismo request, sin pasar
-- por el admin. La novedad igual queda registrada (auditoría /
-- historial) pero autorresuelta — no aparece como pendiente.
create or replace function app.reportar_codigo_no_generado(
  p_paciente_id uuid,
  p_solicitud_id uuid,
  p_detalle text
)
returns table (
  resultado text,
  id uuid,
  codigo_entrega text,
  codigo_pedido text,
  paciente_correo text,
  paciente_nombre text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_detalle text;
  v_codigo_entrega text;
  v_charset text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  v_row record;
  i integer;
begin
  if p_paciente_id is null or p_solicitud_id is null then
    raise exception 'parámetro inválido' using errcode = '22023';
  end if;

  if not exists (
    select 1 from public.solicitudes s
    where s.id = p_solicitud_id
      and s.paciente_id = p_paciente_id
      and s.estado not in ('borrador', 'entregado', 'cancelada')
  ) then
    return query select 'no_encontrado'::text, null::uuid, null::text, null::text, null::text, null::text;
    return;
  end if;

  loop
    v_codigo_entrega := '';
    for i in 1..6 loop
      v_codigo_entrega := v_codigo_entrega
        || substr(v_charset, 1 + floor(random() * length(v_charset))::int, 1);
    end loop;
    exit when not exists (
      select 1 from public.solicitudes s where s.codigo_entrega = v_codigo_entrega
    );
  end loop;

  update public.solicitudes
  set codigo_entrega = v_codigo_entrega, actualizado_en = now()
  where public.solicitudes.id = p_solicitud_id;

  v_detalle := coalesce(
    nullif(btrim(p_detalle), ''),
    'El código de entrega no se generó o no es visible en la app.'
  );

  insert into public.novedad_solicitud
    (solicitud_id, reportada_por, detalle, origen, tipo, resuelta_en, resuelta_por)
  values
    (p_solicitud_id, p_paciente_id, v_detalle, 'paciente', 'codigo', now(), p_paciente_id)
  returning novedad_solicitud.id into v_id;

  select s.codigo_pedido, u.correo, u.nombre_completo
  into v_row
  from public.solicitudes s
  join public.usuarios u on u.id = s.paciente_id
  where s.id = p_solicitud_id;

  return query select
    'reportada'::text, v_id, v_codigo_entrega, v_row.codigo_pedido, v_row.correo, v_row.nombre_completo;
end;
$$;

revoke all on function app.reportar_codigo_no_generado(uuid, uuid, text) from public;
revoke all on function app.reportar_codigo_no_generado(uuid, uuid, text) from anon;
revoke all on function app.reportar_codigo_no_generado(uuid, uuid, text) from authenticated;
grant execute on function app.reportar_codigo_no_generado(uuid, uuid, text) to mediruta_app;
