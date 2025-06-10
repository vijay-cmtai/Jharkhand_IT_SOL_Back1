const mongoose = require("mongoose");

const subServiceSchema = new mongoose.Schema({
  name: { type: String, required: [true, "Sub-service name is required."] },
  slug: {
    type: String,
    required: [true, "Sub-service slug is required."],
    // Note: A sub-service slug only needs to be unique within its parent service category, not globally.
    // If you need global uniqueness, keep 'unique: true'. Otherwise, it's better to remove it.
    // For this example, we assume it should be unique for simplicity in lookups.
    unique: true, 
    lowercase: true,
    trim: true,
  },
  description: {
    type: String,
    required: [true, "Sub-service description is required."],
  },
  imageUrl: { type: String }, // This will store the Cloudinary URL
  imagePublicId: { type: String }, // Store Cloudinary public_id for easier deletion
});

const serviceCategorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Service category name is required."],
      unique: true,
      trim: true,
    },
    slug: {
      type: String,
      required: [true, "Service category slug is required."],
      unique: true,
      lowercase: true,
      trim: true,
    },
    description: {
      type: String,
      required: [true, "Service category description is required."],
    },
    mainImage: {
      type: String, // Cloudinary URL
      required: [true, "Main image URL is required."],
    },
    mainImagePublicId: {
      type: String, // Cloudinary public_id
      required: [true, "Main image public ID is required."],
    },
    subServices: [subServiceSchema],
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ServiceCategory", serviceCategorySchema);
