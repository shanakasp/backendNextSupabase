const mongoose = require("mongoose");
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Connect to MongoDB
const connectMongoDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");
  } catch (err) {
    console.error("MongoDB connection error:", err);
  }
};

module.exports = {
  supabase,
  connectMongoDB,
};
