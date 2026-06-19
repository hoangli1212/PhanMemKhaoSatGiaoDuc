import { useState } from "react";
import { apiRequest } from "../api/client.js";
import { EmptyState, Pagination, Panel } from "../components/ui.jsx";
import { emptyUser } from "../data/forms.js";
import { usePagedItems } from "../hooks/usePagedItems.js";
import { normalizeSearch, roleLabel, statusLabel } from "../utils/format.js";

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

export default UserManager;
