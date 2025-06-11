const mongoose = require("mongoose");

const subServiceSchema = new mongoose.Schema({
  name: { type: String, required: [true, "Sub-service name is required."], trim: true },
  slug: { type: String, required: [true, "Sub-service slug is required."], trim: true, lowercase: true },
  description: { type: String, required: [true, "Sub-service description is required."], trim: true },
  imageUrl: { type: String, trim: true, default: null }, // Stores Cloudinary URL
  imagePublicId: { type: String, trim: true, default: null } // Stores Cloudinary public_id for deletion
});

const serviceCategorySchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, "Service name is required."], trim: true, unique: true },
    slug: { type: String, required: [true, "Slug is required."], trim: true, lowercase: true, unique: true },
    description: { type: String, required: [true, "Description is required."], trim: true },
    mainImage: { type: String, required: [true, "Main image URL is required."] }, // Stores Cloudinary URL
    mainImagePublicId: { type: String, required: [true, "Main image public_id is required."] }, // Stores Cloudinary public_id
    subServices: [subServiceSchema],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const ServiceCategory = mongoose.model("ServiceCategory", serviceCategorySchema);

module.exports = ServiceCategory;
