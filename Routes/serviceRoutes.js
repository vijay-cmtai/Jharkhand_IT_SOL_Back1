// routes/serviceRoutes.js

const express = require("express");
const router = express.Router();
const serviceController = require("../controllers/serviceController");
const { uploadServiceImages } = require("../middleware/multerUpload");

// --- Specific Routes First ---

// @route   POST /services/create - Creates a new service category
router.post(
  "/create",
  uploadServiceImages,
  serviceController.createServiceCategory
);

// @route   GET /services/find - Finds all service categories (for admin panel)
router.get("/find", serviceController.findAllServiceCategories);

// @route   GET /services/public - Gets all active service categories (for public site)
router.get("/public", serviceController.getAllPublicServiceCategories);


// --- Generic (Parameterized) Routes Last ---

// @route   GET /services/:slugOrId - Gets a single service by slug or ID
// This must come AFTER specific routes like /find and /public
router.get("/:slugOrId", serviceController.getServiceCategoryBySlugOrId);

// @route   PUT /services/:id - Updates a service category
router.put(
  "/:id",
  uploadServiceImages,
  serviceController.updateServiceCategory
);

// @route   DELETE /services/:id - Deletes a service category
router.delete("/:id", serviceController.deleteServiceCategory);


module.exports = router;
