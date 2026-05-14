import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, ordersTable } from "@workspace/db";
import { logger } from "../lib/logger.js";
import crypto from "crypto";

const router: IRouter = Router();

const FREEKASSA_MERCHANT_ID = process.env.FREEKASSA_MERCHANT_ID ?? "70561";
const FREEKASSA_SECRET2 = process.env.FREEKASSA_SECRET2 ?? "xKzWgcb}CIVV^]-";

router.get("/payments/freekassa/success", async (req, res): Promise<void> => {
  const orderId = req.query.MERCHANT_ORDER_ID as string | undefined;

  if (orderId) {
    const id = parseInt(orderId, 10);
    if (!isNaN(id)) {
      const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, id));
      if (order && order.status === "pending") {
        await db.update(ordersTable).set({ status: "active", activatedAt: new Date() }).where(eq(ordersTable.id, id));
      }
    }
  }

  res.json({ success: true, message: "Оплата прошла успешно", orderId: orderId ? parseInt(orderId, 10) : null });
});

router.get("/payments/freekassa/fail", async (_req, res): Promise<void> => {
  res.json({ success: false, message: "Оплата не прошла", orderId: null });
});

router.post("/payments/freekassa/webhook", async (req, res): Promise<void> => {
  const {
    MERCHANT_ID,
    AMOUNT,
    MERCHANT_ORDER_ID,
    SIGN,
  } = req.body as Record<string, string>;

  const expectedSign = crypto
    .createHash("md5")
    .update(`${MERCHANT_ID}:${AMOUNT}:${FREEKASSA_SECRET2}:${MERCHANT_ORDER_ID}`)
    .digest("hex");

  if (SIGN !== expectedSign) {
    logger.warn({ SIGN, expectedSign }, "FreeKassa signature mismatch");
    res.status(400).json({ success: false, message: "Invalid signature" });
    return;
  }

  if (!MERCHANT_ORDER_ID) {
    res.status(400).json({ success: false, message: "Missing order id" });
    return;
  }

  const orderId = parseInt(MERCHANT_ORDER_ID, 10);
  if (isNaN(orderId)) {
    res.status(400).json({ success: false, message: "Invalid order id" });
    return;
  }

  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId));
  if (!order) {
    res.status(404).json({ success: false, message: "Order not found" });
    return;
  }

  if (order.status !== "pending") {
    res.json({ success: true, message: "Order already processed", orderId });
    return;
  }

  await db.update(ordersTable).set({
    status: "active",
    activatedAt: new Date(),
    freekassaOrderId: String(MERCHANT_ORDER_ID),
  }).where(eq(ordersTable.id, orderId));

  logger.info({ orderId }, "Order activated via FreeKassa webhook");
  res.json({ success: true, message: "Order activated", orderId });
});

export default router;
