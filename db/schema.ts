import {sqliteTable, text, integer, index} from "drizzle-orm/sqlite-core";
export const cloudCharges = sqliteTable("cloud_charges", {
  id: text("id").primaryKey(),
  month: text("month").notNull(),
  userId: text("user_id").notNull(),
  chargedMicro: integer("charged_micro").notNull(),
  status: text("status").notNull(),
  createdMs: integer("created_ms").notNull(),
  inputTokens: integer("input_tokens").notNull().default(0),
  outputTokens: integer("output_tokens").notNull().default(0),
}, table => [index("cloud_charges_month").on(table.month), index("cloud_charges_status").on(table.status), index("cloud_charges_created").on(table.createdMs)]);
