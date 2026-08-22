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
