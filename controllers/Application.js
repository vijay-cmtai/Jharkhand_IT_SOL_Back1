// controllers/applicationController.js
const Application = require("../model/application");
const fs = require("fs");
const path = require("path");
exports.submitApplication = async (req, res) => {
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
      return res.status(400).json({ message: "Resume file is required." });
    }

    if (!jobId || !jobTitle || !fullName || !email) {
      return res.status(400).json({
        message: "Job ID, Job Title, Full Name, and Email are required fields.",
      });
    }

    const resumePath = req.file.path; // Path where multer saved the file

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
    res.status(201).json({
      message:
        "Application submitted successfully! We will get back to you soon.",
      application: savedApplication,
    });
  } catch (error) {
    console.error("Error submitting application:", error);
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((val) => val.message);
      return res.status(400).json({ message: messages.join(", ") });
    }
    res
      .status(500)
      .json({ message: "Server error while submitting application." });
  }
};
exports.getAllApplications = async (req, res) => {
  try {
    // Implement pagination if needed
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
  console.log("--- Starting deleteApplication ---");
  console.log("Request Params ID:", req.params.id);

  try {
    const application = await Application.findById(req.params.id);
    console.log("Application found by findById:", application);

    if (!application) {
      console.log("Application not found in DB.");
      return res.status(404).json({ message: "Application not found." });
    }

    // --- Optional: Delete the resume file from the server ---
    if (application.resumePath) {
      console.log("Resume path from DB:", application.resumePath);
      // IMPORTANT: Adjust this path based on how resumePath is stored and your project structure
      // If resumePath is like "uploads/resumes/file.pdf" (relative to project root)
      const fullResumePath = path.resolve(
        __dirname,
        "..",
        application.resumePath
      ); // Go up one level from 'controllers' to project root
      // If resumePath is an absolute path, then just: const fullResumePath = application.resumePath;

      console.log("Attempting to delete resume file at:", fullResumePath);

      // Check if file exists before attempting to delete
      if (fs.existsSync(fullResumePath)) {
        fs.unlink(fullResumePath, (err) => {
          if (err) {
            console.error(
              `Failed to delete resume file: ${fullResumePath}`,
              err
            );
            // Decide if you want to stop the process or just log the error
            // For now, we'll just log and continue to delete DB record
          } else {
            console.log(`Successfully deleted resume file: ${fullResumePath}`);
          }
        });
      } else {
        console.log(
          `Resume file not found at path (already deleted or wrong path?): ${fullResumePath}`
        );
      }
    } else {
      console.log("No resume path found in application document.");
    }
    // --- End Optional File Deletion ---

    console.log(
      "Attempting to delete application document from DB with ID:",
      application._id
    );
    const deleteResult = await Application.deleteOne({ _id: application._id });
    console.log("MongoDB deleteOne result:", deleteResult);

    if (deleteResult.deletedCount === 0) {
      console.log(
        "Application document was not deleted from DB (maybe already deleted by another process?)."
      );
      // This might happen if the document was deleted between findById and deleteOne
      // but findById should have caught it. Still, good to be aware.
      // You might still want to send a 200 if the intent was to ensure it's gone.
    }

    res.status(200).json({ message: "Application deleted successfully." });
    console.log("--- deleteApplication finished successfully ---");
  } catch (error) {
    console.error("--- ERROR in deleteApplication ---");
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
