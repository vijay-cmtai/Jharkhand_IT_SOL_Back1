const mongoose = require("mongoose");
const ServiceCategory = require("../model/Service");
// IMPORTANT: This controller now depends on the Cloudinary config.
const { cloudinary } = require("../config/cloudinary"); 

// Helper function to delete an image from Cloudinary
const deleteFromCloudinary = async (publicId) => {
  if (!publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error(`Error deleting image ${publicId} from Cloudinary:`, error);
  }
};

// --- CREATE SERVICE CATEGORY ---
exports.createServiceCategory = async (req, res) => {
  const uploadedFiles = []; // Keep track of uploaded files for rollback on error
  try {
    const { name, slug, description, isActive, subServicesData } = req.body;

    if (await ServiceCategory.findOne({ name })) return res.status(400).json({ error: "A service with this name already exists." });
    if (await ServiceCategory.findOne({ slug })) return res.status(400).json({ error: "A service with this slug already exists." });

    let parsedSubServices = subServicesData ? JSON.parse(subServicesData) : [];
    
    // Find the main image file from the uploaded files provided by multer-storage-cloudinary
    const mainImageFile = req.files.find(f => f.fieldname === 'mainImage');
    if (!mainImageFile) return res.status(400).json({ error: "Main image is required." });
    
    // Add its public_id to our rollback list in case of failure
    uploadedFiles.push(mainImageFile.filename);

    // Process sub-services and their images
    const finalSubServices = parsedSubServices.map((sub, index) => {
      const subImageFile = req.files.find(f => f.fieldname === `subServiceImage_${index}`);
      if (subImageFile) {
        uploadedFiles.push(subImageFile.filename); // Add to rollback list
        return {
          ...sub,
          imageUrl: subImageFile.path,          // The full URL from Cloudinary
          imagePublicId: subImageFile.filename, // The unique public_id from Cloudinary
        };
      }
      return { ...sub, imageUrl: null, imagePublicId: null };
    });

    const newService = new ServiceCategory({
      name,
      slug,
      description,
      mainImage: mainImageFile.path, // The Cloudinary URL
      mainImagePublicId: mainImageFile.filename, // The Cloudinary public_id
      subServices: finalSubServices,
      isActive: isActive === 'true',
    });

    const savedService = await newService.save();
    res.status(201).json({ message: "Service created successfully", data: savedService });

  } catch (error) {
    // If database save fails, delete any files that were uploaded to Cloudinary
    console.error("Error creating service, rolling back image uploads:", error);
    for (const publicId of uploadedFiles) {
      await deleteFromCloudinary(publicId);
    }

    if (error.name === "ValidationError") {
      return res.status(400).json({ error: Object.values(error.errors).map(e => e.message).join(', ') });
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
        res.status(500).json({ error: "Server error while fetching service categories." });
    }
};

// --- UPDATE SERVICE CATEGORY ---
exports.updateServiceCategory = async (req, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ error: "Invalid ID." });

    try {
        const serviceToUpdate = await ServiceCategory.findById(req.params.id);
        if (!serviceToUpdate) return res.status(404).json({ error: "Service not found." });

        const { name, slug, description, isActive, subServicesData } = req.body;
        let parsedSubServices = subServicesData ? JSON.parse(subServicesData) : [];

        // Handle Main Image Update
        const mainImageFile = req.files.find(f => f.fieldname === "mainImage");
        if (mainImageFile) {
            await deleteFromCloudinary(serviceToUpdate.mainImagePublicId); // Delete old one
            serviceToUpdate.mainImage = mainImageFile.path;
            serviceToUpdate.mainImagePublicId = mainImageFile.filename;
        }

        // Handle Sub-Service Updates
        const incomingSubServiceIds = new Set(parsedSubServices.map(s => s._id).filter(Boolean));
        
        // Find and delete images of sub-services that were removed from the form
        for (const sub of serviceToUpdate.subServices) {
            if (sub.imagePublicId && !incomingSubServiceIds.has(sub._id.toString())) {
                await deleteFromCloudinary(sub.imagePublicId);
            }
        }
        
        const finalSubServices = [];
        for (let i = 0; i < parsedSubServices.length; i++) {
            const subData = parsedSubServices[i];
            const newImageFile = req.files.find(f => f.fieldname === `subServiceImage_${i}`);
            
            let existingSub = subData._id ? serviceToUpdate.subServices.find(s => s._id.toString() === subData._id) : null;
            let finalImageUrl = existingSub ? existingSub.imageUrl : null;
            let finalImagePublicId = existingSub ? existingSub.imagePublicId : null;

            if (newImageFile) {
                if (finalImagePublicId) { // If there was an old image for this sub-service, delete it
                    await deleteFromCloudinary(finalImagePublicId);
                }
                finalImageUrl = newImageFile.path;
                finalImagePublicId = newImageFile.filename;
            }

            finalSubServices.push({
                _id: subData._id || new mongoose.Types.ObjectId(),
                name: subData.name,
                slug: subData.slug,
                description: subData.description,
                imageUrl: finalImageUrl,
                imagePublicId: finalImagePublicId,
            });
        }
        
        serviceToUpdate.name = name;
        serviceToUpdate.slug = slug;
        serviceToUpdate.description = description;
        serviceToUpdate.isActive = isActive === "true";
        serviceToUpdate.subServices = finalSubServices;
        
        const updatedService = await serviceToUpdate.save();
        res.status(200).json({ message: "Service updated successfully", data: updatedService });

    } catch (error) {
        console.error("Error updating service category:", error);
        res.status(500).json({ error: "Server error while updating service category." });
    }
};

// --- DELETE SERVICE CATEGORY ---
exports.deleteServiceCategory = async (req, res) => {
    try {
        const service = await ServiceCategory.findById(req.params.id);
        if (!service) return res.status(404).json({ error: "Service category not found." });

        // Delete all associated images from Cloudinary
        await deleteFromCloudinary(service.mainImagePublicId);
        for (const sub of service.subServices) {
            await deleteFromCloudinary(sub.imagePublicId);
        }

        // Delete the service from the database
        await ServiceCategory.findByIdAndDelete(req.params.id);

        res.status(200).json({ message: "Service category and associated images deleted successfully." });
    } catch (error) {
        res.status(500).json({ error: "Server error while deleting service category." });
    }
};

// --- Other controller functions (no changes needed) ---
exports.getServiceCategoryBySlugOrId = async (req, res) => {
    try {
        const { slugOrId } = req.params;
        let service = mongoose.Types.ObjectId.isValid(slugOrId)
            ? await ServiceCategory.findById(slugOrId)
            : await ServiceCategory.findOne({ slug: slugOrId });
        if (!service) return res.status(404).json({ error: "Service category not found." });
        res.status(200).json(service);
    } catch (error) {
        res.status(500).json({ error: "Server error while fetching service category." });
    }
};

exports.getAllPublicServiceCategories = async (req, res) => {
    try {
        const services = await ServiceCategory.find({ isActive: true }).sort({ name: 1 });
        res.status(200).json(services);
    } catch (error) {
        res.status(500).json({ error: "Server error while fetching public categories." });
    }
};
