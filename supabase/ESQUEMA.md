# Esquema de base de datos — MediRuta

Referencia viva del estado real de la base de datos. Se actualiza **en el mismo PR** que la migración que modifica algo (ver `context.md`, sección 9.1). Consúltalo antes de escribir cualquier query, caso de uso o migración nueva — no asumas ni inventes columnas.

## Esquema `app`

### Función `app.current_user_id()`
Reemplaza a `auth.uid()` de Supabase Auth (que no se usa en este proyecto). Lee el id del usuario autenticado desde la variable de sesión `app.current_user_id`, que la API fija con `set local` al abrir cada transacción autenticada.

- Migración: `20260822112946_create_app_schema.sql`

## Tablas

### `roles`

Catálogo de roles del sistema. Fuente única de los códigos disponibles. **No** hay columna `usuarios.rol`; las asignaciones vivirán en `usuario_roles` (migración posterior).

| Columna | Tipo | Notas |
|---|---|---|
| `id` | `uuid` | PK; default `gen_random_uuid()` |
| `codigo` | `text` | `NOT NULL`; `UNIQUE`; `CHECK` solo `PACIENTE`, `DOMICILIARIO`, `ADMINISTRADOR`, `ROOT` |
| `descripcion` | `text` | nullable |
| `creado_en` | `timestamptz` | `NOT NULL`; default `now()` |

**Códigos de catálogo (insertados en la misma migración):**
- `PACIENTE`
- `DOMICILIARIO`
- `ADMINISTRADOR`
- `ROOT`

**Relaciones (FKs):**
- Ninguna. Esta tabla no referencia otras tablas.

**RLS:**
- `ENABLE ROW LEVEL SECURITY`
- `FORCE ROW LEVEL SECURITY`

**Políticas RLS activas:**
- `autenticado_lee_catalogo_roles` — `SELECT` cuando `app.current_user_id() IS NOT NULL`. No hay políticas INSERT/UPDATE/DELETE: el catálogo se administra por migraciones.

**Migración:** `20260822172244_create_roles.sql`

### `usuarios`

Identidad de la cuenta, credenciales y estado general de acceso. **No** contiene roles (eso irá en `usuario_roles`). **No** contiene información de perfil (HU-02 y siguientes). `password_hash` almacena únicamente el hash generado por la API; nunca la contraseña en texto plano.

| Columna | Tipo | Notas |
|---|---|---|
| `id` | `uuid` | PK; default `gen_random_uuid()` |
| `correo` | `text` | `NOT NULL`; `UNIQUE`; formato canónico (`lower(btrim(...))`); no vacío |
| `password_hash` | `text` | `NOT NULL`; hash de contraseña (nunca texto plano) |
| `estado_cuenta` | `text` | `NOT NULL`; default `'activa'`; `CHECK` solo `activa`, `bloqueada`, `desactivada` |
| `creado_en` | `timestamptz` | `NOT NULL`; default `now()` |
| `actualizado_en` | `timestamptz` | `NOT NULL`; default `now()`; lo actualiza la API (sin trigger) |

**Restricciones:**
- PK: `id`
- `usuarios_correo_key` — `UNIQUE (correo)`
- `usuarios_correo_canonico_check` — `correo = lower(btrim(correo))`
- `usuarios_correo_no_vacio_check` — `length(correo) > 0`
- `usuarios_estado_cuenta_check` — `activa` \| `bloqueada` \| `desactivada`

**Relaciones (FKs):**
- Ninguna en esta tabla. La relación con `roles` se incorporará mediante `usuario_roles` en una migración posterior.

**RLS:**
- `ENABLE ROW LEVEL SECURITY`
- `FORCE ROW LEVEL SECURITY`

**Políticas RLS activas:**
- `usuario_lee_su_cuenta` — `SELECT` cuando `id = app.current_user_id()`. No hay políticas INSERT/UPDATE/DELETE.

**Migración:** `20260822175133_create_usuarios.sql`

### `usuario_roles`

Asignación de uno o más roles del catálogo a una cuenta. Una persona tiene una sola cuenta y puede tener varios roles. **No** existe `usuarios.rol`.

| Columna | Tipo | Notas |
|---|---|---|
| `id` | `uuid` | PK; default `gen_random_uuid()` |
| `usuario_id` | `uuid` | `NOT NULL`; FK a `usuarios.id` |
| `rol_id` | `uuid` | `NOT NULL`; FK a `roles.id` |
| `estado` | `text` | `NOT NULL`; `CHECK` solo `habilitado`, `pendiente_validacion`, `rechazado` |
| `creado_en` | `timestamptz` | `NOT NULL`; default `now()` |
| `actualizado_en` | `timestamptz` | `NOT NULL`; default `now()`; lo actualiza la API (sin trigger) |

