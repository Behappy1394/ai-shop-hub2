import { Router, type IRouter } from "express";
import { eq, count, sum, desc } from "drizzle-orm";
import { db, usersTable, ordersTable, productsTable } from "@workspace/db";
import { requireAuth } from "../middlewares/auth.js";
import { UpdateProfileBody } from "@workspace/api-zod";
import bcrypt from "bcryptjs";

const router: IRouter = Router();

router.get("/user/dashboard", requireAuth, async (req, res): Promise<void> => {
  const userId = req.user!.userId;

  const [totalRow] = await db.select({ count: count() }).from(ordersTable).where(eq(ordersTable.userId, userId));
  const [activeRow] = await db.select({ count: count() }).from(ordersTable).where(eq(ordersTable.userId, userId));
  const [revenueRow] = await db.select({ total: sum(ordersTable.amount) }).from(ordersTable).where(eq(ordersTable.userId, userId));

  const recentOrders = await db
    .select()
    .from(ordersTable)
    .leftJoin(productsTable, eq(productsTable.id, ordersTable.productId))
    .where(eq(ordersTable.userId, userId))
    .orderBy(desc(ordersTable.createdAt))
    .limit(5);

  res.json({
    totalOrders: Number(totalRow?.count ?? 0),
    activeOrders: Number(activeRow?.count ?? 0),
    totalSpent: Number(revenueRow?.total ?? 0),
    recentOrders: recentOrders.map(r => ({
      id: r.orders.id,
      userId: r.orders.userId,
      productId: r.orders.productId,
      status: r.orders.status,
      amount: Number(r.orders.amount),
      currency: r.orders.currency,
      promoCode: r.orders.promoCode ?? null,
      discountAmount: r.orders.discountAmount != null ? Number(r.orders.discountAmount) : null,
      paymentUrl: r.orders.paymentUrl ?? null,
      product: r.products ? {
        id: r.products.id,
        name: r.products.name,
        description: r.products.description,
        price: Number(r.products.price),
        originalPrice: r.products.originalPrice != null ? Number(r.products.originalPrice) : null,
        currency: r.products.currency,
        duration: r.products.duration,
        category: r.products.category,
        imageUrl: r.products.imageUrl ?? null,
        badge: r.products.badge ?? null,
        rating: null,
        reviewCount: null,
        stock: r.products.stock,
        isActive: r.products.isActive,
        isFeatured: r.products.isFeatured,
        createdAt: r.products.createdAt.toISOString(),
      } : null,
      createdAt: r.orders.createdAt.toISOString(),
      activatedAt: r.orders.activatedAt ? r.orders.activatedAt.toISOString() : null,
    })),
  });
});

router.patch("/user/profile", requireAuth, async (req, res): Promise<void> => {
  const parsed = UpdateProfileBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updateData: Record<string, unknown> = {};
  if (parsed.data.name) updateData.name = parsed.data.name;
  if (parsed.data.email) updateData.email = parsed.data.email;
  if (parsed.data.password) {
    updateData.password = await bcrypt.hash(parsed.data.password, 12);
  }

  const [user] = await db.update(usersTable).set(updateData).where(eq(usersTable.id, req.user!.userId)).returning();
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    isBlocked: user.isBlocked,
    createdAt: user.createdAt.toISOString(),
  });
});

export default router;
