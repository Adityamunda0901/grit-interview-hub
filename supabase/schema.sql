-- GRIT Interview Hub — PostgreSQL schema for Supabase
create extension if not exists pgcrypto;
create extension if not exists btree_gist;
create type public.app_role as enum ('student','interviewer','admin');
create type public.interview_status as enum ('scheduled','in_progress','pending_evaluation','passed','failed','retake_required','no_show','cancelled');
create type public.interview_outcome as enum ('pass','fail','retake','no_show');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text unique not null,
  role public.app_role not null default 'student',
  created_at timestamptz not null default now()
);
create table public.tracks (
  id uuid primary key default gen_random_uuid(),
  name text not null unique
);
create table public.badges (
  id uuid primary key default gen_random_uuid(),
  track_id uuid not null references public.tracks(id),
  name text not null,
  level text not null,
  unique(track_id,name,level)
);
create table public.students (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles(id),
  student_code text unique,
  cohort text,
  attendance numeric(5,2),
  created_at timestamptz not null default now()
);
create table public.student_badges (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id),
  badge_id uuid not null references public.badges(id),
  eligibility_status text not null default 'not_eligible'
    check (eligibility_status in ('not_eligible','eligible')),
  badge_status text not null default 'in_progress'
    check (badge_status in ('in_progress','awarded','suspended','revoked')),
  eligible_at timestamptz,
  awarded_at timestamptz,
  revoked_at timestamptz,
  unique(student_id,badge_id)
);
create table public.skills (
  id uuid primary key default gen_random_uuid(),
  badge_id uuid not null references public.badges(id),
  name text not null
);
create table public.skill_completions (
  id uuid primary key default gen_random_uuid(),
  student_badge_id uuid not null references public.student_badges(id),
  skill_id uuid not null references public.skills(id),
  completed_at timestamptz not null default now(),
  unique(student_badge_id,skill_id)
);
create table public.interviewers (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles(id),
  active boolean not null default true
);
create table public.availability_slots (
  id uuid primary key default gen_random_uuid(),
  interviewer_id uuid not null references public.interviewers(id),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at),
  unique(interviewer_id,starts_at),
  exclude using gist (interviewer_id with =, tstzrange(starts_at,ends_at,'[)') with &&) where (active)
);
create table public.interviews (
  id uuid primary key default gen_random_uuid(),
  student_badge_id uuid not null references public.student_badges(id),
  slot_id uuid not null references public.availability_slots(id),
  attempt_no integer not null check (attempt_no > 0),
  status public.interview_status not null default 'scheduled',
  booked_at timestamptz not null default now(),
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  unique(student_badge_id,attempt_no)
);
create unique index one_active_interview_per_badge
on public.interviews(student_badge_id)
where status in ('scheduled','in_progress','pending_evaluation');
create unique index one_active_booking_per_slot
on public.interviews(slot_id)
where status in ('scheduled','in_progress','pending_evaluation');
create table public.interview_results (
  id uuid primary key default gen_random_uuid(),
  interview_id uuid not null references public.interviews(id),
  revision_no integer not null default 1 check (revision_no > 0),
  outcome public.interview_outcome not null,
  feedback text,
  scorecard jsonb not null default '{}'::jsonb,
  recorded_by uuid not null references public.profiles(id),
  recorded_at timestamptz not null default now(),
  unique(interview_id,revision_no)
);
create table public.malpractice_flags (
  id uuid primary key default gen_random_uuid(),
  student_badge_id uuid not null references public.student_badges(id),
  reason text not null,
  evidence_url text,
  status text not null default 'pending'
    check (status in ('pending','confirmed','dismissed')),
  raised_by uuid not null references public.profiles(id),
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id),
  title text not null,
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id),
  entity_type text not null,
  entity_id uuid not null,
  action text not null,
  old_values jsonb,
  new_values jsonb,
  created_at timestamptz not null default now()
);

