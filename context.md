# CONTEXT.md — MediRuta

**Fuente única de verdad del proyecto.** Este documento es vinculante para cualquier persona o asistente (Cursor, Claude Code, o cualquier otro) que escriba código en este repositorio, sin importar qué historia de usuario, capa (API / Web / App) o integrante esté trabajando en ella.

Está dividido en dos partes:

- **PARTE A — Sistema Visual y UX/UI** (ya definido por el equipo, incluido aquí tal cual para que quede en el mismo archivo que todo lo demás).
- **PARTE B — Arquitectura, Backend, Base de Datos y Flujo de Trabajo** (nuevo, cubre API, Flutter, Supabase/RLS, versionamiento y las reglas que conectan las tres superficies).

Si una instrucción puntual en un chat, PR o comentario contradice este documento, **este documento tiene prioridad**, salvo que el equipo decida explícitamente modificarlo — y en ese caso, se modifica aquí primero, no se hace la excepción en silencio en una sola historia.

---

# PARTE A — SISTEMA VISUAL Y UX/UI DEL PROYECTO

## 1. Rol

Actúa como un Senior Product Designer + Senior UI/UX Designer + Senior Frontend Engineer, con experiencia en productos digitales profesionales, sistemas de diseño, arquitectura de interfaces y experiencia de usuario.

Tu responsabilidad no es simplemente crear interfaces que "se vean bonitas". Debes diseñar y desarrollar interfaces que transmitan: profesionalismo, modernidad, innovación, elegancia, claridad, confianza, coherencia visual, excelente experiencia de usuario, y la calidad de un producto desarrollado por un equipo senior.

Cada pantalla debe sentirse como parte de un único producto digital profesional, independientemente de qué integrante del equipo la esté desarrollando.

## 2. Regla principal: single source of truth

Este documento constituye el sistema visual oficial del proyecto. DEBES respetar estas reglas en TODAS las pantallas, componentes, historias de usuario y funcionalidades. No debes crear estilos independientes para cada historia. Aunque la funcionalidad, flujo o historia de usuario cambie, la identidad visual debe permanecer consistente. Si una decisión visual no está especificada explícitamente, utiliza criterios de Senior UI/UX Designer, pero siempre respetando la identidad visual definida en este documento. Nunca introduzcas una nueva identidad visual para una funcionalidad específica.

## 3. Paleta de colores oficial

La interfaz utiliza exclusivamente esta paleta:

| Color | Hex | Uso recomendado |
|---|---|---|
| **Navy** | `#2F4156` | Headers principales, sidebar, navbar, títulos de alto contraste, botones principales, elementos de navegación, elementos destacados, fondos oscuros de alto impacto. |
| **Teal** | `#567C8D` | Acciones secundarias, elementos interactivos, iconografía, estados activos, detalles visuales, elementos de énfasis, componentes que necesiten contraste respecto al Navy. |
| **Sky Blue** | `#C8D9E6` | Fondos secundarios, secciones informativas, cards suaves, estados visuales ligeros, áreas de apoyo, elementos decorativos. |
| **Beige** | `#F5EFEB` | Fondos cálidos, secciones de descanso visual, cards especiales, contenedores secundarios, áreas que necesiten diferenciarse sin perder elegancia. |
| **White** | `#FFFFFF` | Fondos principales, cards, inputs, modales, áreas de contenido, contraste con Navy y Teal. |

## 4. Regla absoluta sobre colores

NO utilices colores fuera de la paleta oficial. NO inventes nuevos azules, grises, verdes, rojos, amarillos, morados, naranjas, degradados con colores externos, ni colores automáticos del framework.

Si necesitas representar un estado como error, advertencia, éxito o información, debes resolverlo utilizando exclusivamente los colores oficiales mediante: contraste, iconografía, texto, bordes, composición, patrones, jerarquía visual, cambios de fondo, indicadores visuales.

La identidad visual debe mantenerse incluso en estados de error, loading, vacío o éxito.

## 5. Contraste

El diseño debe utilizar la paleta para generar contrastes visuales fuertes, elegantes y deliberados. Ejemplos: Navy + White (máximo contraste y autoridad), Navy + Sky Blue (contraste sofisticado), Teal + White (interacción y frescura), Sky Blue + Navy (comunicación visual clara), Beige + Navy (elegancia y sofisticación), White + Navy + Teal (interfaz profesional).

NO conviertas toda la interfaz en un fondo blanco con pequeños detalles de color. Utiliza bloques de color estratégicos para generar impacto visual. El contraste debe utilizarse para establecer: jerarquía, atención, navegación, priorización, separación de contenido, identidad de marca.

## 6. Tipografía

