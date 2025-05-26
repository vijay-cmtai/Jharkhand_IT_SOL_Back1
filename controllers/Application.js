// backend/controllers/applicationController.js
const Application = require("../model/application");
const cloudinary = require("../config/cloudinaryConfig"); // Import your Cloudinary config
const multer = require("multer"); // To check for MulterError instances

exports.submitApplication = async (req, res) => {
  console.log("--- [Controller] submitApplication (Cloudinary): Start ---");
  console.log(
    "[Controller] submitApplication: req.body:",
    JSON.stringify(req.body, null, 2)
  );
  console.log(
    "[Controller] submitApplication: req.file:",
    req.file
      ? {
          originalname: req.file.originalname,
          mimetype: req.file.mimetype,
          size: req.file.size,
        }
      : "No file"
  );

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

    // Basic validation for required text fields
    if (!jobId || !jobTitle || !fullName || !email) {
      return res.status(400).json({
        message: "Job ID, Job Title, Full Name, and Email are required fields.",
      });
    }

    if (!req.file) {
      console.error(
        "[Controller] submitApplication: Error - req.file is undefined."
      );
      return res.status(400).json({ message: "Resume file is required." });
    }

    let resumeUrl = "";
    let resumePublicId = "";

    // Upload to Cloudinary
    try {
      console.log(
        "[Controller] submitApplication: Uploading resume to Cloudinary..."
      );
      const uploadResult = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: "job_applications/resumes", // Optional: organize in Cloudinary
            resource_type: "raw", // For PDF/DOCX. Use "image" for images.
            // public_id: `resume_${jobId}_${Date.now()}`, // Optional: custom public_id
            allowed_formats: ["pdf", "doc", "docx"], // Server-side format validation
          },
          (error, result) => {
            if (error) {
              console.error("[Cloudinary Upload Error]:", error);
              return reject(error);
            }
            resolve(result);
          }
        );
        uploadStream.end(req.file.buffer); // Pass the buffer from memoryStorage
      });

      if (!uploadResult || !uploadResult.secure_url) {
        throw new Error("Cloudinary upload failed to return a secure URL.");
      }

      resumeUrl = uploadResult.secure_url;
      resumePublicId = uploadResult.public_id;
      console.log(
        "[Controller] submitApplication: Resume uploaded to Cloudinary:",
        { resumeUrl, resumePublicId }
      );
    } catch (uploadError) {
      console.error(
        "[Controller] submitApplication: Cloudinary upload failed:",
        uploadError
      );
      // Check if the error is from Cloudinary's allowed_formats
      if (
        uploadError.message &&
        uploadError.message.toLowerCase().includes("invalid file type")
      ) {
        return res
          .status(400)
          .json({
            message: "Invalid file type. Cloudinary rejected the file format.",
          });
      }
      return res
        .status(500)
        .json({ message: "Failed to upload resume to cloud storage." });
    }

    const newApplication = new Application({
      jobId,
      jobTitle,
      fullName,
      email,
      phone,
      resumeUrl, // Store Cloudinary URL
      resumePublicId, // Store Cloudinary Public ID
      coverLetter,
      portfolioLink,
    });

    const savedApplication = await newApplication.save();
    console.log(
      "[Controller] submitApplication: Application saved successfully with Cloudinary links."
    );
    res.status(201).json({
      message:
        "Application submitted successfully! We will get back to you soon.",
      application: savedApplication,
    });
  } catch (error) {
    console.error("[Controller] submitApplication: General Error:", error);
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((val) => val.message);
      return res.status(400).json({ message: messages.join(", ") });
    }
    if (error instanceof multer.MulterError) {
      // Errors from Multer (e.g., file too large)
      return res
        .status(400)
        .json({ message: `File upload error: ${error.message}` });
    }
    // This catches errors from `new Error("Invalid resume file type...")` in multerFileFilter
    if (error.message && error.message.startsWith("Invalid resume file type")) {
      return res.status(400).json({ message: error.message });
    }
    res
      .status(500)
      .json({ message: "Server error while submitting application." });
  }
};

// ... (getAllApplications, getApplicationById, updateApplicationStatus remain the same) ...
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
  console.log("--- [Controller] deleteApplication (Cloudinary): Start ---");
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

    // --- Delete from Cloudinary ---
    if (application.resumePublicId) {
      console.log(
        "[Controller] deleteApplication: Attempting to delete resume from Cloudinary with public_id:",
        application.resumePublicId
      );
      try {
        const deletionResult = await cloudinary.uploader.destroy(
          application.resumePublicId,
          { resource_type: "raw" }
        ); // Match resource_type used for upload
        console.log(
          "[Controller] deleteApplication: Cloudinary deletion result:",
          deletionResult
        );
        if (
          deletionResult.result !== "ok" &&
          deletionResult.result !== "not found"
        ) {
          // Log error but continue to delete DB record if Cloudinary deletion fails partially
          console.warn(
            `[Controller] deleteApplication: Cloudinary deletion for ${application.resumePublicId} might not have been fully successful:`,
            deletionResult.result
          );
        }
      } catch (cloudinaryError) {
        console.error(
          "[Controller] deleteApplication: Error deleting from Cloudinary:",
          cloudinaryError
        );
        // Decide if you want to stop or continue. For now, log and continue.
      }
    } else {
      console.log(
        "[Controller] deleteApplication: No resumePublicId found in application document to delete from Cloudinary."
      );
    }
    // --- End Cloudinary Deletion ---

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
    console.error("--- [Controller] ERROR in deleteApplication ---", error);
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
