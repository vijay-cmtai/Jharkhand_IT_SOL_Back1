// controllers/applicationController.js
const Application = require("../model/application");
const fs = require("fs");
const path = require("path");

exports.submitApplication = async (req, res) => {
  console.log("--- [Controller] submitApplication: Start ---");
  console.log(
    "[Controller] submitApplication: req.body:",
    JSON.stringify(req.body, null, 2)
  ); // Log all text fields
  console.log("[Controller] submitApplication: req.file:", req.file); // CRITICAL: Log the file object from Multer

  try {
    const {
      jobId,
      jobTitle,
      fullName,
      email,
      phone,
      coverLetter,
      portfolioLink,
    } = req.body;

    if (!req.file) {
      // This check is now more robust as multer's fileFilter will pass an error if type is wrong
      console.error(
        "[Controller] submitApplication: Error - req.file is undefined. Multer might have rejected the file or it wasn't sent correctly."
      );
      return res
        .status(400)
        .json({ message: "Resume file is required or file type was invalid." });
    }

    // Basic validation for required text fields (though frontend should also handle this)
    if (!jobId || !jobTitle || !fullName || !email) {
      // Clean up uploaded file if other validations fail post-upload
      if (req.file && req.file.path) {
        fs.unlink(req.file.path, (err) => {
          if (err)
            console.error(
              "Error deleting orphaned file after validation fail:",
              err
            );
        });
      }
      return res.status(400).json({
        message: "Job ID, Job Title, Full Name, and Email are required fields.",
      });
    }

    const resumePath = req.file.path; // Path where multer saved the file (now a disk path)
    console.log(
      "[Controller] submitApplication: Resume saved to path:",
      resumePath
    );

    const newApplication = new Application({
      jobId,
      jobTitle,
      fullName,
      email,
      phone,
      resumePath, // Store the path to the resume
      coverLetter,
      portfolioLink,
    });

    const savedApplication = await newApplication.save();
    console.log(
      "[Controller] submitApplication: Application saved successfully."
    );
    res.status(201).json({
      message:
        "Application submitted successfully! We will get back to you soon.",
      application: savedApplication,
    });
  } catch (error) {
    console.error(
      "[Controller] submitApplication: Error submitting application:",
      error
    );
    // If an error occurs after file upload, delete the orphaned file
    if (req.file && req.file.path) {
      fs.unlink(req.file.path, (err) => {
        if (err)
          console.error(
            "Error deleting orphaned file after submission error:",
            err
          );
        else
          console.log(
            "Orphaned file deleted due to submission error:",
            req.file.path
          );
      });
    }
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((val) => val.message);
      return res.status(400).json({ message: messages.join(", ") });
    }
    // Handle Multer errors specifically (e.g., file too large, or error from fileFilter)
    if (error instanceof multer.MulterError) {
      return res
        .status(400)
        .json({ message: `File upload error: ${error.message}` });
    }
    if (error.message && error.message.startsWith("Invalid file type")) {
      // From our custom fileFilter error
      return res.status(400).json({ message: error.message });
    }
    res
      .status(500)
      .json({ message: "Server error while submitting application." });
  }
};

exports.getAllApplications = async (req, res) => {
  try {
    const applications = await Application.find().sort({ appliedAt: -1 });
    res.status(200).json(applications);
  } catch (error) {
    console.error("Error fetching applications:", error);
    res
      .status(500)
      .json({ message: "Server error while fetching applications." });
  }
};

exports.getApplicationById = async (req, res) => {
  try {
    const application = await Application.findById(req.params.id);
    if (!application) {
      return res.status(404).json({ message: "Application not found." });
    }
    res.status(200).json(application);
  } catch (error) {
    console.error("Error fetching application by ID:", error);
    res.status(500).json({ message: "Server error." });
  }
};

exports.updateApplicationStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (
      !status ||
      !["Pending", "Reviewed", "Shortlisted", "Rejected", "Hired"].includes(
        status
      )
    ) {
      return res.status(400).json({ message: "Invalid status provided." });
    }

    const application = await Application.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    );

    if (!application) {
      return res.status(404).json({ message: "Application not found." });
    }
    res
      .status(200)
      .json({ message: "Application status updated.", application });
  } catch (error) {
    console.error("Error updating application status:", error);
    res.status(500).json({ message: "Server error." });
  }
};

exports.deleteApplication = async (req, res) => {
  console.log("--- [Controller] deleteApplication: Start ---");
  console.log(
    "[Controller] deleteApplication: Request Params ID:",
    req.params.id
  );

  try {
    const application = await Application.findById(req.params.id);
    console.log(
      "[Controller] deleteApplication: Application found by findById:",
      application ? "Yes" : "No"
    );

    if (!application) {
      console.log(
        "[Controller] deleteApplication: Application not found in DB."
      );
      return res.status(404).json({ message: "Application not found." });
    }

    if (application.resumePath) {
      console.log(
        "[Controller] deleteApplication: Resume path from DB:",
        application.resumePath
      );
      // Assuming application.resumePath is the absolute path or a path resolvable from project root
      // as stored by req.file.path from multer.diskStorage
      const fullResumePath = application.resumePath; // Directly use the stored path

      console.log(
        "[Controller] deleteApplication: Attempting to delete resume file at:",
        fullResumePath
      );

      if (fs.existsSync(fullResumePath)) {
        fs.unlink(fullResumePath, (err) => {
          if (err) {
            console.error(
              `[Controller] deleteApplication: Failed to delete resume file: ${fullResumePath}`,
              err
            );
          } else {
            console.log(
              `[Controller] deleteApplication: Successfully deleted resume file: ${fullResumePath}`
            );
          }
        });
      } else {
        console.log(
          `[Controller] deleteApplication: Resume file not found at path (already deleted or wrong path?): ${fullResumePath}`
        );
      }
    } else {
      console.log(
        "[Controller] deleteApplication: No resume path found in application document."
      );
    }

    console.log(
      "[Controller] deleteApplication: Attempting to delete application document from DB with ID:",
      application._id
    );
    const deleteResult = await Application.deleteOne({ _id: application._id });
    console.log(
      "[Controller] deleteApplication: MongoDB deleteOne result:",
      deleteResult
    );

    res.status(200).json({ message: "Application deleted successfully." });
    console.log(
      "--- [Controller] deleteApplication: Finished successfully ---"
    );
  } catch (error) {
    console.error("--- [Controller] ERROR in deleteApplication ---");
    console.error("Error Name:", error.name);
    console.error("Error Message:", error.message);
    console.error("Error Stack:", error.stack);

    if (error.name === "CastError") {
      return res
        .status(400)
        .json({ message: "Invalid application ID format." });
    }
    res
      .status(500)
      .json({ message: "Server error while deleting application." });
  }
};
