import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import productsRouter from "./products";
import reviewsRouter from "./reviews";
import ordersRouter from "./orders";
import promoRouter from "./promo";
import paymentsRouter from "./payments";
import userRouter from "./user";
import currenciesRouter from "./currencies";
import settingsRouter from "./settings";
import adminRouter from "./admin";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(productsRouter);
router.use(reviewsRouter);
router.use(ordersRouter);
router.use(promoRouter);
router.use(paymentsRouter);
router.use(userRouter);
router.use(currenciesRouter);
router.use(settingsRouter);
router.use(adminRouter);

export default router;
