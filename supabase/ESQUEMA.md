# Esquema de base de datos — MediRuta

Referencia viva del estado real de la base de datos. Se actualiza **en el mismo PR** que la migración que modifica algo (ver `DOCS/context.md`, sección 9.1). Consúltalo antes de escribir cualquier query, caso de uso o migración nueva — no asumas ni inventes columnas.

## Esquema `app`

### Función `app.current_user_id()`
Reemplaza a `auth.uid()` de Supabase Auth (que no se usa en este proyecto). Lee el id del usuario autenticado desde la variable de sesión `app.current_user_id`, que la API fija con `set local` al abrir cada transacción autenticada.

- Migración: `20260822112946_create_app_schema.sql`

## Tablas

_(Todavía no hay tablas de dominio creadas. Cada vez que se agregue una tabla nueva —`usuarios`, `solicitudes`, `documentos`, `domiciliarios`, `pedidos_entrega`, etc.— documéntala aquí con este formato:)_

### `<nombre_tabla>`

| Columna | Tipo | Notas |
|---|---|---|
| | | |

**Relaciones (FKs):**
-

**Políticas RLS activas:**
-

**Migración:** `<archivo>.sql`
