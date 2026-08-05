import { Router } from "express";
import { getLocalUser } from "../lib/users";
import { getAuth } from "@clerk/express";


const router = Router();


router.get("/", async (req, res, next) => {
    try {
        const { userId, isAuthenticated } = getAuth(req);
        if (!isAuthenticated) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const user = await getLocalUser(userId);
        console.log(user);
        

        res.json({ user });
    } catch (error) {
        next(error);
    }
})


export default router;