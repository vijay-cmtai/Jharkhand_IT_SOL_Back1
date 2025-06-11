const ServiceCategory = require("../model/Service");
const fs = 'fs';
const path = 'path';

// Helper function to delete a file if it exists
// Yeh function theek hai, isme koi badlaav nahi chahiye.
const deleteFile = (filePath) => {
  if (filePath) {
    // filePath ko hamesha project root se relative hona chahiye, jaise "uploads/services/main/image.jpg"
    const fullPath = path.join(__dirname, "..", "..", filePath); // Assume project root is 2 levels up from /controllers/
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

// @desc    Create a new Service Category
// @route   POST /services/create
// @access  Private/Admin
exports.createServiceCategory = async (req, res) => {
  // Yeh saare file paths ko collect karega jo is request me bane hain,
  // taaki error hone par inhe delete kiya ja sake.
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
        
        // Error cleanup ke liye har bani hui file ka path save karlo
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
      // Agar main image nahi hai, to baaki saari uploaded files ko delete kardo
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
    
    // Success! Ab response bhejo.
    res.status(201).json({
      message: "Service category created successfully",
      data: savedServiceCategory,
    });

  } catch (error) {
    // !!! --- CRITICAL ERROR HANDLING PART (CORRECTED) --- !!!
    console.error("FULL ERROR in createServiceCategory:", error); // Pura error log karo

    // Database save me error aane par saari uploaded files ko delete kardo.
    if (uploadedFilePaths.length > 0) {
        console.log("Database save failed. Cleaning up uploaded files...");
        uploadedFilePaths.forEach(deleteFile);
    }
    
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((val) => val.message);
      return res.status(400).json({ error: messages.join(", ") });
    }

    // Yeh final response hai agar koi aur anjaan error aata hai.
    res.status(500).json({ 
        error: "Server error while creating service category.",
        // Development me, aap error ka message bhi bhej sakte hain
        // errorMessage: error.message 
    });
  }
};

// @desc    Get all Service Categories
// @route   GET /services/find
// @access  Private/Admin
// Note: Frontend me aapne iska naam findAllServiceCategories rakha tha,
// lekin yahan getAllServiceCategories hai. Naam consistent rakhein.
exports.findAllServiceCategories = async (req, res) => {
    try {
        const services = await ServiceCategory.find({}).sort({ createdAt: -1 });
        res.status(200).json(services);
    } catch (error) {
        console.error("Error fetching all service categories:", error);
        res.status(500).json({ error: "Server error while fetching all service categories." });
    }
};


// Baki functions (get by slug, delete) theek lag rahe hain.
// Lekin delete function ke deleteFile call ko bhi check karlein.
exports.deleteServiceCategory = async (req, res) => {
  try {
    const serviceCategory = await ServiceCategory.findById(req.params.id);

    if (!serviceCategory) {
      return res.status(404).json({ error: "Service category not found." });
    }

    // In paths ko directly deleteFile me bhejna theek hai
    // kyunki ye database se aa rahe hain aur relative path (e.g., "uploads/...") format me hain.
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

// Ye public route bhi theek kar dete hain, jisme displayOrder nahi hai.
exports.getAllPublicServiceCategories = async (req, res) => {
  try {
    const services = await ServiceCategory.find({ isActive: true }).sort({ name: 1 });
    res.status(200).json(services);
  } catch (error) {
    console.error("Error fetching public service categories:", error);
    res.status(500).json({ error: "Server error while fetching categories." });
  }
};

// Apne routes file me is function ka naam bhi badalna hoga.
// router.get("/find", serviceController.getAllServiceCategories);  <-- YEH GALAT HAI
// router.get("/find", serviceController.findAllServiceCategories); <-- YEH SAHI HAI
