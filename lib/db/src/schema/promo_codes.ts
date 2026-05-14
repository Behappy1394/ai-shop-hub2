import { pgTable, serial, text, boolean, timestamp, numeric, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const promoCodesTable = pgTable("promo_codes", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  discount: numeric("discount", { precision: 10, scale: 2 }).notNull(),
  type: text("type").notNull().default("percent"),
  usageLimit: integer("usage_limit").notNull().default(100),
  usageCount: integer("usage_count").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertPromoCodeSchema = createInsertSchema(promoCodesTable).omit({ id: true, createdAt: true, usageCount: true });
export type InsertPromoCode = z.infer<typeof insertPromoCodeSchema>;
export type PromoCode = typeof promoCodesTable.$inferSelect;
