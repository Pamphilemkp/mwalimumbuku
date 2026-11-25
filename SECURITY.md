# Security checklist — phase 2

Review date: 25 November 2026. This describes the root Next.js app after the authentication hardening. It does not claim a live sign-in against Supabase. It does not change the production domain.

Database migrations in this phase: none. The shared Supabase project still serves the previous deployment, so policy changes are listed below and were not applied.

## Implemented

| Control | Where | Result |
| --- | --- | --- |
| Password sign-in | `features/auth/actions.ts`, `app/(auth)/login/page.tsx` | Server action. Generic failure text. No user id or role is accepted. |
| Sign-out | `signOutAction` | Global sign-out. The button stays put when it fails. |
| Session refresh | `proxy.ts` | `auth.getClaims()` on each matched request, cookie `getAll` / `setAll`. |
| Expired or invalid session | `lib/auth/claims.ts`, `proxy.ts`, `loadAppSession` | Any claims error or missing subject is signed out. |
| Password recovery | `app/(auth)/forgot-password/page.tsx` | Same acceptance message whether or not the account exists. |
| Password reset | `app/auth/callback/route.ts`, `app/(auth)/reset-password/page.tsx` | Code exchange or recovery token only. The form requires a verified session. The new password is 8–72 characters. |
| Invalid recovery token | callback route | Redirects to the reset page with no password form and does not put the token in the next URL. |
| Protected routes | `proxy.ts`, `app/(app)/layout.tsx`, dashboard and holding pages | Anonymous visitors go to `/login`. |
| Safe post-login redirect | `lib/auth/redirect.ts` | Only a `/dashboard` path. External, protocol-relative, query, and hash values are dropped. |
| Roles | `user_roles` via the verified subject | `student`, `parent`, `teacher`, `admin`. |
| Fail closed | `authorize` | Missing, duplicate, invalid, or failed role, and a role outside the allow-list, stay on `/holding`. |
| No self-serve privileged role | auth actions | No signup. No role field. Signup metadata coercion already lives in `handle_new_user` and is unchanged. |
| Cookies | `lib/supabase/cookie-options.ts` | `Secure` in production, `SameSite=Lax`, `Path=/`. Not `HttpOnly`, because the Supabase browser client has to read them. |
| Private cache | `lib/http/security-headers.ts` | `Cache-Control: private, no-store` on proxy and auth redirects. |
| Framing | response headers | `X-Frame-Options: DENY` and `frame-ancestors 'none'`. |
| MIME sniffing | response headers | `X-Content-Type-Options: nosniff`. |
| Referrer | response headers | `strict-origin-when-cross-origin` on pages. `no-referrer` on auth redirects. |
| Input checks | `lib/auth/validation.ts` | Email shape and length. Password length. Control characters rejected. |
| Safe errors | auth runners | Provider text, passwords, and account existence are not returned. |
| Rate limits | `lib/auth/rate-limit.ts` | Sign-in 8, recovery 5, password update 5, callback 10, each per address per 15 minutes, in this server process. |
| Server authorization | layout, dashboard, holding, reset, callback | Identity comes from `getClaims()`, then one role row. |
| API surface | one route handler, four server actions | No other Next route handlers. Each one is covered above. |

## Tests

`npm test` — 63 passed, 0 failed. They do not call Supabase.

Covered: anonymous paths, a verified role, role mismatch, missing and duplicate and invalid roles, a claims error, a rejected recovery token, an external redirect, a supplied user id that does not match the session, a password update without a session, and a recovery response that does not change when the account is unknown.

`npm run lint`, `npm run typecheck`, and `npm run build` passed on 25 November 2026. The build lists `/`, `/login`, `/forgot-password`, `/auth/callback`, `/reset-password`, `/dashboard`, and `/holding`.

## RLS findings

Page guards do not enforce these policies. The Next.js app currently reads `user_roles` only. The policies below are still what a browser client can do with the public key. They are not fixed in this phase.

