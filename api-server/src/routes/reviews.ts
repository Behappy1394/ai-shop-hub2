import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, reviewsTable, usersTable } from "@workspace/db";
import { requireAuth } from "../middlewares/auth.js";
import { CreateReviewBody, CreateReviewParams } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/products/:id/reviews", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const productId = parseInt(raw, 10);

  const reviews = await db
    .select({
      id: reviewsTable.id,
      userId: reviewsTable.userId,
      productId: reviewsTable.productId,
      rating: reviewsTable.rating,
      comment: reviewsTable.comment,
      createdAt: reviewsTable.createdAt,
      userName: usersTable.name,
    })
    .from(reviewsTable)
    .leftJoin(usersTable, eq(usersTable.id, reviewsTable.userId))
    .where(eq(reviewsTable.productId, productId))
    .orderBy(desc(reviewsTable.createdAt));

  res.json(reviews.map(r => ({
    id: r.id,
    userId: r.userId,
    productId: r.productId,
    rating: r.rating,
    comment: r.comment ?? null,
    userName: r.userName ?? null,
    createdAt: r.createdAt.toISOString(),
  })));
});

router.post("/products/:id/reviews", requireAuth, async (req, res): Promise<void> => {
  const params = CreateReviewParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = CreateReviewBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [review] = await db.insert(reviewsTable).values({
    userId: req.user!.userId,
    productId: params.data.id,
    rating: parsed.data.rating,
    comment: parsed.data.comment ?? null,
  }).returning();

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.userId));

  res.status(201).json({
    id: review.id,
    userId: review.userId,
    productId: review.productId,
    rating: review.rating,
    comment: review.comment ?? null,
    userName: user?.name ?? null,
    createdAt: review.createdAt.toISOString(),
  });
});

export default router;
