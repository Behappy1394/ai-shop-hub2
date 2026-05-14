import { pgTable, serial, text, boolean, timestamp, numeric, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const ordersTable = pgTable("orders", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  productId: integer("product_id").notNull(),
  status: text("status").notNull().default("pending"),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("RUB"),
  promoCode: text("promo_code"),
  discountAmount: numeric("discount_amount", { precision: 10, scale: 2 }),
  paymentUrl: text("payment_url"),
  freekassaOrderId: text("freekassa_order_id"),
  activatedAt: timestamp("activated_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertOrderSchema = createInsertSchema(ordersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof ordersTable.$inferSelect;
