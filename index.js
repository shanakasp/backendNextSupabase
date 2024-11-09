const express = require("express");
const { createClient } = require("@supabase/supabase-js");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Connect to MongoDB
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err));

// MongoDB Schema
const UserResponseSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
  },
  first_question: String,
  second_question: String, // Will store three parts as comma-separated values
  created_at: {
    type: Date,
    default: Date.now,
  },
});

const UserResponse = mongoose.model("UserResponse", UserResponseSchema);

// Route to handle email submission
app.post("/api/submit-email", async (req, res) => {
  try {
    const { email } = req.body;
    // Store in Supabase
    const { data, error } = await supabase.from("user_responses").upsert({
      email,
      step: 1,
      data: {},
    });
    if (error) throw error;
    res.json({ success: true, message: "Email stored successfully" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Route to handle question responses
app.post("/api/submit-question", async (req, res) => {
  try {
    const { email, questionNumber, answer, part } = req.body;

    // Get existing data from Supabase
    const { data: existingData, error: fetchError } = await supabase
      .from("user_responses")
      .select("data, step")
      .eq("email", email)
      .single();
    if (fetchError) throw fetchError;

    // Update data with new answer
    let updatedData = { ...existingData.data };
    let newStep = existingData.step;

    if (questionNumber === 1) {
      // Handle Q1 normally
      updatedData.Q1 = answer;
      newStep = 2; // Move to Q2
    } else if (questionNumber === 2) {
      // Handle Q2's multiple parts
      const q2Key = `Q2_part${part}`;
      updatedData[q2Key] = answer;

      // Check if all parts of Q2 are answered
      const allPartsAnswered = ["Q2_part1", "Q2_part2", "Q2_part3"].every(
        (key) => updatedData[key] !== undefined
      );

      if (allPartsAnswered) {
        // Combine all parts into final Q2 answer
        updatedData.Q2 = [
          updatedData.Q2_part1,
          updatedData.Q2_part2,
          updatedData.Q2_part3,
        ].join(",");
        newStep = 3; // Complete
      }
    }

    // Update Supabase
    const { data, error } = await supabase
      .from("user_responses")
      .update({
        data: updatedData,
        step: newStep,
      })
      .eq("email", email);
    if (error) throw error;

    // If all questions are answered (after Q2 all parts), store in MongoDB
    if (newStep === 3) {
      const mongoData = {
        email,
        first_question: updatedData.Q1,
        second_question: updatedData.Q2, // Contains all three parts comma-separated
      };

      // Save to MongoDB
      const userResponse = new UserResponse(mongoData);
      await userResponse.save();

      // Clear Supabase entry
      await supabase.from("user_responses").delete().eq("email", email);
    }

    res.json({
      success: true,
      message:
        newStep === 3
          ? "All responses saved to MongoDB"
          : "Response saved to Supabase",
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Route to get current progress
app.get("/api/progress/:email", async (req, res) => {
  try {
    const { email } = req.params;
    // Check Supabase for progress
    const { data, error } = await supabase
      .from("user_responses")
      .select("step, data")
      .eq("email", email)
      .single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, error: "Something broke!" });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
