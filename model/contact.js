// models/ContactMessage.js
const mongoose = require('mongoose');

const contactMessageSchema = new mongoose.Schema({
  name: { type: String, required: true, /* ... */ },
  email: { type: String, required: true, /* ... */ },
  phone: { // ADDED THIS FIELD
    type: String,
    required: [true, 'Phone number is required.'],
    trim: true,
   
  },
  subject: { type: String, required: true, /* ... */ },
  message: { type: String, required: true, /* ... */ },
  isRead: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('ContactMessage', contactMessageSchema);