import { useEffect, useMemo, useState } from "react";
import "./App.css";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:3000/api";

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

async function apiRequest(path, options = {}) {
  const token = localStorage.getItem("authToken");
  const isFormData = options.body instanceof FormData;
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (response.status === 204) return null;

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || "Yêu cầu API thất bại");
  }

  return data;
}

async function downloadReport(path, filename) {
  const token = localStorage.getItem("authToken");
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.message || "Không thể tải báo cáo");
  }

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

function normalizeSearch(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function usePagedItems(items, pageSize = 6) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * pageSize;

  return {
    page: currentPage,
    totalPages,
    pageItems: items.slice(start, start + pageSize),
    setPage,
  };
}

function App() {
  const [auth, setAuth] = useState(() => {
    const token = localStorage.getItem("authToken");
    const user = localStorage.getItem("authUser");
    if (!token || !user) return null;

    try {
      return { token, user: JSON.parse(user) };
    } catch {
      localStorage.clear();
      return null;
    }
  });
  const [activePage, setActivePage] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [surveys, setSurveys] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [error, setError] = useState("");
  const [confirmState, setConfirmState] = useState(null);

  const navItems = useMemo(() => getNavItems(auth?.user.role), [auth]);
  const title = navItems.find((item) => item.id === activePage)?.label || "Tổng quan";

  async function loadData() {
    if (!auth) return;

    setLoading(true);
    setError("");
    try {
      const tasks = [apiRequest("/surveys"), apiRequest("/questions")];
      if (auth.user.role === "admin") tasks.push(apiRequest("/users"));
      if (["admin", "survey_creator"].includes(auth.user.role)) {
        tasks.push(apiRequest("/responses/stats"));
      }

      const [surveyRows, questionRows, third, fourth] = await Promise.all(tasks);
      setSurveys(surveyRows);
      setQuestions(questionRows);

      if (auth.user.role === "admin") {
        setUsers(third);
        setStats(fourth || null);
      } else if (auth.user.role === "survey_creator") {
        setStats(third || null);
      }
    } catch (err) {
      setError(err.message || "Không thể tải dữ liệu");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth]);

  function notify(text) {
    setToast({ type: "success", text });
    window.setTimeout(() => setToast(null), 2600);
  }

  function notifyError(text) {
    setToast({ type: "error", text });
    window.setTimeout(() => setToast(null), 3200);
  }

  function confirmAction({ title, text, confirmText = "Xóa" }) {
    return new Promise((resolve) => {
      setConfirmState({ title, text, confirmText, resolve });
    });
  }

  function closeConfirm(result) {
    confirmState?.resolve(result);
    setConfirmState(null);
  }

  function handleLogin(result) {
    localStorage.setItem("authToken", result.token);
    localStorage.setItem("authUser", JSON.stringify(result.user));
    setAuth(result);
    setActivePage("dashboard");
  }

  function handleLogout() {
    localStorage.removeItem("authToken");
    localStorage.removeItem("authUser");
    setAuth(null);
    setActivePage("dashboard");
  }

  if (!auth) return <LoginScreen onLogin={handleLogin} />;

  return (
    <div className="app-shell">
      <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="brand">
          <div className="brand-mark">KS</div>
          <div>
            <strong>EduSurvey</strong>
            <span>Khảo sát giáo dục</span>
          </div>
          <button className="icon-button close-button" onClick={() => setSidebarOpen(false)}>
            <Icon name="close" />
          </button>
        </div>

        <nav className="nav-list">
          {navItems.map((item) => (
            <button
              key={item.id}
              className={`nav-item ${activePage === item.id ? "active" : ""}`}
              onClick={() => {
                setActivePage(item.id);
                setSidebarOpen(false);
              }}
            >
              <Icon name={item.icon} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="role-box">
          <label>Tác nhân hiện tại</label>
          <strong>{auth.user.full_name}</strong>
          <p>{roleLabel(auth.user.role)}</p>
        </div>
      </aside>

      {sidebarOpen && <button className="scrim" onClick={() => setSidebarOpen(false)} />}

      <main className="main">
        <header className="topbar">
          <button className="icon-button menu-button" onClick={() => setSidebarOpen(true)}>
            <Icon name="menu" />
          </button>
          <div className="page-title">
            <span>Hệ thống khảo sát theo 3 tác nhân Use Case</span>
            <h1>{title}</h1>
          </div>
          <button className="secondary-button" onClick={loadData}>
            Tải lại
          </button>
          <button className="secondary-button" onClick={handleLogout}>
            Đăng xuất
          </button>
        </header>

        <section className="content">
          {loading && <div className="message">Đang tải dữ liệu...</div>}
          {error && <div className="message error-message">{error}</div>}

          {activePage === "dashboard" && (
            <Dashboard auth={auth} surveys={surveys} questions={questions} users={users} stats={stats} />
          )}
          {activePage === "users" && auth.user.role === "admin" && (
            <UserManager users={users} onChanged={loadData} onNotify={notify} onConfirm={confirmAction} />
          )}
          {activePage === "surveys" && ["admin", "survey_creator"].includes(auth.user.role) && (
            <SurveyManager auth={auth} surveys={surveys} questions={questions} onChanged={loadData} onNotify={notify} onConfirm={confirmAction} onError={notifyError} />
          )}
          {activePage === "questions" && ["admin", "survey_creator"].includes(auth.user.role) && (
            <QuestionManager surveys={surveys} questions={questions} onChanged={loadData} onNotify={notify} onConfirm={confirmAction} onError={notifyError} />
          )}
          {activePage === "reports" && ["admin", "survey_creator"].includes(auth.user.role) && (
            <Reports stats={stats} surveys={surveys} questions={questions} />
          )}
          {activePage === "answer" && ["student", "respondent"].includes(auth.user.role) && (
            <AnswerSurvey surveys={surveys} onChanged={loadData} onNotify={notify} />
          )}
          {activePage === "history" && ["student", "respondent"].includes(auth.user.role) && (
            <SurveyHistory />
          )}
          {activePage === "profile" && (
            <ProfilePage user={auth.user} onNotify={notify} />
          )}
          {activePage === "audit" && auth.user.role === "admin" && (
            <AuditLogs />
          )}
        </section>
      </main>
      {toast && <Toast type={toast.type} text={toast.text} onClose={() => setToast(null)} />}
      {confirmState && (
        <ConfirmDialog
          title={confirmState.title}
          text={confirmState.text}
          confirmText={confirmState.confirmText}
          onCancel={() => closeConfirm(false)}
          onConfirm={() => closeConfirm(true)}
        />
      )}
    </div>
  );
}

function LoginScreen({ onLogin }) {
  const [username, setUsername] = useState("admin@example.com");
  const [password, setPassword] = useState("123456");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const result = await apiRequest("/auth/login", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      });
      onLogin(result);
    } catch (err) {
      setError(err.message || "Không thể đăng nhập");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-panel">
        <div className="login-brand">
          <div className="brand-mark">KS</div>
          <div>
            <strong>EduSurvey</strong>
            <span>Phần mềm khảo sát lấy ý kiến trong giáo dục</span>
          </div>
        </div>
        <h1>Đăng nhập hệ thống</h1>
        <p>Admin, cán bộ khảo sát và sinh viên dùng cùng một màn hình đăng nhập.</p>
        <form className="form-grid" onSubmit={submit}>
          <label>
            Email hoặc mã sinh viên
            <input value={username} onChange={(event) => setUsername(event.target.value)} />
          </label>
          <label>
            Mật khẩu
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
          </label>
          {error && <div className="login-error">{error}</div>}
          <button className="primary-button" disabled={submitting}>
            {submitting ? "Đang đăng nhập..." : "Đăng nhập"}
          </button>
        </form>
        <div className="demo-account">
          <strong>Tài khoản mẫu</strong>
          <span>Admin: admin@example.com / 123456</span>
          <span>Cán bộ khảo sát: creator@example.com / 123456</span>
          <span>Sinh viên: 2251220277 / 01/01/2004</span>
        </div>
      </section>
    </main>
  );
}

function Dashboard({ auth, surveys, questions, users, stats }) {
  const responseCount = stats?.surveys?.reduce((sum, survey) => sum + Number(survey.response_count || 0), 0) || 0;

  return (
    <div className="screen-stack">
      <div className="metric-grid">
        <Metric icon="survey" label="Khảo sát" value={surveys.length} />
        <Metric icon="question" label="Câu hỏi" value={questions.length} />
        <Metric icon="check" label="Phản hồi" value={responseCount} />
        <Metric icon="users" label="Người dùng" value={auth.user.role === "admin" ? users.length : "-"} />
      </div>

      <Panel title="Luồng hoạt động chính">
        <div className="workflow">
          <article><Icon name="users" /><strong>Admin</strong><span>Quản lý tài khoản và phân quyền.</span></article>
          <article><Icon name="survey" /><strong>Cán bộ khảo sát</strong><span>Tạo khảo sát, câu hỏi và mở khảo sát.</span></article>
          <article><Icon name="check" /><strong>Người tham gia</strong><span>Đăng nhập, trả lời và gửi phản hồi.</span></article>
          <article><Icon name="chart" /><strong>Hệ thống</strong><span>Lưu phản hồi và thống kê kết quả.</span></article>
        </div>
      </Panel>
    </div>
  );
}

function UserManager({ users, onChanged, onNotify, onConfirm }) {
  const [form, setForm] = useState(emptyUser);
  const [editingId, setEditingId] = useState(null);
  const [keyword, setKeyword] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [importFile, setImportFile] = useState(null);
  const [importResult, setImportResult] = useState(null);
  const [isImporting, setIsImporting] = useState(false);
  const filteredUsers = users.filter((user) => {
    const haystack = normalizeSearch(`${user.full_name} ${user.email} ${user.student_code} ${user.class_name}`);
    const matchesKeyword = haystack.includes(normalizeSearch(keyword));
    const matchesRole = roleFilter === "all" || user.role === roleFilter;
    return matchesKeyword && matchesRole;
  });
  const userPages = usePagedItems(filteredUsers, 8);

  function edit(user) {
    setEditingId(user.id);
    setForm({ ...emptyUser, ...user, password: "" });
  }

  async function submit(event) {
    event.preventDefault();
    const payload = { ...form };
    if (editingId && !payload.password) delete payload.password;

    await apiRequest(editingId ? `/users/${editingId}` : "/users", {
      method: editingId ? "PUT" : "POST",
      body: JSON.stringify(payload),
    });

    setForm(emptyUser);
    setEditingId(null);
    onNotify(editingId ? "Đã cập nhật người dùng." : "Đã tạo người dùng.");
    onChanged();
  }

  async function remove(user) {
    const confirmed = await onConfirm({
      title: "Xóa người dùng",
      text: `Bạn có chắc muốn xóa "${user.full_name}"?`,
    });
    if (!confirmed) return;
    await apiRequest(`/users/${user.id}`, { method: "DELETE" });
    onNotify("Đã xóa người dùng.");
    onChanged();
  }

  async function importStudents(event) {
    event.preventDefault();
    if (!importFile) return;

    const formData = new FormData();
    formData.append("file", importFile);
    setIsImporting(true);
    setImportResult(null);

    try {
      const result = await apiRequest("/users/import-students", {
        method: "POST",
        body: formData,
      });
      setImportResult(result);
      setImportFile(null);
      event.target.reset();
      onNotify(`Đã import ${result.imported_count} sinh viên.`);
      onChanged();
    } finally {
      setIsImporting(false);
    }
  }

  function downloadExcelTemplate() {
    const rows = [
      ["Mã sinh viên", "Họ", "Tên", "Lớp", "Ngày sinh"],
      ["2251220277", "Trương Phi", "Hoàng", "22CT4", "01/01/2004"],
      ["2251220149", "Lê Vũ", "Hoàng", "22CT1", "09/08/2004"],
    ];
    const csv = `\uFEFF${rows.map((row) => row.join(",")).join("\n")}`;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "mau-import-sinh-vien.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  }

  return (
    <div className="crud-grid">
      <div className="screen-stack">
        <Panel title="Import sinh viên từ Excel">
          <form className="import-box" onSubmit={importStudents}>
            <label>
              File .xlsx hoặc .xls
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={(event) => setImportFile(event.target.files?.[0] || null)}
              />
            </label>
            <div className="import-hint">
              <strong>Cột hỗ trợ</strong>
              <span>Mã sinh viên, Họ, Tên, Lớp, Ngày sinh. Có thể dùng Họ tên thay cho Họ/Tên.</span>
              <span>Mã sinh viên là tên đăng nhập, ngày sinh là mật khẩu, role mặc định là student.</span>
            </div>
            <div className="form-actions">
              <button className="secondary-button" type="button" onClick={downloadExcelTemplate}>
                Tải file mẫu
              </button>
              <button className="primary-button" disabled={!importFile || isImporting}>
                {isImporting ? "Đang import..." : "Import sinh viên"}
              </button>
            </div>
          </form>
          {importResult && (
            <div className="import-result">
              <span>Tổng dòng: <strong>{importResult.total_rows}</strong></span>
              <span>Tạo mới: <strong>{importResult.created}</strong></span>
              <span>Cập nhật: <strong>{importResult.updated}</strong></span>
              <span>Bỏ qua: <strong>{importResult.skipped}</strong></span>
            </div>
          )}
        </Panel>

        <Panel title={editingId ? "Cập nhật người dùng" : "Thêm người dùng"}>
          <form className="form-grid" onSubmit={submit}>
            <label>Họ tên<input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required /></label>
            <div className="field-row">
              <label>Mã sinh viên<input value={form.student_code || ""} onChange={(e) => setForm({ ...form, student_code: e.target.value })} /></label>
              <label>Lớp<input value={form.class_name || ""} onChange={(e) => setForm({ ...form, class_name: e.target.value })} /></label>
            </div>
            <label>Email<input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></label>
            <label>Mật khẩu<input type="password" value={form.password || ""} onChange={(e) => setForm({ ...form, password: e.target.value })} required={!editingId} /></label>
            <div className="field-row">
              <label>Vai trò
                <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                  <option value="admin">Admin</option>
                  <option value="survey_creator">Cán bộ khảo sát</option>
                  <option value="student">Sinh viên</option>
                  <option value="respondent">Người tham gia</option>
                </select>
              </label>
              <label>Trạng thái
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  <option value="active">Hoạt động</option>
                  <option value="locked">Khóa</option>
                </select>
              </label>
            </div>
            <div className="form-actions">
              <button className="primary-button">{editingId ? "Lưu cập nhật" : "Thêm người dùng"}</button>
              {editingId && <button type="button" className="secondary-button" onClick={() => { setEditingId(null); setForm(emptyUser); }}>Hủy</button>}
            </div>
          </form>
        </Panel>
      </div>

      <Panel title="Danh sách người dùng">
        <div className="list-toolbar">
          <input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="Tìm theo tên, email, mã sinh viên"
          />
          <select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)}>
            <option value="all">Tất cả vai trò</option>
            <option value="admin">Admin</option>
            <option value="survey_creator">Cán bộ khảo sát</option>
            <option value="student">Sinh viên</option>
            <option value="respondent">Người tham gia</option>
          </select>
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Họ tên</th><th>Tài khoản</th><th>Vai trò</th><th>Trạng thái</th><th></th></tr></thead>
            <tbody>
              {userPages.pageItems.map((user) => (
                <tr key={user.id}>
                  <td>{user.full_name}<br /><small>{user.class_name || ""}</small></td>
                  <td>{user.student_code || user.email}</td>
                  <td>{roleLabel(user.role)}</td>
                  <td>{statusLabel(user.status)}</td>
                  <td className="row-actions">
                    <button className="secondary-button small" onClick={() => edit(user)}>Sửa</button>
                    <button className="danger-button small" onClick={() => remove(user)}>Xóa</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredUsers.length === 0 && <EmptyState text="Không tìm thấy người dùng phù hợp." />}
        <Pagination page={userPages.page} totalPages={userPages.totalPages} onPageChange={userPages.setPage} />
      </Panel>
    </div>
  );
}

function SurveyManager({ auth, surveys, questions, onChanged, onNotify, onConfirm, onError }) {
  const [form, setForm] = useState(emptySurvey);
  const [editingId, setEditingId] = useState(null);
  const [keyword, setKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const filteredSurveys = surveys.filter((survey) => {
    const haystack = normalizeSearch(`${survey.title} ${survey.description} ${survey.creator_name}`);
    const matchesKeyword = haystack.includes(normalizeSearch(keyword));
    const matchesStatus = statusFilter === "all" || survey.status === statusFilter;
    return matchesKeyword && matchesStatus;
  });
  const surveyPages = usePagedItems(filteredSurveys, 5);

  function edit(survey) {
    setEditingId(survey.id);
    setForm({
      title: survey.title || "",
      description: survey.description || "",
      target_group: survey.target_group || "student",
      start_date: formatDate(survey.start_date),
      end_date: formatDate(survey.end_date),
      status: survey.status || "draft",
    });
  }

  async function submit(event) {
    event.preventDefault();
    if (form.start_date && form.end_date && form.end_date < form.start_date) {
      onError("Ngày kết thúc không được nhỏ hơn ngày bắt đầu.");
      return;
    }
    if (form.status === "published" && editingId) {
      const questionCount = questions.filter((question) => Number(question.survey_id) === Number(editingId)).length;
      if (questionCount === 0) {
        onError("Khảo sát phải có ít nhất 1 câu hỏi trước khi mở.");
        return;
      }
    }
    const payload = {
      ...form,
      creator_id: auth.user.id,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
    };

    await apiRequest(editingId ? `/surveys/${editingId}` : "/surveys", {
      method: editingId ? "PUT" : "POST",
      body: JSON.stringify(payload),
    });

    setForm(emptySurvey);
    setEditingId(null);
    onNotify(editingId ? "Đã cập nhật khảo sát." : "Đã tạo khảo sát.");
    onChanged();
  }

  async function remove(survey) {
    const confirmed = await onConfirm({
      title: "Xóa khảo sát",
      text: `Bạn có chắc muốn xóa khảo sát "${survey.title}"? Toàn bộ câu hỏi và phản hồi liên quan cũng sẽ bị xóa.`,
    });
    if (!confirmed) return;
    await apiRequest(`/surveys/${survey.id}`, { method: "DELETE" });
    onNotify("Đã xóa khảo sát.");
    onChanged();
  }

  return (
    <div className="crud-grid">
      <Panel title={editingId ? "Cập nhật khảo sát" : "Tạo khảo sát"}>
        <form className="form-grid" onSubmit={submit}>
          <label>Tên khảo sát<input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required /></label>
          <label>Mô tả<textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
          <div className="field-row">
            <label>Đối tượng
              <select value={form.target_group} onChange={(e) => setForm({ ...form, target_group: e.target.value })}>
                <option value="student">Sinh viên</option>
                <option value="lecturer">Giảng viên</option>
                <option value="alumni">Cựu sinh viên</option>
                <option value="employer">Nhà tuyển dụng</option>
                <option value="all">Tất cả</option>
              </select>
            </label>
            <label>Trạng thái
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option value="draft">Bản nháp</option>
                <option value="published">Đang mở</option>
                <option value="closed">Đã đóng</option>
              </select>
            </label>
          </div>
          <div className="field-row">
            <label>Ngày bắt đầu<input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} /></label>
            <label>Ngày kết thúc<input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} /></label>
          </div>
          <div className="form-actions">
            <button className="primary-button">{editingId ? "Lưu cập nhật" : "Tạo khảo sát"}</button>
            {editingId && <button type="button" className="secondary-button" onClick={() => { setEditingId(null); setForm(emptySurvey); }}>Hủy</button>}
          </div>
        </form>
      </Panel>

      <Panel title="Danh sách khảo sát">
        <div className="list-toolbar">
          <input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="Tìm khảo sát"
          />
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="all">Tất cả trạng thái</option>
            <option value="draft">Bản nháp</option>
            <option value="published">Đang mở</option>
            <option value="closed">Đã đóng</option>
          </select>
        </div>
        <div className="survey-list">
          {surveyPages.pageItems.map((survey) => (
            <SurveyCard key={survey.id} survey={survey}>
              <button className="secondary-button small" onClick={() => edit(survey)}>Sửa</button>
              <button className="danger-button small" onClick={() => remove(survey)}>Xóa</button>
            </SurveyCard>
          ))}
          {filteredSurveys.length === 0 && <EmptyState text="Chưa có khảo sát phù hợp." />}
        </div>
        <Pagination page={surveyPages.page} totalPages={surveyPages.totalPages} onPageChange={surveyPages.setPage} />
      </Panel>
    </div>
  );
}

function QuestionManager({ surveys, questions, onChanged, onNotify, onConfirm, onError }) {
  const [form, setForm] = useState(emptyQuestion);
  const [editingId, setEditingId] = useState(null);
  const [keyword, setKeyword] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const selectedSurveyId = form.survey_id || (surveys[0]?.id ? String(surveys[0].id) : "");
  const filteredQuestions = questions.filter((question) => {
    const haystack = normalizeSearch(`${question.content} ${question.survey_title}`);
    const matchesKeyword = haystack.includes(normalizeSearch(keyword));
    const matchesType = typeFilter === "all" || question.question_type === typeFilter;
    return matchesKeyword && matchesType;
  });
  const questionPages = usePagedItems(filteredQuestions, 6);
  const hasChoices = ["single_choice", "multiple_choice"].includes(form.question_type);

  async function edit(question) {
    const detail = await apiRequest(`/questions/${question.id}`);
    setEditingId(detail.id);
    setForm({
      survey_id: String(detail.survey_id),
      content: detail.content,
      question_type: detail.question_type,
      is_required: Boolean(detail.is_required),
      sort_order: detail.sort_order || 0,
      options: detail.options?.length ? detail.options.map((option) => option.option_text) : ["", ""],
    });
  }

  function updateQuestionType(questionType) {
    setForm({
      ...form,
      question_type: questionType,
      options: ["single_choice", "multiple_choice"].includes(questionType) ? form.options : ["", ""],
    });
  }

  function updateOption(index, value) {
    setForm({
      ...form,
      options: form.options.map((option, optionIndex) => (optionIndex === index ? value : option)),
    });
  }

  function addOption() {
    setForm({ ...form, options: [...form.options, ""] });
  }

  function removeOption(index) {
    setForm({
      ...form,
      options: form.options.length > 2 ? form.options.filter((_, optionIndex) => optionIndex !== index) : form.options,
    });
  }

  async function submit(event) {
    event.preventDefault();
    const cleanOptions = form.options.map((line) => line.trim()).filter(Boolean);
    if (hasChoices && cleanOptions.length < 2) {
      onError("Câu hỏi lựa chọn phải có ít nhất 2 phương án.");
      return;
    }
    const payload = {
      survey_id: Number(selectedSurveyId),
      content: form.content,
      question_type: form.question_type,
      is_required: form.is_required,
      sort_order: Number(form.sort_order || 0),
      options: hasChoices ? cleanOptions : [],
    };

    await apiRequest(editingId ? `/questions/${editingId}` : "/questions", {
      method: editingId ? "PUT" : "POST",
      body: JSON.stringify(payload),
    });

    setForm(emptyQuestion);
    setEditingId(null);
    onNotify(editingId ? "Đã cập nhật câu hỏi." : "Đã thêm câu hỏi.");
    onChanged();
  }

  async function remove(question) {
    const confirmed = await onConfirm({
      title: "Xóa câu hỏi",
      text: "Bạn có chắc muốn xóa câu hỏi này?",
    });
    if (!confirmed) return;
    await apiRequest(`/questions/${question.id}`, { method: "DELETE" });
    onNotify("Đã xóa câu hỏi.");
    onChanged();
  }

  return (
    <div className="crud-grid">
      <Panel title={editingId ? "Cập nhật câu hỏi" : "Thêm câu hỏi"}>
        <form className="form-grid" onSubmit={submit}>
          <label>Khảo sát
            <select value={selectedSurveyId} onChange={(e) => setForm({ ...form, survey_id: e.target.value })} required>
              <option value="">Chọn khảo sát</option>
              {surveys.map((survey) => <option key={survey.id} value={survey.id}>{survey.title}</option>)}
            </select>
          </label>
          <label>Nội dung câu hỏi<textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} required /></label>
          <div className="field-row">
            <label>Loại câu hỏi
              <select value={form.question_type} onChange={(e) => updateQuestionType(e.target.value)}>
                <option value="text">Tự luận</option>
                <option value="rating">Thang điểm</option>
                <option value="single_choice">Một lựa chọn</option>
                <option value="multiple_choice">Nhiều lựa chọn</option>
              </select>
            </label>
            <label>Thứ tự<input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: e.target.value })} /></label>
          </div>
          <QuestionTypePreview type={form.question_type} />
          {hasChoices && (
            <div className="choice-editor">
              <div className="choice-editor-title">
                <strong>Phương án trả lời</strong>
                <span>{form.question_type === "single_choice" ? "Người trả lời chọn một đáp án." : "Người trả lời có thể chọn nhiều đáp án."}</span>
              </div>
              {form.options.map((option, index) => (
                <div className="choice-row" key={index}>
                  <span className="choice-marker">{form.question_type === "single_choice" ? "○" : "□"}</span>
                  <input
                    value={option}
                    onChange={(event) => updateOption(index, event.target.value)}
                    placeholder={`Lựa chọn ${index + 1}`}
                  />
                  <button
                    className="icon-button"
                    type="button"
                    onClick={() => removeOption(index)}
                    disabled={form.options.length <= 2}
                    aria-label="Xóa lựa chọn"
                  >
                    <Icon name="close" />
                  </button>
                </div>
              ))}
              <button className="secondary-button" type="button" onClick={addOption}>
                Thêm lựa chọn
              </button>
            </div>
          )}
          <label className="inline-check"><input type="checkbox" checked={form.is_required} onChange={(e) => setForm({ ...form, is_required: e.target.checked })} />Bắt buộc trả lời</label>
          <div className="form-actions">
            <button className="primary-button" disabled={surveys.length === 0}>{editingId ? "Lưu cập nhật" : "Thêm câu hỏi"}</button>
            {editingId && <button type="button" className="secondary-button" onClick={() => { setEditingId(null); setForm(emptyQuestion); }}>Hủy</button>}
          </div>
        </form>
      </Panel>

      <Panel title="Danh sách câu hỏi">
        <div className="list-toolbar">
          <input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="Tìm nội dung câu hỏi"
          />
          <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
            <option value="all">Tất cả loại câu hỏi</option>
            <option value="text">Tự luận</option>
            <option value="rating">Thang điểm</option>
            <option value="single_choice">Một lựa chọn</option>
            <option value="multiple_choice">Nhiều lựa chọn</option>
          </select>
        </div>
        <div className="question-list">
          {questionPages.pageItems.map((question, index) => (
            <article className="question-card" key={question.id}>
              <div className="question-index">{(questionPages.page - 1) * 6 + index + 1}</div>
              <div>
                <div className="card-meta">
                  <span className="code">{questionTypeLabel(question.question_type)}</span>
                  {question.is_required ? <span className="status">Bắt buộc</span> : null}
                </div>
                <h3>{question.content}</h3>
                <p>Khảo sát: {question.survey_title}</p>
                <div className="row-actions">
                  <button className="secondary-button small" onClick={() => edit(question)}>Sửa</button>
                  <button className="danger-button small" onClick={() => remove(question)}>Xóa</button>
                </div>
              </div>
            </article>
          ))}
          {filteredQuestions.length === 0 && <EmptyState text="Chưa có câu hỏi phù hợp." />}
        </div>
        <Pagination page={questionPages.page} totalPages={questionPages.totalPages} onPageChange={questionPages.setPage} />
      </Panel>
    </div>
  );
}

