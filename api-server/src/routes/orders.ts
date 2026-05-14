import { Router, type IRouter } from "express";
import { eq, and, desc, sql } from "drizzle-orm";
import { db, ordersTable, productsTable, currenciesTable, promoCodesTable } from "@workspace/db";
import { requireAuth } from "../middlewares/auth.js";
import { CreateOrderBody } from "@workspace/api-zod";
import crypto from "crypto";

const router: IRouter = Router();

const FREEKASSA_MERCHANT_ID = process.env.FREEKASSA_MERCHANT_ID ?? "70561";
const FREEKASSA_SECRET1 = process.env.FREEKASSA_SECRET1 ?? "eeBUr$za87G05E}";

function formatOrder(o: typeof ordersTable.$inferSelect, product?: typeof productsTable.$inferSelect | null) {
  return {
    id: o.id,
    userId: o.userId,
    productId: o.productId,
    status: o.status,
    amount: Number(o.amount),
    currency: o.currency,
    promoCode: o.promoCode ?? null,
    discountAmount: o.discountAmount != null ? Number(o.discountAmount) : null,
    paymentUrl: o.paymentUrl ?? null,
    product: product ? {
      id: product.id,
      name: product.name,
      description: product.description,
      price: Number(product.price),
      originalPrice: product.originalPrice != null ? Number(product.originalPrice) : null,
      currency: product.currency,
      duration: product.duration,
      category: product.category,
      imageUrl: product.imageUrl ?? null,
      badge: product.badge ?? null,
      rating: null,
      reviewCount: null,
      stock: product.stock,
      isActive: product.isActive,
      isFeatured: product.isFeatured,
      createdAt: product.createdAt.toISOString(),
    } : null,
    createdAt: o.createdAt.toISOString(),
    activatedAt: o.activatedAt ? o.activatedAt.toISOString() : null,
  };
}

router.get("/orders", requireAuth, async (req, res): Promise<void> => {
  const orders = await db
    .select()
    .from(ordersTable)
    .leftJoin(productsTable, eq(productsTable.id, ordersTable.productId))
    .where(eq(ordersTable.userId, req.user!.userId))
    .orderBy(desc(ordersTable.createdAt));

  res.json(orders.map(r => formatOrder(r.orders, r.products)));
});

router.post("/orders", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateOrderBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { productId, currency, promoCode } = parsed.data;

  const [product] = await db.select().from(productsTable).where(eq(productsTable.id, productId));
  if (!product || !product.isActive) {
    res.status(404).json({ error: "Product not found" });
    return;
  }

  if (product.stock <= 0) {
    res.status(409).json({ error: "Product out of stock" });
    return;
  }

  // Get currency rate
  const [cur] = await db.select().from(currenciesTable).where(eq(currenciesTable.code, currency));
  const rate = cur ? Number(cur.rate) : 1;

  let amount = Number(product.price) * rate;
  let discountAmount: number | null = null;

  // Apply promo code
  if (promoCode) {
    const [promo] = await db.select().from(promoCodesTable).where(
      and(eq(promoCodesTable.code, promoCode), eq(promoCodesTable.isActive, true))
    );
    if (promo && promo.usageCount < promo.usageLimit) {
      if (!promo.expiresAt || promo.expiresAt > new Date()) {
        const discount = Number(promo.discount);
        if (promo.type === "percent") {
          discountAmount = amount * (discount / 100);
        } else {
          discountAmount = discount;
        }
        amount = Math.max(0, amount - discountAmount);
        await db.update(promoCodesTable).set({ usageCount: sql`${promoCodesTable.usageCount} + 1` }).where(eq(promoCodesTable.id, promo.id));
      }
    }
  }

  const [order] = await db.insert(ordersTable).values({
    userId: req.user!.userId,
    productId,
    status: "pending",
    amount: String(amount.toFixed(2)),
    currency,
    promoCode: promoCode ?? null,
    discountAmount: discountAmount != null ? String(discountAmount.toFixed(2)) : null,
  }).returning();

  // Build FreeKassa payment URL
  const sign = crypto.createHash("md5")
    .update(`${FREEKASSA_MERCHANT_ID}:${amount.toFixed(2)}:${FREEKASSA_SECRET1}:${currency === "USD" ? 33 : currency === "UZS" ? 43 : 63}:${order.id}`)
    .digest("hex");

  const curId = currency === "USD" ? 33 : currency === "UZS" ? 43 : 63;
  const paymentUrl = `https://pay.freekassa.net/?m=${FREEKASSA_MERCHANT_ID}&oa=${amount.toFixed(2)}&o=${order.id}&s=${sign}&i=${curId}&lang=ru`;

  await db.update(ordersTable).set({ paymentUrl }).where(eq(ordersTable.id, order.id));

  res.status(201).json({
    order: formatOrder({ ...order, paymentUrl }, product),
    paymentUrl,
  });
});

router.get("/orders/:id", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);

  const [row] = await db
    .select()
    .from(ordersTable)
    .leftJoin(productsTable, eq(productsTable.id, ordersTable.productId))
    .where(and(eq(ordersTable.id, id), eq(ordersTable.userId, req.user!.userId)));

  if (!row) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  res.json(formatOrder(row.orders, row.products));
});

export { formatOrder };
export default router;
