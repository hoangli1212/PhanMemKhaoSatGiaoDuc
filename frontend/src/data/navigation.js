function getNavItems(role) {
  if (role === "admin") {
    return [
      { id: "dashboard", label: "Tổng quan", icon: "dashboard" },
      { id: "users", label: "Người dùng", icon: "users" },
      { id: "surveys", label: "Khảo sát", icon: "survey" },
      { id: "questions", label: "Câu hỏi", icon: "question" },
      { id: "reports", label: "Thống kê", icon: "chart" },
      { id: "audit", label: "Nhật ký", icon: "report" },
    ];
  }

  if (role === "survey_creator") {
    return [
      { id: "dashboard", label: "Tổng quan", icon: "dashboard" },
      { id: "surveys", label: "Khảo sát", icon: "survey" },
      { id: "questions", label: "Câu hỏi", icon: "question" },
      { id: "reports", label: "Thống kê", icon: "chart" },
    ];
  }

  return [
    { id: "dashboard", label: "Tổng quan", icon: "dashboard" },
    { id: "answer", label: "Trả lời khảo sát", icon: "check" },
    { id: "history", label: "Lịch sử", icon: "report" },
    { id: "profile", label: "Tài khoản", icon: "users" },
  ];
}

export { getNavItems };
