// models/Application.js
const mongoose = require("mongoose");

const applicationSchema = new mongoose.Schema(
  {
    jobId: {
      type: String, // Can be an actual Job ID from another collection or a slug/identifier
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
      // Basic email validation, consider using a more robust validator like 'validator' package
      match: [/.+\@.+\..+/, "Please fill a valid email address"],
    },
    phone: {
      type: String,
      trim: true,
      // You might want to add phone number validation
    },
    resumePath: {
      // Path to the uploaded resume file on the server
      type: String,
      required: [true, "Resume is required"],
    },
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
    appliedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt timestamps
  }
);

module.exports = mongoose.model("Application", applicationSchema);
