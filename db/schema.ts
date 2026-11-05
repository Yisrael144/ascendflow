// Intentionally empty by default.
// Add Drizzle tables here when the site actually needs a database.
// See examples/d1/db/schema.ts for an opt-in example.
import { sqliteTable, text, integer, index, uniqueIndex } from "drizzle-orm/sqlite-core";
export const records = sqliteTable("records", {
  id: text("id").primaryKey(), owner: text("owner").notNull(), workspace: text("workspace").notNull(),
  kind: text("kind").notNull(), data: text("data").notNull(), revision: integer("revision").notNull().default(1),
  emailKey:text("email_key"), enrollmentKey:text("enrollment_key"),
  created: text("created").notNull(), updated: text("updated").notNull(),
}, t => [index("records_scope").on(t.owner,t.workspace,t.kind),
 uniqueIndex("contacts_email_unique").on(t.owner,t.workspace,t.emailKey),
 uniqueIndex("runs_enrollment_unique").on(t.owner,t.workspace,t.enrollmentKey),
]);
export const audits = sqliteTable("audits", {
  id: text("id").primaryKey(), owner: text("owner").notNull(), workspace: text("workspace").notNull(),
  action: text("action").notNull(), detail: text("detail").notNull(), at: text("at").notNull(),
}, t=>[index("audits_scope").on(t.owner,t.workspace,t.at)]);
