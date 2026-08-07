-- ============================================================================
-- 강사 2급자격과정 관리 앱 - Supabase 스키마
-- Supabase 대시보드 > SQL Editor 에서 전체를 한 번에 실행하세요.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. profiles (auth.users 1:1 확장 - 이름, 역할)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  name text,
  role text not null default 'instructor' check (role in ('admin', 'instructor')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- 신규 가입(초대) 시 자동으로 profiles 행 생성
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', null),
    coalesce(new.raw_user_meta_data->>'role', 'instructor')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 관리자 여부 판별 (RLS 정책에서 재사용)
create or replace function public.is_admin()
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create policy "profiles_select_own_or_admin"
  on public.profiles for select
  using (id = auth.uid() or public.is_admin());

create policy "profiles_update_own_or_admin"
  on public.profiles for update
  using (id = auth.uid() or public.is_admin());

-- 공개 조회용: 강사 이름 목록 (수료증 신청서의 "담당 강사" 드롭다운용)
create or replace view public.instructor_directory
with (security_invoker = off) as
  select id, name from public.profiles where role = 'instructor' and name is not null;

grant select on public.instructor_directory to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. education_reports (서식1: 교육신고서)
-- ---------------------------------------------------------------------------
create table if not exists public.education_reports (
  id uuid primary key default gen_random_uuid(),
  instructor_id uuid not null references public.profiles(id) on delete cascade,
  course_name text not null,
  period_start date,
  period_end date,
  total_hours numeric,
  capacity integer,
  tuition numeric,
  syllabus_path text,
  report_date date not null default current_date,
  created_at timestamptz not null default now()
);

alter table public.education_reports enable row level security;

create policy "education_reports_instructor_rw"
  on public.education_reports for all
  using (instructor_id = auth.uid() or public.is_admin())
  with check (instructor_id = auth.uid() or public.is_admin());

-- ---------------------------------------------------------------------------
-- 3. certificate_requests (서식2: 수료증/자격증 신청서)
-- ---------------------------------------------------------------------------
create table if not exists public.certificate_requests (
  id uuid primary key default gen_random_uuid(),
  student_name text not null,
  student_dob date,
  student_phone text,
  student_email text,
  student_address text,
  course_name text,
  completion_date date,
  total_hours numeric,
  -- 수강자가 선택하는 신청 종류: 수료증 신청 또는 1급/2급 자격증 신청
  request_type text not null check (request_type in ('수료증', '1급 자격증', '2급 자격증')),
  application_type text check (application_type in ('신규', '재발급')),
  instructor_id uuid references public.profiles(id),
  -- 자격증 신청일 때만 사용하는 자격증비 입금일자 (수료증 신청은 null)
  payment_date date,
  application_date date not null default current_date,
  applicant_name text,
  status text not null default '신청' check (status in ('신청', '발급완료')),
  issued_date date,
  note text,
  created_at timestamptz not null default now()
);

alter table public.certificate_requests enable row level security;

-- 학생은 로그인 없이 본인 신청서를 제출만 가능 (읽기 불가)
create policy "certificate_requests_public_insert"
  on public.certificate_requests for insert
  to anon, authenticated
  with check (true);

-- 강사는 본인이 담당한 신청 건만 조회 (읽기 전용)
create policy "certificate_requests_instructor_select"
  on public.certificate_requests for select
  using (instructor_id = auth.uid() or public.is_admin());

-- 발급 상태 변경 등 수정은 관리자만
create policy "certificate_requests_admin_update"
  on public.certificate_requests for update
  using (public.is_admin())
  with check (public.is_admin());

create policy "certificate_requests_admin_delete"
  on public.certificate_requests for delete
  using (public.is_admin());

-- ---------------------------------------------------------------------------
-- 4. Storage: 교안 첨부 버킷
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('syllabus', 'syllabus', false)
on conflict (id) do nothing;

create policy "syllabus_instructor_upload"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'syllabus'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "syllabus_read_own_or_admin"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'syllabus'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
  );

-- ============================================================================
-- 스키마 실행 후 (README.md 참고):
-- 1) Authentication > Providers 에서 Email 가입(Sign up) 비활성화 권장
--    (강사 계정은 관리자가 /api/create-instructor 로만 생성)
-- 2) 최초 관리자 계정은 대시보드에서 직접 만든 뒤 아래 SQL로 승격:
--    update public.profiles set role = 'admin' where email = '본인이메일@example.com';
-- ============================================================================
