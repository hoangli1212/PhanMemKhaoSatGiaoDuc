const emptyUser = {
  full_name: "",
  student_code: "",
  class_name: "",
  email: "",
  password: "",
  role: "student",
  stakeholder_group: "student",
  status: "active",
};

const emptySurvey = {
  title: "",
  description: "",
  target_group: "student",
  start_date: "",
  end_date: "",
  status: "draft",
};

const emptyQuestion = {
  survey_id: "",
  content: "",
  question_type: "text",
  is_required: true,
  sort_order: 0,
  options: ["", ""],
};

export { emptyUser, emptySurvey, emptyQuestion };
