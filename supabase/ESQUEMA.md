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

Identidad de la cuenta, credenciales y estado general de acceso. **No** contiene roles (eso irá en `usuario_roles`). `password_hash` almacena únicamente el hash generado por la API; nunca la contraseña en texto plano. Desde HU-02 sí contiene los datos de perfil **comunes a cualquier rol** (`nombre_completo`, `telefono`); los datos específicos de rol viven en `perfil_paciente`/`perfil_domiciliario`.

| Columna | Tipo | Notas |
|---|---|---|
| `id` | `uuid` | PK; default `gen_random_uuid()` |
| `correo` | `text` | `NOT NULL`; `UNIQUE`; formato canónico (`lower(btrim(...))`); no vacío |
| `password_hash` | `text` | `NOT NULL`; hash de contraseña (nunca texto plano) |
| `estado_cuenta` | `text` | `NOT NULL`; default `'activa'`; `CHECK` solo `activa`, `bloqueada`, `desactivada` |
| `nombre_completo` | `text` | nullable (HU-02); se completa después del registro |
| `telefono` | `text` | nullable (HU-02); se completa después del registro |
| `foto_perfil_path` | `text` | nullable (HU-02); solo la ruta dentro del bucket privado `perfiles` — nunca la imagen ni una URL pública |
| `creado_en` | `timestamptz` | `NOT NULL`; default `now()` |
| `actualizado_en` | `timestamptz` | `NOT NULL`; default `now()`; lo actualiza la API (sin trigger) |

**Restricciones:**
- PK: `id`
- `usuarios_correo_key` — `UNIQUE (correo)`
- `usuarios_correo_canonico_check` — `correo = lower(btrim(correo))`
- `usuarios_correo_no_vacio_check` — `length(correo) > 0`
- `usuarios_estado_cuenta_check` — `activa` \| `bloqueada` \| `desactivada`
- `usuarios_nombre_completo_no_vacio_check` — si no es NULL, no vacío tras `btrim`
- `usuarios_telefono_no_vacio_check` — si no es NULL, no vacío tras `btrim`
- `usuarios_foto_perfil_path_no_vacio_check` — si no es NULL, no vacío tras `btrim`

`mediruta_app` **no** tiene SELECT/UPDATE directo sobre `nombre_completo`/`telefono`/`foto_perfil_path` — igual que `password_hash`, solo salen a través de `app.obtener_perfil` / `app.actualizar_datos_comunes` / `app.actualizar_foto_perfil` (HU-02).

**Migración `foto_perfil_path`:** `20260823020000_add_foto_perfil_usuarios.sql`

**Migración columnas de perfil:** `20260823010000_add_datos_comunes_usuarios.sql`

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

**Uso conceptual (lo implementa la API; crear, rotar, validar y revocar ya existen como funciones `app.*`):**
- Sesión utilizable solo si pertenece al usuario, `revocada = false`, `expira_en > now()` y la cuenta sigue `activa`.
- **Sesión única por usuario**: `app.crear_sesion` (login) revoca cualquier sesión previa que siguiera activa de esa cuenta antes de crear la nueva — un usuario nunca tiene más de una sesión viva a la vez, sin importar cuántos dispositivos usó para loguearse. Mismo criterio que ya usaba `app.cambiar_contrasena_autenticada` (revoca las demás sesiones al cambiar la contraseña), aplicado ahora también al login mismo. Como `app.validar_sesion` corre en cada request, el dispositivo viejo queda deslogueado en su siguiente request — no hace falta esperar a que expire su access token.
- Crear: `app.crear_sesion` (login). Rotar: `app.rotar_sesion` (refresh, misma sesión — no dispara la revocación anterior). Ambas reciben solo hashes, nunca el refresh token real.
- Validar access JWT: `app.validar_sesion(usuarioId, sid)` — NestJS verifica firma/`exp`; PostgreSQL verifica el estado actual de sesión y cuenta.
- Logout de la sesión actual: `app.revocar_sesion(usuarioId, sid)` — `revocada = true` sin borrar la fila. No cierra las demás sesiones del usuario. Tras eso, `app.validar_sesion` devolverá 0 filas y `app.rotar_sesion` no podrá consumir ese refresh.
- G05 restablecimiento (sin sesión): `app.restablecer_contrasena` revoca **todas** las sesiones.
- G06 cambio autenticado: `app.cambiar_contrasena_autenticada` **mantiene** el `sid` actual y revoca las demás.
- Operaciones posteriores (aún no creadas): `POST /auth/cambiar-contrasena` en NestJS.

**Migraciones:** `20260822180351_create_sesiones.sql`,
`20260823090000_sesion_unica_por_usuario.sql` (agrega la revocación de sesiones
previas dentro de `app.crear_sesion`).

### `recuperaciones_contrasena`

Solicitudes de recuperación de contraseña de la autenticación propia de MediRuta (OTP de 6 dígitos por correo). **No** es la recuperación de Supabase Auth / GoTrue. El OTP real **nunca** se almacena; solo `codigo_hash`. El algoritmo de hash/HMAC y el pepper los define la API.

| Columna | Tipo | Notas |
|---|---|---|
| `id` | `uuid` | PK; default `gen_random_uuid()` |
| `usuario_id` | `uuid` | `NOT NULL`; FK a `usuarios.id` |
| `codigo_hash` | `text` | `NOT NULL`; representación segura del OTP (nunca el código en claro; no hay columna `codigo`) |
| `expira_en` | `timestamptz` | `NOT NULL`; debe ser posterior a `creado_en`; la API fija ~10 minutos |
| `usado` | `boolean` | `NOT NULL`; default `false` |
| `intentos` | `integer` | `NOT NULL`; default `0`; no negativos; máximo **5** (lo impone `app.restablecer_contrasena`) |
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

**Reglas HU-01 (G05; funciones `app.*` en migración posterior; el envío de correo lo hará la API):**
- OTP numérico de 6 dígitos, generado criptográficamente por NestJS. **Nunca** se almacena el OTP real; solo `codigo_hash`.
- Hash del OTP: HMAC-SHA256 con `PASSWORD_RECOVERY_PEPPER` (secreto de la API). No bcrypt, no JWT.
- Vigencia prevista **10 minutos** (`expira_en` lo establece la API; la BD solo exige `expira_en > now()`).
- Una solicitud nueva invalida las recuperaciones anteriores (`usado = true`) e inserta una con `intentos = 0`.
- Un solo uso: tras éxito, `usado = true`.
- Máximo **5** intentos incorrectos; al 5º la recuperación queda inutilizable (`usado = true`).
- La solicitud futura responderá de forma genérica aunque el correo no exista (evita enumerar cuentas).
- Restablecimiento exitoso (atómico): consume el código, actualiza `password_hash`, **no** cambia `estado_cuenta`, invalida otras recuperaciones pendientes y revoca **todas** las sesiones del usuario.

**Migración:** `20260822181231_create_recuperaciones_contrasena.sql`

### `perfil_paciente`

