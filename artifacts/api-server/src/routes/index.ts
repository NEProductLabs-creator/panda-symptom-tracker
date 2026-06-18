import { Router, type IRouter } from "express";
import healthRouter from "./health";
import dataRouter from "./data";
import termsRouter from "./terms";
import sharesRouter from "./shares";
import notificationsRouter from "./notifications";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/data", dataRouter);
router.use("/terms", termsRouter);
router.use("/shares", sharesRouter);
router.use("/notifications", notificationsRouter);

export default router;
