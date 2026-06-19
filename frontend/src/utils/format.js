function roleLabel(role) {
  return {
    admin: "Admin / Quản trị viên",
    survey_creator: "Cán bộ khảo sát",
    respondent: "Người tham gia khảo sát",
    student: "Sinh viên",
  }[role] || role;
}

function statusLabel(status) {
  return {
    draft: "Bản nháp",
    published: "Đang mở",
    closed: "Đã đóng",
    active: "Hoạt động",
    locked: "Đã khóa",
  }[status] || status;
}

function groupLabel(group) {
  return {
    all: "Tất cả",
    student: "Sinh viên",
    lecturer: "Giảng viên",
    alumni: "Cựu sinh viên",
    employer: "Nhà tuyển dụng",
    staff: "Nhân viên",
  }[group] || group;
}

function questionTypeLabel(type) {
  return {
    text: "Tự luận",
    rating: "Thang điểm",
    single_choice: "Một lựa chọn",
    multiple_choice: "Nhiều lựa chọn",
  }[type] || type;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatDate(value) {
  return value ? String(value).slice(0, 10) : "";
}

function normalizeSearch(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export { roleLabel, statusLabel, groupLabel, questionTypeLabel, escapeHtml, formatDate, normalizeSearch };
