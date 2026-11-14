-- GRIT Interview Hub — role-based Row Level Security policies
-- Run AFTER schema.sql in the Supabase SQL editor.
-- Provision interviewer/admin roles from a trusted admin process; never accept role from public signup metadata.

create or replace function public.current_app_role()
returns public.app_role
language sql stable security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.is_grit_admin()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select coalesce(public.current_app_role() = 'admin', false)
$$;

create or replace function public.current_student_id()
returns uuid
language sql stable security definer
set search_path = public
as $$
  select id from public.students where profile_id = auth.uid()
$$;

create or replace function public.current_interviewer_id()
returns uuid
language sql stable security definer
set search_path = public
as $$
  select id from public.interviewers where profile_id = auth.uid()
$$;

-- SECURITY DEFINER predicates avoid recursive RLS evaluation when policies need
-- to establish whether a student/interview is assigned to the current interviewer.
create or replace function public.can_access_student(p_student_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select p_student_id = public.current_student_id()
    or public.is_grit_admin()
    or exists (
      select 1 from public.student_badges sb
      join public.interviews i on i.student_badge_id = sb.id
      join public.availability_slots av on av.id = i.slot_id
      where sb.student_id = p_student_id
        and av.interviewer_id = public.current_interviewer_id()
    )
$$;

create or replace function public.can_access_student_badge(p_badge_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.student_badges sb
    where sb.id = p_badge_id
      and (
        sb.student_id = public.current_student_id()
        or public.is_grit_admin()
        or exists (
          select 1 from public.interviews i
          join public.availability_slots av on av.id = i.slot_id
          where i.student_badge_id = sb.id
            and av.interviewer_id = public.current_interviewer_id()
        )
      )
  )
$$;

create or replace function public.can_access_interview(p_interview_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.interviews i
    join public.student_badges sb on sb.id = i.student_badge_id
    join public.availability_slots av on av.id = i.slot_id
    where i.id = p_interview_id
      and (
        sb.student_id = public.current_student_id()
        or av.interviewer_id = public.current_interviewer_id()
        or public.is_grit_admin()
      )
  )
$$;

create or replace function public.can_read_assigned_student_profile(p_profile_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.students s
    join public.student_badges sb on sb.student_id=s.id
    join public.interviews i on i.student_badge_id=sb.id
    join public.availability_slots av on av.id=i.slot_id
    where s.profile_id=p_profile_id
      and av.interviewer_id=public.current_interviewer_id()
  )
$$;

-- Profiles: a user can read only their own profile; admins can read/manage all.
drop policy if exists profiles_read_self_or_admin on public.profiles;
create policy profiles_read_self_or_admin on public.profiles
for select to authenticated
using (id = auth.uid() or public.is_grit_admin());
drop policy if exists profiles_read_assigned_students on public.profiles;
create policy profiles_read_assigned_students on public.profiles
for select to authenticated
using (public.can_read_assigned_student_profile(id));

drop policy if exists profiles_admin_manage on public.profiles;
create policy profiles_admin_manage on public.profiles
for all to authenticated
using (public.is_grit_admin())
with check (public.is_grit_admin());

-- Shared catalogue data is readable by signed-in users.
drop policy if exists tracks_read_authenticated on public.tracks;
create policy tracks_read_authenticated on public.tracks for select to authenticated using (true);
drop policy if exists badges_read_authenticated on public.badges;
create policy badges_read_authenticated on public.badges for select to authenticated using (true);
drop policy if exists skills_read_authenticated on public.skills;
create policy skills_read_authenticated on public.skills for select to authenticated using (true);

-- Students: self + admin; interviewers can see only students assigned to their interviews.
drop policy if exists students_read_scoped on public.students;
create policy students_read_scoped on public.students for select to authenticated
using (public.can_access_student(id));
drop policy if exists students_admin_manage on public.students;
create policy students_admin_manage on public.students for all to authenticated
using (public.is_grit_admin()) with check (public.is_grit_admin());

-- Badge progress and skill completion are private to the student and admins.
drop policy if exists student_badges_read_scoped on public.student_badges;
create policy student_badges_read_scoped on public.student_badges for select to authenticated
using (public.can_access_student_badge(id));
drop policy if exists student_badges_admin_manage on public.student_badges;
create policy student_badges_admin_manage on public.student_badges for all to authenticated
using (public.is_grit_admin()) with check (public.is_grit_admin());

drop policy if exists skill_completions_read_scoped on public.skill_completions;
create policy skill_completions_read_scoped on public.skill_completions for select to authenticated
using (public.can_access_student_badge(student_badge_id));
drop policy if exists skill_completions_admin_manage on public.skill_completions;
create policy skill_completions_admin_manage on public.skill_completions for all to authenticated
using (public.is_grit_admin()) with check (public.is_grit_admin());

-- Interviewer identity is private to the interviewer and admin; directory names are not exposed wholesale.
drop policy if exists interviewers_read_scoped on public.interviewers;
create policy interviewers_read_scoped on public.interviewers for select to authenticated
using (profile_id = auth.uid() or public.is_grit_admin());
drop policy if exists interviewers_admin_manage on public.interviewers;
create policy interviewers_admin_manage on public.interviewers for all to authenticated
using (public.is_grit_admin()) with check (public.is_grit_admin());

-- Slots: students can view active bookable slots; interviewers manage their own; admins manage all.
drop policy if exists slots_read_scoped on public.availability_slots;
create policy slots_read_scoped on public.availability_slots for select to authenticated
using (
  (active = true and starts_at > now() and not exists (
    select 1 from public.interviews i
    where i.slot_id = availability_slots.id
      and i.status in ('scheduled','in_progress','pending_evaluation')
  ))
  or interviewer_id = public.current_interviewer_id()
  or public.is_grit_admin()
  or exists (
    select 1 from public.interviews i
    join public.student_badges sb on sb.id = i.student_badge_id
    where i.slot_id = availability_slots.id
      and sb.student_id = public.current_student_id()
  )
);
drop policy if exists slots_interviewer_insert on public.availability_slots;
create policy slots_interviewer_insert on public.availability_slots for insert to authenticated
with check (interviewer_id = public.current_interviewer_id() or public.is_grit_admin());
drop policy if exists slots_interviewer_update on public.availability_slots;
create policy slots_interviewer_update on public.availability_slots for update to authenticated
using (
  public.is_grit_admin()
  or (interviewer_id = public.current_interviewer_id() and not exists (
    select 1 from public.interviews i where i.slot_id=availability_slots.id
      and i.status in ('scheduled','in_progress','pending_evaluation')
  ))
)
with check (
  public.is_grit_admin()
  or (interviewer_id = public.current_interviewer_id() and not exists (
    select 1 from public.interviews i where i.slot_id=availability_slots.id
      and i.status in ('scheduled','in_progress','pending_evaluation')
  ))
);
drop policy if exists slots_admin_delete on public.availability_slots;
create policy slots_admin_delete on public.availability_slots for delete to authenticated
using (public.is_grit_admin());

-- Interviews: students see only their own attempts; interviewers see only their assigned interviews.
drop policy if exists interviews_read_scoped on public.interviews;
create policy interviews_read_scoped on public.interviews for select to authenticated
using (public.can_access_interview(id));
-- No direct interview writes from the browser. Booking, cancellation and evaluation
-- must use the SECURITY DEFINER RPCs in schema.sql, which validate ownership and transitions.
drop policy if exists interviews_interviewer_update on public.interviews;
revoke insert, update, delete on public.interviews from authenticated;
grant select on public.interviews to authenticated;

-- Booking is performed through book_interview RPC, not direct student inserts.
-- Results are visible to the owning student, assigned interviewer and admin.
drop policy if exists results_read_scoped on public.interview_results;
create policy results_read_scoped on public.interview_results for select to authenticated
using (public.can_access_interview(interview_id));
drop policy if exists results_insert_interviewer_admin on public.interview_results;
-- Result rows are append-only and inserted only inside submit_interview_evaluation().
revoke insert, update, delete on public.interview_results from authenticated;
grant select on public.interview_results to authenticated;

-- Sensitive integrity flags and audit trail: admin-only.
drop policy if exists malpractice_admin_only on public.malpractice_flags;
create policy malpractice_admin_only on public.malpractice_flags for all to authenticated
using (public.is_grit_admin()) with check (public.is_grit_admin());
drop policy if exists audit_admin_read on public.audit_logs;
create policy audit_admin_read on public.audit_logs for select to authenticated
using (public.is_grit_admin());
drop policy if exists audit_insert_actor on public.audit_logs;
create policy audit_insert_actor on public.audit_logs for insert to authenticated
with check (actor_id = auth.uid() and public.is_grit_admin());

-- Notifications: users read/update only their own; admin can inspect all.
drop policy if exists notifications_read_scoped on public.notifications;
create policy notifications_read_scoped on public.notifications for select to authenticated
using (profile_id = auth.uid() or public.is_grit_admin());
drop policy if exists notifications_update_scoped on public.notifications;
create policy notifications_update_scoped on public.notifications for update to authenticated
using (profile_id = auth.uid() or public.is_grit_admin())
with check (profile_id = auth.uid() or public.is_grit_admin());

-- IMPORTANT:
-- 1) Do not expose the Supabase service-role key in the browser.
-- 2) Create/provision interviewer and admin profiles from a trusted admin process.
-- 3) Add server-side validation for result transitions and immutable audit records.
-- 4) Test every role with separate Auth users before production deployment.


