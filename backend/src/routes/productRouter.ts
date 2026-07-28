import { Router } from "express";
import { getCategories, getProductsBySlug, listProducts } from "../controllers/productController";


const router = Router();

router.get("/", listProducts);
router.get("/categories", getCategories);
router.get("/:slug", getProductsBySlug);




export default router;