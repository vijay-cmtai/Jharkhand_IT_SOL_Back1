// backend/model/application.js
const mongoose = require("mongoose");

const applicationSchema = new mongoose.Schema(
  {
    jobId: {
      type: String,
      required: true,
    },
    jobTitle: {
      type: String,
      required: [true, "Job title is required"],
    },
    fullName: {
      type: String,
      required: [true, "Full name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      trim: true,
      lowercase: true,
      match: [/.+\@.+\..+/, "Please fill a valid email address"],
    },
    phone: {
      type: String,
      trim: true,
    },
    // --- Fields for Cloudinary ---
    resumeUrl: {
      type: String,
      required: [true, "Resume URL from Cloudinary is required"], // Make this required
    },
    resumePublicId: {
      type: String,
      required: [true, "Resume Public ID from Cloudinary is required"], // Make this required
    },
    // --- resumePath is REMOVED ---
    coverLetter: {
      type: String,
      trim: true,
    },
    portfolioLink: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ["Pending", "Reviewed", "Shortlisted", "Rejected", "Hired"],
      default: "Pending",
    },
    // appliedAt will be handled by timestamps: true
  },
  {
    timestamps: true, // Adds createdAt and updatedAt timestamps
  }
);

module.exports = mongoose.model("Application", applicationSchema);