Datos de perfil específicos del rol PACIENTE (HU-02). Tabla aparte de `usuarios` (no columnas ahí) porque el modelo es multirrol: un Domiciliario que también es Paciente necesita `perfil_paciente` **y** `perfil_domiciliario` simultáneamente, no uno u otro.

| Columna | Tipo | Notas |
|---|---|---|
| `usuario_id` | `uuid` | PK; FK a `usuarios.id` |
| `direccion` | `text` | nullable; dirección de entrega |
| `fecha_nacimiento` | `date` | nullable |
| `foto_cedula_path` | `text` | nullable; **solo la ruta** dentro del bucket privado `perfiles` — nunca la imagen ni una URL pública |
| `creado_en` | `timestamptz` | `NOT NULL`; default `now()` |
| `actualizado_en` | `timestamptz` | `NOT NULL`; default `now()`; lo actualiza la API |

**Restricciones:**
- PK: `usuario_id`
- `perfil_paciente_direccion_no_vacia_check` — si no es NULL, no vacía tras `btrim`
- `perfil_paciente_fecha_nacimiento_pasada_check` — si no es NULL, `< current_date`

**Relaciones (FKs):**
- `usuario_id` → `usuarios.id` `ON DELETE CASCADE`

**RLS:**
- `ENABLE ROW LEVEL SECURITY` + `FORCE ROW LEVEL SECURITY`
- **Sin policies**, mismo patrón que `sesiones`/`recuperaciones_contrasena`: todo el acceso pasa por `app.obtener_perfil`, `app.upsert_perfil_paciente`, `app.actualizar_foto_cedula_paciente`.

**Migración:** `20260823010500_create_perfil_paciente.sql`

### `perfil_domiciliario`

Datos de perfil específicos del rol DOMICILIARIO (HU-02) — incluye los documentos de validación. Es la **misma tabla** que usará HU-08 (Validación de domiciliarios, futura) para el flujo de aprobación del administrador; HU-02 la crea y el propio Domiciliario sube aquí sus datos/documentos, HU-08 agrega columnas/flujo de revisión sobre estas mismas filas, no una tabla paralela.

| Columna | Tipo | Notas |
|---|---|---|
| `usuario_id` | `uuid` | PK; FK a `usuarios.id` |
| `direccion` | `text` | nullable |
| `vehiculo_tipo` | `text` | nullable |
| `vehiculo_placa` | `text` | nullable |
| `cedula_path` | `text` | nullable; ruta en el bucket `perfiles` |
| `licencia_path` | `text` | nullable; ruta en el bucket `perfiles` |
| `soat_path` | `text` | nullable; ruta en el bucket `perfiles` |
| `tecnicomecanica_path` | `text` | nullable; ruta en el bucket `perfiles` |
| `creado_en` | `timestamptz` | `NOT NULL`; default `now()` |
| `actualizado_en` | `timestamptz` | `NOT NULL`; default `now()`; lo actualiza la API |

**Restricciones:**
- PK: `usuario_id`
- `perfil_domiciliario_direccion_no_vacia_check`, `perfil_domiciliario_vehiculo_tipo_no_vacio_check`, `perfil_domiciliario_vehiculo_placa_no_vacia_check` — si no son NULL, no vacíos tras `btrim`

**Relaciones (FKs):**
- `usuario_id` → `usuarios.id` `ON DELETE CASCADE`

**RLS:**
- `ENABLE ROW LEVEL SECURITY` + `FORCE ROW LEVEL SECURITY`
- **Sin policies** — todo el acceso pasa por `app.obtener_perfil`, `app.upsert_perfil_domiciliario`, `app.actualizar_documento_domiciliario`.

**Migración:** `20260823011000_create_perfil_domiciliario.sql`

## Tabla `validaciones_domiciliario` (HU-08)

Historial insert-only de decisiones del Administrador sobre domiciliarios (G06 —
trazabilidad). No reemplaza `usuario_roles.estado` (que sigue siendo el estado
"actual"): esta tabla registra **cómo** se llegó ahí, con quién decidió y cuándo, y
sobrevive aunque el domiciliario sea rechazado y vuelto a evaluar más adelante.

| Columna | Tipo | Notas |
|---|---|---|
| `id` | `uuid` PK | `gen_random_uuid()` |
| `domiciliario_id` | `uuid` | FK → `usuarios.id` `ON DELETE CASCADE` |
| `admin_id` | `uuid` | FK → `usuarios.id` `ON DELETE RESTRICT` (no se pierde la trazabilidad si el admin se desactiva) |
| `decision` | `text` | check `in ('aprobado', 'rechazado')` |
| `motivo` | `text` | nullable a nivel de columna; el caso de uso de rechazo exige que no esté vacío (el de aprobación no usa este campo) |
| `creado_en` | `timestamptz` | `default now()` |

**RLS:** `ENABLE`+`FORCE`, sin policies — un admin necesita ver el historial de
*cualquier* domiciliario, no solo filas propias, así que una policy de
`usuario_id = current_user_id()` no alcanzaría. Todo el acceso pasa por
`app.listar_validaciones_domiciliario`.

**Migración:** `20260823030000_create_validaciones_domiciliario.sql`

## Supabase Storage — bucket `perfiles`

Bucket **privado** (`public = false`) para fotos/documentos de perfil (cédula de Paciente; cédula/licencia/SOAT/tecnicomecánica de Domiciliario). Sin políticas sobre `storage.objects` a propósito: la API es la única que lo toca, usando `SUPABASE_SERVICE_ROLE_KEY` (igual que `DATABASE_URL` es la conexión administrativa a Postgres — el service role bypassea RLS). App/Web **nunca** hablan con Supabase Storage directamente ni reciben la service role key; la API sube el archivo y devuelve URLs firmadas de corta duración cuando hace falta mostrarlo.

**Migración:** `20260823011500_create_perfil_bucket.sql`

## Funciones de perfil (HU-02)

Mismo patrón de seguridad que el resto de la API: `SECURITY DEFINER`, `search_path` vacío, sin SQL dinámico, `EXECUTE` solo para `mediruta_app`, `REVOKE ALL` de `PUBLIC`/`anon`/`authenticated`. App/Web nunca las llaman directamente.

