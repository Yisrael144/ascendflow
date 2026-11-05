# AscendFlow project audit

## Product purpose

AscendFlow is intended to be an agency operating system for small businesses. The core journey is lead capture, contact and pipeline management, booking, follow-up automation, invoicing, and retention through membership, marketing, and reputation tools. An agency should eventually be able to administer several businesses with separate data, users, settings, and reusable configuration. The previous GoHighLevel research establishes the intended breadth. This codebase implements an independent subset of that product.

The GitHub repository was empty when the audit began. The baseline is the source of the private Sites release at commit `3350dcbe3f9e85cb1fd9291a60b379954eff3a9b`. The application is a React/Vinext workspace backed by a single authenticated API, D1 records and audit entries, and R2 files. Sites supplies the hosted sign-in identity. Owner-scoped records are distinct from team membership and role-based access.

## Capability assessment

| Area | Present and usable within the current scope | Remaining acceptance criteria |
|---|---|---|
| Contacts | CRUD, case-insensitive email matching, tags, notes, tasks, CSV, saved filters, custom values | Paginate large workspaces, add first-class companies and custom objects, reliable bulk jobs |
| Conversations | Contact-linked internal comments and transcript | Inbound and outbound transport, delivery events, thread assignments and unread counts |
| Opportunities | Stages, board movement, values, statuses, and a weighted forecast | Guard edits to occupied stages, configurable probabilities, shared views and forecast reconciliation |
| Calendars | Private appointment CRUD, availability and overlap checks | Public booking, recurring availability, resources, staff routing and external sync, with DST tests |
| Payments | Catalog, draft invoices, printable preview, immutable manual ledger and partial balances | Hosted checkout, verified payment webhooks, refunds, subscription lifecycle and reconciliation |
| Workflows | Saved steps, event enrollment, local effects, persisted waits, logs and manual processing | Durable background runner, retries and idempotency across external effects, branch editor and provider adapters |
| Websites and forms | Block editor, saved private release, form-to-contact capture, separate draft data | Public routing, domains, multiple pages, public submissions with abuse controls, commerce and publishing operations |
| Surveys and quizzes | Saved questionnaire tests, persisted responses, server-side quiz grading | Public participation, learner identity, richer question types, attempt limits and reporting |
| Marketing | Draft email, SMS and social content, brand metadata, snippets and tracking configuration | Consent and unsubscribe enforcement, delivery scheduling, OAuth, and provider analytics |
| Memberships | Course and lesson editing, owner preview, offers, enrollment metadata and posts | Learner sign-in, entitlement enforcement, progress tracking, certificate issuance and community moderation |
| Media | Private upload/download, folders and file metadata | Thumbnail, move and trash operations, plus a durable cleanup mechanism for partial storage failures |
| Reputation | Manual reviews, draft replies, average ratings and request-template settings | Provider sync and replies, video reviews, listings and public widgets |
| Reporting | Workspace aggregates, metric reports, export and audit history | Full-dataset aggregation and pagination, attribution, scheduled delivery and report access controls |
| AI | Agent configuration, knowledge entries, keyword lookup and test logs | Generative and voice runtimes, model configuration, evaluation, spend limits and privacy controls |
| Agency and Settings | Owner-specific business workspaces, configuration snapshots, business metadata and settings | Membership and invitations, explicit per-role authorization, account provisioning, rebilling, secrets management and restore tooling |

## Corrections in this revision

- Reject updates that target an ID of a different record type, including the appointment path.
- Preserve published website blocks, theme and name during draft edits. Protect forms referenced by saved website releases.
- Calculate an invoice's paid amount against the full payment ledger. Check dependent records beyond the visible list window.
- Match form contacts through the unique database key and recover when concurrent submissions create the same email.
- Run surveys and quizzes from saved definitions and persist question/answer snapshots and grading results.

The list API still returns up to 2,000 recent records. Full pagination, snapshot pagination and complete reporting across that window need work. User-authored website releases are private workspace previews. Public routing would require a separate publication and authorization design. The audit covers source and automated behavior. Live provider integrations and cross-account team workflows require their own acceptance runs.

## Bringing in open-source components

Keep integration contracts in this repository and pin upstream versions. For each integration, add a local fake, a disposable-service integration test, retry and idempotency checks, documentation for secrets, and a review of the exact upstream version's license and notices.

- Automation can use a separate worker backed by Temporal. Start with durable wait, retry, restart, and duplicate-event acceptance tests before routing external actions through it. [Temporal source](https://github.com/temporalio/temporal)
- Notification orchestration can use Novu behind an adapter. Implement opt-out and consent checks in AscendFlow and verify provider delivery events before changing message state. [Novu source](https://github.com/novuhq/novu)
- Evaluate Cal.com as a separately deployed booking integration. Confirm the applicable license for the edition and files selected, then map resources, time zones and booking events without duplicating availability rules. [Cal.com source](https://github.com/calcom/cal.com)

For an open-source release of AscendFlow itself, choose an explicit license after checking rights and dependency notices. Publish a clean release containing source, schema, synthetic fixtures and configuration examples. Keep deployment identity, private research, tenant exports, uploads and provider secrets outside the public release. Add contribution and security-reporting instructions and require CI before merging contributions. [GitHub licensing guide](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/licensing-a-repository)