| Table or function | What a signed-in browser can do | Evidence |
| --- | --- | --- |
| `user_roles` | Read its own row. An admin can manage rows. There is no policy that lets a student insert or update a role. | `20260308231918_...sql` policies “Users can view own roles” and “Admins can manage roles”. `handle_new_user` stores `teacher` or `admin` from signup metadata as `student`. |
| `exercises` | An enrolled student can `SELECT` the row, including the answer column. The UI RPC hides it. The policy does not. | “Enrolled students view exercises” in `20260308231918_...sql`. |
| `homework_submissions` | A student insert checks `user_id` only, so `grade` and `status` can be sent on insert. | “Students create own submissions” in `20260411195048_...sql`. |
| `profiles` | Any authenticated user can read a profile that has written a forum post or reply. Profiles hold phone, address, date of birth, and student code. | “Forum participants view profiles” in `20260308231918_...sql`. |
| `notifications` | Any authenticated user can insert a row for any user. | “System can insert notifications” uses `WITH CHECK (true)` in `20260413192746_...sql`. |
| `payment_history` | Any authenticated user can insert a payment row. | “System insert payments” in `20260529162956_...sql`. |
| `messages` | The receiver can update the row, including the message body, because the policy is only `auth.uid() = receiver_id`. | “Users update own received messages” in `20260308231918_...sql`. |
| `results` | Direct insert by the user is closed. `check_answer` still records an attempt without checking enrollment. | See `BUGS_AND_IMPROVEMENT_PLAN.md` section 1.3. |
| Storage | `course-materials` and `support-files` were created as public buckets. `homework-files` is private. | `BUGS_AND_IMPROVEMENT_PLAN.md` sections 1.9 and 2.1. |

`supabase/config.toml` sets `verify_jwt = false` on all six edge functions. Each function is expected to check the bearer token itself. `notify-enrollment` can write parent messages for an authenticated caller without an enrollment check. Those functions were not changed.

Do not port courses, homework, messages, notifications, or payments until a reviewed forward migration closes the matching row above. Applying that migration on the shared database also changes the previous deployment, so it needs its own staging check.

## Remaining risks

- The rate limiter is memory inside one Node process. A second instance, or a cold start, has its own counters. Supabase Auth has its own limits as well.
- Session cookies are not `HttpOnly`. A script that runs on this origin can read them. A script content-security policy is not set, because Next.js needs a nonce setup this phase does not add.
- `X-Forwarded-For` is treated as the client address. That matches a Vercel deployment. If the Node server is reached directly, a caller can choose that header.
- Password recovery with a PKCE code works in the browser that requested the email. A link opened on another device needs the recovery email template described in the README.
- A signed-in person can open `/reset-password` and set a new password without the old one. The session is the proof. Role is not involved.
- This pass did not sign in to the hosted project, did not apply SQL, and did not click the recovery email.
- The educational product screens are still absent. Their absence is not a security fix for the policies above.

## Staging check

1. Deploy the repository root to `https://mwalimumbuku.vercel.app`.
2. Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and `NEXT_PUBLIC_SITE_URL` to `https://mwalimumbuku.vercel.app`.
3. Set the Supabase Auth Site URL to `https://mwalimumbuku.vercel.app` and allow `{origin}/auth/callback` and `{origin}/auth/confirmed`. Clear the Lovable SMTP sender.
4. Sign in with a real student. Confirm `/dashboard` shows that role and `/login?next=https://example.com` returns to `/dashboard`.
5. Open `/dashboard` in a private window and confirm it lands on `/login`.
6. Request a reset for a known account and for an unknown address. Both screens should say a link is on its way if the address is valid. Open the link, set a new password, and sign in with it.
7. Open `/reset-password` with no session and confirm the password form is absent.

## Rollback

Revert this pull request. There is no database migration to undo. The production domain stays on the previous deployment.
