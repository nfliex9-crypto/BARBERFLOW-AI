# BARBER NIZO — V8 owner dashboard audit

**2026-10-13.** Owner dashboard: https://barber-nizo-gent-preview.vercel.app/owner.html

## Confirmed

- Dedicated Vercel deployment `dpl_C5dsVvcWsqajN28EZH5XEvHE5fEr` reached READY on the existing preview domain.
- Static owner page, `owner.js`, `owner-dashboard.css`, and the public website returned HTTP 200 from the Vercel-hosted URLs.
- Booking `GET /api/booking?action=config` returned HTTP 200 with four active database-backed services, all with `price_confirmed=false`. There is **no official verified price list** yet.
- Booking slots for 2026-10-14 haircut returned 20 slots, first 10:00, last 19:30, timezone Europe/Brussels. Sun closed. Opening hours are Mon–Sat 10:00–20:00.
- The Neon database has a PostgreSQL exclusion constraint `nizo_no_overlapping_active_bookings` and a read-only overlap check found 0 pairs of conflicting active reservations.
- Two pending appointments already existed on Neon during inspection; their content and statuses were left unchanged. Their origin (real customers vs tests) is not verified.
- Vercel production holds `DATABASE_URL`, `NIZO_APP_SECRET`, and `NIZO_ADMIN_PASSWORD` as encrypted environment variables. Values are not stored in repository source.
- GitHub Actions on branch `nizo-owner-dashboard-v8` succeeded: 40 Python tests, 4 Node calendar tests, JavaScript syntax checks and Docker validation.
- Admin API includes session checking before all private routes, password-only login with hourly rate limiting, `HttpOnly; Secure; SameSite=Strict` cookie, body validation and per-action header for mutations.
- Admin can read aggregate metrics, filter and search appointments, confirm/decline/cancel, manage services/prices, and manage closed dates. Public API reads services and closure rules from Neon.

## Caveats and unfinished production checks

1. **No authenticated UI end-to-end test was performed on the live site**. A real owner should log in and test dashboard functionality before relying on it. Do not claim everything is 100% verified.
2. **Do not publish the currently configured random owner password in GitHub or public chat**. In Vercel encrypted production environment variables, rotate `NIZO_ADMIN_PASSWORD` to a new private owner-selected password of at least 16 characters; redeploy the production environment and confirm login.
3. Automatic email, SMS, WhatsApp and payment receipts remain unconnected. Pending appointment requests do not automatically notify the barber. The owner must review requests manually; notify customers personally after confirmation.
4. Current pricing is unconfirmed. The barber must review every service, duration and price in the owner dashboard and check `price_confirmed` only after verification.
5. The system models **one appointment resource**. Multi-chair / multi-barber capacity needs a later scheduler upgrade.
6. Customer data retention, privacy/legal notices, DPAs and database offsite backup/restore procedures are not fully validated. Ensure Belgium/EU GDPR compliance before full commercial launch.
7. Vercel Hobby terms may restrict commercial use. Use an eligible commercial plan or suitable host before launching to paying clients.
8. Pending holds last at most 48 hours and expire lazily on booking/read operations. Owners should not assume a push notification was sent.
9. The direct SQL calendar check prevents overlapping active bookings. There is a small concurrent owner-closure versus new-request race to address with transactional locking before production-critical usage.
10. Runtime logs showed a Node/Vercel deprecation warning about `url.parse()`; the publicly tested GET routes returned 200. Investigate dependencies/runtime if warning persists.
11. The deployment is an inline source snapshot, not automatic Git-synchronized Continuous Deployment. Future branch commits need a subsequent explicit deployment.
12. The owner dashboard does not currently support customer self-cancellation, employee accounts, 2FA, or automatic reminders. Do not promise these features.

## Owner acceptance checklist

- [ ] Open owner.html on a private device, sign in using rotated owner password.
- [ ] Check two existing pending requests without changing them until classified.
- [ ] Test filtering/searching appointments and date range.
- [ ] Review four service names, durations, and prices; confirm each.
- [ ] Create a **new future test request** with consent and a clearly fictional `.invalid` email, check it in owner dashboard, approve then cancel it; verify public slot changes and private status page. Do this only in an explicitly authorized test setting or with owner's approval for test records.
- [ ] Test a closed day with no existing reservations, then reopen it; verify slots disappear/reappear.
- [ ] Verify phone/mobile appearance and reduced-motion behavior.
- [ ] Provide legal privacy content and retention policy and test backup restores.
- [ ] Set up a reliable transactional mail service before official customer onboarding.

This audit distinguishes code/CI successes and actual live GET checks from untested user interactions.
