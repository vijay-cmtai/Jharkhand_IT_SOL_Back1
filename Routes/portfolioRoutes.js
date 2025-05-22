// Routes/portfolioRoutes.js
const express = require("express");
const router = express.Router();
const upload = require("../middleware/upload");
const {
  createPortfolio,
  getAllPortfolios,
} = require("../controllers/portfolio");

router.post("/create", upload.single("image"), createPortfolio);
router.get("/all", getAllPortfolios);

module.exports = router;