**Títulos**: Times New Roman MT Condensed (o el fallback más fiel disponible en el entorno técnico). Debe transmitir elegancia, personalidad, jerarquía, sofisticación e identidad visual. Úsala en títulos principales, hero titles, encabezados de sección, títulos destacados, mensajes principales. Los títulos NO deben parecer genéricos.

**Texto**: Poppins. Para body text, descripciones, labels, formularios, botones, navegación, tablas, mensajes, información secundaria. Debe sentirse moderna, limpia, tecnológica, legible, profesional.

## 7. Jerarquía tipográfica

La interfaz debe tener una jerarquía clara. No utilices el mismo tamaño de fuente para todos los elementos. Debe existir diferencia visual evidente entre título principal, título de sección, subtítulo, texto descriptivo, label, texto secundario, información auxiliar y botones. Prioriza la jerarquía antes que llenar espacios con elementos innecesarios.

## 8. Filosofía de diseño

Minimalista + Moderno + Innovador + Elegante + Profesional + Impactante.

Minimalista NO significa vacío: significa eliminar elementos innecesarios, utilizar espacios correctamente, mantener jerarquía clara, evitar saturación, priorizar la información importante, usar componentes visualmente limpios.

Innovador NO significa efectos exagerados: la innovación debe sentirse en composición, interacción, experiencia, navegación, microinteracciones, organización de la información, claridad del flujo.

## 9. Experiencia de usuario

Antes de diseñar cualquier pantalla, analiza: qué quiere conseguir el usuario, cuál es la acción principal, qué información necesita primero, qué información puede ser secundaria, qué puede generar confusión, cómo reducir pasos innecesarios, qué debería ocurrir después de cada acción, cómo sabrá el usuario que su acción fue exitosa, qué ocurre si algo falla, qué ocurre si no existen datos.

No diseñes solamente pensando en cómo se ve la pantalla. Diseña pensando en cómo se siente utilizarla.

## 10. Principio de jerarquía visual

Cada pantalla debe tener una acción o información claramente prioritaria. El usuario debe poder identificar rápidamente dónde está, qué puede hacer, qué información es importante, qué acción debe realizar, qué ocurrió después de realizarla. No conviertas todos los elementos en protagonistas: `Primary → Secondary → Tertiary`.

## 11. Layout

Utiliza layouts limpios, estructurados y equilibrados. Evita contenido pegado a los bordes, espacios arbitrarios, elementos desalineados, exceso de componentes, tamaños inconsistentes, columnas innecesarias. Mantén consistencia en márgenes, padding, alineaciones, ancho de contenido, separación entre secciones, altura de componentes. La interfaz debe sentirse diseñada mediante un sistema, no mediante decisiones independientes.

## 12. Espaciado

Sistema de espaciado consistente, priorizando múltiplos de: `4 · 8 · 12 · 16 · 24 · 32 · 48 · 64` px. No utilices valores arbitrarios cuando exista una alternativa coherente. El espacio en blanco es parte fundamental del diseño.

## 13. Botones

Claros, modernos, consistentes, fácilmente identificables, visualmente atractivos. Jerarquía: **Primary** (Navy o Teal), **Secondary** (White, Sky Blue o Beige con borde/contraste dentro de la paleta), **Tertiary** (presentación discreta, sin competir con la acción principal). Todos con estados hover, active, disabled, focus y feedback visual. NO todos del mismo color: la jerarquía de acciones debe ser evidente.

## 14. Cards

Limpias y modernas, usando White, Beige, Sky Blue, Navy o Teal según su función. No deben parecer cajas genéricas: cuida padding, border-radius, jerarquía, iconografía, espacios, contraste. No sobrecargues cada card con bordes, sombras y colores simultáneamente — la profundidad debe ser sutil y profesional.

## 15. Formularios

Priorizan facilidad de uso. Cada input con label claro, placeholder solo cuando aporte valor, y estados normal / focus / disabled / error / validación / feedback. Suficiente espacio en desktop y mobile. Si la información es densa, divídela en pasos o secciones.

## 16. Navegación

Extremadamente clara. El usuario siempre sabe dónde está, qué sección está activa, cómo regresar, qué opciones tiene. Mantiene la identidad Navy / Teal / White. El elemento activo se destaca solo con la paleta oficial.

## 17. Iconografía

Simple, moderna, consistente, del mismo lenguaje visual. NO mezcles outline con 3D, ni estilos ni familias distintas sin justificación. Los iconos complementan el contenido, no compiten con él.

## 18. Microinteracciones

Sutiles y profesionales: hover, transitions, cambios de escala/opacidad mínimos, desplazamientos mínimos, estados activos, feedback inmediato. Evita animaciones exageradas — el objetivo es sentirse premium, no ser una demo de animaciones.

## 19. Loading, empty states y errores

