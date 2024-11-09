const UserResponse = require("../models/userResponse.mode");
const { supabase } = require("../config/db.config");

const responseController = {
  // Submit email
  submitEmail: async (req, res) => {
    try {
      const { email } = req.body;

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
  },

  // Submit question
  submitQuestion: async (req, res) => {
    try {
      const { email, questionNumber, answer } = req.body;

      // Get existing data from Supabase
      const { data: existingData, error: fetchError } = await supabase
        .from("user_responses")
        .select("data, step")
        .eq("email", email)
        .single();

      if (fetchError) throw fetchError;

      // If the questionNumber is 4, check if Q2 and Q3 have been answered
      if (questionNumber === 4) {
        if (!existingData.data.Q2 || !existingData.data.Q3) {
          return res.status(400).json({
            success: false,
            message:
              "Please answer Question 2 and Question 3 before submitting Question 4.",
          });
        }
      }

      // Update data with new answer
      const updatedData = {
        ...existingData.data,
        [`Q${questionNumber}`]: answer,
      };

      const newStep = questionNumber + 1;

      // Update Supabase with the new data
      const { data, error } = await supabase
        .from("user_responses")
        .update({
          data: updatedData,
          step: newStep,
        })
        .eq("email", email);

      if (error) throw error;

      // If all questions are answered, store in MongoDB
      if (newStep > 4) {
        const mongoData = {
          email,
          first_question: updatedData.Q1,
          second_question: updatedData.Q2,
          third_question: updatedData.Q3,
          fourth_question: updatedData.Q4,
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
          newStep > 4
            ? "All responses saved to MongoDB"
            : "Response saved to Supabase",
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // Get progress
  getProgress: async (req, res) => {
    try {
      const { email } = req.params;

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
  },
};

module.exports = responseController;
