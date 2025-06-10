// backend/controllers/service.js

const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");
const ServiceCategory = require("../model/Service");

// Helper function to delete a file if it exists
const deleteFile = (filePath) => {
  if (!filePath) return;
  // Construct the absolute path from the project root
  const fullPath = path.join(__dirname, "..", filePath);
  if (fs.existsSync(fullPath)) {
    fs.unlink(fullPath, (err) => {
      if (err) console.error(`Error deleting file ${fullPath}:`, err);
      else console.log(`Deleted file: ${fullPath}`);
    });
  }
};

// --- CREATE SERVICE CATEGORY ---
exports.createServiceCategory = async (req, res) => {
  try {
    const { name, slug, description, isActive, subServicesData } = req.body;

    if (await ServiceCategory.findOne({ name })) {
      return res.status(400).json({ error: "A service with this name already exists." });
    }
    if (await ServiceCategory.findOne({ slug })) {
      return res.status(400).json({ error: "A service with this slug already exists." });
    }

    let parsedSubServices = subServicesData ? JSON.parse(subServicesData) : [];
    
    const mainImageFile = req.files.find(f => f.fieldname === 'mainImage');
    if (!mainImageFile) {
        return res.status(400).json({ error: "Main image is required." });
    }
    const mainImagePath = `uploads/services/main/${mainImageFile.filename}`;

    const finalSubServices = parsedSubServices.map((sub, index) => {
        const subImageFile = req.files.find(f => f.fieldname === `subServiceImage_${index}`);
        return {
            ...sub,
            imageUrl: subImageFile ? `uploads/services/sub/${subImageFile.filename}` : null
        };
    });

    const newService = new ServiceCategory({
        name, slug, description,
        mainImage: mainImagePath,
        subServices: finalSubServices,
        isActive: isActive === 'true'
    });

    const savedService = await newService.save();
    res.status(201).json({ message: "Service created successfully", data: savedService });

  } catch (error) {
    console.error("Error creating service category:", error);
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((val) => val.message);
      return res.status(400).json({ error: messages.join(", ") });
    }
    res.status(500).json({ error: "Server error while creating service category." });
  }
};


// --- FIND ALL SERVICE CATEGORIES (FOR ADMIN) ---
exports.findAllServiceCategories = async (req, res) => {
    try {
        const services = await ServiceCategory.find({}).sort({ createdAt: -1 });
        res.status(200).json(services);
    } catch (error) {
        console.error("Error fetching all service categories:", error);
        res.status(500).json({ error: "Server error while fetching service categories." });
    }
};


// --- GET ALL PUBLIC SERVICE CATEGORIES ---
exports.getAllPublicServiceCategories = async (req, res) => {
    try {
        const services = await ServiceCategory.find({ isActive: true }).sort({ name: 1 });
        res.status(200).json(services);
    } catch (error) {
        console.error("Error fetching public service categories:", error);
        res.status(500).json({ error: "Server error while fetching public categories." });
    }
};


// --- GET A SINGLE SERVICE CATEGORY ---
exports.getServiceCategoryBySlugOrId = async (req, res) => {
    try {
        const { slugOrId } = req.params;
        let service = mongoose.Types.ObjectId.isValid(slugOrId)
            ? await ServiceCategory.findById(slugOrId)
            : await ServiceCategory.findOne({ slug: slugOrId });

        if (!service) {
            return res.status(404).json({ error: "Service category not found." });
        }
        res.status(200).json(service);
    } catch (error) {
        console.error("Error fetching service category:", error);
        res.status(500).json({ error: "Server error while fetching service category." });
    }
};


// --- UPDATE SERVICE CATEGORY ---
exports.updateServiceCategory = async (req, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ error: "Invalid service ID format." });
    }

    try {
        const serviceToUpdate = await ServiceCategory.findById(req.params.id);
        if (!serviceToUpdate) {
            return res.status(404).json({ error: "Service category not found." });
        }

        const { name, slug, description, isActive, subServicesData } = req.body;
        let parsedSubServices = subServicesData ? JSON.parse(subServicesData) : [];

        // Handle Main Image Update
        const mainImageFile = req.files.find(file => file.fieldname === "mainImage");
        if (mainImageFile) {
            deleteFile(serviceToUpdate.mainImage); // Delete old image
            serviceToUpdate.mainImage = `uploads/services/main/${mainImageFile.filename}`; // Set new path
        }

        // Handle Sub-Services Update
        const oldImageUrls = new Map(serviceToUpdate.subServices.map(s => [s._id.toString(), s.imageUrl]));
        const incomingImageUrls = new Set();

        const finalSubServices = parsedSubServices.map((sub, index) => {
            const newImageFile = req.files.find(file => file.fieldname === `subServiceImage_${index}`);
            let finalImageUrl = sub.imageUrl; // Keep old URL by default

            if (newImageFile) {
                // New image uploaded for this sub-service
                finalImageUrl = `uploads/services/sub/${newImageFile.filename}`;
                // Delete the old image if it existed for this sub-service
                if (sub._id && oldImageUrls.has(sub._id)) {
                    deleteFile(oldImageUrls.get(sub._id));
                }
            }
            
            if (finalImageUrl) {
              incomingImageUrls.add(finalImageUrl);
            }

            return {
                _id: sub._id || new mongoose.Types.ObjectId(),
                name: sub.name,
                slug: sub.slug,
                description: sub.description,
                imageUrl: finalImageUrl
            };
        });
        
        // Find and delete images of sub-services that were completely removed
        for (const [id, url] of oldImageUrls.entries()) {
            if (url && !incomingImageUrls.has(url)) {
                const subStillExists = parsedSubServices.some(s => s._id === id);
                if (!subStillExists) {
                    deleteFile(url);
                }
            }
        }

        // Update the document
        serviceToUpdate.name = name;
        serviceToUpdate.slug = slug;
        serviceToUpdate.description = description;
        serviceToUpdate.isActive = isActive === "true";
        serviceToUpdate.subServices = finalSubServices;
        
        const updatedService = await serviceToUpdate.save();
        res.status(200).json({ message: "Service updated successfully", data: updatedService });

    } catch (error) {
        console.error("Error updating service category:", error);
        if (error.name === "ValidationError") {
            const messages = Object.values(error.errors).map(val => val.message);
            return res.status(400).json({ error: messages.join(', ') });
        }
        res.status(500).json({ error: "Server error while updating service category." });
    }
};


// --- DELETE SERVICE CATEGORY ---
exports.deleteServiceCategory = async (req, res) => {
    try {
        const service = await ServiceCategory.findById(req.params.id);
        if (!service) {
            return res.status(404).json({ error: "Service category not found." });
        }

        // Delete main image and all sub-service images
        deleteFile(service.mainImage);
        service.subServices.forEach(sub => deleteFile(sub.imageUrl));

        await service.deleteOne();
        res.status(200).json({ message: "Service category deleted successfully." });

    } catch (error) {
        console.error("Error deleting service category:", error);
        res.status(500).json({ error: "Server error while deleting service category." });
    }
};
