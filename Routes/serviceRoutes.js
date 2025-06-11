const express = require("express");
const router = express.Router();
const serviceController = require("../controllers/service");
const { uploadServiceImages } = require("../middleware/multerUpload");

// @route   POST /services/create (For creating a new service)
router.post(
  "/create",
  uploadServiceImages,
  serviceController.createServiceCategory
);

// @route   GET /services/find (For Admin Panel to get ALL services)
// YAHAN BADLAV KIYA GAYA HAI
router.get("/find", serviceController.findAllServiceCategories); 

// @route   GET /services/public (For public site to get ACTIVE services)
router.get("/public", serviceController.getAllPublicServiceCategories);


// --- Generic routes with parameters should be last ---

// @route   GET /services/:slugOrId (Get a single service)
router.get("/:slugOrId", serviceController.getServiceCategoryBySlugOrId);

// @route   PUT /services/:id (Update a service)
// Aapne update route nahi banaya tha, main add kar raha hoon
router.put(
  "/:id",
  uploadServiceImages,
  serviceController.updateServiceCategory // Maan rahe hain ki aapne ye controller banaya hai
);


// @route   DELETE /services/:id (Delete a service)
router.delete("/:id", serviceController.deleteServiceCategory);

module.exports = router;