**Restricciones:**
- PK: `id`
- `usuario_roles_usuario_rol_key` — `UNIQUE (usuario_id, rol_id)` (un usuario no puede tener el mismo rol dos veces)
- `usuario_roles_estado_check` — `habilitado` \| `pendiente_validacion` \| `rechazado`

**Relaciones (FKs):**
- `usuario_roles_usuario_id_fkey` — `usuario_id` → `usuarios.id` `ON DELETE CASCADE` (si la cuenta se elimina físicamente, no quedan asignaciones huérfanas; la desactivación normal usa `usuarios.estado_cuenta`, no DELETE)
- `usuario_roles_rol_id_fkey` — `rol_id` → `roles.id` **sin** `ON DELETE CASCADE` (el catálogo es estructural y no se borra en cascada)

**RLS:**
- `ENABLE ROW LEVEL SECURITY`
- `FORCE ROW LEVEL SECURITY`

**Políticas RLS activas:**
- `usuario_lee_sus_roles` — `SELECT` cuando `usuario_id = app.current_user_id()`. No hay políticas INSERT/UPDATE/DELETE ni política administrativa (`app.usuario_tiene_rol` se creará después).

**Reglas de negocio HU-01 (las aplica la API en una transacción; no hay triggers ni inserts en esta migración):**
- Registro PACIENTE: `PACIENTE` → `habilitado`
- Registro DOMICILIARIO: `PACIENTE` → `habilitado` y `DOMICILIARIO` → `pendiente_validacion` (puede usar MediRuta como paciente mientras HU-08 valida el rol Domiciliario)
- ADMINISTRADOR y ROOT no tienen registro público; se asignan solo por mecanismos internos/seeds autorizados

`usuario_roles.estado` es el estado de la **asignación de rol**. Es distinto de `usuarios.estado_cuenta` (`activa` / `bloqueada` / `desactivada`).

**Migración:** `20260822175639_create_usuario_roles.sql`

### `sesiones`

Sesiones revocables de la autenticación propia de MediRuta (access JWT corto + refresh opaco). **No** son sesiones de Supabase Auth / GoTrue. El access token lleva `sub` (usuario), `sid` (`sesiones.id`), `iat` y `exp`. Los roles **no** son autoridad en el JWT; se consultan en BD.

| Columna | Tipo | Notas |
|---|---|---|
| `id` | `uuid` | PK; default `gen_random_uuid()`; claim `sid` del access JWT |
| `usuario_id` | `uuid` | `NOT NULL`; FK a `usuarios.id` |
| `refresh_token_hash` | `text` | `NOT NULL`; `UNIQUE`; solo el hash (nunca el refresh token original) |
| `revocada` | `boolean` | `NOT NULL`; default `false` |
| `expira_en` | `timestamptz` | `NOT NULL`; debe ser posterior a `creado_en` |
| `user_agent` | `text` | nullable; cliente/dispositivo opcional |
| `ip` | `inet` | nullable; IP opcional |
| `creado_en` | `timestamptz` | `NOT NULL`; default `now()` |
| `actualizado_en` | `timestamptz` | `NOT NULL`; default `now()`; lo actualiza la API (sin trigger) |

**Restricciones:**
- PK: `id`
- `sesiones_refresh_token_hash_key` — `UNIQUE (refresh_token_hash)`
- `sesiones_refresh_token_hash_no_vacio_check` — `length(refresh_token_hash) > 0`
- `sesiones_expira_en_posterior_check` — `expira_en > creado_en`

**Relaciones (FKs):**
- `sesiones_usuario_id_fkey` — `usuario_id` → `usuarios.id` `ON DELETE CASCADE`

**Seguridad / RLS:**
- `ENABLE ROW LEVEL SECURITY`
- `FORCE ROW LEVEL SECURITY`
- **Sin policies de forma intencional.** Con RLS+FORCE y sin policies, el acceso DML normal queda denegado. App y Web no consultan esta tabla; no se expone por PostgREST (`REVOKE` a `anon` y `authenticated` solo sobre `public.sesiones`).
- El refresh token original nunca se almacena. PostgreSQL no impone el algoritmo del hash; eso lo define la API.

