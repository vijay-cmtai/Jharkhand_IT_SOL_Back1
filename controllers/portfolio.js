// controllers/portfolio.js

const Portfolio = require("../model/portfolioModel");

// Create portfolio controller
const createPortfolio = async (req, res) => {
  try {
    const { title, category, description, projectLink } = req.body;
    const imagePath = req.file ? req.file.path : "";

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
      .json({ message: "Portfolio created", portfolio: newPortfolio });
  } catch (error) {
    console.error("Portfolio creation error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get all portfolios controller
const getAllPortfolios = async (req, res) => {
  try {
    const portfolios = await Portfolio.find().sort({ createdAt: -1 });
    res.status(200).json(portfolios);
  } catch (error) {
    console.error("Fetching portfolios error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = {
  createPortfolio,
  getAllPortfolios,
};
