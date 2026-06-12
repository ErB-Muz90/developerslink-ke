import { Router, type IRouter } from "express";
import healthRouter from "./health";
import usersRouter from "./users";
import roomsRouter from "./rooms";
import postsRouter from "./posts";
import matchingRouter from "./matching";
import aiRouter from "./ai";
import notificationsRouter from "./notifications";

const router: IRouter = Router();

router.use(healthRouter);
router.use(usersRouter);
router.use(roomsRouter);
router.use(postsRouter);
router.use(matchingRouter);
router.use(aiRouter);
router.use(notificationsRouter);

export default router;
