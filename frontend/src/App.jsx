import { useEffect, useMemo, useState } from "react";
import "./App.css";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:3000/api";

const navItems = [
  { id: "dashboard", label: "Tổng quan", icon: "dashboard" },
  { id: "surveys", label: "Khảo sát", icon: "survey" },
  { id: "questions", label: "Câu hỏi", icon: "question" },
  { id: "reports", label: "Thống kê", icon: "chart" },
];

const emptySurveyForm = {
  title: "",
  description: "",
  target_group: "all",
  start_date: "",
  end_date: "",
  status: "draft",
};

const emptyQuestionForm = {
  survey_id: "",
  content: "",
  question_type: "text",
  is_required: true,
  sort_order: 0,
  optionsText: "",
};

function formatDateInput(value) {
  if (!value) return "";
  return String(value).slice(0, 10);
}

async function apiRequest(path, options = {}) {
  const token = localStorage.getItem("authToken");
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
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

function App() {
  const [activePage, setActivePage] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [auth, setAuth] = useState(() => {
    const token = localStorage.getItem("authToken");
    const user = localStorage.getItem("authUser");
    if (!token || !user) return null;

    try {
      return { token, user: JSON.parse(user) };
    } catch {
      localStorage.removeItem("authToken");
      localStorage.removeItem("authUser");
      return null;
    }
  });

  const [surveys, setSurveys] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const title = useMemo(() => {
    return navItems.find((item) => item.id === activePage)?.label || "Tổng quan";
  }, [activePage]);

  const loadData = async () => {
    if (!auth) return;

    setIsLoading(true);
    setError("");

    try {
      const [surveyRows, questionRows] = await Promise.all([
        apiRequest("/surveys"),
        apiRequest("/questions"),
      ]);
      setSurveys(surveyRows);
      setQuestions(questionRows);
    } catch (err) {
      setError(err.message || "Không thể tải dữ liệu");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Data must be loaded after login or page refresh with stored auth.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth]);

  const goTo = (page) => {
    setActivePage(page);
    setSidebarOpen(false);
  };

  const handleLogin = (loginResult) => {
    localStorage.setItem("authToken", loginResult.token);
    localStorage.setItem("authUser", JSON.stringify(loginResult.user));
    setAuth(loginResult);
  };

  const handleLogout = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("authUser");
    setAuth(null);
    setActivePage("dashboard");
    setSidebarOpen(false);
  };

  const notify = (text) => {
    setMessage(text);
    window.setTimeout(() => setMessage(""), 2500);
  };

  if (!auth) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="brand">
          <div className="brand-mark">KS</div>
          <div>
            <strong>EduSurvey</strong>
            <span>Hệ thống khảo sát giáo dục</span>
          </div>
          <button
            className="icon-button close-button"
            onClick={() => setSidebarOpen(false)}
            aria-label="Đóng menu"
          >
            <Icon name="close" />
          </button>
        </div>

        <nav className="nav-list" aria-label="Điều hướng chính">
          {navItems.map((item) => (
            <button
              key={item.id}
              className={`nav-item ${activePage === item.id ? "active" : ""}`}
              onClick={() => goTo(item.id)}
            >
              <Icon name={item.icon} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="role-box">
          <label>Người dùng</label>
          <strong>{auth.user.full_name}</strong>
          <p>{auth.user.role}</p>
        </div>
      </aside>

      {sidebarOpen && (
        <button
          className="scrim"
          onClick={() => setSidebarOpen(false)}
          aria-label="Đóng menu"
        />
      )}

      <main className="main">
        <header className="topbar">
          <button
            className="icon-button menu-button"
            onClick={() => setSidebarOpen(true)}
            aria-label="Mở menu"
          >
            <Icon name="menu" />
          </button>
          <div className="page-title">
            <span>Phần mềm khảo sát lấy ý kiến các bên liên quan</span>
            <h1>{title}</h1>
          </div>
          <button className="secondary-button" onClick={loadData}>
            Tải lại dữ liệu
          </button>
          <button className="primary-button" onClick={() => goTo("surveys")}>
            <Icon name="plus" />
            Tạo khảo sát
          </button>
          <div className="account-box">
            <span>{auth.user.full_name}</span>
            <button className="secondary-button small" onClick={handleLogout}>
              Đăng xuất
            </button>
          </div>
        </header>

        <section className="content">
          {error && <div className="message error-message">{error}</div>}
          {message && <div className="message success-message">{message}</div>}
          {isLoading && <div className="message">Đang tải dữ liệu...</div>}

          {activePage === "dashboard" && (
            <Dashboard surveys={surveys} questions={questions} onNavigate={goTo} />
          )}
          {activePage === "surveys" && (
            <SurveyCrud
              auth={auth}
              surveys={surveys}
              onChanged={loadData}
              onNotify={notify}
            />
          )}
          {activePage === "questions" && (
            <QuestionCrud
              surveys={surveys}
              questions={questions}
              onChanged={loadData}
              onNotify={notify}
            />
          )}
          {activePage === "reports" && (
            <Reports surveys={surveys} questions={questions} />
          )}
        </section>
      </main>
    </div>
  );
}

function LoginScreen({ onLogin }) {
  const [username, setUsername] = useState("admin@example.com");
  const [password, setPassword] = useState("123456");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const data = await apiRequest("/auth/login", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      });
      onLogin(data);
    } catch (err) {
      setError(err.message || "Không thể đăng nhập");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="login-page">
      <section className="login-panel">
        <div className="login-brand">
          <div className="brand-mark">KS</div>
          <div>
            <strong>EduSurvey</strong>
            <span>Hệ thống khảo sát giáo dục</span>
          </div>
        </div>

        <div className="login-copy">
          <h1>Đăng nhập hệ thống</h1>
          <p>Nhập email hoặc mã sinh viên để truy cập hệ thống.</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <label>
            Tên đăng nhập hoặc email
            <input
              type="text"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="username"
              required
            />
          </label>

          <label>
            Mật khẩu
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              required
            />
          </label>

          {error && <div className="login-error">{error}</div>}

          <button className="primary-button" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Đang đăng nhập..." : "Đăng nhập"}
          </button>
        </form>

        <div className="demo-account">
          <strong>Tài khoản mẫu</strong>
          <span>admin@example.com / 123456</span>
          <span>creator@example.com / 123456</span>
          <span>2251220277 / 01/01/2004</span>
        </div>
      </section>
    </main>
  );
}

