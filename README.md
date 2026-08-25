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
- **Todo mensaje de error que llega al cliente responde en español** — los de dominio (`DominioHttpFilter`) ya nacen en español en cada `Error` propio; los de validación de DTO (`ValidationPipe` global) usan un `exceptionFactory` propio (`shared/infrastructure/pipes/mensajes-validacion.ts`) que traduce los mensajes default de `class-validator` (en inglés) sin pisar los que un decorator ya personalizó (`Matches`, `IsEnum`, `IsIn`, `EsFechaPasada`, que ya declaran su propio `message` en español).
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
| **HU-01** — Gestión de acceso a la plataforma | ✅ Completa | Endpoints bajo `/auth`. |
| **HU-02** — Administración del perfil del usuario | ✅ Completa | Endpoints bajo `/perfil`. Ver detalle abajo. |
| **HU-03** — Creación de solicitudes médicas digitales | ✅ Completa | Endpoints bajo `/solicitudes`. Ver detalle abajo. |
| **HU-05** — Lectura y validación inicial de documentos médicos | ✅ Completa | Es la carga/reemplazo de documentos — ya cubierta por lo que HU-02 (cédula, licencia, SOAT, tecnomecánica del Domiciliario; foto de cédula del Paciente) y HU-03 (foto de receta) ya construyeron, no es una superficie aparte. |
| **HU-06** — Revisión y aprobación de solicitudes | 🔜 Próxima | — |
| **HU-07** — Consulta y actualización del estado del proceso | 🟡 API completa | Endpoints bajo `/pedidos` y `/admin/novedades`. Falta la App (Domiciliario/Paciente) y el Web (panel de novedades). Ver detalle abajo. |
| **HU-08** — Supervisión y trazabilidad administrativa (validación de domiciliarios) | ✅ Completa | Endpoints bajo `/admin/domiciliarios`. Ver detalle abajo. |
| **HU-09** — Asignación y gestión del domiciliario | 🟡 API completa | Endpoints bajo `/pedidos` y `/perfil/domiciliario/disponibilidad`. Falta la App (Domiciliario). Ver detalle abajo. |
| **HU-10** — Control del proceso de entrega | 🔜 Próxima | — |

### HU-01 — qué incluye

- `POST /auth/registro`, `POST /auth/login`, `POST /auth/refrescar`, `POST /auth/logout`, `POST /auth/recuperar-contrasena`, `POST /auth/restablecer-contrasena`, `POST /auth/cambiar-contrasena` — access JWT corto + refresh opaco (hash guardado, nunca el token real), autenticación propia (no Supabase Auth).
- **Sesión única por usuario**: iniciar sesión en un dispositivo nuevo revoca cualquier sesión previa que siguiera activa de esa cuenta (mismo criterio que ya se aplicaba al cambiar la contraseña). Como cada request autenticado revalida contra la sesión en BD (no solo la firma del JWT), el dispositivo viejo queda deslogueado en su siguiente request — no hay que esperar a que expire su access token. Si en ese momento intenta refrescar en cambio, también falla (401): la App ya trata cualquier refresh fallido como sesión terminada y fuerza el login, es el mismo camino que "el refresh token ya no sirve" por cualquier otro motivo.
- **No todos los domiciliarios son pacientes**: registrarse como DOMICILIARIO ya no otorga el rol PACIENTE de forma automática — es opcional (`altaPaciente` en el body de `POST /auth/registro`, `false` si no se manda). Una cuenta ya existente (de cualquier rol) puede pedir después el que le falte, sin pasar por un registro nuevo: `POST /perfil/paciente/solicitar` (instantáneo) y `POST /perfil/domiciliario/solicitar` (`borrador` — sigue el mismo camino de completar perfil que ya existía, más el paso de enviar solicitud, ver HU-08). Ambas idempotentes, y **reusan los datos que se solapan** entre los dos perfiles (dirección, foto de cédula) en vez de pedirlos de nuevo — al pedir Domiciliario faltando solo agregar vehículo + los otros 3 documentos; al pedir Paciente falta solo la fecha de nacimiento.

### HU-02 — qué incluye

