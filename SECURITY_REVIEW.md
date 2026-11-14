# Security review and production-readiness notes

## Current prototype boundary

This is a fictional-data, browser-local demo. The role-specific pages demonstrate expected access boundaries, but do not enforce them against a malicious user. Demo credentials are verified in the browser using PBKDF2 hashes; hashes and salt are shipped to the client and are not a substitute for server-side password authentication. Operational records and session state use `localStorage` and can be edited by the browser owner.

## Improvements included in v4

- No account list, quick-fill action or password is displayed on the login page.
- Plain-text demo passwords are not included in the project; only PBKDF2 verifier hashes are present.
- Separate Student, Interviewer and Admin sessions; no in-app role/profile switcher.
- UI-level student/interviewer record scoping.
- Assigned-interviewer check before local demo evaluation is accepted.
- Evaluation scorecard with four criteria rated 1–5; Pass, Fail, Retake and No-show outcomes.
- Student cancellation cutoff (24 hours) and slot release in the local demo.
- Two-step malpractice review: pending flag followed by confirm/dismiss; confirmed action affects only the selected badge.
- SQL RPC drafts for atomic booking, cancellation and evaluation; direct browser writes to interviews/results are revoked in the RLS policy draft.

## Still required before real student data

1. Replace demo login with Supabase Auth (or institutional SSO); no client-side credential verifier.
2. Provision roles and account links from a trusted administrative process.
3. Connect React data reads/writes to Supabase; do not keep real records in localStorage.
4. Apply schema and policies to a test project, then execute every case in `supabase/RLS_TEST_PLAN.md`.
5. Review SECURITY DEFINER functions, grants, role provisioning, audit behavior and policy bypass assumptions with a qualified reviewer.
6. Add server-side notification delivery, monitoring, rate limiting, password recovery/SSO and incident response.
7. Define an approved result-correction process that appends revisions rather than overwriting prior decisions.

## Not verified

No live Supabase project was available, so SQL was not executed against a database and RLS behavior was not integration-tested. Dependency installation timed out in this environment, so a Vite production build could not be run here. JSX parser checks and archive integrity checks are performed before delivery.
