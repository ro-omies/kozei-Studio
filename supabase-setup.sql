-- =====================================================================
-- Kozei STUDIO · Cursos online · Configuración de Supabase
--
-- Cómo usarlo:
--   1. En Supabase abre "SQL Editor" → "New query".
--   2. Pega TODO este archivo y pulsa "Run".
--   3. Al final, sigue las instrucciones del paso "CONVERTIRTE EN ADMINISTRADORA".
--
-- Es seguro ejecutarlo más de una vez (no borra datos existentes).
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. TABLAS
-- ---------------------------------------------------------------------

-- Una fila por cada persona registrada (se crea sola al registrarse).
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text,
  full_name   text,
  whatsapp    text,
  role        text not null default 'student' check (role in ('student', 'admin')),
  status      text not null default 'pending' check (status in ('pending', 'active', 'suspended')),
  created_at  timestamptz not null default now()
);

-- Cursos.
create table if not exists public.courses (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  description  text,
  position     int  not null default 0,
  published    boolean not null default false,
  created_at   timestamptz not null default now()
);

-- Lecciones de cada curso (el video está en Google Drive; aquí se guarda su ID).
create table if not exists public.lessons (
  id           uuid primary key default gen_random_uuid(),
  course_id    uuid not null references public.courses(id) on delete cascade,
  title        text not null,
  description  text,
  drive_id     text,
  position     int  not null default 0,
  created_at   timestamptz not null default now()
);

-- PDF de cada lección (el archivo se guarda en Supabase Storage).
create table if not exists public.lesson_files (
  id            uuid primary key default gen_random_uuid(),
  lesson_id     uuid not null references public.lessons(id) on delete cascade,
  name          text not null,
  storage_path  text not null unique,
  created_at    timestamptz not null default now()
);

-- Qué cursos puede ver cada alumno.
create table if not exists public.enrollments (
  user_id     uuid not null references public.profiles(id) on delete cascade,
  course_id   uuid not null references public.courses(id) on delete cascade,
  granted_at  timestamptz not null default now(),
  primary key (user_id, course_id)
);

-- Lecciones que cada alumno ya marcó como vistas.
create table if not exists public.lesson_progress (
  user_id       uuid not null references public.profiles(id) on delete cascade,
  lesson_id     uuid not null references public.lessons(id) on delete cascade,
  completed_at  timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

create index if not exists lessons_course_idx      on public.lessons (course_id, position);
create index if not exists lesson_files_lesson_idx on public.lesson_files (lesson_id);


-- ---------------------------------------------------------------------
-- 2. FUNCIONES DE APOYO (security definer: se saltan la seguridad por filas
--    solo para comprobar permisos, nunca devuelven datos)
-- ---------------------------------------------------------------------

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and status = 'active'
  );
$$;

-- ¿La persona actual puede ver este curso? (cuenta activa + matriculada + curso publicado)
create or replace function public.has_course_access(p_course uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.enrollments e
    join public.profiles p on p.id = e.user_id
    join public.courses  c on c.id = e.course_id
    where e.user_id   = auth.uid()
      and e.course_id = p_course
      and p.status    = 'active'
      and c.published = true
  );
$$;

create or replace function public.has_lesson_access(p_lesson uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.lessons l
    where l.id = p_lesson and public.has_course_access(l.course_id)
  );
$$;

create or replace function public.has_file_access(p_path text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.lesson_files f
    join public.lessons l on l.id = f.lesson_id
    where f.storage_path = p_path and public.has_course_access(l.course_id)
  );
$$;


-- ---------------------------------------------------------------------
-- 3. CREAR EL PERFIL AUTOMÁTICAMENTE AL REGISTRARSE
--    Todas las cuentas nuevas quedan en estado "pending" (pendiente de pago).
-- ---------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, whatsapp)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.raw_user_meta_data ->> 'whatsapp', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- ---------------------------------------------------------------------
-- 4. SEGURIDAD POR FILAS (RLS)
--    Sin estas reglas cualquiera con la clave pública podría leer todo.
-- ---------------------------------------------------------------------