- `GET /perfil` — datos comunes + sección Paciente y/o Domiciliario según los roles de la cuenta. Fotos y documentos se devuelven como **URLs firmadas** de Supabase Storage (1h de expiración), nunca como paths internos.
- `PATCH /perfil`, `PATCH /perfil/paciente`, `PATCH /perfil/domiciliario` — actualización de datos por sección.
- `POST /perfil/paciente/foto-cedula`, `POST /perfil/domiciliario/documentos` (cédula/licencia/SOAT/tecnomecánica), `POST /perfil/foto` (foto de perfil/avatar, común a cualquier rol) — multipart, validados por **contenido real del archivo** (magic numbers vía `file-type`, no por extensión ni `Content-Type` del cliente) más límite de 5MB.
- `POST /perfil/desactivar` — desactiva la cuenta y revoca todas las sesiones, sin borrar datos (trazabilidad).
- Completar el perfil de Domiciliario dispara la validación pendiente del Administrador (`usuario_roles.estado = 'pendiente_validacion'`, ya seteado desde el registro en HU-01); el de Paciente no requiere aprobación.

### HU-08 — qué incluye

- `POST /perfil/domiciliario/enviar-solicitud` — envía la solicitud de validación: `borrador` → `pendiente_validacion` (recién ahí aparece en la lista del admin). El registro (o `solicitar_rol_domiciliario`) ya no otorga `pendiente_validacion` directo — otorga `borrador`, invisible para el admin, hasta este paso explícito. Exige los mismos 7 campos obligatorios que ya exigía `aprobar_domiciliario` — se piden ahora al enviar, no recién cuando el admin intenta aprobar. Mismo patrón que `POST /solicitudes/:id/enviar` de HU-03 (crear/completar ≠ enviar).
- `GET /admin/domiciliarios/pendientes` — domiciliarios con validación pendiente, más antiguos primero. Nunca incluye a los que están en `borrador` (todavía no enviaron).
- `GET /admin/domiciliarios/:id` — detalle (datos comunes, vehículo, los 4 documentos como URLs firmadas) + historial de decisiones previas.
- `POST /admin/domiciliarios/:id/aprobar` — pasa a `habilitado`. Si falta algún documento/dato obligatorio, responde `422` con la lista exacta de qué falta (nunca aprueba a medias).
- `POST /admin/domiciliarios/:id/rechazar` — pasa a `rechazado`, con `motivo` obligatorio (5-500 caracteres).
- Toda decisión queda en `validaciones_domiciliario` (insert-only: quién, cuándo, qué decidió) — no reemplaza `usuario_roles.estado`, lo audita.
- Reutiliza las mismas filas de `perfil_domiciliario` que crea HU-02 — no hay tabla de documentos paralela.
- Primer endpoint restringido por rol de la API: `RolesGuard` + `@Roles('ADMINISTRADOR', 'ROOT')`, reutilizable para futuras historias de Administrador. Verificado en vivo que bloquea con `403` a cualquier cuenta sin ese rol (incluida la del propio domiciliario) y con `401` sin sesión.

### HU-03 — qué incluye

Reworkeada tras revisión en vivo de la primera versión (una fórmula real trae varios
medicamentos, y la receta se sube como foto, no se tipea):

- `POST /solicitudes` — crea en `borrador`. Bloquea con `403` si el perfil del paciente todavía no tiene foto de cédula cargada (HU-02) — no se puede ni empezar una solicitud sin eso. Acepta medicamentos vacíos/incompletos a propósito: un Borrador puede estar incompleto, se completa de a poco.
- `GET /solicitudes` — "Mis solicitudes" (solo las propias).
- `GET /solicitudes/:id` — detalle (medicamentos, receta y **cédula del paciente** como URLs firmadas) + historial de cambios de estado.
- `PATCH /solicitudes/:id` — editar, solo mientras está en `borrador`. Reemplaza todos los medicamentos por los recibidos (la App reenvía la lista completa en cada guardado).
- `POST /solicitudes/:id/receta` — sube/reemplaza la **foto** de la fórmula médica completa (multipart, misma validación por contenido real que HU-02).
- `POST /solicitudes/:id/enviar` — pasa a `pendiente_revision` y bloquea la edición. Si falta algún medicamento completo, la foto de receta, la fecha de vencimiento, la **dirección de la farmacia**, la dirección de entrega, **o si la receta ya está vencida** (`receta_fecha_vencimiento` pasada), responde `422` con la lista exacta de qué falta. Si se envía, devuelve el **`codigoPedido`** recién generado (`MR-000001`, ...).
- `POST /solicitudes/:id/cancelar` — pasa a `cancelada`.
- **Varios medicamentos por solicitud** (`solicitud_medicamentos`, tabla hija) — una fórmula real casi nunca trae uno solo.
- **Receta = foto**, no texto — de los campos tipeados originales solo queda `receta_fecha_vencimiento` (fecha hasta la que la receta es válida — **no** la de expedición; corregido tras detectar que se estaba pidiendo el dato equivocado para poder validar recetas vencidas). `enviar_solicitud` bloquea el envío si ya venció. Médico/registro médico/IPS se eliminaron, ya están legibles en la foto.
- **Cédula del paciente = referencia viva** a `perfil_paciente.foto_cedula_path` (HU-02) — nunca se copia a la solicitud.
- **Dos direcciones, no una**: `direccionFarmacia` (dónde el domiciliario retira el medicamento) y `direccionEntrega` (dónde se lo lleva al paciente) — puntos distintos de un mismo pedido, ambos escritos a mano por el paciente al crear/editar la solicitud.
- **Código de pedido** (`codigoPedido`, formato `MR-000001`): se genera recién al enviar — mientras está en Borrador no es todavía un pedido, así que no lo tiene. Secuencial para toda la plataforma (no por paciente), pensado para poder decirlo/escribirlo (a diferencia del `id` uuid interno).
- `direccion_entrega` se precarga del perfil del Paciente (HU-02) pero es un valor propio de cada solicitud, no una referencia viva.
- Segundo uso de `RolesGuard` (`@Roles('PACIENTE')`), después de HU-08.

