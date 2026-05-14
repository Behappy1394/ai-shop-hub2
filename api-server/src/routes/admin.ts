import { Router, type IRouter } from "express";
import { eq, desc, count, sum, sql } from "drizzle-orm";
import { db, usersTable, ordersTable, productsTable, promoCodesTable } from "@workspace/db";
import { requireAdmin } from "../middlewares/auth.js";
import {
  UpdateAdminUserBody,
  UpdateAdminUserParams,
  DeleteAdminUserParams,
  UpdateAdminOrderBody,
  UpdateAdminOrderParams,
  CreatePromoBody,
  DeletePromoParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

// Admin stats
router.get("/admin/stats", requireAdmin, async (_req, res): Promise<void> => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [totalUsers] = await db.select({ count: count() }).from(usersTable);
  const [totalOrders] = await db.select({ count: count() }).from(ordersTable);
  const [totalRevenue] = await db.select({ total: sum(ordersTable.amount) }).from(ordersTable);
  const [activeOrders] = await db.select({ count: count() }).from(ordersTable).where(eq(ordersTable.status, "active"));
  const [pendingOrders] = await db.select({ count: count() }).from(ordersTable).where(eq(ordersTable.status, "pending"));
  const [todayOrders] = await db.select({ count: count() }).from(ordersTable).where(sql`${ordersTable.createdAt} >= ${today}`);
  const [todayRevenue] = await db.select({ total: sum(ordersTable.amount) }).from(ordersTable).where(sql`${ordersTable.createdAt} >= ${today}`);

  res.json({
    totalUsers: Number(totalUsers?.count ?? 0),
    totalOrders: Number(totalOrders?.count ?? 0),
    totalRevenue: Number(totalRevenue?.total ?? 0),
    activeOrders: Number(activeOrders?.count ?? 0),
    pendingOrders: Number(pendingOrders?.count ?? 0),
    todayOrders: Number(todayOrders?.count ?? 0),
    todayRevenue: Number(todayRevenue?.total ?? 0),
  });
});

// Users management
router.get("/admin/users", requireAdmin, async (req, res): Promise<void> => {
  const page = parseInt(req.query.page as string ?? "1", 10);
  const limit = parseInt(req.query.limit as string ?? "20", 10);
  const offset = (page - 1) * limit;

  const [{ total }] = await db.select({ total: count() }).from(usersTable);
  const users = await db.select().from(usersTable).orderBy(desc(usersTable.createdAt)).limit(limit).offset(offset);

  res.json({
    data: users.map(u => ({
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      isBlocked: u.isBlocked,
      createdAt: u.createdAt.toISOString(),
    })),
    total: Number(total),
    page,
    limit,
  });
});

router.patch("/admin/users/:id", requireAdmin, async (req, res): Promise<void> => {
  const params = UpdateAdminUserParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateAdminUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updateData: Record<string, unknown> = {};
  if (parsed.data.role != null) updateData.role = parsed.data.role;
  if (parsed.data.isBlocked != null) updateData.isBlocked = parsed.data.isBlocked;

  const [user] = await db.update(usersTable).set(updateData).where(eq(usersTable.id, params.data.id)).returning();
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json({ id: user.id, email: user.email, name: user.name, role: user.role, isBlocked: user.isBlocked, createdAt: user.createdAt.toISOString() });
});

router.delete("/admin/users/:id", requireAdmin, async (req, res): Promise<void> => {
  const params = DeleteAdminUserParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  await db.delete(usersTable).where(eq(usersTable.id, params.data.id));
  res.json({ success: true, message: "User deleted" });
});

