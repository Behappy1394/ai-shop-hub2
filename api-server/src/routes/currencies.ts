import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, currenciesTable } from "@workspace/db";
import { requireAdmin } from "../middlewares/auth.js";
import { CreateCurrencyBody, UpdateCurrencyBody, UpdateCurrencyParams } from "@workspace/api-zod";

const router: IRouter = Router();

function formatCurrency(c: typeof currenciesTable.$inferSelect) {
  return {
    id: c.id,
    code: c.code,
    name: c.name,
    symbol: c.symbol,
    rate: Number(c.rate),
    isDefault: c.isDefault,
    isActive: c.isActive,
  };
}

router.get("/currencies", async (_req, res): Promise<void> => {
  const currencies = await db.select().from(currenciesTable).where(eq(currenciesTable.isActive, true));
  res.json(currencies.map(formatCurrency));
});

router.get("/admin/currencies", requireAdmin, async (_req, res): Promise<void> => {
  const currencies = await db.select().from(currenciesTable);
  res.json(currencies.map(formatCurrency));
});

router.post("/admin/currencies", requireAdmin, async (req, res): Promise<void> => {
  const parsed = CreateCurrencyBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [currency] = await db.insert(currenciesTable).values({
    ...parsed.data,
    rate: String(parsed.data.rate),
  }).returning();

  res.status(201).json(formatCurrency(currency));
});

router.patch("/admin/currencies/:id", requireAdmin, async (req, res): Promise<void> => {
  const params = UpdateCurrencyParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateCurrencyBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updateData: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(parsed.data)) {
    if (v !== null && v !== undefined) {
      updateData[k] = k === "rate" ? String(v) : v;
    }
  }

  const [currency] = await db.update(currenciesTable).set(updateData).where(eq(currenciesTable.id, params.data.id)).returning();
  if (!currency) {
    res.status(404).json({ error: "Currency not found" });
    return;
  }

  res.json(formatCurrency(currency));
});

export default router;
