const mongoose = require("mongoose");

const subServiceSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  slug: { type: String, required: true, trim: true, lowercase: true },
  description: { type: String, required: true, trim: true },
  imageUrl: { type: String, trim: true, default: null }, // Stores Cloudinary URL
  imagePublicId: { type: String, trim: true, default: null } // Stores Cloudinary public_id
});

const serviceCategorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, unique: true },
    slug: { type: String, required: true, trim: true, lowercase: true, unique: true },
    description: { type: String, required: true, trim: true },
    mainImage: { type: String, required: true }, // Stores Cloudinary URL
    mainImagePublicId: { type: String, required: true }, // Stores Cloudinary public_id
    subServices: [subServiceSchema],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const ServiceCategory = mongoose.model("ServiceCategory", serviceCategorySchema);

module.exports = ServiceCategory;
