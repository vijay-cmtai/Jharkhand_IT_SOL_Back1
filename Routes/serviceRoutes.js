// routes/serviceRoutes.js

const express = require("express");
const router = express.Router();

// Correctly require your controller file and middleware
const serviceController = require("../controllers/service"); 
const { uploadServiceImages } = require("../middleware/multerUpload");

// --- Specific string routes must be defined before generic routes ---

// @route   POST /services/create
router.post(
  "/create",
  uploadServiceImages,
  serviceController.createServiceCategory
);

// @route   GET /services/find (For Admin Panel to get ALL services)
router.get("/find", serviceController.findAllServiceCategories);

// @route   GET /services/public (For public site to get ACTIVE services)
router.get("/public", serviceController.getAllPublicServiceCategories);


// --- Generic routes with parameters (:id, :slug) are defined last ---

// @route   GET /services/:slugOrId
router.get("/:slugOrId", serviceController.getServiceCategoryBySlugOrId);

// @route   PUT /services/:id
router.put(
  "/:id",
  uploadServiceImages,
  serviceController.updateServiceCategory
);

// @route   DELETE /services/:id
router.delete("/:id", serviceController.deleteServiceCategory);


module.exports = router;