alter table public.profiles        enable row level security;
alter table public.courses         enable row level security;
alter table public.lessons         enable row level security;
alter table public.lesson_files    enable row level security;
alter table public.enrollments     enable row level security;
alter table public.lesson_progress enable row level security;

-- profiles: cada persona ve solo su fila; la administradora ve y edita todas.
drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles
  for select using (id = auth.uid() or public.is_admin());

drop policy if exists "profiles_admin_update" on public.profiles;
create policy "profiles_admin_update" on public.profiles
  for update using (public.is_admin()) with check (public.is_admin());

-- courses
drop policy if exists "courses_select" on public.courses;
create policy "courses_select" on public.courses
  for select using (public.is_admin() or public.has_course_access(id));

drop policy if exists "courses_admin_all" on public.courses;
create policy "courses_admin_all" on public.courses
  for all using (public.is_admin()) with check (public.is_admin());

-- lessons
drop policy if exists "lessons_select" on public.lessons;
create policy "lessons_select" on public.lessons
  for select using (public.is_admin() or public.has_course_access(course_id));

drop policy if exists "lessons_admin_all" on public.lessons;
create policy "lessons_admin_all" on public.lessons
  for all using (public.is_admin()) with check (public.is_admin());

-- lesson_files
drop policy if exists "lesson_files_select" on public.lesson_files;
create policy "lesson_files_select" on public.lesson_files
  for select using (public.is_admin() or public.has_lesson_access(lesson_id));

drop policy if exists "lesson_files_admin_all" on public.lesson_files;
create policy "lesson_files_admin_all" on public.lesson_files
  for all using (public.is_admin()) with check (public.is_admin());

-- enrollments
drop policy if exists "enrollments_select" on public.enrollments;
create policy "enrollments_select" on public.enrollments
  for select using (user_id = auth.uid() or public.is_admin());

drop policy if exists "enrollments_admin_all" on public.enrollments;
create policy "enrollments_admin_all" on public.enrollments
  for all using (public.is_admin()) with check (public.is_admin());

-- lesson_progress: cada alumno gestiona solo su propio progreso
drop policy if exists "progress_own" on public.lesson_progress;
create policy "progress_own" on public.lesson_progress
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and public.has_lesson_access(lesson_id));


-- ---------------------------------------------------------------------
-- 5. ALMACENAMIENTO PRIVADO PARA LOS PDF
-- ---------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('course-files', 'course-files', false)
on conflict (id) do nothing;

drop policy if exists "course_files_read" on storage.objects;
create policy "course_files_read" on storage.objects
  for select using (
    bucket_id = 'course-files'
    and (public.is_admin() or public.has_file_access(name))
  );

drop policy if exists "course_files_admin_insert" on storage.objects;
create policy "course_files_admin_insert" on storage.objects
  for insert with check (bucket_id = 'course-files' and public.is_admin());

drop policy if exists "course_files_admin_update" on storage.objects;
create policy "course_files_admin_update" on storage.objects
  for update using (bucket_id = 'course-files' and public.is_admin());

drop policy if exists "course_files_admin_delete" on storage.objects;
create policy "course_files_admin_delete" on storage.objects
  for delete using (bucket_id = 'course-files' and public.is_admin());


-- ---------------------------------------------------------------------
-- 6. CONVERTIRTE EN ADMINISTRADORA  (haz esto UNA vez)
--
--   a) Abre cursos-online.html y crea una cuenta con TU correo.
--   b) Vuelve aquí, cambia el correo de abajo por el tuyo y ejecuta SOLO esta línea:
--
--      update public.profiles
--         set role = 'admin', status = 'active'
--       where email = 'TU_CORREO@ejemplo.com';
--
--   c) Cierra sesión y vuelve a entrar: verás el botón "Panel admin".
-- ---------------------------------------------------------------------
