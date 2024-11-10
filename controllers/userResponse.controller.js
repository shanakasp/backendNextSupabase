const { supabase } = require("../config/database");
const { isStep2Complete, areAllQuestionsComplete } = require("../utils/helper");
const {
  checkMongoDBRecord,
  updateMongoDBRecord,
} = require("../services/mongodb.service");

const submitEmail = async (req, res) => {
  try {
    const { email } = req.body;

    const initialData = {
      email: email,
      Q1: null,
      Q2: null,
      Q2_part1: null,
      Q2_part2: null,
      Q2_part3: null,
      status: "in-progress",
      step: 0,
    };

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
};

const submitQuestion = async (req, res) => {
  try {
    const { email, questionNumber, answer, part } = req.body;

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

    let currentStep = existingRecord.step || 0;
    let newStep = currentStep;

    if (questionNumber === 1) {
      updatedData.Q1 = answer;
      if (currentStep < 2) {
        newStep = 1;
      }
      updatedData.step = newStep;
    } else if (questionNumber === 2) {
      const partKey = `Q2_part${part}`;
      updatedData[partKey] = answer;

      if (isStep2Complete(updatedData)) {
        updatedData.Q2 = `${updatedData.Q2_part1},${updatedData.Q2_part2},${updatedData.Q2_part3}`;
        updatedData.status = "success";
        newStep = 2;
        updatedData.step = newStep;
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

    const existsInMongoDB = await checkMongoDBRecord(email);

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
};

const getProgress = async (req, res) => {
  try {
    const { email } = req.params;
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
};

module.exports = {
  submitEmail,
  submitQuestion,
  getProgress,
};
