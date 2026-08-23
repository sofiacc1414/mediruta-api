# MediRuta API

Backend de MediRuta (plataforma de domicilios de medicamentos) — NestJS + Postgres de Supabase, arquitectura hexagonal. Sirve a la App (Paciente/Domiciliario) y al panel Web (Administrador/Root).

La fuente única de verdad del proyecto (reglas de arquitectura, RLS, versionamiento, paridad entre superficies) es **[context.md](./context.md)** — cualquier duda de "cómo se hace acá" empieza ahí, no en este README.

## Stack

- **NestJS 11** + TypeScript.
- **Postgres de Supabase**, acceso directo vía `pg` (no PostgREST ni Supabase Auth) — ver context.md Parte B, sección 3.
- Autenticación propia con **JWT** (access token corto + refresh token opaco revocable en tabla `sesiones`), no Supabase Auth.
- RLS con `app.current_user_id()` (variable de sesión propia), nunca `auth.uid()`.
- **Supabase Storage** (bucket privado `perfiles`) para fotos/documentos, accedido solo por la API con la service role key — nunca expuesto directo a App/Web.
- `class-validator` para DTOs, `multer` + `FileTypeValidator` (valida por contenido real del archivo, no por extensión/header) para subida de archivos.
- Jest para tests (un `.spec.ts` por caso de uso, con fakes escritos a mano — sin librerías de mocking).

## Arquitectura

Hexagonal por módulo (`src/modules/<módulo>/{domain,application,infrastructure}`):

- **domain**: entidades, puertos (interfaces), errores de dominio.
- **application**: casos de uso — uno por acción de negocio.
- **infrastructure**: controllers, adaptadores Postgres/Storage, DTOs, guards.

La base de datos vive como funciones Postgres `SECURITY DEFINER` (`app.*`), versionadas en `supabase/migrations/`. La API nunca hace `INSERT`/`UPDATE`/`DELETE` directo sobre las tablas — todo pasa por esas funciones, parametrizadas (`$1, $2...`), sin SQL dinámico.

## Configuración local

```bash
npm install
cp .env.example .env   # completar con los valores reales — .env nunca se commitea
```

Variables requeridas en `.env`: `DATABASE_URL` (connection string de Postgres del proyecto Supabase), `JWT_SECRET`/`JWT_REFRESH_SECRET`, `PASSWORD_RECOVERY_PEPPER`, `RESEND_API_KEY`/`RESEND_FROM_EMAIL` (envío de correos), `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` (Storage), `CORS_ORIGINS` (orígenes permitidos para el panel Web). Ver comentarios en `.env.example` para el detalle de cada una.

**Antes de tocar cualquier historia que toque base de datos**, sincronizá y aplicá las migraciones pendientes en tu Supabase local/del proyecto (`supabase migration up` / `supabase db push`) — nunca se trabaja contra un esquema desactualizado.

## Levantar en desarrollo

```bash
npm run start:dev   # watch mode, puerto 3000 por defecto (PORT en .env)
```

Health check: `GET /health`.

## Tests

```bash
npm test          # unit tests (jest)
npm run test:cov  # con cobertura
npm run lint       # eslint --fix
```

## Estado del proyecto

| Historia | Estado | Notas |
|---|---|---|
| **HU-01** — Gestión de acceso (registro, login, refresh, cambio/recuperación de contraseña, logout) | ✅ Completa | Endpoints bajo `/auth`. |
| **HU-02** — Administración del perfil de usuario | ✅ Completa | Endpoints bajo `/perfil`. Ver detalle abajo. |
| **HU-08** — Validación de domiciliarios (revisión/aprobación por el Administrador) | ✅ Completa | Endpoints bajo `/admin/domiciliarios`. Ver detalle abajo. |
| **HU-03** — Creación y gestión de solicitudes médicas digitales | ✅ Completa | Endpoints bajo `/solicitudes`. Ver detalle abajo. |
| **HU-04** — OCR de fórmula médica | 🔜 Próxima | — |
| **HU-05** — Gestión de documentos de la solicitud | 🔜 Próxima | — |
| **HU-09** — Asignación automática de domiciliario | 🔜 Próxima | — |