-- Admin manages the GRIT catalogue (tracks, badges and required skills).
drop policy if exists tracks_admin_manage on public.tracks;
create policy tracks_admin_manage on public.tracks for all to authenticated
using (public.is_grit_admin()) with check (public.is_grit_admin());
drop policy if exists badges_admin_manage on public.badges;
create policy badges_admin_manage on public.badges for all to authenticated
using (public.is_grit_admin()) with check (public.is_grit_admin());
drop policy if exists skills_admin_manage on public.skills;
create policy skills_admin_manage on public.skills for all to authenticated
using (public.is_grit_admin()) with check (public.is_grit_admin());

drop policy if exists notifications_admin_insert on public.notifications;
create policy notifications_admin_insert on public.notifications for insert to authenticated
with check (public.is_grit_admin());


-- Helper functions are callable only by authenticated application users.
revoke all on function public.current_app_role() from public;
revoke all on function public.is_grit_admin() from public;
revoke all on function public.current_student_id() from public;
revoke all on function public.current_interviewer_id() from public;
revoke all on function public.can_access_student(uuid) from public;
revoke all on function public.can_access_student_badge(uuid) from public;
revoke all on function public.can_access_interview(uuid) from public;
revoke all on function public.can_read_assigned_student_profile(uuid) from public;
grant execute on function public.current_app_role() to authenticated;
grant execute on function public.is_grit_admin() to authenticated;
grant execute on function public.current_student_id() to authenticated;
grant execute on function public.current_interviewer_id() to authenticated;
grant execute on function public.can_access_student(uuid) to authenticated;
grant execute on function public.can_access_student_badge(uuid) to authenticated;
grant execute on function public.can_access_interview(uuid) to authenticated;
grant execute on function public.can_read_assigned_student_profile(uuid) to authenticated;

-- Protected workflow RPCs. Do not grant direct interview/result table writes to clients.
revoke all on function public.book_interview(uuid,uuid) from public;
revoke all on function public.cancel_interview(uuid) from public;
revoke all on function public.submit_interview_evaluation(uuid,public.interview_outcome,text,jsonb) from public;
grant execute on function public.book_interview(uuid,uuid) to authenticated;
grant execute on function public.cancel_interview(uuid) to authenticated;
grant execute on function public.submit_interview_evaluation(uuid,public.interview_outcome,text,jsonb) to authenticated;
