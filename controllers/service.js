// backend/controllers/serviceController.js
const ServiceCategory = require("../model/Service");
const mongoose = require("mongoose");
const cloudinary = require("../config/cloudinaryConfig"); // Import Cloudinary config
const path = require("path"); // Still useful for getting original extension
const uploadToCloudinary = (fileBuffer, originalFilename, folder, resourceType = "image") => {
  return new Promise((resolve, reject) => {
    const public_id = `${folder}/${Date.now()}-${path.parse(originalFilename).name}`;

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: `jiss/${folder}`, // Main folder in Cloudinary, then subfolder
        public_id: public_id,
        resource_type: resourceType, // "image", "video", "raw" (for PDFs, text files, etc.
      },
      (error, result) => {
        if (error) {
          console.error("Cloudinary Upload Error:", error);
          return reject(error);
        }
        resolve(result);
      }
    );
    uploadStream.end(fileBuffer);
  });
};

// Helper function to delete a file from Cloudinary by public_id
const deleteFromCloudinary = async (publicId, resourceType = "image") => {
  if (!publicId) return;
  try {
    let actualPublicId = publicId;
    if (publicId.startsWith('http')) {
        const parts = publicId.split('/');
        // Find the version part (e.g., v1234567890)
        const versionIndex = parts.findIndex(part => part.match(/^v\d+$/));
        if (versionIndex !== -1 && versionIndex + 1 < parts.length) {
            actualPublicId = parts.slice(versionIndex + 1).join('/').split('.')[0]; // Remove extension
        } else {
          // Fallback: try to derive from common Cloudinary folder structure
          const commonFolder = "jiss/"; // Your common base folder on Cloudinary
          if (publicId.includes(commonFolder)) {
            actualPublicId = publicId.substring(publicId.indexOf(commonFolder)).split('.')[0];
          } else {
            console.warn("Could not reliably extract public_id from URL:", publicId);
            // If you store the direct public_id from Cloudinary's response, this complex parsing isn't needed.
          }
        }
    }


    console.log(`Attempting to delete from Cloudinary: public_id='${actualPublicId}', resource_type='${resourceType}'`);
    const result = await cloudinary.uploader.destroy(actualPublicId, { resource_type: resourceType });
    console.log("Cloudinary deletion result:", result);
    if (result.result !== 'ok' && result.result !== 'not found') { // 'not found' is also a success in terms of our goal
        console.warn(`Cloudinary deletion failed for ${actualPublicId}:`, result);
    }
  } catch (error) {
    console.error(`Error deleting ${publicId} from Cloudinary:`, error);
  }
};


