import { Router } from "express";
import { createStreamChannel, createVideoInvite, getOrder, listorders } from "../controllers/orderController";


const router = Router();

router.get("/", listorders);
router.get("/:id", getOrder);
router.post("/:id/stream-channel", createStreamChannel);
router.post("/:id/video-invite", createVideoInvite);

export default router;