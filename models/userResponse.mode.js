const mongoose = require("mongoose");

const UserResponseSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
  },
  first_question: String,
  second_question: String,
  third_question: String,
  fourth_question: String,
  created_at: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("UserResponse", UserResponseSchema);