// --- CREATE SERVICE CATEGORY ---
exports.createServiceCategory = async (req, res) => {
  try {
    const { name, slug, description, isActive, subServicesData } = req.body;

    // --- Validation ---
    const existingServiceByName = await ServiceCategory.findOne({ name });
    if (existingServiceByName) {
      return res.status(400).json({ error: "A service category with this name already exists." });
    }
    const existingServiceBySlug = await ServiceCategory.findOne({ slug });
    if (existingServiceBySlug) {
      return res.status(400).json({ error: "A service category with this slug already exists." });
    }

    let parsedSubServices = [];
    if (subServicesData) {
      try {
        parsedSubServices = JSON.parse(subServicesData);
        if (!Array.isArray(parsedSubServices)) throw new Error("subServicesData is not an array.");
      } catch (e) {
        console.error("Error parsing subServicesData:", e.message);
        return res.status(400).json({ error: "Invalid subServicesData format. Expected JSON array string." });
      }
    }

    let mainImageCloudinaryResult = null;
    const subServiceCloudinaryResults = []; // Array to store Cloudinary upload results for sub-services

    if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: "No files uploaded. Main image is required." });
    }

    const mainImageFile = req.files.find(file => file.fieldname === 'mainImage');
    if (!mainImageFile) {
        return res.status(400).json({ error: "Main image (fieldname 'mainImage') is required." });
    }

    // Upload main image
    try {
      mainImageCloudinaryResult = await uploadToCloudinary(
        mainImageFile.buffer,
        mainImageFile.originalname,
        "services_main"
      );
    } catch (uploadError) {
      console.error("Failed to upload main image to Cloudinary:", uploadError);
      return res.status(500).json({ error: "Failed to upload main image." });
    }


    // Upload sub-service images
    // Match files to parsedSubServices based on fieldname e.g., subServiceImage_0, subServiceImage_1
    for (let i = 0; i < parsedSubServices.length; i++) {
        const subServiceFile = req.files.find(file => file.fieldname === `subServiceImage_${i}`);
        if (subServiceFile) {
            try {
                const result = await uploadToCloudinary(
                    subServiceFile.buffer,
                    subServiceFile.originalname,
                    "services_sub"
                );
                // Store the URL and public_id for potential future deletion
                subServiceCloudinaryResults[i] = { url: result.secure_url, public_id: result.public_id };
            } catch (uploadError) {
                console.warn(`Failed to upload sub-service image for index ${i}:`, uploadError.message);
                // Decide if this is a critical error. For now, let's allow creation without a specific sub-image.
                subServiceCloudinaryResults[i] = null;
            }
        } else {
            subServiceCloudinaryResults[i] = null; // No file provided for this sub-service index
        }
    }


    const finalSubServices = parsedSubServices.map((sub, index) => ({
      name: sub.name,
      slug: sub.slug, // Ensure slug is handled for sub-services if needed
      description: sub.description,
      imageUrl: subServiceCloudinaryResults[index] ? subServiceCloudinaryResults[index].url : null,
      // Storing public_id is good for easier deletion
      imagePublicId: subServiceCloudinaryResults[index] ? subServiceCloudinaryResults[index].public_id : null,
    }));

    const newServiceCategory = new ServiceCategory({
      name,
      slug,
      description,
      mainImage: mainImageCloudinaryResult.secure_url,
      mainImagePublicId: mainImageCloudinaryResult.public_id, // Store public_id for deletion
      subServices: finalSubServices,
      isActive: isActive === "true" || isActive === true, // Handle boolean true also
    });

    const savedServiceCategory = await newServiceCategory.save();
    res.status(201).json({
      message: "Service category created successfully",
      data: savedServiceCategory,
    });

  } catch (error) {
    console.error("Error creating service category:", error);
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((val) => val.message);
      return res.status(400).json({ error: messages.join(", ") });
    }
    res.status(500).json({ error: "Server error while creating service category." });
  }
};

// --- GET ALL SERVICE CATEGORIES ---
exports.getAllServiceCategories = async (req, res) => {
  try {
    const services = await ServiceCategory.find({ isActive: true }).sort({ name: 1 }); // Usually public finds active ones
    res.status(200).json(services);
  } catch (error) {
    console.error("Error fetching all service categories:", error);
    res.status(500).json({ error: "Server error while fetching all service categories." });
  }
};

// --- GET SERVICE CATEGORY BY SLUG OR ID ---
exports.getServiceCategoryBySlugOrId = async (req, res) => {
  try {
    const { slugOrId } = req.params;
    let service;

    if (mongoose.Types.ObjectId.isValid(slugOrId)) {
      service = await ServiceCategory.findById(slugOrId);
    }
    if (!service) {
      service = await ServiceCategory.findOne({ slug: slugOrId });
    }

    if (!service || !service.isActive) { // Ensure only active services are publicly accessible by slug/id
      return res.status(404).json({ error: "Service category not found or is not active." });
    }
    res.status(200).json(service);
  } catch (error) {
    console.error("Error fetching service category by slug/ID:", error);
    res.status(500).json({ error: "Server error while fetching service category." });
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

    // Delete main image from Cloudinary
    if (serviceCategory.mainImagePublicId) {
      await deleteFromCloudinary(serviceCategory.mainImagePublicId, "image");
    } else if (serviceCategory.mainImage) {
      console.warn("Main image public_id not found for deletion, attempting to derive from URL (less reliable).");
      await deleteFromCloudinary(serviceCategory.mainImage, "image");
    }


    // Delete sub-service images from Cloudinary
    if (serviceCategory.subServices && serviceCategory.subServices.length > 0) {
      for (const sub of serviceCategory.subServices) {
        if (sub.imagePublicId) {
          await deleteFromCloudinary(sub.imagePublicId, "image");
        } else if (sub.imageUrl) {
           console.warn(`Sub-service image public_id not found for ${sub.name}, attempting to derive from URL.`);
           await deleteFromCloudinary(sub.imageUrl, "image");
        }
      }
    }

    await ServiceCategory.findByIdAndDelete(req.params.id);

    res.status(200).json({ message: "Service category deleted successfully." });
  } catch (error) {
    console.error("Error deleting service category:", error);
    res.status(500).json({ error: "Server error while deleting service category." });
  }
};
