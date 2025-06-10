// Routes/portfolioRoutes.js

const express = require("express");
const router = express.Router();
const upload = require("../middleware/upload");

// Import all controller functions
const {
  createPortfolio,
  getAllPortfolios,
  updatePortfolio,
  deletePortfolio,
} = require("../controllers/portfolio");

// @route   POST /portfolio/create
// Creates a new portfolio item
router.post("/create", upload.single("image"), createPortfolio);

// @route   GET /portfolio/all
// Gets all portfolio items
router.get("/all", getAllPortfolios);
router.put("/:id", upload.single("image"), updatePortfolio);

// @route   DELETE /portfolio/:id
// Deletes a specific portfolio item
router.delete("/:id", deletePortfolio);


module.exports = router;
