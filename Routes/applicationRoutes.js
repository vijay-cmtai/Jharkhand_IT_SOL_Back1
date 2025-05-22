// routes/applicationRoutes.js
const express = require("express");
const router = express.Router();
const {
  submitApplication,
  getAllApplications,
  getApplicationById,
  updateApplicationStatus,
  deleteApplication,
} = require("../controllers/Application");
const { uploadResume } = require("../middleware/multerUpload"); // Make sure path is correct

router.post("/upload", uploadResume.single("resume"), submitApplication);
router.get("/applications", getAllApplications);
router.get("/applications/:id", getApplicationById);
router.put("/applications/:id/status", updateApplicationStatus);
router.delete("/applications/:id", deleteApplication);

module.exports = router;