function Dashboard({ surveys, questions, onNavigate }) {
  const publishedSurveys = surveys.filter((survey) => survey.status === "published");
  const closedSurveys = surveys.filter((survey) => survey.status === "closed");

  return (
    <div className="screen-stack">
      <div className="metric-grid">
        <Metric icon="survey" label="Tổng khảo sát" value={surveys.length} note="Dữ liệu từ bảng surveys" />
        <Metric icon="check" label="Đang mở" value={publishedSurveys.length} note="status = published" />
        <Metric icon="question" label="Câu hỏi" value={questions.length} note="Dữ liệu từ bảng questions" />
        <Metric icon="report" label="Đã đóng" value={closedSurveys.length} note="status = closed" />
      </div>

      <div className="grid-2">
        <Panel title="Khảo sát mới nhất" action="Quản lý" onAction={() => onNavigate("surveys")}>
          <div className="survey-list">
            {surveys.slice(0, 4).map((survey) => (
              <SurveyCard key={survey.id} survey={survey} />
            ))}
            {surveys.length === 0 && <EmptyState text="Chưa có khảo sát trong database." />}
          </div>
        </Panel>

        <Panel title="Câu hỏi theo loại">
          <div className="bar-list">
            {["text", "rating", "single_choice", "multiple_choice"].map((type) => {
              const count = questions.filter((question) => question.question_type === type).length;
              const percent = questions.length ? Math.round((count / questions.length) * 100) : 0;
              return (
                <div className="bar-row" key={type}>
                  <span>{questionTypeLabel(type)}</span>
                  <div><i style={{ width: `${percent}%` }} /></div>
                  <b>{count}</b>
                </div>
              );
            })}
          </div>
        </Panel>
      </div>
    </div>
  );
}