240/240 tests pasando.

### HU-09/HU-07 — qué incluye (API — falta App/Web)

Van juntas porque HU-07 son justamente los estados que HU-09 recorre una vez
asignado el pedido. **Solo cálculo de distancias para armar el pool — sin mapa
visual todavía** (ni Leaflet ni un equivalente); eso queda para una iteración
futura. Ubicación del Domiciliario = GPS del celular en el momento de activar
"Disponible" (foto instantánea, no tracking continuo); ubicación de la
farmacia = geocodificada vía **Nominatim** (OpenStreetMap, gratis, sin API
key — respeta 1 req/s y manda `User-Agent` propio) usando ciudad/departamento
del perfil del Paciente como contexto.

- `perfil_paciente` gana `departamento`/`ciudad` (obligatorios) — sin esto no
  se puede geocodificar ni la dirección de entrega ni la de farmacia de sus
  pedidos.
- `POST /perfil/domiciliario/disponibilidad` — prende/apaga "Disponible para
  recibir pedidos"; la ubicación (lat/lng) es obligatoria solo al activar.
- `POST /solicitudes/:id/enviar` geocodifica `direccionFarmacia` antes de
  pasar a `en_asignacion` — si Nominatim no la resuelve, el pedido se envía
  igual (no bloquea), solo que sin ordenar por distancia hasta resolverse
  manual. Genera también **`codigoEntrega`** (6 caracteres alfanuméricos, sin
  `0/O/1/I/L` para no confundir al leerlo/tipearlo) — el Paciente se lo dicta
  al Domiciliario al recibir el pedido.
- Estados nuevos sobre `solicitudes`: `en_asignacion` →
  `asignado_en_camino_farmacia` → `medicamentos_recogidos` →
  `en_camino_entrega` → `en_sitio` → `entregado`. "Novedad en pedido" **no es
  un estado más** — es una bandera aparte (tabla `novedad_solicitud`), el
  pedido no pierde en qué paso del flujo estaba al reportar un incidente.
- `GET /pedidos/disponibles` — pool ordenado por distancia real
  (`ST_Distance`, PostGIS) a la última ubicación guardada del Domiciliario
  que consulta.
- `POST /pedidos/:id/aceptar` — guard atómico: si dos Domiciliarios aceptan
  casi al mismo tiempo, el segundo recibe `409` (`Ese pedido ya fue asignado
  a otro domiciliario`), no se pisan.
- `POST /pedidos/:id/{recogido,iniciar-entrega,en-sitio}` — transiciones
  manuales, cada una valida que sea el Domiciliario asignado y el estado
  anterior correcto.
- `POST /pedidos/:id/entregar` — pide el código de 6, lo valida
  case-insensitive contra el guardado; si no coincide, `400` sin cambiar el
  estado.
- `POST /pedidos/:id/novedad` — reporta un incidente sin tocar el estado real
  del pedido.
- `GET /admin/novedades` / `POST /admin/novedades/:id/resolver` — panel del
  Administrador (`@Roles('ADMINISTRADOR', 'ROOT')`), mismo patrón que
  `/admin/domiciliarios` de HU-08.

Verificado end-to-end contra la base y Nominatim reales (no solo con specs
mockeados): pedido enviado → geocodificado → visible en el pool con distancia
real → aceptado → recorrido completo de estados → entrega rechazada con
código incorrecto y aceptada con el correcto → novedad reportada a mitad de
camino sin perder el estado real → vista y resuelta por el admin.

305/305 tests pasando.