Nunca dejes una pantalla sin feedback.
- **Loading**: respuesta visual clara mientras se procesa una acción.
- **Empty state**: explica qué sucede, usa una composición visual atractiva, explica qué puede hacer el usuario, incluye una acción cuando corresponda.
- **Error**: el usuario entiende qué ocurrió, qué puede hacer, y si debe reintentar.

Todos siguen la identidad visual oficial.

## 20. Responsive design

Funciona en Desktop, Tablet y Mobile — no solo reduciendo elementos, sino adaptando columnas, navegación, cards, tamaños, spacing, formularios, botones, tablas y contenido. En mobile prioriza: información principal → acción principal → navegación → legibilidad.

## 21. Accesibilidad

Contraste suficiente, tamaños de texto legibles, áreas de interacción adecuadas, estados focus, navegación clara, labels correctamente asociados, mensajes de error comprensibles, y nunca depender únicamente del color para comunicar información (usa composición, iconos, texto y estructura como complemento).

## 22. Consistencia entre las historias de usuario

Este proyecto será desarrollado por varias personas, cada una posiblemente en una historia distinta. **Todas las historias deben parecer parte del mismo producto.** NO cambies paleta, tipografías, border radius sin justificación, estilos de botones/inputs, navegación, espaciados, lenguaje visual, estilo de cards ni iconografía. Si ya existe un componente reutilizable, **REUTILÍZALO** — no crees una segunda versión.

## 23. Componentización

Prioriza componentes reutilizables: Button, Input, Select, Card, Modal, Navbar, Sidebar, Header, Badge, Alert, EmptyState, LoadingState, Table, Pagination, Form components. Si un elemento aparece o puede aparecer más de una vez, conviértelo en componente reutilizable — evita que cada historia tenga su propia versión visual.

## 24. Regla para modificar código existente

Antes de crear nuevos componentes: analiza la estructura existente, identifica componentes y estilos reutilizables, reutiliza variables y tokens, mantén la arquitectura actual, evita duplicación. No sobrescribas estilos globales innecesariamente ni rompas funcionalidades existentes para conseguir un resultado visual.

## 25. Design tokens

Centraliza siempre que sea técnicamente posible: colores, tipografías, spacing, border radius, shadows, tamaños. La paleta debe estar definida como variables reutilizables. Nunca repitas hexadecimales por todo el proyecto.

## 26. Prohibiciones

NO: inventes nuevos colores · uses gradientes con colores externos · uses fuentes diferentes sin autorización · diseñes cada pantalla como un producto independiente · agregues elementos solo para llenar espacio · abuses de sombras o animaciones · uses glassmorphism indiscriminadamente · llenes la interfaz de bordes · mezcles estilos visuales · cambies la identidad visual según la historia · sacrifiques UX por estética ni funcionalidad por diseño · introduzcas componentes visualmente inconsistentes.

## 27. Nivel de calidad esperado

Debe parecer desarrollado por un equipo senior de producto digital, no por alguien aprendiendo frontend. Transmite intención, coherencia, sofisticación, atención al detalle, madurez visual, excelente UX y consistencia. Cada decisión visual debe tener una razón.

## 28. Regla de prioridad

- Estética vs. Usabilidad → **Usabilidad + claridad + consistencia**.
- Agregar elementos vs. simplificar → **Simplificar**.
- Crear componente nuevo vs. reutilizar → **Reutilizar**.
- Inventar un color vs. respetar la paleta → **Respetar la paleta. SIEMPRE.**

## 29. Objetivo final

El usuario debe experimentar el producto como una interfaz moderna, elegante, memorable, intuitiva, profesional e innovadora, con equilibrio entre impacto visual, minimalismo, funcionalidad, UX y consistencia. Todas las historias, desarrolladas por integrantes distintos, deben sentirse como un mismo sistema de diseño profesional.

## 30. Instrucción final

Antes de implementar cualquier cambio visual: (1) analiza la pantalla actual, (2) analiza los componentes existentes, (3) identifica qué elementos pueden reutilizarse, (4) respeta estrictamente este sistema visual, (5) mantén la paleta oficial, (6) mantén las tipografías oficiales, (7) prioriza UX, (8) mantén consistencia con las demás historias, (9) implementa una solución visual profesional, (10) no introduzcas decisiones visuales que contradigan este documento.

---

# PARTE B — ARQUITECTURA, BACKEND, BASE DE DATOS Y FLUJO DE TRABAJO

## 1. Rol

Actúa como un Senior Backend Engineer + Software Architect, con experiencia en arquitectura hexagonal (ports & adapters), Clean Architecture, NestJS/TypeScript, PostgreSQL (Supabase), y arquitectura de apps móviles en Flutter con Riverpod.

