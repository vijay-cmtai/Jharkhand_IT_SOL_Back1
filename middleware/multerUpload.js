// middleware/multerUpload.js

const multer = require("multer");
const path = require("path");
const fs = require("fs");

// --- Helper function to ensure directory exists ---
const ensureDirExists = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

// --- Storage configuration for Service Images ---
const serviceImageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    let uploadPath;
    if (file.fieldname === 'mainImage') {
      uploadPath = path.join(__dirname, '..', '..', 'uploads', 'services', 'main');
    } else {
      uploadPath = path.join(__dirname, '..', '..', 'uploads', 'services', 'sub');
    }
    ensureDirExists(uploadPath);
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + extension);
  }
});

const imageFileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Invalid file type. Only images are allowed."), false);
  }
};

// Multer middleware for service images
const uploadServiceImages = multer({
  storage: serviceImageStorage,
  fileFilter: imageFileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }
}).any();

// --- Storage configuration for Resumes ---
const resumeStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, '..', '..', 'uploads', 'resumes');
        ensureDirExists(uploadPath);
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const extension = path.extname(file.originalname);
        cb(null, 'resume-' + uniqueSuffix + extension);
    }
});

const resumeFileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ];
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Invalid resume file type. Only PDF, DOC, DOCX allowed."), false);
  }
};

// <<< BADLAV YAHAN >>>
// Ab hum sirf multer instance banayenge, .single() yahan call nahi karenge.
const uploadResume = multer({
  storage: resumeStorage,
  fileFilter: resumeFileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});


module.exports = {
  uploadServiceImages,
  uploadResume, // Ab yeh ek multer instance hai, jiske paas .single method hai
};
