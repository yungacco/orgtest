-- ===========================================================================
--  BENESSERE — Schema del database
-- ===========================================================================
--  COME SI USA
--  1. Vai su https://supabase.com e apri il tuo progetto
--  2. Menu a sinistra -> "SQL Editor" -> "New query"
--  3. Copia TUTTO il contenuto di questo file, incollalo e premi "Run"
--  4. Deve comparire "Success. No rows returned"
--
--  Puoi rieseguire questo file quante volte vuoi: e' scritto per essere
--  "idempotente" (non crea doppioni e non cancella i dati gia' inseriti).
--
--  SICUREZZA: ogni tabella ha la Row Level Security attiva e le policy
--  consentono di leggere/scrivere SOLO le righe con user_id uguale
--  all'utente collegato (auth.uid()). Nessuno puo' vedere i dati di un altro,
--  nemmeno conoscendo la chiave pubblica "anon".
-- ===========================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Funzione di utilita': aggiorna automaticamente la colonna updated_at
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ===========================================================================
-- 1. PROFILO E PREFERENZE
-- ===========================================================================
create table if not exists public.profiles (
  user_id        uuid primary key references auth.users (id) on delete cascade,
  display_name   text,
  height_cm      numeric(5, 1),
  weight_unit    text not null default 'kg' check (weight_unit in ('kg', 'lb')),
  length_unit    text not null default 'cm' check (length_unit in ('cm', 'in')),
  weight_goal_kg numeric(5, 2),
  calorie_goal   integer check (calorie_goal is null or calorie_goal between 0 and 20000),
  theme          text not null default 'system' check (theme in ('light', 'dark', 'system')),
  accent         text not null default 'verde'
                 check (accent in ('verde', 'indaco', 'ciano', 'rosa', 'ambra', 'viola')),
  reminders      jsonb not null default '{
                   "weight":  {"enabled": false, "time": "08:00"},
                   "journal": {"enabled": false, "time": "21:00"},
                   "habits":  {"enabled": false, "time": "20:00"}
                 }'::jsonb,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- ===========================================================================
-- 2. PESO
-- ===========================================================================
create table if not exists public.weight_entries (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  date       date not null default current_date,
  weight_kg  numeric(5, 2) not null check (weight_kg > 0 and weight_kg < 700),
  body_fat   numeric(4, 1) check (body_fat is null or (body_fat >= 0 and body_fat <= 100)),
  note       text,
  created_at timestamptz not null default now(),
  unique (user_id, date)
);

create index if not exists weight_entries_user_date_idx
  on public.weight_entries (user_id, date desc);

-- ===========================================================================
-- 2-bis. ALLENAMENTI
-- ===========================================================================
create table if not exists public.workouts (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  date         date not null default current_date,
  -- testo libero: "Corsa", "Palestra", "Nuoto"... con dei suggerimenti nell'app
  activity     text not null check (char_length(trim(activity)) between 1 and 60),
  duration_min integer not null check (duration_min between 1 and 1440),
  intensity    text not null default 'media'
               check (intensity in ('leggera', 'media', 'alta')),
  -- facoltativi: chi corre o pedala vuole i chilometri, gli altri no
  distance_km  numeric(6, 2) check (distance_km is null or distance_km >= 0),
  calories     integer check (calories is null or calories between 0 and 20000),
  notes        text,
  created_at   timestamptz not null default now()
);

create index if not exists workouts_user_date_idx
  on public.workouts (user_id, date desc);

-- ===========================================================================
-- 3. RICETTE, PIANO PASTI, LISTA DELLA SPESA
-- ===========================================================================
create table if not exists public.recipe_tags (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name       text not null check (char_length(trim(name)) between 1 and 40),
  created_at timestamptz not null default now()
);

create unique index if not exists recipe_tags_user_name_idx
  on public.recipe_tags (user_id, lower(name));

create table if not exists public.recipes (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title        text not null check (char_length(trim(title)) between 1 and 120),
  photo_path   text,
  category     text not null default 'pranzo'
               check (category in ('colazione', 'pranzo', 'cena', 'spuntino')),
  tags         text[] not null default '{}',
  prep_minutes integer check (prep_minutes is null or prep_minutes between 0 and 6000),
  difficulty   text not null default 'facile'
               check (difficulty in ('facile', 'media', 'difficile')),
  servings     integer not null default 1 check (servings between 1 and 50),
  -- [{ "name": "Farina", "quantity": 200, "unit": "g" }, ...]
  ingredients  jsonb not null default '[]'::jsonb,
  -- ["Scalda il forno", "Impasta", ...]
  steps        text[] not null default '{}',
  calories     numeric(6, 1) check (calories is null or calories >= 0),
  protein      numeric(6, 1) check (protein  is null or protein  >= 0),
  carbs        numeric(6, 1) check (carbs    is null or carbs    >= 0),
  fat          numeric(6, 1) check (fat      is null or fat      >= 0),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists recipes_user_idx on public.recipes (user_id, created_at desc);
create index if not exists recipes_category_idx on public.recipes (user_id, category);
create index if not exists recipes_tags_idx on public.recipes using gin (tags);

drop trigger if exists recipes_set_updated_at on public.recipes;
create trigger recipes_set_updated_at
  before update on public.recipes
  for each row execute function public.set_updated_at();

create table if not exists public.meal_plan_entries (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  date       date not null,
  meal       text not null check (meal in ('colazione', 'pranzo', 'cena', 'spuntino')),
  recipe_id  uuid not null references public.recipes (id) on delete cascade,
  pinned     boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, date, meal)
);

create index if not exists meal_plan_user_date_idx
  on public.meal_plan_entries (user_id, date);

create table if not exists public.shopping_items (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name       text not null check (char_length(trim(name)) between 1 and 120),
  quantity   numeric(10, 2),
  unit       text,
  checked    boolean not null default false,
  manual     boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists shopping_items_user_idx
  on public.shopping_items (user_id, sort_order);

-- ===========================================================================
-- 4. TASK
-- ===========================================================================
create table if not exists public.task_categories (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name       text not null check (char_length(trim(name)) between 1 and 40),
  color      text not null default '#64748b',
  created_at timestamptz not null default now()
);

create unique index if not exists task_categories_user_name_idx
  on public.task_categories (user_id, lower(name));

create table if not exists public.tasks (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title        text not null check (char_length(trim(title)) between 1 and 200),
  notes        text,
  priority     text not null default 'media' check (priority in ('bassa', 'media', 'alta')),
  due_date     date,
  category_id  uuid references public.task_categories (id) on delete set null,
  recurrence   text check (recurrence in ('giornaliera', 'settimanale', 'mensile')),
  completed_at timestamptz,
  sort_order   integer not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- le task attive si leggono spessissimo: indice parziale dedicato
create index if not exists tasks_active_idx
  on public.tasks (user_id, sort_order)
  where completed_at is null;

create index if not exists tasks_archive_idx
  on public.tasks (user_id, completed_at desc)
  where completed_at is not null;

drop trigger if exists tasks_set_updated_at on public.tasks;
create trigger tasks_set_updated_at
  before update on public.tasks
  for each row execute function public.set_updated_at();

-- Riordino delle task attive in una sola chiamata.
-- "security invoker" = la funzione gira con i permessi di chi la chiama,
-- quindi le policy RLS restano attive.
create or replace function public.reorder_tasks(p_ids uuid[])
returns void
language sql
security invoker
as $$
  update public.tasks t
     set sort_order = x.ord
    from unnest(p_ids) with ordinality as x(id, ord)
   where t.id = x.id
     and t.user_id = auth.uid();
$$;

-- ===========================================================================
-- 5. DIARIO E ABITUDINI
-- ===========================================================================
create table if not exists public.journal_entries (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  date       date not null default current_date,
  content    text not null default '',
  mood       smallint check (mood is null or mood between 1 and 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, date)
);

create index if not exists journal_user_date_idx
  on public.journal_entries (user_id, date desc);

drop trigger if exists journal_set_updated_at on public.journal_entries;
create trigger journal_set_updated_at
  before update on public.journal_entries
  for each row execute function public.set_updated_at();

create table if not exists public.habits (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name       text not null check (char_length(trim(name)) between 1 and 60),
  emoji      text not null default '✅',
  sort_order integer not null default 0,
  archived   boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists habits_user_idx on public.habits (user_id, sort_order);

create table if not exists public.habit_logs (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  habit_id   uuid not null references public.habits (id) on delete cascade,
  date       date not null default current_date,
  created_at timestamptz not null default now(),
  unique (user_id, habit_id, date)
);

create index if not exists habit_logs_user_date_idx
  on public.habit_logs (user_id, date desc);

-- ===========================================================================
-- 6. ROW LEVEL SECURITY
--    Attiva la protezione su tutte le tabelle e crea le 4 policy
--    (lettura / inserimento / modifica / cancellazione) su ognuna.
-- ===========================================================================
do $$
declare
  t text;
  owner_col text;
begin
  foreach t in array array[
    'profiles', 'weight_entries', 'workouts', 'recipes', 'recipe_tags',
    'meal_plan_entries', 'shopping_items', 'tasks', 'task_categories',
    'journal_entries', 'habits', 'habit_logs'
  ]
  loop
    -- nella tabella profiles la colonna che identifica l'utente e' la chiave primaria
    owner_col := 'user_id';

    execute format('alter table public.%I enable row level security', t);

    execute format('drop policy if exists "lettura propria" on public.%I', t);
    execute format(
      'create policy "lettura propria" on public.%I for select to authenticated using (auth.uid() = %I)',
      t, owner_col);

    execute format('drop policy if exists "inserimento proprio" on public.%I', t);
    execute format(
      'create policy "inserimento proprio" on public.%I for insert to authenticated with check (auth.uid() = %I)',
      t, owner_col);

    execute format('drop policy if exists "modifica propria" on public.%I', t);
    execute format(
      'create policy "modifica propria" on public.%I for update to authenticated using (auth.uid() = %I) with check (auth.uid() = %I)',
      t, owner_col, owner_col);

    execute format('drop policy if exists "cancellazione propria" on public.%I', t);
    execute format(
      'create policy "cancellazione propria" on public.%I for delete to authenticated using (auth.uid() = %I)',
      t, owner_col);
  end loop;
end;
$$;

-- ===========================================================================
-- 7. CREAZIONE AUTOMATICA DEL PROFILO ALLA REGISTRAZIONE
-- ===========================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id, display_name)
  values (new.id, nullif(new.raw_user_meta_data ->> 'display_name', ''))
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ===========================================================================
-- 8. CANCELLAZIONE TOTALE DEI DATI (usata da Impostazioni -> Elimina tutto)
--    Non cancella l'account: solo i contenuti.
-- ===========================================================================
create or replace function public.delete_all_my_data()
returns void
language plpgsql
security invoker
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Utente non autenticato';
  end if;

  delete from public.habit_logs        where user_id = uid;
  delete from public.habits            where user_id = uid;
  delete from public.journal_entries   where user_id = uid;
  delete from public.tasks             where user_id = uid;
  delete from public.task_categories   where user_id = uid;
  delete from public.shopping_items    where user_id = uid;
  delete from public.meal_plan_entries where user_id = uid;
  delete from public.recipes           where user_id = uid;
  delete from public.recipe_tags       where user_id = uid;
  delete from public.weight_entries    where user_id = uid;
  delete from public.workouts          where user_id = uid;

  update public.profiles
     set display_name = null,
         height_cm = null,
         weight_goal_kg = null,
         calorie_goal = null
   where user_id = uid;
end;
$$;

-- ===========================================================================
-- 9. STORAGE — foto delle ricette
--    Bucket PRIVATO: le immagini si vedono solo tramite link firmati generati
--    per l'utente proprietario. I file vengono salvati in "<user_id>/<file>".
--
--    Se questa parte dovesse dare errore di permessi (capita su qualche
--    progetto), puoi ottenere lo stesso risultato dall'interfaccia:
--    Storage -> New bucket -> nome "ricette", lascia "Public bucket" SPENTO,
--    poi Policies -> New policy sul bucket "ricette" e crea le quattro
--    regole con la condizione (storage.foldername(name))[1] = auth.uid()::text
-- ===========================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'ricette', 'ricette', false, 5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
  set "public" = false,
      file_size_limit = 5242880,
      allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

drop policy if exists "ricette lettura propria" on storage.objects;
create policy "ricette lettura propria" on storage.objects
  for select to authenticated
  using (bucket_id = 'ricette' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "ricette caricamento proprio" on storage.objects;
create policy "ricette caricamento proprio" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'ricette' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "ricette modifica propria" on storage.objects;
create policy "ricette modifica propria" on storage.objects
  for update to authenticated
  using (bucket_id = 'ricette' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'ricette' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "ricette cancellazione propria" on storage.objects;
create policy "ricette cancellazione propria" on storage.objects
  for delete to authenticated
  using (bucket_id = 'ricette' and (storage.foldername(name))[1] = auth.uid()::text);

-- ===========================================================================
-- FINE. Se leggi "Success" hai finito con il database.
-- ===========================================================================
