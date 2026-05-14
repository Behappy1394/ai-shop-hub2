import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, promoCodesTable, productsTable } from "@workspace/db";
import { ValidatePromoBody } from "@workspace/api-zod";

const router: IRouter = Router();

router.post("/promo/validate", async (req, res): Promise<void> => {
  const parsed = ValidatePromoBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { code } = parsed.data;

  const [promo] = await db.select().from(promoCodesTable).where(
    and(eq(promoCodesTable.code, code), eq(promoCodesTable.isActive, true))
  );

  if (!promo) {
    res.json({ valid: false, discount: 0, type: null, message: "Промокод не найден или неактивен" });
    return;
  }

  if (promo.usageCount >= promo.usageLimit) {
    res.json({ valid: false, discount: 0, type: null, message: "Лимит использования промокода исчерпан" });
    return;
  }

  if (promo.expiresAt && promo.expiresAt < new Date()) {
    res.json({ valid: false, discount: 0, type: null, message: "Срок действия промокода истёк" });
    return;
  }

  res.json({
    valid: true,
    discount: Number(promo.discount),
    type: promo.type,
    message: `Скидка ${promo.type === "percent" ? Number(promo.discount) + "%" : Number(promo.discount) + " руб."} применена`,
  });
});

export default router;
