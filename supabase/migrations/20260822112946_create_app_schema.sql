-- Esquema y función base para autenticación propia (no Supabase Auth).
-- Ver DOCS/context.md, Parte B, sección 4.1.
--
-- La API abre cada transacción autenticada fijando:
--   set local app.current_user_id = '<uuid-del-usuario-del-jwt-ya-validado>';
-- Las políticas RLS de todo el proyecto usan app.current_user_id(),
-- nunca auth.uid() (eso pertenece a Supabase Auth, que no se usa aquí).

create schema if not exists app;

create or replace function app.current_user_id() returns uuid as $$
  select nullif(current_setting('app.current_user_id', true), '')::uuid;
$$ language sql stable;
