-- Falta en la migración anterior (wallet_domiciliario_pasarela_pago):
-- `comprobante_pago_path` ya existe en `solicitudes` y `enviar_solicitud`
-- lo valida, pero el paciente sube el comprobante ANTES de enviar (dos
-- pasos, mismo patrón que `actualizar_receta_solicitud`) — sin esta
-- función no hay forma de persistir el path subido a Storage.
create function app.actualizar_comprobante_pago_solicitud(
  p_paciente_id uuid,
  p_solicitud_id uuid,
  p_path text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_paciente_id is null or p_solicitud_id is null then
    raise exception 'parámetro inválido' using errcode = '22023';
  end if;

  if p_path is null or length(btrim(p_path)) = 0 then
    raise exception 'parámetro inválido' using errcode = '22023';
  end if;

  update public.solicitudes
  set comprobante_pago_path = p_path, actualizado_en = now()
  where id = p_solicitud_id
    and paciente_id = p_paciente_id
    and estado = 'borrador';

  return found;
end;
$$;

revoke all on function app.actualizar_comprobante_pago_solicitud(uuid, uuid, text) from public, anon, authenticated;
grant execute on function app.actualizar_comprobante_pago_solicitud(uuid, uuid, text) to mediruta_app;
