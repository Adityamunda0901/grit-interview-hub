# GRIT Interview Hub — Product & Technical Write-up

## 1. Student interview states

| State | Entry condition / transition |
|---|---|
| Not eligible | Required badge skills or programme criteria are incomplete. Moves to Eligible when the GRIT eligibility source confirms all requirements. |
| Eligible to book | Badge-specific eligibility is true. Student can view available interviewer slots. |
| Scheduled | Student confirms an available slot; the production database commits the booking atomically. |
| Cancelled / reschedule needed | Student cancels at least 24 hours before the slot, or interviewer/admin cancels. Slot is released and student returns to Eligible to book. |
| In progress | Assigned interviewer starts the session. |
| No-show | Interviewer records that the student did not attend; rebooking follows admin policy. |
| Pending evaluation | Interview is complete but the final scorecard/outcome is not yet submitted. |
| Passed | Assigned interviewer submits a passing outcome and scorecard; badge is awarded subject to configured approval checks. |
| Failed | Interviewer records fail; student sees feedback and applicable retake policy. |
| Retake required | Interviewer recommends another attempt. Previous attempt remains in history. |
| Badge awarded | Successful outcome is approved and reflected in the student's badge status. |
| Badge suspended / revoked | A malpractice flag is reviewed. Confirmed malpractice revokes only the affected badge; dismissed flags leave it unchanged. |

## 2. Edge cases and assumptions

- **Eligibility:** Eligibility is checked per student-badge pair, not globally. GRIT remains the source of truth for skills, attendance and conduct requirements.
- **Race condition / double booking:** Production booking uses a transaction, row lock and unique constraints. Client-side checks in the demo are illustrative only and cannot prevent concurrent claims across browsers.
- **Overlapping bookings:** A student cannot hold overlapping active interview slots; database constraints/RPC validation enforce this in production.
- **Interviewer cancellation:** Notify the student, release the slot, retain the cancellation reason and permit rescheduling.
- **Cancellation cutoff:** Demo uses a 24-hour student cancellation cutoff. Admin may override through an audited backend operation.
- **No-show:** Distinguish student no-show from interviewer absence; retain the record and apply a configurable rebooking policy.
- **No slots available:** Show a waitlist or allow the student to opt into availability notifications.
- **Retake:** Keep every attempt and result; allow only one active attempt per student-badge.
- **Incorrect outcome:** Do not silently overwrite a result. Require an authorized correction workflow, revision history and audit record.
- **Malpractice after pass:** Suspend the affected badge during review; revoke only after an authorized reviewer confirms the flag. Do not delete interview history.
- **Time zones / slot expiry:** Store timestamps in UTC, display in the student's configured timezone (IST in this prototype), and reject past slots.
- **Notifications:** Demo notifications are in-app previews only. Email/SMS delivery requires a trusted server-side provider integration.

## 3. Data model

| Entity | Key fields / relationships |
|---|---|
| profiles | id, full_name, email, role |
| students | id, profile_id, student_code, cohort, attendance |
| tracks / badges | id, track_id, name, level |
| student_badges | id, student_id, badge_id, eligibility_status, badge_status |
| skills / skill_completions | skill_id, badge_id; student_badge_id, completed_at |
| interviewers | id, profile_id, active |
| availability_slots | id, interviewer_id, starts_at, ends_at, active |
| interviews | id, student_badge_id, slot_id, attempt_no, status, booked_at |
| interview_results | id, interview_id, revision_no, outcome, feedback, scorecard, recorded_by, recorded_at |
| malpractice_flags | id, student_badge_id, reason, evidence_url, status, reviewed_by |
| notifications | id, profile_id, title, body, read_at |
| audit_logs | actor_id, entity_type, entity_id, action, old_values, new_values |

**Integrity rules:** unique slot booking; one active interview per student-badge; unique attempt number per badge; role-based authorization; immutable result revisions; badge-scoped revocation after confirmed malpractice.

## 4. Role-based access model

- **Student:** reads only their own profile, badge progress, bookings, results and notifications; can book eligible slots and request permitted cancellation.
- **Interviewer:** reads their own availability and only interviews assigned to them; can publish their own slots and submit scorecards/outcomes for assigned interviews.
- **Admin:** sees operational records, manages eligibility/assignments and reviews exceptional cases. Sensitive actions should be audited.

The prototype demonstrates role-scoped screens and separate account sign-in. It uses local demo credentials and `localStorage`, so the client-side restrictions are not secure access controls. The included Supabase RLS/RPC files are a backend implementation draft; the React app is not wired to them. Production use requires Supabase Auth, trusted role provisioning, database integration and a successful RLS test run.

## 5. Three key student messages

1. **Eligibility:** “You're eligible for your AI Product Mastery – Novice interview! Congratulations on completing all the required skills. Choose an available interview slot to take the next step towards earning your badge.”
2. **Booking:** “Your interview is confirmed! Your AI Product Mastery – Novice interview is scheduled for 18 November at 11:00 AM with your assigned interviewer. Please join the interview on time and keep your camera and microphone ready.”
3. **Pass:** “Congratulations! You've cleared your interview! You've successfully cleared the AI Product Mastery – Novice interview. Your badge has been awarded and your GRIT journey has moved one step forward. Keep learning and aim for the next level!”

## Prototype note

The deliverable is a runnable local prototype with fictional data. It demonstrates student booking, interviewer availability and evaluation, student result visibility, and admin operations. Live authentication, database persistence, email delivery and production-grade authorization are not represented as completed integrations.
