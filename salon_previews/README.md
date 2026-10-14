# BARBERFLOW — Three Gent Salon Proposal Previews

Public demonstration hub (noindex): https://barberflow-salon-proposals.vercel.app/

- https://barberflow-salon-proposals.vercel.app/bar-bier/
- https://barberflow-salon-proposals.vercel.app/fero/
- https://barberflow-salon-proposals.vercel.app/momo/

### Sources checked, not assumptions
- Bar-bier: https://visit.gent.be/nl/eten-drinken/bar-bier (Sint-Margrietstraat 18, +32 9 223 45 93, unique barbershop+cafe hybrid). The shop's own published social notice says appointments are used. We show "call to check" and do not infer a real availability calendar.
- Fero: https://barbershop-fero.be/ (Muidepoort 112/A, Tel 0484 77 53 12; Tue-Sun 09:00–19:00, Mon closed; Snit €18, Fade €20, Baard+Snit €35, other prices are available on their site).
- M&M MOMO: https://www.fresha.com/nl/lvp/barbershop-m-m-momo-bevrijdingslaan-gent-1YyVN1 (Bevrijdingslaan 52; +32 497 57 06 64 per independent local listing). Third-party opening-hour records conflict, so the published mockup does not state hours as fact.

### Brand usage and editorial safety
These are **non-affiliated private business proposals**; no claim of endorsement, ownership or official partnership. The custom CSS/typographic wordmarks are PROPOSED designs, **not asserted to be the shops' genuine official logos**, which cannot be authenticated from the limited sources. To swap for real brand assets, obtain each owner-approved logo SVG/PNG and original photos; do not substitute screenshots or random social-platform images without permission and adequate rights.
The currently linked Unsplash photographs are illustrative lifestyle stock imagery, deliberately **not claimed to show these businesses**. Obtain owner-approved genuine photos before a public launch.
All pages have noindex metadata and non-affiliation notes.

### App behavior
- 3 bespoke high-end responsive storefronts with menu, hero, services, lookbook, location, contact and interactive booking-*concept* section.
- Buttons allow picking sample service, date and example time, but there is NO backend and NO slot verification. The UI very clearly says examples are NOT live availability.
- Users can only proceed to the shop's publicly listed phone number to make an actual booking; no personal details are requested or saved.
- Do not enable a real booking API until each owner has explicitly approved an onboarding and booking workflow. NIZO's API/data is not reused.
- Mobile navigation, scroll reveals with reduced-motion fallback, clear button sizes and self-contained SVG icons.

### Deployment
Vercel project `barberflow-salon-proposals`, project id `prj_04YIluJfZYkUPqNOSn7G9CnCZY45`; completely separate from BARBER NIZO. This preview is an **inline source deployment**, so pushing to GitHub does NOT automatically redeploy.
Source code: `salon_previews/index.html`, three child `index.html`, and `assets/salon.css` + `assets/site.js`.

### Launch readiness checklist
1. Written authorization by each owner; approved original logo/photos and brand colors.
2. Confirm service names, prices, opening hours, phone and booking policies with owner.
3. Build separate opt-in booking backend/secure dashboard and test end-to-end.
4. Add Belgian GDPR privacy policy, cookie compliance if adding trackers, access controls, backups and customer support contacts.
5. Appropriate commercial Vercel hosting plan or alternative and proper domain/DNS.
6. Device-side visual QA on iOS Safari and Android; source+CI checks alone cannot prove pixel-perfect browser behavior.