### HU-02 — qué incluye

- `GET /perfil` — datos comunes + sección Paciente y/o Domiciliario según los roles de la cuenta. Fotos y documentos se devuelven como **URLs firmadas** de Supabase Storage (1h de expiración), nunca como paths internos.
- `PATCH /perfil`, `PATCH /perfil/paciente`, `PATCH /perfil/domiciliario` — actualización de datos por sección.
- `POST /perfil/paciente/foto-cedula`, `POST /perfil/domiciliario/documentos` (cédula/licencia/SOAT/tecnomecánica), `POST /perfil/foto` (foto de perfil/avatar, común a cualquier rol) — multipart, validados por **contenido real del archivo** (magic numbers vía `file-type`, no por extensión ni `Content-Type` del cliente) más límite de 5MB.
- `POST /perfil/desactivar` — desactiva la cuenta y revoca todas las sesiones, sin borrar datos (trazabilidad).
- Completar el perfil de Domiciliario dispara la validación pendiente del Administrador (`usuario_roles.estado = 'pendiente_validacion'`, ya seteado desde el registro en HU-01); el de Paciente no requiere aprobación.

### HU-08 — qué incluye

- `GET /admin/domiciliarios/pendientes` — domiciliarios con validación pendiente, más antiguos primero.
- `GET /admin/domiciliarios/:id` — detalle (datos comunes, vehículo, los 4 documentos como URLs firmadas) + historial de decisiones previas.
- `POST /admin/domiciliarios/:id/aprobar` — pasa a `habilitado`. Si falta algún documento/dato obligatorio, responde `422` con la lista exacta de qué falta (nunca aprueba a medias).
- `POST /admin/domiciliarios/:id/rechazar` — pasa a `rechazado`, con `motivo` obligatorio (5-500 caracteres).
- Toda decisión queda en `validaciones_domiciliario` (insert-only: quién, cuándo, qué decidió) — no reemplaza `usuario_roles.estado`, lo audita.
- Reutiliza las mismas filas de `perfil_domiciliario` que crea HU-02 — no hay tabla de documentos paralela.
- Primer endpoint restringido por rol de la API: `RolesGuard` + `@Roles('ADMINISTRADOR', 'ROOT')`, reutilizable para futuras historias de Administrador. Verificado en vivo que bloquea con `403` a cualquier cuenta sin ese rol (incluida la del propio domiciliario) y con `401` sin sesión.

### HU-03 — qué incluye

- `POST /solicitudes` — crea en `borrador`. Acepta campos vacíos a propósito: un Borrador puede estar incompleto, se completa de a poco.
- `GET /solicitudes` — "Mis solicitudes" (solo las propias).
- `GET /solicitudes/:id` — detalle + historial de cambios de estado.
- `PATCH /solicitudes/:id` — editar, solo mientras está en `borrador`.
- `POST /solicitudes/:id/enviar` — pasa a `pendiente_revision` y bloquea la edición. Si falta algún campo obligatorio (medicamento + receta + dirección de entrega), responde `422` con la lista exacta de qué falta.
- `POST /solicitudes/:id/cancelar` — pasa a `cancelada`.
- Campos de medicamento y receta médica definidos investigando qué exige una fórmula válida en Colombia — la foto/escaneo de la receta es HU-05, el OCR es HU-04; acá los datos se tipean.
- `direccion_entrega` se precarga del perfil del Paciente (HU-02) pero es un valor propio de cada solicitud, no una referencia viva.
- Segundo uso de `RolesGuard` (`@Roles('PACIENTE')`), después de HU-08.

233/233 tests pasando.
