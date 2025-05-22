const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Ensure upload directories exist
const mainImageDir = path.join(__dirname, "..", "uploads", "services", "main");
const subServiceImageDir = path.join(
  __dirname,
  "..",
  "uploads",
  "services",
  "sub"
);

if (!fs.existsSync(mainImageDir)) {
  fs.mkdirSync(mainImageDir, { recursive: true });
}
if (!fs.existsSync(subServiceImageDir)) {
  fs.mkdirSync(subServiceImageDir, { recursive: true });
}

// Configure storage for main images
const mainImageStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, mainImageDir);
  },
  filename: function (req, file, cb) {
    cb(null, `${Date.now()}-${file.originalname.replace(/\s+/g, "_")}`);
  },
});

// Configure storage for sub-service images
const subServiceImageStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, subServiceImageDir);
  },
  filename: function (req, file, cb) {
    // The filename here will be generic, actual association happens in controller
    cb(null, `${Date.now()}-sub-${file.originalname.replace(/\s+/g, "_")}`);
  },
});

// File filter to accept only images
const imageFileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Not an image! Please upload only images."), false);
  }
};

// Multer instance for single main image upload
const uploadMainImage = multer({
  storage: mainImageStorage,
  fileFilter: imageFileFilter,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB limit
});

const uploadSubServiceImages = multer({
  storage: subServiceImageStorage,
  fileFilter: imageFileFilter,
  limits: { fileSize: 1 * 1024 * 1024 }, // 1MB limit per sub-service image
});
const uploadServiceImages = multer({
  storage: multer.diskStorage({
    // Using a generic storage here, specific paths handled by field names or logic
    destination: (req, file, cb) => {
      if (file.fieldname === "mainImage") {
        cb(null, mainImageDir);
      } else if (file.fieldname.startsWith("subServiceImage_")) {
        cb(null, subServiceImageDir);
      } else {
        cb(new Error("Unexpected file field"), null);
      }
    },
    filename: (req, file, cb) => {
      cb(null, `${Date.now()}-${file.originalname.replace(/\s+/g, "_")}`);
    },
  }),
  fileFilter: imageFileFilter,
  limits: { fileSize: 2 * 1024 * 1024 }, // Max 2MB for any single file, can be refined
}).any(); // .any() will accept all files and put them in req.files

module.exports = {
  uploadMainImage, // If you have separate routes for just main image
  uploadSubServiceImages, // If you have separate routes for just sub-service images
  uploadServiceImages, // For the main create/update route that handles all
};
