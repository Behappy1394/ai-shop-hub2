import { pgTable, serial, text, boolean, timestamp, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const currenciesTable = pgTable("currencies", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  symbol: text("symbol").notNull(),
  rate: numeric("rate", { precision: 10, scale: 4 }).notNull().default("1"),
  isDefault: boolean("is_default").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertCurrencySchema = createInsertSchema(currenciesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCurrency = z.infer<typeof insertCurrencySchema>;
export type Currency = typeof currenciesTable.$inferSelect;
