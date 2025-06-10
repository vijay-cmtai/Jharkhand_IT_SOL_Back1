const mongoose = require("mongoose");
const ServiceCategory = require("../model/Service");
const fs = require("fs");
const path = require("path");

// Helper function to delete a file if it exists
const deleteFile = (filePath) => {
  if (filePath) {
    // Construct an absolute path from the project root
    const fullPath = path.join(__dirname, "..", "..", filePath); 
    if (fs.existsSync(fullPath)) {
      fs.unlink(fullPath, (err) => {
        if (err) console.error(`Error deleting file ${fullPath}:`, err);
        else console.log(`Deleted file: ${fullPath}`);
      });
    }
  }
};

// @desc    Create a new Service Category
// @route   POST /services/create
// @access  Private/Admin
exports.createServiceCategory = async (req, res) => {
  try {
    const { name, slug, description, isActive, subServicesData } = req.body;

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

    let mainImagePath = null;
    const subServiceImagePaths = [];
    if (req.files && req.files.length > 0) {
      req.files.forEach((file) => {
        const relativePath = `uploads/services/${file.destination.endsWith("main") ? "main" : "sub"}/${file.filename}`;
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
      return res.status(400).json({ error: "Main image is required." });
    }

    const finalSubServices = parsedSubServices.map((sub, index) => ({
      ...sub,
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
    console.error("Error creating service category:", error);
    if (req.files && req.files.length > 0) {
      req.files.forEach((file) => {
         const relativePath = `uploads/services/${file.destination.endsWith("main") ? "main" : "sub"}/${file.filename}`;
        deleteFile(relativePath);
      });
    }
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((val) => val.message);
      return res.status(400).json({ error: messages.join(", ") });
    }
    res.status(500).json({ error: "Server error while creating service category." });
  }
};


// --- THIS IS THE NEW UPDATE FUNCTION ---
// @desc    Update a Service Category
// @route   PUT /services/:id
// @access  Private/Admin
exports.updateServiceCategory = async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ error: "Invalid Service ID format." });
  }

  try {
    const serviceToUpdate = await ServiceCategory.findById(req.params.id);
    if (!serviceToUpdate) {
      return res.status(404).json({ error: "Service category not found." });
    }

    const { name, slug, description, isActive, subServicesData } = req.body;
    let parsedSubServices = [];
    if (subServicesData) {
      try {
        parsedSubServices = JSON.parse(subServicesData);
      } catch (e) {
        return res.status(400).json({ error: "Invalid subServicesData format." });
      }
    }

    // --- Handle Main Image Update ---
    const mainImageFile = req.files.find(f => f.fieldname === 'mainImage');
    if (mainImageFile) {
      deleteFile(serviceToUpdate.mainImage); // Delete the old image
      serviceToUpdate.mainImage = `uploads/services/main/${mainImageFile.filename}`;
    }

    // --- Handle Sub-Services Update (Complex Logic) ---
    // 1. Get IDs of incoming sub-services to check which ones were deleted
    const incomingSubServiceIds = new Set(parsedSubServices.map(sub => sub._id).filter(Boolean));

    // 2. Delete images of sub-services that were removed
    serviceToUpdate.subServices.forEach(oldSub => {
      if (!incomingSubServiceIds.has(oldSub._id.toString())) {
        deleteFile(oldSub.imageUrl);
      }
    });

    // 3. Map over incoming data to build the final sub-services array
    const finalSubServices = parsedSubServices.map((subData, index) => {
      const newImageFile = req.files.find(f => f.fieldname === `subServiceImage_${index}`);
      
      let finalImageUrl = subData.imageUrl; // Default to the URL sent from the client
      
      if (newImageFile) {
        // If a new image is uploaded, find the old one to delete it
        if (subData._id) {
            const oldSub = serviceToUpdate.subServices.find(s => s._id.toString() === subData._id);
            if (oldSub && oldSub.imageUrl) {
                deleteFile(oldSub.imageUrl);
            }
        }
        finalImageUrl = `uploads/services/sub/${newImageFile.filename}`;
      }
      
      return {
        _id: subData._id || new mongoose.Types.ObjectId(),
        name: subData.name,
        slug: subData.slug,
        description: subData.description,
        imageUrl: finalImageUrl,
      };
    });

    // --- Update the main document fields ---
    serviceToUpdate.name = name;
    serviceToUpdate.slug = slug;
    serviceToUpdate.description = description;
    serviceToUpdate.isActive = isActive === 'true';
    serviceToUpdate.subServices = finalSubServices;

    const updatedService = await serviceToUpdate.save();
    res.status(200).json({ message: "Service updated successfully", data: updatedService });

  } catch (error) {
    console.error("Error updating service category:", error);
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((val) => val.message);
      return res.status(400).json({ error: messages.join(", ") });
    }
    res.status(500).json({ error: "Server error while updating service category." });
  }
};
// --- END OF NEW UPDATE FUNCTION ---


// @desc    Get all active Service Categories (for public view)
// @route   GET /services/public
// @access  Public
exports.getAllPublicServiceCategories = async (req, res) => {
  try {
    const services = await ServiceCategory.find({ isActive: true }).sort({ name: 1 });
    res.status(200).json(services);
  } catch (error) {
    console.error("Error fetching public service categories:", error);
    res.status(500).json({ error: "Server error while fetching categories." });
  }
};


// @desc    Find all Service Categories (for admin view)
// @route   GET /services/find
// @access  Private/Admin
exports.findAllServiceCategories = async (req, res) => {
    try {
        const services = await ServiceCategory.find({}).sort({ createdAt: -1 });
        res.status(200).json(services);
    } catch (error) {
        res.status(500).json({ error: "Server error while fetching all service categories." });
    }
};


// @desc    Get a single Service Category by slug (or ID)
// @route   GET /services/:slugOrId
// @access  Public
exports.getServiceCategoryBySlugOrId = async (req, res) => {
  try {
    let service;
    if (mongoose.Types.ObjectId.isValid(req.params.slugOrId)) {
      service = await ServiceCategory.findById(req.params.slugOrId);
    } else {
      service = await ServiceCategory.findOne({ slug: req.params.slugOrId });
    }
    if (!service) {
      return res.status(404).json({ error: "Service category not found." });
    }
    res.status(200).json(service);
  } catch (error) {
    console.error("Error fetching service category:", error);
    res.status(500).json({ error: "Server error while fetching service category." });
  }
};

// @desc    Delete a Service Category
// @route   DELETE /services/:id
// @access  Private/Admin
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
