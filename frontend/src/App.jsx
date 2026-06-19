import { useEffect, useMemo, useState } from "react";
import "./App.css";
import { apiRequest } from "./api/client.js";
import { ConfirmDialog, Icon, NotificationPanel, Toast } from "./components/ui.jsx";
import { getNavItems } from "./data/navigation.js";
import AuditLogs from "./pages/AuditLogs.jsx";
import AnswerSurvey from "./pages/AnswerSurvey.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import LoginScreen from "./pages/LoginScreen.jsx";
import ProfilePage from "./pages/ProfilePage.jsx";
import QuestionManager from "./pages/QuestionManager.jsx";
import Reports from "./pages/Reports.jsx";
import SurveyHistory from "./pages/SurveyHistory.jsx";
import SurveyManager from "./pages/SurveyManager.jsx";
import UserManager from "./pages/UserManager.jsx";
import { roleLabel } from "./utils/format.js";

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
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const navItems = useMemo(() => getNavItems(auth?.user.role), [auth]);
  const title = navItems.find((item) => item.id === activePage)?.label || "Tổng quan";
  const studentNotifications = useMemo(() => {
    if (!["student", "respondent"].includes(auth?.user.role)) return [];
    return surveys.filter((survey) => survey.status === "published" && !survey.is_completed);
  }, [auth, surveys]);

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

  function openSurveyFromNotification() {
    setNotificationsOpen(false);
    setActivePage("answer");
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
          {["student", "respondent"].includes(auth.user.role) && (
            <div className="notification-wrap">
              <button
                className="secondary-button notification-button"
                onClick={() => setNotificationsOpen((value) => !value)}
              >
                Thông báo
                {studentNotifications.length > 0 && <span>{studentNotifications.length}</span>}
              </button>
              {notificationsOpen && (
                <NotificationPanel
                  notifications={studentNotifications}
                  onOpenSurvey={openSurveyFromNotification}
                  onClose={() => setNotificationsOpen(false)}
                />
              )}
            </div>
          )}
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

export default App;