**Uso conceptual (lo implementa la API, no esta migración):**
- Sesión utilizable solo si pertenece al usuario, `revocada = false`, `expira_en > now()` y la cuenta sigue `activa`.
- Logout: revocar la sesión actual (`revocada = true`) sin borrar la fila.
- Cambio o restablecimiento de contraseña: revocar las sesiones que corresponda.
- Operaciones posteriores (aún no creadas): crear sesión, validar/rotar refresh, comprobar `sid`, revocar una o todas.

**Migración:** `20260822180351_create_sesiones.sql`

### `recuperaciones_contrasena`

Solicitudes de recuperación de contraseña de la autenticación propia de MediRuta (OTP de 6 dígitos por correo). **No** es la recuperación de Supabase Auth / GoTrue. El OTP real **nunca** se almacena; solo `codigo_hash`. El algoritmo de hash/HMAC y el pepper los define la API.

| Columna | Tipo | Notas |
|---|---|---|
| `id` | `uuid` | PK; default `gen_random_uuid()` |
| `usuario_id` | `uuid` | `NOT NULL`; FK a `usuarios.id` |
| `codigo_hash` | `text` | `NOT NULL`; representación segura del OTP (nunca el código en claro; no hay columna `codigo`) |
| `expira_en` | `timestamptz` | `NOT NULL`; debe ser posterior a `creado_en`; la API fija ~10 minutos |
| `usado` | `boolean` | `NOT NULL`; default `false` |
| `intentos` | `integer` | `NOT NULL`; default `0`; no negativos; el máximo lo impone la API |
| `creado_en` | `timestamptz` | `NOT NULL`; default `now()` |

**Restricciones:**
- PK: `id`
- `recuperaciones_contrasena_codigo_hash_no_vacio_check` — `length(btrim(codigo_hash)) > 0`
- `recuperaciones_contrasena_expira_en_posterior_check` — `expira_en > creado_en`
- `recuperaciones_contrasena_intentos_check` — `intentos >= 0`

**Relaciones (FKs):**
- `recuperaciones_contrasena_usuario_id_fkey` — `usuario_id` → `usuarios.id` `ON DELETE CASCADE`

**Seguridad / RLS:**
- `ENABLE ROW LEVEL SECURITY`
- `FORCE ROW LEVEL SECURITY`
- **Sin policies de forma intencional.** App y Web no consultan esta tabla ni leen `codigo_hash`, intentos ni expiración. No se expone por PostgREST (`REVOKE` a `anon` y `authenticated` solo sobre `public.recuperaciones_contrasena`).
- No se almacenan OTP en claro, contraseñas ni tokens de sesión.

**Reglas HU-01 (las aplica la API; no hay funciones, triggers ni envío de correo en esta migración):**
- OTP numérico de 6 dígitos, generado criptográficamente y temporal.
- Vigencia prevista ~10 minutos (`expira_en` lo establece la API; sin trigger).
- Un solo uso: tras éxito, `usado = true` y el código no se acepta otra vez.
- Cada validación incorrecta incrementa `intentos`; el tope lo impone la API (no hay máximo rígido en BD).
- La solicitud de recuperación responde de forma genérica aunque el correo no exista (evita enumerar cuentas).
- Restablecimiento exitoso (transaccional): nuevo `password_hash`, marcar el código usado y revocar sesiones según la política de HU-01.

**Migración:** `20260822181231_create_recuperaciones_contrasena.sql`

## Rol PostgreSQL interno `mediruta_app`

Rol **técnico** de PostgreSQL. **No** es un rol funcional de MediRuta (`PACIENTE`, `DOMICILIARIO`, `ADMINISTRADOR`, `ROOT`). La API lo asume para aplicar mínimo privilegio y para que RLS sea real (la conexión `DATABASE_URL` es administrativa).

**Atributos:**
- `NOLOGIN` y `NOINHERIT` se fijan explícitamente en `CREATE ROLE` / `ALTER ROLE` (`INHERIT` es el default de PostgreSQL; hay que apagarlo).
- `NOSUPERUSER`, `NOCREATEDB`, `NOCREATEROLE`, `NOREPLICATION` y `NOBYPASSRLS` son los defaults de `CREATE ROLE`; **no** se alteran después. El rol de migraciones de Supabase no es superusuario real y PostgreSQL deniega `ALTER ROLE` sobre esos atributos privilegiados.
- La migración comprueba de forma defensiva que `mediruta_app` no tenga `SUPERUSER`, `CREATEDB`, `CREATEROLE`, `LOGIN`, `REPLICATION` ni `BYPASSRLS`. Si alguno estuviera activo, la migración falla.
- Sin contraseña. No inicia sesión.