-- Atomic booking: row lock prevents two students from claiming the same slot.
-- The partial unique indexes protect against concurrent claims at the database layer.
create or replace function public.book_interview(p_student_badge_id uuid, p_slot_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_slot availability_slots%rowtype;
  v_interview_id uuid;
  v_attempt integer;
  v_student_id uuid;
begin
  select * into v_slot from availability_slots where id = p_slot_id for update;
  if not found or not v_slot.active or v_slot.starts_at <= now() then
    raise exception 'This slot is no longer available';
  end if;
  if exists (
    select 1 from interviews
    where student_badge_id = p_student_badge_id
      and status in ('scheduled','in_progress','pending_evaluation')
  ) then raise exception 'An active interview already exists for this badge'; end if;
  if not exists (
    select 1 from student_badges sb
    join students s on s.id = sb.student_id
    where sb.id = p_student_badge_id
      and sb.eligibility_status = 'eligible'
      and (s.profile_id = auth.uid() or exists (
        select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'
      ))
  ) then raise exception 'Student is not eligible or you are not authorized to book this badge interview'; end if;
  select student_id into v_student_id from student_badges where id = p_student_badge_id;
  if exists (
    select 1
    from interviews i
    join student_badges sb on sb.id = i.student_badge_id
    join availability_slots booked_slot on booked_slot.id = i.slot_id
    where sb.student_id = v_student_id
      and i.status in ('scheduled','in_progress','pending_evaluation')
      and tstzrange(booked_slot.starts_at,booked_slot.ends_at,'[)')
          && tstzrange(v_slot.starts_at,v_slot.ends_at,'[)')
  ) then raise exception 'This student already has an overlapping interview booking'; end if;
  select coalesce(max(attempt_no),0)+1 into v_attempt
    from interviews where student_badge_id = p_student_badge_id;
  insert into interviews(student_badge_id,slot_id,attempt_no,status)
    values(p_student_badge_id,p_slot_id,v_attempt,'scheduled')
    returning id into v_interview_id;
  return v_interview_id;
end; $$;
revoke all on function public.book_interview(uuid,uuid) from public;
grant execute on function public.book_interview(uuid,uuid) to authenticated;

-- Protected cancellation: student may cancel their own scheduled booking at least 24h ahead.
create or replace function public.cancel_interview(p_interview_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_interview public.interviews%rowtype;
  v_student_id uuid;
  v_slot public.availability_slots%rowtype;
begin
  select * into v_interview from public.interviews where id = p_interview_id for update;
  if not found then raise exception 'Interview not found'; end if;
  select sb.student_id into v_student_id
    from public.student_badges sb where sb.id = v_interview.student_badge_id;
  if not exists (select 1 from public.students s where s.id = v_student_id and s.profile_id = auth.uid())
     and not public.is_grit_admin() then
    raise exception 'Not authorized to cancel this interview';
  end if;
  if v_interview.status <> 'scheduled' then raise exception 'Only scheduled interviews can be cancelled'; end if;
  select * into v_slot from public.availability_slots where id = v_interview.slot_id for update;
  if not public.is_grit_admin() and v_slot.starts_at < now() + interval '24 hours' then
    raise exception 'Online cancellation closes 24 hours before the interview';
  end if;
  update public.interviews set status='cancelled', cancelled_at=now() where id=p_interview_id;
  update public.availability_slots set active=true where id=v_interview.slot_id;
  insert into public.audit_logs(actor_id,entity_type,entity_id,action,old_values,new_values)
  values(auth.uid(),'interview',p_interview_id,'cancelled',jsonb_build_object('status','scheduled'),jsonb_build_object('status','cancelled'));
end; $$;

-- Protected evaluation: only the assigned interviewer (or admin) can submit a final result.
-- Result revisions are append-only; the interview row is updated inside this transaction.
create or replace function public.submit_interview_evaluation(
  p_interview_id uuid,
  p_outcome public.interview_outcome,
  p_feedback text,
  p_scorecard jsonb default '{}'::jsonb
) returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_interview public.interviews%rowtype;
  v_slot public.availability_slots%rowtype;
  v_result_id uuid;
  v_revision integer;
  v_new_status public.interview_status;
  v_student_badge_id uuid;
begin
  select * into v_interview from public.interviews where id=p_interview_id for update;
  if not found then raise exception 'Interview not found'; end if;
  select * into v_slot from public.availability_slots where id=v_interview.slot_id;
  if not public.is_grit_admin() and v_slot.interviewer_id <> public.current_interviewer_id() then
    raise exception 'Only the assigned interviewer can evaluate this interview';
  end if;
  if v_interview.status not in ('scheduled','in_progress','pending_evaluation') then
    raise exception 'This interview already has a final outcome';
  end if;
  if p_outcome is null then raise exception 'An outcome is required'; end if;
  if p_outcome <> 'no_show' then
    if coalesce(jsonb_typeof(p_scorecard),'null') <> 'object'
       or not (p_scorecard ?& array['technical','problemSolving','communication','practical'])
       or exists (
         select 1 from jsonb_each(coalesce(p_scorecard,'{}'::jsonb)) e
         where e.key in ('technical','problemSolving','communication','practical')
           and case when jsonb_typeof(e.value) = 'number'
             then ((e.value::text)::numeric < 1 or (e.value::text)::numeric > 5 or trunc((e.value::text)::numeric) <> (e.value::text)::numeric)
             else true end
       ) then raise exception 'A complete integer 1–5 scorecard is required'; end if;
  end if;
  select coalesce(max(revision_no),0)+1 into v_revision
    from public.interview_results where interview_id=p_interview_id;
  insert into public.interview_results(interview_id,revision_no,outcome,feedback,scorecard,recorded_by)
  values(p_interview_id,v_revision,p_outcome,p_feedback,coalesce(p_scorecard,'{}'::jsonb),auth.uid())
  returning id into v_result_id;
  v_new_status := case p_outcome
    when 'pass' then 'passed'::public.interview_status
    when 'fail' then 'failed'::public.interview_status
    when 'retake' then 'retake_required'::public.interview_status
    when 'no_show' then 'no_show'::public.interview_status
  end;
  update public.interviews set status=v_new_status where id=p_interview_id;
  v_student_badge_id := v_interview.student_badge_id;
  if p_outcome='pass' then
    update public.student_badges set badge_status='awarded', awarded_at=now(), revoked_at=null
      where id=v_student_badge_id;
  end if;
  insert into public.audit_logs(actor_id,entity_type,entity_id,action,old_values,new_values)
  values(auth.uid(),'interview',p_interview_id,'evaluation_submitted',
    jsonb_build_object('status',v_interview.status),
    jsonb_build_object('status',v_new_status,'outcome',p_outcome,'result_id',v_result_id,'revision',v_revision));
  return v_result_id;
end; $$;
revoke all on function public.cancel_interview(uuid) from public;
revoke all on function public.submit_interview_evaluation(uuid,public.interview_outcome,text,jsonb) from public;
grant execute on function public.cancel_interview(uuid) to authenticated;
grant execute on function public.submit_interview_evaluation(uuid,public.interview_outcome,text,jsonb) to authenticated;

-- Confirmed malpractice revokes only the affected badge.
create or replace function public.apply_confirmed_malpractice()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'confirmed' and old.status is distinct from new.status then
    update student_badges set badge_status='revoked', revoked_at=now()
      where id=new.student_badge_id;
  end if;
  return new;
end; $$;
create trigger trg_malpractice_revocation
after update of status on public.malpractice_flags
for each row execute function public.apply_confirmed_malpractice();

-- Enable RLS. Add production policies after mapping profile ownership and admin claims.
alter table public.profiles enable row level security;
alter table public.tracks enable row level security;
alter table public.badges enable row level security;
alter table public.students enable row level security;
alter table public.skills enable row level security;
alter table public.skill_completions enable row level security;
alter table public.interviewers enable row level security;
alter table public.student_badges enable row level security;
alter table public.interviews enable row level security;
alter table public.interview_results enable row level security;
alter table public.availability_slots enable row level security;
alter table public.malpractice_flags enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_logs enable row level security;

-- IMPORTANT: This schema intentionally does not add permissive policies.
-- Configure role-aware SELECT/INSERT/UPDATE policies before production use.