- **`app.obtener_perfil(p_usuario_id)`** → una fila con los datos comunes (`nombre_completo`, `telefono`, `foto_perfil_path`) más los de `perfil_paciente`/`perfil_domiciliario` si el usuario tiene esos roles (columnas `NULL` si no aplica). Exige `estado_cuenta = 'activa'`. `LANGUAGE sql STABLE`, sin mutaciones. Redefinida en `20260823020500_add_foto_perfil_functions.sql` (con `DROP FUNCTION` previo — Postgres no permite `CREATE OR REPLACE` cuando cambia el `RETURNS TABLE`) para agregar `foto_perfil_path`.
- **`app.actualizar_datos_comunes(p_usuario_id, p_nombre_completo, p_telefono)`** → `boolean`. Ambos campos obligatorios juntos (una sola acción). Exige cuenta `activa`.
- **`app.upsert_perfil_paciente(p_usuario_id, p_direccion, p_fecha_nacimiento)`** → `boolean`. Exige rol `PACIENTE` en `usuario_roles` (cualquier estado de esa asignación). `fecha_nacimiento` debe ser anterior a hoy.
- **`app.actualizar_foto_cedula_paciente(p_usuario_id, p_path)`** → `boolean`. Separada del anterior porque la llama la API después de subir el archivo a Storage (dos pasos); no exige que ya exista fila (upsert), para no forzar orden de llenado del perfil. Exige rol `PACIENTE`.
- **`app.actualizar_foto_perfil(p_usuario_id, p_path)`** → `boolean`. Foto de perfil (avatar), común a cualquier rol — sin restricción de rol, a diferencia de `actualizar_foto_cedula_paciente`/`actualizar_documento_domiciliario`. Exige cuenta `activa`. Migración: `20260823020500_add_foto_perfil_functions.sql`.
- **`app.upsert_perfil_domiciliario(p_usuario_id, p_direccion, p_vehiculo_tipo, p_vehiculo_placa)`** → `boolean`. Exige rol `DOMICILIARIO` (aunque esté `pendiente_validacion`).
- **`app.actualizar_documento_domiciliario(p_usuario_id, p_tipo, p_path)`** → `boolean`. `p_tipo` restringido a `cedula`\|`licencia`\|`soat`\|`tecnicomecanica`, resuelto con `CASE` (no SQL dinámico) para no repetir 4 funciones casi idénticas. Exige rol `DOMICILIARIO`.
- **`app.desactivar_cuenta(p_usuario_id, p_sid)`** → `boolean` (G05). Exige sesión válida (mismo chequeo que `app.obtener_password_hash_cambio_contrasena`). Cambia `estado_cuenta` a `'desactivada'` (nunca `DELETE` — "conservar la información para trazabilidad") y revoca **todas** las sesiones del usuario (a diferencia de `app.revocar_sesion`, que solo cierra la sesión actual — desactivar la cuenta cierra todo).

**Migración:** `20260823012000_create_perfil_functions.sql`

## Funciones de validación de domiciliarios (HU-08)

Mismo patrón de seguridad que el resto de la API. Todas reciben `p_admin_id` y
verifican (defensa en profundidad, además del `RolesGuard` de la API) que tenga rol
`ADMINISTRADOR`/`ROOT` habilitado vía el helper `app.usuario_tiene_rol_habilitado`. No
crean una tabla de documentos paralela: leen `perfil_domiciliario` (HU-02) tal cual.

- **`app.usuario_tiene_rol_habilitado(p_usuario_id, p_codigo_rol)`** → `boolean`. Helper reutilizable (`LANGUAGE sql STABLE`), no específico de HU-08.
- **`app.listar_domiciliarios_pendientes(p_admin_id)`** → filas de domiciliarios con `usuario_roles.estado = 'pendiente_validacion'`, más antiguos primero (G01). Vacío (no error) si `p_admin_id` no es admin.
- **`app.obtener_detalle_domiciliario(p_admin_id, p_domiciliario_id)`** → datos comunes + `perfil_domiciliario` completo + estado (G02).
- **`app.listar_validaciones_domiciliario(p_admin_id, p_domiciliario_id)`** → historial de `validaciones_domiciliario` para ese domiciliario, más reciente primero (G06). Aparte de la de detalle porque es 0..N filas — se evita agregación JSON, no se usa en ningún otro lado de este esquema.
- **`app.aprobar_domiciliario(p_admin_id, p_domiciliario_id)`** → `(resultado text, faltantes text[])`. `resultado` es uno de `aprobado`\|`incompleto`\|`no_encontrado`\|`no_autorizado`. `incompleto` (G05) no modifica nada — calcula `faltantes` con un `array_remove(array[case when ... ], null)` fijo, sin SQL dinámico. `aprobado` actualiza `usuario_roles.estado` e inserta en `validaciones_domiciliario`.
- **`app.rechazar_domiciliario(p_admin_id, p_domiciliario_id, p_motivo)`** → `text`, mismo enum de resultado que aprobar salvo que el éxito es `'rechazado'` (G04). `p_motivo` obligatorio (lo valida también el DTO de la API antes de llegar acá).

**Migración:** `20260823030500_create_domiciliarios_admin_functions.sql`

## Tablas `solicitudes`, `solicitud_medicamentos` y `historial_solicitud` (HU-03)

Modelo reworkeado tras revisión en vivo de la primera versión (una fórmula real trae
varios medicamentos, y la receta se sube como foto — no se tipea).

`solicitudes`: una fila por solicitud. `receta_path` — path del Storage a la **foto** de
la fórmula completa (bucket `perfiles`, mismo patrón que HU-02/HU-08); no se tipean
médico/registro médico/IPS — esos datos ya están legibles en la foto. Se conserva
`receta_fecha_vencimiento` (tipeada, para detectar recetas vencidas sin abrir la
foto — **no** es la fecha de expedición; `app.enviar_solicitud` bloquea el envío si ya
pasó).
`direccion_entrega` se precarga desde `perfil_paciente.direccion` (HU-02) pero es un
valor propio de la solicitud, no una referencia viva — si el perfil cambia después, la
solicitud ya creada conserva la dirección que tenía. `direccion_farmacia` es la
dirección donde el domiciliario retira el medicamento — **un punto distinto** de
`direccion_entrega` (adónde se lo lleva al paciente), no un duplicado ni algo
precargado: la escribe el paciente a mano, es propia de cada solicitud. **La cédula del
paciente NO es una columna acá** — es una referencia viva a
`perfil_paciente.foto_cedula_path`, resuelta al consultar el detalle
(`app.obtener_solicitud`, `LEFT JOIN`).

`codigo_pedido` — nullable, se completa recién en `app.enviar_solicitud` (formato
`MR-000001`, secuencial vía `public.solicitudes_codigo_pedido_seq`, consecutivo para
toda la plataforma). Mientras está en Borrador no es todavía un "pedido", por eso no se
genera en `crear_solicitud`. `unique index` parcial (`where codigo_pedido is not
null`) además de la unicidad que ya da la secuencia — es un identificador de cara al
paciente/domiciliario, vale la pena la garantía extra a nivel de base.

`estado` — check `in ('borrador', 'pendiente_revision', 'cancelada')`. **HU-06** (revisión
del admin) va a ampliar este check con `pendiente_correccion`/`aprobada`/`rechazada`
sobre solicitudes ya enviadas — no se agregan ahora porque todavía no existe quién los
use.

`solicitud_medicamentos`: una fila por medicamento de la solicitud (`nombre`,
`concentracion`, `forma_farmaceutica`, `cantidad`, `posologia`, todos nullable — una
línea puede estar a medio llenar en un Borrador). El orden de aparición se resuelve
ordenando por `creado_en` — no hay columna `orden` aparte porque
`app.actualizar_solicitud` reemplaza todas las filas en cada guardado (borra e inserta
de nuevo), la App siempre reenvía la lista completa.

