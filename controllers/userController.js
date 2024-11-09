const UserResponse = require("../models/userResponse.mode");
const { supabase } = require("../db/db");

const submitEmail = async (req, res) => {
  try {
    const { email } = req.body;

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
};

const submitQuestion = async (req, res) => {
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
      updatedData.Q1 = answer;
      newStep = 3; // Move to Step 3 (Q2)
    } else if (questionNumber === 2) {
      const q2Key = `Q2_part${part}`;
      updatedData[q2Key] = answer;

      const allPartsAnswered = ["Q2_part1", "Q2_part2", "Q2_part3"].every(
        (key) => updatedData[key] !== undefined
      );

      if (allPartsAnswered) {
        updatedData.Q2 = [
          updatedData.Q2_part1,
          updatedData.Q2_part2,
          updatedData.Q2_part3,
        ].join(",");
        newStep = 4; // Complete
      }
    }

    const { data, error } = await supabase
      .from("user_responses")
      .update({
        data: updatedData,
        step: newStep,
      })
      .eq("email", email);

    if (error) throw error;

    // If all questions are answered, store in MongoDB
    if (newStep === 4) {
      const mongoData = {
        email,
        first_question: updatedData.Q1,
        second_question: updatedData.Q2,
      };

      const userResponse = new UserResponse(mongoData);
      await userResponse.save();
    }

    res.json({
      success: true,
      message:
        newStep === 4
          ? "All responses saved to MongoDB"
          : "Response saved to Supabase",
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const getProgress = async (req, res) => {
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
};

module.exports = { submitEmail, submitQuestion, getProgress };
