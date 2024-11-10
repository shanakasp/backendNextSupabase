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
  second_question: {
    Comfort: String,
    Looks: String,
    Price: String,
  },
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
    const { email } = req.body;

    const initialData = {
      email: email,
      Q1: null,
      Q2: null,
      Q2_part1: null, // Comfort
      Q2_part2: null, // Looks
      Q2_part3: null, // Price
      status: "in-progress",
      step: 0,
    };

    // Store in Supabase with initial step value
    const { data, error } = await supabase.from("user_responses").upsert({
      email,
      data: initialData,
      step: 0,
    });

    if (error) throw error;

    res.json({ success: true, message: "User details stored successfully" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Helper function to check if step2 is complete
function isStep2Complete(data) {
  return data.Q2_part1 && data.Q2_part2 && data.Q2_part3;
}

// Helper function to check if all questions are complete
function areAllQuestionsComplete(data) {
  return data.Q1 && isStep2Complete(data);
}

// Helper function to check if record exists in MongoDB
async function checkMongoDBRecord(email) {
  try {
    const record = await UserResponse.findOne({ email });
    return !!record; // Returns true if record exists, false otherwise
  } catch (error) {
    console.error("MongoDB check error:", error);
    return false;
  }
}

// Helper function to update or create MongoDB record
async function updateMongoDBRecord(email, data) {
  try {
    const mongoData = {
      email,
      first_question: data.Q1,
      second_question: {
        Comfort: data.Q2_part1,
        Looks: data.Q2_part2,
        Price: data.Q2_part3,
      },
      updated_at: new Date(),
    };

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

// Route to handle question responses
app.post("/api/submit-question", async (req, res) => {
  try {
    const { email, questionNumber, answer, part } = req.body;

    // Get existing data from Supabase
    const { data: existingRecord, error: fetchError } = await supabase
      .from("user_responses")
      .select("data, step")
      .eq("email", email)
      .single();

    if (fetchError) throw fetchError;

    let updatedData = existingRecord.data || {
      email: email,
      Q1: null,
      Q2: null,
      Q2_part1: null,
      Q2_part2: null,
      Q2_part3: null,
      status: "in-progress",
      step: 0,
    };

    // Get current step from Supabase
    let currentStep = existingRecord.step || 0;
    let newStep = currentStep;

    // Update based on question number
    if (questionNumber === 1) {
      updatedData.Q1 = answer;
      // Only update to step 1 if we're not already at step 2
      if (currentStep < 2) {
        newStep = 1;
      }
      updatedData.step = newStep;
    } else if (questionNumber === 2) {
      const partKey = `Q2_part${part}`;
      updatedData[partKey] = answer;

      // If all parts are answered, update Q2 and step
      if (isStep2Complete(updatedData)) {
        updatedData.Q2 = `${updatedData.Q2_part1},${updatedData.Q2_part2},${updatedData.Q2_part3}`;
        updatedData.status = "success";
        newStep = 2;
        updatedData.step = newStep;
      }
    }

    // Update both data and step in Supabase
    const { data, error } = await supabase
      .from("user_responses")
      .update({
        data: updatedData,
        step: newStep,
      })
      .eq("email", email);

    if (error) throw error;

    // Check if record exists in MongoDB (indicating both questions were previously completed)
    const existsInMongoDB = await checkMongoDBRecord(email);

    // Update MongoDB if either:
    // 1. Both questions are complete for the first time
    // 2. Record already exists in MongoDB (meaning both questions were previously completed)
    if (areAllQuestionsComplete(updatedData) || existsInMongoDB) {
      await updateMongoDBRecord(email, updatedData);
    }

    res.json({
      success: true,
      message: "Response saved successfully",
      status: updatedData.status,
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
      .select("data, step")
      .eq("email", email)
      .single();
    if (error) throw error;
    res.json({
      success: true,
      data: data.data,
      step: data.step,
    });
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
