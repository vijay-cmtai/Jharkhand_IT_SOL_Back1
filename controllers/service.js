const ServiceCategory = require("../model/Service");
const fs = require("fs");
const path = require("path");

// Helper function to delete a file if it exists
const deleteFile = (filePath) => {
  if (filePath) {
    const fullPath = path.join(__dirname, "..", filePath); // Assumes filePath is relative to project root
    if (fs.existsSync(fullPath)) {
      fs.unlink(fullPath, (err) => {
        if (err) console.error(`Error deleting file ${fullPath}:`, err);
      });
    }
  }
};

// @desc    Create a new Service Category
// @route   POST /api/services
// @access  Private/Admin
exports.createServiceCategory = async (req, res) => {
  try {
    const { name, slug, description, isActive, subServicesData } = req.body;

    // Check if service with the same name or slug already exists
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
        return res.status(400).json({
          error: "Invalid subServicesData format. Expected JSON string.",
        });
      }
    }

    // Handle file uploads
    let mainImagePath = null;
    const subServiceImagePaths = [];

    if (req.files && req.files.length > 0) {
      req.files.forEach((file) => {
        const relativePath = `uploads/services/${file.destination.endsWith("main") ? "main" : "sub"}/${file.filename}`;
        if (file.fieldname === "mainImage") {
          mainImagePath = relativePath;
        } else if (file.fieldname.startsWith("subServiceImage_")) {
          const index = parseInt(file.fieldname.split("_")[1]);
          // Ensure subServiceImagePaths array is large enough
          while (subServiceImagePaths.length <= index) {
            subServiceImagePaths.push(null);
          }
          subServiceImagePaths[index] = relativePath;
        }
      });
    }

    if (!mainImagePath) {
      return res.status(400).json({ error: "Main image is required." });
    }

    // Combine parsedSubServices metadata with their image paths
    const finalSubServices = parsedSubServices.map((sub, index) => ({
      ...sub,
      imageUrl: subServiceImagePaths[index] || null, // Assign path or null if no image for this sub-service
    }));

    const newServiceCategory = new ServiceCategory({
      name,
      slug,
      description,
      mainImage: mainImagePath,
      subServices: finalSubServices,
      isActive: isActive === "true", // FormData sends booleans as strings
    });

    const savedServiceCategory = await newServiceCategory.save();
    res.status(201).json({
      message: "Service category created successfully",
      data: savedServiceCategory,
    });
  } catch (error) {
    console.error("Error creating service category:", error);
    // Clean up uploaded files if an error occurs during DB save
    if (req.files && req.files.length > 0) {
      req.files.forEach((file) => {
        const tempPath = path.join(
          __dirname,
          "..",
          "uploads",
          "services",
          file.destination.endsWith("main") ? "main" : "sub",
          file.filename
        );
        deleteFile(tempPath); // Use relative path for deletion
      });
    }
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((val) => val.message);
      return res.status(400).json({ error: messages.join(", ") });
    }
    res
      .status(500)
      .json({ error: "Server error while creating service category." });
  }
};

// @desc    Get all Service Categories
// @route   GET /api/services
// @access  Public (or Private/Admin depending on use case)
exports.getAllServiceCategories = async (req, res) => {
  try {
    const services = await ServiceCategory.find({ isActive: true }).sort({
      displayOrder: 1,
      name: 1,
    }); // displayOrder removed, so just by name or createdAt
    // const services = await ServiceCategory.find().sort({ name: 1 });
    res.status(200).json(services);
  } catch (error) {
    console.error("Error fetching service categories:", error);
    res
      .status(500)
      .json({ error: "Server error while fetching service categories." });
  }
};

// @desc    Get a single Service Category by slug (or ID)
// @route   GET /api/services/:slugOrId
// @access  Public
exports.getServiceCategoryBySlugOrId = async (req, res) => {
  try {
    let service = await ServiceCategory.findOne({ slug: req.params.slugOrId });
    if (!service) {
      // Try finding by ID if not found by slug and if param looks like an ID
      if (mongoose.Types.ObjectId.isValid(req.params.slugOrId)) {
        service = await ServiceCategory.findById(req.params.slugOrId);
      }
    }

    if (!service) {
      return res.status(404).json({ error: "Service category not found." });
    }
    res.status(200).json(service);
  } catch (error) {
    console.error("Error fetching service category:", error);
    if (error.kind === "ObjectId") {
      return res.status(400).json({ error: "Invalid ID format" });
    }
    res
      .status(500)
      .json({ error: "Server error while fetching service category." });
  }
};

// @desc    Delete a Service Category
// @route   DELETE /api/services/:id
// @access  Private/Admin
exports.deleteServiceCategory = async (req, res) => {
  try {
    const serviceCategory = await ServiceCategory.findById(req.params.id);

    if (!serviceCategory) {
      return res.status(404).json({ error: "Service category not found." });
    }

    // Delete associated images
    deleteFile(serviceCategory.mainImage);
    if (serviceCategory.subServices && serviceCategory.subServices.length > 0) {
      serviceCategory.subServices.forEach((sub) => deleteFile(sub.imageUrl));
    }

    await serviceCategory.deleteOne(); // Or findByIdAndDelete(req.params.id)

    res.status(200).json({ message: "Service category deleted successfully." });
  } catch (error) {
    console.error("Error deleting service category:", error);
    if (error.kind === "ObjectId") {
      return res.status(400).json({ error: "Invalid ID format" });
    }
    res
      .status(500)
      .json({ error: "Server error while deleting service category." });
  }
};

// TODO: Implement updateServiceCategory controller
// exports.updateServiceCategory = async (req, res) => { ... }