`historial_solicitud`: insert-only (mismo espíritu que `validaciones_domiciliario` de
HU-08) — cada cambio de estado de una solicitud inserta una fila acá, nunca se
actualiza ninguna. Resuelve G03 ("historial de estados disponible") y va a seguir
creciendo con HU-06/HU-09/HU-10/HU-11 sin cambiar de forma.

**RLS:** las 3 `ENABLE`+`FORCE`, sin policies — todo el acceso vía funciones `app.*`.

**Migraciones:** `20260823040000_create_solicitudes.sql`,
`20260823040500_create_historial_solicitud.sql`,
`20260823050000_alter_solicitudes_receta_medicamentos.sql` (rework — DROP de las 8
columnas de medicamento/receta tipeada, ADD `receta_path`),
`20260823050500_create_solicitud_medicamentos.sql`,
`20260823060000_alter_solicitudes_receta_vencimiento.sql` (corrección — RENAME
`receta_fecha_expedicion` → `receta_fecha_vencimiento`, el dato que hacía falta era
la fecha hasta la que la receta es válida, no la de emisión),
`20260823070000_add_codigo_pedido.sql` (agrega `codigo_pedido` + la secuencia que lo
genera), `20260823080000_add_direccion_farmacia.sql` (agrega `direccion_farmacia`, dato
que faltaba: dónde se retira el medicamento).

## Funciones de solicitudes (HU-03)

Mismo patrón de seguridad que el resto de la API. A diferencia de las de HU-08 (donde
el admin consulta sobre *otra* cuenta), acá `p_paciente_id` es siempre
`identidad.usuarioId` del propio JWT — mismo nivel de confianza que
`app.obtener_perfil`, sin necesitar una verificación de rol aparte en cada función (el
`RolesGuard` de la API, `@Roles('PACIENTE')`, ya lo exige antes de llegar acá). Los
medicamentos viajan como `jsonb` (array), descompuestos con `jsonb_to_recordset` — sin
SQL dinámico.

- **`app.crear_solicitud(p_paciente_id, p_medicamentos jsonb, p_receta_path, p_receta_fecha_vencimiento, p_direccion_entrega, p_direccion_farmacia)`** → `(resultado text, id uuid)`, `resultado` en `creada`\|`no_autorizado`\|**`sin_cedula`** (G01) — bloqueo nuevo: si `perfil_paciente.foto_cedula_path` es `NULL`, no crea nada. Inserta la solicitud + sus medicamentos + primera fila en `historial_solicitud`.
- **`app.listar_solicitudes(p_paciente_id)`** → resumen (id, codigo_pedido, estado, creado_en) de las propias, más recientes primero (G02) — `codigo_pedido` nulo mientras siga en Borrador. Ya no trae datos de medicamento, eso vive en el detalle.
- **`app.obtener_solicitud(p_paciente_id, p_solicitud_id)`** → fila completa (incluye `direccion_farmacia`) + `cedula_path` (`LEFT JOIN perfil_paciente`, referencia viva); el `WHERE paciente_id = p_paciente_id` es la verificación de dueño (G03).
- **`app.listar_medicamentos_solicitud(p_paciente_id, p_solicitud_id)`** → medicamentos de la solicitud, en el orden en que se cargaron (G03) — aparte del detalle porque es 0..N filas.
- **`app.listar_historial_solicitud(p_paciente_id, p_solicitud_id)`** → eventos de `historial_solicitud`, más antiguo primero (G03).
- **`app.actualizar_solicitud(p_paciente_id, p_solicitud_id, p_medicamentos jsonb, p_receta_fecha_vencimiento, p_direccion_entrega, p_direccion_farmacia)`** → `boolean`. Solo si `estado='borrador'` y es del dueño (G04). Reemplaza todos los medicamentos (`DELETE` + `INSERT`) por los del array recibido.
- **`app.actualizar_receta_solicitud(p_paciente_id, p_solicitud_id, p_path)`** → `boolean`. Sube/reemplaza la foto de la receta — aparte de `actualizar_solicitud` porque la sube la API después de subir el archivo a Storage (dos pasos, mismo patrón que `actualizar_foto_cedula_paciente` de HU-02).
- **`app.enviar_solicitud(p_paciente_id, p_solicitud_id)`** → `(resultado text, faltantes text[], codigo_pedido text)`, `resultado` en `enviada`\|`incompleta`\|`no_encontrada` (G05). `incompleta` exige: al menos un medicamento con sus 5 campos completos, foto de receta, fecha de vencimiento, **dirección de la farmacia**, dirección de entrega, **y que la receta no esté ya vencida** (`receta_fecha_vencimiento < current_date` agrega `'La receta está vencida...'` a `faltantes`) — la cédula NO se revisa acá, ya se exigió en `crear_solicitud`. Si `resultado='enviada'`, genera y guarda `codigo_pedido` (`MR-000001`, ...) — es el único momento en que se genera.

**Migraciones:** `20260823051000_update_solicitudes_functions.sql`,
`20260823060000_alter_solicitudes_receta_vencimiento.sql` (rename de columna/parámetro
+ chequeo real de receta vencida en `enviar_solicitud`, que antes no existía),
`20260823070000_add_codigo_pedido.sql` (genera y devuelve `codigo_pedido` al enviar).
- **`app.cancelar_solicitud(p_paciente_id, p_solicitud_id)`** → `text`, `cancelada`\|`no_encontrada`. Por ahora solo exige que no esté ya cancelada — el chequeo de "no recogida por un domiciliario" se agrega cuando exista ese estado (HU-09/10) (G06).

**Migración:** `20260823041000_create_solicitudes_functions.sql`

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
- `usuarios`: `SELECT` solo de `id`, `correo`, `estado_cuenta`, `creado_en`, `actualizado_en` — **sin** `password_hash`; **sin** INSERT/UPDATE/DELETE. El hash solo sale por `app.obtener_credenciales_login` (login) y `app.obtener_password_hash_cambio_contrasena` (G06).
- `usuario_roles`: `SELECT` (RLS limita a las filas del usuario actual) — **sin** INSERT/UPDATE/DELETE
- `sesiones`: **sin** acceso DML directo (ni SELECT/INSERT/UPDATE/DELETE). Crear, rotar, validar, revocar y cambio autenticado de contraseña solo vía `EXECUTE` de `app.crear_sesion`, `app.rotar_sesion`, `app.validar_sesion`, `app.revocar_sesion`, `app.obtener_password_hash_cambio_contrasena` y `app.cambiar_contrasena_autenticada`. Sin `SELECT` de `refresh_token_hash` ni `UPDATE` directo.
- `recuperaciones_contrasena`: **sin** acceso DML directo (ni SELECT/INSERT/UPDATE/DELETE). Crear y restablecer solo vía `EXECUTE` de `app.crear_recuperacion_contrasena` y `app.restablecer_contrasena`. Sin `SELECT` de `codigo_hash`.

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
  p_tipo_registro text,
  p_alta_paciente boolean default true
) → uuid
```

El `uuid` es el `id` del usuario nuevo. No recibe `rol_id`, `usuario_id`, estados, ni datos de perfil.

`p_alta_paciente` **solo aplica cuando `p_tipo_registro = 'DOMICILIARIO'`** — un registro como PACIENTE siempre recibe ese rol (es el propio rol elegido, el parámetro no lo afecta). El default SQL es `true` por compatibilidad hacia atrás, pero la API (`RegistrarUsuarioDto.altaPaciente`) siempre manda el valor explícito y su propio default es `false` — opt-in, no automático.

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
DOMICILIARIO = pendiente_validacion
PACIENTE = habilitado   -- solo si p_alta_paciente = true
```

