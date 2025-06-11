const express = require("express");
const router = express.Router();
const serviceController = require("../controllers/service");
const { uploadServiceImages } = require("../middleware/multerUpload");

// --- Specific string routes must be defined before generic routes with parameters ---

// @route   POST /services/create (For creating a new service)
router.post(
  "/create",
  uploadServiceImages,
  serviceController.createServiceCategory
);

// @route   GET /services/find (For Admin Panel to get ALL services, active and inactive)
router.get("/find", serviceController.findAllServiceCategories); 

// @route   GET /services/public (For public site to get only ACTIVE services)
router.get("/public", serviceController.getAllPublicServiceCategories);


// --- Generic routes with parameters (:id, :slugOrId) should be defined last ---

// @route   PUT /services/:id (Update a service)
router.put(
  "/:id",
  uploadServiceImages,
  serviceController.updateServiceCategory 
);

// @route   DELETE /services/:id (Delete a service)
router.delete("/:id", serviceController.deleteServiceCategory);

// @route   GET /services/:slugOrId (Get a single service by its slug or ID)
// This should be last among GET routes to avoid conflicts with '/find' and '/public'
router.get("/:slugOrId", serviceController.getServiceCategoryBySlugOrId);


module.exports = router;
