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
  second_question: String,
  created_at: {
    type: Date,
    default: Date.now,
  },
  updated_at: {
    type: Date,
    default: Date.now,
  },
});

const UserResponse = mongoose.model("UserResponse", UserResponseSchema);

// Route to handle user details submission (Step 1)
app.post("/api/submit-email", async (req, res) => {
  try {
    const { email, firstName, lastName, phone } = req.body;

    // Store in Supabase
    const { data, error } = await supabase.from("user_responses").upsert({
      email,
      step: 1,
    });

    if (error) throw error;

    // Update step to 2 after successful user details submission
    const { data: stepData, error: stepError } = await supabase
      .from("user_responses")
      .update({ step: 2 })
      .eq("email", email);

    if (stepError) throw stepError;

    res.json({ success: true, message: "User details stored successfully" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Helper function to update or create MongoDB record
async function updateMongoDBRecord(email, data) {
  try {
    const mongoData = {
      email,
      first_question: data.Q1,
      second_question: data.Q2,
      updated_at: new Date(),
    };

    // Use findOneAndUpdate with upsert option
    const result = await UserResponse.findOneAndUpdate({ email }, mongoData, {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    });

    return result;
  } catch (error) {
    console.error("MongoDB update error:", error);
    throw error;
  }
}

// Route to handle question responses (Steps 2 and 3)
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
    let updatedData = { ...existingData.data } || {};
    let newStep = existingData.step;

    if (questionNumber === 1) {
      // Handle Q1 (Step 2)
      updatedData.Q1 = answer;
      newStep = 3; // Move to Step 3 (Q2)
    } else if (questionNumber === 2) {
      // Handle Q2 (Step 3)
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
        newStep = 4; // Complete
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

    // Always try to update MongoDB if we have enough data
    if (updatedData.Q1 || updatedData.Q2) {
      await updateMongoDBRecord(email, updatedData);
    }

    res.json({
      success: true,
      message: "Response saved successfully",
      step: newStep,
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
