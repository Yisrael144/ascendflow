# Ascend Flow

A full-stack business workspace reconstructed from the adjacent GoHighLevel research. This is an independent implementation; it does not contain GoHighLevel source, branding, credentials or customer records. It is not a claim of complete GoHighLevel parity.

## Run

Node 22.13+ required. Install with the Sites skill dependency helper or `npm run install:ci`. Generate schema changes with `npm run db:generate`. Build with the Sites `build-site.mjs` helper. Apply the generated SQL to local D1 with the starter's documented migration command, then run `npm run dev`. Local sign-in: `/signin-with-chatgpt?return_to=/` (development identity only). Hosted identity is handled by Sites. Production is owner-private.

Tests: `node --test tests/model.test.mjs`; typecheck: `node node_modules/typescript/bin/tsc --noEmit`. End-to-end tests require a running development server and its local authentication cookie.

## Application

19 business navigation areas plus agency workspaces. Server-backed CRUD for contacts, notes, tasks, pipelines/opportunities, calendar settings/appointments, products/invoice drafts and immutable manual payment receipts, marketing drafts, workflows, websites/forms, courses/lessons/offers/enrollments, media, manual reputation records, reports, knowledge/agent configurations, account metadata and plans. Search, filters, sorting, CSV export/import, saved searches, audit history and configuration snapshots are included.

D1 stores owner/workspace-scoped records and audit events. R2 stores uploaded files, capped at 10 MB per upload. Every API access requires hosted identity. Record updates use revision checks. Booking capacity is tested and reserved in one conditional SQL statement. Appointment timestamps are normalized to UTC; availability is checked in the calendar timezone.

Workflow actions: tag, note, task, opportunity, conditional tag and wait. Trigger events: manual, contact creation, form submission, appointment booking and deal won. Runs store their step snapshots, cursor, logs and wait deadlines. Due waits resume while the workspace is open or when manually processed; **no unattended scheduler is configured**. Runs use a lease to avoid concurrent advancement and deterministic created-record IDs for retry safety. External email/SMS/webhook steps stop as Blocked without delivery. This runtime is our design, not an exact reconstruction of HighLevel's edit-in-flight semantics.

Site drafts use editable blocks and responsive preview. Publishing stores a separate immutable block snapshot within the private workspace. It does not configure a public domain. Form tests create/match contacts and can invoke published local workflows. Courses provide an owner preview and enrollment administration; there is no separate learner authentication or enforced paid entitlement portal.

## Provider and parity limits

Manual payment receipts reconcile balances without charging customers. No live email, SMS, WhatsApp, voice, social publishing, payment collection, e-signature, external-calendar sync, review synchronization, DNS management, WordPress hosting or generative AI is connected. Marketplace cards state the adapter requirements. AI sandbox is a labeled keyword-based knowledge lookup, not an LLM. Marketing schedules are planning metadata, not dispatch jobs. SaaS plans are configuration, not automated billing/provisioning. Surveys/quizzes, affiliates, certificates, review widgets and chat widgets currently provide record/configuration editors rather than complete external runtime services. QR destination records do not yet generate QR images. Companies are currently grouped contact metadata, not independent company objects.

Custom reports use a small set of live aggregate metrics rather than the full vendor widget catalog or attribution models. Forecast is an explicitly labeled illustrative stage-weighted calculation. There are no team invitations or multi-role permissions: each signed-in owner has isolated records. Listing reads are bounded to 2,000 records per workspace; large-scale pagination and production load testing remain necessary before broad commercial use. No end-to-end third-party delivery is claimed.

## Security / storage

No provider secrets are accepted through the app. Configure future secrets server-side through Sites, never in source or the browser. Files download with attachment disposition and nosniff. React escapes authored content; arbitrary HTML/scripts are not executed by the page builder. Cross-origin mutations are rejected. Snapshot import permits only configuration kinds, remaps internal references and resets published content/workflows to Draft. Customer records and integration credentials are excluded.

## Research

The source evidence and unresolved behavior are in `../research/`. `implementation-coverage.md` maps the implemented capabilities and remaining gaps. Demo data is loaded only by an explicit button in an empty workspace and uses fictional `example.com` contacts. Live account research records were not imported.

## Project audit

See [AUDIT.md](AUDIT.md) for product intent, capability coverage, and integration options. This checkout uses a portable hosting manifest. Link it to a Sites project during deployment.
