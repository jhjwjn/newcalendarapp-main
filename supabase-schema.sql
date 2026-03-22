-- ============================================
-- my-planner-app Database Schema
-- ============================================

-- 1. Profiles (사용자 정보)
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text,
  name text,
  avatar_url text,
  theme text default 'slate',
  groq_api_key text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- RLS: 자기 프로필만 접근
alter table public.profiles enable row level security;
create policy "Users can view own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);
create policy "Users can insert own profile" on public.profiles for insert with check (auth.uid() = id);

-- 2. Categories (일정 카테고리)
create table public.categories (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  name text not null,
  color text not null,
  emoji text not null,
  created_at timestamptz default now()
);

alter table public.categories enable row level security;
create policy "Users can CRUD own categories" on public.categories for all using (auth.uid() = user_id);

-- 3. Events (일정)
create table public.events (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  title text not null,
  date text not null,
  start_time text not null,
  end_time text not null,
  category_id uuid references public.categories(id) on delete set null,
  memo text,
  repeat text,
  repeat_days integer[],
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.events enable row level security;
create policy "Users can CRUD own events" on public.events for all using (auth.uid() = user_id);

-- 4. Workout Records (운동 기록)
create table public.workout_records (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  date text not null,
  day_of_week integer,
  total_volume integer default 0,
  exercises jsonb not null default '[]',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.workout_records enable row level security;
create policy "Users can CRUD own workout records" on public.workout_records for all using (auth.uid() = user_id);

-- 5. Flashcard Decks (플래시카드 덱)
create table public.flashcard_decks (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  name text not null,
  cards jsonb not null default '[]',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.flashcard_decks enable row level security;
create policy "Users can CRUD own decks" on public.flashcard_decks for all using (auth.uid() = user_id);

-- 6. Body Records (체형 기록)
create table public.body_records (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  date text not null,
  weight numeric,
  muscle_mass numeric,
  body_fat numeric,
  body_fat_mass numeric,
  bmi numeric,
  visceral_fat numeric,
  created_at timestamptz default now()
);

alter table public.body_records enable row level security;
create policy "Users can CRUD own body records" on public.body_records for all using (auth.uid() = user_id);

-- 7. Study History (학습 기록)
create table public.study_history (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  date text not null,
  reviewed_at timestamptz default now(),
  card_id text not null,
  front text not null,
  back text not null,
  example text,
  result text not null,
  mode text not null
);

alter table public.study_history enable row level security;
create policy "Users can CRUD own study history" on public.study_history for all using (auth.uid() = user_id);

-- ============================================
-- 유용한 함수들
-- ============================================

-- 자동 업데이트 트리거
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- profiles 테이블에 자동 업데이트 적용
create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function update_updated_at();

-- events 테이블에 자동 업데이트 적용
create trigger events_updated_at
  before update on public.events
  for each row execute function update_updated_at();

-- workout_records 테이블에 자동 업데이트 적용
create trigger workout_records_updated_at
  before update on public.workout_records
  for each row execute function update_updated_at();

-- flashcard_decks 테이블에 자동 업데이트 적용
create trigger flashcard_decks_updated_at
  before update on public.flashcard_decks
  for each row execute function update_updated_at();

-- ============================================
-- Google OAuth 설정 후 자동 프로필 생성
-- ============================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

-- trigger 생성 (Google 로그인 시 자동 실행)
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================
-- 초기 카테고리 템플릿 (새 사용자를 위한)
-- ============================================
create table public.category_templates (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  color text not null,
  emoji text not null
);

-- 기본 카테고리 삽입
insert into public.category_templates (name, color, emoji) values
  ('공부', '#3b82f6', '📚'),
  ('운동', '#10b981', '💪'),
  ('약속', '#f59e0b', '🤝'),
  ('여가', '#8b5cf6', '🎮'),
  ('업무', '#ef4444', '💼');

-- RLS 적용
alter table public.category_templates enable row level security;
create policy "Anyone can view category templates" on public.category_templates for select using (true);
