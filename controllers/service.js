const mongoose = require("mongoose");
const ServiceCategory = require("../model/Service");
const fs = require("fs");
const path = require("path");

/**
 * Helper function to delete a file from the server.
 * @param {string} filePath - The relative path to the file from the project root (e.g., 'uploads/services/main/image.jpg').
 */
const deleteFile = (filePath) => {
  if (!filePath) return;
  
  // Create an absolute path from the project root.
  // Assumes this controller file is in /src/controllers, so ../.. goes to the root.
  const fullPath = path.join(__dirname, "..", "..", filePath); 
  
  if (fs.existsSync(fullPath)) {
    fs.unlink(fullPath, (err) => {
      if (err) {
        console.error(`Error deleting file: ${fullPath}`, err);
      } else {
        console.log(`Deleted file: ${fullPath}`);
      }
    });
  } else {
    // console.warn(`File not found, could not delete: ${fullPath}`);
  }
};

/**
 * @desc    Create a new Service Category
 * @route   POST /services/create
 * @access  Private/Admin
 */
exports.createServiceCategory = async (req, res) => {
  const uploadedFilePaths = [];
  try {
    const { name, slug, description, isActive, subServicesData } = req.body;

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
          while (subServiceImagePaths.length <= index) subServiceImagePaths.push(null);
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
    res.status(201).json({ message: "Service category created successfully", data: savedServiceCategory });

  } catch (error) {
    console.error("ERROR in createServiceCategory:", error);
    if (uploadedFilePaths.length > 0) {
      console.log("Create failed. Cleaning up uploaded files...");
      uploadedFilePaths.forEach(deleteFile);
    }
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((val) => val.message);
      return res.status(400).json({ error: messages.join(", ") });
    }
    res.status(500).json({ error: "Server error while creating service category.", errorMessage: error.message });
  }
};

/**
 * @desc    Update an existing Service Category
 * @route   PUT /services/:id
 * @access  Private/Admin
 */
exports.updateServiceCategory = async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ error: "Invalid Service ID format." });
  }

  const newlyUploadedFilePaths = [];
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

    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        const relativePath = `uploads/services/${file.destination.endsWith("main") ? "main" : "sub"}/${file.filename}`;
        newlyUploadedFilePaths.push(relativePath);
      });
    }

    const mainImageFile = req.files.find(f => f.fieldname === 'mainImage');
    if (mainImageFile) {
      deleteFile(serviceToUpdate.mainImage);
      serviceToUpdate.mainImage = newlyUploadedFilePaths.find(p => p.includes(mainImageFile.filename));
    }

    const incomingSubServiceIds = new Set(parsedSubServices.map(sub => sub._id).filter(Boolean));
    serviceToUpdate.subServices.forEach(oldSub => {
      if (oldSub.imageUrl && !incomingSubServiceIds.has(oldSub._id.toString())) {
        deleteFile(oldSub.imageUrl);
      }
    });

    const finalSubServices = parsedSubServices.map((subData, index) => {
      const newImageFile = req.files.find(f => f.fieldname === `subServiceImage_${index}`);
      const oldSub = subData._id ? serviceToUpdate.subServices.find(s => s._id.toString() === subData._id) : null;
      let finalImageUrl = subData.imageUrl;

      if (newImageFile) {
        if (oldSub && oldSub.imageUrl) deleteFile(oldSub.imageUrl);
        finalImageUrl = newlyUploadedFilePaths.find(p => p.includes(newImageFile.filename));
      } else if (oldSub && oldSub.imageUrl && !subData.imageUrl) {
        deleteFile(oldSub.imageUrl);
        finalImageUrl = null;
      }

      return {
        _id: subData._id || new mongoose.Types.ObjectId(),
        name: subData.name,
        slug: subData.slug,
        description: subData.description,
        imageUrl: finalImageUrl,
      };
    });

    serviceToUpdate.name = name;
    serviceToUpdate.slug = slug;
    serviceToUpdate.description = description;
    serviceToUpdate.isActive = isActive === 'true';
    serviceToUpdate.subServices = finalSubServices;

    const updatedService = await serviceToUpdate.save();
    res.status(200).json({ message: "Service updated successfully", data: updatedService });

  } catch (error) {
    console.error("ERROR in updateServiceCategory:", error);
    if (newlyUploadedFilePaths.length > 0) {
      console.log("Update failed. Cleaning up newly uploaded files...");
      newlyUploadedFilePaths.forEach(deleteFile);
    }
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({ error: messages.join(", ") });
    }
    res.status(500).json({ error: "Server error while updating service category.", errorMessage: error.message });
  }
};

/**
 * @desc    Find all Service Categories (for admin panel)
 * @route   GET /services/find
 * @access  Private/Admin
 */
exports.findAllServiceCategories = async (req, res) => {
  try {
    const services = await ServiceCategory.find({}).sort({ createdAt: -1 });
    res.status(200).json(services);
  } catch (error) {
    console.error("Error fetching all service categories:", error);
    res.status(500).json({ error: "Server error while fetching all service categories." });
  }
};

/**
 * @desc    Get all ACTIVE Service Categories (for public website)
 * @route   GET /services/public
 * @access  Public
 */
exports.getAllPublicServiceCategories = async (req, res) => {
    try {
        const services = await ServiceCategory.find({ isActive: true }).sort({ name: 1 });
        res.status(200).json(services);
    } catch (error) {
        console.error("Error fetching public service categories:", error);
        res.status(500).json({ error: "Server error while fetching categories." });
    }
};

/**
 * @desc    Get a single Service Category by slug or ID
 * @route   GET /services/:slugOrId
 * @access  Public
 */
exports.getServiceCategoryBySlugOrId = async (req, res) => {
    try {
        let service;
        const { slugOrId } = req.params;
        if (mongoose.Types.ObjectId.isValid(slugOrId)) {
            service = await ServiceCategory.findById(slugOrId);
        }
        if (!service) {
            service = await ServiceCategory.findOne({ slug: slugOrId });
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

/**
 * @desc    Delete a Service Category
 * @route   DELETE /services/:id
 * @access  Private/Admin
 */
exports.deleteServiceCategory = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ error: "Invalid Service ID format." });
    }
    const serviceCategory = await ServiceCategory.findById(req.params.id);
    if (!serviceCategory) {
      return res.status(404).json({ error: "Service category not found." });
    }
    
    // Delete all associated images first
    deleteFile(serviceCategory.mainImage);
    if (serviceCategory.subServices && serviceCategory.subServices.length > 0) {
      serviceCategory.subServices.forEach((sub) => deleteFile(sub.imageUrl));
    }

    // Then delete the document from the database
    await serviceCategory.deleteOne();
    res.status(200).json({ message: "Service category and associated images deleted successfully." });

  } catch (error) {
    console.error("Error deleting service category:", error);
    res.status(500).json({ error: "Server error while deleting service category." });
  }
};
