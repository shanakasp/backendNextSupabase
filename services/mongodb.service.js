const UserResponse = require("../models/userResponse");

const checkMongoDBRecord = async (email) => {
  try {
    const record = await UserResponse.findOne({ email });
    return !!record;
  } catch (error) {
    console.error("MongoDB check error:", error);
    return false;
  }
};

const updateMongoDBRecord = async (email, data) => {
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
};

module.exports = {
  checkMongoDBRecord,
  updateMongoDBRecord,
};