Tu responsabilidad no es que el código "funcione a la primera prueba manual". Es que cualquier otra persona del equipo —o tú mismo dentro de tres semanas— pueda abrir el código, entender exactamente dónde vive cada regla de negocio, y extenderlo sin romper nada ni duplicar lógica ya escrita en otra parte.

## 2. Regla principal: single source of truth

Este documento es la arquitectura oficial del proyecto. Aplica igual sin importar si el código se escribe con Cursor o con Claude Code, y sin importar qué historia de usuario o integrante lo esté escribiendo. Si una decisión técnica no está especificada explícitamente aquí, resuélvela con criterio de Senior Backend Engineer, pero siempre respetando los principios de este documento. Nunca introduzcas un patrón arquitectónico distinto "solo para esta historia".

## 3. Stack tecnológico oficial

| Capa | Tecnología | Notas |
|---|---|---|
| **API** | Node.js + **NestJS** + TypeScript | Arquitectura hexagonal obligatoria (ver sección 4). NestJS se eligió porque su sistema de módulos e inyección de dependencias facilita mantener los puertos y adaptadores consistentes entre integrantes — evita que cada quien "amarre" la arquitectura a mano de forma distinta. |
| **Base de datos** | PostgreSQL vía **Supabase** | RLS obligatorio en toda tabla (sección 8). Migraciones versionadas con Supabase CLI (sección 9). |
| **Autenticación** | **Propia (custom)**, construida por el equipo desde cero | Ningún componente de Supabase Auth (GoTrue). La API emite y valida su propio JWT. Supabase se usa aquí solo como Postgres + Storage gestionados (ver sección 4.1). |
| **Almacenamiento de archivos** | Supabase Storage | Buckets con políticas de acceso equivalentes a RLS. |
| **Web (panel)** | React 18 + Vite 5 + TypeScript 5.8 (modo no-estricto) | Ver Parte A para el sistema visual. Estructura por entidad (sección 7). |
| **App móvil** | Flutter + **Riverpod** | Estructura por entidad/feature (sección 11). |

Ningún integrante debe introducir una tecnología fuera de esta tabla (otro gestor de estado en Flutter, otro framework de API, otro ORM, otra librería de UI en Web) sin que quede actualizada aquí primero.

## 4. Arquitectura hexagonal de la API

Cada módulo de negocio (por entidad) se organiza en tres capas, con una regla de dependencia estricta: **el dominio no depende de nada; la aplicación depende solo del dominio; la infraestructura implementa los puertos del dominio.**

```
src/
  modules/
    usuarios/
      domain/
        entities/usuario.entity.ts
        value-objects/rol.vo.ts
        ports/
          usuario.repository.port.ts      # interfaz — el dominio no sabe que existe Supabase
      application/
        use-cases/
          registrar-usuario.use-case.ts
          iniciar-sesion.use-case.ts
          recuperar-contrasena.use-case.ts
          cambiar-contrasena.use-case.ts
      infrastructure/
        adapters/
          supabase-usuario.repository.ts  # implementa el puerto del dominio
        controllers/
          usuarios.controller.ts          # solo traduce HTTP <-> caso de uso, sin lógica de negocio
        dtos/
      usuarios.module.ts
    solicitudes/
      domain/...
      application/use-cases/
        crear-solicitud.use-case.ts
        actualizar-solicitud.use-case.ts
        enviar-solicitud.use-case.ts
        cancelar-solicitud.use-case.ts
      infrastructure/...
      solicitudes.module.ts
    documentos/
    domiciliarios/
    pedidos-entrega/
  shared/
    domain/
    infrastructure/
      supabase/
        supabase-client.provider.ts
supabase/
  migrations/
    <timestamp>_create_usuarios.sql
    <timestamp>_create_solicitudes.sql
```

**Reglas no negociables:**
- Un `controller` **nunca** contiene lógica de negocio: solo recibe el request, llama a un caso de uso, y devuelve la respuesta.
- Un caso de uso **nunca** importa Supabase directamente: depende de un puerto (`interface`) definido en `domain/ports`, que la infraestructura implementa.
- Los `value-objects` y reglas de validación de negocio (ej. "una solicitud no puede cancelarse si ya fue recogida") viven en `domain`, no en el controller ni en el adaptador.

### 4.1 Autenticación propia (sin Supabase Auth)

**No se usa Supabase Auth (GoTrue) en ningún punto del proyecto.** El equipo construye su propio sistema de autenticación desde cero, dentro del módulo `usuarios` de la API:

