// In your contact message controller file (e.g., controllers/contactController.js)
const ContactMessage = require("../model/contact.js");

// Example: Controller to handle new contact form submissions
exports.submitContactForm = async (req, res) => {
  try {
    const { name, email, phone, subject, message } = req.body; // Add phone here

    const newMessage = new ContactMessage({
      name,
      email,
      phone, // Add phone here
      subject,
      message,
    });

    await newMessage.save();

    res.status(201).json({
      success: true,
      message: "Message sent successfully!",
      data: newMessage,
    });
  } catch (error) {
    // Handle validation errors or other errors
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((val) => val.message);
      return res
        .status(400)
        .json({ success: false, error: messages.join(", ") });
    }
    console.error("Error submitting contact form:", error);
    res
      .status(500)
      .json({ success: false, error: "Server error, please try again." });
  }
};

// Example: Controller to get all messages
exports.getAllMessages = async (req, res) => {
  try {
    const messages = await ContactMessage.find().sort({ createdAt: -1 }); // Sort by newest
    res.status(200).json(messages);
  } catch (error) {
    console.error("Error fetching messages:", error);
    res.status(500).json({ error: "Failed to fetch messages." });
  }
};

// Example: Controller to delete a message
exports.deleteMessage = async (req, res) => {
  try {
    const message = await ContactMessage.findByIdAndDelete(req.params.id);
    if (!message) {
      return res.status(404).json({ error: "Message not found." });
    }
    res.status(200).json({ message: "Message deleted successfully." });
  } catch (error) {
    console.error("Error deleting message:", error);
    res.status(500).json({ error: "Failed to delete message." });
  }
};

// Example: Controller to update read status
exports.updateReadStatus = async (req, res) => {
  try {
    const { isRead } = req.body;
    if (typeof isRead !== "boolean") {
      return res.status(400).json({ error: "Invalid isRead value." });
    }
    const message = await ContactMessage.findByIdAndUpdate(
      req.params.id,
      { isRead },
      { new: true, runValidators: true } // new: true returns the updated document
    );
    if (!message) {
      return res.status(404).json({ error: "Message not found." });
    }
    res.status(200).json(message);
  } catch (error) {
    console.error("Error updating read status:", error);
    res.status(500).json({ error: "Failed to update read status." });
  }
};