function AnswerSurvey({ surveys, onChanged, onNotify }) {
  const openSurveys = surveys.filter((survey) => survey.status === "published");
  const [surveyId, setSurveyId] = useState("");
  const [surveyForm, setSurveyForm] = useState(null);
  const [answers, setAnswers] = useState({});
  const [keyword, setKeyword] = useState("");
  const filteredOpenSurveys = openSurveys.filter((survey) =>
    normalizeSearch(`${survey.title} ${survey.description}`).includes(normalizeSearch(keyword)),
  );
  const openSurveyPages = usePagedItems(filteredOpenSurveys, 5);

  async function loadSurvey(id) {
    setSurveyId(id);
    setAnswers({});
    setSurveyForm(id ? await apiRequest(`/surveys/${id}/form`) : null);
  }

  function setAnswer(question, value) {
    setAnswers({ ...answers, [question.id]: value });
  }

  async function submit(event) {
    event.preventDefault();
    const payload = {
      survey_id: Number(surveyId),
      answers: surveyForm.questions.map((question) => {
        const value = answers[question.id];
        if (question.question_type === "multiple_choice") {
          return { question_id: question.id, option_ids: value || [] };
        }
        if (question.question_type === "single_choice") {
          return { question_id: question.id, option_id: value || null };
        }
        if (question.question_type === "rating") {
          return { question_id: question.id, rating_value: value || null };
        }
        return { question_id: question.id, answer_text: value || "" };
      }),
    };

    await apiRequest("/responses", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    setSurveyForm(null);
    setSurveyId("");
    setAnswers({});
    onNotify("Đã gửi phản hồi khảo sát.");
    onChanged();
  }

  return (
    <div className="response-grid">
      <Panel title="Chọn khảo sát đang mở">
        <div className="list-toolbar single">
          <input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="Tìm khảo sát cần trả lời"
          />
        </div>
        <div className="survey-list">
          {openSurveyPages.pageItems.map((survey) => (
            <SurveyCard key={survey.id} survey={survey}>
              {survey.is_completed ? <span className="status">Đã hoàn thành</span> : null}
              <button
                className="primary-button small"
                onClick={() => loadSurvey(survey.id)}
                disabled={Boolean(survey.is_completed)}
              >
                {survey.is_completed ? "Đã nộp" : "Trả lời"}
              </button>
            </SurveyCard>
          ))}
          {filteredOpenSurveys.length === 0 && <EmptyState text="Hiện chưa có khảo sát đang mở." />}
        </div>
        <Pagination page={openSurveyPages.page} totalPages={openSurveyPages.totalPages} onPageChange={openSurveyPages.setPage} />
      </Panel>

      <Panel title="Phiếu trả lời">
        {!surveyForm && <EmptyState text="Chọn một khảo sát để bắt đầu trả lời." />}
        {surveyForm && (
          <form className="response-form" onSubmit={submit}>
            <h2>{surveyForm.title}</h2>
            <p>{surveyForm.description}</p>
            {surveyForm.questions.map((question, index) => (
              <fieldset key={question.id}>
                <legend>{index + 1}. {question.content}</legend>
                {question.question_type === "text" && (
                  <textarea required={Boolean(question.is_required)} value={answers[question.id] || ""} onChange={(e) => setAnswer(question, e.target.value)} />
                )}
                {question.question_type === "rating" && (
                  <select required={Boolean(question.is_required)} value={answers[question.id] || ""} onChange={(e) => setAnswer(question, e.target.value)}>
                    <option value="">Chọn điểm</option>
                    {[1, 2, 3, 4, 5].map((value) => <option key={value} value={value}>{value}</option>)}
                  </select>
                )}
                {question.question_type === "single_choice" && question.options.map((option) => (
                  <label key={option.id}>
                    <input type="radio" name={`q-${question.id}`} value={option.id} required={Boolean(question.is_required)} onChange={() => setAnswer(question, option.id)} />
                    {option.option_text}
                  </label>
                ))}
                {question.question_type === "multiple_choice" && question.options.map((option) => {
                  const current = answers[question.id] || [];
                  return (
                    <label key={option.id}>
                      <input
                        type="checkbox"
                        checked={current.includes(option.id)}
                        onChange={(e) => {
                          setAnswer(question, e.target.checked ? [...current, option.id] : current.filter((id) => id !== option.id));
                        }}
                      />
                      {option.option_text}
                    </label>
                  );
                })}
              </fieldset>
            ))}
            <button className="primary-button">Gửi phản hồi</button>
          </form>
        )}
      </Panel>
    </div>
  );
}

function SurveyHistory() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState("");

  useEffect(() => {
    let ignore = false;
    async function loadHistory() {
      setLoading(true);
      try {
        const rows = await apiRequest("/responses/my-history");
        if (!ignore) setHistory(rows);
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    loadHistory();
    return () => {
      ignore = true;
    };
  }, []);

  const filteredHistory = history.filter((survey) =>
    normalizeSearch(`${survey.title} ${survey.status}`).includes(normalizeSearch(keyword)),
  );
  const pages = usePagedItems(filteredHistory, 8);

  return (
    <Panel title="Lịch sử khảo sát">
      <div className="list-toolbar single">
        <input
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
          placeholder="Tìm khảo sát"
        />
      </div>
      {loading && <div className="message">Đang tải lịch sử...</div>}
      <div className="survey-list">
        {pages.pageItems.map((survey) => (
          <SurveyCard key={survey.id} survey={survey}>
            {survey.is_completed ? (
              <>
                <span className="status">Đã hoàn thành</span>
                <span className="muted-text">{formatDate(survey.submitted_at)}</span>
              </>
            ) : (
              <span className="status draft">Chưa hoàn thành</span>
            )}
          </SurveyCard>
        ))}
      </div>
      {!loading && filteredHistory.length === 0 && <EmptyState text="Chưa có lịch sử khảo sát." />}
      <Pagination page={pages.page} totalPages={pages.totalPages} onPageChange={pages.setPage} />
    </Panel>
  );
}

function ProfilePage({ user, onNotify }) {
  const [form, setForm] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setError("");
    if (form.new_password !== form.confirm_password) {
      setError("Mật khẩu mới không khớp.");
      return;
    }

    setSubmitting(true);
    try {
      await apiRequest("/auth/change-password", {
        method: "PUT",
        body: JSON.stringify({
          current_password: form.current_password,
          new_password: form.new_password,
        }),
      });
      setForm({ current_password: "", new_password: "", confirm_password: "" });
      onNotify("Đã đổi mật khẩu.");
    } catch (err) {
      setError(err.message || "Không thể đổi mật khẩu");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="crud-grid">
      <Panel title="Thông tin tài khoản">
        <div className="profile-list">
          <InfoCard icon="users" title="Họ tên" text={user.full_name} />
          <InfoCard icon="report" title="Vai trò" text={roleLabel(user.role)} />
          <InfoCard icon="survey" title="Tài khoản" text={user.student_code || user.email} />
          <InfoCard icon="question" title="Lớp" text={user.class_name || "Chưa cập nhật"} />
        </div>
      </Panel>
      <Panel title="Đổi mật khẩu">
        <form className="form-grid" onSubmit={submit}>
          <label>
            Mật khẩu hiện tại
            <input
              type="password"
              value={form.current_password}
              onChange={(event) => setForm({ ...form, current_password: event.target.value })}
              required
            />
          </label>
          <label>
            Mật khẩu mới
            <input
              type="password"
              value={form.new_password}
              minLength="6"
              onChange={(event) => setForm({ ...form, new_password: event.target.value })}
              required
            />
          </label>
          <label>
            Nhập lại mật khẩu mới
            <input
              type="password"
              value={form.confirm_password}
              minLength="6"
              onChange={(event) => setForm({ ...form, confirm_password: event.target.value })}
              required
            />
          </label>
          {error && <div className="message error-message">{error}</div>}
          <button className="primary-button" disabled={submitting}>
            {submitting ? "Đang lưu..." : "Đổi mật khẩu"}
          </button>
        </form>
      </Panel>
    </div>
  );
}

function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState("");

  useEffect(() => {
    let ignore = false;
    async function loadLogs() {
      setLoading(true);
      try {
        const rows = await apiRequest("/audit-logs");
        if (!ignore) setLogs(rows);
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    loadLogs();
    return () => {
      ignore = true;
    };
  }, []);

  const filteredLogs = logs.filter((log) =>
    normalizeSearch(`${log.actor_name} ${log.action} ${log.entity_type} ${log.description}`).includes(normalizeSearch(keyword)),
  );
  const pages = usePagedItems(filteredLogs, 10);

  return (
    <Panel title="Nhật ký thao tác quản trị">
      <div className="list-toolbar single">
        <input
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
          placeholder="Tìm theo người thao tác, hành động, đối tượng"
        />
      </div>
      {loading && <div className="message">Đang tải nhật ký...</div>}
      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>Thời gian</th><th>Người thao tác</th><th>Hành động</th><th>Đối tượng</th><th>Mô tả</th></tr>
          </thead>
          <tbody>
            {pages.pageItems.map((log) => (
              <tr key={log.id}>
                <td>{new Date(log.created_at).toLocaleString("vi-VN")}</td>
                <td>{log.actor_name || "Không xác định"}</td>
                <td>{log.action}</td>
                <td>{log.entity_type} #{log.entity_id || ""}</td>
                <td>{log.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!loading && filteredLogs.length === 0 && <EmptyState text="Chưa có nhật ký thao tác." />}
      <Pagination page={pages.page} totalPages={pages.totalPages} onPageChange={pages.setPage} />
    </Panel>
  );
}

function Reports({ stats, surveys, questions }) {
  const surveyStats = stats?.surveys || [];
  const [keyword, setKeyword] = useState("");
  const [exporting, setExporting] = useState("");
  const [selectedSurveyId, setSelectedSurveyId] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const filteredStats = surveyStats.filter((survey) =>
    normalizeSearch(`${survey.title} ${survey.target_group} ${survey.status}`).includes(normalizeSearch(keyword)),
  );
  const reportPages = usePagedItems(filteredStats, 8);
  const totalResponses = surveyStats.reduce((sum, item) => sum + Number(item.response_count || 0), 0);
  const activeSurveyId = selectedSurveyId;
  const classOptions = Array.from(
    new Set(
      [
        ...(detail?.completed_students || []),
        ...(detail?.incomplete_students || []),
      ]
        .map((student) => student.class_name)
        .filter(Boolean),
    ),
  ).sort();

  useEffect(() => {
    if (!activeSurveyId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDetail(null);
      return;
    }

    let ignore = false;
    async function loadDetail() {
      setDetailLoading(true);
      try {
        const query = classFilter ? `?class_name=${encodeURIComponent(classFilter)}` : "";
        const data = await apiRequest(`/responses/stats/${activeSurveyId}${query}`);
        if (!ignore) setDetail(data);
      } finally {
        if (!ignore) setDetailLoading(false);
      }
    }

    loadDetail();
    return () => {
      ignore = true;
    };
  }, [activeSurveyId, classFilter]);

  async function exportExcel() {
    setExporting("excel");
    try {
      await downloadReport("/responses/stats/export.xlsx", "bao-cao-thong-ke-khao-sat.xlsx");
    } finally {
      setExporting("");
    }
  }

  function exportPdf() {
    setExporting("pdf");
    const reportWindow = window.open("", "_blank", "width=980,height=720");
    if (!reportWindow) {
      setExporting("");
      return;
    }

    const rows = filteredStats.map((survey) => `
      <tr>
        <td>${escapeHtml(survey.title)}</td>
        <td>${escapeHtml(groupLabel(survey.target_group))}</td>
        <td>${survey.question_count}</td>
        <td>${survey.response_count}</td>
        <td>${escapeHtml(statusLabel(survey.status))}</td>
      </tr>
    `).join("");

    reportWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Báo cáo thống kê khảo sát</title>
          <style>
            body { font-family: Arial, sans-serif; color: #20242c; margin: 32px; }
            h1 { margin: 0 0 6px; font-size: 24px; }
            .muted { color: #666; margin-bottom: 22px; }
            .metrics { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 22px; }
            .metric { border: 1px solid #ddd; border-radius: 8px; padding: 12px; }
            .metric span { display: block; color: #666; font-size: 12px; }
            .metric strong { font-size: 24px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #ddd; padding: 9px 10px; text-align: left; font-size: 13px; }
            th { background: #f3f3f3; }
            @media print { button { display: none; } body { margin: 20px; } }
          </style>
        </head>
        <body>
          <button onclick="window.print()">Lưu/In PDF</button>
          <h1>Báo cáo thống kê khảo sát</h1>
          <div class="muted">Ngày xuất: ${new Date().toLocaleString("vi-VN")}</div>
          <div class="metrics">
            <div class="metric"><span>Khảo sát</span><strong>${surveys.length}</strong></div>
            <div class="metric"><span>Câu hỏi</span><strong>${questions.length}</strong></div>
            <div class="metric"><span>Phản hồi</span><strong>${totalResponses}</strong></div>
            <div class="metric"><span>Đang mở</span><strong>${surveys.filter((survey) => survey.status === "published").length}</strong></div>
          </div>
          <table>
            <thead>
              <tr><th>Khảo sát</th><th>Đối tượng</th><th>Câu hỏi</th><th>Phản hồi</th><th>Trạng thái</th></tr>
            </thead>
            <tbody>${rows || '<tr><td colspan="5">Không có dữ liệu</td></tr>'}</tbody>
          </table>
        </body>
      </html>
    `);
    reportWindow.document.close();
    reportWindow.focus();
    setExporting("");
  }

  async function exportSurveyExcel() {
    if (!activeSurveyId) return;
    setExporting("survey-excel");
    try {
      await downloadReport(
        `/responses/stats/${activeSurveyId}/export.xlsx${classFilter ? `?class_name=${encodeURIComponent(classFilter)}` : ""}`,
        classFilter
          ? `bao-cao-chi-tiet-khao-sat-${activeSurveyId}-${classFilter}.xlsx`
          : `bao-cao-chi-tiet-khao-sat-${activeSurveyId}.xlsx`,
      );
    } finally {
      setExporting("");
    }
  }

  function exportSurveyPdf() {
    if (!detail) return;

    setExporting("survey-pdf");
    const reportWindow = window.open("", "_blank", "width=1080,height=760");
    if (!reportWindow) {
      setExporting("");
      return;
    }

    const incompleteRows = detail.incomplete_students.slice(0, 200).map((student) => `
      <tr>
        <td>${escapeHtml(student.student_code)}</td>
        <td>${escapeHtml(student.full_name)}</td>
        <td>${escapeHtml(student.class_name || "")}</td>
      </tr>
    `).join("");
    const answerRows = detail.answers.slice(0, 500).map((answer) => `
      <tr>
        <td>${escapeHtml(answer.student_code)}</td>
        <td>${escapeHtml(answer.full_name)}</td>
        <td>${escapeHtml(answer.question_content)}</td>
        <td>${escapeHtml(answer.option_text || answer.answer_text || answer.rating_value || "")}</td>
      </tr>
    `).join("");

    reportWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Báo cáo chi tiết khảo sát</title>
          <style>
            body { font-family: Arial, sans-serif; color: #20242c; margin: 32px; }
            h1 { margin: 0 0 6px; font-size: 24px; }
            h2 { margin-top: 24px; font-size: 18px; }
            .muted { color: #666; margin-bottom: 22px; }
            .metrics { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 22px; }
            .metric { border: 1px solid #ddd; border-radius: 8px; padding: 12px; }
            .metric span { display: block; color: #666; font-size: 12px; }
            .metric strong { font-size: 24px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { border: 1px solid #ddd; padding: 8px 9px; text-align: left; font-size: 12px; vertical-align: top; }
            th { background: #f3f3f3; }
            @media print { button { display: none; } body { margin: 20px; } }
          </style>
        </head>
        <body>
          <button onclick="window.print()">Lưu/In PDF</button>
          <h1>Báo cáo chi tiết khảo sát</h1>
          <div class="muted">${escapeHtml(detail.survey.title)} | Ngày xuất: ${new Date().toLocaleString("vi-VN")}</div>
          <div class="metrics">
            <div class="metric"><span>Tổng sinh viên</span><strong>${detail.summary.total_students}</strong></div>
            <div class="metric"><span>Đã hoàn thành</span><strong>${detail.summary.completed_students}</strong></div>
            <div class="metric"><span>Chưa hoàn thành</span><strong>${detail.summary.incomplete_students}</strong></div>
            <div class="metric"><span>Câu hỏi</span><strong>${detail.summary.question_count}</strong></div>
          </div>
          <h2>Sinh viên chưa hoàn thành</h2>
          <table>
            <thead><tr><th>Mã sinh viên</th><th>Họ tên</th><th>Lớp</th></tr></thead>
            <tbody>${incompleteRows || '<tr><td colspan="3">Không có sinh viên chưa hoàn thành</td></tr>'}</tbody>
          </table>
          <h2>Câu trả lời chi tiết</h2>
          <table>
            <thead><tr><th>Mã sinh viên</th><th>Họ tên</th><th>Câu hỏi</th><th>Câu trả lời</th></tr></thead>
            <tbody>${answerRows || '<tr><td colspan="4">Chưa có câu trả lời</td></tr>'}</tbody>
          </table>
        </body>
      </html>
    `);
    reportWindow.document.close();
    reportWindow.focus();
    setExporting("");
  }

  if (selectedSurveyId) {
    return (
      <div className="screen-stack">
        <div className="detail-page-header">
          <button className="secondary-button" onClick={() => { setSelectedSurveyId(""); setClassFilter(""); }}>
            Quay lại thống kê
          </button>
          <div>
            <span>Chi tiết khảo sát</span>
            <h2>{detail?.survey?.title || "Đang tải khảo sát..."}</h2>
          </div>
          <div className="report-actions">
            <select value={classFilter} onChange={(event) => setClassFilter(event.target.value)}>
              <option value="">Tất cả lớp</option>
              {classOptions.map((className) => (
                <option key={className} value={className}>
                  {className}
                </option>
              ))}
              {classFilter && !classOptions.includes(classFilter) && (
                <option value={classFilter}>{classFilter}</option>
              )}
            </select>
            <button className="secondary-button" onClick={exportSurveyPdf} disabled={!detail || Boolean(exporting)}>
              Xuất PDF chi tiết
            </button>
            <button className="primary-button" onClick={exportSurveyExcel} disabled={!activeSurveyId || Boolean(exporting)}>
              {exporting === "survey-excel" ? "Đang xuất..." : "Xuất Excel chi tiết"}
            </button>
          </div>
        </div>

        {detailLoading && <div className="message">Đang tải chi tiết khảo sát...</div>}
        {!detailLoading && detail && (
          <>
            <div className="metric-grid compact">
              <Metric icon="users" label="Tổng sinh viên" value={detail.summary.total_students} />
              <Metric icon="check" label="Đã hoàn thành" value={detail.summary.completed_students} />
              <Metric icon="chart" label="Chưa hoàn thành" value={detail.summary.incomplete_students} />
              <Metric icon="question" label="Câu hỏi" value={detail.summary.question_count} />
            </div>
            <Panel title="Tỷ lệ hoàn thành">
              <CompletionBar
                completed={detail.summary.completed_students}
                total={detail.summary.total_students}
              />
            </Panel>

            <div className="detail-grid">
              <Panel title="Sinh viên chưa hoàn thành">
                <div className="table-wrap">
                  <table className="compact-table">
                    <thead><tr><th>Mã sinh viên</th><th>Họ tên</th><th>Lớp</th></tr></thead>
                    <tbody>
                      {detail.incomplete_students.slice(0, 12).map((student) => (
                        <tr key={student.id}>
                          <td>{student.student_code}</td>
                          <td>{student.full_name}</td>
                          <td>{student.class_name || ""}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {detail.incomplete_students.length === 0 && <EmptyState text="Tất cả sinh viên đã hoàn thành khảo sát." />}
              </Panel>

              <Panel title="Thống kê lựa chọn">
                <div className="table-wrap">
                  <table className="compact-table">
                    <thead><tr><th>Câu hỏi</th><th>Phương án</th><th>Lượt chọn</th></tr></thead>
                    <tbody>
                      {detail.choice_summary.slice(0, 12).map((item) => (
                        <tr key={`${item.question_id}-${item.option_id}`}>
                          <td>{item.content}</td>
                          <td>{item.option_text}</td>
                          <td>{item.selected_count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {detail.choice_summary.length === 0 && <EmptyState text="Khảo sát chưa có câu hỏi lựa chọn." />}
              </Panel>
            </div>
            <Panel title="Kết quả từng câu hỏi">
              <div className="question-result-list">
                {detail.questions.map((question) => {
                  const choiceItems = detail.choice_summary.filter((item) => Number(item.question_id) === Number(question.id));
                  const ratingItem = detail.rating_summary.find((item) => Number(item.question_id) === Number(question.id));
                  const textAnswers = detail.answers.filter(
                    (answer) => Number(answer.question_id) === Number(question.id) && answer.answer_text,
                  );
                  const totalChoiceCount = choiceItems.reduce((sum, item) => sum + Number(item.selected_count || 0), 0);

                  return (
                    <article className="question-result-card" key={question.id}>
                      <div className="card-meta">
                        <span className="code">{questionTypeLabel(question.question_type)}</span>
                        {question.is_required ? <span className="status">Bắt buộc</span> : null}
                      </div>
                      <h3>{question.content}</h3>
                      {choiceItems.length > 0 && (
                        <div className="chart-list compact">
                          {choiceItems.map((item) => {
                            const percent = totalChoiceCount ? Math.round((Number(item.selected_count || 0) / totalChoiceCount) * 100) : 0;
                            return (
                              <div className="chart-row" key={item.option_id}>
                                <span>{item.option_text}</span>
                                <div className="chart-track"><i style={{ width: `${percent}%` }} /></div>
                                <b>{percent}%</b>
                              </div>
                            );
                          })}
                        </div>
                      )}
                      {question.question_type === "rating" && (
                        <div className="rating-summary">
                          <strong>{ratingItem?.average_rating ? Number(ratingItem.average_rating).toFixed(2) : "0.00"}</strong>
                          <span>Điểm trung bình từ {ratingItem?.rating_count || 0} lượt đánh giá</span>
                        </div>
                      )}
                      {question.question_type === "text" && (
                        <div className="text-answer-list">
                          {textAnswers.slice(0, 5).map((answer) => (
                            <blockquote key={`${answer.response_id}-${answer.question_id}`}>
                              {answer.answer_text}
                              <span>{answer.full_name}</span>
                            </blockquote>
                          ))}
                          {textAnswers.length === 0 && <EmptyState text="Chưa có câu trả lời tự luận." />}
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            </Panel>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="screen-stack">
      <div className="metric-grid">
        <Metric icon="survey" label="Khảo sát" value={surveys.length} />
        <Metric icon="question" label="Câu hỏi" value={questions.length} />
        <Metric icon="check" label="Phản hồi" value={totalResponses} />
        <Metric icon="chart" label="Đang mở" value={surveys.filter((survey) => survey.status === "published").length} />
      </div>
      <Panel title="Thống kê phản hồi theo khảo sát">
        <div className="report-toolbar">
          <input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="Tìm khảo sát trong thống kê"
          />
          <div className="report-actions">
            <button className="secondary-button" onClick={exportPdf} disabled={Boolean(exporting)}>
              Xuất PDF
            </button>
            <button className="primary-button" onClick={exportExcel} disabled={Boolean(exporting)}>
              {exporting === "excel" ? "Đang xuất..." : "Xuất Excel"}
            </button>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Khảo sát</th><th>Đối tượng</th><th>Câu hỏi</th><th>Phản hồi</th><th>Trạng thái</th><th></th></tr></thead>
            <tbody>
              {reportPages.pageItems.map((survey) => (
                <tr key={survey.id}>
                  <td>{survey.title}</td>
                  <td>{groupLabel(survey.target_group)}</td>
                  <td>{survey.question_count}</td>
                  <td>{survey.response_count}</td>
                  <td>{statusLabel(survey.status)}</td>
                  <td>
                    <button className="secondary-button small" onClick={() => { setClassFilter(""); setSelectedSurveyId(String(survey.id)); }}>
                      Chi tiết
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredStats.length === 0 && <EmptyState text="Chưa có dữ liệu thống kê phù hợp." />}
        <Pagination page={reportPages.page} totalPages={reportPages.totalPages} onPageChange={reportPages.setPage} />
      </Panel>
      <Panel title="Biểu đồ phản hồi">
        <div className="chart-list">
          {surveyStats.slice(0, 8).map((survey) => {
            const totalStudents = Number(survey.total_students || 0);
            const responseCount = Number(survey.response_count || 0);
            const percent = totalStudents ? Math.round((responseCount / totalStudents) * 100) : 0;
            return (
              <div className="chart-row" key={survey.id}>
                <span>{survey.title}</span>
                <div className="chart-track">
                  <i style={{ width: `${Math.min(percent, 100)}%` }} />
                </div>
                <b>{responseCount}</b>
              </div>
            );
          })}
        </div>
      </Panel>
    </div>
  );
}

function SurveyCard({ survey, children }) {
  return (
    <article className="survey-card">
      <div>
        <div className="card-meta">
          <span className="code">#{survey.id}</span>
          <span className={`status ${survey.status === "draft" ? "draft" : ""}`}>{statusLabel(survey.status)}</span>
        </div>
        <h2>{survey.title}</h2>
        <p>Đối tượng: {groupLabel(survey.target_group)} | Người tạo: {survey.creator_name || survey.creator_id}</p>
        <p>{formatDate(survey.start_date) || "Chưa có ngày bắt đầu"} - {formatDate(survey.end_date) || "Chưa có ngày kết thúc"}</p>
      </div>
      {children && <div className="survey-actions">{children}</div>}
    </article>
  );
}

function InfoCard({ icon, title, text }) {
  return (
    <article className="info-card">
      <Icon name={icon} />
      <div>
        <strong>{title}</strong>
        <span>{text}</span>
      </div>
    </article>
  );
}

function Metric({ icon, label, value }) {
  return (
    <article className="metric-card">
      <Icon name={icon} />
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function Panel({ title, children }) {
  return (
    <section className="panel">
      <div className="panel-header"><h2>{title}</h2></div>
      {children}
    </section>
  );
}

function CompletionBar({ completed, total }) {
  const percent = total ? Math.round((Number(completed) / Number(total)) * 100) : 0;
  return (
    <div className="completion-box">
      <div className="completion-head">
        <strong>{percent}%</strong>
        <span>{completed}/{total} sinh viên đã hoàn thành</span>
      </div>
      <div className="completion-track">
        <i style={{ width: `${Math.min(percent, 100)}%` }} />
      </div>
    </div>
  );
}

function QuestionTypePreview({ type }) {
  const previews = {
    text: {
      title: "Câu trả lời ngắn hoặc đoạn văn",
      text: "Dùng cho góp ý, nhận xét hoặc câu hỏi cần người học tự nhập nội dung.",
    },
    rating: {
      title: "Thang điểm 1 đến 5",
      text: "Phù hợp với mức độ hài lòng, đánh giá chất lượng hoặc mức đồng ý.",
    },
    single_choice: {
      title: "Trắc nghiệm một đáp án",
      text: "Dùng khi người trả lời chỉ được chọn một phương án.",
    },
    multiple_choice: {
      title: "Hộp kiểm nhiều đáp án",
      text: "Dùng khi người trả lời có thể chọn nhiều phương án cùng lúc.",
    },
  };
  const preview = previews[type] || previews.text;

  return (
    <div className="question-type-preview">
      <strong>{preview.title}</strong>
      <span>{preview.text}</span>
    </div>
  );
}

function Pagination({ page, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;

  return (
    <div className="pagination">
      <button
        className="secondary-button small"
        disabled={page === 1}
        onClick={() => onPageChange(page - 1)}
      >
        Trước
      </button>
      <span>Trang {page} / {totalPages}</span>
      <button
        className="secondary-button small"
        disabled={page === totalPages}
        onClick={() => onPageChange(page + 1)}
      >
        Sau
      </button>
    </div>
  );
}

function EmptyState({ text }) {
  return <div className="empty-state">{text}</div>;
}

function Toast({ type, text, onClose }) {
  return (
    <div className={`toast ${type === "error" ? "error" : "success"}`}>
      <span>{text}</span>
      <button onClick={onClose} aria-label="Đóng thông báo">×</button>
    </div>
  );
}

function ConfirmDialog({ title, text, confirmText, onCancel, onConfirm }) {
  return (
    <div className="modal-backdrop">
      <section className="confirm-modal">
        <h2>{title}</h2>
        <p>{text}</p>
        <div className="form-actions">
          <button className="secondary-button" onClick={onCancel}>Hủy</button>
          <button className="danger-button" onClick={onConfirm}>{confirmText}</button>
        </div>
      </section>
    </div>
  );
}

function Icon({ name }) {
  const paths = {
    dashboard: <path d="M4 5h7v7H4zM13 5h7v4h-7zM13 11h7v8h-7zM4 14h7v5H4z" />,
    survey: <path d="M7 3h10l3 3v15H4V3h3zm9 1v4h4M8 10h8M8 14h8M8 18h5" />,
    check: <path d="m4 12 5 5L20 6" />,
    users: <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />,
    chart: <path d="M4 19V5M4 19h16M8 16V9M12 16V7M16 16v-4" />,
    question: <path d="M9 9a3 3 0 1 1 5 2.24c-1.2.8-2 1.24-2 2.76M12 18h.01" />,
    menu: <path d="M4 7h16M4 12h16M4 17h16" />,
    close: <path d="M6 6l12 12M18 6 6 18" />,
  };

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <g fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        {paths[name] || paths.dashboard}
      </g>
    </svg>
  );
}

export default App;
