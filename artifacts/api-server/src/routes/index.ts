import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import dashboardRouter from "./dashboard";
import projectsRouter from "./projects";
import tasksRouter from "./tasks";
import teamsRouter from "./teams";
import profileRouter from "./profile";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(dashboardRouter);
router.use(projectsRouter);
router.use(tasksRouter);
router.use(teamsRouter);
router.use(profileRouter);

export default router;
