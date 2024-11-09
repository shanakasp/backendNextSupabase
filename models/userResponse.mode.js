const mongoose = require("mongoose");

const userResponseSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
  },
  first_question: String,
  second_question: String,
  created_at: {
    type: Date,
    default: Date.now,
  },
});

const UserResponse = mongoose.model("UserResponse", userResponseSchema);

module.exports = UserResponse;
