import { Router, type IRouter } from "express";
import healthRouter from "./health";
import usersRouter from "./users";
import roomsRouter from "./rooms";
import postsRouter from "./posts";
import matchingRouter from "./matching";
import aiRouter from "./ai";
import notificationsRouter from "./notifications";
import authRouter from "./auth";
import passwordResetRouter from "./password-reset";
import emailVerificationRouter from "./email-verification";
import collabRequestsRouter from "./collab-requests";

const router: IRouter = Router();

router.use(authRouter);
router.use(passwordResetRouter);
router.use(emailVerificationRouter);
router.use(healthRouter);
router.use(usersRouter);
router.use(roomsRouter);
router.use(postsRouter);
router.use(matchingRouter);
router.use(aiRouter);
router.use(notificationsRouter);
router.use(collabRequestsRouter);

export default router;