Los IDs de rol se leen de `public.roles` por `codigo`. No se insertan roles ni se usan UUID fijos. Si falta un código de catálogo, la función falla.

Una cuenta que no pidió el rol PACIENTE al registrarse como DOMICILIARIO (o viceversa) puede pedirlo después sin pasar por un registro nuevo — ver `app.solicitar_rol_paciente`/`app.solicitar_rol_domiciliario` más abajo.

### Prohibiciones

No puede crear `ADMINISTRADOR` ni `ROOT`. Cualquier `p_tipo_registro` distinto de `PACIENTE` o `DOMICILIARIO` (tras `upper(btrim(...))`) lanza SQLSTATE `22023` y no inserta nada.

### Atomicidad

Sin `BEGIN`/`COMMIT` internos. Si falla el INSERT del usuario o de cualquier `usuario_roles`, falla toda la operación (la transacción de la API hace rollback).

### Contraseña

Solo recibe `password_hash` (bcrypt ya calculado por la API). Nunca contraseña en texto plano. Rechaza hash vacío o solo espacios.

### Correo

Se normaliza con `lower(btrim(...))`. Se rechaza vacío. La autoridad contra duplicados es `UNIQUE` de `usuarios.correo` (la API mapeará `23505`). No hay `SELECT` previo para “evitar” el UNIQUE.

### Migración

`20260822183358_create_registro_usuario_function.sql` (firma original),
`20260823100000_alta_paciente_opcional_y_solicitar_rol.sql` (agrega
`p_alta_paciente` — `CREATE OR REPLACE` sin `DROP` porque es un parámetro
nuevo al final con default, no cambia los que ya existían).

## `app.solicitar_rol_paciente(p_usuario_id)` / `app.solicitar_rol_domiciliario(p_usuario_id)`

Agregan a una cuenta ya existente el rol que le falte, sin pasar por un
registro nuevo (que además chocaría con el `UNIQUE` de `usuarios.correo`).
Ambas devuelven `text`: `'agregado'` o `'ya_lo_tenia'` (idempotentes —
pedir un rol que ya se tiene no es un error).

- `solicitar_rol_paciente` → inserta `PACIENTE` en `habilitado`
  directamente, mismo criterio que un registro directo como PACIENTE (el
  perfil en sí se completa después, HU-02).
- `solicitar_rol_domiciliario` → inserta `DOMICILIARIO` en
  `pendiente_validacion`, mismo estado inicial que un registro directo
  como DOMICILIARIO. No hizo falta cambiar `app.upsert_perfil_domiciliario`
  ni ninguna otra función de HU-02/HU-08: ya exigían solo que la fila en
  `usuario_roles` existiera, nunca `estado = 'habilitado'` — así que la
  cuenta puede completar su perfil de Domiciliario de inmediato, sin
  esperar aprobación ni volver a loguearse (los roles no viajan en el
  JWT, se validan siempre en vivo contra la BD).

### Seguridad

Mismo patrón que el resto: `SECURITY DEFINER`, `search_path` vacío, sin
SQL dinámico, `EXECUTE` solo para `mediruta_app`, `REVOKE ALL` de
`PUBLIC`/`anon`/`authenticated`.

### Migración

`20260823100000_alta_paciente_opcional_y_solicitar_rol.sql`

## `app.obtener_credenciales_login(text)`

Puerta interna para que la API lea el `password_hash` durante el login. `mediruta_app` **no** tiene `SELECT` directo sobre `usuarios.password_hash`. App/Web no llaman esta función.

### Firma

```text
app.obtener_credenciales_login(p_correo text)
  → TABLE (usuario_id uuid, correo text, password_hash text, estado_cuenta text)
```

### Seguridad

- `SECURITY DEFINER`
- `search_path` vacío; consulta solo `public.usuarios`
- sin SQL dinámico
- `EXECUTE` únicamente para `mediruta_app`
- `REVOKE ALL` de `PUBLIC`, `anon` y `authenticated`
- el `password_hash` solo sale hacia la capa interna de la API para `bcrypt.compare`

### Comportamiento

- Correo canónico: `lower(btrim(...))`. NULL, vacío o solo espacios → **0 filas** (sin excepción que revele el motivo).
- Si el correo no existe → **0 filas**. No lanza “usuario no encontrado”.
- **No** filtra por `estado_cuenta`. Puede devolver `activa`, `bloqueada` o `desactivada` para que la API niegue el login internamente.
- No retorna roles, sesiones ni perfil.

La API responderá el **mismo mensaje genérico** ante correo inexistente, contraseña incorrecta, cuenta bloqueada o desactivada (p. ej. «Correo o contraseña incorrectos, o la cuenta no está disponible.»). Si esta función devuelve 0 filas, la API hará `bcrypt.compare` contra un hash dummy (no se genera en PostgreSQL) para no filtrar existencia por tiempo de respuesta.

## `app.crear_sesion(...)`

Crea una sesión revocable. `mediruta_app` **no** tiene INSERT directo sobre `sesiones`. No genera JWT ni refresh token; solo persiste el hash que envía la API.

### Firma

```text
app.crear_sesion(
  p_usuario_id uuid,
  p_refresh_token_hash text,
  p_expira_en timestamptz,
  p_user_agent text,
  p_ip inet
) → uuid
```

El `uuid` es `sesiones.id` y será el claim `sid` del access JWT (`sub` = usuario, `sid` = sesión, `iat`, `exp`). Los roles no van en el JWT.

### Seguridad

- `SECURITY DEFINER`
- `search_path` vacío
- sin SQL dinámico
- `EXECUTE` únicamente para `mediruta_app`
- `REVOKE ALL` de `PUBLIC`, `anon` y `authenticated`
- recibe solo el hash del refresh; nunca el token en claro
- no retorna `refresh_token_hash`

### Comportamiento

- Exige usuario existente y `estado_cuenta = 'activa'`. Si no, SQLSTATE `22023` sin detalle sensible y **no** crea sesión.
- Rechaza hash NULL, vacío o solo espacios (`length(btrim(...)) > 0`).
- Rechaza `p_expira_en` NULL o no posterior a `now()`.
- `user_agent` e `ip` (`inet`) son opcionales.
- **Sesión única**: antes de insertar, revoca (`revocada = true`) cualquier fila de `sesiones` de ese `usuario_id` que siguiera con `revocada = false` — sin importar de qué dispositivo/rotación viniera. Un login nuevo siempre termina con exactamente una sesión activa por usuario.
- Inserta `revocada = false`. UNIQUE de `refresh_token_hash` es la autoridad ante duplicados (sin `SELECT` previo).

