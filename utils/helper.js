const isStep2Complete = (data) => {
  return data.Q2_part1 && data.Q2_part2 && data.Q2_part3;
};

const areAllQuestionsComplete = (data) => {
  return data.Q1 && isStep2Complete(data);
};

module.exports = {
  isStep2Complete,
  areAllQuestionsComplete,
};
