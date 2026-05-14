import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, settingsTable } from "@workspace/db";
import { requireAdmin } from "../middlewares/auth.js";
import { UpdateSettingsBody } from "@workspace/api-zod";

const router: IRouter = Router();

function formatSetting(s: typeof settingsTable.$inferSelect) {
  return {
    key: s.key,
    value: s.value,
    label: s.label ?? null,
  };
}

router.get("/settings/public", async (_req, res): Promise<void> => {
  const settings = await db.select().from(settingsTable);
  const map = Object.fromEntries(settings.map(s => [s.key, s.value]));

  res.json({
    siteName: map.siteName ?? null,
    siteDescription: map.siteDescription ?? null,
    telegramSupport: map.telegramSupport ?? null,
    bannerText: map.bannerText ?? null,
    bannerEnabled: map.bannerEnabled === "true",
  });
});

router.get("/admin/settings", requireAdmin, async (_req, res): Promise<void> => {
  const settings = await db.select().from(settingsTable);
  res.json(settings.map(formatSetting));
});

router.patch("/admin/settings", requireAdmin, async (req, res): Promise<void> => {
  const parsed = UpdateSettingsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  for (const { key, value } of parsed.data.settings ?? []) {
    const [existing] = await db.select().from(settingsTable).where(eq(settingsTable.key, key));
    if (existing) {
      await db.update(settingsTable).set({ value }).where(eq(settingsTable.key, key));
    } else {
      await db.insert(settingsTable).values({ key, value });
    }
  }

  const settings = await db.select().from(settingsTable);
  res.json(settings.map(formatSetting));
});

export default router;