## Flujo de login (API; no implementado en esta migración)

```text
correo + password
        ↓
app.obtener_credenciales_login
        ↓
bcrypt.compare() en la API
        ↓
si credenciales y cuenta activa
        ↓
API genera refresh token aleatorio y su hash
        ↓
app.crear_sesion  →  sid
        ↓
API genera access JWT propio (NestJS, no PostgreSQL)
```

**Migración:** `20260822185620_create_login_functions.sql`

## `app.rotar_sesion(...)`

Puerta interna para que `POST /auth/refrescar` (NestJS, aún no implementado) rote una sesión de forma atómica. `mediruta_app` **no** tiene UPDATE/INSERT/SELECT directo sobre `public.sesiones`. App/Web no llaman esta función.

La API recibe el refresh token opaco real, calcula su HMAC-SHA256 con `JWT_REFRESH_SECRET` y genera un token nuevo + su hash. **PostgreSQL nunca recibe el token real**, solo los hashes.

### Firma

```text
app.rotar_sesion(
  p_refresh_token_hash_actual text,
  p_nuevo_refresh_token_hash text,
  p_nueva_expira_en timestamptz,
  p_user_agent text,
  p_ip inet
) → TABLE (usuario_id uuid, sid uuid)
```

`sid` es el `id` de la **nueva** sesión (claim `sid` del access JWT siguiente). No retorna hashes, correo, password, roles, `estado_cuenta` ni el refresh token.

### Seguridad

- `SECURITY DEFINER` (excepción controlada: `mediruta_app` no tiene DML directo en `sesiones`)
- `search_path` vacío (`set search_path = ''`); objetos siempre como `public.sesiones` / `public.usuarios`
- sin SQL dinámico
- `EXECUTE` únicamente para `mediruta_app`
- `REVOKE ALL` de `PUBLIC`, `anon` y `authenticated`
- recibe solo hashes; nunca el refresh token en claro
- no cambia RLS ni crea policies; no otorga permisos de tabla

### Parámetros

Rechaza con SQLSTATE `22023` y mensaje interno genérico (`parámetro inválido`) si:
- el hash actual es NULL, vacío o solo espacios (`btrim` solo para comprobar; el valor comparado/almacenado no se recorta)
- el hash nuevo es NULL, vacío o solo espacios
- `p_nueva_expira_en` es NULL o no posterior a `now()`

`user_agent` e `ip` son opcionales.

### Comportamiento

Consume la sesión actual y crea la nueva en **una sola sentencia** (CTEs modificadores: `UPDATE` + `INSERT` + `SELECT`). No hay `UPDATE … INTO` + `IF NOT FOUND` + `INSERT` por separado.

El `UPDATE` condicional exige:

```text
revocada = false
AND refresh_token_hash = hash actual (igualdad exacta)
AND expira_en > now()
AND usuarios.estado_cuenta = 'activa'
```

Si no hay fila que cumpla todo (sesión inexistente, ya revocada, expirada, o cuenta bloqueada/desactivada) el `UPDATE` produce 0 filas, el `INSERT` no inserta y la función retorna **0 filas**. No revela cuál condición falló. La API mapeará 0 filas a un 401 genérico.

Si el `UPDATE` consume la fila:
- la sesión anterior queda `revocada = true` y **conserva su hash**
- el `INSERT` crea **exactamente una** fila nueva (`id` por default UUID) con el hash nuevo, `revocada = false` y `p_nueva_expira_en`
- retorna `usuario_id` + el nuevo `sid` (distinto del anterior)

No se actualiza el hash sobre la misma fila. Reutilizar el refresh token anterior encuentra la sesión ya revocada y vuelve a devolver 0 filas.

### Atomicidad y concurrencia

Sin `BEGIN`/`COMMIT` internos ni bloques `EXCEPTION`. `UPDATE`, `INSERT` y el `SELECT` final son la misma sentencia: si el `INSERT` falla, toda la sentencia falla y la revocación hace rollback.

Dos ejecuciones concurrentes con el mismo hash no pueden rotar las dos: el `UPDATE` condicional bloquea la fila; solo una ve `revocada = false` y gana. La otra obtiene 0 filas.

### Flujo previsto en la API (aún no implementado)

```text
refresh token recibido
        ↓
API calcula HMAC-SHA256 del token actual
        ↓
API genera nuevo refresh opaco + su hash
        ↓
app.rotar_sesion(hashActual, hashNuevo, ...)
        ↓
0 filas → 401 genérico
        ↓
usuario_id + nuevo sid
        ↓
API genera access JWT (sub + sid nuevo)
```

`POST /auth/refrescar` se implementará posteriormente en NestJS. Esta migración solo crea la función.

**Migración:** `20260822191737_create_refresh_session_function.sql`

## `app.validar_sesion(uuid, uuid)`

Puerta interna para que AuthGuard, `GET /auth/me` y el resto de rutas privadas (NestJS, aún no implementados) comprueben que un access JWT ya verificado criptográficamente sigue autorizado. `mediruta_app` **no** tiene SELECT directo sobre `public.sesiones` ni sobre `refresh_token_hash`. App/Web no llaman esta función.

**PostgreSQL no verifica la firma del JWT.** La división es:

```text
NestJS        →  firma + exp + estructura (solo sub, sid, iat, exp)
PostgreSQL    →  estado actual de la sesión y de la cuenta
```

### Firma

```text
app.validar_sesion(
  p_usuario_id uuid,
  p_sid uuid
) → TABLE (usuario_id uuid)
```

Recibe `usuarioId` (`sub`) y `sid` extraídos del JWT ya verificado por la API. Retorna únicamente `usuario_id`. No retorna hashes, correo, password, roles, `estado_cuenta`, metadatos de sesión ni secretos.

### Seguridad

- `SECURITY DEFINER` (excepción controlada: `mediruta_app` no tiene SELECT sensible en `sesiones`)
- `search_path` vacío (`set search_path = ''`); objetos siempre como `public.sesiones` / `public.usuarios`
- `LANGUAGE sql` `STABLE`: solo lectura; sin INSERT/UPDATE
- sin SQL dinámico
- `EXECUTE` únicamente para `mediruta_app`
- `REVOKE ALL` de `PUBLIC`, `anon` y `authenticated`
- no cambia RLS ni crea policies; no otorga permisos de tabla

### Comportamiento

Retorna **1 fila** solo si se cumplen todas:

```text
sesiones.id = p_sid
AND sesiones.usuario_id = p_usuario_id
AND sesiones.revocada = false
AND sesiones.expira_en > now()
AND usuarios.estado_cuenta = 'activa'
```

