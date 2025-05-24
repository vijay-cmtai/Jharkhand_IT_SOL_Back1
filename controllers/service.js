// backend/controllers/serviceController.js
const ServiceCategory = require("../model/Service"); // Adjust path
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");

// Helper function to delete a file if it exists (uses absolute path)
const deleteFileByAbsolutePath = (absolutePath) => {
  if (absolutePath && fs.existsSync(absolutePath)) {
    fs.unlink(absolutePath, (err) => {
      if (err) console.error(`Error deleting file ${absolutePath}:`, err);
    });
  }
};

// --- CREATE SERVICE CATEGORY ---
exports.createServiceCategory = async (req, res) => {
  const uploadedFileAbsolutePaths = [];
  try {
    const { name, slug, description, isActive, subServicesData } = req.body;

    const existingServiceByName = await ServiceCategory.findOne({ name });
    if (existingServiceByName) {
      return res
        .status(400)
        .json({ error: "A service category with this name already exists." });
    }
    const existingServiceBySlug = await ServiceCategory.findOne({ slug });
    if (existingServiceBySlug) {
      return res.status(400).json({
        error:
          "A service category with this slug already exists. Please use a unique slug.",
      });
    }

    let parsedSubServices = [];
    if (subServicesData) {
      try {
        parsedSubServices = JSON.parse(subServicesData);
      } catch (e) {
        uploadedFileAbsolutePaths.forEach(deleteFileByAbsolutePath);
        return res.status(400).json({
          error: "Invalid subServicesData format. Expected JSON string.",
        });
      }
    }

    let mainImagePathRelative = null;
    const subServiceImagePathsRelative = [];

    if (req.files && req.files.length > 0) {
      req.files.forEach((file) => {
        uploadedFileAbsolutePaths.push(file.path);
        const projectRoot = path.join(__dirname, "..");
        let relativePath = path.relative(projectRoot, file.path);
        relativePath = relativePath.replace(/\\/g, "/");

        if (file.fieldname === "mainImage") {
          mainImagePathRelative = relativePath;
        } else if (file.fieldname.startsWith("subServiceImage_")) {
          const index = parseInt(file.fieldname.split("_")[1]);
          while (subServiceImagePathsRelative.length <= index) {
            subServiceImagePathsRelative.push(null);
          }
          subServiceImagePathsRelative[index] = relativePath;
        }
      });
    }

    if (!mainImagePathRelative) {
      uploadedFileAbsolutePaths.forEach(deleteFileByAbsolutePath);
      return res.status(400).json({ error: "Main image is required." });
    }

    const finalSubServices = parsedSubServices.map((sub, index) => ({
      ...sub,
      imageUrl: subServiceImagePathsRelative[index] || null,
    }));

    const newServiceCategory = new ServiceCategory({
      name,
      slug,
      description,
      mainImage: mainImagePathRelative,
      subServices: finalSubServices,
      isActive: isActive === "true",
    });

    const savedServiceCategory = await newServiceCategory.save();
    res.status(201).json({
      message: "Service category created successfully",
      data: savedServiceCategory,
    });
  } catch (error) {
    console.error("Error creating service category:", error);
    uploadedFileAbsolutePaths.forEach(deleteFileByAbsolutePath);

    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((val) => val.message);
      return res.status(400).json({ error: messages.join(", ") });
    }
    res
      .status(500)
      .json({ error: "Server error while creating service category." });
  }
};

// --- GET ALL SERVICE CATEGORIES ---  <<<<<<<<<<<<<<<<<<<<<< ADDED
exports.getAllServiceCategories = async (req, res) => {
  try {
    // Fetching all services, including inactive ones if for admin panel,
    // or only active ones for public view. Adjust filter as needed.
    // For an admin panel "find" that lists all, you might not filter by isActive initially.
    // Or, if this /find is public, filter by isActive: true
    const services = await ServiceCategory.find({}).sort({ name: 1 }); // Example: finds all for admin
    // const services = await ServiceCategory.find({ isActive: true }).sort({ name: 1 }); // Example: finds active for public

    res.status(200).json(services); // Make sure your frontend expects an array directly or an object like { data: services }
  } catch (error) {
    console.error("Error fetching all service categories:", error);
    res
      .status(500)
      .json({ error: "Server error while fetching all service categories." });
  }
};

// --- GET SERVICE CATEGORY BY SLUG OR ID --- <<<<<<<<<<<<<<<<<<<<<< ADDED
exports.getServiceCategoryBySlugOrId = async (req, res) => {
  try {
    const { slugOrId } = req.params;
    let service;

    // Check if slugOrId is a valid MongoDB ObjectId
    if (mongoose.Types.ObjectId.isValid(slugOrId)) {
      service = await ServiceCategory.findById(slugOrId);
    }

    // If not found by ID (or if it wasn't a valid ID format), try by slug
    if (!service) {
      service = await ServiceCategory.findOne({ slug: slugOrId });
    }

    if (!service) {
      return res.status(404).json({ error: "Service category not found." });
    }
    res.status(200).json(service);
  } catch (error) {
    console.error("Error fetching service category by slug/ID:", error);
    // Avoid sending a 400 for ObjectId error if it could be a slug
    if (error.name === "CastError" && error.kind === "ObjectId") {
      // This specific error might occur if an invalid ID format is passed and findById is called.
      // However, our logic tries slug next, so we only 404 if truly not found.
      // The final !service check handles the "not found" case.
    }
    res
      .status(500)
      .json({ error: "Server error while fetching service category." });
  }
};

// --- DELETE SERVICE CATEGORY ---
exports.deleteServiceCategory = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: "Invalid ID format." });
    }
    const serviceCategory = await ServiceCategory.findById(req.params.id);

    if (!serviceCategory) {
      return res.status(404).json({ error: "Service category not found." });
    }

    const mainImageAbsolutePath = serviceCategory.mainImage
      ? path.join(__dirname, "..", serviceCategory.mainImage)
      : null;
    deleteFileByAbsolutePath(mainImageAbsolutePath);

    if (serviceCategory.subServices && serviceCategory.subServices.length > 0) {
      serviceCategory.subServices.forEach((sub) => {
        const subImageAbsolutePath = sub.imageUrl
          ? path.join(__dirname, "..", sub.imageUrl)
          : null;
        deleteFileByAbsolutePath(subImageAbsolutePath);
      });
    }

    await ServiceCategory.findByIdAndDelete(req.params.id);

    res.status(200).json({ message: "Service category deleted successfully." });
  } catch (error) {
    console.error("Error deleting service category:", error);
    res
      .status(500)
      .json({ error: "Server error while deleting service category." });
  }
};
