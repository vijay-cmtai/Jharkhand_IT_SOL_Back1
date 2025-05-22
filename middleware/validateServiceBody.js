const validateServiceBody = (req, res, next) => {
  const { title, icon, description, subsections } = req.body;
  if (!title || !description) {
    return res.status(400).json({ error: "Missing required fields" });
  }
  if (!Array.isArray(subsections)) {
    return res.status(400).json({ error: "Subsections must be an array" });
  }
  for (const sub of subsections) {
    if (!sub.title || !sub.icon || !sub.description) {
      return res
        .status(400)
        .json({
          error: "Each subsection must include title, icon, and description",
        });
    }
  }
  next();
};

module.exports = { validateServiceBody };
