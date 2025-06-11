// SAHI CODE
const mongoose = require("mongoose"); // Mongoose bhi require kar lein, best practice hai
const ServiceCategory = require("../model/Service");
const fs = require("fs");         // <-- Sahi tareeka
const path = require("path");     // <-- Sahi tareeka

// Helper function to delete a file if it exists
// Ab ye function sahi se kaam karega kyunki fs aur path modules loaded hain.
const deleteFile = (filePath) => {
  if (filePath) {
    const fullPath = path.join(__dirname, "..", "..", filePath); // __dirname controller me hai, isliye 2 level up (../..) jaana hoga project root tak.
    if (fs.existsSync(fullPath)) {
      fs.unlink(fullPath, (err) => {
        if (err) console.error(`Error deleting file ${fullPath}:`, err);
        else console.log(`Deleted orphaned file: ${fullPath}`);
      });
    } else {
      console.warn(`Attempted to delete non-existent file: ${fullPath}`);
    }
  }
};

// ... Baaki ka controller code jaisa maine pichhle response me diya tha ...
// (createServiceCategory, findAllServiceCategories, etc.)

// @desc    Create a new Service Category
// @route   POST /services/create
// @access  Private/Admin
exports.createServiceCategory = async (req, res) => {
  const uploadedFilePaths = [];

  try {
    const { name, slug, description, isActive, subServicesData } = req.body;

    // --- Input Validation ---
    if (!name || !slug || !description) {
      return res.status(400).json({ error: "Missing required fields: name, slug, or description." });
    }

    const existingServiceByName = await ServiceCategory.findOne({ name });
    if (existingServiceByName) {
      return res.status(400).json({ error: "A service category with this name already exists." });
    }
    const existingServiceBySlug = await ServiceCategory.findOne({ slug });
    if (existingServiceBySlug) {
      return res.status(400).json({ error: "A service category with this slug already exists. Please use a unique slug." });
    }

    let parsedSubServices = [];
    if (subServicesData) {
      try {
        parsedSubServices = JSON.parse(subServicesData);
      } catch (e) {
        return res.status(400).json({ error: "Invalid subServicesData format. Expected JSON string." });
      }
    }

    // --- File Handling ---
    let mainImagePath = null;
    const subServiceImagePaths = [];

    if (req.files && req.files.length > 0) {
      req.files.forEach((file) => {
        const relativePath = `uploads/services/${file.destination.endsWith("main") ? "main" : "sub"}/${file.filename}`;
        uploadedFilePaths.push(relativePath);

        if (file.fieldname === "mainImage") {
          mainImagePath = relativePath;
        } else if (file.fieldname.startsWith("subServiceImage_")) {
          const index = parseInt(file.fieldname.split("_")[1]);
          while (subServiceImagePaths.length <= index) {
            subServiceImagePaths.push(null);
          }
          subServiceImagePaths[index] = relativePath;
        }
      });
    }

    if (!mainImagePath) {
      uploadedFilePaths.forEach(deleteFile);
      return res.status(400).json({ error: "Main image is required." });
    }

    const finalSubServices = parsedSubServices.map((sub, index) => ({
      name: sub.name,
      slug: sub.slug,
      description: sub.description,
      imageUrl: subServiceImagePaths[index] || null,
    }));

    const newServiceCategory = new ServiceCategory({
      name,
      slug,
      description,
      mainImage: mainImagePath,
      subServices: finalSubServices,
      isActive: isActive === "true",
    });

    const savedServiceCategory = await newServiceCategory.save();
    
    res.status(201).json({
      message: "Service category created successfully",
      data: savedServiceCategory,
    });

  } catch (error) {
    console.error("FULL ERROR in createServiceCategory:", error);
    
    if (uploadedFilePaths.length > 0) {
        console.log("Database save failed. Cleaning up uploaded files...");
        uploadedFilePaths.forEach(deleteFile);
    }
    
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((val) => val.message);
      return res.status(400).json({ error: messages.join(", ") });
    }

    res.status(500).json({ 
        error: "Server error while creating service category.",
        errorMessage: error.message 
    });
  }
};


// ... baaki ke sabhi functions (findAllServiceCategories, deleteServiceCategory, etc.)
// ... inme koi badlaav ki zaroorat nahi hai.

// Yeh function bhi theek hai
exports.findAllServiceCategories = async (req, res) => {
    try {
        const services = await ServiceCategory.find({}).sort({ createdAt: -1 });
        res.status(200).json(services);
    } catch (error) {
        console.error("Error fetching all service categories:", error);
        res.status(500).json({ error: "Server error while fetching all service categories." });
    }
};

// Yeh function bhi theek hai
exports.deleteServiceCategory = async (req, res) => {
  try {
    const serviceCategory = await ServiceCategory.findById(req.params.id);

    if (!serviceCategory) {
      return res.status(404).json({ error: "Service category not found." });
    }
    
    deleteFile(serviceCategory.mainImage);
    if (serviceCategory.subServices && serviceCategory.subServices.length > 0) {
      serviceCategory.subServices.forEach((sub) => deleteFile(sub.imageUrl));
    }

    await serviceCategory.deleteOne();

    res.status(200).json({ message: "Service category deleted successfully." });
  } catch (error) {
    console.error("Error deleting service category:", error);
    if (error.kind === "ObjectId") {
      return res.status(400).json({ error: "Invalid ID format" });
    }
    res.status(500).json({ error: "Server error while deleting service category." });
  }
};

// ... baaki ke controller exports ...