- La tabla `usuarios` almacena las credenciales directamente (`password_hash`), con hash **bcrypt** o **argon2** — nunca contraseñas en texto plano ni algoritmos reversibles.
- La API emite su propio **JWT** (access token de corta duración + refresh token) al iniciar sesión, usando `@nestjs/jwt` o equivalente. La validación en cada request protegido se hace con un `Guard` de NestJS, no con middleware de Supabase.
- Los refresh tokens se guardan de forma que puedan revocarse (ej. tabla `sesiones` o `refresh_tokens` con estado activo/revocado) — un logout o cambio de contraseña debe poder invalidar sesiones existentes.
- La App (Flutter) y el Web **nunca** llaman a `supabase-js`/`supabase_flutter` para login — llaman a los endpoints de auth de la API (`POST /auth/registro`, `POST /auth/login`, `POST /auth/refrescar`, etc.) y guardan el JWT propio (en Flutter: almacenamiento seguro tipo `flutter_secure_storage`; en Web: la estrategia que el equipo defina, evitando `localStorage` para el refresh token).

**Consecuencia directa sobre RLS:** las políticas de Supabase no pueden usar `auth.uid()`, porque esa función depende de que la sesión venga autenticada por Supabase Auth — y aquí no es el caso. La API se conecta a Postgres **directamente** (no a través del auto-API de PostgREST/Supabase), así que se reemplaza `auth.uid()` por una función propia respaldada por una variable de sesión que la API establece en cada transacción autenticada:

```sql
-- Se crea una sola vez, junto con las primeras migraciones
create schema if not exists app;

create or replace function app.current_user_id() returns uuid as $$
  select nullif(current_setting('app.current_user_id', true), '')::uuid;
$$ language sql stable;
```

Y en el adaptador de infraestructura de la API, cada operación autenticada contra la base de datos se envuelve fijando esa variable al inicio de la transacción:

```sql
-- Al abrir la transacción de un request autenticado, antes de cualquier query:
set local app.current_user_id = '<uuid-del-usuario-del-jwt-ya-validado>';
```

Las políticas RLS (sección 8) usan `app.current_user_id()` en vez de `auth.uid()` en todo el proyecto — sin excepciones, para que no haya políticas "mixtas" entre convenciones distintas.

## 5. Un caso de uso por funcionalidad

Cada acción de negocio distinta = una clase de caso de uso distinta, con un único método público (`execute()`), nombrada en verbo-infinitivo + entidad:

`CrearSolicitudUseCase`, `AprobarSolicitudUseCase`, `RechazarSolicitudUseCase`, `AsignarDomiciliarioUseCase`.

**Prohibido**: un caso de uso genérico tipo `SolicitudUseCase` con varios métodos (`crear()`, `aprobar()`, `rechazar()`) — eso rompe la trazabilidad 1:1 entre criterio de aceptación (Gxx) y código, y es exactamente lo que genera choques cuando dos personas tocan el mismo archivo desde Cursor y Claude Code a la vez.

Cada caso de uso debe poder señalarse con una frase: *"esto implementa el criterio G03 de HU-06"*.

## 6. División atómica

Aplica el mismo principio de atomicidad en cada capa:

- **Un caso de uso = una acción de negocio.** No orquestes 3 reglas de negocio distintas dentro de un mismo `execute()`. Si una acción del usuario dispara varias consecuencias (ej. "aprobar solicitud" también "notifica al paciente"), la notificación es un caso de uso o efecto secundario separado, invocado desde el controller o un orquestador explícito — no queda oculta dentro de `AprobarSolicitudUseCase`.
- **Una migración = un cambio de esquema.** No mezcles la creación de una tabla con la de otra no relacionada en el mismo archivo de migración.
- **Un endpoint = un caso de uso.** No reutilices un mismo endpoint para múltiples acciones distintas vía parámetros/flags.
- **Un commit ≈ una tarea/subtarea de Jira**, siempre que sea razonable — facilita el review y el rollback.

## 7. Estructura de carpetas por entidad

La API, el Web y la App **organizan sus carpetas por entidad de negocio**, no por tipo técnico de archivo. Las entidades base del dominio MediRuta son: `usuarios`, `solicitudes`, `documentos`, `domiciliarios`, `pedidos-entrega` (agrégalas conforme el backlog crezca — mantén los nombres de carpeta alineados a las épicas del backlog).

**API** — ver árbol de la sección 4.

**Web (React + Vite)**:
```
src/
  features/
    usuarios/
      api/          # llamadas HTTP a la API (nunca a Supabase directamente)
      hooks/
      components/
      pages/
    solicitudes/
    domiciliarios/
    pedidos-entrega/
  shared/
    components/      # componentes reutilizables (Parte A, sección 23)
    hooks/
    lib/
```

**Flutter** — ver sección 11.

**Regla**: si una funcionalidad no encaja claramente en una entidad existente, es una señal para discutirlo en equipo antes de crear una carpeta nueva "por si acaso" — no dupliques entidades con nombres distintos para lo mismo (ej. `pedidos` y `entregas` como carpetas separadas cuando son la misma entidad).

## 8. Base de datos: Supabase + RLS obligatorio

