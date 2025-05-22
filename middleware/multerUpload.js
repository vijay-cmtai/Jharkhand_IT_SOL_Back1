const multer = require("multer");
const path = require("path");
const fs = require("fs");

// --- Service Image Directories ---
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

// --- Resume Upload Directory ---
const resumeUploadDir = path.join(__dirname, "..", "uploads", "resumes");
if (!fs.existsSync(resumeUploadDir)) {
  fs.mkdirSync(resumeUploadDir, { recursive: true });
}

// --- Storage Configurations ---

// Storage for main service images
const mainImageStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, mainImageDir);
  },
  filename: function (req, file, cb) {
    cb(null, `${Date.now()}-${file.originalname.replace(/\s+/g, "_")}`);
  },
});

// Storage for sub-service images
const subServiceImageStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, subServiceImageDir);
  },
  filename: function (req, file, cb) {
    cb(null, `${Date.now()}-sub-${file.originalname.replace(/\s+/g, "_")}`);
  },
});

// Storage for resumes
const resumeStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, resumeUploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const originalName = file.originalname.toLowerCase().split(" ").join("-");
    // Sanitize filename: remove special characters except ., -, _ and keep extension
    const extension = path.extname(originalName);
    const basename = path
      .basename(originalName, extension)
      .replace(/[^a-z0-9\-_]/gi, "");
    cb(null, `resume-${uniqueSuffix}-${basename}${extension}`);
  },
});

// --- File Filters ---

// File filter to accept only images
const imageFileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Not an image! Please upload only images."), false);
  }
};

// File filter for resumes (PDF, DOC, DOCX)
const resumeFileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ];
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        "Invalid file type for resume. Only PDF, DOC, and DOCX files are allowed."
      ),
      false
    );
  }
};

// --- Multer Instances ---

// Multer instance for single main image upload (for services)
const uploadMainImage = multer({
  storage: mainImageStorage,
  fileFilter: imageFileFilter,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB limit
});

// Multer instance for sub-service images (for services)
// Note: This might not be used if 'uploadServiceImages' handles all service images.
const uploadSubServiceImages = multer({
  storage: subServiceImageStorage,
  fileFilter: imageFileFilter,
  limits: { fileSize: 1 * 1024 * 1024 }, // 1MB limit per sub-service image
});

// Multer instance for all service-related images (main and sub-services)
const uploadServiceImages = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      if (file.fieldname === "mainImage") {
        cb(null, mainImageDir);
      } else if (file.fieldname.startsWith("subServiceImage_")) {
        cb(null, subServiceImageDir);
      } else {
        cb(new Error("Unexpected file field for service image"), null);
      }
    },
    filename: (req, file, cb) => {
      cb(null, `${Date.now()}-${file.originalname.replace(/\s+/g, "_")}`);
    },
  }),
  fileFilter: imageFileFilter,
  limits: { fileSize: 2 * 1024 * 1024 },
}).any();

// Multer instance for single resume upload
const uploadResume = multer({
  storage: resumeStorage,
  fileFilter: resumeFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB limit for resume
  },
});

module.exports = {
  uploadMainImage,
  uploadSubServiceImages,
  uploadServiceImages,
  uploadResume, // Export the new resume uploader
};
