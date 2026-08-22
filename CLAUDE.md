# MediRuta API

Backend de MediRuta — NestJS + TypeScript, arquitectura hexagonal, Postgres (Supabase) con RLS, autenticación propia (sin Supabase Auth).

**Antes de cualquier tarea de arquitectura o código, lee y respeta el contexto técnico completo del proyecto:**

@context.md

Ese documento es la fuente única de verdad — sistema visual (Parte A, relevante si esta API expone algo consumido por Web/App) y arquitectura/backend/BD/flujo de trabajo (Parte B, la que aplica directamente aquí). Si una instrucción puntual contradice ese documento, el documento tiene prioridad, salvo que el equipo decida modificarlo explícitamente.

## Reglas operativas rápidas para este repo

- Arquitectura hexagonal obligatoria por módulo/entidad: `domain/` → `application/use-cases/` → `infrastructure/` (sección 4). Un controller nunca contiene lógica de negocio.
- Un caso de uso = una acción de negocio, nombrado `VerboInfinitivoEntidadUseCase` (sección 5). Nada de casos de uso genéricos con varios métodos.
- **No hay Supabase Auth.** Autenticación propia con JWT emitido por esta API (sección 4.1). En RLS se usa siempre `app.current_user_id()`, nunca `auth.uid()`.
- Toda tabla nueva lleva RLS en la misma migración (sección 8). Las migraciones viven en `supabase/migrations/`, versionadas con Supabase CLI (sección 9).
- Antes de tocar la base de datos: sincroniza (`git pull` + `npx supabase migration up` o el flujo que corresponda) y revisa `supabase/ESQUEMA.md` — no asumas el esquema (sección 9.1).
- Ninguna funcionalidad se implementa sin plan previo — usa el modo plan de Claude Code antes de escribir código (sección 12).
- Si esta API expone una funcionalidad nueva, revisa la regla de paridad con Web/App (sección 10) — puede que falte reflejarla en otro repo.