El `sid` debe pertenecer exactamente al `sub`. Encontrar el `sid` no basta.

Retorna **0 filas** (sin excepción, sin revelar el motivo) si:
- `p_usuario_id` o `p_sid` es NULL
- sid o usuario inexistente
- sid de otro usuario
- sesión revocada o expirada
- cuenta `bloqueada` o `desactivada`

La API mapeará 0 filas a un 401 genérico.

### Relación con rotación de refresh

Tras `app.rotar_sesion`, la sesión A queda `revocada = true` y nace la sesión B. El access JWT viejo (`sid = A`) deja de autorizar (0 filas). El nuevo (`sid = B`) autoriza (1 fila). Es intencional.

### Relación con logout y cuentas

Cuando `app.revocar_sesion` (y el futuro `POST /auth/logout`) marque `revocada = true`, `app.validar_sesion` devolverá 0 filas de inmediato, aunque el JWT no haya expirado.

Si `estado_cuenta` pasa a `bloqueada` o `desactivada`, también 0 filas, aunque el JWT y la sesión sigan vigentes. La BD es la autoridad actual.

**Migración:** `20260822195751_create_validate_session_function.sql`

## `app.revocar_sesion(uuid, uuid)`

Puerta interna para que `POST /auth/logout` (NestJS, aún no implementado) cierre **solo la sesión actual**. Recibe `usuarioId` + `sid` de la identidad ya autenticada por `AccessAuthGuard`. `mediruta_app` **no** tiene UPDATE directo sobre `public.sesiones`. App/Web no llaman esta función.

No es “cerrar sesión en todos los dispositivos”.

### Firma

```text
app.revocar_sesion(
  p_usuario_id uuid,
  p_sid uuid
) → boolean
```

`true` si encontró esa sesión exacta (`id` + `usuario_id`) aún no revocada y la marcó `revocada = true`. `false` si no había una sesión revocable con esa combinación (inexistente, de otro usuario, ya revocada, o parámetros NULL). No lanza excepción. No retorna hashes, correo, password, roles, fechas ni metadatos.

### Seguridad

- `SECURITY DEFINER` (excepción controlada: `mediruta_app` no tiene UPDATE directo en `sesiones`)
- `search_path` vacío (`set search_path = ''`); objeto siempre como `public.sesiones`
- sin SQL dinámico
- `EXECUTE` únicamente para `mediruta_app`
- `REVOKE ALL` de `PUBLIC`, `anon` y `authenticated`
- no cambia RLS ni crea policies; no otorga permisos de tabla
- no consulta `usuarios.estado_cuenta` ni `expira_en`: es invalidación, no autorización

### Comportamiento

```text
UPDATE public.sesiones
SET revocada = true, actualizado_en = now()
WHERE id = p_sid
  AND usuario_id = p_usuario_id
  AND revocada = false
```

- NULL en `p_usuario_id` o `p_sid` → `false`
- sesión ya revocada o carrera (refresh/logout concurrente) → 0 filas → `false`
- **nunca** pone `revocada = false`
- **nunca** hace `DELETE`; la fila y su hash se conservan
- otras sesiones del mismo usuario no se tocan

### Efecto sobre access y refresh

Tras revocar sid A:

- el access JWT con `sid = A` puede seguir teniendo firma válida, pero `app.validar_sesion` → 0 filas → AuthGuard 401
- `app.rotar_sesion` exige `revocada = false`, así que el refresh de A deja de servir

**Migración:** `20260822201750_create_revoke_session_function.sql`

## `app.crear_recuperacion_contrasena(...)`

Puerta interna para `POST /auth/recuperar-contrasena` (NestJS, aún no implementado). Recibe el correo y el **hash** del OTP (nunca el código). `mediruta_app` no tiene INSERT/UPDATE sobre `recuperaciones_contrasena`. App/Web no llaman esta función.

### Firma

```text
app.crear_recuperacion_contrasena(
  p_correo text,
  p_codigo_hash text,
  p_expira_en timestamptz
) → boolean
```

`true` si el usuario existe y se creó una recuperación nueva. `false` si no hay usuario con ese correo (sin excepción). El boolean es solo interno: la API enviará el OTP únicamente si es `true`, pero el HTTP será el mismo mensaje genérico en ambos casos (anti-enumeración).

### Seguridad

- `SECURITY DEFINER`
- `search_path` vacío; objetos `public.usuarios` / `public.recuperaciones_contrasena`
- sin SQL dinámico
- `EXECUTE` únicamente para `mediruta_app`
- `REVOKE ALL` de `PUBLIC`, `anon` y `authenticated`
- no cambia RLS ni otorga permisos de tabla
- no cambia `usuarios.estado_cuenta`

### Comportamiento

Correo canónico: `lower(btrim(...))`. Hash y expiración inválidos (NULL, hash vacío, `p_expira_en` NULL o no posterior a `now()`) → SQLSTATE `22023` (`parámetro inválido`), sin datos sensibles.

Si el usuario existe (cualquier `estado_cuenta`):
1. marca `usado = true` en todas sus recuperaciones con `usado = false`
2. inserta una fila nueva: `codigo_hash` exacto, `p_expira_en`, `usado = false`, `intentos = 0`

La API fija ~10 minutos en `p_expira_en`. Bloquea la fila del usuario (`FOR UPDATE`) para serializar solicitudes concurrentes.

## `app.restablecer_contrasena(...)`

Puerta interna para `POST /auth/restablecer-contrasena` (NestJS, aún no implementado). Recibe correo, hash del OTP y el **bcrypt** de la nueva contraseña. Nunca el OTP ni la contraseña en claro.

### Firma

```text
app.restablecer_contrasena(
  p_correo text,
  p_codigo_hash text,
  p_nuevo_password_hash text
) → boolean
```

`true` si el código era válido, se consumió y se actualizó la contraseña. `false` (sin revelar el motivo) si: correo inexistente, sin recuperación activa, hash incorrecto, expirado, ya usado o 5 intentos agotados.

Parámetros estructuralmente inválidos → SQLSTATE `22023` (`parámetro inválido`). `btrim` solo comprueba vacío; los hashes comparados/guardados no se recortan.

### Recuperación candidata

La más reciente (`creado_en DESC`, 1 fila) con `usado = false`, `expira_en > now()`, `intentos < 5`. Se bloquea con `FOR UPDATE` (y se revalidan las condiciones tras el lock) para que dos llamadas concurrentes no puedan ambas devolver `true`.

### Código incorrecto

Incrementa `intentos` en 1. Al llegar a 5 marca `usado = true`. Retorna `false`. No cambia `password_hash` ni sesiones.

### Código correcto (atómico)

1. `usado = true` en esa recuperación
2. `usuarios.password_hash = p_nuevo_password_hash` y `actualizado_en = now()`
3. **no** modifica `estado_cuenta`
4. revoca **todas** las sesiones no revocadas de ese usuario (distinto de `app.revocar_sesion`, que solo cierra un `sid`)
5. marca `usado = true` en cualquier otra recuperación pendiente del mismo usuario
6. retorna `true`