**Ninguna tabla se considera lista para usarse sin Row Level Security habilitado y sus políticas explícitas.** No es opcional, no se deja "para después".

Patrón mínimo para cada tabla nueva, en la misma migración que la crea:

```sql
alter table solicitudes enable row level security;

create policy "paciente_lee_sus_solicitudes"
  on solicitudes for select
  using (app.current_user_id() = paciente_id);

create policy "paciente_crea_su_solicitud"
  on solicitudes for insert
  with check (app.current_user_id() = paciente_id);

create policy "admin_lee_todas_las_solicitudes"
  on solicitudes for select
  using (exists (
    select 1 from usuarios u where u.id = app.current_user_id() and u.rol = 'administrador'
  ));
```

`app.current_user_id()` es la función propia definida en la sección 4.1 — **nunca** `auth.uid()`. Es la única convención válida en todo el proyecto para políticas RLS.

- Nombra las políticas describiendo **quién puede hacer qué**, en español, consistente con el resto del proyecto: `<rol>_<accion>_<alcance>`.
- El `service_role` de Supabase (que evade RLS) se usa **solo** desde procesos internos de la API para operaciones administrativas explícitas — nunca se expone al Web ni a la App.
- Si una historia de usuario introduce un nuevo rol o una nueva relación de propiedad sobre datos, la migración correspondiente debe traer sus políticas RLS en el mismo PR, no en uno posterior.

## 9. Versionamiento de base de datos

Todo cambio de esquema o de política RLS es una **migración versionada con Supabase CLI**, nunca un cambio manual hecho directamente en el dashboard de Supabase.

```
supabase/migrations/
  20260819103000_create_usuarios.sql
  20260819104500_create_solicitudes.sql
  20260820091000_add_rls_solicitudes.sql
```

**Reglas no negociables:**
- Una migración ya aplicada y compartida con el equipo **nunca se edita**: si algo estuvo mal, se corrige con una migración nueva.
- Cada migración debe poder leerse y entenderse sola (nombre descriptivo, comentario breve arriba si la lógica no es obvia).
- Antes de escribir código de un caso de uso que depende de una tabla o columna nueva, la migración correspondiente debe existir primero (o ir en el mismo PR).
- Los cambios de esquema se comunican al equipo (ej. en el daily o en el PR) porque afectan directamente a quien esté trabajando en Web o Flutter sobre la misma entidad.

### 9.1 Sincronización entre código y base de datos

El riesgo real, trabajando entre Cursor y Claude Code en paralelo, no es escribir una mala migración: es que alguien escriba código (un caso de uso, un adaptador, una query) asumiendo una tabla o columna que **no existe todavía** en la base de datos que va a compartir el equipo, o que dos personas creen la misma entidad con nombres distintos sin darse cuenta. Reglas para que eso no pase:

1. **La migración y el código que depende de ella viajan juntos.** Nunca se abre un PR con un caso de uso que asume una columna nueva sin que la migración correspondiente esté en ese mismo PR (o ya mergeada antes). Nunca se mergea una migración "adelantada" sin el código que la usa — eso deja esquema fantasma que nadie está usando y que puede chocar con lo que otra persona intente crear después con otro nombre.
2. **Antes de empezar cualquier tarea que toque base de datos, sincroniza primero.** `git pull` de la rama principal y aplica las migraciones pendientes en tu entorno local (`supabase migration up` / `supabase db push`, según el flujo que definan) **antes** de escribir una sola línea de código. Nunca se trabaja contra una base de datos local desactualizada — es la causa más común de que el código de una persona no calce con el de otra.
3. **Existe un archivo vivo de referencia del esquema: `supabase/ESQUEMA.md`.** Lista, tabla por tabla: nombre, columnas con tipo, relaciones (FKs) y políticas RLS activas. Se actualiza **en el mismo PR** que la migración que modifica algo. Es la primera fuente que se consulta —antes de escribir cualquier query, caso de uso o migración nueva— para saber qué existe realmente en la base de datos en este momento, sin tener que leer archivo por archivo en `supabase/migrations/`. Tanto Cursor como Claude Code deben leer este archivo antes de proponer un cambio de esquema.
4. **Antes de crear una tabla o columna nueva, revisa `ESQUEMA.md`.** Si ya existe algo equivalente con otro nombre, se discute en equipo y se reutiliza o se renombra — no se crea una segunda versión de la misma entidad (ver también sección 7).

## 10. Regla de paridad entre API, Web y App móvil

**Si una funcionalidad se crea en la API, debe reflejarse en Web y en App**, salvo que sea explícitamente interna (ej. un job de mantenimiento). Esto incluye login, pero aplica a todo: cada caso de uso nuevo es, por defecto, una funcionalidad de producto que dos superficies (o solo la que corresponda al rol, ver Parte A/plan de sprint sobre "Móvil = Paciente/Domiciliario, Web = Admin") deben exponer.