// Orders management
router.get("/admin/orders", requireAdmin, async (req, res): Promise<void> => {
  const page = parseInt(req.query.page as string ?? "1", 10);
  const status = req.query.status as string | undefined;
  const limit = 20;
  const offset = (page - 1) * limit;

  const whereClause = status ? eq(ordersTable.status, status) : undefined;
  const [{ total }] = await db.select({ total: count() }).from(ordersTable).where(whereClause);
  const rows = await db
    .select()
    .from(ordersTable)
    .leftJoin(productsTable, eq(productsTable.id, ordersTable.productId))
    .where(whereClause)
    .orderBy(desc(ordersTable.createdAt))
    .limit(limit)
    .offset(offset);

  res.json({
    data: rows.map(r => ({
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
    total: Number(total),
    page,
    limit,
  });
});

router.patch("/admin/orders/:id", requireAdmin, async (req, res): Promise<void> => {
  const params = UpdateAdminOrderParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateAdminOrderBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updateData: Record<string, unknown> = {};
  if (parsed.data.status != null) {
    updateData.status = parsed.data.status;
    if (parsed.data.status === "active") updateData.activatedAt = new Date();
  }

  const [order] = await db.update(ordersTable).set(updateData).where(eq(ordersTable.id, params.data.id)).returning();
  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  res.json({
    id: order.id, userId: order.userId, productId: order.productId,
    status: order.status, amount: Number(order.amount), currency: order.currency,
    promoCode: order.promoCode ?? null, discountAmount: order.discountAmount != null ? Number(order.discountAmount) : null,
    paymentUrl: order.paymentUrl ?? null, product: null,
    createdAt: order.createdAt.toISOString(), activatedAt: order.activatedAt ? order.activatedAt.toISOString() : null,
  });
});

// Promo codes management
router.get("/admin/promo", requireAdmin, async (_req, res): Promise<void> => {
  const promos = await db.select().from(promoCodesTable).orderBy(desc(promoCodesTable.createdAt));
  res.json(promos.map(p => ({
    id: p.id,
    code: p.code,
    discount: Number(p.discount),
    type: p.type,
    usageLimit: p.usageLimit,
    usageCount: p.usageCount,
    isActive: p.isActive,
    expiresAt: p.expiresAt ? p.expiresAt.toISOString() : null,
    createdAt: p.createdAt.toISOString(),
  })));
});

router.post("/admin/promo", requireAdmin, async (req, res): Promise<void> => {
  const parsed = CreatePromoBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [promo] = await db.insert(promoCodesTable).values({
    ...parsed.data,
    discount: String(parsed.data.discount),
    expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null,
  }).returning();

  res.status(201).json({
    id: promo.id, code: promo.code, discount: Number(promo.discount), type: promo.type,
    usageLimit: promo.usageLimit, usageCount: promo.usageCount, isActive: promo.isActive,
    expiresAt: promo.expiresAt ? promo.expiresAt.toISOString() : null, createdAt: promo.createdAt.toISOString(),
  });
});

router.delete("/admin/promo/:id", requireAdmin, async (req, res): Promise<void> => {
  const params = DeletePromoParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  await db.delete(promoCodesTable).where(eq(promoCodesTable.id, params.data.id));
  res.json({ success: true, message: "Promo code deleted" });
});

// Analytics
router.get("/admin/analytics/revenue", requireAdmin, async (req, res): Promise<void> => {
  const days = parseInt(req.query.days as string ?? "30", 10);

  const result = await db.execute(sql`
    SELECT
      DATE(${ordersTable.createdAt}) as date,
      SUM(${ordersTable.amount})::numeric as revenue,
      COUNT(*)::int as orders
    FROM ${ordersTable}
    WHERE ${ordersTable.createdAt} >= NOW() - INTERVAL '${sql.raw(String(days))} days'
    GROUP BY DATE(${ordersTable.createdAt})
    ORDER BY date ASC
  `);

  res.json((result.rows as Array<{ date: string; revenue: string; orders: number }>).map(r => ({
    date: String(r.date),
    revenue: Number(r.revenue),
    orders: Number(r.orders),
  })));
});

router.get("/admin/analytics/products", requireAdmin, async (_req, res): Promise<void> => {
  const result = await db.execute(sql`
    SELECT
      ${ordersTable.productId} as "productId",
      ${productsTable.name} as name,
      COUNT(*)::int as count,
      SUM(${ordersTable.amount})::numeric as revenue
    FROM ${ordersTable}
    JOIN ${productsTable} ON ${productsTable.id} = ${ordersTable.productId}
    GROUP BY ${ordersTable.productId}, ${productsTable.name}
    ORDER BY count DESC
  `);

  res.json((result.rows as Array<{ productId: number; name: string; count: number; revenue: string }>).map(r => ({
    productId: Number(r.productId),
    name: String(r.name),
    count: Number(r.count),
    revenue: Number(r.revenue),
  })));
});

export default router;