Sin bloques `EXCEPTION` que permitan un commit parcial. Si falla el UPDATE de contraseña, también hace rollback el consumo del código.

Tras un reset exitoso, `app.validar_sesion` y `app.rotar_sesion` fallan para las sesiones anteriores. El usuario debe volver a iniciar sesión.

### Respuestas HTTP previstas (NestJS, aún no implementado)

```text
POST /auth/recuperar-contrasena
→ "Si el correo está registrado, recibirás un código de recuperación."
  (exista o no el usuario; el correo OTP solo se envía si la función retornó true)

POST /auth/restablecer-contrasena
→ éxito: contraseña cambiada
→ cualquier fallo de código/correo/expiración/intentos: mensaje genérico
```

**Migración:** `20260822204033_create_password_recovery_functions.sql`

## G05 vs G06 — sesiones tras cambiar la contraseña

| | G05 recuperación / restablecimiento | G06 cambio autenticado |
|---|---|---|
| Cómo llega el usuario | OTP por correo; pudo perder el control de las credenciales | Sesión válida + contraseña actual |
| Contraseña en claro a PostgreSQL | Nunca | Nunca |
| bcrypt | Lo verifica/genera NestJS | Lo verifica/genera NestJS |
| Sesiones | Revoca **TODAS** | **Mantiene** el `sid` actual; revoca las demás |
| Después | Debe iniciar sesión de nuevo | Sigue usando la sesión actual |

## `app.obtener_password_hash_cambio_contrasena(uuid, uuid)`

Puerta interna para que `POST /auth/cambiar-contrasena` (NestJS, aún no implementado) lea el `password_hash` del usuario **ya autenticado**. No se pide el hash por correo. Recibe `usuarioId` + `sid` de `AccessAuthGuard`. `mediruta_app` **no** tiene `SELECT` directo sobre `usuarios.password_hash`. App/Web no llaman esta función.

La contraseña actual en claro **nunca** llega a PostgreSQL. NestJS hará `bcrypt.compare` con este hash.

### Firma

```text
app.obtener_password_hash_cambio_contrasena(
  p_usuario_id uuid,
  p_sid uuid
) → TABLE (password_hash text)
```

Solo retorna `password_hash`. No retorna correo, roles, `estado_cuenta`, metadatos de sesión ni `refresh_token_hash`.

### Seguridad

- `SECURITY DEFINER`
- `search_path` vacío (`set search_path = ''`); objetos `public.usuarios` / `public.sesiones`
- `LANGUAGE sql` `STABLE`: solo lectura
- sin SQL dinámico
- `EXECUTE` únicamente para `mediruta_app`
- `REVOKE ALL` de `PUBLIC`, `anon` y `authenticated`
- no cambia RLS ni crea policies; no otorga permisos de tabla

### Comportamiento

Retorna **1 fila** solo si se cumplen todas:

```text
usuarios.id = p_usuario_id
AND usuarios.estado_cuenta = 'activa'
AND sesiones.id = p_sid
AND sesiones.usuario_id = p_usuario_id
AND sesiones.revocada = false
AND sesiones.expira_en > now()
```

Retorna **0 filas** (sin excepción, sin revelar el motivo) si la identidad o la sesión no son válidas: usuario inexistente, cuenta no activa, sid inexistente, sid de otro usuario, sesión revocada o expirada. También cubre la carrera en la que el guard ya pasó y la sesión se invalida después.

## `app.cambiar_contrasena_autenticada(...)`

Puerta interna para aplicar el cambio **después** de que NestJS verificó la contraseña actual con bcrypt y generó el bcrypt de la nueva. Recibe `usuarioId` + `sid` + el hash actual que la API acaba de leer + el nuevo hash. Nunca contraseñas en claro. No implementa bcrypt ni la política de complejidad (8–72, mayúscula, minúscula, número, especial): eso vive en la API.

### Firma

```text
app.cambiar_contrasena_autenticada(
  p_usuario_id uuid,
  p_sid uuid,
  p_password_hash_actual_esperado text,
  p_nuevo_password_hash text
) → boolean
```

`true` si cambió la contraseña. `false` (sin revelar el motivo) si: usuario inexistente o no activo, sesión inválida, o el `password_hash` ya no coincide con el esperado.

Parámetros estructuralmente inválidos (NULL, hashes vacíos o solo espacios) → SQLSTATE `22023` (`parámetro inválido`), sin hashes, ids, sid ni correo. `btrim` solo comprueba vacío; los hashes comparados/guardados no se recortan.

### Seguridad

- `SECURITY DEFINER`
- `search_path` vacío; objetos `public.usuarios` / `public.sesiones`
- sin SQL dinámico
- `EXECUTE` únicamente para `mediruta_app`
- `REVOKE ALL` de `PUBLIC`, `anon` y `authenticated`
- no cambia RLS ni otorga UPDATE/SELECT directo sobre tablas sensibles
- no usa `auth.uid()`, GoTrue ni `pgcrypto`

### Comportamiento (atómico, un solo `SECURITY DEFINER`)

1. Bloquea `public.usuarios` (`FOR UPDATE`) con `id = p_usuario_id` y `estado_cuenta = 'activa'`. Si no → `false`. No activa ni desbloquea cuentas.
2. Bloquea la sesión actual (`FOR UPDATE`): `id = p_sid`, `usuario_id = p_usuario_id`, `revocada = false`, `expira_en > now()`. Si no → `false`. No cambia contraseña ni revoca sesiones.
3. Comparación **exacta**: `usuarios.password_hash = p_password_hash_actual_esperado`. Si ya cambió (carrera) → `false`, sin UPDATE.
4. Si todo coincide: `password_hash = p_nuevo_password_hash`, `actualizado_en = now()`. **No** modifica `estado_cuenta`, `correo`, roles ni `creado_en`.
5. Revoca las **demás** sesiones no revocadas (`usuario_id = p_usuario_id`, `id <> p_sid`, `revocada = false`). La sesión `p_sid` permanece `revocada = false`. No crea sesión nueva ni toca su `refresh_token_hash`.

Sin bloques `EXCEPTION` que permitan un commit parcial.

### Concurrencia

Dos cambios simultáneos con el mismo hash original: el `FOR UPDATE` del usuario serializa. Solo el primero ve el hash esperado y gana. El segundo detecta `password_hash != p_password_hash_actual_esperado` y retorna `false`. No sobrescribe la contraseña más reciente.

### Flujo previsto en la API (aún no implementado)

```text
AccessAuthGuard → usuarioId + sid
        ↓
app.obtener_password_hash_cambio_contrasena
        ↓
bcrypt.compare(contraseñaActual, hash) en NestJS
        ↓
bcrypt.hash(nuevaPassword) en NestJS
        ↓
app.cambiar_contrasena_autenticada(usuarioId, sid, hashActual, hashNuevo)
        ↓
sesión actual sigue válida; las demás quedan revocadas
```

**Migración:** `20260822224316_create_change_password_functions.sql`
