# Supabase RLS and workflow test plan

Run only in a disposable Supabase project with separate Auth users for each role. These tests are not evidence of production security until executed and recorded.

## Identity and read isolation

- [ ] Student A can read only their own profile, student row, badge progress, skill completions, interviews, results and notifications.
- [ ] Student A cannot query Student B records by guessing UUIDs.
- [ ] Student A cannot read interviewer-only records or admin audit/malpractice records.
- [ ] Interviewer A can read their own slots and only interviews assigned to them.
- [ ] Interviewer A cannot read an interview assigned to Interviewer B.
- [ ] Admin can read operational records across all students/interviewers.
- [ ] A student cannot change their own role in `profiles`; public signup metadata cannot grant interviewer/admin.

## Booking and cancellation RPCs

- [ ] Eligible student can book an open future slot through `book_interview`.
- [ ] Ineligible student cannot book.
- [ ] Student cannot book another student's `student_badge_id`.
- [ ] Two concurrent booking requests for one slot result in exactly one success.
- [ ] Duplicate active booking for one student-badge is rejected.
- [ ] Overlapping active bookings for the same student are rejected.
- [ ] Student can cancel their own scheduled interview at least 24 hours before start.
- [ ] Student cannot cancel another student's interview or cancel inside the 24-hour window.
- [ ] Cancelled slot is released and becomes bookable again; history remains.

## Evaluation RPC and immutable results

- [ ] Assigned interviewer can submit Pass, Fail, Retake or No-show for their interview.
- [ ] Unassigned interviewer cannot submit or change an outcome.
- [ ] Student cannot call evaluation RPC successfully.
- [ ] Direct client INSERT/UPDATE/DELETE on interviews and interview_results is denied.
- [ ] Pass requires all four scorecard values (1–5); invalid/missing values are rejected.
- [ ] No-show can be recorded without a scorecard.
- [ ] A second final outcome cannot overwrite the first; an admin correction workflow must create a new audited revision if later implemented.
- [ ] Pass updates only the associated student_badge; other badges remain unchanged.
- [ ] Audit row is written for cancellation and evaluation.

## Operational and security review

- [ ] Malpractice confirmation revokes only the affected badge.
- [ ] Notifications can be read/updated only by the recipient (or admin).
- [ ] Service-role key is never shipped to the browser.
- [ ] Test SQL with the actual Supabase project version and inspect function owners, grants, RLS bypass behavior and query plans.
- [ ] Have a qualified reviewer audit SECURITY DEFINER functions, RLS predicates, role provisioning and admin workflows before production.

## Important

The React demo in this ZIP does not call these RPCs. It continues to use fictional `localStorage` data. Passing these database tests does not make the local demo login secure; the UI must be integrated with Supabase Auth and database operations first.
