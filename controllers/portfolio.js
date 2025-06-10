// controllers/portfolio.js

const Portfolio = require("../model/portfolioModel");
const fs = require("fs");
const path = require("path");

// Helper function to safely delete a file from your uploads folder
const deleteFile = (filePath) => {
  if (!filePath) return;
  // Construct the absolute path to the file
  const fullPath = path.join(__dirname, "..", filePath);
  fs.unlink(fullPath, (err) => {
    if (err && err.code !== 'ENOENT') { // ENOENT means file not found, which is ok
      console.error(`Error deleting file: ${fullPath}`, err);
    } else if (!err) {
      console.log(`Successfully deleted file: ${fullPath}`);
    }
  });
};

// --- CREATE Portfolio Item ---
const createPortfolio = async (req, res) => {
  try {
    const { title, category, description, projectLink } = req.body;
    
    if (!req.file) {
      return res.status(400).json({ error: "Image is required." });
    }
    const imagePath = req.file.path;

    const newPortfolio = new Portfolio({
      title,
      category,
      description,
      projectLink,
      image: imagePath,
    });

    await newPortfolio.save();
    res
      .status(201)
      .json({ message: "Portfolio created successfully", portfolio: newPortfolio });
  } catch (error) {
    console.error("Portfolio creation error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// --- GET ALL Portfolio Items ---
const getAllPortfolios = async (req, res) => {
  try {
    const portfolios = await Portfolio.find().sort({ createdAt: -1 });
    // The frontend expects `imageUrl`, but the model has `image`. Let's rename it.
    const formattedPortfolios = portfolios.map(p => ({
        _id: p._id,
        title: p.title,
        category: p.category,
        description: p.description,
        projectLink: p.projectLink,
        imageUrl: p.image, // Renaming 'image' to 'imageUrl' for frontend consistency
        createdAt: p.createdAt,
        updatedAt: p.updatedAt
    }));
    res.status(200).json(formattedPortfolios);
  } catch (error) {
    console.error("Fetching portfolios error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// --- (NEW) UPDATE Portfolio Item ---
const updatePortfolio = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, category, description, projectLink } = req.body;

    const portfolioToUpdate = await Portfolio.findById(id);

    if (!portfolioToUpdate) {
      return res.status(404).json({ error: "Portfolio item not found." });
    }

    // Check if a new image was uploaded
    if (req.file) {
      // If there's a new image, delete the old one first
      deleteFile(portfolioToUpdate.image);
      // Update the image path to the new file's path
      portfolioToUpdate.image = req.file.path;
    }

    // Update the text fields
    portfolioToUpdate.title = title || portfolioToUpdate.title;
    portfolioToUpdate.category = category || portfolioToUpdate.category;
    portfolioToUpdate.description = description || portfolioToUpdate.description;
    portfolioToUpdate.projectLink = projectLink || portfolioToUpdate.projectLink;

    const updatedPortfolio = await portfolioToUpdate.save();

    res.status(200).json({
      message: "Portfolio updated successfully",
      portfolio: updatedPortfolio,
    });
  } catch (error) {
    console.error("Portfolio update error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// --- (NEW) DELETE Portfolio Item ---
const deletePortfolio = async (req, res) => {
  try {
    const { id } = req.params;
    const portfolioToDelete = await Portfolio.findById(id);

    if (!portfolioToDelete) {
      return res.status(404).json({ error: "Portfolio item not found." });
    }

    // Delete the associated image file from the server
    deleteFile(portfolioToDelete.image);

    // Delete the record from the database
    await portfolioToDelete.deleteOne();

    res.status(200).json({ message: "Portfolio item deleted successfully." });
  } catch (error) {
    console.error("Portfolio deletion error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// --- EXPORT ALL FUNCTIONS ---
module.exports = {
  createPortfolio,
  getAllPortfolios,
  updatePortfolio,
  deletePortfolio,
};
