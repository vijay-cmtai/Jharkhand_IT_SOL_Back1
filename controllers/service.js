const mongoose = require("mongoose");
const ServiceCategory = require("../model/Service");
const cloudinary = require("../config/cloudinaryConfig");

/**
 * Helper function to upload a file buffer to Cloudinary.
 * @param {Buffer} fileBuffer The file buffer from multer's memoryStorage.
 * @param {string} folderName The folder name in Cloudinary.
 * @returns {Promise<object>} The upload result from Cloudinary.
 */
const uploadToCloudinary = (fileBuffer, folderName) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder: folderName, resource_type: "auto" },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
    uploadStream.end(fileBuffer);
  });
};

/**
 * Helper function to delete a file from Cloudinary.
 * @param {string} publicId The public_id of the file to delete.
 */
const deleteFromCloudinary = async (publicId) => {
  if (!publicId) return;
  try {
    console.log(`Deleting from Cloudinary: ${publicId}`);
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error(`Failed to delete from Cloudinary: ${publicId}`, error);
  }
};


// @desc    Create a new Service Category
exports.createServiceCategory = async (req, res) => {
  try {
    const { name, slug, description, isActive, subServicesData } = req.body;

    if (!name || !slug || !description) return res.status(400).json({ error: "Missing required fields." });
    const existingService = await ServiceCategory.findOne({ $or: [{ name }, { slug }] });
    if (existingService) return res.status(400).json({ error: "A service with this name or slug already exists." });

    let parsedSubServices = subServicesData ? JSON.parse(subServicesData) : [];

    let mainImageUploadResult = null;
    const subServiceImageUploadResults = new Array(parsedSubServices.length).fill(null);

    const uploadPromises = (req.files || []).map(file => {
      const folderName = file.fieldname === 'mainImage' ? "services/main" : "services/sub";
      return uploadToCloudinary(file.buffer, folderName).then(result => {
        if (file.fieldname === 'mainImage') {
          mainImageUploadResult = result;
        } else if (file.fieldname.startsWith('subServiceImage_')) {
          const index = parseInt(file.fieldname.split("_")[1]);
          if(index < subServiceImageUploadResults.length) subServiceImageUploadResults[index] = result;
        }
      });
    });
    await Promise.all(uploadPromises);

    if (!mainImageUploadResult) return res.status(400).json({ error: "Main image is required." });

    const finalSubServices = parsedSubServices.map((sub, index) => {
      const uploadResult = subServiceImageUploadResults[index];
      return {
        ...sub,
        imageUrl: uploadResult ? uploadResult.secure_url : null,
        imagePublicId: uploadResult ? uploadResult.public_id : null,
      };
    });

    const newServiceCategory = new ServiceCategory({
      name, slug, description,
      mainImage: mainImageUploadResult.secure_url,
      mainImagePublicId: mainImageUploadResult.public_id,
      subServices: finalSubServices,
      isActive: isActive === "true",
    });

    const savedServiceCategory = await newServiceCategory.save();
    res.status(201).json({ message: "Service created successfully", data: savedServiceCategory });

  } catch (error) {
    console.error("!!! CRITICAL ERROR in createServiceCategory:", error);
    res.status(500).json({ error: "Server error while creating service.", errorMessage: error.message });
  }
};

// @desc    Update an existing Service Category
exports.updateServiceCategory = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ error: "Invalid Service ID." });

    const { name, slug, description, isActive, subServicesData } = req.body;
    
    const serviceToUpdate = await ServiceCategory.findById(id);
    if (!serviceToUpdate) return res.status(404).json({ error: "Service not found." });
    
    let parsedSubServices = subServicesData ? JSON.parse(subServicesData) : [];

    const mainImageFile = (req.files || []).find(f => f.fieldname === 'mainImage');
    if (mainImageFile) {
        await deleteFromCloudinary(serviceToUpdate.mainImagePublicId);
        const result = await uploadToCloudinary(mainImageFile.buffer, "services/main");
        serviceToUpdate.mainImage = result.secure_url;
        serviceToUpdate.mainImagePublicId = result.public_id;
    }

    const finalSubServices = [];
    const incomingSubServiceIds = new Set(parsedSubServices.map(sub => sub._id).filter(Boolean));

    for (const oldSub of serviceToUpdate.subServices) {
        if (!incomingSubServiceIds.has(oldSub._id.toString())) {
            await deleteFromCloudinary(oldSub.imagePublicId);
        }
    }
    
    for (const [index, subData] of parsedSubServices.entries()) {
        const newImageFile = (req.files || []).find(f => f.fieldname === `subServiceImage_${index}`);
        const oldSub = subData._id ? serviceToUpdate.subServices.find(s => s._id.toString() === subData._id) : null;
        
        let imageUrl = subData.imageUrl;
        let imagePublicId = oldSub ? oldSub.imagePublicId : null;

        if (newImageFile) {
            if (oldSub && oldSub.imagePublicId) await deleteFromCloudinary(oldSub.imagePublicId);
            const result = await uploadToCloudinary(newImageFile.buffer, "services/sub");
            imageUrl = result.secure_url;
            imagePublicId = result.public_id;
        } else if (oldSub && !subData.imageUrl) {
            await deleteFromCloudinary(oldSub.imagePublicId);
            imageUrl = null;
            imagePublicId = null;
        }
        
        finalSubServices.push({
            _id: subData._id || new mongoose.Types.ObjectId(),
            name: subData.name, slug: subData.slug, description: subData.description,
            imageUrl, imagePublicId,
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
    console.error("!!! CRITICAL ERROR in updateServiceCategory:", error);
    res.status(500).json({ error: "Server error while updating service.", errorMessage: error.message });
  }
};

// @desc    Delete a Service Category
exports.deleteServiceCategory = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ error: "Invalid ID." });
        
        const service = await ServiceCategory.findById(id);
        if (!service) return res.status(404).json({ error: "Service not found." });

        await deleteFromCloudinary(service.mainImagePublicId);
        for (const sub of service.subServices) {
            await deleteFromCloudinary(sub.imagePublicId);
        }

        await service.deleteOne();
        res.status(200).json({ message: "Service deleted successfully." });

    } catch (error) {
        console.error("!!! CRITICAL ERROR in deleteServiceCategory:", error);
        res.status(500).json({ error: "Server error." });
    }
};

// @desc    Find all Service Categories (for admin)
exports.findAllServiceCategories = async (req, res) => {
  try {
    const services = await ServiceCategory.find({}).sort({ createdAt: -1 });
    res.status(200).json(services);
  } catch (error) {
    console.error("!!! CRITICAL ERROR in findAllServiceCategories:", error);
    res.status(500).json({ error: "Server error while fetching services." });
  }
};

// ... baaki ke find functions (public, by slug) aap yahan add kar sakte hain ...
exports.getAllPublicServiceCategories = async (req, res) => {
    // ...
};
exports.getServiceCategoryBySlugOrId = async (req, res) => {
    // ...
};
