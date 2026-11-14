# GRIT Interview Hub — v4

A role-based prototype for GRIT interview scheduling, interviewer availability, evaluation and badge-clearance tracking.

## Run locally

Requirements: Node.js 18+ and npm.

```bash
npm install
npm run dev
```

Open the local Vite URL (usually `http://localhost:5173`).

## Demo access

The login page intentionally does **not** display demo accounts or credentials. Evaluator credentials are supplied separately by the project owner, outside this ZIP. Do not add demo passwords to the frontend, screenshots, or public repository.

The demo has three roles:

- **Student:** can view their own profile, badge eligibility, booking, outcome and attempt history.
- **Interviewer:** can view their own availability and assigned interviews, and submit an evaluation scorecard.
- **Admin:** can inspect the overall pipeline, eligible/unbooked students, interview records and badge-review simulation.

### Suggested evaluator walkthrough

1. Sign in as a student and inspect eligibility, badge progress and booking.
2. Book an open future slot; inspect the confirmation details.
3. Sign out and sign in as the interviewer assigned to that slot.
4. Review the candidate, complete the 1–5 scorecard, add feedback and submit Pass, Fail, Retake or No-show.
5. Sign out and return as the student to confirm the result and attempt history.
6. Sign in as Admin to review the operations dashboard, pipeline and student/interview directory.
7. Test cancellation on a scheduled interview more than 24 hours away. The slot should become available again.

## Included workflows

- Separate student, interviewer and admin sign-in experiences.
- Per-account UI scoping; no role or profile switcher after sign-in.
- Badge-specific eligibility and progress.
- Slot booking with overlap and duplicate-booking checks in the local demo state.
- Student cancellation with a 24-hour cutoff and slot release.
- Interviewer schedule and availability management, including Start interview → In progress → Mark session complete → Pending evaluation.
- Evaluation scorecard: technical understanding, problem-solving, communication and practical application (1–5 each).
- Pass, Fail, Retake and No-show outcomes, plus written feedback.
- Student result and attempt-history views.
- Admin operations metrics and badge-malpractice review simulation.

## Important security and data limitations

This ZIP is a **local demonstration prototype**, not a production authentication system. The demo credential verifier uses client-side PBKDF2 hashes (plain-text passwords are not stored in the project), and sample operational data is stored in browser `localStorage`. The hash verifier and salt are still shipped to the browser and can be attacked offline; this is only a convenience for a fictional demo. A technically capable user can inspect or alter browser code and local storage. UI filtering is not a security boundary. Use fictional data only.

The `supabase/` folder contains a PostgreSQL schema, role-aware RLS policy draft, database RPCs and an RLS test plan. The React UI is **not connected** to those database operations. To use real data, a project owner must:

1. Create a Supabase project and configure Supabase Auth.
2. Provision student/interviewer/admin roles from a trusted process; never trust a public signup role field.
3. Apply `schema.sql` and then `role_policies.sql` in a test project.
4. Connect every read/write in the React app to Supabase and use the supplied RPCs for booking, cancellation and evaluation.
5. Run the RLS test plan using separate Auth users, review the policies with a database/security engineer, and only then consider production use.
6. Keep the service-role key on a trusted server only. The browser may use only the anon/publishable key.

`src/lib/supabase.js` is only a client initialization scaffold. Setting environment variables does not automatically move the app from local demo mode to Supabase persistence.

## Project structure

- `src/App.jsx` — React screens, demo auth, role-scoped UI and local workflows.
- `src/data.js` — fictional demo records.
- `src/styles.css` — application styling.
- `supabase/schema.sql` — PostgreSQL schema and atomic booking function.
- `supabase/role_policies.sql` — RLS policies and protected RPCs (review/test before use).
- `supabase/RLS_TEST_PLAN.md` — authorization test checklist.
- `SUBMISSION_WRITEUP.md` / `SUBMISSION_WRITEUP.pdf` — assignment write-up.
- `SCREENSHOT_GUIDE.md` — suggested before/after evidence.

## Deployment

For a demo-only deployment, build with `npm run build` and deploy the `dist/` directory using a static host. Do not treat a public deployment of the local demo login as secure. Do not publish evaluator credentials in the repository.

## Product assumptions

- Eligibility is badge-specific and supplied by the GRIT skills/eligibility source of truth.
- One active interview per student-badge at a time.
- Interview history and previous attempts are retained.
- Interviewers publish their own availability; slots are single-booking.
- Student cancellation closes 24 hours before the interview in this prototype.
- Outcomes are Pass, Fail, Retake or No-show; a structured scorecard is recorded for attended interviews.
- Malpractice revocation is badge-scoped and should require an independently reviewed, confirmed case.
- Database timestamps are stored in UTC; the demo displays IST.