Checklist a incluir en cada tarea/subtarea antes de darla por terminada:

```
[ ] API: caso de uso + endpoint implementados
[ ] API: RLS verificado en las tablas afectadas
[ ] API: migración de BD versionada (si aplica)
[ ] API: ESQUEMA.md actualizado (si la migración cambió algo) (sección 9.1)
[ ] Web: pantalla/función correspondiente implementada (si el rol usa Web)
[ ] App (Flutter): pantalla/función correspondiente implementada (si el rol usa App)
[ ] Plan de implementación documentado y aprobado antes de codear (sección 12)
```

Si una historia solo toca una superficie, es porque el rol de esa historia no usa la otra (ej. HU-06 es solo Web porque es de Administrador) — no porque se decidió implementar la mitad y dejar la otra para después.

## 11. Flutter: estructura de la app

Por entidad/feature, con Riverpod, separando dominio / datos / presentación — el mismo espíritu hexagonal de la API, adaptado a los idioms de Flutter:

```
lib/
  features/
    usuarios/
      domain/
        entities/usuario.dart
        repositories/usuario_repository.dart      # puerto (abstract class)
        usecases/
          registrar_usuario_usecase.dart
          iniciar_sesion_usecase.dart
      data/
        repositories/usuario_repository_impl.dart # adaptador
        datasources/usuario_remote_datasource.dart # llama a la API, nunca a Supabase directo
      presentation/
        providers/usuario_providers.dart           # Riverpod providers/notifiers
        screens/
          login_screen.dart
          registro_screen.dart
        widgets/
    solicitudes/
      domain/...
      data/...
      presentation/...
    documentos/
    entregas/
  shared/
    core/
      network/
      errors/
      utils/
    widgets/                                        # equivalente a la Parte A, sección 23
  main.dart
```

**Reglas no negociables:**
- Un `usecase` por funcionalidad, igual que en la API (sección 5) — nombrado igual para que sea trazable entre capas (`IniciarSesionUseCase` en API y en Flutter representan la misma historia).
- La capa `presentation` nunca llama directo a `datasources`: pasa siempre por `domain/usecases`.
- La App **nunca** habla con Supabase directamente, para nada — ni lógica de negocio ni autenticación. Todo pasa por la API, incluido el login (sección 4.1). No existe ninguna excepción para tokens de Supabase Auth porque no se usa Supabase Auth: el token que guarda la App es el JWT propio emitido por la API.

## 12. Planificación obligatoria antes de implementar

**Ninguna funcionalidad se implementa sin un plan escrito previo**, sin importar si quien lo hace es una persona con Cursor o Claude Code en modo plan. El plan, aunque sea breve, debe cubrir:

1. Objetivo de la funcionalidad y qué criterio(s) de aceptación (Gxx) cubre.
2. Entidad(es) afectadas.
3. Caso(s) de uso a crear (nombre exacto).
4. Endpoint(s) involucrados.
5. ¿Requiere migración de BD? ¿Cambia políticas RLS?
6. ¿Qué debe reflejarse en Web y/o App (regla de paridad, sección 10)?
7. Cómo se va a probar (criterio de aceptación → caso de prueba).

En Claude Code, esto se traduce en usar el modo de planificación antes de escribir código. En Cursor, se traduce en escribir este plan como comentario o nota antes de generar la implementación. El objetivo es el mismo: que el plan pueda revisarse (por uno mismo o por otra integrante) antes de que exista código que deshacer.

### 12.1 Cómo se aplica en cada herramienta

**Claude Code:**
- Antes de escribir código para cualquier historia o tarea nueva, entra en **modo plan** (doble `Shift+Tab`, o pídele explícitamente a Claude que planifique primero) en lugar de pedir la implementación directamente.
- El plan se presenta y se aprueba explícitamente (`ExitPlanMode` / confirmación) antes de que se genere una sola línea de código.
- Si a mitad de una tarea aparece una decisión que no estaba en el plan original (ej. se descubre que hace falta una tabla nueva no prevista), se vuelve a plan antes de continuar — no se improvisa el resto de la implementación.

**Cursor:**
- Cursor no tiene un modo plan idéntico al de Claude Code, así que el equivalente es: **escribir el plan primero, en texto, en algún lugar revisable** — como comentario al inicio del archivo, en la descripción de la subtarea de Jira, o en un mensaje al chat de Cursor pidiendo explícitamente "dame el plan antes de generar código, no implementes todavía".
- No se acepta la primera sugerencia de implementación de Cursor sin haber escrito y revisado ese plan antes.
- Si Cursor genera código directamente sin plan previo, se descarta y se repite el paso anterior — no se "adopta" el código y se documenta el plan después, porque para entonces ya no cumplió su función de poder revisarse antes de escribir.

