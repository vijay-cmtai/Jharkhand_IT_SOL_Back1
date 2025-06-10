const express = require("express");
const router = express.Router();
const serviceController = require("../controllers/service");
const { uploadServiceImages } = require("../middleware/multerUpload"); // For create/update
// const { protect, admin } = require('../middleware/authMiddleware'); // Example auth middleware
router.post(
  "/create",
  uploadServiceImages,
  serviceController.createServiceCategory
);

router.get("/find", serviceController.getAllServiceCategories);

// @route   GET /api/services/:slugOrId - Get a single service category by slug or ID
router.get("/:slugOrId", serviceController.getServiceCategoryBySlugOrId);
router.delete("/:id", serviceController.deleteServiceCategory);

module.exports = router;