**Membresía:** `GRANT mediruta_app TO postgres WITH INHERIT FALSE, SET TRUE` — `postgres` puede `SET LOCAL ROLE mediruta_app` sin heredar automáticamente los privilegios de `mediruta_app`. **No** se otorga `postgres` a `mediruta_app`.

**Schemas:** `USAGE` en `public` y `app`. Sin `CREATE` sobre esos schemas.

**Función:** `EXECUTE` sobre `app.current_user_id()`. No se crea `app.usuario_tiene_rol` en esta migración.

**Privilegios de tabla (objeto por objeto; sin `GRANT ALL` ni grants sobre `ALL TABLES`):**
- `roles`: `SELECT` (RLS sigue aplicando)
- `usuarios`: `SELECT` solo de `id`, `correo`, `estado_cuenta`, `creado_en`, `actualizado_en` — **sin** `password_hash`; **sin** INSERT/UPDATE/DELETE
- `usuario_roles`: `SELECT` (RLS limita a las filas del usuario actual) — **sin** INSERT/UPDATE/DELETE
- `sesiones`: **sin** acceso DML directo
- `recuperaciones_contrasena`: **sin** acceso DML directo

RLS sigue siendo obligatorio (`ENABLE` + `FORCE` en las tablas). Las operaciones sensibles (hashes, alta de usuario, cambio de contraseña, sesiones, recuperación) usarán más adelante mecanismos internos de mínimo privilegio; no se salta RLS dejando de usar `mediruta_app`.

**Patrón futuro de la API (aún no implementado en TypeScript):**

```text
BEGIN
↓
SET LOCAL ROLE mediruta_app
↓
set_config('app.current_user_id', ...)
↓
queries
↓
COMMIT / ROLLBACK
```

Login/registro y demás operaciones no autenticadas usarán mecanismos internos específicos; no se ejecutan como superusuario “para que RLS no moleste”.

**Migración:** `20260822181654_create_mediruta_app_role.sql`

## `app.registrar_usuario(...)`

Operación interna y atómica de la API para el registro público de HU-01. Inserta `usuarios` + `usuario_roles` en la misma transacción del caller. **No** crea sesión ni inicia login.

### Firma

```text
app.registrar_usuario(
  p_correo text,
  p_password_hash text,
  p_tipo_registro text
) → uuid
```

El `uuid` es el `id` del usuario nuevo. No recibe `rol_id`, `usuario_id`, estados, ni datos de perfil.

### Seguridad

- `SECURITY DEFINER` (excepción controlada: `mediruta_app` no tiene INSERT directo en `usuarios` ni `usuario_roles`)
- `search_path` vacío (`set search_path = ''`); tablas y roles siempre como `public.*`
- sin SQL dinámico
- `EXECUTE` únicamente para `mediruta_app`
- `REVOKE ALL` de `PUBLIC`, `anon` y `authenticated`
- App/Web nunca la llaman directamente (solo la API)

### Reglas

Registro PACIENTE:

```text
usuarios.estado_cuenta = activa
PACIENTE = habilitado
```

Registro DOMICILIARIO:

```text
usuarios.estado_cuenta = activa
PACIENTE = habilitado
DOMICILIARIO = pendiente_validacion
```

Los IDs de rol se leen de `public.roles` por `codigo`. No se insertan roles ni se usan UUID fijos. Si falta un código de catálogo, la función falla.

### Prohibiciones

No puede crear `ADMINISTRADOR` ni `ROOT`. Cualquier `p_tipo_registro` distinto de `PACIENTE` o `DOMICILIARIO` (tras `upper(btrim(...))`) lanza SQLSTATE `22023` y no inserta nada.

### Atomicidad

Sin `BEGIN`/`COMMIT` internos. Si falla el INSERT del usuario o de cualquier `usuario_roles`, falla toda la operación (la transacción de la API hace rollback).

### Contraseña

Solo recibe `password_hash` (bcrypt ya calculado por la API). Nunca contraseña en texto plano. Rechaza hash vacío o solo espacios.

### Correo

Se normaliza con `lower(btrim(...))`. Se rechaza vacío. La autoridad contra duplicados es `UNIQUE` de `usuarios.correo` (la API mapeará `23505`). No hay `SELECT` previo para “evitar” el UNIQUE.

### Migración

`20260822183358_create_registro_usuario_function.sql`
