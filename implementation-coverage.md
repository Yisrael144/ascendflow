# Reconstruction coverage

| Area | Implemented locally | Needs further implementation / connection |
|---|---|---|
| CRM | Contact CRUD, deduplication by email, notes/tasks, tags, custom values, saved search, CSV import/export | Rich saved-query logic, bulk mutation jobs, independent company/custom-object models |
| Inbox | Contact-linked internal comments, searchable transcript | External delivery, real inbound inbox, read/unread/assignment synchronization |
| Opportunities | Pipeline CRUD, stages, board drag/drop, status/value, list, illustrative forecast | Full forecast semantics, team saved-view permissions |
| Calendars | Availability, capacity-safe appointment reservation, cancel/status, month/list views | OAuth sync, resources, holidays, round-robin staff distribution, public booking |
| Payments | Product catalog, draft invoices with line items/discount/tax, manual payment ledger and partial balances, customer validation, print preview, estimate/document drafts | Checkout, subscriptions, refunds, reconciliation, signature execution |
| Automation | Graph sequence editor, local actions, trigger enrollment, conditional stop, persisted waits/cursors/logs | Unattended scheduler, full branching/action library, external adapters |
| Sites / Vibe | Block editor, responsive preview, saved draft vs release, form schema/submission/contact capture, saved survey responses, graded quiz attempts | Multi-page routing, domains, split tests, full commerce/blog/webinar runtimes, AI generation |
| Marketing | Email/social/SMS drafts, snippets, brands, timers, links, affiliate metadata | Actual dispatch, analytics, per-channel validation and OAuth |
| Memberships | Courses/lessons, outline, owner learning preview, offers/enrollment progress metadata, community post records | Learner login/entitlements, assessment runtime, certificate issuing, gated communities |
| Media | R2 upload, folders, download, deletion protection, file metadata | Inline thumbnails, move/trash/restore, external drive import |
| Reputation | Manual reviews, draft replies, aggregate rating, request-template/widget configuration, competitor notes | Review sync/request delivery, embed renderer, listings/video runtime |
| Reporting | Live aggregates, custom metric reports, print/PDF, CSV, activity audit | Full widget library, attribution, scheduling and email delivery |
| AI | Agent configuration, knowledge entries, labeled keyword sandbox, test logs | Generative/voice models and usage billing |
| Agency | Sub-account data isolation/switching, prospect records, configuration snapshots/remapped draft import, SaaS plan metadata | Automated paid provisioning, rebilling/reselling, full account permissions/white-label tooling |
| Settings | Named workspace values, custom fields on contacts, owner profile, integrations requirements, audit/export | Team roles/invitations, external connection flows, provider secrets management UI |

Research gaps have not been filled with claims of verified parity. This app covers the mapped core journeys with independent implementation choices; provider-dependent features remain explicitly disconnected.
