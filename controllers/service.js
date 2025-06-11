const mongoose = require("mongoose");
const ServiceCategory = require("../model/Service");
const cloudinary = require("../config/cloudinary"); // Import Cloudinary config

/**
 * Helper function to upload a file buffer to Cloudinary.
 * @param {Buffer} fileBuffer - The file buffer from multer's memoryStorage.
 * @param {string} folderName - The folder name in Cloudinary (e.g., 'services/main').
 * @returns {Promise<object>} - The upload result from Cloudinary.
 */
const uploadToCloudinary = (fileBuffer, folderName) => {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      {
        folder: folderName,
        resource_type: "auto",
      },
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      }
    ).end(fileBuffer);
  });
};

/**
 * Helper function to delete a file from Cloudinary.
 * @param {string} publicId - The public_id of the file to delete.
 */
const deleteFromCloudinary = async (publicId) => {
  if (!publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error(`Failed to delete from Cloudinary: ${publicId}`, error);
  }
};

/**
 * Helper function to get public_id from a Cloudinary URL.
 * @param {string} imageUrl - The full Cloudinary URL.
 * @returns {string|null} - The public_id or null.
 */
const getPublicIdFromUrl = (imageUrl) => {
    if (!imageUrl || !imageUrl.includes('cloudinary.com')) return null;
    try {
        // Example URL: http://res.cloudinary.com/demo/image/upload/v1573123456/folder/sample.jpg
        const parts = imageUrl.split('/');
        const versionIndex = parts.findIndex(part => part.startsWith('v'));
        if (versionIndex === -1) return null;

        // Get everything after the version number and before the extension
        const publicIdWithExtension = parts.slice(versionIndex + 1).join('/');
        const publicId = publicIdWithExtension.substring(0, publicIdWithExtension.lastIndexOf('.'));
        return publicId;
    } catch (e) {
        return null;
    }
};


// @desc    Create a new Service Category
exports.createServiceCategory = async (req, res) => {
  try {
    const { name, slug, description, isActive, subServicesData } = req.body;

    // --- Validation ---
    if (!name || !slug || !description) return res.status(400).json({ error: "Missing required fields." });
    const existingService = await ServiceCategory.findOne({ $or: [{ name }, { slug }] });
    if (existingService) return res.status(400).json({ error: "A service with this name or slug already exists." });

    let parsedSubServices = subServicesData ? JSON.parse(subServicesData) : [];

    // --- File Upload Logic ---
    let mainImageUploadResult = null;
    const subServiceImageUploadResults = [];

    // Use Promise.all to upload all files in parallel for better performance
    const uploadPromises = (req.files || []).map(file => {
        if (file.fieldname === 'mainImage') {
            return uploadToCloudinary(file.buffer, "services/main").then(result => {
                mainImageUploadResult = result;
            });
        } else if (file.fieldname.startsWith('subServiceImage_')) {
            const index = parseInt(file.fieldname.split("_")[1]);
            return uploadToCloudinary(file.buffer, "services/sub").then(result => {
                subServiceImageUploadResults[index] = result;
            });
        }
    });

    await Promise.all(uploadPromises);

    if (!mainImageUploadResult) {
      return res.status(400).json({ error: "Main image is required." });
    }

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
    res.status(201).json({ message: "Service category created successfully", data: savedServiceCategory });

  } catch (error) {
    console.error("ERROR in createServiceCategory:", error);
    res.status(500).json({ error: "Server error while creating service.", errorMessage: error.message });
  }
};


// @desc    Update an existing Service Category
exports.updateServiceCategory = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ error: "Invalid Service ID." });

    const { name, slug, description, isActive, subServicesData } = req.body;
    
    // --- Validation ---
    const serviceToUpdate = await ServiceCategory.findById(id);
    if (!serviceToUpdate) return res.status(404).json({ error: "Service not found." });
    
    let parsedSubServices = subServicesData ? JSON.parse(subServicesData) : [];

    // --- Handle Main Image Update ---
    const mainImageFile = (req.files || []).find(f => f.fieldname === 'mainImage');
    if (mainImageFile) {
        await deleteFromCloudinary(serviceToUpdate.mainImagePublicId);
        const result = await uploadToCloudinary(mainImageFile.buffer, "services/main");
        serviceToUpdate.mainImage = result.secure_url;
        serviceToUpdate.mainImagePublicId = result.public_id;
    }

    // --- Handle Sub-Services Update ---
    const finalSubServices = [];
    const incomingSubServiceIds = new Set(parsedSubServices.map(sub => sub._id).filter(Boolean));

    // Delete sub-services that were removed from the form
    for (const oldSub of serviceToUpdate.subServices) {
        if (!incomingSubServiceIds.has(oldSub._id.toString())) {
            await deleteFromCloudinary(oldSub.imagePublicId);
        }
    }
    
    // Process incoming sub-services
    for (const [index, subData] of parsedSubServices.entries()) {
        const newImageFile = (req.files || []).find(f => f.fieldname === `subServiceImage_${index}`);
        const oldSub = subData._id ? serviceToUpdate.subServices.find(s => s._id.toString() === subData._id) : null;
        
        let imageUrl = subData.imageUrl;
        let imagePublicId = oldSub ? oldSub.imagePublicId : null;

        if (newImageFile) {
            if (oldSub && oldSub.imagePublicId) {
                await deleteFromCloudinary(oldSub.imagePublicId);
            }
            const result = await uploadToCloudinary(newImageFile.buffer, "services/sub");
            imageUrl = result.secure_url;
            imagePublicId = result.public_id;
        } else if (oldSub && !subData.imageUrl) {
            // Image was removed from an existing sub-service
            await deleteFromCloudinary(oldSub.imagePublicId);
            imageUrl = null;
            imagePublicId = null;
        }
        
        finalSubServices.push({
            _id: subData._id || new mongoose.Types.ObjectId(),
            name: subData.name,
            slug: subData.slug,
            description: subData.description,
            imageUrl,
            imagePublicId,
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
    console.error("ERROR in updateServiceCategory:", error);
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

        // Delete all images from Cloudinary
        await deleteFromCloudinary(service.mainImagePublicId);
        for (const sub of service.subServices) {
            await deleteFromCloudinary(sub.imagePublicId);
        }

        await service.deleteOne();
        res.status(200).json({ message: "Service and associated images deleted successfully." });

    } catch (error) {
        console.error("ERROR in deleteServiceCategory:", error);
        res.status(500).json({ error: "Server error." });
    }
};

// Baaki ke 'find' functions waise hi rahenge, unme koi badlav nahi chahiye.
exports.findAllServiceCategories = async (req, res) => {
    // ... no change
};
exports.getAllPublicServiceCategories = async (req, res) => {
    // ... no change
};
exports.getServiceCategoryBySlugOrId = async (req, res) => {
    // ... no change
};
