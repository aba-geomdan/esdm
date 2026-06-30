-- ============================================================
-- ESDM JAR 생성기 — Supabase 스키마
-- 기존 프로젝트(vdubgrxwijydwfabwpnk)에서 SQL Editor에 붙여 실행.
-- ============================================================

-- 1) 계정 테이블 -------------------------------------------------
create table if not exists esdm_users (
  id          uuid primary key default gen_random_uuid(),
  username    text unique not null,          -- 로그인 아이디
  pw_hash     text not null,                 -- 비밀번호 해시(Edge Function이 생성)
  name        text not null,                 -- 표시 이름(선생님 이름)
  role        text not null default 'therapist', -- 'admin' | 'therapist'
  active      boolean not null default true, -- 비활성화 시 로그인 차단
  created_at  timestamptz not null default now()
);

-- 2) 저장된 JAR 계획 --------------------------------------------
create table if not exists esdm_plans (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references esdm_users(id) on delete cascade,
  title       text not null,                 -- 루틴 이름
  levels      jsonb not null default '[]',   -- 선택한 레벨 [1,2]
  toys        jsonb not null default '[]',   -- 선택한 놀잇감
  domains     jsonb not null default '[]',   -- 선택한 영역
  plan        jsonb not null,                -- 생성된 JAR 전체(JSON)
  created_at  timestamptz not null default now()
);

create index if not exists idx_esdm_plans_user on esdm_plans(user_id, created_at desc);

-- 3) RLS: 앱은 Edge Function(service_role)으로만 접근하므로 RLS는 켜고
--    직접 접근(anon)은 막는다. service_role 키는 RLS를 우회한다.
alter table esdm_users enable row level security;
alter table esdm_plans enable row level security;
-- (정책을 따로 만들지 않으면 anon/authenticated는 접근 불가 = 안전)

-- 4) 최초 관리자 계정 시드 ---------------------------------------
-- 비밀번호 해시는 Edge Function의 'seed-admin' 동작으로 넣는다.
-- (여기서 평문 비밀번호를 넣지 않는다.)
-- 관리자 계정을 만든 뒤에는 관리자 화면에서 선생님 계정을 부여한다.
