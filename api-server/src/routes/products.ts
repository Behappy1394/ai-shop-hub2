import { Router, type IRouter } from "express";
import { eq, ilike, and, sql } from "drizzle-orm";
import { db, productsTable, reviewsTable, usersTable } from "@workspace/db";
import { requireAdmin } from "../middlewares/auth.js";
import { CreateProductBody, UpdateProductBody, UpdateProductParams } from "@workspace/api-zod";

const router: IRouter = Router();

function formatProduct(p: typeof productsTable.$inferSelect & { rating?: string | null; reviewCount?: number }) {
  return {
    id: p.id,
    name: p.name,
    description: p.description,
    price: Number(p.price),
    originalPrice: p.originalPrice != null ? Number(p.originalPrice) : null,
    currency: p.currency,
    duration: p.duration,
    category: p.category,
    imageUrl: p.imageUrl ?? null,
    badge: p.badge ?? null,
    rating: p.rating != null ? Number(p.rating) : null,
    reviewCount: p.reviewCount ?? null,
    stock: p.stock,
    isActive: p.isActive,
    isFeatured: p.isFeatured,
    createdAt: p.createdAt.toISOString(),
  };
}

async function getProductsWithStats(whereClause?: ReturnType<typeof and>) {
  const baseQuery = db
    .select({
      id: productsTable.id,
      name: productsTable.name,
      description: productsTable.description,
      price: productsTable.price,
      originalPrice: productsTable.originalPrice,
      currency: productsTable.currency,
      duration: productsTable.duration,
      category: productsTable.category,
      imageUrl: productsTable.imageUrl,
      badge: productsTable.badge,
      stock: productsTable.stock,
      isActive: productsTable.isActive,
      isFeatured: productsTable.isFeatured,
      createdAt: productsTable.createdAt,
      updatedAt: productsTable.updatedAt,
      rating: sql<string>`AVG(${reviewsTable.rating})`,
      reviewCount: sql<number>`COUNT(${reviewsTable.id})`,
    })
    .from(productsTable)
    .leftJoin(reviewsTable, eq(reviewsTable.productId, productsTable.id))
    .groupBy(productsTable.id);

  if (whereClause) {
    return baseQuery.where(whereClause);
  }
  return baseQuery;
}

router.get("/products", async (req, res): Promise<void> => {
  const search = req.query.search as string | undefined;
  const featured = req.query.featured;

  let where: ReturnType<typeof and> | undefined;

  const conditions = [eq(productsTable.isActive, true)];
  if (search) conditions.push(ilike(productsTable.name, `%${search}%`));
  if (featured === "true") conditions.push(eq(productsTable.isFeatured, true));

  where = and(...conditions);

  const products = await getProductsWithStats(where);
  res.json(products.map(formatProduct));
});

router.get("/products/featured", async (_req, res): Promise<void> => {
  const products = await getProductsWithStats(and(eq(productsTable.isActive, true), eq(productsTable.isFeatured, true)));
  res.json(products.map(formatProduct));
});

router.get("/products/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid product id" });
    return;
  }

  const products = await getProductsWithStats(eq(productsTable.id, id));
  if (!products.length) {
    res.status(404).json({ error: "Product not found" });
    return;
  }

  res.json(formatProduct(products[0]));
});

// Admin product management
router.get("/admin/products", requireAdmin, async (_req, res): Promise<void> => {
  const products = await getProductsWithStats();
  res.json(products.map(formatProduct));
});

router.post("/admin/products", requireAdmin, async (req, res): Promise<void> => {
  const parsed = CreateProductBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [product] = await db.insert(productsTable).values({
    ...parsed.data,
    price: String(parsed.data.price),
    originalPrice: parsed.data.originalPrice != null ? String(parsed.data.originalPrice) : null,
  }).returning();

  res.status(201).json(formatProduct({ ...product, rating: null, reviewCount: 0 }));
});

router.patch("/admin/products/:id", requireAdmin, async (req, res): Promise<void> => {
  const params = UpdateProductParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateProductBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updateData: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(parsed.data)) {
    if (v !== null && v !== undefined) {
      if (k === "price" || k === "originalPrice") {
        updateData[k] = String(v);
      } else {
        updateData[k] = v;
      }
    }
  }

  const [product] = await db.update(productsTable).set(updateData).where(eq(productsTable.id, params.data.id)).returning();
  if (!product) {
    res.status(404).json({ error: "Product not found" });
    return;
  }

  res.json(formatProduct({ ...product, rating: null, reviewCount: 0 }));
});

router.delete("/admin/products/:id", requireAdmin, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);

  await db.delete(productsTable).where(eq(productsTable.id, id));
  res.json({ success: true, message: "Product deleted" });
});

export default router;
