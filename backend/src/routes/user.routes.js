import { Router } from "express";
import { listUsers, createUser, updateUser } from "../controllers/user.controller.js";
import { authenticate, authorize } from "../middleware/auth.js";

const router = Router();

router.get("/", authenticate, authorize("ADMIN"), listUsers);
router.post("/", authenticate, authorize("ADMIN"), createUser);
router.put("/:id", authenticate, updateUser);

export default router;