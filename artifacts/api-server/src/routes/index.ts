import { Router, type IRouter } from "express";
import healthRouter from "./health";
import dataRouter from "./data";
import termsRouter from "./terms";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/data", dataRouter);
router.use("/terms", termsRouter);

export default router;
