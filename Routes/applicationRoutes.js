// routes/applicationRoutes.js
const express = require("express");
const router = express.Router();
const {
  submitApplication,
  getAllApplications,
  getApplicationById,
  updateApplicationStatus,
  deleteApplication,
} = require("../controllers/application"); // Corrected path if controller name was applicationController.js
const { uploadResume } = require("../middleware/multerUpload");

// The field name "resume" here MUST match the field name used in FormData on the frontend
router.post("/upload", uploadResume.single("resume"), submitApplication);

router.get("/applications", getAllApplications);
router.get("/applications/:id", getApplicationById);
router.put("/applications/:id/status", updateApplicationStatus);
router.delete("/applications/:id", deleteApplication);

module.exports = router;
