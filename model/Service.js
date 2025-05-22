const mongoose = require("mongoose");

const subServiceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Sub-service name is required."],
    trim: true,
  },
  slug: {
    type: String,
    required: [true, "Sub-service slug is required."],
    trim: true,
    lowercase: true,
  },
  description: {
    type: String,
    required: [true, "Sub-service description is required."],
    trim: true,
  },
  imageUrl: {
    // Path to the uploaded image for this sub-service
    type: String,
    trim: true,
  },
  // You can add more fields like 'iconName' if sub-services have icons too
});

const serviceCategorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Service category name is required."],
      trim: true,
      unique: true, // Ensure category names are unique
    },
    slug: {
      type: String,
      required: [true, "Slug is required."],
      trim: true,
      lowercase: true,
      unique: true, // Ensure slugs are unique
    },
    description: {
      type: String,
      required: [true, "Description is required."],
      trim: true,
    },
    mainImage: {
      // Path to the uploaded main image for the category
      type: String,
      required: [true, "A main image URL is required."],
    },
    subServices: [subServiceSchema],
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt
  }
);

// Optional: Create an index for faster querying by slug if you have many categories
serviceCategorySchema.index({ slug: 1 });
serviceCategorySchema.index({ name: 1 });

const ServiceCategory = mongoose.model(
  "ServiceCategory",
  serviceCategorySchema
);

module.exports = ServiceCategory;