function SurveyCrud({ auth, surveys, onChanged, onNotify }) {
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptySurveyForm);
  const isEditing = Boolean(editingId);

  const resetForm = () => {
    setEditingId(null);
    setForm(emptySurveyForm);
  };

  const editSurvey = (survey) => {
    setEditingId(survey.id);
    setForm({
      title: survey.title || "",
      description: survey.description || "",
      target_group: survey.target_group || "all",
      start_date: formatDateInput(survey.start_date),
      end_date: formatDateInput(survey.end_date),
      status: survey.status || "draft",
    });
  };

  const submitSurvey = async (event) => {
    event.preventDefault();
    const payload = {
      ...form,
      creator_id: auth.user.id,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
    };

    if (isEditing) {
      await apiRequest(`/surveys/${editingId}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      onNotify("Đã cập nhật khảo sát.");
    } else {
      await apiRequest("/surveys", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      onNotify("Đã tạo khảo sát.");
    }

    resetForm();
    onChanged();
  };

  const deleteSurvey = async (survey) => {
    if (!window.confirm(`Xóa khảo sát "${survey.title}"?`)) return;
    await apiRequest(`/surveys/${survey.id}`, { method: "DELETE" });
    onNotify("Đã xóa khảo sát.");
    if (editingId === survey.id) resetForm();
    onChanged();
  };

  return (
    <div className="crud-grid">
      <Panel title={isEditing ? "Cập nhật khảo sát" : "Tạo khảo sát"}>
        <form className="form-grid" onSubmit={submitSurvey}>
          <label>
            Tên khảo sát
            <input
              value={form.title}
              onChange={(event) => setForm({ ...form, title: event.target.value })}
              required
            />
          </label>
          <label>
            Mô tả
            <textarea
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
            />
          </label>
          <div className="field-row">
            <label>
              Nhóm đối tượng
              <select
                value={form.target_group}
                onChange={(event) => setForm({ ...form, target_group: event.target.value })}
              >
                <option value="all">Tất cả</option>
                <option value="student">Sinh viên</option>
                <option value="lecturer">Giảng viên</option>
                <option value="alumni">Cựu sinh viên</option>
                <option value="employer">Nhà tuyển dụng</option>
              </select>
            </label>
            <label>
              Trạng thái
              <select
                value={form.status}
                onChange={(event) => setForm({ ...form, status: event.target.value })}
              >
                <option value="draft">Bản nháp</option>
                <option value="published">Đang mở</option>
                <option value="closed">Đã đóng</option>
              </select>
            </label>
          </div>
          <div className="field-row">
            <label>
              Ngày bắt đầu
              <input
                type="date"
                value={form.start_date}
                onChange={(event) => setForm({ ...form, start_date: event.target.value })}
              />
            </label>
            <label>
              Ngày kết thúc
              <input
                type="date"
                value={form.end_date}
                onChange={(event) => setForm({ ...form, end_date: event.target.value })}
              />
            </label>
          </div>
          <div className="form-actions">
            <button className="primary-button" type="submit">
              {isEditing ? "Lưu cập nhật" : "Tạo khảo sát"}
            </button>
            {isEditing && (
              <button className="secondary-button" type="button" onClick={resetForm}>
                Hủy
              </button>
            )}
          </div>
        </form>
      </Panel>

      <Panel title="Danh sách khảo sát">
        <div className="survey-list">
          {surveys.map((survey) => (
            <SurveyCard
              key={survey.id}
              survey={survey}
              actions={
                <>
                  <button className="secondary-button small" onClick={() => editSurvey(survey)}>
                    Sửa
                  </button>
                  <button className="danger-button small" onClick={() => deleteSurvey(survey)}>
                    Xóa
                  </button>
                </>
              }
            />
          ))}
          {surveys.length === 0 && <EmptyState text="Chưa có khảo sát. Hãy tạo khảo sát đầu tiên." />}
        </div>
      </Panel>
    </div>
  );
}

function QuestionCrud({ surveys, questions, onChanged, onNotify }) {
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyQuestionForm);
  const isEditing = Boolean(editingId);
  const selectedSurveyId = form.survey_id || (surveys[0]?.id ? String(surveys[0].id) : "");

  const resetForm = () => {
    setEditingId(null);
    setForm({
      ...emptyQuestionForm,
      survey_id: surveys[0]?.id ? String(surveys[0].id) : "",
    });
  };

  const editQuestion = async (question) => {
    const detail = await apiRequest(`/questions/${question.id}`);
    setEditingId(detail.id);
    setForm({
      survey_id: String(detail.survey_id),
      content: detail.content || "",
      question_type: detail.question_type || "text",
      is_required: Boolean(detail.is_required),
      sort_order: detail.sort_order || 0,
      optionsText: (detail.options || []).map((option) => option.option_text).join("\n"),
    });
  };

  const submitQuestion = async (event) => {
    event.preventDefault();
    const options = form.optionsText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    const payload = {
      survey_id: Number(selectedSurveyId),
      content: form.content,
      question_type: form.question_type,
      is_required: form.is_required,
      sort_order: Number(form.sort_order || 0),
      options,
    };

    if (isEditing) {
      await apiRequest(`/questions/${editingId}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      onNotify("Đã cập nhật câu hỏi.");
    } else {
      await apiRequest("/questions", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      onNotify("Đã tạo câu hỏi.");
    }

    resetForm();
    onChanged();
  };

  const deleteQuestion = async (question) => {
    if (!window.confirm("Xóa câu hỏi này?")) return;
    await apiRequest(`/questions/${question.id}`, { method: "DELETE" });
    onNotify("Đã xóa câu hỏi.");
    if (editingId === question.id) resetForm();
    onChanged();
  };

  return (
    <div className="crud-grid">
      <Panel title={isEditing ? "Cập nhật câu hỏi" : "Thêm câu hỏi"}>
        <form className="form-grid" onSubmit={submitQuestion}>
          <label>
            Khảo sát
            <select
              value={selectedSurveyId}
              onChange={(event) => setForm({ ...form, survey_id: event.target.value })}
              required
            >
              <option value="">Chọn khảo sát</option>
              {surveys.map((survey) => (
                <option key={survey.id} value={survey.id}>
                  {survey.title}
                </option>
              ))}
            </select>
          </label>
          <label>
            Nội dung câu hỏi
            <textarea
              value={form.content}
              onChange={(event) => setForm({ ...form, content: event.target.value })}
              required
            />
          </label>
          <div className="field-row">
            <label>
              Loại câu hỏi
              <select
                value={form.question_type}
                onChange={(event) => setForm({ ...form, question_type: event.target.value })}
              >
                <option value="text">Tự luận</option>
                <option value="rating">Thang điểm</option>
                <option value="single_choice">Một lựa chọn</option>
                <option value="multiple_choice">Nhiều lựa chọn</option>
              </select>
            </label>
            <label>
              Thứ tự
              <input
                type="number"
                min="0"
                value={form.sort_order}
                onChange={(event) => setForm({ ...form, sort_order: event.target.value })}
              />
            </label>
          </div>
          <label>
            Phương án trả lời
            <textarea
              value={form.optionsText}
              onChange={(event) => setForm({ ...form, optionsText: event.target.value })}
              placeholder="Mỗi dòng là một phương án. Chỉ cần nhập cho câu hỏi lựa chọn."
            />
          </label>
          <label className="inline-check">
            <input
              type="checkbox"
              checked={form.is_required}
              onChange={(event) => setForm({ ...form, is_required: event.target.checked })}
            />
            Bắt buộc trả lời
          </label>
          <div className="form-actions">
            <button className="primary-button" type="submit" disabled={surveys.length === 0}>
              {isEditing ? "Lưu cập nhật" : "Thêm câu hỏi"}
            </button>
            {isEditing && (
              <button className="secondary-button" type="button" onClick={resetForm}>
                Hủy
              </button>
            )}
          </div>
        </form>
      </Panel>

      <Panel title="Danh sách câu hỏi">
        <div className="question-list">
          {questions.map((question, index) => (
            <article className="question-card" key={question.id}>
              <div className="question-index">{index + 1}</div>
              <div>
                <div className="card-meta">
                  <span className="code">{questionTypeLabel(question.question_type)}</span>
                  {Boolean(question.is_required) && <span className="status">Bắt buộc</span>}
                </div>
                <h3>{question.content}</h3>
                <p>Khảo sát: {question.survey_title}</p>
                <div className="row-actions">
                  <button className="secondary-button small" onClick={() => editQuestion(question)}>
                    Sửa
                  </button>
                  <button className="danger-button small" onClick={() => deleteQuestion(question)}>
                    Xóa
                  </button>
                </div>
              </div>
            </article>
          ))}
          {questions.length === 0 && <EmptyState text="Chưa có câu hỏi trong database." />}
        </div>
      </Panel>
    </div>
  );
}

function Reports({ surveys, questions }) {
  const statusCounts = {
    draft: surveys.filter((survey) => survey.status === "draft").length,
    published: surveys.filter((survey) => survey.status === "published").length,
    closed: surveys.filter((survey) => survey.status === "closed").length,
  };

  return (
    <div className="grid-2 report-grid">
      <Panel title="Thống kê khảo sát">
        <div className="bar-list">
          {Object.entries(statusCounts).map(([status, count]) => {
            const percent = surveys.length ? Math.round((count / surveys.length) * 100) : 0;
            return (
              <div className="bar-row" key={status}>
                <span>{surveyStatusLabel(status)}</span>
                <div><i style={{ width: `${percent}%` }} /></div>
                <b>{count}</b>
              </div>
            );
          })}
        </div>
      </Panel>

      <Panel title="Kết quả dữ liệu">
        <div className="output-list">
          <InfoCard icon="survey" title="Khảo sát" text={`${surveys.length} bản ghi từ bảng surveys`} />
          <InfoCard icon="question" title="Câu hỏi" text={`${questions.length} bản ghi từ bảng questions`} />
          <InfoCard icon="chart" title="Nguồn dữ liệu" text="Frontend đang đọc trực tiếp từ API backend Express." />
        </div>
      </Panel>
    </div>
  );
}

function SurveyCard({ survey, actions }) {
  return (
    <article className="survey-card">
      <div>
        <div className="card-meta">
          <span className="code">#{survey.id}</span>
          <span className={`status ${survey.status === "draft" ? "draft" : ""}`}>
            {surveyStatusLabel(survey.status)}
          </span>
        </div>
        <h2>{survey.title}</h2>
        <p>
          Đối tượng: {targetGroupLabel(survey.target_group)} • Người tạo:{" "}
          {survey.creator_name || survey.creator_id}
        </p>
        <p>
          {formatDateInput(survey.start_date) || "Chưa có ngày bắt đầu"} →{" "}
          {formatDateInput(survey.end_date) || "Chưa có ngày kết thúc"}
        </p>
      </div>
      {actions && <div className="survey-actions">{actions}</div>}
    </article>
  );
}

function Metric({ icon, label, value, note }) {
  return (
    <article className="metric-card">
      <Icon name={icon} />
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{note}</small>
    </article>
  );
}

function Panel({ title, action, onAction, children }) {
  return (
    <section className="panel">
      <div className="panel-header">
        <h2>{title}</h2>
        {action && (
          <button className="secondary-button" onClick={onAction}>
            <Icon name="plus" />
            {action}
          </button>
        )}
      </div>
      {children}
    </section>
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

function EmptyState({ text }) {
  return <div className="empty-state">{text}</div>;
}

function surveyStatusLabel(status) {
  return {
    draft: "Bản nháp",
    published: "Đang mở",
    closed: "Đã đóng",
  }[status] || status;
}

function targetGroupLabel(group) {
  return {
    all: "Tất cả",
    student: "Sinh viên",
    lecturer: "Giảng viên",
    alumni: "Cựu sinh viên",
    employer: "Nhà tuyển dụng",
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

function Icon({ name }) {
  const paths = {
    dashboard: <path d="M4 5h7v7H4zM13 5h7v4h-7zM13 11h7v8h-7zM4 14h7v5H4z" />,
    survey: <path d="M7 3h10l3 3v15H4V3h3zm9 1v4h4M8 10h8M8 14h8M8 18h5" />,
    edit: <path d="M4 20h4l11-11-4-4L4 16v4zm11-15 4 4" />,
    check: <path d="m4 12 5 5L20 6" />,
    users: <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />,
    chart: <path d="M4 19V5M4 19h16M8 16V9M12 16V7M16 16v-4" />,
    report: <path d="M6 3h9l3 3v15H6V3zm8 0v5h4M9 13h6M9 17h6" />,
    question: <path d="M9 9a3 3 0 1 1 5 2.24c-1.2.8-2 1.24-2 2.76M12 18h.01" />,
    plus: <path d="M12 5v14M5 12h14" />,
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
