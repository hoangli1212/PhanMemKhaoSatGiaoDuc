import { useState } from "react";
import { apiRequest } from "../api/client.js";
import { InfoCard, Panel } from "../components/ui.jsx";
import { roleLabel } from "../utils/format.js";

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

export default ProfilePage;
