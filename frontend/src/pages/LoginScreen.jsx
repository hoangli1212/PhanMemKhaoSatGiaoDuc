import { useState } from "react";
import { apiRequest } from "../api/client.js";

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

export default LoginScreen;