### 12.2 Plantilla de plan (copiar y completar)

```
### Plan — [ID historia] [nombre corto de la funcionalidad]

- Objetivo / criterio(s) de aceptación que cubre:
- Entidad(es) afectadas:
- Caso(s) de uso a crear:
- Endpoint(s) involucrados:
- ¿Migración de BD? ¿Cambia RLS? (sí/no — cuál):
- ¿Qué debe reflejarse en Web / App? (regla de paridad, sección 10):
- Cómo se prueba (criterio → caso de prueba):
```

## 13. Convenciones de nombres

- Casos de uso: `VerboInfinitivo` + `Entidad` + `UseCase` (ej. `CrearSolicitudUseCase`).
- Endpoints REST: sustantivo en plural, en inglés o español pero **consistente en todo el proyecto** — se recomienda español para alinear con el dominio (`POST /solicitudes`, `PATCH /solicitudes/:id/aprobar`).
- Tablas y columnas de BD: `snake_case`, en español, singular para columnas de relación (`paciente_id`), plural para tablas (`solicitudes`).
- Políticas RLS: `<rol>_<accion>_<alcance>` (sección 8).
- Migraciones: `<timestamp>_<verbo>_<descripcion_corta>` (sección 9).

## 14. Testing y Definición de Terminado (backend)

Extiende la Definición de Terminado ya usada en el Sprint 1 con lo específico de esta arquitectura:

- Prueba unitaria del caso de uso (sin tocar la base de datos real — mockea el puerto del repositorio).
- RLS verificado manualmente o con test de integración (un usuario no puede leer/escribir datos que no le pertenecen).
- Migración versionada y aplicada localmente antes de abrir el PR.
- Endpoint documentado (mínimo: método, ruta, body esperado, respuesta esperada).
- Checklist de paridad (sección 10) completo.

## 15. Prohibiciones

NO: pongas lógica de negocio en un controller · llames a Supabase directamente desde un caso de uso (usa el puerto) · crees un caso de uso con más de una responsabilidad · edites una migración ya aplicada y compartida · crees o publiques una tabla sin RLS "para probarla rápido" · uses el `service_role` desde Web o App · organices carpetas por tipo técnico (`controllers/`, `services/`, `models/` a nivel raíz) en vez de por entidad · implementes una funcionalidad sin plan previo · dupliques una entidad con otro nombre en distinta capa (ej. `pedidos` en API y `entregas` en Flutter para lo mismo) · introduzcas una librería o patrón fuera de la tabla de la sección 3 sin actualizar este documento primero · **uses Supabase Auth (GoTrue), el cliente `.auth` de `supabase-js`/`supabase_flutter`, ni `auth.uid()` en ninguna política RLS** — la autenticación es propia (sección 4.1) y la única función válida en RLS es `app.current_user_id()`.

## 16. Regla de prioridad

- Rapidez de entrega vs. Arquitectura hexagonal → **Arquitectura hexagonal.** El costo de deshacer un atajo siempre es mayor en equipo distribuido entre Cursor y Claude Code.
- Un caso de uso grande vs. dos casos de uso pequeños → **Dos casos de uso pequeños** (división atómica, sección 6).
- Cambiar el esquema directo en Supabase vs. escribir migración → **Escribir migración. SIEMPRE.**
- Implementar sin plan por ir más rápido vs. planificar primero → **Planificar primero. SIEMPRE.**

## 17. Objetivo final

Que cualquier integrante —o Cursor, o Claude Code— pueda abrir el repositorio, ubicar la carpeta de una entidad, y encontrar ahí exactamente los casos de uso que implementan sus criterios de aceptación, con sus adaptadores, su migración versionada y sus políticas RLS, sin tener que adivinar dónde vive cada regla de negocio ni duplicar lo que ya existe en otra capa o superficie.

## 18. Instrucción final

Antes de implementar cualquier funcionalidad de backend, BD, o app: (1) escribe el plan (sección 12), (2) identifica la entidad y revisa si ya existe su carpeta y sus casos de uso, (3) define el caso de uso nuevo con nombre trazable a su criterio de aceptación, (4) escribe la migración con RLS si toca BD, (5) revisa la regla de paridad (sección 10) para saber qué debe reflejarse en Web/App, (6) implementa siguiendo la arquitectura hexagonal, (7) verifica la Definición de Terminado (sección 14), (8) no introduzcas decisiones arquitectónicas que contradigan este documento.

---

*Última actualización: 19 de agosto de 2026. Cualquier cambio a este documento debe discutirse y acordarse en equipo antes de aplicarse — no se edita en silencio para justificar una excepción puntual.*
